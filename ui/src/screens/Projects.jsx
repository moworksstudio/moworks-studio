// Projects dashboard: resume, create, or open an existing HyperFrames project folder. The card shows a
// picture taken from the film (the server picks the most detailed still once the film has shots), a one-line title, the aspect and the
// style as two tags, the stage gauge without its name; the folder path line went. The actions are icon buttons on the
// status row and there is no Open button (a click on the card opens it). A loading line with the studio's mark while the list loads.
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowDownUp, CircleCheck, CircleDashed, Eye, FilterX, FolderInput, FolderOpen, FolderSearch, LayoutGrid, List, ListX, MoreHorizontal, Pencil, Plus, RotateCw, Search, Trash2 } from "lucide-react";
import { del, patch, post, get } from "../api.js";
import { Banner, Dialog, Gauge, Menu, Pager, useGalleryGrid } from "../components.jsx";
import { ago, clock, go, useData, useFirstVisit, usePref, useToast } from "../lib.jsx";
import { useT } from "../i18n.jsx";
import { FolderField } from "../workflow/folder.jsx";
import Intro from "../intro/Intro.jsx";
import { useThemeId } from "../theme.jsx";
import ReelWall from "../studio/ReelWall.jsx";

// labels are English keys for t
const FILTERS = [["all", "All", LayoutGrid], ["in_progress", "In progress", CircleDashed], ["needs_review", "Needs review", Eye], ["exported", "Exported", CircleCheck]];
const STATUS_ICON = { in_progress: CircleDashed, needs_review: Eye, exported: CircleCheck, missing: AlertTriangle };
const SORTS = [["opened", "Last opened"], ["updated", "Last changed"], ["name", "Name"]];
const statusOf = (p) => p.missing ? "missing" : p.status === "exported" ? "exported" : p.status === "needs_review" ? "needs_review" : "in_progress";
const STATUS_LABEL = { in_progress: "In progress", needs_review: "Needs review", exported: "Exported", missing: "Folder missing" };
const scenes = (t, n) => (n === 1 ? t("1 scene") : t("{n} scenes", { n: n ?? 0 }));

function Thumb({ p }) {
  const [broken, setBroken] = useState(false);
  return (
    <div className="card-thumb">
      {p.thumbnailUrl && !broken ? <img className="card-img" src={p.thumbnailUrl} alt="" loading="lazy" onError={() => setBroken(true)} />
        : <div className="slate" aria-hidden="true"><span>{p.title}</span></div>}
      {p.duration > 0 && <span className="chip badge num">{clock(p.duration)}</span>}
    </div>
  );
}

function StatusChip({ p, t }) {
  const s = statusOf(p), I = STATUS_ICON[s];
  return <span className={"chip status-" + s + (p.missing ? " amber" : "")}><I size={12} />{t(STATUS_LABEL[s])}</span>;
}

function ProjectMenu({ p, onRename, onRemove, onLocate, toast }) {
  const t = useT();
  const reveal = async () => { try { await post(`/api/projects/${p.id}/reveal`); } catch (e) { toast(e.message, "error"); } };
  return <Menu trigger={<MoreHorizontal size={16} />} label={t("Actions for {title}", { title: p.title })} items={[
    { label: t("Rename"), icon: <Pencil size={14} />, onSelect: onRename, disabled: p.missing },
    { label: t("Show in folder"), icon: <FolderOpen size={14} />, onSelect: reveal, disabled: p.missing },
    ...(p.missing ? [{ label: t("Locate project…"), icon: <FolderInput size={14} />, onSelect: onLocate }] : []),
    { label: t("Duplicate"), icon: <Plus size={14} />, onSelect: () => {}, disabled: true, title: t("Coming later") },
    "-",
    { label: t("Remove from list"), icon: <Trash2 size={14} />, onSelect: onRemove, danger: true },
  ]} />;
}

/** The card's actions: icon buttons at the end of the status row; the card itself opens the project, so there is no Open. */
function CardActions({ p, onRename, onRemove, onLocate, toast }) {
  const t = useT();
  const stop = (fn) => (e) => { e.stopPropagation(); fn(); };
  const reveal = async () => { try { await post(`/api/projects/${p.id}/reveal`); } catch (e) { toast(e.message, "error"); } };
  return <div className="card-icons" onClick={(e) => e.stopPropagation()}>
    {p.missing ? <button className="btn ghost sm" onClick={stop(onLocate)}><FolderInput size={14} />{t("Locate project…")}</button>
      : <><button className="btn ghost icon sm" onClick={stop(onRename)} aria-label={t("Rename")}><Pencil size={15} /></button>
        <button className="btn ghost icon sm" onClick={stop(reveal)} aria-label={t("Show in folder")}><FolderOpen size={15} /></button></>}
    <button className="btn ghost icon sm danger" onClick={stop(onRemove)} aria-label={t("Remove from list")}><Trash2 size={15} /></button>
  </div>;
}

function PathDialog({ title, icon, help, cta, onClose, onSubmit }) {
  const t = useT();
  const [path, setPath] = useState("");          // starts empty: a project's old address is never shown
  const [drive, setDrive] = useState(false);
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);
  const submit = async (e) => { e?.preventDefault(); setBusy(true); setErr(null); try { await onSubmit(path.trim()); } catch (x) { setErr(x.message); } finally { setBusy(false); } };
  return <Dialog icon={icon} title={title} onClose={onClose} footer={<><span className="spacer" /><button className="btn" onClick={onClose}>{t("Cancel")}</button>
    <button className="btn primary" onClick={submit} disabled={!path.trim() || busy}><FolderInput size={14} />{cta}</button></>}>
    <form onSubmit={submit} className="field">
      <label htmlFor="pathIn">{t("Project folder")}</label>
      <FolderField id="pathIn" editable value={path} drive={drive} title={title} placeholder={t("The film's folder")}onChange={(v, dr) => { setPath(v); setDrive(!!dr); }} />
      <span className="hint">{help}</span>
      {err && <span className="error-text" role="alert">{err}</span>}
    </form>
  </Dialog>;
}

export default function Projects() {
  const t = useT();
  const toast = useToast();
  const { data, error, loading, reload } = useData(() => get("/api/projects"));
  const [q, setQ] = usePref("projects:q", "");
  const [filter, setFilter] = usePref("projects:filter", "all");
  const [sort, setSort] = usePref("projects:sort", "opened");
  const [view, setView] = usePref("projects:view", "grid");
  const [dlg, setDlg] = useState(null);
  const enter = useFirstVisit("projects");
  const studio = useThemeId() === "studio";
  // the cards a step smaller, and pages under the grid (as on Motion Library) instead of a scroll: a page holds the
  // columns the width gives times the rows that fit above the pager
  const [page, setPage] = useState(0);
  // the gallery pages' one grid: the columns that leave the least room under the whole rows that fit above the pager, each card's
  // picture in its one 16:9 frame; the pager sits right under the last row
  const grid = useGalleryGrid({ card: ".project-card", media: ".card-thumb", min: 16, max: 24, room: (el, rem) => window.innerHeight - el.getBoundingClientRect().top - 3.75 * rem });          // the pager's own height under the rows
  const per = grid.size;
  useEffect(() => setPage(0), [q, filter, sort]);

  const items = useMemo(() => {
    let list = (data?.projects ?? []).filter((p) => (filter === "all" || statusOf(p) === filter) && (!q || p.title.toLowerCase().includes(q.toLowerCase())));
    const key = { opened: (p) => p.openedAt ?? p.updatedAt ?? "", updated: (p) => p.updatedAt ?? "", name: (p) => p.title.toLowerCase() }[sort];
    list = [...list].sort((a, b) => sort === "name" ? key(a).localeCompare(key(b)) : key(b).localeCompare(key(a)));
    return list;
  }, [data, q, filter, sort]);
  const pageNow = Math.min(page, Math.max(0, Math.ceil(items.length / per) - 1));

  const openExisting = async (path) => {
    const p = await post("/api/projects/open", { path });
    toast(t("Imported “{title}”: it stays in its folder", { title: p.title }));
    if (p.gitOnDrive) return setDlg({ kind: "move-git", p });          // a Drive project with its own .git folder: ask before moving it
    setDlg(null); go(`/projects/${p.id}`);
  };
  const moveGit = async (p) => { try { await post(`/api/projects/${p.id}/move-git`); toast(t("History moved to this PC")); } catch (e) { toast(e.message, "error"); } setDlg(null); go(`/projects/${p.id}`); };
  const rename = async (p, title) => { await patch(`/api/projects/${p.id}`, { title }); setDlg(null); toast(t("Project renamed")); reload(); };
  const remove = async (p) => { await del(`/api/projects/${p.id}`); setDlg(null); toast(t("“{title}” removed from the list; its folder stays", { title: p.title })); reload(); };
  const locate = async (p, path) => { await post(`/api/projects/${p.id}/relocate`, { path }); setDlg(null); toast(t("Project found")); reload(); };

  const empty = !loading && !error && (data?.projects ?? []).length === 0;
  // a project whose folder was deleted or moved outside the app opens a small dialog on this page (Back / Relink…)
  const openProject = (p) => (p.missing ? setDlg({ kind: "gone", p }) : go(`/projects/${p.id}`));
  const dialogs = <>
      {dlg?.kind === "open" && <PathDialog icon={<FolderInput size={18} />} title={t("Import project")} cta={t("Import")} onClose={() => setDlg(null)} onSubmit={openExisting}
        help={t("A film project folder anywhere on this PC. It stays where it is.")} />}
      {dlg?.kind === "move-git" && <Dialog icon={<FolderInput size={18} />} title={t("Keep this project's history on this PC?")} onClose={() => { setDlg(null); go(`/projects/${dlg.p.id}`); }} footer={<><span className="spacer" />
        <button className="btn" onClick={() => { setDlg(null); go(`/projects/${dlg.p.id}`); }}>{t("Leave it on Drive")}</button>
        <button className="btn primary" onClick={() => moveGit(dlg.p)}>{t("Move the history")}</button></>}>
        {/* one idea a line; no folder is named (no paths in the UI) */}
        <div className="dlg-lines"><p>{t("This project is on Google Drive.")}</p>
          <p>{t("Its edit history stays on this PC, so Drive does not sync thousands of small files.")}</p><p>{t("The film itself stays on Drive.")}</p>
          <p className="hint">{t("The history is copied to the app's own folder and checked before the project points to it.")}</p></div></Dialog>}
      {dlg?.kind === "gone" && <Dialog icon={<AlertTriangle size={18} />} title={t("This project's folder is gone")} onClose={() => setDlg(null)} footer={<><span className="spacer" />
        <button className="btn" onClick={() => setDlg(null)}>{t("Back")}</button>
        <button className="btn primary" onClick={() => setDlg({ kind: "locate", p: dlg.p })}><FolderSearch size={14} />{t("Relink…")}</button></>}>
        <div className="dlg-lines"><p className="dlg-warn">{t("“{title}” was deleted, moved or renamed outside the app.", { title: dlg.p.title })}</p>
          <p className="hint">{t("If you moved it, Relink and choose where it is now.")}</p></div></Dialog>}
      {dlg?.kind === "locate" && <PathDialog icon={<FolderSearch size={18} />} title={t("Locate “{title}”", { title: dlg.p.title })} cta={t("Use this folder")} onClose={() => setDlg(null)} onSubmit={(path) => locate(dlg.p, path)}
        help={t("The folder was moved or renamed. Paste where it is now.")} />}
      {dlg?.kind === "rename" && <RenameDialog p={dlg.p} onClose={() => setDlg(null)} onSubmit={(t) => rename(dlg.p, t)} />}
      {dlg?.kind === "remove" && <Dialog icon={<ListX size={18} />} danger title={t("Remove from list?")} onClose={() => setDlg(null)} footer={<><span className="spacer" /><button className="btn" onClick={() => setDlg(null)}>{t("Cancel")}</button>
        <button className="btn danger" onClick={() => remove(dlg.p).catch((e) => toast(e.message, "error"))}><ListX size={14} />{t("Remove from list")}</button></>}>
        <div className="dlg-lines"><p className="dlg-warn">{t("“{title}” leaves this list.", { title: dlg.p.title })}</p><p>{t("Its folder stays on the computer.")}</p>
          <p className="hint">{t("Bring it back with Import project.")}</p></div></Dialog>}
  </>;
  // The Studio: the same data and dialogs, as the reel wall (studio/ReelWall.jsx: the film in hand on top, every film on two shelves)
  if (studio) return <ReelWall data={data} error={error} loading={loading} reload={reload} intro={<Intro hint={t("Start a film with the card on the left.")} />} dialogs={dialogs}
    onAction={(kind, p) => (kind === "error" ? toast(p.message, "error") : setDlg(kind === "open" ? { kind } : { kind, p }))} />;
  return (
    <div className="page">
      <div className="page-head">
        <div><h1>{t("Projects")}</h1></div>
        <div className="actions">
          <button className="btn" onClick={() => setDlg({ kind: "open" })}><FolderInput size={16} />{t("Import project")}</button>
          <button className="btn primary" onClick={() => go("/new")}><Plus size={16} />{t("New project")}</button>
        </div>
      </div>

      {!empty && <div className="toolbar">
        <div className="search"><Search size={15} /><input className="input" placeholder={t("Search projects")} value={q} onChange={(e) => setQ(e.target.value)} aria-label={t("Search projects")} /></div>
        <div className="segmented" role="group" aria-label={t("Filter")}>{FILTERS.map(([k, l, I]) => <button key={k} aria-pressed={filter === k} onClick={() => setFilter(k)}><I size={13} />{t(l)}</button>)}</div>
        <span className="select-wrap"><ArrowDownUp size={14} /><select className="select" value={sort} onChange={(e) => setSort(e.target.value)} aria-label={t("Sort")}>
          {SORTS.map(([k, l]) => <option key={k} value={k}>{t(l)}</option>)}</select></span>
        <div className="segmented" role="group" aria-label={t("View")}>
          <button aria-pressed={view === "grid"} onClick={() => setView("grid")} title={t("Grid")} aria-label={t("Grid view")}><LayoutGrid size={14} /></button>
          <button aria-pressed={view === "list"} onClick={() => setView("list")} title={t("List")} aria-label={t("List view")}><List size={14} /></button>
        </div>
      </div>}

      {error && <Banner kind="error" action={<button className="btn sm" onClick={reload}><RotateCw size={13} />{t("Retry")}</button>}>{t("Could not load the projects.")} {error.message}</Banner>}

      {loading && !data && <>
        <div className="loading-line" role="status"><span className="loading-mark" aria-hidden="true"><span className="brand-mark" /></span>{t("Opening your projects…")}</div>
        <div className="grid">{Array.from({ length: 6 }, (_, i) => <div key={i} className="skeleton" style={{ height: "18rem" }} />)}</div></>}

      {/* the empty Projects page: the logo intro; the top-right buttons create and import */}
      {empty && <Intro />}

      {data && !empty && items.length === 0 && <div className="empty"><p>{t("No project matches.")}</p><button className="btn sm" onClick={() => { setQ(""); setFilter("all"); }}><FilterX size={13} />{t("Clear filters")}</button></div>}

      {view === "grid" && items.length > 0 && <div ref={grid.ref} style={grid.style} className={"grid project-grid" + (enter ? " enter" : "")}>{items.slice(pageNow * per, pageNow * per + per).map((p, i) => (
        <article key={p.id} className="card clickable project-card" style={{ "--i": i }} onClick={() => openProject(p)}
          tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter") openProject(p); }} aria-label={t("Open {title}", { title: p.title })}>
          <Thumb p={p} />
          <div className="card-body">
            <div className="card-title one-line" title={p.title}>{p.title}</div>
            {p.missing ? <div className="card-meta"><span className="status warning"><AlertTriangle size={13} />{t("Folder not found")}</span></div>
              : <div className="card-tags">
                <span className="chip tag-aspect num">{p.aspect ?? (p.width ? `${p.width}×${p.height}` : "–")}</span>
                {p.style && <span className="chip tag-style" title={t(p.style.title)}>{t(p.style.title)}</span>}</div>}
            {/* on the smaller card the date sits on the progress line, the foot keeps the state and the buttons */}
            <div className="card-prog">{!p.missing && <Gauge stage={p.stage} progress={p.progress} done={statusOf(p) === "exported"} label={false} />}<span className="when">{ago(p.updatedAt).replace(` ${new Date().getFullYear()}`, "")}</span></div>
          </div>
          <div className="card-foot">
            <StatusChip p={p} t={t} /><span className="spacer" />
            <CardActions p={p} toast={toast} onRename={() => setDlg({ kind: "rename", p })} onRemove={() => setDlg({ kind: "remove", p })} onLocate={() => setDlg({ kind: "locate", p })} />
          </div>
        </article>))}</div>}
      {view === "grid" && items.length > per && <Pager page={pageNow} size={per} total={items.length} onPage={setPage} />}

      {view === "list" && items.length > 0 && <div className="list" role="list">{items.map((p) => (
        <div key={p.id} className="list-row" role="listitem" tabIndex={0} onClick={() => openProject(p)} onKeyDown={(e) => { if (e.key === "Enter") openProject(p); }}>
          <div className="list-thumb">{p.thumbnailUrl && <img className="card-img" src={p.thumbnailUrl} alt="" loading="lazy" />}</div>
          <div style={{ minWidth: 0 }}><div className="card-title">{p.title}</div><div className="card-meta">{p.missing ? t("Folder not found") : <Gauge stage={p.stage} progress={p.progress} done={statusOf(p) === "exported"} />}</div></div>
          <div className="hide-sm">{p.style ? <span className="chip tag-style" title={t(p.style.title)}>{t(p.style.title)}</span> : <span className="muted">{t("No style")}</span>}</div>
          <div className="hide-sm">{p.aspect ? <span className="chip tag-aspect num">{p.aspect}</span> : <span className="muted">–</span>}</div>
          <div className="hide-sm num secondary">{p.duration > 0 ? clock(p.duration) : "–"}</div>
          <div className="hide-sm when">{ago(p.updatedAt)}</div>
          <div style={{ display: "flex", justifyContent: "flex-end" }}><ProjectMenu p={p} toast={toast} onRename={() => setDlg({ kind: "rename", p })}
            onRemove={() => setDlg({ kind: "remove", p })} onLocate={() => setDlg({ kind: "locate", p })} /></div>
        </div>))}</div>}

      {dialogs}
    </div>
  );
}

function RenameDialog({ p, onClose, onSubmit }) {
  const t = useT();
  const [name, setName] = useState(p.title);
  const [err, setErr] = useState(null);
  const submit = async (e) => { e?.preventDefault(); try { await onSubmit(name.trim()); } catch (x) { setErr(x.message); } };
  return <Dialog icon={<Pencil size={18} />} title={t("Rename project")} onClose={onClose} footer={<><span className="spacer" /><button className="btn" onClick={onClose}>{t("Cancel")}</button>
    <button className="btn primary" onClick={submit} disabled={!name.trim()}><Pencil size={14} />{t("Rename")}</button></>}>
    <form className="field" onSubmit={submit}><label htmlFor="rn">{t("Project name")}</label><input id="rn" className="input" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
      <span className="hint">{t("The folder keeps its name.")}</span>{err && <span className="error-text">{err}</span>}</form>
  </Dialog>;
}
