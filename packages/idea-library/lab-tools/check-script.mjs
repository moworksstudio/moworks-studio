// node tools/check-script.mjs: the Idea Library script's checks (packages/idea-library/pitch.mjs checkScript) on script.json in the lab (its
// scenes: time, narration, picture, sources), against the length, language and sources in tools/round.json. Prints OK with the count, or one
// problem a line; exit 1 on a problem.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
const APP = process.env.MW_APP_ROOT || readFileSync(join(import.meta.dirname, "app-root.txt"), "utf8").trim();
const { checkScript } = await import(pathToFileURL(join(APP, "packages", "idea-library", "pitch.mjs")).href);
const round = JSON.parse(readFileSync(join(import.meta.dirname, "round.json"), "utf8"));
try { writeFileSync(join(import.meta.dirname, ".checked"), new Date().toISOString()); } catch { /* the mark is for the app's running panel only */ }
let data;
try { data = JSON.parse(readFileSync("script.json", "utf8")); } catch (e) { console.log(`script.json: ${e.code === "ENOENT" ? "not written yet" : `not valid JSON (${e.message})`}`); process.exit(1); }
const r = checkScript(data, round);
if (r.ok) { console.log(`OK: ${r.scenes.length} scenes, ${r.words} words, ${r.seconds} s`); process.exit(0); }
for (const p of r.problems) console.log(p);
process.exit(1);
