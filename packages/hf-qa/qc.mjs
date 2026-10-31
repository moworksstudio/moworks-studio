// The pictures and findings of the QC review (moworks-qc): the app takes HyperFrames' stills of the film and lays them out
// as three sheets per round (.moworks/qc/R<n>/; a long film takes more pages of each): beats (one settled still per shot), cuts (a strip of 4
// frames across every shot change) and phone (every shot 360 px wide), and runs HyperFrames' full check (lint, script errors, layout at every
// transition seam, the frame check, contrast, motion). Claude reads the sheets as sheets (one picture each, HF's advice: single stills cost
// the whole conversation again).
// Each round also measures the film's still stretches (stillness.mjs): Claude reads them in words.
import { copyFileSync, mkdirSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { execFile } from "node:child_process";
import { isAbsolute, join, relative, sep } from "node:path";
import { docPath } from "../project-service/docs.mjs";
import { pruneQcRaw } from "../project-service/layout.mjs";
import { promisify } from "node:util";
import { againIfBusy, runHfJsonAsync, snapOnceMore, snapshotAtAsync, STILL_IDLE_MS, STILLS_BUSY } from "./cli.mjs";
import { ffmpegExe } from "../library/preview-media.mjs";
import { measureStills, stillLines } from "./stillness.mjs";
import { freshFilm } from "../hf-edit/codeFilm.mjs";
import { dropDecorationContrast } from "./contrastDecor.mjs";
import { filmSequences, measureProduct, sequenceLines, sequenceReport } from "./sequence.mjs";
import { sungLines, sungReport } from "./lyricSync.mjs";
import { isLyricVideo } from "../style-catalog/traits.mjs";

const run = promisify(execFile);
const r2 = (n) => Math.round(n * 100) / 100;
// what one page of a sheet holds (the size the one sheet always had): a longer film takes more pages, never smaller pictures and never
// fewer shots (T28-5: a 27-shot film lost its last 3 shots and 10 cuts, where the story turns, and scored 8/10). A page costs the Review
// what its stills cost: a last page of 3 shots is one short row
export const BEATS_PAGE = 24, CUTS_PAGE = 16;
const pagesOf = (list, n) => Array.from({ length: Math.ceil(list.length / n) }, (_, i) => list.slice(i * n, (i + 1) * n));
/** A page of a sheet, as res.sheets and the round's folder name it: beats, beats-2, beats-3… */
const pageName = (kind, i) => (i ? `${kind}-${i + 1}` : kind);
/** How many pages of sheets a film of n shots takes in a round: the first round opens them all. */
export const sheetPages = (n) => (n > 0 ? 2 * Math.ceil(n / BEATS_PAGE) + Math.ceil(Math.max(0, n - 1) / CUTS_PAGE) : 0);

/** The times to take: each shot at 60 % of its length (settled), and 4 frames across each cut. Every shot and every cut of the film. */
export function qcTimes(shots, total) {
  const ss = shots.filter((s) => s.duration > 0).sort((a, b) => a.start - b.start);
  const end = total || (ss.length ? Math.max(...ss.map((s) => s.start + s.duration)) : 0);
  const beats = ss.map((s) => ({ shot: s.number, t: r2(s.start + s.duration * 0.6) }));
  const cuts = ss.slice(1).map((s) => ({ shot: s.number, at: s.start,
    ts: [-0.25, -0.08, 0.08, 0.25].map((d) => r2(Math.min(Math.max(0, s.start + d), Math.max(0, end - 0.02)))) }));
  return { beats, cuts };
}

export async function tile(files, out, { width, cols }) {
  const tmp = out + ".in";
  rmSync(tmp, { recursive: true, force: true }); mkdirSync(tmp, { recursive: true });
  files.forEach((f, i) => copyFileSync(f, join(tmp, `${String(i).padStart(3, "0")}.png`)));
  const rows = Math.ceil(files.length / cols);
  await run(ffmpegExe(), ["-v", "error", "-y", "-start_number", "0", "-i", join(tmp, "%03d.png"), "-vf", `scale=${width}:-2,tile=${cols}x${rows}:padding=6:color=0x202020`,
    "-frames:v", "1", "-q:v", "3", out], { windowsHide: true, timeout: 120000 });
  rmSync(tmp, { recursive: true, force: true });
}

/** The findings of HyperFrames' check, short, by section: { lint, runtime, layout, contrast, motion } each [{ severity, code, message, time, selector, file, fixHint }]. */
/** Words cut at the frame edge. HF reports a text rect past the canvas as canvas_overflow and raises it to a warning only
 *  when the breach is 5 % of the short edge (54 px on 1080); "THÁP ĐÀI CŨ" left the frame 25 px at 36.75 s, held to the cut, and stayed
 *  an info note nobody read. Text still partly in the frame, held across samples (a one-sample breach is HF's entrance/exit transient)
 *  and cut by 8 px or more is a warning: cut letters read as a mistake. Returns the breach in px, or 0. */
export function textCutAtEdge(x) {
  if (x?.code !== "canvas_overflow" || !String(x.text ?? "").trim() || !((x.heldMs ?? 0) > 0) || !x.rect || !x.containerRect) return 0;
  const r = x.rect, c = x.containerRect;
  if (r.right <= c.left || r.left >= c.right || r.bottom <= c.top || r.top >= c.bottom) return 0;           // fully outside: parked
  const breach = Math.max(0, ...Object.values(x.overflow ?? {}).filter((v) => typeof v === "number"));
  return breach >= 8 ? Math.round(breach) : 0;
}
const edgeWords = (x) => {
  const cut = textCutAtEdge(x);
  if (!cut) return null;
  const side = Object.entries(x.overflow).sort((a, b) => b[1] - a[1])[0][0];
  return { severity: "warning", message: `Words cut at the frame's ${side} edge: "${String(x.text).trim().slice(0, 80)}" ${cut} px out, ${x.firstSeen ?? x.time}-${x.lastSeen ?? x.time} s` };
};

export function checkFindings(j, dir) {
  const pick = (sec) => (j?.[sec]?.findings ?? []).map((x) => ({ ...x, ...(sec === "layout" ? edgeWords(x) : null) })).map((x) => ({ severity: x.severity, code: x.code, message: String(x.message ?? "").slice(0, 240), time: x.time ?? null,
    selector: x.selector ?? null, ...(String(x.text ?? "").trim() ? { text: String(x.text).trim().slice(0, 80) } : {}), file: x.sourceFile ? (isAbsolute(x.sourceFile) ? relative(dir, x.sourceFile) : x.sourceFile).split(sep).join("/") : undefined, fixHint: x.fixHint ? String(x.fixHint).slice(0, 200) : undefined,
    ...(sec === "contrast" ? { ratio: x.ratio, required: x.requiredRatio, fg: x.fg, bg: x.bg, suggested: x.suggestedColor } : {}) }));
  return Object.fromEntries(["lint", "runtime", "layout", "contrast", "motion"].map((s) => [s, pick(s)]));
}
/** The check arguments the app uses everywhere (QA and QC): transition seams sampled, the frame check on. */
export const CHECK_ARGS = ["--at-transitions", "--frame-check"];
/** The same check at HF's regular sample points only: the retry when the seams do not fit in HF's budget. */
export const CHECK_ARGS_PLAIN = ["--frame-check"];

/** HF's check stops after a fixed 120 s (cli/src/utils/checkDeadline.ts, not an option) and reports it as a runtime error; sampling every
 *  tween seam of a long, text-heavy film can take longer than that (6 shots took 125 s; 13 s without the seams). That is the tool's
 *  budget, not a script error in the film. */
export const ranOutOfTime = (j) => (j?.runtime?.findings ?? []).some((x) => x.code === "check_runtime_failure" && /deadline/i.test(String(x.message ?? "")));
/** The note that stands in for the seam samples the retry did not take: a layout warning, never a blocking finding. */
export const SEAMS_NOTE = { severity: "warning", code: "transition_seams_not_sampled",
  message: "HyperFrames' check ran out of its 120 s at the transition seams, so it was run again at its regular sample points: overlaps that last only during a transition were not checked." };

/** HyperFrames' check as the app runs it (`runner(args)` is runHfJson or runHfJsonAsync): with the transition seams, and when that runs out
 *  of HF's budget, once more without them. The result carries `seamsSkipped` and, in that case, the seam note among its layout findings. */
export function withSeamsFallback(runner, { samples = null } = {}) {
  const done = (r, skipped) => {
    if (skipped && r.json) r.json.layout = { ...(r.json.layout ?? {}), findings: [...(r.json.layout?.findings ?? []), SEAMS_NOTE] };
    return { ...r, seamsSkipped: skipped };
  };
  const more = samples ? ["--samples", String(samples)] : [];
  const first = runner([...CHECK_ARGS, ...more]);
  const next = (r) => (ranOutOfTime(r.json) ? Promise.resolve(runner([...CHECK_ARGS_PLAIN, ...more])).then((again) => done(again, true)) : done(r, false));
  return typeof first?.then === "function" ? first.then(next) : (ranOutOfTime(first.json) ? done(runner([...CHECK_ARGS_PLAIN, ...more]), true) : done(first, false));
}

/** HF's layout pass reads 9 points over the whole film by default (one every 5.6 s in a 50 s film): a lyric pushed out of the frame
 *  in the last 0.7 s of a shot fell between two. Two a second, 9 to 120 (100 points: 36 s against 15 s). */
export function checkSamples(dir) {
  const d = filmSeconds(dir);
  return d > 0 ? Math.min(120, Math.max(9, Math.ceil(d * 2))) : null;
}
/** The film's length in seconds (the root composition's data-duration), 0 when the page says none. */
export function filmSeconds(dir) {
  let d = 0;
  try { d = Number(/<[^>]*\bdata-composition-id="[^"]*"[^>]*\bdata-duration="([\d.]+)"/.exec(readFileSync(join(dir, "index.html"), "utf8"))?.[1]); } catch { /* no page */ }
  return d > 0 ? d : 0;
}

// ---- the quick check on a busy machine (T22: a render was blocked as "hyperframes check gave no JSON (exit null)": the CLI was stopped at
// its 5 min while the computer sat at 100 % CPU, and nobody saw it for 70 min)
/** How long a quick check's `hyperframes check` may run before it is stopped: 10 min, and 5 s more for each second of film (two layout
 *  points a second, each a seek and a measure), at most 25 min. HF's own budget is 120 s of check time; on a loaded machine the CLI's
 *  start, its browser and its seeks take several times that. */
export const checkTimeoutMs = (seconds) => Math.min(25 * 60000, 10 * 60000 + Math.max(0, Number(seconds) || 0) * 5000);
/** What the user reads when the check was stopped twice: the film is not at fault, the computer was too busy. */
export const CHECK_BUSY = "The quick check did not finish in time (the computer is busy). Try again.";
/** A check that was stopped before it answered: its time ran out (`timedOut`), or it was killed (no exit code), with no JSON. */
export const checkStopped = (r) => !r?.json && (r?.timedOut === true || r?.exitCode == null);
/** Run the check (`check()`, the seams fallback included); a run that was stopped runs once more by itself (onRetry() first). The second
 *  stopped too: the result says `busy`. A check that answered, or failed with an exit code, is kept as it is. */
export async function checkOnceMore(check, { onRetry = () => {} } = {}) {
  const r = await check();
  if (!checkStopped(r)) return r;
  onRetry();
  const again = await check();
  return { ...again, retried: true, ...(checkStopped(again) ? { busy: true } : {}) };
}

/** Why a still run gave less than asked, in words for Claude (HF's "Snapshots were not recorded: … history is open in another
 *  process" is HF's own record of its stills, not the stills; Claude read it as "the project history is busy"). */
export function stillsFailure(r, got, asked) {
  const lines = (r?.stderrTail ?? []).filter((l) => l && l.trim() && !/Snapshots were not recorded/i.test(l));
  const why = r?.idle ? `HyperFrames took no new still for ${Math.round(STILL_IDLE_MS / 60000)} min, so the run was ended` : lines.join(" ").slice(0, 300);
  return [why, `${got} of ${asked} stills`].filter(Boolean).join("; ");
}

/** The film's dynamic level from MOTION-PLAN.json ("strong", "light"…), null without one. */
export function dynamicOf(dir) {
  try { return JSON.parse(readFileSync(docPath(dir, "MOTION-PLAN.json"), "utf8")).dynamic ?? null; } catch { return null; }
}

/** A lyrics video's quota: nothing still for more than 0.5 s (moworks-alive/lyric-video.md §1). */
const LYRIC_STILL = 0.5;
const lyricFilm = (dir) => { try { return isLyricVideo(JSON.parse(readFileSync(join(dir, ".moworks", "project.json"), "utf8")), { dir }); } catch { return false; } };
/** The pictures stopped twice (STILLS_BUSY): the round is said as busy, with no sheet and no check, never as a round that worked; its
 *  folder goes (the next round takes its number). */
const busyRound = (res, out) => { rmSync(out, { recursive: true, force: true }); return { ...res, sheets: {}, busy: true, failed: [...res.failed, STILLS_BUSY] }; };
/** One QC round: { round, dir, sheets: { beats, cuts, phone }, beats, cuts, check: { ok, findings, counts }, still, failed }.
 *  Its three parts (the stills and sheets, the still-stretch measure, HyperFrames' check) read the film and write only their own folders,
 *  so they run at once when `parallel` (a 30-shot film went from 5.4 to 2.3 min a round, the same result); one after the other
 *  when the graphics card is short of memory (each part is a Chrome). The result is assembled in the serial order either way.
 *  The pictures stopped twice on a busy computer: { …, busy: true, sheets: {} } at once, the other parts ended (onRetry() before the
 *  second try). */
export async function qcRound(dir, { shots, total, signal = null, parallel = false, snap = snapshotAtAsync, hf = runHfJsonAsync, decor = dropDecorationContrast, pauseMs = 3000, onRetry = () => {} } = {}) {
  const base = join(dir, ".moworks", "qc");
  mkdirSync(base, { recursive: true });
  pruneQcRaw(dir, { keep: 0 });          // the earlier rounds' raw stills: this round is the newest now (their sheets stay)
  const n = readdirSync(base).filter((x) => /^R\d+$/.test(x)).map((x) => Number(x.slice(1))).reduce((a, b) => Math.max(a, b), 0) + 1;
  const id = `R${n}`, out = join(base, id), raw = join(out, "raw");
  mkdirSync(raw, { recursive: true });
  const { beats, cuts } = qcTimes(shots, total);
  const times = [...new Set([...beats.map((b) => b.t), ...cuts.flatMap((c) => c.ts)])].sort((a, b) => a - b);
  const rel = (f) => relative(dir, f).split(sep).join("/");
  const res = { round: id, dir: rel(out), sheets: {}, beats, cuts: cuts.map(({ shot, at }) => ({ shot, at })), failed: [] };
  // a code film's bundle from its source as it is now: the round looks at the fix Claude just made, not at the film the last task left
  //; a source that does not compile is said, and the round shows the last bundle
  const film = await freshFilm(dir);
  if (film?.error) res.failed.push(`the film's code does not compile, so these pictures show the film before your last change: ${film.error}`);
  // the pictures stopped twice (a busy computer): the other parts end at once, the round is no round (T26-5: the check ran on to its
  // 10 min and the round came back with no picture as if it had worked)
  const off = new AbortController();
  const partSignal = signal ? AbortSignal.any([signal, off.signal]) : off.signal;
  // each part returns what it adds to the round: { sheets, still, check, failed, busy }
  const pictures = async () => {
    const part = { sheets: {}, failed: [] };
    if (!times.length) return part;
    // a run that ends for no new still keeps what it took; one that gave nothing while HF's history was held runs once more; one that
    // was stopped (its limit, sized to the stills, or no new still) takes the stills it lacks once more by itself
    const stills = () => readdirSync(raw).filter((f) => /^frame-.*\.png$/.test(f));
    const r = await againIfBusy(() => snapOnceMore(snap, dir, times, raw, { signal, idleMs: STILL_IDLE_MS, onRetry }), () => !stills().length, { pauseMs });
    if (r.busy) { off.abort(); return { ...part, busy: true }; }
    const files = stills().sort();
    const byT = new Map(files.map((f) => [Number(/-at-([\d.]+)s\.png$/.exec(f)?.[1]), f]));          // HF names each still by its time
    const at = (t) => { const f = byT.get(t) ?? [...byT].find(([k]) => Math.abs(k - t) < 0.006)?.[1]; return f ? join(raw, f) : null; };
    if (r.exitCode !== 0 || files.length < times.length) part.failed.push(`snapshot: ${stillsFailure(r, files.length, times.length)}`);
    // what has its stills goes on the pages, and the answer lists only that: a cut with a frame missing would slide every row after it
    part.beats = beats.filter((b) => at(b.t)); const whole = cuts.filter((c) => c.ts.every(at));
    part.cuts = whole.map(({ shot, at: second }) => ({ shot, at: second }));
    const missed = [...beats.filter((b) => !at(b.t)).map((b) => `shot ${b.shot} at ${b.t} s`), ...cuts.filter((c) => !c.ts.every(at)).map((c) => `the cut into shot ${c.shot} at ${c.at} s`)];
    if (missed.length) part.failed.push(`not on the sheets: ${missed.join(", ")}: see them with film_frames, or name them as not seen`);
    if (!part.beats.length) part.failed.push(`no stills matched (${files.slice(0, 3).join(", ")})`);
    const sheet = async (kind, pages, opts) => {
      for (const [i, stills] of pages.entries()) {
        const name = pageName(kind, i), f = join(out, `${name}.jpg`);
        await tile(stills, f, opts);
        part.sheets[name] = rel(f);
      }
    };
    const beatPages = pagesOf(part.beats.map((b) => at(b.t)), BEATS_PAGE);
    try {
      await sheet("beats", beatPages, { width: 480, cols: 4 });
      await sheet("cuts", pagesOf(whole, CUTS_PAGE).map((p) => p.flatMap((c) => c.ts.map(at))), { width: 400, cols: 4 });
      await sheet("phone", beatPages, { width: 360, cols: 6 });
    } catch (e) { part.failed.push(`sheets: ${String(e.message).split("\n")[0]}`); }
    return part;
  };
  const stretches = async () => {
    if (!(total > 0)) return { failed: [] };
    try { return { still: await measureStills(dir, { shots, total, dynamic: dynamicOf(dir), nearLimit: lyricFilm(dir) ? LYRIC_STILL : null, signal: partSignal, workDir: join(out, "still"), snap, pauseMs }), failed: [] }; }
    catch (e) { if (signal?.aborted) throw e; return { failed: [`still stretches: ${String(e.message).split(/\r?\n/)[0]}`] }; }
  };
  const checked = async () => {
    if (off.signal.aborted) return { failed: [] };
    const c = await withSeamsFallback((args) => (off.signal.aborted ? { json: null, exitCode: null, stderrTail: [] }
      : againIfBusy(() => hf("check", dir, args, { signal: partSignal }), (x) => !x?.json, { pauseMs })), { samples: checkSamples(dir) });
    if (c.json) await decor(c.json, dir);          // HF's contrast findings on aria-hidden decoration (a sticker's outline copy) dropped
    const findings = checkFindings(c.json, dir);
    return { check: { ok: !!c.json?.ok, findings, counts: Object.fromEntries(Object.entries(findings).map(([k, v]) => [k, { errors: v.filter((x) => x.severity === "error").length, warnings: v.filter((x) => x.severity === "warning").length }])) },
      failed: c.json ? [] : [`check: no result (exit ${c.exitCode}) ${c.stderrTail.join(" ").slice(0, 200)}`] };
  };
  const sequence = async () => {
    const report = sequenceReport(dir);
    if (!report) return { failed: [] };
    try { return { sequence: { report, product: await measureProduct(dir, filmSequences(dir), { signal: partSignal }) }, failed: [] }; }
    catch (e) { if (signal?.aborted) throw e; return { sequence: { report, product: { cut: [], failed: String(e.message).split(/\r?\n/)[0] } }, failed: [] }; }
  };
  const sung = async () => {
    try { return { sung: await sungReport(dir, { signal: partSignal }), failed: [] }; }
    catch (e) { if (signal?.aborted) throw e; return { failed: [`sung words: ${String(e.message).split(/\r?\n/)[0]}`] }; }
  };
  const parts = [pictures, stretches, checked, sequence, sung];
  let done;
  if (parallel) {
    // every part runs to its end; a part that threw rejects the round as the serial run would (the first in serial order)
    const settled = await Promise.allSettled(parts.map((f) => f()));
    if (settled[0].status === "fulfilled" && settled[0].value?.busy && !signal?.aborted) return busyRound(res, out);
    const bad = settled.find((x) => x.status === "rejected");
    if (bad) throw bad.reason;
    done = settled.map((x) => x.value);
  } else {
    done = [];
    for (const f of parts) { done.push(await f()); if (done[0]?.busy) return busyRound(res, out); }
  }
  for (const part of done) {
    Object.assign(res.sheets, part.sheets ?? {});
    if (part.beats) { res.beats = part.beats; res.cuts = part.cuts; }
    if (part.still) res.still = part.still;
    if (part.check) res.check = part.check;
    if (part.sequence) res.sequence = part.sequence;
    if (part.sung) res.sung = part.sung;
    res.failed.push(...part.failed);
  }
  return res;
}

/** The round as Claude reads it (the MCP tool's answer). */
export function qcText(r, freshEyes = null) {
  const lines = [`QC round ${r.round} (pictures in ${r.dir}/).`];
  const beatPages = pagesOf(r.beats ?? [], BEATS_PAGE), cutPages = pagesOf(r.cuts ?? [], CUTS_PAGE);
  const page = (i, n) => (n > 1 ? ` ${i + 1} of ${n}` : "");
  beatPages.forEach((p, i) => { const s = r.sheets[pageName("beats", i)]; if (s) lines.push(`- beats sheet${page(i, beatPages.length)} ${s}: one settled still per shot, left to right, top to bottom: ${p.map((b) => `shot ${b.shot} @${b.t}s`).join(", ")}.`); });
  cutPages.forEach((p, i) => { const s = r.sheets[pageName("cuts", i)]; if (s) lines.push(`- cuts sheet${page(i, cutPages.length)} ${s}: one row per shot change, 4 frames (-0.25, -0.08, +0.08, +0.25 s): ${p.map((c) => `into shot ${c.shot} at ${c.at}s`).join(", ")}.`); });
  beatPages.forEach((p, i) => { const s = r.sheets[pageName("phone", i)]; if (s) lines.push(`- phone sheet${page(i, beatPages.length)} ${s}: the beats at 360 px wide, 6 per row${beatPages.length > 1 ? `: shots ${p[0].shot} to ${p.at(-1).shot}` : ""}.`); });
  if (beatPages.length > 1 || cutPages.length > 1) lines.push("Every shot and every cut is on a page. A film this long takes several pages: open them all in the first round; in a later round open only the pages with a shot you changed, the others show what you saw already.");
  const f = r.check?.findings ?? {};
  for (const sec of ["lint", "runtime", "layout", "contrast", "motion"]) {
    const all = f[sec] ?? [], xs = all.filter((x) => x.severity !== "info");          // info lines are HF's notes, not problems
    if (!xs.length) { lines.push(`HyperFrames check, ${sec}: clean${all.length ? ` (${all.length} info note(s))` : ""}.`); continue; }
    lines.push(`HyperFrames check, ${sec}: ${xs.length} finding(s):`);
    for (const x of xs.slice(0, 25)) lines.push(`  - [${x.severity}] ${x.code}${x.time != null ? ` @${x.time}s` : ""}${x.selector ? ` ${x.selector}` : ""}${x.file ? ` (${x.file})` : ""}: ${x.message}${x.ratio ? ` (ratio ${x.ratio}, needs ${x.required}; suggested ${x.suggested})` : ""}${x.fixHint ? ` Fix: ${x.fixHint}` : ""}`);
    if (xs.length > 25) lines.push(`  - … ${xs.length - 25} more`);
  }
  if (r.still) lines.push("", ...stillLines(r.still));
  if (r.sequence) lines.push("", ...sequenceLines(r.sequence.report, r.sequence.product));
  if (r.sung) lines.push("", ...sungLines(r.sung));
  if (freshEyes) lines.push("", "Fresh eyes (a second look that saw only the beats and cuts sheets, nothing else about the film):", freshEyes);
  if (r.failed.length) lines.push("", `Could not make everything: ${r.failed.join("; ")}`);
  lines.push("", "Open the sheets with Read (each is one picture), score the seven criteria, write the round to docs/QC-REVIEW.md, fix, and call qc_sheets again for the next round. To look closer at one moment, film_frames gives that frame whole, with its text, at the film's size.");
  return lines.join("\n");
}

// ---- one whole frame (T28-6: the Review had no tool for it, so it used `hyperframes keyframes --shot`, a motion debug view with guide lines
// and no HTML text, concluded the app cannot capture text, and left 18 MB of pictures in capture/ at the film's root and in its history)
/** The most frames one call takes: each picture is read into the whole conversation again. */
export const FRAMES_AT_ONCE = 6;
const FRAMES_KEEP = 2;          // this call's and the one before: the others are 2-3 MB a frame nobody reads again
/** Whole frames of the film at the given seconds, drawn as the render draws them, every word included (HF's own stills at the film's size),
 *  in .moworks/qc/frames/<n>/, out of git like the rest of .moworks/qc. { frames: [{ t, file }], asked, busy?, failed? }. */
export async function filmFrames(dir, at, { total = null, signal = null, snap = snapshotAtAsync, pauseMs = 3000 } = {}) {
  const last = total > 0 ? Math.max(0, total - 0.02) : Infinity;
  const asked = [...new Set((Array.isArray(at) ? at : [at]).map(Number).filter((t) => Number.isFinite(t) && t >= 0).map((t) => r2(Math.min(t, last))))].sort((a, b) => a - b);
  const times = asked.slice(0, FRAMES_AT_ONCE);
  if (!times.length) return { frames: [], asked: 0, failed: "no second given" };
  const base = join(dir, ".moworks", "qc", "frames");
  mkdirSync(base, { recursive: true });
  const taken = readdirSync(base).filter((x) => /^\d+$/.test(x)).map(Number).sort((a, b) => a - b);
  for (const n of taken.slice(0, Math.max(0, taken.length - FRAMES_KEEP + 1))) rmSync(join(base, String(n)), { recursive: true, force: true });
  const out = join(base, String((taken.at(-1) ?? 0) + 1));
  mkdirSync(out, { recursive: true });
  await freshFilm(dir);          // the film as Claude left it, as a QC round takes it
  const stills = () => readdirSync(out).filter((f) => /^frame-.*\.png$/.test(f));
  const r = await againIfBusy(() => snapOnceMore(snap, dir, times, out, { signal, idleMs: STILL_IDLE_MS }), () => !stills().length, { pauseMs });
  if (r.busy) return { frames: [], asked: asked.length, busy: true };
  const rel = (f) => relative(dir, join(out, f)).split(sep).join("/");
  const frames = stills().sort().map((f) => ({ t: Number(/-at-([\d.]+)s\.png$/.exec(f)?.[1]), file: rel(f) }));
  return { frames, asked: asked.length, ...(frames.length < times.length ? { failed: stillsFailure(r, frames.length, times.length) } : {}) };
}
/** What film_frames answers. */
export function framesText(r) {
  if (r.busy) return STILLS_BUSY;
  if (!r.frames.length) return `No frame could be taken: ${r.failed ?? "HyperFrames gave no picture"}. Give the seconds, e.g. at: [12.5]; name what you could not see.`;
  return [`The film's frames, whole, as the render draws them (all their text), at the film's size. Open with Read only those you need: each is one picture.`,
    ...r.frames.map((f) => `- ${f.t} s: ${f.file}`),
    ...(r.asked > r.frames.length ? [`${r.asked - r.frames.length} more asked and not taken${r.failed ? ` (${r.failed})` : ` (at most ${FRAMES_AT_ONCE} a call)`}.`] : [])].join("\n");
}

