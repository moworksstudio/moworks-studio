#!/usr/bin/env node
// place-voice.mjs — lay voice-over takes on the timeline (Stickman Explainer: narration acts, side characters, a
// silent gap for the title card) and write one 48 kHz mono WAV for the composition:
//   node tools/place-voice.mjs public/videos/<slug>/voice.wav <take>@<seconds> [<take>@<seconds> …]
//   e.g. … projects/fly/audio/act1.mp3@0.2 projects/fly/audio/coworker.mp3@13.2 projects/fly/audio/act2.mp3@18.7
// Takes are placed as they are: never sped up, trimmed or re-voiced. Overlaps are summed (avoid them). Then run
// tools/transcribe.mjs on the result for the word times.
import fs from "fs";
import path from "path";
import { FFMPEG, probe, run } from "./lib.mjs";

const [out, ...takes] = process.argv.slice(2);
if (!out || !takes.length || takes.some((t) => !/@[\d.]+$/.test(t))) {
  console.error("usage: node tools/place-voice.mjs <out.wav> <take>@<seconds> [<take>@<seconds> …]");
  process.exit(1);
}
const items = takes.map((s) => {
  const i = s.lastIndexOf("@");
  const file = s.slice(0, i);
  if (!fs.existsSync(file)) {
    console.error(`✗ no such take: ${file}`);
    process.exit(1);
  }
  return { file, at: Number(s.slice(i + 1)), dur: probe(file).duration };
});
const inputs = items.flatMap((it) => ["-i", it.file]);
const chains = items.map((it, i) => `[${i}:a]aresample=48000,aformat=channel_layouts=mono,adelay=${Math.round(it.at * 1000)}:all=1[a${i}]`);
const mix = `${items.map((_, i) => `[a${i}]`).join("")}amix=inputs=${items.length}:normalize=0:dropout_transition=0[out]`;
fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
run(FFMPEG(), ["-v", "error", "-y", ...inputs, "-filter_complex", [...chains, mix].join(";"), "-map", "[out]", "-ar", "48000", "-ac", "1", "-c:a", "pcm_s16le", out]);
const end = Math.max(...items.map((it) => it.at + it.dur));
for (const it of items) console.log(`  ${it.at.toFixed(2).padStart(6)} s → ${(it.at + it.dur).toFixed(2).padStart(6)} s  ${it.file}`);
console.log(`✓ ${path.resolve(out)}  (${probe(out).duration.toFixed(2)} s; last word ends ≈ ${end.toFixed(2)} s)\n  next: node tools/transcribe.mjs ${out} <slug>`);
