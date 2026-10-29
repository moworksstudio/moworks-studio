// The ending check (config/rules/moworks-studio §9, owner 29/10/2026: no film stops dead). HyperFrames' stills half a second before the end
// and on the last frame (the end less 0.02 s, as the still stretches take it), each measured by its contrast (the spread of its grey levels,
// gates.mjs stillStd). The film fades out when its last frame is flat (a fade to black, white or the background) or kept at most a third of
// the contrast it had half a second before; a last frame still as full as before is a hard cut. A warning in Tech checks, never a block,
// said only when it fails; a style whose author gives its own ending (style-catalog traits: ownEnding) keeps it and is not measured.
import { existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { snapshotAtAsync } from "./cli.mjs";
import { stillStd } from "./gates.mjs";

/** before: how long before the end the earlier still is taken; flat: a contrast that is a plain picture; ratio: the share of the earlier
 *  contrast the last frame may keep and still read as faded. */
export const END = { before: 0.5, last: 0.02, flat: 3, ratio: 0.35 };
const r2 = (n) => Math.round(n * 100) / 100;

/** Did the film fade out? From the two stills' contrast: { faded, before, last }. */
export function endVerdict(before, last) {
  const b = Number(before), l = Number(last);
  return { faded: l <= END.flat || b <= END.flat || l <= b * END.ratio, before: r2(b), last: r2(l) };
}

/** The film's ending measured from HyperFrames' stills: { at: [t1, t2], faded, before, last } (the stills are deleted after). */
export async function measureEnding(dir, { total, signal = null, workDir, snap = snapshotAtAsync, std = stillStd } = {}) {
  const at = [r2(Math.max(0, total - END.before)), r2(Math.max(0, total - END.last))];
  rmSync(workDir, { recursive: true, force: true }); mkdirSync(workDir, { recursive: true });
  try {
    const r = await snap(dir, at, workDir, { signal });
    const files = existsSync(workDir) ? readdirSync(workDir).filter((f) => /^frame-.*\.png$/.test(f)) : [];
    const of = (t) => files.find((f) => Math.abs(Number(/-at-([\d.]+)s\.png$/.exec(f)?.[1]) - t) < 0.006);
    const [a, b] = at.map(of);
    if (!a || !b) throw new Error(r.exitCode !== 0 ? (r.stderrTail ?? []).join(" ").slice(0, 200) || `exit ${r.exitCode}` : "HyperFrames gave no still of the end");
    return { at, ...endVerdict(std(join(workDir, a)), std(join(workDir, b))) };
  } finally { rmSync(workDir, { recursive: true, force: true }); }
}

/** The Tech checks entry: one finding when the film ends on a hard cut. */
export function endingGate(r, { own = false, error = null, shot = null } = {}) {
  if (own) return { id: "G-END", blocking: false, pass: true, findings: [], skipped: "The film style's author gives its own ending: kept as shipped" };
  if (!r) return { id: "G-END", blocking: false, pass: true, findings: [], skipped: error ? `Not measured: ${error}` : undefined };
  return { id: "G-END", blocking: false, pass: r.faded, warnings: r.faded ? 0 : 1,
    findings: r.faded ? [] : [{ shot, from: r.at[0], to: r.at[1], before: r.before, last: r.last,
      message: `The film stops dead: its last frame (${r.at[1]} s) is as full as half a second before. Fade the picture out with the music over the ending's fade (house rules §9).` }] };
}
