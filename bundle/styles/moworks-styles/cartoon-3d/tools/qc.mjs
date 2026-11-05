#!/usr/bin/env node
// qc.mjs — the checks every video passes before it's handed over, in one command (never plays anything):
//   node tools/qc.mjs <CompositionId | path/to/video.mp4>
// Reports: streams (codec, size, fps, frames, durations) · black stretches · frozen stretches · hard cuts ·
// integrated loudness + true peak · per-channel sample peak · voice clarity (narrated videos: the voice over the
// effects + music, median ≥ 12 dB), and writes out/<Comp>/qc.json + out/<Comp>/dense.jpg
// (2 frames a second, 5 across) to read beat by beat. Expected in this style: a hard cut at every shot change (compare
// them with the shot list) and no black stretches; a freeze ≥ 0.6 s is fine only on a deliberate hold (the last ≥ 0.5 s).
import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";
import { FFMPEG, FFPROBE, ROOT, UV, out } from "./lib.mjs";

const [arg] = process.argv.slice(2);
if (!arg) {
  console.error("usage: node tools/qc.mjs <CompositionId | video.mp4>");
  process.exit(1);
}
const file = arg.endsWith(".mp4") ? path.resolve(arg) : path.join(ROOT, "out", arg, `${arg}.mp4`);
if (!fs.existsSync(file)) {
  console.error(`✗ no ${file} — render it first: node tools/render.mjs ${arg}`);
  process.exit(1);
}
const ff = FFMPEG();
const err = (a) => spawnSync(ff, ["-hide_banner", "-i", file, ...a, "-f", "null", "-"], { encoding: "utf8", maxBuffer: 256 * 1024 * 1024 }).stderr;
const num = (s) => Number(s);

const streams = JSON.parse(out(FFPROBE(), ["-v", "error", "-count_frames", "-show_entries", "stream=codec_type,codec_name,profile,width,height,r_frame_rate,nb_read_frames,duration,sample_rate,channels", "-of", "json", file])).streams;
const v = streams.find((s) => s.codec_type === "video");
const a = streams.find((s) => s.codec_type === "audio");
const black = [...err(["-vf", "blackdetect=d=0.1:pix_th=0.10", "-an"]).matchAll(/black_start:([\d.]+) black_end:([\d.]+)/g)].map((m) => [num(m[1]), num(m[2])]);
const fz = err(["-vf", "freezedetect=n=-60dB:d=0.6", "-an"]);
const freezes = [...fz.matchAll(/freeze_start: ([\d.]+)[\s\S]*?freeze_end: ([\d.]+)/g)].map((m) => [num(m[1]), num(m[2])]);
const cuts = [...err(["-vf", "select='gt(scene,0.25)',showinfo", "-an"]).matchAll(/pts_time:([\d.]+)/g)].map((m) => num(m[1]));
let loud = null;
let peaks = [];
if (a) {
  const e = err(["-af", "ebur128=peak=true", "-vn"]);
  const sum = e.slice(e.lastIndexOf("Summary:"));
  loud = { lufs: num(sum.split("I:")[1]?.split("LUFS")[0]), truePeak: num(sum.split("Peak:")[1]?.split("dBFS")[0]) };
  peaks = [...err(["-af", "astats=measure_overall=0:measure_perchannel=Peak_level", "-vn"]).matchAll(/Peak level dB: ([-\d.]+)/g)].map((m) => num(m[1]));
}
// voice clarity (narrated videos): the voice against out/<Comp>/<Comp>.sfx.wav, which mix.py writes at the voice's level
let clarity = null;
const id = path.basename(file, ".mp4");
const stJson = path.join(ROOT, "out/_sound", `${id}.soundtrack.json`);
const bed = path.join(path.dirname(file), `${id}.sfx.wav`);
if (fs.existsSync(stJson) && fs.existsSync(bed)) {
  const voice = JSON.parse(fs.readFileSync(stJson, "utf8")).voice;
  if (voice && fs.existsSync(path.join(ROOT, voice))) {
    const r = spawnSync(UV(), ["run", "-q", "--with", "numpy", "--with", "scipy", "python", path.join(ROOT, "tools/sfx/voice_clarity.py"), path.join(ROOT, voice), bed, "--json"], { encoding: "utf8" });
    try {
      clarity = JSON.parse(r.stdout.trim().split("\n").pop());
    } catch {}
  }
}
const dense = path.join(path.dirname(file), "dense.jpg");
spawnSync(ff, ["-v", "error", "-y", "-i", file, "-vf", "fps=2,scale=384:-1,tile=5x8", "-frames:v", "1", dense]);

const report = {
  file,
  video: v && { codec: `${v.codec_name} ${v.profile ?? ""}`.trim(), size: `${v.width}×${v.height}`, fps: v.r_frame_rate, frames: num(v.nb_read_frames), seconds: num(v.duration) },
  audio: a && { codec: a.codec_name, sampleRate: num(a.sample_rate), channels: a.channels, seconds: num(a.duration) },
  black,
  freezes,
  cuts,
  loudness: loud,
  channelPeaksDb: peaks,
  voiceClarityDb: clarity,
  dense,
};
fs.writeFileSync(path.join(path.dirname(file), "qc.json"), JSON.stringify(report, null, 2) + "\n");

const f2 = (x) => x.toFixed(2);
const flags = [];
if (a && Math.abs(num(a.duration) - num(v.duration)) > 0.05) flags.push(`audio ${f2(num(a.duration))} s ≠ video ${f2(num(v.duration))} s`);
const spec = fs.existsSync(stJson) ? JSON.parse(fs.readFileSync(stJson, "utf8")) : null;
const mastered = !spec || !!(spec.voice || spec.master); // no voice and no master: the effects sit at their designed level on purpose
if (loud && mastered && Math.abs(loud.lufs - -14) > 0.5) flags.push(`loudness ${loud.lufs} LUFS (target −14)`);
if (loud && loud.truePeak > -1.0) flags.push(`true peak ${loud.truePeak} dBTP (limit −1.5)`);
if (peaks.some((p) => p >= -0.1)) flags.push("a channel touches 0 dBFS");
if (freezes.length) flags.push(`${freezes.length} frozen stretch(es) ≥ 0.6 s — is that a deliberate hold?`);
if (!a) flags.push("no audio stream");
if (clarity?.median != null && clarity.median < 12) flags.push(`voice clarity median ${clarity.median} dB (target ≥ 12: move effects into the pauses)`);
console.log(`QC  ${file}
  video     ${report.video.codec} · ${report.video.size} · ${v.r_frame_rate} fps · ${report.video.frames} frames · ${f2(report.video.seconds)} s
  audio     ${a ? `${a.codec_name} ${a.sample_rate} Hz × ${a.channels} · ${f2(num(a.duration))} s` : "none"}
  black     ${black.length ? black.map(([s, e]) => `${f2(s)}–${f2(e)}`).join(", ") : "none"}   (expected: none)
  freezes   ${freezes.length ? freezes.map(([s, e]) => `${f2(s)}–${f2(e)}`).join(", ") : "none ≥ 0.6 s"}
  cuts      ${cuts.length ? cuts.map(f2).join(", ") : "none (one shot?)"}
  loudness  ${loud ? `${loud.lufs} LUFS integrated · true peak ${loud.truePeak} dBTP · channel peaks ${peaks.map((p) => p.toFixed(2)).join(" / ")} dBFS` : "—"}
  voice     ${clarity?.median != null ? `clarity median ${clarity.median} dB · 10th pct ${clarity.p10} dB · min ${clarity.min} dB` : "— (no voice)"}
  sheet     ${dense}   ← read it beat by beat
${flags.length ? `\n✗ look at: ${flags.join(" · ")}` : "\n✓ passes. (Measured only — a person still has to listen.)"}`);
process.exit(flags.some((f) => !f.includes("deliberate")) ? 1 : 0);
