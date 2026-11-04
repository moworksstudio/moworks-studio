#!/usr/bin/env node
// doctor.mjs — is this machine ready? Checks every tool the kit needs and says how to fix what's missing.
//   node tools/doctor.mjs
import fs from "fs";
import { createRequire } from "module";
import path from "path";
import { spawnSync } from "child_process";
import { ROOT, config, which } from "./lib.mjs";

const os = process.platform; // darwin | win32 | linux
const fix = {
  node: { darwin: "brew install node   (or the LTS installer from nodejs.org)", win32: "winget install OpenJS.NodeJS.LTS", linux: "install Node 20+ LTS from nodejs.org or your package manager (nvm works too)" },
  ffmpeg: { darwin: "brew install ffmpeg", win32: "winget install Gyan.FFmpeg   (then open a NEW terminal)", linux: "sudo apt install ffmpeg   (or your distro's package)" },
  uv: { darwin: "brew install uv   (or: curl -LsSf https://astral.sh/uv/install.sh | sh)", win32: "winget install astral-sh.uv", linux: "curl -LsSf https://astral.sh/uv/install.sh | sh" },
};
let bad = 0;
const row = (ok, name, detail, hint) => {
  console.log(`${ok ? "✓" : "✗"} ${name.padEnd(22)} ${detail}${!ok && hint ? `\n    fix: ${hint}` : ""}`);
  if (!ok) bad++;
};
const ver = (cmd, a = ["--version"]) => {
  const r = spawnSync(cmd, a, { encoding: "utf8" });
  return r.status === 0 ? (r.stdout || r.stderr).split("\n")[0].trim() : null;
};

console.log(`Paper Collage Motion Kit — doctor (${os} ${process.arch})\n`);
const major = Number(process.versions.node.split(".")[0]);
row(major >= 18, "Node.js ≥ 18", `v${process.versions.node}`, fix.node[os]);
const ff = which("ffmpeg");
row(!!ff, "ffmpeg", ff ? ver(ff, ["-version"]) : "not found", fix.ffmpeg[os]);
row(!!which("ffprobe"), "ffprobe", which("ffprobe") ? "found" : "not found", fix.ffmpeg[os]);
if (ff) {
  const enc = spawnSync(ff, ["-hide_banner", "-encoders"], { encoding: "utf8" }).stdout || "";
  const flt = spawnSync(ff, ["-hide_banner", "-filters"], { encoding: "utf8" }).stdout || "";
  row(enc.includes("libx264"), "ffmpeg: H.264", enc.includes("libx264") ? "yes" : "missing", "install a full ffmpeg build (the ones above include it)");
  row(flt.includes("loudnorm") && flt.includes("palettegen"), "ffmpeg: filters", flt.includes("loudnorm") ? "loudnorm, palettegen" : "missing", "install a full ffmpeg build");
}
const uv = which("uv");
row(!!uv, "uv (runs the Python)", uv ? ver(uv) : "not found", fix.uv[os]);
const require = createRequire(path.join(ROOT, "package.json"));
let rv = null;
try {
  rv = require("remotion/package.json").version;
} catch {}
row(!!rv, "Remotion installed", rv ? `remotion ${rv}` : "node_modules missing", "npm install   (in this folder)");
for (const [f, how] of [
  ["public/textures/paper-grid-1x1.jpg", "uv run --with numpy --with pillow python tools/textures.py"],
  ["public/textures/grain.png", "uv run --with numpy --with pillow python tools/textures.py"],
  ["public/sfx/kit/tear.wav", "uv run --with numpy --with scipy python tools/sfx/build_kit.py"],
  ["public/sfx/kit/slam.wav", "uv run --with numpy --with scipy python tools/sfx/build_kit.py"],
]) row(fs.existsSync(path.join(ROOT, f)), path.basename(f), fs.existsSync(path.join(ROOT, f)) ? "present" : "missing", how);
const cfg = config();
row(!!cfg.version, "kit.config.json", cfg.version ? `images: ${cfg.images?.inbox ?? "chat only"} · image MCP: ${cfg.imageGeneration?.provider ?? "none"} · voice MCP: ${cfg.voiceGeneration?.provider ?? "none"}` : "missing", "finish setup (the setup step that asks the questions writes it)");
const engine = os === "darwin" && process.arch === "arm64" ? "mlx-whisper (Apple Silicon)" : "faster-whisper";
console.log(`\n  voice-over sync: ${engine} via uv — downloads its model (≈ 1.6 GB) the first time a voice-over is used`);
console.log(bad ? `\n✗ ${bad} problem(s) — fix them, then run this again.` : "\n✓ ready.");
process.exit(bad ? 1 : 0);
