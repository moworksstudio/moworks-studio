// The source skills of the owner's own film styles (called kits before #1061; the files' own titles and KIT VERSION lines keep the word:
// Paper Collage, Stickman Explainer, Inner Voice Short, 3D Cartoon and 2D Explainer, owner 04/11/2026 #880-#886): each is one .md installer with its files embedded (<!-- FILE: path --> and a fenced block). This writes the files
// exactly as the kit's own unpacker would, into bundle/styles/moworks-styles/<kit>/, with PINNED (the kit's name, KIT VERSION, the SHA-256 of the
// .md and the day read), and prints the pin for config/pins.json moworksStyles. The copy is never edited; the app's own parts are in
// packages/moworks-styles. Update path: node tools/intake-moworks-kit.mjs <NEW-KIT.md> → read the diff (git diff bundle/styles/moworks-styles),
// carry what changed into config/rules/<style>/SKILL.md and packages/moworks-styles, set the pin, run test/moworks-styles.test.mjs.
// Usage: node tools/intake-moworks-kit.mjs <kit.md> [<kit.md> …]
//        node tools/intake-moworks-kit.mjs <skill folder>/SKILL.md <its kit .zip>    (a skill whose code kit ships as a zip: Ricks Clip)
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
  const dest = join(root, "bundle", "styles", "moworks-styles", id), files = kitFiles(text);
  rmSync(dest, { recursive: true, force: true });
  for (const f of files) { const d = join(dest, ...f.path.split("/")); mkdirSync(dirname(d), { recursive: true }); writeFileSync(d, f.body); }
  writeFileSync(join(dest, "PINNED"), `${title} ${version} sha256:${sha256} ${basename(file)} read ${day}\n`);
  return { id, title, version, sha256, file: basename(file), bytes: raw.length, files: files.length, read: day, dir: id };
}

// ---- a skill folder: SKILL.md beside its code kit as a .zip (Ricks Clip, owner 05/11/2026 #1065-#1073: the skill cartoon-audio-short and
// cartoon-short-kit.zip). Written as the skill lays itself out: SKILL.md, and the zip's one folder as kit/ ("the code kit ships inside this skill
// folder at kit/", its SKILL.md §4.0). The files the kit's own setup.sh fetches go where setup.sh puts them (kit/vendor/), each pinned at its
// commit with its SHA-256; three.js is the app's (config/pins.json three), never vendored here.
/** The skills that are film styles: the skill's name (its front matter) → the style. */
export const SKILL_IDS = { "cartoon-audio-short": { id: "ricks-clip", title: "Ricks Clip" } };
/** What a skill's setup fetches, pinned: dest (in the pinned copy) → { repo, commit, path, sha256, bytes, licence }. */
export const SKILL_VENDOR = {
  "ricks-clip": {
    "kit/vendor/toon.ts": { repo: "mromidev/claude-animated-shorts", commit: "e3b817b6afc6cd413466d43f11ba31209e034bbf", path: "templates/bridge/toon.ts",
      sha256: "ed6823daad4cc5cdb88a7215502af545fe621efc18d58ea175f7464cc02fd725", bytes: 54503, licence: "MIT, Copyright (c) 2026 Mr omi" },
  },
};
const skillName = (text) => /^---\r?\n[\s\S]*?^name:\s*(\S+)/m.exec(text)?.[1] ?? null;

/** Intake a skill folder: its SKILL.md, its kit's .zip, and what its setup fetches (by vendor: dest → Buffer, else fetched from GitHub at the pin).
 *  Returns the pin for config/pins.json moworksStyles. The zip is unpacked by the app's own guarded unpacker. */
export async function intakeSkill(skillFile, zipFile, { root = APP_ROOT, day = new Date().toISOString().slice(0, 10), vendor = {} } = {}) {
  const { unpackArchive } = await import("../packages/project-service/archive.mjs");
  const raw = readFileSync(skillFile), name = skillName(raw.toString("utf8")), style = SKILL_IDS[name];
  if (!style) throw new Error(`${basename(skillFile)}: not one of the owner's skills (${Object.keys(SKILL_IDS).join(", ")})`);
  const zip = readFileSync(zipFile), sha256 = createHash("sha256").update(raw).digest("hex"), zipSha256 = createHash("sha256").update(zip).digest("hex");
  const u = await unpackArchive(zipFile);
  if (!u.ok) throw new Error(`${basename(zipFile)}: not unpacked (${u.reason})`);
  const dest = join(root, "bundle", "styles", "moworks-styles", style.id), wrote = [];
  try {
    const tops = new Set(u.files.map((f) => f.rel.split("/")[0]));
    if (tops.size !== 1 || u.files.some((f) => !f.rel.includes("/"))) throw new Error(`${basename(zipFile)}: one folder expected at the top, found ${[...tops].join(", ")}`);
    rmSync(dest, { recursive: true, force: true });
    const put = (rel, body) => { const d = join(dest, ...rel.split("/")); mkdirSync(dirname(d), { recursive: true }); writeFileSync(d, body); wrote.push(rel); };
    put("SKILL.md", raw);
    for (const f of u.files) put(`kit/${f.rel.split("/").slice(1).join("/")}`, readFileSync(f.abs));
    const pins = SKILL_VENDOR[style.id] ?? {};
    for (const [rel, v] of Object.entries(pins)) {
      let body = vendor[rel];
      if (!body) {
        const r = await fetch(`https://raw.githubusercontent.com/${v.repo}/${v.commit}/${v.path}`);
        if (!r.ok) throw new Error(`${v.repo}/${v.path}@${v.commit.slice(0, 8)}: ${r.status}`);
        body = Buffer.from(await r.arrayBuffer());
      }
      const got = createHash("sha256").update(body).digest("hex");
      if (got !== v.sha256) throw new Error(`${rel}: SHA-256 ${got.slice(0, 12)}… is not the pinned ${v.sha256.slice(0, 12)}…`);
      put(rel, body);
    }
    writeFileSync(join(dest, "PINNED"), `${style.title} (skill ${name}) sha256:${sha256} SKILL.md zip-sha256:${zipSha256} ${basename(zipFile)} read ${day}\n`
      + Object.entries(pins).map(([rel, v]) => `${rel} ${v.repo}@${v.commit} ${v.path} sha256:${v.sha256}\n`).join(""));
  } finally { u.cleanup(); }
  return { id: style.id, title: style.title, skill: name, version: null, sha256, file: basename(skillFile), bytes: raw.length, zip: basename(zipFile), zipSha256, zipBytes: zip.length,
    files: wrote.length, read: day, dir: style.id, vendor: SKILL_VENDOR[style.id] ?? {} };
}

if (process.argv[1] && basename(process.argv[1]) === "intake-moworks-kit.mjs") {
  const pins = {}, args = process.argv.slice(2);
  // a skill folder: <SKILL.md> <kit.zip>; a kit: <kit.md>
  for (let i = 0; i < args.length; i++) {
    if (basename(args[i]).toUpperCase() === "SKILL.MD") { const p = await intakeSkill(args[i], args[++i]); pins[p.id] = p; console.log(`${p.id}: ${p.files} files, skill ${p.skill}, sha256 ${p.sha256.slice(0, 12)}…`); continue; }
    const p = intake(args[i]); pins[p.id] = p; console.log(`${p.id}: ${p.files} files, ${p.title} ${p.version}, sha256 ${p.sha256.slice(0, 12)}…`);
  }
  console.log(JSON.stringify(pins, null, 2));
}
