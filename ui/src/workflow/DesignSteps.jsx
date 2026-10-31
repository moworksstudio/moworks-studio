// New project's Brand Kit box (HF's frame presets and the user's own Looks). Empty is "From brief": Claude follows
// the design the brief describes; a chosen Brand Kit wins over the brief for colours, fonts and layout. The line under the field
// names where the film's design comes from. A style that brings its own design (Slideshow, every author style) locks it; a Brand Kit
// chosen all the same stays chosen and is sent, and Claude asks in Prepare how to use it (house rules §2b): the line says so.
// The box's title names the one field, so the field's label is for screen readers only and the picker spans the box.
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Lock, Upload } from "lucide-react";
import { get } from "../api.js";
import { go } from "../lib.jsx";
import { useT } from "../i18n.jsx";

function Swatches({ colors }) {
  if (!colors?.length) return null;
  return <span className="ds-sw" aria-hidden="true">{colors.slice(0, 5).map((c) => <i key={c} style={{ background: c }} />)}</span>;
}

/** Where a list opens: on <body>, fixed to its button, below it when it fits and above it when it does not, so it
 *  never grows or scrolls the dialog it belongs to. */
function usePlace(btn, open) {
  const [st, setSt] = useState(null);
  useLayoutEffect(() => {
    if (!open) return undefined;
    const place = () => {
      const r = btn.current?.getBoundingClientRect(); if (!r) return;
      const gap = 6, below = innerHeight - r.bottom - gap - 8, above = r.top - gap - 8, up = below < 260 && above > below;
      const width = Math.min(Math.max(r.width, 416), innerWidth - 16), left = Math.max(8, Math.min(r.left, innerWidth - width - 8));
      setSt({ position: "fixed", left, width, maxHeight: Math.min(352, up ? above : below), ...(up ? { top: "auto", bottom: innerHeight - r.top + gap } : { top: r.bottom + gap, bottom: "auto" }) });
    };
    place();
    addEventListener("resize", place); addEventListener("scroll", place, true);
    return () => { removeEventListener("resize", place); removeEventListener("scroll", place, true); };
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  return st;
}

/** One design field: a button with the choice (and what of it counts), opening a list in groups. */
function Picker({ id, label, value, none, noneSub, groups, disabled, locked, onChange, footer }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const ref = useRef(null), btn = useRef(null), list = useRef(null);
  const place = usePlace(btn, open);
  useEffect(() => {
    if (!open) return undefined;
    const off = (e) => { if (!ref.current?.contains(e.target) && !list.current?.contains(e.target)) setOpen(false); };
    const esc = (e) => { if (e.key === "Escape") { e.stopPropagation(); setOpen(false); } };
    document.addEventListener("mousedown", off); document.addEventListener("keydown", esc, true);
    return () => { document.removeEventListener("mousedown", off); document.removeEventListener("keydown", esc, true); };
  }, [open]);
  const cur = groups.flatMap((g) => g.items).find((x) => x.id === value) ?? null;
  const pick = (v) => { onChange(v); setOpen(false); };
  return <div className="ds-field"><span className="sr-only" id={id}>{label}</span>
    <div className="pick" ref={ref}>
      <button type="button" ref={btn} className={"pick-btn ds-btn" + (locked ? " locked" : "")} disabled={disabled} onClick={() => setOpen((o) => !o)} aria-haspopup="listbox" aria-expanded={open} aria-labelledby={id}>
        {locked ? <Lock size={13} className="ds-lock" /> : cur ? <Swatches colors={cur.swatches} /> : null}
        <span className="t">{locked ?? (cur ? cur.title : none)}</span>{!disabled && <ChevronDown size={14} />}</button>
      {open && place && createPortal(<ul ref={list} className="pick-list ds-list ds-float" style={place} role="listbox" aria-labelledby={id}>
        <li role="option" aria-selected={!value}><button type="button" onClick={() => pick("")}><span className="tx"><b>{none}</b>{noneSub && <span>{noneSub}</span>}</span>{!value && <Check size={14} />}</button></li>
        {groups.filter((g) => g.items.length).map((g) => [
          <li key={"h:" + g.label} role="presentation" className="pick-head">{g.label}<span className="num">{g.items.length}</span></li>,
          ...g.items.map((x) => <li key={x.id} role="option" aria-selected={x.id === value}>
            <button type="button" onClick={() => pick(x.id)}><Swatches colors={x.swatches} />
              <span className="tx"><b>{x.title}</b>{x.sub && <span>{x.sub}</span>}</span>{x.id === value && <Check size={14} />}</button></li>)])}
        {footer && <li role="presentation" className="ds-foot">{footer}</li>}
      </ul>, document.body)}
    </div></div>;
}

/** The film's language as its brief says it, the rule the server applies when it makes the project (briefLanguage in
 *  packages/project-service): "en" or "vi" when the brief names one, "vi" when it is written in Vietnamese, else null (Prepare asks). */
export function filmLanguage(text) {
  const s = String(text ?? "").normalize("NFC");
  const en = /tiếng\s*anh|\benglish\b|\bin\s+eng\b|\beng\s+voice\b/i.test(s), vi = /tiếng\s*việt|\bvietnamese\b/i.test(s);
  if (en !== vi) return en ? "en" : "vi";
  if (en && vi) return null;
  return /[ăâđêôơưàáạảãằắặẳẵầấậẩẫèéẹẻẽềếệểễìíịỉĩòóọỏõồốộổỗờớợởỡùúụủũừứựửữỳýỵỷỹ]/i.test(s) ? "vi" : null;
}

/** The design field; `value` is { look } (an id, "" for From brief); `brief` is the brief's text, which gives the film's language. */
export default function DesignSteps({ style, value, onChange, brief = "" }) {
  const t = useT();
  const vietnamese = filmLanguage(brief) === "vi";
  const [looks, setLooks] = useState([]);
  useEffect(() => {
    get("/api/looks").then((r) => setLooks((r.looks ?? []).filter((l) => l.status === "ready"))).catch(() => setLooks([]));
  }, []);
  const locked = style?.design ? style.design !== "open" : !style?.look;          // design "open" | "author"
  const short = (s) => String(s ?? "").replace(/\s+/g, " ").slice(0, 90);
  const lookGroups = [
    { label: t("Your Brand Kits"), items: looks.filter((l) => l.group === "yours").map((l) => ({ id: l.id, title: l.title, sub: short(l.description), swatches: l.swatches, vi: l.vi, fonts: l.fonts })) },
    { label: "HyperFrames", items: looks.filter((l) => l.group === "hf").map((l) => ({ id: l.id, title: l.title, sub: "", swatches: l.swatches, vi: l.vi, fonts: l.fonts })) },
  ];
  const look = lookGroups.flatMap((g) => g.items).find((x) => x.id === value.look);
  // one sentence says where colours, fonts and layout come from
  const summary = look ? t("Colours, fonts and layout from {kit}.", { kit: look.title }) : t("Design follows the Brief.");
  // a Brand Kit chosen before an author's style was picked stays chosen: the field names it (locked) and the line says that Claude
  // asks how to use it in Prepare, with a way to leave it out (T25: it was dropped without a word)
  const asked = locked && !!value.look;
  return <div className="ds">
    <Picker id="np-look-l" label={t("Brand Kit")} value={value.look} none={t("From the brief")} noneSub={t("Claude follows the design the brief describes")} groups={lookGroups}
      disabled={locked} locked={locked ? (asked && look ? look.title : t("Follows film style")) : null} onChange={(v) => onChange({ look: v })}
      footer={<button type="button" className="sgb-link" onClick={() => go("/looks")}><Upload size={13} />{t("Create a Brand Kit from a guideline")}</button>} />
    <p className="ds-from" aria-live="polite">{asked ? <><Lock size={12} /><span>{t("This style keeps its author's design. Claude will ask how to use your Brand Kit.")}</span>
        <button type="button" className="clink ds-drop" onClick={() => onChange({ look: "" })} title={t("Do not use this Brand Kit")}>{t("Remove")}</button></>
      : locked ? <>{t("You can describe the Brand Kit in the Brief.")}</>
      : <>{look && <Swatches colors={look.swatches} />}<span>{summary}</span></>}</p>
    {/* a Vietnamese film (its brief) whose Brand Kit has a font without Vietnamese letters: one quiet line. A Brand Kit font is never
        swapped: Claude stops in Prepare and offers fonts that have them */}
    {!locked && look?.vi === "missing" && vietnamese && <p className="ds-vi">{(() => { const bad = (look.fonts ?? []).filter((f) => f.vi === false).map((f) => f.family);
      return bad.length ? t("{fonts} has no Vietnamese letters. Claude asks in Prepare which font to use for the words on screen.", { fonts: bad.join(", ") })
        : t("A font of this Brand Kit has no Vietnamese letters. Claude asks in Prepare which font to use for the words on screen."); })()}</p>}
  </div>;
}
