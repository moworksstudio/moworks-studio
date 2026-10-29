// The Studio's Projects (the "Mix v3" view): on top, the pitch card "Start a film" taped to the wall and the
// film in hand as a reel row: a strip of five frames from the film itself, developed from left to right as far as the film has come
// (blue pencil: not yet, ink: done, colour: rendered), then its status, name, length · shape · film style, how many steps are done, Open
// and its menu (Rename, Show in folder, Locate, Duplicate, Remove from list). Below, two shelves with every film as a sleeve, newest
// first, packed and fanned like the Film Styles crates; a click puts that film on top, a double click opens it. The label maker
// searches; Sort sits beside it; Import project is a line under the pitch card. With no film yet, the logo intro takes the film in hand's place
// on the light table and one bare shelf waits under it. A film whose folder is gone stands in dashed blue pencil
// with "Locate…". The dialogs are The Desk's (screens/Projects.jsx passes them in), so every action works the same in both themes.
// Mix v3 is the one view: the counts are props (`frames`, `tiers`, `perTier`) and the sizes are
// CSS variables on .st-projects in studio-shell.css (--mix-pitch, --mix-info, --mix-frame-h, --sleeve-min, --sleeve-max, --sleeve-overlap).
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowDownUp, Clapperboard, FolderInput, FolderOpen, FolderSearch, MoreHorizontal, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { get, post } from "../api.js";
import { Banner, Menu } from "../components.jsx";
import { ago, clock, go, usePref } from "../lib.jsx";
import { useT } from "../i18n.jsx";

const SORTS = [["opened", "Last opened"], ["updated", "Last changed"], ["name", "Name"]];
const STATUS = { in_progress: "In progress", needs_review: "Waiting for you", exported: "Exported", missing: "Folder missing" };
const statusOf = (p) => (p.missing ? "missing" : p.status === "exported" ? "exported" : p.status === "needs_review" ? "needs_review" : "in_progress");
/** How far the film has come, 0..1: its pipeline's done steps (a rendered film is all the way). */
const doneOf = (p) => (statusOf(p) === "exported" ? 1 : p.progress?.total > 0 ? Math.min(1, p.progress.done / p.progress.total) : 0);
/** The material frame i of n is drawn in: the strip develops from left to right as the film moves along the pipeline. */
const material = (p, i, n) => { const d = doneOf(p), f = (i + 1) / n; return statusOf(p) === "exported" || f <= d * 0.95 ? "colour" : f <= d + 0.25 ? "ink" : "pencil"; };
const shapeOf = (p) => p.aspect ?? (p.width ? `${p.width}×${p.height}` : null);
const tall = (p) => (p.width && p.height ? p.height > p.width : p.aspect === "9:16" || p.aspect === "4:5");

/** The film's pipeline as a strip of small bars: done in ink, the step it is on lit, the rest in pencil; a rendered film in colour. */
function DevBar({ p }) {
  const n = p.progress?.total > 0 ? p.progress.total : 5, d = Math.round(doneOf(p) * n), all = statusOf(p) === "exported";
  return <span className="st-devbar" aria-hidden="true">{Array.from({ length: n }, (_, k) => <i key={k} className={all ? "c" : k < d ? "k" : k === d ? "p now" : "p"} />)}</span>;
}

/** The film in hand: five frames from its own shots (the server's posters when they are there, else its picture), each in its material. */
function Strip({ p, n = 5 }) {
  const [frames, setFrames] = useState(null);
  useEffect(() => {
    let alive = true; setFrames(null);
    if (p.missing) return undefined;
    get(`/api/projects/${p.id}/posters`).then((r) => { if (alive && r.posters?.length) setFrames(r.posters.map((x) => x.url)); }).catch(() => {});          // read only: never starts a poster job here
    return () => { alive = false; };
  }, [p.id, p.missing]);
  const pics = frames?.length ? Array.from({ length: n }, (_, i) => frames[Math.min(frames.length - 1, Math.round((i * (frames.length - 1)) / Math.max(1, n - 1)))]) : Array(n).fill(p.thumbnailUrl ?? null);
  return <div className="st-stripbox"><div className="st-strip">{pics.map((src, i) => <div key={i} className={"st-fr" + (tall(p) ? " tall" : "")}>
    {src ? <img src={src} alt="" className={"st-dev-" + material(p, i, n)} /> : <span className="st-fr-blank" />}<span className="st-fno num">{String(i + 1).padStart(2, "0")}</span></div>)}</div></div>;
}

export default function ReelWall({ data, error, loading, reload, onAction, intro, dialogs, frames = 5, tiers: tierCount = 2, perTier = 6 }) {
  const t = useT();
  const [q, setQ] = usePref("studio:projects:q", "");
  const [sort, setSort] = usePref("projects:sort", "opened");
  const [pickId, setPickId] = useState(null);
  const all = data?.projects ?? [];
  const list = useMemo(() => {
    const key = { opened: (p) => p.openedAt ?? p.updatedAt ?? "", updated: (p) => p.updatedAt ?? "", name: (p) => p.title.toLowerCase() }[sort] ?? ((p) => p.updatedAt ?? "");
    const l = all.filter((p) => !q || [p.title, p.style?.title].join(" ").toLowerCase().includes(q.toLowerCase()));
    return [...l].sort((a, b) => (sort === "name" ? key(a).localeCompare(key(b)) : key(b).localeCompare(key(a))));
  }, [all, q, sort]);
  const pick = list.find((p) => p.id === pickId) ?? list[0] ?? null;
  const open = (p) => (p.missing ? onAction("gone", p) : go(`/projects/${p.id}`));
  const reveal = async (p) => { try { await post(`/api/projects/${p.id}/reveal`); } catch (e) { onAction("error", e); } };
  const menu = (p) => <Menu trigger={<MoreHorizontal size={16} />} label={t("Actions for {title}", { title: p.title })} items={[
    { label: t("Rename"), icon: <Pencil size={14} />, onSelect: () => onAction("rename", p), disabled: p.missing },
    { label: t("Show in folder"), icon: <FolderOpen size={14} />, onSelect: () => reveal(p), disabled: p.missing },
    ...(p.missing ? [{ label: t("Locate project…"), icon: <FolderSearch size={14} />, onSelect: () => onAction("locate", p) }] : []),
    { label: t("Duplicate"), icon: <Plus size={14} />, onSelect: () => {}, disabled: true, title: t("Coming later") },
    "-",
    { label: t("Remove from list"), icon: <Trash2 size={14} />, onSelect: () => onAction("remove", p), danger: true },
  ]} />;
  // two shelves; the top one takes up to `perTier` films first, then they share them evenly, newest first
  const per = list.length > perTier ? Math.ceil(list.length / tierCount) : list.length;
  const tiers = Array.from({ length: tierCount }, (_, i) => list.slice(i * per, i === tierCount - 1 ? undefined : (i + 1) * per));
  const empty = !loading && !error && all.length === 0;

  return <div className="st-room st-projects">
    <div className="st-head"><h1>{t("Projects")}</h1>{all.length > 0 && <span className="st-aside">{q.trim() ? t("{n} of {total} films", { n: list.length, total: all.length }) : t("{n} films", { n: all.length })}</span>}
      {all.length > 0 && <div className="st-acts">
        <span className="st-sort"><ArrowDownUp size={14} aria-hidden="true" /><select value={sort} onChange={(e) => setSort(e.target.value)} aria-label={t("Sort")}>{SORTS.map(([k, l]) => <option key={k} value={k}>{t(l)}</option>)}</select></span>
        <label className="st-labelmaker"><Search size={15} aria-hidden="true" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("Search projects")} aria-label={t("Search projects")} />
          {q && <button type="button" onClick={() => setQ("")} aria-label={t("Clear")}><X size={13} /></button>}</label></div>}</div>
    {error && <Banner kind="error" action={<button className="btn sm" onClick={reload}>{t("Retry")}</button>}>{t("Could not load the projects.")} {error.message}</Banner>}
    <div className="st-mixwrap">
      <div className="st-mixtop">
        <div className="st-pitchcol">
          <button type="button" className="st-pitch" onClick={() => go("/new")}><span className="st-tape" aria-hidden="true" /><span className="st-label">{t("New project")}</span>
            <b>{t("Start a film")}</b><span className="st-pitch-p">{t("one sentence is enough, Claude does the rest with you")}</span><span className="btn primary"><Plus size={15} />{t("New project")}</span></button>
          <button type="button" className="st-import" onClick={() => onAction("open")}><FolderInput size={14} />{t("Import project")}</button>
        </div>
        {loading && !data ? <div className="st-mixrow st-skel" role="status" aria-label={t("Opening your projects…")} />
          : empty ? <div className="st-mixrow st-intro">{intro}</div>
          : pick ? <div className="st-mixrow" key={pick.id} onDoubleClick={() => open(pick)}>
            <Strip p={pick} n={frames} />
            <div className="st-mixinfo">
              <span className={"st-label st-status s-" + statusOf(pick)}>{t(STATUS[statusOf(pick)])}</span>
              <h2 title={pick.title}>{pick.title}</h2>
              {pick.missing ? <p className="st-hand st-gone"><AlertTriangle size={14} /> {t("The folder was deleted, moved or renamed outside the app.")}</p>
                : <span className="st-facts num">{[pick.duration > 0 && clock(pick.duration), shapeOf(pick), pick.style && t(pick.style.title)].filter(Boolean).join(" · ")}</span>}
              {!pick.missing && <span className="st-where">{pick.progress?.total > 0 ? t("{done} of {total} steps", { done: Math.min(pick.progress.done, pick.progress.total), total: pick.progress.total })
                : t("Not started")}{pick.progress?.needsYou > 0 && <em> · {t("Waiting for you")}</em>}</span>}
              {!pick.missing && <DevBar p={pick} />}
              <span className="st-when">{t("changed {when}", { when: ago(pick.updatedAt) })}</span>
              <span className="st-open">{pick.missing ? <button className="btn primary" onClick={() => onAction("locate", pick)}><FolderSearch size={15} />{t("Locate project…")}</button>
                : <button className="btn primary" onClick={() => open(pick)}><Clapperboard size={15} />{t("Open")}</button>}{menu(pick)}</span>
            </div></div>
          : <div className="st-mixrow st-none"><p className="st-hand">{t("No project matches.")}</p><button className="btn" onClick={() => setQ("")}>{t("Clear filters")}</button></div>}
      </div>
      {all.length > 0 && <div className="st-tiers" style={{ "--tiers": tierCount }}>{tiers.map((part, ti) => <div key={ti} className={"st-box st-tier" + (part.length ? "" : " st-tier-empty")} data-name={ti === 0 ? t("Projects") : ""}>
        <div className="st-sleeves" style={{ "--n": part.length }}>{part.map((p) => <button key={p.id} type="button" className={"st-sleeve st-film" + (p.missing ? " gone" : "")} aria-pressed={p.id === pick?.id}
          onClick={() => setPickId(p.id)} onDoubleClick={() => open(p)} title={p.title}>
          <span className="st-film-img">{p.missing ? <span className="st-gone-img"><FolderSearch size={18} />{t("Locate…")}</span>
            : p.thumbnailUrl ? <img src={p.thumbnailUrl} alt="" loading="lazy" className={"st-dev-" + material(p, 2, 5)} /> : <span className="st-fr-blank" />}</span>
          <span className="st-cap">{p.title}<small className="num">{[p.duration > 0 && clock(p.duration), shapeOf(p)].filter(Boolean).join(" · ") || t(STATUS[statusOf(p)])}</small></span>
          {!p.missing && <DevBar p={p} />}</button>)}
          {ti > 0 && !part.length && <p className="st-hand st-next">{t("room for the next film")}</p>}</div></div>)}</div>}
      {/* no film yet: the logo intro lies on the light table above, and one bare shelf waits for the first film */}
      {empty && <div className="st-tiers"><div className="st-box st-tier st-tier-empty" data-name={t("Projects")}>
        <div className="st-sleeves"><p className="st-hand st-next">{t("room for the first film")}</p></div></div></div>}
    </div>
    {dialogs}
  </div>;
}
