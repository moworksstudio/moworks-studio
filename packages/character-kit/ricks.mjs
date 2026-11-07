// Ricks Clip's characters (owner 05/11/2026 #1076, audit/102 §9): the fourth way to make a character. Each is one file, module/<id>.js
// (defineCast in toon.js's scope: packages/moworks-styles/ricks-cast.js), saved with its checks, its model sheet, its life clip and its poster in
// the user's store, <work>/library/characters/ricks-clip/<id>/ (never inside the app's repository). A Ricks Clip film takes it as it is: the
// file into film/cast/<id>.js (the film's bundle appends it to toon.js) and a line in CHARACTERS.json; Claude places, turns, poses and gives it
// faces with castDraw and never redraws it. The app ships none: the source skill's own cast (roman.js OUTFITS) is drawn by the film's story.js as before.
import { cpSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { docPath, writeDoc } from "../project-service/docs.mjs";
import { APP_ROOT } from "../version-manager/index.mjs";
import { forgetHistory, mediaRoot, removeFromStore, shippedRoot } from "./index.mjs";
import { readJson } from "../util/json.mjs";

export const RICKS_ENGINE = "ricks-clip";
export const ricksDir = (root = APP_ROOT) => join(mediaRoot(root), RICKS_ENGINE);
/** The app's own (owner #1287-#1293): the source skill's eight outfits, named, made by tools/ship-characters.mjs, read in place. */
export const ricksShippedDir = (root = APP_ROOT) => join(shippedRoot(root), RICKS_ENGINE);

// the life clip (idle, a turn through the views, a walk, a talk) is the card's walk, as anidoodle's walk plays there
const MEDIA = [["sheet", "sheet.webp"], ["walk", "life.mp4"], ["poster", "poster.webp"]];
const recordsIn = (d) => (existsSync(d) ? readdirSync(d).flatMap((id) => { const c = readJson(join(d, id, "character.json")); return c?.id === id ? [c] : []; }) : []);

/** The Ricks Clip characters, by id, each with its media urls: the user's own (group "yours"), then the app's shipped ones the user has no copy of
 *  (group "app", Moworks: the owner's source skill's cast). */
export function ricksCharacters(root = APP_ROOT) {
  const mine = recordsIn(ricksDir(root)), have = new Set(mine.map((c) => c.id));
  const view = (c, group) => ({ ...c, kind: c.kind ?? "human", engine: RICKS_ENGINE, group, demo: false, selectable: true, why: null,
    media: Object.fromEntries(MEDIA.map(([k, f]) => [k, existsSync(join(ricksFolder(c.id, root) ?? "", f)) ? `/media/characters/${RICKS_ENGINE}/${c.id}/${f}` : null])) });
  return [...mine.map((c) => view(c, c.credit?.made === "as shipped" ? "app" : "yours")), ...recordsIn(ricksShippedDir(root)).filter((c) => !have.has(c.id)).map((c) => view(c, "app"))]
    .sort((a, b) => (a.id < b.id ? -1 : 1));
}
/** A character's folder: the user's copy first, else the app's shipped one. */
export const ricksFolder = (id, root = APP_ROOT) => [ricksDir(root), ricksShippedDir(root)].map((d) => join(d, id)).find((f) => readJson(join(f, "character.json"))?.id === id) ?? null;
export const ricksRecord = (id, root = APP_ROOT) => { const f = ricksFolder(id, root); return f ? readJson(join(f, "character.json")) : null; };
/** The character's file in its store. */
export const ricksModule = (id, root = APP_ROOT) => { const f = ricksFolder(id, root); return f && existsSync(join(f, "module", `${id}.js`)) ? join(f, "module", `${id}.js`) : null; };

/** Delete one of the user's Ricks Clip characters (its versions and history too). */
export function deleteRicks(id, root = APP_ROOT) {
  const f = ricksFolder(id, root);
  if (!f) throw Object.assign(new Error("No such character"), { code: "NOT_FOUND" });
  if (f.startsWith(ricksShippedDir(root))) throw Object.assign(new Error("The app's own characters cannot be deleted"), { code: "INVALID" });
  removeFromStore(f, root); forgetHistory(id, root);
  return { deleted: id };
}

/** Put saved Ricks Clip characters into a Ricks Clip film: film/cast/<id>.js, its sheet and poster for the Character dialog, a line in
 *  CHARACTERS.json. Returns the ids added. */
export function useRicks(projectDir, ids, { root = APP_ROOT } = {}) {
  const castFile = docPath(projectDir, "CHARACTERS.json"), j = readJson(castFile, { characters: [] }), have = Array.isArray(j) ? j : j?.characters ?? [], out = [...have], added = [];
  for (const id of ids ?? []) {
    const c = ricksRecord(String(id), root), mod = ricksModule(String(id), root);
    if (!c || !mod) throw Object.assign(new Error(`No Ricks Clip character "${id}"`), { code: "NOT_FOUND" });
    if (out.some((x) => x.id === c.id)) continue;
    mkdirSync(join(projectDir, "film", "cast"), { recursive: true });
    cpSync(mod, join(projectDir, "film", "cast", `${c.id}.js`));
    mkdirSync(join(projectDir, "characters", "sheets"), { recursive: true });
    for (const [f, to] of [["sheet.webp", "sheet"], ["poster.webp", "poster"]]) if (existsSync(join(ricksFolder(c.id, root), f))) cpSync(join(ricksFolder(c.id, root), f), join(projectDir, "characters", "sheets", `${c.id}-${to}.webp`));
    out.push({ id: c.id, name: c.name, about: c.about ?? "", engine: RICKS_ENGINE, kind: c.kind ?? "human", file: `film/cast/${c.id}.js`, heightM: c.heightM ?? null, ownStyle: true,
      made: c.credit?.made ?? "written from the idea", credit: c.credit ?? null, from: { library: RICKS_ENGINE, at: new Date().toISOString() } });
    added.push(c.id);
  }
  writeDoc(projectDir, "CHARACTERS.json", JSON.stringify({ characters: out }, null, 2) + "\n");
  return added;
}
