#!/usr/bin/env node
// stills.mjs — verification stills (PNG) of a composition, never an MP4. Look at them before showing anything.
//
//   node tools/stills.mjs <CompositionId> <outDir> <frames|seconds|auto|hold ...> [--sheet]
//     123      a frame number          4.5s   a time in seconds (on the edit clock)
//     auto     20 evenly spaced frames hold   one frame 0.4 s before the end (the finished still)
//     --sheet  also writes <outDir>/sheet.jpg (all stills tiled)
// Use a FRESH outDir for every check (old stills mislead). Bundles src/index.ts once, then renders each frame.
import { createRequire } from "module";
import fs from "fs";
import path from "path";
import { FFMPEG, ROOT, run } from "./lib.mjs";

const require = createRequire(path.join(ROOT, "package.json"));
const { bundle } = require("@remotion/bundler");
const { renderStill, selectComposition } = require("@remotion/renderer");

const a = process.argv.slice(2);
const sheet = a.includes("--sheet");
const [id, outDir, ...frameArgs] = a.filter((x) => x !== "--sheet");
if (!id || !outDir || !frameArgs.length) {
  console.error("usage: node tools/stills.mjs <CompositionId> <outDir> <frames|4.5s|auto|hold ...> [--sheet]");
  process.exit(1);
}
fs.mkdirSync(outDir, { recursive: true });
const serveUrl = await bundle({ entryPoint: path.join(ROOT, "src/index.ts"), rootDir: ROOT, publicDir: path.join(ROOT, "public") });
// the bundle is a temp copy of src + public/: delete it when this run ends, however it ends
const dropBundle = () => {
  try {
    if (serveUrl.includes("remotion-webpack-bundle-")) fs.rmSync(serveUrl, { recursive: true, force: true });
  } catch {}
};
process.on("exit", dropBundle);
for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => process.exit(130));
const composition = await selectComposition({ serveUrl, id });
const N = composition.durationInFrames;
const fps = composition.fps;
const frames = [];
for (const f of frameArgs) {
  if (f === "auto") for (let i = 0; i < 20; i++) frames.push(Math.round(((N - 1) * i) / 19));
  else if (f === "hold") frames.push(Math.max(0, N - 1 - Math.round(0.4 * fps)));
  else if (f.endsWith("s")) frames.push(Math.min(N - 1, Math.round(Number(f.slice(0, -1)) * fps)));
  else frames.push(Math.min(N - 1, Number(f)));
}
console.log(`${id}: ${N} frames (${(N / fps).toFixed(2)} s @ ${fps} fps)`);
const files = [];
for (const f of frames) {
  const out = path.join(outDir, `${id}-${String(f).padStart(5, "0")}.png`);
  await renderStill({ serveUrl, composition, frame: f, output: out, imageFormat: "png" });
  files.push(out);
  console.log(`  ${(f / fps).toFixed(2)} s  ${out}`);
}
if (sheet && files.length) {
  const tall = composition.height > composition.width;
  const cols = Math.min(tall ? 6 : 4, files.length);
  const rows = Math.ceil(files.length / cols);
  const list = path.join(outDir, "frames.txt");
  fs.writeFileSync(list, files.map((f) => `file '${path.resolve(f).replace(/'/g, "'\\''")}'`).join("\n"));
  run(FFMPEG(), ["-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", list, "-vf", `scale=${tall ? 320 : 480}:-2,tile=${cols}x${rows}:padding=4`, "-frames:v", "1", path.join(outDir, "sheet.jpg")]);
  fs.rmSync(list);
  console.log(path.join(outDir, "sheet.jpg"));
}
