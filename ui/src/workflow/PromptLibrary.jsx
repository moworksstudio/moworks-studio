// Writing ideas: a prompt library over New project, laid out like the Style Gallery (filter column, grid, details).
// It holds sets of example prompts to read, copy or add to the brief; OPUSCAR 98 (Lemomo, MIT: 98 style prompts, each written for
// one Best Picture film) is the first. Another set joins by adding an entry to SETS that loads and normalises its prompts.
// Rendered on <body> over the dialog; Esc and Back return to the dialog.
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Copy, Plus, X } from "lucide-react";
import { get } from "../api.js";
import { BackButton, Banner, NoPreview } from "../components.jsx";
import { useData, useToast } from "../lib.jsx";
import { useT } from "../i18n.jsx";
import { CreditLine } from "../screens/StyleGallery.jsx";
import { useDialogFrame } from "./StyleChooser.jsx";

const toneOf = (dim) => (/B&W/i.test(dim ?? "") ? "Black and white" : /sepia/i.test(dim ?? "") ? "Sepia" : "Colour");
/** The prompt sets: each loads to { credit, eras, prompts: [{ id, title, film, year, era, render, tone, tags, desc, prompt, image }] }. */
const SETS = [
  { id: "opuscar98", name: "OPUSCAR 98", tag: "LEMO", author: "Lemomo (LemoLab)",
    load: () => get("/api/library/lemo/sample-prompts").then((r) => ({
      credit: r.credit, eras: r.chapters ?? [],
      prompts: r.prompts.map((p) => ({ id: `opuscar98:${p.no}`, title: p.style_en, film: p.title, year: p.year, era: p.chapter, render: p.render,
        tone: toneOf(p.dim), tags: p.blend_en ?? [], desc: p.desc_en, prompt: p.prompt_en, image: p.image })) })) },
];
const loadAll = () => Promise.all(SETS.map((s) => s.load().then((d) => ({ ...s, ...d, prompts: d.prompts.map((p) => ({ ...p, set: s.id })) }))
  .catch((e) => ({ ...s, error: e, eras: [], prompts: [] }))));

const F0 = { sets: [], render: "all", tone: "all", eras: [] };
const countBy = (list, key) => { const m = new Map(); for (const x of list) { const k = key(x); if (k != null) m.set(k, (m.get(k) ?? 0) + 1); } return m; };
const toggle = (xs, x) => (xs.includes(x) ? xs.filter((y) => y !== x) : [...xs, x]);
function passes(p, f, skip) {
  if (skip !== "sets" && f.sets.length && !f.sets.includes(p.set)) return false;
  if (skip !== "render" && f.render !== "all" && p.render !== f.render) return false;
  if (skip !== "tone" && f.tone !== "all" && p.tone !== f.tone) return false;
  if (skip !== "eras" && f.eras.length && !f.eras.includes(p.era)) return false;
  return true;
}

export default function PromptLibrary({ onAdd, onClose }) {
  const t = useT();
  const toast = useToast();
  const { data: sets, error } = useData(loadAll, []);
  const [f, setF] = useState(F0);
  const [cur, setCur] = useState(null);
  const box = useRef(null);
  const frame = useDialogFrame();          // the New project dialog's frame
  const set = (x) => setF((o) => ({ ...o, ...x }));
  // Esc goes back to the dialog only (its own Esc listener sees a handled key)
  useEffect(() => {
    const esc = (e) => { if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); onClose(); } };
    document.addEventListener("keydown", esc, true);
    return () => document.removeEventListener("keydown", esc, true);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { box.current?.querySelector(".plx-back")?.focus(); }, []);
  const all = useMemo(() => (sets ?? []).flatMap((s) => s.prompts), [sets]);
  const list = all.filter((p) => passes(p, f));
  const p = list.find((x) => x.id === cur) ?? list[0] ?? null;
  const S = Object.fromEntries((sets ?? []).map((s) => [s.id, s]));
  const pool = (skip) => all.filter((x) => passes(x, f, skip));
  const bySet = countBy(pool("sets"), (x) => x.set), byRender = countBy(pool("render"), (x) => x.render), byTone = countBy(pool("tone"), (x) => x.tone), byEra = countBy(pool("eras"), (x) => x.era);
  const renders = ["2D", "2.5D", "3D"].filter((r) => all.some((x) => x.render === r));
  const tones = ["Colour", "Black and white", "Sepia"].filter((r) => all.some((x) => x.tone === r));
  const eras = (sets ?? []).flatMap((s) => s.eras.map((e) => ({ ...e, set: s.id })));
  const row = (key, on, onClick, label, n, sub) => <button key={key} type="button" className={"sgb-opt" + (on ? " on" : "")} role="checkbox" aria-checked={on} onClick={onClick}>
    <span className="sgb-box" aria-hidden="true">{on && <Check size={11} />}</span><span className="l">{label}{sub && <small className="plx-sub">{sub}</small>}</span><span className="n num">{n ?? 0}</span></button>;
  const copy = async (x) => { try { await navigator.clipboard.writeText(x.prompt); toast(t("Copied")); } catch { toast(t("Could not copy to the clipboard"), "error"); } };
  const add = (x) => { onAdd(x.prompt); toast(t("Added to the brief")); onClose(); };
  return createPortal(<>
    <div className="scx-scrim" onMouseDown={onClose} />
    <div className={"plx" + (frame ? " framed" : "")} style={frame} role="dialog" aria-modal="true" aria-labelledby="plx-h" ref={box}>
      <div className="dialog-head">
        <BackButton onClick={onClose} />
        <h2 id="plx-h">{t("Writing ideas")}</h2>
        <span className="count num">{sets ? (list.length === 1 ? t("1 prompt") : t("{n} prompts", { n: list.length })) : ""}</span>
        <button className="btn ghost icon sm x" onClick={onClose} aria-label={t("Close")}><X size={16} /></button></div>
      {error && <div className="plx-pad"><Banner kind="error">{error.message}</Banner></div>}
      {!sets ? <div className="plx-pad"><div className="skeleton" style={{ height: "24rem" }} /></div> : <div className="plx-body">
        <aside className="plx-facets" aria-label={t("Filters")}>
          {sets.length > 1 && <div className="sgb-fg" role="group" aria-label={t("Prompt set")}><span className="sgb-fl">{t("Prompt set")}</span>
            {sets.map((s) => row(s.id, f.sets.includes(s.id), () => set({ sets: toggle(f.sets, s.id) }), s.name, bySet.get(s.id)))}</div>}
          {renders.length > 1 && <div className="sgb-fg"><span className="sgb-fl">{t("2D / 3D")}</span><div className="sgb-chips">
            {renders.map((r) => <button key={r} type="button" className="ml-chip" aria-pressed={f.render === r} onClick={() => set({ render: f.render === r ? "all" : r })}>{r}<span className="num">{byRender.get(r) ?? 0}</span></button>)}</div></div>}
          {tones.length > 1 && <div className="sgb-fg"><span className="sgb-fl">{t("Tone")}</span><div className="sgb-chips">
            {tones.map((r) => <button key={r} type="button" className="ml-chip" aria-pressed={f.tone === r} onClick={() => set({ tone: f.tone === r ? "all" : r })}>{t(r)}<span className="num">{byTone.get(r) ?? 0}</span></button>)}</div></div>}
          {eras.length > 0 && <div className="sgb-fg" role="group" aria-label={t("Era")}><span className="sgb-fl">{t("Era")}</span>
            {eras.map((e) => row(e.id, f.eras.includes(e.id), () => set({ eras: toggle(f.eras, e.id) }), e.en, byEra.get(e.id), e.years))}</div>}
          {JSON.stringify(f) !== JSON.stringify(F0) && <button type="button" className="sgb-more" onClick={() => setF(F0)}>{t("Clear filters")}</button>}
        </aside>
        <div className="plx-grid" role="listbox" aria-label={t("Writing ideas")}>
          {list.length === 0 && <p className="hint">{t("No example matches.")}</p>}
          {list.map((x) => <button key={x.id} type="button" role="option" aria-selected={p?.id === x.id} className={"sgb-card" + (p?.id === x.id ? " on" : "")} onClick={() => setCur(x.id)}>
            <span className="shot">{x.image ? <img src={x.image} alt="" loading="lazy" /> : <NoPreview />}<span className="mark">{x.render}</span>{p?.id === x.id && <span className="chk"><Check size={13} /></span>}</span>
            <span className="nm">{x.title}</span>
            <span className="by">{sets.length > 1 && <span className="au-tag">{S[x.set]?.tag}</span>}<span className="cat">{x.film} · {x.year}</span></span></button>)}
        </div>
        {p && <aside className="plx-detail">
          {p.image && <div className="sgb-big"><img src={p.image} alt="" /></div>}
          <div className="sgb-head"><h2 className="sgb-title">{p.title}</h2>
            <p className="sgb-sub"><span className="au-tag">{S[p.set]?.tag}</span><span>{t("Written for {film}", { film: `${p.film} (${p.year})` })}</span></p></div>
          {p.desc && <p className="sgb-desc">{p.desc}</p>}
          {p.tags.length > 0 && <p className="plx-tags">{p.tags.map((x) => <span key={x}>{x}</span>)}</p>}
          <div className="plx-prompt">{p.prompt}</div>
          {S[p.set]?.credit && <CreditLine author={S[p.set].author} licence={S[p.set].credit.licence} link={S[p.set].credit.link} commit={S[p.set].credit.commit} />}
          <div className="sgb-acts"><button type="button" className="btn primary" onClick={() => add(p)}><Plus size={14} />{t("Add to the brief")}</button>
            <button type="button" className="btn" onClick={() => copy(p)}><Copy size={14} />{t("Copy")}</button></div>
        </aside>}
      </div>}
    </div>
  </>, document.body);
}
