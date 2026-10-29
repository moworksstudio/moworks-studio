// New project: the same eight numbered boxes for every film style, read top to bottom, left column then right. The left column sets
// the film up: 1 Title (and where it is saved), 2 Film style ("by" its author), then what the style may lock, 3 Brand Kit and
// 4 Characters, then 5 Format (length as an After Effects timecode, size typed with its ratio shown, frame rate), 6 System settings.
// The right column is 7 Brief (the style's sample, the style's own questions) above 8 Assets; the Brief stretches so both columns
// end on one line, so the left column's height sets the dialog's.
// A box the style does not use is locked with "Follows film style", never hidden or moved. No Film kind question.
// Five type levels only: box title, field label, value, short description, fine print. No scroll bar at a normal desktop size: the
// dialog is laid out for 1440 x 900 and scaled down as one piece below that. Ctrl+Enter creates.
// Without a Claude sign-in it cannot create: the first message (the brief and the style's skill) must reach a Claude that is ready.
// Create makes the project, copies the files in, and opens the Editor, where Claude starts with the style's first step.
import { useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, ArrowDown, Check, ChevronDown, Clock3, FileText, Lightbulb, Loader2, Lock, Sparkles, X } from "lucide-react";
import { get, post } from "../api.js";
import { go, useToast } from "../lib.jsx";
import { useT } from "../i18n.jsx";
import { authorOf, authorsOf, useStyles } from "../screens/StyleGallery.jsx";
import { StyleCard } from "./StyleChooser.jsx";
import DesignSteps from "./DesignSteps.jsx";
import CharacterPick from "./CharacterPick.jsx";
import PromptLibrary from "./PromptLibrary.jsx";
import { AssetPicker, uploadAll } from "./assets.jsx";
import { NeedsClaude, useClaude } from "./claude.jsx";
import { FolderField } from "./folder.jsx";
import { ALL_SAMPLES, briefSampleFor, sampleFieldsFor, sampleOf, samplesFor } from "./briefSample.js";
import StyleQuestions from "./answers.jsx";
import "../workflow.css";

// Format: rates 24 · 25 · 30 · 60 with the author's default (else 30), no 60 for Brush; a size
// typed like After Effects (its ratio shown beside it) or one of four presets; even numbers, the long side at most 3840; Lemo and MG list
// the author's own size first; Brush draws only 1920 × 1080; Anidoodle keeps the presets until other sizes are tried.
const SIZES = [["16:9", 1920, 1080], ["9:16", 1080, 1920], ["1:1", 1080, 1080], ["4:5", 1080, 1350]];
const FPS = ["24", "25", "30", "60"];
const MAX_SIDE = 3840, MIN_SIDE = 320;          // the server's limits
const gcd = (a, b) => (b ? gcd(b, a % b) : a);
/** 1350 × 1080 → "5:4". */
const ratioOf = (w, h) => { const g = gcd(w, h) || 1; return `${w / g}:${h / g}`; };
/** The preset aspect a size is (one of the four), else null. */
const aspectOf = (w, h) => SIZES.find(([, pw, ph]) => pw * h === ph * w)?.[0] ?? null;
/** What a style allows: { fps: [..], fpsDefault, sizes: [[label, w, h]], typed, locked }. */
function formatRule(style) {
  const au = style ? authorOf(style) : null;
  const allowed = (style?.fps?.choices ?? style?.fps?.allowed)?.length ? (style.fps.choices ?? style.fps.allowed).map(String) : au === "johnheibel" ? ["24", "25", "30"] : FPS;
  const fpsDefault = String(style?.fps?.default ?? style?.mg?.fps ?? (au === "alexgreensh" ? 24 : 30));
  const presets = SIZES.filter(([a]) => !style?.aspects || style.aspects.includes(a));
  const own = style?.mg?.size ?? style?.lemo?.size ?? null;
  const sizes = own && !presets.some(([, w, h]) => w === own[0] && h === own[1]) ? [[ratioOf(own[0], own[1]), own[0], own[1]], ...presets] : presets;
  // the catalog's own rule: format { fps: { default, choices, slowAt }, sizes: { aspects (the author's first), custom, author: [w, h] } }
  const fm = style?.format;
  if (fm?.fps || fm?.sizes) {
    const choices = fm.fps?.choices?.length ? fm.fps.choices.map(String) : allowed;
    const def = String(fm.fps?.default ?? fpsDefault);
    const asp = fm.sizes?.aspects?.length ? fm.sizes.aspects : SIZES.map(([a]) => a);
    const pre = fm.sizes?.presets?.length ? fm.sizes.presets.map((x) => [x.label ?? ratioOf(x.w, x.h), x.w, x.h]) : asp.map((a) => SIZES.find(([x]) => x === a)).filter(Boolean);
    const au2 = fm.sizes?.author ?? (() => { const o = fm.sizes?.presets?.find((x) => x.own); return o ? [o.w, o.h] : null; })();
    const list = au2 && !pre.some(([, w, h]) => w === au2[0] && h === au2[1]) ? [[ratioOf(au2[0], au2[1]), au2[0], au2[1]], ...pre] : pre;
    const locked = !!fm.sizes?.locked, typed = fm.sizes ? !!fm.sizes.custom && !locked : true;
    return { fps: choices, fpsDefault: choices.includes(def) ? def : choices[0], sizes: list, typed, locked: locked || (!typed && list.length === 1), slowAt: fm.fps?.slowAt != null ? String(fm.fps.slowAt) : null, slower: fm.fps?.slower ?? 2,
      own: au2 ? `${au2[0]} × ${au2[1]}` : null };
  }
  if (au === "johnheibel") return { fps: allowed, fpsDefault, sizes: [["16:9", 1920, 1080]], typed: false, locked: true };
  return { fps: allowed, fpsDefault: allowed.includes(fpsDefault) ? fpsDefault : allowed[0], sizes, typed: au !== "alexgreensh", locked: false, own: own ? own.join(" × ") : null };
}
const PRESETS = [15, 30, 45, 60, 90, 120, 180, 300, 600, 900, 1200];          // the length list under the timecode
const KEY = "mw-draft:new-project-2";
const KEY_V = 6;          // 6: a size in pixels; 5: length is a timecode, settings hold real values
const DEFAULTS = { model: "opus", effort: "high", web: "on" };          // the user's defaults for a new project
// a new film starts at 15 s
const blank = { v: KEY_V, title: "", folderName: "", styleId: "general", look: "", characters: [], length: "0:00:15:00", width: 1920, height: 1080, fps: "30", brief: "", answers: {},
  model: DEFAULTS.model, effort: DEFAULTS.effort, mode: "global", web: DEFAULTS.web, voice: "global" };
const WEB = { ask: "Ask first", on: "On", off: "Off" };
/** "Opus (most capable)" -> "Opus": the select shows the short name, the full wording stays in Settings. */
const short = (s) => String(s ?? "").replace(/\s*\(.*?\)\s*$/, "");
const slug = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/gi, "d").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
const wordsFor = (sec) => Math.round(sec / 60 * 150);
const MAX_SECONDS = 3600;                                   // the server cuts a film at 60:00 (packages/project-service)
const RESERVED = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i;  // device names Windows will not let a folder have
const hasDraft = (x) => !!(x.title?.trim() || x.brief?.trim() || x.folderName?.trim());

// Length as an After Effects timecode, H:MM:SS:FF, the last two digits frames at the chosen rate
const pad = (n) => String(n).padStart(2, "0");
/** Seconds -> "0:00:15:00" at `fps`. */
export function toTimecode(sec, fps) {
  const r = Number(fps) || 30, all = Math.round(sec * r), s = Math.floor(all / r);
  return `${Math.floor(s / 3600)}:${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}:${pad(all % r)}`;
}
/** A typed length -> seconds, or null. As in After Effects, digits alone fill frames, seconds, minutes, hours from the right ("1500" is
 *  0:00:15:00) and parts with colons do the same ("15:00" is 15 seconds); "1:30" with one colon reads as minutes:seconds, the way people
 *  write a length. Frames over the rate carry into seconds. */
export function fromTimecode(text, fps) {
  const t = String(text ?? "").trim(), r = Number(fps) || 30;
  if (!t) return null;
  let p;
  if (/^\d+$/.test(t)) { const d = t.padStart(8, "0"); p = [d.slice(0, -6), d.slice(-6, -4), d.slice(-4, -2), d.slice(-2)]; }
  else {
    p = t.split(/[:;.]/);
    if (p.length > 4 || p.some((x) => !/^\d+$/.test(x))) return null;
    p = p.length === 2 ? ["0", p[0], p[1], "0"] : [...Array(4 - p.length).fill("0"), ...p];
  }
  const [h, m, s, f] = p.map(Number);
  return ((h * 60 + m) * 60 + s) + f / r;
}
/** A brief that starts from the character the user described on the Characters page; the story is theirs to write (the sample's
 *  story is about its own character, so it is not kept). */
const withCharacter = (desc) => `Character (new, our own): ${desc}\nStory: `;
/** 12 → "12 s", 75 → "1 min 15 s": a length read in words next to its time code. */
const secondsText = (s) => (s == null ? "" : s < 60 ? `${Math.round(s * 10) / 10} s` : `${Math.floor(s / 60)} min${Math.round(s % 60) ? ` ${Math.round(s % 60)} s` : ""}`);
const tidyLength = (text, fps) => { const s = fromTimecode(text, fps); return s == null ? text : toTimecode(s, fps); };

/** The dialog is laid out for a 1440 x 900 window and scaled down as one piece below that, never up. It takes the window's
 *  width up to 1680 px (the spare room on both sides goes to the boxes), so `width` is in the dialog's own, unscaled px. */
const FIT_W = 1440, FIT_H = 900, MAX_W = 1680;
function useFit() {
  const read = () => { const s = Math.round(Math.min(1, Math.max(0.62, Math.min(window.innerWidth / FIT_W, window.innerHeight / FIT_H))) * 1000) / 1000;
    return { scale: s, width: Math.round(Math.min(MAX_W, window.innerWidth - 48) / s) }; };
  const [f, setF] = useState(read);
  useEffect(() => { const on = () => setF(read()); window.addEventListener("resize", on); return () => window.removeEventListener("resize", on); }, []);
  return f;
}

function useOutside(ref, open, close) {
  useEffect(() => {
    if (!open) return;
    const off = (e) => { if (!ref.current?.contains(e.target)) close(); };
    const esc = (e) => { if (e.key === "Escape") { e.stopPropagation(); close(); } };
    document.addEventListener("mousedown", off); document.addEventListener("keydown", esc, true);
    return () => { document.removeEventListener("mousedown", off); document.removeEventListener("keydown", esc, true); };
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
}

/** Length: a typed timecode, tidied on leaving the field; no list. */
function LengthField({ value, fps, onChange, invalid, describedBy }) {
  const t = useT();
  return <div className={"pick-btn length" + (invalid ? " invalid" : "")}><Clock3 size={14} />
    <input id="np-len" className="num" value={value} onChange={(e) => onChange(e.target.value)} onBlur={() => onChange(tidyLength(value, fps))} placeholder="0:00:15:00"
      inputMode="numeric" spellCheck={false} aria-label={t("Length")} aria-invalid={invalid || undefined} aria-describedby={describedBy}
      title={t("Hours : minutes : seconds : frames")} />
    {fromTimecode(value, fps) != null && <span className="np-len-s num" aria-hidden="true">{secondsText(fromTimecode(value, fps))}</span>}</div>;
}

/** Size: width × height typed as in After Effects, the ratio shown beside it, and a list of the style's sizes (the
 *  author's own first). Locked for a style that draws one size only; presets only while typed sizes are not tried for the style. */
function SizeField({ w, h, rule, onChange, invalid }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [up, setUp] = useState(false);
  const ref = useRef(null);
  useOutside(ref, open, () => setOpen(false));
  // The list opens upwards when the dialog's scrolling body has no room for it below (it was cut to one row)
  const toggle = () => {
    if (!open && ref.current) {
      const r = ref.current.getBoundingClientRect(), box = (ref.current.closest(".dialog-body") ?? document.documentElement).getBoundingClientRect();
      const need = Math.min(rule.sizes.length * 52 + 16, 352), below = box.bottom - r.bottom, above = r.top - box.top;
      setUp(below < need && above > below);
    }
    setOpen((o) => !o);
  };
  const num = (v) => { const n = parseInt(String(v).replace(/\D/g, ""), 10); return Number.isFinite(n) ? n : 0; };
  if (rule.locked) return <div className="pick-btn np-size locked" title={t("Follows film style")}><Lock size={13} /><span className="num">{w} × {h}</span><span className="np-size-r num">{ratioOf(w, h)}</span></div>;
  return <div className="pick np-size-wrap" ref={ref}>
    <div className={"pick-btn np-size" + (invalid ? " invalid" : "")}>
      <input className="num" value={w || ""} onChange={(e) => onChange(num(e.target.value), h)} disabled={!rule.typed} aria-label={t("Width")} inputMode="numeric" />
      <span aria-hidden="true">×</span>
      <input className="num" value={h || ""} onChange={(e) => onChange(w, num(e.target.value))} disabled={!rule.typed} aria-label={t("Height")} inputMode="numeric" />
      <span className="np-size-r num" title={t("Aspect ratio")}>{w && h ? ratioOf(w, h) : ""}</span>
      <button type="button" className="btn ghost icon sm" onClick={toggle} aria-haspopup="listbox" aria-expanded={open} aria-label={t("Sizes")}><ChevronDown size={14} /></button>
    </div>
    {open && <ul className={"pick-list np-size-list" + (up ? " up" : "")} role="listbox">{rule.sizes.map(([a, pw, ph], i) => <li key={a + pw} role="option" aria-selected={pw === w && ph === h}>
      <button type="button" onClick={() => { onChange(pw, ph); setOpen(false); }}><span className="tx"><b className="num">{pw} × {ph}</b>
        <span>{a}{rule.own && i === 0 && `${pw} × ${ph}` === rule.own ? ` · ${t("the author's size")}` : ""}</span></span>{pw === w && ph === h && <Check size={14} />}</button></li>)}</ul>}
  </div>;
}
/** Which characters a style can take: an author's actors only in that author's styles (Anidoodle's people only where the
 *  style draws people); a style without a hand of its own redraws any saved character (Graphic & Type and the format categories); the
 *  painted, printed, game, cartoon, 3D, cinema and documentary styles of other authors keep "Follows film style". */
const REDRAW_OK = ["Custom", "Explainer", "Motion graphics", "Music / Lyrics", "Brand / Product", "Presentation", "Video overlays", "Information & Keynote", "Graphic & Type"];
const ENGINE_OF = { johnheibel: ["brush-kit"], alexgreensh: ["anidoodle-human"] };          // Anidoodle's people, animals and things all use this engine
function castRule(style) {
  const au = style ? authorOf(style) : null;
  if (ENGINE_OF[au]) return { mode: "own", allow: (c) => ENGINE_OF[au].includes(c.engine) && (au !== "alexgreensh" || c.kind !== "human" || style.characterEngine === "anidoodle-human") };
  if (REDRAW_OK.includes(style?.category)) return { mode: "redraw", allow: () => true };
  return { mode: "locked", allow: () => false };
}

/** One numbered box of the workflow: its number, its title, an optional note or action, then its fields. */
function Step({ n, title, note, action, className = "", children }) {
  return <section className={"np2-step " + className} aria-labelledby={`np2-s${n}`}>
    <header className="np2-step-h"><span className="np2-n num" aria-hidden="true">{n}</span><h3 id={`np2-s${n}`}>{title}</h3>{note && <span className="np2-note">{note}</span>}{action}</header>
    {children}
  </section>;
}

export default function NewProjectDialog({ onClose }) {
  const t = useT();
  const toast = useToast();
  const claude = useClaude();
  const stylesQ = useStyles();
  const styles = stylesQ.data?.styles ?? [];
  const styleAuthors = useMemo(() => authorsOf(stylesQ.data), [stylesQ.data]);
  const [d, setD] = useState(() => {
    try {
      const x = JSON.parse(sessionStorage.getItem(KEY) ?? "{}");
      if (x.v === KEY_V) return { ...blank, ...x };
      if (x.v === 5) { const p = SIZES.find(([a]) => a === x.aspect) ?? SIZES[0]; return { ...blank, ...x, v: KEY_V, width: p[1], height: p[2] }; }
      if (x.v === 4 || x.v === 3) {          // an older draft: its length becomes a timecode, "as in Settings" the user's defaults
        return { ...blank, ...x, v: KEY_V, length: tidyLength(x.length ?? "1:00", x.fps ?? 30), model: DEFAULTS.model, effort: DEFAULTS.effort, web: DEFAULTS.web };
      }
      return { ...blank, title: x.title ?? "", brief: x.brief ?? "" };
    } catch { return blank; }
  });
  const [draftBack, setDraftBack] = useState(() => hasDraft(d));   // a draft kept from the last time is said out loud
  const [files, setFiles] = useState([]);
  const [agent, setAgent] = useState(null);
  const [loc, setLoc] = useState(null);              // where the project is saved ({ path, drive }); default from Settings
  const [touched, setTouched] = useState(false);
  const [ideas, setIdeas] = useState(false);   // Writing ideas: the prompt library (OPUSCAR 98 first) over the dialog
  const [askReplace, setAskReplace] = useState(false);   // a style was chosen while the brief holds the user's own text
  const [sampleMenu, setSampleMenu] = useState(false);   // Anidoodle's three kinds of film as samples
  const sampleBox = useRef(null);
  useOutside(sampleBox, sampleMenu, () => setSampleMenu(false));
  const [, setFieldsSet] = useState(false);      // what the user set; a sample brief never changes the boxes now
  const [phase, setPhase] = useState(null);         // null | "creating" | "copying"
  const [err, setErr] = useState(null);
  const job = useRef(null);
  const box = useRef(null);
  const { scale, width: fitW } = useFit();
  useEffect(() => { const q = new URLSearchParams(location.hash.split("?")[1] ?? ""); const s = q.get("style"), lk = q.get("look"), ch = q.get("character");          // from the Style Gallery, the Look page or the Characters page
    if (s) chooseStyle(s); if (lk) setD((x) => ({ ...x, look: lk }));
    if (ch) setD((x) => ({ ...x, brief: withCharacter(ch) })); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { try { sessionStorage.setItem(KEY, JSON.stringify(d)); } catch { /* private */ } }, [d]);
  useEffect(() => { get("/api/agent/settings").then(setAgent).catch(() => {});
    get("/api/storage/location").then((r) => setLoc({ path: r.location, drive: r.drive })).catch(() => {}); }, []);
  // a setting the server does not offer falls back to what Settings holds
  useEffect(() => {
    if (!agent) return;
    const ok = { model: (agent.models ?? []).map((m) => m[0]), effort: agent.efforts ?? [], web: agent.webChoices ?? Object.keys(WEB) };
    setD((x) => ({ ...x, model: ok.model.includes(x.model) ? x.model : agent.model, effort: ok.effort.includes(x.effort) ? x.effort : agent.effort, web: ok.web.includes(x.web) ? x.web : agent.web }));
  }, [agent]);
  useEffect(() => { box.current?.querySelector("#np-title")?.focus(); }, []);
  const set = (k) => (e) => setD((x) => ({ ...x, [k]: e?.target ? (e.target.type === "checkbox" ? e.target.checked : e.target.value) : e }));
  const style = styles.find((s) => s.id === d.styleId);
  const film = { human: style?.characterEngine === "anidoodle-human", layer: !!style?.characters, hand: style?.humanHand ?? null };          // how a picked character lives in this film
  // a new style brings its author's rate and a size it takes; the length keeps its time at the new rate
  const rule = formatRule(style);
  const fpsList = rule.fps;
  const lastStyle = useRef(d.styleId);
  useEffect(() => {
    if (!style) return;
    const fresh = lastStyle.current !== style.id; lastStyle.current = style.id;
    setD((x) => {
      const fps = fresh || !rule.fps.includes(x.fps) ? rule.fpsDefault : x.fps, sec = fromTimecode(x.length, x.fps);
      const preset = rule.sizes.some(([, w, h]) => w === x.width && h === x.height);
      const fits = rule.locked ? preset : rule.typed ? (!aspectOf(x.width, x.height) || rule.sizes.some(([, w, h]) => w * x.height === h * x.width)) : preset;
      const size = fits ? {} : { width: rule.sizes[0][1], height: rule.sizes[0][2] };
      return { ...x, ...size, fps, length: sec == null ? x.length : toTimecode(sec, fps) };
    });
  }, [style?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const aspect = aspectOf(d.width, d.height);
  const sizeBad = !(d.width >= MIN_SIDE && d.height >= MIN_SIDE) || Math.max(d.width, d.height) > MAX_SIDE || d.width % 2 !== 0 || d.height % 2 !== 0;
  const cast = castRule(style);
  const seconds = fromTimecode(d.length, d.fps);
  const setFps = (e) => { const fps = e.target.value; setFieldsSet(true); setD((x) => { const s = fromTimecode(x.length, x.fps); return { ...x, fps, length: s == null ? x.length : toTimecode(s, fps) }; }); };
  // the minimum to create: a name, a save folder, an available style, a length, and a signed-in Claude. The first thing
  // missing is told next to the button, so a disabled Create never looks like a hang.
  const folder = slug(d.title);                 // the folder comes from the name (the Folder name field went)
  const [known, setKnown] = useState([]);     // paths of the projects the app already lists (a stand-in while the server cannot tell)
  const [real, setReal] = useState(null);     // the server's answer: { folder, taken }
  useEffect(() => { get("/api/projects").then((r) => setKnown((r.projects ?? []).map((x) => String(x.path ?? "").replace(/[\\/]+$/, "").toLowerCase()))).catch(() => {}); }, []);
  useEffect(() => {
    if (!loc?.path || !folder) { setReal(null); return undefined; }
    const h = setTimeout(() => {
      post("/api/projects/folder", { title: d.title, location: loc.path, aspect: aspect ?? "custom", width: d.width, height: d.height, durationSec: seconds || undefined, fps: Number(d.fps) || 30 })
        .then((r) => setReal(r?.ok && r.name ? { folder: r.name, taken: !!r.taken, for: folder } : null)).catch(() => setReal(null));
    }, 350);
    return () => clearTimeout(h);
  }, [loc?.path, d.title]); // eslint-disable-line react-hooks/exhaustive-deps (the server answers with the folder it will really use: POST /api/projects/folder)
  const predicted = useMemo(() => {
    if (!loc?.path || !folder) return folder;
    const base = loc.path.replace(/[\\/]+$/, "").toLowerCase() + "\\";
    let n = folder, k = 2;
    while (known.includes(base + n.toLowerCase())) n = `${folder}-${k++}`;
    return n;
  }, [known, loc?.path, folder]);
  const answered = real?.for === folder ? real : null;          // the server's answer for the name as it is now (no flicker while typing)
  const reserved = !!folder && RESERVED.test(folder);
  const missing = !d.title.trim() ? "Name the project first." : reserved ? "Windows keeps that name: choose another." : !loc?.path ? "Choose where to save the project."
    : !style?.available ? "Choose a style." : !(seconds >= 5) ? "Set a length of at least 0:00:05:00." : seconds > MAX_SECONDS ? "Set a length of at most 1:00:00:00."
      : sizeBad ? "Set a size in even numbers, the long side at most 3840." : null;
  const checking = !missing && !claude?.status;
  const canCreate = !missing && !!claude?.connected && !phase;
  const reason = missing ?? (checking ? "Checking Claude…" : null);
  const close = () => { if (phase) return; onClose(); };
  const clearDraft = () => { setD({ ...blank }); setFiles([]); setTouched(false); setDraftBack(false); try { sessionStorage.removeItem(KEY); } catch { /* private */ } box.current?.querySelector("#np-title")?.focus(); };
  // Esc closes the dialog (an open list closes first: it listens before us and stops the key); a draft stays and says so next time
  useEffect(() => {
    const esc = (e) => { if (e.key === "Escape" && !e.defaultPrevented) { e.preventDefault(); close(); } };
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }); // eslint-disable-line react-hooks/exhaustive-deps
  // on a very small window the lower boxes are under the fold; say so with a fade and a button
  const bodyRef = useRef(null);
  const [fold, setFold] = useState(false);
  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    const read = () => setFold(el.scrollHeight - el.scrollTop - el.clientHeight > 12);
    read();
    const ro = new ResizeObserver(read);
    ro.observe(el); for (const c of el.children) ro.observe(c);
    el.addEventListener("scroll", read, { passive: true });
    return () => { ro.disconnect(); el.removeEventListener("scroll", read); };
  }, []);

  // the first field still missing, to go to when Create is pressed too early (focus management)
  const firstMissing = () => (!d.title.trim() || reserved ? "#np-title" : !loc?.path ? ".np2-saved button" : !style?.available ? ".np-style button" : !(seconds >= 5) || seconds > MAX_SECONDS ? "#np-len" : null);
  const create = async () => {
    if (!canCreate) { setTouched(true); const f = firstMissing(); if (f) box.current?.querySelector(f)?.focus(); return; }
    setIdeas(false);
    setErr(null); setPhase("creating");
    try {
      // the design: a style with its own design sends none
      const free = style?.design ? style.design === "open" : !!style?.look;
      // the size: one of the four presets as its aspect, else "custom" with the typed width and height
      const p = await post("/api/projects", { title: d.title.trim(), styleId: d.styleId, aspect: aspect ?? "custom", width: d.width, height: d.height, fps: Number(d.fps) || 30, durationSec: seconds,
        brief: d.brief, look: free && d.look ? { id: d.look } : null,
        settings: { model: d.model, effort: d.effort, web: d.web }, location: loc?.path,
        characters: cast.mode !== "locked" && d.characters?.length ? d.characters : undefined,          // the box's own rule decides; written into the film at creation
        kickoff: true });
      if (files.length) {
        setPhase("copying");
        job.current = uploadAll(p.id, files, (id, patch) => setFiles((xs) => xs.map((x) => (x.id === id ? { ...x, ...patch } : x))));
        const r = await job.current.done;
        if (r.failed) toast(t("{n} file(s) could not be copied; import them again in the Editor", { n: r.failed }), "error");
      }
      sessionStorage.removeItem(KEY);
      toast(t("Created “{title}”: Claude starts in the Editor", { title: p.title }));
      onClose();
      go(`/projects/${p.id}`);
    } catch (e) { setErr(t(e.message)); setPhase(null); }          // the server's messages are English keys; t shows the Vietnamese when there is one
  };
  /** The draft with a style's sample brief. The boxes stay as they are (the boxes win over any brief); what the
   *  sample was written for (its length, aspect and rate) shows under Format with one button to take it. The design fields never change. */
  const withSample = (x, styleId, kind = null) => ({ ...x, styleId, sampleKind: kind, brief: briefSampleFor(styleId, "en", kind) });
  const sampleFor = (() => {
    const f = sampleFieldsFor(d.styleId, d.sampleKind) ?? {};
    if (!isSample(d.brief) || !d.brief.trim()) return null;
    const fps = f.fps != null ? String(f.fps) : null, p = f.aspect && !rule.locked ? rule.sizes.find(([a]) => a === f.aspect) : null;
    const length = f.length ? tidyLength(f.length, fps ?? d.fps) : null;
    const diff = { ...(fps && fps !== d.fps && fpsList.includes(fps) ? { fps } : {}), ...(p && p[0] !== aspect ? { width: p[1], height: p[2], aspect: p[0] } : {}), ...(length && length !== d.length ? { length } : {}) };
    return Object.keys(diff).length ? diff : null;
  })();
  const takeSample = () => { const { aspect: _a, ...rest } = sampleFor; setD((x) => ({ ...x, ...rest })); };
  const fillSample = (kind = d.sampleKind ?? null) => { setD((x) => withSample(x, x.styleId, kind)); setAskReplace(false); setSampleMenu(false); };
  const kinds = samplesFor(d.styleId);
  // while the box still holds an untouched sample, typing or pasting replaces the whole sample (never mixed into it)
  const sampleNow = isSample(d.brief) && !!d.brief.trim();
  const replaceSample = (text) => setD((x) => ({ ...x, brief: text }));
  // Choosing a style loads its sample brief: straight away when the box is empty or still holds a sample, else one question.
  // An adapted sample's credit (lemo's, from DEMO.md) rides on the Sample brief button (no credit line under the box).
  const credit = sampleOf(d.styleId, d.sampleKind)?.credit;
  function isSample(text) { return !text.trim() || ALL_SAMPLES.some((s) => text === s.en || text === s.vi); }
  const chooseStyle = (id) => {
    if (isSample(d.brief)) { setD((x) => withSample(x, id)); setAskReplace(false); }
    else { setD((x) => ({ ...x, styleId: id, sampleKind: null })); setAskReplace(true); }
  };
  const addToBrief = (text) => setD((x) => ({ ...x, brief: x.brief.trim() ? `${x.brief.trimEnd()}\n\n${text}` : text }));
  const onKey = (e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); create(); } };
  const lenBad = (touched && !(seconds >= 5)) || seconds > MAX_SECONDS || (d.length.trim() && seconds == null);
  const assetsHint = t("Pictures, video, audio, fonts, logos, PSD, PPTX, PDF, guidelines. Files are copied; your originals stay as they are.");
  const settingsRows = [
    ["model", "Model", (agent?.models ?? [[DEFAULTS.model, "Opus 5.5"]]).map(([k, l]) => [k, short(t(l))])],
    ["effort", "Effort", (agent?.efforts ?? [DEFAULTS.effort]).map((k) => [k, t(k[0].toUpperCase() + k.slice(1))])],
    ["web", "Web", (agent?.webChoices ?? Object.keys(WEB)).map((k) => [k, t(WEB[k] ?? k)])],
  ];

  return <div className="overlay np-overlay">          {/* a click beside it does not close it; Esc, Cancel and the close button do */}
    <div className="dialog np-dialog np2" role="dialog" aria-modal="true" aria-labelledby="np-h" ref={box} onKeyDown={onKey} style={{ zoom: scale, "--np-zoom": scale, width: fitW }}>
      <div className="dialog-head np2-head"><h2 id="np-h">{t("New project")}</h2>
        {draftBack && <span className="np2-draft" role="status"><FileText size={13} />{t("Draft saved")}<button type="button" className="clink" onClick={clearDraft}>{t("Clear draft")}</button></span>}
        <button className="btn ghost icon sm x" onClick={close} disabled={!!phase} aria-label={t("Close")} title={t("Close")}><X size={16} /></button></div>
      <div className="dialog-body np2-body" ref={bodyRef}>
        <div className="np2-cols">
          <div className="np2-col">
            <Step n={1} title={t("Title")}>
              <input id="np-title" spellCheck={false} className={"input np2-title" + (touched && !d.title.trim() ? " invalid" : "")} value={d.title} onChange={set("title")} placeholder={t("Name the project")} aria-label={t("Project name")} maxLength={120}
                aria-invalid={(touched && !d.title.trim()) || reserved || undefined} aria-describedby={(touched && !d.title.trim()) || reserved ? "np-title-e" : undefined} />
              <div className="np2-saved"><span className="np2-l">{t("Saved in")}</span>
                {loc && <FolderField value={loc.path} drive={loc.drive} title={t("Where to save the project")} onChange={(path, drive) => setLoc({ path, drive })} />}</div>
              {touched && !d.title.trim() && <span className="np2-err" id="np-title-e" role="alert">{t("Give the project a name.")}</span>}
              {touched && !loc?.path && <span className="np2-err" role="alert">{t("Choose where to save the project.")}</span>}
              {!reserved && answered && answered.folder !== folder && <span className="np2-desc np-taken">{t("That folder name is taken, so the folder will be {name}.", { name: answered.folder })}</span>}
              {reserved && <span className="np2-err" id="np-title-e" role="alert">{t("Windows keeps that name: choose another.")}</span>}
            </Step>

            <Step n={2} title={t("Film style")}>
              <StyleCard style={style} styles={styles} authors={styleAuthors} onChange={chooseStyle} />
              {touched && !style?.available && <span className="np2-err" role="alert">{t("Choose a film style.")}</span>}
            </Step>

            <Step n={3} title={t("Brand Kit")} note={style?.look ? t("A choice here wins over the brief") : null}>          {/* always box 3; locked for an author's own design */}
              <DesignSteps style={style} value={{ look: d.look }} brief={d.brief} onChange={(x) => setD((o) => ({ ...o, ...x }))} />
            </Step>

            <Step n={4} title={t("Characters")} note={cast.mode === "locked" ? null : t("optional")}>          {/* always box 4 */}
              {cast.mode === "locked" ? <div className="pick-btn ds-btn locked np-locked" aria-disabled="true"><Lock size={13} className="ds-lock" /><span className="t">{t("Follows film style")}</span></div>
                : <CharacterPick compact film={film} allow={cast.allow} value={d.characters ?? []} onChange={(v) => setD((o) => ({ ...o, characters: v }))} />}
              {cast.mode === "redraw" && (d.characters?.length > 0) && <span className="np2-desc">{t("Redrawn in this film style: it may not match the Characters library exactly, and it moves simply.")}</span>}
              {cast.mode === "locked" && <span className="np2-fine">{t("This film style draws everyone in its own hand; describe who appears in the Brief.")}</span>}
            </Step>

            <Step n={5} title={t("Format")}>
              <div className="np2-row3">
                <div className="np2-field"><label className="np2-l" htmlFor="np-len">{t("Length")}</label><LengthField value={d.length} fps={d.fps} onChange={(v) => { setFieldsSet(true); set("length")(v); }} invalid={lenBad} describedBy={lenBad ? "np-len-d" : undefined} /></div>
                <div className="np2-field"><span className="np2-l">{t("Size")}</span>
                  <SizeField w={d.width} h={d.height} rule={rule} invalid={sizeBad} onChange={(width, height) => { setFieldsSet(true); setD((x) => ({ ...x, width, height })); }} /></div>
                <div className="np2-field"><label className="np2-l" htmlFor="np-fps">{t("Frame rate")}</label>
                  <select id="np-fps" className="select num" value={d.fps} onChange={setFps}>{fpsList.map((f) => <option key={f} value={f}>{f} fps</option>)}</select></div>
              </div>
              {sampleFor && <p className="np-sample-fields"><span>{t("The sample brief is for a {what} film; your settings above stay as they are.", { what: [sampleFor.length && secondsText(fromTimecode(sampleFor.length, sampleFor.fps ?? d.fps)), sampleFor.aspect, sampleFor.fps && `${sampleFor.fps} fps`].filter(Boolean).join(" · ") })}</span>
                <button type="button" className="btn ghost sm" onClick={takeSample}>{t("Use the sample's settings")}</button></p>}
              {rule.locked && <span className="np2-desc"><Lock size={11} /> {t("Follows film style: this style draws at 1920 × 1080 only.")}</span>}
              {!rule.locked && !rule.typed && <span className="np2-desc">{t("This style takes the four sizes in the list for now.")}</span>}
              {(rule.slowAt ? d.fps === rule.slowAt : authorOf(style ?? {}) === "alexgreensh" && d.fps === "60") && <span className="np2-desc">{t("At {fps} fps the film takes about {x}× longer to render.", { fps: d.fps, x: rule.slower ?? 2 })}</span>}
              {sizeBad && d.width > 0 && d.height > 0 && <span className="np2-err" role="alert">{t("Use even numbers, at least 320 and the long side at most 3840.")}</span>}
              {(seconds == null || seconds > MAX_SECONDS || (touched && !(seconds >= 5))) && <span className="np2-err" id="np-len-d" role="alert">{seconds == null ? t("Hours:minutes:seconds:frames, e.g. 0:00:15:00") : seconds > MAX_SECONDS ? t("The longest film is 1:00:00:00.") : t("The shortest film is 0:00:05:00.")}</span>}          {/* no hint line under it */}
            </Step>

            <Step n={6} title={t("System settings")}>
              <div className="np2-row3">
                {settingsRows.map(([k, label, opts]) => <div className="np2-field" key={k}><label className="np2-l" htmlFor={`np-set-${k}`}>{t(label)}</label>
                  <select id={`np-set-${k}`} className="select" value={d[k]} onChange={set(k)}>{opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>)}
              </div>
            </Step>
          </div>

          <div className="np2-col">
            <Step n={7} title={t("Brief")} className="grow" action={kinds.length > 1
              ? <span className="pick np2-act-wrap" ref={sampleBox}><button type="button" className="btn ghost sm np2-act" onClick={() => setSampleMenu((o) => !o)} aria-haspopup="listbox" aria-expanded={sampleMenu}
                  title={credit ? t(credit.text) : undefined}><FileText size={13} />{t("Sample brief")}<ChevronDown size={13} /></button>
                {sampleMenu && <ul className="pick-list np-sample-list" role="listbox">{kinds.map(([k, l]) => <li key={k ?? "story"} role="option" aria-selected={(d.sampleKind ?? null) === k}>
                  <button type="button" onClick={() => (isSample(d.brief) ? fillSample(k) : (setD((x) => ({ ...x, sampleKind: k })), setAskReplace(true), setSampleMenu(false)))}>
                    <span className="tx"><b>{t(l)}</b></span>{(d.sampleKind ?? null) === k && <Check size={14} />}</button></li>)}</ul>}</span>
              : <button type="button" className="btn ghost sm np2-act" onClick={() => (isSample(d.brief) ? fillSample() : setAskReplace(true))}
              title={credit ? `${t("Fill the box with this style's sample brief")} · ${t(credit.text)}` : t("Fill the box with this style's sample brief")}><FileText size={13} />{t("Sample brief")}</button>}>
              {askReplace && <div className="np-ask" role="alert"><span>{t("Replace with this style's sample brief?")}</span>
                <button type="button" className="btn sm" onClick={() => setAskReplace(false)}>{t("Keep")}</button>
                <button type="button" className="btn sm primary" onClick={() => fillSample()}>{t("Replace")}</button></div>}
              {sampleNow && <span className="np-sample-note">{t("Sample brief: typing or pasting replaces it")}</span>}
              <textarea className={"textarea np2-brief" + (sampleNow ? " is-sample" : "")} value={d.brief} onChange={set("brief")} aria-label={t("Brief")} spellCheck={false}
                onFocus={(e) => { if (sampleNow) e.target.select(); }}
                onPaste={(e) => { if (!sampleNow) return; e.preventDefault(); replaceSample(e.clipboardData.getData("text")); }}
                onBeforeInput={(e) => { if (!sampleNow || !e.data) return; e.preventDefault(); replaceSample(e.data); }}
                placeholder={t("What the video says and how: the topic, the idea, your narration if you have it, notes, links, tone, what to stress, what to avoid…")} />
              <StyleQuestions styleId={d.styleId} value={d.answers} onChange={(v) => setD((x) => ({ ...x, answers: v }))} idPrefix="np" />
            </Step>

            <Step n={8} title={t("Assets")} note={t("optional")} className="np2-assets">
              {/* the line sits inside the drop zone, which fills the box */}
              <AssetPicker compact items={files} busy={!!phase} hint={assetsHint} onAdd={(fs) => setFiles((xs) => [...xs, ...fs])} onRemove={(id) => setFiles((xs) => xs.filter((x) => x.id !== id))} />
            </Step>
          </div>
        </div>
      </div>
      <div className="np-fold-wrap" aria-hidden={!fold}>{fold && <button type="button" className="np-fold" onClick={() => bodyRef.current?.scrollBy({ top: bodyRef.current.clientHeight * 0.8, behavior: "smooth" })}><ArrowDown size={14} />{t("More below")}</button>}</div>
      <div className="dialog-foot np-foot np2-foot">
        {claude?.status && !claude.connected ? <NeedsClaude text={t("Claude needs a sign-in to start the project")} /> : null}
        {err && <div className="np-err" role="alert"><AlertCircle size={15} /><span>{err} {t("Your answers are kept.")}</span></div>}
        {reason ? <span className="np-why" role="status" id="np-why"><AlertCircle size={14} />{t(reason)}</span>
          : <span className="hint kbd-hint"><kbd>Ctrl</kbd><kbd>Enter</kbd> {t("to create")}</span>}
        <span className="spacer" />
        <button type="button" className="btn ghost" onClick={() => setIdeas(true)} disabled={!!phase} aria-haspopup="dialog"><Lightbulb size={15} />{t("Writing ideas")}</button>
        <button className="btn" onClick={close} disabled={!!phase}>{t("Cancel")}</button>
        {phase === "copying" && <button className="btn" onClick={() => job.current?.cancel()}>{t("Stop copying")}</button>}
        {ideas && <PromptLibrary onAdd={addToBrief} onClose={() => setIdeas(false)} />}
        <button className={"btn primary" + (missing ? " blocked" : "")} onClick={create} disabled={!!phase || (!missing && !canCreate)} aria-disabled={!!missing || undefined} aria-describedby={reason ? "np-why" : undefined} title={reason ? t(reason) : undefined}>
          {phase ? <><Loader2 size={15} className="spin" />{phase === "copying" ? t("Copying files {done}/{n}…", { done: files.filter((f) => f.status === "done").length, n: files.length }) : t("Creating…")}</> : <><Sparkles size={15} />{t("Create project")}</>}</button>
      </div>
    </div>
  </div>;
}
