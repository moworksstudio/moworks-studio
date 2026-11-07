// 3D Cartoon's characters (owner #1267, audit/111 B6): the fifth way to make a character, as Ricks Clip's (ricks.mjs). Each is one TypeScript module,
// module/<id>.ts, exporting CHARACTER = { id, name, about, heightM, def (the 3D Cartoon source skill's CharDef), build() } made on the source skill's
// own buildCharacter, saved with its checks, its model sheet, its life clip and its poster in the user's store, <work>/library/characters/cartoon-3d/<id>/
// (never inside the app's repository). A 3D Cartoon film takes it as it is: the file into src/videos/film/cast/<id>.ts (its world.ts builds it with
// `CHARACTER.build()`) and a line in CHARACTERS.json; Claude places, poses and gives it faces with the source skill's own rig and never redraws it.
// The app ships none: the source skill's own cast (Mika, Ravi, June, Otto) is built by the film as before.
import { cpSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { docPath, writeDoc } from "../project-service/docs.mjs";
import { APP_ROOT } from "../version-manager/index.mjs";
import { forgetHistory, mediaRoot, removeFromStore, shippedRoot } from "./index.mjs";
import { readJson } from "../util/json.mjs";

export const C3D_ENGINE = "cartoon-3d";
/** Where a film keeps its library characters (the source skill's video layout: src/videos/<slug>/). */
export const C3D_CAST_DIR = "src/videos/film/cast";
export const c3dDir = (root = APP_ROOT) => join(mediaRoot(root), C3D_ENGINE);
/** The app's own (owner #1287-#1293): the source skill's cast and its examples' extras, made by tools/ship-characters.mjs, read in place. */
export const c3dShippedDir = (root = APP_ROOT) => join(shippedRoot(root), C3D_ENGINE);

const MEDIA = [["sheet", "sheet.webp"], ["walk", "life.mp4"], ["poster", "poster.webp"]];
const recordsIn = (d) => (existsSync(d) ? readdirSync(d).flatMap((id) => { const c = readJson(join(d, id, "character.json")); return c?.id === id ? [c] : []; }) : []);

/** The 3D Cartoon characters, by id, each with its media urls: the user's own (group "yours"), then the app's shipped ones the user has no copy of
 *  (group "app", Moworks: the owner's source skill's cast). */
export function c3dCharacters(root = APP_ROOT) {
  const mine = recordsIn(c3dDir(root)), have = new Set(mine.map((c) => c.id));
  const shipped = recordsIn(c3dShippedDir(root)).filter((c) => !have.has(c.id));
  const view = (c, group) => ({ ...c, kind: c.kind ?? "human", engine: C3D_ENGINE, group, demo: false, selectable: true, why: null,
    media: Object.fromEntries(MEDIA.map(([k, f]) => [k, existsSync(join(c3dFolder(c.id, root) ?? "", f)) ? `/media/characters/${C3D_ENGINE}/${c.id}/${f}` : null])) });
  return [...mine.map((c) => view(c, c.credit?.made === "as shipped" ? "app" : "yours")), ...shipped.map((c) => view(c, "app"))].sort((a, b) => (a.id < b.id ? -1 : 1));
}
/** A character's folder: the user's copy first, else the app's shipped one. */
export const c3dFolder = (id, root = APP_ROOT) => [c3dDir(root), c3dShippedDir(root)].map((d) => join(d, id)).find((f) => readJson(join(f, "character.json"))?.id === id) ?? null;
/** True for one the app ships (deleting it is never offered; a change makes the user's own copy). */
export const c3dShipped = (id, root = APP_ROOT) => readJson(join(c3dShippedDir(root), id, "character.json"))?.id === id;
export const c3dRecord = (id, root = APP_ROOT) => { const f = c3dFolder(id, root); return f ? readJson(join(f, "character.json")) : null; };
/** The character's file in its store. */
export const c3dModule = (id, root = APP_ROOT) => { const f = c3dFolder(id, root); return f && existsSync(join(f, "module", `${id}.ts`)) ? join(f, "module", `${id}.ts`) : null; };

/** Delete one of the user's 3D Cartoon characters (its versions and history too). */
export function deleteC3d(id, root = APP_ROOT) {
  const f = c3dFolder(id, root);
  if (!f) throw Object.assign(new Error("No such character"), { code: "NOT_FOUND" });
  if (f.startsWith(c3dShippedDir(root))) throw Object.assign(new Error("The app's own characters cannot be deleted"), { code: "INVALID" });
  removeFromStore(f, root); forgetHistory(id, root);
  return { deleted: id };
}

/** Put saved 3D Cartoon characters into a 3D Cartoon film: src/videos/film/cast/<id>.ts, its sheet and poster for the Character dialog, a line in
 *  CHARACTERS.json. Returns the ids added. */
export function useC3d(projectDir, ids, { root = APP_ROOT } = {}) {
  const castFile = docPath(projectDir, "CHARACTERS.json"), j = readJson(castFile, { characters: [] }), have = Array.isArray(j) ? j : j?.characters ?? [], out = [...have], added = [];
  for (const id of ids ?? []) {
    const c = c3dRecord(String(id), root), mod = c3dModule(String(id), root);
    if (!c || !mod) throw Object.assign(new Error(`No 3D Cartoon character "${id}"`), { code: "NOT_FOUND" });
    if (out.some((x) => x.id === c.id)) continue;
    mkdirSync(join(projectDir, ...C3D_CAST_DIR.split("/")), { recursive: true });
    cpSync(mod, join(projectDir, ...C3D_CAST_DIR.split("/"), `${c.id}.ts`));
    mkdirSync(join(projectDir, "characters", "sheets"), { recursive: true });
    for (const [f, to] of [["sheet.webp", "sheet"], ["poster.webp", "poster"]]) if (existsSync(join(c3dFolder(c.id, root), f))) cpSync(join(c3dFolder(c.id, root), f), join(projectDir, "characters", "sheets", `${c.id}-${to}.webp`));
    out.push({ id: c.id, name: c.name, about: c.about ?? "", engine: C3D_ENGINE, kind: c.kind ?? "human", file: `${C3D_CAST_DIR}/${c.id}.ts`, heightM: c.heightM ?? null, ownStyle: true,
      made: c.credit?.made ?? "written from the idea", credit: c.credit ?? null, from: { library: C3D_ENGINE, at: new Date().toISOString() } });
    added.push(c.id);
  }
  writeDoc(projectDir, "CHARACTERS.json", JSON.stringify({ characters: out }, null, 2) + "\n");
  return added;
}
