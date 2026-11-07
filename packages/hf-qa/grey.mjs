// A still read as grey levels, one way for every check and the render's GPU test (audit/112b b2.7: two copies, and the render worker
// imported the whole checks module for it). 320 px wide, the app's FFmpeg.
import { execFileSync } from "node:child_process";
import { ffmpegExe } from "../version-manager/index.mjs";

/** A still's grey levels, 320 px wide: { w, h, px }. */
export function stillGrey(png) {
  const px = execFileSync(ffmpegExe(), ["-v", "error", "-i", png, "-vf", "scale=320:-1", "-f", "rawvideo", "-pix_fmt", "gray", "-"], { maxBuffer: 1 << 24, windowsHide: true });
  return { w: 320, h: Math.floor(px.length / 320), px };
}

/** A picture's contrast (the spread of its grey levels) and light (their mean), 0-255. */
export function greyStats(px) {
  let sum = 0, sq = 0;
  for (const v of px) { sum += v; sq += v * v; }
  const n = px.length || 1;
  return { contrast: Math.sqrt(Math.max(0, sq / n - (sum / n) ** 2)), light: sum / n };
}

/** A still's contrast alone (0 for a flat one): what the blank-scene check, the boards' check and the GPU test read. */
export const stillStd = (png) => greyStats(stillGrey(png).px).contrast;
