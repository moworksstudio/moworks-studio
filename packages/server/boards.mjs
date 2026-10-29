// Storyboard boards and the Review in the app: the Storyboard dialog's rounds (stills, history, the user's pick,
// the PDF), and the two app tools Claude calls through the MCP channel: board_stills (stills of the boards it wrote) and qc_sheets (one Review
// round: sheets + HyperFrames' full check, with a fresh-eyes look on the first round of a task), and the Final Mix: music
// options from Mixkit, sound effects placed by the app, the music ducked under the voice with HyperFrames' carve.
import { copyFileSync, createReadStream, existsSync, mkdirSync, readFileSync, statSync, symlinkSync, unlinkSync, writeFileSync } from "node:fs";
import { basename, extname, join, resolve, sep } from "node:path";
import * as projects from "../project-service/index.mjs";
import { currentOptions, firstRoundOf, isOption, listRounds, makeRevision, optionLabel, optionName, ownerRounds, parseFeedback, recordPick, roundPdf, takeStills } from "../hf-edit/boards.mjs";
import { CHECK_ARGS_PLAIN, checkFindings, qcRound, qcText } from "../hf-qa/qc.mjs";
import { runHfJsonAsync } from "../hf-qa/cli.mjs";
import { placedShots, readShots, untimedFrames } from "../hf-edit/shots.mjs";
import { effectiveSettings, freshEyes } from "../agent/index.mjs";
import { filmKind } from "../agent/reads.mjs";
import { librarySearch, searchText } from "../library/search-tool.mjs";
import { HF_SKILL, needsWeb, runScript, scriptText } from "../hf-edit/hf-scripts.mjs";
import { runPy } from "../setup/python.mjs";
import { creditMusic, optionsText, readOptions, saveOptions } from "../sfx/music.mjs";
import { planEpisode, planText } from "../what-if-plan/index.mjs";
import { autoSfx } from "../sfx/auto.mjs";
import { mount, readState, unmuteAll, writeCredits } from "../sfx/index.mjs";
import * as plan from "../motion-plan/index.mjs";
import { snapStop, stopContext } from "../sfx/stop-snap.mjs";
import * as pipe from "../pipeline/index.mjs";
import * as rev from "../revisions/index.mjs";
import { poseCheck, poseText } from "../anidoodle-styles/posecheck.mjs";
import { codeGlyphs, glyphText } from "../hf-qa/codeGlyphs.mjs";
import { stopMusic } from "../hf-edit/tracks.mjs";
import { voiceCheck, voiceText } from "../sfx/voicecheck.mjs";
import { gpuShort } from "./proxy.mjs";
import { styleNevers } from "../style-catalog/index.mjs";
import { styleTraits } from "../style-catalog/traits.mjs";

const TYPES = { ".png": "image/png", ".jpg": "image/jpeg", ".pdf": "application/pdf" };

/** What Make another option and Feedback take ("a few minutes" was shown, really 10-13): the median of this film's own storyboard tasks,
 *  else the usual (measured over Tests 09-11: an option 8-13 min, about $2.5, anidoodle 10-13 min, $3; a revision with its redraw 4-5 min,
 *  about $1). A revision is the feedback task and the chat turns that drew it ("Storyboard · revision"). */
const OPTION_TASK = /^Make one (more )?storyboard option/, FEEDBACK_TASK = /^The owner's feedback on storyboard/;
// the storyboard timed again to a voice that came while it was drawn (autopilot's transcriptLanded) is a revision's work, not an option's
const VOICE_TASK = /^The voice-over came while you drew the storyboard/;
const isRevision = (t) => FEEDBACK_TASK.test(String(t.text ?? "")) || VOICE_TASK.test(String(t.text ?? ""));
export function boardEstimates(tasks, styleId = null) {
  const median = (xs) => { const v = [...xs].sort((a, b) => a - b); return v.length ? (v.length % 2 ? v[(v.length - 1) / 2] : (v[v.length / 2 - 1] + v[v.length / 2]) / 2) : null; };
  const ms = (t) => Number(t.durationMs ?? t.usage?.durationMs) || 0, usd = (t) => Number(t.usage?.costUsd) || 0;
  const options = [], revisions = [], motions = [];
  for (const t of tasks ?? []) {
    if (t.status !== "done") continue;
    // an option: Make another, or the step's first option in any engine's own words (What If: "Make the storyboard as the what-if-style pack says")
    if (t.step === "storyboard" && (OPTION_TASK.test(String(t.text ?? "")) || !isRevision(t)) && ms(t) > 60000) options.push({ ms: ms(t), usd: usd(t) });
    else if (t.step === "storyboard" && isRevision(t)) revisions.push({ ms: ms(t), usd: usd(t) });
    else if (t.label === "Storyboard · revision" && revisions.length) { const r0 = revisions.at(-1); r0.ms += ms(t); r0.usd += usd(t); }
    else if (t.step === "motionSpec") motions.push({ ms: ms(t), usd: usd(t) });          // what Approve storyboard starts
  }
  const ani = /^anidoodle-/.test(String(styleId ?? ""));
  const one = (list, usual) => {
    const own = list.filter((x) => x.ms > 60000);
    // one run of this film is a thin basis (B said about 15 min and took 26): the answer is a range, up to the slowest seen
    // and at least half again the middle
    const range = (m, slowest = 0) => ({ minutes: m, high: Math.max(Math.round(m * 1.5), slowest) });
    return own.length ? { ...range(Math.max(1, Math.round(median(own.map((x) => x.ms)) / 60000)), Math.round(Math.max(...own.map((x) => x.ms)) / 60000)),
      costUsd: Math.round(median(own.map((x) => x.usd)) * 100) / 100, basis: "this film", runs: own.length }
      : { ...range(usual.minutes), costUsd: usual.costUsd, basis: "usual", runs: 0 };
  };
  return { option: one(options, ani ? { minutes: 12, costUsd: 3 } : { minutes: 10, costUsd: 2.5 }), feedback: one(revisions, { minutes: 5, costUsd: 1 }),
    motion: one(motions, { minutes: 5, costUsd: 1.2 }) };          // measured on demo films, What If included: 3.7-5 min, about $1-1.25
}

/** the running Storyboard or Motion Plan task's time (12 min of "Drawing the storyboard" with no time said, while the Build said
 *  "about N min left"): { stage, minutes, high, startedAt } from the same estimates the dialogs' confirms give, null for any other task. */
export function runningEstimate(task, tasks, styleId = null) {
  const step = task?.step ?? task?.continues;          // the answer to its question goes on with the step
  if (!task || task.status !== "running" || !["storyboard", "motionSpec"].includes(step)) return null;
  const e = boardEstimates(tasks, styleId);
  const est = step === "motionSpec" ? e.motion : isRevision(task) ? e.feedback : e.option;
  return { stage: step === "motionSpec" ? "motion" : "storyboard", minutes: est.minutes, high: est.high, startedAt: task.createdAt ?? null };
}

/** The words after a running stage's line: "about 6 min left", past the middle the time to the slowest seen, past that "longer than usual". */
export function etaWords(est, now = Date.now()) {
  if (!est?.minutes) return "";
  const gone = est.startedAt ? (now - Date.parse(est.startedAt)) / 60000 : 0;
  if (!(gone >= 0)) return `about ${est.minutes} min`;
  if (gone < est.minutes) return `about ${Math.max(1, Math.round(est.minutes - gone))} min left`;
  if (gone < (est.high ?? est.minutes)) return `about ${Math.max(1, Math.round(est.high - gone))} min left`;
  return "taking longer than usual";
}

/** Claude said the pictures did not show its last two edits yet, and the user approved the old pictures. An option is approved
 *  only from pictures of it as it is now: null when they are, else { code, message } (STILLS_TAKING while the app takes them, STILLS_OLD
 *  when its board changed after its newest pictures: the app starts taking them; the user approves once they are in). */
export function stillsBehind(ctx, p, option) {
  if (ctx.jobs.list({ kind: "board-stills" }).some((j) => j.projectId === p.id && j.status === "running"))
    return { code: "STILLS_TAKING", message: "The storyboard's pictures are being taken again with the latest changes. Approve once they are in." };
  const cur = currentOptions(p.path).find((x) => x.option === option);
  if (!cur?.ready || !cur.hash || firstRoundOf(listRounds(p.path), option, cur.hash)) return null;
  try { ctx.boardStills?.(p); } catch { /* the dialog takes them */ }
  return { code: "STILLS_OLD", message: `Option ${option} changed after its pictures were taken, so they do not show the latest changes. The app is taking them again now: approve once they are in.` };
}

export function boardRoutes(ctx, { r, P, mustProject, HttpError }) {
  const { root } = ctx;
  const url = (id, rel) => `${ctx.preview.base}/p/${id}/${rel}`;
  const view = (p) => {
    const { all, shown } = shownDraft(p);
    // the user's rounds: Round 1 = the first set of options, Round 2 = the next two…, each with the newest stills
    // the user's pick: the newest one on any draft, else the approved option (a take after the approval made a draft without it, and
    // the Motion dialog found no approved stills)
    const approvedOpt = p.meta?.approvals?.storyboard?.option;
    const pick = [...all].reverse().find((x) => x.picked?.option && x.picked.option !== "mix")?.picked ?? (isOption(approvedOpt) ? { option: approvedOpt } : null);
    const rounds = ownerRounds(all, shown).map((g) => ({ id: shown.id, no: g.no, at: g.at, picked: g.letters.includes(pick?.option) ? pick : null,
      options: shown.options.filter((o) => g.letters.includes(o.option))
        .map((o) => ({ ...o, stillUrls: o.stills.map((s) => url(p.id, s)), sheetUrl: o.sheet ? url(p.id, o.sheet) : null })) }));
    // every option its own board, the newest on top, named "Option B" or "Option B2 ·
    // revised from Option B" (its redrawn panels in `revised`); each with the user's feedback draft
    const drafts = readDrafts(p.path);
    // each option's own time, when it was done as it is now (B showed the time Claude started it)
    // when an option was made: the round it first showed as it is now, but never later than its own board files' last change (the
    // board's hash counts the film's shared code, so making A2 moved A's time to A2's round: both "1 min ago")
    const madeAt = (o) => {
      const r = firstRoundOf(all, o.option, o.hash)?.at ?? shown.at;
      const own = ["STORYBOARD.md", "index.html"].map((f) => { try { return statSync(join(p.path, "boards", o.option, f)).mtime.toISOString(); } catch { return null; } }).filter(Boolean).sort().at(-1);
      // the first round that took this option's stills after its own files last changed
      const since = own ? all.find((rd) => rd.at >= own && rd.options.some((x) => x.option === o.option && x.stills?.length))?.at : null;
      return since && r && since < r ? since : r;
    };
    const options = shown ? [...shown.options].reverse().map((o) => ({ ...o, at: madeAt(o), label: optionLabel(o.option, o.from), round: shown.id, picked: pick?.option === o.option,
      stillUrls: o.stills.map((s) => url(p.id, s)), sheetUrl: o.sheet ? url(p.id, o.sheet) : null, draft: drafts[o.option] ?? null })) : [];
    return { current: currentOptions(p.path), options, rounds,
      drafts: Math.max(0, all.length - (shown ? 1 : 0)),          // kept on disk, never shown (Claude's checks, earlier stills of the same options)
      // the way of working settled in Prepare: with "keep" the storyboard is the user's own frames, in order, without options
      way: pipe.normalWay(p.meta?.way?.id ?? pipe.chosenWay(p.path) ?? "free"), frames: pipe.normalWay(p.meta?.way?.id ?? pipe.chosenWay(p.path) ?? "free") === "keep",
      taking: takingOf(p.id),          // with frames: { done, total } while the stills are taken
      // what the confirm of Make another option and of Feedback says: { option, feedback }: { minutes, costUsd, basis, runs }
      estimates: boardEstimates(ctx.agent?.list?.(p.id) ?? [], p.meta?.style?.id) };
  };
  /** The draft the dialog shows: the newest one. A draft holds every option on disk (A, B, and C, D after "Make two
   *  more"), so nothing is lost; Claude's other drafts and the stills the dialog took again of the same options stay on disk only. While
   *  Claude works, its drafts are not shown: the newest one from before it is. */
  const shownDraft = (p) => {
    const all = listRounds(p.path);
    const running = ctx.agent?.running?.get(p.id) ?? null;
    // a draft still being written (no round.json yet) while stills are taken is not shown either
    const busy = !!running || !!takingOf(p.id);
    return { all, shown: all.filter((x, i) => (!x.taskId || x.taskId !== running) && !(busy && i === all.length - 1 && x.partial)).at(-1) ?? null };
  };
  // the user's feedback drafts, one per option, kept in the project while they type: .moworks/boards/feedback.json
  const draftsFile = (dir) => join(dir, ".moworks", "boards", "feedback.json");
  const readDrafts = (dir) => { try { return JSON.parse(readFileSync(draftsFile(dir), "utf8")); } catch { return {}; } };
  const writeDrafts = (dir, d) => { mkdirSync(join(dir, ".moworks", "boards"), { recursive: true }); writeFileSync(draftsFile(dir), JSON.stringify(d, null, 2)); };
  const takingOf = (id) => ctx.jobs.list({ kind: "board-stills" }).find((j) => j.projectId === id && j.status === "running") ?? null;
  /** Take the stills of the boards as they are now, as a job the dialog follows (frames done / all). The app starts it when the
   *  storyboard step ends, so the dialog opens with pictures; the dialog starts it too when a board changed by hand. Null: no board yet,
   *  or a capture already running. */
  const capture = (p, { force = false, by = "app" } = {}) => {          // by: "app" (after a storyboard task) or "user" (the dialog)
    if (!currentOptions(p.path).some((x) => x.ready)) return null;
    try {
      return ctx.jobs.start("board-stills", { projectId: p.id, title: "Storyboard stills" }, async (job) => {
        job.update({ stage: "taking stills" });
        const res = await takeStills(p.path, { signal: job.signal, force, by, filmTimes: styleTraits(p.meta?.style?.id, root).filmBoards,          // force: a new round even if nothing changed
          onProgress: ({ done, total }) => job.update({ frames: { done, total }, progress: total ? Math.round((done / total) * 100) : null }) });
        return { round: res.round.id, fresh: res.fresh, failed: res.failed };
      });
    } catch (e) { if (e.code === "BUSY") return null; throw e; }
  };
  ctx.boardStills = capture;
  // the code checks first (HyperFrames' check on each board: layout, contrast, script errors; no tokens), then Claude looks at each
  // option's sheets once (3 × 3 frames, about 1500 px); a second round only for a real problem, and only the frames it changed
  const boardChecks = async (dir, round) => {
    const out = {};
    for (const o of round.options) {
      const bd = join(dir, "boards", o.option);
      if (!existsSync(join(bd, "index.html"))) continue;
      const link = join(bd, "assets");
      let linked = false;
      if (!existsSync(link) && existsSync(join(dir, "assets"))) { try { symlinkSync(join(dir, "assets"), link, "junction"); linked = true; } catch { /* the check reports the missing files */ } }
      try {
        const c = await runHfJsonAsync("check", bd, CHECK_ARGS_PLAIN, { signal: ctx.stopping.signal, timeoutMs: 180000 });
        const f = checkFindings(c.json, bd);
        out[o.option] = { ran: !!c.json, items: ["runtime", "layout", "contrast"].flatMap((sec) => (f[sec] ?? []).filter((x) => x.severity === "error" || x.severity === "warning")
          .map((x) => ({ sec, frame: x.time != null ? Math.floor(Number(x.time)) + 1 : null, code: x.code, message: x.message, selector: x.selector }))) };
      } catch { out[o.option] = { ran: false, items: [] }; }
      finally { if (linked) { try { unlinkSync(link); } catch { /* left for the next round */ } } }
    }
    return out;
  };
  const stillsText = (p, res, checks = null, timing = null) => {
    const rd = res.round;
    const lines = [`Draft ${rd.id}${res.fresh ? " (new)" : " (nothing changed since this draft: the same stills)"}: your own check. The owner never sees drafts; to the owner each option is its own board, "Option A", "Option B", and a revision from their feedback "Option B2 · revised from Option B"; never name a draft (R1, R2…) or a "round" in your reply. Each sheet is one picture of 3 × 3 frames in frame order (left to right, top to bottom); read the sheets, not the single stills (open one still only to read small text).`];
    for (const o of rd.options) {
      const ck = checks?.[o.option];
      const ckText = !ck ? "" : !ck.ran ? "; HyperFrames check: could not run" : !ck.items.length ? "; HyperFrames check: clean"
        : `; HyperFrames check: ${ck.items.length} issue(s): ${ck.items.slice(0, 8).map((x) => `${x.frame ? `frame ${x.frame} ` : ""}${x.sec} ${x.code}${x.selector ? ` ${x.selector}` : ""}`).join("; ")}`;
      lines.push(`- Option ${o.option}${o.heading ? ` (${o.heading})` : ""}: ${o.frames.length} frame(s); sheet(s) ${(o.sheets?.length ? o.sheets : [o.sheet]).filter(Boolean).join(", ") || "(none)"}${ckText}`);
    }
    for (const f of res.failed) lines.push(`- Option ${f.option}: the stills failed: ${f.message}`);
    for (const f of res.notes ?? []) lines.push(`- Option ${f.option}: ${f.message}`);
    for (const [o, list] of Object.entries(timing ?? {})) {
      if (list.length) lines.push(`- Option ${o}: ${list.map((f) => `frame ${f.number}${f.duration ? ` ("${String(f.duration).slice(0, 40)}")` : ""}`).join(", ")} ${list.length > 1 ? "have" : "has"} no length in seconds. Every frame is one shot of the film with its own seconds ("duration: 1.8s"), and the frames add up to the film's length: the Motion Plan makes one shot per frame. A beat inside a shot goes in that frame's scene, or becomes its own shot with its own seconds. Fix STORYBOARD.md before you stop (Test 11 #449).`);
    }
    // what the style's author forbids is checked on every still (Brick Toy's minifigure head passed unseen)
    const nevers = (() => { try { return styleNevers(p.meta?.style?.id, root); } catch { return []; } })();
    if (nevers.length) lines.push(`The film style's own file forbids (check every panel against it, and against the limits Prepare noted in ASSETS.md or NOTES.md; one breach is a real problem): ${nevers.map((x) => `"${x}"`).join(" ")}`);
    lines.push("Look at each option's sheets once. Fix only a real problem (a check issue, text cut or unreadable at phone size, overlapping, not the brief, what the style forbids); then call board_stills with { option, frames: [the frame numbers you changed] } once to see them. No other round: then hand the options to the owner.");
    return lines.join("\n");
  };

  // a Final Mix change: the work before it is committed on its own, the change as a sound-only revision (the picture's checks hold)
  const mixChange = async (p, what, fn) => {
    try { rev.ensureRepo(p.path); rev.commitAll(p.path, "Changes before the Final Mix"); } catch { /* revisions optional */ }
    const out = await fn();
    try { rev.commitAll(p.path, `${rev.SOUND_MIX}: ${what}`); } catch { /* revisions optional */ }
    // a finished film whose sound changed: the preview service is asked once (it decides by the film's
    // picture and sound whether anything is made); while stage 4 places the sound, not yet
    const now0 = projects.getProject(p.id, root);
    if (now0?.meta?.pipeline?.finished || now0?.meta?.pipeline?.delivered) { try { ctx.previewProxy?.(p.id); } catch { /* next change */ } }
    return out;
  };
  /** a stop the app or Claude sets, moved into the voice-over's nearest pause (snapStop); the user's own second stays as given. */
  const snapped = (p, at) => {
    let start = 0;
    try { start = Number(/\bdata-start="([\d.]+)"/.exec(/<audio\b[^>]*\bid="el-music"[^>]*>/i.exec(readFileSync(join(p.path, "index.html"), "utf8"))?.[0] ?? "")?.[1]) || 0; } catch { /* no film page yet */ }
    const { words, beats } = stopContext(p.path, p.meta, start);
    return snapStop(at, words, beats);
  };
  /** The music stopped at `at` s, or played to its end again (null): a sound-only change, kept in the project's meta. snap: moved into a pause. */
  const musicStop = (p, at0, { snap = false } = {}) => { const s = snap && at0 != null ? snapped(p, at0) : null, at = s ? s.at : at0;
    return mixChange(p, at == null ? "music plays to its end" : `music stops at ${at} s`, () => {
    try {
      const r0 = { ...stopMusic(p.path, at), ...(s?.moved ? { asked: Number(at0), word: s.word, after: s.after } : {}) };
      projects.updateMeta(p.id, (m) => { if (m.music) { if (at == null) { delete m.music.stopAt; m.music.toEnd = true; } else { m.music.stopAt = r0.at; delete m.music.toEnd; } } }, root);
      return r0;
    }
    catch (e) { throw new HttpError(400, e.code ?? "INVALID", e.message); }
  }); };
  /** A music option onto the timeline (the Final Mix's "Use this", and the autopilot's pick of the first track). */
  const useOption = (p, track) => mixChange(p, `music "${track.title}"`, async () => {
    // the chosen track is copied to assets/3_audio/music/ (kept in the history like the user's files; the options are not)
    const rel = `assets/3_audio/music/${basename(track.file)}`;
    mkdirSync(join(p.path, "assets", "3_audio", "music"), { recursive: true });
    copyFileSync(join(p.path, ...track.file.split("/")), join(p.path, ...rel.split("/")));
    const { root: comp } = await readShots(p.path);          // a track longer than the film plays to the film's end
    const placed = ctx.placeMusic(p, rel, { duration: comp?.duration && track.duration ? Math.min(track.duration, comp.duration) : track.duration });
    creditMusic(p.path, { ...track, file: rel });
    projects.updateMeta(p.id, (m) => { m.music = { ...m.music, title: track.title, artist: track.artist, page: track.page, licence: track.licence, option: track.file }; }, root);
    return placed;
  });
  /** Sound effects placed by the app from the storyboard's cues and the motion plan (the Final Mix's "Place", and the autopilot). */
  const placeSfx = (p, signal = null) => mixChange(p, "sound effects", async () => {
    const { shots, root: comp } = await readShots(p.path);          // a one-page code film: the storyboard's planned times
    const mp = plan.read(p.path);
    const res = await autoSfx(p.path, placedShots(shots, comp?.duration), mp.exists && !mp.error ? mp.plan : null, { signal, root });
    projects.addNote(p.path, { kind: "sfx", text: "Sound effects placed by the app: {n} ({names})", vars: { n: res.placed, names: res.names.join(", ") || "none" } });
    return res;
  });
  /** The plan's musicStop, once the music is on the timeline (the app once put the music on after Claude's music step and it played
   *  all 40 s past the plan's stop at 26.5 s, so Claude told the user to set it in the Final Mix), unless a stop
   *  is set already or someone chose "play to the end". Its second, or null. */
  /** A music cut at the twist is What If's own rule: the plan's musicStop counts only in a What If film (the film kind, or
   *  the What If animation style) or when the plan quotes the brief's or the user's words asking for it; otherwise the music plays to the
   *  end, with its fade out. The Final Mix's "Stop the music at" and Claude's music_stop tool are not gated. */
  const planStopAllowed = (p, mp) => filmKind(p.path)?.id === "whatIf" || p.meta?.style?.id === "what-if" || !!mp.musicStopAsked;
  const stopFromPlan = async (p) => {
    const now0 = projects.getProject(p.id, root);
    const m = now0?.meta?.music;
    if (!m?.file || m.stopAt != null || m.toEnd) return null;
    const mp = plan.read(p.path), at = mp.exists && !mp.error && planStopAllowed(now0, mp.plan) ? mp.plan.musicStop : null;
    if (!(at > 0)) return null;
    try { return (await musicStop(now0, at, { snap: true })).at; } catch { return null; }
  };
  /** The plan's musicStop as the music step will apply it (for Claude's words before the app places the music). */
  const planStop = (p) => { const mp = plan.read(p.path); return mp.exists && !mp.error && mp.plan.musicStop > 0 && planStopAllowed(p, mp.plan) && p.meta?.music?.stopAt == null && !p.meta?.music?.toEnd ? snapped(p, mp.plan.musicStop).at : null; };
  ctx.mix = { useOption, placeSfx, stopFromPlan };
  // the app tools (Agent.callTool)
  const tools = {
    psd_layers: async ({ project, args }) => {
      const file = String(args.file ?? "").replace(/\\/g, "/");
      if (!/^(assets|sources)\/.+\.(psd|psb)$/i.test(file) || file.split("/").includes("..") || !existsSync(join(project.path, ...file.split("/")))) return `No Photoshop file "${file}" in the project's assets/ or sources/.`;
      const frame = String(args.frame ?? "document");
      const outRel = `assets/_app/psd/${frame.replace(/[^\w.-]+/g, "-").replace(/^-+|-+$/g, "") || "document"}`;
      const width = Number(args.width) || project.meta?.format?.width || 1920;
      const r = await runPy(root, "tools/intake/intake.py", ["psd-export", join(project.path, ...file.split("/")), join(project.path, ...outRel.split("/")), "--frame", frame, "--width", String(width)],
        { timeoutMs: 30 * 60 * 1000, signal: ctx.stopping.signal });
      if (!r.ok) return `The app could not export "${frame}": ${r.error}`;
      return `Frame "${frame}" exported: ${r.units} layer(s) at ${r.width} x ${r.height} in ${outRel}/ (PNG per layer, back to front) with ${outRel}/layout.json (positions in px, opacity, blend, and each text layer's words, font, size and colour). Rebuild text layers as live text with the font named there; place the pictures by layout.json.`;
    },
    // a What If film's shot list on the voice (the author's plan.py, in JavaScript)
    whatif_plan: async ({ project }) => {
      try { return planText(planEpisode(project.path, { lengthSec: projects.getProject(project.id, root)?.meta?.targetDurationSec ?? null })); }
      catch (e) { return `The plan could not be made: ${e.message}`; }
    },
    music_options: async ({ task, project, args }) => {
      const round = await saveOptions(project.path, Array.isArray(args.tracks) ? args.tracks : [], { signal: ctx.stopping.signal, root });
      // the music step's end places them (autopilot afterSound); a chat turn's tracks only wait in the Final Mix
      const step = task?.step === "sound", now0 = projects.getProject(project.id, root);
      // tracks found before the build, for a film
      // with no music yet, put track 1 on the timeline now (the user plays it on the Editor's MUSIC lane and the Music map; the beat map
      // and the lyrics need it); the others wait in the Final Mix
      const early = !step && round.tracks.length && !now0?.meta?.music?.file && !(now0?.meta?.pipeline?.ran?.build || now0?.meta?.pipeline?.finished || now0?.meta?.pipeline?.delivered);
      let placedNow = false;
      let stopAt = null;
      if (early) { try { await ctx.mix.useOption(now0, round.tracks[0]); placedNow = true; stopAt = await stopFromPlan(now0); } catch { /* they wait in the Final Mix */ } }
      else if (step && !now0?.meta?.music?.file) stopAt = planStop(now0);
      if (round.tracks.length) projects.addNote(project.path, placedNow
        ? { kind: "music", text: "\"{title}\" is the film's music now, on the timeline; the other track(s) wait in the Final Mix", vars: { title: round.tracks[0].title } }
        : { kind: "music", text: "{n} music track(s) to listen to in the Final Mix", vars: { n: round.tracks.length } });
      return optionsText(round, { placeMusic: step && !now0?.meta?.music?.file, placeSfx: step, placedNow, stopAt });
    },
    hf_script: async ({ task, project, args }) => {
      const name = String(args.script ?? "");
      const list = Array.isArray(args.args) ? args.args.map(String) : [];
      // a script or command that goes online (capture, add, catalog, locate auto) follows the project's web setting: off = no, ask = the user says
      if (needsWeb(name, list)) {
        const web = effectiveSettings(project.meta ?? {}, root).web;
        if (web === "off") return `The web is off for this project, so the app does not run ${name}. Ask the owner to turn it on in the project settings.`;
        if (web === "ask") {
          let a = await ctx.agent.permit(task.id, { tool_name: "WebFetch", input: { url: `${name} ${list.join(" ")}`.slice(0, 300) } });
          while (a?.pending) a = await ctx.agent.waitAnswer(a.pending);
          if (a?.behavior !== "allow") return `The owner said no to ${name} using the web.`;
        }
      }
      // the project's HF skills, the entry skill and media-use (carve); runScript runs only its allow-listed scripts from them
      const skills = [...new Set([...(project.meta?.style?.rules ?? []).filter((r) => r.kind === "hf-skill").map((r) => r.name), HF_SKILL, "media-use"])];
      const r = await runScript(project.path, { name, args: list, skills, root, signal: ctx.stopping.signal });
      return scriptText(r, list);
    },
    library_search: async ({ args }) => {
      const q = String(args.query ?? "").trim();
      if (!q) return "Say what the shot needs in the query.";
      return searchText(q, await librarySearch(q, { kind: ["motion", "block", "look", "vocab"].includes(args.kind) ? args.kind : "any", limit: Number(args.limit) || 8, root }));
    },
    board_stills: async ({ task, project, args = {} }) => {
      // { option, frames }: only the frames Claude changed after the first look
      const retake = isOption(String(args.option ?? "").toUpperCase()) && Array.isArray(args.frames) && args.frames.length ? { option: String(args.option).toUpperCase(), frames: args.frames } : null;
      const res = await takeStills(project.path, { signal: ctx.stopping.signal, by: "claude", taskId: task?.id ?? null, retake, filmTimes: styleTraits(project.meta?.style?.id, root).filmBoards });
      const checks = res.fresh ? await boardChecks(project.path, res.round) : null;
      // a draft: never numbered as a round in the chat
      projects.addNote(project.path, { kind: "boards", text: "Claude checked its storyboard draft" });
      const timing = {};          // a frame with no seconds
      for (const o of res.round?.options ?? []) { try { timing[o.option] = await untimedFrames(join(project.path, "boards", o.option, "STORYBOARD.md")); } catch { /* HF's parser missing: the stills stand */ } }
      // Vietnamese letters the film's code draws in a face that lacks them (G-GLYPH reads only the HTML)
      return [stillsText(project, res, checks, timing), glyphText(codeGlyphs(project.path))].filter(Boolean).join("\n\n");
    },
    // the voice kept clear: every spoken word against the effects and the music
    voice_check: async ({ project }) => voiceText(await voiceCheck(project.path, { root })),
    // the twist: Claude stops the music at the second the story turns
    music_stop: async ({ project, args = {} }) => {
      if (!project.meta?.music?.file) return "No music is on the timeline yet: the app places it in the Final Mix; stop it there afterwards.";
      const at = args.at == null || args.at === "" ? null : Number(args.at);
      const r0 = await musicStop(project, at, { snap: true });
      return at == null ? "The music plays to its end again." : `The music now stops at ${r0.at} s (it starts at ${r0.start} s)${r0.asked != null ? `: ${r0.asked} s fell on the spoken "${r0.word}", so the app moved the stop into the pause${r0.after ? ` after "${r0.after}"` : ""}` : ""}.`;
    },
    qc_sheets: async ({ task, project }) => {
      const { shots, root: comp } = await readShots(project.path);
      // qcRound bundles a code film from its source first and says when it does not compile
      // a one-page film (no frame mounted) is sampled over its whole length by the storyboard's planned shots, not its first 1.1 s
      // the round's three parts at once, unless the graphics card is short of memory
      const res = await qcRound(project.path, { shots: placedShots(shots, comp?.duration), total: comp?.duration ?? null, signal: ctx.stopping.signal, parallel: !gpuShort() });
      let fresh = null;
      if (!task.freshEyesDone && res.sheets.beats) {          // the first round of this task: a second look that knows nothing else
        task.freshEyesDone = true;
        fresh = await freshEyes({ dir: project.path, sheets: [res.sheets.beats, res.sheets.cuts].filter(Boolean), root });
      }
      projects.updateMeta(project.id, (m) => { m.lastQc = { round: res.round, at: new Date().toISOString(), counts: res.check?.counts ?? null, sheets: res.sheets, freshEyes: fresh }; }, root);
      // an anidoodle film: every frame drawn, every pose inside its joint limits (a run pose once left them and
      // HyperFrames' check, which samples, stopped the render at the end); the Review fixes what it names
      const pose = poseText(await poseCheck(project.path));
      return [qcText(res, fresh), pose, glyphText(codeGlyphs(project.path))].filter(Boolean).join("\n\n");
    },
  };

  const routes = [
    r("GET", `/projects/${P}/boards`, ([id]) => view(mustProject(id, root))),
    // the Storyboard dialog's "Take stills" (Claude calls the tool itself; the user may too, e.g. after editing a board by hand)
    r("POST", `/projects/${P}/boards/stills`, ([id], b) => {
      const p = mustProject(id, root);
      if (!currentOptions(p.path).some((x) => x.ready)) throw new HttpError(400, "INVALID", "No board yet: Claude writes them in the Storyboard step");
      // while Claude works on the film it takes its own stills, and the app takes them when its task ends: the dialog takes none
      if (ctx.agent?.running?.has(p.id)) return { job: null, busy: true };
      // once the storyboard is approved, opening the dialog takes nothing again while every option's STORYBOARD.md is the one
      // its last stills were taken of (the app's own later edits of a board's page are no reason to take a new draft)
      if (b.force !== true && p.meta?.approvals?.storyboard) {
        const last = listRounds(p.path).at(-1);
        const read = (rel) => { try { return readFileSync(join(p.path, ...rel.split("/")), "utf8"); } catch { return null; } };
        const same = last && currentOptions(p.path).filter((x) => x.ready).every((x) => last.options.some((o) => o.option === x.option && o.stills.length)
          && read(`boards/${x.option}/STORYBOARD.md`) === read(`boards/rounds/${last.id}/${x.option}/STORYBOARD.md`));
        if (same) return { job: null, unchanged: true };
      }
      return { job: capture(p, { force: b.force === true, by: "owner" }) ?? takingOf(id) };
    }),
    // the feedback draft of one option, saved as the user types; an empty text removes it
    r("PUT", `/projects/${P}/boards/([A-H](?:[2-9]|[1-9]\\d+)?)/feedback-draft`, ([id, option], b) => {
      const p = mustProject(id, root), d = readDrafts(p.path), text = String(b.text ?? "").slice(0, 20000);
      if (text.trim()) d[option] = { text, at: new Date().toISOString() }; else delete d[option];
      writeDrafts(p.path, d);
      return { option, draft: d[option] ?? null };
    }),
    // Submit feedback on an option: a revision (B → B2) copied whole, only the noted panels drawn again by Claude, after
    // Claude checked that each note fits its panel (a mismatch is a stop with choices)
    r("POST", `/projects/${P}/boards/([A-H](?:[2-9]|[1-9]\\d+)?)/feedback`, async ([id, option], b) => {
      const p = mustProject(id, root), text = String(b.text ?? "").trim();
      if (!text) throw new HttpError(400, "INVALID", "Write your feedback first");
      if (ctx.agent?.running?.has(id)) throw new HttpError(409, "BUSY", "Claude is working on this film: wait until it finishes");
      const src = listRounds(p.path).reverse().map((rd) => rd.options.find((o) => o.option === option && o.stills.length)).find(Boolean);
      if (!src) throw new HttpError(404, "NOT_FOUND", `No stills of Option ${option} yet`);
      const fb = parseFeedback(text), count = src.frames.length;
      const srcName = src.name || optionName(src.heading);
      const missing = [...new Set(fb.panels.map((x) => x.n))].filter((n) => n < 1 || n > count);
      const rv = makeRevision(p.path, option, text);
      const d = readDrafts(p.path); delete d[option]; writeDrafts(p.path, d);
      const sheets = (src.sheets?.length ? src.sheets : [src.sheet]).filter(Boolean);
      const prompt = [
        `The owner's feedback on storyboard Option ${option} (their words, as they wrote them):`, "", text, "",
        `The app made Option ${rv.option} for it: boards/${rv.option}/ is an exact copy of boards/${option}/ (${count} panels; panel N is "## Frame N" of its STORYBOARD.md). Every panel with no note stays exactly as it is: never touch it.`,
        `First check each note against its panel: read boards/${option}/STORYBOARD.md and look at Option ${option}'s sheets (${sheets.join(", ") || "none"}). `
          + (missing.length ? `The app found notes on panels that do not exist: ${missing.map((n) => `@Panel_${n}`).join(", ")} (Option ${option} has ${count}). ` : "")
          + "A note that does not fit (its panel does not show what it names, e.g. the logo is on panel 7 and the note is on 6; a panel that does not exist; two notes that contradict; a general note that names no panel) is a conflict (moworks-studio §2b): say each point, offer the choices (e.g. \"did you mean panel 7?\"), say which panels you would draw again, change nothing in boards/" + rv.option + "/, and stop.",
        `When every note fits: draw again only the noted panels (${rv.panels.length ? rv.panels.join(", ") : "none by number"}${rv.general ? ", and the panels the general note is about: say which first" : ""}) in boards/${rv.option}/STORYBOARD.md and its page (index.html and its code), as your rules say; set its heading to "# Option ${rv.option}${srcName ? ` · \"${srcName}\"` : ""} · revised from Option ${option}" (it keeps the name of Option ${option}, #455); then call board_stills with { option: "${rv.option}", frames: [the panels you drew again] }: the app keeps every other panel's still as it was. Then stop: the owner approves it in the Storyboard dialog or gives more feedback.`,
      ].join("\n");
      let task;
      try { task = await ctx.agent.start(id, { scope: { kind: "project" }, step: "storyboard", text: prompt, shown: text }); }
      catch (e) { throw new HttpError(e.code === "BUSY" ? 409 : 500, e.code ?? "ERROR", e.message); }
      return { task, option: rv.option, from: option, label: optionLabel(rv.option, option), panels: rv.panels, missing };
    }),
    r("POST", `/projects/${P}/boards/pick`, ([id], b) => {
      const p = mustProject(id, root);
      const round = listRounds(p.path).find((x) => x.id === b.round);
      if (!round) throw new HttpError(404, "NOT_FOUND", "No such round");
      const option = String(b.option ?? "");
      if (option !== "mix" && !round.options.some((o) => o.option === option)) throw new HttpError(400, "INVALID", "Pick A, B, C or a mix");
      return { picked: recordPick(p.path, b.round, { option, note: String(b.note ?? "").slice(0, 2000) }) };
    }),
    // the Review dialog: QC-REVIEW.md, the last round's sheets and the fresh-eyes answer
    r("GET", `/projects/${P}/qc`, ([id]) => {
      const p = mustProject(id, root);
      const f = join(p.path, "QC-REVIEW.md");
      const last = p.meta?.lastQc ?? null;
      return { text: existsSync(f) ? readFileSync(f, "utf8") : "", at: existsSync(f) ? statSync(f).mtime.toISOString() : null, last,
        sheetUrls: last?.sheets ? Object.fromEntries(Object.entries(last.sheets).map(([k, v]) => [k, url(id, v)])) : {} };
    }),
    // the Final Mix dialog
    r("GET", `/projects/${P}/mix`, ([id]) => {
      const p = mustProject(id, root), m = p.meta ?? {};
      const rounds = readOptions(p.path).rounds;
      const sfx = readState(p.path);
      return { music: m.music ? { ...m.music, url: url(id, m.music.file) } : null, voice: m.voice?.file ? { file: m.voice.file, saved: m.voice.transcript?.status === "saved", used: !m.voice.offTimeline } : null,          // used: false once the user chose not to use it
        options: rounds.map((r0) => ({ ...r0, tracks: r0.tracks.map((t) => ({ ...t, url: url(id, t.file), current: m.music?.option === t.file || m.music?.file === t.file })) })),
        sfx: (sfx.mounted ?? []).map((x) => ({ name: x.name, start: x.start, file: x.file, auto: !!x.auto })), loudness: m.lastExport?.loudness ?? null, carved: m.carve ?? null };
    }),
    r("POST", `/projects/${P}/mix/music`, async ([id], b) => {
      const p = mustProject(id, root);
      const track = readOptions(p.path).rounds.flatMap((r0) => r0.tracks).find((t) => t.file === b.file);
      if (!track) throw new HttpError(404, "NOT_FOUND", "Not one of the music options");
      return useOption(p, track);
    }),
    // stop the music at a second (the twist), or { at: null } to play it to its end again
    r("POST", `/projects/${P}/mix/music/stop`, ([id], b) => {
      const p = mustProject(id, root);
      if (!p.meta?.music?.file) throw new HttpError(400, "INVALID", "No music on the timeline yet");
      const at = b.at == null || b.at === "" ? null : Number(b.at);
      return musicStop(p, at);
    }),
    r("POST", `/projects/${P}/mix/sfx`, ([id]) => {
      const p = mustProject(id, root);
      return { job: ctx.jobs.start("mix-sfx", { projectId: id, title: "Sound effects" }, async (job) => {
        job.update({ stage: "placing sound effects" });
        unmuteAll(p.path);          // "Place" again brings back the sounds the user took off the timeline
        return placeSfx(p, job.signal);
      }) };
    }),
    r("POST", `/projects/${P}/mix/sfx/clear`, ([id]) => { const p = mustProject(id, root); return mixChange(p, "sound effects removed", () => { mount(p.path, []); writeCredits(p.path); return { placed: 0 }; }); }),
    r("POST", `/projects/${P}/mix/carve`, async ([id]) => {
      const p = mustProject(id, root);
      if (!p.meta?.music?.file || !p.meta?.voice?.file) throw new HttpError(400, "INVALID", "The carve needs a voice-over and a music track on the timeline");
      return mixChange(p, "music under the voice (carve)", async () => {
        const r0 = await runScript(p.path, { name: "carve", args: ["--comp", "index.html", "--bed", "el-music", "--voice", "el-voice"], skills: ["media-use"], root });
        if (!r0.ok) throw new HttpError(500, "CARVE_FAILED", `HyperFrames' carve failed: ${(r0.stderr || r0.stdout).trim().split("\n").slice(-2).join(" ").slice(0, 300)}`);
        projects.updateMeta(id, (m) => { m.carve = { at: new Date().toISOString() }; }, root);
        return { ok: true, output: r0.stdout.trim().slice(-600) };
      });
    }),
    r("POST", `/projects/${P}/boards/pdf`, ([id], b) => {
      const p = mustProject(id, root);
      // one user round: its letters, named by its number
      const letters = Array.isArray(b.options) ? b.options.map(String).filter(isOption) : null;
      const rel = roundPdf(p.path, String(b.round ?? ""), letters?.length ? letters : b.option ? String(b.option) : null, { root, no: Number(b.no) > 0 ? Math.floor(Number(b.no)) : null });
      return { path: rel, name: basename(rel) };
    }),
  ];
  // a still, a sheet or a PDF of the boards, as a download (the UI fetches it with the session token)
  const raw = [
    ["GET", new RegExp(`^/api/projects/${P}/boards/file$`), async ([id], req, q, res) => {
      const p = mustProject(id, root);
      const rel = String(q.get("path") ?? "");
      const f = resolve(p.path, ...rel.split("/"));
      if (!rel.startsWith("boards/rounds/") || !f.startsWith(resolve(p.path, "boards", "rounds") + sep) || !TYPES[extname(f).toLowerCase()] || !existsSync(f))
        throw new HttpError(404, "NOT_FOUND", "No such file");
      res.writeHead(200, { "Content-Type": TYPES[extname(f).toLowerCase()], "Content-Length": statSync(f).size,
        "Content-Disposition": `attachment; filename="${basename(f).replace(/[^\w.-]/g, "_")}"`, "X-Content-Type-Options": "nosniff" });
      createReadStream(f).pipe(res);
      return null;
    }],
  ];
  return { routes, raw, tools };
}
