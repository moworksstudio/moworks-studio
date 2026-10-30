// The ending check (config/rules/moworks-studio §9, owner 29/10/2026: no film stops dead). HyperFrames' stills half a second before the end
// and on the last frame (the end less 0.02 s, as the still stretches take it), each read as grey levels (320 px wide, as gates.mjs stillStd):
// its contrast (their spread), its light (their mean), and how much the picture changed between the two. The film fades out when its last
// frame is flat (a fade to black, white or the background), kept at most a third of the contrast it had half a second before, or went dark
// (a third of the light or less: black, or a dot on black); a last frame as full and as lit as before is a hard cut. Measured in every style
// (T24-12: an ASCII/CRT film's plan said "author", the picture stayed lit and alive to its last frame and cut while the music faded, and the
// check skipped author styles): where the plan's author's ending stands (hf-edit/ending.mjs filmEnding: own), a held end card (the last
// half second unchanged) is an ending too; a picture still moving there is not. A warning in Tech checks naming the time, never a block,
// said only when it fails.
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { snapshotAtAsync } from "./cli.mjs";
import { ffmpegExe } from "../library/preview-media.mjs";

/** before: how long before the end the earlier still is taken; flat: a contrast that is a plain picture; ratio: the share of the earlier
 *  contrast (or light) the last frame may keep and still read as faded (or dark); black: a light (0-255) that is black whatever came before;
 *  block / held: the blocks (px at 320) compared between the two stills and the largest mean difference (0-255) of any of them that is
 *  still a held picture (grain stays under it; a cursor blinking, a line typing, a scanline rolling do not). */
export const END = { before: 0.5, last: 0.02, flat: 3, ratio: 0.35, black: 2, block: 10, held: 6 };
const r2 = (n) => Math.round(n * 100) / 100;

/** A still's grey levels, 320 px wide: { w, h, px }. */
export function stillGrey(png) {
  const px = execFileSync(ffmpegExe(), ["-v", "error", "-i", png, "-vf", "scale=320:-1", "-f", "rawvideo", "-pix_fmt", "gray", "-"], { maxBuffer: 1 << 24, windowsHide: true });
  return { w: 320, h: Math.floor(px.length / 320), px };
}

/** A picture's contrast (the spread of its grey levels, gates.mjs stillStd) and light (their mean), 0-255. */
export function greyStats(px) {
  let sum = 0, sq = 0;
  for (const v of px) { sum += v; sq += v * v; }
  const n = px.length || 1;
  return { contrast: Math.sqrt(Math.max(0, sq / n - (sum / n) ** 2)), light: sum / n };
}

/** How much the picture changed between two stills of one size: the largest mean difference of any END.block px block (0-255); null
 *  when their sizes differ. */
export function greyChange(a, b, { block = END.block } = {}) {
  if (!a?.px || !b?.px || a.w !== b.w || a.h !== b.h) return null;
  let most = 0;
  for (let y0 = 0; y0 < a.h; y0 += block) for (let x0 = 0; x0 < a.w; x0 += block) {
    let d = 0, n = 0;
    for (let y = y0; y < Math.min(a.h, y0 + block); y++) for (let x = x0, o = y * a.w + x; x < Math.min(a.w, x0 + block); x++, o++) { d += Math.abs(a.px[o] - b.px[o]); n++; }
    if (n) most = Math.max(most, d / n);
  }
  return most;
}

/** Did the film fade out? From the two stills' contrast, and when known their light ([before, last]) and the change between them:
 *  { faded, held, before, last, light?, change? }. faded: the picture went flat, lost its contrast or went dark; held: it did not change. */
export function endVerdict(before, last, { light = null, change = null } = {}) {
  const b = Number(before), l = Number(last);
  const dark = Array.isArray(light) && light[1] <= Math.max(END.black, light[0] * END.ratio);
  return { faded: l <= END.flat || b <= END.flat || l <= b * END.ratio || dark, held: change != null && change <= END.held, before: r2(b), last: r2(l),
    ...(Array.isArray(light) ? { light: light.map(r2) } : {}), ...(change != null ? { change: r2(change) } : {}) };
}

/** The film's ending measured from HyperFrames' stills: { at: [t1, t2], faded, held, before, last, light, change } (the stills are deleted after). */
export async function measureEnding(dir, { total, signal = null, workDir, snap = snapshotAtAsync, grey = stillGrey } = {}) {
  const at = [r2(Math.max(0, total - END.before)), r2(Math.max(0, total - END.last))];
  rmSync(workDir, { recursive: true, force: true }); mkdirSync(workDir, { recursive: true });
  try {
    const r = await snap(dir, at, workDir, { signal });
    const files = existsSync(workDir) ? readdirSync(workDir).filter((f) => /^frame-.*\.png$/.test(f)) : [];
    const of = (t) => files.find((f) => Math.abs(Number(/-at-([\d.]+)s\.png$/.exec(f)?.[1]) - t) < 0.006);
    const [a, b] = at.map(of);
    if (!a || !b) throw new Error(r.exitCode !== 0 ? (r.stderrTail ?? []).join(" ").slice(0, 200) || `exit ${r.exitCode}` : "HyperFrames gave no still of the end");
    const [ga, gb] = [a, b].map((f) => grey(join(workDir, f)));
    const [sa, sb] = [ga, gb].map((g) => greyStats(g.px));
    return { at, ...endVerdict(sa.contrast, sb.contrast, { light: [sa.light, sb.light], change: greyChange(ga, gb) }) };
  } finally { rmSync(workDir, { recursive: true, force: true }); }
}

/** The Tech checks entry: one finding, naming the time, when the film ends on a hard cut. own: the style author's ending stands (the
 *  plan names it and its last shot plays it: hf-edit/ending.mjs filmEnding), so a held end card ends the film too; author: that ending. */
export function endingGate(r, { own = false, author = null, error = null, shot = null } = {}) {
  if (!r) return { id: "G-END", blocking: false, pass: true, findings: [], skipped: error ? `Not measured: ${error}` : undefined };
  const ended = r.faded || (own && r.held);
  return { id: "G-END", blocking: false, pass: ended, warnings: ended ? 0 : 1,
    findings: ended ? [] : [{ shot, from: r.at[0], to: r.at[1], before: r.before, last: r.last, ...(r.light ? { light: r.light } : {}), ...(r.change != null ? { change: r.change } : {}),
      message: own
        ? `The film stops dead at ${r.at[1]} s: the author's ending${author ? ` (${author})` : ""} does not show. The last frame is as lit as half a second before and still moving. End the last shot on it (dark, a dot, a held end card), or fade the picture out with the music (house rules §9).`
        : `The film stops dead: its last frame (${r.at[1]} s) is as full as half a second before. Fade the picture out with the music over the ending's fade (house rules §9).` }] };
}
