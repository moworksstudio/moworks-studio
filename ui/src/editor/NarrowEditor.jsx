// The Film Editor in a narrow window, both themes' layouts (EditorDesk.jsx, EditorStudio.jsx; moved out of screens/Editor.jsx: audit/112c c2.2).
import { useT } from "../i18n.jsx";

/** The Editor in a narrow window (under 900 px), both themes: three tabs (the left column, the film, Claude), each pane kept mounted and
 *  shown by its tab (audit/112c c2.2: the Desk and The Studio wrote it twice). head: what stands above the tabs; after: the dialogs. */
export function NarrowEditor({ className, shape, style, head, leftLabel, left, film, claude, tab, onTab, after }) {
  const t = useT();
  return <div className={className} data-zone="editor" data-shape={shape} style={style}>{head}
    <div className="pane-head ed-tabs"><div className="tabs" role="tablist">{[["left", leftLabel], ["film", "Film"], ["claude", "Claude"]].map(([k, l]) =>
      <button key={k} role="tab" aria-selected={tab === k} onClick={() => onTab(k)}>{t(l)}</button>)}</div></div>
    <div className="ed-narrow" style={{ display: tab === "left" ? "flex" : "none" }}>{left}</div>
    <div className="ed-narrow" style={{ display: tab === "film" ? "flex" : "none" }}>{film}</div>
    <div className="ed-narrow" style={{ display: tab === "claude" ? "flex" : "none" }}>{claude}</div>
    {after}</div>;
}
