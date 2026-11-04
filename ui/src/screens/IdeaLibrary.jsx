// Idea Library (audit/97): one place for briefs to start a film from, a page of its own (The Desk: under Characters in the left rail; The
// Studio: the tab after Characters). Laid out like the other library pages: a filter column, the shared grid with its pager, the idea in
// hand beside it.
// - The app's library, shipped with the app and read-only: every film style's sample brief (the same data the Sample brief button reads,
//   packages/idea-library/samples.json) and OPUSCAR 98's 98 style prompts (Lemomo, MIT). Credits as before.
// - My ideas, the user's own: New idea opens a dialog with three fields only, Name, Brief and a suggested Film style (#939); Edit and
//   Delete. Kept on this computer outside every project (GET/POST/PUT/DELETE /api/ideas).
// - On an idea: Start a project (New project with only the brief and the film style filled in) and Copy.
// New project's Idea Library button (the old Writing ideas, #942) opens the same library over the dialog (IdeaPicker), with Add to the brief.
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Copy, Pencil, Plus, SlidersHorizontal, Sparkles, Trash2, X } from "lucide-react";
import { del, get, post, put } from "../api.js";
import { BackButton, Banner, Dialog, NoPreview, Pager, useGalleryGrid } from "../components.jsx";
import { go, useData, useToast } from "../lib.jsx";
import { useT } from "../i18n.jsx";
import { useThemeId } from "../theme.jsx";
import { CreditLine, thumbOf, useStyles } from "./StyleGallery.jsx";
import { useDialogFrame } from "../workflow/StyleChooser.jsx";

/** Where an idea comes from: the user's own, a film style's sample brief, an OPUSCAR 98 prompt. */
export const SOURCES = [["mine", "My ideas"], ["sample", "Film style samples"], ["opuscar98", "OPUSCAR 98"]];
const TAG = { mine: "Yours", sample: "Sample", opuscar98: "OPUSCAR" };
const RENDERS = ["2D", "2.5D", "3D"], TONES = ["Colour", "Black and white", "Sepia"];

/** The library as the UI shows it: the server's ideas named and pictured from their film styles. Each item:
 *  { id, source, name, brief, styleId, style, render, tone, era, image, film, year, credit, own }. */
export function useIdeas() {
  const q = useData(() => get("/api/ideas"), []);
  const sq = useStyles();
  const styles = useMemo(() => sq.data?.styles ?? [], [sq.data]);
  const items = useMemo(() => {
    if (!q.data || !sq.data) return null;
    const S = new Map(styles.map((s) => [s.id, s]));
    const op = q.data.opuscar ?? {};
    const opCredit = op.credit ? { author: op.credit.author, licence: op.credit.licence, link: op.credit.link, commit: op.credit.commit } : null;
    const mine = (q.data.mine ?? []).map((x) => { const s = S.get(x.styleId) ?? null;
      return { id: x.id, source: "mine", own: true, name: x.name, brief: x.brief, styleId: x.styleId ?? null, style: s, render: s?.dim ?? null, tone: null, era: null, image: null, credit: null, updated: x.updated }; });
    const app = [];
    for (const x of q.data.ideas ?? []) {
      const s = x.styleId ? S.get(x.styleId) ?? null : null;
      if (x.source === "sample") {
        if (x.styleId && !s) continue;          // a style this app does not offer (hidden): its sample is not an idea to start from
        const credit = x.credit ? { author: x.credit.text, link: x.credit.link } : null;
        if (x.kind) app.push({ ...x, name: x.label, style: null, render: "2D", tone: null, era: null, image: null, credit });
        else app.push({ ...x, name: `${s.title} sample`, style: s, render: s.dim ?? null, tone: null, era: null, image: thumbOf(s), credit });
      } else app.push({ ...x, name: x.label, styleId: s ? x.styleId : null, style: s, credit: opCredit });
    }
    return { mine, app, all: [...mine, ...app], eras: op.eras ?? [], opName: op.name ?? "OPUSCAR 98" };
  }, [q.data, sq.data, styles]);
  return { items, styles, error: q.error ?? sq.error, reload: q.reload };
}

const F0 = { sources: [], style: "all", render: "all", tone: "all", eras: [] };
const toggle = (xs, x) => (xs.includes(x) ? xs.filter((y) => y !== x) : [...xs, x]);
const countBy = (list, key) => { const m = new Map(); for (const x of list) { const k = key(x); if (k != null) m.set(k, (m.get(k) ?? 0) + 1); } return m; };
function passes(p, f, skip) {
  if (skip !== "sources" && f.sources.length && !f.sources.includes(p.source)) return false;
  if (skip !== "style" && f.style !== "all" && (p.styleId ?? "none") !== f.style) return false;
  if (skip !== "render" && f.render !== "all" && p.render !== f.render) return false;
  if (skip !== "tone" && f.tone !== "all" && p.tone !== f.tone) return false;
  if (skip !== "eras" && f.eras.length && !f.eras.includes(p.era)) return false;
  return true;
}
/** The filter state and what it leaves: { f, set, reset, list, facets }. */
function useFilters(all) {
  const [f, setF] = useState(F0);
  const list = (all ?? []).filter((p) => passes(p, f));
  const pool = (skip) => (all ?? []).filter((x) => passes(x, f, skip));
  return { f, set: (x) => setF((o) => ({ ...o, ...x })), reset: () => setF(F0), list, dirty: JSON.stringify(f) !== JSON.stringify(F0),
    by: { sources: countBy(pool("sources"), (x) => x.source), style: countBy(pool("style"), (x) => x.styleId ?? "none"), render: countBy(pool("render"), (x) => x.render),
      tone: countBy(pool("tone"), (x) => x.tone), eras: countBy(pool("eras"), (x) => x.era) } };
}

function Facets({ items, flt }) {
  const t = useT();
  const { f, set, by } = flt, all = items.all;
  const row = (key, on, onClick, label, n, sub) => <button key={key} type="button" className={"sgb-opt" + (on ? " on" : "")} role="checkbox" aria-checked={on} onClick={onClick}>
    <span className="sgb-box" aria-hidden="true">{on && <Check size={11} />}</span><span className="l">{label}{sub && <small className="plx-sub">{sub}</small>}</span><span className="n num">{n ?? 0}</span></button>;
  const styleOpts = [...new Map(all.filter((x) => x.style).map((x) => [x.styleId, x.style.title])).entries()].sort((a, b) => a[1].localeCompare(b[1]));
  const renders = RENDERS.filter((r) => all.some((x) => x.render === r)), tones = TONES.filter((r) => all.some((x) => x.tone === r));
  return <>
    <div className="sgb-fg" role="group" aria-label={t("Source")}><span className="sgb-fl">{t("Source")}</span>
      {SOURCES.map(([k, l]) => row(k, f.sources.includes(k), () => set({ sources: toggle(f.sources, k) }), k === "opuscar98" ? items.opName : t(l), by.sources.get(k)))}</div>
    <div className="sgb-fg"><label className="sgb-fl" htmlFor="idl-style">{t("Film style")}</label>
      <select id="idl-style" className="select" value={f.style} onChange={(e) => set({ style: e.target.value })}>
        <option value="all">{t("All film styles")}</option>
        {by.style.get("none") > 0 && <option value="none">{t("No film style")} ({by.style.get("none")})</option>}
        {styleOpts.map(([id, name]) => <option key={id} value={id}>{name} ({by.style.get(id) ?? 0})</option>)}</select></div>
    {renders.length > 1 && <div className="sgb-fg"><span className="sgb-fl">{t("2D / 3D")}</span><div className="sgb-chips">
      {renders.map((r) => <button key={r} type="button" className="ml-chip" aria-pressed={f.render === r} onClick={() => set({ render: f.render === r ? "all" : r })}>{r}<span className="num">{by.render.get(r) ?? 0}</span></button>)}</div></div>}
    {tones.length > 1 && <div className="sgb-fg"><span className="sgb-fl">{t("Tone")}</span><div className="sgb-chips">
      {tones.map((r) => <button key={r} type="button" className="ml-chip" aria-pressed={f.tone === r} onClick={() => set({ tone: f.tone === r ? "all" : r })}>{t(r)}<span className="num">{by.tone.get(r) ?? 0}</span></button>)}</div></div>}
    {items.eras.length > 0 && <div className="sgb-fg" role="group" aria-label={t("Era")}><span className="sgb-fl">{t("Era")}</span>
      {items.eras.map((e) => row(e.id, f.eras.includes(e.id), () => set({ eras: toggle(f.eras, e.id) }), e.en, by.eras.get(e.id), e.years))}</div>}
    {flt.dirty && <button type="button" className="sgb-more" onClick={flt.reset}>{t("Clear filters")}</button>}
  </>;
}

/** One idea's tile: its picture (the style's, OPUSCAR's frame), or for the user's own the first lines of the brief. */
function IdeaCard({ x, on, onPick }) {
  const t = useT();
  return <button type="button" role="option" aria-selected={on} className={"sgb-card idl-card" + (on ? " on" : "") + (x.own ? " own" : "")} onClick={() => onPick(x)}>
    <span className="shot">{x.image ? <img src={x.image} alt="" loading="lazy" decoding="async" /> : x.own ? <span className="idl-text">{x.brief}</span> : <NoPreview />}
      {x.render && !x.own && <span className="mark">{x.render}</span>}{on && <span className="chk"><Check size={13} /></span>}</span>
    <span className="nm">{x.name}</span>
    <span className="by"><span className="au-tag">{t(TAG[x.source])}</span>{x.source !== "sample" && <span className="cat">{x.source === "opuscar98" ? `${x.film} · ${x.year}` : x.style?.title ?? t("No film style")}</span>}</span></button>;
}

/** The idea in hand: picture, name, film style, the brief, credit, and what can be done with it. */
function IdeaDetails({ x, actions }) {
  const t = useT();
  return <>
    {x.image && <div className="sgb-big"><img src={x.image} alt="" /></div>}
    <div className="sgb-head"><h2 className="sgb-title">{x.name}</h2>
      <p className="sgb-sub"><span className="au-tag">{t(TAG[x.source])}</span>{x.source === "opuscar98" && <span>{t("Written for {film}", { film: `${x.film} (${x.year})` })}</span>}</p></div>
    <dl className="kv sgb-kv idl-kv"><dt>{t("Film style")}</dt><dd>{x.style?.title ?? t("No film style")}</dd></dl>
    <div className="plx-prompt">{x.brief}</div>
    {x.credit && <CreditLine author={x.credit.author} licence={x.credit.licence} link={x.credit.link} commit={x.credit.commit} />}
    <div className="sgb-acts">{actions}</div>
  </>;
}

const copyText = async (text, toast, t) => { try { await navigator.clipboard.writeText(text); toast(t("Copied")); } catch { toast(t("Could not copy to the clipboard"), "error"); } };

// Start a project: New project opens with this brief and film style; the hand-over survives the route change for this tab only
const START_KEY = "mw-idea-start";
export function startProject(x) {
  try { sessionStorage.setItem(START_KEY, JSON.stringify({ brief: x.brief, styleId: x.styleId ?? null })); } catch { /* private */ }
  go("/new");
}
/** The idea New project was opened with (once), or null. */
export function takeStartIdea() {
  try { const v = sessionStorage.getItem(START_KEY); sessionStorage.removeItem(START_KEY); return v ? JSON.parse(v) : null; } catch { return null; }
}

/** New idea / Edit idea: Name, Brief and Film style, nothing else (#939). `value`: { id?, name, brief, styleId }. Saves to My ideas. */
export function IdeaDialog({ value, onClose, onSaved }) {
  const t = useT();
  const toast = useToast();
  const sq = useStyles();
  const styles = useMemo(() => [...(sq.data?.styles ?? [])].sort((a, b) => a.title.localeCompare(b.title)), [sq.data]);
  const [v, setV] = useState({ name: value?.name ?? "", brief: value?.brief ?? "", styleId: value?.styleId ?? "" });
  const [busy, setBusy] = useState(false), [touched, setTouched] = useState(false);
  const editing = !!value?.id;
  const ok = v.name.trim() && v.brief.trim();
  const save = async () => {
    if (!ok) { setTouched(true); return; }
    setBusy(true);
    try {
      const body = { name: v.name.trim(), brief: v.brief, styleId: v.styleId || null };
      const r = editing ? await put(`/api/ideas/${value.id}`, body) : await post("/api/ideas", body);
      toast(editing ? t("Saved “{name}”", { name: r.idea.name }) : t("“{name}” is in My ideas", { name: r.idea.name }));
      onSaved?.(r.idea);
    } catch (e) { toast(e.message, "error"); setBusy(false); }
  };
  // Ctrl+Enter saves; no key reaches a dialog under it (New project creates on Ctrl+Enter)
  return createPortal(<div className="idl-dlg" onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); e.stopPropagation(); save(); } }}><Dialog title={editing ? t("Edit idea") : t("New idea")} labelledBy="idl-dlg-h" wide onClose={busy ? undefined : onClose}
    footer={<><span className="spacer" /><button className="btn" onClick={onClose} disabled={busy}>{t("Cancel")}</button>
      <button className="btn primary" onClick={save} disabled={busy} aria-disabled={!ok || undefined}><Check size={15} />{t("Save idea")}</button></>}>
    <div className="idl-form">
      <label className="field"><span className="label">{t("Name")}</span>
        <input className={"input" + (touched && !v.name.trim() ? " invalid" : "")} value={v.name} onChange={(e) => setV((o) => ({ ...o, name: e.target.value }))} maxLength={120} spellCheck={false} autoFocus /></label>
      {touched && !v.name.trim() && <span className="np2-err" role="alert">{t("Give the idea a name.")}</span>}
      <label className="field"><span className="label">{t("Brief")}</span>
        <textarea className={"textarea idl-brief" + (touched && !v.brief.trim() ? " invalid" : "")} value={v.brief} onChange={(e) => setV((o) => ({ ...o, brief: e.target.value }))} spellCheck={false} /></label>
      {touched && !v.brief.trim() && <span className="np2-err" role="alert">{t("Write the brief first.")}</span>}
      <label className="field"><span className="label">{t("Film style")}</span>
        <select className="select" value={v.styleId} onChange={(e) => setV((o) => ({ ...o, styleId: e.target.value }))}>
          <option value="">{t("No film style")}</option>
          {v.styleId && !styles.some((s) => s.id === v.styleId) && <option value={v.styleId}>{v.styleId}</option>}
          {styles.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}</select>
        <span className="hint">{t("Optional. Start a project picks this style for you.")}</span></label>
    </div>
  </Dialog></div>, document.body);
}

function DeleteIdea({ x, onClose, onDeleted }) {
  const t = useT();
  const toast = useToast();
  return <Dialog title={t("Delete “{title}”?", { title: x.name })} danger onClose={onClose} footer={<><span className="spacer" />
    <button className="btn" onClick={onClose}>{t("Cancel")}</button>
    <button className="btn danger" onClick={async () => { try { await del(`/api/ideas/${x.id}`); toast(t("Deleted “{title}”", { title: x.name })); onDeleted(); } catch (e) { toast(e.message, "error"); } }}><Trash2 size={14} />{t("Delete")}</button></>}>
    <div className="dlg-lines"><p className="dlg-warn">{t("“{title}” leaves My ideas.", { title: x.name })}</p><p>{t("Projects started from it keep their brief.")}</p></div></Dialog>;
}

/** The page. */
export default function IdeaLibrary() {
  const t = useT();
  const toast = useToast();
  const studio = useThemeId() === "studio";
  const { items, error, reload } = useIdeas();
  const flt = useFilters(items?.all);
  const [cur, setCur] = useState(null);
  const [edit, setEdit] = useState(null);          // the New idea / Edit idea dialog: { value } or null
  const [ask, setAsk] = useState(null);            // the idea asked to be deleted
  const [panel, setPanel] = useState(null);        // a narrow window: the filters or the idea over the grid
  const grid = useGalleryGrid({ fewer: 1 }), size = grid.size;
  const [pg, setPg] = useState(0);
  useEffect(() => { setPg(0); }, [flt.f]);
  const list = flt.list;
  const sel = list.find((x) => x.id === cur) ?? list[0] ?? null;
  const pick = (x) => { setCur(x.id); if (matchMedia("(max-width: 1100px)").matches) setPanel("style"); };
  useEffect(() => { if (!panel) return undefined; const esc = (e) => { if (e.key === "Escape") setPanel(null); }; addEventListener("keydown", esc); return () => removeEventListener("keydown", esc); }, [panel]);
  const saved = (idea) => { setEdit(null); setCur(idea.id); reload(); };
  const head = studio
    ? <div className="st-head"><h1>{t("Idea Library")}</h1><span className="st-aside">{t("briefs to start a film from: the app's own, and yours")}</span>
      <div className="st-acts"><button className="btn primary" onClick={() => setEdit({ value: null })}><Plus size={15} />{t("New idea")}</button></div></div>
    : <div className="page-head"><div><BackButton /><h1>{t("Idea Library")}</h1><p className="lead">{t("Briefs to start a film from: the app's own, and yours.")}</p></div>
      <div className="actions"><button className="btn primary" onClick={() => setEdit({ value: null })}><Plus size={15} />{t("New idea")}</button></div></div>;
  return <div className={"page gal-page idl-page" + (studio ? " st-motionlib st-ideas" : "")}>
    {head}
    {error && <Banner kind="error" action={<button className="btn sm" onClick={reload}>{t("Retry")}</button>}>{error.message}</Banner>}
    {!items ? !error && <div className="sgb-layout"><div className="skeleton" /><div className="skeleton" /><div className="skeleton" /></div> : <div className={"sgb-layout" + (panel ? " panel-" + panel : "")}>
      {panel && <div className="sgb-scrim" onClick={() => setPanel(null)} />}
      <aside className="sgb-facets" aria-label={t("Filters")}><Facets items={items} flt={flt} /></aside>
      <section className="sgb-center" aria-label={t("Ideas")}>
        <div className="sgb-bar">
          <button type="button" className="btn sm sgb-filters-btn" onClick={() => setPanel("filters")}><SlidersHorizontal size={13} />{t("Filters")}</button>
          <span className="count num" aria-live="polite">{list.length === items.all.length ? t("{n} ideas", { n: list.length }) : t("{n} of {total} ideas", { n: list.length, total: items.all.length })}</span>
          {flt.dirty && <button type="button" className="btn ghost sm" onClick={flt.reset}>{t("Clear filters")}</button>}
        </div>
        {list.length === 0 && <div className="empty"><p>{flt.f.sources.length === 1 && flt.f.sources[0] === "mine" && !items.mine.length ? t("No ideas of your own yet. New idea keeps one here.") : t("No idea matches.")}</p></div>}
        <div className="sgb-grid idl-grid" role="listbox" aria-label={t("Ideas")} ref={grid.ref} style={grid.style}>
          {list.slice(pg * size, (pg + 1) * size).map((x) => <IdeaCard key={x.id} x={x} on={sel?.id === x.id} onPick={pick} />)}
        </div>
        <Pager keep page={pg} size={size} total={list.length} onPage={setPg} />
      </section>
      <aside className="sgb-insp" aria-label={sel ? sel.name : t("Ideas")}>
        {panel === "style" && <BackButton className="insp" onClick={() => setPanel(null)} />}
        {sel ? <div className="insp-in" key={sel.id}><IdeaDetails x={sel} actions={<>
          <button type="button" className="btn primary" onClick={() => startProject(sel)}><Sparkles size={14} />{t("Start a project")}</button>
          <button type="button" className="btn" onClick={() => copyText(sel.brief, toast, t)}><Copy size={14} />{t("Copy")}</button>
          {sel.own && <button type="button" className="btn" onClick={() => setEdit({ value: sel })}><Pencil size={14} />{t("Edit")}</button>}
          {sel.own && <button type="button" className="btn ghost icon" onClick={() => setAsk(sel)} aria-label={t("Delete {name}", { name: sel.name })} title={t("Delete")}><Trash2 size={15} /></button>}</>} /></div>
          : <p className="hint">{t("Choose an idea to see it here.")}</p>}
      </aside>
    </div>}
    {edit && <IdeaDialog value={edit.value} onClose={() => setEdit(null)} onSaved={saved} />}
    {ask && <DeleteIdea x={ask} onClose={() => setAsk(null)} onDeleted={() => { setAsk(null); setCur(null); reload(); }} />}
  </div>;
}

/** New project's Idea Library button: the same library over the dialog, laid out like the Style Gallery's chooser (filters, grid,
 *  the idea in hand), with Add to the brief and Copy. Rendered on <body>; Esc and Back return to the dialog. */
export function IdeaPicker({ onAdd, onClose }) {
  const t = useT();
  const toast = useToast();
  const { items, error } = useIdeas();
  const flt = useFilters(items?.all);
  const [cur, setCur] = useState(null);
  const box = useRef(null);
  const frame = useDialogFrame();          // the New project dialog's frame
  useEffect(() => {
    const esc = (e) => { if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); onClose(); } };
    document.addEventListener("keydown", esc, true);
    return () => document.removeEventListener("keydown", esc, true);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { box.current?.querySelector(".plx-back")?.focus(); }, []);
  const list = flt.list;
  const p = list.find((x) => x.id === cur) ?? list[0] ?? null;
  const add = (x) => { onAdd(x.brief); toast(t("Added to the brief")); onClose(); };
  return createPortal(<>
    <div className="scx-scrim" onMouseDown={onClose} />
    <div className={"plx" + (frame ? " framed" : "")} style={frame} role="dialog" aria-modal="true" aria-labelledby="plx-h" ref={box}>
      <div className="dialog-head">
        <BackButton onClick={onClose} />
        <h2 id="plx-h">{t("Idea Library")}</h2>
        <span className="count num">{items ? (list.length === 1 ? t("1 idea") : t("{n} ideas", { n: list.length })) : ""}</span>
        <button className="btn ghost icon sm x" onClick={onClose} aria-label={t("Close")}><X size={16} /></button></div>
      {error && <div className="plx-pad"><Banner kind="error">{error.message}</Banner></div>}
      {!items ? !error && <div className="plx-pad"><div className="skeleton" style={{ height: "24rem" }} /></div> : <div className="plx-body">
        <aside className="plx-facets" aria-label={t("Filters")}><Facets items={items} flt={flt} /></aside>
        <div className="plx-grid" role="listbox" aria-label={t("Ideas")}>
          {list.length === 0 && <p className="hint">{t("No idea matches.")}</p>}
          {list.map((x) => <IdeaCard key={x.id} x={x} on={p?.id === x.id} onPick={(y) => setCur(y.id)} />)}
        </div>
        {p && <aside className="plx-detail"><IdeaDetails x={p} actions={<>
          <button type="button" className="btn primary" onClick={() => add(p)}><Plus size={14} />{t("Add to the brief")}</button>
          <button type="button" className="btn" onClick={() => copyText(p.brief, toast, t)}><Copy size={14} />{t("Copy")}</button></>} /></aside>}
      </div>}
    </div>
  </>, document.body);
}
