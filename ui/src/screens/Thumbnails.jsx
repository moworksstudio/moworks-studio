// Thumbnails (owner #1312, #1313, #1318): upload thumbnails of a built film, at 16:9 (YouTube, 1280 x 720) and 9:16 (Shorts, Reels).
// A page of its own, like the Writers' Room: the work runs as the server's background jobs, so the owner can leave and come back (the
// app's notices say when each ends). Pick a film on the left: the app takes 3 frames of it (shown as soon as they are there); pick one
// and the two thumbnails are made, the Automatic way (the film style's look) or by the film's Brand Kit; Edit title, Make again, Open folder.
// Approved on screen (#1283): the page, the 3 frames, the two ways and those three buttons; nothing else is added.
// Laid out for Operate (Impeccable), one window high in both themes (only a long list scrolls inside its frame); The Studio lays the frames
// and the prints on the light table. The frame picker's sliding ring: Lucian UX/UI Prompt #015 "Plan radio cards" (MIT, (c) 2026 Seokwoooo,
// https://lucianlabs.dev/uxui-prompt/#015), its frame that slides to the choice and its arrow keys, laid out in a row; the frames' wait:
// #079 "Skeleton that blooms into a post" (https://lucianlabs.dev/uxui-prompt/#079), its one streak of light and the picture that comes into focus.
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { CircleStop, FolderOpen, Loader2, Pencil, RefreshCw } from "lucide-react";
import { get, post, put } from "../api.js";
import { Banner } from "../components.jsx";
import { go, useToast, usePoll } from "../lib.jsx";
import { useT } from "../i18n.jsx";
import { useThemeId } from "../theme.jsx";
import { Elapsed } from "./IdeaParts.jsx";
import "../thumbnails.css";

// what a Stop leaves (#1370): said once when the run ends
const STOPPED = { "thumb-frames": "Stopped: no frames were taken", "thumb-make": "Stopped: the thumbnails stay as they were", "thumb-render": "Stopped: the pictures were not rendered again" };
const WAYS = [["auto", "Automatic"], ["brand", "Brand Kit"]];
const sec = (t) => `${Number(t).toFixed(1).replace(/\.0$/, "")} s`;
const jobMins = (j) => (j?.estimate?.minutes ? `${j.estimate.minutes[0]}–${j.estimate.minutes[1]} min` : null);

export default function Thumbnails({ id = null }) {
  const t = useT();
  const studio = useThemeId() === "studio";
  const [films, setFilms] = useState(null);
  const [err, setErr] = useState(null);
  const loadFilms = () => get("/api/thumbnails").then((r) => setFilms(r.films)).catch(setErr);
  useEffect(() => { loadFilms(); }, []);
  // the film the owner chose (or the one an Open names); none on its own: opening the page takes no frames (audit/112c c1.3, owner Q-c1)
  const cur = id && films?.some((f) => f.id === id) ? id : null;
  const [nonce, setNonce] = useState(0);          // a click on a film opens it afresh (its frames are taken again after a Stop)
  const pick = (fid) => { setNonce((n) => n + 1); go(`/thumbnails?id=${fid}`); };
  const head = studio
    ? <div className="st-head"><h1>{t("Thumbnails")}</h1><span className="st-aside">{t("the picture before the play")}</span></div>
    : <div className="page-head"><div><h1>{t("Thumbnails")}</h1><p className="lead">{t("Upload pictures for a finished film, at 16:9 and 9:16.")}</p></div></div>;
  return <div className={"page gal-page th-page" + (studio ? " st-motionlib st-thumbs" : "")}>
    {head}
    {err && <Banner kind="error">{err.message}</Banner>}
    {films === null && !err ? <div className="th-layout"><div className="skeleton th-films" /><div className="skeleton th-work" /></div>
      : films && !films.length ? <div className="empty th-empty"><h2>{t("No finished film yet")}</h2><p>{t("Thumbnails are made from a film once its Production step has run.")}</p></div>
      : films && <div className="th-layout">
        <nav className="th-films studio-paper" aria-label={t("Films")}>
          <h2 className="wr-h">{t("Films")}</h2>
          <ul className="th-flist">{films.map((f) => <li key={f.id}>
            <button type="button" className={"th-film" + (f.id === cur ? " on" : "")} aria-current={f.id === cur ? "true" : undefined} onClick={() => pick(f.id)}>
              <span className="th-film-pic"><Poster src={f.poster} title={f.title} /></span>
              <span className="th-film-t"><b>{f.title}</b><small>{[f.style, f.kit].filter(Boolean).join(" · ")}</small></span>
              {f.running ? <span className="dot busy" aria-label={t("Running")} /> : f.made && <span className="dot ok" aria-label={t("Thumbnails made")} />}
            </button></li>)}</ul>
        </nav>
        {cur ? <Work key={`${cur}:${nonce}`} id={cur} byClick={nonce > 0} onChanged={loadFilms} />
          : <div className="th-work th-choose"><p className="hint">{t("Choose a film on the left.")}</p></div>}
      </div>}
  </div>;
}

/** A film's poster, or its slate (its title) when it has none or the picture is gone. */
function Poster({ src, title }) {
  const [bad, setBad] = useState(false);
  return src && !bad ? <img src={src} alt="" loading="lazy" onError={() => setBad(true)} /> : <span className="th-slate">{title}</span>;
}

/** One film's thumbnails: the way, the three frames, the two pictures and their buttons. */
function Work({ id, byClick = false, onChanged }) {
  const t = useT();
  const toast = useToast();
  const [v, setV] = useState(null);
  const [err, setErr] = useState(null);
  const [way, setWay] = useState("auto");
  const [editing, setEditing] = useState(null);          // the title being typed, or null
  const asked = useRef(false);
  const load = () => get(`/api/thumbnails/${id}`).then((r) => { setV(r); setErr(null); return r; }).catch((e) => { setErr(e); return null; });
  useEffect(() => { load().then((r) => { const w = r?.job?.way ?? r?.way; if (w) setWay(w); else if (r?.kit) setWay("brand"); }); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps
  // the job in hand: followed while it runs; its end reads the film again (and the list's dots)
  const running = v?.job ?? null;
  usePoll(() => load().then((r) => { if (!r || r.job) return; onChanged(); if (r.jobs[0]?.status === "cancelled") toast(t(STOPPED[r.jobs[0].kind] ?? "Stopped")); }), 1200, !!running);
  // a film with no frames yet, picked by the owner: they are taken at once (the click is the ask; a reload or an Open alone takes none)
  useEffect(() => {
    if (!v || !byClick || asked.current || v.job || v.frames.length) return;
    const last = v.jobs.find((j) => j.kind === "thumb-frames");
    if (last?.status === "failed") return;
    asked.current = true;
    start(() => post(`/api/thumbnails/${id}/frames`));
  }, [v]); // eslint-disable-line react-hooks/exhaustive-deps
  const start = async (fn) => {
    try { const r = await fn(); setV(r.view ? { ...r.view, job: r.job } : null); if (!r.view) load(); onChanged(); }
    catch (e) { toast(e.message, "error"); load(); }
  };
  const make = (n) => start(() => post(`/api/thumbnails/${id}/make`, { frame: n, way }));
  const saveTitle = async () => {
    const text = (editing ?? "").trim();
    if (!text || text === v.thumbTitle) { setEditing(null); return; }
    setEditing(null);
    await start(() => put(`/api/thumbnails/${id}/title`, { title: text }));
  };
  const openFolder = () => post(`/api/thumbnails/${id}/open`).catch((e) => toast(e.message, "error"));
  if (err && !v) return <section className="th-work studio-paper"><Banner kind="error">{err.message}</Banner></section>;
  if (!v) return <section className="th-work studio-paper"><div className="skeleton" style={{ height: "100%" }} /></section>;

  const taking = running?.kind === "thumb-frames";
  const making = running && running.kind !== "thumb-frames";
  const last = !running ? v.jobs[0] ?? null : null;          // the newest run, once it has ended
  const failed = last?.status === "failed" ? last : null;
  const stopped = last?.status === "cancelled" && last.kind === "thumb-frames" && !v.frames.length;
  const busy = !!running;
  const chosen = (making ? running.frame : null) ?? v.pick ?? null;          // the frame being made from rings at once
  return <section className="th-work studio-paper" aria-label={v.title}>
    <div className="th-bar">
      <div className="segmented th-ways" role="radiogroup" aria-label={t("Way")}>
        {WAYS.map(([k, l]) => { const off = k === "brand" && !v.kit;
          return <button key={k} type="button" role="radio" aria-checked={way === k} aria-pressed={way === k} disabled={off || busy}
            title={off ? t("This film has no Brand Kit") : k === "brand" ? t("By the rules of {kit}", { kit: v.kit.title }) : t("In the film style's own look")}
            onClick={() => setWay(k)}>{t(l)}</button>; })}
      </div>
    </div>

    <div className="th-sec">
      <h3 className="wr-h">{t("Pick a frame")}</h3>
      {v.frames.length && !taking ? <FramePicker frames={v.frames} chosen={chosen} disabled={busy} onPick={make} t={t} />
        : <div className={"th-frames" + (taking ? " is-loading" : " is-empty")} aria-busy={taking}>{[1, 2, 3].map((n) => <div key={n} className={"th-frame" + (taking ? " th-sk" : " th-slot")} style={{ "--d": `${(n - 1) * 60}ms` }} />)}</div>}
      <p className="th-line" aria-live="polite">{stopped ? t("Stopped. Click the film on the left to take its frames again.")
        : !running && v.frames.length && !v.made ? t("Click the frame the thumbnails should be made from.") : null}</p>
    </div>

    {failed && <Banner kind="error">{failed.error?.message ?? t("It stopped.")}</Banner>}

    <div className="th-sec th-out-sec">
      <h3 className="wr-h">{t("Pictures")}</h3>
      {/* what runs holds the pictures' place, as in the Writers' Room and Casting (#1324, #1370): its step, how far, the time and Stop */}
      <div className="th-stage">{running ? <Making job={running} />
        : v.made ? <div className="th-out">
          <figure className="th-pic w"><img src={v.files["16x9"]?.url} alt={t("16:9 thumbnail: {title}", { title: v.thumbTitle ?? "" })} /><figcaption>16:9 · 1280 × 720</figcaption></figure>
          <figure className="th-pic h"><img src={v.files["9x16"]?.url} alt={t("9:16 thumbnail: {title}", { title: v.thumbTitle ?? "" })} /><figcaption>9:16 · 1080 × 1920</figcaption></figure>
        </div>
        : <div className="th-none"><p>{t("The two pictures appear here.")}</p></div>}</div>
      {v.made && <div className="th-acts">
        {editing != null
          ? <input className="input th-edit" autoFocus value={editing} maxLength={140} aria-label={t("Title")} onChange={(e) => setEditing(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") saveTitle(); if (e.key === "Escape") setEditing(null); }} onBlur={() => setEditing(null)} />
          : <button type="button" className="btn" disabled={busy} onClick={() => setEditing(v.thumbTitle ?? "")}><Pencil size={15} />{t("Edit title")}</button>}
        <button type="button" className="btn" disabled={busy || chosen == null} onClick={() => make(chosen)}><RefreshCw size={15} />{t("Make again")}</button>
        <button type="button" className="btn" onClick={openFolder}><FolderOpen size={15} />{t("Open folder")}</button>
        {editing != null && <span className="th-mute th-hint">{t("Enter to save, Esc to cancel")}</span>}
      </div>}
      {v.made && !!v.warnings.length && <div className="th-warns">{v.warnings.map((w) => <Banner key={w.code} kind="warning">{t(w.text, w.vars)}</Banner>)}</div>}
    </div>
  </section>;
}

/** What runs, in the pictures' place (the form of the Writers' Room's and Casting's, #1324, #1370): a spinner, how far in big figures, the
 *  step, the time, a thin bar, and Stop (the thumbnails made before stay as they were). */
function Making({ job }) {
  const t = useT();
  const toast = useToast();
  const [stopping, setStopping] = useState(false);
  const halting = stopping || job.stage === "stopping";
  const p = job.progress != null ? Math.max(0, Math.min(99, Math.round(job.progress))) : null;
  const stop = async () => { setStopping(true); try { await post(`/api/jobs/${job.id}/cancel`); } catch (e) { setStopping(false); toast(e.message, "error"); } };
  return <div className="th-making" role="status" aria-live="polite">
    <div className="th-making-h"><Loader2 size={16} className="spin th-making-ic" aria-hidden="true" /><b>{t(job.title)}</b><span className="th-making-pct num">{p != null ? `${p}%` : ""}</span></div>
    <span className="th-making-step">{t(job.stage && !["starting", "stopping"].includes(job.stage) ? String(job.stage) : halting ? "Stopping…" : "Starting…")} · <Elapsed from={job.startedAt} />{jobMins(job) ? <span className="th-mute"> · {t("usually {m}", { m: jobMins(job) })}</span> : null}</span>
    <span className="wr-making-bar th-making-bar" aria-hidden="true"><span style={{ transform: `scaleX(${Math.max(3, p ?? 3) / 100})` }} /></span>
    <button type="button" className="btn" onClick={stop} disabled={halting} title={t("Stop: the thumbnails made before stay as they were")}>{halting ? <Loader2 size={14} className="spin" /> : <CircleStop size={14} />}{halting ? t("Stopping…") : t("Stop")}</button>
  </div>;
}

/** The three frames as one radio group: a ring slides to the chosen one (Lucian #015), arrow keys move it, a click or Enter makes them. */
function FramePicker({ frames, chosen, disabled, onPick, t }) {
  const grp = useRef(null), ring = useRef(null);
  const [focus, setFocus] = useState(chosen ?? frames[0]?.n ?? 1);
  useLayoutEffect(() => {
    const el = grp.current?.querySelector(`[data-n="${chosen}"]`), r = ring.current;
    if (!r) return;
    if (!el) { r.style.opacity = "0"; return; }
    r.style.opacity = "1"; r.style.transform = `translateX(${el.offsetLeft}px)`; r.style.width = `${el.offsetWidth}px`; r.style.height = `${el.offsetHeight}px`;
  });
  const move = (e, i) => {
    const d = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    const next = frames[(i + d + frames.length) % frames.length];
    setFocus(next.n);
    grp.current?.querySelector(`[data-n="${next.n}"]`)?.focus();
  };
  return <div className="th-frames" role="radiogroup" aria-label={t("Pick a frame")} ref={grp}>
    <span className="th-ring" ref={ring} aria-hidden="true" />
    {frames.map((f, i) => <button key={f.n} type="button" role="radio" data-n={f.n} aria-checked={chosen === f.n} tabIndex={(chosen ?? focus) === f.n ? 0 : -1}
      className={"th-frame" + (chosen === f.n ? " on" : "")} disabled={disabled} onKeyDown={(e) => move(e, i)} onClick={() => onPick(f.n)}
      aria-label={t("Frame at {s}", { s: sec(f.t) })}>
      <img src={f.url} alt="" />
      <span className="th-frame-t num">{sec(f.t)}{f.url9 ? " · 9:16" : ""}</span>
    </button>)}
  </div>;
}
