// The top bar's work chip as a button (owner 06/11 #1322: a character takes 30-45 minutes; the user should not stand and wait): its word
// (Idle, Working, Downloading, Updating) as before, and a click opens the app's work as a checklist, on the same popover the Claude chip
// next to it opens (claude-pop: paper in The Studio): what runs now in yellow (a spinner, its percent and a thin bar when it says one), what
// ended in the last half hour with a green tick or in red with its reason; each line opens where the work is (the film, the character, the
// Writers Room…). A job's end on another screen is also said by App's notices (VersionNotices), with its Open.
// Data: GET /tasks/running (tasks, jobs, recent), read by the TopBar every 4 s. Status reads by icon and words as well as colour.
import { useEffect, useRef, useState } from "react";
import { CheckCircle2, CircleSlash, Loader2, XCircle } from "lucide-react";
import { useT } from "../i18n.jsx";
import { ago } from "../lib.jsx";

const BUSY_WORD = { working: "Working", downloading: "Downloading", updating: "Updating" };
// a job's name without the bracketed detail (never a file name), cut to its head: "Making Lan, a girl in a green raincoat" -> "Making Lan"
// (owner 06/11 #1322: each line says just enough to know what is being made, on one line)
export const nameOf = (x) => String(x?.label ?? x?.title ?? "").replace(/\s*\(.*?\)\s*/g, " ").replace(/\s+/g, " ").trim().split(/,| · | — /)[0].trim();          // the chip's hover line too (App.jsx): one rule (audit/112c c1.7)

function Row({ r, onOpen }) {
  const t = useT();
  const Icon = r.state === "run" ? Loader2 : r.state === "done" ? CheckCircle2 : r.state === "failed" ? XCircle : CircleSlash;
  const word = { run: t("Running"), done: t("Done"), failed: t("Failed"), cancelled: t("Stopped") }[r.state];
  const body = <>
    <Icon size={15} className={"act-ic" + (r.state === "run" ? " spin" : "")} aria-hidden="true" />
    <span className="act-txt"><b title={r.full}>{r.title}</b>{r.sub ? <span className="act-sub" title={r.why ?? undefined}>{r.sub}</span> : null}
      {r.state === "run" && r.progress != null && <span className="act-bar" aria-hidden="true"><span style={{ transform: `scaleX(${Math.max(2, Math.min(100, r.progress)) / 100})` }} /></span>}</span>
    {r.state === "run" && r.progress != null && <span className="act-pct num">{Math.round(r.progress)}%</span>}
  </>;
  const cls = "act-row s-" + r.state;
  return <li>{r.href ? <a className={cls} href={r.href} onClick={onOpen} aria-label={`${r.title} · ${word}`}>{body}</a> : <span className={cls}>{body}</span>}</li>;
}

/** The checklist's lines: Claude's tasks and every job running, background work included (a full-quality render after a Build, a kit
 *  scan: the chip says Working for them, so the list names them, one short line each: audit/112c c1.2, owner Q-c2), then what ended. */
export function activityRows({ tasks = [], jobs = [], recent = [] }, t) {
  return [
    ...tasks.map((x) => ({ key: "t" + x.taskId, state: "run", title: nameOf(x), full: x.title, sub: x.stage ? t(String(x.stage)) : t("Claude is working"), href: x.href ?? (x.projectId ? `#/projects/${x.projectId}` : null) })),
    ...jobs.map((j) => ({ key: j.id, state: "run", title: nameOf(j), full: j.label ?? j.title, sub: (j.stage && j.stage !== "starting" ? String(j.stage) : null) ?? j.project ?? null, progress: j.progress, href: j.href })),
    // an ended line: its name, then the word (Done / Failed / Stopped) and when; a failure's reason on hover and in its notice
    ...recent.map((j) => ({ key: j.id, state: j.status, title: nameOf(j), full: j.label ?? j.title, sub: [j.project ? nameOf({ title: j.project }) : null, { done: t("Done"), failed: t("Failed"), cancelled: t("Stopped") }[j.status], j.endedAt ? ago(j.endedAt) : null].filter(Boolean).join(" · "), why: j.status === "failed" ? j.error : null, href: j.href })),
  ];
}

export default function ActivityChip({ st, tip, tasks = [], jobs = [], recent = [] }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const off = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    const esc = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", off); document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", off); document.removeEventListener("keydown", esc); };
  }, [open]);
  const rows = activityRows({ tasks, jobs, recent }, t);
  const running = rows.filter((r) => r.state === "run").length;
  return <div className="claude-chip act-chip" ref={ref}>
    <button type="button" className="chip-status" onClick={() => setOpen((o) => !o)} aria-haspopup="dialog" aria-expanded={open} title={tip || t("What the app is working on")}>
      <span className={"dot " + (st === "idle" ? "ok" : "busy")} aria-hidden="true" />{st === "idle" ? t("Idle") : t(BUSY_WORD[st] ?? "Working")}
      {running > 1 && <span className="act-n num">{running}</span>}</button>
    {open && <div className="claude-pop act-pop" role="dialog" aria-label={t("What the app is working on")}>
      <div className="claude-pop-head"><span className={"dot " + (running ? "busy" : "ok")} aria-hidden="true" /><b>{running ? t("{n} running", { n: running }) : t("Nothing is running")}</b></div>
      {rows.length ? <ul className="plain act-list">{rows.map((r) => <Row key={r.key} r={r} onOpen={() => setOpen(false)} />)}</ul>
        : <p className="hint">{t("Claude's work, characters, renders and downloads show here while they run, and for half an hour after.")}</p>}
    </div>}
  </div>;
}
