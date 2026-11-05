#!/usr/bin/env node
// review-frames.mjs — turn a finished MP4 into review material for a fresh-eyes reviewer agent (render-review skill).
//   node tools/review-frames.mjs <video.mp4> <outDir> [--every 0.5] [--ranges 730-851,1021-1165]
// --every   seconds between frames (0.5 = the fast review, 0.25 = the full one)
// --ranges  frame ranges (inclusive): a follow-up review of a fix round looks at the changed shots only
// Writes <outDir>/frames/f_<frame>.png (full resolution), <outDir>/sheets/sheet_<nn>.jpg (6 consecutive frames each,
// labelled with time + frame) and <outDir>/INDEX.md. Never plays audio.
import fs from "fs";
import path from "path";
import { FFMPEG, FFPROBE, ROOT, UV, args, out, run } from "./lib.mjs";

const o = args(process.argv.slice(2));
const [video, outDir] = o._;
if (!video || !outDir || !fs.existsSync(video)) {
  console.error("usage: node tools/review-frames.mjs <video.mp4> <outDir> [--every 0.5] [--ranges a-b,c-d]");
  process.exit(1);
}
const every = Number(o.every || 0.5);
const ranges = o.ranges ? o.ranges.split(",").map((r) => r.split("-").map(Number)) : null;
const st = JSON.parse(out(FFPROBE(), ["-v", "error", "-select_streams", "v:0", "-count_packets", "-show_entries", "stream=width,height,r_frame_rate,nb_read_packets", "-of", "json", video])).streams[0];
const [num, den] = st.r_frame_rate.split("/").map(Number);
const fps = num / den;
const total = Number(st.nb_read_packets);
fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(path.join(outDir, "frames"), { recursive: true });

// 1) full-resolution frames every `every` seconds (always including the last frame)
const step = Math.max(1, Math.round(every * fps));
let picks = [];
for (let f = 0; f < total; f += step) picks.push(f);
if (picks[picks.length - 1] !== total - 1) picks.push(total - 1);
if (ranges) picks = [...new Set(ranges.flatMap(([a, b]) => [a, ...picks.filter((f) => f > a && f < b), b]))].sort((x, y) => x - y);
const sel = picks.map((f) => `eq(n\\,${f})`).join("+");
run(FFMPEG(), ["-v", "error", "-an", "-i", video, "-vf", `select='${sel}'`, "-fps_mode", "vfr", "-start_number", "0", path.join(outDir, "frames", "tmp_%05d.png")]);
const tmp = fs.readdirSync(path.join(outDir, "frames")).filter((f) => f.startsWith("tmp_")).sort();
tmp.forEach((f, i) => fs.renameSync(path.join(outDir, "frames", f), path.join(outDir, "frames", `f_${String(picks[i]).padStart(5, "0")}.png`)));

// 2) labelled sheets + INDEX.md (Pillow; no font files needed)
run(UV(), ["run", "-q", "--with", "pillow", "python", path.join(ROOT, "tools/review_sheets.py"), outDir, String(fps), String(every), path.resolve(video), `${st.width}x${st.height}`]);
console.log(`${picks.length} frames, ${Math.ceil(picks.length / 6)} sheets → ${outDir}`);
