#!/usr/bin/env node
// doctor.mjs: is this machine ready to make an explainer video? Checks every tool the kit needs and prints the exact
// command that fixes each one that's missing. Run it at the start of EVERY new project (CLAUDE.md → "First: check").
//   node tools/doctor.mjs            human-readable report, exit code 1 if anything is missing
//   node tools/doctor.mjs --json     the same as JSON (for the agent)
// If `node` itself is missing this script can't run: Node.js is the first thing to install.
import fs from "fs";
import os from "os";
import path from "path";
import { spawnSync } from "child_process";
import { ROOT, config, which } from "./lib.mjs";

const plat = process.platform; // darwin | win32 | linux
const asJson = process.argv.includes("--json");
const PINS = { hyperframes: "0.9.1", gsap: "3.15.0", "@fontsource/figtree": "5.3.0" };
const HF_CACHE = process.env.HYPERFRAMES_CACHE_DIR ? path.resolve(process.env.HYPERFRAMES_CACHE_DIR) : path.join(os.homedir(), ".cache", "hyperframes");
const HF_BIN = plat === "win32" ? "node_modules\\.bin\\hyperframes.cmd" : "node_modules/.bin/hyperframes";

// who installs it: "user" = system software (the user runs it; it may ask for their password),
// "folder" = installs into this folder, "cache" = downloads into HyperFrames' cache in the home folder
// (for both, the agent runs it only after the user says yes), "agent" = the setup writes it
const FIX = {
  node: { who: "user", darwin: "brew install node   (or the LTS installer from https://nodejs.org)", win32: "winget install OpenJS.NodeJS.LTS   (then open a NEW terminal)", linux: "install Node 22 LTS from https://nodejs.org, your package manager, or nvm" },
  ffmpeg: { who: "user", darwin: "brew install ffmpeg", win32: "winget install Gyan.FFmpeg   (then open a NEW terminal)", linux: "sudo apt install ffmpeg   (or your distro's package)" },
  uv: { who: "user", darwin: "brew install uv   (or: curl -LsSf https://astral.sh/uv/install.sh | sh)", win32: "winget install astral-sh.uv   (then open a NEW terminal)", linux: "curl -LsSf https://astral.sh/uv/install.sh | sh" },
  brew: { who: "user", darwin: "Homebrew is needed for the brew commands: install it from https://brew.sh (it asks for your password)" },
  npm: { who: "folder", any: "npm install   (in this folder: HyperFrames 0.9.1, GSAP 3.15.0, the Figtree font)" },
  browser: { who: "cache", any: `npm run browser   (= ${HF_BIN} browser ensure; downloads HyperFrames' headless Chrome, about 200 MB, once)` },
  speech: { who: "cache", any: `npm run speech   (= ${HF_BIN} models install parakeet; downloads the Parakeet speech model, about 670 MB, once)` },
  whisper: { who: "user", darwin: "brew install whisper-cpp", win32: "build whisper.cpp with cmake (https://github.com/ggml-org/whisper.cpp#building) and put whisper-cli on PATH", linux: "build whisper.cpp from source (https://github.com/ggml-org/whisper.cpp#building; needs cmake and a C compiler)" },
  config: { who: "agent", any: "finish the setup: the kit-setup skill writes kit.config.json" },
};
const fixFor = (k) => FIX[k][plat] ?? FIX[k].any ?? "";
const rows = [];
const row = (ok, name, detail, key, why) => rows.push({ ok, name, detail, key, why, fix: ok ? "" : fixFor(key), who: FIX[key]?.who ?? "" });
const ver = (cmd, a = ["--version"]) => {
  const r = spawnSync(cmd, a, { encoding: "utf8" });
  return r.status === 0 ? (r.stdout || r.stderr).split("\n")[0].trim() : null;
};

// ---------- system tools (the user installs these) ----------
const major = Number(process.versions.node.split(".")[0]);
row(major >= 22, "Node.js ≥ 22", `v${process.versions.node}`, "node", "runs HyperFrames and every tool");
const ff = which("ffmpeg");
const fp = which("ffprobe");
row(!!ff, "ffmpeg", ff ? ver(ff, ["-version"])?.split(" Copyright")[0] ?? "found" : "not found", "ffmpeg", "encodes the delivery MP4, measures loudness, frames and cuts");
row(!!fp, "ffprobe", fp ? "found" : "not found (it comes with ffmpeg)", "ffmpeg", "counts the frames of a render for QC");
let drawtext = false;
if (ff) {
  const enc = spawnSync(ff, ["-hide_banner", "-encoders"], { encoding: "utf8" }).stdout || "";
  const flt = spawnSync(ff, ["-hide_banner", "-filters"], { encoding: "utf8" }).stdout || "";
  const has = (f) => new RegExp(`\\s${f}\\s`).test(flt);
  row(enc.includes("libx264"), "ffmpeg: H.264 encoder", enc.includes("libx264") ? "libx264" : "missing", "ffmpeg", "a full ffmpeg build is needed for the delivery encode");
  const need = ["ebur128", "loudnorm", "freezedetect", "scdet", "silencedetect", "alimiter"];
  const miss = need.filter((f) => !has(f));
  row(!miss.length, "ffmpeg: filters", miss.length ? `missing ${miss.join(", ")}` : need.join(", "), "ffmpeg", "loudness, voice timing and QC need them (a full ffmpeg 5 or newer has them all)");
  drawtext = has("drawtext");
}
const uv = which("uv");
row(!!uv, "uv (runs the Python)", uv ? ver(uv) : "not found", "uv", "runs the sound design and the voice timing with no Python setup");
if (plat === "darwin" && (!ff || !uv) && !which("brew")) row(false, "Homebrew", "not found", "brew", "the macOS install commands above use it");

// ---------- this folder (the agent may install these after the user says yes) ----------
// read the installed package.json directly (some packages don't export it)
const pkg = (name) => {
  try {
    return JSON.parse(fs.readFileSync(path.join(ROOT, "node_modules", name, "package.json"), "utf8")).version;
  } catch {
    return null;
  }
};
const got = Object.fromEntries(Object.keys(PINS).map((k) => [k, pkg(k)]));
const off = Object.keys(PINS).filter((k) => got[k] !== PINS[k]);
row(
  !off.length,
  "npm packages",
  off.length ? off.map((k) => (got[k] ? `${k} ${got[k]} (the kit pins ${PINS[k]})` : `${k} missing`)).join(" · ") : Object.keys(PINS).map((k) => `${k.replace("@fontsource/", "")} ${got[k]}`).join(" · "),
  "npm",
  "the video engine (HyperFrames), the animation library and the house font"
);

// HyperFrames' own doctor knows where it finds Chrome; only its downloaded headless shell (or one set in
// HYPERFRAMES_BROWSER_PATH) counts. A system Chrome is a slower fallback the kit doesn't use.
const hfJs = path.join(ROOT, "node_modules/hyperframes/bin/hyperframes.mjs");
const hfJson = (args) => {
  if (!got.hyperframes) return null;
  const r = spawnSync(process.execPath, [hfJs, ...args], { cwd: ROOT, encoding: "utf8", timeout: 60000 });
  const s = r.stdout || "";
  const at = s.search(/^\{/m); // the JSON document starts on its own line (anything before it is a log line)
  try {
    return at < 0 ? null : JSON.parse(s.slice(at));
  } catch {
    return null;
  }
};
const hfDoc = hfJson(["doctor", "--json"]);
const chrome = hfDoc?.checks?.find((c) => c.name === "Chrome");
const ownChrome = !!chrome?.ok && /^(cache|env)\b/.test(chrome.detail || "");
row(
  ownChrome,
  "HyperFrames' Chrome",
  !got.hyperframes ? "install the npm packages first" : ownChrome ? `present (${path.join(HF_CACHE, "chrome")})` : chrome?.detail ? `not downloaded (would fall back to ${chrome.detail})` : "not downloaded",
  "browser",
  "renders the frames and the snapshots (headless Chrome, pinned by HyperFrames)"
);

// speech to text, for timing a voice and the final transcript check. HyperFrames uses Parakeet when it is installed,
// else whisper.cpp; without either it would try to install whisper.cpp itself, so the kit installs Parakeet first.
const models = hfJson(["models", "list", "--json"]);
const para = models?.models?.find((m) => m.engine === "parakeet" && m.installed);
const whisperCli =
  [process.env.HYPERFRAMES_WHISPER_PATH, which("whisper-cli"), path.join(HF_CACHE, "whisper/whisper.cpp/build/bin/whisper-cli"), path.join(HF_CACHE, "whisper/whisper.cpp/build/whisper-cli")].find(
    (p) => p && fs.existsSync(p)
  ) ?? null;
const whisperModel = fs.existsSync(path.join(HF_CACHE, "whisper/models/ggml-medium.en.bin"));
const sherpaOk = ["darwin-arm64", "darwin-x64", "linux-x64", "linux-arm64", "win32-x64", "win32-ia32"].includes(`${plat}-${process.arch}`);
row(
  !!(para || whisperCli),
  "speech to text",
  !got.hyperframes ? "install the npm packages first" : para ? `Parakeet (${para.runner || "installed"})` : whisperCli ? `whisper.cpp (${whisperCli})` : "not installed",
  sherpaOk ? "speech" : "whisper",
  "times the narration word by word and checks the final MP4 against the script"
);

const cfg = config();
row(!!cfg.version, "kit.config.json", cfg.version ? `version ${cfg.version} · set up ${cfg.setupDate ?? "?"}` : "missing", "config", "the setup writes it");

// ---------- information (never a failure) ----------
const py = uv ? spawnSync(uv, ["python", "find", "3.12"], { encoding: "utf8" }).status === 0 : false;
const mods = cfg.modules ? Object.entries(cfg.modules).filter(([, on]) => on).map(([k]) => k).join(", ") || "none" : "—";
const info = [
  para
    ? "voice timing: Parakeet runs on this machine; nothing more downloads"
    : whisperCli
      ? `voice timing: whisper.cpp; ${whisperModel ? "its medium.en model is downloaded" : "its medium.en model (about 1.5 GB) downloads the first time a voice is timed"}`
      : "voice timing: the speech model downloads once with `npm run speech`, before the first voice is timed",
  `Python 3.12 for the sound tools: ${py ? "ready" : "uv downloads it (and the audio packages) the first time a sound tool runs"}`,
  `contact-sheet labels: ${drawtext ? "ffmpeg drawtext (Figtree)" : "ffmpeg has no drawtext, so sheets come out unlabelled (times are printed instead)"}`,
  "fonts and GSAP come from node_modules and are copied into each video's ex/ folder: renders need no internet",
  "sandbox: headless Chrome can't start inside Claude Code's sandbox. Run snapshot, render, check and preview with the sandbox disabled, or in a normal terminal. Transcription works inside the sandbox",
  `modules on: ${mods}`,
];

const bad = rows.filter((r) => !r.ok);
if (asJson) {
  console.log(JSON.stringify({ ready: !bad.length, platform: `${plat} ${process.arch}`, checks: rows, info }, null, 2));
} else {
  const who = { user: "   ← the user installs this", folder: "   ← installs into this folder (ask first)", cache: "   ← downloads into HyperFrames' cache in the home folder (ask first)", agent: "" };
  console.log(`2D Explainer Animation Toolkit: doctor (${plat} ${process.arch})\n`);
  for (const r of rows) console.log(`${r.ok ? "✓" : "✗"} ${r.name.padEnd(24)} ${r.detail}${r.ok ? "" : `\n    why: ${r.why}\n    fix: ${r.fix}${who[r.who] ?? ""}`}`);
  console.log(`\n  ${info.join("\n  ")}`);
  console.log(bad.length ? `\n✗ ${bad.length} missing. Install them, then run this again. Don't start a video until it says ready.` : "\n✓ ready.");
}
process.exit(bad.length ? 1 : 0);
