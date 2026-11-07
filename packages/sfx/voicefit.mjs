// The effects fitted to the film as it plays (Test 28: 39 spoken words had an effect louder than the voice, up to 16 dB, right on the film's
// turning point, and the stems summed to +8.5 dBFS; a gain per file cannot know where the words are, and no later step fixed it). Two rules,
// the app's own placing meets them so Tech checks' voice check stays quiet:
// - under a spoken word the effects stay EFFECTS_MARGIN_DB under the voice: each effect gets a volume lane (HyperFrames' data-automation, as the
//   music's duck) flat inside each word it sounds on and full again in the pauses, so a long wind keeps blowing between the words;
// - the whole mix stays under MIX_PEAK, so HF's assemble never lowers the whole film to save a peak (its true-peak step, -1 dBFS) and the
//   master stays linear: the Editor's Smooth preview and the final MP4 are the same mix at about the same level.
// The film is heard as HF's render mixes it (engine audioMixer at the pinned version): each clip its part of its file, 48 kHz stereo, its
// data-volume times its lane, its linear edge fades, at its place. What the app wrote keeps a signature (data-mw-duck) and the level it
// started from (sfx.json mounted[].base), so each fit starts again from the placement's levels; a level or a lane the user set in Studio stays
// theirs and counts as it is. A sound the user added from the Sounds drawer (sfx.json added[]) is fitted the same way: it stays where they put it,
// and it still may not drown the words. Run after a placement and whenever the tracks are levelled (mixlevels.mjs), skipped while nothing changed.
import { MIX_PEAK } from "./mix/levels.mjs";
import { attrsOf, audioLine } from "../hf-edit/tag.mjs";
import { execFile } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { promisify } from "node:util";
import { ffmpegExe } from "../version-manager/index.mjs";
import { readMounts } from "../hf-edit/shots.mjs";
import { audioKind, duckMusic, filmWords, hasVoiceCeiling } from "../hf-edit/tracks.mjs";
import { VOICE_CEILING_DB } from "./mix/levels.mjs";
import { dipLane, sig } from "./actions.mjs";
import { EFFECTS_MARGIN_DB, HIT_UNDER_VOICE, MAX_GAIN } from "./mix/levels.mjs";
import { patchState, readState } from "./index.mjs";
import { offThread } from "./offThread.mjs";
import { isMainThread } from "node:worker_threads";

const run = promisify(execFile);
const breathe = () => new Promise((done) => setImmediate(done));
/** The page with each fitted clip's level and lane on its own <audio> tag (by id, while it plays the clip's src), every other byte as it is:
 *  { id -> { base, fit, lane, clip } }. */
export function levelTags(html, done) {
  return html.replace(/<audio\b[^>]*>/gi, (tag) => {
    const a = attrsOf(tag), c = done.get(a.id);
    // only the tag that still plays the sound the fit measured: a placement meanwhile writes el-sfx-N again with other sounds (audit/112a N5)
    if (!c || (c.clip && c.clip.src !== a.src)) return tag;
    a["data-volume"] = String(Math.min(MAX_GAIN, Math.max(0.005, r3(c.base * c.fit))));
    delete a["data-automation"]; delete a["data-mw-duck"];
    if (c.lane) { a["data-automation"] = JSON.stringify(c.lane).replace(/"/g, "&quot;"); a["data-mw-duck"] = sig(a["data-automation"]); }
    return audioLine(a);
  });
}          // the server's other requests between the long sums
const SR = 48000;
/** A word's room for the effects: the margin and half a dB for what the sums cannot know (two sounds in phase). */
const FIT_MARGIN_DB = EFFECTS_MARGIN_DB + 0.5;
const LOWEST_FIT = 0.25;          // the peak rule takes at most 12 dB off one effect: over that the music itself is the peak
const LOWEST_DIP = 0.01;
const FIT_VERSION = 4;          // 2: the pauses rule (T38b-1); 3: the beds take their share of the pauses; 4: the voice's ceiling (Qa3)
/** A stem's samples held at a ceiling (dB): the voice as the render plays it behind its true-peak limiter (tracks.mjs limitVoice), close
 *  enough for the room the effects have (the limiter lowers the few samples over it; the words' loudness barely moves). */
export function capStem(stem, db) {
  const c = 10 ** (db / 20);
  for (let i = 0; i < stem.length; i++) { if (stem[i] > c) stem[i] = c; else if (stem[i] < -c) stem[i] = -c; }
  return stem;
}
const r3 = (n) => Math.round(n * 1000) / 1000;

/** The file's samples as the film plays it: 48 kHz stereo, interleaved Float32. A mono file goes to both channels at its full level, as HF's mixer
 *  maps it (audioMixer STEREO_CHANNEL_FILTER): FFmpeg's own `-ac 2` would hear it 3 dB lower than the render does. null when it cannot be read. */
async function decode(file, root) {
  const { stdout, stderr } = await run(ffmpegExe(root), ["-hide_banner", "-nostats", "-i", file, "-map", "0:a:0", "-vn", "-ar", String(SR), "-af", "aformat=channel_layouts=mono|stereo", "-f", "f32le", "-"],
    { windowsHide: true, encoding: "buffer", maxBuffer: 1 << 30, timeout: 180000 });
  const raw = new Float32Array(stdout.buffer.slice(stdout.byteOffset, stdout.byteOffset + (stdout.length & ~3)));
  if (!/Stream #\d+:\d+[^\n]*Audio:[^\n]*\bmono\b/.test(String(stderr))) return raw;
  const two = new Float32Array(raw.length * 2);
  for (let i = 0; i < raw.length; i++) two[i * 2] = two[i * 2 + 1] = raw[i];
  return two;
}
/** Every clip's file decoded once: Map src -> samples (a file that cannot be read is left out). */
export async function decodeClips(dir, clips, root) {
  const out = new Map(), queue = [...new Set(clips.map((c) => c.src).filter((s) => s && existsSync(join(dir, ...s.split("/")))))];
  await Promise.all(Array.from({ length: Math.min(6, queue.length) }, async () => {
    while (queue.length) { const s = queue.shift(); const pcm = await decode(join(dir, ...s.split("/")), root).catch(() => null); if (pcm?.length) out.set(s, pcm); }
  }));
  return out;
}

/** A volume lane's value along a clip, for times that only go forward ([{ t, v }], linear between its points, held at both ends: HF's sampler). */
function walker(points) {
  if (!points?.length) return () => 1;
  let k = 0;
  return (t) => {
    while (k < points.length - 1 && t >= points[k + 1].t) k++;
    const a = points[k], b = points[k + 1];
    if (!b || t <= a.t) return a.v;
    return b.t > a.t ? a.v + ((b.v - a.v) * (t - a.t)) / (b.t - a.t) : b.v;
  };
}
/** Where a clip sounds: { i0: its first sample's place in the film (interleaved), frames, from: its first sample's place in the file }, or null. */
function spanOf(clip, pcm, total) {
  const from = Math.max(0, Math.round((Number(clip.mediaStart) || 0) * SR));
  const inFile = Math.floor(pcm.length / 2) - from, start = Math.round((Number(clip.start) || 0) * SR), toEnd = Math.ceil(total * SR) - start;
  const frames = Math.min(inFile, toEnd, clip.duration != null ? Math.round(clip.duration * SR) : Infinity);
  return frames > 0 ? { i0: start * 2, frames, from: from * 2 } : null;
}
/** One clip's own sound at its gain, lane and fades: { i0, buf } (buf interleaved), or null. */
function clipSound(clip, pcm, total, { volume = clip.volume, lane = clip.lane } = {}) {
  const span = pcm && spanOf(clip, pcm, total);
  if (!span) return null;
  const buf = new Float32Array(span.frames * 2), at = walker(lane), d = span.frames / SR;
  const fi = Math.min(d, Number(clip.fadeIn) || 0), fo = Math.min(d, Number(clip.fadeOut) || 0);
  const g0 = Number.isFinite(volume) ? volume : 1;
  for (let n = 0; n < span.frames; n++) {
    const t = n / SR;
    let g = g0 * at(t);
    if (fi > 0 && t < fi) g *= t / fi;
    if (fo > 0 && t > d - fo) g *= Math.max(0, (d - t) / fo);
    buf[n * 2] = pcm[span.from + n * 2] * g; buf[n * 2 + 1] = pcm[span.from + n * 2 + 1] * g;
  }
  return { i0: span.i0, buf };
}
/** These clips mixed at their places, the whole film: interleaved Float32, or null when none of them sounds. */
export function renderStem(clips, total, pcms) {
  let out = null;
  for (const c of clips) {
    const s = clipSound(c, pcms.get(c.src), total);
    if (!s) continue;
    out ??= new Float32Array(Math.ceil(total * SR) * 2);
    for (let i = 0; i < s.buf.length; i++) out[s.i0 + i] += s.buf[i];
  }
  return out;
}
/** Mean power over [a, b) film seconds, both channels (0 for no stem). */
export function powerOf(stem, a, b) {
  if (!stem) return 0;
  const i0 = Math.max(0, Math.floor(a * SR)) * 2, i1 = Math.min(stem.length, Math.ceil(b * SR) * 2);
  let s = 0;
  for (let i = i0; i < i1; i++) s += stem[i] * stem[i];
  return i1 > i0 ? s / (i1 - i0) : 0;
}
/** The same over one clip's sound, as a share of the whole span [a, b). */
function clipPower(s, a, b) {
  const i0 = Math.max(s.i0, Math.floor(a * SR) * 2), i1 = Math.min(s.i0 + s.buf.length, Math.ceil(b * SR) * 2);
  let e = 0;
  for (let i = i0; i < i1; i++) e += s.buf[i - s.i0] * s.buf[i - s.i0];
  const whole = Math.ceil(b * SR) * 2 - Math.floor(a * SR) * 2;
  return whole > 0 ? e / whole : 0;
}


/** An effect the app placed (m: its sfx.json record) is still the app's to fit: the file, the level and the lane the app gave it (a: its tag's
 *  attributes). The user's own file under the app's id is theirs (112a N7: the fit wrote a new level on it and never in sfx.json). */
export function stillOurs(m, a) {
  if (!m || !a || (m.file && a.src !== m.file) || !Number.isFinite(m.volume) || Math.abs((Number(a["data-volume"]) || 0) - m.volume) > 0.0005) return false;
  return a["data-automation"] == null || a["data-mw-duck"] === sig(a["data-automation"]);
}

/** Fit the app's placed effects to the voice and the mix (above), the music's duck first. The music's lanes are as tracks.mjs duckMusic wrote
 *  them just now (the callers run it first). Returns { fitted, laned, lowered, peakDb } or { fitted: 0, skipped }. */
export const fitEffects = (dir, opts = {}) => (isMainThread ? offThread(import.meta.url, "fitEffectsHere", [dir, opts]) : fitEffectsHere(dir, opts));          // off the server's thread (112a A9)
/** fitEffects on this thread (a worker's). */
export async function fitEffectsHere(dir, { root } = {}) {
  const f = join(dir, "index.html");
  let html; try { html = readFileSync(f, "utf8"); } catch { return { fitted: 0, skipped: "no page" }; }
  const st = readState(dir), mounted = st.mounted ?? [];
  const placed = new Map(mounted.map((m, i) => [`el-sfx-${i}`, m]));
  const { root: comp, audio } = readMounts(dir);
  // each clip by its own id, whatever stands first in its tag (Studio stamps data-hf-id there), its attributes as they are written
  const tagList = [...html.matchAll(/<audio\b[^>]*>/gi)].map((m) => attrsOf(m[0])), tags = new Map(tagList.map((a) => [a.id, a]));
  audio.forEach((c, i) => { c.id = tagList[i]?.id ?? c.id; });
  for (const m of st.added ?? []) if (tags.get(m.id)?.src === m.file) placed.set(m.id, m);
  const isOurs = (c) => stillOurs(placed.get(c.id), tags.get(c.id));
  const ours = audio.filter(isOurs);
  const words = (filmWords(dir) ?? []).filter((w) => w.end - w.start >= 0.04);
  const others = audio.filter((c) => !ours.includes(c)), voice = others.filter((c) => audioKind(c) === "voice"), songs = others.filter((c) => audioKind(c) === "music");
  if (!ours.length && !(voice.length && songs.length && words.length)) return { fitted: 0, skipped: "nothing to fit" };
  const total = Number(comp?.duration) || Math.max(...audio.map((c) => (Number(c.start) || 0) + (Number(c.duration) || 0)));
  // what the fit hears; the music's own lane follows the words and this fit, so only a lane the user drew counts
  const drawn = (c) => { const a = tags.get(c.id); return a?.["data-automation"] != null && a["data-mw-duck"] !== sig(a["data-automation"]) ? c.lane : null; };
  // FIT_VERSION: a fit made before the pauses rule is made again
  const key = sig(JSON.stringify([FIT_VERSION, total, voice.map((c) => hasVoiceCeiling(tags.get(c.id)?.["data-fx-chain"])), words.map((w) => [w.start, w.end]), others.map((c) => [c.src, c.start, c.mediaStart, c.duration, c.volume, audioKind(c) === "music" ? drawn(c) : c.lane, c.fadeIn, c.fadeOut]),
    ours.map((c) => [c.src, c.start, c.duration, placed.get(c.id).base ?? placed.get(c.id).volume, c.fadeIn, c.fadeOut])]));
  if (st.fit?.key === key) return { fitted: 0, skipped: "unchanged" };
  const pcms = await decodeClips(dir, audio, root);
  const voiceStem = voice.length ? renderStem(voice, total, pcms) : null;
  // the voice behind its ceiling, as the render hears it (owner Qa3): its own peak no longer lifts the film's ceiling for the effects
  if (voiceStem && voice.every((c) => hasVoiceCeiling(tags.get(c.id)?.["data-fx-chain"]))) capStem(voiceStem, VOICE_CEILING_DB);
  await breathe();

  // ---- the music: the usual duck, written afresh. No span goes deeper for its weakest word (owner 01/11, Test 36: one quiet word took 6 dB off a poem read without a pause, all 138 s; a lane's fader is the user's)
  if (voiceStem && songs.length && words.length) {
    duckMusic(dir);
    for (const c of readMounts(dir).audio.filter((x) => audioKind(x) === "music")) { const was = songs.find((x) => x.src === c.src && x.start === c.start); if (was) was.lane = c.lane; }
    html = readFileSync(f, "utf8");
  }

  // each effect from the level the placement gave it, with no lane
  const clips = ours.map((c) => {
    const base = placed.get(c.id).base ?? placed.get(c.id).volume;
    return { clip: c, base, fit: 1, dips: [], pcm: pcms.get(c.src), sound: clipSound({ ...c, lane: null }, pcms.get(c.src), total, { volume: base, lane: null }) };
  }).filter((c) => c.sound);
  const fixed = renderStem(others.filter((c) => !audioKind(c)), total, pcms);          // the beds and the user's own clips: they count as they are
  await breathe();

  // ---- the words: all the effects on a word together, EFFECTS_MARGIN_DB under the voice (FIT_MARGIN_DB with the sums' half a dB)
  if (voiceStem) {
    const room = 10 ** (-FIT_MARGIN_DB / 10);
    for (const w of words) {
      const v = powerOf(voiceStem, w.start, w.end);
      if (v < 1e-6) continue;          // a word the voice file holds almost nothing of (-60 dB): not a masking question
      const on = clips.map((c) => ({ c, e: clipPower(c.sound, w.start, w.end) })).filter((x) => x.e > 0);
      const sum = on.reduce((s, x) => s + x.e, 0), left = Math.max(v * room - powerOf(fixed, w.start, w.end), v * room * 0.05);
      if (sum <= left) continue;
      const gain = Math.max(LOWEST_DIP, r3(Math.sqrt(left / sum)));
      for (const x of on) x.c.dips.push({ start: w.start, end: w.end, gain });
    }
    for (const c of clips) {
      const lane = dipLane({ start: c.clip.start, duration: c.sound.buf.length / 2 / SR }, c.dips);
      c.lane = lane;
      if (lane) c.sound = clipSound({ ...c.clip }, c.pcm, total, { volume: c.base, lane: lane.lanes[0].points });
    }
  }

  await breathe();

  // ---- the pauses (owner 05/11/2026 #1027, T38b-1): the effects heard together, over any 400 ms, stay HIT_UNDER_VOICE dB under the voice's
  //      own level (the median of its words). Each sound was set 6 dB under by itself, and two hits at one moment summed to 2 dB over the voice
  if (voiceStem && words.length && clips.length) {
    const wp = words.map((w) => powerOf(voiceStem, w.start, w.end)).filter((v) => v > 1e-6).sort((a, b) => a - b);
    const ref = wp.length ? wp[Math.floor(wp.length / 2)] : 0;
    const N = Math.ceil(total * SR) * 2, W = Math.round(0.4 * SR) * 2, HOP = Math.round(0.1 * SR) * 2;
    const limit = ref * 10 ** (-HIT_UNDER_VOICE / 10);
    // the running sum of the energy kept only where a window starts or ends, every HOP samples, a window being K of them (audit/112a A9: kept
    // for every sample, twice in Float64, it was about 920 MB for a 10-minute film); summed sample by sample as before, so every window reads
    // the same number. The beds' once: they do not change between the passes
    const K = W / HOP, nb = Math.floor(N / HOP) + 1;
    const running = (arr) => {
      const at = new Float64Array(nb);
      let s = 0;
      for (let i = 0; i < N; i++) { if (i % HOP === 0) at[i / HOP] = s; const v = arr?.[i] ?? 0; s += v * v; }
      if (N % HOP === 0) at[N / HOP] = s;
      return at;
    };
    const bed = running(fixed);
    for (let pass = 0; ref > 0 && pass < 4; pass++) {
      const fx = new Float32Array(N);
      for (const c of clips) for (let i = 0; i < c.sound.buf.length && c.sound.i0 + i < N; i++) fx[c.sound.i0 + i] += c.sound.buf[i];
      const cum = running(fx), asked = new Map();
      for (let k = 0, i = 0; i + W <= N; k++, i += HOP) {
        const pw = (cum[k + K] - cum[k]) / W;
        // the ambience beds heard there take their share (T38b-1: a roof's night bed with a hit at 0:03 came to 1.4 dB under the voice)
        const room = Math.max(limit - (bed[k + K] - bed[k]) / W, limit * 0.25);
        if (pw <= room) continue;
        const scale = Math.sqrt(room / pw);
        for (const c of clips) { const a = c.sound.i0, b = a + c.sound.buf.length; if (b > i && a < i + W) asked.set(c, Math.min(asked.get(c) ?? 1, scale)); }
      }
      let changed = false;
      for (const [c, s0] of asked) {
        const sc = Math.max(s0, LOWEST_FIT / c.fit);
        if (sc >= 0.999) continue;
        for (let i = 0; i < c.sound.buf.length; i++) c.sound.buf[i] *= sc;
        c.fit *= sc; changed = true;
      }
      if (!changed) break;
      await breathe();
    }
  }

  // ---- the peak: the mix with every effect in place, the effects that make a peak lowered by what it takes
  const music = renderStem(songs, total, pcms);
  const n = Math.ceil(total * SR) * 2, mix = new Float32Array(n);
  for (const stem of [voiceStem, music, fixed]) if (stem) for (let i = 0; i < n; i++) mix[i] += stem[i];
  // the effects never set the film's peak: under MIX_PEAK, or under what the voice and the music reach by themselves (a peak of the voice's
  // own the render lowers the film for anyway, by a dB or two, which the master gives back)
  let ceil = 10 ** (MIX_PEAK / 20);
  for (let i = 0; i < n; i++) { const a = Math.abs(mix[i]); if (a > ceil) ceil = a; }
  for (const c of clips) for (let i = 0; i < c.sound.buf.length; i++) mix[c.sound.i0 + i] += c.sound.buf[i];
  for (let pass = 0; pass < 8; pass++) {
    let changed = false;
    for (const c of clips) {
      const { i0, buf } = c.sound;
      let top = ceil, at = -1;
      for (let i = 0; i < buf.length; i++) { const a = Math.abs(mix[i0 + i]); if (a > top) { top = a; at = i; } }
      if (at < 0 || buf[at] * mix[i0 + at] <= 0) continue;
      const need = 1 - (top - ceil) / Math.abs(buf[at]), t = (i0 + at) / 2 / SR;
      const word = voiceStem ? words.find((w) => t >= w.start && t < w.end) : null;
      // on a word only that word takes it (the voice's own peak is no reason to lower the sound in the pauses); else the whole effect
      const scale = word ? Math.max(need, 0.25) : Math.max(need, LOWEST_FIT / c.fit);
      if (scale >= 0.999) continue;
      if (word) {
        const dip = c.dips.find((d) => d.start === word.start);
        if (dip) dip.gain = Math.max(LOWEST_DIP, r3(dip.gain * scale));
        else c.dips = [...c.dips, { start: word.start, end: word.end, gain: Math.max(LOWEST_DIP, r3(scale)) }].sort((x, y) => x.start - y.start);
        c.lane = dipLane({ start: c.clip.start, duration: buf.length / 2 / SR }, c.dips);
        c.sound = clipSound(c.clip, c.pcm, total, { volume: c.base * c.fit, lane: c.lane.lanes[0].points });
        for (let i = 0; i < buf.length; i++) mix[i0 + i] += c.sound.buf[i] - buf[i];
      } else {
        for (let i = 0; i < buf.length; i++) { mix[i0 + i] -= buf[i] * (1 - scale); buf[i] *= scale; }
        c.fit *= scale;
      }
      changed = true;
    }
    if (!changed) break;
  }
  let peak = 0;
  for (let i = 0; i < n; i++) { const a = Math.abs(mix[i]); if (a > peak) peak = a; }

  // ---- written: the level and the lane on each tag, HF's own attributes; the rest of the page as it is
  const done = new Map(clips.map((c) => [c.clip.id, c]));
  // on the page as it is now, read again at the write: the fit took seconds, and HF Studio, Claude or a Final Mix change may have written
  // it meanwhile (2 of 45 such writes were lost: audit/112a A8); only the tags the fit levelled change
  let now = html; try { now = readFileSync(f, "utf8"); } catch { /* gone: nothing to write */ }
  const out = levelTags(now, done);
  if (out !== now) writeFileSync(f, out);
  patchState(dir, (x) => {
    for (const [i, m] of (x.mounted ?? []).entries()) { const c = done.get(`el-sfx-${i}`); if (c && c.clip.src === m.file) { m.base = c.base; m.volume = Math.min(MAX_GAIN, Math.max(0.005, r3(c.base * c.fit))); } }
    for (const m of x.added ?? []) { const c = done.get(m.id); if (c && c.clip.src === m.file) { m.base = c.base; m.volume = Math.min(MAX_GAIN, Math.max(0.005, r3(c.base * c.fit))); } }
    x.fit = { key, at: new Date().toISOString() };
  });
  return { fitted: clips.length, laned: clips.filter((c) => c.lane).length, lowered: clips.filter((c) => c.fit < 0.999).length, peakDb: Math.round(20 * Math.log10(Math.max(peak, 1e-6)) * 10) / 10 };
}
