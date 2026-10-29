// Media helpers for the golden set: ffprobe facts, loudness, and a frame-by-frame comparison of two outputs.
// Frames are decoded by the pinned FFmpeg to raw RGBA and compared in Node (no extra dependencies).
import { execFileSync, spawn } from "node:child_process";
import { existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { expandEnv, loadPins } from "../../packages/version-manager/index.mjs";

/** A png-sequence output is a directory of frame_NNNNNN.png files; anything else is a media or image file. */
const isSeq = (path) => existsSync(path) && statSync(path).isDirectory();
const ffDir = () => expandEnv(loadPins().ffmpeg.dir);
const ffmpeg = () => join(ffDir(), "ffmpeg.exe");
const ffprobe = () => join(ffDir(), "ffprobe.exe");

/** Input arguments for ffmpeg: a png-sequence directory or a media file. */
function inputArgs(path) {
  if (isSeq(path)) {
    const first = readdirSync(path).find((n) => /^frame_\d+\.png$/.test(n));
    if (!first) throw new Error(`no frames in ${path}`);
    return ["-start_number", "1", "-i", join(path, "frame_%06d.png")];
  }
  return /\.webm$/i.test(path) ? ["-c:v", "libvpx-vp9", "-i", path] : ["-i", path];
}

export function probe(path) {
  const file = isSeq(path) ? join(path, "frame_000001.png") : path;
  const j = JSON.parse(execFileSync(ffprobe(), ["-v", "error", "-show_entries",
    "stream=codec_type,codec_name,pix_fmt,width,height,r_frame_rate,sample_rate,channels:stream_tags=alpha_mode:format=duration", "-of", "json", file], { encoding: "utf8", windowsHide: true }));
  const v = j.streams.find((s) => s.codec_type === "video");
  const a = j.streams.find((s) => s.codec_type === "audio");
  const frames = isSeq(path) ? readdirSync(path).filter((n) => /^frame_\d+\.png$/.test(n)).length : null;
  return { video: v && { codec: v.codec_name, pixFmt: v.pix_fmt, width: v.width, height: v.height, rate: v.r_frame_rate, alphaMode: v.tags?.alpha_mode ?? v.tags?.ALPHA_MODE },
    audio: a && { codec: a.codec_name, sampleRate: a.sample_rate, channels: a.channels }, duration: j.format?.duration ? Number(j.format.duration) : null, pngFrames: frames };
}

export function countFrames(path) {
  if (isSeq(path)) return readdirSync(path).filter((n) => /^frame_\d+\.png$/.test(n)).length;
  const out = execFileSync(ffprobe(), ["-v", "error", "-count_frames", "-select_streams", "v:0", "-show_entries", "stream=nb_read_frames", "-of", "csv=p=0", path], { encoding: "utf8", windowsHide: true });
  return Number(out.trim());
}

/** Integrated loudness (LUFS) of the audio stream, or null when there is none. */
export function loudness(path) {
  try {
    const r = execFileSync(ffmpeg(), ["-hide_banner", "-nostats", "-i", path, "-af", "ebur128", "-f", "null", "-"], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], windowsHide: true });
    return parseLoud(r);
  } catch (e) { return parseLoud(String(e.stderr ?? "")); }
}
function parseLoud(text) { const m = /I:\s*(-?[\d.]+) LUFS\s*\n\s*Threshold/.exec(text); return m ? Number(m[1]) : null; }

function frameStream(path, w, h) {
  const p = spawn(ffmpeg(), ["-v", "error", ...inputArgs(path), "-f", "rawvideo", "-pix_fmt", "rgba", "-s", `${w}x${h}`, "-"], { stdio: ["ignore", "pipe", "pipe"], windowsHide: true });
  const size = w * h * 4;
  let frame = Buffer.allocUnsafe(size);     // filled in place: no growing buffer per chunk
  let filled = 0;
  const queue = [];
  let ended = false;
  let wake = null;
  p.stdout.on("data", (d) => {
    let off = 0;
    while (off < d.length) {
      const n = Math.min(size - filled, d.length - off);
      d.copy(frame, filled, off, off + n);
      filled += n; off += n;
      if (filled === size) { queue.push(frame); frame = Buffer.allocUnsafe(size); filled = 0; }
    }
    if (queue.length > 4) p.stdout.pause();
    wake?.();
  });
  p.stdout.on("end", () => { ended = true; wake?.(); });
  return {
    async next() { while (!queue.length && !ended) await new Promise((r) => (wake = r)); const f = queue.shift() ?? null; if (queue.length <= 4) p.stdout.resume(); return f; },
    kill() { p.kill(); },
  };
}

/**
 * Per-frame classes (kit verify idea): identical; minor (< 24 px over 3 levels); edge (more, but no 3x3 solid block of
 * changed pixels: thin edge lines); bug (a solid changed region).
 */
function classify(a, b, w, h) {
  let over = 0;
  const mask = new Uint8Array(w * h);
  for (let i = 0, px = 0; i < a.length; i += 4, px++) {
    const d = Math.max(Math.abs(a[i] - b[i]), Math.abs(a[i + 1] - b[i + 1]), Math.abs(a[i + 2] - b[i + 2]), Math.abs(a[i + 3] - b[i + 3]));
    if (d > 3) { over++; mask[px] = 1; }
  }
  if (over === 0) return { cls: "identical", px: 0 };
  if (over < 24) return { cls: "minor", px: over };
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const i = y * w + x;
    if (mask[i] && mask[i - 1] && mask[i + 1] && mask[i - w] && mask[i + w] && mask[i - w - 1] && mask[i - w + 1] && mask[i + w - 1] && mask[i + w + 1]) return { cls: "bug", px: over };
  }
  return { cls: "edge", px: over };
}

/** LCD colour-fringe pixels (max - min channel > 60) inside box [x0, y0, x1, y1] of one PNG frame. */
export function fringeCount(pngPath, [x0, y0, x1, y1]) {
  const { width: w, height: h } = probe(pngPath).video;
  const raw = execFileSync(ffmpeg(), ["-v", "error", "-i", pngPath, "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], { maxBuffer: w * h * 3 + 1024, windowsHide: true });
  let n = 0;
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
    const i = (y * w + x) * 3;
    const r = raw[i], g = raw[i + 1], b = raw[i + 2];
    if (Math.max(r, g, b) - Math.min(r, g, b) > 60) n++;
  }
  return n;
}

export async function compareFrames(pathA, pathB) {
  const pa = probe(pathA);
  const { width: w, height: h } = pa.video;
  const A = frameStream(pathA, w, h), B = frameStream(pathB, w, h);
  const counts = { identical: 0, minor: 0, edge: 0, bug: 0 };
  const notable = [];
  let n = 0;
  for (;;) {
    const [fa, fb] = await Promise.all([A.next(), B.next()]);
    if (!fa || !fb) { if (fa || fb) notable.push({ frame: n, cls: "length-mismatch" }); break; }
    const c = classify(fa, fb, w, h);
    counts[c.cls]++;
    if (c.cls === "edge" || c.cls === "bug") notable.push({ frame: n, ...c });
    n++;
  }
  A.kill(); B.kill();
  return { frames: n, counts, notable: notable.slice(0, 50) };
}
