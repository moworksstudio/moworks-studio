// The user's own audio on the timeline: a voice-over (once its words are checked) and a music track, each placed in the
// root composition from 0 s on its own track, the way HyperFrames marks them (data-timeline-role "voiceover" / "music"), so HyperFrames
// Studio shows them at once and `hyperframes beats` finds the music. Attributes Studio or the user changed later (data-hf-id, the start,
// the volume) are kept when the same file is placed again. The music's beats: HyperFrames' own analyser (Node, no Python), written by HF
// to beats/<audio path>.json.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { runHf } from "../hf-qa/cli.mjs";
import { endFade, fadeOfTotal, filmEnding, filmLength } from "./ending.mjs";
import { isStarterPage } from "./shots.mjs";
import { MUSIC_DUCK, duckLane, speechSpans } from "../sfx/actions.mjs";

const ROLES = { voice: { id: "el-voice", role: "voiceover", track: 10, volume: 1 }, music: { id: "el-music", role: "music", track: 11, volume: 0.6 } };
const BEGIN = "<!-- mw:tracks -->", END = "<!-- /mw:tracks -->";
const attrsOf = (s) => Object.fromEntries([...s.matchAll(/([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*"([^"]*)"/g)].map((m) => [m[1], m[2]]));
const r3 = (n) => Math.round(n * 1000) / 1000;
/** The music plays to the film's end and fades down with the picture (ending.mjs): HyperFrames' own clip-edge fade (data-fade-out,
 *  core/src/audioFade.ts at the pinned version: linear, anchored at the clip's end, honoured in Studio's preview and in the render). HF's render
 *  trims every track at the film's end (engine audioMixer.ts), so a song longer than the film would lose its fade: the clip is fitted to end
 *  with the film (its file's length kept in data-mw-track), so the song covers the content and the fade after it; its fade the ending's:
 *  the plan's own ending.fade when it gives one (any kind: an author's ending of 2.5 s once got the 105 s film's 5 s, and the music outlasted
 *  the picture), else ending.mjs fadeOfTotal (of the content, shorter after an end card, inside the film's length when MOTION-PLAN.json's
 *  ending.inside says so or the style's author ends the film; an author's ending the plan does not name and play is the house fade, T24-12);
 *  a song that ends sooner plays again after itself to the film's end (musicLoop, T22-9), a quarter of one too short to play again. What
 *  the app fitted is kept in data-mw-fit ("length fade"): a length or fade the user changed
 *  since (Studio) stays theirs; a stopped music (a cut) and a film placed before the fade are left as they are. */
const r2 = (n) => Math.round(n * 100) / 100;
const metaOf = (dir) => { try { return JSON.parse(readFileSync(join(dir, ".moworks", "project.json"), "utf8")); } catch { return {}; } };
// the ending as the app applies it (ending.mjs filmEnding): an author's ending the plan only claims is the house fade, at its usual length
const endingOf = (dir) => {
  const e = filmEnding(metaOf(dir), { dir });
  return { endCard: e.kind === "endCard", inside: e.inside, fade: Number(e.fade) > 0 ? Number(e.fade) : null };
};
/** Fit the music's first clip (`a`, changed in place) to the film; a song shorter than the film plays again after itself to the film's end
 *  (musicLoop). Returns the attributes of the clips that play it again ([] when none), or null when the music is left as it is. */
function fitMusic(a, film, { endCard = false, inside = false, fade = null } = {}, beats = null) {
  if (a["data-mw-stop"] != null || a["data-fade-out"] == null) return null;
  if (a["data-mw-fit"] != null && a["data-mw-fit"] !== `${a["data-duration"]} ${a["data-fade-out"]}`) return null;          // the user's own
  const start = Number(a["data-start"]) || 0, from = Number(a["data-media-start"]) || 0, song = Number(a["data-mw-track"]) || 0;
  const plays = Math.max(0.1, (song || Number(a["data-duration"]) || 0) - from);
  const len = film > start ? Math.min(plays, film - start) : plays;
  const toEnd = film > 0 && start + len >= film - 0.05;
  const ending = fade ?? (film ? fadeOfTotal(film, { endCard, inside }) : endFade(len, { endCard }));          // the plan's own fade first
  // the song ends before the film: it plays again after itself, so the picture and the music end together (T22-9)
  const loop = !toEnd && film > start && song > 0 ? musicLoop({ song, from, start, end: film, beats }) : null;
  if (loop) {
    a["data-duration"] = String(loop.clips[0].duration);
    a["data-fade-out"] = String(MUSIC_XF);
    a["data-mw-fit"] = `${a["data-duration"]} ${a["data-fade-out"]}`;
    return loopTags(a, loop.clips.slice(1), ending);
  }
  a["data-duration"] = String(r3(len));
  a["data-fade-out"] = String(r2(toEnd ? Math.min(ending, len) : Math.min(ending, len / 4)));
  a["data-mw-fit"] = `${a["data-duration"]} ${a["data-fade-out"]}`;
  return [];
}
/** The music cut at `t` s of the film (a stop: What If's twist, the Final Mix's "Stop the music at"): the first clip (`a`, changed in place)
 *  to that second with no fade, or, for a song that ends sooner, the song played again up to it (musicLoop), the last clip cut. Returns the
 *  attributes of the clips that play it again ([] when none). */
function cutMusic(a, t, beats = null) {
  const start = Number(a["data-start"]) || 0, from = Number(a["data-media-start"]) || 0, song = Number(a["data-mw-track"]) || 0;
  const loop = song > 0 ? musicLoop({ song, from, start, end: t, beats }) : null;
  if (!loop) {
    const full = song > 0 ? song - from : Number(a["data-mw-full"] ?? a["data-duration"]) || 0;
    a["data-duration"] = String(r3(Math.max(0.1, Math.min(full, t - start))));
    delete a["data-fade-out"];
    return [];
  }
  a["data-duration"] = String(loop.clips[0].duration);
  a["data-fade-out"] = String(MUSIC_XF);          // the crossfade into the song played again; the cut is the last clip's
  return loopTags(a, loop.clips.slice(1), 0);
}

// ---- A song shorter than the film (owner: the picture and the music end together, the music plays to the film's end; T22-9: a 107 s song
// in a 110 s film went silent 3.5 s before the picture's fade). It plays to a point before its own ending, then again from an earlier point
// of itself on a clip of its own (el-music-loop-1, on the next lane: HyperFrames' lint flags two sounds overlapping on one track), the two
// crossfaded with HyperFrames' clip-edge fades (data-fade-in / data-fade-out, core/src/audioFade.ts at the pinned version), as often as it
// takes; the last clip plays the song's ending into the film's end with the ending's fade. On the beats HyperFrames measured
// (beats/<src>.json) the part played again runs between two beats a whole number of 4-beat groups apart, so the beat and the bar run on
// across the crossfade; with no beats it is the song's tail, crossfaded plainly.
/** The crossfade between a song and its repeat, s. */
export const MUSIC_XF = 1.5;
/** A song under this share of the film is said to the owner (the Final Mix, the chat), who may pick a longer one. */
export const MUSIC_SHORT = 0.6;
const MUSIC_TAIL = 8, MIN_LOOP = 3, MAX_LOOPS = 64, LOOP_TRACK = 15, LOOP_ID = "el-music-loop-";

/** The clips that take a song `song` s long (played from `from` s of it, placed at `start` s of the film) to `end` s of the film: null when
 *  it reaches the end by itself or is too short to play again (under 3 s to repeat); else { from: the second of the song the repeat starts at,
 *  length: the part played again (s), times, clips: [{ start, mediaStart, duration }] } (the first clip the song's own, from `from`).
 *  beats: the song's beat times (s), when HyperFrames measured them. */
export function musicLoop({ song, from = 0, start = 0, end, beats = null, xf = MUSIC_XF }) {
  const plays = Number(song) - from, need = Number(end) - start;
  if (!(plays > 0) || !(need > 0) || plays >= need - 0.05) return null;
  const fill = need - plays + 0.05;          // a little more than the gap, so the last clip never runs past the song's end
  let J = song - Math.min(MUSIC_TAIL, plays / 4);          // the junction: before the song's own ending, which the last clip plays
  let lengths = null;          // the lengths the part played again may have on the beats, shortest first
  const bt = [...(beats ?? [])].map(Number).filter((t) => Number.isFinite(t) && t > from && t < song).sort((x, y) => x - y);
  const j = bt.length >= 8 ? bt.findLastIndex((t) => t <= J) : -1;
  if (j >= 4) {
    const ls = [];
    for (let k = j - 4; k >= 0; k -= 4) if (bt[k] - xf >= from) ls.push(bt[j] - bt[k]);
    if (ls.length && ls.at(-1) >= MIN_LOOP) { J = bt[j]; lengths = ls; }
  }
  const most = lengths ? lengths.at(-1) : J - xf - from;
  if (!(most >= MIN_LOOP)) return null;
  const want = Math.max(MIN_LOOP, fill / Math.ceil(fill / most - 1e-9));
  const length = lengths ? lengths.find((x) => x >= want - 1e-9) ?? most : Math.min(most, want);
  const times = Math.ceil(fill / length - 1e-9);
  if (times > MAX_LOOPS) return null;
  const M = J - xf - length;          // where each repeat starts in the song: its beat lands on the junction's at the crossfade's end
  const clips = [{ start: r3(start), mediaStart: r3(from), duration: r3(J - from) }];
  let t = start + (J - from) - xf;
  for (let i = 1; i <= times; i++) { clips.push({ start: r3(t), mediaStart: r3(M), duration: r3(i === times ? start + need - t : length + xf) }); t += length; }
  return { from: r3(M), length: r3(length), times, clips };
}
/** The <audio> attributes of the clips that play the song again (after the first clip `a`): each fades in over the crossfade, and out over it
 *  into the next; the last one's fade-out is `fadeOut` (the ending's fade; 0, none, for a cut). On two lanes in turn. */
function loopTags(a, clips, fadeOut) {
  const lane = Number(a["data-track-index"]) || ROLES.music.track, other = lane === LOOP_TRACK ? LOOP_TRACK + 1 : LOOP_TRACK;
  return clips.map((c, i) => {
    const fo = i === clips.length - 1 ? Math.min(Number(fadeOut) || 0, c.duration) : MUSIC_XF;
    return { id: `${LOOP_ID}${i + 1}`, src: a.src, "data-start": String(c.start), "data-media-start": String(c.mediaStart), "data-duration": String(c.duration),
      "data-track-index": String(i % 2 ? lane : other), "data-volume": a["data-volume"] ?? String(ROLES.music.volume), "data-fade-in": String(MUSIC_XF),
      ...(fo > 0 ? { "data-fade-out": String(r2(fo)) } : {}), "data-timeline-role": ROLES.music.role };
  });
}
const LOOP_KEYS = ["id", "src", "data-start", "data-media-start", "data-duration", "data-track-index", "data-volume", "data-fade-in", "data-fade-out", "data-timeline-role"];
const LOOP_TAG = new RegExp(`[ \\t]*<audio\\b[^>]*\\bid="${LOOP_ID}\\d+"[^>]*>(?:\\s*</audio>)?[ \\t]*\\r?\\n?`, "gi");
/** index.html with the music's repeat clips as `loops` (after the music's own <audio>): the old ones out; what Studio or a carve added to a
 *  repeat of the same id and file (its data-hf-id, its levels) stays on it. */
function withLoops(html, loops) {
  const old = new Map([...html.matchAll(new RegExp(`<audio\\b[^>]*\\bid="${LOOP_ID}\\d+"[^>]*>`, "gi"))].map((m) => attrsOf(m[0])).map((x) => [x.id, x]));
  const out = html.replace(LOOP_TAG, "");
  const main = loops?.length ? new RegExp(`([ \\t]*)<audio\\b[^>]*\\bid="${ROLES.music.id}"[^>]*>(?:\\s*</audio>)?`, "i").exec(out) : null;
  if (!main) return out;
  const lines = loops.map((x) => {
    const was = old.get(x.id), extra = was?.src === x.src ? Object.fromEntries(Object.entries(was).filter(([k]) => !LOOP_KEYS.includes(k))) : {};
    return `\n${main[1] || "    "}${audioLine({ ...x, ...extra })}</audio>`;
  });
  const at = main.index + main[0].length;
  return out.slice(0, at) + lines.join("") + out.slice(at);
}
/** The beat times HyperFrames measured for a track (beats/<src>.json, version 1, as analyseBeats has it written), s; null with none. */
function beatTimes(dir, src) {
  if (!dir || !src) return null;
  try {
    const j = JSON.parse(readFileSync(join(dir, "beats", ...`${src}.json`.split("/")), "utf8"));
    return j?.version === 1 && Array.isArray(j.beats) ? j.beats.map((b) => Number(b?.time ?? b)).filter(Number.isFinite) : null;
  } catch { return null; }
}
/** The song's repeats taken off the timeline (its own clip was taken off: the film has no music). Returns whether any was there. */
export function removeRepeats(dir) {
  const f = join(dir, "index.html");
  let html; try { html = readFileSync(f, "utf8"); } catch { return false; }
  const out = withLoops(html, []);
  if (out !== html) writeFileSync(f, out);
  return out !== html;
}
/** Seconds as the owner reads them: 42 → "0:42", 102.4 → "1:42". */
export const clockOf = (s) => { const n = Math.max(0, Math.round(Number(s) || 0)); return `${Math.floor(n / 60)}:${String(n % 60).padStart(2, "0")}`; };

/** The song played again after itself (musicLoop) as the film has it now: { from: the second of the song it repeats from, at: the same as the
 *  owner reads it ("0:42"), times, song, film, short: the song plays under MUSIC_SHORT of the film }, or null when it does not repeat. */
export function musicRepeats(dir) {
  let html; try { html = readFileSync(join(dir, "index.html"), "utf8"); } catch { return null; }
  const tag = new RegExp(`<audio\\b[^>]*\\bid="${ROLES.music.id}"[^>]*>`, "i").exec(html)?.[0];
  const loops = trackClips(html, "music").filter((c) => String(c.id ?? "").startsWith(LOOP_ID));
  if (!tag || !loops.length) return null;
  const a = attrsOf(tag), song = Number(a["data-mw-track"]) || null, film = filmOf(html, dir) || null;
  const plays = (song ?? 0) - (Number(a["data-media-start"]) || 0), need = (film ?? 0) - (Number(a["data-start"]) || 0);
  return { from: loops[0].mediaStart, at: clockOf(loops[0].mediaStart), times: loops.length, song, film, short: plays > 0 && need > 0 && plays < MUSIC_SHORT * need };
}

// ---- The voice-over and the music as clips. The app places each as one <audio> (el-voice, el-music); the Build may cut the voice into one
// clip a line (el-voice-01 … el-voice-13, all of one file, each with its data-media-start: Test 22), and a song shorter than the film plays
// again on clips of its own (el-music-loop-1 …, above). Every step that hears the voice or the music (the voice check, the sound effects'
// words and levels, the ambience duck under the words, the carve) takes all of them together (T22-11: the cut voice was taken for none).
const KIND_ID = { voice: /^el-voice(?:-[\w-]+)?$/, music: /^el-music(?:-[\w-]+)?$/ };
/** What an <audio> is to the film: "voice", "music" or null (a sound effect, an ambience bed): its data-timeline-role when it has one (the
 *  lane HyperFrames' timeline puts it on), else its id. a: the tag's attributes, or { id, role }. */
export function audioKind(a) {
  const role = a?.role ?? a?.["data-timeline-role"] ?? null, id = String(a?.id ?? "");
  if (role) return role === ROLES.voice.role ? "voice" : role === ROLES.music.role ? "music" : null;
  return KIND_ID.voice.test(id) ? "voice" : KIND_ID.music.test(id) ? "music" : null;
}
/** The clips of the voice-over ("voice") or the music ("music") in index.html, by start: [{ id, hfId, src, start, mediaStart, duration,
 *  volume, fadeIn, fadeOut }] (duration null when the clip names none). */
export function trackClips(html, kind) {
  const num = (v, d) => (v != null && v !== "" && Number.isFinite(Number(v)) ? Number(v) : d);
  return [...String(html ?? "").matchAll(/<audio\b[^>]*>/gi)].map((m) => attrsOf(m[0])).filter((a) => audioKind(a) === kind)
    .map((a) => ({ id: a.id ?? null, hfId: a["data-hf-id"] ?? null, src: a.src ?? null, start: num(a["data-start"], 0), mediaStart: num(a["data-media-start"], 0),
      duration: num(a["data-duration"], null), volume: num(a["data-volume"], 1), fadeIn: num(a["data-fade-in"], 0), fadeOut: num(a["data-fade-out"], 0) }))
    .sort((x, y) => x.start - y.start);
}
/** The voice-over's words (HF's transcript.json: [{ text, start, end }], in the voice file's seconds) where the film speaks them: each word at
 *  the place of the clip that plays it (the clip whose part of the file holds the word's middle), kept inside that part; a word no clip plays
 *  is left out. clips: trackClips(…, "voice"). [{ text, start, end }], film seconds, by start. */
export function wordsOnFilm(words, clips) {
  const out = [];
  for (const w of words ?? []) {
    if (!Number.isFinite(w?.start) || !Number.isFinite(w?.end)) continue;
    const mid = (w.start + w.end) / 2;
    const c = (clips ?? []).find((x) => mid >= x.mediaStart - 1e-6 && (x.duration == null || mid < x.mediaStart + x.duration));
    if (!c) continue;
    const a = c.mediaStart, b = c.duration == null ? Infinity : a + c.duration, shift = c.start - a;
    out.push({ text: w.text, start: r3(Math.max(a, w.start) + shift), end: r3(Math.min(b, w.end) + shift) });
  }
  return out.sort((x, y) => x.start - y.start);
}
/** The film's spoken words, in film seconds: the reviewed transcript (transcript.json) through the clips that play the voice-over's file
 *  (the project's voice file; every voice clip when none of them is it); null with no transcript or no voice on the timeline. */
export function filmWords(dir) {
  let words; try { words = JSON.parse(readFileSync(join(dir, "transcript.json"), "utf8")); } catch { return null; }
  if (!Array.isArray(words) || !words.length) return null;
  let html; try { html = readFileSync(join(dir, "index.html"), "utf8"); } catch { return null; }
  const all = trackClips(html, "voice"), file = metaOf(dir).voice?.file;
  const clips = file && all.some((c) => c.src === file) ? all.filter((c) => c.src === file) : all;
  return clips.length ? wordsOnFilm(words, clips) : null;
}
// the film's whole length: its root's; before the Build (the starter page) the length New project set with the ending's fade after it
const filmOf = (html, dir) => (isStarterPage(html) ? filmLength(metaOf(dir), { dir }).total || 0
  : Number(attrsOf(/<[a-z]+\b[^>]*\bdata-composition-id="[^"]*"[^>]*>/i.exec(html)?.[0] ?? "")["data-duration"]) || 0);
const audioLine = (a) => `<audio ${Object.entries(a).map(([k, v]) => `${k}="${v}"`).join(" ")}>`;

/** Fit the film's music to the film as it is now (its length and ending): before a render and the checks, after the film was built.
 *  Returns the music's attributes, or null when nothing changed (no music, a stop, the user's own fade). */
export function fitMusicToFilm(dir) {
  const f = join(dir, "index.html");
  let html; try { html = readFileSync(f, "utf8"); } catch { return null; }
  const old = new RegExp(`<audio\\b[^>]*\\bid="${ROLES.music.id}"[^>]*>`, "i").exec(html);
  if (!old) return null;
  const a = attrsOf(old[0]);
  const loops = fitMusic(a, filmOf(html, dir), endingOf(dir), beatTimes(dir, a.src));
  if (loops == null) { duckMusic(dir); return null; }          // a stop, the user's own fade: left as they are (still ducked under the words)
  const out = withLoops(html.replace(old[0], audioLine(a)), loops);
  if (out !== html) writeFileSync(f, out);
  duckMusic(dir);          // the repeats' lanes in their own seconds
  return out === html ? null : a;
}

// ---- The levels the app sets on the voice-over and the music (sfx/actions.mjs trackGains, measured by sfx/mixlevels.mjs) and the music
// ducked under the spoken words, the HyperFrames way: media-use's scripts/audio-duck.mjs writes a volume lane (data-automation) on the
// bed, a quarter of its level from each spoken span's first word to its last (attack 0.15 s, release 0.4 s, spans closer than 0.6 s one;
// Apache-2.0). Each music clip (a repeat of the song too) gets its lane in its own seconds. What the app wrote is kept beside it (data-mw-gain,
// data-mw-duck: its signature), so a level or a lane the user changed in Studio stays theirs; the earlier fixed levels (voice 1, music 0.6)
// count as the app's.
const DEFAULT_GAIN = { voice: "1", music: "0.6" };
const sig = (s) => { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) | 0; return (h >>> 0).toString(36); };
/** Whether a clip's level is the app's to set (kind: "voice" | "music"). */
const gainIsOurs = (a, kind) => (a["data-mw-gain"] != null ? a["data-volume"] === a["data-mw-gain"] : (a["data-volume"] ?? "1") === DEFAULT_GAIN[kind]);
/** Set the app's level on every clip of the voice-over or the music whose level is the app's (gain: a number). Returns how many changed. */
export function setTrackGain(dir, kind, gain) {
  const f = join(dir, "index.html");
  let html; try { html = readFileSync(f, "utf8"); } catch { return 0; }
  if (!Number.isFinite(gain) || !ROLES[kind]) return 0;
  let n = 0;
  const v = String(Math.round(gain * 1000) / 1000);
  const out = html.replace(/<audio\b[^>]*>/gi, (tag) => {
    const a = attrsOf(tag);
    if (audioKind(a) !== kind || !gainIsOurs(a, kind) || (a["data-volume"] === v && a["data-mw-gain"] === v)) return tag;
    a["data-volume"] = v; a["data-mw-gain"] = v; n++;
    return audioLine(a);
  });
  if (out !== html) writeFileSync(f, out);
  return n;
}
/** The music's duck lanes written for the film's words as they are now (none without a transcript). Returns how many clips duck. */
export function duckMusic(dir) {
  const f = join(dir, "index.html");
  let html; try { html = readFileSync(f, "utf8"); } catch { return 0; }
  const words = filmWords(dir), spans = words?.length ? speechSpans(words) : [];
  let n = 0;
  const out = html.replace(/<audio\b[^>]*>/gi, (tag) => {
    const a = attrsOf(tag);
    if (audioKind(a) !== "music") return tag;
    const had = a["data-automation"];
    if (had != null && a["data-mw-duck"] !== sig(had)) return tag;          // a lane the user drew or changed in Studio
    const duration = Number(a["data-duration"]);
    const lane = duration > 0 ? duckLane({ start: Number(a["data-start"]) || 0, duration }, spans, { duck: MUSIC_DUCK }) : null;
    delete a["data-automation"]; delete a["data-mw-duck"];
    if (lane) { a["data-automation"] = JSON.stringify(lane).replace(/"/g, "&quot;"); a["data-mw-duck"] = sig(a["data-automation"]); n++; }
    return had === a["data-automation"] ? tag : audioLine(a);
  });
  if (out !== html) writeFileSync(f, out);
  return n;
}

/** Place (or move) one track: { kind: "voice" | "music", src: project-relative path, duration: seconds }. Returns the attributes written. */
export function placeTrack(dir, { kind, src, duration, start = null }) {
  const def = ROLES[kind];
  if (!def) throw Object.assign(new Error("A track is a voice or a music"), { code: "INVALID" });
  const f = join(dir, "index.html");
  let html = readFileSync(f, "utf8");
  // a voice-over the Build cut into clips (el-voice-01…, one a line) stays as it was cut when the app places the same file again (the
  // transcript saved again would have laid the whole file over its clips); a place the user drops it at is theirs
  if (kind === "voice" && start == null) {
    const cut = trackClips(html, "voice").find((c) => c.src === src && c.id !== def.id && KIND_ID.voice.test(c.id ?? ""));
    if (cut) return attrsOf(new RegExp(`<audio\\b[^>]*\\bid="${cut.id}"[^>]*>`).exec(html)[0]);
  }
  const tagRe = new RegExp(`\\s*<audio\\b[^>]*\\bid="${def.id}"[^>]*>(?:\\s*</audio>)?`, "i");
  const old = tagRe.exec(html);
  const was = old ? attrsOf(old[0]) : null;
  if (old) html = html.replace(tagRe, "");
  const ours = { id: def.id, src, "data-start": "0", "data-duration": String(r3(duration)), "data-track-index": String(def.track), "data-volume": String(def.volume), "data-timeline-role": def.role };
  if (kind === "music") Object.assign(ours, { "data-fade-out": "0", "data-mw-track": ours["data-duration"] });
  const same = was?.src === src;
  const a = { ...ours };
  if (same) { for (const [k, v] of Object.entries(was)) if (k !== "src" && k !== "data-duration" && k !== "data-mw-track") a[k] = v; }       // the user's / Studio's changes stay
  // what the app fitted last is fitted again to the new length; a fade the user changed stays
  if (same && kind === "music" && was["data-mw-fit"] != null && was["data-mw-fit"] === `${was["data-duration"]} ${was["data-fade-out"]}`) delete a["data-mw-fit"];
  // the same track placed again keeps its fade as it was: none on a film placed before the fade, none while it is stopped (a cut)
  if (same && kind === "music" && was["data-fade-out"] == null) delete a["data-fade-out"];
  if (was?.["data-hf-id"]) a["data-hf-id"] = was["data-hf-id"];
  if (start != null && Number.isFinite(Number(start))) a["data-start"] = String(r3(Math.max(0, Number(start))));          // where the user dropped it
  // the music stopped at a second (the twist) stays stopped when the same track is placed again; else it is fitted to the film
  const stop = kind === "music" && same && was["data-mw-stop"] != null ? Number(was["data-mw-stop"]) : null;
  const loops = kind !== "music" ? null : stop != null ? cutMusic(a, stop, beatTimes(dir, src)) : fitMusic(a, filmOf(html, dir), endingOf(dir), beatTimes(dir, src));
  const line = `<audio ${Object.entries(a).map(([k, v]) => `${k}="${v}"`).join(" ")}></audio>`;
  const block = new RegExp(`(${BEGIN.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})([\\s\\S]*?)(${END.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`);
  if (block.test(html)) html = html.replace(block, (m0, b, inner, e) => `${b}${inner.replace(/\s*$/, "")}\n    ${line}\n    ${e}`);
  else {
    const root = /<[a-z]+\b[^>]*\bdata-composition-id="[^"]*"[^>]*>/i.exec(html);
    if (!root) throw Object.assign(new Error("index.html has no root composition"), { code: "INVALID" });
    const at = root.index + root[0].length;
    html = `${html.slice(0, at)}\n    ${BEGIN}\n    ${line}\n    ${END}${html.slice(at)}`;
  }
  if (loops) html = withLoops(html, loops);          // the song played again to the film's end, or none
  writeFileSync(f, html);
  duckMusic(dir);          // the music under the words (a voice placed: the words it speaks)
  return a;
}

/** Stop the music at `at` seconds of the film (a What If film's turn, or where the user or the brief asks), or play it again to its end with `at` null: the
 *  music track's data-duration ends there (HyperFrames plays an <audio> only within its data-duration); the second is kept on the element
 *  (data-mw-stop) and its full length too (data-mw-full), so placing the same track again keeps the stop. Returns { at, start, duration }. */
/** The part of the music track the film plays, in the song's own seconds: { start, end }. From the music on the timeline (its data-media-start, start and length, cut at the
 *  film's end), else the song from 0 for the film's length; null when neither the film's length nor the track's is known. */
export function musicUsed(dir, { trackDuration = null } = {}) {
  let html = ""; try { html = readFileSync(join(dir, "index.html"), "utf8"); } catch { return null; }
  const rootTag = /<[a-z]+\b[^>]*\bdata-composition-id="[^"]*"[^>]*>/i.exec(html)?.[0] ?? "";
  const film = Number(attrsOf(rootTag)["data-duration"]) || null;
  const tag = new RegExp(`<audio\\b[^>]*\\bid="${ROLES.music.id}"[^>]*>`, "i").exec(html)?.[0];
  const a = tag ? attrsOf(tag) : {};
  const from = Number(a["data-media-start"]) || 0, at = Number(a["data-start"]) || 0, len = Number(a["data-duration"]) || null;
  const plays = [len, film != null ? film - at : null, trackDuration != null ? trackDuration - from : null].filter((x) => x != null && Number.isFinite(x));
  if (!plays.length) return null;
  // a song played again after itself (musicLoop): as far into the song as its repeats play
  let end = from + Math.max(0, Math.min(...plays));
  for (const c of trackClips(html, "music").filter((x) => String(x.id ?? "").startsWith(LOOP_ID) && x.src === a.src)) {
    const d = Math.min(c.duration ?? Infinity, film != null ? film - c.start : Infinity);
    if (Number.isFinite(d)) end = Math.max(end, c.mediaStart + Math.max(0, d));
  }
  if (trackDuration != null) end = Math.min(end, trackDuration);
  return { start: r3(from), end: r3(end) };
}

export function stopMusic(dir, at) {
  const f = join(dir, "index.html");
  let html = readFileSync(f, "utf8");
  const tagRe = new RegExp(`<audio\\b[^>]*\\bid="${ROLES.music.id}"[^>]*>`, "i");
  const old = tagRe.exec(html);
  if (!old) throw Object.assign(new Error("The film has no music track"), { code: "INVALID" });
  const a = attrsOf(old[0]), start = Number(a["data-start"] ?? 0) || 0, full = Number(a["data-mw-full"] ?? a["data-duration"]) || 0;
  let loops;
  if (at == null) {
    delete a["data-mw-stop"]; delete a["data-mw-full"]; a["data-duration"] = String(r3(full));
    if (a["data-mw-fade-out"] != null) { a["data-fade-out"] = a["data-mw-fade-out"]; delete a["data-mw-fade-out"]; }          // its fade out back at the end
    loops = fitMusic(a, filmOf(html, dir), endingOf(dir), beatTimes(dir, a.src));
  } else {
    const t = Number(at);
    if (!Number.isFinite(t) || t <= start) throw Object.assign(new Error(`Stop the music after it starts (${start} s)`), { code: "INVALID" });
    // a stop is a cut (What If: the hit lands in silence); the end's fade out is kept aside for "play to the end", once
    if (a["data-mw-stop"] == null && a["data-fade-out"] != null) a["data-mw-fade-out"] = a["data-fade-out"];
    a["data-mw-full"] = String(r3(full)); a["data-mw-stop"] = String(r3(t));
    loops = cutMusic(a, t, beatTimes(dir, a.src));
  }
  html = html.replace(old[0], audioLine(a));
  if (loops) html = withLoops(html, loops);
  writeFileSync(f, html);
  duckMusic(dir);
  return { at: at == null ? null : r3(Number(at)), start, duration: Number(a["data-duration"]) };
}

/** HyperFrames' beat analysis of the film's music track (the <audio data-timeline-role="music">): resolves { ok, file, message }. Off the
 *  caller's event loop: a song takes HF seconds, and the server places the music inside a request (T27-3). */
export async function analyseBeats(dir, src, { version = null } = {}) {
  const r = await runHf(["beats", resolve(dir)], { version, timeoutMs: 180000 });
  const file = `beats/${src}.json`;
  return { ok: r.status === 0 && existsSync(join(dir, ...file.split("/"))), file, message: (r.stderr || r.stdout || "").trim().split(/\r?\n/).slice(-2).join(" ") };
}

// ---- Sounds put on the timeline from the Assets tab, on their lane, in HyperFrames' model (HF at the pinned version): a sound
// is an <audio> in the root composition with data-start / data-duration / data-track-index (core/src/runtime/timeline.ts reads the track
// verbatim). Moving one and taking it off is HF's own source mutation (editor.mjs → handEdit.mjs setAudio / removeAudio: Studio's
// patchElementInHtml / removeElementFromHtml in studio-server/src/helpers/sourceMutation.ts). Lanes are data-timeline-role: "voiceover",
// "music", "sfx" (the app's older sound effects carry none).
const CLIPS_BEGIN = "<!-- mw:clips (Moworks Studio: sounds the owner put on the timeline) -->", CLIPS_END = "<!-- /mw:clips -->";
const CLIP_TRACK = 40, CLIP_VOLUME = 0.8;
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
/** The lane a sound goes on, from its folder (3_audio/voiceover | music | sfx, and the older assets/voiceover | sfx | audio), else its name
 *  the way the importer sorts it (classify: the project service's classifyAsset). */
export function laneOfFile(rel, classify = null) {
  const p = String(rel ?? "").replace(/\\/g, "/");
  if (/(^|\/)voiceover\//i.test(p)) return "voiceover";
  if (/(^|\/)sfx\//i.test(p)) return "sfx";
  if (/(^|\/)music\//i.test(p)) return "music";
  const f = classify?.(p.split("/").pop())?.folder ?? "";
  return /voiceover/.test(f) ? "voiceover" : /sfx/.test(f) ? "sfx" : "music";
}
/** Put a sound effect on the timeline at `start`: its own <audio> on its own track in the user's block, so the app's sfx block (rewritten
 *  from the storyboard's cues) never takes it away. Returns the attributes written. */
export function placeClip(dir, { src, duration, start = 0 }) {
  const f = join(dir, "index.html");
  let html = readFileSync(f, "utf8");
  const used = [...html.matchAll(/\bid="el-clip-(\d+)"/g)].map((m) => Number(m[1]));
  const n = used.length ? Math.max(...used) + 1 : 1;
  const a = { id: `el-clip-${n}`, src, "data-start": String(r3(Math.max(0, Number(start) || 0))), "data-duration": String(r3(duration)),
    "data-track-index": String(CLIP_TRACK + n), "data-volume": String(CLIP_VOLUME), "data-timeline-role": "sfx" };
  const line = `<audio ${Object.entries(a).map(([k, v]) => `${k}="${v}"`).join(" ")}></audio>`;
  const block = new RegExp(`(${esc(CLIPS_BEGIN)})([\\s\\S]*?)(${esc(CLIPS_END)})`);
  if (block.test(html)) html = html.replace(block, (m0, b, inner, e) => `${b}${inner.replace(/\s*$/, "")}\n    ${line}\n    ${e}`);
  else {
    const root = /<[a-z]+\b[^>]*\bdata-composition-id="[^"]*"[^>]*>/i.exec(html);
    if (!root) throw Object.assign(new Error("index.html has no root composition"), { code: "INVALID" });
    const at = root.index + root[0].length;
    html = `${html.slice(0, at)}\n    ${CLIPS_BEGIN}\n    ${line}\n    ${CLIPS_END}${html.slice(at)}`;
  }
  writeFileSync(f, html);
  return a;
}

