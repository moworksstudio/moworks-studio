// Style Gallery: a filter column (author first), one grid of every author's styles, and the style in hand beside it.
// Video styles and workflows only: how things move is the Motion Library, and HyperFrames' Looks stay there (a link).
// Stills come from the local clone, the demo film is the author's file on GitHub opened in the browser, every style is
// shown as shipped. Each tile reads in three levels: name, author tag (accent), category. The style's credit shows once, in its details.
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Check, ExternalLink, Film, Info, Plus, Search, SlidersHorizontal, Sparkles, X } from "lucide-react";
import { get, patch } from "../api.js";
import { BackButton, Banner, Dialog, NoPreview, Pager, useGalleryGrid } from "../components.jsx";
import { clock, go, useData, usePref, useToast } from "../lib.jsx";
import { useT } from "../i18n.jsx";
import { AUTHOR_ORDER, AuthorBadge, AuthorName, authorView } from "../authors.jsx";
import { styleRank } from "../styleRows.js";
import { useThemeId } from "../theme.jsx";
import StyleCrates from "../studio/StyleCrates.jsx";
import AeBadge, { aeLevel } from "../workflow/AeBadge.jsx";

// the light list: no pipeline or rules, a short credit; GET /api/styles/<id> has a style in full
export function useStyles() { return useData(() => get("/api/styles/list").then((r) => ({ ...r, styles: r.styles.filter((s) => !s.hidden) }))); }

// Older servers send no authors: the two the catalog had then.
const BUILT_IN = [
  { id: "moworks", name: "Moworks Studio", org: "Moworks", kind: "workflow" },
  { id: "heygen", name: "HyperFrames", org: "HeyGen", kind: "workflow", licence: "Apache-2.0" },
];
export const authorOf = (s) => s.author?.id ?? s.author ?? (s.rules?.[0]?.kind === "moworks-rule" ? "moworks" : "heygen");
export const kindOf = (s) => s.kind ?? "workflow";
/** The authors in the user's order, each with its display fields and its count of styles; What If (FreshStack) last, as
 *  "Coming soon" until its engine exists. Any author a style names that the list does not comes after. */
export function authorsOf(data) {
  const list = [...(data?.authors ?? BUILT_IN)];
  for (const s of data?.styles ?? []) if (!list.some((a) => a.id === authorOf(s))) list.push({ id: authorOf(s), name: authorOf(s) });
  if (!list.some((a) => a.id === "freshstack")) list.push({ id: "freshstack", comingSoon: true, count: 0 });
  const n = (id) => (data?.styles ?? []).filter((s) => authorOf(s) === id).length;
  const rank = (id) => { const i = AUTHOR_ORDER.indexOf(id); return i < 0 ? 99 : i; };
  return list.map((a) => authorView(a, n(a.id))).sort((a, b) => rank(a.id) - rank(b.id));
}
export const KINDS = { "video-style": "Aesthetic", workflow: "Format" };          // look-led styles / film formats; the keys stay
const NOTE_KINDS = new Set(["route"]);          // what a style is for, said as a note, not a warning
export const RENDERERS = { canvas: "Canvas 2D", webgl: "WebGL", three: "three.js", blender: "three.js" };          // a Blender demo is built in three.js here (its warning says so)
// the author as a short tag under each style's name
const TAGS = { moworks: "MW", heygen: "HF", lemomo: "LEMO", vincentwei: "MG", alexgreensh: "ANI", johnheibel: "JH" };
export const authorTag = (a) => TAGS[a?.id] ?? String(a?.name ?? a?.id ?? "?").replace(/[^A-Za-z0-9]/g, "").slice(0, 4).toUpperCase();
export const usesOf = (s) => s.uses ?? s.tags ?? [];
/** A category as shown: translated, without the source in brackets ("Motion design (mg-styles-15)" → "Motion design"; the author tag says whose). */
export const catLabel = (t, c) => t(c ?? "").replace(/\s*\([^)]*\)$/, "");
/** A style's category under its name, unless the name is the category ("Explainer · Explainer", "Motion Graphics · Motion graphics").
 *  A name that only holds the word keeps it (T23-9: "Vertical and social clips" and "Characters, mascots and story shorts" lost their
 *  "Social" and "Story" while every other HyperFrames card had its type). */
const plain = (x) => String(x ?? "").toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
export const catOf = (t, s) => { const c = catLabel(t, s.category); return c && plain(t(s.title)) === plain(c) ? "" : c; };
/** The still for a tile: the server's small thumbnail when it has one, else the full still. */
export const thumbOf = (s) => s.preview?.thumb ?? s.preview?.image ?? null;
/** A sample taller than wide (a vertical demo) is marked `tall` once it has loaded: its frame shows it whole on a bed, never a landscape
 *  crop of it (T23-9: the 9:16 style's card cut a strip out of its vertical demo). A square one (1:1, 4:3: too narrow for a 16:9 frame)
 *  is marked `square` and shown whole the same way (T26-1: Hand embroidery's 640 × 640 hoop lost its top and bottom). Toggled, so a frame
 *  that shows another style follows. */
export const isTall = (w, h) => w > 0 && h > w * 1.1;
export const isSquare = (w, h) => w > 0 && !isTall(w, h) && w < h * 1.5;
export const markTall = (el) => {
  const w = el?.naturalWidth || el?.videoWidth, hh = el?.naturalHeight || el?.videoHeight;
  if (w) { el.classList.toggle("tall", isTall(w, hh)); el.classList.toggle("square", isSquare(w, hh)); }
};
const host = (u) => { try { return new URL(u).host; } catch { return ""; } };
const byName = (a, b) => a.title.localeCompare(b.title);

/** The author's coloured tag (MW, HF, LEMO, MG, ANI, JH, FS). */
export function AuthorTag({ author }) { return author ? <AuthorBadge a={author} /> : null; }

/** One credit line, small and thin: author · licence · source at the commit ↗. */
// every page credits the same way, one line: Author · Licence · Source @ commit · how it was made
export const MADE = { "as shipped": "As shipped", adapted: "Adapted", "written from the idea": "Written from the idea" };
export const MADE_HINT = { "as shipped": "Used exactly as its author published it", adapted: "The author's work, changed to fit the app",
  "written from the idea": "Made new for the app from the author's idea or a description" };
export function CreditLine({ author, licence, link, commit, made = null, title = undefined }) {
  const t = useT();
  return <p className="credit-line" title={title}>{author}{licence && <>{author ? " · " : ""}{licence}</>}
    {link && <> · <a href={link} target="_blank" rel="noopener noreferrer" title={t("Opens {host} in your browser", { host: host(link) })}>{t("Source")}{commit ? ` @ ${String(commit).slice(0, 7)}` : ""}<ExternalLink size={9} /></a></>}
    {made && <span title={MADE_HINT[made] ? t(MADE_HINT[made]) : undefined}>{(author || licence || link) ? " · " : ""}{t(MADE[made] ?? made)}</span>}</p>;
}
/** The "by" line: the contributor first when the source credits one (Lemo-Opuscar style.json by), then the source's author. */
export const byLine = (s, by) => (s?.credit?.contributor?.name ? `${s.credit.contributor.name} · ${by}` : by);
/** A style's credit: author, its short licence, the source at the pinned commit. Moworks' own styles need none. */
export function StyleCredit({ s, author }) {
  if (!author?.repo && !s.credit) return null;
  // a style its author merged from someone else (Lemo-Opuscar style.json by) names that contributor first
  const who = s.credit?.contributor ? s.credit.author : author ? (author.org ? `${author.name} (${author.org})` : author.name) : s.credit.author;
  return <CreditLine author={who} licence={author?.licence} link={s.credit?.url ?? s.credit?.link ?? author?.repo?.url} commit={s.credit?.commit ?? author?.repo?.commit} made={s.credit?.made} />;
}

/** The demo film: the author's file on GitHub, opened in the browser, marked as leaving the app. */
export function DemoLink({ s, className = "btn" }) {
  const t = useT();
  if (!s.demo?.url) return null;
  // The film's name is in the tooltip (the details listed "Demo film" a second time for it)
  return <a className={className} href={s.demo.url} target="_blank" rel="noopener noreferrer" title={(s.demo.title ? `“${s.demo.title}”
` : "") + t("Opens the author's film on {host} in your browser", { host: host(s.demo.url) })}>
    <Film size={14} />{t("Demo film")}{s.demo.dur != null && <span className="num"> {clock(s.demo.dur)}</span>}<ExternalLink size={11} className="ext" /></a>;
}

/** What the style is built with, as green tags with a check; fonts without Vietnamese letters are a red one. */
export function TechTags({ s }) {
  const t = useT();
  // no tag for a font without Vietnamese letters (owner 30/10: it read as "cannot write Vietnamese"; Claude stops in Prepare and offers fonts that have them)
  const ok = [s.dim, RENDERERS[s.renderer] ?? s.renderer].filter(Boolean);
  if (!ok.length && !aeLevel(s)) return null;
  // what After Effects gets of it is one more tag, in its own status colour
  return <p className="tech-tags">{ok.map((x) => <span key={x} className="tech ok"><Check size={11} />{x}</span>)}
    <AeBadge s={s} /></p>;
}

/** The style in hand: frame, name, author, description, what it is built with, warnings, facts, actions, credit. Shared by the gallery
 *  and New project's style chooser. */
export function StyleDetails({ s, author, actions }) {
  const t = useT();
  return <>
    <div className="sgb-big">{s.preview?.video ? <video key={s.preview.video} src={s.preview.video} poster={s.preview.image ?? undefined} controls muted loop playsInline preload="metadata" aria-label={t("{title}, sample film", { title: s.title })}
      onLoadedMetadata={(e) => markTall(e.currentTarget)} />
      : s.preview?.image ? <img src={s.preview.image} alt={t("{title}, sample picture", { title: s.title })} onLoad={(e) => markTall(e.currentTarget)} ref={(el) => { if (el?.complete) markTall(el); }} />
      : <NoPreview text={t("No sample yet")} />}</div>
    {s.preview?.label && <p className="hint">{t(s.preview.label)}{s.preview.credit && <><br /><span className="credit-line">{s.preview.credit}</span></>}</p>}
    <div className="sgb-head">
      {/* the author's own title (Chinese) stays in the data, the search and the credits, not on screen */}
      <h2 className="sgb-title">{t(s.title)}</h2>
      <p className="sgb-sub"><span className="sgb-by">{t("by {who}", { who: byLine(s, authorView(author ?? authorOf(s)).by) })} <AuthorTag author={author} /></span>{catOf(t, s) && <span>{catOf(t, s)}</span>}</p>
    </div>
    <p className="sgb-desc">{t(s.description)}</p>
    <TechTags s={s} />
    {/* red only for a real warning; a route ("16:9 only…") reads as a quiet note */}
    {s.warnings?.length > 0 && <div className="sgb-warns">{s.warnings.map((w) => NOTE_KINDS.has(w.kind) ? <p key={w.kind} className="hint sgb-note"><Info size={13} />{t(w.text)}</p>
      : <p key={w.kind} className="warn-note"><AlertTriangle size={13} />{t(w.text)}</p>)}</div>}
    {usesOf(s).length > 0 && <dl className="kv sgb-kv"><dt>{t("Used for")}</dt><dd>{usesOf(s).map((u) => t(u)).join(", ")}</dd></dl>}
    {actions && <div className="sgb-acts">{actions}</div>}
    <StyleCredit s={s} author={author} />
  </>;
}

const F0 = { authors: [], kinds: [], cats: [], vn: "all", q: "" };          // no 2D / 3D or Looks filter: each tile says it
/** Does style s pass the filters? `skip` leaves one facet out, so that facet's options can count what choosing them would show. */
function passes(s, f, skip) {
  if (skip !== "authors" && f.authors.length && !f.authors.includes(authorOf(s))) return false;
  if (skip !== "kinds" && f.kinds.length && !f.kinds.includes(kindOf(s))) return false;
  if (skip !== "cats" && f.cats.length && !f.cats.includes(s.category)) return false;
  if (skip !== "vn" && f.vn !== "all" && s.vnFont !== (f.vn === "ok")) return false;
  if (f.q) {
    const hay = [s.title, s.titleOriginal, s.description, s.category, s.demo?.title, ...usesOf(s)].join(" ").toLowerCase();
    if (!f.q.toLowerCase().split(/\s+/).every((w) => hay.includes(w))) return false;
  }
  return true;
}
const countBy = (list, key) => { const m = new Map(); for (const s of list) { const k = key(s); if (k != null) m.set(k, (m.get(k) ?? 0) + 1); } return m; };
const toggle = (xs, x) => (xs.includes(x) ? xs.filter((y) => y !== x) : [...xs, x]);
const CATS_SHOWN = 8;

function Box({ on }) { return <span className="sgb-box" aria-hidden="true">{on && <Check size={11} />}</span>; }

/** The filter column: author first (the user's main filter), then type, Vietnamese letters (once checked), category. */
function Facets({ styles, authors, f, set }) {
  const t = useT();
  const [allCats, setAllCats] = useState(false);
  const pool = (skip) => styles.filter((s) => passes(s, f, skip));
  const byAuthor = countBy(pool("authors"), authorOf), byKind = countBy(pool("kinds"), kindOf), byCat = countBy(pool("cats"), (s) => s.category);
  const byVn = countBy(pool("vn"), (s) => (s.vnFont == null ? null : s.vnFont ? "ok" : "missing"));
  const row = (key, on, onClick, label, n, tag) => <button key={key} type="button" className={"sgb-opt" + (on ? " on" : "")} role="checkbox" aria-checked={on} onClick={onClick}>
    <Box on={on} /><span className="l">{label}</span>{tag}<span className="n num">{n ?? 0}</span></button>;          // the author's name, then its tag
  const cats = [...new Set(styles.map((s) => s.category))].filter((c) => byCat.get(c) || f.cats.includes(c)).sort((a, b) => (byCat.get(b) ?? 0) - (byCat.get(a) ?? 0) || a.localeCompare(b));
  const shownCats = allCats ? cats : cats.slice(0, CATS_SHOWN).concat(cats.slice(CATS_SHOWN).filter((c) => f.cats.includes(c)));
  const vnKnown = styles.some((s) => s.vnFont != null);
  return <>
    <div className="search"><Search size={14} /><input className="input" placeholder={t("Search film styles")} value={f.q} onChange={(e) => set({ q: e.target.value })} aria-label={t("Search film styles")} /></div>
    <div className="sgb-fg" role="group" aria-label={t("Author")}><span className="sgb-fl">{t("Author")}</span>
      {authors.map((a) => <button key={a.id} type="button" className={"sgb-opt au-opt" + (f.authors.includes(a.id) ? " on" : "")} role="checkbox" aria-checked={f.authors.includes(a.id)}
        onClick={() => set({ authors: toggle(f.authors, a.id) })}><Box on={f.authors.includes(a.id)} /><AuthorName a={a} count={false} className="l" tagBeside />{!a.comingSoon && <span className="n num">{byAuthor.get(a.id) ?? 0}</span>}</button>)}</div>
    {vnKnown && <div className="sgb-fg"><span className="sgb-fl">{t("Vietnamese letters")}</span><div className="sgb-chips">
      {[["ok", t("Yes")], ["missing", t("No")]].map(([k, l]) => <button key={k} type="button" className="ml-chip" aria-pressed={f.vn === k}
        onClick={() => set({ vn: f.vn === k ? "all" : k })}>{l}<span className="num">{byVn.get(k) ?? 0}</span></button>)}</div></div>}
    <div className="sgb-fg" role="group" aria-label={t("Category")}><span className="sgb-fl">{t("Category")}</span>
      {shownCats.map((c) => row(c, f.cats.includes(c), () => set({ cats: toggle(f.cats, c) }), catLabel(t, c), byCat.get(c)))}
      {cats.length > CATS_SHOWN && <button type="button" className="sgb-more" onClick={() => setAllCats((x) => !x)}>{allCats ? t("Fewer") : t("{n} more", { n: cats.length - CATS_SHOWN })}</button>}</div>
  </>;
}

/** A tile in three levels: the name, the author's tag, the category. */
export function StyleTile({ s, author, on, onPick, className = "sgb-card", role, showAuthor = true }) {
  const t = useT();
  return <button type="button" className={className + (on ? " on" : "")} role={role} aria-pressed={role ? undefined : on} aria-checked={role ? on : undefined} onClick={() => onPick(s)}
    title={s.preview?.label ? t(s.preview.label) : undefined}>
    <span className="shot">{thumbOf(s) ? <img className="fade" src={thumbOf(s)} alt="" loading="lazy" decoding="async" onLoad={(e) => { e.currentTarget.classList.add("in"); markTall(e.currentTarget); }}
      ref={(el) => { if (el?.complete && el.naturalWidth) { el.classList.add("in"); markTall(el); } }} /> : <NoPreview />}
      {s.dim && <span className="mark">{s.dim}</span>}{s.warnings?.some((w) => !NOTE_KINDS.has(w.kind)) && <span className="mark warn" title={t("Read before use")}><AlertTriangle size={11} /></span>}
      <AeBadge s={s} compact />{on && <span className="chk"><Check size={13} /></span>}</span>
    <span className="nm">{t(s.title)}</span>
    <span className="by">{showAuthor && <AuthorTag author={author} />}{(s.comingSoon || catOf(t, s)) && <span className="cat" title={s.comingSoon ? t("Coming soon") : catOf(t, s)}>{s.comingSoon ? t("Coming soon") : catOf(t, s)}</span>}</span>
  </button>;
}

// by author first, each author's styles in the app's category order; "By category" puts alike styles of
// different authors next to each other, in the lines of the user's sign-off sheet (styleRows.js)
const SORTS = { author: "By author", category: "By category", name: "Name A–Z", demo: "Demo length" };
/** What If (FreshStack) shows as "Coming soon" until its engine exists: a tile that cannot be used. */
export const WHAT_IF = { id: "what-if", title: "What If", author: "freshstack", category: "Cartoon & Anime", available: false, comingSoon: true, aspects: [],
  description: "FreshStack's What If films: a question answered as a short animated story. Coming soon: it opens when its engine is ready." };

/** The gallery while the catalog loads: the filter column, a grid of tiles and the details, drawn as quiet shapes. */
function GallerySkeleton() {
  const t = useT();
  return <div className="sgb-layout sgb-skel" role="status" aria-label={t("Loading film styles…")}>
    <div className="sgb-facets">{[6, 3, 8].map((n, g) => <div key={g} className="sgb-fg"><i className="sk sk-l" />{Array.from({ length: n }, (_, i) => <i key={i} className="sk sk-row" />)}</div>)}</div>
    <div className="sgb-center"><div className="sgb-bar"><i className="sk sk-l" /></div>
      <div className="sgb-grid">{Array.from({ length: 6 }, (_, i) => <div key={i} className="sgb-card"><i className="sk sk-shot" /><i className="sk sk-nm" /><i className="sk sk-by" /></div>)}</div></div>
    <div className="sgb-insp"><i className="sk sk-shot" /><i className="sk sk-nm" /><i className="sk sk-p" /><i className="sk sk-p" /><i className="sk sk-p short" /></div>
  </div>;
}

/** The Studio lays the same styles out as crates by author (studio/StyleCrates.jsx); The Desk keeps its gallery. */
export default function StyleGallery() { return useThemeId() === "studio" ? <StyleCrates /> : <DeskGallery />; }

function DeskGallery() {
  const t = useT();
  const { data, error, loading, reload } = useStyles();
  const [apply, setApply] = useState(null);
  const projectId = new URLSearchParams(location.hash.split("?")[1] ?? "").get("project");
  const [fp, setFp] = usePref("styles:facets", F0);
  const [sort, setSort] = usePref("styles:sort", "author");
  const [curId, setCurId] = usePref("styles:current", null);
  const [panel, setPanel] = useState(null);                 // narrow window: "filters" or "style" open over the grid
  const f = { ...F0, ...fp };
  const set = (x) => setFp((o) => ({ ...F0, ...o, ...x }));
  const soon = (data?.comingSoon ?? []).map((x) => ({ ...WHAT_IF, ...x, author: x.author === "FreshStack" ? "freshstack" : x.author, available: false, comingSoon: true }));          // top-level comingSoon
  const styles = useMemo(() => (data ? [...data.styles, ...(soon.length ? soon : data.styles.some((s) => authorOf(s) === "freshstack") ? [] : [WHAT_IF])] : []), [data]); // eslint-disable-line react-hooks/exhaustive-deps
  const authors = useMemo(() => authorsOf(data), [data]);
  const A = useMemo(() => Object.fromEntries(authors.map((a) => [a.id, a])), [authors]);
  const list = useMemo(() => {
    const l = styles.filter((s) => passes(s, f));
    const order = Object.fromEntries(authors.map((a, i) => [a.id, i])), rank = styleRank(styles);
    const au = (s) => order[authorOf(s)] ?? 99, at = (s) => rank.get(s.id) ?? [99, 999];
    return sort === "name" ? [...l].sort(byName) : sort === "demo" ? [...l].sort((a, b) => (a.demo?.dur ?? 1e9) - (b.demo?.dur ?? 1e9))
      : sort === "category" ? [...l].sort((a, b) => at(a)[0] - at(b)[0] || at(a)[1] - at(b)[1] || au(a) - au(b))
      : [...l].sort((a, b) => au(a) - au(b) || at(a)[0] - at(b)[0] || at(a)[1] - at(b)[1]);
  }, [styles, fp, sort, authors]); // eslint-disable-line react-hooks/exhaustive-deps
  const cur = list.find((s) => s.id === curId) ?? list[0] ?? null;
  // 3 rows a page; a new filter or sort starts at page 1, a new page size (or the first visit) shows the style in hand
  const grid = useGalleryGrid(), size = grid.size;
  const [pg, setPg] = useState(0);
  useEffect(() => { setPg(0); }, [fp, sort]);
  useEffect(() => { setPg(Math.max(0, Math.floor(list.findIndex((s) => s.id === cur?.id) / size))); }, [size, data]); // eslint-disable-line react-hooks/exhaustive-deps
  const shown = list.slice(pg * size, (pg + 1) * size);
  const nFilters = f.authors.length + f.kinds.length + f.cats.length + (f.vn !== "all") + (f.q ? 1 : 0);
  const filtersOn = nFilters > 0;
  const use = (s) => go(`/new?style=${s.id}`);
  const pickCard = (s) => { setCurId(s.id); if (matchMedia("(max-width: 1100px)").matches) setPanel("style"); };          // a narrow window shows the style over the grid
  useEffect(() => { if (!panel) return undefined; const esc = (e) => { if (e.key === "Escape") setPanel(null); }; addEventListener("keydown", esc); return () => removeEventListener("keydown", esc); }, [panel]);
  const pills = [...f.authors.map((id) => [A[id]?.name ?? id, { authors: f.authors.filter((x) => x !== id) }]), ...f.kinds.map((k) => [t(KINDS[k] ?? k), { kinds: f.kinds.filter((x) => x !== k) }]),
    ...f.cats.map((c) => [catLabel(t, c), { cats: f.cats.filter((x) => x !== c) }]),
    ...(f.vn !== "all" ? [[f.vn === "ok" ? t("Vietnamese letters") : t("No Vietnamese letters"), { vn: "all" }]] : []), ...(f.q ? [[`“${f.q}”`, { q: "" }]] : [])];
  return (
    <div className="page sgb-page gal-page">
      <div className="page-head"><div><BackButton /><h1>{t("Film Styles")}</h1><p className="lead">{t("How a whole film is made and how it looks, by author.")}</p></div></div>
      {projectId && <Banner kind="info">{t("Choosing a new film style for this project.")}</Banner>}
      {error && <Banner kind="error" action={<button className="btn sm" onClick={reload}>{t("Retry")}</button>}>{error.message}</Banner>}
      {loading && !data ? <GallerySkeleton /> : data && (
        <div className={"sgb-layout" + (panel ? " panel-" + panel : "")}>
          {panel && <div className="sgb-scrim" onClick={() => setPanel(null)} />}
          <aside className="sgb-facets" aria-label={t("Filters")}>
            <Facets styles={styles} authors={authors} f={f} set={set} />
          </aside>
          <section className="sgb-center" aria-label={t("Film styles")}>
            <div className="sgb-bar">
              <button type="button" className="btn sm sgb-filters-btn" onClick={() => setPanel("filters")}><SlidersHorizontal size={13} />{t("Filters")}{nFilters > 0 && <span className="num"> · {nFilters}</span>}</button>
              {/* One rule with the style picker: a "Coming soon" style shows but is not counted */}
              {(() => { const n = list.filter((s) => !s.comingSoon).length, total = styles.filter((s) => !s.comingSoon).length;
                return <span className="count num" aria-live="polite">{n === total ? t("{n} film styles", { n: total }) : t("{n} of {total} film styles", { n, total })}</span>; })()}
              {pills.map(([l, x], i) => <button key={i} type="button" className="sgb-pill" onClick={() => set(x)} aria-label={t("Remove filter {name}", { name: l })}>{l}<X size={12} /></button>)}
              {filtersOn && <button type="button" className="btn ghost sm" onClick={() => setFp(F0)}>{t("Clear filters")}</button>}
              <span className="end"><select className="select" value={sort} onChange={(e) => setSort(e.target.value)} aria-label={t("Sort")}>
                {Object.entries(SORTS).map(([k, l]) => <option key={k} value={k}>{t(l)}</option>)}</select></span>
            </div>
            {list.length === 0 && <div className="empty"><p>{t("No film style matches.")}</p><button className="btn" onClick={() => setFp(F0)}>{t("Clear filters")}</button></div>}
            <div className="sgb-grid" ref={grid.ref} style={grid.style}>{shown.map((s) => <StyleTile key={s.id} s={s} author={A[authorOf(s)]} on={cur?.id === s.id} onPick={pickCard} />)}</div>
            <Pager keep page={pg} size={size} total={list.length} onPage={setPg} />
          </section>
          <aside className="sgb-insp" aria-label={cur ? t("Film style: {title}", { title: cur.title }) : t("Film style")}>
            {panel === "style" && <BackButton className="insp" onClick={() => setPanel(null)} />}
            {cur ? <div className="insp-in" key={cur.id}><StyleDetails s={cur} author={A[authorOf(cur)]} actions={<>
              <button className="btn primary" onClick={() => use(cur)} disabled={cur.available === false}><Plus size={15} />{t("Use this film style")}</button>
              {projectId && <button className="btn" onClick={() => setApply(cur)} disabled={cur.available === false}><Check size={14} />{t("Use in this project")}</button>}
              <DemoLink s={cur} /></>} /></div>
              : <p className="hint">{t("Choose a film style to see it here.")}</p>}
          </aside>
        </div>)}
      {apply && projectId && <ApplyStyleDialog projectId={projectId} style={apply} onClose={() => setApply(null)} />}
    </div>
  );
}

export function ApplyStyleDialog({ projectId, style, onClose }) {
  const t = useT();
  const toast = useToast();
  const { data: p } = useData(() => get(`/api/projects/${projectId}`), [projectId]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const ok = async () => {
    setBusy(true); setErr(null);
    try { await patch(`/api/projects/${projectId}`, { styleId: style.id }); toast(t("Film style set to {title}", { title: style.title })); onClose(); go(`/projects/${projectId}`); }
    catch (e) { setErr(e.message); } finally { setBusy(false); }
  };
  return <Dialog icon={<Sparkles size={18} />} title={t("Change the film style?")} onClose={onClose} footer={<><span className="spacer" /><button className="btn" onClick={onClose}>{t("Cancel")}</button>
    <button className="btn primary" onClick={ok} disabled={busy || !p}>{t("Use {title}", { title: style.title })}</button></>}>
    <dl className="kv"><dt>{t("Now")}</dt><dd>{p?.meta?.style?.title ?? t("No style")}</dd><dt>{t("New")}</dt><dd>{style.title}</dd></dl>
    <div><b style={{ fontWeight: 500 }}>{t("Changes")}</b><ul className="steps-list" style={{ marginTop: "0.4rem" }}>
      <li>{t("Claude follows the new film style from now on.")}</li></ul></div>
    <div><b style={{ fontWeight: 500 }}>{t("Stays")}</b><ul className="steps-list" style={{ marginTop: "0.4rem" }}>
      <li>{t("Everything already built: scenes, your edits, audio and timing.")}</li>
      <li>{t("The old film style stays in the history, so you can switch back.")}</li></ul></div>
    {err && <Banner kind="error">{err}</Banner>}
  </Dialog>;
}
