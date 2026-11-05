#!/usr/bin/env node
// patch-render.mjs — the fast fix loop: re-render ONLY the changed frame ranges of a video and splice them into its
// finished MP4 (out/<Comp>/<Comp>.mp4). The audio track is copied untouched (it is already mixed and mastered). The
// runtime is deterministic per frame, so the patched video matches a full re-render (the untouched frames are
// re-encoded once, ≈ 41 dB PSNR: invisible, but after 1–2 patches do a full render instead of patching again).
//   node tools/patch-render.mjs <CompId> <from-to> [<from-to> ...]      (frames, inclusive)
//   e.g. node tools/patch-render.mjs WhatIfNoPain 730-851 1021-1165
// Only for picture fixes. If the voice, the cues or the length changed, run tools/render.mjs instead.
import { createRequire } from "module";
import fs from "fs";
import os from "os";
import path from "path";
import { CONCURRENCY, FFMPEG, FFPROBE, GL, ROOT, out, run } from "./lib.mjs";

const require = createRequire(path.join(ROOT, "package.json"));
const { bundle } = require("@remotion/bundler");
const { renderMedia, selectComposition } = require("@remotion/renderer");
const [id, ...rangeArgs] = process.argv.slice(2);
const video = path.join(ROOT, "out", id ?? "", `${id}.mp4`);
if (!id || !rangeArgs.length || !fs.existsSync(video)) {
  console.error("usage: node tools/patch-render.mjs <CompId> <from-to> [<from-to> ...]   (needs out/<CompId>/<CompId>.mp4)");
  process.exit(1);
}
const count = (f) => Number(JSON.parse(out(FFPROBE(), ["-v", "error", "-select_streams", "v:0", "-count_packets", "-show_entries", "stream=nb_read_packets,r_frame_rate", "-of", "json", f])).streams[0].nb_read_packets);
const rate = JSON.parse(out(FFPROBE(), ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=r_frame_rate", "-of", "json", video])).streams[0].r_frame_rate;
const total = count(video);
// sorted, merged, clamped ranges
const ranges = rangeArgs
  .map((r) => r.split("-").map(Number))
  .map(([a, b]) => [Math.max(0, a), Math.min(total - 1, b)])
  .sort((x, y) => x[0] - y[0])
  .reduce((acc, r) => {
    const last = acc[acc.length - 1];
    if (last && r[0] <= last[1] + 1) last[1] = Math.max(last[1], r[1]);
    else acc.push([...r]);
    return acc;
  }, []);

const T0 = Date.now();
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "cartoon-patch-"));
const serveUrl = await bundle({ entryPoint: path.join(ROOT, "src/index.ts"), rootDir: ROOT, publicDir: path.join(ROOT, "public") });
process.on("exit", () => {
  try {
    if (serveUrl.includes("remotion-webpack-bundle-")) fs.rmSync(serveUrl, { recursive: true, force: true });
    fs.rmSync(tmp, { recursive: true, force: true });
  } catch {}
});
const chromiumOptions = { gl: GL() };
const composition = await selectComposition({ serveUrl, id, chromiumOptions });
if (composition.durationInFrames !== total) {
  console.error(`✗ ${id} now has ${composition.durationInFrames} frames, the MP4 has ${total}: the length changed, so run tools/render.mjs ${id}`);
  process.exit(1);
}
const segs = [];
for (const [i, [a, b]] of ranges.entries()) {
  const seg = path.join(tmp, `seg_${i}.mp4`);
  await renderMedia({ serveUrl, composition, codec: "h264", outputLocation: seg, frameRange: [a, b], muted: true, crf: 16, imageFormat: "jpeg", jpegQuality: 95, concurrency: CONCURRENCY(), chromiumOptions });
  segs.push(seg);
  console.log(`rendered ${a}-${b} (${b - a + 1} frames)`);
}

// splice: original pieces between the ranges + the new segments, in order; audio copied
const pieces = [];
let cursor = 0;
ranges.forEach(([a, b], i) => {
  if (a > cursor) pieces.push({ orig: [cursor, a] });
  pieces.push({ seg: i });
  cursor = b + 1;
});
if (cursor < total) pieces.push({ orig: [cursor, total] });
const origCount = pieces.filter((p) => p.orig).length;
const chains = [];
const split = origCount > 1 ? `[0:v]split=${origCount}${pieces.filter((p) => p.orig).map((_, k) => `[o${k}]`).join("")};` : "";
let k = 0;
const labels = pieces.map((p, n) => {
  if (p.orig) {
    const src = origCount > 1 ? `[o${k++}]` : "[0:v]";
    chains.push(`${src}trim=start_frame=${p.orig[0]}:end_frame=${p.orig[1]},setpts=PTS-STARTPTS[p${n}]`);
  } else chains.push(`[${p.seg + 1}:v]setpts=PTS-STARTPTS[p${n}]`);
  return `[p${n}]`;
});
const filter = `${split}${chains.join(";")};${labels.join("")}concat=n=${labels.length}:v=1:a=0[v]`;
const patched = path.join(tmp, "patched.mp4");
run(FFMPEG(), ["-v", "error", "-i", video, ...segs.flatMap((s) => ["-i", s]), "-filter_complex", filter, "-map", "[v]", "-map", "0:a?", "-c:a", "copy", "-c:v", "libx264", "-crf", "16", "-preset", "medium", "-pix_fmt", "yuv420p", "-r", rate, "-movflags", "+faststart", "-y", patched]);
if (count(patched) !== total) {
  console.error(`✗ frame count mismatch after splicing; ${video} left untouched`);
  process.exit(1);
}
fs.copyFileSync(patched, video); // same path, so an editor timeline that links to it stays valid
console.log(`✓ patched ${ranges.map((r) => r.join("-")).join(", ")} into ${video} (${total} frames) in ${((Date.now() - T0) / 1000).toFixed(0)} s`);
