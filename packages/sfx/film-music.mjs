// The film's music track in one place (audit/112a B2: it was written in five places of three server files, each its own way): what is kept
// about it in the film's meta (meta.music: one writer, its changes named), and the rules of its stop: where the Motion Plan's stop at the
// twist counts (STOP_AT_TURN), and a stop the app or Claude sets moved into the voice-over's nearest pause. The track on the page is
// hf-edit/tracks.mjs's (placeTrack, stopMusic, musicLoop); the options and their credit, music.mjs's; Final Mix's routes, server/mix.mjs.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import * as projects from "../project-service/index.mjs";
import * as plan from "../motion-plan/index.mjs";
import { filmKind } from "../agent/reads.mjs";
import { snapStop, stopContext } from "./stop-snap.mjs";

// a film style whose own rule stops the music at the turn: What If animation, Ricks Clip (its SKILL.md §4.7: at the twist line; T39-10), 3D Cartoon
// (the app's pack, #1267: when the film's plan sets it)
export const STOP_AT_TURN = new Set(["what-if", "ricks-clip", "cartoon-3d"]);

/** The one writer of meta.music. change, one of:
 *  { placed: { file, duration, beats } }: a track on the timeline (what was kept of the one before goes);
 *  { chosen: track }: the option it came from (title, artist, page, licence, the option's file);
 *  { stopAt: seconds | null }: stopped there, or (null) played to its end again by choice;
 *  { repeatNoted: at }: the chat said once that the song repeats from there;
 *  { renamed: { from, to } }: its file renamed in Assets; { gone: file }: that file taken off the timeline, the film has no music. */
export function recordMusic(id, change, root) {
  return projects.updateMeta(id, (m) => {
    if (change.placed) { const x = change.placed; m.music = { file: x.file, duration: x.duration ?? null, beats: x.beats ?? null, at: new Date().toISOString() }; return; }
    if (change.chosen) { const t = change.chosen; m.music = { ...m.music, title: t.title, artist: t.artist, page: t.page, licence: t.licence, option: t.file }; return; }
    if (!m.music) return;
    if ("stopAt" in change) { if (change.stopAt == null) { delete m.music.stopAt; m.music.toEnd = true; } else { m.music.stopAt = change.stopAt; delete m.music.toEnd; } }
    else if (change.repeatNoted != null) m.music.repeatNoted = change.repeatNoted;
    else if (change.renamed) { if (m.music.file === change.renamed.from) m.music.file = change.renamed.to; }
    else if (change.gone) { if (m.music.file === change.gone) delete m.music; }
  }, root);
}

/** A music cut at the twist is What If's and Ricks Clip's own rule: the plan's musicStop counts only in a What If film (the film kind, or
 *  the What If animation style), a film of a style that stops at the turn, or when the plan quotes the brief's or the user's words asking
 *  for it; otherwise the music plays to the end, with its fade out. Final Mix's "Stop the music at" and Claude's music_stop tool are not gated. */
export const planStopAllowed = (p, mp) => filmKind(p.path)?.id === "whatIf" || STOP_AT_TURN.has(p.meta?.style?.id) || !!mp.musicStopAsked;

/** The Motion Plan's stop at the twist when it counts for this film (planStopAllowed), its second; else null. */
export function planStopAt(p) {
  const mp = plan.read(p.path);
  return mp.exists && !mp.error && mp.plan.musicStop > 0 && planStopAllowed(p, mp.plan) ? mp.plan.musicStop : null;
}

/** A stop the app or Claude sets, moved into the voice-over's nearest pause (snapStop: { at, moved, word, after }); the user's own second stays as given. */
export function snappedStop(p, at) {
  let start = 0;
  try { start = Number(/\bdata-start="([\d.]+)"/.exec(/<audio\b[^>]*\bid="el-music"[^>]*>/i.exec(readFileSync(join(p.path, "index.html"), "utf8"))?.[0] ?? "")?.[1]) || 0; } catch { /* no film page yet */ }
  const { words, beats } = stopContext(p.path, p.meta, start);
  return snapStop(at, words, beats);
}
