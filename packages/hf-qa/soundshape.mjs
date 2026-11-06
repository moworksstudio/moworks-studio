// The sound from start to end (owner 06/11/2026 #1244; the idea of anidoodle's tools/filmshape.mjs, Alex Greenshpun, Apache-2.0, written
// here): a finished film's sound starts with its picture, never drops out in the middle, and lasts to the film's end. Read from the render of
// the film as it is (the preview), in 100 ms blocks against the mix's own body (the median of its sounding blocks), so a quiet film and a
// loud one are judged alike. A room tone or a quiet bed is sound: only near silence (BODY_DROP dB under the body) counts as none. A warning.
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { freshRender } from "../moworks-styles/cuts.mjs";
import { ffmpegExe } from "../library/preview-media.mjs";

const run = promisify(execFile);
export const BLOCK_S = 0.1, BODY_DROP = 35, START_S = 0.6, GAP_S = 1.5, END_S = 1.5;

/** The RMS level of each 100 ms block of a file's sound (dBFS; -120 for silence), or null when it has none. */
export async function soundBlocks(file) {
  const { stdout } = await run(ffmpegExe(), ["-hide_banner", "-nostats", "-i", file, "-vn", "-map", "0:a:0?", "-af",
    `aresample=8000,pan=mono|c0=0.5*c0+0.5*c1,asetnsamples=n=${Math.round(8000 * BLOCK_S)}:p=0,astats=metadata=1:reset=1,ametadata=print:key=lavfi.astats.Overall.RMS_level:file=-`, "-f", "null", "-"],
    { windowsHide: true, maxBuffer: 256 << 20, timeout: 300000 }).catch(async () => run(ffmpegExe(), ["-hide_banner", "-nostats", "-i", file, "-vn", "-map", "0:a:0?", "-af",
      `aresample=8000,asetnsamples=n=${Math.round(8000 * BLOCK_S)}:p=0,astats=metadata=1:reset=1,ametadata=print:key=lavfi.astats.Overall.RMS_level:file=-`, "-f", "null", "-"],
      { windowsHide: true, maxBuffer: 256 << 20, timeout: 300000 }));
  const v = [...stdout.matchAll(/RMS_level=(-?[\d.]+|-inf)/g)].map((m) => (m[1] === "-inf" ? -120 : Number(m[1])));
  return v.length ? v : null;
}

/** What is wrong with a film's sound shape: { body, problems: [{ code, at, to?, message }] } from its blocks (dBFS each). */
export function shapeOf(blocks, { total = blocks.length * BLOCK_S } = {}) {
  const sounding = blocks.filter((x) => x > -70).sort((a, b) => a - b);
  if (!sounding.length) return { body: null, problems: [] };
  const body = sounding[Math.floor(sounding.length / 2)], floor = body - BODY_DROP;
  const on = blocks.map((x) => x > floor), first = on.indexOf(true), last = on.lastIndexOf(true);
  const t = (i) => Math.round(i * BLOCK_S * 10) / 10, problems = [];
  if (first * BLOCK_S > START_S) problems.push({ code: "late", at: t(first), message: `The sound starts at ${t(first)} s, after the picture: the film opens silent.` });
  const endAt = (last + 1) * BLOCK_S;
  if (total - endAt > END_S) problems.push({ code: "early", at: t(last + 1), message: `The sound stops at ${t(last + 1)} s and the film runs on to ${t(total / BLOCK_S)} s in silence: let the music or the room run to the end, fading with the picture.` });
  for (let i = first, run0 = -1; i <= last; i++) {
    if (!on[i] && run0 < 0) run0 = i;
    if ((on[i] || i === last) && run0 >= 0) {
      if ((i - run0) * BLOCK_S > GAP_S) problems.push({ code: "gap", at: t(run0), to: t(i), message: `The sound drops out for ${Math.round((i - run0) * BLOCK_S * 10) / 10} s at ${t(run0)} s: nothing, not even the room, is heard. Keep a bed or the room tone under it.` });
      run0 = -1;
    }
  }
  return { body, problems };
}

const GATE = "G-SOUND-SHAPE";
/** Tech checks' G-SOUND-SHAPE: "not checked" (said) before there is a render of the film as it is; else pass or one warning a problem. */
export async function gateSoundShape(projectDir, { file = null } = {}) {
  const video = file ?? await freshRender(projectDir).catch(() => null);          // the sound as it is now: the whole film's hash
  if (!video) { const why = "Waiting for the preview of the film as it is now: it is made after the Build and after each change, then this check runs.";
    return { id: GATE, blocking: false, pass: true, notChecked: true, why, findings: [{ severity: "info", code: "not_checked", message: why, plain: why }] }; }
  let blocks; try { blocks = await soundBlocks(video); } catch (e) {
    return { id: GATE, blocking: false, pass: false, notChecked: true, findings: [{ severity: "warning", code: "not_checked", message: `The render's sound could not be read: ${e.message}` }] };
  }
  if (!blocks) return { id: GATE, blocking: false, pass: true, findings: [] };          // a film with no sound: nothing to shape
  const { problems } = shapeOf(blocks);
  return { id: GATE, blocking: false, pass: problems.length === 0, warnings: problems.length,
    findings: problems.map((p) => ({ severity: "warning", code: p.code, time: p.at, message: p.message, plain: p.message })) };
}
