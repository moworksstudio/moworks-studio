// Look: the design systems a film can wear, as one list. HyperFrames' 13 frame presets and the user's own
// Looks, each made by uploading a brand guideline (a file or a folder) that the app scans into a frame.md in HF's frame-preset format
// ("Acme guideline" → "Acme Look"). A Look fixes colours, fonts and components; the composition of each shot stays free.
// Laid out like the Style Gallery: the source in a filter column (HyperFrames, Yours, later others) and a grid of Looks
// 3-4 rows a page; a click opens the kit's own page (BrandKit.jsx). Data: the server's /api/looks.
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, BookOpen, Check, FolderOpen, Loader2, Plus, Search, SlidersHorizontal, Upload, X } from "lucide-react";
import { get, patch, post, upload, watchJob } from "../api.js";
import { BackButton, Banner, Dialog, Pager, useGalleryGrid } from "../components.jsx";
import { ago, go, madeOn, sameNameLabels, useData, usePref, useToast } from "../lib.jsx";
import { useT } from "../i18n.jsx";
import { useThemeId } from "../theme.jsx";
import SwatchBooks from "../studio/SwatchBooks.jsx";

// a kit's own page (colours, fonts, layout, rules, the guideline's pages): loaded when one is opened
const BrandKit = lazy(() => import("./BrandKit.jsx"));

// the sources a Look comes from, in this order; a source the server names later shows by its own name
const SOURCES = { hf: ["HyperFrames", "HF"], yours: ["Yours", "YOU"] };
const sourceOf = (l) => l.group ?? "hf";
// the same lists as packages/looks-library/custom.mjs (ACCEPT, MAX_FILES, SYSTEM_FILE)
const OK_FILES = /\.(pdf|pptx|png|jpe?g|webp|gif|svg|ttf|otf|woff2?|zip|rar|7z|ai|psd|psb)$/i;
export const ACCEPT_ATTR = ".pdf,.pptx,.png,.jpg,.jpeg,.webp,.gif,.svg,.ttf,.otf,.woff,.woff2,.zip,.rar,.7z,.ai,.psd,.psb";
const MAX_FILES = 300;
const SYSTEM_FILE = /^(desktop\.ini|thumbs\.db|ehthumbs\.db|\.ds_store|\._.*|~\$.*)$/i;
const baseName = (n) => n.replace(/\.[^.]+$/, "").toLowerCase();

/** What a pick of files comes to, against the files the kit already takes (names, sizes). take: the files, each under the name it is
 *  uploaded with: one of a name another file has, with other bytes (two folders' logo.png), takes its folder's name, so neither is lost;
 *  the same name and size is one file. leftOut: the names not taken. Windows' and a Mac's own files, and an .eot beside the same font in
 *  a format the kit reads, go without a word. */
export function sortPicked(list, have = [], room = MAX_FILES) {
  const picked = [...list], fonts = new Set(picked.filter((f) => OK_FILES.test(f.name)).map((f) => baseName(f.name)));
  const taken = [...have], take = [], leftOut = [];
  for (const f of picked) {
    if (SYSTEM_FILE.test(f.name) || (/\.eot$/i.test(f.name) && fonts.has(baseName(f.name)))) continue;
    if (!OK_FILES.test(f.name)) { leftOut.push(f.name); continue; }
    if (taken.some((x) => x.name === f.name && x.size === f.size)) continue;
    let name = f.name;
    if (taken.some((x) => x.name === name)) {
      const folder = String(f.webkitRelativePath ?? "").split("/").slice(-2, -1)[0];
      const ext = f.name.match(/\.[^.]+$/)?.[0] ?? "", stem = f.name.slice(0, f.name.length - ext.length);
      if (folder) name = `${folder} ${f.name}`;
      for (let i = 2; taken.some((x) => x.name === name); i++) name = `${stem} (${i})${ext}`;
    }
    if (taken.length >= room) { leftOut.push(f.name); continue; }
    taken.push({ name, size: f.size });
    take.push({ file: f, name });
  }
  return { take, leftOut };
}

/** The picked files that are not taken, by name; the kit's panel keeps them too (with the reason). */
function LeftOut({ names }) {
  const t = useT();
  if (!names.length) return null;
  return <div className="warn-note lk-unread"><AlertTriangle size={13} /><div className="lk-unread-in">
    <p className="lk-unread-t">{t("{n} file(s) left out", { n: names.length })}</p>
    <ul className="plain">{names.map((n) => <li key={n}><span className="nm">{n}</span></li>)}</ul></div></div>;
}

/** What the kit could not read or did not take, each with its reason. Remove one the kit does not need; a copy it can read is added here. */
export function UnreadFiles({ look, onRemove, onAdd, busy }) {
  const t = useT();
  const pick = useRef(null);
  return <div className="warn-note lk-unread" role="status"><AlertTriangle size={13} /><div className="lk-unread-in">
    <p className="lk-unread-t">{t("{n} file(s) not read", { n: look.unread.length })}</p>
    <ul className="plain">{look.unread.map((x) => <li key={x.name}><span className="nm">{x.name}</span><span className="why">{t(x.reason)}</span>
      {look.editable && <button type="button" className="btn ghost icon sm" onClick={() => onRemove(x.name)} disabled={busy} aria-label={t("Remove {name} from this Brand Kit", { name: x.name })} title={t("Remove from this Brand Kit")}><X size={13} /></button>}</li>)}</ul>
    {look.editable && <><button type="button" className="btn sm" onClick={() => pick.current?.click()} disabled={busy}><Plus size={14} />{t("Add files and scan again")}</button>
      <input ref={pick} type="file" multiple hidden accept={ACCEPT_ATTR} onChange={(e) => { onAdd([...e.target.files]); e.target.value = ""; }} /></>}
  </div></div>;
}

/** A PDF with a password stopped the scan before Claude was asked: a copy without one is the user's to give, or the scan goes on without it. */
export function LockedDialog({ names, canGoOn, onAdd, onGoOn, onClose }) {
  const t = useT();
  const pick = useRef(null);
  return <Dialog wide danger title={t(names.length > 1 ? "These files have a password" : "This file has a password")} onClose={onClose} footer={<><span className="spacer" />
    <button className="btn" onClick={onClose}>{t("Not now")}</button>
    {canGoOn && <button className="btn" onClick={onGoOn}>{t("Scan without it")}</button>}
    <button className="btn primary" onClick={() => pick.current?.click()}><Upload size={14} />{t("Add a copy without a password")}</button>
    <input ref={pick} type="file" multiple hidden accept={ACCEPT_ATTR} onChange={(e) => { onAdd([...e.target.files]); e.target.value = ""; }} /></>}>
    <div className="dlg-lines"><ul className="plain">{names.map((n) => <li key={n}><b>{n}</b></li>)}</ul>
      <p className="dlg-warn">{t("Claude cannot read it, so its rules would be missing from this Brand Kit.")}</p>
      <p>{t("Claude has not started. Nothing was used.")}</p></div></Dialog>;
}

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

function LookCard({ l, made, onPick }) {
  const t = useT();
  return <button type="button" className="sgb-card lk-card" onClick={() => onPick(l)}>
    <span className="shot">{l.preview?.image ? <img src={l.preview.image} alt="" loading="lazy" /> : <span className="lk-noimg"><Swatches colors={l.swatches} big /></span>}
      {l.status === "scanning" && <span className="mark"><Loader2 size={11} className="spin" />{t("Scanning")}</span>}
      {(l.status === "failed" || (l.status === "ready" && l.unread?.length > 0)) && <span className="mark warn" title={l.unread?.length ? t("{n} file(s) not read", { n: l.unread.length }) : undefined}><AlertTriangle size={11} /></span>}
      </span>
    <span className="nm">{l.title}</span>
    <span className="by"><span className="au-tag">{SOURCES[sourceOf(l)]?.[1] ?? sourceOf(l).slice(0, 4).toUpperCase()}</span>{made ? <span className="cat">{made}</span> : <Swatches colors={l.swatches} />}</span>
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
  return first.replace(/\s*\b(?:(?:from|in|of|see|per)\s+)?[\w'’-]+\.(md|json|html?|css|js|txt|pdf)\b/gi, "").replace(/\s*\(\s*\)/g, "").replace(/\s+([.,])/g, "$1").trim();
}

/** The Studio's book on the table: what it is at a glance; the book opens on its own page. */
function KitOnTable({ id }) {
  const t = useT();
  const d = useData(() => get(`/api/looks/${id}`), [id]);
  if (d.error) return <Banner kind="error">{d.error.message}</Banner>;
  const l = d.data;
  if (!l) return <div className="skeleton" style={{ height: "20rem" }} />;
  const stills = l.stills?.length ? l.stills : l.preview?.image ? [l.preview.image] : [];
  return <>
    <div className="sgb-big">{stills[0] ? <img src={stills[0]} alt="" /> : <span className="lk-noimg"><Swatches colors={l.swatches} big /></span>}</div>
    {stills.length > 1 && <div className="lk-stills">{stills.slice(1, 5).map((s) => <img key={s} src={s} alt="" loading="lazy" />)}</div>}
    <div className="sgb-head"><h2 className="sgb-title">{l.title}</h2>
      <p className="sgb-sub"><span className="au-tag">{l.group === "yours" ? t("Yours") : "HF"}</span>{l.createdAt && <span>{t("made {date}", { date: madeOn(l.createdAt) })}</span>}
        {l.updatedAt && <span>{ago(l.updatedAt)}</span>}</p></div>
    {lookSummary(l.description) && <p className="sgb-desc">{lookSummary(l.description)}</p>}
    {(l.status === "failed" || l.unread?.length > 0 || (l.editable && l.status === "ready" && l.gaps?.length > 0)) && <p className="warn-note"><AlertTriangle size={13} />{t("This kit needs a look: open it.")}</p>}
    <Swatches colors={l.swatches} big />
    <Fonts fonts={l.fonts} />
    <div className="sgb-acts">
      <button className="btn primary" onClick={() => go(`/looks/${id}`)}><BookOpen size={15} />{t("Open this Brand Kit")}</button>
      <button className="btn" onClick={() => go(`/new?look=${encodeURIComponent(id)}`)} disabled={l.status !== "ready"}><Plus size={15} />{t("Use in a new project")}</button>
    </div>
  </>;
}

/** Make a Look from a guideline: a name, the files (or a folder), then the scan with its stages. from: a kit of the user's: this is its new version, a kit of its own of the
 *  same name (the name can change); new files are scanned, with what is kept of the old kit's; no new files make a plain copy, with no Claude run. */
export function CreateLook({ onClose, onDone, from = null }) {
  const t = useT();
  const toast = useToast();
  const [title, setTitle] = useState(from?.title ?? "");
  const [keepAssets, setKeepAssets] = useState(true), [keepGuide, setKeepGuide] = useState(false);
  const [files, setFiles] = useState([]);           // [{ file, name, progress, status }]
  const [left, setLeft] = useState([]);             // the names of what was picked and not taken
  const [phase, setPhase] = useState(null);         // null | "uploading" | "scanning"
  const [job, setJob] = useState(null);
  const [err, setErr] = useState(null);
  const pickFiles = useRef(null), pickFolder = useRef(null);
  const add = (list) => {
    const { take, leftOut } = sortPicked(list, files.map((x) => ({ name: x.name, size: x.file.size })));
    setFiles((xs) => [...xs, ...take.map(({ file, name }) => ({ file, name, progress: 0, status: "waiting" }))]);
    setLeft((xs) => [...new Set([...xs, ...leftOut])]);
  };
  const onDrop = (e) => { e.preventDefault(); add(e.dataTransfer.files); };
  const start = async () => {
    setErr(null); setPhase("uploading");
    try {
      if (from && !files.length) {
        const c = await post(`/api/looks/${from.id}/new-version`, { title: title.trim(), keep: "all" });
        toast(t("New version made. The one before stays as it was."));
        onDone(c.id);
        return;
      }
      const l = from ? await post(`/api/looks/${from.id}/new-version`, { title: title.trim(), blank: true, keep: keepAssets && keepGuide ? "all" : keepAssets ? "assets" : keepGuide ? "guideline" : "none" })
        : await post("/api/looks", { title: title.trim(), leftOut: left });
      if (from && left.length) await patch(`/api/looks/${l.id}`, { leftOut: left });
      for (let i = 0; i < files.length; i++) {
        setFiles((xs) => xs.map((x, j) => (j === i ? { ...x, status: "uploading" } : x)));
        await upload(`/api/looks/${l.id}/files`, new File([files[i].file], files[i].name), (p) => setFiles((xs) => xs.map((x, j) => (j === i ? { ...x, progress: p } : x))));
        setFiles((xs) => xs.map((x, j) => (j === i ? { ...x, status: "done", progress: 1 } : x)));
      }
      setPhase("scanning");
      const j = await post(`/api/looks/${l.id}/scan`);
      setJob(j.job ?? j);
      watchJob((j.job ?? j).id, (x) => {
        if (!x) return;
        setJob(x);
        if (x.status === "done" && x.result?.stopped === "locked") { onDone(l.id, true); return; }          // the kit's panel opens with the popup
        if (x.status === "done") { const n = x.result?.unread?.length ?? 0; toast(n ? t("“{title}” is ready, {n} file(s) not read", { title: title.trim(), n }) : t("“{title}” is ready", { title: title.trim() })); onDone(l.id); }
        if (x.status === "failed") { setErr(x.error?.message ?? t("The scan did not finish.")); setPhase(null); }
      }, 1200);
    } catch (e) { setErr(e.message); setPhase(null); }
  };
  const can = !phase && title.trim() && (from || files.length > 0);
  const old = from?.files ?? [], oldGuide = old.filter((f) => ["pdf", "pptx"].includes(f.kind)).length, oldAssets = old.length - oldGuide;
  return <Dialog wide title={from ? t("New version of “{title}”", { title: from.title }) : t("Create a Brand Kit from a guideline")} onClose={() => (phase ? null : onClose())} footer={<><span className="hint">{from && !files.length ? t("No new files: a plain copy to change by hand.") : t("Claude reads the guideline and makes the Brand Kit. Check it before use.")}</span><span className="spacer" />
    <button className="btn" onClick={onClose} disabled={!!phase}>{t("Cancel")}</button>
    <button className="btn primary" onClick={start} disabled={!can}>{phase ? <Loader2 size={14} className="spin" /> : <Upload size={14} />}{from ? t("Make the new version") : t("Make the Brand Kit")}</button></>}>
    {from && <p className="bk-keepnote">{t("“{title}” stays as it is, and films can still use it.", { title: from.title })}</p>}
    <label className="field"><span className="label">{t("Name")}</span><input className="input" spellCheck={false} value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("e.g. Moworks")} disabled={!!phase} autoFocus /></label>
    <div className={"dropzone lk-drop" + (phase ? " busy" : "")} onDragOver={(e) => e.preventDefault()} onDrop={phase ? undefined : onDrop}>
      <Upload size={20} /><div style={{ flex: 1, minWidth: 0 }}><div className="drop-t">{t("Drop the guideline here: files or a folder")}</div>
        <div className="hint">{t("PDF, PPTX, pictures, fonts, AI, PSD and ZIP. Everything stays on this computer.")}</div></div>
      <button type="button" className="btn sm" onClick={() => pickFiles.current?.click()} disabled={!!phase}>{t("Choose files")}</button>
      <button type="button" className="btn sm" onClick={() => pickFolder.current?.click()} disabled={!!phase}><FolderOpen size={14} />{t("Choose a folder")}</button>
      <input ref={pickFiles} type="file" multiple hidden accept={ACCEPT_ATTR} onChange={(e) => { add(e.target.files); e.target.value = ""; }} />
      <input ref={pickFolder} type="file" multiple hidden webkitdirectory="" directory="" onChange={(e) => { add(e.target.files); e.target.value = ""; }} />
    </div>
    {files.length > 0 && <ul className="plain lk-up">{files.map((x, i) => <li key={x.name + i}><span className="nm">{x.name}</span>
      <span className="bar"><span style={{ transform: `scaleX(${x.progress})` }} /></span>
      {!phase && <button type="button" className="btn ghost icon sm" onClick={() => setFiles((xs) => xs.filter((_, j) => j !== i))} aria-label={t("Remove")}><X size={13} /></button>}</li>)}</ul>}
    <LeftOut names={left} />
    {from && files.length > 0 && old.length > 0 && <div className="bk-keep">
      {oldAssets > 0 && <label className="bk-check"><input type="checkbox" checked={keepAssets} disabled={!!phase} onChange={(e) => setKeepAssets(e.target.checked)} />{t("Keep its fonts and logos ({n} files)", { n: oldAssets })}</label>}
      {oldGuide > 0 && <label className="bk-check"><input type="checkbox" checked={keepGuide} disabled={!!phase} onChange={(e) => setKeepGuide(e.target.checked)} />{t("Keep its old guideline too ({n} files)", { n: oldGuide })}</label>}</div>}
    {phase === "scanning" && <p className="lk-stage"><Loader2 size={14} className="spin" />{job?.stage ? t(job.stage) : t("Reading the guideline…")}{job?.progress != null ? ` · ${job.progress}%` : ""}</p>}
    {err && <Banner kind="error">{err}</Banner>}
  </Dialog>;
}

function Box({ on }) { return <span className="sgb-box" aria-hidden="true">{on && <Check size={11} />}</span>; }

export default function Looks({ kitId = null }) {
  const t = useT();
  const studio = useThemeId() === "studio";
  const q = useData(() => get("/api/looks"), []);
  const [cur, setCur] = usePref("looks:current", null);
  const [src, setSrc] = usePref("looks:sources", []);          // the sources ticked in the filter column; none: every Look
  const [qs, setQs] = useState("");
  const [make, setMake] = useState(false);
  const [askLocked, setAskLocked] = useState(null);          // the kit just made whose scan stopped on a password
  const created = (id, locked = false) => { setMake(false); setCur(id); setAskLocked(locked ? id : null); q.reload(); go(`/looks/${id}`); };
  const [panel, setPanel] = useState(null);          // narrow window: "filters" over the grid
  const looks = q.data?.looks ?? [];
  useEffect(() => { if (!looks.some((l) => l.status === "scanning")) return undefined; const h = setInterval(q.reload, 3000); return () => clearInterval(h); }, [looks]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!panel) return undefined; const esc = (e) => { if (e.key === "Escape") setPanel(null); }; addEventListener("keydown", esc); return () => removeEventListener("keydown", esc); }, [panel]);
  // the sources with Looks in them (an empty "Yours" stays out of the column), HyperFrames first
  const sources = useMemo(() => { const n = new Map(); for (const l of looks) n.set(sourceOf(l), (n.get(sourceOf(l)) ?? 0) + 1);
    return [...n].sort((a, b) => (Object.keys(SOURCES).indexOf(a[0]) + 1 || 99) - (Object.keys(SOURCES).indexOf(b[0]) + 1 || 99)); }, [looks]);
  const same = useMemo(() => sameNameLabels(looks), [looks]);
  const on = src.filter((s) => sources.some(([x]) => x === s));
  const list = useMemo(() => looks.filter((l) => (!on.length || on.includes(sourceOf(l)))
    && (!qs || qs.toLowerCase().split(/\s+/).every((w) => [l.title, l.description, ...(l.fonts ?? []).map((f) => f.family)].join(" ").toLowerCase().includes(w)))), [looks, on.join(), qs]); // eslint-disable-line react-hooks/exhaustive-deps
  const sel = list.find((l) => l.id === cur) ?? list[0] ?? null;
  // 3 rows a page; a new filter starts at page 1, a new page size (or the first visit) shows the Look in hand
  const grid = useGalleryGrid(), size = grid.size;
  const [pg, setPg] = useState(0);
  useEffect(() => { setPg(0); }, [on.join(), qs]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { setPg(Math.max(0, Math.floor(list.findIndex((l) => l.id === sel?.id) / size))); }, [size, !!q.data]); // eslint-disable-line react-hooks/exhaustive-deps
  const pick = (l) => { setCur(l.id); go(`/looks/${l.id}`); };
  const label = (s) => t(SOURCES[s]?.[0] ?? s);
  const pills = [...on.map((s) => [label(s), () => setSrc(on.filter((x) => x !== s))]), ...(qs ? [[`“${qs}”`, () => setQs("")]] : [])];
  const clear = () => { setSrc([]); setQs(""); };
  if (kitId) return <Suspense fallback={<div className={studio ? "st-room" : "page"}><div className="skeleton" style={{ height: "24rem" }} /></div>}>
    <BrandKit key={kitId} id={kitId} askLocked={askLocked === kitId} onChanged={q.reload} onCreated={created} onDeleted={() => { setCur(null); q.reload(); }} /></Suspense>;
  // The Studio: the same state and data, as swatch books on shelves by source (studio/SwatchBooks.jsx)
  if (studio) return <SwatchBooks looks={looks} list={list} sources={sources} on={on} setSrc={setSrc} qs={qs} setQs={setQs} sel={sel} onPick={(l) => setCur(l.id)} onOpen={(l) => go(`/looks/${l.id}`)} madeOf={(l) => same.get(l.id)} label={label}
    tagOf={(s) => SOURCES[s]?.[1] ?? s.slice(0, 4).toUpperCase()} error={q.error} loading={!q.data && !q.error} onReload={q.reload} onCreate={() => setMake(true)}
    details={(l) => <KitOnTable id={l.id} />}
    dialogs={make && <CreateLook onClose={() => setMake(false)} onDone={created} />} />;
  return <div className="page lk-page gal-page">
    <div className="page-head"><div><BackButton /><h1>{t("Brand Kits")}</h1><p className="lead">{t("A brand's colours, fonts and components, worn by a whole film. Make one from a brand guideline.")}</p></div>
      <div className="actions"><button className="btn primary" onClick={() => setMake(true)}><Upload size={15} />{t("Create a Brand Kit from a guideline")}</button></div></div>
    {q.error?.status === 404 ? <div className="empty"><p>{t("Brand Kits are not available on this computer yet.")}</p></div>
      : q.error && <Banner kind="error" action={<button className="btn sm" onClick={q.reload}>{t("Retry")}</button>}>{q.error.message}</Banner>}
    {!q.data && !q.error ? <div className="sgb-layout lk-layout"><div className="skeleton" /><div className="skeleton" /></div> : q.data && <div className={"sgb-layout lk-layout" + (panel ? " panel-" + panel : "")}>
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
        <div className="sgb-grid" ref={grid.ref} style={grid.style}>{list.slice(pg * size, (pg + 1) * size).map((l) => <LookCard key={l.id} l={l} made={same.get(l.id)} onPick={pick} />)}</div>
        <Pager keep page={pg} size={size} total={list.length} onPage={setPg} />
      </section>
    </div>}
    {make && <CreateLook onClose={() => setMake(false)} onDone={created} />}
  </div>;
}
