// App shell: top bar (with the Claude chip and the quiet "A new version is ready" line), left navigation rail, routed screens. A project
// opens in the Editor; its stages are sheets there, so their old addresses open the Editor with that sheet.
import { useEffect, useRef, useState } from "react";
import { CheckCircle2, LayoutGrid, Library as LibraryIcon, PanelLeftClose, PanelLeftOpen, Settings as Gear, Palette, Smile, Sparkles,
  X, XCircle } from "lucide-react";
import { get, holdPresence, post, setBusy } from "./api.js";
import { ToastProvider, go, usePref, useRoute } from "./lib.jsx";
import { tr, useT } from "./i18n.jsx";
import ErrorBoundary from "./ErrorBoundary.jsx";          // one broken screen shows a message, not a blank app
import "./wheel.js";          // the wheel scrolls sideways galleries
import Projects from "./screens/Projects.jsx";
import StyleGallery from "./screens/StyleGallery.jsx";
import Looks from "./screens/Looks.jsx";
import Characters from "./screens/Characters.jsx";
import Editor from "./screens/Editor.jsx";
import Settings from "./screens/Settings.jsx";
import Library from "./screens/Library.jsx";
import NewProjectDialog from "./workflow/NewProjectDialog.jsx";
import { ClaudeChip, ClaudeProvider, useClaude } from "./workflow/claude.jsx";
import FirstRun from "./workflow/FirstRun.jsx";          // the first-start dialogs: the look, then Set up
import ExitButton from "./ExitButton.jsx";
import AiMark from "./intro/AiMark.jsx";   // "AI motion studio" beside the name
import { useThemeId } from "./theme.jsx";
import { UpdateDot, UpdateLine, useUpdateNotice } from "./workflow/UpdateNotice.jsx";          // "A new version is ready"

function Toasts({ items }) {
  return <div className="toasts" aria-live="polite">{items.map((t) => (
    <div key={t.id} className={"toast " + t.kind + (t.leaving ? " leaving" : "")}>{t.kind === "error" ? <XCircle size={16} /> : <CheckCircle2 size={16} />}{t.text}</div>))}</div>;
}

function Rail({ path, count, updateReady = false }) {
  const t = useT();
  const item = (to, icon, label, extra) => {
    const active = to === "/projects" ? path === "/projects" || path.startsWith("/projects/") || path === "/new" : path.startsWith(to);
    return <a className={"rail-item" + (active ? " active" : "")} href={"#" + to} aria-current={active ? "page" : undefined} title={label}>{icon}<span>{label}</span>{extra}</a>;
  };
  return (
    <nav className="rail" aria-label={t("Main")}>
      {item("/projects", <LayoutGrid size={18} />, t("Projects"))}
      {item("/looks", <Palette size={18} />, t("Brand Kits"))}          {/* the labels differ from the route names; the routes stay */}
      {item("/styles", <Sparkles size={18} />, t("Film Styles"))}
      {item("/library", <LibraryIcon size={18} />, t("Motion Library"))}
      {item("/characters", <Smile size={18} />, t("Characters"))}
      <div className="rail-bottom">{item("/settings", <Gear size={18} />, t("Settings"), <UpdateDot on={updateReady} />)}</div>
    </nav>
  );
}

// The Studio theme: no left rail; the top bar is the peg bar, an animator's peg bar with its three pegs, the pages
// hanging from it as paper tabs (the page in hand is the lit sheet); Settings is the gear beside the Claude lamp.
const PEG_TABS = [["/projects", "Projects"], ["/styles", "Film Styles"], ["/characters", "Characters"], ["/looks", "Brand Kits"], ["/library", "Motion Library"]];
function Pegs({ path }) {
  const t = useT();
  const on = (to) => (to === "/projects" ? path === "/projects" || path.startsWith("/projects/") || path === "/new" : path.startsWith(to));
  return <nav className="pegs" aria-label={t("Main")}><span className="peg slot" aria-hidden="true" />
    <span className="peg-tabs">{PEG_TABS.map(([to, label]) => <a key={to} className="peg-tab" href={"#" + to} aria-current={on(to) ? "page" : undefined}>{t(label)}</a>)}</span>
    <span className="peg round" aria-hidden="true" /><span className="peg slot" aria-hidden="true" /></nav>;
}

// The top bar's chip says one of four states, the server's (GET /tasks/running state: an update, then a download,
// then any work); the same rule here only for a server that does not send it yet.
const DOWNLOAD_KINDS = new Set(["first-run", "model-install", "offline-assets", "style-source", "setup-python", "setup-hf-skills"]);
const BUSY_WORD = { working: "Working", downloading: "Downloading", updating: "Updating" };
const busyState = (tasks, jobs) => jobs.some((j) => j.kind === "app-update") ? "updating" : jobs.some((j) => DOWNLOAD_KINDS.has(j.kind)) ? "downloading"
  : tasks.length || jobs.length ? "working" : "idle";
// the hover line: the first thing running, its name without the bracketed detail (never a file name), its percent, and how many more
const busyTip = (tasks, jobs, st, t) => {
  const pick = st === "working" ? (tasks[0] ? { title: t("Claude is working on {title}", { title: tasks[0].title }) } : jobs.find((j) => !DOWNLOAD_KINDS.has(j.kind) && j.kind !== "app-update"))
    : jobs.find((j) => (st === "updating" ? j.kind === "app-update" : DOWNLOAD_KINDS.has(j.kind)));
  if (!pick) return "";
  const name = String(pick.label ?? pick.title ?? "").replace(/\s*\(.*?\)\s*/g, " ").replace(/\s+/g, " ").trim().slice(0, 48);
  const more = tasks.length + jobs.length - 1;
  return [pick.project ? `${pick.project}: ${name}` : name, pick.progress != null ? `${pick.progress}%` : "", more > 0 ? t("{n} more running", { n: more }) : ""].filter(Boolean).join(" · ");
};

/** A film's new version, for whoever is on another screen: one line with its Open, no jump (owner 31/10). On that film's own Editor it is passed over: the Editor takes the user to the version. */
export function VersionNotices({ notices, path, onSeen }) {
  const t = useT();
  const here = (n) => path.split("?")[0].startsWith(`/projects/${n.projectId}`);
  useEffect(() => { for (const n of notices) if (here(n)) onSeen(n); }, [notices, path]); // eslint-disable-line react-hooks/exhaustive-deps
  const shown = notices.filter((n) => !here(n));
  if (!shown.length) return null;
  return <div className="vnotices" role="status" aria-live="polite">{shown.slice(-3).map((n) => <div key={n.id} className="vnotice">
    <span className="t"><b>{n.title}</b>{t(n.text, n.vars)}</span>
    <a className="btn sm primary" href={`#/projects/${n.projectId}`} onClick={() => onSeen(n)}>{t("Open")}</a>
    <button type="button" className="btn ghost icon sm" onClick={() => onSeen(n)} aria-label={t("Close")}><X size={14} /></button></div>)}</div>;
}

function TopBar({ crumbs, collapsed, setCollapsed, studio = false, path = "", update = null }) {
  const t = useT();
  const [running, setRunning] = useState([]);
  const [notices, setNotices] = useState([]);
  const seen = (n) => { setNotices((x) => x.filter((y) => y.id !== n.id)); post(`/api/notices/${n.id}/seen`).catch(() => {}); };
  const [bg, setBg] = useState([]);
  const [srv, setSrv] = useState(null);          // the server's one word, the rule that counts
  const [hot, setHot] = useState(false);         // the computer has been very busy for minutes while the app works
  useEffect(() => {
    let alive = true;
    const tick = async () => { try { const r = await get("/api/tasks/running"); if (alive) { setRunning(r.tasks); setBg(r.jobs ?? []); setSrv(r.state ?? null); setHot(!!r.machineBusy); setNotices(r.notices ?? []); setBusy(r.tasks.length + (r.jobs ?? []).length > 0); } } catch { /* offline shows elsewhere */ } if (alive) setTimeout(tick, 4000); };
    tick(); return () => { alive = false; };
  }, []);
  return (
    <header className={studio ? "topbar pegbar" : "topbar"}>
      {!studio && <button className="btn ghost icon sm collapse-toggle" onClick={() => setCollapsed((c) => !c)} aria-label={collapsed ? t("Expand navigation") : t("Collapse navigation")}
        title={collapsed ? t("Expand navigation") : t("Collapse navigation")}>{collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}</button>}
      <a className="brand" href="#/projects" aria-label="Moworks AI motion studio">
        <span className="brand-mark" aria-hidden="true" /><span className="brand-word" aria-hidden="true" />
        <span className="brand-sub" aria-hidden="true"><AiMark />motion studio</span></a>
      {studio ? <Pegs path={path} /> : crumbs && <div className="crumbs" aria-label={t("Breadcrumb")}><span aria-hidden="true">/</span>{crumbs.map((c, i) => <span key={i}>{c}</span>)}</div>}
      <div className="topbar-spacer" />
      <div className="topbar-slot" id="topbar-slot" />
      <UpdateLine notice={update} />
      {hot && <div className="upd-notice studio-paper" role="status" title={t("Closing other apps or waiting for other films to finish will help.")}>
        <span className="dot warning" aria-hidden="true" /><span className="upd-say">{t("This computer is very busy, so this will take longer")}</span></div>}
      <span className="sr-only" role="status" aria-live="polite">{running?.length ? t("Claude is working on {title}", { title: running[0].title }) : bg.length ? `${(bg[0].label ?? bg[0].title)}${bg[0].progress != null ? ` · ${bg[0].progress}%` : ""}` : t("Nothing is running")}</span>
      {/* one chip, four words (Idle, Working, Downloading, Updating); what runs and how far only on hover, one short line */}
      {(() => { const st = srv ?? busyState(running ?? [], bg); const tip = busyTip(running ?? [], bg, st, t);
        return st === "idle" ? <span className="chip-status idle" title={t("Claude tasks, exports, checks and transcription show here while they run")} aria-label={t("Nothing is running")}><span className="dot ok" aria-hidden="true" />{t("Idle")}</span>
          : <a className="chip-status" href={st === "working" && (running?.[0]?.projectId ?? bg.find((j) => j.projectId)?.projectId) ? `#/projects/${running?.[0]?.projectId ?? bg.find((j) => j.projectId).projectId}` : "#/settings/runtime"}
            title={tip} aria-label={tip}><span className="dot busy" aria-hidden="true" />{t(BUSY_WORD[st])}</a>; })()}
      <ClaudeChip />
      {studio && <a className={"btn ghost icon peg-gear" + (path.startsWith("/settings") ? " on" : "")} href="#/settings"
        aria-label={update?.ready ? `${t("Settings")} · ${t("A new version is ready")}` : t("Settings")} title={t("Settings")}
        aria-current={path.startsWith("/settings") ? "page" : undefined}><Gear size={18} /><UpdateDot on={!!update?.ready} /></a>}
      <ExitButton />
      <VersionNotices notices={notices} path={path} onSeen={seen} />
    </header>
  );
}

// the stages that open as sheets in the Editor (their old page addresses still work)
const SHEETS = { storyboard: "storyboard", "motion-plan": "motion-plan", voice: "voice", qa: "qa", ae: "ae", export: "render", render: "render", brief: "brief", assets: "assets", mix: "mix", character: "character", characters: "character" };

let held = false;
export default function App() {
  if (!held) { held = true; holdPresence(); }          // closing the last app window stops the app (after ~10 s)
  return <ClaudeProvider><Shell /></ClaudeProvider>;
}

/** The shell without App's presence stream (test/studio-ui.test.mjs renders it on its own). `update`: an answer of GET /api/app/update
 *  to start from (the render tests; the app reads it itself). */
export function Shell({ update: firstUpdate = null } = {}) {
  const path = useRoute();
  const claude = useClaude();
  const studio = useThemeId() === "studio";
  const update = useUpdateNotice(firstUpdate);          // the app's own check: a dot on Settings and a slim line in the top bar
  const [railCollapsed, setRailCollapsed] = usePref("rail-collapsed", false);
  // In the Editor the sidebar folds to its icon strip for more room, every time a project opens; the
  // top-left toggle opens it with its words. It is never hidden (its own setting, apart from the other screens').
  const [railShownInEditor, setRailShownInEditor] = usePref("rail-shown-in-editor", false);
  const [count, setCount] = useState(null);
  const [crumbs, setCrumbs] = useState(null);
  useEffect(() => { get("/api/projects").then((r) => setCount(r.projects.length)).catch(() => {}); }, [path]);
  useEffect(() => { if (!path.startsWith("/projects/")) setCrumbs(null); }, [path]);

  const seg = path.split("?")[0].split("/").filter(Boolean);
  const inEditor = seg[0] === "projects" && !!seg[1];
  const wasEditor = useRef(false);
  useEffect(() => { if (inEditor && !wasEditor.current) setRailShownInEditor(false); wasEditor.current = inEditor; }, [inEditor]); // eslint-disable-line react-hooks/exhaustive-deps
  const collapsed = inEditor ? !railShownInEditor : railCollapsed;
  const setCollapsed = inEditor ? (f) => setRailShownInEditor((shown) => !(typeof f === "function" ? f(!shown) : f)) : setRailCollapsed;
  let screen;
  if (seg[0] === "new") screen = <><Projects /><NewProjectDialog onClose={() => go("/projects")} /></>;
  else if (seg[0] === "projects" && seg[1]) screen = <Editor id={seg[1]} setCrumbs={setCrumbs} open={SHEETS[seg[2]] ?? null} />;
  else if (seg[0] === "styles") screen = <StyleGallery />;
  else if (seg[0] === "looks") screen = <Looks kitId={seg.slice(1).join("/") || null} />;
  else if (seg[0] === "characters") screen = <Characters />;
  else if (seg[0] === "library") screen = <Library />;
  else if (seg[0] === "settings") screen = <Settings section={seg[1] ?? "general"} claude={claude?.status ?? { loggedIn: false }} onRecheckClaude={() => claude?.refresh(true)} updateReady={update.ready} />;
  else screen = <Projects />;

  return (
    <ToastProvider render={(items) => <Toasts items={items} />}>
      <div className={"shell" + (collapsed ? " rail-collapsed" : "")}>
        <TopBar crumbs={crumbs} collapsed={collapsed} setCollapsed={setCollapsed} studio={studio} path={path} update={update} />
        {!studio && <Rail path={path} count={count} updateReady={update.ready} />}
        <main className="main" id="main"><ErrorBoundary key={seg.join("/")} name={tr("this screen")}>{screen}</ErrorBoundary></main>
        <FirstRun />
      </div>
    </ToastProvider>
  );
}
