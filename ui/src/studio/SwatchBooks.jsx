// The Studio's Brand Kits: swatch books on a shelf, each kit a book.
// Every Brand Kit is a swatch book standing on a shelf by source (HyperFrames, Yours): its spine carries its colours as bands and its name
// written down the spine; a scan in progress shows on the spine. A click lays the book on the light table on the left, at a glance; a double click, or
// its Open button, opens the kit's own page (screens/BrandKit.jsx). "Create a Brand Kit from a guideline" opens The Desk's dialog on paper. The state and the data are
// The Desk's (screens/Looks.jsx passes them in).
import { AlertTriangle, Loader2, Search, Upload, X } from "lucide-react";
import { Banner } from "../components.jsx";
import { useT } from "../i18n.jsx";

/** One Brand Kit as a book's spine: its colours as bands, its name down the spine, its source at the foot. */
function Book({ l, on, tag, made, onPick, onOpen }) {
  const t = useT();
  const cs = (l.swatches ?? []).slice(0, 5);
  return <button type="button" className="st-book" aria-pressed={on} onClick={() => onPick(l)} onDoubleClick={() => onOpen(l)} title={made ? `${l.title}, ${made}` : l.title}>
    <span className="st-bands" aria-hidden="true">{cs.length ? cs.map((c) => <i key={c} style={{ background: c }} />) : <i className="none" />}</span>
    <span className="st-spine">{l.title}</span>
    <span className="st-foot">{l.status === "scanning" ? <Loader2 size={12} className="spin" aria-label={t("Scanning")} /> : l.status === "failed" ? <AlertTriangle size={12} aria-label={t("The scan did not finish.")} />
      : l.unread?.length > 0 ? <AlertTriangle size={12} aria-label={t("{n} file(s) not read", { n: l.unread.length })} /> : tag}</span>
  </button>;
}

export default function SwatchBooks({ looks, list, sources, on, setSrc, qs, setQs, sel, onPick, onOpen, madeOf = () => null, label, tagOf, error, loading, onReload, onCreate, details, dialogs }) {
  const t = useT();
  const shelves = sources.map(([s]) => [s, list.filter((l) => (l.group ?? "hf") === s)]).filter(([, ls]) => ls.length);
  // the user's own shelf stands even before the first kit, with a line on how one is made
  const yoursEmpty = !qs && !on.length && !sources.some(([s]) => s === "yours");
  return <div className="st-room st-kits">
    <div className="st-head"><h1>{t("Brand Kits")}</h1><span className="st-aside">{t("a brand's colours, fonts and components, worn by a whole film")}</span>
      <div className="st-acts"><button className="btn primary" onClick={onCreate}><Upload size={15} />{t("Create a Brand Kit from a guideline")}</button></div></div>
    {error?.status === 404 ? <p className="st-hand">{t("Brand Kits are not available on this computer yet.")}</p>
      : error && <Banner kind="error" action={<button className="btn sm" onClick={onReload}>{t("Retry")}</button>}>{error.message}</Banner>}
    {loading ? <div className="st-digs"><div className="st-table st-viewer st-skel" /><div className="st-skel" /></div>
      : !error && <div className="st-digs">
        <aside className="st-table st-viewer studio-paper st-openbook" aria-label={sel ? sel.title : t("Brand Kit")}>
          {sel ? <div className="st-develop insp-in" key={sel.id}>{details(sel)}</div> : <p className="st-hand">{t("Choose a Brand Kit to see it here.")}</p>}
        </aside>
        <section className="st-digcol" aria-label={t("Brand Kits")}>
          <div className="st-finder">
            <label className="st-labelmaker"><Search size={15} aria-hidden="true" /><input value={qs} onChange={(e) => setQs(e.target.value)} placeholder={t("Search Brand Kits")} aria-label={t("Search Brand Kits")} />
              {qs && <button type="button" onClick={() => setQs("")} aria-label={t("Clear")}><X size={13} /></button>}</label>
            {sources.length > 1 && <div className="st-cats" role="group" aria-label={t("Source")}>
              <button type="button" aria-pressed={!on.length} onClick={() => setSrc([])}>{t("All")}</button>
              {sources.map(([s, n]) => <button key={s} type="button" aria-pressed={on.length === 1 && on[0] === s} onClick={() => setSrc([s])}>{label(s)} <span className="num">{n}</span></button>)}</div>}
            <span className="st-count num" aria-live="polite">{list.length === looks.length ? t("{n} Brand Kits", { n: looks.length }) : t("{n} of {total} Brand Kits", { n: list.length, total: looks.length })}</span>
          </div>
          {shelves.length === 0 ? <div className="st-empty"><p className="st-hand">{t("No Brand Kit matches.")}</p>{(qs || on.length > 0) && <button className="btn" onClick={() => { setSrc([]); setQs(""); }}>{t("Clear filters")}</button>}</div>
            : <div className="st-shelves">{shelves.map(([s, ls]) => <div key={s} className="st-shelf">
              <div className="st-crate-head"><span className="st-shelf-name">{label(s)}</span><span className="au-tag">{tagOf(s)}</span><span className="st-label">{ls.length}</span></div>
              <div className="st-box st-bookbox" data-name={label(s)}><div className="st-books">{ls.map((l) => <Book key={l.id} l={l} on={sel?.id === l.id} tag={tagOf(s)} made={madeOf(l)} onPick={onPick} onOpen={onOpen} />)}</div></div>
            </div>)}
              {yoursEmpty && <div className="st-shelf st-shelf-empty"><div className="st-crate-head"><span className="st-shelf-name">{label("yours")}</span><span className="au-tag">{tagOf("yours")}</span></div>
                <div className="st-box st-bookbox" data-name={label("yours")}><div className="st-books"><button type="button" className="st-hand st-linkish" onClick={onCreate}>{t("room for your first kit: make one from a brand guideline")}</button></div></div></div>}</div>}
        </section>
      </div>}
    {dialogs}
  </div>;
}
