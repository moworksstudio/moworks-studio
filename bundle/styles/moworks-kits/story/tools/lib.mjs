// lib.mjs — shared helpers for the tools: the kit root, ffmpeg/ffprobe/uv lookup, running commands.
import { execFileSync, spawnSync } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";

// fileURLToPath decodes "%20" — folder names may contain spaces
export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const IS_WIN = process.platform === "win32";

/** a command on PATH, or in the usual install folders; null when missing */
export const which = (name) => {
  const exe = IS_WIN ? `${name}.exe` : name;
  const dirs = [...(process.env.PATH || "").split(path.delimiter), path.join(os.homedir(), ".local/bin"), path.join(os.homedir(), ".cargo/bin"), "/opt/homebrew/bin", "/usr/local/bin"];
  for (const d of dirs) {
    const p = path.join(d, exe);
    try {
      if (d && fs.statSync(p).isFile()) return p;
    } catch {}
  }
  return null;
};
export const need = (name, hint) => {
  const p = which(name);
  if (!p) {
    console.error(`✗ ${name} not found. ${hint || "Run: node tools/doctor.mjs"}`);
    process.exit(1);
  }
  return p;
};
export const FFMPEG = () => need("ffmpeg", "Install ffmpeg (see .claude/skills/kit-setup/SKILL.md), then retry.");
export const FFPROBE = () => need("ffprobe", "Install ffmpeg (it includes ffprobe), then retry.");
export const UV = () => need("uv", "Install uv (see .claude/skills/kit-setup/SKILL.md), then retry.");

/** run a command, stream its output; exit on failure */
export const run = (cmd, args, opts = {}) => {
  const r = spawnSync(cmd, args, { stdio: "inherit", cwd: ROOT, ...opts });
  if (r.status !== 0) {
    console.error(`✗ failed: ${path.basename(cmd)} ${args.join(" ")}`);
    process.exit(r.status || 1);
  }
};
/** run a command and return its stdout as text */
export const out = (cmd, args, opts = {}) => execFileSync(cmd, args, { cwd: ROOT, maxBuffer: 256 * 1024 * 1024, ...opts }).toString();

/** ffprobe → { width, height, fps, duration, vcodec, pix, hasAudio, rotation } of the first video stream */
export const probe = (file) => {
  const j = JSON.parse(out(FFPROBE(), ["-v", "error", "-show_streams", "-show_format", "-of", "json", file]));
  const v = j.streams.find((s) => s.codec_type === "video");
  const a = j.streams.find((s) => s.codec_type === "audio");
  const rate = (r) => {
    const [n, d] = String(r || "0/1").split("/").map(Number);
    return d ? n / d : 0;
  };
  const rot = Number(v?.tags?.rotate ?? v?.side_data_list?.find((s) => s.rotation !== undefined)?.rotation ?? 0);
  return {
    width: v?.width ?? 0,
    height: v?.height ?? 0,
    fps: rate(v?.avg_frame_rate) || rate(v?.r_frame_rate),
    rFps: v?.r_frame_rate,
    duration: Number(j.format?.duration ?? 0),
    vcodec: v?.codec_name,
    pix: v?.pix_fmt,
    hasAudio: !!a,
    sampleRate: Number(a?.sample_rate ?? 48000),
    rotation: rot,
  };
};

/** "my-first-video" → "MyFirstVideo" */
export const pascal = (s) =>
  s
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join("");

/** parse --flag value / --flag pairs; returns { _: [positionals], flag: value|true } */
export const args = (argv, booleans = []) => {
  const o = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const k = a.slice(2);
      if (booleans.includes(k)) o[k] = true;
      else o[k] = argv[++i];
    } else o._.push(a);
  }
  return o;
};

/** kit.config.json (written at setup) — {} when missing */
export const config = () => {
  try {
    return JSON.parse(fs.readFileSync(path.join(ROOT, "kit.config.json"), "utf8"));
  } catch {
    return {};
  }
};
