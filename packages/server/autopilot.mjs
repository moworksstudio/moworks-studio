// The pipeline runs itself: when a step's Claude task or job ends well, the app starts the next step that
// is ready, and stops only at the two gates (storyboard, motion), when Claude asks, when the user pressed Stop, or on a failure. It writes
// the milestone lines to the chat (notes of kind "pipeline", English keys translated by the Editor), keeps the Review to the first build,
// after the self-check has Claude pick the music (the app takes the first of the three tracks and places the sound effects), then runs the
// checks without showing them unless they fail (Claude fixes a failure once); only when they pass is the film done, said once in the chat
// with the self-check's scores. Render: one at a time in the whole app, and a project being rendered
// is not edited.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import * as projects from "../project-service/index.mjs";
import { docPath } from "../project-service/docs.mjs";
import { filmLength } from "../hf-edit/ending.mjs";
import * as pipe from "../pipeline/index.mjs";
import * as plan from "../motion-plan/index.mjs";
import { firstRoundOf, isOption, listRounds, newestRevision, optionIds, optionLabel, ownerRounds, pendingRevision } from "../hf-edit/boards.mjs";
import * as rev from "../revisions/index.mjs";
import { readOptions } from "../sfx/music.mjs";
import { characterNeedsWork } from "../character-kit/index.mjs";
import { voiceFit, voiceFitText } from "../agent/voice-fit.mjs";
import { scriptGap } from "../voice/script.mjs";
import { appMade, rememberAssets } from "../project-service/assets.mjs";
import { unheardSongs } from "../project-service/scan.mjs";
import { createHash } from "node:crypto";
import { STILLS_BUSY } from "../hf-qa/cli.mjs";

const readJson = (f, fallback) => { try { return JSON.parse(readFileSync(f, "utf8")); } catch { return fallback; } };

const now = () => new Date().toISOString();
/** "chạy tiếp", "tiếp tục", "làm tiếp", "continue": the user's word to carry on a stopped step. */
export const RESUME = /^\s*(chạy tiếp|chay tiep|tiếp tục|tiep tuc|làm tiếp|lam tiep|continue|go on|resume)\b/i;

/** Minutes the build and self-check take: from the film's length and its kind, not from the builds done before (a build
 *  run again and again pushed the mean to 38 and 64 minutes for a 10 s film; the real ones took 5-26). A film of HyperFrames frames (build,
 *  Review, sound, checks): about 16 min + 0.8 min a second of film (a 10 s General film took 24: build 11.6, Review 6.7, music 2,
 *  checks 1.5); a film that is one page of code (Lemo, mg, anidoodle, Brush): about 5 min + 0.3 min a second. Without a length, 4 s a shot. The builds are still recorded (build-times.json) to check the formula against. */
function buildTimesFile(root) { return join(process.env.MW_STATE_DIR ?? join(root, "runtime", "state"), "build-times.json"); }
// a 30 s anidoodle film took 37 min (build 18, Review 13, music 2, checks 4) against "about 14": a film drawn
// frame by frame by anidoodle's engine costs about 10 min + 0.9 min a second; Brush, lemo and mg keep 5 + 0.3 (their measured films)
// the whole stage as build-times.json measured it, Build to the finished film: Lemo 20 s 17 min and 30 s 33, mg 30 s
// 36, anidoodle 30 s 37 and 49, Brush 10 s 23-25, What If 30 s 27 ("about 14" was planned for a 30 s Lemo film that took 32)
// a 40 s anidoodle film took 100 min against "54-73" (Review alone 60), a 50 s mg film about 125 (Review
// 100, partly the build's checks running beside it): Tests 14-16, three films at once on one computer. The rates raised for them made the
// next films' range about twice the real time ("120-168", really 64.7: T20-7), so the rates are fitted again on films made one or two at a
// time, "Approve and build" to the finished film: Lemo / mg 34 s 44 min, 43 s 36, 72.8 s 54, 105 s 65 (Tests 17-20); anidoodle 30 s 37
// and 49, 100 s 82 (Test 21): the build, the Review and the checks grow much less than the film. The range's top is half again the middle
// for a slower computer, and past the plan the Pipeline works the time out again from what is done (estimateNow)
// Test 24's 110 s Lemo canvas film (ASCII / CRT) took 35.6 min (Build 11.5, Review 14.2), against "about 68-102" from 18 + 0.45 a second
// and "110 min left" on the page: a Lemo or mg film's time hardly grows with its length (34 s 44 min, 105 s 65, 110 s 36), so its rate is
// flatter, 24 + 0.2 a second (110 s: 46-69), and each film above still falls in its range
// a HyperFrames film past a minute grows far slower too (build-times.json: 105 s 81 min, 120 s 82 against "112-168", T28-13): 0.3 a second past 60 s
const RATES = [[/^anidoodle-/, [26, 0.56]], [/^brush-cartoon$/, [15, 0.9]], [/^(lemo-|mg-)/, [24, 0.2]], [/^what-if$/, [10, 0.6]]];
const HIGH = 1.5, LONG_FILM = 60, PAST_A_MINUTE = 0.3;
export function estimateMinutes(shots, root, { seconds = null, styleId = null } = {}) {
  const sec = Number(seconds) > 0 ? Number(seconds) : Math.max(1, Number(shots) || 1) * 4;
  const own = RATES.find(([re]) => re.test(String(styleId ?? "")))?.[1];
  const raw = own ? own[0] + own[1] * sec : 16 + 0.8 * Math.min(sec, LONG_FILM) + PAST_A_MINUTE * Math.max(0, sec - LONG_FILM);
  const minutes = Math.max(3, Math.min(240, Math.round(raw)));
  // a range (a slower or shared computer takes longer), and what it covers, for the confirm's words
  return { minutes, high: Math.round(minutes * HIGH), covers: "build, review, music and checks", basis: "length" };
}
/** the estimate while the stage runs. Past the planned time the Editor's "about N min left" stood at "about 1 min left" for an
 *  hour (a Review took 1 h 40 min). Once the elapsed time reaches the plan, the whole is worked out again from what is done: the
 *  stage's steps weigh as measured (build 11.6, Review 6.7, music 2, checks 1.5 min), a running step counts half done. */
const SHARES = { build: 0.53, qcReview: 0.31, sound: 0.09, checks: 0.07 };
// The Review's time per round and the steps after it, from the films of Tests 17-24 (tasks.json, the run reports): the Review took
// 6.9-56.8 min in 2-4 rounds, 6.7 min a round in the middle (3.5-14.2), 2 rounds in the middle (3 of 8 films had 3 or 4); the music task
// 2-4.8 min and its mix about 3; the checks 2-13 min. Test 23's countdown said "5 min left" and then "39 min" at its Review's third round
// (the plan ran out and the rest was worked out from shares, T23-11)
export const REVIEW_ROUND = 7, LIKELY_ROUNDS = 2, AFTER_REVIEW = { sound: 6, checks: 4 };
/** The running Review's time left from its rounds (each qc_sheets call starts one; review: { startedAt, rounds, roundAt }): the rest of
 *  the round under way and a likely second round, and as the range's top one round more. A round that starts moves it by a round at most. */
export function reviewLeft(review, now = Date.now()) {
  const k = Math.max(0, Number(review?.rounds) || 0);
  const from = Date.parse((k && review?.roundAt) || review?.startedAt || "");
  const rest = Math.max(1, REVIEW_ROUND - (Number.isFinite(from) ? (now - from) / 60000 : 0));
  const ahead = Math.max(0, LIKELY_ROUNDS - Math.max(k, 1));
  return { low: rest + ahead * REVIEW_ROUND, high: rest + (ahead + 1) * REVIEW_ROUND };
}
/** The Review's rounds so far, from its task's events (the app's "App: qc_sheets…" line at each call). */
export function reviewRounds(task) {
  const xs = (task?.events ?? []).filter((e) => e.kind === "status" && /^App: qc_sheets/.test(e.text ?? ""));
  return { startedAt: task?.createdAt ?? null, rounds: xs.length, roundAt: xs.at(-1)?.at ?? null };
}
/** review: the running Review's rounds (reviewRounds). Once the Build is done the stage's time left is worked out from the steps left
 *  (the Review by its rounds, the music and the checks as measured), a range that holds a likely second round, never from the plan. */
export function estimateNow(est, steps, { startedAt = null, now = Date.now(), review = null } = {}) {
  if (!est?.minutes || !startedAt) return est;
  const elapsed = (now - Date.parse(startedAt)) / 60000;
  const st = Object.fromEntries((steps ?? []).map((s) => [s.id, s.status]));
  const over = (id) => st[id] == null || st[id] === "done" || st[id] === "skipped";
  if (st.build === "done" && ["qcReview", "sound", "checks"].some((id) => st[id] != null)) {
    let low = 0, high = 0;
    if (!over("qcReview")) {
      const r = st.qcReview === "running" ? reviewLeft(review, now) : { low: REVIEW_ROUND * LIKELY_ROUNDS, high: REVIEW_ROUND * (LIKELY_ROUNDS + 1) };
      low += r.low; high += r.high;
    }
    for (const id of ["sound", "checks"]) if (!over(id)) { const m = AFTER_REVIEW[id] / (st[id] === "running" ? 2 : 1); low += m; high += m * HIGH; }
    if (low > 0) return { ...est, minutes: Math.max(1, Math.round(elapsed + low)), high: Math.round(elapsed + high), planned: est.minutes, recomputed: true, basis: "steps" };
  }
  if (!(elapsed >= est.minutes - 1)) return est;
  let done = 0;
  for (const s of steps ?? []) {
    const w = SHARES[s.id];
    if (w) done += s.status === "done" ? w : s.status === "running" ? w / 2 : 0;
  }
  const minutes = Math.round(elapsed / Math.min(0.95, Math.max(0.1, done)));
  return { ...est, minutes: Math.max(minutes, Math.ceil(elapsed) + 2), planned: est.minutes, recomputed: true };
}

function recordBuild(root, shots, minutes, extra = {}) {
  const f = buildTimesFile(root);
  const all = readJson(f, { builds: [] });
  all.builds.push({ shots, minutes: Math.round(minutes * 10) / 10, ...extra, at: now() });          // style and length too: to check the rates
  mkdirSync(join(f, ".."), { recursive: true });
  writeFileSync(f, JSON.stringify({ builds: all.builds.slice(-50) }, null, 2));
}

/** The prompt a step runs with: the way of working's own prompt when the step has one (General: keep, reference), else its prompt. */
export const stepPrompt = (s, facts, vars) => pipe.fill(s.action?.prompts?.[facts?.way] ?? s.action?.prompt ?? "", vars);

/** The lead of a step's prompt when the user approved a storyboard option from the Storyboard dialog. The Motion
 *  Plan's lead said "pose its frames in the project as the starting layouts" while its prompt says "write only MOTION-PLAN.json: no
 *  composition and no index.html"; Claude did both, and the draft frames' check showed red under the plan. The frames stay in the option's
 *  board until the Build, which starts from them. */
export function optionLead(stepId, option) {
  if (!isOption(option)) return "";
  if (stepId === "motionSpec") return `The owner approved storyboard option ${option}: STORYBOARD.md is now boards/${option}/STORYBOARD.md. Its posed frames stay in boards/${option}/index.html, where the Build starts from them: do not copy them into the project in this step (no composition, no index.html). When the project names no design, write option ${option}'s palette and type to frame.md, the one file this step writes besides docs/MOTION-PLAN.json. Then: `;
  if (stepId === "build") return `The approved storyboard is option ${option}: its posed frames in boards/${option}/index.html are the film's starting layouts (their layout, type and colours); build the film from them. `;
  return "";
}

/** The names of the versions: an English key for the Editor's t() with its number. */
const VERSION_KEYS = { build: "Build {n}", edit: "Edit {n}", render: "Render {n}", "before-redo": "Before redo {n}" };

export function createAutopilot(ctx) {
  const { root } = ctx;
  const inFlight = new Set();
  // a step that could not start (a busy computer, Test 33: Approve and build, then 17 minutes of nothing): tried again by itself, then said with a Retry
  const startTries = new Map();
  const START_TRIES = ctx.startTries ?? 3, START_WAIT = ctx.startWait ?? 60000;
  function stepNotStarted(id, s, e) {
    const signedOut = ["CLAUDE_SIGNED_OUT", "NO_CLAUDE"].includes(e?.code), n = (startTries.get(id) ?? 0) + 1;
    if (!signedOut && n <= START_TRIES) {
      startTries.set(id, n);
      setTimeout(() => { advance(id).catch?.(() => null); }, START_WAIT).unref?.();
      return { error: e.message, retrying: n };
    }
    startTries.delete(id);
    const p = projects.getProject(id, root);
    try { if (p && !p.missing) projects.addNote(p.path, { kind: "pipeline", status: "warning", text: signedOut ? e.message : "The step \"{step}\" could not start: {why}. The app tried again and stopped; press Retry when the computer is less busy.", vars: { step: s?.title ?? s?.id ?? "next", why: String(e?.message ?? e).slice(0, 200) }, ...(s?.id ? { retry: s.id } : {}) }); } catch { /* notes are best effort */ }
    return { error: e.message };
  }
  const note = (p, text, vars = {}) => { try { projects.addNote(p.path, { kind: "pipeline", text, vars }); } catch { /* notes are best effort */ } };
  // a reminder card: `open` names the dialog the card's button opens (character | storyboard | motion-plan)
  const waitCard = (p, open, text, vars = {}) => { try { projects.addNote(p.path, { kind: "waiting", open, text, vars }); } catch { /* notes are best effort */ } };
  const meta = (id, fn) => projects.updateMeta(id, fn, root);

  /** A named version: the files as they are now, committed; kept in the project's metadata to open again. Resolves it, or null; never
   *  rejects (best effort: a caller that does not wait for it is kept in order by the project's git queue, revisions inRepo). */
  async function saveVersion(id, kind) {
    try {
      const p = projects.getProject(id, root);
      if (!p || p.missing) return null;
      let at = null;
      try { at = await rev.saveAsync(p.path, `Version: ${kind}`); } catch { return null; }
      if (!at) return null;
      let v = null;
      const last = (projects.getProject(id, root)?.meta?.versions ?? []).at(-1);
      if (last?.kind === kind && !(await rev.changedSinceAsync(p.path, last.rev))) return last;          // the film did not change since the same kind of version
      meta(id, (m) => {
        const list = (m.versions ??= []);
        const n = list.filter((x) => x.kind === kind).length + 1;
        v = { id: `${kind}-${n}-${at.slice(0, 7)}`, kind, n, key: VERSION_KEYS[kind] ?? kind, name: (VERSION_KEYS[kind] ?? kind).replace("{n}", n), rev: at, at: now() };
        list.push(v);
        if (list.length > 200) list.splice(0, list.length - 200);
      });
      return v;
    } catch { return null; }
  }
  /** Open a version again: the one in use is saved first ("before-redo"), then the files go back as they were. */
  async function openVersion(id, vid) {
    const p = projects.getProject(id, root);
    const v = (p?.meta?.versions ?? []).find((x) => x.id === vid);
    if (!v) throw Object.assign(new Error("No such version"), { code: "NOT_FOUND" });
    if (ctx.agent.running.has(id)) throw Object.assign(new Error("Claude is changing the film: wait until it finishes"), { code: "BUSY" });
    if (ctx.renders.isRendering(id)) throw Object.assign(new Error("The film is being rendered: wait until the render finishes"), { code: "RENDERING" });
    await saveVersion(id, "before-redo");
    const at = await rev.restoreTreeAsync(p.path, v.rev, `Opened version: ${v.name}`);
    return { opened: v, revision: at };
  }

  /** Start a step's own work: a job (the checks) or a Claude task with the step's prompt (the way's own prompt for General), or with
   *  the user's own words (`text`), a dialog's step too (the Final Mix's music request). */
  async function startStep(id, s, { text = null, kickoff = false, fromAuto = false } = {}) {
    // a step the user starts (the pipeline's Run, Continue) is counted afresh by the autopilot's repeat limit
    // and the user's go is kept: what the autopilot may go on with after a restart, even if the step was refused just now
    if (!fromAuto) meta(id, (m) => { if (m.pipeline?.autoRun) delete m.pipeline.autoRun; (m.pipeline ??= {}).ownerGo = { at: now(), step: s.id }; });
    const { p, facts } = await ctx.pipelineOf(id);
    if (s.action?.kind === "job" && s.action.job === "qa") return { job: ctx.startQa(p, { onEnd: () => afterQa(id).catch(() => {}) }) };
    // Prepare ran while the voice-over was still being transcribed (97 %) and could not say the voice was English and off
    // topic. It waits for the words; the transcription's end starts it (transcriptLanded)
    if (s.id === "brief" && facts.voice?.transcribing) {
      if (!p.meta?.pipeline?.briefWaits) { meta(id, (m) => { (m.pipeline ??= {}).briefWaits = { at: now() }; }); note(p, "Prepare starts when the voice-over's words are ready."); }
      return { waiting: "transcript" };
    }
    // a film with anidoodle human characters builds only when every character's gate passes (the author's checks)
    if (s.id === "build" && ctx.characterGate && hasCast(p.path)) {
      const g = await Promise.resolve(ctx.characterGate(id)).catch((e) => ({ pass: false, error: e.message, characters: [] }));
      if (!g?.pass) {
        // `failed` is a count of failed checks, `lines` their words (maker.filmGate): the note used to promise a fix nobody started
        const failing = (g?.characters ?? []).filter((c) => (Number(c.failed) || 0) > 0 || c.passed === false);
        const bad = failing.map((c) => c.id).join(", ");
        const detail = failing.map((c) => `- ${c.id}: ${(c.lines ?? []).filter((l) => /FAIL/.test(l)).slice(0, 8).join("; ") || `${c.failed} check(s) failed`}`).join("\n") || g?.error || "";
        const sig = `${bad}|${detail}`.slice(0, 2000);
        if (p.meta?.pipeline?.gateFix?.sig !== sig) {          // Claude fixes it now, once per failure; the build goes on when the gate passes
          meta(id, (m) => { (m.pipeline ??= {}).gateFix = { at: now(), sig }; });
          note(p, "Build waits: the characters' gate failed{why}. Claude is fixing them now, then the build goes on.", { why: bad ? `: ${bad}` : "" });
          ctx.agent.start(id, { by: "app", text: `Before the build, the characters' gate failed:\n${detail}\nFix the film's copy of each character it names (anidoodle/characters/<id>/: keep every joint inside its limits, the canon and the features), never by redrawing it, and run the app's character_gate tool until every character passes. Change nothing else, then stop.` })
            .catch(() => null);
        } else if (!p.meta.pipeline.gateFix.told) {
          meta(id, (m) => { m.pipeline.gateFix.told = now(); });
          note(p, "Build waits: the characters' gate still fails after Claude's fix{why}: tell Claude in the chat what to do.", { why: bad ? `: ${bad}` : "" });
        }
        return { refused: true, gate: g };
      }
      if (p.meta?.pipeline?.gateFix) meta(id, (m) => { delete m.pipeline.gateFix; });
    }
    // a step that opens in a dialog runs Claude only with the user's own words: the Final Mix's "Ask Claude for 3 new tracks" sent its
    // request and nothing started, the answer null while the dialog said Claude was looking (T25-2)
    if (s.action?.kind !== "claude" && !text) return null;
    // a step that comes back after the film was delivered: the film as it is is kept as a version first
    if (["brief", "storyboard", "motionSpec"].includes(s.id) && p.meta?.pipeline?.delivered) await saveVersion(id, "before-redo");
    const motionAgain = s.id === "motionSpec" && s.status === "redo";
    if (motionAgain) meta(id, (m) => { (m.pipeline ??= {}).motionRedoFor = m.approvals?.storyboard?.at ?? null; });
    // the user approved an option straight from the Storyboard dialog: the app copied its STORYBOARD.md; Claude poses its frames and
    // writes its design before the motion
    const option = p.meta?.approvals?.storyboard?.option;
    const fromOption = s.id === "motionSpec" && !motionAgain && !p.meta?.pipeline?.posedFrom?.[option] ? optionLead("motionSpec", option) : "";
    if (fromOption) meta(id, (m) => { ((m.pipeline ??= {}).posedFrom ??= {})[option] = now(); });
    // the Storyboard starts once the voice's words are in; a voice longer than the set length is asked before any frame is drawn
    // that question is the app's own: the task is marked (asks), so the step waits for the user whatever the reply's words, and once
    // the user answered it in the chat (a later task) the Storyboard follows the answer instead of asking again
    const fit = s.id === "storyboard" && !text ? voiceFit(p.meta) : null, fitKey = fit ? `voiceFit:${fit.voice}/${fit.target}` : null;
    const tasks = fit ? ctx.agent.list?.(id) ?? [] : [], askedAt = tasks.findLastIndex((t) => t.asks === fitKey && t.status === "done");
    const answered = askedAt >= 0 && askedAt < tasks.length - 1;
    const fitFirst = !fit ? "" : answered
      ? "The owner answered your question on the voice-over's length in the chat (docs/NOTES.md has it): follow that answer and draw the storyboard timed to the voice; do not ask it again.\n\n"
      : `Before you draw anything: ${voiceFitText(p.meta)} Ask it now, in one message, and stop without drawing a frame; once the owner answered, draw the storyboard timed to the voice as they chose.\n\n`;
    const prompt = text ?? fitFirst + (motionAgain
      ? "The approved storyboard changed after the motion was approved. Rewrite the Motion Plan in docs/MOTION-PLAN.json only for the shots whose frame changed (compare STORYBOARD.md with the plan; frame design and timing too for those shots), keep every other shot's rows as they are, then stop for my approval in the Motion dialog. Do not build."
      : (fromOption || optionLead(s.id, option)) + stepPrompt(s, facts, pipe.promptVars(p.meta)));
    // what Claude cannot open itself, before the brief, as a job the top bar names (2 min 17 s of "Idle" otherwise)
    if (s.id === "brief") {
      try { await ctx.slidesFromBrief?.(p); } catch { /* Prepare asks about a link it cannot read */ }          // Google Slides links in the brief
      await new Promise((done) => {
        try { ctx.jobs.start("scan", { projectId: id, title: "Reading your files", onEnd: () => done() }, async (job) => { job.update({ stage: "reading your files" }); await ctx.scanAssets(p.path); }); }
        catch { Promise.resolve(ctx.scanAssets?.(p.path)).catch(() => {}).then(() => done()); }          // no job list (a test), or one already running
      });
      // a song whose words Whisper could not hear: the owner is told once, with the way to give them; the film goes on
      if (unheardSongs(p.path).length && !p.meta?.pipeline?.songNotice) {
        meta(id, (m) => { (m.pipeline ??= {}).songNotice = true; });
        try { projects.addNote(p.path, { kind: "lyrics", status: "warning", open: "lyrics", text: "The app could not hear this song's words. If the film should follow them, paste them in the Lyrics dialog." }); } catch { /* notes are best effort */ }
      }
    }
    // a lyrics video's song: on the timeline and its beat map written (a song added later comes in here too)
    if (["brief", "storyboard", "motionSpec", "build"].includes(s.id)) { try { await ctx.songArrived?.(p); } catch { /* the step asks about what is missing */ } }
    if (s.id === "brief" && kickoff) {          // the brief is the chat's first message, then the app's line
      const brief = String(p.meta?.brief?.text ?? "").trim();
      if (brief) { try { projects.addNote(p.path, { kind: "brief", text: brief.slice(0, projects.BRIEF_MAX) }); } catch { /* notes are best effort */ } }          // whole, as Claude reads it
      note(p, "Claude is reading your brief and files to prepare the film. Please wait a moment.");
    }
    return { task: await ctx.agent.start(id, { text: prompt, scope: { kind: "project" }, step: s.id, kickoff, ...(fit && !answered ? { asks: fitKey } : {}) }) };
  }

  /** the Storyboard waits for the user's voice-over (or lyrics): one reminder card per kind of wait, opening its dialog; the Editor opens
   *  that dialog by itself too (the pipeline's voiceWait). */
  function voiceCard(p, state) {
    const w = state.find((x) => x.id === "storyboard" && x.voiceWait)?.voiceWait;
    if (!w || !pipe.VOICE_WAITS[w] || p.meta?.pipeline?.voiceCard === w) return;
    meta(p.id, (m) => { (m.pipeline ??= {}).voiceCard = w; });
    const text = { make: "The storyboard is timed to the real voice-over: make it on the Voice screen (Claude's script is in the Script box), or choose No voice-over. The storyboard starts by itself once its words are in.",
      check: "Check and save the voice-over's words on the Voice screen: the storyboard is timed to them and starts by itself once they are saved.",
      failed: "The voice-over's words could not be timed: open the Voice screen and transcribe it again. The storyboard starts by itself once its words are in.",
      // the reason is the job's own red line in the chat, just before this card
      ttsFailed: "The voice-over could not be made: open the Voice screen and create it again. The storyboard starts by itself once its words are in.",
      lyrics: "Time the lyrics in the Lyrics dialog: the storyboard places each line at its time and starts by itself once they are timed." }[w];
    waitCard(p, /^lyrics/.test(w) ? "lyrics" : "voice", text);
  }

  /** The film has not had its Review since its storyboard was approved, and none was tried: the stage that follows a build is still to run. */
  function firstPassLeft(id, m) {
    if (isFinished(m) || !m?.approvals?.storyboard?.at) return false;
    const since = m.approvals.storyboard.at;
    if (m.pipeline?.reviewed?.at && m.pipeline.reviewed.at >= since) return false;
    return !ctx.agent.list?.(id)?.some((t) => t.step === "qcReview" && t.createdAt >= since);
  }

  /** Run the next step that is ready, if any. Safe to call at any time; does nothing while Claude works or the project renders. */
  async function advance(id, { afterChat = false } = {}) {
    if (inFlight.has(id)) return null;
    inFlight.add(id);
    let s = null, before;
    try {
      if (ctx.agent.running.has(id) || ctx.renders.isRendering(id)) return null;
      const { p, state } = await ctx.pipelineOf(id);
      if (p.meta?.pipeline?.autopilot === false) return null;          // off for this project (a test, or the user's choice later)
      // after a chat turn only while the film is not built yet (the user answered Claude's question); the feedback loop runs nothing. A film built
      // by a chat turn (Test 33: "build it" typed after the build never started) still has its first Review ahead: stage 4 goes on (T33-6)
      if (afterChat && ["done", "redo"].includes(state.find((x) => x.id === "build")?.status) && !firstPassLeft(id, p.meta)) return null;
      s = pipe.nextAuto(state);
      if (!s) { voiceCard(p, state); return null; }
      // once the film is done the checks are not run again by themselves (a change in the Final Mix or the chat): the render runs its own
      // quick check; a new build clears `finished` and the stage runs to the end again
      if (s.id === "checks" && isFinished(p.meta)) return null;
      // the motion is rewritten once per new storyboard approval (if Claude changed nothing, the user sees it as it is)
      if (s.id === "motionSpec" && s.status === "redo" && p.meta?.pipeline?.motionRedoFor && p.meta.pipeline.motionRedoFor === p.meta?.approvals?.storyboard?.at) return null;
      // the same step started by the autopilot twice in a row and still not done: no third run by itself (Build ran 6 times,
      // $4.49 for nothing); the user is told once, and Continue or a run from the pipeline starts it again
      const last = p.meta?.pipeline?.autoRun;
      if (s.action?.kind === "claude" && last?.step === s.id && last.n >= 2) {
        if (!last.told) {
          meta(id, (m) => { m.pipeline.autoRun.told = now(); });
          note(p, "The step \"{step}\" ran twice and is still not done{why}. The app stopped running it by itself: look at it, then press Continue or tell Claude in the chat.",
            { step: s.title ?? s.id, why: s.reason?.key ? `: ${pipe.fill(s.reason.key, s.reason.vars ?? {})}` : "" });
        }
        return null;
      }
      if (s.action?.kind === "claude") { before = { run: last ?? null }; meta(id, (m) => { const pl = (m.pipeline ??= {}); pl.autoRun = { step: s.id, n: pl.autoRun?.step === s.id ? (pl.autoRun.n ?? 0) + 1 : 1, at: now() }; }); }
      const started = await startStep(id, s, { fromAuto: true });
      startTries.delete(id);
      return started;
    } catch (e) {
      // it never ran, so it does not count as a run
      if (before) meta(id, (m) => { if (m.pipeline) { if (before.run) m.pipeline.autoRun = before.run; else delete m.pipeline.autoRun; } });
      return stepNotStarted(id, s, e);
    } finally { inFlight.delete(id); }
  }

  /** The checks ended, the last of stage 4: when they pass the film is done; a failure is fixed by Claude once per build, then the user sees it. */
  async function afterQa(id) {
    const p = projects.getProject(id, root);
    if (!p || p.missing) return;
    const qa = pipe.qaFacts(p.meta?.lastQa, p.path);          // a script check that ran out of time blocks nothing
    if (qa?.pass) {
      // checks run from their dialog finish the film only once every step before them is done: after a new build the
      // Review and the music come first (the film is not handed over half-way)
      const state = (await ctx.pipelineOf(id).catch(() => null))?.state ?? [];
      const at = state.findIndex((s) => s.id === "checks");
      // (a step still to run or running; a step waiting for the user, e.g. a Review under 8, does not hold it, as in the autopilot's own run)
      if (state.slice(0, Math.max(0, at)).some((s) => !s.hidden && ["ready", "running", "redo", "blocked"].includes(s.status))) return advance(id);
      await finished(id); return advance(id);
    }
    if (!qa) return;
    // said in plain words, with no "Tech checks" to open (the checks run in the background)
    if (p.meta?.pipeline?.autoFix) { note(p, "{n} problem(s) would still stop the render after Claude's fix: tell Claude in the chat what to do.", { n: qa.blocking ?? 0 }); return; }
    meta(id, (m) => { (m.pipeline ??= {}).autoFix = { at: now() }; });
    return ctx.agent.start(id, { text: "The app's checks found blocking issues in the film (Tech checks dialog, .moworks/cache/qa/last.json). Fix every blocking issue with the smallest change, without changing the approved layouts or motion; say in one line what you fixed.", scope: { kind: "project" }, step: "checks" })
      .catch((e) => stepNotStarted(id, { id: "checks", title: "Checks" }, e));
  }

  /** The music step's task ended: the first of Claude's three tracks goes on the timeline (unless the film has the user's track), the
   *  app places the sound effects; the checks come next (advance). */
  async function afterSound(id) {
    const p = projects.getProject(id, root);
    if (!p || p.missing) return;
    const work = async () => {
      if (!p.meta?.music?.file) {
        const round = readOptions(p.path).rounds.at(-1);
        const track = round?.tracks?.[0];
        if (track) await ctx.mix.useOption(p, track).catch(() => null);
      }
      await ctx.mix.stopFromPlan?.(p);          // the Motion Plan's stop at the twist
      await ctx.mix.placeSfx(p).catch(() => null);
    };
    // a job while it runs: the top bar and GET /pipeline's appBusy show the app at work, not "Idle"
    let end;
    const ended = new Promise((r) => { end = r; });
    try { ctx.jobs.start("mix", { projectId: id, title: "Placing the music and sound effects" }, async (job) => { try { job.update({ stage: "placing the music and sound effects" }); await work(); } finally { end(); } }); }
    catch { await work(); end(); }          // no job list (a test), or one already running
    await ended;
  }

  /** Stage 4 is over (built, self-checked, music and sound effects placed, checks passed): the film is done. Said once per build, as one
   *  chat event the Editor shows green with a tick (a note of kind "pipeline", event "film-done", the self-check's score card in `qc`). */
  async function finished(id) {
    const p = projects.getProject(id, root);
    if (!p || p.missing || p.meta?.pipeline?.finished) return null;
    const qc = pipe.reviewCard(p.path);
    const score = qc?.final ?? null;
    // marked at once: checks that pass again while the version is committed (off the server's thread) hand the film over only once
    meta(id, (x) => { const pl = (x.pipeline ??= {}); pl.delivered ??= { at: now(), score }; pl.finished = { at: now(), score, version: null }; });
    const v = await saveVersion(id, "build");
    const m = p.meta ?? {};
    if (v) meta(id, (x) => { if (x.pipeline?.finished) x.pipeline.finished.version = v.id; });
    const n = v?.n ?? ((m.versions ?? []).filter((x) => x.kind === "build").length || 1);
    const say = () => {
      try {
        // the hand-over: no score and no Tech checks in its words; the Review's card stays in `qc`
        projects.addNote(p.path, { kind: "pipeline", event: "film-done", status: "done", version: v?.id ?? null, qc,
          text: "The film is ready (version {n}). Watch it, change the music or the sound effects in the Final Mix if you like, and press Render. A change you ask for here is built and made ready to render again by itself.",
          vars: { n, score } });
      } catch { /* notes are best effort */ }
    };
    // a code film's preview (a Brush film's one full render) starts here, once, as a quiet background job the
    // Editor shows; the film is handed over at once, not after it
    // every style's film gets its pre-render; the preview service decides what it makes for each style
    try { ctx.previewProxy?.(id); } catch { /* the Editor plays the page live */ }
    say();
    const b = m.pipeline?.build;
    if (b?.startedAt && !b.recorded) {
      const minutes = (Date.now() - Date.parse(b.startedAt)) / 60000;
      if (minutes > 0.5 && minutes < 600) recordBuild(root, b.shots ?? 1, minutes, { style: m.style?.id ?? null, seconds: m.targetDurationSec ?? null });
      meta(id, (x) => { if (x.pipeline?.build) x.pipeline.build.recorded = true; });
    }
  }

  /** The owner's own voice-over script against Prepare's words to read (Test 24: 9 of its 12 lines went in, "the rest told by typing",
   *  written down as "verbatim", and nobody was asked). Claude puts the missing lines back or asks the owner, once per brief; still short
   *  after that, the owner is told in plain words. Resolves with the task it started, else null. */
  async function scriptCheck(id, p, task) {
    const gap = scriptGap(p.path, p.meta?.brief?.text);
    if (!gap) return null;
    const briefAt = p.meta?.brief?.editedAt ?? null, fix = p.meta?.pipeline?.scriptFix?.brief === briefAt ? p.meta.pipeline.scriptFix : null;
    const lines = gap.left.map((l) => `"${l.length > 90 ? `${l.slice(0, 90)}…` : l}"`).join("; ");
    if (!fix) {
      const t = await ctx.agent.start(id, { scope: { kind: "project" }, step: "brief",
        text: `The app's check: the owner wrote the voice-over's script in the brief (${gap.total} lines), and docs/VOICEOVER.md leaves out or changes ${gap.left.length} of them: ${lines}. The owner's script is read word for word (moworks-studio §2b). Write the whole script into docs/VOICEOVER.md as the owner wrote it, every line in its order, and correct what BRIEF.md and docs/NOTES.md say about it. If the film needs the script changed, do not change it: ask the owner in one message with the choices as a bullet list (the whole script as written first), and stop.` }).catch(() => null);
      if (t?.id) { meta(id, (m) => { (m.pipeline ??= {}).scriptFix = { at: now(), brief: briefAt, taskId: t.id, left: gap.left.length }; }); return t; }
      return null;
    }
    if (fix.taskId === task?.id && !fix.told) {
      meta(id, (m) => { m.pipeline.scriptFix.told = now(); });
      try { projects.addNote(p.path, { kind: "voice", status: "warning", text: "Claude's words for the voice-over still leave out {n} of the {total} lines of the script in your brief: {lines}. Check the Script box on the Voice screen before you make the voice-over, or tell Claude in the chat.", vars: { n: gap.left.length, total: gap.total, lines } }); } catch { /* notes are best effort */ }
    }
    return null;
  }

  /** Every Claude task ends here (Agent onFinished). */
  async function taskEnded(id, task) {
    const p = projects.getProject(id, root);
    if (!p || p.missing || !task) return;
    // the files Claude wrote into assets/ are the app's own, never files "the user added" (T22-2)
    const wrote = (task.changed ?? []).map((c) => String(c?.path ?? c).replace(/\\/g, "/")).filter((x) => /^(assets|sources)\//.test(x));
    if (wrote.length) { try { rememberAssets(p.path, wrote); } catch { /* the Assets tab shows them as new once */ } }
    if (task.status === "cancelled") { if (task.step) note(p, "Stopped. What was done is saved. Change what you need, then write “continue” in the chat."); return; }
    if (task.status !== "done") return;
    const step = task.step;
    // the owner said yes to the product's search in a run that began with the web off or asking: the next conversation has the web
    if (p.meta?.research?.restart) {
      meta(id, (m) => { delete m.research.restart; });
      return ctx.agent.start(id, { by: "app", text: "The owner said yes to searching the web for the product, and the web is open now. Search as moworks-studio §2c says, write docs/RESEARCH.md, then go on with what you were doing.", scope: { kind: "project" }, ...(step ? { step } : {}) });
    }
    // the film's source does not compile, so its older bundle would play and render. Claude fixes it once, with the
    // compiler's words; if the same error is still there, the user is told once, and nothing else runs on the broken film
    const be = p.meta?.pipeline?.buildError;
    if (be) {
      const pl = p.meta.pipeline;
      if (pl.buildFix?.error !== be.error) {
        meta(id, (m) => { m.pipeline.buildFix = { at: now(), error: be.error }; });
        return ctx.agent.start(id, { by: "app", text: `The film's code does not compile, so the film cannot be drawn or rendered (the app keeps the older film until it does). The compiler says: ${be.error}\nFix only what it names, with the smallest change, and change nothing else.` })
          .catch(() => null);
      }
      if (!pl.buildFix?.told) {
        meta(id, (m) => { m.pipeline.buildFix.told = now(); });
        note(p, "The film's code still does not compile after Claude's fix, so the film cannot be rendered: tell Claude in the chat what to do.");
      }
      return;
    }
    if (p.meta?.pipeline?.buildFix) meta(id, (m) => { delete m.pipeline.buildFix; });          // it compiles again: a later error gets its fix
    if (!step) {          // a chat turn: in the feedback loop, each round of changes is a version
      // Claude changed a frame's `- sfx:` cues in the chat: the sounds are placed again now, as its rules promise ("after your turn the
      // app finds each sound"), before the version, the preview and the checks take the film (Test 20 waited for "Place them again")
      if (storyboardChanged(task.changed)) { try { await ctx.mix?.cuesAgain?.(p); } catch { /* the Final Mix's Place them again */ } }
      if (p.meta?.pipeline?.delivered && task.changed?.length) await saveVersion(id, "edit");
      // a finished code film changed by the chat: its preview is made again, once, now (never on open)
      if (isFinished(p.meta) && task.changed?.length) { try { ctx.previewProxy?.(id); } catch { /* next change */ } }
      // a chat turn changed a storyboard option before its approval: its pictures are taken again now, as after a storyboard step
      // (the user approved pictures that did not show Claude's last two edits)
      if (!p.meta?.approvals?.storyboard && boardsChanged(task.changed)) { try { ctx.boardStills?.(p); } catch { /* the dialog takes them */ } }
      // the user's answer finished a revision Claude had stopped on: its own card, as after a storyboard step
      if (task.label === "Storyboard · revision" && !pendingRevision(p.path)) {
        const nr = newestRevision(p.path);
        if (nr) waitCard(p, "storyboard", "{label} is ready for you in the Storyboard dialog: approve it, give feedback on it, or make another option.", { label: optionLabel(nr.o, nr.rv.from), option: nr.o });
      }
      // a chat turn changed a film whose last checks failed (a font fixed in the chat): the checks run again at once, as
      // after Claude's own fix (afterQa then says it is done, or what still stops the render); the Pipeline sat on "2 problem(s)" 12 min
      const lastQa = pipe.qaFacts(p.meta?.lastQa, p.path);
      if (task.changed?.length && lastQa && !lastQa.pass && !ctx.renders.isRendering(id)) {
        try { ctx.startQa(projects.getProject(id, root), { onEnd: () => afterQa(id).catch(() => {}) }); return null; } catch { /* a run is going on already */ }
      }
      // a finished film changed by the chat: its checks run again in the background too (they say nothing when it passes), so
      // the Render reuses them with the new preview instead of running them itself (84 s on "Used the finished render")
      if (task.changed?.length && isFinished(p.meta) && !ctx.renders.isRendering(id)) { try { ctx.startQa(projects.getProject(id, root), { background: true }); } catch { /* a run is going on already */ } }
      // the user answered a step that ended with a question (a Review asking how to fix a still): the stage goes on from there
      const prev = ctx.agent.list?.(id)?.filter((t) => t.id !== task.id).at(-1);
      return advance(id, { afterChat: !(prev?.step && prev.status === "done" && pipe.asksOwner(prev.resultText)) });
    }
    if (step === "brief") {          // General: the way of working settled in docs/ASSETS.md ("Way: keep"), unless the user chose one
      const w = pipe.chosenWay(p.path);
      if (w && p.meta?.style?.id === "general" && p.meta?.way?.by !== "owner") meta(id, (m) => { m.way = { id: w, at: now(), by: "claude" }; });
    }
    // a build (the first, or again after a new motion): stage 4 runs to the end again and says when the film is done
    if (step === "build") meta(id, (m) => { if (m.pipeline) { delete m.pipeline.autoFix; m.pipeline.finished = null; } });
    // a code film's preview starts as soon as it is built (a heavy film should play smoothly before it is handed
    // over): the background job waits while Claude's Review changes the film and then renders it as it is; finished() asks again (fresh: no-op)
    if (step === "build") { try { ctx.previewProxy?.(id); } catch { /* the Editor plays the page live */ } }
    // the Review's pictures were stopped twice on a busy computer and no round of this task had them (T26-5): the Review is not done (no
    // score from nothing, the film does not go on as reviewed); the chat says it with a Retry that runs the Review again
    if (step === "qcReview" && task.stillsBusy && !task.qcSheetsOk) {
      try { projects.addNote(p.path, { kind: "review", status: "warning", text: STILLS_BUSY, retry: "qcReview" }); } catch { /* notes are best effort */ }
      return null;
    }
    // a film of a Brand Kit: a rule of the kit's checklist not gone through, or left broken, stops here; the chat says it with a Retry (owner 31/10)
    if (step === "qcReview") {
      const b = pipe.brandCheck(p.path), open = b ? b.failed.length + b.missing.length : 0;
      if (open) {
        try { projects.addNote(p.path, { kind: "review", status: "warning", text: `The Review left ${open} Brand Kit rule(s) not checked or broken: ${[...b.failed, ...b.missing].slice(0, 12).join(", ")}.`, retry: "qcReview" }); } catch { /* notes are best effort */ }
        return null;
      }
    }
    if (step === "qcReview") meta(id, (m) => { (m.pipeline ??= {}).reviewed = { at: now(), taskId: task.id }; });
    if (step === "checks") { const fresh = projects.getProject(id, root); ctx.startQa(fresh, { onEnd: () => afterQa(id).catch(() => {}) }); return; }
    if (step === "sound") await afterSound(id);
    // the stills of the options as Claude left them, taken now: the Storyboard dialog opens with pictures, not on its own capture
    if (step === "storyboard") { try { ctx.boardStills?.(projects.getProject(id, root)); } catch { /* the dialog takes them */ } }
    const { state } = await ctx.pipelineOf(id);
    const s = state.find((x) => x.id === step);
    // every wait for the user gets a reminder card in the chat, the same wait the Pipeline row says ("Waiting for you: …");
    // Claude stopped on a conflict or a missing thing: its message holds the choices
    if (s?.asking) waitCard(p, "chat", "Claude needs your choice before it goes on: read its message and answer in the chat.");
    // Prepare's words to read leave out lines of the owner's own script and it did not ask (Test 24): put back or asked, once
    if (step === "brief" && !s?.asking && await scriptCheck(id, projects.getProject(id, root) ?? p, task)) return null;
    if (step === "character" && s?.status === "needs-you" && !s.asking) {          // a new cast is asked for only once its checks pass
      const g = ctx.characterGate && hasCast(p.path) ? await Promise.resolve(ctx.characterGate(id)).catch(() => null) : { pass: true };
      const cast = castOf(p.path);
      // every member came from the library in its own style and passed its gate: used as it is, never asked again
      if (g?.pass && cast.length && cast.every((c) => characterNeedsWork(c) === "gate")) {
        meta(id, (m) => { (m.approvals ??= {}).characters = { at: now(), by: "app", ownStyle: true, hash: createHash("sha256").update(readFileSync(docPath(p.path, "CHARACTERS.json"))).digest("hex") }; });
        note(p, "Your characters come from your library in their own style and passed their checks: they are used as they are, with nothing to approve.");
        return advance(id);
      }
      // "ready … approve them" only when Approve can be pressed: the model sheets drawn too (the card showed while none was)
      let drawn = true; try { drawn = ctx.characterSheetsDrawn ? !!ctx.characterSheetsDrawn(id) : true; } catch { /* the dialog says it */ }
      if (g?.pass && drawn) waitCard(p, "character", "The new characters are ready and passed their checks. Look at them in the Characters dialog and approve them: you approve once.");
    }
    // Claude stopped a revision to ask about its notes: the card points to its question, not to the storyboard
    if (step === "storyboard" && pendingRevision(p.path)) waitCard(p, "chat", "Claude needs your choice before it goes on: read its message and answer in the chat.");
    else if (step === "storyboard" && s?.status === "needs-you" && !s.asking) {          // named by its option: never a "round"
      const all = listRounds(p.path), shown = all.at(-1), newest = ownerRounds(all, shown).at(-1)?.letters ?? [];
      // a revision just drawn gets its own card (none after A2 otherwise)
      // every round holds A2, so the task that made B looked like A2's: a revision counts only where this task drew it
      const nr = newestRevision(p.path), nrNow = nr && shown?.options.find((x) => x.option === nr.o);
      const justRevised = nrNow && firstRoundOf(all, nr.o, nrNow.hash)?.taskId === task.id ? nrNow : null;
      const o = justRevised ?? shown?.options.filter((x) => newest.includes(x.option)).at(-1) ?? shown?.options.at(-1);
      waitCard(p, "storyboard", "{label} is ready for you in the Storyboard dialog: approve it, give feedback on it, or make another option.", { label: o ? optionLabel(o.option, o.from) : "The storyboard", option: o?.option ?? null });
    }
    if (step === "motionSpec" && s?.status === "needs-you" && !s.asking) {
      // the Motion Plan runs at medium effort, which left a shot with no camera row in both trial runs. The app
      // checks it and Claude adds the missing rows once, before the user looks; a plan still short after that fix shows the shots flagged
      const mp = plan.read(p.path), miss = mp.error ? [] : plan.missingCamera(mp.plan);
      if (miss.length && p.meta?.pipeline?.cameraFix?.taskId !== task.id) {
        const t = await ctx.agent.start(id, { scope: { kind: "project" }, step: "motionSpec",
          text: `The app's check: shot(s) ${miss.join(", ")} of docs/MOTION-PLAN.json have no camera row. Add one row of type "camera" to each (a push, a drift, an orbit or a dolly, with its numbers, as moworks-alive says: the camera moves on every hold), with its name and plain words; change nothing else in the plan, then stop for my approval in the Motion dialog.` }).catch(() => null);
        if (t?.id) { meta(id, (m) => { (m.pipeline ??= {}).cameraFix = { at: now(), taskId: t.id, shots: miss }; }); return null; }
      }
      waitCard(p, "motion-plan", "The Motion Plan is ready for you: under each frame, the motion Claude proposes. Change what you like, then press Approve and build at the end of the Motion Plan dialog: the film is then built, reviewed, given music and checked without another click.");
    }
    return advance(id);
  }

  /** The user approved the storyboard (Storyboard dialog). */
  function storyboardApproved(id, option) {
    const p = projects.getProject(id, root);
    note(p, option ? "Storyboard {name} approved. Claude is writing the Motion Plan now; please wait." : "Storyboard approved. Claude is writing the Motion Plan now; please wait.", { name: option ?? "" });
    return advance(id);
  }
  /** The user approved the motion: the estimate, the line in the chat, the build. */
  function motionApproved(id) {
    const p = projects.getProject(id, root);
    const mp = plan.read(p.path);
    const shots = mp.exists && !mp.error ? mp.plan.shots.length : 1;
    const est = estimateMinutes(shots, root, { seconds: p.meta?.targetDurationSec, styleId: p.meta?.style?.id });
    meta(id, (m) => { (m.pipeline ??= {}).build = { startedAt: now(), shots, estimate: est }; });
    note(p, "Storyboard and Motion Plan approved. Please wait while Moworks Studio builds the film, about {min} minutes.", { min: est.minutes });
    advance(id);
    return est;
  }

  /** Carry on a stopped step (the user's "continue", or a Resume button). */
  async function resume(id, extra = "") {
    if (ctx.agent.running.has(id)) throw Object.assign(new Error("Claude is still working on this project. Stop it or wait for it to finish."), { code: "BUSY" });
    const { state, facts, p } = await ctx.pipelineOf(id);
    meta(id, (m) => { if (m.pipeline) delete m.pipeline.autoRun; });          // the user's Continue: the autopilot may run the step again
    // a built film whose storyboard or motion a chat turn changed (before the feedback loop kept the approvals) waits for a
    // Build again that nobody asked for: Continue keeps them as they are now, and the film goes on from where it is, without a new build
    if (p.meta?.pipeline?.ran?.build && state.some((x) => ["storyboard", "motionSpec"].includes(x.id) && x.status === "redo" && x.reason?.key === "Changed since approval")) {
      const sb = existsSync(join(p.path, "STORYBOARD.md")) ? readFileSync(join(p.path, "STORYBOARD.md"), "utf8") : null;
      meta(id, (m) => { pipe.followApprovals(m, { storyboardText: sb, motionPlanHash: plan.read(p.path).hash, stepId: "feedback", taskId: null, order: [...state.map((x) => x.id), "feedback"] }); });
      const again = await ctx.pipelineOf(id);
      const s0 = again.state.find((x) => x.stopped) ?? null;
      if (!s0) return advance(id);
    }
    const s = state.find((x) => x.stopped) ?? null;
    if (!s) return advance(id);
    if (s.action?.kind === "job") return startStep(id, s);
    const prompt = `${optionLead(s.id, p.meta?.approvals?.storyboard?.option)}${stepPrompt(s, facts, pipe.promptVars(p.meta))}\nYou were stopped part-way: the project's files show what is done; carry on from there.${extra ? `\nThe owner adds: ${extra}` : ""}`;
    return startStep(id, s, { text: prompt });
  }

  /** The brief changed after the film was delivered: the user chooses: "inplace" Claude changes the film's text and content
   *  to the new brief; "storyboard" the film is kept as a version and made again from the preparation; "keep" the film stays as it is. */
  async function briefChanged(id, choice) {
    if (!["inplace", "storyboard", "keep"].includes(choice)) throw Object.assign(new Error("Choose inplace, storyboard or keep"), { code: "INVALID" });
    const p = projects.getProject(id, root);
    meta(id, (m) => { if (m.pipeline) delete m.pipeline.briefChanged; });
    if (choice === "keep") return { choice };
    if (ctx.agent.running.has(id)) throw Object.assign(new Error("Claude is still working on this project. Stop it or wait for it to finish."), { code: "BUSY" });
    await saveVersion(id, "before-redo");
    if (choice === "inplace") {
      const task = await ctx.agent.start(id, { scope: { kind: "project" }, by: "app", text: "The owner changed the brief. Update BRIEF.md to it, then change the film's text and content to match, keeping the approved storyboard layouts and motion; say in one line what changed." });
      return { choice, task: task.id };
    }
    meta(id, (m) => {          // made again from the preparation: the approvals and the first-build marks go, the files stay until replaced
      const pl = (m.pipeline ??= {});
      for (const k of ["marks", "ran"]) if (pl[k]) delete pl[k].brief;
      delete pl.reviewed; delete pl.delivered; delete pl.finished; delete pl.build; delete pl.motionRedoFor; if (pl.marks) delete pl.marks.sound;
      if (m.approvals) { delete m.approvals.storyboard; delete m.approvals.motionPlan; }
    });
    note(p, "Claude is reading your brief and files to prepare the film. Please wait a moment.");
    return { choice, ...(await advance(id) ?? {}) };
  }

  /** Files came into the project (uploaded, imported or copied in Explorer). The app used to send Claude "I added N file(s)… Use them and
   *  go on" in the user's name while a step asked the user: in Test 22 the file was the app's own voice-over, and Claude took the message
   *  for the user's answer and chose one of its own three options itself (21 min, $4.13). Now the app's own files never count (appMade,
   *  and what it remembers as it writes), and while a step waits for the user's answer the app sends nothing in the user's name: it says
   *  in the chat, once for a batch, that the files came and the answer is the user's. */
  const filesWait = new Map();
  function filesAdded(id, files = []) {
    const t = filesWait.get(id);
    const all = [...(t?.files ?? []), ...files];
    if (t) clearTimeout(t.timer);
    filesWait.set(id, { files: all, timer: setTimeout(async () => {
      filesWait.delete(id);
      try {
        if (ctx.agent.running.has(id)) return;          // the running task's next turn reads them in its news
        const { p, state } = await ctx.pipelineOf(id);
        const made = appMade(p.path, p.meta ?? {}), mine = all.filter((f) => !made.has(String(f)));
        if (!mine.length || !state.some((s) => s.asking && !s.hidden)) return;
        const names = mine.map((f) => `"${String(f).split("/").pop()}"`).slice(0, 12).join(", ");
        note(p, "You added {names} while Claude waits for your answer. Tell Claude in the chat what they are for: it goes on with your answer, not before.", { names });
      } catch { /* the user can still write in the chat */ }
    }, ctx.filesDelayMs ?? 3000) });
  }

  /** The first read of a film after the app started: go on only with what the user set going and nothing ran since. Before this,
   *  the film had come to rest after a chat turn (Review closed in the chat, Claude offered the music and nobody answered), and on opening
   *  the app ran the music step by itself, $0.77 with nothing typed. A Claude step goes on only when the user's last go (an approval,
   *  a step started from the pipeline or Continue, or a new film) is newer than the last task; the app's own checks (a job, no cost) go
   *  on. A task cut short is not run again by itself: the Editor offers it. */
  async function resumeOnOpen(id) {
    if (ctx.agent.running.has(id) || ctx.agent.interrupted(id)) return null;
    const { p, state } = await ctx.pipelineOf(id);
    if (isFinished(p.meta)) return null;          // opening a finished film starts nothing
    const s = pipe.nextAuto(state);
    if (!s) return null;
    if (s.action?.kind === "claude") {
      const last = ctx.agent.list(id).at(-1);
      const go = [...Object.values(p.meta?.approvals ?? {}).map((a) => a?.at), p.meta?.pipeline?.ownerGo?.at].filter(Boolean).sort().at(-1) ?? null;
      if (last && !(go && go > last.createdAt)) return null;
    }
    return advance(id);
  }

  /** The voice-over's words landed (the transcription job ended). Prepare waiting for them starts now; a Prepare that ran before them (the
   *  user added the voice later) has Claude check the words against the brief once: their language, topic and length. */
  async function transcriptLanded(id) {
    const p = projects.getProject(id, root);
    if (!p || p.missing || p.meta?.voice?.transcript?.status === "failed" || p.meta?.voice?.transcript?.status === "cancelled") return null;
    if (p.meta?.pipeline?.briefWaits) { meta(id, (m) => { delete m.pipeline.briefWaits; }); return advance(id); }
    // the words landed while Claude was at work (the storyboard being drawn): checked once that turn ends (voiceCheckDue)
    if (ctx.agent.running.has(id)) { meta(id, (m) => { (m.pipeline ??= {}).voiceCheck = { at: now() }; }); return null; }
    const { state } = await ctx.pipelineOf(id);
    const brief = state.find((x) => x.id === "brief"), sb = state.find((x) => x.id === "storyboard");
    if (brief?.status !== "done") return advance(id);
    // the Storyboard waited for these words: it starts now and times its frames to them in one pass (the length asked first)
    if (sb && (sb.voiceWait || sb.status === "ready")) return advance(id);
    // a storyboard drawn before the voice came is timed to the brief's length, not the voice's (50 s against 40 s, found only at the
    // Motion Plan): a drawn one is timed again to the real voice; an approved one is checked, and a mismatch is the user's choice
    const dur = Number(p.meta?.voice?.info?.duration) || null, len = dur ? `${dur.toFixed(1)} s` : "its own length";
    // a voice longer than the film's set length is asked about, never met by stretching the film (45.6 s voice, 40 s film made 47.5 s)
    const set = Number(p.meta?.targetDurationSec) || null, long = voiceFit(p.meta), whole = filmLength(p.meta, { dir: p.path, root });
    if (sb && ["needs-you", "redo"].includes(sb.status)) {
      return ctx.agent.start(id, { scope: { kind: "project" }, step: "storyboard",
        text: long
          ? `The voice-over came while you drew the storyboard (its words with their times: transcript.json). ${voiceFitText(p.meta)} Ask now, in one message, and stop: change no frame time and not the film's length yet. Once the owner chose, time every frame of the option(s) waiting for them to the voice as chosen (each frame's seconds where its words are spoken), keep the frames' pictures and order, and stop for my approval in the Storyboard dialog.`
          : `The voice-over came while you drew the storyboard: it is ${len} (its words with their times: transcript.json). Time every frame of the storyboard option(s) waiting for the owner to the real voice: each frame's seconds where its words are spoken, the film's length staying ${set ? (whole.total !== set ? `${whole.total} s (${set} s of content, the ending's ${whole.fade} s fade after it)` : `${set} s`) : "the one set in New project"} (the hold the brief asks for comes out of what the voice leaves). Keep the frames' pictures and order; change only their times and what the timing needs, then stop for my approval in the Storyboard dialog. If the voice does not fit the brief or the frames (another language or topic, far too short), stop and ask as moworks-studio §2b says.` }).catch(() => null);
    }
    if (sb?.status === "done") {
      return ctx.agent.start(id, { scope: { kind: "project" }, by: "app",
        text: `The voice-over came after the storyboard was approved: it is ${len} (transcript.json has its words and times). Compare it with the approved STORYBOARD.md's frame times and length${set ? ` (the film is set to ${set} s in New project)` : ""}. If they fit, say so in one line and change nothing.${long ? ` ${voiceFitText(p.meta)}` : ""} If they do not, stop and ask as moworks-studio §2b says, with these choices as a bullet list: keep the voice and time the storyboard to it, make the voice again on the Voice screen, or keep both as they are. Change nothing yet.` }).catch(() => null);
    }
    return ctx.agent.start(id, { scope: { kind: "project" }, step: "brief",
      text: "The voice-over's words have just been transcribed (transcript.json), after Prepare ran. Check them against BRIEF.md: their language, what they are about and their length. Anything that does not fit the brief or this film (another language, another topic or product, too long or too short) is a conflict: stop and ask as moworks-studio §2b says (keep the voice-over, use it only in part, or make the film without it). When it fits, say so in one line and change nothing." + (long ? ` ${voiceFitText(p.meta)}` : "") })
      .catch(() => null);
  }

  /** a voice-over's words that landed while Claude worked: checked now that its turn has ended. */
  async function voiceCheckDue(id) {
    const p = projects.getProject(id, root);
    if (!p?.meta?.pipeline?.voiceCheck || ctx.agent.running.has(id)) return null;
    meta(id, (m) => { delete m.pipeline.voiceCheck; });
    return transcriptLanded(id);
  }

  return { startStep, advance, afterQa, finished, taskEnded, transcriptLanded, voiceCheckDue, storyboardApproved, motionApproved, resume, saveVersion, openVersion, briefChanged, filesAdded, resumeOnOpen };
}

/** Did a task change a storyboard option's own files (boards/<option>/…, not the rounds' copies)? */
export const boardsChanged = (changed) => (changed ?? []).some((c) => /^boards\/(?!rounds\/)[^/]+\//.test(String(c?.path ?? c)));
/** A task changed the film's own STORYBOARD.md (its frames' cues), not an option's board. */
export const storyboardChanged = (changed) => (changed ?? []).some((c) => String(c?.path ?? c) === "STORYBOARD.md");

/** The film's cast (CHARACTERS.json), [] when it has none. */
export function castOf(dir) {
  try { const j = JSON.parse(readFileSync(docPath(dir, "CHARACTERS.json"), "utf8")); return Array.isArray(j) ? j : j.characters ?? []; } catch { return []; }
}
/** Does the film have a cast? Every cast is checked before the build and before its approval: anidoodle's (people, rigs) and Brush's
 *  (maker.filmGate checks Brush members too). */
export const hasCast = (dir) => castOf(dir).length > 0;

/** Stage 4 ran to the end for the film as built (a film delivered by an older version has no `finished`: its delivery counts). */
export const isFinished = (m) => { const pl = m?.pipeline ?? {}; return !!(pl.finished !== undefined ? pl.finished : pl.delivered); };

function countOptions(dir) {
  try { return optionIds(join(dir, "boards")).filter((o) => existsSync(join(dir, "boards", o, "STORYBOARD.md"))).length; } catch { return 1; }
}

/** One render at a time in the whole app: a render waits for the one before it; a project is "rendering" from the moment
 *  its render starts until it ends (not while it waits). */
export function createRenderQueue() {
  let chain = Promise.resolve();
  const active = new Map();          // projectId -> { title, at, preview }
  let waiting = 0;
  return {
    /** Wait for the renders before this one; returns release(). preview: a code film's smooth preview (it locks nothing). */
    async acquire(projectId, title, onWait = () => {}, { preview = false } = {}) {
      let release;
      const mine = new Promise((ok) => { release = ok; });
      const before = chain;
      chain = chain.then(() => mine);
      waiting++;
      if (active.size) onWait([...active.values()][0]);
      await before;
      waiting--;
      active.set(projectId, { title, at: now(), preview });
      return () => { active.delete(projectId); release(); };
    },
    /** A real render of this project (a smooth preview only with previews: true). */
    isRendering: (projectId, { previews = false } = {}) => { const a = active.get(projectId); return !!a && (previews || !a.preview); },
    status: () => ({ running: [...active.entries()].map(([projectId, x]) => ({ projectId, title: x.title }))[0] ?? null, queued: waiting }),
  };
}
