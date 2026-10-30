// The character kit characters for films painted the ClaudeAnimationBase way (John
// Heibel, MIT; pinned in config/pins.json characterKit), drawn by the app's own character layer (character.js) from a definition (data:
// body, colours, face, head, legs, arms, the five key views). The kit's engine (src/core.js, src/timeline.js) is used as shipped; of its
// src/clawd.js only the parts that work for any body are used, cut out unchanged (faces, emotions, hats, emotes, moves, turns): never
// clawd() itself. p5.js (LGPL-2.1) and p5.brush (MIT) come from the pinned code libraries.
//
// Clawd is Anthropic's mascot: a demo of the layer on the Character page only, marked "Demo: Anthropic's mascot, not for
// use in films". It is never selectable for a project, never copied into one, and finalize refuses a film that draws it (clawdIn).
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve, sep } from "node:path";
import { APP_ROOT, expandEnv, loadPins, sourceHead } from "../version-manager/index.mjs";
import { codeLibDir } from "../offline-assets/index.mjs";
import { workRoot } from "../project-service/index.mjs";
import { encodePoster } from "../library/preview-media.mjs";
import { fillFrontBoxes, frontBoxes } from "./frontBox.mjs";

const HERE = import.meta.dirname;
const readText = (p) => { try { return readFileSync(p, "utf8"); } catch { return ""; } };
const readJson = (p) => { try { return JSON.parse(readFileSync(p, "utf8")); } catch { return null; } };
export const DEMO_LABEL = "Demo: Anthropic's mascot, not for use in films";

/** The pinned kit: { repo, commit, root, libs, head, intact }. */
export function kitSource(root = APP_ROOT) {
  const pin = loadPins(root).characterKit;
  if (!pin) return null;
  const dir = resolve(expandEnv(pin.root));
  const head = sourceHead(dir);          // a clone's commit, or the PINNED file of the copy bundled with the app
  return { ...pin, root: dir, head, intact: head === pin.commit };
}
export const fileLink = (src, rel) => `https://github.com/${src.repo}/blob/${src.commit}/${rel}`;

// ---- the kit's generic parts
/** The top-level declarations of src/clawd.js the layer uses: everything but Clawd's own body (VIEWS, clawd, lunchbox, dancer). */
export const KEEP = ["spinView", "turn", "TINT", "tintCols", "smearTrail", "gloom", "blush", "eyes", "eye", "mouth", "hat", "faceHat", "EMOTE_TOP",
  "emote", "heartPts", "_b", "EMO", "feel", "emotions", "move"];
/** Cut the named top-level declarations (with the comment lines just above each) out of a source file, unchanged and in order. */
export function cutDeclarations(text, keep) {
  const lines = text.replace(/\r\n/g, "\n").split("\n"), starts = [];
  lines.forEach((l, i) => { const m = /^(?:async\s+)?(?:function\s+([\w$]+)|(?:const|let|var)\s+([\w$]+))/.exec(l); if (m) starts.push({ i, name: m[1] ?? m[2] }); });
  const withComments = (i) => { let s = i; while (s > 0 && /^\/\//.test(lines[s - 1])) s--; return s; };
  const out = [], found = [];
  starts.forEach((d, k) => {
    if (!keep.includes(d.name)) return;
    const from = withComments(d.i), to = k + 1 < starts.length ? withComments(starts[k + 1].i) : lines.length;
    out.push(lines.slice(from, to).join("\n").replace(/\n+$/, "")); found.push(d.name);
  });
  return { text: out.join("\n\n") + "\n", found };
}
/** The kit's generic parts as one script, credited. */
export function kitParts(root = APP_ROOT) {
  const src = kitSource(root);
  if (!src) throw Object.assign(new Error("The character kit is not pinned (config/pins.json characterKit)"), { code: "NOT_FOUND" });
  const { text, found } = cutDeclarations(readText(join(src.root, "src", "clawd.js")), KEEP);
  const missing = KEEP.filter((k) => !found.includes(k));
  if (missing.length) throw Object.assign(new Error(`The kit's clawd.js no longer has: ${missing.join(", ")}`), { code: "ERROR" });
  return `// clawd-parts.js: the parts of ClaudeAnimationBase's src/clawd.js that work for any character (faces, emotions, hats, emotes, moves,
// turns), cut out unchanged by Moworks Studio; Clawd's own body (VIEWS, clawd(), lunchbox(), dancer()) is left out.
// John Heibel, MIT: ${fileLink(src, "src/clawd.js")}\n\n${text}`;
}

// ---- characters
/** The user's own characters (saved from a project): <work>/library/characters/user/<id>.json, outside the app's repository (a user's
 *  characters are never pushed to git; only the Clawd demo lives in the repo). */
export const userDir = (root = APP_ROOT) => join(mediaRoot(root), "user");
/** True when the store would sit inside the app's repository (then nothing is written there). */
export const userStoreInRepo = (root = APP_ROOT) => { const a = resolve(root) + sep, d = resolve(userDir(root)) + sep; return d.toLowerCase().startsWith(a.toLowerCase()); };
/** The characters: the app's own (characters/*.json), the user's (group "yours") and the demo (demo/clawd.json, never selectable). */
export function characters(root = APP_ROOT) {
  const list = [];
  for (const [d, demo, group] of [[join(HERE, "characters"), false, "app"], [userDir(root), false, "yours"], [join(HERE, "demo"), true, "demo"]]) {
    if (!existsSync(d)) continue;
    for (const n of readdirSync(d).filter((x) => x.endsWith(".json")).sort()) {
      const c = readJson(join(d, n));
      // kind: what the character is, "animal" | "thing" | "robot" (the layer draws mascots; a definition saved before kinds existed is a thing)
      if (c?.id) list.push({ ...c, kind: c.kind === "animal" || c.kind === "robot" ? c.kind : "thing", group, demo: demo || !!c.demo, selectable: !(demo || c.demo) });
    }
  }
  return list;
}
export const getCharacter = (id, root = APP_ROOT) => characters(root).find((c) => c.id === id) ?? null;

// ---- anidoodle's human characters: people built on anidoodle's human engine (the author's Mira and Theo
// as shipped, and the user's own, made by Claude the author's way), kept for reuse in <work>/library/characters/anidoodle-human/<id>/:
// character.json (who, credit, how made, the module's files), module/ (the character's TypeScript, the author's contract), its model
// sheets and walk previews. Outside git like every user character. Listed apart from the Brush cartoon kit's characters (another engine):
// not selectable until the anidoodle Character step exists.
export const HUMAN_ENGINE = "anidoodle-human";
/** What a character is. Every kind but a person has a rig and a gate of its own. */
export const KINDS = ["human", "animal", "thing", "robot"];
export const ownRig = (kind) => kind === "animal" || kind === "thing" || kind === "robot";
export const humanDir = (root = APP_ROOT) => join(mediaRoot(root), HUMAN_ENGINE);
const HUMAN_MEDIA = [["sheetMarker", "sheet-marker.webp"], ["sheetStorybook", "sheet-storybook.webp"], ["sheet", "sheet.webp"], ["walkMarker", "walk-marker.mp4"],
  ["walkStorybook", "walk-storybook.mp4"], ["walk", "walk.mp4"], ["poster", "poster.webp"]];
// ---- a character's history: every run that made or changed it, and the versions kept for Undo (outside git like the store)
export const versionsDir = (root = APP_ROOT) => join(mediaRoot(root), "_versions");
const historyFile = (id, root) => join(mediaRoot(root), "_history", `${id}.json`);
/** The runs that made or changed a character, newest last: { at, kind: "create"|"change"|"undo", text?, outcome?, changes?, says?, minutes?, turns?, costUsd? }. */
export const characterHistory = (id, root = APP_ROOT) => readJson(historyFile(id, root)) ?? [];
export function addHistory(id, entry, root = APP_ROOT) {
  const list = [...characterHistory(id, root), { at: new Date().toISOString(), ...entry }].slice(-50);
  mkdirSync(join(historyFile(id, root), ".."), { recursive: true }); writeFileSync(historyFile(id, root), JSON.stringify(list, null, 2) + "\n");
  return list;
}
/** The versions kept for Undo, newest last: [{ n, at, label }]. */
export function characterVersions(id, root = APP_ROOT) {
  const d = join(versionsDir(root), id);
  if (!existsSync(d)) return [];
  return readdirSync(d).filter((n) => /^\d+$/.test(n)).map(Number).sort((a, b) => a - b).map((n) => ({ n, ...(readJson(join(d, String(n), "version.json")) ?? {}) }));
}
export function forgetHistory(id, root = APP_ROOT) { rmSync(join(versionsDir(root), id), { recursive: true, force: true }); rmSync(historyFile(id, root), { force: true }); }

// The author's own characters with a rig of their own, not the human engine: Bit,
// the storybook plate's wind-up robot, and the cheetah, as shipped, kept in the same store as Mira and Theo (group anidoodle) and usable in
// films. Their code stays in the pinned engine (never copied): a film imports it. Their media
// (poster, a film of them) are rendered from the author's own pages by packages/anidoodle-styles/previews.mjs. The author's rigs are drawn
// in pixels and give no real size: their heights are inferred, and say so (heightBy, heightNote).
export const AUTHOR_RIGS = [
  { id: "bit", name: "Bit", rig: "bit", kind: "robot", import: "anidoodle/canvas-core/bitRig", hands: ["storybook"],
    height: { heightM: 0.3, heightBy: "inferred", heightNote: "a little wind-up tin toy robot, antenna bulb included; the author's rig has no real size" },
    about: "A little wind-up tin robot with an antenna bulb and a key in his back, drawn in storybook pencil and watercolour: the author's mascot (rigged for the web: eyes, brows, mouth, arms, a bob and a cheer).",
    module: ["engine/src/canvas-core/bitRig.ts", "engine/src/canvas-core/storybook.ts"], media: { from: "storybook" } },
  { id: "cheetah", name: "Cheetah", rig: "cheetah", kind: "animal", import: "anidoodle/canvas-core/cheetahBody", hands: [],
    height: { heightM: 0.8, heightBy: "inferred", heightNote: "an adult cheetah standing, at the shoulder (0.7-0.9 m); the author's rig has no real size" },
    about: "A side-view cheetah drawn in tapered tufts with solid spots and the tear line as its one big black shape, on a skeleton of angles that never stretches: stand, bow, crouch, skid and the rotary gallop.",
    module: ["engine/src/canvas-core/cheetahRig.ts", "engine/src/canvas-core/cheetahBody.ts", "engine/src/canvas-core/cheetahScenery.ts"], media: { page: "page-cheetahRun", at: 11, poster: 15.5 } },          // cheetahRun.ts CUE: the bow at 11.3 s, the run from 13.5 s, the skid at 20 s
];
/** Write the author's rigged characters into the store when they are missing (their record only; nothing of the user's is touched). */
export function seedAuthorCharacters(root = APP_ROOT) {
  const pin = loadPins(root).anidoodle, added = [];
  if (!pin) return added;
  for (const a of AUTHOR_RIGS) {
    const d = join(humanDir(root), a.id), f = join(d, "character.json");
    if (existsSync(f)) continue;
    mkdirSync(d, { recursive: true });
    const link = `https://github.com/${pin.repo}/blob/${pin.commit}/${pin.skill ?? "skills/anidoodle"}/${a.module[0]}`;
    writeFileSync(f, JSON.stringify({ id: a.id, name: a.name, about: a.about, engine: HUMAN_ENGINE, rig: a.rig, import: a.import, hands: a.hands,
      credit: { author: "Alex Greenshpun (10x Company)", link, commit: pin.commit, licence: "Apache-2.0 (with NOTICE)", made: "as shipped" },
      module: a.module, savedAt: new Date().toISOString() }, null, 2) + "\n");
    added.push(a.id);
  }
  return added;
}

/** The anidoodle human characters in the store, each with its media urls. */
export function humanCharacters(root = APP_ROOT) {
  const d = humanDir(root);
  if (!existsSync(d)) return [];
  return readdirSync(d).sort().flatMap((id) => {
    const c = readJson(join(d, id, "character.json"));
    if (!c?.id || c.id !== id) return [];
    const media = Object.fromEntries(HUMAN_MEDIA.map(([k, f]) => [k, existsSync(join(d, id, f)) ? `/media/characters/${HUMAN_ENGINE}/${id}/${f}` : null]));
    // kind: "human" | "animal" | "thing" | "robot"; the author's rigs as listed in AUTHOR_RIGS, a record saved before kinds existed is a person
    const kind = c.kind ?? AUTHOR_RIGS.find((a) => a.id === c.rig)?.kind ?? "human";
    return [{ ...c, kind, engine: HUMAN_ENGINE, group: "anidoodle", demo: false, selectable: true, why: null, media }];
  });
}

/** What is wrong with a definition (the schema of character.js): [] when it can be drawn. */
export function checkCharacter(c) {
  const bad = [], num = (v) => typeof v === "number" && Number.isFinite(v), hex = (v) => /^#[0-9a-fA-F]{6}$/.test(String(v ?? ""));
  if (!/^[a-z][a-z0-9-]{0,31}$/.test(String(c?.id ?? ""))) bad.push("id: lowercase letters, digits and dashes, starting with a letter");
  if (/^clawd$/i.test(String(c?.id ?? "")) || /\bclawd\b/i.test(String(c?.name ?? ""))) bad.push("Clawd is Anthropic's mascot: never a film's character");
  if (!String(c?.name ?? "").trim()) bad.push("name");
  for (const k of ["col", "dk", "lt"]) if (!hex(c?.colors?.[k])) bad.push(`colors.${k}: a #RRGGBB colour`);
  if (!["box", "round", "egg", "pill"].includes(c?.body?.shape)) bad.push("body.shape: box, round, egg or pill");
  for (const k of ["w", "h", "bottom"]) if (!num(c?.body?.[k])) bad.push(`body.${k}: a number (u)`);
  for (const k of ["y", "dx"]) if (!num(c?.face?.[k])) bad.push(`face.${k}: a number (u)`);
  for (const k of ["top", "width"]) if (!num(c?.head?.[k])) bad.push(`head.${k}: a number (u)`);
  if (!Array.isArray(c?.legs?.xs) || !c.legs.xs.every(num)) bad.push("legs.xs: the front-view x of each leg (u)");
  for (const k of ["x", "y", "len", "th"]) if (c?.arms?.[k] != null && !num(c.arms[k])) bad.push(`arms.${k}: a number (u)`);
  if (!c?.arms) bad.push("arms");
  return bad;
}

// ---- a project's characters: CHARACTERS.json (the definitions Claude writes in the Character step; the user approves it)
export const CAST_FILE = "CHARACTERS.json";
/** The project's characters: { characters: [definition], problems: ["<id>: what is wrong"] }. */
export function readCast(projectDir) {
  const f = join(projectDir, CAST_FILE);
  if (!existsSync(f)) return { characters: [], problems: [] };
  let j;
  try { j = JSON.parse(readFileSync(f, "utf8")); } catch (e) { return { characters: [], problems: [`${CAST_FILE} is not JSON: ${e.message}`] }; }
  const list = Array.isArray(j) ? j : Array.isArray(j?.characters) ? j.characters : [];
  if (!list.length) return { characters: [], problems: [`${CAST_FILE} has no characters ({ "characters": [ … ] })`] };
  // an anidoodle film's cast member is a module of the human engine, not a definition for this layer: its gate checks it
  const problems = list.filter((c) => c?.engine !== HUMAN_ENGINE).flatMap((c, i) => checkCharacter(c).map((p) => `${c?.id ?? `character ${i + 1}`}: ${p}`));
  const ids = list.map((c) => c?.id); if (new Set(ids).size !== ids.length) problems.push("two characters have the same id");
  return { characters: list, problems };
}
/** Put characters from the library (the app's own and the user's; never the demo) into the project's CHARACTERS.json, keeping the ones
 *  already there. Returns the cast. */
export function useCharacters(projectDir, ids, root = APP_ROOT) {
  const have = readCast(projectDir).characters, out = [...have];
  for (const id of ids) {
    const c = getCharacter(id, root);
    if (!c) throw Object.assign(new Error(`No character "${id}"`), { code: "NOT_FOUND" });
    if (!c.selectable) throw Object.assign(new Error(`${c.name} is a demo of the character layer, never a film's character`), { code: "INVALID" });
    if (out.some((x) => x.id === c.id)) continue;
    const { group, demo, selectable, ...def } = c;
    // a library character in the style it was made for (the layer draws it from its definition; its sheets come with it) needs
    // no redraw, only its gate
    out.push({ ...def, ownStyle: true, from: { library: group, at: new Date().toISOString() } });
    // its model sheets come with it: the Character dialog shows them instead of "Not drawn yet". A character saved before the full
    // sheets were kept (or one whose sheets the Characters page drew) has only its 640 px WebPs: those come instead
    for (const scene of ["views", "emotions"]) {
      const sheets = join(projectDir, "characters", "sheets"), png = join(sheets, `${c.id}-${scene}.png`), webp = join(sheets, `${c.id}-${scene}.webp`);
      const kept = join(mediaRoot(root), c.id, "sheets", `${scene}.png`), small = join(mediaRoot(root), c.id, `${scene}.webp`);
      if (existsSync(png) || existsSync(webp)) continue;
      if (existsSync(kept)) { mkdirSync(sheets, { recursive: true }); cpSync(kept, png); }
      else if (existsSync(small)) { mkdirSync(sheets, { recursive: true }); cpSync(small, webp); }
    }
  }
  writeFileSync(join(projectDir, CAST_FILE), JSON.stringify({ characters: out }, null, 2) + "\n");
  return readCast(projectDir);
}
/** What a cast member still needs: "gate" when it came from the library in its own style (ownStyle: no redraw, no new sheet,
 *  only its gate, seconds), else "sheet" (made or adapted in this film: its sheets drawn, then its gate). */
export const characterNeedsWork = (entry) => (entry?.ownStyle && entry?.from?.library ? "gate" : "sheet");
/** Keep a project's model sheets of a character with it in the library: the full PNGs (sheets/, copied into a project that uses it)
 *  and a 640 px WebP of each for the Characters page (views.webp, emotions.webp; the views sheet is also its poster). */
function keepSheets(projectDir, id, root, encode) {
  const dir = join(mediaRoot(root), id), kept = [];
  for (const scene of ["views", "emotions"]) {
    const src = join(projectDir, "characters", "sheets", `${id}-${scene}.png`);
    if (!existsSync(src)) continue;
    mkdirSync(join(dir, "sheets"), { recursive: true });
    cpSync(src, join(dir, "sheets", `${scene}.png`));
    try { encode(src, join(dir, `${scene}.webp`), { root }); if (scene === "views") cpSync(join(dir, "views.webp"), join(dir, "poster.webp")); } catch { /* the PNG is kept */ }
    kept.push(scene);
  }
  if (kept.length) writeFileSync(join(dir, "demo.json"), JSON.stringify({ id, at: new Date().toISOString(), from: "the project's approved model sheets", sheets: kept }, null, 2) + "\n");
  return kept;
}
/** Keep one of the project's characters in the user's library (to use it in another film). Returns its library entry. */
export function saveCharacter(projectDir, id, root = APP_ROOT) {
  const { characters: list } = readCast(projectDir), c = list.find((x) => x.id === id);
  if (!c) throw Object.assign(new Error(`The project has no character "${id}"`), { code: "NOT_FOUND" });
  const bad = checkCharacter(c);
  if (bad.length) throw Object.assign(new Error(`${id}: ${bad.join("; ")}`), { code: "INVALID" });
  if (id === "user") throw Object.assign(new Error('"user" is not a character id: rename it in CHARACTERS.json first'), { code: "CONFLICT" });
  const taken = characters(root).find((x) => x.id === id && x.group !== "yours");
  if (taken) throw Object.assign(new Error(`"${id}" is the name of the app's own ${taken.demo ? "demo " : ""}character: rename it in ${CAST_FILE} first`), { code: "CONFLICT" });
  if (userStoreInRepo(root)) throw Object.assign(new Error("The characters store is inside the app's repository: a user's characters are never kept there"), { code: "INVALID" });
  mkdirSync(userDir(root), { recursive: true });
  const { from, ...def } = c;
  writeFileSync(join(userDir(root), `${id}.json`), JSON.stringify({ ...def, credit: def.credit ?? { author: "The owner", link: null, licence: "the owner's own", made: "written from the idea", madeNote: "a definition for the app's character layer, made in a project" }, savedAt: new Date().toISOString() }, null, 2) + "\n");
  keepSheets(projectDir, id, root, encodePoster);
  return getCharacter(id, root);
}
export function deleteUserCharacter(id, root = APP_ROOT) {
  const c = getCharacter(id, root);
  if (!c || c.group !== "yours") throw Object.assign(new Error("Only your own characters can be deleted"), { code: "INVALID" });
  rmSync(join(userDir(root), `${id}.json`), { force: true }); rmSync(join(mediaRoot(root), id), { recursive: true, force: true }); forgetHistory(id, root);
  return { deleted: id };
}

/** Does a film draw Clawd? Its own scripts call the kit's clawd() or dancer(), use a definition named Clawd, or it carries the kit's
 *  clawd.js (the kit's engine files, whose placeholder names clawd(), are not the film's own). files: [{ rel, text }]. finalize refuses
 *  such a film. */
export const KIT_FILE = /(^|\/)kit\/(core|timeline|clawd-parts|character)\.js$/;
export function clawdIn(files) {
  return files.some(({ rel, text }) => /(^|\/)clawd\.js$/i.test(rel)
    || (!KIT_FILE.test(rel) && (/\b(?:clawd|dancer)\s*\(/.test(text) || /["']?id["']?\s*:\s*["']clawd["']/i.test(text))));
}

// ---- a page: one HyperFrames composition painted by the kit (a model sheet or the showreel of one character)
const LIBS = [["p5", "lib/p5.min.js", ["license.txt"]], ["p5.brush", "dist/p5.brush.js", ["LICENSE.md"]]];
/** Write a character page into dir: index.html (the HF root holding the kit's canvas), kit/ (the engine as shipped, the generic parts, the
 *  layer) and the pinned p5 libraries with their licences. scene: "showreel" | "views" | "emotions". Returns { files }. */
/** The kit's runtime files a page loads, written into <dir>/<kitRel>/: the engine as shipped (core.js, timeline.js), the generic parts,
 *  the layer and the kit's licence. Never the kit's clawd.js. */
export function copyKit(dir, kitRel = "compositions/kit", root = APP_ROOT) {
  const src = kitSource(root);
  if (!src) throw Object.assign(new Error("The character kit is not pinned"), { code: "NOT_FOUND" });
  const k = join(dir, ...kitRel.split("/")), files = [];
  mkdirSync(k, { recursive: true });
  for (const f of ["core.js", "timeline.js"]) { cpSync(join(src.root, "src", f), join(k, f)); files.push(`${kitRel}/${f}`); }
  writeFileSync(join(k, "clawd-parts.js"), kitParts(root)); files.push(`${kitRel}/clawd-parts.js`);
  cpSync(join(HERE, "character.js"), join(k, "character.js")); files.push(`${kitRel}/character.js`);
  cpSync(join(src.root, "LICENSE"), join(k, "LICENSE")); files.push(`${kitRel}/LICENSE`);
  return files;
}
/** The pinned p5.js and p5.brush (with their licences) in <projectDir>/assets/_app/vendor/lib/. Returns { files, tags(prefix) }. */
export function copyLibs(projectDir, root = APP_ROOT) {
  const pins = loadPins(root).codeLibs.packages, libDir = codeLibDir(root), files = [], mains = [];
  for (const [name, main, extra] of LIBS) {
    const v = pins[name]?.version;
    if (!v) throw Object.assign(new Error(`${name} is not pinned in codeLibs`), { code: "NOT_FOUND" });
    for (const rel of [main, ...extra]) {
      const to = join(projectDir, "assets", "_app", "vendor", "lib", name, v, ...rel.split("/"));
      if (!existsSync(to)) { mkdirSync(join(to, ".."), { recursive: true }); cpSync(join(libDir, name, v, ...rel.split("/")), to); }
      files.push(`assets/_app/vendor/lib/${name}/${v}/${rel}`);
    }
    mains.push(`assets/_app/vendor/lib/${name}/${v}/${main}`);
  }
  return { files, tags: (prefix = "") => mains.map((m) => `<script src="${prefix}${m}"></script>`).join("\n") };
}
export function writePage(dir, character, { scene = "showreel", duration = 6, bpm = 120, root = APP_ROOT, original = false } = {}) {
  const src = kitSource(root), c = typeof character === "string" ? getCharacter(character, root) : character;
  if (!src) throw Object.assign(new Error("The character kit is not pinned"), { code: "NOT_FOUND" });
  if (!c) throw Object.assign(new Error("No such character"), { code: "NOT_FOUND" });
  const files = copyKit(dir, "compositions/kit", root);
  if (original) { cpSync(join(src.root, "src", "clawd.js"), join(dir, "compositions", "kit", "clawd.js")); files.push("compositions/kit/clawd.js"); }     // the comparison test only
  const libs = copyLibs(dir, root); files.push(...libs.files);
  const tags = [libs.tags()];
  const def = { ...c }; for (const k of ["selectable", "group", "from"]) delete def[k];
  const call = scene === "views" ? "viewSheet" : scene === "emotions" ? "emotionSheet" : "showreel";
  const html = `<!doctype html>
<!-- A character page of Moworks Studio's character layer (audit 57 row 8): ${c.name}, ${scene}. Painted by ClaudeAnimationBase's kit
     (John Heibel, MIT, ${fileLink(src, "")}) with p5.js (LGPL-2.1) and p5.brush (MIT); its time is HyperFrames' through the app's bridge.${c.demo ? `\n     ${DEMO_LABEL}.` : ""} -->
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=1920, height=1080" />
<script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
${tags.join("\n")}
<style>
  html, body { margin: 0; width: 1920px; height: 1080px; overflow: hidden; background: #F3EBDC; }
  #root { position: relative; width: 1920px; height: 1080px; overflow: hidden; background: #F3EBDC; }
  #out { position: absolute; inset: 0; width: 1920px; height: 1080px; display: block; }
  .p5Canvas { display: none !important; }
  #scrub, #tt { display: none; }
</style>
</head>
<body>
<div id="root" data-composition-id="main" data-start="0" data-duration="${duration}" data-width="1920" data-height="1080">
  <canvas id="out" class="clip" width="1920" height="1080" data-start="0" data-duration="${duration}" data-track-index="1"></canvas>
</div>
<input id="scrub" type="range" /><span id="tt"></span>
<script>const PROJECT = { duration: ${duration}, bpm: ${bpm}, offset: 0 };</script>
<script src="compositions/kit/core.js"></script>
<script src="compositions/kit/clawd-parts.js"></script>${original ? `\n<script src="compositions/kit/clawd.js"></script>` : ""}
<script src="compositions/kit/timeline.js"></script>
<script src="compositions/kit/character.js"></script>
<script>
  const CHARACTER = ${JSON.stringify(def)};
  shots([[0, (t) => ${call}(CHARACTER, t)]]);
</script>
</body>
</html>
`;
  writeFileSync(join(dir, "index.html"), html); files.unshift("index.html");
  return { files };
}

// ---- the Character page's demo media (made once per character and pin, kept in <work>/library/characters/<id>/)
export const mediaRoot = (root = APP_ROOT) => process.env.MW_CHARACTERS_ROOT ?? join(workRoot(root), "library", "characters");
/** A demo file of a character, contained in the store. */
export function mediaFile(rel, root = APP_ROOT) {
  if (!/^[a-z0-9-]+(\/[a-z0-9-]+)?\/[\w.-]+\.(webp|mp4|png)$/.test(rel)) return null;          // <id>/<file>, or anidoodle-human/<id>/<file>
  const base = resolve(mediaRoot(root)), f = resolve(base, rel);
  return f.startsWith(base + sep) && existsSync(f) ? f : null;
}
/** What the demo of a character has: { views, emotions, clip } (urls) and when it was made. */
export function demoMedia(id, root = APP_ROOT) {
  const d = join(mediaRoot(root), id), m = readJson(join(d, "demo.json"));
  const url = (n) => existsSync(join(d, n)) ? `/media/characters/${id}/${n}` : null;
  return { views: url("views.webp"), emotions: url("emotions.webp"), clip: url("showreel.mp4"), poster: url("poster.webp"), madeAt: m?.at ?? null, commit: m?.commit ?? null };
}
/** A person's height from its module: the spec's `canon: …, height: N` (the value its rig and gates use), or null. */
function specHeight(id, root) {
  const walk = (d) => (existsSync(d) ? readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(d, e.name)) : /\.ts$/.test(e.name) ? [join(d, e.name)] : [])) : []);
  for (const f of walk(join(humanDir(root), id, "module"))) {
    const m = /\bcanon\s*:\s*[^,\n]+,\s*height\s*:\s*(\d+(?:\.\d+)?)/.exec(readFileSync(f, "utf8"));
    if (m && Number(m[1]) > 0.3 && Number(m[1]) < 2.6) return Number(m[1]);
  }
  return null;
}
/** A character's real height for The Studio's height chart: { heightM, heightBy, heightNote }, heightM the top
 *  of the head (an animal standing; a thing or a robot at its tallest) in metres. heightBy says where it comes from: "spec" (a person's
 *  module, the value its rig and gates use), "description" (the metres its description names), "inferred" (a real-world size estimated
 *  from what it is: the author's rigs and the Brush layer draw in pixels, with no real size), or null when nothing gives one. */
export function heightFields(c, root = APP_ROOT) {
  const spec = c.kind === "human" && c.engine === HUMAN_ENGINE ? specHeight(c.id, root) : null;
  if (spec) return { heightM: spec, heightBy: "spec", heightNote: null };
  if (Number(c.heightM) > 0) return { heightM: Number(c.heightM), heightBy: c.heightBy ?? "inferred", heightNote: c.heightNote ?? null };
  const a = c.rig ? AUTHOR_RIGS.find((x) => x.id === c.rig && x.id === c.id)?.height : null;
  if (a) return { ...a };
  const t = /\b(\d(?:[.,]\d{1,2})?)\s?m\b/.exec(c.about ?? "");
  return t && Number(t[1].replace(",", ".")) > 0 ? { heightM: Number(t[1].replace(",", ".")), heightBy: "description", heightNote: null } : { heightM: null, heightBy: null, heightNote: null };
}
/** The API's list: each character with its credit, whether a project may use it, and its demo media; `kind` (human | animal | thing |
 *  robot) and its height (heightFields). */
export function apiCharacters(root = APP_ROOT) {
  const src = kitSource(root);
  return { kit: src ? { repo: src.repo, commit: src.commit, link: `https://github.com/${src.repo}/tree/${src.commit}`, licence: src.licence, intact: src.intact } : null,
    characters: [
      ...characters(root).map((c) => ({ id: c.id, name: c.name, about: c.about, kind: c.kind, ...heightFields(c, root), group: c.group, engine: "brush-kit", demo: c.demo, selectable: c.selectable,
        label: c.demo ? (c.label ?? DEMO_LABEL) : null, credit: c.credit, colors: c.colors, media: demoMedia(c.id, root), version: c.version ?? null,
        history: characterHistory(c.id, root), versions: characterVersions(c.id, root) })),
      ...humanCharacters(root).map((c) => ({ id: c.id, name: c.name, about: c.about, kind: c.kind, ...heightFields(c, root), group: c.group, engine: c.engine, demo: false, selectable: true, why: null, hand: c.hand ?? c.hands?.[0] ?? null,
        label: null, credit: c.credit, made: c.made ?? null, hands: c.hands ?? [], media: { ...c.media, ...frontOf(c, root) }, version: c.version ?? null,
        history: characterHistory(c.id, root), versions: characterVersions(c.id, root) })),
    ] };
}

/** The Front figure on a person's model sheet (The Studio's height chart: a poster is a scene, the sheet's Front is the
 *  character standing): { frontBox: { sheet: "<media field>", box: [x, y, w, h] } | null, frontBoxes: { field: box } }, in that sheet's
 *  pixels; the sheet of the character's own hand first. A sheet not measured yet is measured in the background (frontBox.mjs), so the next
 *  read has it. */
const SHEETS = HUMAN_MEDIA.filter(([k]) => k.startsWith("sheet"));
const measuring = new Set();
function frontOf(c, root) {
  const dir = join(humanDir(root), c.id), sheets = SHEETS.filter(([k]) => c.media?.[k]);
  if (!sheets.length) return { frontBox: null, frontBoxes: {} };
  const boxes = frontBoxes(dir, sheets);
  if (sheets.some(([k]) => !boxes[k]) && !measuring.has(dir)) {
    measuring.add(dir);
    fillFrontBoxes(dir, sheets).catch(() => {}).finally(() => measuring.delete(dir));
  }
  const hand = c.hand ?? c.hands?.[0] ?? "", own = `sheet${hand.charAt(0).toUpperCase()}${hand.slice(1)}`;
  const field = [own, "sheet", ...sheets.map(([k]) => k)].find((k) => boxes[k]);
  return { frontBox: field ? { sheet: field, box: boxes[field] } : null, frontBoxes: boxes };
}

/** Make a character's demo media through HyperFrames: the views and emotions sheets (a still each) and the showreel (a short MP4). The
 *  hf-* calls are passed in (the server's), so this package stays outside the HyperFrames boundary. */
export async function renderDemo(id, { root = APP_ROOT, finalize, snapshotAt, render, encodePoster, onProgress = () => {}, signal = null } = {}) {
  const c = getCharacter(id), src = kitSource(root);
  if (!c) throw Object.assign(new Error("No such character"), { code: "NOT_FOUND" });
  const out = join(mediaRoot(root), id), work = join(out, "work");
  rmSync(work, { recursive: true, force: true }); mkdirSync(work, { recursive: true });
  const step = (stage, progress) => onProgress({ stage, progress });
  const sheets = [["views", 1.2], ["emotions", 1.2]];
  let n = 0;
  for (const [scene, at] of sheets) {
    step(`Drawing the ${scene} sheet`, 5 + n++ * 25);
    const d = join(work, scene);
    writePage(d, id, { scene, duration: 4, root });
    const rep = await finalize(d, { googleFonts: false, characterDemo: true });
    if (rep.lemo?.missing?.length) throw new Error(`Files missing for the ${scene} page: ${rep.lemo.missing.join(", ")}`);
    const snap = await snapshotAt(d, [at], join(work, `${scene}-snap`), { timeout: 30000 });
    const png = readdirSync(join(work, `${scene}-snap`)).find((f) => f.endsWith(".png"));
    if (snap.exitCode !== 0 || !png) throw new Error(`The ${scene} still failed: ${snap.stderrTail.join(" ")}`);
    encodePoster(join(work, `${scene}-snap`, png), join(out, `${scene}.webp`), { root });
  }
  step("Rendering the showreel", 55);
  const d = join(work, "showreel");
  writePage(d, id, { scene: "showreel", duration: 6, root });
  await finalize(d, { googleFonts: false, characterDemo: true });
  const r = await render({ projectDir: d, outputPath: join(out, "showreel.mp4"), fps: { num: 24, den: 1 }, format: "mp4", workers: 2 }, { signal });
  if (r.type !== "done") throw new Error(`The showreel render failed: ${r.code ?? r.message ?? r.type}`);
  step("Poster", 95);
  const ps = await snapshotAt(d, [3], join(work, "poster-snap"), { timeout: 30000 });
  const pp = existsSync(join(work, "poster-snap")) ? readdirSync(join(work, "poster-snap")).find((f) => f.endsWith(".png")) : null;
  if (ps.exitCode === 0 && pp) encodePoster(join(work, "poster-snap", pp), join(out, "poster.webp"), { root });
  writeFileSync(join(out, "demo.json"), JSON.stringify({ id, at: new Date().toISOString(), commit: src?.commit ?? null }, null, 2) + "\n");
  rmSync(work, { recursive: true, force: true });
  return demoMedia(id, root);
}

// ---- a Brush cartoon film: the kit and the project's characters in the film and its boards
export const STYLE_ID = "brush-cartoon";
/** window.CAST: the project's characters by id, for the film's and the boards' scenes (made from CHARACTERS.json, never by hand). */
export function castScript(projectDir) {
  const { characters: list } = readCast(projectDir);
  const cast = Object.fromEntries(list.map(({ from, ...c }) => [c.id, c]));
  return `// cast.js: the project's characters (written by Moworks Studio from ${CAST_FILE}; never edit it, edit ${CAST_FILE})\nwindow.CAST = ${JSON.stringify(cast, null, 1)};\nconst CAST = window.CAST;\n`;
}
const loadsKit = (html) => /<script[^>]+src=["'][^"']*kit\/character\.js["']/.test(html);
/** Refresh the kit and cast.js wherever the film loads them: the film's compositions/kit/ and each board's boards/<X>/kit/ (a board is
 *  bridged from its own folder), plus the pinned p5 libraries. null when the project is not a character film. */
export function refreshFilmKit(projectDir, root = APP_ROOT) {
  const read = (rel) => readText(join(projectDir, ...rel.split("/")));
  const pages = ["index.html", ...(existsSync(join(projectDir, "boards")) ? readdirSync(join(projectDir, "boards")).map((b) => `boards/${b}/index.html`) : [])].filter((p) => loadsKit(read(p)));
  if (!pages.length) return null;
  const files = [...copyLibs(projectDir, root).files], cast = castScript(projectDir);
  for (const p of pages) {
    const kitRel = p === "index.html" ? "compositions/kit" : `${p.split("/").slice(0, -1).join("/")}/kit`;
    files.push(...copyKit(projectDir, kitRel, root));
    writeFileSync(join(projectDir, ...kitRel.split("/"), "cast.js"), cast); files.push(`${kitRel}/cast.js`);
  }
  return { pages, files };
}
/** The kit's guide and sources for Claude to read (.moworks/library/character-kit/), staged from the first step; never clawd.js. */
export function stageGuide(projectDir, root = APP_ROOT) {
  const src = kitSource(root);
  if (!src) throw Object.assign(new Error("The character kit is not pinned"), { code: "NOT_FOUND" });
  const dest = join(projectDir, ".moworks", "library", "character-kit"), mark = join(dest, "PINNED"), stampOf = `${src.commit} ${readText(join(HERE, "character.js")).length} example2`;
  if (readText(mark).trim() === stampOf) return { files: [] };
  rmSync(dest, { recursive: true, force: true });
  copyKit(dest, "src", root);
  cpSync(join(src.root, "ANIMATION_GUIDE.md"), join(dest, "ANIMATION_GUIDE.md"));
  mkdirSync(join(dest, "examples"), { recursive: true });
  writeFileSync(join(dest, "examples", "definition.json"), JSON.stringify(exampleDefinition(), null, 2) + "\n");
  writeFileSync(join(dest, "CREDIT.md"), `# The character kit, staged for this project\n\nClaudeAnimationBase by John Heibel, MIT: ${`https://github.com/${src.repo}/tree/${src.commit}`} (commit ${src.commit}).\n`
    + "src/core.js and src/timeline.js as shipped; src/clawd-parts.js: the parts of src/clawd.js that work for any character (faces, emotions, hats, emotes, moves, turns), cut out unchanged; "
    + "src/character.js: Moworks Studio's character layer. Clawd (Anthropic's mascot) is not here and never in a film. p5.js (LGPL-2.1) and p5.brush (MIT) are the app's copies in assets/_app/vendor/lib/.\n");
  writeFileSync(mark, `${stampOf}\n`);
  return { files: [".moworks/library/character-kit/ANIMATION_GUIDE.md", ".moworks/library/character-kit/src/character.js", ".moworks/library/character-kit/CREDIT.md"] };
}
/** The schema of a definition, for the rules to point at (git keeps only Clawd): the Clawd demo's
 *  body and views with its name, colours and credit taken out, marked as an example. Never drawn, never a film's character. */
export function exampleDefinition() {
  const { id, name, demo, label, about, credit, colors, ...shape } = readJson(join(HERE, "demo", "clawd.json"));
  return { _read: "The fields of a character definition, nothing else: write the film's own characters, never this one, never its body as it is here.",
    id: "example", name: "Example", about: "A box body on four legs with five key views, showing every field a definition can have.",
    colors: { col: "#8A8F98", dk: "#5C6068", lt: "#C4C8CE" }, ...shape };
}
/** The style's own rule file: ANIMATION_GUIDE.md as shipped, under a header that says how it is read here (no Clawd, the project's cast). */
export function ruleText(root = APP_ROOT) {
  const src = kitSource(root);
  if (!src) return null;
  const header = ["---", `name: ${STYLE_ID}`, "description: \"Brush cartoon: ClaudeAnimationBase's guide to short hand-painted cartoons (p5.brush strokes, boil, flat 2D, acting), read for this project's own characters.\"", "---", "",
    `> ClaudeAnimationBase's ANIMATION_GUIDE.md by John Heibel · ${fileLink(src, "ANIMATION_GUIDE.md")} · MIT · used as shipped.`,
    "> Read it with .moworks/rules/brush-cartoon-app/SKILL.md (how this app makes such a film inside HyperFrames). **Clawd is Anthropic's mascot and is never in this film**: wherever the guide says Clawd or clawd(), read the project's own characters (CHARACTERS.json) drawn with character(CAST.<id>, …); the guide's rules, emotions, moves and workflow hold as written. The app's tools replace the guide's commands (render.mjs, studio.html).",
    "", ""].join("\n");
  return `${header}\n${readText(join(src.root, "ANIMATION_GUIDE.md"))}`;
}
/** The model sheets of the project's characters (views and emotions, one still each through HyperFrames) in characters/sheets/, for
 *  Claude to check and the user to approve. The hf calls are passed in (the server's: snapshotAtForeground, so its event loop stays
 *  free; a CLI's sync snapshotAt works too). Returns { characters: [{ id, name, views, emotions }], problems }. */
export async function characterSheets(projectDir, { root = APP_ROOT, finalize, snapshotAt, encodePoster = null, only = null } = {}) {
  const cast = readCast(projectDir);
  if (cast.problems.length || !cast.characters.length) return { characters: [], problems: cast.problems.length ? cast.problems : [`Write ${CAST_FILE} first`] };
  const out = [], work = join(projectDir, ".moworks", "characters"), dest = join(projectDir, "characters", "sheets");
  mkdirSync(dest, { recursive: true });
  for (const c of cast.characters.filter((x) => !only || only.includes(x.id))) {
    const row = { id: c.id, name: c.name, views: null, emotions: null, error: null };
    for (const scene of ["views", "emotions"]) {
      const d = join(work, c.id, scene);
      rmSync(d, { recursive: true, force: true });
      writePage(d, c, { scene, duration: 4, root });
      try {
        await finalize(d, { googleFonts: false });
        const snapDir = join(work, c.id, `${scene}-snap`);
        rmSync(snapDir, { recursive: true, force: true });
        const s = await snapshotAt(d, [1.2], snapDir, { timeout: 60000 });
        const png = existsSync(snapDir) ? readdirSync(snapDir).find((f) => /^frame-.*\.png$/.test(f)) : null;
        if (s.exitCode !== 0 || !png) throw new Error(s.stderrTail.join(" ").slice(0, 300) || "no still");
        const name = `${c.id}-${scene}.png`;
        cpSync(join(snapDir, png), join(dest, name));
        row[scene] = `characters/sheets/${name}`;
      } catch (e) { row.error = `${scene}: ${String(e.message ?? e).slice(0, 300)}`; }
    }
    out.push(row);
  }
  return { characters: out, problems: [] };
}
