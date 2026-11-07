// What If's characters (owner #1287-#1293): the sixth way to make a character, as 3D Cartoon's (c3d.mjs). Each is one TypeScript module, module/<id>.ts,
// exporting CHARACTER = { id, name, about, heightM, scale, look } where look is the What If rig's Look (FreshStack's engine, MIT), saved with its checks,
// its model sheet, its life clip and its poster in the user's store, <work>/library/characters/what-if/<id>/ (never inside the app's repository). A
// What If film takes it as it is: the file into whatif/cast/<id>.ts (its episode draws it with <AppHero look={CHARACTER.look} …> from "mw:wi-cast",
// or the rig's own <Hero>) and a line in CHARACTERS.json. The app's own: the engine's cast, in bundle/library/characters/what-if/.
import { cpSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { docPath, writeDoc } from "../project-service/docs.mjs";
import { APP_ROOT } from "../version-manager/index.mjs";
import { forgetHistory, mediaRoot, removeFromStore, shippedRoot } from "./index.mjs";
import { readJson } from "../util/json.mjs";

export const WI_ENGINE = "what-if";
/** Where a film keeps its library characters (beside the episode, whatif/episode.tsx). */
export const WI_CAST_DIR = "whatif/cast";
export const wiDir = (root = APP_ROOT) => join(mediaRoot(root), WI_ENGINE);
/** The app's own (owner #1287-#1293): the engine's own cast (Pip, Mo, Sis, Mum, The Suit), made by tools/ship-characters.mjs, read in place. */
export const wiShippedDir = (root = APP_ROOT) => join(shippedRoot(root), WI_ENGINE);

const MEDIA = [["sheet", "sheet.webp"], ["walk", "life.mp4"], ["poster", "poster.webp"]];
const recordsIn = (d) => (existsSync(d) ? readdirSync(d).flatMap((id) => { const c = readJson(join(d, id, "character.json")); return c?.id === id ? [c] : []; }) : []);

/** The What If characters, by id, each with its media urls: the user's own (group "yours"), then the app's shipped ones the user has no copy of
 *  (group "app", Moworks: the engine's cast, FreshStack's, MIT). */
export function wiCharacters(root = APP_ROOT) {
  const mine = recordsIn(wiDir(root)), have = new Set(mine.map((c) => c.id));
  const shipped = recordsIn(wiShippedDir(root)).filter((c) => !have.has(c.id));
  const view = (c, group) => ({ ...c, kind: c.kind ?? "human", engine: WI_ENGINE, group, demo: false, selectable: true, why: null,
    media: Object.fromEntries(MEDIA.map(([k, f]) => [k, existsSync(join(wiFolder(c.id, root) ?? "", f)) ? `/media/characters/${WI_ENGINE}/${c.id}/${f}` : null])) });
  return [...mine.map((c) => view(c, c.credit?.made === "as shipped" ? "app" : "yours")), ...shipped.map((c) => view(c, "app"))].sort((a, b) => (a.id < b.id ? -1 : 1));
}
/** A character's folder: the user's copy first, else the app's shipped one. */
export const wiFolder = (id, root = APP_ROOT) => [wiDir(root), wiShippedDir(root)].map((d) => join(d, id)).find((f) => readJson(join(f, "character.json"))?.id === id) ?? null;
export const wiRecord = (id, root = APP_ROOT) => { const f = wiFolder(id, root); return f ? readJson(join(f, "character.json")) : null; };
/** The character's file in its store. */
export const wiModule = (id, root = APP_ROOT) => { const f = wiFolder(id, root); return f && existsSync(join(f, "module", `${id}.ts`)) ? join(f, "module", `${id}.ts`) : null; };

/** Delete one of the user's What If characters (its versions and history too). */
export function deleteWhatIf(id, root = APP_ROOT) {
  const f = wiFolder(id, root);
  if (!f) throw Object.assign(new Error("No such character"), { code: "NOT_FOUND" });
  if (f.startsWith(wiShippedDir(root))) throw Object.assign(new Error("The app's own characters cannot be deleted"), { code: "INVALID" });
  removeFromStore(f, root); forgetHistory(id, root);
  return { deleted: id };
}

/** Put saved What If characters into a What If film: whatif/cast/<id>.ts, its sheet and poster for the Character dialog, a line in
 *  CHARACTERS.json. Returns the ids added. */
export function useWhatIf(projectDir, ids, { root = APP_ROOT } = {}) {
  const castFile = docPath(projectDir, "CHARACTERS.json"), j = readJson(castFile, { characters: [] }), have = Array.isArray(j) ? j : j?.characters ?? [], out = [...have], added = [];
  for (const id of ids ?? []) {
    const c = wiRecord(String(id), root), mod = wiModule(String(id), root);
    if (!c || !mod) throw Object.assign(new Error(`No What If character "${id}"`), { code: "NOT_FOUND" });
    if (out.some((x) => x.id === c.id)) continue;
    mkdirSync(join(projectDir, ...WI_CAST_DIR.split("/")), { recursive: true });
    cpSync(mod, join(projectDir, ...WI_CAST_DIR.split("/"), `${c.id}.ts`));
    mkdirSync(join(projectDir, "characters", "sheets"), { recursive: true });
    for (const [f, to] of [["sheet.webp", "sheet"], ["poster.webp", "poster"]]) if (existsSync(join(wiFolder(c.id, root), f))) cpSync(join(wiFolder(c.id, root), f), join(projectDir, "characters", "sheets", `${c.id}-${to}.webp`));
    out.push({ id: c.id, name: c.name, about: c.about ?? "", engine: WI_ENGINE, kind: c.kind ?? "human", file: `${WI_CAST_DIR}/${c.id}.ts`, heightM: c.heightM ?? null, ownStyle: true,
      made: c.credit?.made ?? "written from the idea", credit: c.credit ?? null, from: { library: WI_ENGINE, at: new Date().toISOString() } });
    added.push(c.id);
  }
  writeDoc(projectDir, "CHARACTERS.json", JSON.stringify({ characters: out }, null, 2) + "\n");
  return added;
}
