// The owner's own kits (Moworks Studio's film styles Paper Collage, Stickman Explainer, Inner Voice Short, 3D Cartoon and 2D Explainer, owner
// 04/11/2026 #880-#886): each kit is one .md installer with its files embedded (<!-- FILE: path --> and a fenced block). This writes the files
// exactly as the kit's own unpacker would, into bundle/styles/moworks-kits/<kit>/, with PINNED (the kit's name, KIT VERSION, the SHA-256 of the
// .md and the day read), and prints the pin for config/pins.json moworksKits. The copy is never edited; the app's own parts are in
// packages/moworks-kits. Update path: node tools/intake-moworks-kit.mjs <NEW-KIT.md> → read the diff (git diff bundle/styles/moworks-kits),
// carry what changed into config/rules/<style>/SKILL.md and packages/moworks-kits, set the pin, run test/moworks-kits.test.mjs.
// Usage: node tools/intake-moworks-kit.mjs <kit.md> [<kit.md> …]
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { basename, dirname, isAbsolute, join } from "node:path";
import { APP_ROOT } from "../packages/version-manager/index.mjs";

/** Which kit a file is, by the title on its first line. */
export const KIT_IDS = { "Paper Collage Motion Kit": "paper-collage", "Story Animation Kit": "story", "3D Cartoon Animation Toolkit": "cartoon-3d", "2D Explainer Animation Toolkit": "explainer-2d" };

/** The embedded files of a kit's text: [{ path, body }] (the block's own fence closes it, so files holding ``` fences are safe). */
export function kitFiles(text) {
  const lines = text.split(/\r?\n/), out = [];
  for (let i = 0; i < lines.length; i++) {
    const m = /^<!-- FILE: (.+?) -->$/.exec(lines[i]);
    if (!m) continue;
    const fence = /^(`{3,})/.exec(lines[i + 1])[1];
    let j = i + 2;
    while (j < lines.length && lines[j] !== fence) j++;
    const rel = m[1].trim();
    if (rel.includes("..") || isAbsolute(rel)) throw new Error(`refusing path ${rel}`);
    out.push({ path: rel, body: lines.slice(i + 2, j).join("\n") + "\n" });
    i = j;
  }
  return out;
}

export function intake(file, { root = APP_ROOT, day = new Date().toISOString().slice(0, 10) } = {}) {
  const raw = readFileSync(file), text = raw.toString("utf8");
  const title = /^# (.+)$/m.exec(text)?.[1]?.trim(), id = KIT_IDS[title];
  if (!id) throw new Error(`${basename(file)}: not one of the owner's kits (${Object.keys(KIT_IDS).join(", ")})`);
  const version = /^KIT VERSION: (\S+)/m.exec(text)?.[1] ?? null, sha256 = createHash("sha256").update(raw).digest("hex");
  const dest = join(root, "bundle", "styles", "moworks-kits", id), files = kitFiles(text);
  rmSync(dest, { recursive: true, force: true });
  for (const f of files) { const d = join(dest, ...f.path.split("/")); mkdirSync(dirname(d), { recursive: true }); writeFileSync(d, f.body); }
  writeFileSync(join(dest, "PINNED"), `${title} ${version} sha256:${sha256} ${basename(file)} read ${day}\n`);
  return { id, title, version, sha256, file: basename(file), bytes: raw.length, files: files.length, read: day, dir: id };
}

if (process.argv[1] && basename(process.argv[1]) === "intake-moworks-kit.mjs") {
  const pins = {};
  for (const f of process.argv.slice(2)) { const p = intake(f); pins[p.id] = p; console.log(`${p.id}: ${p.files} files, ${p.title} ${p.version}, sha256 ${p.sha256.slice(0, 12)}…`); }
  console.log(JSON.stringify(pins, null, 2));
}
