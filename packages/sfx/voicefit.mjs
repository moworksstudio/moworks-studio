// The effects fitted to the film as it plays (Test 28: 39 spoken words had an effect louder than the voice, up to 16 dB, right on the film's
// turning point, and the stems summed to +8.5 dBFS; a gain per file cannot know where the words are, and no later step fixed it). Two rules,
// the app's own placing meets them so Tech checks' voice check stays quiet:
// - under a spoken word the effects stay EFFECTS_MARGIN_DB under the voice: each effect gets a volume lane (HyperFrames' data-automation, as the
//   music's duck) flat inside each word it sounds on and full again in the pauses, so a long wind keeps blowing between the words;
// - the whole mix stays under MIX_PEAK, so HF's assemble never lowers the whole film to save a peak (its true-peak step, -1 dBFS) and the
//   master stays linear: the Editor's Smooth preview and the final MP4 are the same mix at about the same level.
// Where a song runs so loud that the usual duck leaves a word within MUSIC_MARGIN_DB, that spoken span ducks deeper (a song with 17 LU of range).
// The film is heard as HF's render mixes it (engine audioMixer at the pinned version): each clip its part of its file, 48 kHz stereo, its
// data-volume times its lane, its linear edge fades, at its place. What the app wrote keeps a signature (data-mw-duck) and the level it
// started from (sfx.json mounted[].base), so each fit starts again from the placement's levels; a level or a lane the user set in Studio stays
// theirs and counts as it is. A sound the user added from the Sounds drawer (sfx.json added[]) is fitted the same way: it stays where they put it,
// and it still may not drown the words. Run after a placement and whenever the tracks are levelled (mixlevels.mjs), skipped while nothing changed.
import { execFile } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { promisify } from "node:util";
import { ffmpegExe } from "../library/preview-media.mjs";
import { readMounts } from "../hf-edit/shots.mjs";
import { audioKind, duckMusic, filmWords } from "../hf-edit/tracks.mjs";
import { EFFECTS_MARGIN_DB, MAX_GAIN, MUSIC_DUCK, MUSIC_MARGIN_DB, dipLane, sig, speechSpans } from "./actions.mjs";
import { patchState, readState } from "./index.mjs";

const run = promisify(execFile);
const breathe = () => new Promise((done) => setImmediate(done));          // the server's other requests between the long sums
const SR = 48000;
/** A word's room for the effects: the margin and half a dB for what the sums cannot know (two sounds in phase). */
const FIT_MARGIN_DB = EFFECTS_MARGIN_DB + 0.5;
/** The mix's loudest sample, dBFS: under HF's -1 dBFS true-peak step with what oversampling and the AAC encode add. */
export const MIX_PEAK = -2.5;
const LOWEST_FIT = 0.25;          // the peak rule takes at most 12 dB off one effect: over that the music itself is the peak
const LOWEST_DIP = 0.01;
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

const attrsOf = (tag) => Object.fromEntries([...tag.matchAll(/([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*"([^"]*)"/g)].map((m) => [m[1], m[2]]));
const audioLine = (a) => `<audio ${Object.entries(a).map(([k, v]) => `${k}="${v}"`).join(" ")}>`;

/** Fit the app's placed effects to the voice and the mix (above), the music's duck first. The music's lanes are as tracks.mjs duckMusic wrote
 *  them just now (the callers run it first). Returns { fitted, laned, lowered, deeper, peakDb } or { fitted: 0, skipped }. */
export async function fitEffects(dir, { root } = {}) {
  const f = join(dir, "index.html");
  let html; try { html = readFileSync(f, "utf8"); } catch { return { fitted: 0, skipped: "no page" }; }
  const st = readState(dir), mounted = st.mounted ?? [];
  const placed = new Map(mounted.map((m, i) => [`el-sfx-${i}`, m]));
  const { root: comp, audio } = readMounts(dir);
  // each clip by its own id, whatever stands first in its tag (Studio stamps data-hf-id there), its attributes as they are written
  const tagList = [...html.matchAll(/<audio\b[^>]*>/gi)].map((m) => attrsOf(m[0])), tags = new Map(tagList.map((a) => [a.id, a]));
  audio.forEach((c, i) => { c.id = tagList[i]?.id ?? c.id; });
  for (const m of st.added ?? []) if (tags.get(m.id)?.src === m.file) placed.set(m.id, m);
  // ours: an effect still at the level and with the lane the app gave it
  const isOurs = (c) => {
    const m = placed.get(c.id), a = tags.get(c.id);
    if (!m || !a || !Number.isFinite(m.volume) || Math.abs((Number(a["data-volume"]) || 0) - m.volume) > 0.0005) return false;
    return a["data-automation"] == null || a["data-mw-duck"] === sig(a["data-automation"]);
  };
  const ours = audio.filter(isOurs);
  const words = (filmWords(dir) ?? []).filter((w) => w.end - w.start >= 0.04);
  const others = audio.filter((c) => !ours.includes(c)), voice = others.filter((c) => audioKind(c) === "voice"), songs = others.filter((c) => audioKind(c) === "music");
  if (!ours.length && !(voice.length && songs.length && words.length)) return { fitted: 0, skipped: "nothing to fit" };
  const total = Number(comp?.duration) || Math.max(...audio.map((c) => (Number(c.start) || 0) + (Number(c.duration) || 0)));
  // what the fit hears; the music's own lane follows the words and this fit, so only a lane the user drew counts
  const drawn = (c) => { const a = tags.get(c.id); return a?.["data-automation"] != null && a["data-mw-duck"] !== sig(a["data-automation"]) ? c.lane : null; };
  const key = sig(JSON.stringify([total, words.map((w) => [w.start, w.end]), others.map((c) => [c.src, c.start, c.mediaStart, c.duration, c.volume, audioKind(c) === "music" ? drawn(c) : c.lane, c.fadeIn, c.fadeOut]),
    ours.map((c) => [c.src, c.start, c.duration, placed.get(c.id).base ?? placed.get(c.id).volume, c.fadeIn, c.fadeOut])]));
  if (st.fit?.key === key) return { fitted: 0, skipped: "unchanged" };
  const pcms = await decodeClips(dir, audio, root);
  const voiceStem = voice.length ? renderStem(voice, total, pcms) : null;
  await breathe();

  // ---- the music: a spoken span where a word has it within its margin ducks that much deeper (all of the span: a lane never pumps inside a phrase)
  const deep = [];
  if (voiceStem && songs.length && words.length) {
    const relane = () => { for (const c of readMounts(dir).audio.filter((x) => audioKind(x) === "music")) { const was = songs.find((x) => x.src === c.src && x.start === c.start); if (was) was.lane = c.lane; } };
    duckMusic(dir, { deep: [] });          // from the usual duck, whatever the last fit added
    relane();
    const song = renderStem(songs, total, pcms);
    const over = (w) => { const v = powerOf(voiceStem, w.start, w.end); return v < 1e-6 ? 0 : 10 * Math.log10(Math.max(1e-12, powerOf(song, w.start, w.end))) - (10 * Math.log10(v) - (MUSIC_MARGIN_DB + 0.5)); };
    for (const s of speechSpans(words)) {
      const most = Math.max(...words.filter((w) => w.start >= s.start && w.end <= s.end).map(over));
      if (most > 0) deep.push({ start: s.start, duck: Math.round(MUSIC_DUCK * 10 ** (-most / 20) * 1000) / 1000 });
    }
    if (deep.length) { duckMusic(dir, { deep }); relane(); }
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
  const out = html.replace(/<audio\b[^>]*>/gi, (tag) => {
    const a = attrsOf(tag), c = done.get(a.id);
    if (!c) return tag;
    a["data-volume"] = String(Math.min(MAX_GAIN, Math.max(0.005, r3(c.base * c.fit))));
    delete a["data-automation"]; delete a["data-mw-duck"];
    if (c.lane) { a["data-automation"] = JSON.stringify(c.lane).replace(/"/g, "&quot;"); a["data-mw-duck"] = sig(a["data-automation"]); }
    return audioLine(a);
  });
  if (out !== html) writeFileSync(f, out);
  patchState(dir, (x) => {
    for (const [i, m] of (x.mounted ?? []).entries()) { const c = done.get(`el-sfx-${i}`); if (c) { m.base = c.base; m.volume = Math.min(MAX_GAIN, Math.max(0.005, r3(c.base * c.fit))); } }
    for (const m of x.added ?? []) { const c = done.get(m.id); if (c && c.clip.src === m.file) { m.base = c.base; m.volume = Math.min(MAX_GAIN, Math.max(0.005, r3(c.base * c.fit))); } }
    x.fit = { key, at: new Date().toISOString(), ...(deep.length ? { deep } : {}) };
  });
  return { fitted: clips.length, laned: clips.filter((c) => c.lane).length, lowered: clips.filter((c) => c.fit < 0.999).length, deeper: deep.length, peakDb: Math.round(20 * Math.log10(Math.max(peak, 1e-6)) * 10) / 10 };
}
