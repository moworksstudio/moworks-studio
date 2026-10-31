// The film's voice-over and music set to their levels (sfx/actions.mjs trackGains: the voice at about -16 LUFS, the music 4 dB under it
// between the words and ducked under them; a film with no voice has its music at -16 LUFS) and the music's duck lanes written
// (hf-edit/tracks.mjs duckMusic). Each file's loudness is measured once with the app's FFmpeg (EBU R128) and kept in .moworks/loudness.json
// by its size and time. A level the user set by hand in Studio stays theirs (tracks.mjs setTrackGain). Run when the music or the voice is
// placed, when the transcript is saved, before the Final Mix places the effects, and before a render, the checks or an export to AE; each
// time the effects already placed are fitted again to the voice and the mix as they are now (voicefit.mjs).
import { execFile } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { promisify } from "node:util";
import { trackGains } from "./actions.mjs";
import { duckMusic, filmWords, setTrackGain, trackClips } from "../hf-edit/tracks.mjs";
import { ffmpegExe } from "../library/preview-media.mjs";
import { fitEffects } from "./voicefit.mjs";

const run = promisify(execFile);

/** Loudness (LUFS, FFmpeg EBU R128): a bed or a voice by its integrated loudness; a short effect by its loudest 400 ms (momentary max),
 *  since an effect is mostly silence around one hit. The effect is padded with half a second of silence, so a hit shorter than the 400 ms
 *  window is measured too (a 0.14 s pop read -120.7, silence, and would have been raised to the ceiling); silence measures null. peak: the
 *  file's loudest sample instead (dBFS; the film's mix plays a mono file at its full level on both channels: HF's audioMixer). */
export async function lufsOf(file, root, { short = false, peak = false } = {}) {
  if (peak) {
    const { stderr } = await run(ffmpegExe(root), ["-hide_banner", "-nostats", "-i", file, "-map", "0:a:0", "-af", "ebur128=peak=sample", "-f", "null", "-"], { windowsHide: true, maxBuffer: 64 << 20, timeout: 180000 });
    const p = /Peak:\s*(-?[\d.]+)\s*dBFS/.exec(stderr.slice(stderr.lastIndexOf("Summary:")));
    return p ? Number(p[1]) : null;
  }
  const { stderr } = await run(ffmpegExe(root), ["-hide_banner", "-nostats", "-i", file, "-map", "0:a:0", "-af", short ? "apad=pad_dur=0.5,ebur128" : "ebur128", "-f", "null", "-"], { windowsHide: true, maxBuffer: 64 << 20, timeout: 180000 });
  if (short) {
    const ms = [...stderr.matchAll(/\sM:\s*(-?[\d.]+)/g)].map((m) => Number(m[1])).filter((v) => Number.isFinite(v) && v > -70);
    return ms.length ? Math.max(...ms) : null;
  }
  const i = /I:\s*(-?[\d.]+)\s*LUFS/.exec(stderr.slice(stderr.lastIndexOf("Summary:")));
  return i ? Number(i[1]) : null;
}

const cacheFile = (dir) => join(dir, ".moworks", "loudness.json");
/** A project file's loudness (src: project-relative; short: its loudest 400 ms; peak: its loudest sample, dBFS), measured once for its size and
 *  time. null when it cannot be read. */
export async function loudnessOf(dir, src, { root, short = false, peak = false } = {}) {
  const file = join(dir, ...String(src).split("/"));
  if (!existsSync(file)) return null;
  const st = statSync(file), key = `${peak ? "P" : short ? "M" : "I"} ${src}`, stamp = `${st.size} ${Math.round(st.mtimeMs)}`;
  let cache = {}; try { cache = JSON.parse(readFileSync(cacheFile(dir), "utf8")); } catch { /* none yet */ }
  if (cache[key]?.stamp === stamp && Number.isFinite(cache[key].lufs)) return cache[key].lufs;
  const lufs = await lufsOf(file, root, { short, peak }).catch(() => null);
  if (!Number.isFinite(lufs)) return null;
  cache[key] = { stamp, lufs };
  try { mkdirSync(join(dir, ".moworks"), { recursive: true }); writeFileSync(cacheFile(dir), JSON.stringify(cache, null, 2) + "\n"); } catch { /* measured again next time */ }
  return lufs;
}

/** Set the voice-over's and the music's levels, duck the music under the words and fit the effects already placed to both (fit: false when
 *  the effects are about to be placed anyway). Resolves { voice, bed, voiceGain, musicGain } (LUFS after the gains; null for a track the film
 *  does not have), or null when the film has no page. */
export async function levelTracks(dir, { root, fit = true } = {}) {
  let html; try { html = readFileSync(join(dir, "index.html"), "utf8"); } catch { return null; }
  const fileOf = (kind) => trackClips(html, kind).find((c) => c.src && existsSync(join(dir, ...c.src.split("/"))))?.src ?? null;
  const voiceSrc = fileOf("voice"), musicSrc = fileOf("music");
  const voice = voiceSrc ? await loudnessOf(dir, voiceSrc, { root }) : null, music = musicSrc ? await loudnessOf(dir, musicSrc, { root }) : null;
  const g = trackGains({ voice, music, words: !!filmWords(dir)?.length });
  if (g.voiceGain != null) setTrackGain(dir, "voice", g.voiceGain);
  if (g.musicGain != null) setTrackGain(dir, "music", g.musicGain);
  duckMusic(dir);
  if (fit) await fitEffects(dir, { root }).catch(() => null);
  return g;
}
