// The Editor's "Versions" menu: the project's named versions ("Build 1", "Edit 2", "Render 1", "Before
// redoing the storyboard"), newest first; "Open" puts one back after a confirmation (the version in use is saved first, so nothing is lost).
// Esc or a click outside closes it. Before the server has versions, the last changes are listed to read. `inline`: the same list
// laid out in place (The Studio's "This film" tab), read when it shows.
import { useEffect, useRef, useState } from "react";
import { ChevronDown, Clapperboard, Film, History, Loader2, PenLine, RotateCcw } from "lucide-react";
import { get, post } from "../api.js";
import { Dialog } from "../components.jsx";
import { ago, useToast } from "../lib.jsx";
import { useT } from "../i18n.jsx";

const KIND_ICON = { build: Clapperboard, edit: PenLine, render: Film, "before-redo": RotateCcw };

export default function Versions({ projectId, locked, onRestored, inline = false }) {
  const t = useT();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [list, setList] = useState(null);          // { versions } or { revisions } (older server)
  const [ask, setAsk] = useState(null);
  const [busy, setBusy] = useState(false);
  const box = useRef(null);
  useEffect(() => {
    if (!open) return;
    const off = (e) => { if (!box.current?.contains(e.target)) setOpen(false); };
    const esc = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", off, true); document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", off, true); document.removeEventListener("keydown", esc); };
  }, [open]);
  const load = async () => {
    try { const r = await get(`/api/projects/${projectId}/versions`); setList({ versions: Array.isArray(r) ? r : r.versions ?? [] }); }
    catch { try { setList({ revisions: (await get(`/api/projects/${projectId}/revisions`)).revisions.slice(0, 10) }); } catch (e) { toast(e.message, "error"); } }
  };
  const toggle = () => { if (!open) load(); setOpen((x) => !x); };
  useEffect(() => { if (inline) load(); }, [inline, projectId]); // eslint-disable-line react-hooks/exhaustive-deps
  const restore = async () => {
    setBusy(true);
    try { await post(`/api/projects/${projectId}/versions/${encodeURIComponent(ask.id)}/restore`); toast(t("Opened: {name}", { name: nameOf(ask) })); setAsk(null); setOpen(false); if (inline) restoredInline(); else onRestored(); }
    catch (e) { toast(e.message, "error"); } finally { setBusy(false); }
  };
  const versions = list?.versions ?? [];
  const nameOf = (v) => (v.key ? t(v.key, { n: v.n }) : v.name);          // the server names a version by an English key and its number
  const restoredInline = () => { load(); onRestored(); };
  return <span className={inline ? "ed-ver inline" : "ed-ver"} ref={box}>
    {!inline && <button className="btn ghost sm" onClick={toggle} aria-expanded={open} aria-haspopup="dialog"><History size={14} />{t("Versions")}<ChevronDown size={12} /></button>}
    {(open || inline) && <div className={inline ? "ed-ver-in" : "ed-ver-pop"} role={inline ? undefined : "dialog"} aria-label={inline ? undefined : t("Versions")}>
      {!list ? <div className="skeleton" style={{ height: "3rem" }} />
        : list.revisions ? <><p className="hint">{t("Recent versions")}</p>
          <ol className="plain ed-ver-list">{list.revisions.map((h) => <li key={h.rev}><span className="t">{h.message}</span><time>{ago(h.at)}</time></li>)}</ol></>
          : !versions.length ? <p className="hint">{t("No version yet. One is saved when the film is first built, after each round of changes, at each render and before a redo.")}</p>
            : <ol className="plain ed-ver-list">{versions.map((v) => { const I = KIND_ICON[v.kind] ?? History; return <li key={v.id}>
              <I size={14} /><span className="t"><b>{nameOf(v)}</b><time>{ago(v.at)}</time></span>
              <button className="btn sm" disabled={locked} onClick={() => setAsk(v)} title={locked ? t("Wait until Claude or the render finishes") : undefined}>{t("Open")}</button></li>; })}</ol>}
      {versions.length > 0 && <p className="hint">{t("Opening a version saves the one in use first: nothing is lost.")}</p>}
    </div>}
    {ask && <Dialog title={t("Open {name}?", { name: nameOf(ask) })} onClose={() => setAsk(null)} footer={<>
      <button className="btn ghost" onClick={() => setAsk(null)}>{t("Cancel")}</button>
      <button className="btn primary" disabled={busy} onClick={restore}>{busy && <Loader2 size={14} className="spin" />}{t("Open this version")}</button></>}>
      <p>{t("The film goes back to “{name}” ({when}). The version in use is saved first, so you can come back to it from this menu.", { name: nameOf(ask), when: ago(ask.at) })}</p>
    </Dialog>}
  </span>;
}
