// node tools/check-ideas.mjs: the Idea Library pitch's checks (packages/idea-library/pitch.mjs checkIdeas) on ideas.json in the lab, with
// this round's context (tools/round.json: the web on or off, the titles pitched before). Prints OK or one problem a line; exit 1 on a problem.
// The app's folder: MW_APP_ROOT or tools/app-root.txt.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
const APP = process.env.MW_APP_ROOT || readFileSync(join(import.meta.dirname, "app-root.txt"), "utf8").trim();
const { checkIdeas } = await import(pathToFileURL(join(APP, "packages", "idea-library", "pitch.mjs")).href);
const round = JSON.parse(readFileSync(join(import.meta.dirname, "round.json"), "utf8"));
try { writeFileSync(join(import.meta.dirname, ".checked"), new Date().toISOString()); } catch { /* the mark is for the app's running panel only */ }
let data;
try { data = JSON.parse(readFileSync("ideas.json", "utf8")); } catch (e) { console.log(`ideas.json: ${e.code === "ENOENT" ? "not written yet" : `not valid JSON (${e.message})`}`); process.exit(1); }
const r = checkIdeas(data, round);
if (r.ok) { console.log(`OK: ${r.ideas.length} ideas`); process.exit(0); }
for (const p of r.problems) console.log(p);
process.exit(1);
