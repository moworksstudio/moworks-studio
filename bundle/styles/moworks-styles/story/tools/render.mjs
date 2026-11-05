#!/usr/bin/env node
// render.mjs — export a short, in one command (after the stills have been checked):
//
//   node tools/render.mjs <CompositionId> [--mp4] [--gif] [--preview] [--crf 18] [--gif-width 720] [--gif-fps 20]
//
//   --mp4      H.264 MP4 with the sound (default): music + effects (+ a voice if the short has one), mastered to
//              −14 LUFS integrated with the true peak at −1.5 dBTP or lower
//   --gif      ONLY when the user asks: an optimised GIF, no sound
//   --preview  half size, faster — for a quick look
// Steps: syntax check → export the cues → mix + master (tools/sfx/mix.py) → bundle → render every frame → mux the
// sound → measure the loudness → write a contact sheet. Writes out/<Comp>/ and prints absolute paths.
// Never play the results — look at the contact sheet, and run tools/qc.mjs before handing over.
import { createRequire } from "module";
import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";
import { FFMPEG, ROOT, UV, args, probe, run } from "./lib.mjs";

const o = args(process.argv.slice(2), ["mp4", "gif", "preview"]);
const [id] = o._;
if (!id) {
  console.error("usage: node tools/render.mjs <CompositionId> [--mp4] [--gif] [--preview]");
  process.exit(1);
}
const want = ["mp4", "gif"].filter((k) => o[k]);
if (!want.length) want.push("mp4");
const require = createRequire(path.join(ROOT, "package.json"));
const { bundle } = require("@remotion/bundler");
const { renderMedia, selectComposition } = require("@remotion/renderer");
const ff = FFMPEG();
const dir = path.join(ROOT, "out", id);
fs.mkdirSync(dir, { recursive: true });
const tag = o.preview ? ".preview" : "";
const scale = o.preview ? 0.5 : 1;
const made = [];

console.log("1 check");
run(process.execPath, [path.join(ROOT, "tools/check.mjs")]);

let audio = null;
if (want.includes("mp4")) {
  console.log("\n2 sound (made in code)");
  run(process.execPath, [path.join(ROOT, "tools/sfx/export-cues.mjs"), "src/soundtracks.ts", "out/_sound"]);
  const st = path.join(ROOT, "out/_sound", `${id}.soundtrack.json`);
  if (fs.existsSync(st)) {
    run(UV(), ["run", "-q", "--with", "numpy", "--with", "scipy", "python", path.join(ROOT, "tools/sfx/mix.py"), st, "--out", dir]);
    const spec = JSON.parse(fs.readFileSync(st, "utf8"));
    const mix = path.join(dir, `${id}.mix.wav`);
    const sfx = path.join(dir, `${id}.sfx.wav`);
    audio = fs.existsSync(mix) && (spec.voice || spec.master) ? mix : fs.existsSync(sfx) ? sfx : null;
  } else console.log(`  (no soundtrack exported for ${id} — silent)`);
}

console.log("\n3 render");
const serveUrl = await bundle({ entryPoint: path.join(ROOT, "src/index.ts"), rootDir: ROOT, publicDir: path.join(ROOT, "public") });
process.on("exit", () => {
  try {
    if (serveUrl.includes("remotion-webpack-bundle-")) fs.rmSync(serveUrl, { recursive: true, force: true });
  } catch {}
});
const progress = (label) => {
  let last = -1;
  return ({ progress }) => {
    const p = Math.floor(progress * 4);
    if (p !== last) {
      last = p;
      process.stdout.write(`  ${label} ${p * 25}%`);
    }
  };
};
const composition = await selectComposition({ serveUrl, id });
if (want.includes("mp4")) {
  const picture = path.join(dir, `${id}${tag}.picture.mp4`);
  await renderMedia({ serveUrl, composition, codec: "h264", outputLocation: picture, muted: true, crf: Number(o.crf || (o.preview ? 26 : 18)), scale, imageFormat: "jpeg", jpegQuality: 92, onProgress: progress("mp4") });
  console.log("");
  const mp4 = path.join(dir, `${id}${tag}.mp4`);
  if (audio) run(ff, ["-v", "error", "-y", "-i", picture, "-i", audio, "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-c:a", "aac", "-b:a", "320k", "-shortest", "-movflags", "+faststart", mp4]);
  else fs.copyFileSync(picture, mp4);
  fs.rmSync(picture);
  made.push(mp4);
}
if (want.includes("gif")) {
  // a width whose height comes out whole and even
  let gw = Number(o["gif-width"] || Math.min(720, composition.width));
  while (gw > 64 && ((gw * composition.height) % composition.width !== 0 || ((gw * composition.height) / composition.width) % 2 !== 0 || gw % 2 !== 0)) gw--;
  const gfps = Number(o["gif-fps"] || 20);
  const src = path.join(dir, `${id}${tag}.gif-src.mp4`);
  await renderMedia({ serveUrl, composition, codec: "h264", outputLocation: src, muted: true, crf: 14, scale: gw / composition.width, imageFormat: "jpeg", jpegQuality: 95, onProgress: progress("gif") });
  console.log("");
  const gif = path.join(dir, `${id}${tag}.gif`);
  run(ff, ["-v", "error", "-y", "-i", src, "-vf", `fps=${gfps},split[a][b];[a]palettegen=max_colors=128:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=4:diff_mode=rectangle`, "-loop", "0", gif]);
  fs.rmSync(src);
  made.push(gif);
}

console.log("\n4 verify");
const lines = [];
for (const f of made) {
  const p = probe(f);
  let extra = "";
  if (f.endsWith(".mp4") && p.hasAudio) {
    const e = spawnSync(ff, ["-hide_banner", "-i", f, "-af", "ebur128=peak=true", "-f", "null", "-"], { encoding: "utf8" }).stderr;
    const sum = e.slice(e.lastIndexOf("Summary:"));
    extra = ` · ${sum.split("I:")[1]?.split("LUFS")[0]?.trim()} LUFS, true peak ${sum.split("Peak:")[1]?.split("dBFS")[0]?.trim()} dBTP`;
  }
  lines.push(`  ${path.basename(f).padEnd(30)} ${p.width}×${p.height} · ${p.duration.toFixed(2)} s · ${(fs.statSync(f).size / 1e6).toFixed(1)} MB${extra}`);
}
const sheetSrc = made[0];
let sheet = null;
if (sheetSrc) {
  sheet = path.join(dir, `${id}${tag}-sheet.jpg`);
  run(UV(), ["run", "-q", "--with", "pillow", "python", path.join(ROOT, "tools/sheet.py"), sheetSrc, sheet, "--n", "12", "--cols", "4"]);
}
console.log(`\n✓ ${id}${o.preview ? " (preview)" : ""}\n${lines.join("\n")}`);
for (const f of made) console.log(`  ${f}`);
if (sheet) console.log(`  sheet  ${sheet}   ← look at this; never play the files`);
if (audio) console.log(`  sound  ${audio}`);
console.log("  next: node tools/qc.mjs " + id + "   (loudness is measured — a person still has to listen)");
