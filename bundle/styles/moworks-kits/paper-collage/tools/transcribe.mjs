#!/usr/bin/env node
// transcribe.mjs — a voice-over → words with timings, so a motion graphic can hit its beats on the spoken words.
// OPTIONAL: only needed when the user gives a voice-over (tools/new-graphic.mjs --voice runs it for you).
//
//   node tools/transcribe.mjs <video-or-audio> <slug> [--engine auto|mlx|faster] [--model <name>] [--language en]
//
// Engines: "mlx" = mlx-whisper (Apple Silicon Macs, fastest) · "faster" = faster-whisper (Windows, Linux, Intel Macs;
// NVIDIA GPU if present, else CPU). "auto" picks mlx on Apple Silicon, faster everywhere else. Both run through uv —
// no Python setup needed. The first run downloads the model (≈ 1.6 GB), later runs are offline.
//
// Writes projects/<slug>/
//   audio.wav   the speech, mono, at the source's own sample rate
//   asr.json    raw recogniser output
//   words.json  { duration, words:[{w,t,end,asr,p}], pauses:[{from,to}], beats:[{from,to,text}] }
// and prints a cue sheet. Word starts are corrected against the loudness envelope: each recognised start is snapped
// to the real energy onset nearby (the recogniser can be ~0.1 s off). The text is kept verbatim — fix names and
// spelling in the composition, never by re-recording.
import { spawnSync } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";
import { FFMPEG, ROOT, UV, args, probe, run } from "./lib.mjs";

const o = args(process.argv.slice(2));
const [media, slug] = o._;
if (!media || !slug) {
  console.error("usage: node tools/transcribe.mjs <video-or-audio> <slug> [--engine auto|mlx|faster] [--model name] [--language en]");
  process.exit(1);
}
const engine = !o.engine || o.engine === "auto" ? (process.platform === "darwin" && process.arch === "arm64" ? "mlx" : "faster") : o.engine;
const dir = path.join(ROOT, "projects", slug);
fs.mkdirSync(dir, { recursive: true });
const ff = FFMPEG();
const uv = UV();

// 1) the speech as mono WAV at its native rate (low-rate downmixes hide consonant onsets)
const info = probe(media);
if (!info.hasAudio) {
  console.error("✗ this file has no audio track — nothing to transcribe.");
  process.exit(1);
}
const audio = path.join(dir, "audio.wav");
run(ff, ["-v", "error", "-y", "-i", media, "-vn", "-ac", "1", "-c:a", "pcm_s16le", audio]);
const duration = probe(audio).duration;
const sr = probe(audio).sampleRate;

// 2) transcribe (word timestamps)
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "asr-"));
let asrFile;
console.log(`transcribing with ${engine === "mlx" ? "mlx-whisper" : "faster-whisper"} …`);
if (engine === "mlx") {
  const model = o.model || "mlx-community/whisper-large-v3-turbo";
  const a = ["--from", "mlx-whisper", "mlx_whisper", audio, "--model", model, "--word-timestamps", "True", "--output-format", "json", "--output-dir", tmp];
  if (o.language) a.push("--language", o.language);
  run(path.join(path.dirname(uv), process.platform === "win32" ? "uvx.exe" : "uvx"), a, { stdio: ["ignore", "ignore", "inherit"] });
  asrFile = path.join(tmp, "audio.json");
} else {
  asrFile = path.join(tmp, "asr.json");
  const a = ["run", "--with", "faster-whisper", "--with", "numpy", "python", path.join(ROOT, "tools/fw_transcribe.py"), audio, asrFile, "--model", o.model || "large-v3-turbo"];
  if (o.language) a.push("--language", o.language);
  run(uv, a);
}
// whisper can emit bare NaN (avg_logprob on long files) — not valid JSON
const asr = JSON.parse(fs.readFileSync(asrFile, "utf8").replace(/\bNaN\b/g, "null"));
fs.writeFileSync(path.join(dir, "asr.json"), JSON.stringify(asr, null, 1));

// 3) loudness envelope, 10-ms windows, native rate (ametadata prints to stderr)
const win = Math.round(sr * 0.01);
const log = spawnSync(
  ff,
  ["-v", "info", "-i", audio, "-af", `aformat=channel_layouts=mono,asetnsamples=n=${win}:p=0,astats=metadata=1:reset=1,ametadata=mode=print:key=lavfi.astats.Overall.RMS_level`, "-f", "null", "-"],
  { maxBuffer: 512 * 1024 * 1024 },
).stderr.toString();
const env = [...log.matchAll(/RMS_level=(-?[\d.]+|-inf)/g)].map((m) => (m[1] === "-inf" ? -99 : Number(m[1])));
const SILENT = -38;

// 4) correct word starts: nearest real energy onset around each recognised start
const raw = asr.segments.flatMap((s) => s.words ?? []);
const words = [];
let prevT = -1;
raw.forEach((w, i) => {
  const s = w.start;
  let t = s;
  if (i === 0) {
    for (let f = 0; f < env.length && f * 0.01 <= s + 0.25; f++)
      if (env[f] > -40) {
        t = f * 0.01;
        break;
      }
  } else {
    let mF = Math.round(Math.max(prevT + 0.05, s - 0.14) / 0.01);
    const hi = Math.round((s + 0.06) / 0.01);
    for (let f = mF; f <= hi; f++) if ((env[f] ?? -99) < (env[mF] ?? -99)) mF = f;
    for (let f = mF; f <= mF + 20; f++) {
      if ((env[f] ?? -99) > (env[mF] ?? -99) + 8 && (env[f] ?? -99) > SILENT) {
        t = f * 0.01;
        break;
      }
    }
    if (Math.abs(t - s) > 0.16) t = s; // never trust a big jump
  }
  t = Math.max(t, prevT + 0.04);
  prevT = t;
  words.push({ w: w.word.trim(), t: +t.toFixed(3), end: +w.end.toFixed(3), asr: +s.toFixed(3), p: +(w.probability ?? 0).toFixed(2) });
});

// 5) energy dips (reference) and beats (split on punctuation, real gaps ≥ 0.2 s, or 12 words)
const PAUSE_DB = -31;
const pauses = [];
let runStart = -1;
env.forEach((v, f) => {
  if (v < PAUSE_DB && runStart < 0) runStart = f;
  if ((v >= PAUSE_DB || f === env.length - 1) && runStart >= 0) {
    if ((f - runStart) * 0.01 >= 0.1) pauses.push({ from: +(runStart * 0.01).toFixed(2), to: +(f * 0.01).toFixed(2) });
    runStart = -1;
  }
});
const beats = [];
let cur = [];
words.forEach((w, i) => {
  cur.push(w);
  const next = words[i + 1];
  const gap = next ? raw[i + 1].start - raw[i].end : 1;
  const punct = /[.;:!?—]$/.test(w.w) || (/,$/.test(w.w) && (gap >= 0.12 || cur.length >= 4));
  if (!next || punct || gap >= 0.2 || cur.length >= 12) {
    beats.push({ from: cur[0].t, to: next ? next.t : +duration.toFixed(3), text: cur.map((x) => x.w).join(" ") });
    cur = [];
  }
});
fs.writeFileSync(path.join(dir, "words.json"), JSON.stringify({ slug, source: path.resolve(media), duration: +duration.toFixed(3), words, pauses, beats }, null, 1));
fs.rmSync(tmp, { recursive: true, force: true });

console.log(`\n${slug} — ${duration.toFixed(2)} s, ${words.length} words → projects/${slug}/words.json`);
const low = words.filter((w) => w.p < 0.6);
if (low.length) console.log(`⚠ low-confidence words (check spelling/names): ${low.map((w) => `${w.w}@${w.t.toFixed(2)}`).join("  ")}`);
console.log("\nbeats (source time):");
beats.forEach((b, i) => console.log(`  ${String(i + 1).padStart(2)}. ${b.from.toFixed(2)}–${b.to.toFixed(2)}  ${b.text}`));
