// Audio files of the voice-over: accepted types, facts (ffprobe) and a waveform (peaks) for the Voice screen, with the pinned FFmpeg.
import { execFile } from "node:child_process";
import { join } from "node:path";
import { promisify } from "node:util";
import { expandEnv, loadPins, APP_ROOT } from "../version-manager/index.mjs";

const run = promisify(execFile);
export const AUDIO_TYPES = { ".mp3": "audio/mpeg", ".wav": "audio/wav", ".m4a": "audio/mp4", ".aac": "audio/aac", ".flac": "audio/flac", ".ogg": "audio/ogg", ".opus": "audio/ogg" };
export const MAX_BYTES = 1024 * 1024 * 1024;   // 1 GB
const bin = (name, root) => join(expandEnv(loadPins(root).ffmpeg.dir), `${name}.exe`);

/** { duration, codec, sampleRate, channels, bitRate } of an audio file. */
export async function probe(file, root = APP_ROOT) {
  const { stdout } = await run(bin("ffprobe", root), ["-v", "error", "-show_entries", "format=duration,bit_rate:stream=codec_name,sample_rate,channels",
    "-select_streams", "a:0", "-of", "json", file], { windowsHide: true, maxBuffer: 1 << 20 });
  const j = JSON.parse(stdout); const s = j.streams?.[0];
  if (!s) throw Object.assign(new Error("This file has no audio track"), { code: "INVALID" });
  return { duration: Math.round(Number(j.format?.duration ?? 0) * 1000) / 1000, codec: s.codec_name, sampleRate: Number(s.sample_rate), channels: s.channels,
    bitRate: j.format?.bit_rate ? Number(j.format.bit_rate) : null };
}

/** The sound of a video (a talking-head clip) as an .m4a next to the voice-overs, so it can be transcribed like one. */
export async function extractAudio(video, out, root = APP_ROOT) {
  await run(bin("ffmpeg", root), ["-v", "error", "-y", "-i", video, "-vn", "-ac", "1", "-c:a", "aac", "-b:a", "128k", out], { windowsHide: true, maxBuffer: 1 << 20 });
  return out;
}

/** The quiet parts of a voice-over: [[from, to]] in seconds, under -30 dB for 0.08 s or more. The level is measured: on Vietnamese takes of eleven_v3 and eleven_v4 it
 *  finds every pause and no gap inside a word (at -40 dB eleven_v3's breaths hide its pauses; at -25 dB the gaps between syllables show). */
export async function quietParts(file, root = APP_ROOT) {
  const { stderr } = await run(bin("ffmpeg", root), ["-hide_banner", "-nostats", "-i", file, "-af", "silencedetect=noise=-30dB:d=0.08", "-f", "null", "-"], { windowsHide: true, maxBuffer: 1 << 24 });
  const ends = [...stderr.matchAll(/silence_end: ([\d.]+)/g)].map((m) => Number(m[1]));
  return [...stderr.matchAll(/silence_start: ([\d.]+)/g)].map((m, i) => [Number(m[1]), ends[i]]).filter(([, to]) => to != null);
}

/** n peak values in 0..1 across the file (mono, 8 kHz decode). */
export async function peaks(file, n = 600, root = APP_ROOT) {
  const { stdout } = await run(bin("ffmpeg", root), ["-v", "error", "-i", file, "-ac", "1", "-ar", "8000", "-f", "s16le", "-"],
    { windowsHide: true, encoding: "buffer", maxBuffer: 1 << 28 });
  const samples = stdout.length >> 1;
  if (!samples) return [];
  const per = Math.max(1, Math.floor(samples / n)), out = [];
  let max = 0;
  for (let b = 0; b < n && b * per < samples; b++) {
    let m = 0;
    for (let i = b * per; i < Math.min(samples, (b + 1) * per); i++) { const v = Math.abs(stdout.readInt16LE(i * 2)); if (v > m) m = v; }
    out.push(m); if (m > max) max = m;
  }
  return out.map((v) => Math.round((max ? v / max : 0) * 1000) / 1000);
}
