// Shared UI components: dialog, menu, status line, placeholder art, resizable panes.
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { AlertTriangle, ArrowLeft, CheckCircle2, ChevronLeft, ChevronRight, Circle, ImageOff, Info, Loader2, X, XCircle } from "lucide-react";
import { go, STAGE_NAMES, useData, usePref } from "./lib.jsx";
import { get } from "./api.js";
import { useT } from "./i18n.jsx";

export function Dialog({ title, icon, danger, onClose, children, footer, wide, labelledBy = "dlg-title" }) {
  const t = useT();
  const ref = useRef(null);
  useEffect(() => {
    const prev = document.activeElement;
    const el = ref.current;
    (el.querySelector("[autofocus], input, textarea, select, button.primary") ?? el).focus();
    const key = (e) => {
      if (e.key === "Escape") { e.stopPropagation(); onClose?.(); }
      if (e.key === "Tab") {
        const f = [...el.querySelectorAll("button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])")].filter((x) => !x.disabled);
        if (!f.length) return;
        if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f.at(-1).focus(); }
        else if (!e.shiftKey && document.activeElement === f.at(-1)) { e.preventDefault(); f[0].focus(); }
      }
    };
    el.addEventListener("keydown", key);
    return () => { el.removeEventListener("keydown", key); prev?.focus?.(); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose?.(); }}>
      <div className={"dialog" + (wide ? " wide" : "")} role="dialog" aria-modal="true" aria-labelledby={labelledBy} ref={ref} tabIndex={-1}>
        <div className="dialog-head">{icon && <span className={"dialog-icon" + (danger ? " danger" : "")} aria-hidden="true">{icon}</span>}<h2 id={labelledBy}>{title}</h2>
          {onClose && <button className="btn ghost icon sm x" onClick={onClose} aria-label={t("Close")} title={t("Close")}><X size={16} /></button>}</div>
        <div className="dialog-body">{children}</div>
        {footer && <div className="dialog-foot">{footer}</div>}
      </div>
    </div>
  );
}

/** Overflow menu: a trigger button and a list of { label, icon, onSelect, danger, disabled, title }. */
export function Menu({ trigger, items, label }) {
  const t = useT();
  label = label ?? t("More actions");
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const off = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    const esc = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", off); document.addEventListener("keydown", esc);
    ref.current?.querySelector(".menu button:not(:disabled)")?.focus();
    return () => { document.removeEventListener("mousedown", off); document.removeEventListener("keydown", esc); };
  }, [open]);
  return (
    <div className="menu-wrap" ref={ref} onClick={(e) => e.stopPropagation()}>
      <button className="btn ghost icon sm" aria-haspopup="menu" aria-expanded={open} aria-label={label} title={label} onClick={() => setOpen((o) => !o)}>{trigger}</button>
      {open && <div className="menu" role="menu">
        {items.map((it, i) => it === "-" ? <hr key={i} /> : (
          <button key={i} role="menuitem" className={it.danger ? "danger" : ""} disabled={it.disabled} title={it.title}
            onClick={() => { setOpen(false); it.onSelect(); }}>{it.icon}{it.label}</button>))}
      </div>}
    </div>
  );
}

// A card counts the Pipeline's five stages, as the Editor's Pipeline column does ("2/5"), never the old six
// or a style's own steps; a card with no saved count maps the old stage onto them (review is part of Build and review, export is Final Mix)
const FIVE = [["Prepare", ["brief"]], ["Storyboard", ["storyboard"]], ["Motion Plan", ["motionPlan"]], ["Build and review", ["build", "review"]], ["Final Mix", ["export"]]];
const STAGES = Object.keys(STAGE_NAMES);
/** A film's stage as a gauge (drawn as a dive profile of nodes), with the stage name. */
export function Gauge({ stage, done = false, label = true, progress = null }) {
  const t = useT();
  if (progress?.total > 0) {          // the pipeline's own steps, not the six old stages: finished steps filled, the next one marked
    const d = Math.min(progress.done, progress.total), all = d >= progress.total;
    const name = done ? t("Exported") : all ? t("All steps done") : t("{done} of {total} steps", { done: d, total: progress.total });
    return <span className="gauge-label"><span className="gauge-num" aria-hidden="true">{String(d).padStart(2, "0")}/{String(progress.total).padStart(2, "0")}</span><span className="gauge" role="img" aria-label={name} style={progress.total > 9 ? { "--node": "0.5rem", "--link": "0.25rem" } : undefined}>
      {Array.from({ length: progress.total }, (_, k) => <i key={k} className={k < d ? "done" : k === d && !done ? "cur" : undefined} />)}</span>{label && <span>{name}</span>}</span>;
  }
  const i = Math.max(0, FIVE.findIndex(([, old]) => old.includes(stage ?? STAGES[0])));
  const name = done ? t("Exported") : t(FIVE[i][0]);
  const n = done ? FIVE.length : i + 1;
  return <span className="gauge-label"><span className="gauge-num" aria-hidden="true">{String(n).padStart(2, "0")}/{String(FIVE.length).padStart(2, "0")}</span><span className="gauge" role="img" aria-label={t("Stage {n} of {total}: {name}", { n, total: FIVE.length, name })}>
    {FIVE.map(([s], k) => <i key={s} className={done || k < i ? "done" : k === i ? "cur" : undefined} />)}</span>{label && <span>{name}</span>}</span>;
}

export function StatusIcon({ status, size = 16 }) {
  const t = useT();
  if (status === "ok") return <CheckCircle2 size={size} aria-label={t("OK")} className="ico ok" />;
  if (status === "warning") return <AlertTriangle size={size} aria-label={t("Warning")} className="ico warning" />;
  if (status === "neutral") return <Circle size={size} aria-label={t("Not set up")} className="ico muted" />;
  if (status === "running") return <Loader2 size={size} aria-label={t("Working")} className="ico spin" />;
  return <XCircle size={size} aria-label={t("Problem")} className="ico error" />;
}

export function Banner({ kind = "info", children, action }) {
  const Icon = kind === "error" ? XCircle : kind === "warning" ? AlertTriangle : kind === "success" ? CheckCircle2 : Info;
  return <div className={"banner " + kind} role={kind === "error" ? "alert" : "status"}><Icon size={16} /><div style={{ flex: 1 }}>{children}</div>{action}</div>;
}

export function NoPreview({ text }) {
  const t = useT();
  text = text ?? t("No preview");
  return <div className="placeholder-art"><span className="label"><ImageOff size={14} />{text}</span></div>;
}

/**
 * Workspace primitive: three resizable, collapsible panes (left / center / right) with widths kept per user.
 * Defaults 20 % / 46 % / 34 %; min widths 220 / 420 / 300 px; a side pane collapses when the window cannot fit all three.
 * Splitters move with the mouse or the arrow keys (Shift = 40 px).
 */
export function Panes({ id, left, center, right, leftCollapsed, rightCollapsed, defaults = null }) {
  const t = useT();
  const DEFAULT = defaults ?? { left: 0.12, right: 0.21 }; // default layout: shots ~12%, Claude ~21% of the area right of the rail (a screen may give its own)
  const [w, setW] = usePref(`panes:${id}:v2`, DEFAULT);
  const box = useRef(null);
  const [width, setWidth] = useState(1200);
  const [drag, setDrag] = useState(null);
  useLayoutEffect(() => {
    // measure before the first paint, then follow size changes (window resize as a fallback for hidden or background windows)
    const el = box.current, read = () => setWidth(el.getBoundingClientRect().width || 1200);
    read();
    const ro = new ResizeObserver(read);
    ro.observe(el); addEventListener("resize", read);
    return () => { ro.disconnect(); removeEventListener("resize", read); };
  }, []);
  const MIN = { left: 220, center: 420, right: 300 };
  const autoRight = rightCollapsed || width < MIN.left + MIN.center + MIN.right - (leftCollapsed ? MIN.left : 0);
  const autoLeft = leftCollapsed || (!autoRight ? false : width < MIN.left + MIN.center);
  const px = (side) => Math.max(MIN[side], Math.round(w[side] * width));
  const clampSet = (side, pxVal) => {
    const other = side === "left" ? (autoRight ? 0 : px("right")) : (autoLeft ? 0 : px("left"));
    const max = width - MIN.center - other;
    setW((o) => ({ ...o, [side]: Math.min(Math.max(pxVal, MIN[side]), max) / width }));
  };
  useEffect(() => {
    if (!drag) return;
    const move = (e) => {
      const r = box.current.getBoundingClientRect();
      clampSet(drag, drag === "left" ? e.clientX - r.left : r.right - e.clientX);
    };
    const up = () => setDrag(null);
    addEventListener("pointermove", move); addEventListener("pointerup", up);
    return () => { removeEventListener("pointermove", move); removeEventListener("pointerup", up); };
  }); // eslint-disable-line react-hooks/exhaustive-deps
  const key = (side) => (e) => {
    const step = e.shiftKey ? 40 : 10, dir = e.key === "ArrowLeft" ? -1 : e.key === "ArrowRight" ? 1 : 0;
    if (!dir) return;
    e.preventDefault();
    clampSet(side, px(side) + (side === "left" ? dir : -dir) * step);
  };
  const splitter = (side) => (
    <button className={"splitter" + (drag === side ? " dragging" : "")} role="separator" aria-orientation="vertical"
      aria-label={side === "left" ? t("Resize the left panel") : t("Resize the right panel")} title={t("Drag to resize (arrow keys work too)")}
      onPointerDown={(e) => { e.preventDefault(); setDrag(side); }} onKeyDown={key(side)}
      onDoubleClick={() => setW((o) => ({ ...o, [side]: DEFAULT[side] }))} />
  );
  return (
    <div className={"panes" + (drag ? " dragging" : "")} ref={box} style={drag ? { userSelect: "none", cursor: "col-resize" } : undefined}>
      {!autoLeft && <><div className="pane" style={{ width: px("left") }}>{left}</div>{splitter("left")}</>}
      <div className="pane center" style={{ flex: 1 }}>{center}</div>
      {!autoRight && <>{splitter("right")}<div className="pane" style={{ width: px("right") }}>{right}</div></>}
    </div>
  );
}
// The screens the app has shown this session, so Back returns to the one before. A hash change that lands on the
// screen before the current one is a step back; anything else is a step forward.
const trail = [location.hash || "#/projects"];
const RAIL_PAGE = /^#\/(?:projects(?:\?.*)?|(?:styles|characters|looks|library|settings)(?:[/?].*)?)$/;          // a rail page (a film is #/projects/<id>)
addEventListener("hashchange", () => {
  const h = location.hash || "#/projects";
  if (trail.length > 1 && trail.at(-2) === h) trail.pop(); else if (trail.at(-1) !== h) trail.push(h);
});
/** Back with its arrow: to the previous screen, or `onClick` for an overlay (it closes and shows what was under it). Opened straight on a
 *  screen, it goes to `fallback` (Projects). */
export function BackButton({ onClick, fallback = "/projects", className = "" }) {
  const t = useT();
  const back = () => { if (onClick) onClick(); else if (trail.length > 1) history.back(); else go(fallback); };
  // On The Desk a page's Back shows only when there is somewhere to return to that the rail does not
  // already offer (a film, a sheet): opened from the rail or straight, the rail is the way back
  if (!onClick && document.documentElement.dataset.theme !== "studio" && (trail.length < 2 || RAIL_PAGE.test(trail.at(-2)))) return null;
  return <button type="button" className={"btn ghost sm back-btn " + className} onClick={back}><ArrowLeft size={14} />{t("Back")}</button>;
}

/** The one grid of the gallery pages (Style Gallery, Look, Motion Library, Characters, Projects): never a
 *  page scroll. Every tile keeps ONE 16:9 picture frame over its text. For each column count that keeps a tile `min` to `max`
 *  rem wide, the tiles are laid out once and measured (a narrow card wraps its lines and grows), the whole rows that fit are counted, and
 *  the pair of columns and rows that leaves the least height empty wins (more tiles on a tie). Recounted on every resize. `room(el, rem)`
 *  gives the height when the page sets none (Projects). Returns the ref and style for the grid and the page size. */
export function useGalleryGrid({ card: cardSel = ".sgb-card", media = ".shot", room = null, min = 11, max = 22 } = {}) {
  const [el, ref] = useState(null);
  const [grid, setGrid] = useState({ cols: 3, rows: 3 });
  useLayoutEffect(() => {
    if (!el) return undefined;
    const read = () => {
      const cs = getComputedStyle(el), px = (v) => parseFloat(v) || 0, rem = px(getComputedStyle(document.documentElement).fontSize) || 16;
      const w = el.clientWidth - px(cs.paddingLeft) - px(cs.paddingRight), h = room ? room(el, rem) : el.clientHeight - px(cs.paddingTop) - px(cs.paddingBottom);
      const gx = px(cs.columnGap), gy = px(cs.rowGap);
      const cards = [...el.querySelectorAll(":scope > " + cardSel)];
      const kept = el.style.gridTemplateColumns;
      // a tile's height at this column count: laid out and measured (the tallest of the first row), else its 16:9 frame and the usual text
      const tileH = (cols, tileW) => {
        if (!cards.length) return tileW * 9 / 16 + 3.375 * rem;
        el.style.gridTemplateColumns = `repeat(${cols}, minmax(0, 1fr))`;
        const hh = Math.max(...cards.slice(0, cols).map((c) => c.offsetHeight));
        return hh || tileW * 9 / 16 + 3.375 * rem;
      };
      let best = null;
      for (let cols = 1; cols <= 12; cols++) {
        const tileW = (w - (cols - 1) * gx) / cols;
        if (tileW > max * rem) continue;
        if (tileW < min * rem && best) break;
        const th = tileH(cols, tileW), rows = Math.max(1, Math.floor((h + gy) / (th + gy))), left = h - rows * th - (rows - 1) * gy;
        if (!best || left < best.left - 4 || (Math.abs(left - best.left) <= 4 && cols * rows > best.cols * best.rows)) best = { cols, rows, left };
      }
      el.style.gridTemplateColumns = kept;
      el.dataset.rows = String(best.rows);
      if (el.children.length >= best.cols * best.rows) el.dataset.full = "1"; else delete el.dataset.full;          // only a full page centres its rows
      setGrid((g) => (g.cols === best.cols && g.rows === best.rows ? g : { cols: best.cols, rows: best.rows }));
    };
    read();
    const ro = new ResizeObserver(read); ro.observe(el);
    const mo = new MutationObserver(read); mo.observe(el, { childList: true });          // the first tiles tell the real height of their text
    addEventListener("resize", read);          // a page that fills the window (Projects) follows its height too
    return () => { ro.disconnect(); mo.disconnect(); removeEventListener("resize", read); };
  }, [el]);
  return { ref, size: grid.cols * grid.rows, style: { gridTemplateColumns: `repeat(${grid.cols}, minmax(0, 1fr))` } };
}

/** The computer's checks: the last answer comes at once (cached), and while the server checks again in the
 *  background (checking) the fresh one is asked for (?fresh=1, 2-3 s); reload (Check again) always asks for a fresh one. */
export function useChecks(url) {
  const fresh = useRef(false);
  const q = useData(() => (url ? get(url + (fresh.current ? (url.includes("?") ? "&" : "?") + "fresh=1" : "")) : Promise.resolve(null)), [url]);          // no url: nothing asked
  useEffect(() => { if (q.data?.checking && !fresh.current) { fresh.current = true; q.reload(); } }, [q.data]); // eslint-disable-line react-hooks/exhaustive-deps
  const again = () => { fresh.current = true; return q.reload(); };
  return { ...q, reload: again };
}

/** The page picker under a gallery, centred: ‹ 1 … 4 5 [6] 7 8 … 30 › with "from–to of total" on the right. `page` counts from 0. */
export function Pager({ page, size, total, onPage, className = "", keep = false }) {
  const t = useT();
  const pages = Math.max(1, Math.ceil(total / size));
  if (pages < 2) return keep ? <nav className={"pager " + className} aria-hidden="true" /> : null;          // keep: the gallery keeps its room
  const numbers = [];
  for (let i = 0; i < pages; i++) if (i === 0 || i === pages - 1 || Math.abs(i - page) <= 2) numbers.push(i); else if (numbers.at(-1) !== "…") numbers.push("…");
  return <nav className={"pager " + className} aria-label={t("Pages")}>
    <span className="pager-nums">
      <button type="button" className="btn ghost icon sm" onClick={() => onPage(Math.max(0, page - 1))} disabled={page === 0} aria-label={t("Previous page")}><ChevronLeft size={15} /></button>
      {numbers.map((n, i) => n === "…" ? <span key={"g" + i} className="muted">…</span>
        : <button type="button" key={n} className={"ml-pg" + (n === page ? " on" : "")} aria-current={n === page ? "page" : undefined} onClick={() => onPage(n)}>{n + 1}</button>)}
      <button type="button" className="btn ghost icon sm" onClick={() => onPage(Math.min(pages - 1, page + 1))} disabled={page >= pages - 1} aria-label={t("Next page")}><ChevronRight size={15} /></button>
    </span>
    <span className="pager-count muted num">{t("{from}–{to} of {total}", { from: page * size + 1, to: Math.min(total, (page + 1) * size), total })}</span>
  </nav>;
}
