// node tools/c3-check.mjs characters/<id>.ts [--json out/check.json]: 3D Cartoon's character checks (the gate), the app's way
// (packages/moworks-styles/c3d-page.mjs checkCharacter): the file read as text, then built with the source skill's own code in a staged 3D Cartoon
// film and checked there (its CharDef, made on buildCharacter, flat-drawn, every part the character's, its size, every face and pose). Prints
// PASS / FAIL lines and "<n> passed, <m> failed"; exit 1 on a failure. The app's folder: MW_APP_ROOT or tools/app-root.txt.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
const APP = process.env.MW_APP_ROOT || readFileSync(join(import.meta.dirname, "app-root.txt"), "utf8").trim();
const { checkCharacter } = await import(pathToFileURL(join(APP, "packages", "moworks-styles", "c3d-page.mjs")).href);
const args = process.argv.slice(2), ji = args.indexOf("--json"), file = args.find((a, i) => !a.startsWith("--") && i !== ji + 1);
if (!file) { console.error("usage: node tools/c3-check.mjs characters/<id>.ts [--json out/check.json]"); process.exit(2); }
try {
  const r = await checkCharacter(resolve(file), { root: APP });
  for (const l of r.lines) console.log(l);
  console.log(`${r.passed} passed, ${r.failed} failed`);
  if (ji >= 0) { const out = resolve(args[ji + 1]); mkdirSync(dirname(out), { recursive: true }); writeFileSync(out, JSON.stringify(r, null, 2) + "\n"); }
  process.exit(r.failed ? 1 : 0);
} catch (e) { console.error(e.message); console.log("0 passed, 1 failed"); process.exit(1); }
