#!/usr/bin/env node
// vo-words.mjs — a voice-over → caption word timings, with two checks that catch real problems:
//  · the recogniser starts phrases early → a word that starts inside a measured silence moves to that silence's end
//  · generated takes can end with a STRAY extra word after the script → the tail is transcribed on its own and
//    compared with the script, and a trim point inside the silence before the stray word is suggested
//
//   node tools/vo-words.mjs <audio.wav|mp3> [--script projects/<slug>/script.txt] [--engine auto|mlx|faster] [--language en]
//
// Engines (both run through uv, no Python setup): "mlx" = mlx-whisper (Apple-silicon Macs, fastest) · "faster" =
// faster-whisper (Windows, Linux, Intel Macs; NVIDIA GPU if present, else CPU). "auto" picks mlx on Apple silicon.
// The first run downloads the model (≈ 1.6 GB); later runs are offline.
// Prints `ISSUES none` (or each issue), a ready `WORDS` block for vo.ts, and writes <audio>.words.json. Never plays audio.
import fs from "fs";
import os from "os";
import path from "path";
import { FFMPEG, FFPROBE, ROOT, UV, args, out, run } from "./lib.mjs";

const o = args(process.argv.slice(2));
const [audio] = o._;
if (!audio || !fs.existsSync(audio)) {
  console.error("usage: node tools/vo-words.mjs <audio> [--script script.txt] [--engine auto|mlx|faster] [--language en]");
  process.exit(1);
}
const engine = !o.engine || o.engine === "auto" ? (process.platform === "darwin" && process.arch === "arm64" ? "mlx" : "faster") : o.engine;
const ff = FFMPEG();
const uv = UV();
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "vo-words-"));
const norm = (w) => w.toLowerCase().replace(/[^a-z0-9']/g, "");

let n = 0;
const whisper = (file) => {
  const wav = path.join(tmp, `in${n++}.wav`);
  run(ff, ["-v", "error", "-y", "-i", file, "-vn", "-ac", "1", "-ar", "16000", wav]);
  let json;
  if (engine === "mlx") {
    const a = ["--from", "mlx-whisper", "mlx_whisper", wav, "--model", o.model || "mlx-community/whisper-large-v3-turbo", "--word-timestamps", "True", "--output-format", "json", "--output-dir", tmp];
    if (o.language) a.push("--language", o.language);
    run(path.join(path.dirname(uv), process.platform === "win32" ? "uvx.exe" : "uvx"), a, { stdio: ["ignore", "ignore", "inherit"] });
    json = path.join(tmp, path.basename(wav, ".wav") + ".json");
  } else {
    json = path.join(tmp, path.basename(wav, ".wav") + ".asr.json");
    const a = ["run", "-q", "--with", "faster-whisper", "--with", "numpy", "python", path.join(ROOT, "tools/fw_transcribe.py"), wav, json, "--model", o.model || "large-v3-turbo"];
    if (o.language) a.push("--language", o.language);
    run(uv, a, { stdio: ["ignore", "ignore", "inherit"] });
  }
  // whisper can emit bare NaN (avg_logprob) — not valid JSON
  const asr = JSON.parse(fs.readFileSync(json, "utf8").replace(/\bNaN\b/g, "null"));
  return asr.segments.flatMap((s) => (s.words ?? []).map((w) => ({ word: w.word.trim(), start: w.start, end: w.end })));
};
const duration = Number(out(FFPROBE(), ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", audio]).trim());

// 1) silences (ffmpeg prints them on stderr)
const silences = [];
{
  const { spawnSync } = await import("child_process");
  const text = spawnSync(ff, ["-nostats", "-i", audio, "-af", "silencedetect=noise=-40dB:d=0.12", "-f", "null", "-"], { encoding: "utf8" }).stderr;
  let s0 = null;
  for (const line of text.split("\n")) {
    const a = line.match(/silence_start: ([\d.]+)/);
    const b = line.match(/silence_end: ([\d.]+)/);
    if (a) s0 = Number(a[1]);
    if (b && s0 !== null) {
      silences.push([s0, Number(b[1])]);
      s0 = null;
    }
  }
  if (s0 !== null) silences.push([s0, duration]);
}

// 2) full transcript, phrase starts corrected
console.log(`transcribing with ${engine === "mlx" ? "mlx-whisper" : "faster-whisper"} …`);
const words = whisper(audio).map((w) => {
  const sil = silences.find(([a, b]) => w.start >= a - 0.02 && w.start < b);
  return sil ? { ...w, start: Math.min(sil[1], w.end - 0.05) } : w;
});

// 3) script comparison + tail check
const script = o.script ? fs.readFileSync(o.script, "utf8").split(/\s+/).filter(Boolean) : null;
const issues = [];
if (script) {
  const a = script.map(norm),
    b = words.map((w) => norm(w.word));
  const k = Math.min(a.length, b.length);
  for (let i = 0; i < k; i++)
    if (a[i] !== b[i]) {
      issues.push(`word ${i + 1}: script "${script[i]}" vs heard "${words[i].word}" @${words[i].start.toFixed(2)}s`);
      break;
    }
  if (b.length !== a.length) issues.push(`word count: script ${a.length}, heard ${b.length}`);
}
const tailStart = Math.max(0, duration - 1.6);
const tailFile = path.join(tmp, "tail.wav");
run(ff, ["-v", "error", "-ss", String(tailStart), "-i", audio, "-y", tailFile]);
const tail = whisper(tailFile).map((w) => ({ ...w, start: w.start + tailStart, end: w.end + tailStart }));
const lastScript = script ? norm(script[script.length - 1]) : norm(words[words.length - 1]?.word ?? "");
const lastIdx = tail.map((w) => norm(w.word)).lastIndexOf(lastScript);
const stray = lastIdx >= 0 ? tail.slice(lastIdx + 1) : [];
let trim = null;
if (stray.length) {
  const lastEnd = tail[lastIdx].end;
  const gap = silences.find(([a, b]) => b > lastEnd - 0.05 && a < stray[0].start);
  trim = gap ? Math.round((gap[0] + 0.04) * 100) / 100 : Math.round((lastEnd + 0.06) * 100) / 100;
  issues.push(`STRAY after "${tail[lastIdx].word}": ${stray.map((w) => `"${w.word}"@${w.start.toFixed(2)}s`).join(" ")} → trim at ${trim}s`);
}

fs.writeFileSync(audio.replace(/\.[^.]+$/, "") + ".words.json", JSON.stringify({ audio, duration, silences, words, tail, issues, trim }, null, 2));
fs.rmSync(tmp, { recursive: true, force: true });
console.log(`duration ${duration.toFixed(2)} s · ${words.length} words · last word "${words[words.length - 1]?.word}" ends ${words[words.length - 1]?.end.toFixed(2)} s`);
console.log(issues.length ? issues.map((i) => "ISSUE " + i).join("\n") : "ISSUES none");
if (trim !== null) {
  const base = audio.replace(/\.[^.]+$/, "");
  console.log(`trim: ffmpeg -i "${audio}" -af "atrim=0:${trim},afade=t=out:st=${(trim - 0.04).toFixed(2)}:d=0.04" "${base}_trim.wav"`);
}
console.log("\nexport const WORDS: [number, string][] = [");
for (const w of words) console.log(`  [${w.start.toFixed(2)}, ${JSON.stringify(w.word)}],`);
console.log("];");
