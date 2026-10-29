// The Storyboard dialog's options. Every option is its own board, newest on top, never written over: "Option A", "Option B" (Make another
// option: a clearly different one), "Option B2 · revised from Option B" (Feedback on B: only the panels with a note are drawn again, marked
// "revised"). No "Round" anywhere. An option is a card: its name, its idea and its panels as one 3 × 3 sheet a page (any shape, as large as a 16:9 one),
// The Desk's pager past nine. Clicking the card chooses it; clicking a panel opens it large (arrows step through every panel, PNG, and "Note
// for this panel"). The chosen option's Feedback box sits under its card: notes for the whole board or per panel as "@Panel_3: …" (typing @
// lists the panels with their pictures; the hover button on a panel adds one), each panel shows how many notes it has, and the draft is saved
// in the project as it is typed (it is there after closing the dialog or the app). The three actions (Approve, Feedback, Make another option)
// are the dialog's bar (Storyboard.jsx). The pictures are taken by the app on its own whenever the boards changed; a board can be downloaded
// as a PDF for a client.
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronLeft, ChevronRight, Download, FolderOpen, Loader2, MessageSquarePlus, Plus, ShieldCheck, X } from "lucide-react";
import { api, download, get, post } from "../api.js";
import { Banner, Pager } from "../components.jsx";
import { ago, useData, useToast } from "../lib.jsx";
import { useT } from "../i18n.jsx";

const SHEET = 9;          // panels a page on a card: one 3 × 3 sheet; more panels, more pages (the large view steps through all)

/** A selection key: the option's own label. Not the draft its pictures come from: that draft changes when the app takes the stills,
 *  and the chosen option was lost a few seconds after the dialog opened. */
export const pickKey = (label) => String(label);

/** Every option as one board, newest first: the server's `options` ({ option: "B2", from: "B", revised: [panel numbers], round, picked,
 *  draft: { text, at } }), else the older `rounds` read the same way (each letter its own board). Here `label` is "B2" and `draft` the round
 *  the pictures come from (what /boards/pick, /boards/pdf and /storyboard/approve take). */
export function optionsOf(data) {
  if (!data) return [];
  if (Array.isArray(data.options) && data.options.length) {
    const atOf = (l) => (data.rounds ?? []).find((r) => r.options?.some((x) => x.option === l))?.at ?? null;
    return data.options.map((o) => ({ ...o, key: pickKey(o.option), label: o.option, letter: o.option[0], rev: Number(o.option.slice(1)) || 1,
      revisedFrom: o.from ?? null, draft: o.round, at: o.at ?? atOf(o.option), feedback: o.draft?.text ?? (typeof o.draft === "string" ? o.draft : null),
      frames: (o.frames ?? []).map((f, i) => ({ ...f, revised: (o.revised ?? []).includes(i + 1) })) }));
  }
  const out = [];
  for (const r of data.rounds ?? []) for (const o of r.options) {
    out.push({ ...o, key: pickKey(o.option), label: o.option, letter: o.option, rev: 1, revisedFrom: null, at: r.at, draft: r.id, picked: r.picked?.option === o.option });
  }
  return out.sort((a, b) => (a.at === b.at ? (a.label < b.label ? 1 : -1) : a.at < b.at ? 1 : -1));
}
/** The next labels: a new letter after every one used, and the next revision of a letter ("B" → "B2", "B2" → "B3"). */
export function nextLetter(options) {
  const used = options.map((o) => (o.letter ?? o.label ?? "A").charCodeAt(0));
  return String.fromCharCode(used.length ? Math.max(...used) + 1 : 65);
}
export function nextRevision(options, letter) {
  const revs = options.filter((o) => (o.letter ?? o.label?.[0]) === letter).map((o) => Number(o.rev ?? (Number(o.label?.slice(1)) || 1)));
  return `${letter}${Math.max(1, ...revs) + 1}`;
}

/** The "@Panel_N" mentions in a draft: { [N]: how many notes }. */
export function noteCounts(text) {
  const c = {};
  for (const m of String(text ?? "").matchAll(/@Panel_(\d+)\b/g)) c[m[1]] = (c[m[1]] ?? 0) + 1;
  return c;
}
/** The panel numbers a draft names that the board does not have ("@Panel_15" on 8 panels), lowest first. */
export const unknownPanels = (text, panels) => Object.keys(noteCounts(text)).map(Number).filter((n) => n < 1 || n > panels).sort((a, b) => a - b);
/** The @ being typed at the caret, for the panel picker: { start, query } (query: the digits after "@" or "@Panel_"), or null. */
export function mentionAt(text, caret) {
  const before = String(text ?? "").slice(0, caret);
  const m = /(^|\s)@(?:Panel_?)?(\d*)$/i.exec(before);
  return m ? { start: before.length - m[0].length + m[1].length, query: m[2] } : null;
}
/** The draft with "@Panel_N: " in place of the @ being typed (from `start` to the caret); returns { text, caret }. */
export function insertMention(text, start, caret, n) {
  const ins = `@Panel_${n}: `;
  return { text: text.slice(0, start) + ins + text.slice(caret), caret: start + ins.length };
}
/** A note added from a panel (hover button, large view): on its own line at the end. */
export function appendNote(text, n, note = "") {
  const head = String(text ?? "").replace(/\s+$/, "");
  return `${head ? `${head}\n` : ""}@Panel_${n}: ${note}`;
}
/** The drafts kept in the project (GET /boards' options[].draft) win; this browser's copy fills an option the project has none for. */
export function restoreNotes(server, local) {
  const out = {};
  for (const [k, v] of Object.entries(local ?? {})) if (v?.text) out[k] = v;
  for (const [k, v] of Object.entries(server ?? {})) if (v?.text != null) out[k] = v;
  return out;
}

/** The feedback drafts of a project, one per option label, saved as they are typed (a short pause), kept after closing. `fromBoards`: the
 *  drafts GET /boards sent with its options ({ B2: { text } }), read once they arrive. */
export function useNotes(projectId, fromBoards = null) {
  const key = `mw-sbnotes:${projectId}`;
  const local = () => { try { return JSON.parse(localStorage.getItem(key) ?? "{}"); } catch { return {}; } };
  const [notes, setNotes] = useState(() => local());
  const timers = useRef({});
  const got = useRef(false);
  useEffect(() => { if (fromBoards && !got.current) { got.current = true; setNotes(restoreNotes(fromBoards, local())); } }, [fromBoards]); // eslint-disable-line react-hooks/exhaustive-deps
  const save = (label, text) => {
    try { const all = local(); if (text) all[label] = { text, at: new Date().toISOString() }; else delete all[label]; localStorage.setItem(key, JSON.stringify(all)); } catch { /* private window */ }
    api("PUT", `/api/projects/${projectId}/boards/${label}/feedback-draft`, { text }).catch(() => {});          // the browser's copy stands if the project cannot be written
  };
  const set = (label, text, now = false) => {
    setNotes((n) => ({ ...n, [label]: { text, at: new Date().toISOString() } }));
    clearTimeout(timers.current[label]);
    if (now) save(label, text); else timers.current[label] = setTimeout(() => save(label, text), 600);
  };
  useEffect(() => () => Object.values(timers.current).forEach(clearTimeout), []);
  return { notes, textOf: (label) => notes[label]?.text ?? "", set };
}

function Lightbox({ projectId, option, start, onClose, onNote = null }) {
  const t = useT();
  const toast = useToast();
  const [i, setI] = useState(start);
  const [note, setNote] = useState("");
  const n = option.stills.length;
  useEffect(() => {
    const k = (e) => { if (e.key === "Escape") { e.stopPropagation(); onClose(); } if (e.target?.tagName === "INPUT") return; if (e.key === "ArrowRight") setI((x) => (x + 1) % n); if (e.key === "ArrowLeft") setI((x) => (x - 1 + n) % n); };
    document.addEventListener("keydown", k, true); return () => document.removeEventListener("keydown", k, true);
  }, [n]); // eslint-disable-line react-hooks/exhaustive-deps
  const frame = option.frames[i];
  const add = () => { if (!note.trim()) return; onNote(i + 1, note.trim()); setNote(""); toast(t("Added to the feedback on Option {o}", { o: option.label })); };
  // on <body>: inside the Storyboard sheet (a glass layer, backdrop-filter) a fixed layer is held and cut by the sheet
  return createPortal(<div className="overlay bd-light" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }} role="dialog" aria-modal="true" aria-label={t("Option {o}", { o: option.label })}>
    <div className="bd-light-box">
      <div className="row"><b>{t("Option {o}", { o: option.label })}</b><span className="muted num">{i + 1}/{n}</span>{frame && <span className="muted">{t("Panel {n}", { n: i + 1 })}: {frame.title}</span>}
        <span className="spacer" />
        <button className="btn sm" onClick={() => download(`/api/projects/${projectId}/boards/file?path=${encodeURIComponent(option.stills[i])}`, `option-${option.label}-${String(i + 1).padStart(2, "0")}.png`).catch((e) => toast(e.message, "error"))}>
          <Download size={14} />PNG</button>
        <button className="btn ghost icon sm" onClick={onClose} aria-label={t("Close")}><X size={16} /></button></div>
      <img src={option.stillUrls[i]} alt={frame?.title ?? ""} />
      <div className="row"><button className="btn sm" onClick={() => setI((i - 1 + n) % n)} aria-label={t("Previous")}><ChevronLeft size={15} /></button>
        {onNote ? <><input className="input bd-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("Note for this panel")} aria-label={t("Note for panel {n}", { n: i + 1 })}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }} />
          <button className="btn sm" onClick={add} disabled={!note.trim()}><Plus size={14} />{t("Add to feedback")}</button></> : <span className="spacer" />}
        <button className="btn sm" onClick={() => setI((i + 1) % n)} aria-label={t("Next")}><ChevronRight size={15} /></button></div>
    </div>
  </div>, document.body);
}

/** The feedback box under the chosen option: one draft, typing @ lists the panels (with their pictures) to insert "@Panel_N: ". */
export function FeedbackBox({ option, text, onText, onSubmit, onClose, locked = false, focusKey = 0 }) {
  const t = useT();
  const ta = useRef(null);
  const [at, setAt] = useState(null);                  // the @ being typed: { start, query }
  const [hi, setHi] = useState(0);
  const panels = option.stillUrls.map((u, i) => ({ n: i + 1, url: u, title: option.frames[i]?.title ?? "" }));
  const list = at ? panels.filter((p) => !at.query || String(p.n).startsWith(at.query)) : [];
  useEffect(() => { const el = ta.current; if (el && focusKey) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); } }, [focusKey]);
  const read = (el) => { const m = mentionAt(el.value, el.selectionStart); setAt(m); if (!m) setHi(0); };
  const pick = (p) => {
    const el = ta.current; const r = insertMention(el.value, at.start, el.selectionStart, p.n);
    onText(r.text); setAt(null); setHi(0);
    requestAnimationFrame(() => { el.focus(); el.setSelectionRange(r.caret, r.caret); });
  };
  const key = (e) => {
    if (!list.length) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setHi((h) => (h + 1) % list.length); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setHi((h) => (h - 1 + list.length) % list.length); }
    else if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); pick(list[Math.min(hi, list.length - 1)]); }
    else if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); setAt(null); }
  };
  // a note on a panel the board does not have is said at once and holds Submit; only the board's own panels are counted
  const bad = unknownPanels(text, panels.length);
  const n = Object.entries(noteCounts(text)).filter(([k]) => !bad.includes(Number(k))).reduce((a, [, v]) => a + v, 0);
  return <div className="bd-col bd-fb">
    <div className="bd-fb-h"><b>{t("Feedback on Option {o}", { o: option.label })}</b><span className="muted">{text.trim() ? t("Saved in the project") : ""}</span><span className="spacer" />
      <button className="btn ghost icon sm" onClick={onClose} aria-label={t("Close the feedback")}><X size={14} /></button></div>
    <div className="bd-fb-field">
      <textarea ref={ta} className="textarea" rows={4} value={text} spellCheck={false} aria-label={t("Feedback on Option {o}", { o: option.label })}
        placeholder={t("What should change? The whole board, or one panel: type @ to pick it, e.g. “@Panel_3: the title bigger”.")}
        onChange={(e) => { onText(e.target.value); read(e.target); }} onKeyUp={(e) => { if (!["ArrowDown", "ArrowUp", "Enter", "Tab", "Escape"].includes(e.key)) read(e.target); }}
        onClick={(e) => read(e.target)} onKeyDown={key} onBlur={() => setTimeout(() => setAt(null), 150)} />
      {list.length > 0 && <ul className="pick-list bd-at" role="listbox" aria-label={t("Panels")}>{list.map((p, k) => <li key={p.n} role="option" aria-selected={k === hi}>
        <button type="button" onMouseDown={(e) => { e.preventDefault(); pick(p); }}><img src={p.url} alt="" /><b>{t("Panel {n}", { n: p.n })}</b><span className="muted">{p.title}</span></button></li>)}</ul>}
    </div>
    <div className="row">{bad.length ? <span className="hint bd-fb-warn" role="alert">{t("This board has {n} panels: there is no {list}. Fix the number before you submit.", { n: panels.length, list: bad.map((k) => t("Panel {n}", { n: k })).join(", ") })}</span>
      : <span className="hint">{n > 0 ? (n === 1 ? t("1 note on a panel") : t("{n} notes on panels", { n })) : t("Panels without a note stay as they are.")}</span>}<span className="spacer" />
      <button className="btn primary sm" disabled={!text.trim() || locked || bad.length > 0} onClick={onSubmit} title={locked ? t("Claude is working; this waits until it finishes") : undefined}>{t("Submit")}</button></div>
  </div>;
}

/** An option's name read off its heading, as the server's optionName does (hf-edit/boards.mjs): `Option B2 · "Đánh thức" · revised from Option B`
 *  is "Đánh thức"; a heading with no name ("Option A", "Option B2 · revised from Option B") gives "". */
export function nameOf(heading) {
  const rest = String(heading ?? "").replace(/^Option\s+[A-Z]\d*\s*/i, "").replace(/[·:—–-]?\s*revised from Option\s+[A-Z]\d*\s*$/i, "")
    .replace(/^[·:—–-]\s*/, "").trim();
  return rest.replace(/^["“'‘](.*)["”'’]$/, "$1").trim();
}

/** One option: a card with its name, idea and panels (a 3 × 3 sheet a page). Clicking the card chooses it; a panel opens large. */
function Option({ o, chosen, approved, onChoose, onLight, counts, onNote }) {
  const t = useT();
  // the option's own name (`name`: the server names old options too), else read off its heading
  const name = o.name ?? nameOf(o.heading);
  const choose = () => onChoose(o.key);
  // panels in the film's own shape, no black bars; the sheet is 3 × 3 for every shape, as large as a 16:9 one
  const [ar, setAr] = useState(null);
  const tall = ar != null && ar < 0.8;
  const [pg, setPg] = useState(0);
  return <article className={"bd-col" + (chosen ? " picked" : "") + (tall ? " tall" : "")} onClick={choose} style={ar ? { "--bd-ar": String(ar) } : undefined}>
    <header><button type="button" className="bd-pickbtn" role="radio" aria-checked={chosen} aria-label={t("Choose Option {o}", { o: o.label })} onClick={(e) => { e.stopPropagation(); choose(); }}>
        <span className="bd-radio" aria-hidden="true">{chosen && <Check size={11} strokeWidth={3} />}</span>
        {/* the board's own title already says "Option B2": the card shows only the option's name (a title once per screen) */}
        {name ? <span className="bd-title">{name}</span> : <span className="bd-title muted">{t("Choose this option")}</span>}</button>
      {o.picked && (approved ? <span className="state-badge ok"><ShieldCheck size={15} />{t("Approved")}</span> : <span className="tag ok">{t("Picked")}</span>)}</header>
    {o.idea && <p className="hint bd-idea">{o.idea}</p>}
    {/* one 3 × 3 sheet a page (any shape); past nine panels the next page, the pager under it */}
    <div className="bd-stills">{o.stillUrls.slice(pg * SHEET, (pg + 1) * SHEET).map((u, k) => { const i = pg * SHEET + k, n = i + 1, c = counts[n] ?? 0;
      return <span key={`${i}:${u}`} className="bd-cell">
        <button type="button" className="bd-still" data-tip-side="bottom" onClick={(e) => { e.stopPropagation(); onLight({ option: o, i }); }}
          aria-label={t("Open panel {n} large", { n })} title={o.frames[i]?.title}>
          <img src={u} alt="" loading="lazy" onLoad={i === 0 ? (e) => setAr(e.currentTarget.naturalWidth / e.currentTarget.naturalHeight) : undefined} /><span className="num">{n}</span>
          {o.frames[i]?.revised && <span className="bd-revised">{t("revised")}</span>}</button>
        {c > 0 && <span className="bd-count num" title={c === 1 ? t("1 note") : t("{n} notes", { n: c })}>{c}</span>}
        {onNote && <button type="button" className="bd-note-btn" onClick={(e) => { e.stopPropagation(); onNote(o, n); }} aria-label={t("Add a note on panel {n}", { n })} title={t("Add a note on panel {n}", { n })}>
          <MessageSquarePlus size={13} /></button>}
      </span>; })}
      {/* a short last page keeps the sheet's size, so the dialog neither shrinks nor jumps */}
      {o.stillUrls.length > SHEET && Array.from({ length: SHEET - Math.min(SHEET, o.stillUrls.length - pg * SHEET) }, (_, k) => <span key={"e" + k} className="bd-cell bd-empty" aria-hidden="true" />)}</div>
    {o.stillUrls.length > SHEET && <div onClick={(e) => e.stopPropagation()}><Pager className="bd-pager" page={pg} size={SHEET} total={o.stillUrls.length} onPage={setPg} /></div>}
    {!o.stillUrls.length && <p className="muted">{t("The pictures of this option are being made.")}</p>}
  </article>;
}

/** Controlled by the dialog: `sel` is the chosen option's key; `onData` hands the boards up; `fb` the feedback box (open, drafts, submit). */
export default function Boards({ projectId, sel, onSel, onData, locked = false, approved = false, fb }) {
  const t = useT();
  const toast = useToast();
  const q = useData(() => get(`/api/projects/${projectId}/boards`), [projectId]);
  const [light, setLight] = useState(null);           // { option, i }
  const [busy, setBusy] = useState(null);
  const [stillsErr, setStillsErr] = useState(null);
  const [saved, setSaved] = useState({});            // option key → the PDF saved in the project
  const asked = useRef("");                           // the boards the app already asked pictures for (asked once per change)
  const data = q.data;
  useEffect(() => { onData?.(data ?? null); }, [data]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (data?.taking) { const h = setTimeout(q.reload, 2500); return () => clearTimeout(h); } }, [data]); // eslint-disable-line react-hooks/exhaustive-deps
  const options = useMemo(() => optionsOf(data), [data]);
  const ready = (data?.current ?? []).filter((c) => c.ready);
  // a board with no picture yet (earlier options keep their own pictures, so only a new or changed board counts)
  const stale = ready.some((c) => !options.some((o) => o.label === c.option && o.hash === c.hash));
  useEffect(() => {                                    // the boards changed (or have no pictures yet): the app takes the pictures itself, once per change
    if (!data || data.taking || !stale) return;
    const key = ready.map((c) => `${c.option}:${c.hash}`).join(",");
    if (asked.current === key) return;
    asked.current = key;
    setStillsErr(null);
    post(`/api/projects/${projectId}/boards/stills`, {}).then(() => setTimeout(q.reload, 800)).catch((e) => setStillsErr(e.message));
  }, [data, stale]); // eslint-disable-line react-hooks/exhaustive-deps
  if (q.error) return <Banner kind="error">{q.error.message}</Banner>;
  if (!data) return <div className="skeleton" style={{ height: "14rem" }} />;
  // The PDF is saved in the project (the server writes it there) and shown in its folder on request; never dropped into Downloads
  const pdf = async (o) => {
    setBusy("pdf" + o.key);
    try { const r = await post(`/api/projects/${projectId}/boards/pdf`, { round: o.draft, options: [o.label], no: o.label }); setSaved((s) => ({ ...s, [o.key]: r.path })); }
    catch (e) { toast(e.message, "error"); } finally { setBusy(null); }
  };
  const reveal = (path) => post(`/api/projects/${projectId}/files/reveal`, { path }).catch((e) => toast(e.message, "error"));
  if (data.frames || (!options.length && !ready.length)) return null;
  const taking = data.taking?.frames?.total ? t("Preparing the storyboard frames… {done}/{total}", { done: data.taking.frames.done, total: data.taking.frames.total }) : t("Preparing the storyboard frames…");
  const lacking = (o) => o.stillUrls.length < Math.max(1, o.frames?.length ?? 1);          // only while a picture is missing
  const noteOn = (o, n) => { onSel(o.key); fb.add(o, n); };
  const retry = () => { asked.current = ""; setStillsErr(null); q.reload(); };
  // On The Desk two options share a row, newest on the left (workflow.css .sheet-overlay .boards.paired)
  return <section className={"boards" + (options.length > 1 ? " paired" : "")} aria-label={t("Storyboard options")} role="radiogroup">
    {!options.length && (data.taking || stale) && !stillsErr && <p className="state-line run" role="status"><Loader2 size={13} className="spin" />{taking}</p>}
    {stillsErr && <p className="state-line stop">{t("The pictures could not be made: {why}", { why: stillsErr })} <button className="clink" onClick={retry}>{t("Try again")}</button></p>}
    {locked && options.length > 0 && <p className="state-line run" role="status"><Loader2 size={13} className="spin" />{t("Claude is working on the storyboard; a new option appears here on top.")}</p>}
    {options.map((o) => <div key={o.key} className="bd-round">
      <div className="bd-round-h"><h3 className="sub">{t("Option {o}", { o: o.label })} <span className="muted">{o.revisedFrom ? `· ${t("revised from Option {o}", { o: o.revisedFrom })} ` : ""}· {ago(o.at)}</span></h3><span className="spacer" />
        {/* PDF at the right edge of every board; saved in the project, then "Show in folder" */}
        {saved[o.key] ? <><span className="muted bd-saved"><Check size={13} />{t("PDF saved")}</span>
          <button className="btn ghost sm" onClick={() => reveal(saved[o.key])}><FolderOpen size={13} />{t("Show in folder")}</button></>
          : <button className="btn ghost sm" onClick={() => pdf(o)} disabled={!!busy} title={t("Save this option as a PDF in the project")}>{busy === "pdf" + o.key ? <Loader2 size={13} className="spin" /> : <Download size={13} />}PDF</button>}</div>
      {(data.taking || stale) && !stillsErr && lacking(o) && <p className="state-line run" role="status"><Loader2 size={13} className="spin" />{taking}</p>}
      {/* the card on the left, its feedback box beside it on the right while open (the board's empty half) */}
      <div className="bd-cols"><Option o={o} approved={approved} chosen={sel === o.key} onChoose={onSel} onLight={setLight} counts={noteCounts(fb.textOf(o.label))} onNote={noteOn} />
        {fb.open && sel === o.key && <FeedbackBox option={o} text={fb.textOf(o.label)} onText={(v) => fb.set(o.label, v)} onSubmit={() => fb.submit(o)} onClose={fb.close} locked={locked} focusKey={fb.focus} />}</div>
    </div>)}
    {light && <Lightbox projectId={projectId} option={light.option} start={light.i} onClose={() => setLight(null)} onNote={(n, note) => { onSel(light.option.key); fb.add(light.option, n, note); }} />}
  </section>;
}
