// A Brand Kit as a page anyone can read: its colours with their codes, its fonts drawn in the fonts themselves, its type roles, its frame and spacing, its
// components drawn from their tokens, its logos, its rules, the checks a film goes through and the guideline's own pages, for any kit: the user's and
// HyperFrames'. The kit's text (FRAME.md, "Design spec" here) stays the one truth: what is changed here is changed in that text, line by line
// (packages/looks-library/frame-doc.mjs). Save keeps the changes in this kit, with its history; a new version is a kit of its own, often of the same name, and the one before stays as it is.
// HyperFrames' kits stay as shipped: "Make my copy" gives one to change, with its credit.
import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, ArrowLeft, BookOpen, Boxes, Check, ChevronLeft, ChevronRight, Copy, CopyPlus, FileText, Film, History, Image as ImageIcon, LayoutTemplate, ListChecks, Loader2, Palette, Pencil, Plus, ScrollText, Trash2, Type, Undo2, Upload, X } from "lucide-react";
import { del, get, patch, post, upload, watchJob } from "../api.js";
import { Banner, Dialog } from "../components.jsx";
import { ago, go, madeOn, useData, usePref, useToast } from "../lib.jsx";
import { useT } from "../i18n.jsx";
import { useThemeId } from "../theme.jsx";
import Markdown from "../editor/Markdown.jsx";
import { CreditLine } from "./StyleGallery.jsx";
import { CreateLook, LockedDialog, lookSummary, sortPicked, UnreadFiles, ACCEPT_ATTR } from "./Looks.jsx";
import { addToken, backgroundCss, checklistRows, componentLook, docOf, formatsIn, guidelineMap, inkOn, lengthAt1920, parseDoc, refGroup, refsIn, removeToken, replaceFamily, roles, setColor, setComponentField, setMeta, setSection, setToken, setTypeField, sizeAt1920, subsOf, usesOf, withColors } from "../../../packages/looks-library/frame-doc.mjs";

// a kit's changes not saved yet stay while the app is open: leaving the page never loses them
const drafts = new Map();
const REF = /\([^()]*\bpp?\.\s*\d[^()]*\)/;
const noteOf = (s) => String(s ?? "").replace(new RegExp(`\\s*${REF.source}`, "g"), "").replace(/^inferred\b[:,]?\s*/i, "").trim();
/** A file's lines kept short with line breaks that mean nothing: one paragraph, so bold and sentences read whole. */
const unwrap = (t) => String(t ?? "").split("\n").reduce((out, l) => { const prev = out.at(-1), block = /^\s*(?:$|#|[-*•]\s|\d+[.)]\s|\||```)/; if (out.length && !block.test(l) && prev.trim() && !/^\s*(?:#|\||```)/.test(prev)) out[out.length - 1] = `${prev} ${l.trim()}`; else out.push(l); return out; }, []).join("\n");
export const fontStack = (f) => (f ? `"BK ${f}", "${f}", sans-serif` : "inherit");
const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

/** The sections of a kit's text, by the tab each is read on; what no tab names goes with the rules, so nothing in the text is left out. */
const HOME = [[/^overview$/i, "overview"], [/^colou?rs?$/i, "colours"], [/^typography$/i, "type"], [/^(the frame|shapes|depth|aspect|frame treatments|layout|grid)/i, "layout"],
  [/^components?$/i, "components"], [/^logo/i, "logos"], [/motion/i, "motion"], [/^guideline checklist/i, "checks"], [/^guideline map/i, "guideline"]];
const homeOf = (title) => HOME.find(([re]) => re.test(title))?.[1] ?? "rules";
const OWN_GROUPS = new Set(["colors", "typography", "components", "timing"]);

/** A value kept while typing and given back on Enter or on leaving the field; Escape puts it back. */
function Field({ value, onCommit, className = "", list, ...rest }) {
  const [v, setV] = useState(value ?? "");
  useEffect(() => setV(value ?? ""), [value]);
  const done = () => { if (String(v) !== String(value ?? "")) { onCommit(String(v)); setV(value ?? ""); } };
  return <input className={"input bk-field " + className} value={v} list={list} spellCheck={false} onChange={(e) => setV(e.target.value)} onBlur={done}
    onKeyDown={(e) => { if (e.key === "Enter") { e.currentTarget.blur(); } if (e.key === "Escape") { setV(value ?? ""); e.stopPropagation(); } }} {...rest} />;
}

/** A value read as words, with its tokens drawn; a click opens it as text, leaving the field gives it back. */
function Editable({ value, kit, label, onCommit }) {
  const t = useT();
  const [v, setV] = useState(null);
  if (!kit.can) return <KitText text={value} kit={kit} />;
  if (v === null) return <button type="button" className="bk-edit" onClick={() => setV(value ?? "")} aria-label={t("Edit {name}", { name: label })}><KitText text={value || t("Empty")} kit={kit} /><Pencil size={12} /></button>;
  const done = () => { if (v !== (value ?? "")) onCommit(v.replace(/\s*\n\s*/g, " ").trim()); setV(null); };
  return <textarea className="textarea bk-edit-in" autoFocus aria-label={label} value={v} rows={Math.min(6, Math.ceil(v.length / 44) + 1)} onChange={(e) => setV(e.target.value)} onBlur={done}
    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); done(); } if (e.key === "Escape") { e.stopPropagation(); setV(null); } }} />;
}

/** "Inferred": Claude chose this, the guideline does not say it. */
function Inferred({ why = "" }) {
  const t = useT();
  return <span className="bk-inferred" title={why || t("Claude chose this: the guideline does not give it.")}>{t("Inferred")}</span>;
}

/** The sources of a line: each opens the guideline's page, or is plain words when that page is not here. */
function Refs({ refs, kit }) {
  if (!refs?.length) return null;
  return <span className="bk-refs">{refs.map((r, i) => kit.canOpen(r) ? <button key={i} type="button" className="bk-ref" onClick={() => kit.openRef(r)}><BookOpen size={11} />{r.label}</button> : <span key={i} className="bk-ref plain">{r.label}</span>)}</span>;
}

/** A kit's prose: its tokens as small swatches, its sources as links to their pages, "# inferred" as the mark. */
function KitText({ text, kit }) {
  const hooks = useMemo(() => {
    const token = (s, k) => {
      const c = /^\{colors\.([\w-]+)\}$/.exec(s);
      if (c) { const hit = kit.doc.colors.find((x) => x.name === c[1]); return <span key={k} className="bk-tok">{hit && <i style={{ background: hit.css }} />}{c[1]}</span>; }
      return <span key={k} className="bk-tok plain">{s.replace(/^\{[\w-]+\.|\}$/g, "")}</span>;
    };
    const SPLIT = new RegExp(`(\\{[a-z]+\\.[\\w-]+\\})|(${REF.source})|(#\\s[^#\\n]*\\binferred\\b[^#\\n]*$)`, "gi");
    return {
      code: (s, k) => (/^\{[a-z]+\.[\w-]+\}$/i.test(s) ? token(s, k) : null),
      text: (s, key) => {
        const out = [];
        let last = 0, i = 0;
        for (const m of s.matchAll(SPLIT)) {
          if (m.index > last) out.push(s.slice(last, m.index));
          const k = `${key}-${i++}`;
          out.push(m[1] ? token(m[1], k) : m[2] ? <Refs key={k} refs={refGroup(m[2].slice(1, -1))} kit={kit} /> : <Inferred key={k} why={m[3].replace(/^#\s*/, "")} />);
          last = m.index + m[0].length;
        }
        if (last < s.length) out.push(s.slice(last));
        return out;
      },
    };
  }, [kit.doc]); // eslint-disable-line react-hooks/exhaustive-deps
  return <Markdown className="md bk-md" text={unwrap(String(text ?? "").replace(/^>\s?/gm, ""))} hooks={hooks} />;
}

/** A section of the kit's text, with its own Edit: the words open as text, the same text Claude reads. */
function Prose({ title, kit, heading = null, children = null }) {
  const t = useT();
  const s = kit.doc.sections.find((x) => x.title === title);
  const [v, setV] = useState(null);
  if (!s) return null;
  return <section className="bk-prose">
    <div className="bk-sub"><h3>{heading ?? s.title}</h3>{kit.can && v === null && <button type="button" className="btn ghost sm" onClick={() => setV(s.body)}><Pencil size={13} />{t("Edit")}</button>}</div>
    {v === null ? children ?? <KitText text={s.body} kit={kit} />
      : <div className="bk-prose-edit"><textarea className="textarea" value={v} onChange={(e) => setV(e.target.value)} rows={Math.min(24, Math.max(6, v.split("\n").length + 1))} aria-label={s.title} autoFocus />
        <div className="bk-row"><button type="button" className="btn sm primary" onClick={() => { kit.edit(s.title, (x) => setSection(x, s.title, v)); setV(null); }}><Check size={13} />{t("Done")}</button>
          <button type="button" className="btn sm" onClick={() => setV(null)}>{t("Cancel")}</button></div></div>}
  </section>;
}

/** Copies a code; says so. */
function CopyCode({ value, kit }) {
  const t = useT();
  return <button type="button" className="btn ghost icon sm" title={t("Copy {value}", { value })} aria-label={t("Copy {value}", { value })} onClick={() => kit.copy(value)}><Copy size={12} /></button>;
}

// ---- a frame drawn from the kit's own tokens: it follows every change at once
const hexes = (doc) => doc.colors.filter((c) => c.hex).map((c) => ({ name: c.name, hex: c.hex }));
export function roleStyle(r, fontSize) {
  const s = r?.style ?? {};
  return { fontFamily: fontStack(s.fontFamily), fontWeight: s.weight, fontStyle: s.italic ? "italic" : undefined, lineHeight: s.lineHeight, letterSpacing: s.tracking, textTransform: s.upper ? "uppercase" : undefined, ...(fontSize ? { fontSize } : {}) };
}
const roleLike = (doc, re) => doc.typography.find((r) => re.test(r.role));
function LiveFrame({ doc, title, ground = null }) {
  const t = useT();
  const r = roles(hexes(doc)), first = /#[0-9a-fA-F]{6}/.exec(ground ?? "")?.[0];
  const bg = ground ?? r.bg, ink = first ? inkOn(first) : r.ink, accent = first ? ink : r.accent;
  const head = roleLike(doc, /^headline$/i) ?? roleLike(doc, /^(headline|display|hero|title|h1)/i) ?? doc.typography.at(-1), body = roleLike(doc, /^body/i) ?? doc.typography[0], small = roleLike(doc, /eyebrow|label|micro|kicker/i) ?? body;
  const edge = lengthAt1920(doc.groups.find((g) => g.key === "spacing")?.items.find((x) => /edge|margin|safe/i.test(x.key))?.value);
  const at = (r, lo, hi) => `${Math.max(lo, Math.min(hi, (sizeAt1920(r?.style) ?? hi * 19.2) / 19.2))}cqw`;
  return <figure className="bk-live-wrap">
    <div className="bk-live" style={{ background: bg, color: ink, "--edge": `${(edge ?? 80) / 19.2}cqw` }} aria-label={t("A frame drawn from this kit's colours and fonts")} role="img">
      <span style={roleStyle(small, at(small, 1, 1.5))}>{title}</span>
      <div className="bk-live-mid"><h2 style={roleStyle(head, at(head, 3, 7.5))}>Chất lượng là danh dự</h2><i style={{ background: accent }} /></div>
      <p style={roleStyle(body, at(body, 1.3, 1.8))}>Đổi mới mỗi ngày. Quality is how we say thank you.</p>
    </div>
  </figure>;
}

// ---- the tabs
function Overview({ kit, look }) {
  const t = useT();
  const { doc } = kit;
  const principle = String(doc.meta.principle?.value ?? "").split("·").map((x) => x.trim()).filter(Boolean);
  const formats = formatsIn(`${doc.meta.unit?.value ?? ""}\n${doc.sections.find((s) => /^the frame/i.test(s.title))?.body ?? ""}`);
  const poster = look.group === "hf" ? look.stills?.[0] : null;
  const grounds = doc.components.map((c) => componentLook(c, doc)).filter((x) => x.background && /gradient/.test(x.background) && !x.role).map((x) => x.background).slice(0, 3);
  const inferred = doc.colors.filter((x) => x.inferred).length + doc.typography.filter((x) => x.inferred).length + (doc.text.slice(doc.text.indexOf("\n## ")).match(/#\s[^#\n]*\binferred\b/gi)?.length ?? 0);
  const facts = [["colours", doc.colors.length, "colours"], ["type", doc.families.length, "fonts"], ["type", doc.typography.length, "type roles"], ["components", doc.components.length, "components"], ["logos", look.logos?.length ?? 0, "logos"], ["checks", checklistRows(doc.sections.find((s) => /^guideline checklist/i.test(s.title))?.body).length, "film checks"]].filter((x) => x[1] > 0);
  return <>
    <div className="bk-hero">
      {poster && !kit.dirty ? <img className="bk-poster" src={poster} alt="" /> : <LiveFrame doc={doc} title={look.title} />}
      <div className="bk-hero-side">
        {kit.can ? <label className="field"><span className="label">{t("What it looks like")}</span><DescField kit={kit} /></label> : doc.meta.description?.value && <p className="bk-lede">{lookSummary(doc.meta.description.value) || doc.meta.description.value}</p>}
        <div className="bk-strip" aria-hidden="true">{doc.colors.map((c) => <i key={c.name} style={{ background: c.css }} />)}</div>
        <ul className="plain bk-facts">{facts.map(([tab, n, label]) => <li key={label}><button type="button" onClick={() => kit.setTab(tab)}><span className="num">{n}</span>{t(label)}</button></li>)}</ul>
        {formats.length > 0 && <p className="bk-meta">{t("Frames")}: <span className="num">{formats.join(" · ")}</span></p>}
      </div>
    </div>
    {grounds.length > 0 && !poster && <div className="bk-grounds">{grounds.map((g) => <LiveFrame key={g} doc={doc} title={look.title} ground={g} />)}</div>}
    {principle.length > 0 && <ul className="plain bk-principle">{principle.map((p) => <li key={p}>{p}</li>)}</ul>}
    {look.group === "yours" && !look.source?.basedOn && inferred > 0 && <p className="bk-inferred-note"><Inferred />{t("{n} value(s) were chosen by Claude because the guideline does not give them. Check them first.", { n: inferred })}</p>}
    <Prose title="Overview" kit={kit} heading={t("About this kit")} />
  </>;
}
function DescField({ kit }) {
  const value = kit.doc.meta.description?.value ?? "";
  const [v, setV] = useState(value);
  useEffect(() => setV(value), [value]);
  return <textarea className="textarea bk-desc" rows={Math.min(12, Math.max(3, Math.ceil(v.length / 80) + 1))} value={v} onChange={(e) => setV(e.target.value)} onBlur={() => { if (v !== value) kit.edit("description", (x) => setMeta(x, "description", v)); }} />;
}

function ColourTile({ c, kit }) {
  const t = useT();
  const used = usesOf(kit.doc.text, c.name), note = noteOf(c.comment);
  const sw = kit.can && c.hex ? <label className="bk-sw" style={{ background: c.css }} title={t("Change this colour")}><input type="color" value={c.hex.toLowerCase()} aria-label={t("Change {name}", { name: c.name })} onChange={(e) => kit.edit(`colour ${c.name}`, (x) => setColor(x, c.name, e.target.value.toUpperCase()))} /><Pencil size={14} style={{ color: inkOn(c.hex) }} /></label>
    : <button type="button" className="bk-sw" style={{ background: c.css }} onClick={() => kit.copy(c.css)} title={t("Copy {value}", { value: c.css })} aria-label={t("Copy {value}", { value: c.css })} />;
  return <li className="bk-col">{sw}
    <div className="bk-col-in"><span className="bk-col-name">{c.name}{c.inferred && <Inferred />}</span>
      <span className="bk-col-code">{kit.can ? <Field value={c.css} className="sm num" aria-label={t("Code of {name}", { name: c.name })} onFocus={(e) => e.target.select()} onCommit={(v) => { const code = v.trim(); if (!CSS.supports("color", code)) { kit.say(t("“{value}” is not a colour. Write a code like #1428A0.", { value: code })); return; } kit.edit(`colour ${c.name}`, (x) => (c.hex && /^#[0-9a-fA-F]{6}$/.test(code) ? setColor(x, c.name, code.toUpperCase()) : setToken(x, "colors", c.name, code))); }} /> : <span className="num">{c.css}</span>}
        <CopyCode value={c.css} kit={kit} />
        {kit.can && <button type="button" className="btn ghost icon sm" disabled={used > 0} title={used ? t("Used in {n} place(s) in this kit", { n: used }) : t("Remove this colour")} aria-label={t("Remove {name}", { name: c.name })} onClick={() => kit.edit(`colour ${c.name}`, (x) => removeToken(x, "colors", c.name))}><Trash2 size={12} /></button>}</span>
      {note && <span className="bk-note">{note}</span>}<Refs refs={c.refs} kit={kit} /></div></li>;
}
function AddColour({ kit }) {
  const t = useT();
  const [open, setOpen] = useState(false), [name, setName] = useState(""), [hex, setHex] = useState("#808080");
  const clean = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""), taken = kit.doc.colors.some((c) => c.name === clean);
  if (!open) return <li className="bk-col add"><button type="button" className="bk-add" onClick={() => setOpen(true)}><Plus size={16} />{t("Add a colour")}</button></li>;
  return <li className="bk-col add"><label className="bk-sw" style={{ background: hex }}><input type="color" value={hex} onChange={(e) => setHex(e.target.value.toUpperCase())} aria-label={t("Colour")} /></label>
    <div className="bk-col-in"><input className="input bk-field sm" placeholder={t("Name")} value={name} onChange={(e) => setName(e.target.value)} autoFocus aria-label={t("Name")} />
      {taken && <span className="bk-note danger">{t("This kit has a colour of that name.")}</span>}
      <span className="bk-row"><button type="button" className="btn sm primary" disabled={!clean || taken} onClick={() => { kit.edit(`colour ${clean}`, (x) => addToken(x, "colors", clean, hex.toUpperCase())); setOpen(false); setName(""); }}><Plus size={13} />{t("Add")}</button><button type="button" className="btn sm" onClick={() => setOpen(false)}>{t("Cancel")}</button></span></div></li>;
}
function Colours({ kit }) {
  const t = useT();
  const { doc } = kit;
  const groups = [];
  for (const c of doc.colors) { const g = groups.at(-1); if (g && g.label === c.label) g.items.push(c); else groups.push({ label: c.label, items: [c] }); }
  const gradients = doc.components.map((c) => [c, componentLook(c, doc).background]).filter(([, b]) => b && /gradient/.test(b));
  return <>
    <div className="bk-colgroups">{groups.map((g, i) => <section key={g.label ?? i} className="bk-group">{g.label && <h3 className="bk-grouphead">{g.label}</h3>}
      <ul className="plain bk-cols">{g.items.map((c) => <ColourTile key={c.name} c={c} kit={kit} />)}{kit.can && i === groups.length - 1 && <AddColour kit={kit} />}</ul></section>)}</div>
    {gradients.length > 0 && <section className="bk-group"><h3 className="bk-grouphead">{t("Gradients")}</h3>
      <ul className="plain bk-grads">{gradients.map(([c, b]) => <li key={c.name}><i style={{ background: b }} /><span className="bk-col-name">{c.name}</span><span className="bk-note">{noteOf(c.fields.find((f) => f.key === "description")?.value)}</span></li>)}</ul></section>}
    <Prose title="Colors" kit={kit} heading={t("How the colours are used")} />
  </>;
}

const VIA = { kit: "Font files in this kit", app: "Comes with the app", google: "Google Fonts" };
function FontCard({ family, info, kit, roleCount }) {
  const t = useT();
  const [swap, setSwap] = useState(false);
  return <li className="bk-font">
    <div className="bk-font-view" style={{ fontFamily: fontStack(family) }}><span className="aa">Aa</span><span className="vi">Ăâ Đê Ôơ Ưỹ</span></div>
    <div className="bk-font-in"><b>{family}</b>
      {info ? <span className={"bk-state " + (info.via ? "ok" : "stop")}>{info.via ? <Check size={12} /> : <AlertTriangle size={12} />}{info.via ? t(VIA[info.via]) : t("Not on this computer: a stand-in is drawn")}</span> : <span className="bk-state wait"><Loader2 size={12} className="spin" />{t("Finding the font")}</span>}
      {info && <span className={"bk-state " + (info.vi === true ? "ok" : info.vi === false ? "stop" : "wait")}>{info.vi === true ? <Check size={12} /> : <AlertTriangle size={12} />}{info.vi === true ? t("Draws Vietnamese") : info.vi === false ? t("Does not draw Vietnamese") : t("Vietnamese not known")}</span>}
      <span className="bk-meta">{t("{n} type role(s)", { n: roleCount })}{info?.weights?.length > 0 && <> · {t("weights")} <span className="num">{[...info.weights].sort((a, b) => parseInt(a, 10) - parseInt(b, 10)).join(" ")}</span></>}</span>
      {kit.can && (swap ? <Field value={family} list="bk-fonts" autoFocus aria-label={t("Font name")} onCommit={(v) => { if (v.trim()) kit.edit(`font ${family}`, (x) => replaceFamily(x, family, v.trim())); setSwap(false); }} onBlur={() => setSwap(false)} />
        : <button type="button" className="btn sm" onClick={() => setSwap(true)}><Pencil size={13} />{t("Replace this font")}</button>)}
    </div></li>;
}
const WEIGHTS = [100, 200, 300, 400, 500, 600, 700, 800, 900];
function RoleRow({ r, kit, sample }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const s = r.style, px = sizeAt1920(s), unit = typeof s.cqw === "number" ? "cqw" : typeof s.px === "number" ? "px" : null;
  const set = (field, value) => kit.edit(`type ${r.role}`, (x) => setTypeField(x, r.role, field, value));
  const num = (v) => { const n = Number(v); return v === "" || Number.isNaN(n) ? undefined : n; };
  const facts = [s.fontFamily, s.weight, px != null && `${px} px`, s.lineHeight != null && `${t("line")} ${s.lineHeight}`, s.tracking && `${t("tracking")} ${s.tracking}`, s.upper && t("capitals"), s.italic && t("italic")].filter(Boolean);
  const more = r.map.filter(([k]) => !["fontFamily", "cqw", "px", "weight", "lineHeight", "tracking", "upper", "italic"].includes(k));
  return <li className={"bk-role" + (open ? " open" : "")}>
    <div className="bk-role-head"><span className="bk-col-name">{r.role}{r.inferred && <Inferred />}</span>
      <span className="bk-meta">{facts.join(" · ")}</span>
      {kit.can && <button type="button" className="btn ghost icon sm" aria-expanded={open} aria-label={t("Edit {name}", { name: r.role })} title={t("Edit")} onClick={() => setOpen((x) => !x)}>{open ? <X size={13} /> : <Pencil size={13} />}</button>}</div>
    <div className="bk-spec" style={kit.ground}><span style={roleStyle(r, px ? `clamp(0.875rem, ${px / 19.2}cqw, 6rem)` : "1.5rem")}>{sample}</span></div>
    {(noteOf(r.comment) || r.refs.length > 0 || more.length > 0) && <p className="bk-note">{more.map(([k, v]) => `${k}: ${v}`).join(" · ")}{more.length > 0 && noteOf(r.comment) ? " · " : ""}{noteOf(r.comment)} <Refs refs={r.refs} kit={kit} /></p>}
    {open && <div className="bk-role-edit">
      <label className="field wide"><span className="label">{t("Font")}</span><Field value={s.fontFamily} list="bk-fonts" onCommit={(v) => set("fontFamily", v.trim())} /></label>
      <label className="field"><span className="label">{t("Weight")}</span><select className="select" value={s.weight ?? ""} onChange={(e) => set("weight", num(e.target.value))}><option value="">{t("Default")}</option>{WEIGHTS.map((w) => <option key={w} value={w}>{w}</option>)}</select></label>
      {unit && <label className="field"><span className="label">{unit === "cqw" ? t("Size, % of frame width") : t("Size, px")}</span><Field type="number" step="0.05" value={s[unit]} onCommit={(v) => set(unit, num(v))} /></label>}
      <label className="field"><span className="label">{t("Line height")}</span><Field type="number" step="0.01" value={s.lineHeight} onCommit={(v) => set("lineHeight", num(v))} /></label>
      <label className="field"><span className="label">{t("Tracking")}</span><Field value={s.tracking} placeholder="0.02em" onCommit={(v) => set("tracking", v.trim())} /></label>
      <label className="bk-check"><input type="checkbox" checked={!!s.upper} onChange={(e) => set("upper", e.target.checked)} />{t("Capitals")}</label>
      <label className="bk-check"><input type="checkbox" checked={!!s.italic} onChange={(e) => set("italic", e.target.checked)} />{t("Italic")}</label>
    </div>}
  </li>;
}
function Typography({ kit, fonts }) {
  const t = useT();
  const { doc } = kit;
  const [sample, setSample] = usePref("looks:sample", "Chất lượng là danh dự");
  const groups = [];
  for (const r of doc.typography) { const g = groups.at(-1); if (g && g.label === r.label) g.items.push(r); else groups.push({ label: r.label, items: [r] }); }
  const spare = (fonts?.choices?.kit ?? []).filter((f) => !doc.families.includes(f));
  const notes = doc.groups.find((g) => g.key === "typography")?.notes ?? [];
  return <>
    <ul className="plain bk-fonts">{doc.families.map((f) => <FontCard key={f} family={f} info={fonts?.families?.find((x) => x.family === f)} kit={kit} roleCount={doc.typography.filter((r) => r.family === f).length} />)}</ul>
    {spare.length > 0 && <p className="bk-meta">{t("Also in this kit")}: {spare.join(", ")}</p>}
    <div className="bk-sub"><h3>{t("Type roles")}</h3><label className="bk-sample"><span className="sr-only">{t("Words to try")}</span><input className="input bk-field" value={sample} onChange={(e) => setSample(e.target.value)} placeholder={t("Words to try")} aria-label={t("Words to try")} /></label></div>
    {groups.map((g, i) => <section key={g.label ?? i} className="bk-group">{g.label && <h4 className="bk-grouphead">{g.label}</h4>}
      <ul className="plain bk-roles">{g.items.map((r) => <RoleRow key={r.role} r={r} kit={kit} sample={sample || "Chất lượng là danh dự"} />)}</ul></section>)}
    {notes.length > 0 && <div className="bk-notes">{notes.map((n, i) => <KitText key={i} text={n} kit={kit} />)}</div>}
    <Prose title="Typography" kit={kit} heading={t("How the type is used")} />
  </>;
}

/** One frame shape with its margin and columns, drawn to scale. */
function FrameShape({ ratio, margin, columns, colors }) {
  const [w, h] = ratio.split(":").map(Number);
  const inset = margin != null ? `${margin / 19.2}%` : null;
  return <figure className="bk-shape"><div className="bk-shape-f" style={{ aspectRatio: `${w} / ${h}`, background: colors.bg, color: colors.ink, width: w >= h ? "100%" : `${(w / h) * 100}%` }}>
    {inset && <div className="bk-shape-safe" style={{ inset }}>{Array.from({ length: Math.max(0, (columns || 0) - 1) }, (_, i) => <i key={i} style={{ left: `${((i + 1) / columns) * 100}%` }} />)}</div>}
  </div><figcaption className="num">{ratio}</figcaption></figure>;
}
function TokenTable({ group, kit, title }) {
  const t = useT();
  const kind = /^(rounded|radii|radius)$/.test(group.key) ? "radius" : /^border/.test(group.key) ? "border" : /^shadow/.test(group.key) ? "shadow" : /^(spacing|gaps?)$/.test(group.key) ? "space" : null;
  const view = (it) => {
    const v = withColors(it.value, kit.doc), n = lengthAt1920(v);
    if (kind === "radius" && (n != null || /^\d+%$/.test(v))) return <i className="bk-v radius" style={{ borderTopLeftRadius: n != null ? `${Math.min(n / 8, 22)}px` : v }} />;
    if (kind === "border") return <i className="bk-v box" style={{ border: v }} />;
    if (kind === "shadow") return <i className="bk-v box" style={{ boxShadow: v }} />;
    if (kind === "space" && n != null) return <i className="bk-v bar" style={{ width: `${Math.min(100, (n / 160) * 100)}%` }} />;
    return null;
  };
  return <section className="bk-group"><h3 className="bk-grouphead">{title ?? group.key}</h3>
    <ul className="plain bk-tokens">{group.items.map((it) => <li key={it.key}><span className="bk-col-name">{it.key}{it.inferred && <Inferred />}</span>
      <span className="bk-tok-val"><Editable value={it.value} kit={kit} label={it.key} onCommit={(v) => kit.edit(`${group.key} ${it.key}`, (x) => setToken(x, group.key, it.key, v))} /></span>
      <span className="bk-tok-see" aria-hidden="true">{view(it)}</span>
      <span className="bk-tok-why">{noteOf(it.comment) && <span className="bk-note">{noteOf(it.comment)} </span>}<Refs refs={it.refs} kit={kit} /></span></li>)}</ul></section>;
}
/** The pages a treatment or a rule names: the guideline's own picture of it. */
function PageThumbs({ text, kit }) {
  const pages = useMemo(() => refsIn(text).filter((r) => kit.canOpen(r)).flatMap((r) => r.pages.map((p) => ({ r, p }))).slice(0, 3), [text, kit]);
  if (!pages.length) return null;
  return <div className="bk-thumbs">{pages.map(({ r, p }) => <button key={`${r.doc}${p}`} type="button" onClick={() => kit.openRef(r, p)} title={`${r.doc} p. ${p}`}><img src={kit.pageSrc(r, p)} alt={`${r.doc} p. ${p}`} loading="lazy" /></button>)}</div>;
}
function HfFrames({ id, kit, copied }) {
  const t = useT();
  const q = useData(() => get(`/api/looks/${id}/frames`), [id]);
  const frames = q.data?.frames ?? [];
  if (q.data && !frames.length) return null;
  return <section className="bk-group"><div className="bk-sub"><h3>{t("Layouts")}</h3>{copied && <span className="bk-meta">{t("HyperFrames' own frames, before your changes")}</span>}</div>
    {!q.data ? <><p className="bk-meta bk-wait"><Loader2 size={13} className="spin" />{t("Drawing this kit's frames, the first time takes a moment…")}</p><div className="bk-frames">{[0, 1, 2].map((i) => <div key={i} className="skeleton" />)}</div></>
      : <div className="bk-frames">{frames.map((src, i) => <button key={src} type="button" onClick={() => kit.view(frames.map((s, j) => ({ src: s, label: t("Layout {n}", { n: j + 1 }) })), i)}><img src={src} alt={t("Layout {n}", { n: i + 1 })} loading="lazy" /></button>)}</div>}
  </section>;
}
function Layout({ kit, look }) {
  const t = useT();
  const { doc } = kit;
  const space = doc.groups.find((g) => g.key === "spacing");
  const margin = lengthAt1920(space?.items.find((x) => /edge|margin|safe/i.test(x.key))?.value), columns = parseInt(space?.items.find((x) => /^columns?$/i.test(x.key))?.value, 10) || 0;
  const formats = formatsIn(`${doc.meta.unit?.value ?? ""}\n${doc.sections.find((s) => /^the frame/i.test(s.title))?.body ?? ""}`);
  const colors = roles(hexes(doc));
  const treat = doc.sections.find((s) => /^frame treatments/i.test(s.title));
  const parts = treat ? subsOf(treat.body) : null;
  return <>
    <div className="bk-layout-top">
      <div className="bk-shapes">{(formats.length ? formats : ["16:9"]).map((f) => <FrameShape key={f} ratio={f} margin={margin} columns={columns} colors={colors} />)}</div>
      <div className="bk-layout-facts">{doc.meta.unit?.value && <p className="bk-lede">{noteOf(doc.meta.unit.value)}</p>}
        {margin != null && <p className="bk-meta">{t("Margin")}: <span className="num">{margin} px</span> {t("on a 1920 wide frame")}</p>}
        {columns > 0 && <p className="bk-meta">{t("Columns")}: <span className="num">{columns}</span></p>}</div>
    </div>
    {look.frames && <HfFrames id={look.frames} kit={kit} copied={look.group === "yours"} />}
    {doc.groups.filter((g) => !OWN_GROUPS.has(g.key) && g.items.length).map((g) => <TokenTable key={g.key} group={g} kit={kit} title={t(g.key[0].toUpperCase() + g.key.slice(1))} />)}
    {treat && <Prose title={treat.title} kit={kit}>
      {parts.intro && <KitText text={parts.intro} kit={kit} />}
      <div className="bk-treats">{parts.subs.map((s) => <article key={s.title} className="bk-treat"><h4>{s.title}</h4><KitText text={s.body} kit={kit} /><PageThumbs text={s.body} kit={kit} /></article>)}</div>
    </Prose>}
    {doc.sections.filter((s) => homeOf(s.title) === "layout" && s !== treat).map((s) => <Prose key={s.title} title={s.title} kit={kit} />)}
  </>;
}

function ComponentCard({ c, kit }) {
  const t = useT();
  const { doc } = kit;
  const look = useMemo(() => componentLook(c, doc), [c, doc]);
  const has = look.background || look.role || look.border || look.shadow;
  const desc = c.fields.find((f) => f.key === "description");
  const rest = c.fields.filter((f) => f !== desc);
  const solid = look.background && /^#[0-9a-fA-F]{6}$/.test(look.background) ? look.background : null;
  return <li className="bk-comp">
    {has && <div className="bk-comp-view" style={{ background: look.background ?? kit.groundCss, color: look.color ?? (solid ? inkOn(solid) : kit.inkCss) }}>
      {look.role ? <span style={roleStyle(look.role, "1.5rem")}>{c.name}</span> : (look.border || look.shadow) ? <i style={{ border: look.border ?? undefined, boxShadow: look.shadow ?? undefined, borderRadius: look.radius != null ? `${look.radius / 4}px` : undefined }} /> : null}</div>}
    <div className="bk-comp-in"><b>{c.name}{c.inferred && <Inferred />}</b>
      {desc && <div className="bk-comp-desc"><Editable value={desc.value} kit={kit} label={t("what {name} is", { name: c.name })} onCommit={(v) => kit.edit(`component ${c.name}`, (x) => setComponentField(x, c.name, "description", v))} /><Refs refs={desc.refs} kit={kit} /></div>}
      <dl>{rest.map((f) => <div key={f.key}><dt>{f.key}{f.inferred && <Inferred />}</dt><dd><Editable value={f.value} kit={kit} label={`${c.name} ${f.key}`} onCommit={(v) => kit.edit(`component ${c.name}`, (x) => setComponentField(x, c.name, f.key, v))} /><Refs refs={f.refs} kit={kit} /></dd></div>)}</dl>
    </div></li>;
}
function Components({ kit }) {
  const t = useT();
  return <>
    <ul className="plain bk-comps">{kit.doc.components.map((c) => <ComponentCard key={c.name} c={c} kit={kit} />)}</ul>
    <Prose title="Components" kit={kit} heading={t("How they fit together")} />
  </>;
}

function Logos({ kit, look }) {
  const t = useT();
  const [ground, setGround] = usePref("looks:logoGround", "light");
  const items = look.logos ?? [];
  return <>
    {items.length > 0 && <><div className="bk-sub"><h3>{t("Files every film gets")}</h3>
      <div className="segmented compact" role="group" aria-label={t("Ground")}>{[["light", t("Light")], ["dark", t("Dark")]].map(([k, l]) => <button key={k} type="button" aria-pressed={ground === k} onClick={() => setGround(k)}>{l}</button>)}</div></div>
      <ul className={"plain bk-logos " + ground}>{items.map((x, i) => <li key={x.name}><button type="button" onClick={() => kit.view(items.map((y) => ({ src: y.url, label: y.name, logo: ground })), i)}><img src={x.url} alt={x.name} loading="lazy" /></button><span className="bk-meta">{x.name}</span></li>)}</ul></>}
    {kit.doc.sections.filter((s) => homeOf(s.title) === "logos").map((s) => <Prose key={s.title} title={s.title} kit={kit} />)}
  </>;
}

function Motion({ kit }) {
  const t = useT();
  const timing = kit.doc.groups.find((g) => g.key === "timing");
  return <>{timing?.items.length > 0 && <TokenTable group={timing} kit={kit} title={t("Timing")} />}
    {kit.doc.sections.filter((s) => homeOf(s.title) === "motion").map((s) => <Prose key={s.title} title={s.title} kit={kit} />)}</>;
}

/** A list of do's or don'ts, each line with its mark. */
function RuleList({ body, kit, kind }) {
  const lines = [...String(body).matchAll(/^[-*]\s+(.+)$/gm)].map((m) => m[1]);
  return <ul className={"plain bk-rules " + kind}>{lines.map((l, i) => <li key={i}>{kind === "do" ? <Check size={14} /> : <X size={14} />}<KitText text={l} kit={kit} /></li>)}</ul>;
}
function Rules({ kit }) {
  const t = useT();
  const sections = kit.doc.sections.filter((s) => homeOf(s.title) === "rules");
  return <>{sections.map((s) => {
    const parts = subsOf(s.body), yes = parts.subs.find((x) => /^do$/i.test(x.title)), no = parts.subs.find((x) => /^don['’]?t/i.test(x.title));
    if (!yes && !no) return <Prose key={s.title} title={s.title} kit={kit} />;
    return <Prose key={s.title} title={s.title} kit={kit}>
      {parts.intro && <KitText text={parts.intro} kit={kit} />}
      <div className="bk-dodont">{yes && <div><h4>{t("Do")}</h4><RuleList body={yes.body} kit={kit} kind="do" /></div>}{no && <div><h4>{t("Don't")}</h4><RuleList body={no.body} kit={kit} kind="dont" /></div>}</div>
    </Prose>;
  })}</>;
}

function Checks({ kit, rows }) {
  const t = useT();
  const [tag, setTag] = useState(null);
  const tags = useMemo(() => [...new Set(rows.map((r) => r.tag))], [rows]);
  const list = tag ? rows.filter((r) => r.tag === tag) : rows;
  return <>
    <p className="bk-meta">{t("Every film made with this kit is checked against these.")}</p>
    <div className="bk-chips" role="group" aria-label={t("Filter")}><button type="button" className="chip" aria-pressed={!tag} onClick={() => setTag(null)}>{t("All")} <span className="num">{rows.length}</span></button>
      {tags.map((x) => <button key={x} type="button" className="chip" aria-pressed={tag === x} onClick={() => setTag(x)}>{x[0].toUpperCase() + x.slice(1)} <span className="num">{rows.filter((r) => r.tag === x).length}</span></button>)}</div>
    <ol className="plain bk-checks">{list.map((r) => <li key={r.id}><span className="num">{r.id}</span><span className="bk-check-text">{r.text}</span><Refs refs={r.refs} kit={kit} /></li>)}</ol>
  </>;
}

const pageName = (at, p) => `${at}page-${String(p).padStart(3, "0")}.jpg`;
function Guideline({ kit, look }) {
  const t = useT();
  const docs = look.guideline ?? [];
  const map = useMemo(() => guidelineMap(kit.doc.sections.find((s) => /^guideline map/i.test(s.title))?.body), [kit.doc]);
  const [at, setAt] = useState(0), [topic, setTopic] = useState(null);
  const doc = docs[at] ?? docs[0];
  const topics = map.topics.filter((x) => docOf(x.refs[0].doc, docs, map.shorts) === doc);
  const all = useMemo(() => (doc?.pagesAt ? Array.from({ length: doc.pages }, (_, i) => i + 1) : []), [doc]);
  const shown = topic ? topic.refs.flatMap((r) => r.pages).filter((p) => p <= (doc?.pages ?? 0)) : all;
  const items = all.map((p) => ({ src: pageName(doc.pagesAt, p), label: `${doc.name.replace(/\.[^.]+$/, "")} · ${t("page {n}", { n: p })}` }));
  return <>
    <ul className="plain bk-docs">{docs.map((d, i) => <li key={d.name}><button type="button" aria-pressed={doc === d} title={d.name.replace(/\.[^.]+$/, "")} onClick={() => { setAt(i); setTopic(null); }}><FileText size={14} /><span>{d.name.replace(/\.[^.]+$/, "")}</span><span className="num">{d.pages}</span></button></li>)}</ul>
    {topics.length > 0 && <div className="bk-chips" role="group" aria-label={t("Topics")}><button type="button" className="chip" aria-pressed={!topic} onClick={() => setTopic(null)}>{t("All pages")}</button>
      {topics.map((x) => <button key={x.topic} type="button" className="chip" aria-pressed={topic === x} onClick={() => setTopic(x)}>{x.topic}</button>)}</div>}
    {doc?.pagesAt ? <div className="bk-pages">{shown.map((p) => <button key={p} type="button" onClick={() => kit.view(items, p - 1)} title={t("page {n}", { n: p })}><img src={pageName(doc.pagesAt, p)} alt={t("page {n}", { n: p })} loading="lazy" /><span className="num">{p}</span></button>)}</div>
      : <p className="bk-meta">{t("This file's pages are not on this computer. Scan the kit again to see them.")}</p>}
  </>;
}

function Spec({ kit, text }) {
  const t = useT();
  return <>
    <p className="bk-meta">{kit.can ? t("Claude and every film read this text. Changes on the other tabs are written here.") : t("Claude and every film read this text.")}</p>
    <textarea className="textarea lk-frame bk-spec-text" value={text} readOnly={!kit.can} spellCheck={false} aria-label={t("Design spec")} onChange={(e) => { const v = e.target.value; kit.edit("design spec", () => v); }} />
  </>;
}

function Versions({ look, onRestore, dirty }) {
  const t = useT();
  return <>
    <ul className="plain bk-versions">{[...(look.versions ?? [])].reverse().map((x) => <li key={x.v}><b className="num">#{x.v}</b><span className="bk-meta">{ago(x.at)}{x.note ? ` · ${x.note}` : ""}</span>
      {x.v === look.version ? <span className="bk-state ok"><Check size={12} />{t("In use")}</span> : <button type="button" className="btn sm" disabled={dirty} title={dirty ? t("Save or discard your changes first") : undefined} onClick={() => onRestore(x.v)}>{t("Restore")}</button>}</li>)}</ul>
    {(look.files?.length ?? 0) > 0 && <p className="bk-meta">{t("{n} file(s) in this kit", { n: look.files.length })}</p>}
    <p className="bk-meta">{t("Projects already made with a kit keep their own copy.")}</p>
  </>;
}

/** A picture large, with the arrow keys for the next: a guideline's pages, a kit's logos and frames. */
function Viewer({ items, at, onClose }) {
  const t = useT();
  const [i, setI] = useState(at);
  const step = (d) => setI((x) => Math.max(0, Math.min(items.length - 1, x + d)));
  useEffect(() => { const key = (e) => { if (e.key === "ArrowRight") step(1); if (e.key === "ArrowLeft") step(-1); }; addEventListener("keydown", key); return () => removeEventListener("keydown", key); }, [items.length]); // eslint-disable-line react-hooks/exhaustive-deps
  const x = items[i];
  return <Dialog wide title={x.label} onClose={onClose} footer={<><span className="hint num">{i + 1} / {items.length}</span><span className="spacer" />
    <button type="button" className="btn" disabled={i === 0} onClick={() => step(-1)}><ChevronLeft size={14} />{t("Previous")}</button><button type="button" className="btn" disabled={i === items.length - 1} onClick={() => step(1)}>{t("Next")}<ChevronRight size={14} /></button></>}>
    <div className={"bk-view" + (x.logo ? ` logo ${x.logo}` : "")}><img src={x.src} alt={x.label} /></div></Dialog>;
}

const TABS = [["overview", "Overview", BookOpen], ["colours", "Colours", Palette], ["type", "Typography", Type], ["layout", "Layout", LayoutTemplate], ["components", "Components", Boxes], ["logos", "Logos", ImageIcon],
  ["motion", "Motion", Film], ["rules", "Rules", ScrollText], ["checks", "Film checks", ListChecks], ["guideline", "Guideline", FileText], ["spec", "Design spec", Pencil], ["versions", "History", History]];

export default function BrandKit({ id, askLocked = false, onChanged, onCreated, onDeleted }) {
  const t = useT();
  const toast = useToast();
  const studio = useThemeId() === "studio";
  const q = useData(() => get(`/api/looks/${id}`), [id]);
  const [tab, setTab] = usePref("looks:tab", "overview");
  const [, bump] = useState(0);
  const [scan, setScan] = useState(null);
  const [lockedOpen, setLockedOpen] = useState(askLocked);
  const [ask, setAsk] = useState(false), [saving, setSaving] = useState(false), [copying, setCopying] = useState(false), [naming, setNaming] = useState(null);
  const [viewer, setViewer] = useState(null), [making, setMaking] = useState(false), [savingNew, setSavingNew] = useState(false);
  const [fonts, setFonts] = useState(null);
  const addMore = useRef(null), paneTop = useRef(null);
  const l = q.data;
  const draft = drafts.get(id);
  const text = draft?.text ?? l?.frame ?? "";
  const doc = useMemo(() => parseDoc(text), [text]);
  const dirty = !!draft;
  const famKey = doc.families.join("|");
  // the page draws with the kit's own fonts: its files, the app's, or the app's one-time download
  useEffect(() => { if (!l) return undefined; let live = true; post("/api/looks/fonts", { id, families: doc.families }).then((r) => { if (live) setFonts(r); }).catch(() => {}); return () => { live = false; }; }, [id, famKey, !!l]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (l?.status !== "scanning" || scan) return undefined; const h = setInterval(q.reload, 3000); return () => clearInterval(h); }, [l?.status, !!scan]); // eslint-disable-line react-hooks/exhaustive-deps
  if (q.error) return <div className="page"><Banner kind="error" action={<button className="btn sm" onClick={() => go("/looks")}>{t("Back to Brand Kits")}</button>}>{q.error.message}</Banner></div>;
  if (!l) return <div className={studio ? "st-room" : "page"}><div className="skeleton" style={{ height: "24rem" }} /></div>;

  const can = !!l.editable && l.status !== "scanning" && !scan;
  const edit = (label, fn) => {
    const cur = drafts.get(id) ?? { text: l.frame ?? "", undo: [], labels: [], last: null }, next = fn(cur.text);
    if (next === cur.text) return;
    if (cur.last !== label) cur.undo.push(cur.text);
    cur.text = next; cur.last = label;
    if (!cur.labels.includes(label)) cur.labels.push(label);
    drafts.set(id, cur); bump((n) => n + 1);
  };
  const undo = () => { const cur = drafts.get(id); if (!cur) return; cur.text = cur.undo.pop() ?? cur.text; cur.last = null; if (!cur.undo.length || cur.text === l.frame) drafts.delete(id); bump((n) => n + 1); };
  const discard = () => { drafts.delete(id); bump((n) => n + 1); };
  const save = async () => {
    setSaving(true);
    try { await patch(`/api/looks/${id}`, { frame: draft.text, note: `changed: ${draft.labels.join(", ")}`.slice(0, 190) }); drafts.delete(id); await q.reload(); onChanged?.(); toast(t("Saved")); }
    catch (e) { toast(e.message, "error"); } finally { setSaving(false); }
  };
  // the changes as a kit of their own: this one stays as it was saved, its changes given up here
  const saveAsNew = async () => {
    setSavingNew(true);
    try { const r = await post(`/api/looks/${id}/new-version`, { frame: draft.text, keep: "all" }); drafts.delete(id); onChanged?.(); toast(t("New version made. The one before stays as it was.")); go(`/looks/${r.id}`); }
    catch (e) { toast(e.message, "error"); } finally { setSavingNew(false); }
  };
  const copyKit = async () => {
    setCopying(true);
    try { const r = await post(`/api/looks/${id}/copy`); onChanged?.(); toast(t("“{title}” is yours to change", { title: r.title })); go(`/looks/${r.id}`); }
    catch (e) { toast(e.message, "error"); } finally { setCopying(false); }
  };
  const rename = async (title) => { setNaming(null); if (!title.trim() || title.trim() === l.title) return; try { await patch(`/api/looks/${id}`, { title: title.trim() }); await q.reload(); onChanged?.(); } catch (e) { toast(e.message, "error"); } };
  const restore = async (v) => { try { await post(`/api/looks/${id}/versions/${v}/restore`); toast(t("Revision {v} restored", { v })); await q.reload(); onChanged?.(); } catch (e) { toast(e.message, "error"); } };
  // a failed or draft kit scans again with the files it has (e.g. after Claude is signed in); a scan makes the next version, so changes not saved are given up first
  const rescan = async (body) => {
    setLockedOpen(false); drafts.delete(id);
    try {
      const r = await post(`/api/looks/${id}/scan`, body); const j = r.job ?? r; setScan(j);
      watchJob(j.id, (x) => { if (!x) return; setScan(x); if (x.status !== "running") { setScan(null); q.reload(); onChanged?.(); if (x.status === "failed") toast(x.error?.message ?? t("The scan did not finish."), "error"); if (x.result?.stopped === "locked") setLockedOpen(true); } }, 1200);
    } catch (e) { toast(e.message, "error"); }
  };
  const remove = async () => { try { await del(`/api/looks/${id}`); drafts.delete(id); toast(t("Deleted “{title}”", { title: l.title })); onDeleted?.(); go("/looks"); } catch (e) { toast(e.message, "error"); } };
  const removeFile = async (name) => { try { await del(`/api/looks/${id}/files?name=${encodeURIComponent(name)}`); q.reload(); onChanged?.(); } catch (e) { toast(e.message, "error"); } };
  const locked = (l.unread ?? []).filter((x) => x.password).map((x) => x.name);
  // a readable copy of what the kit could not read: the files go in, then the scan runs again and makes the next version. A copy takes the place
  // of its locked file, by name or else in the order picked, so the locked one does not stop the next scan
  const addFiles = async (list) => {
    setLockedOpen(false);
    try {
      const picked = [...list], same = locked.filter((n) => picked.some((f) => f.name === n));
      const gone = [...same, ...locked.filter((n) => !same.includes(n)).slice(0, Math.max(0, picked.length - same.length))];
      setScan({ stage: t("Adding the files") });
      for (const n of gone) await del(`/api/looks/${id}/files?name=${encodeURIComponent(n)}`);
      const { take, leftOut } = sortPicked(picked, (l.files ?? []).filter((f) => !gone.includes(f.name)));
      if (leftOut.length) await patch(`/api/looks/${id}`, { leftOut });
      if (take.length) {
        for (const x of take) await upload(`/api/looks/${id}/files`, new File([x.file], x.name));
        await rescan();
      } else { setScan(null); q.reload(); onChanged?.(); }
    } catch (e) { setScan(null); toast(e.message, "error"); }
  };

  const shorts = guidelineMap(doc.sections.find((s) => /^guideline map/i.test(s.title))?.body).shorts, docs = l.guideline ?? [];
  const refDoc = (r) => docOf(r.doc, docs, shorts);
  const colors = doc.colors.filter((c) => c.hex).length ? roles(hexes(doc)) : { bg: "#FFFFFF", ink: "#000000" };
  const kit = { doc, can, dirty, edit, setTab, groundCss: colors.bg, inkCss: colors.ink, ground: { background: colors.bg, color: colors.ink },
    say: (m) => toast(m, "error"), copy: (v) => { navigator.clipboard?.writeText(v); toast(t("Copied {value}", { value: v })); },
    canOpen: (r) => !!refDoc(r)?.pagesAt, pageSrc: (r, p) => pageName(refDoc(r).pagesAt, p),
    openRef: (r, p = r.pages[0]) => { const g = refDoc(r); setViewer({ items: Array.from({ length: g.pages }, (_, i) => ({ src: pageName(g.pagesAt, i + 1), label: `${g.name.replace(/\.[^.]+$/, "")} · ${t("page {n}", { n: i + 1 })}` })), at: Math.min(g.pages, p) - 1 }); },
    view: (items, at) => setViewer({ items, at }) };
  const checks = checklistRows(doc.sections.find((s) => /^guideline checklist/i.test(s.title))?.body);
  const hasSec = (k) => doc.sections.some((s) => homeOf(s.title) === k);
  const shownTabs = TABS.filter(([k]) => ({ overview: !!l.frame, colours: doc.colors.length > 0, type: doc.typography.length > 0, layout: !!l.frame, components: doc.components.length > 0, logos: (l.logos?.length ?? 0) > 0 || hasSec("logos"),
    motion: hasSec("motion") || doc.groups.some((g) => g.key === "timing"), rules: hasSec("rules"), checks: checks.length > 0, guideline: docs.length > 0, spec: !!l.frame, versions: (l.versions?.length ?? 0) > 0 }[k]));
  const open = shownTabs.some(([k]) => k === tab) ? tab : shownTabs[0]?.[0];
  const pick = (k) => { setTab(k); paneTop.current?.closest(".main, .bk-sheet")?.scrollTo({ top: 0 }); };
  kit.setTab = pick;
  const summary = lookSummary(doc.meta.description?.value ?? l.description);
  const name = naming !== null ? <input className="input bk-name" value={naming} autoFocus onChange={(e) => setNaming(e.target.value)} onBlur={() => rename(naming)} onKeyDown={(e) => { if (e.key === "Enter") rename(naming); if (e.key === "Escape") setNaming(null); }} aria-label={t("Name")} />
    : <h1>{l.title}</h1>;
  const renameBtn = l.editable && naming === null && <button type="button" className="btn ghost icon sm bk-rename" onClick={() => setNaming(l.title)} aria-label={t("Rename")} title={t("Rename")}><Pencil size={14} /></button>;
  const actions = <>
    {l.editable && <><button type="button" className="btn ghost" onClick={() => setAsk(true)}><Trash2 size={14} />{t("Delete")}</button>
      <button type="button" className="btn" onClick={() => setMaking(true)} disabled={!!scan || l.status === "scanning" || !l.frame} title={t("A new kit of the same name. This one stays as it is, and films can still use it.")}><CopyPlus size={14} />{t("New version")}</button>
      {!l.unread?.length && <><button type="button" className="btn" onClick={() => addMore.current?.click()} disabled={!!scan || l.status === "scanning"} title={t("Add files to this kit and scan it again. A new guideline: use New version, so this one stays as it is.")}><Plus size={14} />{t("Add files")}</button>
        <input ref={addMore} type="file" multiple hidden accept={ACCEPT_ATTR} onChange={(e) => { addFiles([...e.target.files]); e.target.value = ""; }} /></>}</>}
    {!l.editable && <button type="button" className="btn" onClick={copyKit} disabled={copying}>{copying ? <Loader2 size={14} className="spin" /> : <Copy size={14} />}{copying ? t("Making your copy…") : t("Make my copy")}</button>}
    <button type="button" className="btn primary" onClick={() => go(`/new?look=${encodeURIComponent(id)}`)} disabled={l.status !== "ready"}><Plus size={15} />{t("Use in a new project")}</button>
  </>;
  const meta = <p className="bk-headmeta"><span className="au-tag">{l.group === "yours" ? t("Yours") : "HF"}</span>{l.createdAt && <span>{t("made {date}", { date: madeOn(l.createdAt) })}</span>}{typeof l.version === "number" && <span>{t("revision {v}", { v: l.version })}</span>}{l.updatedAt && <span>{ago(l.updatedAt)}</span>}</p>;
  const notes = <>
    {!l.editable && <p className="bk-note-line">{t("HyperFrames' kit stays as shipped. To change it, make your own copy.")}</p>}
    {l.madeFrom && <p className="bk-note-line">{t("New version of the kit made {date}.", { date: madeOn(l.madeFrom.createdAt) })} <button type="button" className="bk-ref" onClick={() => go(`/looks/${l.madeFrom.id}`)}>{t("Open it")}</button></p>}
    {l.source?.basedOn && <p className="bk-note-line">{t("Your copy of HyperFrames' {title}.", { title: l.source.basedOn.title })}</p>}
    {l.status === "failed" && <p className="warn-note"><AlertTriangle size={13} />{t(l.error ?? "The scan did not finish. Upload the guideline again or try another file.")}</p>}
    {l.editable && l.status === "ready" && l.gaps?.length > 0 && <div className="warn-note lk-unread" role="status"><AlertTriangle size={13} /><div className="lk-unread-in">
      <p className="lk-unread-t">{t("Films cannot be fully checked against this kit yet")}</p>
      <p>{t("Scan it again to add: {what}", { what: l.gaps.join("; ") })}</p>
      <button type="button" className="btn sm" onClick={() => rescan()} disabled={!!scan}><Upload size={14} />{t("Scan again")}</button>
    </div></div>}
    {l.unread?.length > 0 && <UnreadFiles look={l} onRemove={removeFile} onAdd={addFiles} busy={!!scan || l.status === "scanning"} />}
    {scan ? <p className="lk-stage"><Loader2 size={14} className="spin" />{scan.stage ? t(scan.stage) : t("Reading the guideline…")}{scan.progress != null ? ` · ${scan.progress}%` : ""}</p>
      : l.status === "scanning" ? <p className="lk-stage"><Loader2 size={14} className="spin" />{t("Reading the guideline…")}</p>
        : l.editable && ["failed", "draft"].includes(l.status) && l.files?.length > 0 && <div className="sgb-acts"><button className="btn" onClick={() => rescan()}><Upload size={14} />{t("Scan again")}</button></div>}
  </>;
  const body = !l.frame ? <div className="bk-empty"><p>{l.status === "scanning" || scan ? t("The kit appears here when the scan is done.") : t("Nothing to show yet: add the guideline and scan it.")}</p></div> : <div className="bk-body">
    <nav className="bk-nav" aria-label={t("Brand Kit sections")}>{shownTabs.map(([k, label, Icon]) => <button key={k} type="button" className={"rail-item" + (open === k ? " active" : "")} aria-current={open === k ? "page" : undefined} onClick={() => pick(k)}><Icon size={16} /><span>{t(label)}</span></button>)}</nav>
    <div className="bk-pane" ref={paneTop} key={open}>
      {open === "overview" && <Overview kit={kit} look={l} />}
      {open === "colours" && <Colours kit={kit} />}
      {open === "type" && <Typography kit={kit} fonts={fonts} />}
      {open === "layout" && <Layout kit={kit} look={l} />}
      {open === "components" && <Components kit={kit} />}
      {open === "logos" && <Logos kit={kit} look={l} />}
      {open === "motion" && <Motion kit={kit} />}
      {open === "rules" && <Rules kit={kit} />}
      {open === "checks" && <Checks kit={kit} rows={checks} />}
      {open === "guideline" && <Guideline kit={kit} look={l} />}
      {open === "spec" && <Spec kit={kit} text={text} />}
      {open === "versions" && <Versions look={l} onRestore={restore} dirty={dirty} />}
      {open === "versions" && l.source?.credit && (l.group !== "yours" || l.source.basedOn) && <CreditLine author={l.source.credit.author} licence={l.source.credit.licence} link={l.source.credit.link} commit={l.source.credit.commit} made={l.source.credit.made} />}
    </div>
  </div>;
  const page = <>
    {fonts?.css && <style>{fonts.css}</style>}
    <datalist id="bk-fonts">{[...(fonts?.choices?.kit ?? []), ...(fonts?.choices?.app ?? [])].map((f) => <option key={f} value={f} />)}</datalist>
    {notes}
    {body}
    {dirty && <div className="bk-savebar" role="status"><span>{t("Changes not saved")}: <span className="bk-meta">{draft.labels.slice(-3).join(", ")}{draft.labels.length > 3 ? ` +${draft.labels.length - 3}` : ""}</span></span><span className="spacer" />
      <button type="button" className="btn ghost sm" onClick={undo} disabled={saving}><Undo2 size={13} />{t("Undo")}</button>
      <button type="button" className="btn sm" onClick={discard} disabled={saving}>{t("Discard")}</button>
      <button type="button" className="btn sm" onClick={saveAsNew} disabled={saving || savingNew} title={t("Keep this kit as it was saved and put these changes in a new kit of the same name.")}>{savingNew ? <Loader2 size={13} className="spin" /> : <CopyPlus size={13} />}{savingNew ? t("Saving…") : t("Save as new version")}</button>
      <button type="button" className="btn primary sm" onClick={save} disabled={saving || savingNew} title={t("Save in this kit. Its history keeps the text before.")}>{saving ? <Loader2 size={13} className="spin" /> : <Check size={13} />}{saving ? t("Saving…") : t("Save")}</button></div>}
    {lockedOpen && locked.length > 0 && !scan && <LockedDialog names={locked} canGoOn={(l.files ?? []).some((f) => !locked.includes(f.name))} onAdd={addFiles} onGoOn={() => rescan({ withoutLocked: true })} onClose={() => setLockedOpen(false)} />}
    {ask && <Dialog title={t("Delete “{title}”?", { title: l.title })} danger onClose={() => setAsk(false)} footer={<><span className="spacer" />
      <button className="btn" onClick={() => setAsk(false)}>{t("Cancel")}</button><button className="btn danger" onClick={remove}><Trash2 size={14} />{t("Delete")}</button></>}>
      <div className="dlg-lines"><p className="dlg-warn">{t("“{title}” leaves your Brand Kits.", { title: l.title })}</p><p>{t("Projects already made with it keep their copy.")}</p></div></Dialog>}
    {viewer && <Viewer items={viewer.items} at={viewer.at} onClose={() => setViewer(null)} />}
    {making && <CreateLook from={l} onClose={() => setMaking(false)} onDone={(newId, isLocked) => { setMaking(false); onChanged?.(); onCreated?.(newId, isLocked); }} />}
  </>;
  if (studio) return <div className="st-room st-kitbook">
    <div className="st-head"><button type="button" className="btn ghost sm back-btn" onClick={() => go("/looks")}><ArrowLeft size={14} />{t("Back")}</button>{name}{renameBtn}<span className="st-aside">{summary}</span><div className="st-acts">{actions}</div></div>
    <div className="st-table studio-paper bk-sheet">{meta}{page}</div>
  </div>;
  return <div className="page bk-page">
    <div className="page-head"><div><button type="button" className="btn ghost sm back-btn" onClick={() => go("/looks")}><ArrowLeft size={14} />{t("Back")}</button><div className="bk-titleline">{name}{renameBtn}</div>{meta}</div>
      <div className="actions">{actions}</div></div>
    {page}
  </div>;
}
