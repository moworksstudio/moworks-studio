// The stages open inside the Editor: Storyboard, Motion plan, Voice-over, Checks, Export to AE, Render,
// the brief and the documents a step writes are sheets over the Editor, not pages. The pages call useStage to open another sheet,
// close theirs, or hand Claude a message (which lands in the chat composer, or is sent at once).
import { createContext, useContext, useEffect, useId, useRef, useState } from "react";
import { X } from "lucide-react";
import { get } from "../api.js";
import { Dialog } from "../components.jsx";
import { go } from "../lib.jsx";
import { useT } from "../i18n.jsx";
import { useThemeId } from "../theme.jsx";

export const StageCtx = createContext(null);
/** { projectId, open(kind, opts), close, askClaude(text, { send }) }; outside the Editor, open goes to the Editor with that sheet. */
export function useStage(projectId) {
  const c = useContext(StageCtx);
  if (c) return c;
  return { projectId, open: (k) => go(`/projects/${projectId}/${k}`), close: () => go(`/projects/${projectId}`), askClaude: () => go(`/projects/${projectId}`) };
}

export const SHEET_TITLES = { storyboard: "Storyboard", "motion-plan": "Motion Plan", voice: "Voice-over & transcript", qa: "Tech checks", ae: "Export to After Effects", render: "Render",
  brief: "Brief", doc: "Document", assets: "Import assets", analysis: "Assets analysis", "qc-review": "Review", mix: "Final Mix", lyrics: "Lyrics", "music-map": "Music map", character: "Characters" };

const GuardCtx = createContext(null);
/** A sheet's content calls this with "has unsaved edits": closing the sheet (×, Escape, a click outside) then asks first. */
export function useCloseGuard(dirty) {
  const g = useContext(GuardCtx);
  const id = useId();
  useEffect(() => { if (!g) return undefined; g.set(id, !!dirty); return () => { g.delete(id); }; }, [dirty, g, id]);
}

/** Calls onDone when Claude (or the autopilot) was working on the project a moment ago and has stopped: the dialog then reloads what Claude wrote.
 *  `watch(pipeline)` (optional) names what the dialog shows, e.g. its step's status: when it changes between two reads, onDone runs too
 *  (Test 24: the Motion Plan dialog sat on "0 planned motions" while the plan was written, as no stop of Claude's was seen).
 *  Returns whether Claude is working now, so a dialog can hold its own actions meanwhile. */
export function useClaudeDone(projectId, onDone, watch = null) {
  const cb = useRef(onDone);
  cb.current = onDone;
  const seen = useRef(watch);
  seen.current = watch;
  const [working, setWorking] = useState(false);
  useEffect(() => {
    let prev = null, prevKey = null, alive = true;
    const tick = async () => {
      try {
        const p = await get(`/api/projects/${projectId}/pipeline`); if (!alive) return;
        const busy = !!p.claudeBusy || !!p.autopilot?.running; setWorking(busy);
        const key = seen.current ? String(seen.current(p) ?? "") : null;
        if ((prev === true && !busy) || (key != null && prevKey != null && key !== prevKey)) cb.current();
        prev = busy; prevKey = key;
      } catch { /* the next tick tries again */ }
    };
    tick();
    const h = setInterval(tick, 4000);
    return () => { alive = false; clearInterval(h); };
  }, [projectId]);
  return working;
}

/** A large sheet over the Editor (Escape or × closes it; with unsaved edits it asks first). In The Studio the sheet lies on the light
 *  table instead: drawn in place, not modal, so the chat and the timeline stay in use beside it. */
export function Sheet({ title, onClose: close, children, narrow = false, footer = null, handle = null, hint = null }) {
  const t = useT();
  const studio = useThemeId() === "studio";
  const ref = useRef(null);
  const guard = useRef(new Map());
  const [ask, setAsk] = useState(false);
  const closeRef = useRef(close);
  closeRef.current = close;
  const onClose = () => { if ([...guard.current.values()].some(Boolean)) setAsk(true); else closeRef.current(); };
  // The Studio: another sheet laid on the table asks first too, when this one has unsaved edits (then goes there, not back to the film)
  const then = useRef(null);
  if (handle) handle.current = { dirty: () => [...guard.current.values()].some(Boolean), ask: (f) => { then.current = f; setAsk(true); } };
  useEffect(() => {
    const prev = document.activeElement;
    ref.current?.focus();
    const key = (e) => { if (e.key === "Escape" && !e.defaultPrevented) { e.stopPropagation(); onClose(); } };
    // Focus can be outside the sheet (the button that opened it is gone, e.g. Tech checks from Render): Escape on the page
    // closes the sheet on top, unless a dialog or another layer lies over it
    const top = (e) => { if (e.key !== "Escape" || e.defaultPrevented) return; const layers = [...document.querySelectorAll(".overlay")];
      // The Studio: the chat, the left column and the timeline stay in use beside the sheet; Escape typed there is theirs
      if (studio ? !layers.length && !document.activeElement?.closest?.(".st-chat, .st-side, .st-tl") : layers.at(-1) === el.parentElement) key(e); };
    const el = ref.current; el.addEventListener("keydown", key); document.addEventListener("keydown", top);
    return () => { el.removeEventListener("keydown", key); document.removeEventListener("keydown", top); prev?.focus?.(); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const leave = ask && <Dialog title={t("Leave without saving?")} danger onClose={() => setAsk(false)} footer={<><span className="spacer" />
    <button className="btn" onClick={() => { const f = then.current ?? closeRef.current; then.current = null; setAsk(false); f(); }}>{t("Leave without saving")}</button><button className="btn primary" onClick={() => { then.current = null; setAsk(false); }}>{t("Keep editing")}</button></>}>
    <div className="dlg-lines"><p>{t("You changed something here and did not save it.")}</p><p className="dlg-warn">{t("If you leave now, those changes are lost.")}</p></div></Dialog>;          // one idea a line, the loss in red
  if (studio) return <section className={"lt-sheet" + (narrow ? " narrow" : "")} aria-labelledby="sheet-title" tabIndex={-1} ref={ref}>
    <div className="lt-head"><h2 id="sheet-title">{title}</h2>{hint && <span className="lt-hint">{hint}</span>}
      <button className="btn ghost icon sm x" onClick={onClose} aria-label={t("Close")} title={t("Close")}><X size={16} /></button></div>
    <div className="sheet-body"><GuardCtx.Provider value={guard.current}>{children}</GuardCtx.Provider></div>
    {footer && <div className="dialog-foot">{footer}</div>}
    {leave}
  </section>;
  return <div className="overlay sheet-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
    <div className={"sheet" + (narrow ? " narrow" : "")} role="dialog" aria-modal="true" aria-labelledby="sheet-title" tabIndex={-1} ref={ref}>
      <div className="dialog-head"><h2 id="sheet-title">{title}</h2>
        <button className="btn ghost icon sm x" onClick={onClose} aria-label={t("Close")} title={t("Close")}><X size={16} /></button></div>
      <div className="sheet-body"><GuardCtx.Provider value={guard.current}>{children}</GuardCtx.Provider></div>
      {footer && <div className="dialog-foot">{footer}</div>}
    </div>
    {leave}
  </div>;
}
