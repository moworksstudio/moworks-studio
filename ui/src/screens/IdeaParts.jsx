// The Writers Room's shared parts (audit/104 §7): an idea's truth tag, its sources as numbered chips, the running panel of a pitch or a
// script, and the hook that follows the room's runs from the server (they go on while the page is closed: #1115).
// Two parts are ported from Lucian UX/UI Prompt (Seokwoooo, MIT, https://github.com/Seokwoooo/lucian-uxui-prompt/tree/7e339faa1cc5e87496cb7ce556a5b22aadbe76f8):
// Lucian UX/UI Prompt #083 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#083 (the queue bar that turns into progress,
//   its log lines rising with spinners that turn into checks, the status pill): RunPanel, adapted to the app's tokens and the run's own steps.
// Lucian UX/UI Prompt #224 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#224 (a source chip's preview card that floats
//   above it): Sources, the numbered chips (and "+N", from Perplexica's source list, audit/104 §5 lesson 7) without the per-sentence marks.
import { useEffect, useRef, useState } from "react";
import { Check, ExternalLink, Loader2 } from "lucide-react";
import { Dialog } from "../components.jsx";
import { get, post } from "../api.js";
import { useToast } from "../lib.jsx";
import { useT } from "../i18n.jsx";

const TRUTH = { true: ["True", "ok"], disputed: ["Disputed", "warn"], legend: ["Legend", "plain"], fiction: ["Fiction", "plain"], unchecked: ["Not checked", "plain"] };
/** True / Disputed / Legend: green, yellow, grey (audit/104 §4), by its word as well as its colour. */
export function Truth({ truth }) {
  const t = useT();
  const [label, tone] = TRUTH[truth] ?? TRUTH.unchecked;
  return <span className={"wr-truth " + tone}>{t(label)}</span>;
}

export const hostOf = (u) => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return u; } };
/** An idea's sources: the first three as numbered chips with the site's name, "+N" for the rest; a chip's title shows over it. */
export function Sources({ sources, max = 3 }) {
  const t = useT();
  const [all, setAll] = useState(false);
  const shown = all ? sources : sources.slice(0, max);
  return <div className="wr-src" role="list" aria-label={t("Sources")}>
    {shown.map((s, i) => <span key={i} role="listitem" className="wr-src-it">
      <a className="wr-src-chip" href={s.url} target="_blank" rel="noopener noreferrer" aria-describedby={undefined}>
        <span className="n num">{i + 1}</span><span className="h">{hostOf(s.url)}</span><ExternalLink size={10} aria-hidden="true" /></a>
      <span className="wr-src-pv" role="tooltip"><b>{s.title || hostOf(s.url)}</b><span>{hostOf(s.url)}</span></span></span>)}
    {sources.length > max && <button type="button" className="wr-src-chip more" onClick={() => setAll((o) => !o)} aria-expanded={all}>
      {all ? t("Fewer") : `+${sources.length - max}`}</button>}
  </div>;
}

/** How long a run has gone, ticking each second. */
export function Elapsed({ from }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const i = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(i); }, []);
  const s = Math.max(0, Math.round((now - Date.parse(from)) / 1000));
  return <span className="num">{Math.floor(s / 60)}:{String(s % 60).padStart(2, "0")}</span>;
}

/** The running panel (Lucian #083): what the run is for in one line, a bar (moving while the first step runs, then filling step by step),
 *  the steps rising one by one with a spinner that turns into a check, the time and Stop. A run that ended shows its last state. */
export function RunPanel({ job, title, sub, onStop }) {
  const t = useT();
  // a step that never ran (a pitch that read no page) is left out; the rest show as they happened (T41-1)
  const steps = (job.steps?.length ? job.steps : [{ id: "start", label: "Starting", state: "run", count: 0 }]).filter((x) => x.state !== "skip");
  const running = job.status === "running", failed = job.status === "failed";
  const done = steps.filter((x) => x.state === "done").length;
  const queued = running && done === 0;          // no step finished yet: the bar has no end to show
  const p = !running ? 1 : done / steps.length;
  const shown = steps.filter((x) => x.state !== "todo");
  return <section className={"wr-run" + (running ? "" : failed ? " is-failed" : " is-done")} aria-label={title} aria-live="polite">
    <header><div className="wr-run-t"><b>{title}</b>{sub && <small>{sub}</small>}</div>
      <span className={"wr-run-pill" + (running ? " run" : failed ? " stop" : " ok")}>{t(running ? (job.stage === "stopping" ? "Stopping" : "Running") : failed ? "Stopped" : "Done")}</span>
      {running && <Elapsed from={job.startedAt} />}
      {running && onStop && <button type="button" className="btn sm" onClick={onStop} disabled={job.stage === "stopping"}>{t("Stop")}</button>}</header>
    <div className={"wr-run-bar" + (queued ? " queued" : "")} style={{ "--p": p }} aria-hidden="true"><i className="seg a" /><i className="seg b" /><i className="fill" /></div>
    <ol className="wr-run-log">{shown.map((x) => <li key={x.id} className={x.state === "done" || !running ? "ok" : ""}>
      <span className="st" aria-hidden="true">{(x.state === "done" || !running) && !failed && <Check size={11} />}</span>
      <span>{t(x.label)}{x.id === "web" && x.count > 0 && <small className="num"> · {x.count === 1 ? t("1 page read") : t("{n} pages read", { n: x.count })}</small>}</span></li>)}</ol>
    {failed && job.error?.message && <p className="wr-run-err" role="alert">{job.error.message}</p>}
  </section>;
}

/** A run's percent as the server says it (T42-3: the step's share moves with its time), null before it says one. */
const pctOf = (job) => (job?.progress != null && job.status === "running" ? Math.max(0, Math.min(99, Math.round(job.progress))) : null);
/** The place of what Claude is pitching or writing (owner #1324: the form of the character being made, which the owner liked): a dashed
 *  card with a spinner, how far in big figures and a thin bar, what it is and the step it is on; a click opens the steps. `as` is the
 *  element it sits in (a card in the ideas' grid, a row in the scripts' list). */
export function MakingCard({ job, title, sub, onOpen, as = "card" }) {
  const t = useT();
  const p = pctOf(job), step = job.stage && job.stage !== "starting" ? t(String(job.stage)) : t("Starting…");
  const bar = <span className="wr-making-bar" aria-hidden="true"><span style={{ transform: `scaleX(${Math.max(3, p ?? 3) / 100})` }} /></span>;
  if (as === "row") return <button type="button" className="wr-sitem wr-making-row" onClick={onOpen} title={t("See the steps")}>
    <span className="wr-making-h"><Loader2 size={13} className="spin wr-making-ic" aria-hidden="true" /><b>{title}</b><span className="wr-making-pct num">{p != null ? `${p}%` : ""}</span></span>
    <small>{step}</small>{bar}</button>;
  return <li className="wr-card-li"><button type="button" className="wr-card wr-making studio-paper" onClick={onOpen} title={t("See the steps")}>
    <span className="wr-making-h"><Loader2 size={15} className="spin wr-making-ic" aria-hidden="true" /><b className="wr-card-t">{title}</b>
      <span className="wr-making-pct num">{p != null ? `${p}%` : ""}</span></span>
    {sub && <span className="wr-making-sub">{sub}</span>}
    <span className="wr-making-step">{step}</span>{bar}
  </button></li>;
}
/** The steps of a run in a dialog (the Characters page's "Making …" dialog): the step and percent, the bar, the steps so far, and at the foot
 *  that it goes on when closed, Stop and Close. */
export function RunDialog({ job, title, sub, onStop, onClose }) {
  const t = useT();
  const p = pctOf(job), halting = job.stage === "stopping";
  const steps = (job.steps ?? []).filter((x) => x.state !== "skip" && x.state !== "todo");
  return <Dialog title={title} onClose={onClose}
    footer={<><span className="hint">{t("It goes on if you close this.")}</span><span className="spacer" />
      {onStop && <button className="btn" onClick={onStop} disabled={halting}>{halting ? <Loader2 size={14} className="spin" /> : null}{halting ? t("Stopping…") : t("Stop")}</button>}
      <button className="btn" onClick={onClose}>{t("Close")}</button></>}>
    {sub && <p className="hint wr-making-dsub">{sub}</p>}
    <p className="state-line run"><Loader2 size={14} className="spin" />{t(job.stage && job.stage !== "starting" ? String(job.stage) : "Starting…")}{p != null ? ` · ${p}%` : ""} · <Elapsed from={job.startedAt} /></p>
    <div className="ch-bar"><span style={{ transform: `scaleX(${Math.max(3, p ?? 3) / 100})` }} /></div>
    {steps.length > 0 && <ol className="wr-run-log wr-making-log">{steps.map((x) => <li key={x.id} className={x.state === "done" ? "ok" : ""}>
      <span className="st" aria-hidden="true">{x.state === "done" && <Check size={11} />}</span>
      <span>{t(x.label)}{x.id === "web" && x.count > 0 && <small className="num"> · {x.count === 1 ? t("1 page read") : t("{n} pages read", { n: x.count })}</small>}</span></li>)}</ol>}
  </Dialog>;
}

/** The room's runs from the server (GET /api/ideas/jobs: running, and those that ended in the last minutes), every 2 s while one runs,
 *  every 6 s otherwise; onEnd(job) once for each run seen ending, so the page reloads what it made. */
export function useIdeaJobs(onEnd) {
  const [jobs, setJobs] = useState([]);
  const seen = useRef(new Map());
  const end = useRef(onEnd); end.current = onEnd;
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let alive = true, timer = null;
    const pull = async () => {
      try {
        const r = await get("/api/ideas/jobs");
        if (!alive) return;
        for (const j of r.jobs) { const was = seen.current.get(j.id); if (was === "running" && j.status !== "running") end.current?.(j); seen.current.set(j.id, j.status); }
        setJobs(r.jobs);
        timer = setTimeout(pull, r.jobs.some((j) => j.status === "running") ? 2000 : 6000);
      } catch { if (alive) timer = setTimeout(pull, 6000); }
    };
    pull();
    return () => { alive = false; clearTimeout(timer); };
  }, [tick]);
  const running = jobs.filter((j) => j.status === "running");
  return {
    jobs, pitch: running.find((j) => j.kind === "idea-pitch") ?? null,
    scripts: running.filter((j) => j.kind === "idea-script"),
    // the last ended run of a kind, to show its final state once (a run that stopped says why)
    lastEnded: (kind) => jobs.filter((j) => j.kind === kind && j.status !== "running").sort((a, b) => (a.endedAt < b.endedAt ? 1 : -1))[0] ?? null,
    scriptRun: (ideaId) => running.find((j) => j.kind === "idea-script" && j.ideaId === ideaId) ?? null,
    refresh: () => setTick((n) => n + 1),
  };
}

/** Start a script run for an idea of mine; the room follows it from the server. */
export function useWriteScript(jobs) {
  const t = useT();
  const toast = useToast();
  return async (x) => {
    try { await post(`/api/ideas/${x.id}/script`, {}); jobs.refresh(); toast(t("Claude is writing the script of “{name}”", { name: x.name })); }
    catch (e) { toast(e.message, "error"); }
  };
}
export const stopJob = (job, toast) => post(`/api/jobs/${job.id}/cancel`).catch((e) => toast(e.message, "error"));
