// The pictures and findings of the QC review (moworks-qc): the app takes HyperFrames' stills of the film and lays them out
// as three sheets per round (.moworks/qc/R<n>/): beats (one settled still per shot), cuts (a strip of 4 frames across every shot change)
// and phone (every shot 360 px wide), and runs HyperFrames' full check (lint, script errors, layout at every transition seam, the frame
// check, contrast, motion). Claude reads the sheets as sheets (one picture each, HF's advice: single stills cost the whole conversation again).
// Each round also measures the film's still stretches (stillness.mjs): Claude reads them in words.
import { copyFileSync, mkdirSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { execFile } from "node:child_process";
import { isAbsolute, join, relative, sep } from "node:path";
import { promisify } from "node:util";
import { againIfBusy, runHfJsonAsync, snapshotAtAsync, STILL_IDLE_MS } from "./cli.mjs";
import { ffmpegExe } from "../library/preview-media.mjs";
import { measureStills, stillLines } from "./stillness.mjs";
import { freshFilm } from "../hf-edit/codeFilm.mjs";
import { dropDecorationContrast } from "./contrastDecor.mjs";

const run = promisify(execFile);
const r2 = (n) => Math.round(n * 100) / 100;
const MAX_SHOTS = 24, MAX_CUTS = 16;

/** The times to take: each shot at 60 % of its length (settled), and 4 frames across each cut. */
export function qcTimes(shots, total) {
  const ss = shots.filter((s) => s.duration > 0).sort((a, b) => a.start - b.start).slice(0, MAX_SHOTS);
  const end = total || (ss.length ? Math.max(...ss.map((s) => s.start + s.duration)) : 0);
  const beats = ss.map((s) => ({ shot: s.number, t: r2(s.start + s.duration * 0.6) }));
  const cuts = ss.slice(1, MAX_CUTS + 1).map((s) => ({ shot: s.number, at: s.start,
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
  let d = 0;
  try { d = Number(/<[^>]*\bdata-composition-id="[^"]*"[^>]*\bdata-duration="([\d.]+)"/.exec(readFileSync(join(dir, "index.html"), "utf8"))?.[1]); } catch { /* no page */ }
  return d > 0 ? Math.min(120, Math.max(9, Math.ceil(d * 2))) : null;
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
  try { return JSON.parse(readFileSync(join(dir, "MOTION-PLAN.json"), "utf8")).dynamic ?? null; } catch { return null; }
}

/** One QC round: { round, dir, sheets: { beats, cuts, phone }, beats, cuts, check: { ok, findings, counts }, still, failed }.
 *  Its three parts (the stills and sheets, the still-stretch measure, HyperFrames' check) read the film and write only their own folders,
 *  so they run at once when `parallel` (a 30-shot film went from 5.4 to 2.3 min a round, the same result); one after the other
 *  when the graphics card is short of memory (each part is a Chrome). The result is assembled in the serial order either way. */
export async function qcRound(dir, { shots, total, signal = null, parallel = false, snap = snapshotAtAsync, hf = runHfJsonAsync, decor = dropDecorationContrast, pauseMs = 3000 } = {}) {
  const base = join(dir, ".moworks", "qc");
  mkdirSync(base, { recursive: true });
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
  // each part returns what it adds to the round: { sheets, still, check, failed }
  const pictures = async () => {
    const part = { sheets: {}, failed: [] };
    if (!times.length) return part;
    // a run that ends for no new still keeps what it took; one that gave nothing while HF's history was held runs once more
    const stills = () => readdirSync(raw).filter((f) => /^frame-.*\.png$/.test(f));
    const r = await againIfBusy(() => snap(dir, times, raw, { signal, idleMs: STILL_IDLE_MS }), () => !stills().length, { pauseMs });
    const files = stills().sort();
    const byT = new Map(files.map((f) => [Number(/-at-([\d.]+)s\.png$/.exec(f)?.[1]), f]));          // HF names each still by its time
    const at = (t) => { const f = byT.get(t) ?? [...byT].find(([k]) => Math.abs(k - t) < 0.006)?.[1]; return f ? join(raw, f) : null; };
    if (r.exitCode !== 0 || files.length < times.length) part.failed.push(`snapshot: ${stillsFailure(r, files.length, times.length)}`);
    const bs = beats.map((b) => at(b.t)).filter(Boolean), cs = cuts.flatMap((c) => c.ts.map(at)).filter(Boolean);
    if (!bs.length) part.failed.push(`no stills matched (${files.slice(0, 3).join(", ")})`);
    try {
      if (bs.length) { await tile(bs, join(out, "beats.jpg"), { width: 480, cols: 4 }); part.sheets.beats = rel(join(out, "beats.jpg")); }
      if (cs.length) { await tile(cs, join(out, "cuts.jpg"), { width: 400, cols: 4 }); part.sheets.cuts = rel(join(out, "cuts.jpg")); }
      if (bs.length) { await tile(bs, join(out, "phone.jpg"), { width: 360, cols: 6 }); part.sheets.phone = rel(join(out, "phone.jpg")); }
    } catch (e) { part.failed.push(`sheets: ${String(e.message).split("\n")[0]}`); }
    return part;
  };
  const stretches = async () => {
    if (!(total > 0)) return { failed: [] };
    try { return { still: await measureStills(dir, { shots, total, dynamic: dynamicOf(dir), signal, workDir: join(out, "still"), snap, pauseMs }), failed: [] }; }
    catch (e) { if (signal?.aborted) throw e; return { failed: [`still stretches: ${String(e.message).split(/\r?\n/)[0]}`] }; }
  };
  const checked = async () => {
    const c = await withSeamsFallback((args) => againIfBusy(() => hf("check", dir, args, { signal }), (x) => !x?.json, { pauseMs }), { samples: checkSamples(dir) });
    if (c.json) await decor(c.json, dir);          // HF's contrast findings on aria-hidden decoration (a sticker's outline copy) dropped
    const findings = checkFindings(c.json, dir);
    return { check: { ok: !!c.json?.ok, findings, counts: Object.fromEntries(Object.entries(findings).map(([k, v]) => [k, { errors: v.filter((x) => x.severity === "error").length, warnings: v.filter((x) => x.severity === "warning").length }])) },
      failed: c.json ? [] : [`check: no result (exit ${c.exitCode}) ${c.stderrTail.join(" ").slice(0, 200)}`] };
  };
  const parts = [pictures, stretches, checked];
  let done;
  if (parallel) {
    // every part runs to its end; a part that threw rejects the round as the serial run would (the first in serial order)
    const settled = await Promise.allSettled(parts.map((f) => f()));
    const bad = settled.find((x) => x.status === "rejected");
    if (bad) throw bad.reason;
    done = settled.map((x) => x.value);
  } else {
    done = [];
    for (const f of parts) done.push(await f());
  }
  for (const part of done) {
    Object.assign(res.sheets, part.sheets ?? {});
    if (part.still) res.still = part.still;
    if (part.check) res.check = part.check;
    res.failed.push(...part.failed);
  }
  return res;
}

/** The round as Claude reads it (the MCP tool's answer). */
export function qcText(r, freshEyes = null) {
  const lines = [`QC round ${r.round} (pictures in ${r.dir}/).`];
  if (r.sheets.beats) lines.push(`- beats sheet ${r.sheets.beats}: one settled still per shot, left to right, top to bottom: ${r.beats.map((b) => `shot ${b.shot} @${b.t}s`).join(", ")}.`);
  if (r.sheets.cuts) lines.push(`- cuts sheet ${r.sheets.cuts}: one row per shot change, 4 frames (-0.25, -0.08, +0.08, +0.25 s): ${r.cuts.map((c) => `into shot ${c.shot} at ${c.at}s`).join(", ")}.`);
  if (r.sheets.phone) lines.push(`- phone sheet ${r.sheets.phone}: the beats at 360 px wide, 6 per row.`);
  const f = r.check?.findings ?? {};
  for (const sec of ["lint", "runtime", "layout", "contrast", "motion"]) {
    const all = f[sec] ?? [], xs = all.filter((x) => x.severity !== "info");          // info lines are HF's notes, not problems
    if (!xs.length) { lines.push(`HyperFrames check, ${sec}: clean${all.length ? ` (${all.length} info note(s))` : ""}.`); continue; }
    lines.push(`HyperFrames check, ${sec}: ${xs.length} finding(s):`);
    for (const x of xs.slice(0, 25)) lines.push(`  - [${x.severity}] ${x.code}${x.time != null ? ` @${x.time}s` : ""}${x.selector ? ` ${x.selector}` : ""}${x.file ? ` (${x.file})` : ""}: ${x.message}${x.ratio ? ` (ratio ${x.ratio}, needs ${x.required}; suggested ${x.suggested})` : ""}${x.fixHint ? ` Fix: ${x.fixHint}` : ""}`);
    if (xs.length > 25) lines.push(`  - … ${xs.length - 25} more`);
  }
  if (r.still) lines.push("", ...stillLines(r.still));
  if (freshEyes) lines.push("", "Fresh eyes (a second look that saw only the beats and cuts sheets, nothing else about the film):", freshEyes);
  if (r.failed.length) lines.push("", `Could not make everything: ${r.failed.join("; ")}`);
  lines.push("", "Open the sheets with Read (each is one picture), score the seven criteria, write the round to QC-REVIEW.md, fix, and call qc_sheets again for the next round.");
  return lines.join("\n");
}

