#!/usr/bin/env node
// compare.mjs — a side-by-side test video: the reference on the left, our render on the right, frame-locked, with
// labels and a running timecode. This is how a style test against a reference is checked, and handed over.
// Labels are drawn by ffmpeg drawtext: keep them free of commas, colons and apostrophes.
//
//   node tools/compare.mjs <reference video> <our mp4> <out.mp4> [--start 0] [--seconds N] [--audio ours|ref]
//        [--left REFERENCE] [--right OURS] [--fps 30]
//
//   --start    where the reference clip begins (s); ours always starts at 0
//   --seconds  length (default: our render's length)
//   --audio    whose sound plays: ours (default) or ref
// Never play the result — look at its contact sheet (tools/sheet.py) or stills.
import fs from "fs";
import path from "path";
import { FFMPEG, ROOT, UV, args, probe, run } from "./lib.mjs";

const o = args(process.argv.slice(2));
const [ref, ours, out] = o._;
if (!ref || !ours || !out) {
  console.error("usage: node tools/compare.mjs <reference video> <our mp4> <out.mp4> [--start 0] [--seconds N] [--audio ours|ref]");
  process.exit(1);
}
const start = Number(o.start || 0);
const secs = Number(o.seconds || probe(ours).duration);
const fps = Number(o.fps || 30);
const audio = o.audio === "ref" ? "ref" : "ours";
const left = o.left || "REFERENCE";
const right = o.right || "OURS";
const font = ["/System/Library/Fonts/Supplemental/Arial Bold.ttf", "/System/Library/Fonts/Supplemental/Arial.ttf", "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", "C:/Windows/Fonts/arialbd.ttf"].find((f) => fs.existsSync(f));
const ff = (f) => `fontfile='${f}'`;
const txt = (text, x, y, size, color) => (font ? `drawtext=${ff(font)}:text='${text}':x=${x}:y=${y}:fontsize=${size}:fontcolor=${color}` : "null");

const PW = 944;
const PH = 531;
const Y = Math.round((1080 - PH) / 2);
const graph = [
  `[0:v]trim=start=${start}:duration=${secs},setpts=PTS-STARTPTS,fps=${fps},scale=${PW}:${PH}[a]`,
  `[1:v]trim=start=0:duration=${secs},setpts=PTS-STARTPTS,fps=${fps},scale=${PW}:${PH}[b]`,
  `color=c=0x0b0d12:s=1920x1080:r=${fps}:d=${secs}[bg]`,
  `[bg][a]overlay=16:${Y}[x]`,
  `[x][b]overlay=${16 + PW + 16}:${Y}[y]`,
  `[y]${txt(left, 16, Y - 58, 36, "white")},${txt(right, 16 + PW + 16, Y - 58, 36, "0xffd27a")},` +
    `${txt("%{pts\\:hms}", "(w-tw)/2", Y + PH + 30, 30, "0xa8b0c0")},${txt("frame %{n}", "(w-tw)/2", Y + PH + 72, 22, "0x6c7488")}[v]`,
].join(";");
const a = audio === "ref" ? ["-map", "0:a?"] : ["-map", "1:a?"];
const aTrim = audio === "ref" ? ["-af", `atrim=start=${start}:duration=${secs},asetpts=PTS-STARTPTS`] : ["-t", String(secs)];
fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
run(FFMPEG(), ["-v", "error", "-y", "-i", ref, "-i", ours, "-filter_complex", graph, "-map", "[v]", ...a, ...aTrim, "-c:v", "libx264", "-crf", "18", "-preset", "medium", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "256k", "-movflags", "+faststart", out]);
const p = probe(out);
const sheet = out.replace(/\.mp4$/, "-sheet.jpg");
run(UV(), ["run", "-q", "--with", "pillow", "python", path.join(ROOT, "tools/sheet.py"), out, sheet, "--n", "12", "--cols", "3"]);
console.log(`✓ ${path.resolve(out)}  ${p.width}×${p.height} · ${p.duration.toFixed(2)} s · ${(fs.statSync(out).size / 1e6).toFixed(1)} MB · sound: ${audio}`);
console.log(`  sheet ${sheet}   ← look at this; never play the file`);
