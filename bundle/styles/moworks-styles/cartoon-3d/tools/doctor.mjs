#!/usr/bin/env node
// doctor.mjs — is this machine ready to make a cartoon video? Checks every tool the kit needs and prints the exact
// command that fixes each one that's missing. Run it at the start of EVERY new project (CLAUDE.md → "First: check").
//   node tools/doctor.mjs            human-readable report, exit code 1 if anything is missing
//   node tools/doctor.mjs --json     the same as JSON (for the agent)
// If `node` itself is missing this script can't run: Node.js is the first thing to install.
import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";
import { GL, ROOT, config, which } from "./lib.mjs";

const os = process.platform; // darwin | win32 | linux
const asJson = process.argv.includes("--json");
// who installs it: "user" = system software (the user runs it; may need their password),
// "folder" = installs into this project folder only (the agent may run it after the user says yes)
const FIX = {
  node: { who: "user", darwin: "brew install node   (or the LTS installer from https://nodejs.org)", win32: "winget install OpenJS.NodeJS.LTS   (then open a NEW terminal)", linux: "install Node 20+ LTS from https://nodejs.org, your package manager, or nvm" },
  ffmpeg: { who: "user", darwin: "brew install ffmpeg", win32: "winget install Gyan.FFmpeg   (then open a NEW terminal)", linux: "sudo apt install ffmpeg   (or your distro's package)" },
  uv: { who: "user", darwin: "brew install uv   (or: curl -LsSf https://astral.sh/uv/install.sh | sh)", win32: "winget install astral-sh.uv   (then open a NEW terminal)", linux: "curl -LsSf https://astral.sh/uv/install.sh | sh" },
  brew: { who: "user", darwin: "Homebrew is needed for the brew commands: install it from https://brew.sh (it asks for your password)" },
  npm: { who: "folder", any: "npm install   (in this folder: Remotion, React, Three.js, the font loader)" },
  browser: { who: "folder", any: "npx remotion browser ensure   (in this folder; downloads Remotion's headless Chrome)" },
  sounds: { who: "folder", any: "uv run --with numpy --with scipy python tools/sfx/build_sounds.py" },
  config: { who: "agent", any: "finish the setup: the kit-setup skill writes kit.config.json" },
};
const fixFor = (k) => FIX[k][os] ?? FIX[k].any ?? "";
const rows = [];
const row = (ok, name, detail, key, why) => rows.push({ ok, name, detail, key, why, fix: ok ? "" : fixFor(key), who: FIX[key]?.who ?? "" });
const ver = (cmd, a = ["--version"]) => {
  const r = spawnSync(cmd, a, { encoding: "utf8" });
  return r.status === 0 ? (r.stdout || r.stderr).split("\n")[0].trim() : null;
};

// system tools (the user installs these)
const major = Number(process.versions.node.split(".")[0]);
row(major >= 18, "Node.js ≥ 18", `v${process.versions.node}`, "node", "runs Remotion and every tool");
const ff = which("ffmpeg");
row(!!ff, "ffmpeg", ff ? ver(ff, ["-version"]) : "not found", "ffmpeg", "encodes the MP4, mixes and measures the sound");
row(!!which("ffprobe"), "ffprobe", which("ffprobe") ? "found" : "not found (it comes with ffmpeg)", "ffmpeg", "measures renders for QC");
if (ff) {
  const enc = spawnSync(ff, ["-hide_banner", "-encoders"], { encoding: "utf8" }).stdout || "";
  const flt = spawnSync(ff, ["-hide_banner", "-filters"], { encoding: "utf8" }).stdout || "";
  row(enc.includes("libx264"), "ffmpeg: H.264 encoder", enc.includes("libx264") ? "libx264" : "missing", "ffmpeg", "a full ffmpeg build is needed");
  const need = ["loudnorm", "ebur128", "alimiter", "silencedetect", "blackdetect", "freezedetect"];
  const miss = need.filter((f) => !flt.includes(f));
  row(!miss.length, "ffmpeg: filters", miss.length ? `missing ${miss.join(", ")}` : need.join(", "), "ffmpeg", "loudness, voice timing and QC need them");
}
const uv = which("uv");
row(!!uv, "uv (runs the Python)", uv ? ver(uv) : "not found", "uv", "runs the sound design, the voice timing and the review sheets with no Python setup");
if (os === "darwin" && (!ff || !uv) && !which("brew")) row(false, "Homebrew", "not found", "brew", "the macOS install commands above use it");

// this folder (the agent may install these after the user says yes)
// read the installed package.json directly (some packages, e.g. three, don't export it)
const pkg = (name) => {
  try {
    return JSON.parse(fs.readFileSync(path.join(ROOT, "node_modules", name, "package.json"), "utf8")).version;
  } catch {
    return null;
  }
};
const rv = pkg("remotion"),
  tv = pkg("three"),
  gv = pkg("@remotion/google-fonts");
row(!!(rv && tv && gv), "npm packages", rv && tv && gv ? `remotion ${rv} · three ${tv} · fonts ${gv}` : "node_modules missing or incomplete", "npm", "the video engine, the 3D engine and the font loader");
const bdir = path.join(ROOT, "node_modules/.remotion/chrome-headless-shell");
const hasBrowser = fs.existsSync(bdir) && fs.readdirSync(bdir).some((d) => fs.statSync(path.join(bdir, d)).isDirectory());
row(hasBrowser, "Remotion's headless Chrome", hasBrowser ? "present" : "not downloaded", "browser", "renders the frames (WebGL)");
const snd = ["impact", "win", "tick", "chip", "click"].every((n) => fs.existsSync(path.join(ROOT, `public/sfx/kit/${n}.wav`)));
row(snd, "sound kit", snd ? "built (public/sfx/kit)" : "not built yet", "sounds", "the code-made sound effects");
const cfg = config();
row(!!cfg.version, "kit.config.json", cfg.version ? `version ${cfg.version} · set up ${cfg.setupDate ?? "?"}` : "missing", "config", "the setup writes it");

// information (never a failure)
const engine = os === "darwin" && process.arch === "arm64" ? "mlx-whisper (Apple silicon)" : "faster-whisper";
const mods = cfg.modules ? Object.entries(cfg.modules).filter(([, on]) => on).map(([k]) => k).join(", ") || "none" : "—";
const info = [
  "fonts: Outfit, Patrick Hand, Caveat Brush load from Google Fonts while rendering (needs internet)",
  `voice timing: ${engine} via uv; downloads its model (≈ 1.6 GB) the first time a voice is timed`,
  `WebGL backend: ${GL()} (kit.config.json → render.gl; "swangle" if renders fail with a WebGL error)`,
  `modules on: ${mods}`,
];

const bad = rows.filter((r) => !r.ok);
if (asJson) {
  console.log(JSON.stringify({ ready: !bad.length, platform: `${os} ${process.arch}`, checks: rows, info }, null, 2));
} else {
  console.log(`3D Cartoon Animation Toolkit — doctor (${os} ${process.arch})\n`);
  for (const r of rows) console.log(`${r.ok ? "✓" : "✗"} ${r.name.padEnd(28)} ${r.detail}${r.ok ? "" : `\n    why: ${r.why}\n    fix: ${r.fix}${r.who === "user" ? "   ← the user installs this" : r.who === "folder" ? "   ← installs into this folder (ask first)" : ""}`}`);
  console.log(`\n  ${info.join("\n  ")}`);
  console.log(bad.length ? `\n✗ ${bad.length} missing — install them, then run this again. Don't start a video until it says ready.` : "\n✓ ready.");
}
process.exit(bad.length ? 1 : 0);
