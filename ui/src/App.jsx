// App shell: top bar (with the Claude chip and the quiet "A new version is ready" line), left navigation rail, routed screens. A project
// opens in the Editor; its stages are sheets there, so their old addresses open the Editor with that sheet.
import { useEffect, useRef, useState } from "react";
// the rail's icons (owner #1315, #1318): a film studio's: the clapperboard, the script, the masks, film, the swatch book, the camera, the faders
import { CheckCircle2, Clapperboard, Drama, Film, Frame, PanelLeftClose, PanelLeftOpen, ScrollText, SlidersHorizontal, SwatchBook, Video,
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
import WritersRoom from "./screens/WritersRoom.jsx";
import Thumbnails from "./screens/Thumbnails.jsx";
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
import { takeAttention } from "./workflow/attention.js";          // the app waits for the user: said in Windows while the window is not in use
import ActivityChip, { nameOf } from "./workflow/ActivityChip.jsx";          // the work chip: a click lists what runs and what just ended (#1322)

function Toasts({ items, hold = () => {} }) {
  return <div className="toasts" aria-live="polite">{items.map((t) => (
    <div key={t.id} className={"toast " + t.kind + (t.leaving ? " leaving" : "")} role={t.kind === "error" ? "alert" : undefined}
      onMouseEnter={() => hold(t.id, true)} onMouseLeave={() => hold(t.id, false)}>{t.kind === "error" ? <XCircle size={16} /> : <CheckCircle2 size={16} />}{t.text}</div>))}</div>;
}

/** The app's pages, once for both themes (audit/112c c2.3): The Desk's rail and The Studio's paper tabs, in the order of a real production,
 *  the ones used most first (owner 07/11): the films, then Development (Writers' Room), Pre-production (Film Styles, Casting, Brand Kits),
 *  Production (Motion Library), Release (Thumbnails). Studio Settings is the rail's foot in The Desk and the gear in The Studio. The labels
 *  differ from the route names; the routes stay. */
export const PAGES = [["/projects", "Productions", Clapperboard], ["/ideas", "Writers' Room", ScrollText], ["/styles", "Film Styles", Film], ["/characters", "Casting", Drama],
  ["/looks", "Brand Kits", SwatchBook], ["/library", "Motion Library", Video], ["/thumbnails", "Thumbnails", Frame]];
/** Is this page the one open? (Productions holds the films' Editors and New production.) */
const onPage = (path, to) => (to === "/projects" ? path === "/projects" || path.startsWith("/projects/") || path === "/new" : path.startsWith(to));

function Rail({ path, updateReady = false }) {
  const t = useT();
  const item = (to, icon, label, extra) => {
    const active = onPage(path, to);
    return <a key={to} className={"rail-item" + (active ? " active" : "")} href={"#" + to} aria-current={active ? "page" : undefined} title={label}>{icon}<span>{label}</span>{extra}</a>;
  };
  return (
    <nav className="rail" aria-label={t("Main")}>
      {PAGES.map(([to, label, Icon]) => item(to, <Icon size={18} />, t(label)))}
      <div className="rail-bottom">{item("/settings", <SlidersHorizontal size={18} />, t("Studio Settings"), <UpdateDot on={updateReady} />)}</div>
    </nav>
  );
}

// The Studio theme: no left rail; the top bar is the peg bar, an animator's peg bar with its three pegs, the pages (PAGES)
// hanging from it as paper tabs (the page in hand is the lit sheet); Settings is the gear beside the Claude lamp.
function Pegs({ path }) {
  const t = useT();
  const on = (to) => onPage(path, to);
  return <nav className="pegs" aria-label={t("Main")}><span className="peg slot" aria-hidden="true" />
    <span className="peg-tabs">{PAGES.map(([to, label]) => <a key={to} className="peg-tab" href={"#" + to} aria-current={on(to) ? "page" : undefined}>{t(label)}</a>)}</span>
    <span className="peg round" aria-hidden="true" /><span className="peg slot" aria-hidden="true" /></nav>;
}

// The top bar's chip says one of four states, the server's alone (GET /tasks/running state and about: an update, then a download, then any
// work, background work included; audit/112c c1.2, c2.4): the UI keeps no rule of its own.
/** The screen's key: a film's Editor stays one screen whatever sheet its address opens (/projects/<id>/mix): a new key would build the
 *  Editor again and its reads and its /edit/prepare with it (audit/112c c1.1); every other address keeps its whole path. */
export const screenKey = (seg) => (seg[0] === "projects" && seg[1] ? seg.slice(0, 2) : seg).join("/");
// the hover line: the first thing running, its name without the bracketed detail (never a file name), its percent, and how many more
const busyTip = (tasks, jobs, st, about, t) => {
  const pick = st === "working" ? (tasks[0] ? { title: t("Claude is working on {title}", { title: tasks[0].title }) } : jobs[0])
    : st === "updating" || st === "downloading" ? jobs.find((j) => j.title === about) ?? (about ? { title: about } : null) : null;
  if (!pick) return "";
  const name = nameOf(pick).slice(0, 48);
  const more = tasks.length + jobs.length - 1;
  // two at once: both by name (a pitch and a script of the Writers Room, T41-2); more than two: the first and how many more
  const second = more === 1 ? (st === "working" ? [...tasks.map((x) => ({ title: t("Claude is working on {title}", { title: x.title }) })), ...jobs].filter((x) => x !== pick && x.title !== pick.title)[0] : null) : null;
  return [pick.project ? `${pick.project}: ${name}` : name, pick.progress != null ? `${Math.round(pick.progress)}%` : "", second ? nameOf(second) : more > 0 ? t("{n} more running", { n: more }) : ""].filter(Boolean).join(" · ");
};

/** A film's new version, for whoever is on another screen: one line with its Open, no jump (owner 31/10). On that film's own Editor it is passed over: the Editor takes the user to the version. */
const NOTICE_MS = 12000;          // how long a Writers Room notice stays
export function VersionNotices({ notices, path, onSeen }) {
  const t = useT();
  // a film's notice opens the film; another (the Writers Room's runs, #1115) carries its own address
  const link = (n) => n.href ?? `#/projects/${n.projectId}`;
  const here = (n) => (n.href ? path.split("?")[0] === n.href.replace(/^#/, "").split("?")[0] : path.split("?")[0].startsWith(`/projects/${n.projectId}`));
  useEffect(() => { for (const n of notices) if (here(n)) onSeen(n); }, [notices, path]); // eslint-disable-line react-hooks/exhaustive-deps
  // a Writers Room notice (it has its own address) is like a toast (T40-6): only the newest shows, an older one is seen at once, and
  // it goes by itself after a while; a film's new version stays until it is opened or closed
  const room = notices.filter((n) => n.href), newest = room.at(-1);
  useEffect(() => { for (const n of room) if (n !== newest) onSeen(n); }, [notices]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!newest) return undefined; const k = setTimeout(() => onSeen(newest), NOTICE_MS); return () => clearTimeout(k); }, [newest?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const shown = notices.filter((n) => !here(n) && (!n.href || n === newest));
  if (!shown.length) return null;
  return <div className="vnotices" role="status" aria-live="polite">{shown.slice(-3).map((n) => <div key={n.id} className="vnotice">
    <span className="t"><b>{n.title}</b>{t(n.text, n.vars)}</span>
    <a className="btn sm primary" href={link(n)} onClick={() => onSeen(n)}>{t("Open")}</a>
    <button type="button" className="btn ghost icon sm" onClick={() => onSeen(n)} aria-label={t("Close")}><X size={14} /></button></div>)}</div>;
}

function TopBar({ crumbs, collapsed, setCollapsed, studio = false, path = "", update = null }) {
  const t = useT();
  const [running, setRunning] = useState([]);
  const [notices, setNotices] = useState([]);
  const seen = (n) => { setNotices((x) => x.filter((y) => y.id !== n.id)); post(`/api/notices/${n.id}/seen`).catch(() => {}); };
  const [bg, setBg] = useState([]);
  const [recent, setRecent] = useState([]);          // what ended in the last half hour (the work list, #1322)
  const [srv, setSrv] = useState(null);          // the server's one word, the rule that counts
  const [about, setAbout] = useState(null);          // what the server says the update or the download is
  const [hot, setHot] = useState(false);         // the computer has been very busy for minutes while the app works
  useEffect(() => {
    let alive = true;
    const tick = async () => { try { const r = await get("/api/tasks/running"); if (alive) { setRunning(r.tasks); setBg(r.jobs ?? []); setRecent(r.recent ?? []); setSrv(r.state ?? null); setAbout(r.about ?? null); setHot(!!r.machineBusy); setNotices(r.notices ?? []); takeAttention(r.attention); setBusy(r.tasks.length + (r.jobs ?? []).length > 0); } } catch { /* offline shows elsewhere */ } if (alive) setTimeout(tick, 4000); };
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
      {/* one chip, four words (Idle, Working, Downloading, Updating), the first thing running on hover; a click lists all the work (#1322) */}
      {(() => { const st = srv ?? "idle"; return <ActivityChip st={st} tip={busyTip(running ?? [], bg, st, about, t)} tasks={running ?? []} jobs={bg} recent={recent} />; })()}
      <ClaudeChip />
      {studio && <a className={"btn ghost icon peg-gear" + (path.startsWith("/settings") ? " on" : "")} href="#/settings"
        aria-label={update?.ready ? `${t("Studio Settings")} · ${t("A new version is ready")}` : t("Studio Settings")} title={t("Studio Settings")}
        aria-current={path.startsWith("/settings") ? "page" : undefined}><SlidersHorizontal size={18} /><UpdateDot on={!!update?.ready} /></a>}
      <ExitButton />
      <VersionNotices notices={notices} path={path} onSeen={seen} />
    </header>
  );
}

// the stages that open as sheets in the Editor (their old page addresses still work)
const SHEETS = { storyboard: "storyboard", "motion-plan": "motion-plan", voice: "voice", qa: "qa", ae: "ae", export: "render", render: "render", brief: "brief", assets: "assets", mix: "mix", character: "character", characters: "character", lyrics: "lyrics" };

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
  const [crumbs, setCrumbs] = useState(null);
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
  else if (seg[0] === "ideas") screen = <WritersRoom tab={seg[1] ?? "research"} id={new URLSearchParams(path.split("?")[1] ?? "").get("id")} />;
  else if (seg[0] === "library") screen = <Library />;
  else if (seg[0] === "thumbnails") screen = <Thumbnails id={new URLSearchParams(path.split("?")[1] ?? "").get("id")} />;
  else if (seg[0] === "settings") screen = <Settings section={seg[1] ?? "general"} claude={claude?.status ?? { loggedIn: false }} onRecheckClaude={() => claude?.refresh(true)} updateReady={update.ready} />;
  else screen = <Projects />;

  return (
    <ToastProvider render={(items, hold) => <Toasts items={items} hold={hold} />}>
      <div className={"shell" + (collapsed ? " rail-collapsed" : "")}>
        <TopBar crumbs={crumbs} collapsed={collapsed} setCollapsed={setCollapsed} studio={studio} path={path} update={update} />
        {!studio && <Rail path={path} updateReady={update.ready} />}
        <main className="main" id="main"><ErrorBoundary key={screenKey(seg)} name={tr("this screen")}>{screen}</ErrorBoundary></main>
        <FirstRun />
      </div>
    </ToastProvider>
  );
}
