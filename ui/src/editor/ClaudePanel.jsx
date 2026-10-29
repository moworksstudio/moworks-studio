// Claude panel: the
// project's conversation, lean. The user's own messages sit in a bordered box; the app's milestone lines (notes of kind "pipeline") read
// as Claude's short sentences; every Claude task is ONE status line (working, with its time; or done, with its time, Details and Undo)
// and Claude's reply under it; what it did on the way (reading, editing, the app's checks, the files) folds under "Details". The head
// holds the model and effort (usage on hover). Under the composer: the picked element or shot as one chip ("Selected: …", × clears it:
// the whole film), the motion drawer, Stop while Claude works (the only Stop), Send. Messages typed while
// Claude works or while the project renders wait in a queue that sends itself. Without a Claude sign-in nothing is sent and what is
// typed stays as a draft.
import { useEffect, useMemo, useRef, useState } from "react";
import { AudioLines, Bot, Check, CheckCircle2, ChevronDown, ChevronRight, CircleStop, Clapperboard, FileUp, Film as FilmIcon, FolderOpen, Globe, Hand, Library,
  Loader2, MapPin, Play, RotateCcw, Send, ShieldAlert, ShieldCheck, Wand2, X, XCircle } from "lucide-react";
import { get, patch, post } from "../api.js";
import { Banner } from "../components.jsx";
import { ago, useToast } from "../lib.jsx";
import Markdown from "./Markdown.jsx";
import { useT } from "../i18n.jsx";
import { NeedsClaude, useClaude } from "../workflow/claude.jsx";
import { checkLabel } from "../workflow/RenderSheet.jsx";
import { OPENS } from "../workflow/Pipeline.jsx";
import { useThemeId } from "../theme.jsx";
import { Mark, notesOf } from "./FilmNotes.jsx";
import { fmtTime } from "./Player.jsx";

// English keys for t()
const KIND_LABEL = { motion: "Motion", block: "Block", look: "Brand Kit" };
// next-step drafts under the input while it is empty and nothing is picked: with a shot or an element picked,
// the "Selected: …" chip takes their place. They follow the pipeline stage the film is at, so each one is something
// the user can ask or have done there.
const SUGGEST = {
  prepare: ["Read the brief and tell me what is missing", "Which files will you use in each shot?", "Check the voice-over words for mistakes", "What is the next step?"],
  storyboard: ["Tell me the idea behind the storyboard","Make the opening shot stronger", "Add one more shot before the ending", "What is the next step?"],
  motion: ["Make the motion calmer", "Make the moves between shots smoother", "Which shot has too much motion?", "What is the next step?"],
  build: ["How far along is the build?", "What did the review find?", "Fix what scored lowest in the review", "Make the words easier to read on a phone"],
  finalMix: ["Pick music that fits the mood", "Add sound effects on the shot changes", "Make the music quieter under the voice", "What is the next step?"],
  feedback: ["Watch the film and fix what is off", "Make the pace a little faster", "Make the words easier to read on a phone", "Make the ending stronger"],
};
const fmtTok = (n) => (n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${Math.round(n / 1e3)}k` : String(n));
const fmtUsd = (x) => (x == null ? "" : x < 0.01 ? "<$0.01" : `$${x.toFixed(2)}`);
const secs = (ms) => { const s = Math.round(ms / 1000); return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`; };
const changedOf = (task) => (task.changed ?? []).filter((c) => !c.path.startsWith(".moworks/"));     // the app's own records are not Claude's edits
// Claude Code's sign-in refresh racing another Claude process: said once, in plain words, with a Try again
const BUSY_SIGNIN = /another Claude Code process is refreshing|oauth_refresh\.lock|Failed to refresh OAuth token/i;
// the milestone lines that invite the user to open a dialog get its button

/** A question Claude is waiting on: the user answers here (and over an open sheet: the Editor shows it there too). */
export function Question({ q, projectId, taskId, toast, t }) {
  const [busy, setBusy] = useState(false);
  const go = async (decision) => { setBusy(true); try { await post(`/api/projects/${projectId}/tasks/${taskId}/permission`, { id: q.id, decision }); } catch (e) { toast(e.message, "error"); } finally { setBusy(false); } };
  return <div className="cquestion" role="alert">
    {q.web ? <Globe size={14} /> : <Hand size={14} />}
    <div className="tx"><b>{q.web ? t("Claude wants to use the web") : t("Claude asks to: {tool}", { tool: t(toolWords(q.tool)) })}</b>{q.what && <code>{q.what}</code>}</div>
    <div className="acts">
      <button className="btn sm primary" disabled={busy} onClick={() => go("allow")}>{t("Allow")}</button>
      {q.web && <button className="btn sm" disabled={busy} onClick={() => go("project")}>{t("Allow the web for this project")}</button>}
      <button className="btn sm ghost" disabled={busy} onClick={() => go("deny")}>{t("No")}</button>
    </div></div>;
}

/** What a tool line names, in short: a file by its name, a search by its last plain segment, the project's own folder
 *  as "project files"; the full path stays in the tooltip. */
export function shortPath(path, t = (x) => x) {
  const p = String(path ?? "").replace(/\\/g, "/").replace(/\/+$/, "");
  if (/(^|\/)projects\/[^/]+$/.test(p) || p === "." || p === "") return t("project files");
  const parts = p.split("/").filter((x) => x && !/[*?{}[\]]/.test(x));
  const last = parts.at(-1) ?? "";
  if (!last || /^\.?moworks$/.test(last)) return t("project files");
  return last;
}

/** Details speak in plain words. Claude's and the app's tools by what they do, never their ids ("mcp__mw__character_gate");
 *  files by what they are ("the storyboard", "a film file"), never their names or folders. */
const TOOL_WORDS = { Read: "Reading", Edit: "Editing", MultiEdit: "Editing", Write: "Writing", Glob: "Looking through", Grep: "Searching", Bash: "Running a step",
  WebFetch: "Reading the web", WebSearch: "Searching the web", TodoWrite: "Planning the work", Task: "Working on one part", NotebookEdit: "Editing" };
const APP_WORDS = { board_stills: "Drawing the storyboard pictures", qc_sheets: "Making the review sheets", library_search: "Searching the Motion Library",
  character_sheet: "Drawing the character sheets", character_gate: "Checking the characters", pose_check: "Checking the poses", project_format: "Setting the film's format",
  psd_layers: "Reading the layered file", music_options: "Finding music", hf_script: "Running a HyperFrames step", copy_to_assets: "Copying a file into the project" };
export const toolWords = (name) => {
  const n = String(name ?? "").replace(/^app:/, "").replace(/^mcp__[a-z0-9]+__/i, "");
  return APP_WORDS[n] ?? TOOL_WORDS[n] ?? (n ? n.replace(/[_-]+/g, " ").replace(/^./, (c) => c.toUpperCase()) : "Working");
};
const NAMED = { "storyboard.md": "the storyboard", "brief.md": "the brief", "motion-plan.json": "the Motion Plan", "motion-plan.md": "the Motion Plan",
  "characters.json": "the characters", "character.md": "the character", "style.md": "the film's style guide", "design.md": "the design", "index.html": "the film",
  "words.html": "the film's words", "notes.md": "the notes", "music-map.json": "the music map", "lyrics.json": "the lyrics", "transcript.json": "the narration's timing" };
export function fileWords(path) {
  const name = String(path ?? "").replace(/\\/g, "/").replace(/\/+$/, "").split("/").pop().toLowerCase();
  if (!name || name === "." || name === "moworks" || name === ".moworks") return "the project";
  if (NAMED[name]) return NAMED[name];
  if (/[*?{}]/.test(name)) return "the project's files";
  const ext = name.includes(".") ? name.split(".").pop() : "";
  if (/^(ts|tsx|js|mjs|jsx|css)$/.test(ext)) return "a film file";
  if (ext === "html") return "a scene";
  if (/^(png|jpe?g|webp|gif|svg|avif|psd)$/.test(ext)) return "a picture";
  if (/^(wav|mp3|m4a|aac|ogg|flac)$/.test(ext)) return "a sound";
  if (/^(mp4|mov|webm)$/.test(ext)) return "a video";
  if (/^(ttf|otf|woff2?)$/.test(ext)) return "a font";
  if (/^(md|txt)$/.test(ext)) return "the notes";
  if (ext === "json") return "the film's settings";
  return ext ? "a file" : "a folder";
}

function Step({ e }) {
  const t = useT();
  if (e.kind === "tool") {
    const words = TOOL_WORDS[e.tool] || /^(app:|mcp__)/.test(e.tool ?? "") ? toolWords(e.tool) : e.path ? e.label.replace(e.path, "").trim() : toolWords(e.label);
    return <div className="cstep"><Check size={12} />{t(words)}{e.path && /^(Read|Edit|MultiEdit|Write|NotebookEdit)$/.test(e.tool) && <span className="cstep-f">{t(fileWords(e.path))}</span>}</div>;
  }
  // the app's own tool, announced while it runs ("App: character_sheet…")
  if (e.kind === "status" && /^App: /.test(e.text ?? "")) return <div className="cstep note"><span>{t(toolWords(e.text.slice(5).replace(/…$/, "")))}…</span></div>;
  // Claude Code's own tool errors (a failed edit it then retried) are not for the user: only in Details, without the tags
  if (e.kind === "tool-error") return <div className="cstep err"><XCircle size={12} /><span>{String(e.text ?? "").replace(/<\/?tool_use_error>/g, "").trim()}</span></div>;
  if (e.kind === "text") return <div className="cstep note"><span>{e.text}</span></div>;
  return <div className="cstep note"><span>{e.text}</span></div>;
}

/** What Claude is doing right now: the server's `task.doing` ({ kind, tool?, at }) in words, with the latest step's file
 *  kind when it is the same step ("Editing a film file"); an older server without `doing` falls back to the latest step alone. */
const DOING_WORDS = { read: "Reading", write: "Writing", edit: "Editing", search: "Searching", web: "Reading the web", run: "Running a step",
  think: "Thinking it through", rules: "Applying the studio rules and checking the film", work: "Working" };
function nowOf(task) {
  const e = [...(task.events ?? [])].reverse().find((x) => x.kind === "tool" || (x.kind === "status" && /^App: /.test(x.text ?? "")));
  let last = null;
  if (e?.kind === "status") last = { text: toolWords(e.text.slice(5).replace(/…$/, "")), at: e.at };
  else if (e) {
    const words = TOOL_WORDS[e.tool] || /^(app:|mcp__)/.test(e.tool ?? "") ? toolWords(e.tool) : e.path ? e.label.replace(e.path, "").trim() : toolWords(e.label);
    last = { text: e.path && /^(Read|Edit|MultiEdit|Write|NotebookEdit)$/.test(e.tool) ? `${words} ${fileWords(e.path)}` : words, at: e.at };
  }
  const d = task.doing;
  if (!d?.kind) return last;
  if (d.kind === "app") return { text: toolWords(d.tool), at: d.at };
  if (d.kind === "think" || d.kind === "rules" || !last) return { text: DOING_WORDS[d.kind] ?? "Working", at: d.at };
  return { text: last.text, at: d.at };
}

function Ago({ at }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const h = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(h); }, []);
  return <span className="num">{secs(Math.max(0, now - new Date(at).getTime()))}</span>;
}

function Elapsed({ since }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const h = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(h); }, []);
  return <span className="num">{secs(now - new Date(since).getTime())}</span>;
}

/** A request a Pipeline step sent: the task's own `step`, else matched on the step's prompt (older tasks). */
function stepOf(task, steps) {
  if (task.step) return (steps ?? []).find((s) => s.id === task.step) ?? { id: task.step, title: task.step };
  const body = String(task.text ?? "").replace(/^First step:\s*/, "");
  for (const s of steps ?? []) {
    const head = String(s.action?.prompt ?? "").split("{")[0].trim().slice(0, 60);
    if (head.length >= 20 && body.startsWith(head)) return s;
  }
  return null;
}

/** What a running task's card says (the whole message, no ellipsis): Claude's latest words in full, as plain text
 *  (markdown's marks taken out, its line breaks kept). */
export function plainText(text) {
  return String(text ?? "").split("\n").map((l) => l.replace(/\*\*|__|`/g, "").replace(/^\s*(#+|>)\s*/, "").replace(/^(\s*)[-*]\s+/, "$1• ").trimEnd())
    .join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

export function TaskBlock({ t: task, projectId, toast, onChanged, onRetry, steps, interrupted = null, qaCurrent = true, onPlay = null, onSeek = null, fps = 24 }) {
  const t = useT();
  const step = stepOf(task, steps);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const running = task.status === "running" || task.status === "cancelling";
  const texts = task.events.filter((e) => e.kind === "text").map((e) => e.text?.trim()).filter(Boolean);
  // Claude's last words are the reply; the first line it writes while working says what it is doing (it announces long work)
  const reply = !running ? (task.resultText?.trim() || texts.at(-1) || "") : "";
  const doing = running ? plainText(texts.at(-1)) : "";
  const detail = task.events.filter((e) => e.kind === "tool" || e.kind === "tool-error" || (e.kind === "status" && !/^Target:/.test(e.text)) || (e.kind === "text" && e.text?.trim() !== reply));
  const files = changedOf(task);
  const signin = task.status === "failed" && BUSY_SIGNIN.test(String(task.error ?? ""));
  const again = async () => {
    setBusy(true);
    try { await post(`/api/projects/${projectId}/tasks/${task.id}/again`, {}); onChanged(false); } catch (e) { toast(e.message, "error"); } finally { setBusy(false); }
  };
  const undo = async () => {
    setBusy(true);
    try { await post(`/api/projects/${projectId}/tasks/${task.id}/revert`); toast(t("Change undone")); onChanged(true); }
    catch (e) { toast(e.message, "error"); } finally { setBusy(false); }
  };
  // the server's `label` names a task with no step of its own ("Storyboard · revision"; it used to read "Changed the film")
  const name = step ? t(step.title) : task.label ? t(task.label) : null;
  const label = running ? (doing || (name ? t("Working: {step}", { step: name }) : t("Working on your message")))
    : task.status === "failed" ? t("Not done") : task.status === "cancelled" ? t("Stopped") : name ?? (files.length ? t("Changed the film") : t("Answered"));
  return <li className="task">
    {/* a step task the user started with their own words (the server's `shown`: Submit feedback, Make another option with text) shows them as theirs */}
    {(!step || task.shown) && <div className="msg user"><Markdown text={task.shown ?? task.text} className="md" />
      {(task.scope?.kind === "shot" || task.scope?.kind === "selection" || task.scope?.motion) && <div className="msg-meta">
        {task.scope?.kind === "shot" && task.scope.shot && <span>{t("Shot {n}", { n: task.scope.shot.number })}</span>}
        {task.scope?.kind === "selection" && <span>{t("Selection")}</span>}
        {task.scope?.motion && <span>{t(KIND_LABEL[task.scope.motion.kind] ?? "Library")}: {task.scope.motion.name}</span>}</div>}
      {/* notes on the film carry each note's frame, its time and its words */}
      {task.media?.length > 0 && <ul className="plain fn-media">{task.media.map((m, i) => <li key={i}>{m.url && <span className="fn-media-pic"><img src={m.url} alt="" loading="lazy" /><Mark n={m} /></span>}
        <span className="msg-meta"><button type="button" className="chip num" disabled={!onSeek} onClick={() => onSeek?.(m.t ?? 0)} title={onSeek ? t("Go to this moment") : undefined}>
          {fmtTime(m.t ?? 0, fps)}</button>{m.shot != null && <span>{t("Shot {n}", { n: m.shot })}</span>}</span>
        {m.text && <span className="fn-media-t">{m.text}</span>}</li>)}</ul>}</div>}
    <div className={"cstatus " + task.status + (task.reverted ? " undone" : "")}>
      {running ? <Loader2 size={12} className="spin" /> : task.status === "done" && !task.reverted ? <CheckCircle2 size={13} className="cs-ok" aria-hidden="true" /> : <span className="cdot" aria-hidden="true" />}
      <span className="cs-t">{label}</span>
      <span className="cs-m">{running ? <Elapsed since={task.createdAt} /> : task.durationMs != null ? secs(task.durationMs) : ago(task.createdAt)}</span>
      {!running && files.length > 0 && <span className="cs-m">· {files.length === 1 ? t("1 file") : t("{n} files", { n: files.length })}</span>}
      {/* only the newest checked task carries it (a later build that passed clears it), and it says what to fix in words */}
      {qaCurrent && task.qa && !task.qa.error && !task.qa.pass && (() => { const words = task.qa.blocking.map((b) => checkLabel(b, t)).join(" · ");          // in words, not an id
        return <span className="cs-bad" title={t("To fix before the build: {what}", { what: words })}><ShieldAlert size={12} />{task.qa.blocking.length === 1 ? t("To fix: {what}", { what: words }) : t("{n} checks to fix", { n: task.qa.blocking.length })}</span>; })()}
      {(detail.length > 0 || files.length > 0) && <button className="clink" onClick={() => setOpen((x) => !x)} aria-expanded={open}>{open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}{t("Details")}</button>}
      {!running && files.length > 0 && !task.reverted && <button className="clink" disabled={busy} onClick={undo}>{busy ? <Loader2 size={12} className="spin" /> : <RotateCcw size={12} />}{t("Undo")}</button>}
      {task.reverted && <span className="cs-m">· {t("Undone")}</span>}
    </div>
    {running && (() => { const n = nowOf(task), steps = (task.events ?? []).filter((e) => e.kind === "tool").length; return n && <div className="cnow" role="status" aria-live="polite">
      <span className="cnow-dot" aria-hidden="true" /><span className="cnow-t">{t("Now: {what}", { what: t(n.text) })}</span>
      <span className="cs-m">{t("for")} <Ago at={n.at} />{steps > 1 ? ` · ${t("{n} steps so far", { n: steps })}` : ""}</span></div>; })()}
    {open && <div className="cdetail">
      {detail.map((e, i) => <Step key={i} e={e} />)}
      {files.length > 0 && <ul className="plain cfiles">{Object.entries(files.reduce((m, c) => { const k = fileWords(c.path); const x = m[k] ?? (m[k] = { n: 0, added: null, removed: null });
          x.n++; if (c.added != null) { x.added = (x.added ?? 0) + c.added; x.removed = (x.removed ?? 0) + c.removed; } return m; }, {})).map(([k, x]) => <li key={k}>
        <span className="p">{t(k)}{x.n > 1 ? ` ×${x.n}` : ""}</span>{x.added != null ? <><span className="add">+{x.added}</span><span className="del">−{x.removed}</span></> : null}</li>)}</ul>}
      {/* the task ends first, its tech checks run after it and fill task.qa in */}
      {!task.qa && task.qaPending && <div className="qa-line"><Loader2 size={12} className="spin" />{t("Tech checks running…")}</div>}
      {task.qa && !task.qa.error && <div className={"qa-line " + (task.qa.pass ? "ok" : "bad")}>{task.qa.pass ? <ShieldCheck size={12} /> : <ShieldAlert size={12} />}
        {task.qa.pass ? t("Tech checks passed ({n})", { n: task.qa.checks }) : t("{n} tech check(s) to fix before the render", { n: task.qa.blocking.length })}</div>}
      {step && !task.shown && <details className="csent"><summary>{t("What was sent to Claude")}</summary><Markdown text={task.text} className="md sent" /></details>}
    </div>}
    {running && task.permission && <Question q={task.permission} projectId={projectId} taskId={task.id} toast={toast} t={t} />}
    {reply && task.status !== "failed" && <div className="msg claude"><Markdown text={reply} className="md" /></div>}
    {task.status === "failed" && (task.errorCode === "CLAUDE_SIGNED_OUT" ? <NeedsClaude text={t("Claude's sign-in ended during this task. Sign in again, then send it again.")} />
      : signin ? <div className="cretry"><span>{t("Claude was busy signing in. Try again in a moment.")}</span><button className="btn sm" onClick={() => onRetry(task)}>{t("Try again")}</button></div>
        : <Banner kind="error">{task.error}</Banner>)}
    {task.status === "cancelled" && task.outcome === "partial" && <p className="cnote-line">{t("What changed so far is kept; Undo takes it back.")}</p>}
    {/* the app closed while Claude worked (GET /pipeline's interrupted): said, with the way on: the same message
        or step run again (POST /tasks/<id>/again) */}
    {interrupted?.taskId === task.id && <div className="cretry"><span>{t("The app closed while Claude was working on this.")}</span>
      <button className="btn sm" disabled={busy} onClick={again}>{busy ? <Loader2 size={12} className="spin" /> : <RotateCcw size={12} />}{step ? t("Resume") : t("Send again")}</button></div>}
  </li>;
}

/** The model and the effort of this project, as one short chip; the project's usage on hover (less on screen).
 *  While a task runs, the effort it really runs at (the Motion Plan runs at its own medium; the chip used to say High). */
function ModelChip({ projectId, info, choices, onSaved, disabled, task = null }) {
  const t = useT();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const box = useRef(null);
  useEffect(() => {
    if (!open) return;
    const off = (e) => { if (!box.current?.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", off);
    return () => document.removeEventListener("mousedown", off);
  }, [open]);
  if (!info || !choices) return null;
  const own = info.own ?? {}, eff = info.settings ?? {}, u = info.usage;
  const modelName = (k) => choices.models.find((m) => m[0] === k)?.[1] ?? k;
  const effName = (k) => t(String(k ?? "")[0]?.toUpperCase() + String(k ?? "").slice(1));
  // what really runs: the chat and every step at least "high", the Motion Plan at its own "medium"
  const order = choices?.efforts ?? ["low", "medium", "high", "xhigh", "max"];
  const runs = eff.effort && order.indexOf(eff.effort) < order.indexOf("high") ? "high" : eff.effort;
  const now = task?.settings?.effort ?? runs;
  const effLine = runs ? t("Effort: {e} · Motion Plan: {m}", { e: effName(runs).toLowerCase(), m: effName("medium").toLowerCase() }) : null;
  const set = async (k, v) => { try { onSaved(await patch(`/api/projects/${projectId}/settings`, { [k]: v })); } catch (e) { toast(e.message, "error"); } };
  const usage = u?.tasks ? t("This project so far: {n} tasks, {tok} tokens, at API list price {usd} (your plan does not bill this)",
    { n: u.tasks, tok: fmtTok((u.input ?? 0) + (u.cacheWrite ?? 0) + (u.cacheRead ?? 0) + (u.output ?? 0)), usd: u.costUsd != null ? `≈ ${fmtUsd(u.costUsd)}` : "" }) : t("Model and effort for this project");
  return <span className="cmodel" ref={box}>
    <button className="cmodel-chip" onClick={() => setOpen((x) => !x)} disabled={disabled} aria-expanded={open}
      title={now !== runs ? t("This step runs at {e} effort", { e: effName(now).toLowerCase() }) : usage}>
      {[eff.model && modelName(eff.model), now && effName(now)].filter(Boolean).join(" · ") || t("Model")}<ChevronDown size={12} /></button>
    {open && <div className="cmodel-pop" role="dialog" aria-label={t("Model and effort")} onKeyDown={(e) => { if (e.key === "Escape") setOpen(false); }}>
      <label><span>{t("Model")}</span><select className="select sm" value={own.model ?? "global"} onChange={(e) => set("model", e.target.value)}>
        <option value="global">{t("As in Settings")} ({modelName(choices.model)})</option>{choices.models.map(([k, n]) => <option key={k} value={k}>{n}</option>)}</select></label>
      <label><span>{t("Effort")}</span><select className="select sm" value={own.effort ?? "global"} onChange={(e) => set("effort", e.target.value)}>
        <option value="global">{t("As in Settings")} ({effName(choices.effort)})</option>{choices.efforts.map((k) => <option key={k} value={k}>{effName(k)}</option>)}</select></label>
      {effLine && <p className="hint">{effLine}</p>}
      {u?.tasks > 0 && <p className="hint">{usage}</p>}
    </div>}
  </span>;
}

/** The film is done: one green block once the build, the self-check, the music, the sound effects and the checks
 *  have all finished (the server's note `event: "film-done"`, one per build), with the self-check's score card from its `qc`. */
const CRITERIA = [["hook", "Hook"], ["phone", "Read on a phone"], ["motion", "Motion"], ["variety", "Variety"], ["composition", "Composition"], ["brand", "Brand"], ["sync", "Sync"]];
export function FilmDone({ n }) {
  const t = useT();
  const qc = n.qc ?? {};
  // the film is handed over: no score here; the server's own words when it sends them
  return <li className="cdone" role="status">
    <div className="cdone-head"><Check size={16} /><b>{n.vars?.n ? t("The film is done (version {n})", { n: n.vars.n }) : t("The film is done")}</b></div>
    <p>{/^The film is ready/.test(n.text ?? "") ? t(n.text, n.vars) : t("Watch it: change the music or the sound effects in the Final Mix, and send your notes on the picture here.")}</p>
  </li>;
}

const DONE_MILESTONE = /\bapproved\b|\bfinished\b|\bis done\b/i;
const NOTE_ICON = { assets: FileUp, render: FilmIcon, checks: ShieldCheck, voice: AudioLines, ae: Clapperboard };
// the chat holds Claude's words, the user's, the stages' milestones and questions, the film-done card, renders and real problems; the app's
// side notices (files added, music offered or placed, words timed, sound effects placed, Claude's look at its storyboard draft, library
// items copied, checks passed) stay out. A warning or an error always shows.
const CHAT_NOTES = new Set(["pipeline", "brief", "render", "ae"]);
const shownNote = (n) => CHAT_NOTES.has(n.kind) || n.status === "error" || n.status === "warning";
const runningTask = (x) => x.task && (x.task.status === "running" || x.task.status === "cancelling");
/** The conversation in time order (tasks and the app's notes), the task Claude is working on always last, where the user looks. */
// the tech checks run in the background: no step, no button; only the newest result counts, and only a real failure
// shows, as one card in plain words (a pass, or a run that only warned, shows nothing)
export const checkFailed = (n) => (n.kind === "checks" && n.status === "error") || (n.kind === "pipeline" && /^The (Tech )?checks found|would still stop the render/i.test(n.text ?? ""));
const checkNote = (n) => n.kind === "checks" || checkFailed(n);
const latestWait = (notes) => (notes ?? []).filter((n) => n.kind === "waiting").sort((a, b) => (a.at < b.at ? -1 : 1)).at(-1) ?? null;
/** Claude stopped to ask in the chat (a "waiting" note with open "chat", a conflict or a missing thing): the latest wait
 *  note while no message has gone to Claude after it; no Pipeline stage waits for it, so it is not tied to one. */
export const chatWait = (tasks, notes) => {
  const w = latestWait(notes);
  return w?.open === "chat" && !(tasks ?? []).some((x) => x.createdAt > w.at) ? w : null;
};
/** checksDoneAt: when the checks step last finished well (GET /pipeline's step); a pass writes no note, so it is what clears the card.
 *  waitOpen: a stage waits for the user; then the latest "waiting" note is the reminder card, and a wait that is over shows
 *  nothing, Claude's own words already said it (the card would never show if every wait note were left out). */
export function threadOf(tasks, notes, checksDoneAt = null, waitOpen = false, idle = true) {
  const lastCheck = (notes ?? []).filter(checkNote).sort((a, b) => (a.at < b.at ? -1 : 1)).at(-1);
  const cleared = lastCheck && checksDoneAt != null && Date.parse(lastCheck.at) < Number(checksDoneAt);
  const lastWait = waitOpen ? latestWait(notes) : idle ? chatWait(tasks, notes) : null;
  const keep = (n) => (checkNote(n) ? n === lastCheck && checkFailed(n) && !cleared : n.kind === "waiting" ? n === lastWait : shownNote(n));
  const all = [...(tasks ?? []).map((x) => ({ at: x.createdAt, task: x })), ...(notes ?? []).filter(keep).map((n) => ({ at: n.at, note: n }))]
    .sort((a, b) => (a.at < b.at ? -1 : 1));
  return [...all.filter((x) => !runningTask(x)), ...all.filter(runningTask)];
}
/** The app's line in the chat; the pipeline's milestones read as Claude's own short sentences. */
/** the app's fixed notes in plain words, wherever a server still writes the older wording ("gate" is the checkers' word).
 *  The server keeps them in English as keys, so a Vietnamese dictionary covers the new wording the same way when VI comes back. */
const NOTE_WORDS = {
  "The character gate passed": "All character checks passed",
  "The character gate found problems: Claude fixes them": "Some character checks failed: Claude is fixing them",
  "Build waits: the characters' gate failed{why}. Claude is fixing them now, then the build goes on.": "The build waits: some character checks failed{why}. Claude is fixing them, then the build goes on.",
  "Build waits: the characters' gate still fails after Claude's fix{why}: tell Claude in the chat what to do.": "The build waits: some character checks still fail after Claude's fix{why}. Tell Claude in the chat what to do.",
  "Claude is reading your brief and files to prepare the film. Please wait a moment.": "Claude is reading your brief and files to prepare the film. This takes a few minutes; the line under it shows what it is doing.",
  // a wait card says what to do in one short line; its button opens the place
  "The Motion Plan is ready for you: under each frame, the motion Claude proposes. Change what you like, then press Approve and build at the end of the Motion Plan dialog: the film is then built, reviewed, given music and checked without another click.": "Motion Plan ready: check it, then Approve and build.",
  "{label} is ready for you in the Storyboard dialog: approve it, give feedback on it, or make another option.": "{label} ready: approve it, give feedback, or make another option.",
  "The new characters are ready and passed their checks. Look at them in the Characters dialog and approve them: you approve once.": "New characters ready and checked: look at them, then approve.",
  "Claude needs your choice before it goes on: read its message and answer in the chat.": "Claude needs your choice: answer its message in the chat.",
  "The storyboard is timed to the real voice-over: make it on the Voice screen (Claude's script is in the Script box), or choose No voice-over. The storyboard starts by itself once its words are in.": "Make the voice-over, or choose No voice-over: the storyboard starts once it is in.",
  "Check and save the voice-over's words on the Voice screen: the storyboard is timed to them and starts by itself once they are saved.": "Check and save the voice-over's words: the storyboard starts once they are saved.",
  "The voice-over's words could not be timed: open the Voice screen and transcribe it again. The storyboard starts by itself once its words are in.": "The voice-over's words could not be timed: transcribe it again.",
  "Time the lyrics in the Lyrics dialog: the storyboard places each line at its time and starts by itself once they are timed.": "Time the lyrics: the storyboard starts once they are timed.",
};
export const noteWords = (text) => NOTE_WORDS[text] ?? text;

/** A reminder at every wait for the user (new characters to approve, a storyboard to choose, Approve and build): the last
 *  line of the chat says what Claude waits for, with the button that opens it, so nobody sits waiting without knowing what to press. */
function WaitCard({ stage, onOpen }) {
  const t = useT();
  const opens = OPENS[stage.open];
  const vars = Object.fromEntries(Object.entries(stage.lineVars ?? {}).map(([k, v]) => [k, typeof v === "string" ? t(v) : v]));
  const line = stage.line ? t(stage.line, vars) : t(stage.title);
  // the chat's own warning card (no new look); the server's line may already say "Waiting for you: …"
  return <li className="cnote warn" role="status"><Hand size={13} />
    <span className="t">{/^Waiting for you/.test(stage.line ?? "") ? line : t("Waiting for you: {what}", { what: line })}</span>
    {opens && onOpen && <button type="button" className="btn sm" onClick={() => onOpen(opens[0])}>{t(opens[1])}</button>}</li>;
}

/** Each project's last chat, for this app session: shown at once when the Editor opens again. */
const LAST_CHAT = new Map();

function Note({ n, projectId, toast, onPlay = null, onFix = null, onDetails = null, checks = null, waitActive = false, onOpenSheet = null, onReply = null, onRecheck = null }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  if (checkFailed(n)) return <li className="cnote stop checks-card" role="status"><ShieldAlert size={14} />
    {/* the server says it in plain words ("Something would stop the render: <what>"); an older note without words gets the app's line */}
    <span className="t">{n.text && !/blocking issue/i.test(n.text) ? t(noteWords(n.text), n.vars) : Number(n.vars?.n) === 1 ? t("The film has a problem that would break the render.") : t("The film has {n} problems that would break the render.", { n: n.vars?.n ?? "" })}</span>
    {/* while the app's own fix runs (GET /pipeline's checks.fixing), it says so instead of offering one */}
    {checks?.fixing ? <span className="cs-m checks-fixing"><Loader2 size={12} className="spin" />{t("Claude is fixing it")}</span>
      : checks?.running ? <span className="cs-m checks-fixing"><Loader2 size={12} className="spin" />{t("Checking…")}</span>
      : <>{onFix && <button className="btn sm" onClick={onFix}>{t("Ask Claude to fix")}</button>}
        {/* after a fix in the chat, the checks run again from here */}
        {onRecheck && <button className="btn sm" onClick={onRecheck}>{t("Run checks again")}</button>}</>}
    {onDetails && <button className="clink" onClick={onDetails}>{t("Details")}</button>}
    <time>{ago(n.updatedAt ?? n.at)}</time></li>;
  if (n.kind === "pipeline" && (n.event === "film-done" || /^Film version \d+ is ready/.test(n.text ?? ""))) return <FilmDone n={n} />;
  // a milestone that reports something finished (an approval) is a done card: green edge and a check
  if (n.kind === "pipeline" && DONE_MILESTONE.test(n.text ?? "")) return <li className="cmile done"><CheckCircle2 size={14} className="cs-ok" aria-hidden="true" /><Markdown text={t(noteWords(n.text), n.vars)} className="md" /></li>;
  if (n.kind === "waiting" && waitActive) { const opens = OPENS[n.open];
    return <li className="cnote warn" role="status"><Hand size={13} /><span className="t">{t(noteWords(n.text), n.vars)}</span>
      {opens && onOpenSheet && <button type="button" className="btn sm" onClick={() => onOpenSheet(opens[0])}>{t(opens[1])}</button>}
      {/* Claude asks in the chat (open "chat"): the answer is written below */}
      {n.open === "chat" && onReply && <button type="button" className="btn sm" onClick={onReply}>{t("Answer Claude")}</button>}</li>; }
  if (n.kind === "pipeline" || n.kind === "waiting") return <li className="cmile"><Markdown text={t(noteWords(n.text), n.vars)} className="md" /></li>;          // a past wait stays a plain line
  // the brief, the first line of the conversation: its first lines, the rest under Details
  if (n.kind === "brief") return <li className={"cbrief" + (open ? " open" : "")}>
    <div className="cbrief-t">{n.text}</div>
    <button className="clink" onClick={() => setOpen((x) => !x)} aria-expanded={open}>{open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}{open ? t("Hide") : t("Details")}</button>
  </li>;
  const I = NOTE_ICON[n.kind] ?? Bot;
  const file = (how) => post(`/api/projects/${projectId}/files/${how}`, { path: n.file }).catch((e) => toast(e.message, "error"));
  const files = n.files ?? [];
  const done = !n.status && (n.kind === "render" || n.kind === "ae");
  return <li className={"cnote" + (n.status === "error" ? " stop" : n.status === "warning" ? " warn" : done ? " ok" : "")}>
    {done ? <CheckCircle2 size={13} /> : <I size={13} />}
    {/* a finished render says so in two words; its long file name is in the tooltip, Play and Show open it */}
    <span className="t" title={n.kind === "render" && n.vars?.file ? n.vars.file : undefined}>{n.kind === "assets" ? (files.length === 1 ? t("Added 1 file: {name}", { name: files[0].split("/").pop() }) : t("Added {n} files", { n: files.length }))
      : n.kind === "render" && n.text === "Render finished: {file}" ? t("Render finished") : t(noteWords(n.text), n.vars)}</span>
    {n.kind === "assets" && files.length > 1 && <button className="clink" onClick={() => setOpen((x) => !x)}>{open ? t("Hide") : t("Show")}</button>}
    {n.kind === "render" && n.file && <><button className="clink" onClick={() => (onPlay ? onPlay(n.file) : file("open"))}><Play size={12} /> {t("Play")}</button><button className="clink" onClick={() => file("reveal")}><FolderOpen size={12} /> {t("Show")}</button></>}
    <time>{ago(n.updatedAt ?? n.at)}</time>
    {open && <ul className="plain cnote-files">{files.map((f) => <li key={f}>{shortPath(f, t)}</li>)}</ul>}
  </li>;
}

export default function ClaudePanel({ projectId, selectedShot, onClearTarget, onChanged, prefill, selection = null, inject = null, reloadKey = 0, motionPick = null,
  onOpenMotions = null, motionsOpen = false, steps = null, rendering = false, actions = [], onWaiting = null, stage = null, interrupted = null, onPlay = null, onOpenSheet = null, checks = null,
  waiting = null, pins = null, onPinsSent = null, onSeek = null, fps = 24 }) {
  const t = useT();
  const toast = useToast();
  const claude = useClaude();
  const studio = useThemeId() === "studio";          // The Studio names the column (the conversation, under the lamp)
  const signedOut = !!claude?.status && !claude.connected;
  // reopening a project shows its last chat at once (kept for this app session) while the fresh one loads
  const [tasks, setTasks] = useState(() => LAST_CHAT.get(projectId)?.tasks ?? null);
  const [notes, setNotes] = useState(() => LAST_CHAT.get(projectId)?.notes ?? []);
  const [running, setRunning] = useState(() => LAST_CHAT.get(projectId)?.running ?? null);
  const [runInfo, setRunInfo] = useState(null);          // { settings (what runs), own (this project's choices), usage (totals) }
  const [choices, setChoices] = useState(null);
  useEffect(() => { get("/api/agent/settings").then(setChoices).catch(() => {}); }, []);
  const [text, setText] = useState(() => { try { return sessionStorage.getItem(`mw-draft:chat:${projectId}`) ?? ""; } catch { return ""; } });
  const [queue, setQueue] = useState([]);              // messages typed while Claude works or the film renders; the first one sends itself after
  const [err, setErr] = useState(null);
  const [sending, setSending] = useState(false);
  // what the message is about follows what the user picked: an element in the film, else a shot, else the whole film;
  // a message holding notes pinned on the film is about the film, the notes saying their own shots ("Notes on shot 1, 2")
  const pinned = pins?.length ? notesOf(text, pins) : [];
  // a pin whose line was in the message and has been deleted from it goes too (a pin just placed waits for its line)
  const seenPins = useRef(new Set());
  useEffect(() => {
    if (!pins?.length) return;
    const kept = new Set(notesOf(text, pins).map((n) => n.id));
    for (const id of kept) seenPins.current.add(id);
    const gone = pins.filter((p) => !kept.has(p.id) && seenPins.current.has(p.id)).map((p) => p.id);
    if (gone.length) onPinsSent?.(gone);
  }, [text, pins]); // eslint-disable-line react-hooks/exhaustive-deps
  const noteShots = [...new Set(pinned.map((n) => pins.find((p) => p.id === n.id)?.shot).filter((x) => x != null))].sort((a, b) => a - b);
  const scopeKind = pinned.length ? "video" : selection ? "selection" : selectedShot ? "shot" : "video";
  const listRef = useRef(null);
  const taRef = useRef(null);
  const [motionCtx, setMotionCtx] = useState(null);          // the Motion Library item behind the inserted text (sent as scope.motion)
  const caret = useRef(null);
  /** Insert one short line for the picked motion at the caret; the item itself goes with the message. */
  const insertMotion = (item) => {
    const name = `“${item.title}” (${item.author ?? "HyperFrames"})`;
    const block = item.kind === "look" ? t("For the whole video, apply the Brand Kit {name}; keep the content, timing and narration.", { name })
      : selection ? t("For {target}, use {name}; keep the timing and narration, leave the rest unchanged.", { target: selection.label, name })
        : selectedShot ? t("For shot {n} (“{title}”), use {name}; keep the timing and narration, leave the rest unchanged.", { n: selectedShot.number, title: selectedShot.title, name })
          : t("For the whole video, use {name}; keep the timing and narration, leave the rest unchanged.", { name });
    setText((cur) => {
      const at = caret.current ?? cur.length;
      if (!cur.trim()) return block;
      if (at >= cur.length) return `${cur.replace(/\s+$/, "")}\n\n${block}`;
      return `${cur.slice(0, at)}${cur.slice(0, at).endsWith("\n") || at === 0 ? "" : "\n"}${block}\n${cur.slice(at)}`;
    });
    setMotionCtx(item);
    toast(t("{kind} added to the message", { kind: t(KIND_LABEL[item.kind] ?? "Motion") }));
    setTimeout(() => taRef.current?.focus(), 0);
  };
  useEffect(() => { if (motionPick?.item) insertMotion(motionPick.item); }, [motionPick?.n]); // eslint-disable-line react-hooks/exhaustive-deps
  // the error of a failed read goes as soon as a later read works (the red "not running" card stood for minutes)
  const loadErr = useRef(null);
  const load = async () => { try { const r = await get(`/api/projects/${projectId}/tasks`); setTasks(r.tasks); setNotes(r.notes ?? []); setRunning(r.running);
    LAST_CHAT.set(projectId, { tasks: r.tasks, notes: r.notes ?? [], running: r.running });
    if (loadErr.current) { const was = loadErr.current; loadErr.current = null; setErr((x) => (x === was ? null : x)); }
    setRunInfo({ settings: r.settings, own: r.own, usage: r.usage }); return r; } catch (e) { loadErr.current = e.message; setErr(e.message); } };
  useEffect(() => { load(); }, [projectId, reloadKey]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {          // the app's lines (the pipeline's milestones, files added, a render finishing) arrive while Claude is idle too
    if (running) return;
    // also while the browser counts the window as hidden (another tab on top: the Pipeline kept polling and said "answer
    // Claude in the chat" over an empty chat until a reload), and at once when it shows again
    const h = setInterval(load, 5000);
    const back = () => { if (!document.hidden) load(); };
    document.addEventListener("visibilitychange", back);
    return () => { clearInterval(h); document.removeEventListener("visibilitychange", back); };
  }, [running, projectId]); // eslint-disable-line react-hooks/exhaustive-deps
  // a stage that starts, waits or ends on the Pipeline is a task or a line this chat may not have yet (the project's first task,
  // Prepare, started while the page opened): it is loaded now, not at the next poll
  const stepsKey = (steps ?? []).map((x) => `${x.id}:${x.status}`).join(",") + "|" + (waiting ? waiting.id ?? waiting.line ?? 1 : "");
  const seenSteps = useRef(stepsKey);
  useEffect(() => { if (seenSteps.current === stepsKey) return; seenSteps.current = stepsKey; if (tasks !== null) load(); }, [stepsKey]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (prefill) setText((x) => x || prefill); }, [prefill]);
  useEffect(() => { try { sessionStorage.setItem(`mw-draft:chat:${projectId}`, text); } catch {} }, [text, projectId]);
  useEffect(() => {          // poll only while a task runs
    if (!running) return;
    let alive = true, prev = null;
    const tick = async () => {
      const r = await load();
      if (!alive) return;
      if (r?.running) { prev = r.running; setTimeout(tick, 1200); }
    };
    prev = running; const h = setTimeout(tick, 1200);
    return () => { alive = false; clearTimeout(h); };
  }, [running]); // eslint-disable-line react-hooks/exhaustive-deps
  // a task that ended tells the Editor, also when the app starts the next step at once (Build ended as the Review began, so
  // the film, its shots and the timeline stayed the 3 s placeholder until the whole stage was done)
  const lastRun = useRef(running);
  useEffect(() => {
    const was = lastRun.current; lastRun.current = running;
    const done = was && was !== running ? tasks?.find((x) => x.id === was) : null;
    if (done) onChanged(done.changed?.length > 0);
  }, [running]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { listRef.current?.scrollTo({ top: listRef.current.scrollHeight }); }, [tasks?.length, tasks?.at(-1)?.events?.length, running, notes.length, waiting?.id]);
  // the wait card is the chat's last line: once the messages above have laid out, it is brought into view again
  useEffect(() => { if (!waiting) return undefined; const h = setTimeout(() => listRef.current?.scrollTo({ top: listRef.current.scrollHeight }), 400); return () => clearTimeout(h); }, [waiting?.id, tasks?.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const scopeOf = (kind) => (kind === "selection" && selection ? { kind: "selection", selection: selection.context, shot: selectedShot ? { number: selectedShot.number, title: selectedShot.title, src: selectedShot.src } : null }
    : kind === "shot" && selectedShot ? { kind: "shot", shot: { number: selectedShot.number, title: selectedShot.title, src: selectedShot.src, start: selectedShot.start, duration: selectedShot.duration } }
      : { kind: "project" });
  const submit = async (msg, kind, motion, scope = null) => {
    scope = scope ?? scopeOf(kind);
    if (motion && msg.includes(motion.title)) scope.motion = { id: motion.id, name: motion.title, kind: motion.kind, version: motion.version ?? motion.credit?.commit ?? null, library: motion.library ?? "motion" };
    // the notes pinned on the film whose lines the message still holds go with it (each line's time, shot, place and words)
    const notes = notesOf(msg, pins);
    const task = await post(`/api/projects/${projectId}/tasks`, { text: msg, scope, ...(notes.length ? { notes: notes.map(({ id: _id, ...n }) => n) } : {}) });
    if (pins?.length) onPinsSent?.(pins.map((p) => p.id));
    setRunning(task.id); await load();
  };
  const wait = !!running || rendering;
  const send = async () => {
    if (!text.trim() || sending) return;
    if (signedOut) { setErr(t("Claude is not connected: sign in, then send. Your message stays here.")); return; }
    if (wait) { setQueue((q) => [...q, { text, kind: scopeKind, motion: motionCtx }]); setText(""); setMotionCtx(null);
      toast(rendering && !running ? t("Queued: it goes when the render finishes") : t("Queued: it goes when Claude finishes")); return; }
    setSending(true); setErr(null);
    try { await submit(text, scopeKind, motionCtx); setText(""); setMotionCtx(null); }
    catch (e) {
      // Claude had just started a step this panel had not seen yet (the idle poll is 5 s): the message waits in the queue
      if (e.code === "BUSY") { setQueue((q) => [...q, { text, kind: scopeKind, motion: motionCtx }]); setText(""); setMotionCtx(null); toast(t("Queued: it goes when Claude finishes")); load(); }
      else { if (e.code === "CLAUDE_SIGNED_OUT") claude?.refresh(true); setErr(e.message); }
    } finally { setSending(false); }
  };
  const retry = async (task) => {
    if (wait) { setQueue((q) => [...q, { text: task.text, kind: "video", motion: null, scope: task.scope }]); return; }
    try { await submit(task.text, "video", null, task.scope ?? { kind: "project" }); } catch (e) { toast(e.message, "error"); }
  };
  useEffect(() => {          // a sheet hands Claude a message: into the composer, or sent at once ("Ask Claude to fix")
    if (inject?.removeTag) { const tag = inject.removeTag.trim(); setText((x) => x.split("\n").filter((l) => !l.trim().startsWith(tag)).join("\n")); return; }
    if (!inject?.text) return;
    if (inject.send && !wait && !signedOut) { setSending(true); setErr(null); submit(inject.text, "video", null).catch((e) => { setText(inject.text); setErr(e.message); }).finally(() => setSending(false)); }
    else if (inject.append) {          // a pinned note is a line of its own after what is written, the caret at its end
      setText((x) => (x && !x.endsWith("\n") ? `${x}\n` : x) + inject.text);
      setTimeout(() => { const el = taRef.current; if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); } }, 0);
    }
    else { setText(inject.text); setTimeout(() => taRef.current?.focus(), 0); }
  }, [inject?.n]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (claude?.connected) setErr(null); }, [claude?.connected]);
  useEffect(() => {          // the queue: when the task ends (and no render runs), the next message goes
    if (wait || !queue.length || sending || tasks === null) return;
    const [next, ...rest] = queue;
    setQueue(rest);
    // the autopilot may start the next step the moment a task ends; a busy answer puts the message back at the front
    // (after a short wait, so the poll can see the new task), never drops it; any other error hands it back to the composer
    submit(next.text, next.kind, next.motion, next.scope ?? null).catch((e) => {
      if (e.code === "BUSY") setTimeout(() => { setQueue((q) => [next, ...q]); load(); }, 1500);
      else { setText((cur) => cur || next.text); setErr(e.message); }
    });
  }, [wait, queue.length]); // eslint-disable-line react-hooks/exhaustive-deps
  // a question Claude waits on is shown over an open sheet too (the Final Mix once hid the web permission for 15 minutes)
  const asking = tasks?.find((x) => x.status === "running" && x.permission);
  useEffect(() => { onWaiting?.(asking ? { taskId: asking.id, q: asking.permission } : null); }, [asking?.id, asking?.permission?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const stop = async () => { try { await post(`/api/tasks/${running}/cancel`); toast(t("Stopping Claude…")); } catch (e) { toast(e.message, "error"); } };

  const targetLabel = scopeKind === "selection" ? selection.label : scopeKind === "shot" ? t("Shot {n}: {title}", { n: selectedShot.number, title: selectedShot.title }) : null;
  const placeholder = rendering ? t("The film is rendering: ask now, changes go when it finishes") : running ? t("Queue the next change while Claude works…")
    : scopeKind === "shot" && selectedShot ? t("What should change in shot {n}?", { n: selectedShot.number })
      : scopeKind === "selection" && selection ? t("What should change about {target}?", { target: selection.label }) : t("What should change?");
  const suggestions = useMemo(() => (SUGGEST[stage] ?? SUGGEST.feedback).slice(0, actions.length >= 4 ? 2 : actions.length === 3 ? 3 : 4).map((s) => t(s)), [t, stage, actions.length]);
  const empty = tasks?.length === 0 && !notes.length;
  const latestQa = (tasks ?? []).filter((x) => x.qa && !x.qa.error).sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1)).at(-1)?.id ?? null;
  const stopping = tasks?.find((x) => x.id === running)?.status === "cancelling";
  // the latest wait note is the reminder card while the stage still waits for the user
  const waitNote = waiting ? notes.filter((n) => n.kind === "waiting").at(-1) ?? null : chatWait(tasks, notes);
  const reply = () => { taRef.current?.focus(); taRef.current?.scrollIntoView?.({ block: "nearest" }); };
  return (
    <div className="claude">
      <section className="cpanel chist" aria-label={t("Conversation")}>
      <div className="claude-head">
        {studio && <span className="st-who"><i aria-hidden="true" /><b>{t("Conversation")}</b></span>}
        {/* the project's usage in words, always shown: tasks, tokens, API-equivalent cost (the plan does not bill it) */}
        {runInfo?.usage?.tasks > 0 && <span className="cusage-head num" title={t("Tasks · tokens · cost at API list price (your plan does not bill this)")}>
          {[runInfo.usage.tasks === 1 ? t("1 task") : t("{n} tasks", { n: runInfo.usage.tasks }),
            fmtTok((runInfo.usage.input ?? 0) + (runInfo.usage.cacheWrite ?? 0) + (runInfo.usage.cacheRead ?? 0) + (runInfo.usage.output ?? 0)),
            runInfo.usage.costUsd != null ? `≈ ${fmtUsd(runInfo.usage.costUsd)}` : null].filter(Boolean).join(" · ")}</span>}
        <span className="gap" />
        <ModelChip projectId={projectId} info={runInfo} choices={choices} disabled={!!running} task={running ? tasks?.find((x) => x.id === running) : null} onSaved={(r) => setRunInfo((x) => ({ ...x, ...r }))} />
      </div>
      <ol className="plain conversation" ref={listRef} aria-live="polite">
        {tasks === null && <li className="chat-sk" aria-label={t("Loading…")}><span className="skeleton" /><span className="skeleton" /><span className="skeleton short" /></li>}
        {empty && <li className="conv-empty"><Bot size={22} /><b>{t("Ask Claude")}</b><span>{t("Say what the video should be, or what should change. Every change can be undone.")}</span></li>}
        {threadOf(tasks, notes, (() => { const ck = steps?.find((s) => s.id === "checks"); return ck?.status === "done" ? ck.doneAt ?? null : null; })(), !!waiting && !running, !running).map((x) => x.task
          ? <TaskBlock key={x.task.id} t={x.task} projectId={projectId} toast={toast} steps={steps} interrupted={interrupted} qaCurrent={x.task.id === latestQa} onPlay={onPlay} onSeek={onSeek} fps={fps} onRetry={retry} onChanged={(changed) => { load(); onChanged(changed); }} />
          : <Note key={x.note.id} n={x.note} projectId={projectId} toast={toast} onPlay={onPlay} onDetails={onOpenSheet ? () => onOpenSheet("qa") : null} checks={checks}
            waitActive={!running && x.note.id === waitNote?.id} onOpenSheet={onOpenSheet} onReply={reply}
            onRecheck={() => post(`/api/projects/${projectId}/qa`).then(() => toast(t("Checking the film again"))).catch((e) => toast(e.message, "error"))}
            onFix={() => retry({ text: t("Fix the problems the tech checks found, with the smallest change; keep the approved layouts and motion."), scope: { kind: "project" } })} />)}
        {waiting && !running && !waitNote && <WaitCard stage={waiting} onOpen={onOpenSheet} />}          {/* a server without wait notes: the card from the stage */}
      </ol>
      {err && !signedOut && <div style={{ padding: "0 12px 12px" }}><Banner kind="error">{err}</Banner></div>}
      </section>
      {/* the dialogs the user opens most, anchored above the input so they never scroll away */}
      {actions.length > 0 && <section className="cpanel cacts" aria-label={t("Open")}>{actions.map((a) =>
        <button key={a.key} className={"btn sm cact" + (a.att ? " att" : "")} disabled={a.off} title={a.title} onClick={a.onClick}>{a.icon}{a.label}</button>)}</section>}
      <section className="cpanel composer" aria-label={t("Message to Claude")}>
        {signedOut && <NeedsClaude text={t("Claude is not connected: your message stays here as a draft")} />}
        {queue.length > 0 && <div className="cqueue">{queue.map((q, i) => <span key={i} className="cchip"><span className="t">{t("Queued:")} {q.text}</span>
          <button className="btn ghost icon sm" onClick={() => setQueue((x) => x.filter((_, j) => j !== i))} aria-label={t("Remove from the queue")}><X size={12} /></button></span>)}</div>}
        {(targetLabel || pinned.length > 0 || (motionCtx && text.includes(motionCtx.title))) && <div className="ctarget">
          {pinned.length > 0 && <span className="cchip cpick" title={t("Each note goes with its frame and its place on the picture.")}><MapPin size={12} />
            <span className="t">{noteShots.length ? t(noteShots.length === 1 ? "Notes on shot {list}" : "Notes on shots {list}", { list: noteShots.join(", ") }) : t("Notes on the film")}</span></span>}
          {targetLabel && <span className="cchip cpick" title={t("Claude works on this. Clear it to work on the whole film.")}><span className="t">{t("Selected: {target}", { target: targetLabel })}</span>
            <button className="btn ghost icon sm" onClick={() => onClearTarget?.()} aria-label={t("Clear: the whole film")} title={t("Clear: the whole film")}><X size={12} /></button></span>}
          {motionCtx && text.includes(motionCtx.title) && <span className="cchip amber"><Library size={12} /><span className="t">{t(KIND_LABEL[motionCtx.kind] ?? "Motion")}: {motionCtx.title}</span>
            <button className="btn ghost icon sm" onClick={() => setMotionCtx(null)} aria-label={t("Detach the library item")} title={t("Detach (the text stays)")}><X size={12} /></button></span>}
        </div>}
        {!text && !targetLabel && <div className="csuggest">{suggestions.map((s) => <button key={s} className="cchip sug" onClick={() => { setText(s); taRef.current?.focus(); }} title={s}><Wand2 size={12} /><span className="t">{s}</span></button>)}</div>}
        <textarea ref={taRef} className="textarea composer-input" rows={3} value={text} onChange={(e) => setText(e.target.value)} aria-label={t("Message to Claude")}
          onSelect={(e) => { caret.current = e.currentTarget.selectionStart; }} onBlur={(e) => { caret.current = e.currentTarget.selectionStart; }}
          placeholder={placeholder} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} />
        <div className="composer-actions">
          {onOpenMotions && <button className={"btn ghost sm" + (motionsOpen ? " on" : "")} onClick={onOpenMotions} aria-expanded={motionsOpen} title={t("Motions (opens under the film)")}><Library size={14} /><span className="lbl">{t("Motions")}</span></button>}
          {text && <button className="clink" onClick={() => { setText(""); setMotionCtx(null); }}>{t("Clear")}</button>}
          <span className="gap" />
          {running && <button className="btn sm cstop" onClick={stop} disabled={stopping} title={t("Stop what Claude is doing; what is done is kept")}>{stopping ? <Loader2 size={13} className="spin" /> : <CircleStop size={14} />}<span className="lbl">{t("Stop")}</span></button>}
          <button className="btn sm csend" onClick={send} disabled={!text.trim() || sending || signedOut} title={signedOut ? t("Sign in to Claude first") : t("Enter sends · Shift+Enter makes a new line")}>
            {sending ? <Loader2 size={14} className="spin" /> : <Send size={14} />}<span className="lbl">{wait ? t("Queue") : t("Send")}</span></button>
        </div>
      </section>
    </div>
  );
}
