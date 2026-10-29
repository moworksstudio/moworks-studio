// The Studio's Film Styles: digging through record crates. One crate per author in a fixed
// order, "Anidoodle (35)" with "by Alex Greenshpun" and its tag; each style is a sleeve standing tilted on the crate's shelf, lifted on
// hover and pulled out on a click. The style in hand develops on the light table on the left (blue pencil, ink, colour in 0.9 s) with the
// same details as The Desk (description, what it is built with, warnings, used for, demo film, credit) and its actions. The label maker
// searches, the paper tabs pick a category, Vietnamese letters is a chip. What If (FreshStack) waits in its own crate as "Coming soon".
// Same data as The Desk's gallery (GET /api/styles/list); the crates fit the window and each turns sideways with the wheel (wheel.js).
import { useMemo, useState } from "react";
import { Check, Plus, Search, X } from "lucide-react";
import { Banner, NoPreview } from "../components.jsx";
import { go, usePref } from "../lib.jsx";
import { useT } from "../i18n.jsx";
import { AuthorName } from "../authors.jsx";
import { styleRank, STYLE_ROWS } from "../styleRows.js";
import AeBadge from "../workflow/AeBadge.jsx";
import { ApplyStyleDialog, DemoLink, StyleDetails, WHAT_IF, authorOf, authorsOf, catLabel, catOf, thumbOf, usesOf, useStyles } from "../screens/StyleGallery.jsx";

const CAT_ORDER = STYLE_ROWS.map(([c]) => c);

function hit(s, q, cat, vn) {
  if (cat && s.category !== cat) return false;
  if (vn !== "all" && s.vnFont !== (vn === "ok")) return false;
  if (!q) return true;
  const hay = [s.title, s.titleOriginal, s.description, s.category, s.demo?.title, ...usesOf(s)].join(" ").toLowerCase();
  return q.toLowerCase().split(/\s+/).every((w) => hay.includes(w));
}

/** One author's crate: a shelf of sleeves, packed like a real record shelf (no scrolling: the more sleeves, the closer they stand), the
 *  author's name, maker and tag as a label on the shelf's front. */
function Crate({ a, ss, cur, onPick }) {
  return <div className="st-crate" style={{ "--n": ss.length, flexGrow: ss.length + 4 }}>
    <div className="st-box"><div className="st-sleeves">{ss.map((s) => <Sleeve key={s.id} s={s} on={cur?.id === s.id} onPick={onPick} />)}</div>
      <div className="st-plate"><AuthorName a={a} count={a.comingSoon ? false : ss.length} /></div></div>
  </div>;
}
/** Shelves of even weight: an author with many styles fills a row of its own, the authors with few share one row (in their order). */
const BIG = 20;
function rowsOf(crates) {
  const rows = []; let few = null;
  for (const c of crates) { if (c[1].length >= BIG) rows.push([c]); else { if (!few) { few = []; rows.push(few); } few.push(c); } }
  return rows;
}

/** One style as a record sleeve: its still, name and category; what After Effects gets of it as a small ink stamp on the picture (AeBadge). */
function Sleeve({ s, on, onPick }) {
  const t = useT();
  return <button type="button" className="st-sleeve" aria-pressed={on} onClick={() => onPick(s)} title={t(s.title)}>
    {s.comingSoon ? <span className="st-wi" aria-hidden="true">What If</span>
      : thumbOf(s) ? <img src={thumbOf(s)} alt="" loading="lazy" decoding="async" /> : <span className="st-noimg"><NoPreview /></span>}
    <span className="st-cap">{t(s.title)}{(s.comingSoon || catOf(t, s)) && <small>{s.comingSoon ? t("Coming soon") : catOf(t, s)}</small>}</span>
    {s.warnings?.length > 0 && <span className="st-warn" title={t("Read before use")}>!</span>}
    <AeBadge s={s} compact />
  </button>;
}

export default function StyleCrates() {
  const t = useT();
  const { data, error, loading, reload } = useStyles();
  const projectId = new URLSearchParams(location.hash.split("?")[1] ?? "").get("project");
  const [curId, setCurId] = usePref("styles:current", null);          // the same style in hand as The Desk's gallery
  const [q, setQ] = usePref("studio:styles:q", "");
  const [cat, setCat] = usePref("studio:styles:cat", "");
  const [vn, setVn] = usePref("studio:styles:vn", "all");
  const [apply, setApply] = useState(null);
  const soon = (data?.comingSoon ?? []).map((x) => ({ ...WHAT_IF, ...x, author: x.author === "FreshStack" ? "freshstack" : x.author, available: false, comingSoon: true }));
  const styles = useMemo(() => (data ? [...data.styles, ...(soon.length ? soon : data.styles.some((s) => authorOf(s) === "freshstack") ? [] : [WHAT_IF])] : []), [data]); // eslint-disable-line react-hooks/exhaustive-deps
  const authors = useMemo(() => authorsOf(data), [data]);
  const A = useMemo(() => Object.fromEntries(authors.map((a) => [a.id, a])), [authors]);
  const rank = useMemo(() => styleRank(styles), [styles]);
  const cats = useMemo(() => [...new Set(styles.filter((s) => !s.comingSoon).map((s) => s.category).filter(Boolean))]
    .sort((a, b) => (CAT_ORDER.indexOf(a) + 1 || 99) - (CAT_ORDER.indexOf(b) + 1 || 99) || a.localeCompare(b)), [styles]);
  const vnKnown = styles.some((s) => s.vnFont != null);
  const shown = styles.filter((s) => (s.comingSoon ? !cat && vn === "all" && (!q || "what if freshstack".includes(q.toLowerCase())) : hit(s, q, cat, vn)));
  const crates = authors.map((a) => [a, shown.filter((s) => authorOf(s) === a.id).sort((x, y) => (rank.get(x.id)?.[0] ?? 99) - (rank.get(y.id)?.[0] ?? 99) || (rank.get(x.id)?.[1] ?? 999) - (rank.get(y.id)?.[1] ?? 999))])
    .filter(([, ss]) => ss.length);
  const cur = shown.find((s) => s.id === curId) ?? styles.find((s) => s.id === curId) ?? shown[0] ?? null;
  const total = styles.filter((s) => !s.comingSoon).length, n = shown.filter((s) => !s.comingSoon).length;
  const clear = () => { setQ(""); setCat(""); setVn("all"); };

  return <div className="st-room st-styles">
    <div className="st-head"><h1>{t("Film Styles")}</h1><span className="st-aside">{t("How a whole film is made and how it looks, by author.")}</span></div>
    {projectId && <Banner kind="info">{t("Choosing a new film style for this project.")}</Banner>}
    {error && <Banner kind="error" action={<button className="btn sm" onClick={reload}>{t("Retry")}</button>}>{error.message}</Banner>}
    {loading && !data ? <div className="st-digs" role="status" aria-label={t("Loading film styles…")}><div className="st-table st-viewer st-skel" /><div className="st-skel" /></div>
      : data && <div className="st-digs">
        <aside className="st-table st-viewer studio-paper" aria-live="polite" aria-label={cur ? t("Film style: {title}", { title: cur.title }) : t("Film style")}>
          {cur ? <div className="st-develop" key={cur.id}><StyleDetails s={cur} author={A[authorOf(cur)]} actions={<>
            <button className="btn primary" onClick={() => go(`/new?style=${cur.id}`)} disabled={cur.available === false}><Plus size={15} />{cur.comingSoon ? t("Coming soon") : t("Use this film style")}</button>
            {projectId && <button className="btn" onClick={() => setApply(cur)} disabled={cur.available === false}><Check size={14} />{t("Use in this project")}</button>}
            <DemoLink s={cur} /></>} /></div>
            : <p className="st-hand">{t("Choose a film style to see it here.")}</p>}
        </aside>
        <section className="st-digcol" aria-label={t("Film styles")}>
          <div className="st-finder">
            <label className="st-labelmaker"><Search size={15} aria-hidden="true" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("Search film styles")} aria-label={t("Search film styles")} />
              {q && <button type="button" onClick={() => setQ("")} aria-label={t("Clear")}><X size={13} /></button>}</label>
            <div className="st-cats" role="group" aria-label={t("Category")}>
              {["", ...cats].map((c) => <button key={c || "all"} type="button" aria-pressed={cat === c} onClick={() => setCat(c)}>{c ? catLabel(t, c) : t("All")}</button>)}</div>
            {vnKnown && <button type="button" className="st-chip" aria-pressed={vn === "ok"} onClick={() => setVn(vn === "ok" ? "all" : "ok")} title={t("Only film styles whose fonts have Vietnamese letters")}>
              {vn === "ok" && <Check size={12} />}{t("Vietnamese letters")}</button>}
            <span className="st-count num" aria-live="polite">{n === total ? t("{n} film styles", { n: total }) : t("{n} of {total} film styles", { n, total })}</span>
          </div>
          {crates.length === 0 ? <div className="st-empty"><p className="st-hand">{t("No film style matches.")}</p><button className="btn" onClick={clear}>{t("Clear filters")}</button></div>
            : <div className="st-crates">{rowsOf(crates).map((row) => <div key={row[0][0].id} className="st-crow">
              {row.map(([a, ss]) => <Crate key={a.id} a={a} ss={ss} cur={cur} onPick={(x) => setCurId(x.id)} />)}</div>)}</div>}
        </section>
      </div>}
    {apply && projectId && <ApplyStyleDialog projectId={projectId} style={apply} onClose={() => setApply(null)} />}
  </div>;
}

