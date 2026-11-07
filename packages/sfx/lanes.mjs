// The timeline's sound lanes as HyperFrames' audio group buses (core audioGroups: <hf-audio-group data-volume> and data-audio-group on each clip; the
// render mixes each group and applies its volume). One fader a lane moves every clip of it at once, on top of what the app set for each clip: its
// level, its duck and its fit stay as they are and keep working. A film whose lanes were never moved has no group and mixes exactly as before; a lane
// back at 0 dB leaves the film again, and the last one takes the groups with it. Clips placed later join their lane the next time the film is mixed.
// Mute (owner 03/11, 3b): HyperFrames' own mute of a bus, `data-hidden` on its group (core audioGroups; the render's mixer drops a hidden bus's
// members: "mute-by-drop, never mute-by-volume-0"), so a muted lane is heard neither in the Editor nor in the render. Its fader is kept.
import { attrsOf } from "../hf-edit/tag.mjs";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { audioKind } from "../hf-edit/tracks.mjs";

export const LANES = Object.freeze(["voice", "sfx", "music"]);
export const LANE_MIN_DB = -30, LANE_MAX_DB = 12;          // 12: HyperFrames' own ceiling for a gain (core audioGain MAX_AUDIO_GAIN_DB)
const groupId = (lane) => `mw-lane-${lane}`;
const GROUP = /[ \t]*<hf-audio-group\b[^>]*\bid="mw-lane-(voice|sfx|music)"[^>]*>\s*<\/hf-audio-group>[ \t]*\r?\n?/g;
const AUDIO = /<audio\b[^>]*>/gi;
const page = (dir) => { try { return readFileSync(join(dir, "index.html"), "utf8"); } catch { return null; } };
const toDb = (gain) => Math.round(20 * Math.log10(gain) * 10) / 10;
const toGain = (db) => Math.round(10 ** (db / 20) * 10000) / 10000;

/** The lane a clip plays on: its kind, and every sound that is neither voice nor music on the effects' lane (as the timeline shows them). */
const laneOf = (a) => audioKind(a) ?? "sfx";

/** The lanes' groups on the page: { lane: { gain, muted } } (a gain of 1 for a muted lane whose fader is at 0 dB). */
const groups = (html) => {
  const out = {};
  for (const m of html.matchAll(/<hf-audio-group\b[^>]*>/gi)) {
    const a = attrsOf(m[0]), lane = /^mw-lane-(voice|sfx|music)$/.exec(a.id ?? "")?.[1];
    if (!lane) continue;
    const muted = /\sdata-hidden(?=[\s=/>])/.test(m[0]), g = Number(a["data-volume"]);
    if (muted || g > 0) out[lane] = { gain: g > 0 ? g : 1, muted };
  }
  return out;
};
const gains = (html) => Object.fromEntries(Object.entries(groups(html)).map(([l, x]) => [l, x.gain]));
/** Each lane's fader in dB: { voice, sfx, music }, 0 for a lane never moved. */
export function readLanes(dir) {
  const g = gains(page(dir) ?? "");
  return Object.fromEntries(LANES.map((l) => [l, g[l] ? toDb(g[l]) : 0]));
}
/** Each lane muted or not: { voice, sfx, music }. */
export function readMuted(dir) {
  const g = groups(page(dir) ?? "");
  return Object.fromEntries(LANES.map((l) => [l, !!g[l]?.muted]));
}
/** The page with its clips in the lanes that have a group (a fader moved, or muted), and only those. */
function withMembers(html) {
  const moved = gains(html);
  return html.replace(AUDIO, (tag) => {
    const a = attrsOf(tag), want = moved[laneOf(a)] ? groupId(laneOf(a)) : null, has = a["data-audio-group"] ?? null;
    if (has === want || (has && !/^mw-lane-/.test(has))) return tag;          // a group Claude or the user made stays theirs
    const bare = tag.replace(/\s+data-audio-group="[^"]*"/, "");
    return want ? bare.replace(/\s*\/?>$/, (end) => ` data-audio-group="${want}"${end}`) : bare;
  });
}
/** Clips placed since the last change join their lane. Nothing is written for a film with no group. Returns whether the page changed. */
export function applyLanes(dir) {
  const html = page(dir);
  if (html == null || !Object.keys(gains(html)).length) return false;
  const out = withMembers(html);
  if (out !== html) writeFileSync(join(dir, "index.html"), out);
  return out !== html;
}
/** The page with the lanes' groups as `g` says ({ lane: { gain, muted } }): a lane at 0 dB and not muted has none. */
function writeGroups(dir, html, g) {
  const keep = (l) => g[l] && (g[l].muted || Math.abs(g[l].gain - 1) > 1e-6);
  const line = (l) => `<hf-audio-group id="${groupId(l)}" data-volume="${g[l].gain}"${g[l].muted ? " data-hidden" : ""}></hf-audio-group>`;
  const block = LANES.filter(keep).map((l) => `    ${line(l)}\n`).join("");
  let out = html.replace(GROUP, "");
  if (block) {
    const end = /<!-- \/mw:tracks -->[ \t]*\r?\n?/.exec(out) ?? /<!-- \/mw:sfx -->[ \t]*\r?\n?/.exec(out);
    if (end) out = out.slice(0, end.index + end[0].length) + (end[0].endsWith("\n") ? "" : "\n") + block + out.slice(end.index + end[0].length);
    else out = /<\/body>/i.test(out) ? out.replace(/<\/body>/i, `${block}</body>`) : out + block;
  }
  writeFileSync(join(dir, "index.html"), withMembers(out));
}
const pageOf = (dir, lane) => {
  if (!LANES.includes(lane)) throw Object.assign(new Error("A lane is the voice, the effects or the music"), { code: "INVALID" });
  const html = page(dir);
  if (html == null) throw Object.assign(new Error("The film has no page yet"), { code: "INVALID" });
  return html;
};
/** Set one lane's fader, in dB (a muted lane stays muted). Returns every lane's fader. */
export function setLane(dir, lane, db) {
  const html = pageOf(dir, lane);
  const d = Math.min(LANE_MAX_DB, Math.max(LANE_MIN_DB, Number(db) || 0)), g = groups(html);
  g[lane] = { gain: Math.abs(d) < 0.05 ? 1 : toGain(d), muted: !!g[lane]?.muted };
  writeGroups(dir, html, g);
  return readLanes(dir);
}
/** Mute or unmute one lane (its fader kept). Returns every lane's mute. */
export function setMute(dir, lane, muted) {
  const html = pageOf(dir, lane);
  const g = groups(html);
  g[lane] = { gain: g[lane]?.gain ?? 1, muted: !!muted };
  writeGroups(dir, html, g);
  return readMuted(dir);
}
