// Still stretches (config/rules/moworks-alive): the app measures where the film's objects hold still. HyperFrames' stills
// every 0.25 s (or a rendered video's frames at the same rate), 640 px grey, in 20 px blocks. Each block that can show a move (corners or
// texture) is compared with itself as it was when it last moved; a shift of up to 2 px at 640 (about 6 px at 1920: the tame ±3 px drift
// the eye does not read as motion) does not count, nor does film grain. A stretch is held while a good part of those blocks (STILL.share)
// have not moved for more than 2 s: panes that land and freeze while a spark runs along a line count as held. The stretch that reaches the
// end of the film is the final hold (allowed). A warning in Tech checks and a block of the Review's QC round, never a render stop.
import { execFile } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { promisify } from "node:util";
import { againIfBusy, snapshotAtAsync, STILL_IDLE_MS } from "./cli.mjs";
import { ffmpegExe } from "../library/preview-media.mjs";

const run = promisify(execFile);
const r2 = (n) => Math.round(n * 100) / 100;
/** limit: 2 s; strong: the strong dynamic level's 1 s (moworks-alive §2); long: the pictures' long side; shift: the drift
 *  that does not count (px at `long`); level: a block's mean difference (0-255) that is a change; share/minBlocks: how much of what can
 *  show a move must hold for the picture to hold. Tuned on the showcase film (its panes hold at 7-9 s) against lively films. */
export const STILL = { limit: 2, strong: 1, step: 0.25, maxStills: 240, batch: 80, long: 640, block: 20, shift: 2, level: 8, share: 0.25, minBlocks: 4 };

/** A picture's or video's size, from ffmpeg's own description of it. */
async function sizeOf(file) {
  const out = await run(ffmpegExe(), ["-hide_banner", "-i", file], { windowsHide: true }).catch((e) => e);
  const m = /Video:.*?, (\d{2,5})x(\d{2,5})/.exec(String(out.stderr ?? ""));
  return m ? { w: Number(m[1]), h: Number(m[2]) } : null;
}

/** Grey pixels at most `long` px on the long side: { w, h, frames: [Uint8Array] }. `input` is a video (sampled at `fps`) or a list of pictures. */
export async function greyFrames(input, { fps = 1 / STILL.step, long = STILL.long, workDir = null } = {}) {
  const files = Array.isArray(input) ? input : null;
  if (files && !files.length) return { w: 0, h: 0, frames: [] };
  const size = await sizeOf(files ? files[0] : input);
  if (!size) throw new Error("could not read the picture size");
  const k = Math.min(1, long / Math.max(size.w, size.h)), w = Math.max(2, Math.round(size.w * k / 2) * 2), h = Math.max(2, Math.round(size.h * k / 2) * 2);
  let args;
  if (files) {
    const list = join(workDir, "stills.txt");
    writeFileSync(list, files.map((f) => `file '${f.replace(/\\/g, "/").replace(/'/g, "'\\''")}'`).join("\n") + "\n");
    args = ["-v", "error", "-f", "concat", "-safe", "0", "-i", list, "-fps_mode", "passthrough", "-vf", `scale=${w}:${h}:flags=area,format=gray`, "-f", "rawvideo", "-"];
  } else args = ["-v", "error", "-i", input, "-an", "-vf", `fps=${fps},scale=${w}:${h}:flags=area,format=gray`, "-f", "rawvideo", "-"];
  const { stdout } = await run(ffmpegExe(), args, { windowsHide: true, encoding: "buffer", maxBuffer: 1 << 30, timeout: 300000 });
  const n = Math.floor(stdout.length / (w * h));
  return { w, h, frames: Array.from({ length: n }, (_, i) => stdout.subarray(i * w * h, (i + 1) * w * h)) };
}

// ---- Cuts like a slideshow (owner 06/11/2026 #1244; the idea of anidoodle's tools/motionscan.mjs "slidecut", Alex Greenshpun, Apache-2.0,
// written here): a still picture replaced at once by another still picture, with nothing moving for about a second on either side. One such
// cut is a choice (a title card, the twist); SLIDES_MIN of them in one film read as a slide deck however well each card is drawn
export const SLIDE = Object.freeze({ cut: 0.55, still: 0.03, around: 4, block: 16, level: 14 });
export const SLIDES_MIN = 3;
/** The share of the picture's blocks whose mean grey changed by more than SLIDE.level from frame a to frame b (0-1). */
function changed(a, b, w, h, { block = SLIDE.block, level = SLIDE.level } = {}) {
  let n = 0, hit = 0;
  for (let y0 = 0; y0 + block <= h; y0 += block) for (let x0 = 0; x0 + block <= w; x0 += block) {
    let d = 0;
    for (let y = y0; y < y0 + block; y++) for (let x = x0, o = y * w + x; x < x0 + block; x++, o++) d += a[o] - b[o];
    n++; if (Math.abs(d) / (block * block) > level) hit++;
  }
  return n ? hit / n : 0;
}
/** The times (s) of the cuts that replace one still picture by another: frames every `step` s. */
export function slideCuts(frames, times, w, h, opts = {}) {
  const S = { ...SLIDE, ...opts }, ch = [];
  for (let i = 1; i < frames.length; i++) ch.push(changed(frames[i - 1], frames[i], w, h, S));
  const out = [];
  for (let i = 0; i < ch.length; i++) {
    if (ch[i] < S.cut) continue;
    const before = ch.slice(Math.max(0, i - S.around), i), after = ch.slice(i + 1, i + 1 + S.around);
    if (before.length < S.around || after.length < S.around) continue;          // the film's first and last second
    if (before.every((c) => c < S.still) && after.every((c) => c < S.still)) out.push(times[i + 1]);
  }
  return out;
}

/** Can this block show a move? Only blocks with corners or texture can: one that changes when shifted by `shift` + 1 px both across and
 *  down (a plain edge looks the same along itself, a flat patch everywhere). */
function trackable(a, w, h, x0, y0, { block = STILL.block, level = STILL.level, shift = STILL.shift } = {}) {
  const T = shift + 1, N = block * block;
  if (x0 + T + block > w || y0 + T + block > h) return false;
  let dx = 0, dy = 0;
  for (let y = y0; y < y0 + block; y++) for (let x = x0, o = y * w + x; x < x0 + block; x++, o++) {
    const p = a[o], q = a[o + T], r = a[o + T * w];
    dx += p > q ? p - q : q - p; dy += p > r ? p - r : r - p;
  }
  return Math.min(dx, dy) / N > level * 1.5;
}

/** Did this block visibly move from `a` to `b`? Not when a shift of up to `shift` px makes it match again within `level` (a mean, 0-255);
 *  a bigger move, a change of what is in it (typing, a fade, something arriving) or of its light is a move. */
function blockMoved(a, b, w, h, x0, y0, { block = STILL.block, level = STILL.level, shift = STILL.shift } = {}) {
  const N = block * block;
  let best = Infinity;
  for (let dy = -shift; dy <= shift && best > level; dy++) for (let dx = -shift; dx <= shift && best > level; dx++) {
    if (x0 + dx < 0 || y0 + dy < 0 || x0 + dx + block > w || y0 + dy + block > h) continue;
    let d = 0;
    const cap = Math.min(best, level * 4) * N;
    for (let y = y0; y < y0 + block && d <= cap; y++) for (let x = x0, o = y * w + x, o2 = (y + dy) * w + x + dx; x < x0 + block; x++, o++, o2++) { const p = a[o2], q = b[o]; d += p > q ? p - q : q - p; }
    best = Math.min(best, d / N);
  }
  return best > level;
}

/** Each block's time since it last visibly moved, picture by picture: { bx, by, timeline: [{ t, ages: Float32Array }] } (-1: a block
 *  that cannot show a move). A block is compared with itself as it was when it last moved, so a slow drift adds up until it shows. */
export function blockAges(frames, times, w, h, opts = {}) {
  const block = opts.block ?? STILL.block, bx = Math.floor(w / block), by = Math.floor(h / block);
  const anchor = new Int32Array(bx * by), timeline = [];
  for (let k = 0; k < frames.length; k++) {
    const ages = new Float32Array(bx * by);
    for (let j = 0; j < by; j++) for (let i = 0; i < bx; i++) {
      const n = j * bx + i, x0 = i * block, y0 = j * block;
      if (k > 0 && blockMoved(frames[anchor[n]], frames[k], w, h, x0, y0, opts)) anchor[n] = k;
      ages[n] = trackable(frames[k], w, h, x0, y0, opts) ? times[k] - times[anchor[n]] : -1;
    }
    timeline.push({ t: times[k], ages });
  }
  return { bx, by, timeline };
}

const ROWS = ["top", "middle", "bottom"], COLS = ["left", "centre", "right"];
/** Where the held blocks are, in words: the ninths of the frame that hold a good part of them ("top left", "centre"…). */
function whereHeld(ages, bx, by, minAge) {
  const count = new Array(9).fill(0);
  let all = 0;
  for (let j = 0; j < by; j++) for (let i = 0; i < bx; i++) if (ages[j * bx + i] >= minAge - 1e-6) { count[Math.min(2, Math.floor(3 * j / by)) * 3 + Math.min(2, Math.floor(3 * i / bx))]++; all++; }
  return count.map((c, n) => ({ c, n })).filter((x) => x.c >= Math.max(2, all * 0.12)).sort((a, b) => b.c - a.c)
    .map(({ n }) => (n === 4 ? "centre" : `${ROWS[Math.floor(n / 3)]} ${COLS[n % 3]}`));
}

/** The held stretches: where at least `share` of the blocks that can show a move (and `minBlocks` of them) have not moved for `minAge` s.
 *  A stretch starts when those blocks last moved (its first picture's time minus `minAge`): [{ from, to, share, where }]. */
export function heldRuns({ bx, by, timeline }, { minAge = STILL.limit, share = STILL.share, minBlocks = STILL.minBlocks } = {}) {
  const runs = [];
  let cur = null;
  for (const { t, ages } of timeline) {
    let can = 0, held = 0;
    for (const a of ages) if (a >= 0) { can++; if (a >= minAge - 1e-6) held++; }
    const on = can > 0 && held >= minBlocks && held / can >= share;
    if (on && !cur) cur = { from: Math.max(0, t - minAge), to: t, share: held / can, ages };
    else if (on) { cur.to = t; if (held / can >= cur.share) { cur.share = held / can; cur.ages = ages; } }
    else if (cur) { runs.push(cur); cur = null; }
  }
  if (cur) runs.push(cur);
  return runs.map(({ ages, ...x }) => ({ ...x, where: whereHeld(ages, bx, by, minAge) }));
}

/** The shot a stretch belongs to: the one it overlaps most. */
function shotOf(shots, from, to) {
  let best = null, over = -Infinity;
  for (const s of shots ?? []) {
    if (s.start == null || !s.duration) continue;
    const o = Math.min(to, s.start + s.duration) - Math.max(from, s.start);
    if (o > over) { best = s; over = o; }
  }
  return over > 0 ? best : null;
}

/** The measured film as the check reports it: the held stretches over 2 s (the final hold apart), the 1-2 s ones for a strong film, and
 *  the final hold, each with its shot and where in the frame. */
export function stillReport(ages, { shots = [], total = null, step = STILL.step, dynamic = null, nearLimit = null, nearWhy = null, source = "stills", measured = 0, tune = {} } = {}) {
  const end = total ?? ages.timeline.at(-1)?.t ?? 0;
  const item = (x) => { const s = shotOf(shots, x.from, x.to); return { from: r2(x.from), to: r2(x.to), seconds: r2(x.to - x.from), shot: s?.number ?? null, title: s?.title ?? null, held: r2(x.share), where: x.where }; };
  const atEnd = (x) => x.to >= end - step - 0.011;
  const over = heldRuns(ages, { ...tune, minAge: STILL.limit }).filter((x) => x.to - x.from > STILL.limit + 1e-6);
  const final = over.find(atEnd) ?? null;
  const strong = String(dynamic ?? "").toLowerCase() === "strong";
  // a strong film: the stretches held for more than 1 s that never reach 2 s
  const nearAt = nearLimit ?? STILL.strong;          // a lyrics video: 0.5 s (lyric-video.md)
  const near = strong || nearLimit ? heldRuns(ages, { ...tune, minAge: nearAt }).filter((x) => x.to - x.from > nearAt + 1e-6 && !atEnd(x)
    && !over.some((o) => o.from < x.to && x.from < o.to)) : [];
  return { source, step, limit: STILL.limit, dynamic: dynamic ?? null, measured, ...(nearLimit ? { nearLimit, nearWhy: nearWhy ?? "a lyrics video allows" } : {}),
    stretches: over.filter((x) => x !== final).map(item), near: near.map(item), finalHold: final ? item(final) : null };
}

/** The film's held stretches from HyperFrames' stills every `step` s (in batches; the stills are deleted after). */
export async function measureStills(dir, { shots = [], total, dynamic = null, nearLimit = null, nearWhy = null, signal = null, workDir, step = STILL.step, snap = snapshotAtAsync, pauseMs = 3000 } = {}) {
  const st = Math.max(step, (total || 0) / STILL.maxStills);
  const times = [];
  for (let t = 0; t < total - 0.02 - 1e-6; t += st) times.push(r2(t));
  times.push(r2(Math.max(0, total - 0.02)));
  rmSync(workDir, { recursive: true, force: true }); mkdirSync(workDir, { recursive: true });
  const files = [], failed = [];
  try {
    for (let b = 0; b < times.length; b += STILL.batch) {
      if (signal?.aborted) throw Object.assign(new Error("stopped"), { code: "CANCELLED" });
      const ts = times.slice(b, b + STILL.batch), out = join(workDir, `b${b}`);
      const got = () => (existsSync(out) ? readdirSync(out) : []).filter((f) => /^frame-.*\.png$/.test(f));
      // a batch that gives nothing while HF's history is held runs once more; one that stops giving stills ends after 2 min
      const r = await againIfBusy(() => snap(dir, ts, out, { signal, idleMs: STILL_IDLE_MS }), () => !got().length, { pauseMs });
      const byT = new Map(got().map((f) => [Number(/-at-([\d.]+)s\.png$/.exec(f)?.[1]), join(out, f)]));
      for (const t of ts) { const f = byT.get(t) ?? [...byT].find(([k]) => Math.abs(k - t) < 0.006)?.[1]; if (f) files.push({ t, f }); }
      if (r.exitCode !== 0) failed.push((r.idle ? "HyperFrames took no new still for 2 min" : r.stderrTail.filter((l) => l && l.trim() && !/Snapshots were not recorded/i.test(l)).join(" ")).slice(0, 200) || `exit ${r.exitCode}`);
    }
    const g = await greyFrames(files.map((x) => x.f), { workDir });
    const kept = files.slice(0, g.frames.length);
    const report = stillReport(blockAges(g.frames, kept.map((x) => x.t), g.w, g.h), { shots, total, step: st, dynamic, nearLimit, nearWhy, source: "stills", measured: kept.length });
    report.slides = slideCuts(g.frames, kept.map((x) => x.t), g.w, g.h);
    return { ...report, ...(failed.length || kept.length < times.length ? { failed: failed.length ? failed : [`${kept.length} of ${times.length} stills`] } : {}) };
  } finally { rmSync(workDir, { recursive: true, force: true }); }
}

/** The same from a rendered video (its frames every `step` s). `tune` overrides STILL's measuring numbers (calibration). */
export async function measureVideo(file, { shots = [], total = null, dynamic = null, step = STILL.step, tune = {} } = {}) {
  const g = await greyFrames(file, { fps: 1 / step, long: tune.long ?? STILL.long });
  const times = g.frames.map((_, i) => r2(i * step));
  const report = stillReport(blockAges(g.frames, times, g.w, g.h, tune), { shots, total: total ?? (times.length ? times.at(-1) : 0), step, dynamic, source: "video", measured: g.frames.length, tune });
  report.slides = slideCuts(g.frames, times, g.w, g.h);
  return report;
}

const where = (x) => `${x.shot != null ? `shot ${x.shot}${x.title ? ` "${x.title}"` : ""}: ` : ""}${x.from}–${x.to} s`;
const what = (x) => x.held >= 0.9 ? "the whole picture holds still" : `${Math.round(x.held * 100)} % of what can move holds still${x.where?.length ? `, mostly ${x.where.join(", ")}` : ""}`;

/** The block of the Review's QC round (Claude reads it; moworks-alive §3). */
export function stillLines(r) {
  if (!r) return [];
  const lines = [`Held stretches (the app's measured check, moworks-alive): ${r.source === "video" ? "the render's frames" : "stills"} every ${r.step} s; held = at least ${Math.round(STILL.share * 100)} % of the picture's objects do not move visibly (a drift of about ±3 px or a slight tilt does not count).`];
  if (r.stretches.length) for (const x of r.stretches) lines.push(`- Over ${r.limit} s: ${where(x)}, ${x.seconds} s held (${what(x)}). Give those objects, the background and the camera a visible slow movement there (moworks-alive §2).`);
  else lines.push(`- None over ${r.limit} s.`);
  for (const x of r.near) lines.push(`- ${r.nearLimit ?? STILL.strong}-${r.limit} s (${r.nearLimit ? r.nearWhy ?? "a lyrics video allows" : "the strong level allows"} ${r.nearLimit ?? STILL.strong} s at most${r.nearLimit && (r.nearWhy ?? "a lyrics video allows") === "a lyrics video allows" ? ", words while read apart" : ""}): ${where(x)}, ${x.seconds} s (${what(x)}).`);
  if (r.finalHold) lines.push(`- Final hold: ${r.finalHold.seconds} s (${r.finalHold.from}–${r.finalHold.to} s), allowed.`);
  if (r.failed) lines.push(`- Not every still could be taken: ${r.failed.join("; ")}`);
  return lines;
}

/** The Tech checks entry (a heuristic warning, never blocking): one finding per held stretch over the limit. */
export function stillGate(r, error = null) {
  if (!r) return { id: "G-STILL", blocking: false, pass: true, findings: [], skipped: error ? `Not measured: ${error}` : undefined };
  const slides = (r.slides ?? []).length >= SLIDES_MIN ? r.slides : [];
  const slideFinding = slides.length ? [{ code: "slides", time: slides[0], count: slides.length,
    message: `${slides.length} cuts read like a slideshow (${slides.slice(0, 5).map((t) => `${t} s`).join(", ")}${slides.length > 5 ? "…" : ""}): a still picture is replaced at once by another still picture. Carry a movement across the cut (a push, a move that continues, an object that travels into the next shot), as the storyboard's frames carry something from the one before.` }] : [];
  // a film with a limit of its own (a lyrics video, the film style's: stillLimit): what holds past it is said too, as the Review says it (audit/112b b1.6)
  const own = r.nearLimit ? (r.near ?? []).map((x) => ({ shot: x.shot, from: x.from, to: x.to, seconds: x.seconds, held: x.held, where: x.where,
    message: `Held still for ${x.seconds} s (${x.from}–${x.to} s): ${what(x)}; ${r.nearWhy ?? "a lyrics video allows"} ${r.nearLimit} s at most.` })) : [];
  return { id: "G-STILL", blocking: false, pass: r.stretches.length === 0 && !slides.length && !own.length, warnings: r.stretches.length + slideFinding.length + own.length,
    findings: [...r.stretches.map((x) => ({ shot: x.shot, from: x.from, to: x.to, seconds: x.seconds, held: x.held, where: x.where,
      message: `Held still for ${x.seconds} s (${x.from}–${x.to} s): ${what(x)}. Nothing should hold still for more than ${r.limit} s, except the final hold.` })), ...own, ...slideFinding],
    finalHold: r.finalHold };
}
