// Look: the design systems a film can wear, as one list. HyperFrames' 13 frame presets and the user's own
// Looks, each made by uploading a brand guideline (a file or a folder) that the app scans into a frame.md in HF's frame-preset format
// ("Acme guideline" → "Acme Look"). A Look fixes colours, fonts and components; the composition of each shot stays free.
// Laid out like the Style Gallery: the source in a filter column (HyperFrames, Yours, later others), a grid of Looks
// 3-4 rows a page, the Look in hand beside it. Data: the server's /api/looks.
import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Check, FolderOpen, History, Loader2, Pencil, Plus, Search, SlidersHorizontal, Trash2, Upload, X } from "lucide-react";
import { del, get, patch, post, upload, watchJob } from "../api.js";
import { BackButton, Banner, Dialog, NoPreview, Pager, useGalleryGrid } from "../components.jsx";
import { ago, go, useData, usePref, useToast } from "../lib.jsx";
import { useT } from "../i18n.jsx";
import { CreditLine } from "./StyleGallery.jsx";
import { useThemeId } from "../theme.jsx";
import SwatchBooks from "../studio/SwatchBooks.jsx";

// the sources a Look comes from, in this order; a source the server names later shows by its own name
const SOURCES = { hf: ["HyperFrames", "HF"], yours: ["Yours", "YOU"] };
const sourceOf = (l) => l.group ?? "hf";
const OK_FILES = /\.(pdf|pptx|png|jpe?g|webp|gif|svg)$/i;

function Swatches({ colors, big }) {
  if (!colors?.length) return null;
  return <span className={"lk-sw" + (big ? " big" : "")} aria-hidden="true">{(colors ?? []).slice(0, 5).map((c) => <i key={c} style={{ background: c }} />)}</span>;
}

/** The fonts a Look uses, by name (no red tag; New project says it once when a Vietnamese film needs another font). */
function Fonts({ fonts }) {
  const t = useT();
  if (!fonts?.length) return null;
  return <p className="tech-tags">{fonts.map((f) => <span key={f.family} className="tech">{f.family}</span>)}</p>;
}

function LookCard({ l, on, onPick }) {
  const t = useT();
  return <button type="button" className={"sgb-card lk-card" + (on ? " on" : "")} aria-pressed={on} onClick={() => onPick(l)}>
    <span className="shot">{l.preview?.image ? <img src={l.preview.image} alt="" loading="lazy" /> : <span className="lk-noimg"><Swatches colors={l.swatches} big /></span>}
      {l.status === "scanning" && <span className="mark"><Loader2 size={11} className="spin" />{t("Scanning")}</span>}
      {l.status === "failed" && <span className="mark warn"><AlertTriangle size={11} /></span>}
      {on && <span className="chk"><Check size={13} /></span>}</span>
    <span className="nm">{l.title}</span>
    <span className="by"><span className="au-tag">{SOURCES[sourceOf(l)]?.[1] ?? sourceOf(l).slice(0, 4).toUpperCase()}</span><Swatches colors={l.swatches} /></span>
  </button>;
}

/** A kit's description in a short line. HyperFrames' kits share one technical text ("Video-first
 *  companion to X's design.md. The unit is the frame… Atoms are identical and sacred — warm parchment grounds, a single deep indigo ink, …");
 *  the look is its first two "atoms", without their brackets. Any other text: its first sentence, without file names. */
export function lookSummary(desc) {
  const s = String(desc ?? "").replace(/\s+/g, " ").trim();
  if (!s) return "";
  const atoms = /sacred\s*[—–-]\s*(.+)$/i.exec(s)?.[1];
  if (atoms) {
    const parts = []; let depth = 0, cur = "";
    for (const ch of atoms) {
      if (ch === "(") depth++; else if (ch === ")") depth = Math.max(0, depth - 1);
      if ((ch === "," || ch === ".") && depth === 0) { if (cur.trim()) parts.push(cur.trim()); cur = ""; if (ch === "." || parts.length === 2) break; continue; }
      cur += ch;
    }
    if (cur.trim() && parts.length < 2) parts.push(cur.trim());
    const out = parts.slice(0, 2).map((p) => p.replace(/\s*\([^)]*\)/g, "").replace(/^(and|the)\s+/i, "")).filter(Boolean).join(", ");
    if (out) return out[0].toUpperCase() + out.slice(1) + ".";
  }
  const first = (s.match(/^.+?[.!?](\s|$)/)?.[0] ?? s).trim();
  return first.replace(/\s*\b(?:(?:from|in|of|see|per)\s+)?[\w'’-]+\.(md|json|html?|css|js|txt|pdf)\b/gi, "").replace(/\s+([.,])/g, "$1").trim();
}

/** The Look in hand: stills, description, colours, fonts, versions, actions, credit. */
function LookDetails({ id, onChanged, onDeleted }) {
  const t = useT();
  const toast = useToast();
  const d = useData(() => get(`/api/looks/${id}`), [id]);
  const [edit, setEdit] = useState(false);
  const [ask, setAsk] = useState(false);
  const [scan, setScan] = useState(null);           // a scan run again from here: { stage, progress }
  if (d.error) return <Banner kind="error">{d.error.message}</Banner>;
  const l = d.data;
  if (!l) return <div className="skeleton" style={{ height: "20rem" }} />;
  const restore = async (v) => { try { await post(`/api/looks/${id}/versions/${v}/restore`); toast(t("Version {v} restored", { v })); d.reload(); onChanged(); } catch (e) { toast(e.message, "error"); } };
  // a failed or draft Look scans again with the files it has (e.g. after Claude is signed in)
  const rescan = async () => {
    try {
      const r = await post(`/api/looks/${id}/scan`); const j = r.job ?? r; setScan(j);
      watchJob(j.id, (x) => { if (!x) return; setScan(x); if (x.status !== "running") { setScan(null); d.reload(); onChanged(); if (x.status === "failed") toast(x.error?.message ?? t("The scan did not finish."), "error"); } }, 1200);
    } catch (e) { toast(e.message, "error"); }
  };
  const remove = async () => { try { await del(`/api/looks/${id}`); toast(t("Deleted “{title}”", { title: l.title })); onDeleted(); } catch (e) { toast(e.message, "error"); } };
  const stills = l.stills?.length ? l.stills : l.preview?.image ? [l.preview.image] : [];
  return <>
    <div className="sgb-big">{stills[0] ? <img src={stills[0]} alt="" /> : <span className="lk-noimg"><Swatches colors={l.swatches} big /></span>}</div>
    {stills.length > 1 && <div className="lk-stills">{stills.slice(1, 5).map((s) => <img key={s} src={s} alt="" loading="lazy" />)}</div>}
    <div className="sgb-head"><h2 className="sgb-title">{l.title}</h2>
      <p className="sgb-sub"><span className="au-tag">{l.group === "yours" ? t("Yours") : "HF"}</span>{typeof l.version === "number" && <span>{t("version {v}", { v: l.version })}</span>}
        {l.updatedAt && <span>{ago(l.updatedAt)}</span>}</p></div>
    {lookSummary(l.description) && <p className="sgb-desc">{lookSummary(l.description)}</p>}
    {l.status === "failed" && <p className="warn-note"><AlertTriangle size={13} />{t(l.error ?? "The scan did not finish. Upload the guideline again or try another file.")}</p>}
    {scan ? <p className="lk-stage"><Loader2 size={14} className="spin" />{scan.stage ? t(scan.stage) : t("Reading the guideline…")}{scan.progress != null ? ` · ${scan.progress}%` : ""}</p>
      : l.editable && ["failed", "draft"].includes(l.status) && l.files?.length > 0 && <div className="sgb-acts"><button className="btn" onClick={rescan}><Upload size={14} />{t("Scan again")}</button></div>}
    <Swatches colors={l.swatches} big />
    <Fonts fonts={l.fonts} />
    <div className="sgb-acts">
      <button className="btn primary" onClick={() => go(`/new?look=${encodeURIComponent(id)}`)} disabled={l.status !== "ready"}><Plus size={15} />{t("Use in a new project")}</button>
      {l.editable && <button className="btn" onClick={() => setEdit(true)}><Pencil size={14} />{t("Edit")}</button>}
      {l.editable && <button className="btn ghost" onClick={() => setAsk(true)}><Trash2 size={14} />{t("Delete")}</button>}
    </div>
    {l.versions?.length > 1 && <details className="lk-versions"><summary><History size={13} />{t("Versions")} <span className="num">{l.versions.length}</span></summary>
      <ul className="plain">{[...l.versions].reverse().map((x) => <li key={x.v}><b>v{x.v}</b><span className="muted">{ago(x.at)}{x.note ? ` · ${x.note}` : ""}</span>
        {x.v !== l.version && <button className="btn ghost sm" onClick={() => restore(x.v)}>{t("Restore")}</button>}</li>)}</ul></details>}
    {l.group !== "yours" && l.source?.credit && <CreditLine author={l.source.credit.author} licence={l.source.credit.licence} link={l.source.credit.link} commit={l.source.credit.commit} made={l.source.credit.made} />}
    {edit && <EditLook look={l} onClose={() => setEdit(false)} onSaved={() => { setEdit(false); d.reload(); onChanged(); }} />}
    {ask && <Dialog title={t("Delete “{title}”?", { title: l.title })} danger onClose={() => setAsk(false)} footer={<><span className="spacer" />
      <button className="btn" onClick={() => setAsk(false)}>{t("Cancel")}</button><button className="btn danger" onClick={remove}><Trash2 size={14} />{t("Delete")}</button></>}>
      {/* one idea a line, the loss in red */}
      <div className="dlg-lines"><p className="dlg-warn">{t("“{title}” leaves your Brand Kits.", { title: l.title })}</p><p>{t("Projects already made with it keep their copy.")}</p></div></Dialog>}
  </>;
}

/** Edit the user's Look: its name and its frame.md; saving makes a new version. */
function EditLook({ look, onClose, onSaved }) {
  const t = useT();
  const toast = useToast();
  const [title, setTitle] = useState(look.title);
  const [frame, setFrame] = useState(look.frame ?? "");
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    try { await patch(`/api/looks/${look.id}`, { title: title.trim(), frame }); toast(t("Saved as a new version")); onSaved(); }
    catch (e) { toast(e.message, "error"); } finally { setBusy(false); }
  };
  return <Dialog wide title={t("Edit “{title}”", { title: look.title })} onClose={onClose} footer={<><span className="hint">{t("Saving keeps the old version; projects made with it keep theirs.")}</span><span className="spacer" />
    <button className="btn" onClick={onClose}>{t("Cancel")}</button><button className="btn primary" onClick={save} disabled={busy || !title.trim()}><Check size={14} />{t("Save")}</button></>}>
    <label className="field"><span className="label">{t("Name")}</span><input className="input" value={title} onChange={(e) => setTitle(e.target.value)} /></label>
    <label className="field"><span className="label">frame.md</span><textarea className="textarea lk-frame" value={frame} onChange={(e) => setFrame(e.target.value)} spellCheck={false} /></label>
  </Dialog>;
}

/** Make a Look from a guideline: a name, the files (or a folder), then the scan with its stages. */
function CreateLook({ onClose, onDone }) {
  const t = useT();
  const toast = useToast();
  const [title, setTitle] = useState("");
  const [files, setFiles] = useState([]);           // [{ file, progress, status }]
  const [phase, setPhase] = useState(null);         // null | "uploading" | "scanning"
  const [job, setJob] = useState(null);
  const [err, setErr] = useState(null);
  const pickFiles = useRef(null), pickFolder = useRef(null);
  const add = (list) => setFiles((xs) => [...xs, ...[...list].filter((f) => OK_FILES.test(f.name) && !xs.some((x) => x.file.name === f.name && x.file.size === f.size)).map((file) => ({ file, progress: 0, status: "waiting" }))]);
  const skipped = (list) => [...list].filter((f) => !OK_FILES.test(f.name)).length;
  const onDrop = (e) => { e.preventDefault(); const n = skipped(e.dataTransfer.files); add(e.dataTransfer.files); if (n) toast(t("{n} file(s) skipped: only PDF, PPTX and pictures", { n }), "error"); };
  const start = async () => {
    setErr(null); setPhase("uploading");
    try {
      const l = await post("/api/looks", { title: title.trim() });
      for (let i = 0; i < files.length; i++) {
        setFiles((xs) => xs.map((x, j) => (j === i ? { ...x, status: "uploading" } : x)));
        await upload(`/api/looks/${l.id}/files`, files[i].file, (p) => setFiles((xs) => xs.map((x, j) => (j === i ? { ...x, progress: p } : x))));
        setFiles((xs) => xs.map((x, j) => (j === i ? { ...x, status: "done", progress: 1 } : x)));
      }
      setPhase("scanning");
      const j = await post(`/api/looks/${l.id}/scan`);
      setJob(j.job ?? j);
      watchJob((j.job ?? j).id, (x) => {
        if (!x) return;
        setJob(x);
        if (x.status === "done") { toast(t("“{title}” is ready", { title: title.trim() })); onDone(l.id); }
        if (x.status === "failed") { setErr(x.error?.message ?? t("The scan did not finish.")); setPhase(null); }
      }, 1200);
    } catch (e) { setErr(e.message); setPhase(null); }
  };
  const can = !phase && title.trim() && files.length > 0;
  return <Dialog wide title={t("Create a Brand Kit from a guideline")} onClose={() => (phase ? null : onClose())} footer={<><span className="hint">{t("Claude reads the guideline and makes the Brand Kit. Check it before use.")}</span><span className="spacer" />
    <button className="btn" onClick={onClose} disabled={!!phase}>{t("Cancel")}</button>
    <button className="btn primary" onClick={start} disabled={!can}>{phase ? <Loader2 size={14} className="spin" /> : <Upload size={14} />}{t("Make the Brand Kit")}</button></>}>
    <label className="field"><span className="label">{t("Name")}</span><input className="input" spellCheck={false} value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("e.g. Moworks")} disabled={!!phase} autoFocus /></label>
    <div className={"dropzone lk-drop" + (phase ? " busy" : "")} onDragOver={(e) => e.preventDefault()} onDrop={phase ? undefined : onDrop}>
      <Upload size={20} /><div style={{ flex: 1, minWidth: 0 }}><div className="drop-t">{t("Drop the guideline here: files or a folder")}</div>
        <div className="hint">{t("PDF, PPTX and pictures (PNG, JPG, WebP, SVG). Everything stays on this computer.")}</div></div>
      <button type="button" className="btn sm" onClick={() => pickFiles.current?.click()} disabled={!!phase}>{t("Choose files")}</button>
      <button type="button" className="btn sm" onClick={() => pickFolder.current?.click()} disabled={!!phase}><FolderOpen size={14} />{t("Choose a folder")}</button>
      <input ref={pickFiles} type="file" multiple hidden accept=".pdf,.pptx,.png,.jpg,.jpeg,.webp,.gif,.svg" onChange={(e) => { add(e.target.files); e.target.value = ""; }} />
      <input ref={pickFolder} type="file" multiple hidden webkitdirectory="" directory="" onChange={(e) => { const n = skipped(e.target.files); add(e.target.files); if (n) toast(t("{n} file(s) skipped: only PDF, PPTX and pictures", { n }), "error"); e.target.value = ""; }} />
    </div>
    {files.length > 0 && <ul className="plain lk-up">{files.map((x, i) => <li key={x.file.name + i}><span className="nm">{x.file.name}</span>
      <span className="bar"><span style={{ transform: `scaleX(${x.progress})` }} /></span>
      {!phase && <button type="button" className="btn ghost icon sm" onClick={() => setFiles((xs) => xs.filter((_, j) => j !== i))} aria-label={t("Remove")}><X size={13} /></button>}</li>)}</ul>}
    {phase === "scanning" && <p className="lk-stage"><Loader2 size={14} className="spin" />{job?.stage ? t(job.stage) : t("Reading the guideline…")}{job?.progress != null ? ` · ${job.progress}%` : ""}</p>}
    {err && <Banner kind="error">{err}</Banner>}
  </Dialog>;
}

function Box({ on }) { return <span className="sgb-box" aria-hidden="true">{on && <Check size={11} />}</span>; }

export default function Looks() {
  const t = useT();
  const studio = useThemeId() === "studio";
  const q = useData(() => get("/api/looks"), []);
  const [cur, setCur] = usePref("looks:current", null);
  const [src, setSrc] = usePref("looks:sources", []);          // the sources ticked in the filter column; none: every Look
  const [qs, setQs] = useState("");
  const [make, setMake] = useState(false);
  const [panel, setPanel] = useState(null);          // narrow window: "filters" or "style" (the Look) over the grid
  const looks = q.data?.looks ?? [];
  useEffect(() => { if (!looks.some((l) => l.status === "scanning")) return undefined; const h = setInterval(q.reload, 3000); return () => clearInterval(h); }, [looks]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!panel) return undefined; const esc = (e) => { if (e.key === "Escape") setPanel(null); }; addEventListener("keydown", esc); return () => removeEventListener("keydown", esc); }, [panel]);
  // the sources with Looks in them (an empty "Yours" stays out of the column), HyperFrames first
  const sources = useMemo(() => { const n = new Map(); for (const l of looks) n.set(sourceOf(l), (n.get(sourceOf(l)) ?? 0) + 1);
    return [...n].sort((a, b) => (Object.keys(SOURCES).indexOf(a[0]) + 1 || 99) - (Object.keys(SOURCES).indexOf(b[0]) + 1 || 99)); }, [looks]);
  const on = src.filter((s) => sources.some(([x]) => x === s));
  const list = useMemo(() => looks.filter((l) => (!on.length || on.includes(sourceOf(l)))
    && (!qs || qs.toLowerCase().split(/\s+/).every((w) => [l.title, l.description, ...(l.fonts ?? []).map((f) => f.family)].join(" ").toLowerCase().includes(w)))), [looks, on.join(), qs]); // eslint-disable-line react-hooks/exhaustive-deps
  const sel = list.find((l) => l.id === cur) ?? list[0] ?? null;
  // 3 rows a page; a new filter starts at page 1, a new page size (or the first visit) shows the Look in hand
  const grid = useGalleryGrid(), size = grid.size;
  const [pg, setPg] = useState(0);
  useEffect(() => { setPg(0); }, [on.join(), qs]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { setPg(Math.max(0, Math.floor(list.findIndex((l) => l.id === sel?.id) / size))); }, [size, !!q.data]); // eslint-disable-line react-hooks/exhaustive-deps
  const pick = (l) => { setCur(l.id); if (matchMedia("(max-width: 1100px)").matches) setPanel("style"); };
  const label = (s) => t(SOURCES[s]?.[0] ?? s);
  const pills = [...on.map((s) => [label(s), () => setSrc(on.filter((x) => x !== s))]), ...(qs ? [[`“${qs}”`, () => setQs("")]] : [])];
  const clear = () => { setSrc([]); setQs(""); };
  // The Studio: the same state and data, as swatch books on shelves by source (studio/SwatchBooks.jsx)
  if (studio) return <SwatchBooks looks={looks} list={list} sources={sources} on={on} setSrc={setSrc} qs={qs} setQs={setQs} sel={sel} onPick={(l) => setCur(l.id)} label={label}
    tagOf={(s) => SOURCES[s]?.[1] ?? s.slice(0, 4).toUpperCase()} error={q.error} loading={!q.data && !q.error} onReload={q.reload} onCreate={() => setMake(true)}
    details={(l) => <LookDetails id={l.id} onChanged={q.reload} onDeleted={() => { setCur(null); q.reload(); }} />}
    dialogs={make && <CreateLook onClose={() => setMake(false)} onDone={(id) => { setMake(false); setCur(id); q.reload(); }} />} />;
  return <div className="page lk-page gal-page">
    <div className="page-head"><div><BackButton /><h1>{t("Brand Kits")}</h1><p className="lead">{t("A brand's colours, fonts and components, worn by a whole film. Make one from a brand guideline.")}</p></div>
      <div className="actions"><button className="btn primary" onClick={() => setMake(true)}><Upload size={15} />{t("Create a Brand Kit from a guideline")}</button></div></div>
    {q.error?.status === 404 ? <div className="empty"><p>{t("Brand Kits are not available on this computer yet.")}</p></div>
      : q.error && <Banner kind="error" action={<button className="btn sm" onClick={q.reload}>{t("Retry")}</button>}>{q.error.message}</Banner>}
    {!q.data && !q.error ? <div className="sgb-layout"><div className="skeleton" /><div className="skeleton" /><div className="skeleton" /></div> : q.data && <div className={"sgb-layout" + (panel ? " panel-" + panel : "")}>
      {panel && <div className="sgb-scrim" onClick={() => setPanel(null)} />}
      <aside className="sgb-facets" aria-label={t("Filters")}>
        <div className="search"><Search size={14} /><input className="input" placeholder={t("Search Brand Kits")} value={qs} onChange={(e) => setQs(e.target.value)} aria-label={t("Search Brand Kits")} /></div>
        <div className="sgb-fg" role="group" aria-label={t("Source")}><span className="sgb-fl">{t("Source")}</span>
          {sources.map(([s, n]) => { const x = on.includes(s); return <button key={s} type="button" className={"sgb-opt" + (x ? " on" : "")} role="checkbox" aria-checked={x}
            onClick={() => setSrc(x ? on.filter((y) => y !== s) : [...on, s])}><Box on={x} /><span className="l">{label(s)}</span>
            <span className="au-tag">{SOURCES[s]?.[1] ?? s.slice(0, 4).toUpperCase()}</span><span className="n num">{n}</span></button>; })}</div>
      </aside>
      <section className="sgb-center" aria-label={t("Brand Kits")}>
        <div className="sgb-bar">
          <button type="button" className="btn sm sgb-filters-btn" onClick={() => setPanel("filters")}><SlidersHorizontal size={13} />{t("Filters")}{pills.length > 0 && <span className="num"> · {pills.length}</span>}</button>
          <span className="count num" aria-live="polite">{list.length === looks.length ? t("{n} Brand Kits", { n: looks.length }) : t("{n} of {total} Brand Kits", { n: list.length, total: looks.length })}</span>
          {pills.map(([l, off], i) => <button key={i} type="button" className="sgb-pill" onClick={off} aria-label={t("Remove filter {name}", { name: l })}>{l}<X size={12} /></button>)}
          {pills.length > 0 && <button type="button" className="btn ghost sm" onClick={clear}>{t("Clear filters")}</button>}
        </div>
        {list.length === 0 && <div className="empty"><p>{t("No Brand Kit matches.")}</p>{pills.length > 0 && <button className="btn" onClick={clear}>{t("Clear filters")}</button>}</div>}
        <div className="sgb-grid" ref={grid.ref} style={grid.style}>{list.slice(pg * size, (pg + 1) * size).map((l) => <LookCard key={l.id} l={l} on={sel?.id === l.id} onPick={pick} />)}</div>
        <Pager keep page={pg} size={size} total={list.length} onPage={setPg} />
      </section>
      <aside className="sgb-insp" aria-label={sel ? sel.title : t("Brand Kit")}>
        {panel === "style" && <BackButton className="insp" onClick={() => setPanel(null)} />}
        {sel ? <div className="insp-in" key={sel.id}><LookDetails id={sel.id} onChanged={q.reload} onDeleted={() => { setCur(null); q.reload(); }} /></div> : <p className="hint">{t("Choose a Brand Kit to see it here.")}</p>}
      </aside>
    </div>}
    {make && <CreateLook onClose={() => setMake(false)} onDone={(id) => { setMake(false); setCur(id); q.reload(); }} />}
  </div>;
}
