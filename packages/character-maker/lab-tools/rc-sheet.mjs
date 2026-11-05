// node tools/rc-sheet.mjs characters/<id>.js out/sheet.png [--life out/life]: Ricks Clip's model sheet (the three views, the faces, the arm
// poses, a walk), drawn as the film draws the character's card (packages/moworks-kits/ricks-page.mjs); --life also writes the life clip's
// frames (frame-0000.jpg …, 4.5 s at 30 fps) into that folder. The app's folder: MW_APP_ROOT or tools/app-root.txt.
import { mkdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
const APP = process.env.MW_APP_ROOT || readFileSync(join(import.meta.dirname, "app-root.txt"), "utf8").trim();
const { drawSheet, drawLife } = await import(pathToFileURL(join(APP, "packages", "moworks-kits", "ricks-page.mjs")).href);
const args = process.argv.slice(2), li = args.indexOf("--life"), [file, out] = args.filter((a, i) => !a.startsWith("--") && i !== li + 1);
if (!file || !out) { console.error("usage: node tools/rc-sheet.mjs characters/<id>.js out/sheet.png [--life out/life]"); process.exit(2); }
try {
  mkdirSync(dirname(resolve(out)), { recursive: true });
  await drawSheet(resolve(file), resolve(out), { root: APP });
  console.log(`wrote ${out}`);
  if (li >= 0) { const d = resolve(args[li + 1]); mkdirSync(d, { recursive: true }); await drawLife(resolve(file), d, { root: APP }); console.log(`wrote the life clip's frames in ${args[li + 1]}`); }
} catch (e) { console.error(e.message); process.exit(1); }
