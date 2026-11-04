#!/usr/bin/env node
// render.mjs — export a motion graphic, in one command (after the user has seen and approved the stills):
//
//   node tools/render.mjs <CompositionId> [--mp4] [--gif] [--transparent] [--webm] [--preview]
//        [--gif-width 720] [--gif-fps 20] [--sfx-gain 0] [--crf 18]
//
//   --mp4          H.264 MP4 with the sound (the code-made effects, + the voice-over if the graphic has one)
//   --gif          ONLY when the user asks: an optimised GIF (palette per clip, no sound, grain held still), 720 px / 20 fps
//   --sfx-gain     dB added to an effects-only MP4 (no voice): its effects sit at "under a voice" level by default
//   --transparent  ProRes 4444 .mov WITH an alpha channel (no paper, no grain) for Premiere / Resolve / Final Cut,
//                  plus <Comp>.sfx.wav to lay under it
//   --webm         VP9 WebM with alpha (for the web)
//   --preview      half size, faster — for a quick look
//   no flag        the MP4 (kit.config.json defaults.outputs, which is ["mp4"])
// Writes out/<Comp>/ and prints absolute paths. Never play the results — look at the contact sheet.
import { createRequire } from "module";
import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";
import { FFMPEG, ROOT, UV, args, config, probe, run } from "./lib.mjs";

const o = args(process.argv.slice(2), ["mp4", "gif", "transparent", "webm", "preview"]);
const sfxGain = Number(o["sfx-gain"] || 0);
const [id] = o._;
if (!id) {
  console.error("usage: node tools/render.mjs <CompositionId> [--mp4] [--gif] [--transparent] [--webm] [--preview]");
  process.exit(1);
}
let want = ["mp4", "gif", "transparent", "webm"].filter((k) => o[k]);
if (!want.length) want = (config().defaults?.outputs ?? ["mp4"]).filter((k) => k !== "gif");
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

// sound — needed for the MP4 and as a .sfx.wav next to transparent renders
let audio = null;
if (want.includes("mp4") || want.includes("transparent") || want.includes("webm")) {
  console.log("\n2 sound (made in code: public/sfx/kit)");
  run(process.execPath, [path.join(ROOT, "tools/sfx/export-cues.mjs"), "src/soundtracks.ts", "out/_sound"]);
  const st = path.join(ROOT, "out/_sound", `${id}.soundtrack.json`);
  if (fs.existsSync(st)) {
    run(UV(), ["run", "-q", "--with", "numpy", "--with", "scipy", "python", path.join(ROOT, "tools/sfx/mix.py"), st, "--out", dir]);
    const mix = path.join(dir, `${id}.mix.wav`);
    const sfx = path.join(dir, `${id}.sfx.wav`);
    audio = fs.existsSync(mix) && JSON.parse(fs.readFileSync(st, "utf8")).voice ? mix : fs.existsSync(sfx) ? sfx : null;
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
const composition = await selectComposition({ serveUrl, id, inputProps: { transparent: false } });
if (want.includes("mp4")) {
  const picture = path.join(dir, `${id}${tag}.picture.mp4`);
  await renderMedia({ serveUrl, composition, codec: "h264", outputLocation: picture, muted: true, crf: Number(o.crf || (o.preview ? 26 : 18)), scale, imageFormat: "jpeg", jpegQuality: 92, inputProps: { transparent: false }, onProgress: progress("mp4") });
  console.log("");
  const mp4 = path.join(dir, `${id}${tag}.mp4`);
  const voiced = audio && audio.endsWith(".mix.wav");
  const af = !voiced && sfxGain ? ["-af", `volume=${sfxGain}dB,alimiter=limit=0.84:level=false`] : [];
  if (audio) run(ff, ["-v", "error", "-y", "-i", picture, "-i", audio, "-map", "0:v", "-map", "1:a", "-c:v", "copy", ...af, "-c:a", "aac", "-b:a", "320k", "-shortest", "-movflags", "+faststart", mp4]);
  else fs.copyFileSync(picture, mp4);
  fs.rmSync(picture);
  made.push(mp4);
}
if (want.includes("gif")) {
  // its own pass at GIF size with the grain held still (input prop gif) — a moving grain makes GIFs 3× bigger
  // a width whose height comes out whole and even (H.264 needs even sizes), e.g. 1920×1080 → 704×396
  let gw = Number(o["gif-width"] || Math.min(720, composition.width));
  while (gw > 64 && ((gw * composition.height) % composition.width !== 0 || ((gw * composition.height) / composition.width) % 2 !== 0 || gw % 2 !== 0)) gw--;
  const gfps = Number(o["gif-fps"] || 20);
  const gifProps = { transparent: false, gif: true };
  const gifComp = await selectComposition({ serveUrl, id, inputProps: gifProps });
  const src = path.join(dir, `${id}${tag}.gif-src.mp4`);
  await renderMedia({ serveUrl, composition: gifComp, codec: "h264", outputLocation: src, muted: true, crf: 14, scale: gw / composition.width, imageFormat: "jpeg", jpegQuality: 95, inputProps: gifProps, onProgress: progress("gif") });
  console.log("");
  const gif = path.join(dir, `${id}${tag}.gif`);
  run(ff, [
    "-v", "error", "-y", "-i", src,
    "-vf", `fps=${gfps},split[a][b];[a]palettegen=max_colors=128:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=4:diff_mode=rectangle`,
    "-loop", "0", gif,
  ]);
  fs.rmSync(src);
  made.push(gif);
}
const alphaProps = { transparent: true };
const alphaComp = want.includes("transparent") || want.includes("webm") ? await selectComposition({ serveUrl, id, inputProps: alphaProps }) : null;
if (want.includes("transparent")) {
  const mov = path.join(dir, `${id}${tag}.transparent.mov`);
  await renderMedia({ serveUrl, composition: alphaComp, codec: "prores", proResProfile: "4444", imageFormat: "png", pixelFormat: "yuva444p10le", muted: true, scale, outputLocation: mov, inputProps: alphaProps, onProgress: progress("alpha .mov") });
  console.log("");
  made.push(mov);
}
if (want.includes("webm")) {
  const webm = path.join(dir, `${id}${tag}.transparent.webm`);
  await renderMedia({ serveUrl, composition: alphaComp, codec: "vp9", imageFormat: "png", pixelFormat: "yuva420p", muted: true, scale, outputLocation: webm, inputProps: alphaProps, onProgress: progress("alpha .webm") });
  console.log("");
  made.push(webm);
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
  if (f.endsWith(".transparent.mov")) {
    const pix = spawnSync(path.join(path.dirname(ff), process.platform === "win32" ? "ffprobe.exe" : "ffprobe"), ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=pix_fmt", "-of", "csv=p=0", f], { encoding: "utf8" }).stdout.trim();
    extra = ` · ${pix}${pix.includes("a") ? " (alpha ✓)" : " (NO ALPHA ✗)"}`;
  }
  lines.push(`  ${path.basename(f).padEnd(34)} ${p.width}×${p.height} · ${p.duration.toFixed(2)} s · ${(fs.statSync(f).size / 1e6).toFixed(1)} MB${extra}`);
}
const sheetSrc = made.find((f) => f.endsWith(".mp4") || f.endsWith(".gif"));
let sheet = null;
if (sheetSrc) {
  sheet = path.join(dir, `${id}${tag}-sheet.jpg`);
  run(UV(), ["run", "-q", "--with", "pillow", "python", path.join(ROOT, "tools/sheet.py"), sheetSrc, sheet, "--n", "12", "--cols", composition.width > composition.height ? "4" : "6"]);
}
console.log(`\n✓ ${id}${o.preview ? " (preview)" : ""}\n${lines.join("\n")}`);
for (const f of made) console.log(`  ${f}`);
if (sheet) console.log(`  sheet  ${sheet}   ← look at this; never play the files`);
if (audio) console.log(`  sound  ${audio}${audio.endsWith(".mix.wav") ? "" : "   (effects only — level set to sit under a voice; a standalone MP4 can take --sfx-gain 8)"}`);
console.log("  (loudness is measured — a person still has to listen)");
