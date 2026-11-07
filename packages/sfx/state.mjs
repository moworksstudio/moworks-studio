// The film's sound record (.moworks/sfx.json): read, patched, saved; the sounds the user added from the drawer.
// (audit/112a B11: one of the files packages/sfx/index.mjs was split into; index.mjs is still the package's door.)
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { attrsOf } from "../hf-edit/tag.mjs";
import { readJson } from "../util/json.mjs";

export { readJson } from "../util/json.mjs";          // one reader of a JSON file for the app (audit/112 2.8)

export const slug = (s) => String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "sound";

export const r3 = (n) => Math.round(n * 1000) / 1000;

const stateFile = (dir) => join(dir, ".moworks", "sfx.json");

export const readState = (dir) => readJson(stateFile(dir), { sounds: {} });

/** The start of a sound's name in sfx.json when the user added it from the Sounds drawer: never a storyboard cue's, which a placement replaces. */
export const ADDED = "added:";

/** Every file the app put in the film for a sound it found (a library copy, a download, a made sound, their copies) stays the app's for good
 *  (st.retired): a record replaced or dropped since left its file in assets/3_audio/sfx, and the next placement read it as the owner's own
 *  sound (T43-9: SFXMint's CC0 "Playing Card Flick 01" became "provided by the owner"). */
function keepAppFiles(st) {
  const files = Object.values(st?.sounds ?? {}).filter((s) => s && s.source !== "owner").flatMap((s) => [s.file, ...(s.variants ?? []).map((v) => v.file)]).filter(Boolean);
  if (files.length) st.retired = [...new Set([...(st.retired ?? []), ...files])].slice(-2000);
}

export function saveState(dir, st) { keepAppFiles(st); mkdirSync(join(dir, ".moworks"), { recursive: true }); writeFileSync(stateFile(dir), JSON.stringify(st, null, 2) + "\n"); }

/** The sounds the user added from the Sounds drawer as the film has them now (a move in Studio or on the timeline counts): [{ id, name, title, file,
 *  start, duration, volume }], by time. A clip taken off, or gone with an earlier version, is left out; its record stays, so a version brought
 *  back still finds its credit and its level (sfx.json is the app's own record: Versions leaves it as it is). */
export function addedNow(dir) {
  const st = readState(dir);
  if (!st.added?.length) return [];
  let html; try { html = readFileSync(join(dir, "index.html"), "utf8"); } catch { return []; }
  const tags = new Map([...html.matchAll(/<audio\b([^>]*)>/gi)].map((m) => attrsOf(m[1])).filter((a) => a.id).map((a) => [a.id, a]));
  return st.added.filter((m) => tags.get(m.id)?.src === m.file).map((m) => { const a = tags.get(m.id);
    return { ...m, title: st.sounds[m.name]?.title ?? m.name, start: Number(a["data-start"]) || 0, duration: Number(a["data-duration"]) || m.duration, volume: Number(a["data-volume"]) || m.volume }; })
    .sort((x, y) => x.start - y.start);
}

/** Change the state in one step (the placement's notes: what was thinned, the policy it followed). */
export function patchState(dir, fn) { const st = readState(dir); fn(st); saveState(dir, st); return st; }
