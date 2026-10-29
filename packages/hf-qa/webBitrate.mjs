// "Standard" quality is HF's crf 18, a constant quality with no ceiling. A 1920s Silent Film (grain and flicker on every
// frame) came out at about 26 Mbps, 111 MB for 34 s; a flat film was 3.8 Mbps. HF's render takes a crf or a target bitrate, never
// a ceiling (engine chunkEncoder: -crf, or -b:v alone), so HF renders as shipped and a Standard MP4 over the web ceiling is encoded once
// more here: the same crf 18 with a maxrate (constrained quality), so a quiet film keeps its size and a grainy one stops at the ceiling.
// High quality is never touched.
import { execFile } from "node:child_process";
import { renameSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { promisify } from "node:util";
import { ffmpegExe } from "../library/preview-media.mjs";

const run = promisify(execFile);
/** 12 Mbps at 1920 × 1080, 30 fps (a little over YouTube's 8 Mbps advice for an SDR 1080p upload), scaled to the film's pixels a second. */
export const WEB_MBPS_1080P30 = 12;
export function webCeilingMbps({ width, height, fps }) {
  return Math.round(Math.max(2, WEB_MBPS_1080P30 * (width * height * fps) / (1920 * 1080 * 30)) * 10) / 10;
}

async function probe(file, root) {
  const { stdout } = await run(join(dirname(ffmpegExe(root)), "ffprobe.exe"), ["-v", "error", "-select_streams", "v:0", "-show_entries",
    "stream=width,height,avg_frame_rate,bit_rate,color_space,color_primaries,color_transfer:format=duration,size", "-of", "json", file], { windowsHide: true, timeout: 60000 });
  const j = JSON.parse(stdout), s = j.streams?.[0] ?? {};
  const [n, d] = String(s.avg_frame_rate ?? "30/1").split("/").map(Number);
  const duration = Number(j.format?.duration) || 0;
  return { width: s.width, height: s.height, fps: d ? n / d : 30, duration, size: Number(j.format?.size) || 0,
    mbps: (Number(s.bit_rate) || (duration ? (Number(j.format?.size) * 8) / duration : 0)) / 1e6,
    color: { colorspace: s.color_space, color_primaries: s.color_primaries, color_trc: s.color_transfer } };
}

/** The video of an MP4 over its web ceiling, encoded again at crf 18 with maxrate = bufsize = the ceiling (a one-second buffer: two let a
 *  short clip end a fifth over it); audio copied.
 *  Returns { capped, mbps, ceiling, before, after } (sizes in bytes). The file is replaced only when the new one is smaller. */
export async function capWebBitrate(file, { root, signal = null } = {}) {
  const p = await probe(file, root);
  const ceiling = webCeilingMbps(p);
  // a quarter over before it counts: a file already held to the ceiling lands a little over it (6.9 for 6.8) and is never encoded twice
  if (!(p.mbps > ceiling * 1.25)) return { capped: false, mbps: Math.round(p.mbps * 10) / 10, ceiling };
  const tmp = file.replace(/(\.[^.]+)$/, ".web$1");
  const tags = Object.entries(p.color).filter(([, v]) => v && v !== "unknown").flatMap(([k, v]) => [`-${k}`, v]);
  try {
    // -bf 0 as HF's own encoder (B-frames give negative DTS that some players freeze on); yuv420p and +faststart for web players
    await run(ffmpegExe(root), ["-v", "error", "-y", "-i", file, "-map", "0", "-c:v", "libx264", "-preset", "medium", "-crf", "18",
      "-maxrate", `${ceiling}M`, "-bufsize", `${ceiling}M`, "-bf", "0", "-pix_fmt", "yuv420p", ...tags, "-c:a", "copy", "-movflags", "+faststart", tmp],
      { windowsHide: true, maxBuffer: 16 << 20, timeout: 1800000, signal: signal ?? undefined });
    const q = await probe(tmp, root);
    if (!(q.size > 0 && q.size < p.size)) { rmSync(tmp, { force: true }); return { capped: false, mbps: Math.round(p.mbps * 10) / 10, ceiling }; }
    renameSync(tmp, file);
    return { capped: true, mbps: Math.round(q.mbps * 10) / 10, ceiling, before: p.size, after: q.size };
  } catch (e) {
    rmSync(tmp, { force: true });
    throw e;
  }
}

/** The Editor's Smooth copy of a rendered film, a keyframe at least every second. Play froze
 *  1.1 s at a cut in one film and 0.42 s in another, each time until the next keyframe of the render (HF places them at scene changes, up
 *  to 5 s apart): the player's decoder lost its place at the cut and came back at a keyframe. Only the Editor plays this copy; Render
 *  hands over the render itself. crf 18 with the web ceiling, x264's own keyframes at cuts kept, -bf 0 as HF's encoder; the sound copied. Returns { size, mbps, gop }. */
export async function smoothCopy(src, out, { root, signal = null } = {}) {
  const p = await probe(src, root);
  const gop = Math.max(1, Math.round(p.fps));
  const ceiling = webCeilingMbps(p);
  const tmp = out.replace(/(\.[^.]+)$/, ".part$1");
  const tags = Object.entries(p.color).filter(([, v]) => v && v !== "unknown").flatMap(([k, v]) => [`-${k}`, v]);
  try {
    await run(ffmpegExe(root), ["-v", "error", "-y", "-i", src, "-map", "0", "-c:v", "libx264", "-preset", "medium", "-crf", "18",
      "-maxrate", `${ceiling}M`, "-bufsize", `${ceiling}M`, "-g", String(gop), "-bf", "0", "-pix_fmt", "yuv420p", ...tags,
      "-c:a", "copy", "-movflags", "+faststart", tmp], { windowsHide: true, maxBuffer: 16 << 20, timeout: 1800000, signal: signal ?? undefined });
    renameSync(tmp, out);
  } catch (e) {
    rmSync(tmp, { force: true });
    throw e;
  }
  const q = await probe(out, root);
  return { size: q.size, mbps: Math.round(q.mbps * 10) / 10, gop };
}
