// node tools/check-script.mjs: the Idea Library script's checks (packages/idea-library/pitch.mjs checkScript) on script.md in the lab, against
// the length and language in tools/round.json. Prints OK with the count, or one problem a line; exit 1 on a problem.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
const APP = process.env.MW_APP_ROOT || readFileSync(join(import.meta.dirname, "app-root.txt"), "utf8").trim();
const { checkScript } = await import(pathToFileURL(join(APP, "packages", "idea-library", "pitch.mjs")).href);
const round = JSON.parse(readFileSync(join(import.meta.dirname, "round.json"), "utf8"));
let text;
try { text = readFileSync("script.md", "utf8"); } catch { console.log("script.md: not written yet"); process.exit(1); }
const r = checkScript(text, round);
if (r.ok) { console.log(`OK: ${r.words} words, about ${r.seconds} s`); process.exit(0); }
for (const p of r.problems) console.log(p);
process.exit(1);
