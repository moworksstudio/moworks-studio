// The film's voice-over and music set to their levels (sfx/actions.mjs trackGains: the voice at about -16 LUFS, the music 4 dB under it
// between the words and ducked under them; a film with no voice has its music at -16 LUFS) and the music's duck lanes written
// (hf-edit/tracks.mjs duckMusic). Each file's loudness is measured once with the app's FFmpeg (EBU R128) and kept in .moworks/loudness.json
// by its size and time. A level the user set by hand in Studio stays theirs (tracks.mjs setTrackGain). Run when the music or the voice is
// placed, when the transcript is saved, before Final Mix places the effects, and before a render, the checks or an export to AE; each
// time the effects already placed are fitted again to the voice and the mix as they are now (voicefit.mjs).
import { execFile } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { promisify } from "node:util";
import { trackGains } from "./actions.mjs";
import { audioKind, duckMusic, filmWords, setTrackGain, trackClips } from "../hf-edit/tracks.mjs";
import { LANES, setLane } from "./lanes.mjs";
import { patchState, readState } from "./index.mjs";
import { ffmpegExe } from "../library/preview-media.mjs";
import { fitEffects } from "./voicefit.mjs";

const run = promisify(execFile);

/** Loudness (LUFS, FFmpeg EBU R128): a bed or a voice by its integrated loudness; a short effect by its loudest 400 ms (momentary max),
 *  since an effect is mostly silence around one hit. The effect is padded with half a second of silence, so a hit shorter than the 400 ms
 *  window is measured too (a 0.14 s pop read -120.7, silence, and would have been raised to the ceiling); silence measures null. peak: the
 *  file's loudest sample instead (dBFS; the film's mix plays a mono file at its full level on both channels: HF's audioMixer). */
export async function lufsOf(file, root, { short = false, peak = false, from = null, length = null } = {}) {
  // a part of the file (from, length: seconds): the music as the film plays it (#1181)
  const part = [...(Number.isFinite(from) && from > 0 ? ["-ss", String(from)] : []), ...(Number.isFinite(length) && length > 0 ? ["-t", String(length)] : [])];
  if (peak) {
    const { stderr } = await run(ffmpegExe(root), ["-hide_banner", "-nostats", "-i", file, "-map", "0:a:0", "-af", "ebur128=peak=sample", "-f", "null", "-"], { windowsHide: true, maxBuffer: 64 << 20, timeout: 180000 });
    const p = /Peak:\s*(-?[\d.]+)\s*dBFS/.exec(stderr.slice(stderr.lastIndexOf("Summary:")));
    return p ? Number(p[1]) : null;
  }
  const { stderr } = await run(ffmpegExe(root), ["-hide_banner", "-nostats", ...part, "-i", file, "-map", "0:a:0", "-af", short ? "apad=pad_dur=0.5,ebur128" : "ebur128", "-f", "null", "-"], { windowsHide: true, maxBuffer: 64 << 20, timeout: 180000 });
  if (short) {
    const ms = [...stderr.matchAll(/\sM:\s*(-?[\d.]+)/g)].map((m) => Number(m[1])).filter((v) => Number.isFinite(v) && v > -70);
    if (!ms.length) return null;
    // a short hit (a thud, a slap) is loud for 50-100 ms: the 400 ms window reads it 6-10 dB under what is heard against the voice (T42-10:
    // impact-thud-heavy-1 read -19.3 LUFS in 400 ms and -10.9 dBFS in 100 ms, and played +4.2 dB over the voice). Its loudest 100 ms (RMS)
    // counts too: the louder of the two is the hit's level
    let rms = null;
    try {
      const { stdout } = await run(ffmpegExe(root), ["-hide_banner", "-nostats", "-i", file, "-map", "0:a:0", "-af",
        "aresample=48000,apad=pad_dur=0.5,asetnsamples=n=4800:p=0,astats=metadata=1:reset=1,ametadata=print:key=lavfi.astats.Overall.RMS_level:file=-", "-f", "null", "-"],
        { windowsHide: true, maxBuffer: 64 << 20, timeout: 180000 });
      const r = [...stdout.matchAll(/RMS_level=(-?[\d.]+)/g)].map((m) => Number(m[1])).filter((v) => Number.isFinite(v) && v > -70);
      if (r.length) rms = Math.max(...r);
    } catch { /* the 400 ms reading alone */ }
    return Math.max(Math.max(...ms), rms ?? -Infinity);
  }
  const i = /I:\s*(-?[\d.]+)\s*LUFS/.exec(stderr.slice(stderr.lastIndexOf("Summary:")));
  return i ? Number(i[1]) : null;
}

const cacheFile = (dir) => join(dir, ".moworks", "loudness.json");
/** A project file's loudness (src: project-relative; short: its loudest 400 ms; peak: its loudest sample, dBFS), measured once for its size and
 *  time. null when it cannot be read. */
export async function loudnessOf(dir, src, { root, short = false, peak = false, from = null, length = null } = {}) {
  const file = join(dir, ...String(src).split("/"));
  if (!existsSync(file)) return null;
  const ranged = !short && !peak && (Number.isFinite(from) || Number.isFinite(length));
  const r1 = (n) => (Number.isFinite(n) ? Math.round(n * 10) / 10 : "");
  // M2: a hit's level is the louder of its 400 ms and its 100 ms (T42-10); the older M readings are measured again
  const st = statSync(file), key = `${peak ? "P" : short ? "M2" : "I"} ${src}${ranged ? ` @${r1(from)}+${r1(length)}` : ""}`, stamp = `${st.size} ${Math.round(st.mtimeMs)}`;
  let cache = {}; try { cache = JSON.parse(readFileSync(cacheFile(dir), "utf8")); } catch { /* none yet */ }
  if (cache[key]?.stamp === stamp && Number.isFinite(cache[key].lufs)) return cache[key].lufs;
  const lufs = await lufsOf(file, root, ranged ? { from, length } : { short, peak }).catch(() => null);
  if (!Number.isFinite(lufs)) return null;
  cache[key] = { stamp, lufs };
  try { mkdirSync(join(dir, ".moworks"), { recursive: true }); writeFileSync(cacheFile(dir), JSON.stringify(cache, null, 2) + "\n"); } catch { /* measured again next time */ }
  return lufs;
}

/** The music's loudness while the words are spoken (LUFS): its momentary loudness (400 ms) at each tenth of a second the film speaks
 *  (words: film seconds), summed by power. The house rule is the music 10 dB under the voice while it speaks (owner 31/10), and a track is
 *  not as loud under the words as on average: Test 40's played part read -17.5 LUFS and -19 under its words (#1181). null with fewer than
 *  3 s of words heard over the music, or nothing to read. One FFmpeg pass a clip, kept in loudness.json for the file and the words. */
async function underWords(dir, src, clips, words, root) {
  const file = join(dir, ...String(src).split("/"));
  const sigOf = (s) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return (h >>> 0).toString(36); };
  const key = `W ${src} #${sigOf(JSON.stringify([clips.map((c) => [c.start, c.mediaStart, c.duration]), words.map((w) => [w.start, w.end])]))}`;
  const st = statSync(file), stamp = `${st.size} ${Math.round(st.mtimeMs)}`;
  let cache = {}; try { cache = JSON.parse(readFileSync(cacheFile(dir), "utf8")); } catch { /* none yet */ }
  if (cache[key]?.stamp === stamp) return Number.isFinite(cache[key].lufs) ? cache[key].lufs : null;
  let power = 0, n = 0;
  for (const c of clips) {
    const from = c.mediaStart, len = Number.isFinite(c.duration) && c.duration > 0 ? c.duration : null;
    const heard = words.filter((w) => w.end > c.start && (len == null || w.start < c.start + len));
    if (!heard.length) continue;
    const args = ["-hide_banner", "-nostats", ...(from > 0 ? ["-ss", String(from)] : []), ...(len ? ["-t", String(len)] : []), "-i", file, "-map", "0:a:0",
      "-af", "ebur128=metadata=1,ametadata=print:key=lavfi.r128.M:file=-", "-f", "null", "-"];
    const { stdout } = await run(ffmpegExe(root), args, { windowsHide: true, maxBuffer: 256 << 20, timeout: 180000 }).catch(() => ({ stdout: "" }));
    const re = /pts_time:([\d.]+)[^\n]*\n[^\n]*lavfi\.r128\.M=(-?[\d.]+)/g;
    for (let m; (m = re.exec(stdout));) {
      const t = c.start + Number(m[1]) - 0.2, lufs = Number(m[2]);          // the window's middle, in film seconds
      if (lufs > -70 && heard.some((w) => t >= w.start && t <= w.end)) { power += 10 ** (lufs / 10); n++; }
    }
  }
  const lufs = n >= 30 ? Math.round(10 * Math.log10(power / n) * 10) / 10 : null;          // about 3 s of words at ten readings a second
  cache[key] = { stamp, lufs };
  try { mkdirSync(join(dir, ".moworks"), { recursive: true }); writeFileSync(cacheFile(dir), JSON.stringify(cache, null, 2) + "\n"); } catch { /* measured again next time */ }
  return lufs;
}

/** A track's loudness as the film plays it (LUFS). With the film's words (film seconds) and music: the music under them (underWords). Else
 *  the parts of its file its clips play, each measured on its own and summed by power for its length: the whole file read -14.8 LUFS where
 *  the 65 s Test 40 plays of it read -17.5, so the music came 2.7 dB under the house level (Test 41: 2.4 dB, #1181). A clip with no length:
 *  the file from where it starts. null with no such file. */
export async function playedLoudness(dir, html, kind, { root, words = null } = {}) {
  const clips = trackClips(html, kind).filter((c) => c.src && existsSync(join(dir, ...c.src.split("/"))));
  if (!clips.length) return null;
  const src = clips[0].src, own = clips.filter((c) => c.src === src);
  if (kind === "music" && words?.length) {
    const w = await underWords(dir, src, own, words, root).catch(() => null);
    if (Number.isFinite(w)) return w;
  }
  let power = 0, total = 0;
  for (const c of own) {
    const lufs = await loudnessOf(dir, src, { root, from: c.mediaStart, length: c.duration ?? null });
    if (!Number.isFinite(lufs)) continue;
    const w = Number.isFinite(c.duration) && c.duration > 0 ? c.duration : 1;
    power += w * 10 ** (lufs / 10); total += w;
  }
  if (total > 0) return Math.round(10 * Math.log10(power / total) * 10) / 10;
  return loudnessOf(dir, src, { root });
}

/** Set the voice-over's and the music's levels, duck the music under the words and fit the effects already placed to both (fit: false when
 *  the effects are about to be placed anyway). Resolves { voice, bed, voiceGain, musicGain } (LUFS after the gains; null for a track the film
 *  does not have), or null when the film has no page. */
export async function levelTracks(dir, { root, fit = true } = {}) {
  let html; try { html = readFileSync(join(dir, "index.html"), "utf8"); } catch { return null; }
  const fileOf = (kind) => trackClips(html, kind).find((c) => c.src && existsSync(join(dir, ...c.src.split("/"))))?.src ?? null;
  const voiceSrc = fileOf("voice"), musicSrc = fileOf("music");
  const words = filmWords(dir);
  const voice = voiceSrc ? await loudnessOf(dir, voiceSrc, { root }) : null, music = musicSrc ? await playedLoudness(dir, html, "music", { root, words: voiceSrc ? words : null }) : null;
  const g = trackGains({ voice, music, words: !!words?.length });
  if (g.voiceGain != null) setTrackGain(dir, "voice", g.voiceGain);
  if (g.musicGain != null) setTrackGain(dir, "music", g.musicGain);
  duckMusic(dir);
  if (fit) await fitEffects(dir, { root }).catch(() => null);
  return g;
}

/** The film's sound back to what the app sets: the lanes' faders at 0 dB, every level and lane set by hand or by Claude gone, then levelled and fitted as after the Build. The music, the voice
 *  and where each clip sits stay; a sound the app did not place keeps its level. (owner 01/11: after moving levels, or with a new music or voice, one press balances it all again) */
export async function balanceAgain(dir, { root } = {}) {
  for (const lane of LANES) setLane(dir, lane, 0);
  const f = join(dir, "index.html");
  let html; try { html = readFileSync(f, "utf8"); } catch { return null; }
  const st = readState(dir), placed = new Map((st.mounted ?? []).map((m, i) => [`el-sfx-${i}`, m]));
  for (const m of st.added ?? []) placed.set(m.id, m);
  const attrsOf = (tag) => Object.fromEntries([...tag.matchAll(/([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*"([^"]*)"/g)].map((x) => [x[1], x[2]]));
  const out = html.replace(/<audio\b[^>]*>/gi, (tag) => {
    const a = attrsOf(tag), kind = audioKind(a), m = placed.get(a.id);
    if (!kind && !m) return tag;
    for (const k of ["data-automation", "data-mw-duck", "data-fx-carve", "data-fx-chain"]) delete a[k];
    if (kind) { delete a["data-mw-gain-mark"]; a["data-mw-gain"] = a["data-volume"] ?? "1"; }
    else if (Number.isFinite(m.base ?? m.volume)) a["data-volume"] = String(m.base ?? m.volume);
    return `<audio ${Object.entries(a).map(([k, v]) => `${k}="${v}"`).join(" ")}>`;
  });
  if (out !== html) writeFileSync(f, out);
  patchState(dir, (x) => {
    for (const m of [...(x.mounted ?? []), ...(x.added ?? [])]) if (Number.isFinite(m.base)) m.volume = m.base;
    delete x.fit;
  });
  return levelTracks(dir, { root });
}
