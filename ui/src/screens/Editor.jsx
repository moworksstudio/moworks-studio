// Editor (no HF Studio in the Editor; neutral colours, three clear zones, less on screen). Top: the project's strip (name, style · format · length in one quiet line,
// what runs, Versions, Render). Left: Shots | Assets tabs above the six-stage Pipeline. Centre: HF's own player (packages/hf-preview)
// with the app's controls and the timeline; the motion drawer opens in the timeline's place. Right: Claude. A click on the film picks an
// element (HF's runtime picker): it becomes Claude's target, and words written in the file can be edited by hand beside it. While Claude
// works on the project, hand edits wait (the film still plays); while the project renders, hand edits, Claude's changes and the assets
// wait too, and one render runs at a time in the whole app. The stages open as sheets over the Editor; after Create
// project the brief goes to Claude as soon as the film is open (the kickoff); from there the app runs the steps by itself.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Film, LayoutList, Library, Loader2, Plus, Sliders, Smile } from "lucide-react";
import { get, patch, post } from "../api.js";
import { Banner, Dialog, Panes } from "../components.jsx";
import { clock, go, usePref, useData, useToast } from "../lib.jsx";
import ErrorBoundary from "../ErrorBoundary.jsx";
import ClaudePanel, { Question } from "../editor/ClaudePanel.jsx";
import Player, { friendlyLabel, usePreview } from "../editor/Player.jsx";
import Timeline, { soundName } from "../editor/Timeline.jsx";
import MotionDrawer from "../editor/MotionDrawer.jsx";
import SoundDrawer from "../editor/SoundDrawer.jsx";
import ShotList from "../editor/ShotList.jsx";
import AssetsPanel, { placedSay, putOnTimeline, useAssets } from "../editor/AssetsPanel.jsx";
import Versions from "../editor/Versions.jsx";
import FilmCard from "../editor/FilmCard.jsx";
import { useT } from "../i18n.jsx";
import { useThemeId } from "../theme.jsx";
import Pipeline, { OPENS, currentStage } from "../workflow/Pipeline.jsx";
import { SHEET_TITLES, Sheet, StageCtx } from "../workflow/stage.jsx";
import MixSheet from "../workflow/MixSheet.jsx";
import { NotesLayer, nextPinNo, pinTag } from "../editor/FilmNotes.jsx";
import { AnalysisSheet, BriefSheet, DocSheet, ImportSheet, QcReviewSheet } from "../workflow/sheets.jsx";
import RenderSheet from "../workflow/RenderSheet.jsx";
import LyricsSheet from "../workflow/LyricsSheet.jsx";
import MusicMapSheet from "../workflow/MusicMapSheet.jsx";
import CharacterSheet from "../workflow/CharacterSheet.jsx";          // Brush cartoon's character step
import { useClaude } from "../workflow/claude.jsx";
import Storyboard from "./Storyboard.jsx";
import MotionPlan from "./MotionPlan.jsx";
import Voice from "./Voice.jsx";
import Qa from "./Qa.jsx";
import PortAE from "./PortAE.jsx";
import "../workflow.css";

// the columns' first proportions, as the user drew them (shots and pipeline ~14 %, Claude ~19 % of the width);
// "editor4": widths saved before are not reused; a double-click on a splitter comes back to these
const PANES = { left: 0.14, right: 0.19 };
// The Studio: the station a sheet on the light table belongs to (lifted and lit on the rail); no sheet = Build and review, the film
const HERE = { brief: "prepare", character: "prepare", voice: "prepare", assets: "prepare", analysis: "prepare", doc: "prepare", storyboard: "storyboard",
  "motion-plan": "motion", "qc-review": "build", qa: "build", lyrics: "build", "music-map": "build", mix: "finalMix" };
// While the Storyboard waits for the voice-over or the lyrics (pipeline.voiceWait), their sheet is the Storyboard's, station 02
// The Studio: the pencilled line beside a sheet's title, as the concept writes it
const STUDIO_HINTS = { brief: "Prepare: the brief, the files read, the design", character: "Prepare: who acts in this film",
  storyboard: "Claude makes one storyboard from the brief; you approve it or ask for another before anything is built",
  "motion-plan": "how each shot moves: what comes in, how it moves and how strongly", ae: "an After Effects project of this film", render: "the film as a file",
  "qc-review": "Claude looks at stills of the film like a strict director: seven scores, fixes, until every score is 8 or more", qa: "last of this stage, quiet" };

/** The pipeline, read again every 3 s while something runs (Claude, a render anywhere), else every 8 s. */
function usePipeline(id) {
  const [data, setData] = useState(null);
  const [n, setN] = useState(0);
  const reload = useCallback(() => setN((x) => x + 1), []);
  // A reload never throws away the answer on its way (after Approve several come at once, each 1-3 s): the newest answer
  // that has come back is shown, so the rows turn as soon as the server has turned; another project's answers are dropped
  const seq = useRef({ id, asked: 0, shown: 0 });
  useEffect(() => {
    const s = seq.current;
    if (s.id !== id) { s.id = id; s.shown = s.asked; }
    const k = ++s.asked;
    get(`/api/projects/${id}/pipeline`).then((d) => { if (s.id === id && k > s.shown) { s.shown = k; setData(d); } }).catch(() => {});
  }, [id, n]);
  const busy = data?.claudeBusy || data?.autopilot?.running || data?.appBusy || data?.render?.running || data?.stages?.some((s) => s.status === "running");
  // The next read is set at each ask too, so an answer that fails or comes late never ends the reading (the rows stood still)
  useEffect(() => { const h = setTimeout(reload, busy ? 3000 : 8000); return () => clearTimeout(h); }, [data, busy, reload, n]);
  return [data, reload];
}

/** This project's render, while one runs or waits: { progress, waitingFor } from its export job (one render at a time). */
function useMyRender(id, render) {
  const [job, setJob] = useState(null);
  const watch = !!(render?.running || render?.queued);
  useEffect(() => {
    if (!watch) { setJob(null); return; }
    let alive = true;
    const tick = () => get(`/api/projects/${id}/exports`).then((r) => { if (!alive) return; const j = r.jobs?.find((x) => x.status === "running"); setJob(j ?? null); }).catch(() => {});
    tick();
    const h = setInterval(tick, 2500);
    return () => { alive = false; clearInterval(h); };
  }, [id, watch]);
  return job;
}

/** What Claude is told about a picked element (the same lines HF Studio's selection gave it). */
function contextOf(x) {
  const css = ["font-family", "font-size", "font-weight", "color", "background-color", "opacity", "transform", "left", "top", "width", "height"]
    .filter((k) => x.computedStyles?.[k]).map((k) => `${k}: ${x.computedStyles[k]}`);
  const target = x.hfId && !x.scriptMade ? `[data-hf-id="${x.hfId}"]` : x.id ? `#${x.id}` : `${x.label}${x.hfId ? ` (inside [data-hf-id="${x.hfId}"], made by a script)` : ""}`;
  const b = x.boundingBox;
  return [`File: ${x.file}`, `Element: <${x.tagName}> ${target}${x.label ? ` ("${x.label}")` : ""}`, `Playhead: ${Number(x.currentTime ?? 0).toFixed(2)} s`,
    x.textContent ? `Text: ${x.textContent}` : null, b ? `Box: x ${Math.round(b.x)}, y ${Math.round(b.y)}, ${Math.round(b.width)} × ${Math.round(b.height)} px` : null,
    css.length ? `Styles: ${css.join("; ")}` : null].filter(Boolean).join("\n");
}

/** The shot under the playhead: the last one started, within a frame (a seek to a shot can land on the frame before its start). */
export const shotAtTime = (shots, time, fps = 30) => [...(shots ?? [])].reverse().find((s) => s.start != null && time >= s.start - 1 / (fps || 30) - 1e-3) ?? null;
/** What the chat aims at while the film has moved on: a shot chosen before is the shot on screen now, an element only while its scene is. */
export const movedTarget = (here, shot) => (shot && here && here.number !== shot.number ? here : shot);
export const pickStale = (picked, here, shots) => !!picked?.length && !!here && shots?.some((s) => s.src === picked[0].file) && here.src !== picked[0].file;

/** How The Studio lays a film out by its width / height: "tall" (9:16, 2:3), "square" (1:1, 4:5, 4:3), or undefined for a wide one. */
export const filmShape = (ar) => (ar < 0.8 ? "tall" : ar < 1.5 ? "square" : undefined);

/** The film's design as chosen at New project, in short: the Brand Kit; a design left to the brief is not named. */
export function designParts(m, t) {
  const look = typeof m.look === "string" ? m.look : m.look?.title ?? null;
  return [look ? t("Brand Kit {name}", { name: look }) : null];
}

/** The project's strip above the columns (no Back: the rail's Projects is the way back: name, one quiet line (style · look · format · length), what runs, Versions, Render. */
// a document's sheet is named for what it is, never by its file
const DOC_NAMES = [[/(^|\/)(design|frame)\.md$/i, "Design"], [/(^|\/)STORYBOARD\.md$/i, "Storyboard"], [/(^|\/)MOTION-PLAN\.json$/i, "Motion Plan"],
  [/(^|\/)BRIEF\.md$/i, "Brief"], [/(^|\/)SCRIPT\.md$/i, "Script"], [/(^|\/)NOTES\.md$/i, "Notes"], [/(^|\/)QC-REVIEW\.(md|json)$/i, "Review"], [/(^|\/)CREDITS\.md$/i, "Credits"],
  [/(^|\/)ASSETS\.md$/i, "Assets"], [/(^|\/)CHARACTERS\.json$/i, "Characters"]];
function docTitle(path, t) {
  const first = String(path ?? "").split(",")[0].replace(/\\/g, "/");
  const known = DOC_NAMES.find(([re]) => re.test(first));
  if (known) return t(known[1]);
  const stem = first.split("/").pop().replace(/\.[a-z0-9]+$/i, "").replace(/[-_]+/g, " ").toLowerCase();
  return stem ? stem[0].toUpperCase() + stem.slice(1) : t("Document");
}

function ProjectStrip({ p, id, pipeline, myRender, busy, rendering, onSheet, onRenamed, onRestored }) {
  const t = useT();
  const toast = useToast();
  const studio = useThemeId() === "studio";
  const m = p?.meta ?? {};
  const [title, setTitle] = useState(p?.title ?? "");
  useEffect(() => setTitle(p?.title ?? ""), [p?.title]);
  const rename = async () => {
    const v = title.trim();
    if (!v || v === p?.title) { setTitle(p?.title ?? ""); return; }
    try { await patch(`/api/projects/${id}`, { title: v }); onRenamed(); toast(t("Renamed")); } catch (e) { toast(e.message, "error"); setTitle(p?.title ?? ""); }
  };
  const other = pipeline?.render?.running && pipeline.render.running.projectId !== id ? pipeline.render.running : null;
  const waiting = myRender?.stage === "waiting";
  const pct = typeof myRender?.progress === "number" ? Math.round(myRender.progress <= 1 ? myRender.progress * 100 : myRender.progress) : null;
  // The film's own length: built, its root's; not built, its storyboard's when Claude timed it otherwise (47.5 s of a film set to 40 s), else the one the user set (T30-10)
  const len = (p?.built === false ? p?.plannedDuration : p?.duration) || m.targetDurationSec;
  const meta = [m.style?.title ? t(m.style.title) : null, ...designParts(m, t), m.format?.aspect ?? null, len ? clock(len) : null,
    m.format?.fps ? `${m.format.fps} fps` : null].filter(Boolean).join(" · ");
  const state = rendering ? t("Rendering this film: changes wait") : waiting ? t("Waiting to render: {title} renders first", { title: myRender.waitingFor ?? other?.title ?? "" })
    : other ? t("Rendering now: {title}", { title: other.title }) : busy ? (pipeline?.appBusy && !pipeline?.claudeBusy && !pipeline?.autopilot?.running ? t(pipeline.appBusy.key, pipeline.appBusy.vars)
      : t("Claude is working")) : "";
  const titleBox = (cls) => <input className={cls} value={title} onChange={(e) => setTitle(e.target.value)} onBlur={rename} onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); if (e.key === "Escape") { setTitle(p?.title ?? ""); e.currentTarget.blur(); } }}
    aria-label={t("Film name")} title={t("Click to rename")} size={Math.max(8, Math.min(48, title.length + 1))} />;
  const ae = <button className="btn sm ed-ae" onClick={() => onSheet("ae")} disabled={busy} title={busy ? t("Claude is changing the film: export when it finishes") : t("Export an After Effects project of this film")}>
    <span className="ae-tile" aria-hidden="true">Ae</span>{t("AE Export")}</button>;
  const render = rendering || waiting ? <button className="btn sm ed-render" onClick={() => onSheet("render", {})}>{rendering ? <><Loader2 size={13} className="spin" />{pct != null ? t("Rendering {n}%", { n: pct }) : t("Rendering…")}</> : t("Queued to render")}</button>
    : <button className="btn primary sm ed-render" onClick={() => onSheet("render", {})} disabled={busy}
      title={busy ? t("Claude is changing the film: render when it finishes") : other ? t("{title} is rendering: this one waits its turn", { title: other.title }) : t("Render the film as MP4, MOV or WebM")}><Film size={14} />{t("Render")}</button>;
  // back to the films, left of the name (owner 30/10: one click back to Projects from any film)
  const back = <button type="button" className="btn ghost icon sm ed-back" onClick={() => go("/projects")} aria-label={t("Back to Projects")} title={t("Back to Projects")}><ArrowLeft size={16} /></button>;
  // The Studio's slate: the clapper, the name, the facts in one mono line, what runs or what the film waits for
  if (studio) {
    const ws = pipeline?.stages?.find((s) => s.status === "waiting" && s.id !== "feedback");
    const wline = ws?.line ? t(ws.line, Object.fromEntries(Object.entries(ws.lineVars ?? {}).map(([k, v]) => [k, typeof v === "string" ? t(v) : v]))) : null;
    const wait = !state && wline ? (/^Waiting for you/.test(ws.line) ? wline : t("Waiting for you: {what}", { what: wline })) : null;
    return <div className="ed-strip st-slate">
      {back}
      <span className="st-clap" aria-hidden="true" />
      <div className="st-name">{titleBox("ed-title st-title")}{meta && <span className="ed-meta num">{meta}</span>}</div>
      <span className="ed-gap" />
      {(state || wait) && <span className={"ed-state st-state" + (rendering || waiting ? " on" : "") + (wait ? " wait" : busy || rendering ? " run" : "")} role="status">
        {(rendering || busy) ? <Loader2 size={12} className="spin" /> : <i aria-hidden="true" />}{state || wait}
        {wait && OPENS[ws.open] && <button type="button" className="clink" onClick={() => onSheet(OPENS[ws.open][0])}>{t(OPENS[ws.open][1])}</button>}</span>}
      <Versions projectId={id} locked={busy || rendering} onRestored={onRestored} />
      {ae}{render}
    </div>;
  }
  return <div className="ed-strip">
    {back}
    <input className="ed-title" value={title} onChange={(e) => setTitle(e.target.value)} onBlur={rename} onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); if (e.key === "Escape") { setTitle(p?.title ?? ""); e.currentTarget.blur(); } }}
      aria-label={t("Film name")} title={t("Click to rename")} size={Math.max(8, Math.min(48, title.length + 1))} />
    {meta && <span className="ed-meta num">{meta}</span>}
    <span className="ed-gap" />
    {state && <span className={"ed-state" + (rendering || waiting ? " on" : "")} role="status">{(rendering || busy) && <Loader2 size={12} className="spin" />}{state}</span>}
    <Versions projectId={id} locked={busy || rendering} onRestored={onRestored} />
    {/* the After Effects export is its own button beside Render, which makes a video file only */}
    <button className="btn sm ed-ae" onClick={() => onSheet("ae")} disabled={busy} title={busy ? t("Claude is changing the film: export when it finishes") : t("Export an After Effects project of this film")}>
      <span className="ae-tile" aria-hidden="true">Ae</span>{t("AE Export")}</button>
    {rendering || waiting ? <button className="btn sm ed-render" onClick={() => onSheet("render", {})}>{rendering ? <><Loader2 size={13} className="spin" />{pct != null ? t("Rendering {n}%", { n: pct }) : t("Rendering…")}</> : t("Queued to render")}</button>
      : <button className="btn primary sm ed-render" onClick={() => onSheet("render", {})} disabled={busy}
        title={busy ? t("Claude is changing the film: render when it finishes") : other ? t("{title} is rendering: this one waits its turn", { title: other.title }) : t("Render the film as MP4, MOV or WebM")}><Film size={14} />{t("Render")}</button>}
  </div>;
}

export default function Editor({ id, setCrumbs, open: openFromRoute = null }) {
  const t = useT();
  const toast = useToast();
  const claude = useClaude();
  const studio = useThemeId() === "studio";          // The Studio lays the Editor out as a light table: same data, same hooks
  const project = useData(() => get(`/api/projects/${id}`), [id]);
  const [pipeline, reloadPipeline] = usePipeline(id);
  const [prepared, setPrepared] = useState(false);
  const [tl, setTl] = useState(null);
  const [posters, setPosters] = useState(null);
  const [shot, setShot] = useState(null);
  const [range, setRange] = useState(null);
  const [drawer, setDrawer] = useState(null);          // the drawer in the timeline's place: "motions", "sounds" or none
  // a note pinned on the picture is a line in the chat's message ("[0:03.4 · Shot 2] …"), sent with the chat's own Send;
  // pins = the pinned places not sent yet; pinning = the next click on the picture places one
  const [pins, setPins] = useState([]);
  const [pinning, setPinning] = useState(false);
  const [sheet, setSheet] = useState(openFromRoute ? { kind: openFromRoute, opts: {} } : null);
  // a sheet is modal: what lies behind it takes no focus and no typing (words meant for the storyboard reached the film's
  // name box behind the dialog, and its blur renamed the film)
  // In The Studio the sheet lies on the light table beside the chat and the timeline, which stay in use: nothing is made inert
  useEffect(() => { document.querySelectorAll(".ed > .ed-strip, .ed > .ed-body, .ed > .ed-narrow").forEach((el) => { el.inert = !!sheet && !studio; }); }, [sheet, studio]);
  // The Studio's onion skin (only the change between two sheets): the sheet that lay on the table lifts away as a
  // faint blue copy in half a second. The copy is a still of its markup: no film, no video, no ids.
  const tableRef = useRef(null);
  const [ghost, setGhost] = useState(null);
  const lifted = useRef({ studio, kind: sheet?.kind ?? null });
  lifted.current.studio = studio;
  const lift = (next) => {
    const was = lifted.current.kind;
    lifted.current.kind = next;
    if (!lifted.current.studio || was === next || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const el = tableRef.current?.querySelector(":scope > .lt-sheet") ?? tableRef.current?.querySelector(":scope > .lt-film");
    if (!el) return;
    const c = el.cloneNode(true);
    c.querySelectorAll("iframe, video, audio, canvas").forEach((x) => x.replaceWith(document.createElement("div")));
    [c, ...c.querySelectorAll("[id]")].forEach((x) => x.removeAttribute("id"));
    setGhost({ html: c.outerHTML, n: Date.now() });
  };
  useEffect(() => { if (!ghost) return undefined; const h = setTimeout(() => setGhost(null), 700); return () => clearTimeout(h); }, [ghost]);
  const putSheet = (x) => { lift(x?.kind ?? null); setSheet(x); };
  // a station, a card or the slate lays another sheet on the table: one with unsaved edits asks first (the Desk's sheet is modal: it cannot)
  const sheetHandle = useRef(null);
  const sheetRef = useRef(sheet);
  sheetRef.current = sheet;
  const switchSheet = (x) => { if (studio && sheetRef.current && sheetHandle.current?.dirty()) sheetHandle.current.ask(() => putSheet(x)); else putSheet(x); };
  const [inject, setInject] = useState(null);
  const [motionPick, setMotionPick] = useState(null);
  const [chatKey, setChatKey] = useState(0);
  const [narrowTab, setNarrowTab] = useState("film");
  const [leftTab, setLeftTab] = usePref("editor:left-tab", "shots");
  const [dismissed, setDismissed] = useState(null);
  const [tlH, setTlH] = usePref("editor:tl-h", 0);          // the timeline's height in px, dragged by the user; 0 = the default share
  const centerRef = useRef(null);
  const [tlDrag, setTlDrag] = useState(false);
  useEffect(() => {
    if (!tlDrag) return;
    const move = (e) => { const r = centerRef.current?.getBoundingClientRect(); if (r) setTlH(Math.round(Math.min(r.height - 200, Math.max(120, r.bottom - e.clientY)))); };
    const up = () => setTlDrag(false);
    addEventListener("pointermove", move); addEventListener("pointerup", up);
    return () => { removeEventListener("pointermove", move); removeEventListener("pointerup", up); };
  }, [tlDrag]); // eslint-disable-line react-hooks/exhaustive-deps
  const [asking, setAsking] = useState(null);          // a question Claude waits on: shown over an open sheet too
  const [version, setVersion] = useState(0);          // bumps when the files change (the shot list reads its words again)
  const kicked = useRef(false);
  const pv = usePreview(id);
  const [assets, reloadAssets] = useAssets(id);
  const p = project.data;
  useEffect(() => { setCrumbs(null); }, [p]); // eslint-disable-line react-hooks/exhaustive-deps // no "/ Projects / name" above the strip
  useEffect(() => { if (openFromRoute) putSheet({ kind: openFromRoute, opts: {} }); }, [openFromRoute]); // eslint-disable-line react-hooks/exhaustive-deps
  const [w, setW] = useState(innerWidth);
  useEffect(() => { const f = () => setW(innerWidth); addEventListener("resize", f); return () => removeEventListener("resize", f); }, []);
  const busy = !!(pipeline?.claudeBusy || pipeline?.autopilot?.running || pipeline?.appBusy);          // the app's own work too
  const rendering = pipeline?.render?.running?.projectId === id;
  const myRender = useMyRender(id, pipeline?.render);
  const locked = busy || rendering;          // hand edits wait while Claude changes the film or the film renders

  // HF's element ids are pinned into the files as the film opens (the picker and the hand edits address elements by them). The film
  // waits for that a few seconds at most (T26-3: on a busy server it took minutes, and the page said "Opening the project…" all that
  // time): then it plays, and it is loaded once more if the ids changed its files
  const [prepareSlow, setPrepareSlow] = useState(false);
  const [filmKey, setFilmKey] = useState(0);
  useEffect(() => {
    let alive = true, shown = false;
    setPrepared(false); setPrepareSlow(false);
    const slow = setTimeout(() => { shown = true; if (alive) setPrepareSlow(true); }, 3000);
    // the ids just pinned are what the Captions row addresses its groups by: the timeline is read again
    post(`/api/projects/${id}/edit/prepare`).then((r) => { if (alive && r?.changed) loadTimeline(); if (alive && shown && r?.changed) setFilmKey((k) => k + 1); }).catch(() => {})
      .finally(() => { clearTimeout(slow); if (alive) setPrepared(true); });
    return () => { alive = false; clearTimeout(slow); };
  }, [id]);
  const filmShown = prepared || prepareSlow;
  const loadTimeline = useCallback(() => get(`/api/projects/${id}/timeline`).then(setTl).catch(() => {}), [id]);
  useEffect(() => { loadTimeline(); }, [loadTimeline]);
  // shot pictures: HF stills of each shot, made again after a change (only when Claude is not working)
  const loadPosters = useCallback(async () => {
    try {
      const r = await get(`/api/projects/${id}/posters`);
      setPosters(r.posters ?? []);
      if (r.status === "missing" && !locked) await post(`/api/projects/${id}/posters`);
      if (r.status === "missing" || r.status === "running") setTimeout(() => get(`/api/projects/${id}/posters`).then((x) => x.status === "ready" && setPosters(x.posters)).catch(() => {}), 8000);
    } catch { /* no pictures yet */ }
  }, [id, locked]);
  useEffect(() => { loadPosters(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps
  // the storyboard approved: its stills are the shots' pictures until the Build (they waited for a reload of the page)
  const sbOption = p ? p.meta?.approvals?.storyboard?.option ?? "" : null, lastSb = useRef(null);
  useEffect(() => {
    if (sbOption == null) return;
    if (lastSb.current != null && sbOption && sbOption !== lastSb.current) loadPosters();
    lastSb.current = sbOption;
  }, [sbOption]); // eslint-disable-line react-hooks/exhaustive-deps
  // a title appears once per screen: before the Build the one starter shot is named after the film, which the page head says
  const shots = useMemo(() => tl?.shots?.map((s) => (p?.built === false && s.title?.trim() === p?.title?.trim() ? { ...s, title: "" } : s)) ?? null, [tl, p?.built, p?.title]);
  useEffect(() => { if (!shot || !shots) return; const s = shots.find((x) => x.number === shot.number); setShot(s ?? null); }, [shots]); // eslint-disable-line react-hooks/exhaustive-deps
  // Opening a film: the Editor waits under one short card ("The project is loading. Please wait.") until the film's facts, its steps,
  // its shots and the picture (HF's runtime, the pictures, video and fonts it loads, its scene transitions prepared) are in (owner 30/10:
  // half a page answered clicks while they came in, and The Studio showed HF's own loading card); the strip above, the way back, stays usable. Once open, the picture loaded again after a change waits under the
  // player's own cover only. A film still opening after 30 s can be opened as it is.
  const [opened, setOpened] = useState(false), [openSlow, setOpenSlow] = useState(false);
  useEffect(() => { setOpened(false); setOpenSlow(false); }, [id]);
  const pictureIn = p?.built === false || !!pv.state.error || pv.videoOnly || (pv.state.ready && pv.state.assets && !pv.state.transitions);
  const opening = !opened && !project.error && !p?.missing && !(p && pipeline != null && shots != null && filmShown && pictureIn);
  useEffect(() => { if (!opening && !opened && p) setOpened(true); }, [opening, opened, p]);
  useEffect(() => { if (!opening) return undefined; const h = setTimeout(() => setOpenSlow(true), 30000); return () => clearTimeout(h); }, [opening]);

  // the picked element(s) -> Claude's Selection target, and their shot
  const picked = pv.picked;
  const here = p?.built === false ? null : shotAtTime(shots, pv.state.time, pv.state.fps), hereNo = here?.number ?? null, hereSrc = here?.src ?? null;
  const selection = useMemo(() => {
    if (!picked.length) return null;
    const key = picked.map((x) => `${x.file}#${x.hfId ?? x.label}`).join("|");
    if (key === dismissed) return null;
    // what the chat shows says what it is in words, never its tag, class or id; Claude gets those in the context
    const named = (x) => (x.textContent ? `${t(friendlyLabel(x))} “${x.textContent.slice(0, 24)}”` : t(friendlyLabel(x)));
    return { key, label: picked.length === 1 ? named(picked[0]) : t("{n} elements", { n: picked.length }),
      sourceFile: picked[0].file, context: picked.map(contextOf).join("\n\n") };
  }, [picked, dismissed, t]);
  // a scene mounted twice (a finale that gathers every step): the mount on screen, not the first
  useEffect(() => { if (picked.length && shots) { const s = here?.src === picked[0].file ? here : shots.find((x) => x.src === picked[0].file); if (s) setShot(s); } }, [picked]); // eslint-disable-line react-hooks/exhaustive-deps
  // the film moved to another shot: an element of the shot left behind is no longer what the chat aims at (T28-18: Send went to shot 1 from shot
  // 23); a chosen shot becomes the one on screen once the film rests (the chat says it at once, `chatShot`; while it plays the Shots column stays,
  // so a word being edited there is not taken away)
  useEffect(() => {
    if (pickStale(picked, here, shots)) { pv.send("clear"); pv.setPicked([]); }
  }, [hereNo, hereSrc]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (pv.state.paused && shot && here && here.number !== shot.number) setShot(here); }, [hereNo, pv.state.paused]); // eslint-disable-line react-hooks/exhaustive-deps
  const chatShot = movedTarget(here, shot);

  const refreshAll = () => { project.reload(); reloadPipeline(); loadTimeline(); reloadAssets(); };
  // a sound on the timeline moved, moved to another lane, or taken off: the film is loaded again where it was
  // resolves once the film's own list is read again: the timeline holds a dropped sound where it was dropped until then
  const audioEdit = async (path, c, to) => {
    const name = soundName(c);
    try {
      await post(`/api/projects/${id}/edit/audio${path}`, { hfId: c.hfId, id: c.id, src: c.src, at: c.start, name, ...to });
      toast(path ? t("Taken off the timeline: {name} (it stays in Assets)", { name }) : t("Moved: {name}", { name }));
      await filesChanged(true);
    } catch (e) { toast(e.message, "error"); await loadTimeline(); }
  };
  // a caption's words changed on the timeline: the same hand edit as the Shots panel's words
  const captionSave = async (file, hfId, text) => {
    try { const r = await post(`/api/projects/${id}/edit/text`, { file, hfId, text }); toast(t("Words saved")); filesChanged(!!r.reload); }
    catch (e) { toast(e.message, "error"); loadTimeline(); }
  };
  // a sound dragged from the Assets tab onto a lane: there, at the drop's time, then read again as "Put on the timeline" does
  const soundDrop = async (path, to) => {
    const name = assets?.find((x) => x.path === path)?.name ?? path.split("/").pop();
    try { const r = await putOnTimeline(id, path, to); toast(placedSay(t, name, r.at)); reloadAssets(); loadTimeline(); pv.send("reload"); }
    catch (e) { toast(e.message, "error"); }
  };
  const filesChanged = (structure = false) => {
    const read = loadTimeline();
    reloadPipeline(); setVersion((v) => v + 1);
    if (structure) pv.send("reload");
    pv.proxy?.refresh?.();          // the smooth preview says at once whether it is still the film's (a Reset brings it back)
    setTimeout(loadPosters, 1500);
    return read;
  };
  // the film, its shots and the timeline are read at once; the ids pinned after (minutes on a busy server, T26-3) load the film once
  // more only when they changed its files
  const reloadFilm = async () => {
    pv.send("reload"); refreshAll(); setVersion((v) => v + 1); setTimeout(loadPosters, 1500);
    const r = await post(`/api/projects/${id}/edit/prepare`).catch(() => null);
    if (r?.changed) { pv.send("reload"); loadTimeline(); }
  };
  const appWork = pipeline?.appBusy?.jobId ?? pipeline?.appBusy?.key ?? null;
  const lastAppWork = useRef(null);
  useEffect(() => {          // the SFX lane stayed empty until a reload: read the timeline and the film again when the app's work ends
    if (lastAppWork.current && !appWork) { project.reload(); loadTimeline(); reloadAssets(); pv.send("reload"); setTimeout(loadPosters, 1500); }
    lastAppWork.current = appWork;
  }, [appWork]); // eslint-disable-line react-hooks/exhaustive-deps
  // the sound effects placed again (the Final Mix's Place, or by the app after Claude changed the storyboard's cues): the SFX lane and the
  // Final Mix read them again (the dialog showed 26 after only 6 were left: it read them once, 4 s after Place, while the app still searched)
  const sfxAt = pipeline?.sfx?.at ?? null;
  const lastSfx = useRef(sfxAt);
  useEffect(() => {          // the film plays the new sounds too (not on the first read of the pipeline)
    if (lastSfx.current !== sfxAt) { const was = lastSfx.current; lastSfx.current = sfxAt; loadTimeline(); if (was) pv.send("reload"); }
  }, [sfxAt]); // eslint-disable-line react-hooks/exhaustive-deps
  // The Build done (the first time, or again): the film, its shots and the timeline are read again from the pipeline the Editor reads
  // anyway, not only when the chat sees its task end (T26-3: the chat's reads failed on a busy server, and the player said "Not built
  // yet" and the shots "Not built" while the Review already ran, until a reload)
  const buildDone = pipeline ? !!pipeline.steps?.some((x) => x.id === "build" && x.status === "done") : null;
  const lastBuild = useRef(null);
  useEffect(() => {
    if (buildDone == null) return;
    const was = lastBuild.current; lastBuild.current = buildDone;
    if (was === false && buildDone) reloadFilm();
  }, [buildDone]); // eslint-disable-line react-hooks/exhaustive-deps
  // the film read just before its Build ended (the page opened as it finished): read once more
  const builtStale = buildDone === true && p?.built === false;
  useEffect(() => { if (builtStale) { project.reload(); loadTimeline(); } }, [builtStale]); // eslint-disable-line react-hooks/exhaustive-deps
  // The voice-over's words saved (by the app, or by the user in the Voice screen) put them on the timeline at
  // once, however the Editor heard of it (the transcription can end between two pipeline reads)
  const voiceStamp = `${p?.meta?.voice?.file ?? ""}|${p?.meta?.voice?.transcript?.status ?? ""}|${p?.meta?.voice?.transcript?.savedAt ?? ""}`;
  const lastVoice = useRef(voiceStamp);
  useEffect(() => {
    if (lastVoice.current !== voiceStamp) { lastVoice.current = voiceStamp; loadTimeline(); }
  }, [voiceStamp]); // eslint-disable-line react-hooks/exhaustive-deps
  const onClaudeChanged = async (changed) => { reloadPipeline(); reloadAssets(); if (changed) await reloadFilm(); };
  const stage = useMemo(() => ({
    projectId: id,
    open: (kind, opts = {}) => putSheet({ kind, opts }),
    play: (path) => setViewer(path),          // a rendered file plays in the app, over the Editor
    close: () => { putSheet(null); refreshAll(); pv.send("reload"); },
    askClaude: (text, { send = false } = {}) => { putSheet(null); setNarrowTab("claude"); setInject({ text, send, n: Date.now() }); },
  }), [id, pv.send]); // eslint-disable-line react-hooks/exhaustive-deps
  const openSheet = (kind, opts = {}) => switchSheet({ kind, opts });

  // the kickoff: once the film is open and Claude is signed in, the first step starts with the brief; the app runs the rest
  const [starting, setStarting] = useState(false);
  useEffect(() => { if (starting && busy) setStarting(false); }, [starting, busy]);
  useEffect(() => {
    if (kicked.current || !pipeline?.kickoff?.pending || !pv.state.ready || !p || !claude?.connected) return;
    const s = pipeline.steps.find((x) => x.id === pipeline.firstStep);
    if (!s) return;
    kicked.current = true;
    setStarting(true);
    post(`/api/projects/${id}/pipeline/${s.id}/run`, { kickoff: true })
      .then(() => { setNarrowTab("claude"); setChatKey((k) => k + 1); reloadPipeline(); })
      .catch((e) => { kicked.current = false; setStarting(false); if (e.code === "CLAUDE_SIGNED_OUT") claude?.refresh(true); toast(e.message, "error"); });
  }, [pipeline, pv.state.ready, p, claude?.connected]); // eslint-disable-line react-hooks/exhaustive-deps

  // A film with a voice-over waits for it, and its words, before the Storyboard (`voiceWait`): the Voice dialog (the
  // Lyrics one for a song) opens by itself once for each kind of wait, when no other dialog is open; the Storyboard row opens it again
  const voiceWait = pipeline?.voiceWait ?? null;
  const waitOpened = useRef(new Set());
  useEffect(() => {
    const kind = ["make", "check", "failed", "ttsFailed"].includes(voiceWait) ? "voice" : voiceWait === "lyrics" ? "lyrics" : null;
    const key = `mw-voice-wait:${id}:${voiceWait}`;
    if (!kind || sheet || waitOpened.current.has(key)) return;
    waitOpened.current.add(key);
    try { if (localStorage.getItem(key)) return; localStorage.setItem(key, "1"); } catch { /* opened once in this window */ }
    openSheet(kind);
  }, [voiceWait, id, sheet]); // eslint-disable-line react-hooks/exhaustive-deps

  // leaving the Editor (a rail item, any link of the app) while Claude builds or the film renders asks first; it is a notice only: the
  // work goes on. Links are caught before they navigate, so the Editor and its state stay as they are on "Stay".
  const [leaveTo, setLeaveTo] = useState(null);
  const [viewer, setViewer] = useState(null);
  const working = useRef(false);
  working.current = !!(busy || rendering);
  useEffect(() => {
    const click = (e) => {
      const a = e.target.closest?.('a[href^="#/"]');
      if (!a || !working.current || e.defaultPrevented || e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey) return;
      const to = a.getAttribute("href").slice(1);
      if (to.startsWith(`/projects/${id}`)) return;
      e.preventDefault(); e.stopPropagation();
      setLeaveTo(to);
    };
    document.addEventListener("click", click, true);
    return () => document.removeEventListener("click", click, true);
  }, [id]);

  // a sound picked in the drawer: at the playhead, in the film's assets and on the timeline at once; the film reads it again where it was
  const addSound = async (row, at) => {
    const r = await post(`/api/projects/${id}/sfx/add`, { id: row.id, at });
    toast(placedSay(t, row.title, r.at));
    reloadAssets();
    filesChanged(true);
  };
  const pickMotion = async (card) => {
    try { const full = await get(`/api/library/item?uid=${encodeURIComponent(card.uid)}`); setMotionPick({ item: full, n: Date.now() }); setNarrowTab("claude"); }
    catch (e) { toast(e.message, "error"); }
  };

  // the Assets tab reads the folder again every 6 s while it is open (above the early returns: hooks keep their order)
  useEffect(() => {
    if (leftTab !== "assets") return undefined;
    const tick = () => { if (document.visibilityState === "visible") reloadAssets(); };
    const h = setInterval(tick, 6000); addEventListener("focus", tick);
    return () => { clearInterval(h); removeEventListener("focus", tick); };
  }, [leftTab]); // eslint-disable-line react-hooks/exhaustive-deps
  // in The Studio a wide film fills the light table. The table is as wide as the picture needs at the table's height
  // (measured with the timeline unfolded, so laying a sheet on the table moves nothing); what is left goes mostly to the conversation and a
  // little to the shots. A tall or square film keeps the columns as they are and sits in the middle.
  const [fit, setFit] = useState(null);          // { side, chat } in px, or null: the CSS widths
  const aspectStr = p?.meta?.format?.aspect ?? "16:9";
  useEffect(() => {
    const body = centerRef.current;
    const [fw, fh] = String(aspectStr).split(":").map(Number);
    const ar = fw && fh ? fw / fh : 16 / 9;
    if (!studio || w < 900 || !body || ar < 1.5) { setFit(null); return undefined; }
    const measure = () => {
      const lt = body.querySelector(":scope > .lt"), stage = lt?.querySelector(".lt-film .pv-stage");
      // a minimised window (hidden, or measured at no size while it shrinks or comes back) gave a negative table and a conversation wider
      // than the window, kept when the window came back (owner 30/10: the film ran off the right edge, the chat gone): measure only a
      // window on screen; it is measured again when it shows
      if (!lt || !stage || document.hidden || body.clientWidth < 600 || body.clientHeight < 200) return;
      const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16, vw = innerWidth / 100, vh = innerHeight / 100;
      const clamp = (lo, v, hi) => Math.min(hi, Math.max(lo, v));
      const tl = tlH || clamp(11 * rem, 24 * vh, 15 * rem);          // studio-editor.css --ed-tl-def
      const L = lt.getBoundingClientRect(), S = stage.getBoundingClientRect();
      const stageH = body.clientHeight - 6 - tl - (L.height - S.height);          // 6: the splitter row; the rest: the table's paper and the player bar
      const tableW = Math.ceil(stageH * ar + (L.width - S.width));
      const side0 = clamp(16 * rem, 18 * vw, 20 * rem), chat0 = clamp(18 * rem, 21 * vw, 22 * rem);          // studio-editor.css --st-side, --st-chat
      const extra = body.clientWidth - tableW - side0 - chat0;
      if (!(tableW > 0) || extra <= 0) { setFit(null); return; }
      const side = Math.round(Math.min(side0 + extra * 0.25, 26 * rem)), chat = Math.floor(body.clientWidth - tableW - side);
      if (!(chat >= chat0) || side + chat >= body.clientWidth) { setFit(null); return; }          // never wider than the window
      setFit((f) => (f && f.side === side && f.chat === chat ? f : { side, chat }));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(body);
    const shown = () => { if (!document.hidden) requestAnimationFrame(measure); };
    document.addEventListener("visibilitychange", shown);
    addEventListener("resize", shown);
    return () => { ro.disconnect(); document.removeEventListener("visibilitychange", shown); removeEventListener("resize", shown); };
  }, [studio, w, tlH, aspectStr, filmShown]); // eslint-disable-line react-hooks/exhaustive-deps
  if (project.error) return <div className="page"><Banner kind="error">{project.error.message}</Banner></div>;
  if (p?.missing) return <div className="page"><Banner kind="warning">{t("The project folder was not found. Locate it in Projects.")}</Banner></div>;

  const fileUrl = pv.info?.url ? (path) => pv.info.url.replace(/__preview$/, path.split("/").map(encodeURIComponent).join("/")) : null;
  const missing = assets?.filter((a) => a.status === "missing").length ?? 0;
  const fresh = assets?.filter((a) => a.status === "new").length ?? 0;
  // The tech checks' warnings for the Pipeline's Tech checks row (the server's count once it gives one; the timeline's dots until then)
  const qcWarnings = pipeline?.checks?.warnings ?? tl?.qc?.filter((q) => !q.blocking).length ?? 0;
  const shotTarget = shot ? t("Shot {n}", { n: shot.number }) + (shot.title ? ` · ${shot.title}` : "") : null;
  // the dialogs the user opens most, in one place above the chat input: Storyboard and Motion once their stage has
  // started, the Final Mix once the film is built, Checks when the build failed; lit when the stage waits for the user
  const st = Object.fromEntries((pipeline?.stages ?? []).map((x) => [x.id, x]));
  const off = !!(pipeline?.autopilot?.running || pipeline?.claudeBusy);
  // every stage the film has gets its button; one not reached yet is shown, off, with what it waits for
  const act = (key, label, icon, kind, s, gate = true, after = null) => {
    const notYet = !!after && (!s || s.status === "todo");
    return { key, label: t(label), icon, onClick: () => openSheet(kind), att: s?.status === "waiting" || s?.status === "redo",
      off: notYet || (gate && off && s?.status !== "waiting"), title: notYet ? t("Opens once {step} is done", { step: t(after) }) : gate && off ? t("Press Stop in the chat to change this") : undefined };
  };
  const chr = pipeline?.steps?.find((x) => x.id === "character");          // a step inside the Storyboard stage, not a stage
  const actions = [
    // no Characters button here: the cast opens from the Prepare row's own link, so every film has these three
    st.storyboard && act("sb", "Storyboard", <LayoutList size={14} />, "storyboard", st.storyboard, false, "Prepare"),          // opens while Claude works, to look
    st.motion && act("mo", "Motion Plan", <Library size={14} />, "motion-plan", st.motion, true, "Storyboard"),
    // no Tech checks button: the checks run in the background; a real failure is one card in the chat, its Details open them
    st.finalMix && act("mix", "Final Mix", <Sliders size={14} />, "mix", st.build?.status === "done" ? { ...st.finalMix, status: st.finalMix.status === "todo" ? "ready" : st.finalMix.status } : st.finalMix, false, "Build and review"),
  ].filter(Boolean);
  const showAssets = () => { setLeftTab("assets"); setNarrowTab("left"); reloadAssets(); };
  // Until the Build the page is the 3 s starter: no white film, no 3 s timeline, shots "Not built"
  const unbuilt = p?.built === false;
  // before the Build a shot's picture is its approved storyboard still or none: a still of the starter's title card is no shot's
  // (T23-9: shot 1 was a white box until the Build)
  const shotPosters = unbuilt ? posters?.filter((x) => x.board) ?? null : posters;
  // a note pinned on the picture lands in the Notes tab with its words field ready (The Desk)
  const [aw, ah] = String(p?.meta?.format?.aspect ?? "16:9").split(":").map(Number);
  const placeNote = (place) => {
    const now = pv.state.time, fps = pv.state.fps || 24, at = Math.round(now * fps) / fps, sh = [...(shots ?? [])].reverse().find((s) => now >= (s.start ?? 0) - 1 / (pv.state.fps || 24))?.number ?? null;          // within a frame: a seek to a shot lands on the frame before its start
    const no = nextPinNo(pins), pin = { id: `p${Date.now()}-${no}`, no, t: at, fps, shot: sh, ...place }, tag = pinTag(pin);
    setPins((x) => [...x, { ...pin, tag }]); setPinning(false); setNarrowTab("claude");
    setInject({ text: tag, append: true, n: Date.now() });          // a line of its own in the message, the caret after it
  };
  // a pin removed on the picture takes its line out of the chat's message
  const removePin = (pid) => { const p = pins.find((x) => x.id === pid); setPins((x) => x.filter((y) => y.id !== pid)); if (p) setInject({ removeTag: p.tag ?? pinTag(p), n: Date.now() }); };
  // every style and both themes: what the edit card cannot change by hand is pinned as a note, in The Studio too
  const notesOn = !unbuilt;
  const playerEl = filmShown ? <Player key={filmKey} projectId={id} pv={pv} shots={shots ?? []} shot={shot} onShot={setShot} locked={locked} planned={unbuilt ? p.plannedDuration ?? 0 : null}
    range={range} onFilesChanged={(reload) => filesChanged(!!reload)} pinning={pinning} onPin={notesOn ? () => { pv.send("pause"); pv.send("clear"); pv.setPicked([]); setPinning((x) => !x); } : null}>
    {notesOn && <NotesLayer notes={pins} time={pv.state.time} pinning={pinning} aspect={aw && ah ? aw / ah : 16 / 9} onPlace={placeNote} onRemove={removePin} />}</Player>
    : <div className="pv"><div className="pv-stage"><div className="pv-wait"><Loader2 size={18} className="spin" />{t("Opening the project…")}</div></div></div>;
  const openingEl = opening ? <div className="ed-opening" role="status" aria-live="polite">
    <div className="dialog ed-opening-card"><Loader2 size={20} className="spin" /><b>{t("The project is loading. Please wait.")}</b>
      {openSlow && <><p className="hint">{t("This is taking longer than usual.")}</p>
        <button type="button" className="btn sm" onClick={() => setOpened(true)}>{t("Open it as it is")}</button></>}</div></div> : null;
  const hsplit = <div className={"ed-hsplit" + (tlDrag ? " dragging" : "")} role="separator" aria-orientation="horizontal" aria-label={t("Resize the timeline")} title={t("Drag to make the timeline taller or shorter · double-click: as before")}
    onPointerDown={(e) => { e.preventDefault(); setTlDrag(true); }} onDoubleClick={() => setTlH(0)} />;
  // Before the Build the starter's 3 s page is no timeline, but the voice-over made and transcribed is: its
  // words on NARRATION, the ruler as long as they run
  // Once the storyboard is approved its frames are the film's shots; before the build the SHOTS lane shows them where they
  // will play (planned, by the storyboard's lengths) beside the voice, as the Shots column lists them (the lane stayed empty until the build)
  const planned = unbuilt ? (shots ?? []).filter((s) => s.planned && s.title && s.start != null) : [];
  const voiceOnly = tl?.voice?.length || planned.length ? { voice: tl?.voice ?? [], shots: planned,
    duration: Math.max(0, ...(tl?.voice ?? []).map((v) => v.end), ...planned.map((s) => s.start + (s.duration ?? 0))) } : null;
  // the starter row says what the shots wait for: the storyboard being drawn, or the user's approval of it
  const sbStage = pipeline?.stages?.find((x) => x.id === "storyboard");
  const blankShot = sbStage?.status === "waiting" ? t("Waits for you to approve the storyboard") : sbStage?.status === "running" ? t("The storyboard is being drawn") : null;
  const timelineEl = <Timeline data={unbuilt ? voiceOnly : tl} posters={shotPosters} fps={p?.meta?.format?.fps || pv.state.fps || 30} time={unbuilt ? 0 : pv.state.time} duration={unbuilt ? p.plannedDuration ?? 0 : pv.state.duration} shot={shot} range={range} onRange={setRange}
    readOnly={pv.videoOnly}
    onSeek={(s) => pv.send("seek", { time: s })} onShot={(s) => { setShot(s); setDismissed(null); }}
    locked={locked || pv.videoOnly} onAudioMove={(c, to) => audioEdit("", c, to)} onAudioRemove={(c) => audioEdit("/remove", c, {})} onSoundDrop={soundDrop}
    onCaptionSave={captionSave} onCaptionLive={(hfId, text) => pv.send("live", { hfId, text })} />;
  // the playhead and the film's length as the timeline has them: "Put on the timeline" starts a sound there
  const tlTime = unbuilt ? 0 : pv.state.time, tlLength = Math.max((unbuilt ? p.plannedDuration : pv.state.duration) || 0, (unbuilt ? voiceOnly : tl)?.duration || 0);
  // why Add is off, in words, when it is
  const soundOff = unbuilt ? t("Sounds go on the film once it is built.") : rendering ? t("The film is rendering: add the sound when it finishes.") : locked ? t("The film is being changed: add the sound when that finishes.") : null;
  const drawerEl = drawer === "sounds"
    ? <SoundDrawer time={tlTime} duration={tlLength} clips={(tl?.audio ?? []).filter((c) => c.lane === "sfx")} off={soundOff} strip={!studio} onSeek={(s) => pv.send("seek", { time: s })} onAdd={addSound} onClose={() => setDrawer(null)} />
    : <MotionDrawer projectId={id} shot={shot} target={selection?.label ?? shotTarget} targetText={selection ? picked.map((x) => x.textContent ?? "").join(" ") : null} onPick={pickMotion} onClose={() => setDrawer(null)} />;
  // the button in the chat opens its drawer, or closes it; on a narrow window the drawer is in the Film tab
  const toggleDrawer = (kind) => { setDrawer((d) => (d === kind ? null : kind)); if (kind === "sounds") setNarrowTab("film"); };
  const centerPane = <div className="ed-center" ref={centerRef}>
    {playerEl}
    {hsplit}
    {drawer ? drawerEl : timelineEl}
  </div>;
  const leftPane = <div className="ed-left"><div className="ed-box ed-lib">
    <div className="ed-ltabs" role="tablist" aria-label={t("Shots and assets")}>
      <button role="tab" aria-selected={leftTab !== "assets"} onClick={() => setLeftTab("shots")}>{t("Shots")}<span className="ed-count num">{shots?.length ?? ""}</span></button>
      <button role="tab" aria-selected={leftTab === "assets"} onClick={showAssets}>{t("Assets")}
        {missing > 0 ? <span className="ed-count stop" title={t("{n} missing file(s)", { n: missing })}>{t("{n} missing", { n: missing })}</span>
          : fresh > 0 ? <span className="ed-count new">{t("{n} new", { n: fresh })}</span> : <span className="ed-count num">{assets?.length ?? ""}</span>}</button>      {/* Add files sits on the tabs' row, at its right edge; files copied into the folder in Explorer show up too */}
      <button className="btn sm ed-addfiles" onClick={() => openSheet("assets")} disabled={rendering}
        aria-label={t("Add files")} title={rendering ? t("Wait until the render finishes") : t("Add files: pictures, video, audio, fonts, logos, PDF")}><Plus size={14} /><span className="lbl">{t("Add files")}</span></button>
    </div>
    <section className="ed-tabbody" role="tabpanel">
      {leftTab === "assets" ? <AssetsPanel projectId={id} items={assets} reload={reloadAssets} fileUrl={fileUrl} locked={rendering} time={tlTime} length={tlLength}
        onTranscript={(path) => openSheet("voice", { path })} onTimelineChanged={() => { loadTimeline(); pv.send("reload"); }}
        onShot={(n) => { const s = shots?.find((x) => x.number === n); if (s) { setShot(s); pv.send("seek", { time: s.start }); setLeftTab("shots"); } }} />
        : <ShotList projectId={id} shots={unbuilt ? shots?.map((s) => ({ ...s, start: null })) : shots} blank={blankShot} posters={shotPosters} shot={shot} locked={locked} send={pv.send} version={version}
          onShot={(s) => { setShot(s); if (s) pv.send("seek", { time: s.start }); }} onChanged={(structure) => filesChanged(!!structure)} />}
    </section></div>
    <section className="ed-box ed-pipe">
      <Pipeline projectId={id} data={pipeline} starting={starting} onChanged={reloadPipeline} onOpen={openSheet} onAssets={showAssets} cast={p?.meta?.characters?.ids?.length > 0} music={!!p?.styleInfo?.music} warnings={qcWarnings} actions={actions} />
    </section>
  </div>;
  const rightPane = <ClaudePanel projectId={id} fps={pv.state.fps || 24} selectedShot={chatShot} selection={selection} onClearTarget={() => { setDismissed(selection?.key ?? null); pv.send("clear"); pv.setPicked([]); setShot(null); }}
    onChanged={onClaudeChanged} inject={inject} reloadKey={chatKey} motionPick={motionPick} onOpenMotions={() => toggleDrawer("motions")} motionsOpen={drawer === "motions"} onOpenSounds={() => toggleDrawer("sounds")} soundsOpen={drawer === "sounds"}
    steps={pipeline?.steps} rendering={rendering} actions={actions} onWaiting={setAsking} stage={currentStage(pipeline?.stages)} interrupted={pipeline?.interrupted ?? null} onPlay={(path) => setViewer(path)} onOpenSheet={openSheet} checks={pipeline?.checks ?? null}
    waiting={pipeline?.stages?.find((s) => s.status === "waiting" && s.id !== "feedback") ?? null}
    pins={notesOn ? pins : null} onPinsSent={(ids) => setPins((x) => x.filter((p) => !ids.includes(p.id)))} onSeek={(s) => pv.send("seek", { time: s })} />;          // the chat's reminder card
  const askBar = sheet && asking && <div className="ed-ask" role="alert"><Question q={asking.q} projectId={id} taskId={asking.taskId} toast={toast} t={t} /></div>;

  const sheetEl = sheet && <StageCtx.Provider value={stage}><ErrorBoundary key={sheet.kind} name={t(SHEET_TITLES[sheet.kind] ?? sheet.kind)} onClose={stage.close}>
    <Sheet title={sheet.kind === "doc" ? docTitle(sheet.opts.path, t) : t(SHEET_TITLES[sheet.kind] ?? sheet.kind)} onClose={stage.close} narrow={["assets", "doc", "render", "ae", "brief", "voice"].includes(sheet.kind)} handle={sheetHandle}
      hint={studio && STUDIO_HINTS[sheet.kind] ? t(STUDIO_HINTS[sheet.kind]) : null}>
      {sheet.kind === "storyboard" && <Storyboard id={id} />}
      {sheet.kind === "motion-plan" && <MotionPlan id={id} />}
      {sheet.kind === "voice" && <Voice id={id} path={sheet.opts.path} />}
      {sheet.kind === "qa" && <Qa id={id} />}
      {sheet.kind === "ae" && <PortAE id={id} />}
      {sheet.kind === "render" && <RenderSheet projectId={id} format={sheet.opts.format} />}
      {sheet.kind === "brief" && <BriefSheet projectId={id} project={p} onChanged={refreshAll} briefChanged={!!sheet.opts.briefChanged} />}
      {sheet.kind === "doc" && <DocSheet projectId={id} path={sheet.opts.path} approve={sheet.opts.approve} onChanged={refreshAll} />}
      {sheet.kind === "analysis" && <AnalysisSheet projectId={id} onChanged={refreshAll} />}
      {sheet.kind === "qc-review" && <QcReviewSheet projectId={id} />}
      {sheet.kind === "lyrics" && <LyricsSheet projectId={id} onChanged={refreshAll} />}
      {sheet.kind === "music-map" && <MusicMapSheet projectId={id} />}
      {sheet.kind === "character" && <CharacterSheet projectId={id} onChanged={refreshAll} />}
      {sheet.kind === "mix" && <MixSheet key={sfxAt ?? "none"} projectId={id} project={p} onChanged={refreshAll} />}      {sheet.kind === "assets" && <ImportSheet projectId={id} project={p} onChanged={refreshAll} />}
    </Sheet></ErrorBoundary></StageCtx.Provider>;

  const viewerEl = viewer && fileUrl && <Dialog title={String(viewer).split("/").pop()} onClose={() => setViewer(null)} wide>
    <video className="ed-viewer" src={fileUrl(viewer)} controls autoPlay playsInline />
  </Dialog>;
  const leaveDialog = leaveTo && <Dialog title={t("The film is still being built")} onClose={() => setLeaveTo(null)} footer={<>
    <button className="btn ghost" onClick={() => setLeaveTo(null)}>{t("Stay")}</button>
    <button className="btn primary" onClick={() => { const to = leaveTo; setLeaveTo(null); go(to); }}>{t("Leave")}</button></>}>
    <p>{rendering ? t("The film is rendering. If you leave, it keeps rendering: come back later to see it.") : t("Claude is still working on the film. If you leave, it keeps building: come back later to see it.")}</p>
  </Dialog>;
  const strip = <ProjectStrip p={p} id={id} pipeline={pipeline} myRender={myRender} busy={busy} rendering={rendering} onSheet={openSheet}
    onRenamed={() => project.reload()} onRestored={reloadFilm} />;
  const edStyle = tlH ? { "--ed-tl-h": `${tlH}px` } : undefined;
  // A tall or square film (9:16, 4:5, 1:1) keeps its own shape in the Shots' pictures, before the Build too (editor.css; T23-9: a 9:16
  // film's were 16:9 boxes), and in The Studio on the table and on the Storyboard's wall (studio-editor.css, data-shape)
  const filmAr = aw && ah ? aw / ah : 16 / 9, shape = filmShape(filmAr);
  const deskStyle = shape ? { ...edStyle, "--film-ar": String(filmAr) } : edStyle;
  if (studio) {
    // a wide film keeps the table as it is
    const stStyle = { ...edStyle, "--film-ar": String(filmAr) };
    // The Studio (chat on the right, the timeline across the bottom, no vertical X-sheet): the slate, the five
    // stations on their rail, then Shots / Assets / This film · the light table · the conversation, and the timeline under the first two.
    // The sheet of a station lies on the table in the film's place; the film stays loaded under it (hidden), so it never reloads for that.
    const tab = ["shots", "assets", "film"].includes(leftTab) ? leftTab : "shots";
    const sidePane = <aside className="st-side" aria-label={t("Shots, assets and this film")}>
      <div className="ed-ltabs st-tabs" role="tablist" aria-label={t("Shots, assets and this film")}>
        <button role="tab" aria-selected={tab === "shots"} onClick={() => setLeftTab("shots")}>{t("Shots")}<span className="ed-count num">{shots?.length ?? ""}</span></button>
        <button role="tab" aria-selected={tab === "assets"} onClick={showAssets}>{t("Assets")}
          {missing > 0 ? <span className="ed-count stop" title={t("{n} missing file(s)", { n: missing })}>{t("{n} missing", { n: missing })}</span>
            : fresh > 0 ? <span className="ed-count new">{t("{n} new", { n: fresh })}</span> : <span className="ed-count num">{assets?.length ?? ""}</span>}</button>
        <button role="tab" aria-selected={tab === "film"} onClick={() => setLeftTab("film")}>{t("This film")}</button>
      </div>
      <section className="ed-tabbody" role="tabpanel">
        {tab === "assets" ? <>
          <div className="st-addfiles"><button className="btn sm" onClick={() => openSheet("assets")} disabled={rendering}
            title={rendering ? t("Wait until the render finishes") : t("Add files: pictures, video, audio, fonts, logos, PDF")}><Plus size={14} />{t("Add files")}</button>
            <span className="hint">{t("Files copied into the project's folder show up here too.")}</span></div>
          <AssetsPanel projectId={id} items={assets} reload={reloadAssets} fileUrl={fileUrl} locked={rendering} time={tlTime} length={tlLength}
            onTranscript={(path) => openSheet("voice", { path })} onTimelineChanged={() => { loadTimeline(); pv.send("reload"); }}
            onShot={(n) => { const s = shots?.find((x) => x.number === n); if (s) { setShot(s); pv.send("seek", { time: s.start }); setLeftTab("shots"); } }} /></>
          : tab === "film" ? <FilmCard id={id} project={p} locked={locked} onRestored={reloadFilm} />
            : <ShotList projectId={id} shots={unbuilt ? shots?.map((s) => ({ ...s, start: null })) : shots} blank={blankShot} posters={shotPosters} shot={shot} locked={locked} send={pv.send} version={version}
              onShot={(s) => { setShot(s); if (s) pv.send("seek", { time: s.start }); }} onChanged={(structure) => filesChanged(!!structure)} />}
      </section>
    </aside>;
    const line = <Pipeline projectId={id} data={pipeline} starting={starting} onChanged={reloadPipeline} onOpen={openSheet} onAssets={showAssets} cast={p?.meta?.characters?.ids?.length > 0} music={!!p?.styleInfo?.music} warnings={qcWarnings}
      here={sheet ? (pipeline?.voiceWait && (sheet.kind === "voice" || sheet.kind === "lyrics") ? "storyboard" : HERE[sheet.kind] ?? null) : !st.build || st.build.status === "todo" ? (pipeline?.stages?.find((x) => x.status !== "done")?.id ?? null) : "build"} actions={actions} onPlayer={() => { if (sheetRef.current) switchSheet(null); }} />;
    const table = <section className="lt" ref={tableRef} aria-label={t("Light table")}>
      <div className={"lt-film" + (sheet ? " away" : "")} aria-hidden={sheet ? "true" : undefined}>{playerEl}</div>
      {sheetEl}
      {ghost && <div key={ghost.n} className="lt-ghost" aria-hidden="true" dangerouslySetInnerHTML={{ __html: ghost.html }} />}
      {drawer && !sheet && <div className="lt-drawer">{drawerEl}</div>}          {/* it belongs to the film: under a sheet laid on the table it waits */}
    </section>;
    // the Motions and Sounds drawers belong to the film, so opening one lays the film back on the table first
    const openDrawer = (kind) => { if (drawer !== kind && sheetRef.current) switchSheet(null); toggleDrawer(kind); };
    const chat = <ClaudePanel projectId={id} fps={pv.state.fps || 24} selectedShot={chatShot} selection={selection} onClearTarget={() => { setDismissed(selection?.key ?? null); pv.send("clear"); pv.setPicked([]); setShot(null); }}
      onChanged={onClaudeChanged} inject={inject} reloadKey={chatKey} motionPick={motionPick} onOpenMotions={() => openDrawer("motions")} motionsOpen={drawer === "motions"} onOpenSounds={() => openDrawer("sounds")} soundsOpen={drawer === "sounds"}
      steps={pipeline?.steps} rendering={rendering} actions={[]} onWaiting={setAsking} stage={currentStage(pipeline?.stages)} interrupted={pipeline?.interrupted ?? null} onPlay={(path) => setViewer(path)} onOpenSheet={openSheet} checks={pipeline?.checks ?? null}
      waiting={pipeline?.stages?.find((s) => s.status === "waiting" && s.id !== "feedback") ?? null}
      pins={notesOn ? pins : null} onPinsSent={(ids) => setPins((x) => x.filter((p) => !ids.includes(p.id)))} onSeek={(s) => pv.send("seek", { time: s })} />;
    if (w < 900) return <div className="ed st-ed narrow" data-zone="editor" data-shape={shape} style={stStyle}>{strip}{openingEl}{line}
      <div className="pane-head ed-tabs"><div className="tabs" role="tablist">{[["left", "Shots, assets and this film"], ["film", "Film"], ["claude", "Claude"]].map(([k, l]) =>
        <button key={k} role="tab" aria-selected={narrowTab === k} onClick={() => setNarrowTab(k)}>{t(l)}</button>)}</div></div>
      <div className="ed-narrow" style={{ display: narrowTab === "left" ? "flex" : "none" }}>{sidePane}</div>
      <div className="ed-narrow" style={{ display: narrowTab === "film" ? "flex" : "none" }}>{table}{timelineEl}</div>
      <div className="ed-narrow" style={{ display: narrowTab === "claude" ? "flex" : "none" }}>{chat}</div>
      {narrowTab !== "claude" && askBar}{leaveDialog}{viewerEl}</div>;
    return <div className="ed st-ed" data-zone="editor" data-shape={shape} style={stStyle}>{strip}{openingEl}{line}
      {/* with a sheet on the table a short window folds the timeline to its Shots row (CSS) */}
      <div className={"ed-body st-body" + (sheet ? " sheet-on" : "")} ref={centerRef} style={fit ? { "--st-side": `${fit.side}px`, "--st-chat": `${fit.chat}px` } : undefined}>
        <ErrorBoundary name={t("Shots, assets and this film")}>{sidePane}</ErrorBoundary>
        <ErrorBoundary name={t("Film")}>{table}</ErrorBoundary>
        {hsplit}
        <div className="st-tl"><ErrorBoundary name={t("Timeline")}>{timelineEl}</ErrorBoundary></div>
        <aside className="st-chat" aria-label={t("Conversation")}><ErrorBoundary name="Claude">{chat}</ErrorBoundary></aside>
      </div>{leaveDialog}{viewerEl}</div>;
  }
  if (w < 900) return <div className="ed" data-zone="editor" data-shape={shape} style={deskStyle}>{strip}{openingEl}
    <div className="pane-head ed-tabs"><div className="tabs" role="tablist">{[["left", "Shots & pipeline"], ["film", "Film"], ["claude", "Claude"]].map(([k, l]) =>
      <button key={k} role="tab" aria-selected={narrowTab === k} onClick={() => setNarrowTab(k)}>{t(l)}</button>)}</div></div>
    <div className="ed-narrow" style={{ display: narrowTab === "left" ? "flex" : "none" }}>{leftPane}</div>
    <div className="ed-narrow" style={{ display: narrowTab === "film" ? "flex" : "none" }}>{centerPane}</div>
    <div className="ed-narrow" style={{ display: narrowTab === "claude" ? "flex" : "none" }}>{rightPane}</div>
    {sheetEl}{askBar}{leaveDialog}{viewerEl}</div>;
  return <div className="ed" data-zone="editor" data-shape={shape} style={deskStyle}>{strip}{openingEl}<div className="ed-body"><Panes id="editor4" defaults={PANES} left={<ErrorBoundary name={t("Shots & pipeline")}>{leftPane}</ErrorBoundary>} center={<ErrorBoundary name={t("Film")}>{centerPane}</ErrorBoundary>}
    right={<ErrorBoundary name="Claude">{rightPane}</ErrorBoundary>} /></div>{sheetEl}{askBar}{leaveDialog}{viewerEl}</div>;
}
