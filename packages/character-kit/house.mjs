// The house heroes in the Character library (owner #1287-#1293): the hero a film style's source skill draws itself, shipped as the app's (Moworks):
// Stickman Explainer's hoodie hero, Inner Voice Short's hero and its shadow, the 2D Explainer's kid. Each is one small file, module/<id>.js
// (CHARACTER = { id, name, about, heightM, engine, opts }: options for the source skill's own drawing), with its checks, its MW Character Sheet v1,
// its life clip and its poster, in bundle/library/characters/<engine>/<id>/ (made by tools/ship-characters.mjs). A film of that style draws its
// hero with its own code as before; the record's `can` says what that drawing drives.
// The user's own (owner #1302: Stickman Explainer makes "a new look per video" from figure()'s outfit / build / hair / shoes): made by the
// Character creator in <work>/library/characters/<engine>/<id>/ (never in the app's repository), the same file and media. A film of that style
// takes it as it is (useHouse: the file in characters/house/, a line in CHARACTERS.json with its opts); any other film sees it as a reference.
import { cpSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { docPath, writeDoc } from "../project-service/docs.mjs";
import { APP_ROOT } from "../version-manager/index.mjs";
import { forgetHistory, mediaRoot, removeFromStore, shippedRoot } from "./index.mjs";
import { readJson } from "../util/json.mjs";

export const HOUSE_ENGINES = Object.freeze(["stickman-explainer", "inner-voice-short", "explainer-2d"]);
/** The house engines whose characters the user can make (owner #1302; Inner Voice Short has one fixed hero and its shadow). */
export const HOUSE_MAKERS = Object.freeze(["stickman-explainer", "explainer-2d"]);
/** Where a film keeps the house characters it takes (the file a film's code imports CHARACTER.opts from). */
export const HOUSE_CAST_DIR = "characters/house";

const MEDIA = [["sheet", "sheet.webp"], ["walk", "life.mp4"], ["poster", "poster.webp"]];
export const houseDir = (engine, root = APP_ROOT) => join(shippedRoot(root), engine);
/** The user's own house characters of an engine. */
export const houseUserDir = (engine, root = APP_ROOT) => join(mediaRoot(root), engine);
const recordsIn = (d) => (existsSync(d) ? readdirSync(d).flatMap((id) => { const c = readJson(join(d, id, "character.json")); return c?.id === id ? [c] : []; }) : []);

/** The house characters, each with its media urls: the user's own (group "yours") and the app's (group "app", Moworks). */
export function houseCharacters(root = APP_ROOT) {
  return HOUSE_ENGINES.flatMap((e) => {
    const mine = recordsIn(houseUserDir(e, root)), have = new Set(mine.map((c) => c.id));
    const view = (c, group, d) => ({ ...c, engine: e, kind: c.kind ?? "human", group, demo: false, selectable: true, why: null,
      media: Object.fromEntries(MEDIA.map(([k, f]) => [k, existsSync(join(d, c.id, f)) ? `/media/characters/${e}/${c.id}/${f}` : null])) });
    return [...mine.map((c) => view(c, c.credit?.made === "as shipped" ? "app" : "yours", houseUserDir(e, root))),
      ...recordsIn(houseDir(e, root)).filter((c) => !have.has(c.id)).map((c) => view(c, "app", houseDir(e, root)))];
  }).sort((a, b) => (a.id < b.id ? -1 : 1));
}
export const houseRecord = (id, root = APP_ROOT) => houseCharacters(root).find((c) => c.id === id) ?? null;
/** A house character's folder: the user's copy first, else the app's shipped one. */
export function houseFolder(id, root = APP_ROOT) {
  for (const e of HOUSE_ENGINES) for (const d of [houseUserDir(e, root), houseDir(e, root)]) { const f = join(d, id); if (readJson(join(f, "character.json"))?.id === id) return f; }
  return null;
}
/** The character's file: module/<id>.js in its store (the app's shipped ones keep theirs in packages/character-kit/shipped/<engine>/). */
export function houseModule(id, root = APP_ROOT) {
  const f = houseFolder(id, root), rec = f ? readJson(join(f, "character.json")) : null;
  if (!rec) return null;
  const own = join(f, "module", `${id}.js`);
  if (existsSync(own)) return own;
  const shipped = join(root, "packages", "character-kit", "shipped", rec.engine, `${id}.js`);
  return existsSync(shipped) ? shipped : null;
}

/** Delete one of the user's house characters (its versions and history too). */
export function deleteHouse(id, root = APP_ROOT) {
  const f = houseFolder(id, root);
  if (!f) throw Object.assign(new Error("No such character"), { code: "NOT_FOUND" });
  if (!f.startsWith(mediaRoot(root))) throw Object.assign(new Error("The app's own characters cannot be deleted"), { code: "INVALID" });
  removeFromStore(f, root); forgetHistory(id, root);
  return { deleted: id };
}

/** Put saved house characters into a film of their own style: characters/house/<id>.js, its sheet and poster for the Character dialog, a line
 *  in CHARACTERS.json (its opts, for the film's figure() call). Returns the ids added. */
export function useHouse(projectDir, ids, { root = APP_ROOT } = {}) {
  const castFile = docPath(projectDir, "CHARACTERS.json"), j = readJson(castFile, { characters: [] }), have = Array.isArray(j) ? j : j?.characters ?? [], out = [...have], added = [];
  for (const id of ids ?? []) {
    const c = houseRecord(String(id), root), mod = houseModule(String(id), root);
    if (!c || !mod) throw Object.assign(new Error(`No house character "${id}"`), { code: "NOT_FOUND" });
    if (out.some((x) => x.id === c.id)) continue;
    mkdirSync(join(projectDir, ...HOUSE_CAST_DIR.split("/")), { recursive: true });
    cpSync(mod, join(projectDir, ...HOUSE_CAST_DIR.split("/"), `${c.id}.js`));
    mkdirSync(join(projectDir, "characters", "sheets"), { recursive: true });
    const folder = houseFolder(c.id, root);
    for (const [f, to] of [["sheet.webp", "sheet"], ["poster.webp", "poster"]]) if (existsSync(join(folder, f))) cpSync(join(folder, f), join(projectDir, "characters", "sheets", `${c.id}-${to}.webp`));
    out.push({ id: c.id, name: c.name, about: c.about ?? "", engine: c.engine, kind: c.kind ?? "human", file: `${HOUSE_CAST_DIR}/${c.id}.js`, opts: c.opts ?? {}, heightM: c.heightM ?? null, ownStyle: true,
      made: c.credit?.made ?? "written from the idea", credit: c.credit ?? null, from: { library: c.engine, at: new Date().toISOString() } });
    added.push(c.id);
  }
  writeDoc(projectDir, "CHARACTERS.json", JSON.stringify({ characters: out }, null, 2) + "\n");
  return added;
}
