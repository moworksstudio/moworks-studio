// Notes pinned on the film: "Pin a note" (or N), then a click on the picture places a point and a drag draws a box; the
// note becomes a line of the chat's message, "[0:03.4 · Shot 2] " with the caret after it, and goes with the chat's own Send: the frame and
// the place go with the message (task.media), one line a note. The Desk's own parts only: the point and the box in the
// selection's colour over the picture, the chat's composer for the words.
import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { useT } from "../i18n.jsx";
import { useThemeId } from "../theme.jsx";
import { fmtTime } from "./Player.jsx";

/** A pin's tag at the head of its line in the message: "[0:03.4 · Shot 2] ". */
// a note's time in the player's own clock (minutes:seconds:frames at the film's rate)
export const pinTag = (p) => `[${fmtTime(p.t, p.fps || 24)}${p.shot != null ? ` · Shot ${p.shot}` : ""}] `;
/** The pins a message still holds (its line kept), each with the words of its line; a pin whose line was deleted is left out. */
export function notesOf(text, pins) {
  const lines = String(text ?? "").split("\n");
  return (pins ?? []).flatMap((p) => {
    const tag = (p.tag ?? pinTag(p)).trim(), line = lines.find((l) => l.trim().startsWith(tag));
    if (line == null) return [];
    return [{ id: p.id, t: p.t, ...(p.box ? { box: p.box } : p.x != null ? { x: p.x, y: p.y } : {}), text: line.trim().slice(tag.length).trim() }];
  });
}

/** Over the picture: the pins at this moment (a point or a box, numbered in pinning order), and while pinning, a click places a point and a
 *  drag draws a box. `aspect` is the film's width / height, so the 0–1 places land on the picture itself, not the letterbox. */
// a pin is chosen by a click and goes with Delete / Backspace or its small ×; its line leaves the chat with it
export function NotesLayer({ notes, time, pinning, aspect = 16 / 9, onPlace, onRemove = null }) {
  const t = useT();
  const studio = useThemeId() === "studio";          // The Studio says what a click does, in pencil under the picture
  const pic = useRef(null);
  const [drag, setDrag] = useState(null);         // { x0, y0, x, y } in 0–1 while the box is drawn
  const [sel, setSel] = useState(null);           // the chosen pin's id
  useEffect(() => {
    if (!sel || !onRemove) return;
    const key = (e) => { const el = e.target; if (/^(INPUT|TEXTAREA|SELECT)$/.test(el?.tagName ?? "") || el?.isContentEditable) return;
      if (e.key === "Delete" || e.key === "Backspace") { e.preventDefault(); onRemove(sel); setSel(null); } else if (e.key === "Escape") setSel(null); };
    addEventListener("keydown", key); return () => removeEventListener("keydown", key);
  }, [sel, onRemove]);
  const at = (e) => { const r = pic.current.getBoundingClientRect(); return [Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), Math.min(1, Math.max(0, (e.clientY - r.top) / r.height))]; };
  const down = (e) => { if (!pinning) return; e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); const [x, y] = at(e); setDrag({ x0: x, y0: y, x, y }); };
  const move = (e) => { if (drag) { const [x, y] = at(e); setDrag({ ...drag, x, y }); } };
  const up = () => {
    if (!drag) return;
    const w = Math.abs(drag.x - drag.x0), h = Math.abs(drag.y - drag.y0);
    onPlace(w < 0.02 && h < 0.02 ? { x: drag.x0, y: drag.y0 } : { box: { x: Math.min(drag.x, drag.x0), y: Math.min(drag.y, drag.y0), w, h } });
    setDrag(null);
  };
  const here = (notes ?? []).map((n, i) => ({ n, no: i + 1 })).filter(({ n }) => Math.abs(n.t - time) < 0.25 && (n.box || n.x != null));
  const pct = (v) => `${v * 100}%`;
  return <div className={"fn-layer" + (pinning ? " pinning" : "")} aria-hidden={!pinning}>
    <div className="fn-pic" ref={pic} style={{ "--fn-ar": String(aspect) }} onPointerDown={down} onPointerMove={move} onPointerUp={up}
      title={pinning ? t("Click for a point, drag for a box") : undefined}>
      {here.map(({ n, no }) => <Mark key={n.id} n={n} no={no} on={sel === n.id} onPick={onRemove && !pinning ? () => setSel((x) => (x === n.id ? null : n.id)) : null} onRemove={onRemove && !pinning ? () => { onRemove(n.id); setSel(null); } : null} />)}
      {drag && <span className="fn-mark box" style={{ left: pct(Math.min(drag.x, drag.x0)), top: pct(Math.min(drag.y, drag.y0)), width: pct(Math.abs(drag.x - drag.x0)), height: pct(Math.abs(drag.y - drag.y0)) }} />}
    </div>
    {studio && pinning && <span className="fn-hint">{t("Click for a point · drag for a box · Esc to stop")}</span>}
  </div>;
}

/** A pinned place drawn over a picture (the film, or a sent note's frame in the chat). */
export function Mark({ n, no = null, on = false, onPick = null, onRemove = null }) {
  const t = useT();
  const pct = (v) => `${v * 100}%`;
  const cls = (k) => `fn-mark ${k}` + (onPick ? " live" : "") + (on ? " on" : "");
  const pick = onPick ? (e) => { e.stopPropagation(); onPick(); } : undefined;
  const x = onRemove && <button type="button" className="fn-x" onClick={(e) => { e.stopPropagation(); onRemove(); }} aria-label={t("Remove this note")} title={t("Remove this note (Delete)")}><X size={10} strokeWidth={3} /></button>;
  return n.box ? <span className={cls("box")} onClick={pick} style={{ left: pct(n.box.x), top: pct(n.box.y), width: pct(n.box.w), height: pct(n.box.h) }}>{no != null && <b className="num">{no}</b>}{x}</span>
    : n.x != null ? <span className={cls("pt")} onClick={pick} style={{ left: pct(n.x), top: pct(n.y) }}>{no != null && <b className="num">{no}</b>}{x}</span> : null;
}
