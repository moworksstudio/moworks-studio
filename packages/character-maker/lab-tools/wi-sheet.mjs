// node tools/wi-sheet.mjs characters/<id>.ts out/sheet.png [--life out/life]: What If's model sheet (views, faces, poses, the walk: one row each),
// drawn by FreshStack's What If rig and the app's cast layer in a staged What If film (packages/what-if-styles/wi-page.mjs); --life also writes the
// life clip's frames (frame-0000.png …, 6 s at 15 fps: idle, a turn, a walk, a talk) into that folder. The app's folder: MW_APP_ROOT or tools/app-root.txt.
import { mkdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
const APP = process.env.MW_APP_ROOT || readFileSync(join(import.meta.dirname, "app-root.txt"), "utf8").trim();
const { drawSheet, drawLife } = await import(pathToFileURL(join(APP, "packages", "what-if-styles", "wi-page.mjs")).href);
const args = process.argv.slice(2), li = args.indexOf("--life"), [file, out] = args.filter((a, i) => !a.startsWith("--") && i !== li + 1);
if (!file || !out) { console.error("usage: node tools/wi-sheet.mjs characters/<id>.ts out/sheet.png [--life out/life]"); process.exit(2); }
try {
  mkdirSync(dirname(resolve(out)), { recursive: true });
  await drawSheet(resolve(file), resolve(out), { root: APP });
  console.log(`wrote ${out}`);
  if (li >= 0) { const d = resolve(args[li + 1]); mkdirSync(d, { recursive: true }); await drawLife(resolve(file), d, { root: APP }); console.log(`wrote the life clip's frames in ${args[li + 1]}`); }
} catch (e) { console.error(e.message); process.exit(1); }
