// The cues: the storyboard's `sfx:` lines read, a cue's identity (its shot, its name, its moment), and the keys that say when the cues or their times changed.
// (audit/112a B11: one of the files packages/sfx/index.mjs was split into; index.mjs is still the package's door.)
import { r3, readState, slug } from "./state.mjs";

const CUE = /^\s*(.+?)\s*(?:@\s*([\d.]+)\s*s?)?\s*$/;

/** A `- sound:` line that is a list of sound names ("water drip, bell, ting@0.4"), not a sentence about the sound ("nhạc vào nhẹ; tiếng
 *  nước; "ting" khi đèn sáng"): every part at most 4 words, no quotes or sentence marks. */
const soundList = (line) => !/[;"“”.!?:()]/.test(String(line).replace(/@\s*[\d.]+/g, "")) && String(line).split(",").every((p) => (CUE.exec(p)?.[1] ?? "").split(/\s+/).length <= 4);

/** A frame's line of sound names: its `- sfx:` line; a frame without one has its `- sound:` line read the same way when it is a list of names (Claude wrote
 *  `- sound: water drip, bell, ting` and the sounds were dropped). */
const cueLine = (s) => (s.sfx != null ? s.sfx : s.sound != null && soundList(s.sound) ? s.sound : "");

/** A frame that says `none`: silent. The app adds none of its own there either, no whoosh into it (T30-9: six whooshes on shots whose storyboard says none). */
export const sfxNone = (s) => /^\s*none\s*$/i.test(String(cueLine(s)));

/** Cues of the storyboard: [{ shot, index, name, offset }] ("whoosh@0.4" = 0.4 s after the shot starts; "none" = no sound). */
export function cuesOf(shots) {
  const out = [];
  for (const s of shots) {
    const line = cueLine(s);
    for (const part of String(line).split(",")) {
      const m = CUE.exec(part);
      if (!m || !m[1] || /^none$/i.test(m[1])) continue;
      out.push({ shot: s.number, index: s.index, name: m[1].toLowerCase(), offset: m[2] ? Number(m[2]) : 0, start: s.start });
    }
  }
  return out;
}

// ---- A cue's identity. `el-sfx-<n>` is only a sound's place in the last placement: a cue added in front moved every later n, and a sound the user had moved went back,
// one they had taken off came back (T29-3). What stays is the cue itself: the id the plan gives it (`sb:3:door-open@1.2`, `m:3:m5f2a`, `cut:3`), written on its tag
// (data-mw-cue) beside the second the app placed it at (data-mw-at). data-start away from that second is the user's move; it counts from the cue's place, so it stays
// when the shots before it change length. An older film's tags have neither: its sfx.json says the same by their n.
/** A cue's identity, for the life of the film. */
export const cueIdOf = (c) => c.id ?? (c.shot != null ? `sb:${c.shot}:${slug(c.name)}@${c.offset ?? 0}` : `at:${slug(c.name)}@${r3((Number(c.start) || 0) + (Number(c.offset) || 0))}`);

/** The identity without its shot's number: a shot added or taken out renumbers the shots after it. null for a cut, which is only its shot. */
const sansShot = (key) => (/^(sb|m):\d+:/.test(key) ? key.replace(/^(sb|m):\d+:/, "$1:") : null);

/** A storyboard cue without its second in the shot: the same cue when the storyboard moves it (null for the others). */
const sansTime = (key) => (/^sb:/.test(key) ? key.replace(/@[^@]*$/, "") : null);

/** Is this earlier cue the one the plan now calls `key`, though its identity changed? It is gone from the plan (`keys`), and its shot and name are the same (moved in its shot), or
 *  all but its shot's number is. "time" | "shot" | null. */
export const sameCue = (old, key, keys) => (keys.has(old) ? null : sansTime(key) && sansTime(old) === sansTime(key) ? "time" : sansShot(key) && sansShot(old) === sansShot(key) ? "shot" : null);

/** The storyboard's named cues as one line ("1:whoosh@0|3:lamp ting@2.1"), whatever their times, with its frames' `- ambience:` lines
 *  ("2:ambience=rain"): what a placement was made from (a chat change of either places the sounds again). */
export const cueKey = (shots) => [...cuesOf(shots).map((c) => `${c.shot}:${c.name}@${c.offset}`),
  ...shots.filter((s) => String(s.ambience ?? "").trim()).map((s) => `${s.number}:ambience=${String(s.ambience).trim().toLowerCase()}`)].sort().join("|");

/** Where every shot starts and how long it lasts: a Review that moved a shot leaves the sounds placed for the film as it was (timesChanged). */
export const timeKey = (shots) => (shots ?? []).filter((s) => s.start != null).map((s) => `${s.number}:${Number(s.start).toFixed(2)}+${Number(s.duration ?? 0).toFixed(2)}`).join("|");

/** Did a shot move or change its length since the sounds were last placed? false while none were placed, or for a placement from before this was kept. */
export function timesChanged(dir, shots) {
  const st = readState(dir);
  return !!st.mounted && st.times != null && st.times !== timeKey(shots);
}

/** Did the storyboard's named cues change since the sounds were last placed? false while none were ever placed (Final Mix places
 *  them first). A placement from before cueKey was kept counts as changed once. */
export function cuesChanged(dir, shots) {
  const st = readState(dir);
  if (!st.mounted && st.cueKey == null) return false;
  return st.cueKey !== cueKey(shots);
}
