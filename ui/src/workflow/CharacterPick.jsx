// New project's characters: for a style that acts with characters (Brush cartoon), the user picks saved characters to
// reuse here, so Prepare never stops to ask "add Tofu or draw a new one?". None picked: Claude makes the film's own from the brief.
// The picked ones go into the project when it is made. Every style can take them; outside a character style it
// is a compact row under Assets, and the character is drawn in the film's own style from its sheets.
import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Plus, X } from "lucide-react";
import { get } from "../api.js";
import { go, useData } from "../lib.jsx";
import { useT } from "../i18n.jsx";
import { howIn, usable } from "../screens/Characters.jsx";

const picOf = (c) => c.media?.poster ?? c.media?.views ?? null;

export default function CharacterPick({ value = [], onChange, compact = false, film = {}, allow = null }) {
  const t = useT();
  const q = useData(() => get("/api/characters"), []);
  const list = (q.data?.characters ?? []).filter(usable).filter((c) => !allow || allow(c));          // the film style's own rule
  // only what is shown can be picked (a character kept from an earlier draft or style, not shown, still went into the project)
  const shown = list.map((c) => c.id).join(",");
  useEffect(() => { if (q.data && value.some((id) => !list.some((c) => c.id === id))) onChange(value.filter((id) => list.some((c) => c.id === id))); }, [q.data, shown, value.join(",")]); // eslint-disable-line react-hooks/exhaustive-deps
  if (compact) return <CompactPick list={list} value={value} onChange={onChange} film={film} label={!allow} />;
  const toggle = (id) => onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id]);
  return <div className="cp">
    <div className="cp-row" role="group" aria-label={t("Characters")}>
      {list.map((c) => { const on = value.includes(c.id); return <button key={c.id} type="button" className={"cp-card" + (on ? " on" : "")} aria-pressed={on} onClick={() => toggle(c.id)}>
        <span className="cp-pic">{picOf(c) ? <img src={picOf(c)} alt="" loading="lazy" /> : <span className="cp-none" />}{on && <span className="cp-chk"><Check size={12} /></span>}</span>
        <span className="cp-nm">{c.name}</span>{howIn(c, film) && <span className="cp-how">{t(howIn(c, film))}</span>}</button>; })}
      <button type="button" className="cp-card cp-new" onClick={() => go(film.hand ? `/characters?hand=${encodeURIComponent(film.hand)}` : "/characters")} title={t("Make and save characters on the Characters page")}><span className="cp-pic"><Plus size={18} /></span><span className="cp-nm">{t("More")}</span></button>
    </div>
    <p className="np2-desc">{value.length ? t("Claude uses the characters you picked; anyone else the brief needs is made new.") : t("None picked: Claude makes the film's own characters from the brief.")}</p>
  </div>;
}

/** The compact row: "Characters" with the picked ones as chips and a small list to add one; one quiet line on how it is drawn. */
function CompactPick({ list, value, onChange, film, label = true }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const off = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", off); return () => document.removeEventListener("mousedown", off);
  }, [open]);
  const picked = list.filter((c) => value.includes(c.id));
  const toggle = (id) => onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id]);
  return <div className="cp-compact" ref={ref}>
    {label && <span className="np2-l">{t("Characters")}</span>}          {/* inside New project's own Characters box the box title says it (one title) */}
    {picked.map((c) => <span key={c.id} className="cp-chip">{picOf(c) && <img src={picOf(c)} alt="" />}{c.name}
      <button type="button" className="btn ghost icon sm" onClick={() => toggle(c.id)} aria-label={t("Remove {name}", { name: c.name })}><X size={12} /></button></span>)}
    <span className="pick"><button type="button" className="btn sm" onClick={() => setOpen((o) => !o)} aria-expanded={open} disabled={!list.length}><Plus size={13} />{t("Add a character")}<ChevronDown size={13} /></button>
      {open && <ul className="pick-list cp-list" role="listbox">{list.map((c) => <li key={c.id} role="option" aria-selected={value.includes(c.id)}>
        <button type="button" onClick={() => { toggle(c.id); setOpen(false); }}>{picOf(c) ? <img src={picOf(c)} alt="" /> : <span className="ph" />}<span className="tx"><b>{c.name}</b></span>{value.includes(c.id) && <Check size={14} />}</button></li>)}</ul>}</span>
    {picked.length > 0 && <span className="np2-desc">{t([...new Set(picked.map((c) => howIn(c, film)))].length === 1 ? howIn(picked[0], film) ?? "Drawn in this film's style" : "Drawn in this film's style")}</span>}
  </div>;
}
