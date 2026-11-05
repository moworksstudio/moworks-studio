// Ricks Clip's characters (owner 05/11/2026 #1076, audit/102 §9): the fourth way to make a character. Each is one file, module/<id>.js
// (defineCast in toon.js's scope: packages/moworks-kits/ricks-cast.js), saved with its checks, its model sheet, its life clip and its poster in
// the user's store, <work>/library/characters/ricks-clip/<id>/ (never inside the app's repository). A Ricks Clip film takes it as it is: the
// file into film/cast/<id>.js (the film's bundle appends it to toon.js) and a line in CHARACTERS.json; Claude places, turns, poses and gives it
// faces with castDraw and never redraws it. The app ships none: the kit's own cast (roman.js OUTFITS) is drawn by the film's story.js as before.
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { docPath, writeDoc } from "../project-service/docs.mjs";
import { APP_ROOT } from "../version-manager/index.mjs";
import { forgetHistory, mediaRoot, removeFromStore } from "./index.mjs";

export const RICKS_ENGINE = "ricks-clip";
export const ricksDir = (root = APP_ROOT) => join(mediaRoot(root), RICKS_ENGINE);
const readJson = (f, d = null) => { try { return JSON.parse(readFileSync(f, "utf8")); } catch { return d; } };
// the life clip (a turn through the three views and a walk) is the card's walk, as anidoodle's walk plays there
const MEDIA = [["sheet", "sheet.webp"], ["walk", "life.mp4"], ["poster", "poster.webp"]];

/** The user's Ricks Clip characters, by id, each with its media urls. */
export function ricksCharacters(root = APP_ROOT) {
  const d = ricksDir(root);
  const list = existsSync(d) ? readdirSync(d).flatMap((id) => { const c = readJson(join(d, id, "character.json")); return c?.id === id ? [c] : []; }) : [];
  return list.sort((a, b) => (a.id < b.id ? -1 : 1)).map((c) => ({ ...c, kind: c.kind ?? "human", engine: RICKS_ENGINE, group: "yours", demo: false, selectable: true, why: null,
    media: Object.fromEntries(MEDIA.map(([k, f]) => [k, existsSync(join(d, c.id, f)) ? `/media/characters/${RICKS_ENGINE}/${c.id}/${f}` : null])) }));
}
export const ricksFolder = (id, root = APP_ROOT) => (readJson(join(ricksDir(root), id, "character.json"))?.id === id ? join(ricksDir(root), id) : null);
export const ricksRecord = (id, root = APP_ROOT) => { const f = ricksFolder(id, root); return f ? readJson(join(f, "character.json")) : null; };
/** The character's file in its store. */
export const ricksModule = (id, root = APP_ROOT) => { const f = ricksFolder(id, root); return f && existsSync(join(f, "module", `${id}.js`)) ? join(f, "module", `${id}.js`) : null; };

/** Delete one of the user's Ricks Clip characters (its versions and history too). */
export function deleteRicks(id, root = APP_ROOT) {
  const f = ricksFolder(id, root);
  if (!f) throw Object.assign(new Error("No such character"), { code: "NOT_FOUND" });
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
