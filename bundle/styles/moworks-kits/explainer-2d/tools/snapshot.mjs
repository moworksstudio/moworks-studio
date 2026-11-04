#!/usr/bin/env node
// snapshot.mjs: stills of a video at chosen times, plus one labelled contact sheet to read them on. Never an MP4.
//   node tools/snapshot.mjs <dir> --at 0.5,1.6,4.2 [--out snaps/<name>]
//   node tools/snapshot.mjs <dir> --every 1.5      [--out snaps/<name>]
//     --at       exact times in seconds
//     --every N  a still every N seconds from 0.5 s, plus the last frame (the finished still)
//     --out      the folder for the stills (relative to the video folder; default snaps/<date_time>)
// Writes one PNG per time and sheet.jpg (every still tiled, each labelled with its time). Use a fresh folder for
// every round: old stills mislead. Headless Chrome needs the sandbox disabled (or a normal terminal).
import fs from "fs";
import os from "os";
import path from "path";
import { spawnSync } from "child_process";
import { FFMPEG, ROOT, args, fail, filmOf, hf, stamp, videoDirOf } from "./lib.mjs";

const USAGE = "usage: node tools/snapshot.mjs <dir> --at 0.5,1.6,… | --every 1.5 [--out snaps/<name>]";
const o = args(process.argv.slice(2));
const dir = videoDirOf(o._[0], USAGE);
const film = filmOf(dir);
const last = Math.max(0, film.duration - 1 / film.fps); // the final frame
const r3 = (t) => Math.round(t * 1000) / 1000;

let times = [];
if (o.at && o.at !== true) times = String(o.at).split(",").map(Number);
else if (o.every && o.every !== true) {
  const step = Number(o.every);
  if (!(step > 0)) fail(`--every needs a number of seconds. ${USAGE}`);
  for (let t = 0.5; t < last - 0.05; t += step) times.push(r3(t));
  if (!times.length || last - times[times.length - 1] > 0.3) times.push(r3(last));
} else fail(USAGE);
if (times.some((t) => !Number.isFinite(t) || t < 0)) fail(`--at takes seconds, e.g. --at 0.5,1.6,4.2`);
const late = times.filter((t) => t > film.duration);
if (late.length) fail(`${late.join(", ")} s is past the end of the film (${film.duration} s)`);
times = [...new Set(times.map(r3))].sort((a, b) => a - b);

const out = o.out && o.out !== true ? path.resolve(dir, o.out) : path.join(dir, "snaps", stamp());
fs.mkdirSync(out, { recursive: true });
const T0 = Date.now();
console.log(`${film.slug}: ${times.length} still(s) at ${times.join(", ")} s → ${out}`);
hf(dir, ["snapshot", ".", "--at", times.join(","), "--no-end", "--timeout", "240000", "--output", out]);

// the stills HyperFrames wrote: frame-NN-at-<t>s.png
const stills = fs
  .readdirSync(out)
  .map((f) => ({ f, t: Number(f.match(/^frame-\d+-at-([\d.]+)s\.png$/)?.[1]) }))
  .filter((s) => Number.isFinite(s.t))
  .sort((a, b) => a.t - b.t);
if (!stills.length) fail(`HyperFrames wrote no stills into ${out}`);

// the contact sheet: each still scaled down and labelled with its time, then tiled. ffmpeg runs inside a temp folder
// with plain file names, so paths with spaces, quotes or drive letters never reach the filter text.
const ff = FFMPEG();
const tall = film.height > film.width;
const tileW = tall ? 216 : 384;
const cols = Math.min(tall ? 8 : 5, stills.length);
const rows = Math.ceil(stills.length / cols);
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ex-sheet-"));
const font = path.join(ROOT, "node_modules/@fontsource/figtree/files/figtree-latin-700-normal.woff");
const hasFont = fs.existsSync(font);
if (hasFont) fs.copyFileSync(font, path.join(tmp, "label.woff"));
let labelled = hasFont;
stills.forEach((s, i) => {
  fs.copyFileSync(path.join(out, s.f), path.join(tmp, `in-${i}.png`));
  const scale = `scale=${tileW}:-2`;
  const label = `drawtext=fontfile=label.woff:text='${s.t.toFixed(2)} s':x=8:y=8:fontsize=${tall ? 20 : 22}:fontcolor=white:box=1:boxcolor=black@0.6:boxborderw=6`;
  const enc = (vf) => spawnSync(ff, ["-v", "error", "-y", "-i", `in-${i}.png`, "-vf", vf, "-q:v", "2", `tile-${String(i).padStart(4, "0")}.jpg`], { cwd: tmp, encoding: "utf8" });
  let r = labelled ? enc(`${scale},${label}`) : null;
  if (!r || r.status !== 0) {
    labelled = false; // no drawtext in this ffmpeg build: unlabelled tiles, times printed below
    r = enc(scale);
  }
  if (r.status !== 0) fail(`ffmpeg could not scale ${s.f}:\n${r.stderr}`);
});
fs.writeFileSync(path.join(tmp, "tiles.txt"), stills.map((_, i) => `file 'tile-${String(i).padStart(4, "0")}.jpg'`).join("\n") + "\n");
const sheet = path.join(out, "sheet.jpg");
const r = spawnSync(ff, ["-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", "tiles.txt", "-vf", `tile=${cols}x${rows}:padding=4:color=0x111111`, "-frames:v", "1", "-q:v", "2", "sheet.jpg"], { cwd: tmp, encoding: "utf8" });
if (r.status !== 0) fail(`ffmpeg could not tile the sheet:\n${r.stderr}`);
fs.copyFileSync(path.join(tmp, "sheet.jpg"), sheet);
fs.rmSync(tmp, { recursive: true, force: true });

console.log(`\n✓ ${stills.length} still(s) in ${((Date.now() - T0) / 1000).toFixed(1)} s
  stills  ${out}
  sheet   ${sheet}   (${cols}×${rows}${labelled ? ", labelled with times" : `, unlabelled; left to right, top to bottom: ${stills.map((s) => s.t).join(", ")} s`})`);
