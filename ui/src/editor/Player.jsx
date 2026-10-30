// The Editor's player (the Editor's own player, not HF Studio). HF's own <hyperframes-player> runs on the preview
// origin (packages/hf-preview, host.js); this file only talks to it by postMessage. A click on the frame picks the element under the
// pointer (HF's runtime picker): it becomes Claude's target, and when it holds words written in the file, a small card beside it edits
// them, with the font, size and colour (shown at once, written when the field is left, one revision each; Reset puts back what Claude
// wrote). Below the frame: one frame back / play / one frame on (PageUp / PageDown jump a shot), time and shot, then tools named
// in words: View (safe margins, grid, still, full screen), Loop, the speed, Sound.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Camera, ChevronDown, Eye, Grid3x3, Loader2, Lock, MapPin, Maximize, Pause, Play, Repeat, RotateCcw, Scan, Sparkles, StepBack, StepForward, Volume2, VolumeX, X } from "lucide-react";
import { Menu } from "../components.jsx";
import { get, post } from "../api.js";
import { usePref, useToast } from "../lib.jsx";
import { useT } from "../i18n.jsx";
import { CodeWord, PinButton, matchCodeText, useCodeTexts } from "./codeText.jsx";

// the player's clock as minutes:seconds:frames at the film's own rate, so one step reads as one frame (in hundredths of a second
// a frame at 30 fps showed as a jump of 3 or 4)
export const fmtTime = (s, fps = 30) => {
  const f = Math.round(Math.max(0, s || 0) * fps), sec = Math.floor(f / fps), m = Math.floor(sec / 60), pad = (n) => String(n).padStart(2, "0");
  return `${pad(m)}:${pad(sec - m * 60)}:${pad(f - sec * fps)}`;
};

/** The bridge to the preview page: state (time, duration, paused, picked items, their boxes) and commands. */
/** The video's own events as the player's state, for a film shown as its render. Every value is read from the event when it fires:
 *  React clears e.currentTarget once the handler returns, and a state updater runs later (reading it there crashed the Editor). */
export function videoHandlers(setState, frame = (f) => requestAnimationFrame(f), cancel = (h) => cancelAnimationFrame(h)) {
  let raf = 0;
  const tick = (v) => { const time = v.currentTime; setState((s) => ({ ...s, time })); if (!v.paused) raf = frame(() => tick(v)); };
  return {
    onLoadedMetadata: (e) => {
      const v = e.currentTarget, d = v?.duration;
      if (v && v.currentTime === 0) v.currentTime = 0.001;          // a video shows its first frame only once it has sought (the stage was black at 0 s)
      setState((s) => ({ ...s, duration: d || s.duration }));
    },
    onPlay: (e) => { const v = e.currentTarget; setState((s) => ({ ...s, paused: false })); cancel(raf); if (v) tick(v); },
    onPause: (e) => { cancel(raf); const time = e.currentTarget?.currentTime; setState((s) => ({ ...s, paused: true, time: time ?? s.time })); },
    onEnded: () => setState((s) => ({ ...s, paused: true })),
    onError: () => setState((s) => ({ ...s, error: null })),
  };
}

export function usePreview(projectId) {
  const [info, setInfo] = useState(null);           // { url, origin }
  // ready: HF's runtime runs the film; assets: its pictures, video and fonts are in (HF's assetsready, host.js): the film shows only then
  const [state, setState] = useState({ ready: false, assets: false, time: 0, duration: 0, paused: true, error: null });
  // a film that cannot play live (Brush cartoon; the server decides: GET /preview-proxy's mode "prerendered") is shown as the
  // app's render of it, a plain video: the live page is not loaded, the commands drive the video (a step is one frame of the film's rate)
  const proxy = useProxy(projectId);
  const videoOnly = proxy?.mode === "prerendered";
  const video = useRef(null);
  const [picked, setPicked] = useState([]);         // described elements (host.js describe())
  const [boxes, setBoxes] = useState({ boxes: [], frame: null });
  const frame = useRef(null);
  const keyHandler = useRef(null);
  const dbl = useRef(null);
  useEffect(() => { let alive = true; get(`/api/projects/${projectId}/preview`).then((r) => alive && setInfo(r)).catch((e) => alive && setState((s) => ({ ...s, error: e.message }))); return () => { alive = false; }; }, [projectId]);
  const send = useCallback((type, data = {}) => {
    if (videoOnly) {
      const v = video.current;
      if (!v) return;
      if (type === "play") v.play().catch(() => {});
      else if (type === "pause") v.pause();
      else if (type === "mute") v.muted = !!data.muted;
      else if (type === "rate") v.playbackRate = Number(data.rate) || 1;
      else if (type === "loop") v.loop = !!data.loop;
      else if (type === "seek") v.currentTime = Math.max(0, Math.min(v.duration || 0, Number(data.time) || 0));
      else if (type === "step") {
        const fps = Number(proxy?.fps) || 30;
        v.pause();
        v.currentTime = Math.max(0, Math.min(v.duration || 0, (Math.round(v.currentTime * fps) + Math.round(Number(data.frames) || 0)) / fps));
      }
      if (type === "seek" || type === "step") setState((s) => ({ ...s, time: v.currentTime }));
      return;
    }
    if (info && frame.current?.contentWindow) frame.current.contentWindow.postMessage({ source: "mw-ui", type, ...data }, info.origin);
  }, [info, videoOnly, proxy?.fps]);
  useEffect(() => { if (videoOnly) setState((s) => ({ ...s, ready: true, assets: true, error: null, fps: proxy?.fps ?? s.fps ?? null, duration: proxy?.duration ?? s.duration })); },
    [videoOnly, proxy?.fps, proxy?.duration]);
  // the video's own events are the player's state (its time read on every frame while it plays, so the playhead moves smoothly)
  const videoEvents = useMemo(() => videoHandlers(setState), []);
  useEffect(() => {
    if (!info) return;
    const on = (e) => {
      if (e.origin !== info.origin || e.source !== frame.current?.contentWindow || e.data?.source !== "mw-preview") return;
      const d = e.data;
      if (d.type === "ready") setState((s) => ({ ...s, ready: true, duration: d.duration ?? s.duration, fps: d.fps ?? s.fps ?? null, error: null }));
      else if (d.type === "assets") setState((s) => ({ ...s, assets: !!d.ready }));
      else if (d.type === "transitions") setState((s) => ({ ...s, transitions: !!d.loading }));
      else if (d.type === "duration") setState((s) => ({ ...s, duration: d.duration }));
      else if (d.type === "time") setState((s) => ({ ...s, time: d.time, paused: d.paused }));
      else if (d.type === "ended") setState((s) => ({ ...s, paused: true }));
      else if (d.type === "error") setState((s) => ({ ...s, error: d.message }));
      else if (d.type === "pick") setPicked(d.items ?? []);
      else if (d.type === "boxes") setBoxes({ boxes: d.boxes ?? [], frame: d.frame });
      else if (d.type === "key") keyHandler.current?.(d);
      else if (d.type === "dblclick") dbl.current?.();
      else if (d.type === "quality") setState((s) => ({ ...s, quality: { level: d.level, scale: d.scale } }));
    };
    addEventListener("message", on);
    return () => removeEventListener("message", on);
  }, [info]);
  return { info, state, picked, setPicked, boxes, frame, send, keyHandler, dbl, proxy, videoOnly, video, videoEvents };
}

/** Fonts for the edit card as one dropdown: the families this project uses, the font files the user added to it
 *  (Assets), the app's bundled set, and the fonts installed on this PC (copied into the project when used). Picking one shows it on the
 *  film at once and writes it; the film then loads again so a font the film did not have yet is declared and drawn. */
// Then the Google Fonts families that draw Vietnamese (GET /api/fonts/google-vi, 543, pinned), by kind, most used first,
// each with its designer, licence and download size; a small search narrows them. A family not on this computer yet is fetched once when
// it is picked (its licence and credit go into the film with it).
let googleVi = null;          // the list, fetched once per app session
const KIND_NAMES = [["sans", "Sans"], ["serif", "Serif"], ["display", "Display"], ["handwriting", "Handwriting"], ["mono", "Mono"]];
const licenceShort = (l) => (/^OFL/i.test(l ?? "") ? "OFL" : l ?? "");
const sizeText = (mb) => (mb >= 1 ? `${Math.round(mb * 10) / 10} MB` : "< 1 MB");
/** The names not shown yet, each once whatever its case: one group's own list may name a family twice ("In this project" showed Oswald twice). */
export const freshNames = (names, seen) => names.filter((n) => { const k = n?.toLowerCase(); if (!n || seen.has(k)) return false; seen.add(k); return true; });
function FontField({ projectId, value, onPick, onLive, disabled }) {
  const t = useT();
  const toast = useToast();
  const [fonts, setFonts] = useState(null);
  const [gv, setGv] = useState(null);
  const [find, setFind] = useState("");
  useEffect(() => { get(`/api/projects/${projectId}/edit/fonts`).then(setFonts).catch(() => setFonts({ project: [], bundled: [] })); }, [projectId]);
  useEffect(() => { (googleVi ??= get("/api/fonts/google-vi").catch(() => { googleVi = null; return null; })).then((r) => setGv(r?.families ?? [])); }, []);
  const cur = String(value ?? "").split(",")[0].replace(/["']/g, "").trim();
  const seen = new Set();
  const group = (label, names) => {
    const xs = freshNames(names, seen);
    return xs.length ? <optgroup key={label} label={label}>{xs.map((n) => <option key={n} value={n}>{n}</option>)}</optgroup> : null;
  };
  const local = (fonts?.local ?? []).map((f) => f.family);
  const words = find.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const hit = (g) => words.every((w) => `${g.family} ${g.designer ?? ""}`.toLowerCase().includes(w));
  const googleGroup = (kind, label) => {
    const xs = (gv ?? []).filter((g) => g.category === kind && hit(g) && !seen.has(g.family.toLowerCase()));
    xs.forEach((g) => seen.add(g.family.toLowerCase()));
    return xs.length ? <optgroup key={kind} label={t("Google Fonts with Vietnamese · {kind}", { kind: t(label) })}>{xs.map((g) => <option key={g.family} value={g.family}>
      {[g.family, g.designer, licenceShort(g.licence), g.installed ? t("on this computer") : sizeText(g.mb)].filter(Boolean).join(" · ")}</option>)}</optgroup> : null;
  };
  const pickFont = (f) => {
    const g = (gv ?? []).find((x) => x.family === f);
    if (g && !g.installed && !(fonts?.project ?? []).includes(f) && !(fonts?.bundled ?? []).includes(f)) toast(t("Getting {f} from Google Fonts ({size}); the film loads again with it.", { f, size: sizeText(g.mb) }));
    onLive(f); onPick(f);
  };
  return <label className="pe-field font">
    <span>{t("Font")}</span>
    {gv?.length > 0 && <input className="input sm pe-font-find" value={find} onChange={(e) => setFind(e.target.value)} placeholder={t("Find a Google font ({n})", { n: gv.length })} aria-label={t("Find a Google font")} spellCheck={false} />}
    <select className="select sm" value={cur} disabled={disabled || !fonts} onChange={(e) => { const f = e.target.value; if (!f || f === cur) return; pickFont(f); }}
      title={t("Pick a font: this project's, your font files in Assets, the app's, or one installed on this PC")}>
      {cur && !fonts && <option value={cur}>{cur}</option>}
      {fonts && group(t("In this project"), [cur, ...(fonts.project ?? [])])}
      {fonts && group(t("Your fonts in Assets"), (fonts.assets ?? []).map((f) => f.family))}
      {fonts && group(t("In the app"), fonts.bundled ?? [])}
      {fonts && group(t("On this PC"), local)}
      {fonts && gv && KIND_NAMES.map(([k, l]) => googleGroup(k, l))}
    </select>
  </label>;
}

/** The card beside a picked element: its words (each line a field), font, size, colour, Reset. */
// The card names what was picked in plain words, never a raw tag such as "tspan"; a name the film gave it stays
const TAG_WORD = { text: "Text", tspan: "Text", textpath: "Text", p: "Text", span: "Text", h1: "Title", h2: "Title", h3: "Title", h4: "Title", h5: "Title", h6: "Title",
  label: "Text", li: "Text", a: "Text", strong: "Text", em: "Text", b: "Text", i: "Text", img: "Picture", image: "Picture", picture: "Picture", video: "Video",
  svg: "Shape", g: "Shape", path: "Shape", rect: "Shape", circle: "Shape", ellipse: "Shape", line: "Shape", polygon: "Shape", polyline: "Shape", use: "Shape",
  canvas: "Picture", div: "Box", section: "Box", article: "Box", main: "Box", header: "Box", footer: "Box", figure: "Box" };
const friendlyLabel = (item) => { const l = String(item.label ?? "").trim(), k = l.toLowerCase();
  return TAG_WORD[k] ? (item.textContent && TAG_WORD[k] === "Box" ? "Text" : TAG_WORD[k]) : l || (item.textContent ? "Text" : "Element"); };

/** A code film's word keeps the old card's font and size fields when its code allows them (What If);
 *  each is saved on its own (POST edit/code-style), the film is made again; what the code sets itself says why, and a film whose code
 *  gives no style (lemo, mg, anidoodle) says so in one line. */
export function CodeStyle({ projectId, item, locked, onSaved }) {
  const t = useT();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const st = item.style;
  if (!st) return <p className="pe-hint">{t("Font and size are set in the film's code: pin a note.")}</p>;
  const save = async (body, label) => {
    setBusy(true);
    try { const r = await post(`/api/projects/${projectId}/edit/code-style`, { id: item.id, ...body });
      if (r.fonts?.unresolved?.length) toast(t("Font not found: {f}", { f: r.fonts.unresolved.join(", ") }), "error");
      if (r.changed) onSaved(label); }
    catch (e) { toast(e.message, "error"); } finally { setBusy(false); }
  };
  const size = st.size?.value ?? "", why = [st.font?.editable === false && st.font.why, st.size?.editable === false && st.size.why].filter(Boolean);
  return <><div className="pe-row code-style">
    {st.font?.editable ? <FontField projectId={projectId} value={st.font.value ?? ""} disabled={locked || busy} onLive={() => {}} onPick={(f) => save({ font: f }, t("Font changed"))} />
      : <label className="pe-field"><span>{t("Font")}</span><input className="input sm" value={st.font?.value ?? ""} disabled readOnly /></label>}
    <label className="pe-field size"><span>{t("Text size")}</span><input className="input sm num" type="number" min="6" max="600" defaultValue={size} key={size}
      disabled={locked || busy || !st.size?.editable} onBlur={(e) => { const v = Number(e.target.value); if (v >= 6 && v <= 600 && v !== size) save({ size: v }, t("Size changed")); }}
      onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }} /></label></div>
    {why.map((w) => <p key={w} className="pe-hint">{t(w)}</p>)}</>;
}

function EditCard({ projectId, item, box, frameBox, locked, send, onSaved, onClose, onPin = null, shotNumber = null }) {
  const t = useT();
  const toast = useToast();
  const [parts, setParts] = useState(null);
  const [vals, setVals] = useState({});
  const [saving, setSaving] = useState(false);
  const colorT = useRef(null);
  const load = useCallback(() => {
    if (!item.hfId) { setParts({ found: false, parts: [] }); return; }
    get(`/api/projects/${projectId}/edit/parts?file=${encodeURIComponent(item.file)}&hf=${encodeURIComponent(item.hfId)}`)
      .then((r) => { setParts(r); setVals(Object.fromEntries(r.parts.map((x) => [x.hfId, x.text]))); }).catch(() => setParts({ found: false, parts: [] }));
  }, [projectId, item.file, item.hfId]);
  useEffect(load, [load]);
  const save = async (path, body, label, reload = false) => {          // reload: the film loads again (a new font is declared in it)
    setSaving(true);
    try { const r = await post(`/api/projects/${projectId}/edit/${path}`, { file: item.file, hfId: item.hfId, ...body }); if (r.changed) onSaved(label, reload);
      if (r.fonts?.unresolved?.length) toast(t("Font not found: {f}", { f: r.fonts.unresolved.join(", ") }), "error");
      if (r.fonts?.local) toast(t("{f} was copied into the project from this PC. Check its licence before you send the project to anyone.", { f: r.fonts.local.family })); load(); }
    catch (e) { toast(e.message, "error"); load(); } finally { setSaving(false); }
  };
  const cs = item.computedStyles ?? {};
  const px = parseFloat(cs["font-size"]) || "";
  const hex = toHex(cs.color);
  const editable = parts?.found && parts.parts.length > 0 && !item.scriptMade;
  // words a film's code draws are edited in its source; anything else is a note pinned for Claude
  // (read only when the picked element is not edited the HTML way, and kept for the session)
  const needCode = !!parts && !editable;
  const [code, reloadCode] = useCodeTexts(projectId, null, needCode);
  const codeItem = needCode ? matchCodeText(code?.items, item.textContent, shotNumber) : null;
  // the card sits right of the element, or left when there is no room, inside the frame
  const style = useMemo(() => {
    if (!box || !frameBox) return { right: 12, top: 12 };
    const [x, y, w] = box, [fx, fy, fw] = frameBox;
    const W = 288, right = x + w + 12 + W <= fx + fw;
    return { left: right ? x + w + 12 : Math.max(fx + 8, x - W - 12), top: Math.max(fy + 8, y) };
  }, [box, frameBox]);
  return <div className="pe-card" style={style} role="dialog" aria-label={t("Edit the words")} onKeyDown={(e) => { if (e.key === "Escape") onClose(); }}>
    <div className="pe-head"><span className="lbl">{t(friendlyLabel(item))}</span>{saving && <Loader2 size={13} className="spin" />}
      <button className="btn ghost icon sm" onClick={onClose} aria-label={t("Close")}><X size={13} /></button></div>
    {locked && <p className="pe-note"><Lock size={12} />{t("Claude is changing the film: hand edits wait until it finishes.")}</p>}
    {!parts || (needCode && code === null) ? <div className="skeleton" style={{ height: "2rem" }} />
      : codeItem ? <><CodeWord projectId={projectId} item={codeItem} locked={locked} onSaved={(label) => label && onSaved(label, true)} />
        <p className="pe-hint">{t("Saved when you leave the field.")}</p>
        <CodeStyle projectId={projectId} item={codeItem} locked={locked} onSaved={(label) => { reloadCode(); onSaved(label, true); }} /></>
      : !editable ? <><p className="pe-note">{onPin ? t("Not editable here. Pin a note for Claude.")
          : item.textContent ? t("These words come from code: ask Claude to change them. Claude will work on this element.") : t("Nothing to type here. Claude will work on this element.")}</p>
        {onPin && <PinButton onPin={onPin} onBefore={onClose} />}</>
        : <>{parts.parts.map((x) => <input key={x.hfId} className="input sm pe-text" value={vals[x.hfId] ?? ""} disabled={locked} aria-label={t("Words")}
          onChange={(e) => { setVals((v) => ({ ...v, [x.hfId]: e.target.value })); send("live", { hfId: x.hfId, text: e.target.value }); }}
          onBlur={(e) => { const v = e.target.value.trim(); if (v && v !== x.text) save("text", { hfId: x.hfId, text: v }, t("Words saved")); else if (!v) send("live", { hfId: x.hfId, text: x.text }); }}
          onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }} />)}
          <div className="pe-row">
            <FontField projectId={projectId} value={parts.style?.["font-family"] || cs["font-family"] || ""} disabled={locked}
              onLive={(f) => send("live", { hfId: item.hfId, style: { "font-family": `"${f}"` } })}
              onPick={(f) => save("style", { style: { "font-family": f } }, t("Font changed"), true)} />
            <label className="pe-field size"><span>{t("Text size")}</span><input className="input sm num" type="number" min="6" max="600" defaultValue={px} key={px} disabled={locked}
              onChange={(e) => send("live", { hfId: item.hfId, style: { "font-size": e.target.value ? `${e.target.value}px` : "" } })}
              onBlur={(e) => { if (e.target.value && Number(e.target.value) !== px) save("style", { style: { "font-size": `${Number(e.target.value)}px` } }, t("Size changed")); }} /></label>
            <label className="pe-field color"><span>{t("Colour")}</span><input type="color" defaultValue={hex} key={hex} disabled={locked}
              onChange={(e) => { const c = e.target.value; send("live", { hfId: item.hfId, style: { color: c } }); clearTimeout(colorT.current);
                colorT.current = setTimeout(() => save("style", { style: { color: c } }, t("Colour changed")), 700); }} /></label>
          </div>
          {(parts.edited || parts.parts.some((x) => x.edited)) && <button className="btn ghost sm pe-reset" disabled={locked} onClick={async () => {
            for (const x of parts.parts.filter((p) => p.edited)) await post(`/api/projects/${projectId}/edit/reset`, { file: item.file, hfId: x.hfId }).catch(() => {});
            if (parts.edited) await save("reset", {}, t("Back to what Claude wrote")); else { onSaved(t("Back to what Claude wrote")); load(); }
          }}><RotateCcw size={13} />{t("Reset")}</button>}
          <p className="pe-hint">{t("Shown as you type; saved when you leave the field.")}</p></>}
  </div>;
}

function toHex(c) {
  const m = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(c ?? "");
  return m ? "#" + [m[1], m[2], m[3]].map((x) => Number(x).toString(16).padStart(2, "0")).join("") : "#ffffff";
}

/** A code film's smooth preview (GET /preview-proxy): the app makes it by itself once the film is done and again when it goes
 *  stale; read again every 3 s while it is made, else every 20 s. `update()`: the user's Update when it is out of date and nothing makes
 *  it (POST /preview-proxy). null for a film that is not a code film. */
function useProxy(projectId) {
  const [view, setView] = useState(null);
  const [n, setN] = useState(0);
  useEffect(() => {
    let alive = true;
    get(`/api/projects/${projectId}/preview-proxy`).then((v) => alive && setView(v)).catch(() => {});
    return () => { alive = false; };
  }, [projectId, n]);
  const making = view?.status === "rendering" || !!view?.job;
  useEffect(() => { if (!view?.mode) return undefined; const h = setTimeout(() => setN((x) => x + 1), making ? 3000 : 20000); return () => clearTimeout(h); }, [view, making]);
  const update = useCallback(() => post(`/api/projects/${projectId}/preview-proxy`).then(setView), [projectId]);
  // every film that has a page: its full-quality MP4 plays when it is fresh (the server's status: picture and sound as the
  // film is now); a stale one is never played
  return useMemo(() => (view?.mode ? { ...view, update } : null), [view, update]);
}

/** The smooth preview out of date with nothing making it (a change while it rendered, a render that failed, the app started again):
 *  said with its Update, never "Updating…" with no job behind it (T25-3: stale, no job, "Updating…" until the Render). */
export function UpdateProxy({ proxy, className = "btn ghost sm pv-lb pv-smooth", label = "Out of date · Update" }) {
  const t = useT();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const go = async () => { setBusy(true); try { await proxy.update(); } catch (e) { toast(e.message, "error"); } finally { setBusy(false); } };
  return <button type="button" className={className} disabled={busy} onClick={go} title={t("The film changed since its smooth preview: it plays live. Make the smooth preview again.")}>
    {busy ? <Loader2 size={14} className="spin" /> : <RotateCcw size={14} />}<span className="lbl">{t(label)}</span></button>;
}

/** The toolbar's word on the smooth preview: Smooth when it is the film's now; Updating while a job makes the new one; Out of date ·
 *  Update when nothing does. */
export function SmoothLabel({ proxy }) {
  const t = useT();
  if (proxy.status === "fresh") return <span className="pv-lb pv-smooth on" title={t("While the film plays you see its smooth preview; paused, the film itself")}><Sparkles size={14} /><span className="lbl">{t("Smooth")}</span></span>;
  if (proxy.job && (proxy.status === "stale" || proxy.url))
    return <span className="pv-lb pv-smooth" role="status" title={t("The film changed since its smooth preview: it plays live until the new one is ready")}><Loader2 size={14} className="spin" />
      <span className="lbl">{proxy.job.stage === "waiting" ? t("Smooth preview waits for {title}", { title: proxy.job.waitingFor ?? "" })
        : proxy.job.progress != null ? t("Updating {n}%", { n: proxy.job.progress }) : t("Updating…")}</span></span>;
  if (proxy.job) return <span className="pv-lb pv-smooth" role="status" title={t("The app is making a smooth preview of this film: it plays live meanwhile")}><Loader2 size={14} className="spin" /><span className="lbl">{proxy.job.stage === "waiting" ? t("Smooth preview waits for {title}", { title: proxy.job.waitingFor ?? "" })
    : proxy.job.progress != null ? t("Smooth preview {n}%", { n: proxy.job.progress }) : t("Smooth preview…")}</span></span>;
  if (proxy.status === "stale" && proxy.update) return <UpdateProxy proxy={proxy} />;
  return null;
}

/** The stage of a film that cannot play live: the app's render of it, or, until it exists, what the app is doing about it. */
export function VideoStage({ pv }) {
  const t = useT();
  const { proxy, video, videoEvents } = pv;
  const job = proxy?.job, eta = proxy?.etaMinutes != null ? Math.max(1, Math.round(proxy.etaMinutes)) : null;
  const line = job?.stage === "waiting" ? t("Waiting for {title} to finish rendering", { title: job.waitingFor ?? "" })
    : job ? [eta != null ? t("Rendering the preview, about {n} min left", { n: eta }) : t("Rendering the preview"), job.progress != null ? `${job.progress}%` : null].filter(Boolean).join(" · ")
      : proxy?.waitsFor === "film" ? t("The preview comes once the film is built")
        : t("No preview yet: the app makes one by itself");
  return <>
    {proxy?.url && <video ref={video} className="pv-frame pv-video" src={proxy.url} preload="auto" playsInline aria-label={t("Film")} {...videoEvents} />}
    {!proxy?.url && <div className="pv-wait pv-render" role="status">{job ? <Loader2 size={18} className="spin" /> : null}<span>{line}</span>
      {job?.progress != null && <span className="pv-prog" aria-hidden="true"><i style={{ transform: `scaleX(${job.progress / 100})` }} /></span>}</div>}
    {proxy?.url && job && <div className="pv-update" role="status"><Loader2 size={12} className="spin" />{t("Updating the preview")}{job.progress != null ? ` · ${job.progress}%` : ""}</div>}
    {proxy?.url && !job && proxy.status === "stale" && <div className="pv-update old" role="status">{t("Older version")}{proxy.update && <UpdateProxy proxy={proxy} className="btn ghost sm" label="Update" />}</div>}
  </>;
}

// the preview's quality menu, as After Effects' resolution menu
const QUALITY = { full: "Full", half: "Half", quarter: "Quarter", auto: "Auto" };
const SCALE_LEVEL = { 1: "full", 0.5: "half", 0.25: "quarter" };

/** planned: the film is not built yet (GET /projects/:id built false), its planned length in seconds (0 when unknown); null once built. */
export default function Player({ projectId, pv, shots, shot, onShot, locked, range, onFilesChanged, planned = null, pinning = false, onPin = null, children }) {
  const t = useT();
  const toast = useToast();
  const { info, state, picked, setPicked, boxes, frame, send, keyHandler, dbl } = pv;
  const [muted, setMuted] = usePref("editor:muted", false);
  const [rate, setRate] = usePref("editor:rate", 1);
  const [loop, setLoop] = usePref("editor:loop", false);
  const [safe, setSafe] = usePref("editor:safe", false);
  const [grid, setGrid] = usePref("editor:grid", false);
  // the preview's quality, per project: Full by default, so a film is never lowered unless the user asks; Auto lowers
  // it only while a film that cannot keep its rate plays (the preview's host decides, host.js)
  const [quality, setQuality] = usePref(`editor:quality:${projectId}`, "full");
  const [card, setCard] = useState(true);
  const stage = useRef(null);
  useEffect(() => { if (state.ready) { send("mute", { muted }); send("rate", { rate }); send("loop", { loop }); send("marks", { safe, grid }); } }, [state.ready, muted, rate, loop, safe, grid, send]);
  useEffect(() => { if (state.ready) send("range", range ? { start: range[0], end: range[1] } : { start: null, end: null }); }, [state.ready, range?.[0], range?.[1], send]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { send("lock", { locked: !!locked }); }, [locked, send]);
  useEffect(() => { if (state.ready) send("quality", { level: quality }); }, [state.ready, quality, send]);
  const { proxy, videoOnly } = pv;
  useEffect(() => { if (state.ready && !videoOnly) send("proxy", { url: proxy?.url ?? null, fresh: proxy?.status === "fresh", duration: proxy?.duration ?? null }); },
    [state.ready, proxy?.url, proxy?.status, proxy?.duration, send]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { setCard(true); }, [picked[0]?.hfId, picked[0]?.label]);
  const seek = (s) => send("seek", { time: Math.max(0, Math.min(state.duration || 0, s)) });
  const shotIdx = shots.findIndex((s) => state.time >= s.start - 1e-3 && state.time < s.start + (s.duration ?? 0) - 1e-3);
  const cur = shots[shotIdx] ?? null;
  // The film loads (HF's runtime, then its pictures, video and fonts) under the app's own cover, never HF's "Loading assets" card (owner
  // 30/10: The Studio showed it): the frame and its controls wait until both are in. A film still loading after 30 s (a missing file) can
  // be shown as it is.
  const [skipWait, setSkipWait] = useState(false), [slow, setSlow] = useState(false);
  const loading = planned === null && !state.error && !skipWait && (!state.ready || !state.assets || !!state.transitions);
  useEffect(() => { if (state.assets) setSkipWait(false); }, [state.assets]);          // a later reload waits again
  useEffect(() => { setSlow(false); if (!loading) return undefined; const h = setTimeout(() => setSlow(true), 30000); return () => clearTimeout(h); }, [loading]);
  const step = (frames) => { if (!loading) send("step", { frames }); };          // one frame at the film's own rate, counted in the preview
  const go = (d) => { const n = shots[Math.max(0, Math.min(shots.length - 1, (shotIdx < 0 ? 0 : shotIdx) + d))]; if (n) { seek(n.start); onShot?.(n); } };
  const toggle = () => { if (!loading) send(state.paused ? "play" : "pause"); };
  const still = async () => {
    try { const r = await post(`/api/projects/${projectId}/edit/still`, { time: state.time }); toast(t("Still saved: {f}", { f: String(r.file ?? "").split(/[\\/]/).pop() })); }
    catch (e) { toast(e.message, "error"); }
  };
  const full = () => { const el = stage.current; if (document.fullscreenElement) document.exitFullscreen(); else el?.requestFullscreen?.().catch(() => {}); };
  // keys (from the page, or from the preview when it has the focus)
  const onKey = useCallback((k) => {
    if (k.code === "Space" || k.code === "KeyK") toggle();
    else if (k.code === "ArrowLeft") { if (k.shift) seek(state.time - 1); else step(-1); }
    else if (k.code === "ArrowRight") { if (k.shift) seek(state.time + 1); else step(1); }
    else if (k.code === "PageUp" || k.code === "KeyJ") go(-1);
    else if (k.code === "PageDown" || k.code === "KeyL") go(1);
    else if (k.code === "Home") seek(0);
    else if (k.code === "End") seek(state.duration);
    else if (k.code === "KeyN" || (k.code === "Escape" && pinning)) onPin?.();          // pin a note here (N); Escape lets go
  }, [state.time, state.paused, state.duration, shotIdx, onPin, pinning]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { keyHandler.current = onKey; }, [onKey, keyHandler]);
  useEffect(() => {
    const k = (e) => {
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName ?? "") || document.activeElement?.isContentEditable) return;
      if (document.querySelector(".sheet-overlay")) return;
      if (["Space", "ArrowLeft", "ArrowRight", "PageUp", "PageDown", "Home", "End"].includes(e.code)) { e.preventDefault(); onKey({ code: e.code, shift: e.shiftKey }); }
      else if (onPin && !e.ctrlKey && !e.metaKey && !e.altKey && (e.code === "KeyN" || (e.code === "Escape" && pinning))) { e.preventDefault(); onKey({ code: e.code }); }
    };
    addEventListener("keydown", k);
    return () => removeEventListener("keydown", k);
  }, [onKey]);
  useEffect(() => { dbl.current = () => setCard(true); }, [dbl]);
  // a click anywhere outside the card and the film leaves the words being edited: the field is left (so it saves) and the card closes;
  // the element stays Claude's target. A click on the empty film clears the selection (host.js)
  useEffect(() => {
    const away = (e) => {
      if (!card || !picked.length) return;
      if (e.target.closest?.(".pe-card, .pv-frame")) return;
      if (document.activeElement?.closest?.(".pe-card")) document.activeElement.blur();
      setCard(false);
    };
    addEventListener("pointerdown", away, true);
    return () => removeEventListener("pointerdown", away, true);
  }, [card, picked.length]);

  const one = picked.length === 1 ? picked[0] : null;
  return <div className="pv" ref={stage}>
    <div className="pv-stage">
      {/* no title: the app's tooltip would show "Film" over the picture; the frame is named for screen readers */}
      {/* before the Build the page is the new project's 3 s starter; it is not shown as the film */}
      {planned !== null ? <div className="pv-wait pv-render" role="status"><span>{t("Not built yet: the film is made after you approve the Motion Plan")}
        {planned > 0 ? ` · ${Math.floor(planned / 60)}:${String(Math.round(planned % 60)).padStart(2, "0")}` : ""}</span></div>
        : videoOnly ? <VideoStage pv={pv} />
        : info && <iframe ref={frame} className="pv-frame" aria-label={t("Film")} src={info.url} allow="autoplay; fullscreen" />}
      {loading && <div className="pv-wait pv-loading" role="status" aria-live="polite"><Loader2 size={18} className="spin" />
        <span>{t("The film is loading. Please wait.")}</span>
        {slow && <><span className="pv-wait-sub">{t("This is taking longer than usual: a file may be missing.")}</span>
          <button type="button" className="btn sm" onClick={() => setSkipWait(true)}>{t("Show the film")}</button></>}</div>}
      {state.error && <div className="pv-wait err">{state.error}</div>}
      {one && card && <EditCard projectId={projectId} item={one} box={boxes.boxes.at(-1)} frameBox={boxes.frame} locked={locked} send={send}
        onSaved={(label, reload) => { toast(label); onFilesChanged?.(reload); }} onClose={() => setCard(false)} onPin={onPin && !pinning ? onPin : null} shotNumber={cur?.number ?? null} />}
      {picked.length > 1 && <div className="pe-card multi" style={{ right: 12, top: 12 }}>{t("{n} elements selected for Claude", { n: picked.length })}
        <button className="btn ghost icon sm" onClick={() => { send("clear"); setPicked([]); }} aria-label={t("Clear the selection")}><X size={13} /></button></div>}
      {children}
    </div>
    <div className="pv-bar" role="toolbar" aria-label={t("Playback")}>
      <button className="btn ghost icon sm" disabled={loading || (videoOnly && !proxy?.url)} onClick={() => step(-1)} aria-label={t("One frame back")} title={t("One frame back (←) · previous shot: PageUp")}><StepBack size={15} /></button>
      <button className="btn icon sm pv-play" onClick={toggle} disabled={loading || (videoOnly && !proxy?.url)} aria-label={state.paused ? t("Play") : t("Pause")} title={t("Play / pause (Space)")}>{state.paused ? <Play size={15} /> : <Pause size={15} />}</button>
      <button className="btn ghost icon sm" disabled={loading || (videoOnly && !proxy?.url)} onClick={() => step(1)} aria-label={t("One frame on")} title={t("One frame on (→) · next shot: PageDown")}><StepForward size={15} /></button>
      <span className="pv-time num" title={t("Minutes:seconds:frames at {n} fps", { n: state.fps || 30 })}><span className="pv-now">{fmtTime(state.time, state.fps || 30)}</span><span className="muted"> / {fmtTime(state.duration, state.fps || 30)}</span></span>
      {cur && <span className="pv-shot" title={cur.title || undefined}>{t("Shot {n}", { n: cur.number })}{cur.title ? ` · ${cur.title}` : ""}</span>}
      <span className="pv-gap" />
      {/* a note at this moment, like Loop beside it (the next click on the picture places it, a drag draws a box) */}
      {onPin && <button className={"btn ghost sm pv-lb" + (pinning ? " on" : "")} aria-pressed={pinning} onClick={onPin} title={t("Pin a note at this moment (N)")}>
        <MapPin size={14} /><span className="lbl">{t("Pin a note")}</span></button>}
      {/* every tool here says what it is in words; the view aids, the still and full screen sit in one "View" menu */}
      {videoOnly && <span className="pv-lb pv-only" title={t("This film is drawn by code, so it plays from its render. On the timeline, click a shot to jump to it.")}>{t("Rendered preview")}</span>}
      {!videoOnly && <Menu label={t("Viewing aids")} trigger={<span className="pv-lb"><Eye size={14} /><span className="lbl">{t("Viewing aids")}</span><ChevronDown size={12} /></span>} items={[
        { label: `${safe ? "✓ " : ""}${t("Safe margins")}`, icon: <Scan size={14} />, onSelect: () => setSafe(!safe) },
        { label: `${grid ? "✓ " : ""}${t("Grid 3 × 3")}`, icon: <Grid3x3 size={14} />, onSelect: () => setGrid(!grid) },
        "-",
        { label: t("Save a still"), title: t("Save this frame as a picture"), icon: <Camera size={14} />, onSelect: still },
        { label: t("Full screen"), icon: <Maximize size={14} />, onSelect: full },
      ]} />}
      <button className={"btn ghost sm pv-lb" + (loop ? " on" : "")} aria-pressed={loop} onClick={() => setLoop(!loop)} title={range ? t("Loop the chosen part") : t("Loop the film")}><Repeat size={14} /><span className="lbl">{t("Loop")}</span></button>
      {proxy && !videoOnly && <SmoothLabel proxy={proxy} />}
      {!videoOnly && <Menu label={t("Preview quality")} trigger={<span className="pv-lb" title={t("Preview quality: the film itself always renders at full quality")}>
        <span className="lbl">{t(QUALITY[quality] ?? "Full")}{quality === "auto" && state.quality?.level === "auto" && state.quality.scale < 1 ? ` · ${t(QUALITY[SCALE_LEVEL[state.quality.scale]])}` : ""}</span><ChevronDown size={12} /></span>}
        items={Object.entries(QUALITY).map(([k, l]) => ({ label: `${quality === k ? "✓ " : ""}${t(l)}`, title: k === "auto" ? t("Lowers the preview only while the film plays and cannot keep its rate; Full again on pause") : undefined, onSelect: () => setQuality(k) }))} />}
      <Menu label={t("Speed")} trigger={<span className="pv-lb num">{rate}×<ChevronDown size={12} /></span>} items={[0.5, 1, 1.5, 2].map((r) => ({ label: `${rate === r ? "✓ " : ""}${r}×`, onSelect: () => setRate(r) }))} />
      {/* the label says the state, the title says what a click does */}
      <button className={"btn ghost sm pv-lb pv-sound" + (muted ? " muted" : "")} onClick={() => setMuted(!muted)} aria-pressed={muted}
        title={muted ? t("Sound is off: click to turn it on") : t("Sound is on: click to mute")}>
        {muted ? <VolumeX size={14} /> : <Volume2 size={14} />}<span className="lbl">{muted ? t("Muted") : t("Sound")}</span></button>
    </div>
  </div>;
}
