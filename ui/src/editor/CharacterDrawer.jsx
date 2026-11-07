// The characters drawer (owner #1319 2b): the motion and sound drawers' sibling, in the timeline's place. The characters this film's style can
// take (castRule, as New production picks them: a style's own characters, or any as a reference where the style redraws them), each with its
// poster, name and height; a click puts it in the message as a chip (a second click takes it out). The owner writes what they want in their own
// words; the app puts the picked ones in the film's cast when the message goes, and Claude asks only what the words leave open.
import { useEffect, useMemo, useState } from "react";
import { Check, Plus, Search, X } from "lucide-react";
import { get } from "../api.js";
import { useT } from "../i18n.jsx";
import { useStyles } from "../screens/StyleGallery.jsx";
import { castRule } from "../workflow/NewProjectDialog.jsx";

/** The film's style's rule for characters: { mode: "own" | "redraw" | "locked", allow(c) }. */
export function useCastRule(styleId) {
  const sq = useStyles();
  const style = (sq.data?.styles ?? []).find((s) => s.id === styleId) ?? null;
  return style ? castRule(style) : null;
}

export default function CharacterDrawer({ styleId, picked = [], onToggle, onClose }) {
  const t = useT();
  const rule = useCastRule(styleId);
  const [all, setAll] = useState(null), [q, setQ] = useState("");
  useEffect(() => { let on = true; get("/api/characters").then((r) => { if (on) setAll(r.characters ?? r ?? []); }).catch(() => { if (on) setAll([]); }); return () => { on = false; }; }, []);
  useEffect(() => { const esc = (e) => { if (e.key === "Escape") onClose(); }; document.addEventListener("keydown", esc); return () => document.removeEventListener("keydown", esc); }, [onClose]);
  const rows = useMemo(() => (all ?? []).filter((c) => !c.demo && c.selectable !== false && (rule ? rule.allow(c) : false))
    .filter((c) => !q.trim() || `${c.name} ${c.about ?? ""}`.toLowerCase().includes(q.trim().toLowerCase())), [all, rule, q]);
  const has = (id) => picked.some((p) => p.id === id);
  const why = rule?.mode === "redraw" ? t("Drawn in this film's style: it may not match the library exactly.") : t("Only the characters this film's style can animate.");
  return <div className="mdr cdr" role="dialog" aria-label={t("Characters")}>
    <div className="mdr-head">
      <b className="mdr-title">{t("Characters")}</b>
      <label className="mdr-search"><Search size={13} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("Search characters")} aria-label={t("Search the characters")} /></label>
      <span className="mdr-for">{why}</span>
      <span className="mdr-count num">{rows.length}</span>
      <button className="btn ghost icon sm" onClick={onClose} aria-label={t("Close the characters")} title={t("Close (Esc)")}><X size={15} /></button>
    </div>
    <div className="mdr-row cdr-row" role="list">
      {all === null && Array.from({ length: 6 }, (_, i) => <span key={i} className="mdr-card cdr-card skeleton" />)}
      {all !== null && rule?.mode === "locked" && <p className="hint cdr-note">{t("This film style draws everyone in its own hand; say who appears in your message.")}</p>}
      {all !== null && rule?.mode !== "locked" && !rows.length && <p className="hint cdr-note">{t("No character in the library fits this film style yet.")}</p>}
      {rows.map((c) => { const on = has(c.id);
        return <button key={c.id} type="button" role="listitem" className={"mdr-card cdr-card" + (on ? " on" : "")} aria-pressed={on} onClick={() => onToggle(c)} title={c.about ?? c.name}>
          <span className="mdr-media cdr-media">{c.media?.poster ? <img src={c.media.poster} alt="" loading="lazy" /> : <span className="mdr-noposter">{c.name}</span>}</span>
          <span className="mdr-name">{c.name}{c.heightM ? <span className="cdr-h num"> · {Number(c.heightM).toFixed(2)} m</span> : null}</span>
          <span className={"cdr-add" + (on ? " on" : "")}>{on ? <><Check size={12} />{t("Added")}</> : <><Plus size={12} />{t("Add")}</>}</span>
        </button>; })}
    </div>
  </div>;
}
