#!/usr/bin/env node
// qc.mjs: measure the delivered MP4 before it's handed over (never plays anything).
//   node tools/qc.mjs <dir> [--no-transcript]
// Checks renders/<slug>.mp4 against index.html's root (the film's size, length and frame rate):
//   frames      the decoded frame count = duration × fps
//   picture     size, frame rate, H.264 yuv420p
//   audio       present when audio/mix.wav exists, as long as the picture
//   loudness    −14 ± 0.5 LUFS integrated whenever there is sound (sound.mjs masters every mix, voiced or not, to −14)
//   true peak   ≤ −1.0 dBTP whenever there is sound
//   freezes     frozen spans ≥ 0.25 s (freezedetect n=0.0005); listed, not a failure: is each one a deliberate hold?
//   cuts        hard cuts (scdet threshold 12), compared with the cuts story/story.js declares in `const CUT = {…}`
//   transcript  with a voice: HyperFrames transcribes the MP4 and the words must match story/script.txt exactly
// Prints a ✓/⚠/✗ table, writes renders/<slug>.qc.json and exits 1 when anything is ✗.
import fs from "fs";
import os from "os";
import path from "path";
import { spawn } from "child_process";
import { FFMPEG, FFPROBE, HF_JS, args, diffLines, fail, filmOf, videoDirOf, wordDiff } from "./lib.mjs";

const USAGE = "usage: node tools/qc.mjs <dir> [--no-transcript]";
const o = args(process.argv.slice(2), ["no-transcript", "normalize"]); // --normalize: accepted, no longer needed
const dir = videoDirOf(o._[0], USAGE);
const film = filmOf(dir);
const mp4 = path.join(dir, "renders", `${film.slug}.mp4`);
if (!fs.existsSync(mp4)) fail(`no ${mp4}. Render it first: node tools/render.mjs ${o._[0]}`);
const ff = FFMPEG();
const fprobe = FFPROBE();
const T0 = Date.now();

/** run a command, resolve with { status, stdout, stderr } (the measurements run side by side) */
const capture = (cmd, a, opts = {}) =>
  new Promise((resolve) => {
    const p = spawn(cmd, a, { cwd: dir, ...opts });
    let stdout = "", stderr = "";
    p.stdout.on("data", (d) => (stdout += d));
    p.stderr.on("data", (d) => (stderr += d));
    p.on("error", (e) => resolve({ status: -1, stdout, stderr: String(e) }));
    p.on("close", (status) => resolve({ status, stdout, stderr }));
  });

const vo = path.join(dir, "audio/vo.wav");
const scriptFile = path.join(dir, "story/script.txt");
const voiced = fs.existsSync(vo);
const doTranscript = voiced && !o["no-transcript"];
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ex-qc-"));
console.log(`QC  ${mp4}\n  measuring frames, loudness, freezes and cuts${doTranscript ? ", and transcribing the voice" : ""} …`);

const [probeR, videoR, audioR, txR] = await Promise.all([
  capture(fprobe, ["-v", "error", "-count_frames", "-show_entries", "stream=codec_type,codec_name,pix_fmt,width,height,r_frame_rate,nb_read_frames,duration,sample_rate,channels", "-of", "json", mp4]),
  capture(ff, ["-hide_banner", "-nostats", "-i", mp4, "-map", "0:v:0", "-vf", "freezedetect=n=0.0005:d=0.25,scdet=threshold=12", "-f", "null", "-"]),
  capture(ff, ["-hide_banner", "-nostats", "-i", mp4, "-map", "0:a:0?", "-af", "ebur128=peak=true", "-f", "null", "-"]),
  doTranscript ? capture(process.execPath, [HF_JS(), "transcribe", mp4, "-d", tmp, "--json", "-m", "medium.en"]) : null,
]);

const rows = []; // { mark: "✓"|"⚠"|"✗"|"–", name, detail, more?: [lines] }
const add = (mark, name, detail, more) => rows.push({ mark, name, detail, more });
const f2 = (x) => Number(x).toFixed(2);

// ---------- frames, picture, audio ----------
let streams = [];
try {
  streams = JSON.parse(probeR.stdout).streams;
} catch {
  fail(`ffprobe could not read ${mp4}:\n${probeR.stderr}`);
}
const v = streams.find((s) => s.codec_type === "video");
const a = streams.find((s) => s.codec_type === "audio");
const want = Math.round(film.duration * film.fps);
const frames = Number(v?.nb_read_frames);
add(frames === want ? "✓" : "✗", "frames", `${frames} of ${want} (${film.duration} s × ${film.fps} fps)`);
const okPic = v && v.width === film.width && v.height === film.height && v.r_frame_rate === `${film.fps}/1` && v.codec_name === "h264" && v.pix_fmt === "yuv420p";
add(okPic ? "✓" : "✗", "picture", v ? `${v.width}×${v.height} · ${v.r_frame_rate} fps · ${v.codec_name} ${v.pix_fmt}${okPic ? "" : `   (want ${film.width}×${film.height} · ${film.fps}/1 · h264 yuv420p)`}` : "no video stream");
const mixWav = fs.existsSync(path.join(dir, "audio/mix.wav"));
const vDur = Number(v?.duration) || film.duration;
if (a) {
  const aDur = Number(a.duration);
  const off = Math.abs(aDur - vDur);
  add(off <= 0.1 ? "✓" : "✗", "audio", `${a.codec_name} ${a.sample_rate} Hz × ${a.channels} · ${f2(aDur)} s${off > 0.1 ? `   (the picture is ${f2(vDur)} s)` : ""}`);
} else add(mixWav ? "✗" : "–", "audio", mixWav ? "none, but audio/mix.wav exists: render again" : "none (picture only: no audio/mix.wav)");

// ---------- loudness ----------
let loud = null;
if (a) {
  const sum = audioR.stderr.slice(audioR.stderr.lastIndexOf("Summary:"));
  const num = (re) => {
    const m = sum.match(re);
    return m ? (m[1] === "-inf" ? -Infinity : Number(m[1])) : NaN;
  };
  loud = { lufs: num(/I:\s+(-inf|-?[\d.]+)\s+LUFS/), truePeak: num(/Peak:\s+(-inf|-?[\d.]+)\s+dBFS/) };
  const silent = !(loud.lufs > -70); // a silent track (-inf) has no loudness to master
  const lufsOk = Math.abs(loud.lufs + 14) <= 0.5;
  add(silent ? "–" : lufsOk ? "✓" : "✗", "loudness", silent ? "silent track" : `${loud.lufs.toFixed(1)} LUFS integrated (target −14 ± 0.5)`);
  add(loud.truePeak <= -1.0 ? "✓" : "✗", "true peak", `${loud.truePeak.toFixed(1)} dBTP (limit −1.0)`);
}

// ---------- freezes ----------
const vlog = videoR.stderr;
const starts = [...vlog.matchAll(/freeze_start:\s*([\d.]+)/g)].map((m) => Number(m[1]));
const ends = [...vlog.matchAll(/freeze_end:\s*([\d.]+)/g)].map((m) => Number(m[1]));
const freezes = starts.map((s, i) => [s, ends[i] ?? vDur]);
add(freezes.length ? "⚠" : "✓", "freezes", freezes.length ? `${freezes.length} span(s) ≥ 0.25 s: ${freezes.map(([s, e]) => `${f2(s)}–${f2(e)}`).join(", ")}   (a deliberate hold? the last ~0.5 s may be one)` : "none ≥ 0.25 s");

// ---------- cuts ----------
const cuts = [...vlog.matchAll(/lavfi\.scd\.time:\s*([\d.]+)/g)].map((m) => Number(m[1]));
/** the entries of `const CUT = {…}` (or `CUTS = […]`) in story.js; null when it declares none */
const declaredCuts = (src) => {
  const m = /\bCUTS?\s*=\s*([{[])/.exec(src);
  if (!m) return null;
  let depth = 1, entries = 0, token = false, str = null;
  for (let i = m.index + m[0].length; i < src.length && depth > 0; i++) {
    const c = src[i];
    if (str) {
      if (c === "\\") i++;
      else if (c === str) str = null;
      continue;
    }
    if (c === "/" && src[i + 1] === "/") {
      i = src.indexOf("\n", i);
      if (i < 0) break;
      continue;
    }
    if (c === "/" && src[i + 1] === "*") {
      i = src.indexOf("*/", i) + 1;
      continue;
    }
    if (`"'\``.includes(c)) (str = c), (token = true);
    else if ("{[(".includes(c)) depth++, (token = true);
    else if ("}])".includes(c)) depth--;
    else if (depth === 1 && c === ",") token && entries++, (token = false);
    else if (!/\s/.test(c)) token = true;
  }
  return entries + (token ? 1 : 0);
};
let declared = null;
try {
  declared = declaredCuts(fs.readFileSync(path.join(dir, "story/story.js"), "utf8"));
} catch {}
const cutTimes = cuts.length ? `at ${cuts.map(f2).join(", ")} s` : "";
if (declared === null) add("–", "cuts", `${cuts.length} detected ${cutTimes}   (story.js declares no CUT list to compare)`);
else add(cuts.length === declared ? "✓" : "⚠", "cuts", `${cuts.length} detected, ${declared} declared in story.js ${cutTimes}${cuts.length === declared ? "" : "   (a soft transition may not register; a jump that isn't a cut is a bug: look at those times)"}`);

// ---------- transcript ----------
let diffs = null;
if (doTranscript) {
  let tx = null;
  try {
    const res = JSON.parse(txR.stdout.trim().split("\n").filter((l) => l.startsWith("{")).pop());
    if (res.ok) tx = JSON.parse(fs.readFileSync(res.transcriptPath, "utf8"));
  } catch {}
  if (!fs.existsSync(scriptFile)) add("✗", "transcript", "story/script.txt is missing: nothing to compare with");
  else if (!Array.isArray(tx)) add("✗", "transcript", `transcription failed: ${(txR.stdout + txR.stderr).trim().split("\n").slice(-3).join(" ")}`);
  else {
    const script = fs.readFileSync(scriptFile, "utf8");
    diffs = wordDiff(script, tx.map((w) => w.text).join(" "));
    add(diffs.length ? "✗" : "✓", "transcript", `${diffs.length} difference(s) against story/script.txt (${tx.length} words heard)`, diffLines(diffs));
  }
} else add("–", "transcript", voiced ? "skipped (--no-transcript)" : "no voice (audio/vo.wav): nothing to compare");
fs.rmSync(tmp, { recursive: true, force: true });

// ---------- report ----------
const report = { file: mp4, film, frames: { got: frames, want }, video: v, audio: a ?? null, loudness: loud, freezes, cuts, declaredCuts: declared, transcriptDiffs: diffs, rows };
const qcJson = path.join(dir, "renders", `${film.slug}.qc.json`);
fs.writeFileSync(qcJson, JSON.stringify(report, null, 2) + "\n");
for (const r of rows) {
  console.log(`${r.mark} ${r.name.padEnd(11)} ${r.detail}`);
  for (const l of r.more ?? []) console.log(`    ${l}`);
}
const bad = rows.filter((r) => r.mark === "✗");
console.log(`\n${bad.length ? `✗ fails: ${bad.map((r) => r.name).join(", ")}` : "✓ passes"}   (${((Date.now() - T0) / 1000).toFixed(1)} s; measured only, nobody listened)\n  report ${qcJson}`);
process.exit(bad.length ? 1 : 0);
