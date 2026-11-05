#!/usr/bin/env node
// render.mjs — export a video, in one command (after the stills and the collision check have passed):
//
//   node tools/render.mjs <CompositionId> [--preview] [--crf 16]
//
//   (default)  H.264 MP4 with the sound: the voice-over + the effect cues (+ music, if the user asked for it),
//              mastered to −14 LUFS integrated with the true peak at −1.5 dBTP or lower
//   --preview  half size, faster: a quick moving look before the final
// Steps: syntax check → export the cues → mix + master (tools/sfx/mix.py) → bundle → render every frame with WebGL
// (kit.config.json → render.gl / render.concurrency) → mux the sound → measure the loudness → contact sheet.
// Writes out/<Comp>/ and prints absolute paths. Never play the results: look at the sheet, then run tools/qc.mjs.
import { createRequire } from "module";
import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";
import { CONCURRENCY, FFMPEG, GL, ROOT, UV, args, probe, run } from "./lib.mjs";

const o = args(process.argv.slice(2), ["preview"]);
const [id] = o._;
if (!id) {
  console.error("usage: node tools/render.mjs <CompositionId> [--preview] [--crf 16]");
  process.exit(1);
}
const require = createRequire(path.join(ROOT, "package.json"));
const { bundle } = require("@remotion/bundler");
const { renderMedia, selectComposition } = require("@remotion/renderer");
const ff = FFMPEG();
const dir = path.join(ROOT, "out", id);
fs.mkdirSync(dir, { recursive: true });
const tag = o.preview ? ".preview" : "";
const T0 = Date.now();

console.log("1 check");
run(process.execPath, [path.join(ROOT, "tools/check.mjs")]);

console.log("\n2 sound (made in code)");
let audio = null;
run(process.execPath, [path.join(ROOT, "tools/sfx/export-cues.mjs"), "src/soundtracks.ts", "out/_sound"]);
const st = path.join(ROOT, "out/_sound", `${id}.soundtrack.json`);
if (fs.existsSync(st)) {
  run(UV(), ["run", "-q", "--with", "numpy", "--with", "scipy", "python", path.join(ROOT, "tools/sfx/mix.py"), st, "--out", dir]);
  const spec = JSON.parse(fs.readFileSync(st, "utf8"));
  const mix = path.join(dir, `${id}.mix.wav`);
  const sfx = path.join(dir, `${id}.sfx.wav`);
  audio = fs.existsSync(mix) && (spec.voice || spec.master) ? mix : fs.existsSync(sfx) ? sfx : null;
} else console.log(`  (no soundtrack registered for ${id} in src/soundtracks.ts: the MP4 will be silent)`);

console.log(`\n3 render (gl ${GL()}, ${CONCURRENCY()} tabs)`);
const serveUrl = await bundle({ entryPoint: path.join(ROOT, "src/index.ts"), rootDir: ROOT, publicDir: path.join(ROOT, "public") });
process.on("exit", () => {
  try {
    if (serveUrl.includes("remotion-webpack-bundle-")) fs.rmSync(serveUrl, { recursive: true, force: true });
  } catch {}
});
const chromiumOptions = { gl: GL() };
const composition = await selectComposition({ serveUrl, id, chromiumOptions });
let last = -1;
const picture = path.join(dir, `${id}${tag}.picture.mp4`);
await renderMedia({
  serveUrl,
  composition,
  codec: "h264",
  outputLocation: picture,
  muted: true,
  crf: Number(o.crf || (o.preview ? 24 : 16)),
  scale: o.preview ? 0.5 : 1,
  imageFormat: "jpeg",
  jpegQuality: 95,
  concurrency: CONCURRENCY(),
  chromiumOptions,
  onProgress: ({ progress }) => {
    const p = Math.floor(progress * 10);
    if (p !== last) {
      last = p;
      process.stdout.write(`  ${p * 10}%`);
    }
  },
});
console.log("");
const mp4 = path.join(dir, `${id}${tag}.mp4`);
if (audio) run(ff, ["-v", "error", "-y", "-i", picture, "-i", audio, "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-c:a", "aac", "-b:a", "320k", "-shortest", "-movflags", "+faststart", mp4]);
else fs.copyFileSync(picture, mp4);
fs.rmSync(picture);

console.log("\n4 verify");
const p = probe(mp4);
let extra = "";
if (p.hasAudio) {
  const e = spawnSync(ff, ["-hide_banner", "-i", mp4, "-af", "ebur128=peak=true", "-f", "null", "-"], { encoding: "utf8" }).stderr;
  const sum = e.slice(e.lastIndexOf("Summary:"));
  extra = ` · ${sum.split("I:")[1]?.split("LUFS")[0]?.trim()} LUFS, true peak ${sum.split("Peak:")[1]?.split("dBFS")[0]?.trim()} dBTP`;
}
const sheet = path.join(dir, `${id}${tag}-sheet.jpg`);
run(UV(), ["run", "-q", "--with", "pillow", "python", path.join(ROOT, "tools/sheet.py"), mp4, sheet, "--n", "12", "--cols", composition.height > composition.width ? "6" : "4"]);
console.log(`\n✓ ${id}${o.preview ? " (preview)" : ""} in ${((Date.now() - T0) / 1000).toFixed(0)} s
  ${p.width}×${p.height} · ${p.duration.toFixed(2)} s · ${(fs.statSync(mp4).size / 1e6).toFixed(1)} MB${extra}
  ${mp4}
  sheet  ${sheet}   ← look at this; never play the files
  next: node tools/qc.mjs ${id}   (loudness is measured; a person still has to listen)`);
