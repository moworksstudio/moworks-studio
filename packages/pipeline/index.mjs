// The project pipeline: no step runs before the steps it needs are done.
// Each style lists its steps in config/styles.json (`pipeline`): what each needs first, what counts as done, whether it may be skipped,
// and what its button does (a Claude task, a dialog in the Editor, or a background job). This module turns the project's files and
// metadata into one state per step; the Editor only shows it, the server refuses a step whose prerequisites are not done, and Claude is
// told the same state with every task. Render is not a step: it is the top bar's, available any time.
//
// Step state: done | skipped | running | needs-you (there is something to approve, check or confirm) | redo (done, but an earlier step
// changed after it, or its own file changed since approval) | failed (the checks found blocking issues) | ready | blocked.
//   needs: hard prerequisites, each done or skipped (a hidden step counts as done);
//   after: soft order: never blocks, but a later change there marks this step "redo".
//   when: shown only for "assets" (the user gave files) or "way:<id>|<id>" (the way of working chosen at the Assets analysis; free until
//   one is chosen); a hidden step counts as done.
//   done.file: the file a step must leave; a confirmation or a finished task without it is not done.
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { lookAt } from "../hf-qa/look.mjs";
import * as plan from "../motion-plan/index.mjs";
import { appSounds } from "../project-service/layout.mjs";
import { humanHandOf } from "../style-catalog/hands.mjs";
import { scriptDraft } from "../voice/script.mjs";

const SATISFIED = new Set(["done", "skipped"]);
const sha = (s) => createHash("sha256").update(s).digest("hex");
const mtime = (f) => { try { return statSync(f).mtimeMs; } catch { return null; } };
const time = (iso) => (iso ? Date.parse(iso) || null : null);

/** STORYBOARD.md's content for approval. Left out: the lines later steps write as bookkeeping (HF's frame `src` and `status` when a
 *  frame is built, `sfx` cues of the sound step), so building or adding a sound does not undo the approval of what the frames say. */
export function storyboardHash(text) {
  return sha(String(text).replace(/\r\n/g, "\n").split("\n").filter((l) => !/^\s*-\s*(sfx|src|status)\s*:/i.test(l)).map((l) => l.trimEnd()).join("\n").trim());
}
/** The approved storyboard with a later step's own lines kept (once the Build moved shot 2 from 3.32 s to 1.787 s and every
 *  start): every frame as approved, plus the status / src / sfx lines the step wrote for it (HF's frame status, the scene file, the sounds). */
export function keepApprovedStoryboard(approved, now) {
  const own = /^\s*-\s*(sfx|src|status)\s*:/i;
  const blocks = (t) => String(t).replace(/\r\n/g, "\n").split(/(?=^##\s)/m);
  const num = (b) => Number(/^##\s*(?:Frame|Shot|Scene)?\s*(\d+)/i.exec(b)?.[1] ?? NaN);
  const later = new Map(blocks(now).map((b) => [num(b), b.split("\n").filter((l) => own.test(l))]));
  return blocks(approved).map((b) => {
    const add = later.get(num(b));
    if (!Number.isFinite(num(b)) || !add) return b;
    const lines = b.replace(/\n+$/, "").split("\n").filter((l) => !own.test(l));
    const tail = b.match(/\n+$/)?.[0] ?? "\n";
    return [...lines, ...add].join("\n") + tail;
  }).join("");
}
/** The starter storyboard the project service writes (one placeholder title frame) is not a storyboard yet. */
export const isStarter = (shots) => shots.filter((s) => s.index != null).length <= 1 && shots.some((s) => /placeholder until the storyboard is written/i.test(s.scene ?? ""));

const KIND_DIRS = ["images", "video", "audio", "fonts", "logos", "voiceover"];
function assetFacts(dir) {
  const out = { count: 0, audioAt: null, videoAt: null, sources: 0 };
  const walk = (d, fn) => { if (!existsSync(d)) return; for (const n of readdirSync(d)) { if (/^desktop\.ini$/i.test(n)) continue; const p = join(d, n); const s = statSync(p); if (s.isDirectory()) walk(p, fn); else fn(p, n, s); } };
  const placed = appSounds(dir);          // the sounds the app placed share assets/3_audio/sfx with the user's
  walk(join(dir, "assets"), (p, n, s) => {
    // the app's own copies (GSAP, sounds it placed, the fonts it embeds)
    if (/[\\/]assets[\\/](_app|vendor|sfx|fonts[\\/](bundled|kit|google))[\\/]/i.test(p) || placed.has(relative(dir, p).split(sep).join("/"))) return;
    out.count++;
    if (/\.(mp3|wav|m4a|flac|ogg|aac)$/i.test(n)) out.audioAt = Math.max(out.audioAt ?? 0, s.mtimeMs);
    if (/\.(mp4|mov|webm|m4v|mkv)$/i.test(n)) out.videoAt = Math.max(out.videoAt ?? 0, s.mtimeMs);
  });
  walk(join(dir, "sources"), () => { out.sources++; });
  return out;
}

/** A style whose film is one page of code: Lemo-Opuscar, mg-styles-15, anidoodle and Brush cartoon films are a single index.html
 *  (and its script), with no HyperFrames sub-composition mounted per frame, so "every frame mounted" never holds for them. */
// What If (its Build once ran twice and was never "built") is one page of code too: whatif/ bundled to film.js
export const isCodeFilm = (styleId) => /^(lemo-|mg-|anidoodle-)/.test(String(styleId ?? "")) || styleId === "brush-cartoon" || styleId === "what-if";

/** The last Tech checks as the steps judge them. A script check that ran out of time found nothing and blocks nothing,
 *  in reports saved before that rule too: the blocking count is read again from the report's gates. */
export function qaFacts(lastQa, dir) {
  if (!lastQa || !lastQa.blocking) return lastQa ?? null;
  let r = null; try { r = JSON.parse(readFileSync(join(dir, ".moworks", "cache", "qa", "last.json"), "utf8")); } catch { return lastQa; }
  const gates = r?.checks ?? r?.gates;
  if (!Array.isArray(gates) || r.revision !== lastQa.revision) return lastQa;
  const late = (f) => f.code === "check_timed_out" || (f.code === "check_runtime_failure" && /deadline|timed? ?out/i.test(String(f.message ?? "")));
  const blocking = gates.filter((g) => g.blocking && !g.pass && !(g.id === "G-HF-SCRIPT" && (g.findings ?? []).length && g.findings.every(late))).length;
  return blocking === lastQa.blocking ? lastQa : { ...lastQa, blocking, pass: blocking === 0 };
}

/** The Storyboard was once drawn to the brief's 40 s while the voice, made 51 s later, was 45.6 s; a
 *  second pass timed it again, and the length conflict showed only then. So the Storyboard waits for the voice-over and its words, or the
 *  song's lyrics timed, so it times its frames to the real words in one pass. What it waits for: null (nothing: no narration planned, the
 *  user chose "No voice-over", or the words are in), "make" (Prepare wrote the words to read, VOICEOVER.md, and no voice is made yet),
 *  "words" (the voice being made or its words timed), "check" (the words differ from the script: the user checks and saves them),
 *  "failed" (their timing failed or never ran), "lyrics" (lyrics.txt not timed to the track yet), "lyricsTiming" (being timed). */
export function voiceWaitOf(dir, m = {}, running = () => false) {
  if (m.pipeline?.voiceSkip) return null;
  let lyrics = "", lyricsAt = 0, timedAt = null;
  try { lyrics = readFileSync(join(dir, "lyrics.txt"), "utf8").trim(); lyricsAt = statSync(join(dir, "lyrics.txt")).mtimeMs; } catch { /* no lyrics */ }
  if (lyrics) {
    if (running("lyrics")) return "lyricsTiming";
    try { timedAt = Date.parse(JSON.parse(readFileSync(join(dir, ".moworks", "lyrics", "words.json"), "utf8")).at); } catch { /* not timed */ }
    if (!(timedAt && lyricsAt <= timedAt + 1000)) return "lyrics";
  }
  const v = m.voice ?? {};
  if (v.noVoice || v.offTimeline) return null;          // the user chose No voice-over (the Voice screen), or took it off (not a bare source "none")
  if (v.file) {
    const st = v.transcript?.status;
    if (st === "saved") return null;
    if (running("transcribe") || running("tts")) return "words";
    return st === "review" ? "check" : "failed";          // failed, stopped, or never started (no Whisper model): the user times them
  }
  if (running("tts")) return "words";
  return scriptDraft(dir)?.from === "VOICEOVER.md" ? "make" : null;
}
/** The waits for the voice that the user acts on (the others are the app at work). */
export const VOICE_WAITS = { make: "Waiting for you: make the voice-over", check: "Waiting for you: check and save the voice-over's words",
  failed: "Waiting for you: time the voice-over's words", lyrics: "Waiting for you: time the lyrics" };

/** The warnings of the last Tech checks (the findings of the checks that do not stop the render, each with its plain line for the
 *  user), for the Pipeline's Tech checks row; checks that could not run (out of time, skipped) are no warning about the film. null: no report
 *  for the film's last checks. The same count as the Tech checks sheet (lookAt: one line found at several places is one). */
export function qaWarnings(lastQa, dir) { return qaLook(lastQa, dir)?.count ?? null; }
/** The checks of the last Tech checks that could not run (out of time, an error of their own): neither a pass nor a warning about the film,
 *  for the Pipeline's Tech checks row ("1 not checked"). null: no report for the film's last checks. */
export function qaNotChecked(lastQa, dir) { return qaLook(lastQa, dir)?.skipped.length ?? null; }
function qaLook(lastQa, dir) {
  if (!lastQa) return null;
  let r = null; try { r = JSON.parse(readFileSync(join(dir, ".moworks", "cache", "qa", "last.json"), "utf8")); } catch { return null; }
  const gates = r?.checks ?? r?.gates;
  if (!Array.isArray(gates) || (lastQa.revision && r.revision !== lastQa.revision)) return null;
  return lookAt({ checks: gates });
}

/** The film's cast as CHARACTERS.json lists it: { "characters": [...] }, or a bare list (Prepare once wrote one, and the Character step
 *  never showed: three people drawn from words alone, a grandmother read as an old man, Test 21); null with no file or no list in it. */
export function castList(dir) {
  try { const j = JSON.parse(readFileSync(join(dir, "CHARACTERS.json"), "utf8")); return Array.isArray(j) ? j : Array.isArray(j?.characters) ? j.characters : null; }
  catch { return null; }
}

/** Everything the steps are judged on, read from the project folder and its metadata. */
export function gatherFacts(project, { shots = [], head = null, jobs = [], runningTask = null, workAt = undefined, qaStale = undefined, lastTasks = {}, extra = {} } = {}) {
  const dir = project.path, m = project.meta ?? {};
  const file = (rel) => { const f = join(dir, ...rel.split("/")); const t = mtime(f); return t != null && statSync(f).size > 0 ? { at: t } : null; };
  const sbFile = join(dir, "STORYBOARD.md");
  const sbText = existsSync(sbFile) ? readFileSync(sbFile, "utf8") : null;
  const mp = plan.read(dir);
  const frames = shots.filter((s) => s.index != null);
  const mounted = frames.length > 0 && !isStarter(shots) && frames.every((s) => s.start != null && s.src && existsSync(join(dir, s.src)));
  let compAt = null;
  const walk = (d) => { if (!existsSync(d)) return; for (const n of readdirSync(d)) { const p = join(d, n); const s = statSync(p); if (s.isDirectory()) walk(p); else if (n.endsWith(".html")) compAt = Math.max(compAt ?? 0, s.mtimeMs); } };
  walk(join(dir, "compositions"));
  // Frames with a file are not yet a Build: the storyboard / Shot plan steps mount still compositions too ("Redo" was once shown before Build
  // ever ran). The film is built when the Build step ran, or every frame is `animated` (HF's status), or its files changed after the user
  // approved the motion spec (a build asked for in the chat).
  const mpApproved = time(m.approvals?.motionPlan?.at);
  const builtAtAll = workAt !== undefined && workAt !== null ? workAt : compAt;
  // a code film is built once its page exists and the Build step ran (or the page changed after the motion was approved)
  const codeFilm = isCodeFilm(m.style?.id) && !!file("index.html");
  const built = (mounted && (!!m.pipeline?.ran?.build || frames.every((s) => s.status === "animated") || (mpApproved != null && builtAtAll != null && builtAtAll > mpApproved)))
    || (codeFilm && (!!m.pipeline?.ran?.build || (mpApproved != null && builtAtAll != null && builtAtAll > mpApproved)));
  const running = (kind) => jobs.some((j) => j.status === "running" && j.kind === kind);
  return {
    brief: { text: String(m.brief?.text ?? "").trim(), mode: m.brief?.mode ?? "idea", at: time(m.brief?.editedAt ?? m.createdAt) },
    assets: assetFacts(dir),
    file,
    storyboard: { real: frames.length > 0 && !isStarter(shots), hash: sbText != null ? storyboardHash(sbText) : null, rawHash: sbText != null ? sha(sbText) : null },
    motionPlan: { exists: mp.exists && !mp.error && mp.plan.shots.length > 0, hash: mp.hash },
    approvals: m.approvals ?? {},
    voice: { file: m.voice?.file ?? null, transcript: m.voice?.transcript ?? null, transcribing: running("transcribe") || running("tts") },
    voiceWait: voiceWaitOf(dir, m, running),          // what the Storyboard waits for before it draws
    marks: m.pipeline?.marks ?? {}, skips: m.pipeline?.skips ?? {}, ran: m.pipeline?.ran ?? {}, keeps: m.pipeline?.keeps ?? {},
    built: { ok: built, at: workAt !== undefined && workAt !== null ? workAt : compAt },        // workAt: from git, without Studio's id revisions
    buildError: m.pipeline?.buildError?.error ?? null,          // the film's source did not compile at the last finalize
    qa: qaFacts(m.lastQa, dir), head, qaStale, qaRunning: running("qa"),
    // the film handed over (the autopilot's finished, else delivered; a new build clears finished): the feedback loop
    finished: !!(m.pipeline?.finished !== undefined ? m.pipeline.finished : m.pipeline?.delivered),
    castEmpty: castList(dir)?.length === 0,
    // humanHand: an anidoodle medium whose hand draws the author's human characters: its films get a Character step
    flags: { characters: !!m.flags?.characters, assets: (() => { const a = assetFacts(dir); return a.count + a.sources > 0; })(), humanHand: !!humanHandOf(m.style?.id),
      // a film whose cast Prepare wrote (the user chose "Claude makes them", any medium) gets its Character step too, before
      // the Storyboard, with one approval: three animals were made inside the Build with none (38 min, the gate failing 5 times)
      cast: !!humanHandOf(m.style?.id) || (castList(dir)?.length ?? 0) > 0 },
    way: normalWay(m.way?.id ?? chosenWay(dir) ?? "free"), wayChosen: !!(m.way?.id ?? chosenWay(dir)), wayAt: time(m.way?.at), proposedWay: proposedWay(dir),
    // the QC review runs on the first build only, and again after a new storyboard approval
    reviewedAt: time(m.pipeline?.reviewed?.at), storyboardAt: time(m.approvals?.storyboard?.at),
    lastTasks,
    music: m.music?.file ?? null,
    review: reviewScore(dir),
    boards: existsSync(join(dir, "boards", "rounds")),
    approvalFile: (name, rel) => { const t = file(rel); return t ? { at: t.at, hash: sha(readFileSync(join(dir, ...rel.split("/")))) } : null; },
    // a chat turn answering a step's question is that step at work
    runningStep: runningTask?.step ?? runningTask?.continues ?? null, claudeBusy: !!runningTask, claudeStarting: !!runningTask?.starting,
    // what the stage lines name
    storyboardPick: m.approvals?.storyboard?.option ?? null, motionShots: mp.exists && !mp.error ? mp.plan.shots.length : 0, musicTitle: m.music?.title ?? null,
    ...extra,
  };
}

/** The QC review's last "Final score: N/10" line in QC-REVIEW.md: { score, at } or null. */
export function reviewScore(dir) {
  const f = join(dir, "QC-REVIEW.md");
  try {
    const xs = [...readFileSync(f, "utf8").matchAll(/Final score:\s*\**\s*(\d+(?:[.,]\d+)?)\s*\/\s*10/gi)];
    return { score: xs.length ? Number(xs.at(-1)[1].replace(",", ".")) : null, at: mtime(f) };
  } catch { return null; }
}

/** The seven criteria of the QC review, in order. */
export const QC_CRITERIA = ["hook", "phone", "motion", "variety", "composition", "brand", "sync"];
const num = (x) => { if (x == null || x === "") return null; const n = Number(String(x).replace(",", ".")); return Number.isFinite(n) ? Math.round(n * 10) / 10 : null; };
/** The QC review as data for the Editor's score card: QC-REVIEW.json as Claude writes it with QC-REVIEW.md,
 *  { final, at, rounds: [{ round, scores: { hook, phone, motion, variety, composition, brand, sync }, low, worst: [{ at, text }], changed }] };
 *  without the JSON (an older review), the final score alone. null when there is no review. */
export function reviewCard(dir) {
  const md = reviewScore(dir);
  let j = null;
  try { j = JSON.parse(readFileSync(join(dir, "QC-REVIEW.json"), "utf8")); } catch { /* none, or not JSON: the final score alone */ }
  const rounds = (Array.isArray(j?.rounds) ? j.rounds : []).slice(0, 10).map((r, i) => {
    const scores = Object.fromEntries(QC_CRITERIA.map((k) => [k, num(r?.scores?.[k])]));
    const xs = Object.values(scores).filter((x) => x != null);
    return { round: Number(r?.round) || i + 1, scores, low: xs.length ? Math.min(...xs) : null,
      worst: (Array.isArray(r?.worst) ? r.worst : []).slice(0, 5).map((w) => (typeof w === "string" ? { at: null, text: w.slice(0, 300) } : { at: num(w?.at), text: String(w?.text ?? "").slice(0, 300) })),
      changed: String(r?.changed ?? "").slice(0, 600) };
  });
  const final = md?.score ?? num(j?.final) ?? rounds.at(-1)?.low ?? null;
  if (final == null && !rounds.length) return null;
  return { final, pass: final != null && final >= 8, at: md?.at ? new Date(md.at).toISOString() : null, criteria: QC_CRITERIA, rounds };
}

/** The ways of working of General Style: free, keep, reference. Older projects
 *  may hold relayout (now free) or remake (now reference). */
export const WAYS = ["free", "keep", "reference"];
const LEGACY_WAYS = { relayout: "free", remake: "reference" };
export const normalWay = (w) => (WAYS.includes(w) ? w : LEGACY_WAYS[w] ?? "free");
const wayLine = (dir, rx) => {
  try { const m = rx.exec(readFileSync(join(dir, "ASSETS.md"), "utf8")); const w = m?.[1]?.toLowerCase(); return w && (WAYS.includes(w) || LEGACY_WAYS[w]) ? normalWay(w) : null; }
  catch { return null; }
};
/** The way Claude proposed in ASSETS.md (a line "Proposed way: <id>"), or null. */
export const proposedWay = (dir) => wayLine(dir, /Proposed way:\s*`?([a-z]+)/i);
/** The way settled in the Prepare step: ASSETS.md's last "Way: <id>" line (Claude writes it once the user answered, or when no question was needed). */
export function chosenWay(dir) {
  try { const xs = [...readFileSync(join(dir, "ASSETS.md"), "utf8").matchAll(/^\s*`?Way:\s*`?([a-z]+)/gim)]; const w = xs.at(-1)?.[1]?.toLowerCase(); return w && (WAYS.includes(w) || LEGACY_WAYS[w]) ? normalWay(w) : null; }
  catch { return null; }
}
/** Is a step shown for this film? */
export function shown(step, f) {
  if (!step.when) return true;
  if (step.when === "assets") return !!f.flags?.assets;
  if (step.when.startsWith("way:")) return step.when.slice(4).split("|").includes(f.way ?? "free");
  return !!f.flags?.[step.when];
}

/** Judge a step's "done" rule: { met, at, partial, changed, why } (why: an English key for the Editor, with vars). */
export function judge(done, f, id = null) {
  switch (done?.kind) {
    case "brief": {
      const met = !!f.brief.text || f.assets.count > 0 || f.assets.sources > 0;
      return { met, at: f.brief.at };
    }
    case "file": { const x = f.file(done.path); return { met: !!x, at: x?.at ?? null }; }
    case "anyFile": { const xs = done.paths.map((p) => f.file(p)).filter(Boolean); return { met: xs.length > 0, at: xs.length ? Math.max(...xs.map((x) => x.at)) : null }; }
    case "script": {         // SCRIPT.md, a pasted script (brief "I have a script"), or the saved voice-over transcript
      const ats = [f.file("SCRIPT.md")?.at, f.brief.mode === "script" && f.brief.text ? f.brief.at : null, f.voice.transcript?.status === "saved" ? time(f.voice.transcript.savedAt) : null].filter((x) => x != null);
      return { met: ats.length > 0, at: ats.length ? Math.max(...ats) : null };
    }
    case "approval": {
      const a = f.approvals[done.name];
      if (done.file) {          // an approved document (style guide, shot list): approved = the file as it was approved
        const cur = f.approvalFile?.(done.name, done.file);
        // the cast is approved once: Claude's later work on it (a gate fix, a pose added for a shot) keeps the approval
        if (a && cur && done.name === "characters") return { met: true, at: time(a.at) };
        if (a && cur) { const changed = a.hash !== cur.hash; return { met: true, at: time(a.at), changed, why: changed ? { key: "Changed since approval" } : null }; }
        // a film with no characters (CHARACTERS.json with an empty list, written by the step): nothing to approve, the step is done
        if (done.name === "characters" && cur && f.ran?.[id] && f.castEmpty) return { met: true, at: cur.at };
        // the file there before the step ran (a character taken from the user's library wrote CHARACTERS.json) is the step's starting
        // point, not its work: the step is Claude's to run, and only then waits for the user's approval
        const ran = !!f.ran?.[id];
        return { met: false, at: null, partial: !!cur && ran, why: cur && ran ? { key: "Waiting for your approval" } : null };
      }
      const content = done.name === "motionPlan" ? f.motionPlan.exists : f.storyboard.real;
      const cur = done.name === "motionPlan" ? f.motionPlan.hash : f.storyboard;
      let changed = !!a && (done.name === "motionPlan" ? a.hash !== cur : (a.contentHash ? a.contentHash !== cur.hash : a.hash !== cur.rawHash));
      // while Claude works on a later step or a chat turn, its files are half-written: the approval is judged when the task ends
      // (the Pipeline fell back to 1/5 "Changed since approval: approve again" for 30 s during the Build and a chat fix)
      // (a message only being sent writes nothing yet: the approval is judged; a changed storyboard was once read as done)
      if (changed && f.claudeBusy && !f.claudeStarting && f.runningStep !== id) changed = false;
      if (a && content) return { met: true, at: time(a.at), changed, why: changed ? { key: "Changed since approval" } : null, adjusted: a.adjusted ?? null };
      if (!content && done.name === "storyboard" && f.boards) return { met: false, partial: true, why: { key: "Pick one of the options in the Storyboard dialog" } };    // three boards, nothing chosen yet
      return { met: false, at: null, partial: content, why: content ? { key: "Waiting for your approval" } : null };
    }
    case "voice": {
      const t = f.voice.transcript;
      if (f.voice.file && t?.status === "saved") return { met: true, at: time(t.savedAt ?? t.at) };
      if (f.voice.file) return { met: false, partial: true, why: { key: t?.status === "failed" ? "Transcription failed: open to try again" : t?.status === "review" ? "Check and save the transcript" : "The words are not timed yet" } };
      return { met: false };
    }
    case "mark": {
      const mk = f.marks[id];
      const out = done.file ? f.file(done.file) : true;
      if (mk && out) return { met: true, at: time(mk.at) };
      // a step done by itself whose file came in a later chat turn (Claude asked, the user answered in the chat)
      if (done.auto && f.ran[id] && out && out !== true) return { met: true, at: out.at };
      const ran = f.ran[id];
      // a step allowed to ask (Prepare): no file after Claude's turn means Claude asked something; the user answers in the chat
      if (ran && !out && done.ask) return { met: false, partial: true, asking: true, why: { key: "Claude is asking: answer in the chat" } };
      if (ran && !out) return { met: false, failed: true, why: { key: "Claude finished but {file} is missing: run it again", vars: { file: done.file } } };
      return { met: false, partial: !!ran && !done.auto, why: ran && !done.auto ? { key: "Claude is done: check and confirm" } : null };
    }
    case "way": {         // the user confirmed the way of working in the Assets dialog
      if (f.wayChosen) return { met: true, at: f.wayAt ?? null };
      const a = f.file("ASSETS.md");
      return { met: false, partial: !!a, why: a ? { key: "Choose how to work with your files" } : null };
    }
    case "audioIn": {     // a voice-over (its words checked) or a track of your own, on the timeline
      if (f.voice.file && f.voice.transcript?.status === "saved") return { met: true, at: time(f.voice.transcript.savedAt ?? f.voice.transcript.at) };
      if (f.music) return { met: true, at: null };
      if (f.voice.file) return { met: false, partial: true, why: { key: f.voice.transcript?.status === "review" ? "Check and save the transcript" : "The words are not timed yet" } };
      return { met: false };
    }
    case "review": {      // the QC review: every score 8 or more (the lowest is the final score); under 8 after the rounds: the user reads why
      const r = f.review;
      if (r?.score != null && r.score >= 8) return { met: true, at: r.at };
      if (r?.score != null) return { met: false, partial: true, why: { key: "Final score {n}/10: read QC-REVIEW.md", vars: { n: r.score } } };
      if (f.ran[id]) return { met: false, failed: true, why: { key: "Claude finished but {file} has no final score: run it again", vars: { file: "QC-REVIEW.md" } } };
      return { met: false };
    }
    case "built":          // a film whose source does not compile is not built (its older bundle would play and render)
      if (f.buildError) return { met: false, failed: true, why: { key: "The film's code does not compile" } };
      return { met: f.built.ok, at: f.built.at };
    case "qa": {
      const q = f.qa;
      if (!q) return { met: false };
      if (!q.pass) return { met: false, failed: true, why: { key: "{n} blocking issue(s) at the last check", vars: { n: q.blocking ?? 0 } } };
      const changed = f.qaStale !== undefined ? f.qaStale : !!f.head && q.revision !== f.head;
      return { met: true, at: time(q.at), changed, why: changed ? { key: "The film changed after the last check" } : null };
    }
    case "audioAsset": return { met: f.assets.audioAt != null, at: f.assets.audioAt };
    case "videoAsset": return { met: f.assets.videoAt != null, at: f.assets.videoAt };
    default: return { met: false };
  }
}

const isRunning = (step, f) => f.runningStep === step.id || (step.done?.kind === "qa" && f.qaRunning) || (["voice", "audioIn"].includes(step.done?.kind) && f.voice.transcribing);

/** The state of every step, in order: [{ ...step, status, reason, doneAt, visible }]. */
export function computePipeline(steps, f) {
  const by = new Map();
  const out = [];
  let answering = null;          // the step whose question the running chat turn answers
  for (const step of steps ?? []) {
    const visible = shown(step, f);
    const s = { ...step, visible, status: "ready", reason: null, doneAt: null };
    by.set(step.id, s); out.push(s);
    if (!visible) { s.status = "done"; s.hidden = true; continue; }
    if (step.quiet) s.hiddenInList = true;          // shown only when it fails (set again below)
    // the QC review runs on the first build, and again after a newer storyboard approval
    const again = step.firstOnly && f.reviewedAt != null && f.storyboardAt != null && f.storyboardAt > f.reviewedAt;
    if (step.firstOnly && f.reviewedAt != null && !again && !isRunning(step, f)) {
      s.status = "done"; s.doneAt = f.reviewedAt; s.reason = f.review?.score != null ? { key: "Review {n}/10", vars: { n: f.review.score } } : null; continue;
    }
    const j = again ? { met: false } : judge(step.done, f, step.id);
    const needs = (step.needs ?? []).map((id) => by.get(id)).filter((x) => x && x.visible);
    const after = (step.after ?? []).map((id) => by.get(id)).filter((x) => x && x.visible);
    // an optional step (the Final Mix) opens on what was done once: a later change there does not lock it
    const unmet = needs.filter((x) => !SATISFIED.has(x.status) && !(step.optional && x.status === "redo"));
    const missing = unmet.filter((x) => x.status !== "redo");        // never done: a built film is not "built" for this step yet
    const skip = step.skippable ? f.skips[step.id] : null;
    if (isRunning(step, f)) { s.status = "running"; s.reason = { key: step.done?.kind === "qa" ? "Tech checks are running" : step.done?.kind === "voice" ? "Transcribing" : "Claude is working on it" }; }
    else if (skip && !j.met) { s.status = "skipped"; s.doneAt = time(skip.at); s.reason = { key: step.skipLabel ?? "Skipped" }; }
    else if (j.met) {
      // done at the latest of: its own result, the end of the Claude task that made it (that task may touch an earlier step's file too,
      // which is not "an earlier step changed after this"), and the user's "keep it as it is"
      const keep = f.keeps?.[step.id], ran = f.ran?.[step.id];
      s.doneAt = Math.max(j.at ?? 0, keep ? time(keep.at) ?? 0 : 0, ran && j.at != null ? time(ran.at) ?? 0 : 0) || j.at;
      // the user's own media (the voice-over, the track, the source clip) leads: a later storyboard never asks to record it again
      const source = ["voice", "audioIn", "audioAsset", "videoAsset", "way"].includes(step.done?.kind);
      // the cast approved again (Claude's gate fix, the user's look again) never asks for a new storyboard and
      // motion: the build draws the cast as it is now, and a storyboard redrawn for a new look is the user's call (Storyboard, "Draw again")
      // Prepare once ran again for the voice answer and the approved cast showed "Approve again", which did nothing: the cast is
      // approved once; an earlier step that ran again does not ask for it again
      const moved = !source && step.id !== "character" && [...needs, ...after].filter((x) => x.id !== "character").find((x) => x.status === "redo" || (x.doneAt != null && s.doneAt != null && x.doneAt > s.doneAt + 1000));
      // the music stays when the picture changes (the user changes it in the Final Mix), and once the film is handed
      // over the background checks (quiet) run again before a render on their own: neither turns "redo" for a change the user made
      const stays = (step.id === "sound" && !j.changed) || (step.quiet && f.finished);
      if (step.done?.kind === "built" && missing.length) { s.status = "blocked"; s.doneAt = null; s.reason = { key: "Finish “{step}” first", vars: { step: missing[0].title } }; }
      else if ((j.changed || moved) && stays) { s.status = "done"; s.stale = true; }
      else if (j.changed) { s.status = "redo"; s.reason = j.why; }
      else if (moved) { s.status = "redo"; s.canKeep = true; s.reason = { key: "“{step}” changed after this was done", vars: { step: moved.title } }; }
      else s.status = "done";
    }
    else if (unmet.length) {
      s.status = "blocked";
      const u = unmet[0];
      s.reason = { key: u.done?.kind === "approval" && u.status === "needs-you" ? "Approve “{step}” first" : u.status === "redo"
        // say where, and offer keeping only where its row has the button (canKeep)
        ? (u.canKeep ? "“{step}” needs a look first: redo it, or press “Keep it as it is” on its row in the Pipeline" : "Redo “{step}” first: its row in the Pipeline says why and runs it again") : "Finish “{step}” first", vars: { step: u.title } };
    }
    else if (j.failed) { s.status = "failed"; s.reason = j.why; }
    else if (j.partial) { s.status = "needs-you"; s.reason = j.why; }
    if (s.status === "ready" && f.claudeBusy && step.action?.kind === "claude") s.reason = { key: "Claude is working: this waits for it" };
    if (step.quiet && s.status === "failed") s.hiddenInList = false;
    if (j.asking) s.asking = true;
    // the user's Stop (the chat's Stop button) on this step's last task, and it is not done since
    const last = f.lastTasks?.[step.id];
    if (last?.status === "cancelled" && !["done", "skipped", "running"].includes(s.status)) { s.stopped = { at: last.at }; }
    // the step's last task ended with a question to the user and nothing ran since: the pipeline waits for the answer
    // (it said "Ready to render" while the Review asked how to fix a still); a step already waiting for an approval keeps its own wait
    if (last?.asked && ["done", "ready"].includes(s.status)) s.asking = true;
    // a step whose turn stopped to ask (no file yet: it read as "failed" and the autopilot ran it again, the second question swapping
    // a and b) waits for the answer, as a Prepare that asks does
    else if (last?.asked && s.status === "failed") { s.status = "ready"; s.asking = true; s.reason = { key: "Claude is asking: answer in the chat" }; }
    // a revision of a storyboard option Claude stopped to ask about (its notes did not fit their panels): the user answers
    if (step.id === "storyboard" && f.revisionAsked && s.status === "needs-you") s.asking = true;
    // the user answered: the chat turn running now (no step of its own) is that answer, and Claude works on the step's question. The
    // first step that asks is at work, as its stage's row already says (T21-6: the API said "Claude is asking" for 45 s meanwhile)
    if (s.asking && f.claudeBusy && !f.runningStep && !answering) {
      answering = step.id;
      s.status = "running"; s.reason = { key: "Claude is working on it" }; s.answering = true;
      delete s.asking;
    }
    // a Storyboard not drawn yet waits for the voice-over's words (or the lyrics timed); one drawn before them is timed again to them
    // (autopilot's transcriptLanded), as before
    if (step.id === "storyboard" && f.voiceWait && s.status === "ready" && !f.boards && !f.storyboard?.real && !f.ran?.storyboard) {
      s.voiceWait = f.voiceWait;
      if (VOICE_WAITS[f.voiceWait]) { s.status = "needs-you"; s.reason = { key: VOICE_WAITS[f.voiceWait] }; }
      else { s.status = "blocked"; s.reason = { key: f.voiceWait === "lyricsTiming" ? "Timing the lyrics" : "Timing the voice-over's words" }; }
    }
  }
  // a step the style gained after the film went past it (the Character step, in a finished anidoodle film) is
  // never put in front of the film: it counts as passed, nothing runs it, its row says why
  const kindOf = (id) => steps.find((x) => x.id === id)?.done?.kind;
  const pastAt = out.reduce((k, s, i) => (!s.hidden && s.status === "done" && s.doneAt != null && ["approval", "built"].includes(kindOf(s.id)) ? i : k), -1);
  for (let i = 0; i < pastAt; i++) {
    const s = out[i];
    // a run of it that was stopped or failed does not hold the film either
    const lt = f.lastTasks?.[s.id];
    if (s.hidden || s.optional || s.doneAt != null || (lt && !["cancelled", "failed"].includes(lt.status)) || !["ready", "needs-you", "blocked"].includes(s.status)) continue;
    Object.assign(s, { status: "done", passed: true, reason: { key: "Added to this style after this film was made: nothing to do" } });
    delete s.stopped; delete s.asking;
  }
  return out;
}

/** Does a reply end with a question to the user? Its last line of words (a "Sources:" list after it does not count). */
export function endsWithQuestion(text) {
  const lines = String(text ?? "").split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const src = lines.findIndex((l) => /^\**(sources|nguồn)\**:?\**$/i.test(l));
  const body = (src >= 0 ? lines.slice(0, src) : lines).filter((l) => !/^[-*]\s*\[[^\]]*\]\([^)]*\)\s*$/.test(l));
  const asks = (l) => /[?？]\s*\**\s*$/.test(l ?? "");
  if (asks(body.at(-1))) return true;
  // a question followed by its numbered or bulleted choices ("Bạn muốn làm tiếp thế nào?" then "1. …", "2. …")
  const q = body.findLastIndex(asks), choice = (l) => /^\**\s*(\d+[.)]|[a-c][.)]|[-*•])\s/i.test(l);
  return q >= 0 && q < body.length - 1 && body.length - 1 - q <= 6 && body.slice(q + 1).every(choice);
}

/** A task the app sent to ask (the voice's length before the Storyboard draws: Agent.start's `asks`) waits for the user whatever
 *  its words, unless it drew the storyboard anyway. */
export const appAsked = (t) => !!t.asks && !(t.changed ?? []).some((c) => /^(boards\/|STORYBOARD\.md$)/.test(String(c?.path ?? c)));

/** Claude stopped to ask the user: a question at the end (endsWithQuestion), or choices for the user with no question mark ("Bạn chọn
 *  a, b hoặc c: a) … b) … c) …", "a. … b. …" lines) in a turn that says it asks or stops. */
export function asksOwner(text) {
  if (endsWithQuestion(text)) return true;
  const tail = String(text ?? "").slice(-2500);
  // choices "a. …" / "a) …" at a line's start or after ":" ";" "(", or answers by number and letter ("1a, 2a"): the user picks
  const letters = new Set([...tail.matchAll(/(?:^|[\s(:;])([a-d])[.)]\s/gim), ...tail.matchAll(/\b\d([a-d])\b/gi)].map((m) => m[1].toLowerCase()));
  if (letters.has("a") && letters.has("b") && /(chọn|choose|pick|hỏi|\bask|trả lời|answer|dừng|\bstop|bạn muốn|which)/i.test(tail)) return true;
  // (a reply like "tôi cần bạn chọn trước khi vẽ storyboard: 1. … · … hoặc …" was once read as no question: the Storyboard ran 3 times, $0.74):
  // words that put a choice to the user, with two or more numbered points, "Cách thứ hai", "·" items, or "hoặc". An offer ("Nếu bạn
  // muốn … hoặc …", "If you want …") is no question.
  const plain = tail.split(/\n|(?<=[.!…])\s+/).filter((x) => !/^\s*[*_>-]*\s*(nếu|if)\b/i.test(x)).join("\n");
  const owner = /(bạn|anh|chị)\s+(muốn|chọn|quyết|cho (tôi|mình|em) biết)|cần (bạn|anh|chị) (chọn|quyết|trả lời|xác nhận)|\b(which (one|option|way)|do you want|would you like|let me know which)\b/i;
  const points = (plain.match(/(^|\s)[*_]*\s*(\d+[.)]\s|cách (thứ )?(một|hai|ba|nhất|\d)\b|phương án\s*\d)/gi) ?? []).length + (plain.match(/·/g) ?? []).length;
  return owner.test(plain) && (points >= 2 || /(^|\s)hoặc\s/i.test(plain));
}

/** The five stages the Editor shows (no Feedback row, the chat stays open; the Character step
 *  sits in Prepare), from the steps' states: [{ n, id, title, status, line, lineVars, steps, gate, open }].
 *  status: todo | running | waiting | done | stopped | redo | failed. line: an English key for the Editor's t(), with lineVars. Every wait
 *  for the user reads "Waiting for you: …". */
export const STAGES = [
  { n: 1, id: "prepare", title: "Prepare" }, { n: 2, id: "storyboard", title: "Storyboard" }, { n: 3, id: "motion", title: "Motion Plan" },
  // the Final Mix is the hand-over (A6): no score, no Tech checks shown; Render is a button, not a row
  { n: 4, id: "build", title: "Build and review" }, { n: 5, id: "finalMix", title: "Final Mix" },
];
/** The Pipeline lines of the waits for the user, also the chat's reminder cards (autopilot). */
export const WAITING = {
  character: "Waiting for you: approve the new characters", storyboard: "Waiting for you: approve the storyboard",
  motion: "Waiting for you: Approve and build in the Motion Plan", asking: "Waiting for you: answer Claude in the chat",
};
export function stagesOf(state, f = {}) {
  const at = (n) => state.filter((s) => s.stage === n && !s.hidden);
  const ok = (s) => s.status === "done" || s.status === "skipped";
  const out = [];
  let busyShown = false;
  for (const st of STAGES) {
    const xs = at(st.n);
    const row = { n: st.n, id: st.id, title: st.title, status: "todo", line: null, lineVars: {}, steps: xs.map((s) => s.id), gate: xs.some((s) => s.gate), open: null };
    out.push(row);
    if (!xs.length) continue;
    const running = xs.find((s) => s.status === "running");
    const stopped = xs.find((s) => s.stopped);
    // the checks run in the background (quiet): a real problem they find is said in the row's line, never a failed stage
    const failed = xs.find((s) => s.status === "failed" && !s.quiet);
    const quietFail = xs.find((s) => s.status === "failed" && s.quiet);
    const asking = xs.find((s) => s.asking);
    const waiting = xs.find((s) => s.status === "needs-you");
    const redo = xs.find((s) => s.status === "redo" && !s.quiet && st.id !== "build");
    // an earlier step moved (canKeep): the user keeps it as it is or approves again; else the step's own file changed since approval
    const redoLine = redo?.canKeep ? "“{step}” changed after you approved this" : "Changed since approval: approve again";
    const first = xs[0];
    if (running) row.status = "running";
    else if (stopped) row.status = "stopped";
    else if (failed) row.status = "failed";
    // while Claude works (a chat turn: no step of its own runs), the stage that waits for the user shows that Claude is at work
    else if ((asking || waiting) && f.claudeBusy && !busyShown) { row.status = "running"; row.line = "Claude is working on it"; busyShown = true; continue; }
    else if (asking || waiting) row.status = "waiting";
    else if (redo) row.status = "redo";
    else if (xs.every((s) => ok(s) || (s.optional && s.status !== "running") || (st.id === "build" && s.status === "redo") || s === quietFail)) row.status = st.id === "finalMix" && !xs.some(ok) ? "todo" : "done";
    else row.status = "todo";
    const sub = { build: "Building", qcReview: "Review", checks: "Checking the film", sound: "Music and sound effects" };
    switch (st.id) {
      case "prepare": {
        row.open = "brief";
        row.lineVars = { n: f.assets ? f.assets.count + f.assets.sources : 0 };
        // while the Character step runs or waits for approval, the row says so; the cast is part of Prepare
        const cast = xs.find((s) => s.id === "character" && !ok(s));
        if (cast && !(running && running.id !== "character") && !(asking && asking.id !== "character")) {
          row.open = "character";
          row.line = running?.id === "character" ? "Making the characters" : cast.asking ? WAITING.asking : waiting?.id === "character" ? WAITING.character
            : cast.status === "redo" ? "Changed since approval: approve again" : null;
          break;
        }
        row.line = running ? "Preparing the film" : asking ? WAITING.asking : row.status === "done" ? "Brief ready · {n} file(s)" : null;
      }
        break;
      case "storyboard":
        row.open = "storyboard";
        // the Storyboard waits for the voice-over (the Voice dialog) or the lyrics (the Lyrics dialog) before it draws
        if (xs.some((s) => s.voiceWait) && !running) {
          const w = xs.find((s) => s.voiceWait).voiceWait;
          row.open = /^lyrics/.test(w) ? "lyrics" : "voice";
          if (VOICE_WAITS[w]) { row.status = "waiting"; row.line = VOICE_WAITS[w]; }
          else { row.status = "running"; row.line = w === "lyricsTiming" ? "Timing the lyrics" : "Timing the voice-over's words"; }
          break;
        }
        row.line = running ? "Drawing the storyboard" : row.status === "done" ? (f.storyboardPick ? "Storyboard {name} approved" : "Storyboard approved")
          : row.status === "redo" ? redoLine : asking ? WAITING.asking : waiting ? WAITING.storyboard : null;
        row.lineVars = { name: f.storyboardPick ?? "", step: redo?.reason?.vars?.step ?? "" };
        break;
      case "motion":
        row.open = "motion-plan";
        row.line = running ? "Writing the Motion Plan" : row.status === "done" ? "Motion Plan approved for {n} shot(s)" : row.status === "redo" ? redoLine
          : asking ? WAITING.asking : waiting ? WAITING.motion : null;
        row.lineVars = { n: f.motionShots ?? 0, step: redo?.reason?.vars?.step ?? "" };
        break;
      case "build":
        // problems that stop the render and Claude's question about them in the chat: a wait for the user
        if (!running && f.chatAsked && (quietFail || failed || row.status === "done")) { row.status = "waiting"; row.line = WAITING.asking; break; }
        row.line = running ? sub[running.id] ?? "Building" : asking ? WAITING.asking : failed?.id === "build" && f.buildError ? "The film's code does not compile"
          : failed ? "{n} blocking issue(s) at the last check" : quietFail ? "{n} problem(s) to fix before the render"
          : row.status === "done" ? (f.review?.score != null ? "Review {score}/10" : "Built") : null;
        row.lineVars = { n: f.qa?.blocking ?? 0, score: f.review?.score ?? "" };
        break;
      case "finalMix":
        // the hand-over: the film is ready to render once stage 4 ran to the end; the music is said, never a score
        row.open = "mix";
        // ready only when nothing stops the render and no question is open (it once said "ready" with 2 blocking problems)
        const ready = f.finished && out[3]?.status === "done" && !(f.qa && !f.qa.pass && f.qa.blocking > 0) && !f.chatAsked;
        if (ready) row.status = "done";
        // before that the music and the sound effects are made inside Build and review: the row only says when it opens
        row.line = ready ? (f.music ? "Ready to render · Music: {title}" : "Ready to render") : "After the build";
        row.lineVars = { title: f.musicTitle ?? (f.music ? f.music.split("/").pop() : "") };
        break;
    }
    if (stopped && !running) row.line = "Stopped: write “continue” in the chat";
    if (row.line?.startsWith("Waiting for you: ")) row.lineVars = { ...row.lineVars, what: row.line.slice(17) };          // the UI's short form
  }
  return out;
}

/** The next step the app starts by itself (autopilot): the first step that is ready, has nothing waiting before it, and is
 *  run by Claude or a job; never past a gate that waits, an asking or stopped step, or a failure. null when none. */
export function nextAuto(state) {
  for (const s of state) {
    if (s.hidden || s.optional) continue;
    if (s.asking) return null;          // a question to the user is answered first
    if (s.status === "done" || s.status === "skipped") continue;
    if (s.status === "redo") {            // after a new motion spec: build and check again; the music stays (the user changes it in the Final Mix)
      if (s.stage === 4 && s.id !== "sound" && !s.stopped && ["claude", "job"].includes(s.action?.kind)) return s;
      if (s.stage === 4) continue;
      // a new storyboard after the motion was approved: Claude rewrites the motion of the shots that changed, then the user approves again
      // (canKeep = an earlier step moved; a motion file changed since its approval waits for the user instead)
      if (s.id === "motionSpec" && s.canKeep && !s.stopped) return s;
      return null;
    }
    if (s.status !== "ready" || s.stopped) return null;
    return ["claude", "job"].includes(s.action?.kind) ? s : null;
  }
  return null;
}

/** After a later step's Claude task (the build marks frames built, links their files, or tunes the motion plan to what it built), or a
 *  chat turn (stepId "feedback": the user's own change; the Motion Plan is approved once), the
 *  approvals it touched follow the new files: what the user approved still holds, the approval records which step adjusted it last and
 *  keeps a short list of the changes (`changes`, the last 20: when, which step or chat turn, what was asked). Returns the names it moved. */
export function followApprovals(meta, { storyboardText, motionPlanHash, stepId, taskId, order, what = null }) {
  const out = [];
  const log = (x) => { const c = { at: new Date().toISOString(), step: stepId, taskId, ...(what ? { what: String(what).slice(0, 160) } : {}) }; x.adjusted = c; x.changes = [...(x.changes ?? []), c].slice(-20); };
  const pos = (id) => order.indexOf(id);
  const a = meta.approvals ?? {};
  if (a.storyboard && storyboardText != null && pos(stepId) > pos("storyboard")) {
    const h = storyboardHash(storyboardText);
    if ((a.storyboard.contentHash ?? null) !== h) { a.storyboard.contentHash = h; log(a.storyboard); out.push("storyboard"); }
  }
  if (a.motionPlan && motionPlanHash && pos(stepId) > pos("motionSpec") && a.motionPlan.hash !== motionPlanHash) {
    a.motionPlan.hash = motionPlanHash; log(a.motionPlan); out.push("motionPlan");
  }
  return out;
}

/** May this step's own work start now? null when it may, else { key, vars } saying why not (the server's STEP_BLOCKED). */
export function blockedReason(state, id) {
  const s = state.find((x) => x.id === id);
  if (!s) return { key: "Unknown step" };
  if (s.hidden) return { key: "This step does not apply to this film" };
  if (s.status === "blocked") return s.reason;
  if (s.status === "running") return s.reason;
  return null;
}

/** The first step Claude can start with (the kickoff after Create project): ready, needs met, done by a Claude task. */
export const firstClaudeStep = (state) => state.find((s) => s.visible && !s.hidden && s.action?.kind === "claude" && (s.status === "ready" || s.status === "needs-you")) ?? null;

/** Prompt variables for the step prompts in styles.json ({length}, {words}, {aspect}, {title}). */
export function promptVars(meta) {
  const sec = Number(meta?.targetDurationSec) || 60;
  const length = sec >= 60 ? `${Math.floor(sec / 60)}:${String(Math.round(sec % 60)).padStart(2, "0")}` : `${sec} s`;
  return { length, words: Math.round(sec / 60 * 150), aspect: meta?.format?.aspect ?? "16:9", title: meta?.title ?? "" };
}
export const fill = (s, vars) => String(s ?? "").replace(/\{(\w+)\}/g, (m, k) => (vars[k] ?? m));

/** The pipeline as Claude reads it with every task: each step, its state, and the rule. */
export function promptBlock(state) {
  if (!state?.length) return "";
  const word = { done: "done", skipped: "skipped", running: "in progress", "needs-you": "waiting for the user", redo: "needs redo", failed: "failed", ready: "ready", blocked: "blocked" };
  const lines = state.filter((s) => !s.hidden).map((s, i) => `${i + 1}. ${s.title}: ${word[s.status]}${s.status === "skipped" ? ` by the owner (${s.skipLabel ?? "not needed"}): do not wait for it` : ""}${s.status === "blocked" && s.needs?.length ? ` (needs ${s.needs.map((n) => state.find((x) => x.id === n)).filter((x) => x && !x.hidden).map((x) => x.title).join(", ")})` : ""}`);
  return ["Pipeline of this film now (the app keeps it and it is current; it wins over anything said earlier in this conversation; render is the owner's, any time):", ...lines,
    "Work only on what the request asks. Never do a step whose prerequisites are not done or skipped: if the request jumps ahead, say which step comes first, change no file, and stop."].join("\n");
}
