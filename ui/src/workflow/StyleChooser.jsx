// New project's style step: the chosen style as a card (frame, name,
// author tag, what it is built with, demo film) and "Change style", which opens the chooser: author tabs, that author's styles as frames,
// and the same details the Style Gallery shows. Rendered on <body> so the dialog's zoom (useFit) does not shrink it twice.
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, LayoutGrid, Replace, Search, X } from "lucide-react";
import { BackButton, NoPreview } from "../components.jsx";
import { useT } from "../i18n.jsx";
import { authorOf, byLine, catLabel, catOf, DemoLink, StyleDetails, StyleTile, TechTags, thumbOf, usesOf } from "../screens/StyleGallery.jsx";
import { AuthorBadge, AuthorName, authorView } from "../authors.jsx";

/** The New project dialog's frame on screen, so a box opened from it (the style chooser, Writing ideas) takes exactly that frame and
 *  moving between them never changes it. Undefined when no New project dialog is open. */
export function useDialogFrame() {
  const [r, setR] = useState(null);
  useLayoutEffect(() => {
    const el = document.querySelector(".np-dialog");
    if (!el) return undefined;
    const read = () => { const b = el.getBoundingClientRect(); setR({ left: b.left, top: b.top, width: b.width, height: b.height }); };
    read();
    const ro = new ResizeObserver(read); ro.observe(el); addEventListener("resize", read);
    return () => { ro.disconnect(); removeEventListener("resize", read); };
  }, []);
  return r ? { left: r.left, top: r.top, width: r.width, height: r.height } : undefined;
}

/** The style the project will use, as a card; "Change style" opens the chooser. */
export function StyleCard({ style, styles, authors, onChange }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const a = authors.find((x) => x.id === authorOf(style ?? {}));
  const chooser = open && <StyleChooser value={style?.id ?? null} styles={styles} authors={authors} onClose={() => setOpen(false)} onPick={(s) => { onChange(s.id); setOpen(false); }} />;
  if (!style) return <><button type="button" className="btn np-choose" onClick={() => setOpen(true)}>{t("Choose a film style")}</button>{chooser}</>;
  return <>
    <div className="np-style">
      {thumbOf(style) ? <img className="sf" src={thumbOf(style)} alt="" decoding="async" /> : <span className="sf"><NoPreview /></span>}
      <div className="np-style-main">
        <p className="nm">{t(style.title)}</p>          {/* English only on screen; the original title stays searchable */}
        <p className="sub"><span className="sgb-by">{t("by {who}", { who: byLine(style, authorView(a ?? authorOf(style)).by) })} <AuthorBadge a={a ?? authorOf(style)} /></span>{catOf(t, style) && <span>{catOf(t, style)}</span>}</p>
        <TechTags s={style} />
        <p className="row"><DemoLink s={style} className="np-link" />
          <button type="button" className="btn sm" onClick={() => setOpen(true)}><Replace size={13} />{t("Change film style")}</button></p>
      </div>
    </div>
    {chooser}
  </>;
}

/** The chooser: author tabs → that author's styles → the details; "Choose" sets the project's style. */
export function StyleChooser({ value, styles, authors, onClose, onPick }) {
  const t = useT();
  const startAuthor = authorOf(styles.find((s) => s.id === value) ?? {});
  const [tab, setTab] = useState(startAuthor || "all");
  const [cat, setCat] = useState("all");
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(value);
  const box = useRef(null);
  const frame = useDialogFrame();
  useEffect(() => { box.current?.querySelector(".scx-tab.on")?.focus(); }, []);
  // Esc closes the chooser only; the New project dialog behind it stays (its own Esc listener sees a handled key)
  useEffect(() => {
    const esc = (e) => { if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); onClose(); } };
    document.addEventListener("keydown", esc, true);
    return () => document.removeEventListener("keydown", esc, true);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const inTab = styles.filter((s) => tab === "all" || authorOf(s) === tab);
  const cats = [...new Set(inTab.map((s) => s.category))];
  // The category counts and the details follow the search (a search for "Swiss" showed "All 59" and another style's details)
  const found = useMemo(() => inTab.filter((s) => !q || [s.title, s.titleOriginal, s.description, s.category, ...usesOf(s)].join(" ").toLowerCase().includes(q.toLowerCase())), [inTab, q]); // eslint-disable-line react-hooks/exhaustive-deps
  const list = found.filter((s) => cat === "all" || s.category === cat);
  const cur = list.find((s) => s.id === sel) ?? list[0] ?? null;
  const A = Object.fromEntries(authors.map((x) => [x.id, x]));
  const goTab = (k) => {          // the details follow the tab: the style in hand if it is this author's, else the author's first
    setTab(k); setCat("all");
    if (k !== "all" && authorOf(styles.find((s) => s.id === sel) ?? {}) !== k) setSel(styles.find((s) => authorOf(s) === k)?.id ?? null);
  };
  // each author as "Anidoodle (35)" over "by Alex Greenshpun ANI"; What If shows, "Coming soon", and cannot be chosen
  const tabs = [["all", null, styles.length], ...authors.filter((x) => x.comingSoon || styles.some((s) => authorOf(s) === x.id)).map((x) => [x.id, x, styles.filter((s) => authorOf(s) === x.id).length])];
  return createPortal(<>
    <div className="scx-scrim" onMouseDown={onClose} />
    <div className={"scx" + (frame ? " framed" : "")} style={frame} role="dialog" aria-modal="true" aria-labelledby="scx-h" ref={box}>
      <div className="dialog-head scx-head"><BackButton onClick={onClose} /><h2 id="scx-h">{t("Choose a film style")}</h2>
        <button className="btn ghost icon sm x" onClick={onClose} aria-label={t("Close")}><X size={16} /></button></div>
      <div className="scx-tabs" role="tablist" aria-label={t("Author")}>
        {tabs.map(([k, au, n]) => <button key={k} type="button" role="tab" aria-selected={tab === k} className={"scx-tab" + (tab === k ? " on" : "") + (au?.comingSoon ? " soon" : "")}
          onClick={() => !au?.comingSoon && goTab(k)} aria-disabled={au?.comingSoon || undefined} title={au?.comingSoon ? t("Coming soon") : undefined}>
          {au ? <AuthorName a={au} count={au.comingSoon ? false : n} className="tx" /> : <span className="tx"><b><LayoutGrid size={13} /> {t("All authors")}</b><small className="num">{n}</small></span>}</button>)}
      </div>
      <div className="scx-tools">
        <div className="search"><Search size={14} /><input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("Search film styles")} aria-label={t("Search film styles")} /></div>
        {cats.length > 1 && <div className="scx-cats" role="group" aria-label={t("Category")}>
          <button type="button" className="ml-chip" aria-pressed={cat === "all"} onClick={() => setCat("all")}>{t("All")}<span className="num">{found.length}</span></button>
          {cats.filter((c) => cat === c || found.some((s) => s.category === c)).map((c) => <button key={c} type="button" className="ml-chip" aria-pressed={cat === c} onClick={() => setCat(c)}>{catLabel(t, c)}<span className="num">{found.filter((s) => s.category === c).length}</span></button>)}</div>}
      </div>
      <div className="scx-body">
        <div className="scx-grid" role="radiogroup" aria-label={t("Film styles")}>
          {list.length === 0 && <p className="hint">{t("No film style matches.")}</p>}
          {list.map((s) => <StyleTile key={s.id} s={s} author={A[authorOf(s)]} on={cur?.id === s.id} onPick={(x) => setSel(x.id)} role="radio" showAuthor={tab === "all"} />)}
        </div>
        {cur && <aside className="scx-preview"><StyleDetails s={cur} author={A[authorOf(cur)]} actions={<DemoLink s={cur} className="btn sm" />} /></aside>}
      </div>
      <div className="scx-foot"><span className="spacer" />
        <button type="button" className="btn" onClick={onClose}>{t("Cancel")}</button>
        <button type="button" className="btn primary" disabled={!cur || cur.available === false} onClick={() => onPick(cur)}><Check size={14} />{cur ? t("Choose {title}", { title: t(cur.title) }) : t("Choose")}</button></div>
    </div>
  </>, document.body);
}
