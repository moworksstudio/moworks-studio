// The Writers Room's Ideas tab (audit/97, audit/104 §7d; WritersRoom.jsx is the page): the briefs to start a film from, laid out like the
// other library pages: a filter column, the shared grid with its pager, the idea in hand beside it.
// - The app's library, shipped with the app and read-only: every film style's sample brief (the same data the Sample brief button reads,
//   packages/idea-library/samples.json) and OPUSCAR 98's 98 style prompts (Lemomo, MIT). Credits as before.
// - My ideas, the user's own: written with New idea (Name, Brief, a suggested Film style; #939), or kept from a pitch in Research; each has a
//   status, Idea, Script ready or In a project (#1111). A pitched idea shows as its card: hook, the style's items, truth, sources.
// - The filters (#1118): Status, Source and Film style first; 2D / 3D, Tone and Era (OPUSCAR's only, in three bands) under More filters,
//   closed; an empty option is not shown; what is on shows as chips above the grid.
// - On an idea: Start a project (an idea of mine with no script asks first: write the script, or start from the idea), Write the script /
//   Open the script, Copy, Edit, Delete. New project's Idea Library button opens the same library over the dialog (IdeaPicker).
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Copy, FileText, Lightbulb, Pencil, Plus, Sparkles, SlidersHorizontal, Trash2, X } from "lucide-react";
import { del, get, post, put } from "../api.js";
import { BackButton, Banner, Dialog, NoPreview, Pager, useGalleryGrid } from "../components.jsx";
import { go, useData, useToast } from "../lib.jsx";
import { useT } from "../i18n.jsx";
import { CreditLine, thumbOf, useStyles } from "./StyleGallery.jsx";
import { useDialogFrame } from "../workflow/StyleChooser.jsx";
import { Sources, Truth } from "./IdeaParts.jsx";

/** Where an idea comes from: the user's own, a film style's sample brief, an OPUSCAR 98 prompt. */
export const SOURCES = [["mine", "My ideas"], ["sample", "Film style samples"], ["opuscar98", "OPUSCAR 98"]];
const TAG = { mine: "Yours", sample: "Sample", opuscar98: "OPUSCAR" };
const RENDERS = ["2D", "2.5D", "3D"], TONES = ["Colour", "Black and white", "Sepia"];
/** An idea's step (#1111): an idea, its script written, a film made from it. Only my own ideas have one. */
export const STATUS = [["idea", "Idea"], ["script", "Script ready"], ["project", "In a project"]];
export const statusOf = (x) => (!x.own ? null : x.projects?.length ? "project" : x.script ? "script" : "idea");
// OPUSCAR's ten eras in three bands (#1118), by the first year of each
export const ERA_BANDS = [["early", "Before 1960", (y) => y < 1960], ["mid", "1960–1999", (y) => y >= 1960 && y < 2000], ["now", "2000 to now", (y) => y >= 2000]];
const firstYear = (e) => Number(/\d{4}/.exec(String(e?.years ?? ""))?.[0] ?? NaN);

/** The library as the UI shows it: the server's ideas named and pictured from their film styles. Each item:
 *  { id, source, name, brief, styleId, style, render, tone, era, band, image, film, year, credit, own, card, script, projects, status }. */
export function useIdeas() {
  const q = useData(() => get("/api/ideas"), []);
  const sq = useStyles();
  const styles = useMemo(() => sq.data?.styles ?? [], [sq.data]);
  const items = useMemo(() => {
    if (!q.data || !sq.data) return null;
    const S = new Map(styles.map((s) => [s.id, s]));
    const op = q.data.opuscar ?? {};
    const bandOf = new Map((op.eras ?? []).map((e) => [e.id, ERA_BANDS.find(([, , f]) => f(firstYear(e)))?.[0] ?? null]));
    const opCredit = op.credit ? { author: op.credit.author, licence: op.credit.licence, link: op.credit.link, commit: op.credit.commit } : null;
    const mine = (q.data.mine ?? []).map((x) => { const s = S.get(x.styleId) ?? null;
      const it = { id: x.id, source: "mine", own: true, name: x.name, brief: x.brief, card: x.card ?? null, script: x.script ?? null, projects: x.projects ?? [], pitched: !!x.pitch,
        styleId: x.styleId ?? null, style: s, render: s?.dim ?? null, tone: null, era: null, band: null, image: null, credit: null, updated: x.updated };
      return { ...it, status: statusOf(it) }; });
    const app = [];
    for (const x of q.data.ideas ?? []) {
      const s = x.styleId ? S.get(x.styleId) ?? null : null;
      if (x.source === "sample") {
        if (x.styleId && !s) continue;          // a style this app does not offer (hidden): its sample is not an idea to start from
        const credit = x.credit ? { author: x.credit.text, link: x.credit.link } : null;
        if (x.kind) app.push({ ...x, name: x.label, style: null, render: "2D", tone: null, era: null, band: null, image: null, credit, status: null });
        else app.push({ ...x, name: `${s.title} sample`, style: s, render: s.dim ?? null, tone: null, era: null, band: null, image: thumbOf(s), credit, status: null });
      } else app.push({ ...x, name: x.label, styleId: s ? x.styleId : null, style: s, credit: opCredit, band: bandOf.get(x.era) ?? null, status: null });
    }
    return { mine, app, all: [...mine, ...app], eras: op.eras ?? [], opName: op.name ?? "OPUSCAR 98" };
  }, [q.data, sq.data, styles]);
  return { items, styles, error: q.error ?? sq.error, reload: q.reload };
}

const F0 = { status: [], sources: [], style: "all", render: "all", tone: "all", bands: [] };
const toggle = (xs, x) => (xs.includes(x) ? xs.filter((y) => y !== x) : [...xs, x]);
const countBy = (list, key) => { const m = new Map(); for (const x of list) { const k = key(x); if (k != null) m.set(k, (m.get(k) ?? 0) + 1); } return m; };
function passes(p, f, skip) {
  if (skip !== "status" && f.status.length && !f.status.includes(p.status)) return false;
  if (skip !== "sources" && f.sources.length && !f.sources.includes(p.source)) return false;
  if (skip !== "style" && f.style !== "all" && (p.styleId ?? "none") !== f.style) return false;
  if (skip !== "render" && f.render !== "all" && p.render !== f.render) return false;
  if (skip !== "tone" && f.tone !== "all" && p.tone !== f.tone) return false;
  if (skip !== "bands" && f.bands.length && !f.bands.includes(p.band)) return false;
  return true;
}
/** The filter state and what it leaves: { f, set, reset, list, by, dirty }. */
export function useFilters(all, initial = null) {
  const [f, setF] = useState(initial ? { ...F0, ...initial } : F0);
  const list = (all ?? []).filter((p) => passes(p, f));
  const pool = (skip) => (all ?? []).filter((x) => passes(x, f, skip));
  return { f, set: (x) => setF((o) => ({ ...o, ...x })), reset: () => setF(F0), list, dirty: JSON.stringify(f) !== JSON.stringify(F0),
    by: { status: countBy(pool("status"), (x) => x.status), sources: countBy(pool("sources"), (x) => x.source), style: countBy(pool("style"), (x) => x.styleId ?? "none"),
      render: countBy(pool("render"), (x) => x.render), tone: countBy(pool("tone"), (x) => x.tone), bands: countBy(pool("bands"), (x) => x.band) } };
}

export function Facets({ items, flt }) {
  const t = useT();
  const { f, set, by } = flt, all = items.all;
  const [more, setMore] = useState(() => f.render !== "all" || f.tone !== "all" || f.bands.length > 0);
  const row = (key, on, onClick, label, n, sub) => <button key={key} type="button" className={"sgb-opt" + (on ? " on" : "")} role="checkbox" aria-checked={on} onClick={onClick}>
    <span className="sgb-box" aria-hidden="true">{on && <Check size={11} />}</span><span className="l">{label}{sub && <small className="plx-sub">{sub}</small>}</span><span className="n num">{n ?? 0}</span></button>;
  const styleOpts = [...new Map(all.filter((x) => x.style).map((x) => [x.styleId, x.style.title])).entries()].sort((a, b) => a[1].localeCompare(b[1]));
  // an option with nothing under it is not shown (one that is on stays, so it can be turned off)
  const statuses = STATUS.filter(([k]) => by.status.get(k) || f.status.includes(k)), sources = SOURCES.filter(([k]) => by.sources.get(k) || f.sources.includes(k));
  // Era and Tone are OPUSCAR's alone: offered only while OPUSCAR's prompts are in view
  const opuscar = all.some((x) => x.source === "opuscar98" && passes(x, f, "bands") && passes(x, f, "tone"));
  const renders = RENDERS.filter((r) => by.render.get(r) || f.render === r), tones = opuscar ? TONES.filter((r) => by.tone.get(r) || f.tone === r) : [];
  const bands = opuscar ? ERA_BANDS.filter(([k]) => by.bands.get(k) || f.bands.includes(k)) : [];
  const eraTip = (k) => items.eras.filter((e) => ERA_BANDS.find(([b]) => b === k)[2](firstYear(e))).map((e) => `${e.en} (${e.years})`).join(" · ");
  const extra = renders.length > 1 || tones.length > 1 || bands.length > 0;
  return <>
    {statuses.length > 0 && <div className="sgb-fg" role="group" aria-label={t("Status")}><span className="sgb-fl">{t("Status")}</span>
      {statuses.map(([k, l]) => row(k, f.status.includes(k), () => set({ status: toggle(f.status, k) }), t(l), by.status.get(k)))}</div>}
    <div className="sgb-fg" role="group" aria-label={t("Source")}><span className="sgb-fl">{t("Source")}</span>
      {sources.map(([k, l]) => row(k, f.sources.includes(k), () => set({ sources: toggle(f.sources, k) }), k === "opuscar98" ? items.opName : t(l), by.sources.get(k)))}</div>
    <div className="sgb-fg"><label className="sgb-fl" htmlFor="idl-style">{t("Film style")}</label>
      <select id="idl-style" className="select" value={f.style} onChange={(e) => set({ style: e.target.value })}>
        <option value="all">{t("All film styles")}</option>
        {by.style.get("none") > 0 && <option value="none">{t("No film style")} ({by.style.get("none")})</option>}
        {styleOpts.filter(([id]) => by.style.get(id) || f.style === id).map(([id, name]) => <option key={id} value={id}>{name} ({by.style.get(id) ?? 0})</option>)}</select></div>
    {extra && <div className={"sgb-fg idl-more" + (more ? " open" : "")}>
      <button type="button" className="idl-more-btn" aria-expanded={more} onClick={() => setMore((o) => !o)}><SlidersHorizontal size={13} />{t("More filters")}<ChevronDown size={13} className="chev" /></button>
      {more && <div className="idl-more-in">
        {renders.length > 1 && <div className="sgb-fg"><span className="sgb-fl">{t("2D / 3D")}</span><div className="sgb-chips">
          {renders.map((r) => <button key={r} type="button" className="ml-chip" aria-pressed={f.render === r} onClick={() => set({ render: f.render === r ? "all" : r })}>{r}<span className="num">{by.render.get(r) ?? 0}</span></button>)}</div></div>}
        {tones.length > 1 && <div className="sgb-fg"><span className="sgb-fl">{t("Tone")}</span><div className="sgb-chips">
          {tones.map((r) => <button key={r} type="button" className="ml-chip" aria-pressed={f.tone === r} onClick={() => set({ tone: f.tone === r ? "all" : r })}>{t(r)}<span className="num">{by.tone.get(r) ?? 0}</span></button>)}</div></div>}
        {bands.length > 0 && <div className="sgb-fg"><span className="sgb-fl">{t("Era")}</span><div className="sgb-chips">
          {bands.map(([k, l]) => <button key={k} type="button" className="ml-chip" aria-pressed={f.bands.includes(k)} title={eraTip(k)} onClick={() => set({ bands: toggle(f.bands, k) })}>{t(l)}<span className="num">{by.bands.get(k) ?? 0}</span></button>)}</div></div>}
      </div>}</div>}
  </>;
}

/** The filters that are on, as chips above the grid: each one's × turns it off. */
function ActiveFilters({ items, flt }) {
  const t = useT();
  const { f, set } = flt;
  const chips = [
    ...f.status.map((k) => [`st-${k}`, t(STATUS.find(([x]) => x === k)[1]), () => set({ status: f.status.filter((y) => y !== k) })]),
    ...f.sources.map((k) => [`so-${k}`, k === "opuscar98" ? items.opName : t(SOURCES.find(([x]) => x === k)[1]), () => set({ sources: f.sources.filter((y) => y !== k) })]),
    ...(f.style !== "all" ? [["style", f.style === "none" ? t("No film style") : items.all.find((x) => x.styleId === f.style)?.style?.title ?? f.style, () => set({ style: "all" })]] : []),
    ...(f.render !== "all" ? [["render", f.render, () => set({ render: "all" })]] : []),
    ...(f.tone !== "all" ? [["tone", t(f.tone), () => set({ tone: "all" })]] : []),
    ...f.bands.map((k) => [`b-${k}`, t(ERA_BANDS.find(([x]) => x === k)[1]), () => set({ bands: f.bands.filter((y) => y !== k) })]),
  ];
  if (!chips.length) return null;
  return <div className="idl-on" aria-label={t("Filters on")}>{chips.map(([k, l, off]) => <button key={k} type="button" className="chip chip-accent idl-on-chip" onClick={off} aria-label={t("Remove filter {name}", { name: l })}>{l}<X size={12} /></button>)}
    <button type="button" className="btn ghost sm" onClick={flt.reset}>{t("Clear filters")}</button></div>;
}

const STATUS_TONE = { idea: "plain", script: "ok", project: "accent" };
export function StatusTag({ status }) {
  const t = useT();
  if (!status) return null;
  return <span className={"idl-status " + STATUS_TONE[status]}>{t(STATUS.find(([k]) => k === status)[1])}</span>;
}

/** One idea's tile: its picture (the style's, OPUSCAR's frame), or for the user's own its card (title, hook, truth) or the brief. */
export function IdeaCard({ x, on, onPick }) {
  const t = useT();
  return <button type="button" role="option" aria-selected={on} className={"sgb-card idl-card" + (on ? " on" : "") + (x.own ? " own" : "")} onClick={() => onPick(x)}>
    <span className="shot">{x.image ? <img src={x.image} alt="" loading="lazy" decoding="async" />
      : x.own ? (x.card ? <span className="idl-text idl-cardtext"><b className="h">{x.card.hook}</b>{x.card.fields?.[0] && <span className="f">{x.card.fields[0].text}</span>}</span>
        : <span className="idl-text">{x.brief}</span>) : <NoPreview />}
      {x.render && !x.own && <span className="mark">{x.render}</span>}{on && <span className="chk"><Check size={13} /></span>}</span>
    <span className="nm">{x.name}</span>
    <span className="by"><span className="au-tag">{t(TAG[x.source])}</span>{x.status ? <StatusTag status={x.status} /> : x.source !== "sample" && <span className="cat">{x.source === "opuscar98" ? `${x.film} · ${x.year}` : x.style?.title ?? t("No film style")}</span>}</span></button>;
}

/** An idea of mine as sections: the hook, the style's items under their own headings (#1114). */
export function CardBody({ card, open = true }) {
  return <div className="idl-cb">
    <p className="idl-hook">{card.hook}</p>
    {open && card.fields.map((f, i) => <section key={i} className="idl-sec"><h4>{f.label}</h4><FieldText text={f.text} /></section>)}
  </div>;
}
/** A field's text: a list when it is one ("Chapters: a; b; c", or lines), else a short paragraph. */
export function FieldText({ text }) {
  const parts = String(text).split(/\n+|\s*;\s+/).map((s) => s.trim()).filter(Boolean);
  return parts.length > 2 ? <ul className="idl-list">{parts.map((p, i) => <li key={i}>{p}</li>)}</ul> : <p>{text}</p>;
}

/** The idea in hand: picture, name, status and film style, the idea itself, credit, and what can be done with it. */
export function IdeaDetails({ x, actions, note = null }) {
  const t = useT();
  return <>
    {x.image && <div className="sgb-big"><img src={x.image} alt="" /></div>}
    <div className="sgb-head"><h2 className="sgb-title">{x.name}</h2>
      <p className="sgb-sub"><span className="au-tag">{t(TAG[x.source])}</span><StatusTag status={x.status} />{x.card && <Truth truth={x.card.truth} />}
        {x.source === "opuscar98" && <span>{t("Written for {film}", { film: `${x.film} (${x.year})` })}</span>}</p></div>
    <dl className="kv sgb-kv idl-kv"><dt>{t("Film style")}</dt><dd>{x.style?.title ?? t("No film style")}</dd>
      {x.script && <><dt>{t("Script")}</dt><dd>{t("{n} scenes · {w} words · about {s} s", { n: x.script.scenes?.length ?? 1, w: x.script.words, s: x.script.seconds })}</dd></>}
      {x.projects?.length > 0 && <><dt>{t("Films")}</dt><dd className="idl-films">{x.projects.map((p) => <a key={p.id} href={`#/projects/${p.id}`}>{p.title}</a>)}</dd></>}</dl>
    {note}
    {x.card ? <><CardBody card={x.card} />{x.card.sources?.length > 0 && <Sources sources={x.card.sources} />}</> : <div className="plx-prompt">{x.brief}</div>}
    {x.credit && <CreditLine author={x.credit.author} licence={x.credit.licence} link={x.credit.link} commit={x.credit.commit} />}
    <div className="sgb-acts">{actions}</div>
  </>;
}

/** Copy to the clipboard with a toast; true when it worked. */
export const copyText = async (text, toast, t) => { try { await navigator.clipboard.writeText(text); toast(t("Copied")); return true; } catch { toast(t("Could not copy to the clipboard"), "error"); return false; } };
/** Copy that says so on the button itself for a moment (T42-4: the toast alone was missed), the toast as well. */
export function CopyButton({ text, className = "btn", label = "Copy" }) {
  const t = useT();
  const toast = useToast();
  const [done, setDone] = useState(false);
  useEffect(() => { if (!done) return undefined; const h = setTimeout(() => setDone(false), 1600); return () => clearTimeout(h); }, [done]);
  return <button type="button" className={className + (done ? " is-copied" : "")} onClick={async () => { if (await copyText(text, toast, t)) setDone(true); }}>
    {done ? <><Check size={14} />{t("Copied")}</> : <><Copy size={14} />{t(label)}</>}</button>;
}


export const clock = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
/** What Start a project and Copy hand over: an idea with a script gives the narration word for word (the project reads it as the owner's
 *  script: OWN_SCRIPT_RULE), the scenes' pictures as notes for the storyboard, then the idea; an idea with none gives its brief. */
export const briefOf = (x) => {
  const sc = x.script?.scenes ?? [];
  if (!x.script?.text) return x.brief;
  const pics = sc.filter((s) => s.picture).map((s, i) => `${i + 1}. ${clock(s.start)}–${clock(s.end)} · ${s.picture}`);
  return [`Narration (the script, to be read as written):\n${x.script.text}`, pics.length ? `Scenes (picture notes for the storyboard, not words to read):\n${pics.join("\n")}` : null,
    `The idea:\n${x.brief}`].filter(Boolean).join("\n\n");
};
// Start a project: New project opens with this brief and film style (and the idea, so the idea reads "In a project" once the film is
// made); the hand-over survives the route change for this tab only
const START_KEY = "mw-idea-start";
export function startProject(x) {
  try { sessionStorage.setItem(START_KEY, JSON.stringify({ brief: briefOf(x), styleId: x.styleId ?? null, ideaId: x.own ? x.id : null, briefMode: x.script?.text ? "script" : "idea",
    lengthSec: x.script?.lengthSec || x.script?.seconds || x.card?.lengthSec || null, title: x.name ?? "" })); } catch { /* private */ }          // the length asked for (T40-2), the idea's name
  go("/new");
}
/** The idea New project was opened with (once), or null. */
export function takeStartIdea() {
  try { const v = sessionStorage.getItem(START_KEY); sessionStorage.removeItem(START_KEY); return v ? JSON.parse(v) : null; } catch { return null; }
}

/** Start a project from an idea of mine with no script yet (#1111): write the script first (the way it is meant), or start from the idea
 *  (Claude writes the narration in the film's Prepare step). */
export function StartAsk({ x, onScript, onClose }) {
  const t = useT();
  return <Dialog title={t("Start a production from “{title}”", { title: x.name })} onClose={onClose} footer={<><span className="spacer" />
    <button className="btn" onClick={() => { onClose(); startProject(x); }}>{t("Start from the idea")}</button>
    <button className="btn primary" onClick={() => { onClose(); onScript(); }}><FileText size={14} />{t("Write the script first")}</button></>}>
    <div className="dlg-lines"><p>{t("This idea has no script yet.")}</p><p>{t("Write it here first, or let Claude write it in the film's Prepare step.")}</p></div></Dialog>;
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
        <span className="hint">{t("Optional. Start a production picks this style for you.")}</span></label>
    </div>
  </Dialog></div>, document.body);
}

function DeleteIdea({ x, onClose, onDeleted }) {
  const t = useT();
  const toast = useToast();
  return <Dialog title={t("Delete “{title}”?", { title: x.name })} danger onClose={onClose} footer={<><span className="spacer" />
    <button className="btn" onClick={onClose}>{t("Cancel")}</button>
    <button className="btn danger" onClick={async () => { try { await del(`/api/ideas/${x.id}`); toast(t("Deleted “{title}”", { title: x.name })); onDeleted(); } catch (e) { toast(e.message, "error"); } }}><Trash2 size={14} />{t("Delete")}</button></>}>
    <div className="dlg-lines"><p className="dlg-warn">{x.script ? t("“{title}” and its script leave My ideas.", { title: x.name }) : t("“{title}” leaves My ideas.", { title: x.name })}</p><p>{t("Productions started from it keep their brief.")}</p></div></Dialog>;
}

const SEL_KEY = "mw-wr-idea";          // the idea in hand, kept while the app runs (the page is left and opened again: #1115)
const readSel = () => { try { return sessionStorage.getItem(SEL_KEY); } catch { return null; } };
/** The Ideas tab. lib: useIdeas(); scriptRun(id): the script run of that idea, if one runs; onScript(x): Write the script; onOpenScript(x). */
export function IdeasTab({ lib, edit, scriptRun, onScript, onOpenScript, pick: want = null }) {
  const t = useT();
  const toast = useToast();
  const { items, error, reload } = lib;
  const flt = useFilters(items?.all);
  const [cur, setCur] = useState(() => want ?? readSel());
  const [ask, setAsk] = useState(null);            // the idea asked to be deleted
  const [start, setStart] = useState(null);        // an idea of mine with no script, asked how to start
  const [panel, setPanel] = useState(null);        // a narrow window: the filters or the idea over the grid
  const grid = useGalleryGrid({ fewer: 1 }), size = grid.size;
  const [pg, setPg] = useState(0);
  useEffect(() => { setPg(0); }, [flt.f]);
  useEffect(() => { if (want) setCur(want); }, [want]);
  useEffect(() => { try { if (cur) sessionStorage.setItem(SEL_KEY, cur); } catch { /* private */ } }, [cur]);
  const list = flt.list;
  const sel = list.find((x) => x.id === cur) ?? list[0] ?? null;
  // the page of the idea in hand, so a kept idea is on screen when the tab opens
  useEffect(() => { if (!sel || !size) return; const i = list.indexOf(sel); if (i >= 0 && Math.floor(i / size) !== pg && cur === sel.id) setPg(Math.floor(i / size)); }, [sel?.id, size]); // eslint-disable-line react-hooks/exhaustive-deps
  const pickIt = (x) => { setCur(x.id); if (matchMedia("(max-width: 1100px)").matches) setPanel("style"); };
  useEffect(() => { if (!panel) return undefined; const esc = (e) => { if (e.key === "Escape") setPanel(null); }; addEventListener("keydown", esc); return () => removeEventListener("keydown", esc); }, [panel]);
  const run = sel?.own ? scriptRun(sel.id) : null;
  const begin = (x) => (x.own && !x.script ? setStart(x) : startProject(x));
  if (error) return <Banner kind="error" action={<button className="btn sm" onClick={reload}>{t("Retry")}</button>}>{error.message}</Banner>;
  if (!items) return <div className="sgb-layout"><div className="skeleton" /><div className="skeleton" /><div className="skeleton" /></div>;
  return <div className={"sgb-layout" + (panel ? " panel-" + panel : "")}>
    {panel && <div className="sgb-scrim" onClick={() => setPanel(null)} />}
    <aside className="sgb-facets" aria-label={t("Filters")}><Facets items={items} flt={flt} /></aside>
    <section className="sgb-center" aria-label={t("Ideas")}>
      <div className="sgb-bar">
        <button type="button" className="btn sm sgb-filters-btn" onClick={() => setPanel("filters")}><SlidersHorizontal size={13} />{t("Filters")}</button>
        <span className="count num" aria-live="polite">{list.length === items.all.length ? t("{n} ideas", { n: list.length }) : t("{n} of {total} ideas", { n: list.length, total: items.all.length })}</span>
      </div>
      <ActiveFilters items={items} flt={flt} />
      {list.length === 0 && <div className="empty"><p>{flt.f.sources.length === 1 && flt.f.sources[0] === "mine" && !items.mine.length ? t("No ideas of your own yet. Pitch ten in Research, or write one with New idea.") : t("No idea matches.")}</p></div>}
      <div className="sgb-grid idl-grid" role="listbox" aria-label={t("Ideas")} ref={grid.ref} style={grid.style}>
        {list.slice(pg * size, (pg + 1) * size).map((x) => <IdeaCard key={x.id} x={x} on={sel?.id === x.id} onPick={pickIt} />)}
      </div>
      <Pager keep page={pg} size={size} total={list.length} onPage={setPg} />
    </section>
    <aside className="sgb-insp" aria-label={sel ? sel.name : t("Ideas")}>
      {panel === "style" && <BackButton className="insp" onClick={() => setPanel(null)} />}
      {sel ? <div className="insp-in" key={sel.id}><IdeaDetails x={sel}
        note={run && <a className="idl-running" href="#/ideas/research"><span className="dot busy" aria-hidden="true" />{t("Writing the script…")}<span className="go">{t("See progress")}</span></a>}
        actions={<>
          <button type="button" className="btn primary" onClick={() => begin(sel)}><Sparkles size={14} />{t("Start a production")}</button>
          {sel.own && !run && (sel.script ? <button type="button" className="btn" onClick={() => onOpenScript(sel)}><FileText size={14} />{t("Open the script")}</button>
            : <button type="button" className="btn" onClick={() => onScript(sel)}><Lightbulb size={14} />{t("Write the script")}</button>)}
          <CopyButton text={briefOf(sel)} />
          {sel.own && <button type="button" className="btn" onClick={() => edit(sel)}><Pencil size={14} />{t("Edit")}</button>}
          {sel.own && <button type="button" className="btn ghost icon" onClick={() => setAsk(sel)} aria-label={t("Delete {name}", { name: sel.name })} title={t("Delete")}><Trash2 size={15} /></button>}</>} /></div>
        : <p className="hint">{t("Choose an idea to see it here.")}</p>}
    </aside>
    {ask && <DeleteIdea x={ask} onClose={() => setAsk(null)} onDeleted={() => { setAsk(null); setCur(null); reload(); }} />}
    {start && <StartAsk x={start} onClose={() => setStart(null)} onScript={() => onScript(start)} />}
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
  const add = (x) => { onAdd(briefOf(x)); toast(t("Added to the brief")); onClose(); };
  return createPortal(<>
    <div className="scx-scrim" onMouseDown={onClose} />
    <div className={"plx" + (frame ? " framed" : "")} style={frame} role="dialog" aria-modal="true" aria-labelledby="plx-h" ref={box}>
      <div className="dialog-head">
        <BackButton onClick={onClose} />
        <h2 id="plx-h">{t("Writers' Room")}</h2>
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
          <CopyButton text={briefOf(p)} /></>} /></aside>}
      </div>}
    </div>
  </>, document.body);
}
