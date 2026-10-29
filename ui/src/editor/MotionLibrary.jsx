// Motion Library: the whole library, arranged author first. Rows: Author (HyperFrames first,
// empty places for the authors to come), Type (that author's Motions / Blocks, kept apart), Category, then
// search and favourites / recent, then pages of cards (columns follow the width). A card shows the preview and the name; the video
// plays while the pointer is on it; the description, the Vietnamese note and the credit open from the (i) button. Copy / Add hands the
// full item and its text to the caller (the Claude panel inserts it, the library page puts it on the clipboard). One API: /api/library.
// The page is laid out like the Style Gallery: the filters in a column, a grid of tiles 3-4 rows a page with the page
// picker centred under it, and the item in hand beside it. The panel (the Editor's Claude column, Motion Plan) keeps its chip rows.
// The page shows a fourth type, Vocabulary (Motion Prompt by Shohei Ohtaki): names and numbers for Claude, not motions that
// run, so the panel never lists them. Its preview is the author's own Canvas sample (card.canvas.page), still at 2 s, running under the pointer.
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, ArchiveRestore, BookOpenText, Blocks, Check, CheckCircle2, Clapperboard, Clock, Copy, Download, ExternalLink, Heart, Info, LayoutGrid, Library, Loader2, Maximize2, Minimize2, RotateCcw, Search, Shapes, SlidersHorizontal, Tag, Trash2, UserRound, Wand2, Wind, X } from "lucide-react";
import { get, post, watchJob } from "../api.js";
import { BackButton, Dialog, NoPreview, Pager, useGalleryGrid } from "../components.jsx";
import { ago, usePref, useToast } from "../lib.jsx";
import { useT } from "../i18n.jsx";
import { authorTag, CreditLine } from "../screens/StyleGallery.jsx";

const SOON = 3;                         // author places waiting for the next imports (about three more authors expected)
// labels are English keys for t(); category names come from the library and are looked up too (unknown ones stay as they are)
// motions and blocks only; HyperFrames' Looks have their own page
const KINDS = [["motion", "Motions", Wind], ["block", "Blocks", Blocks]];
const PAGE_KINDS = [...KINDS, ["vocab", "Vocabulary", BookOpenText]];          // the page only: words for Claude, not runnable
const KIND_ONE = { motion: "Motion", block: "Block", look: "Look", vocab: "Vocabulary" };
/** The author's Canvas sample of a Vocabulary item, as its page in a frame: `still` stands at 2 s, else it runs. */
function CanvasSample({ c, title, still, className = "" }) {
  return <iframe className={"ml-canvas " + className} src={c.page + (still ? "?t=2" : "")} title={title} loading="lazy" tabIndex={-1}
    style={{ aspectRatio: `${c.w ?? 539} / ${c.h ?? 208}` }} sandbox="allow-scripts" />;
}
const VI = { ok: ["Vietnamese OK", "ok"], mixed: ["Tone marks fall back to another font", "warn"], missing: ["Font has no Vietnamese letters", "bad"], unknown: ["Font not checked (system font)", "warn"] };
/** Favourites and recent saved before the library was regrouped used bare ids: give them their source. */
const uidOf = (id) => (id.includes(":") ? id : `hf:${id}`);          // the retired kit's group is no longer in the Library: an old kit id finds nothing and is skipped
// the author as a short tag, like the Style Gallery's
const TAGS = { HyperFrames: "HF", Moworks: "MW", "Magic UI": "MUI", "anime.js": "AJS", "claude-animation": "CA", Codrops: "CDR", "iart.ai": "IART", TakayuStudio: "TKY" };
const libTag = (a) => TAGS[a] ?? authorTag({ name: a });
function LibTag({ author }) { return <span className="au-tag" title={author}>{libTag(author)}</span>; }

function Card({ it, fav, onFav, onPick, onDelete, busy, pickLabel, page }) {
  const t = useT();
  const [hover, setHover] = useState(false);
  const [copied, setCopied] = useState(false);       // the page's Copy button shows a check for a moment once the text is on the clipboard
  const vid = useRef(null);
  useEffect(() => { if (!hover && vid.current) { vid.current.pause(); vid.current.currentTime = 0; } }, [hover]);
  return <div className="ml-card" onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} onFocus={() => setHover(true)} onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setHover(false); }}>
    <div className="ml-media">
      {it.poster ? <img src={it.poster} alt="" loading="lazy" /> : <div className="ml-noposter">{it.title}</div>}
      {hover && it.video && <video ref={vid} src={it.video} autoPlay muted loop playsInline disablePictureInPicture controlsList="nopictureinpicture nodownload" aria-label={t("Preview of {title}", { title: it.title })} />}
      {it.vi && VI[it.vi] && <span className={"ml-vi " + VI[it.vi][1]} title={t(VI[it.vi][0])}>{it.vi === "ok" ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />}VI</span>}
      <div className="ml-hover-actions">
        <button className="btn icon sm ml-ghost" onClick={() => onFav(it.uid)} aria-label={fav ? t("Remove from favorites") : t("Add to favorites")} aria-pressed={fav}><Heart size={14} fill={fav ? "currentColor" : "none"} /></button>
        {it.deletable && onDelete && <button className="btn icon sm ml-ghost danger" onClick={() => onDelete(it)} aria-label={t("Delete {title}", { title: it.title })} title={t("Delete for good")}><Trash2 size={14} /></button>}
        <button className="btn primary sm" onClick={async () => { const r = await onPick(it); if (page && r !== false) { setCopied(true); setTimeout(() => setCopied(false), 1600); } }} disabled={busy} title={page ? t("Copy the text to the clipboard") : pickLabel}>
          {busy ? <Loader2 size={13} className="spin" /> : page ? (copied ? <Check key="ok" size={13} className="icon-pop" /> : <Copy size={13} />) : <Check size={13} />}{copied ? t("Copied") : pickLabel}</button>
      </div>
    </div>
    <div className="ml-name">
      <span className="t" title={it.title}>{it.title}</span>
      <span className="ml-info-wrap">
        <button className="btn ghost icon sm" aria-label={t("About {title}", { title: it.title })}><Info size={14} /></button>
        <span className="ml-pop" role="tooltip">
          {it.sub && <b className="sub">{it.sub}</b>}
          {it.desc && <span className="d">{it.desc.length > 320 ? it.desc.slice(0, 320) + "…" : it.desc}</span>}
          {it.vi && VI[it.vi] && it.vi !== "ok" && <span className={"note " + VI[it.vi][1]}>{t(VI[it.vi][0])}{it.viFamilies?.length ? `: ${it.viFamilies.join(", ")}` : ""}</span>}
          {it.previewNote && <span className="note">{it.previewNote}</span>}
          {it.credit && <span className="cr">{t("By {author}", { author: it.credit.author })}{it.credit.licence ? ` · ${it.credit.licence}` : ""} · {t(it.credit.made)}{it.credit.link && <>{" · "}<a href={it.credit.link} target="_blank" rel="noopener noreferrer">{t("Source")}<ExternalLink size={10} /></a></>}</span>}
        </span>
      </span>
    </div>
  </div>;
}

/** The library for the panel and the page: the filters (kept per user), favourites and recent, one page of `size` items from the server. */
function useLibrary(size, onPick, kinds = KINDS) {
  const t = useT();
  const toast = useToast();
  const [author, setAuthor] = usePref("ml:author", "HyperFrames");
  const [kind, setKind] = usePref("ml:kind", "all");
  const [category, setCategory] = usePref("ml:category", "all");
  const [tab, setTab] = useState("all");
  const [q, setQ] = useState(""), [dq, setDq] = useState("");
  const [pageNo, setPageNo] = useState(0);
  const [fav0, setFav] = usePref("ml:favorites", []);
  const [recent0, setRecent] = usePref("ml:recent", []);
  const fav = useMemo(() => fav0.map(uidOf), [fav0]), recent = useMemo(() => recent0.map(uidOf), [recent0]);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);
  const [ask, setAsk] = useState(false);
  const [del, setDel] = useState(null);              // the intake item waiting for the delete confirmation
  const [deleted, setDeleted] = useState([]);        // items deleted for good (they can be restored)
  const [showDeleted, setShowDeleted] = useState(false);
  useEffect(() => { const h = setTimeout(() => setDq(q), 200); return () => clearTimeout(h); }, [q]);
  useEffect(() => { setPageNo(0); }, [author, kind, category, tab, dq, size]);
  const ids = tab === "fav" ? fav : tab === "recent" ? recent : null;
  const load = () => {
    setLoading(true);
    const url = `/api/library?q=${encodeURIComponent(dq)}&author=${encodeURIComponent(author)}&kind=${kind}&category=${encodeURIComponent(category)}&offset=${pageNo * size}&limit=${size}&kinds=${kinds.map(([k]) => k).join(",")}`
      + (ids ? `&ids=${encodeURIComponent(ids.join(",") || "-")}` : "");
    return get(url).then((r) => { setData(r); setLoading(false);
      if (author !== "all" && !r.authors?.[author]) setAuthor("all");
      if (kind !== "all" && !r.kinds?.[kind]) setKind("all");
      if (category !== "all" && !r.categories?.[category]) setCategory("all"); }).catch((e) => { setLoading(false); toast(e.message, "error"); });
  };
  useEffect(() => { load(); }, [author, kind, category, tab, dq, pageNo, size, ids?.join(",")]); // eslint-disable-line react-hooks/exhaustive-deps
  const loadDeleted = () => get("/api/library/intake/deleted").then((r) => setDeleted(r.items ?? [])).catch(() => {});
  useEffect(() => { loadDeleted(); }, []);
  const remove = async (it) => {
    setDel(null);
    try { await post("/api/library/intake/delete", { uid: it.uid }); toast(t("Deleted “{title}”", { title: it.title })); load(); loadDeleted(); }
    catch (e) { toast(e.message, "error"); }
  };
  const restore = async (it) => {
    try { await post("/api/library/intake/restore", { uid: it.uid }); toast(t("Restoring “{title}”; its preview renders again", { title: it.title })); load(); loadDeleted(); }
    catch (e) { toast(e.message, "error"); }
  };
  const toggleFav = (uid) => setFav((f) => { const cur = f.map(uidOf); return cur.includes(uid) ? cur.filter((x) => x !== uid) : [uid, ...cur]; });
  const pick = async (it) => {
    setBusy(it.uid);
    try { const full = await get(`/api/library/item?uid=${encodeURIComponent(it.uid)}`); setRecent((r) => [it.uid, ...r.map(uidOf).filter((x) => x !== it.uid)].slice(0, 30)); return await onPick(full); }
    catch (e) { toast(e.message, "error"); return false; } finally { setBusy(null); }
  };
  const runJob = (path, field, every = 1500) => async () => { setAsk(false); try { const j = await post(path); setData((d) => ({ ...d, [field]: j })); watchJob(j.id, (x) => { if (x && x.status !== "running") load(); else if (x) setData((d) => ({ ...d, [field]: x })); }, every); } catch (e) { toast(e.message, "error"); } };
  const st = data?.stores ?? {};
  const pv = st.blocks?.previews ?? {}, temporary = Math.max(0, (pv.none ?? 0) - (pv.failed ?? 0));          // the blocks with no preview yet (none comes from the retired kit)
  const running = (j) => (j?.status === "running" ? j : null);
  const authors = useMemo(() => Object.entries(data?.authors ?? {}).sort((a, b) => (a[0] === "HyperFrames" ? -1 : b[0] === "HyperFrames" ? 1 : a[0] === "Moworks" ? -1 : b[0] === "Moworks" ? 1 : b[1] - a[1])), [data?.authors]);
  const cats = useMemo(() => Object.entries(data?.categories ?? {}).sort((a, b) => a[0].localeCompare(b[0])), [data?.categories]);
  return { author, setAuthor, kind, setKind, category, setCategory, tab, setTab, q, setQ, dq, pageNo, setPageNo, fav, toggleFav, data, loading, busy, pick,
    ask, setAsk, del, setDel, deleted, showDeleted, setShowDeleted, remove, restore, runJob, load, st, temporary, authors, cats,
    pvJob: running(data?.previewJob), blocksJob: running(data?.blocksJob), looksJob: running(data?.looksJob) };
}

/** What the library is waiting for: deleted items, previews to render, stores not imported yet. `page`: the blocks' previews line too. */
function LibraryNotes({ L, page }) {
  const t = useT();
  const { data, st, kind, deleted, pvJob, blocksJob, looksJob, temporary } = L;
  const showBlocks = kind === "all" || kind === "block" || kind === "motion";
  return <>
    {deleted.length > 0 && <div className="ml-note ml-pv">{deleted.length === 1 ? t("1 item deleted.") : t("{n} items deleted.", { n: deleted.length })}<button className="btn ghost sm" onClick={() => L.setShowDeleted(true)}>{t("Show deleted")}</button></div>}
    {page && showBlocks && st.blocks && (pvJob || temporary > 0) && <div className="ml-note ml-pv">{pvJob
      ? <><Loader2 size={13} className="spin" />{t("Rendering previews:")} {pvJob.stage}<button className="btn ghost sm" onClick={() => post(`/api/jobs/${pvJob.id}/cancel`).then(L.load)}>{t("Stop")}</button></>
      : <>{temporary === 1 ? t("1 block has no preview yet.") : t("{n} blocks have no preview yet.", { n: temporary })}<button className="btn ghost sm" onClick={() => L.setAsk("previews")}>{t("Render previews")}</button></>}</div>}
    {data && !st.blocks && <div className="ml-note ml-pv">{blocksJob ? <><Loader2 size={13} className="spin" />{t("Importing HyperFrames blocks…")} {blocksJob.progress ?? 0}%</>
      : <>{t("HyperFrames' blocks are not imported yet.")}<button className="btn ghost sm" onClick={() => L.setAsk(true)}><Download size={13} />{t("Import")}</button></>}</div>}
    {data && !st.looks && <div className="ml-note ml-pv">{looksJob ? <><Loader2 size={13} className="spin" />{t("Preparing looks…")} {looksJob.progress ?? 0}%</>
      : <>{t("HyperFrames' looks have no previews yet.")}<button className="btn ghost sm" onClick={L.runJob("/api/library/looks/import", "looksJob")}><Wand2 size={13} />{t("Prepare")}</button></>}</div>}
  </>;
}

/** The library's confirmations: delete for good, the deleted items, rendering previews, importing HyperFrames' blocks. */
function LibraryDialogs({ L }) {
  const t = useT();
  const { del, setDel, deleted, showDeleted, setShowDeleted, ask, setAsk, temporary } = L;
  return <>
    {del && <Dialog icon={<Trash2 size={18} />} danger title={t("Delete “{title}” for good?", { title: del.title })} onClose={() => setDel(null)} footer={<><span className="spacer" /><button className="btn" onClick={() => setDel(null)}>{t("Cancel")}</button>
      <button className="btn danger" onClick={() => L.remove(del)}><Trash2 size={14} />{t("Delete for good")}</button></>}>
      <p>{t("Removes its component, preview and catalog entry; later rebuilds skip it.")}</p>
      <p className="hint">{t("You can restore it from the deleted items.")}</p></Dialog>}
    {showDeleted && <Dialog icon={<ArchiveRestore size={18} />} title={t("Deleted items")} onClose={() => setShowDeleted(false)} footer={<><span className="spacer" /><button className="btn" onClick={() => setShowDeleted(false)}>{t("Close")}</button></>}>
      {deleted.length === 0 ? <p className="muted">{t("Nothing deleted.")}</p> : <ul className="plain file-list">{deleted.map((d) => <li key={d.uid}>
        <span className="name">{d.title} <span className="muted">· {d.author} · {ago(d.at)}</span></span>
        <button className="btn ghost sm" onClick={() => L.restore(d)}><RotateCcw size={13} />{t("Restore")}</button></li>)}</ul>}
    </Dialog>}
    {ask === "previews" && <Dialog icon={<Clapperboard size={18} />} title={t("Render {n} previews?", { n: temporary })} onClose={() => setAsk(false)} footer={<><span className="spacer" /><button className="btn" onClick={() => setAsk(false)}>{t("Cancel")}</button>
      <button className="btn primary" onClick={L.runJob("/api/library/blocks/previews", "previewJob", 3000)}><Clapperboard size={14} />{t("Render")}</button></>}>
      <p>{t("Renders each block like HyperFrames' own previews. It runs in the background for an hour or more; you can stop it and go on later.")}</p></Dialog>}
    {ask === true && <Dialog icon={<Download size={18} />} title={t("Import HyperFrames blocks?")} onClose={() => setAsk(false)} footer={<><span className="spacer" /><button className="btn" onClick={() => setAsk(false)}>{t("Cancel")}</button>
      <button className="btn primary" onClick={L.runJob("/api/library/blocks/import", "blocksJob")}><Download size={14} />{t("Import")}</button></>}>
      <p>{t("Reads HyperFrames' registry on this computer and downloads its preview videos (about 110 MB). Each block gets a Vietnamese font check.")}</p></Dialog>}
  </>;
}

export default function MotionLibrary(props) {
  return props.page ? <LibraryPage {...props} /> : <LibraryPanel {...props} />;
}

/** The panel beside Claude and in Motion Plan: chip rows, pages of cards, Add / Use this on each. */
function LibraryPanel({ onPick, onClose, pickLabel, note }) {
  const t = useT();
  pickLabel = pickLabel ?? t("Copy");
  const [expanded, setExpanded] = usePref("ml:expanded", false);
  const [beside, setBeside] = useState(null);          // px from the right edge: the Claude column's width (the larger view leaves it visible)
  const [cols, setCols] = useState(4);
  const grid = useRef(null), ref = useRef(null);
  useEffect(() => {
    if (!expanded) return;
    const read = () => { const col = ref.current?.closest(".claude"); if (col) setBeside(Math.max(16, window.innerWidth - col.getBoundingClientRect().left + 16)); };
    read(); window.addEventListener("resize", read); return () => window.removeEventListener("resize", read);
  }, [expanded]);
  useLayoutEffect(() => {             // columns follow the width: up to 8 in the large view, 2 in the side panel
    const el = grid.current; if (!el) return;
    const min = expanded ? 200 : 170;
    const read = () => setCols(Math.max(1, Math.min(8, Math.floor((el.getBoundingClientRect().width + 12) / (min + 12)))));
    read(); const ro = new ResizeObserver(read); ro.observe(el); addEventListener("resize", read);
    return () => { ro.disconnect(); removeEventListener("resize", read); };
  }, [expanded]);
  const rows = expanded ? (cols >= 6 ? 2 : 3) : 2;     // about 10-15 cards a page
  const size = cols * rows;
  const L = useLibrary(size, onPick);
  const { author, setAuthor, kind, setKind, category, setCategory, tab, setTab, q, setQ, data, loading, authors, cats } = L;
  useEffect(() => {      // Escape closes the panel; typed feedback is never touched
    const k = (e) => { if (e.key === "Escape") { e.stopPropagation(); onClose?.(); } };
    const el = ref.current; el?.addEventListener("keydown", k); return () => el?.removeEventListener("keydown", k);
  }, [onClose]);

  return (
    <div ref={ref} className={"ml-panel" + (expanded ? " expanded" : "")} role="dialog" aria-label={t("Motion Library")}
      style={expanded && beside ? { right: beside } : undefined}>
      <div className="ml-head">
        <Library size={15} color="var(--accent-ink)" /><b>{t("Motion Library")}</b>
        <span className="muted num" style={{ fontSize: "var(--fs-meta)" }}>{data ? (() => { const all = Object.values(data.authors ?? {}).reduce((a, b) => a + b, 0);          // the author chips count the whole library
          return all > data.total ? t("{n} of {total} items", { n: data.total, total: all }) : t("{n} items", { n: data.total }); })() : ""}</span>
        <div className="end">
          <button className="btn ghost icon sm" onClick={() => setExpanded((x) => !x)} aria-label={expanded ? t("Smaller panel") : t("Larger view")} title={expanded ? t("Smaller panel") : t("Larger view")}>{expanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}</button>
          <button className="btn ghost icon sm" onClick={onClose} aria-label={t("Close Motion Library")} title={t("Close (Esc)")}><X size={14} /></button>
        </div>
      </div>
      <div className="ml-tools">
        <div className="ml-row chips" role="group" aria-label={t("Author")}>
          <span className="ml-row-label"><UserRound size={12} />{t("Author")}</span>
          <button className="ml-chip" aria-pressed={author === "all"} onClick={() => { setAuthor("all"); setCategory("all"); }}>{t("All")}</button>
          {authors.map(([a, n]) => <button key={a} className="ml-chip" aria-pressed={author === a} onClick={() => { setAuthor(a); setKind("all"); setCategory("all"); }}>{a} <span className="num">{n}</span></button>)}
          {Array.from({ length: SOON }, (_, i) => <span key={i} className="ml-chip soon" title={t("A place for the next author's library")}>{t("New author · soon")}</span>)}
        </div>
        <div className="ml-row chips" role="group" aria-label={t("Type")}>
          <span className="ml-row-label"><Shapes size={12} />{t("Type")}</span>
          <button className="ml-chip" aria-pressed={kind === "all"} onClick={() => { setKind("all"); setCategory("all"); }}>{t("All")}</button>
          {KINDS.filter(([k]) => data?.kinds?.[k]).map(([k, l, I]) => <button key={k} className="ml-chip kind" aria-pressed={kind === k} onClick={() => { setKind(k); setCategory("all"); }}><I size={13} />{t(l)} <span className="num">{data.kinds[k]}</span></button>)}
        </div>
        <div className="ml-row chips" role="group" aria-label={t("Category")}>
          <span className="ml-row-label"><Tag size={12} />{t("Category")}</span>
          <button className="ml-chip" aria-pressed={category === "all"} onClick={() => setCategory("all")}>{t("All")}</button>
          {cats.map(([c, n]) => <button key={c} className="ml-chip" aria-pressed={category === c} onClick={() => setCategory(c)}>{t(c)} <span className="num">{n}</span></button>)}
        </div>
        <div className="ml-row">
          <div className="search"><Search size={14} /><input className="input" autoFocus placeholder={t("Search: counter, title, wipe…")} value={q} onChange={(e) => setQ(e.target.value)} aria-label={t("Search")} /></div>
          <div className="segmented" role="group" aria-label={t("List")}>{[["all", "All", LayoutGrid], ["fav", "Favorites", Heart], ["recent", "Recent", Clock]].map(([k, l, I]) => <button key={k} aria-pressed={tab === k} onClick={() => setTab(k)}><I size={13} />{t(l)}</button>)}</div>
        </div>
        {note && <div className="ml-note">{note}</div>}
        <LibraryNotes L={L} />
      </div>
      <div className="ml-grid-wrap">
        {data && !loading && data.items.length === 0 && <div className="coming">{tab === "fav" ? t("No favorites yet. Use the heart on a card.") : tab === "recent" ? t("Nothing copied yet.") : t("Nothing matches.")}</div>}
        <div ref={grid} className="ml-grid" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }} aria-busy={loading}>
          {(data?.items ?? []).map((it) => <Card key={it.uid} it={it} fav={L.fav.includes(it.uid)} onFav={L.toggleFav} onPick={L.pick} onDelete={L.setDel} busy={L.busy === it.uid} pickLabel={pickLabel} />)}
        </div>
      </div>
      {data && <Pager className="ml-pager" page={L.pageNo} size={size} total={data.total} onPage={L.setPageNo} />}
      <LibraryDialogs L={L} />
    </div>
  );
}

/** A tile on the page, in the Style Gallery's three levels: the name, the author's tag, the category; the preview plays under the pointer. */
function LibTile({ it, on, fav, onSelect }) {
  const t = useT();
  const [hover, setHover] = useState(false);
  return <button type="button" className={"sgb-card mlp-tile" + (on ? " on" : "")} aria-pressed={on} onClick={() => onSelect(it)}
    onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} onFocus={() => setHover(true)} onBlur={() => setHover(false)}>
    <span className="shot">{it.canvas?.page ? <CanvasSample c={it.canvas} title={it.title} still={!hover} /> : it.poster ? <img src={it.poster} alt="" loading="lazy" decoding="async" /> : <span className="ml-noposter">{it.title}</span>}
      {hover && it.video && <video src={it.video} autoPlay muted loop playsInline disablePictureInPicture aria-hidden="true" />}
      {it.vi && VI[it.vi] && <span className={"mark ml-vi-mark " + VI[it.vi][1]} title={t(VI[it.vi][0])}>{it.vi === "ok" ? <CheckCircle2 size={11} /> : <AlertTriangle size={11} />}VI</span>}
      {fav && <span className="mark fav" title={t("In your favorites")}><Heart size={11} fill="currentColor" /></span>}
      {on && <span className="chk"><Check size={13} /></span>}</span>
    <span className="nm">{it.title}</span>
    <span className="by"><LibTag author={it.author} /><span className="cat">{t(it.category ?? "")}</span></span>
  </button>;
}

/** The item in hand: its preview with controls, name, author, what it is, the Vietnamese check, Copy and the favourite, the credit. */
function LibDetails({ it, L, pickLabel }) {
  const t = useT();
  const [copied, setCopied] = useState(false);
  const fav = L.fav.includes(it.uid);
  const copy = async () => { const r = await L.pick(it); if (r !== false) { setCopied(true); setTimeout(() => setCopied(false), 1600); } };
  const vi = it.vi && VI[it.vi];
  const [full, setFull] = useState(null);
  useEffect(() => { setFull(null); if (it.kind !== "vocab") return undefined; let alive = true;
    get(`/api/library/item?uid=${encodeURIComponent(it.uid)}`).then((r) => { if (alive) setFull(r); }).catch(() => {}); return () => { alive = false; }; }, [it.uid, it.kind]);
  return <>
    <div className="sgb-big mlp-big">{it.canvas?.page ? <CanvasSample c={it.canvas} title={t("Preview of {title}", { title: it.title })} className="big" /> : it.video ? <video key={it.video} src={it.video} poster={it.poster ?? undefined} controls autoPlay muted loop playsInline disablePictureInPicture controlsList="nopictureinpicture nodownload" aria-label={t("Preview of {title}", { title: it.title })} />
      : it.poster ? <img src={it.poster} alt="" /> : <NoPreview text={t("No preview yet")} />}</div>
    <div className="sgb-head">
      <h2 className="sgb-title">{it.title}</h2>
      <p className="sgb-sub"><LibTag author={it.author} /><span>{t(KIND_ONE[it.kind] ?? it.kind ?? "")}</span>{it.category && <span>{t(it.category)}</span>}</p>
    </div>
    {it.desc && <p className="sgb-desc">{it.desc}</p>}
    {vi && <p className="tech-tags">{it.vi === "ok" ? <span className="tech ok"><Check size={11} />{t("Vietnamese letters")}</span>
      : <span className={"tech " + (vi[1] === "bad" ? "bad" : "warn")} title={it.viFamilies?.length ? it.viFamilies.join(", ") : undefined}><AlertTriangle size={11} />{t(vi[0])}</span>}</p>}
    <dl className="kv sgb-kv">
      {it.credit?.made && <><dt>{t("How made")}</dt><dd>{t(it.credit.made)}</dd></>}
      {it.tags?.length > 0 && <><dt>{t("Keywords")}</dt><dd>{it.tags.join(", ")}</dd></>}
      {it.kind === "vocab" && it.sub && <><dt>{t("Set")}</dt><dd>{it.sub}</dd></>}
    </dl>
    {full?.numbers?.en?.length > 0 && <ul className="plain ml-numbers num">{full.numbers.en.map((x, i) => <li key={i}>{x}</li>)}</ul>}
    {it.kind === "vocab" && <p className="hint">{t("Words and numbers for Claude: it writes the motion in GSAP from them. Not a motion that runs by itself.")}</p>}
    {it.note && <p className="warn-note"><AlertTriangle size={13} />{it.note}</p>}
    {it.previewNote && <p className="hint">{it.previewNote}</p>}
    <div className="sgb-acts">
      <button className="btn primary" onClick={copy} disabled={L.busy === it.uid} title={t("Copy the text to the clipboard")}>
        {L.busy === it.uid ? <Loader2 size={15} className="spin" /> : copied ? <Check key="ok" size={15} className="icon-pop" /> : <Copy size={15} />}{copied ? t("Copied") : pickLabel}</button>
      <button className="btn" onClick={() => L.toggleFav(it.uid)} aria-pressed={fav}><Heart size={14} fill={fav ? "currentColor" : "none"} />{fav ? t("In your favorites") : t("Add to favorites")}</button>
      {it.deletable && <button className="btn ghost" onClick={() => L.setDel(it)}><Trash2 size={14} />{t("Delete for good")}</button>}
    </div>
    {it.credit && <CreditLine author={it.credit.author} licence={it.credit.licence} link={it.credit.link} commit={it.credit.commit} made={it.credit.made} />}
  </>;
}

function Box({ on }) { return <span className="sgb-box round" aria-hidden="true">{on && <Check size={11} />}</span>; }
const CATS_SHOWN = 8;

/** The page's filter column, as in the Style Gallery: search, author, type, list, category. One choice a group (the server pages by it). */
function LibFacets({ L }) {
  const t = useT();
  const [allCats, setAllCats] = useState(false);
  const { author, setAuthor, kind, setKind, category, setCategory, tab, setTab, q, setQ, data, authors, cats } = L;
  const row = (key, on, onClick, label, n, tag) => <button key={key} type="button" className={"sgb-opt" + (on ? " on" : "")} role="radio" aria-checked={on} onClick={onClick}>
    <Box on={on} /><span className="l">{label}</span>{tag}<span className="n num">{n ?? 0}</span></button>;
  const byCount = [...cats].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const shownCats = allCats ? byCount : byCount.slice(0, CATS_SHOWN).concat(byCount.slice(CATS_SHOWN).filter(([c]) => c === category));
  return <>
    <div className="search"><Search size={14} /><input className="input" placeholder={t("Search: counter, title, wipe…")} value={q} onChange={(e) => setQ(e.target.value)} aria-label={t("Search")} /></div>
    <div className="sgb-fg" role="radiogroup" aria-label={t("Author")}><span className="sgb-fl">{t("Author")}</span>
      {authors.map(([a, n]) => row(a, author === a, () => { setAuthor(author === a ? "all" : a); setKind("all"); setCategory("all"); }, a, n, <LibTag author={a} />))}</div>
    <div className="sgb-fg" role="radiogroup" aria-label={t("Type")}><span className="sgb-fl">{t("Type")}</span>
      {PAGE_KINDS.filter(([k]) => data?.kinds?.[k]).map(([k, l, I]) => row(k, kind === k, () => { setKind(kind === k ? "all" : k); setCategory("all"); }, <span className="mlp-kind"><I size={13} />{t(l)}</span>, data.kinds[k]))}</div>
    <div className="sgb-fg"><span className="sgb-fl">{t("List")}</span><div className="sgb-chips">
      {[["fav", "Favorites", Heart], ["recent", "Recent", Clock]].map(([k, l, I]) => <button key={k} type="button" className="ml-chip" aria-pressed={tab === k} onClick={() => setTab(tab === k ? "all" : k)}><I size={12} />{t(l)}</button>)}</div></div>
    <div className="sgb-fg" role="radiogroup" aria-label={t("Category")}><span className="sgb-fl">{t("Category")}</span>
      {shownCats.map(([c, n]) => row(c, category === c, () => setCategory(category === c ? "all" : c), t(c), n))}
      {cats.length > CATS_SHOWN && <button type="button" className="sgb-more" onClick={() => setAllCats((x) => !x)}>{allCats ? t("Fewer") : t("{n} more", { n: cats.length - CATS_SHOWN })}</button>}</div>
  </>;
}

/** The Motion Library page: filters | tiles, 3-4 rows a page | the item in hand. */
function LibraryPage({ onPick, pickLabel }) {
  const t = useT();
  pickLabel = pickLabel ?? t("Copy");
  const grid = useGalleryGrid(), size = grid.size;          // the gallery pages' one grid
  const L = useLibrary(size, onPick, PAGE_KINDS);
  const { author, setAuthor, kind, setKind, category, setCategory, tab, setTab, q, setQ, data, loading } = L;
  const [curUid, setCurUid] = usePref("ml:current", null);
  const [panel, setPanel] = useState(null);                 // narrow window: "filters" or "item" open over the grid
  useEffect(() => { if (!panel) return undefined; const esc = (e) => { if (e.key === "Escape") setPanel(null); }; addEventListener("keydown", esc); return () => removeEventListener("keydown", esc); }, [panel]);
  const items = data?.items ?? [];
  const cur = items.find((x) => x.uid === curUid) ?? items[0] ?? null;
  const select = (it) => { setCurUid(it.uid); if (matchMedia("(max-width: 1100px)").matches) setPanel("item"); };
  const all = data ? Object.values(data.authors ?? {}).reduce((a, b) => a + b, 0) : 0;          // the authors count the whole library
  const KL = Object.fromEntries(PAGE_KINDS.map(([k, l]) => [k, l]));
  const pills = [...(author !== "all" ? [[author, () => { setAuthor("all"); setCategory("all"); }]] : []), ...(kind !== "all" ? [[t(KL[kind] ?? kind), () => { setKind("all"); setCategory("all"); }]] : []),
    ...(category !== "all" ? [[t(category), () => setCategory("all")]] : []), ...(tab !== "all" ? [[t(tab === "fav" ? "Favorites" : "Recent"), () => setTab("all")]] : []), ...(q ? [[`“${q}”`, () => setQ("")]] : [])];
  const clear = () => { setAuthor("all"); setKind("all"); setCategory("all"); setTab("all"); setQ(""); };
  const nFilters = pills.length;
  return <div className={"sgb-layout mlp-layout" + (panel ? " panel-" + (panel === "item" ? "style" : panel) : "")}>
    {panel && <div className="sgb-scrim" onClick={() => setPanel(null)} />}
    <aside className="sgb-facets" aria-label={t("Filters")}><LibFacets L={L} /><div className="mlp-notes"><LibraryNotes L={L} page /></div></aside>
    <section className="sgb-center" aria-label={t("Motion Library")}>
      <div className="sgb-bar">
        <button type="button" className="btn sm sgb-filters-btn" onClick={() => setPanel("filters")}><SlidersHorizontal size={13} />{t("Filters")}{nFilters > 0 && <span className="num"> · {nFilters}</span>}</button>
        <span className="count num" aria-live="polite">{data ? (all > data.total ? t("{n} of {total} items", { n: data.total, total: all }) : t("{n} items", { n: data.total })) : ""}</span>
        {pills.map(([l, off], i) => <button key={i} type="button" className="sgb-pill" onClick={off} aria-label={t("Remove filter {name}", { name: l })}>{l}<X size={12} /></button>)}
        {nFilters > 0 && <button type="button" className="btn ghost sm" onClick={clear}>{t("Clear filters")}</button>}
      </div>
      {data && !loading && items.length === 0 && <div className="empty"><p>{tab === "fav" ? t("No favorites yet. Use the heart on an item.") : tab === "recent" ? t("Nothing copied yet.") : t("Nothing matches.")}</p>
        {nFilters > 0 && <button className="btn" onClick={clear}>{t("Clear filters")}</button>}</div>}
      <div className="sgb-grid" ref={grid.ref} style={grid.style} aria-busy={loading}>{items.map((it) => <LibTile key={it.uid} it={it} on={cur?.uid === it.uid} fav={L.fav.includes(it.uid)} onSelect={select} />)}</div>
      <Pager keep page={L.pageNo} size={size} total={data?.total ?? 0} onPage={L.setPageNo} />
    </section>
    <aside className="sgb-insp" aria-label={cur ? cur.title : t("Motion Library")}>
      {panel === "item" && <BackButton className="insp" onClick={() => setPanel(null)} />}
      {cur ? <div className="insp-in" key={cur.uid}><LibDetails it={cur} L={L} pickLabel={pickLabel} /></div> : <p className="hint">{t("Choose an item to see it here.")}</p>}
    </aside>
    <LibraryDialogs L={L} />
  </div>;
}
