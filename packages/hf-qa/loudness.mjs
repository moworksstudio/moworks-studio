// Loudness of a rendered film (the whole mix -16 LUFS integrated, true peak at most -1 dBTP), measured
// on the MP4 with FFmpeg's EBU R128 filter. A film with no sound has nothing to measure.
import { execFile } from "node:child_process";
import { renameSync, rmSync } from "node:fs";
import { promisify } from "node:util";
import { ffmpegExe } from "../library/preview-media.mjs";

const run = promisify(execFile);
export const TARGET = { lufs: -16, tolerance: 2, peak: -1 };

/** { lufs, truePeak, lra, ok, notes: [] } or { silent: true } when the file has no audio stream. */
export async function loudness(file, { root, target = TARGET } = {}) {
  let stderr;
  try {
    ({ stderr } = await run(ffmpegExe(root), ["-hide_banner", "-nostats", "-i", file, "-map", "0:a:0?", "-af", "ebur128=peak=true", "-f", "null", "-"],
      { windowsHide: true, maxBuffer: 64 << 20, timeout: 600000 }));
  } catch (e) { stderr = e.stderr ?? ""; if (!/Summary:/.test(stderr)) throw e; }
  const sum = stderr.slice(stderr.lastIndexOf("Summary:"));
  if (!/Summary:/.test(stderr)) return { silent: true };
  const num = (re) => { const m = re.exec(sum); return m ? Number(m[1]) : null; };
  const lufs = num(/I:\s*(-?[\d.]+|-inf)\s*LUFS/), truePeak = num(/Peak:\s*(-?[\d.]+|-inf)\s*dBFS/), lra = num(/LRA:\s*(-?[\d.]+)\s*LU/);
  if (lufs == null || !Number.isFinite(lufs) || lufs < -70) return { silent: true };
  const notes = [];
  if (Math.abs(lufs - target.lufs) > target.tolerance) notes.push(`${lufs > target.lufs ? "louder" : "quieter"} than ${target.lufs} LUFS`);
  if (truePeak != null && truePeak > target.peak + 0.1) notes.push(`true peak above ${target.peak} dBTP`);
  return { lufs, truePeak, lra, ok: notes.length === 0, notes, target };
}

/** The master's loudness set to the rule, the way HyperFrames' media-use skill does publish loudness (two-pass `loudnorm`, measured values
 *  fed back, linear when it can stay linear): -16 LUFS / true peak -1 dBTP, or -14 LUFS when the client asks. (The retired kit's -4 dBTP
 *  ceiling made a peaky mix land quieter: -17.2 LUFS on one film.) The video stream is
 *  copied untouched; the file is replaced only when the new one is written. Returns { applied, target, measured } or { silent: true }. */
export const MASTER = { kit: { lufs: -16, tp: -1, lra: 11 }, loud: { lufs: -14, tp: -1, lra: 11 } };
export async function masterLoudness(file, { target = MASTER.kit, root } = {}) {
  const ff = ffmpegExe(root);
  const af = (I, tp) => `loudnorm=I=${I}:TP=${tp}:LRA=${target.lra}`;
  let first;
  try { first = await run(ff, ["-hide_banner", "-nostats", "-i", file, "-map", "0:a:0?", "-af", `${af(target.lufs, target.tp)}:print_format=json`, "-f", "null", "-"], { windowsHide: true, maxBuffer: 64 << 20, timeout: 600000 }); }
  catch (e) { first = { stderr: e.stderr ?? "" }; }
  const js = /\{[^{}]*"input_i"[^{}]*\}/.exec(first.stderr ?? "");
  if (!js) return { silent: true };
  const m = JSON.parse(js[0]);
  if (!Number.isFinite(Number(m.input_i)) || Number(m.input_i) < -70) return { silent: true };
  // Closed loop (a linear pass left a spiky mix at -17.3 LUFS with peaks at -3.9 dBTP, the AAC re-encode adding to them). Each attempt is
  // written from the untouched source, then measured as the user's file will be; the next one corrects the loudness it missed and leaves
  // more headroom when the peak went over. The first is HyperFrames' linear two-pass; the others let loudnorm limit (dynamic) so a peaky mix
  // can still reach the target. The best attempt that meets both numbers wins; else the closest to them.
  const rate = Number(/Audio:[^\n]*?(\d{4,6}) Hz/.exec(first.stderr ?? "")?.[1]) || 48000;
  const tolerance = 0.5, goal = { lufs: target.lufs, tolerance, peak: target.tp - 0.1 };          // loudness() allows 0.1 dB over its peak: not here, "at most -1" means under it
  const score = (r) => Math.abs(r.lufs - target.lufs) + Math.max(0, r.truePeak - target.tp) * 3;
  let I = target.lufs, tp = target.tp - 0.3, best = null;
  const attempts = [];
  for (let i = 0; i < 4; i++) {
    const tmp = file.replace(/(\.[^.]+)$/, `.master${i}$1`);
    const filter = i === 0
      ? `${af(I, tp)}:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true`
      : `${af(I, tp)}:linear=false`;
    // -ar: loudnorm resamples to 192 kHz; encoding that back to AAC without a rate raised the true peak by 2-3 dB (the real cause of the quiet result)
    await run(ff, ["-v", "error", "-y", "-i", file, "-map", "0", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-ar", String(rate), "-af", filter, "-movflags", "+faststart", tmp],
      { windowsHide: true, maxBuffer: 16 << 20, timeout: 900000 });
    const r = await loudness(tmp, { root, target: goal });
    if (r.silent) { rmSync(tmp, { force: true }); break; }
    attempts.push({ I: Math.round(I * 10) / 10, tp: Math.round(tp * 10) / 10, lufs: r.lufs, truePeak: r.truePeak });
    const mine = { tmp, ...r, score: score(r) };
    if (!best || mine.score < best.score) { if (best) rmSync(best.tmp, { force: true }); best = mine; } else rmSync(tmp, { force: true });
    if (r.ok) break;
    I = Math.max(target.lufs - 8, Math.min(target.lufs + 8, I + (target.lufs - r.lufs)));
    tp = Math.max(-9, tp - Math.max(0.3, r.truePeak - target.tp + 0.3));
  }
  if (!best) return { silent: true };
  rmSync(file, { force: true }); renameSync(best.tmp, file);
  return { applied: true, target, met: best.ok, attempts, measured: { lufs: Number(m.input_i), truePeak: Number(m.input_tp) }, result: { lufs: best.lufs, truePeak: best.truePeak } };
}
