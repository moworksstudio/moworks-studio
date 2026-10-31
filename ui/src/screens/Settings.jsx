// Settings: grouped sections with real health checks from the backend. Every check says what to do next. Nothing is
// installed or downloaded without a confirmation that states the size and the source (speech-to-text models).
// One round simpler. The selected section names the page (no second title); each setting has one short line, the
// longer explanation in a quiet "?" tooltip; technical lists sit behind a single "Details" fold; no paths (the projects folder by its name).
// Second round: four sections. General in small groups (Account, Projects folder,
// Appearance, Render & export), Director (the AI that makes the films: model, effort, mode, web, bypass), System (what runs the app: the
// components as one line with Install, or Check again when something is wrong, and only what needs the user; Voice-over; the optional
// extras; "Open-source licences" folded; backups one line), Update.
// Old addresses (ai, workspace, voice, styles, ae, models) land in their new place. Whatever waits on the server shows a skeleton at once.
import { useEffect, useState } from "react";
import { ALargeSmall, Bot, Brain, Clapperboard, Cpu, Download, FlaskConical, FolderOpen, Gauge as GaugeIcon, Globe, Languages, Loader2, LogOut, Palette, RefreshCw, RotateCcw, RotateCw, ShieldCheck, SlidersHorizontal } from "lucide-react";
import { get, patch, post, watchJob } from "../api.js";
import { BackButton, Banner, Dialog, StatusIcon, useChecks } from "../components.jsx";
import { go, useData, useToast } from "../lib.jsx";
import { useT } from "../i18n.jsx";
import { SignInFlow, useClaude } from "../workflow/claude.jsx";
import { DriveNote, folderName } from "../workflow/folder.jsx";
import { ComponentsLine, Extras, LicencesFold, YourSteps, mb as mbOf, useSetupJob } from "../workflow/FirstRun.jsx";
import AppUpdate from "../workflow/AppUpdate.jsx";          // the app updates itself from the user's repo
import { UpdateDot } from "../workflow/UpdateNotice.jsx";          // a new version is ready: the Update section's dot
import { KEEP_ON_RESET, SIZES, THEMES_SHOWN, useAppearance } from "../theme.jsx";
import { flushPrefs } from "../prefs-sync.js";
import { useVoiceSettings } from "../voice/settings.js";
import Keys from "../voice/Keys.jsx";

// labels are English keys for t
const SECTIONS = [["general", "General", SlidersHorizontal], ["director", "Director", Bot], ["runtime", "System", Cpu], ["update", "Update", Download]];
// old addresses still land in their new place
const ALIAS = { ai: "director", workspace: "general", ae: "general", voice: "runtime", models: "runtime", styles: "general" };

/** A check's text without the computer's addresses: "C:\…\python.exe" reads as "python.exe", "E:\Films" as "Films". */
const noPaths = (s) => String(s ?? "").replace(/[A-Za-z]:[\\/][^,;()\n]*?(?=\s*(?:$|[,;()]|\.(?:\s|$)))/g, (m) => m.replace(/[\\/]+$/, "").split(/[\\/]/).pop());
function Check({ c, children }) {
  const t = useT();
  return <div className="check-row"><StatusIcon status={c.status} />
    <div><div className="t">{t(c.label)}</div><div className="d">{noPaths(c.detail)}</div>{c.action && c.status !== "ok" && <div className="a">{t("Next:")} {noPaths(c.action)}</div>}{children}</div><span /></div>;
}
/** One setting: its name, one short line, and the longer explanation (if any) in a quiet "?". */
function Row({ title, icon, desc, more, children }) {
  return <div className="setting-row"><div><h3>{icon && <span className="row-icon" aria-hidden="true">{icon}</span>}{title}
    {more && <span className="row-more" tabIndex={0} title={more} aria-label={more}>?</span>}</h3>{desc && <p className="desc">{desc}</p>}</div><div style={{ minWidth: 0 }}>{children}</div></div>;
}
/** A group of General with its small title. */
function Group({ title, children, foot = null }) {
  return <div className="panel set-group"><div className="panel-head"><h2>{title}</h2></div>{children}{foot}</div>;
}
/** A panel still waiting on the server: its rows as a skeleton and one plain line, never an empty page. */
function Waiting({ rows = 3, label }) {
  const t = useT();
  return <div className="panel" aria-busy="true"><p className="state-line run" role="status"><Loader2 size={13} className="spin" />{label ?? t("Checking…")}</p>
    {Array.from({ length: rows }, (_, i) => <div key={i} className="skeleton" style={{ height: "2.25rem" }} />)}</div>;
}

export const WEB_LABEL = { ask: "Ask first", on: "On", off: "Off" };

/** Account: signed in, the plan and the email on one or two lines, Check again and Sign out on the same row. */
function Account({ claude, onRecheck }) {
  const t = useT();
  const toast = useToast();
  const c = useClaude();
  const [busy, setBusy] = useState(false);
  const [askOut, setAskOut] = useState(false);
  const recheck = async () => { setBusy(true); try { await onRecheck(); } finally { setBusy(false); } };
  const out = async () => { setBusy(true); try { await c.signOut(); toast(t("Signed out of Claude")); setAskOut(false); } catch (e) { toast(e.message, "error"); } finally { setBusy(false); } };
  const plan = claude.subscriptionType ? claude.subscriptionType[0].toUpperCase() + claude.subscriptionType.slice(1) : "";
  return <Group title={t("Account")}>
    <div className="acct-line">
      <StatusIcon status={claude.loggedIn ? "ok" : "error"} />
      <div className="acct-who"><b>{claude.loggedIn ? (plan ? t("Signed in · Claude {plan}", { plan }) : t("Signed in")) : t("Not signed in")}</b>
        {claude.email && <span className="muted">{claude.email}</span>}</div>
      <span className="spacer" />
      <button className="btn sm" onClick={recheck} disabled={busy}>{busy ? <Loader2 size={14} className="spin" /> : <RefreshCw size={14} />}{t("Check again")}</button>
      {claude.loggedIn && <button className="btn ghost sm" onClick={() => setAskOut(true)}><LogOut size={14} />{t("Sign out")}</button>}
    </div>
    {!claude.loggedIn && <SignInFlow />}
    {askOut && <Dialog icon={<LogOut size={18} />} danger title={t("Sign out of Claude Code on this PC?")} onClose={() => setAskOut(false)} footer={<><span className="spacer" />
      <button className="btn" onClick={() => setAskOut(false)}>{t("Cancel")}</button>
      <button className="btn danger" onClick={out} disabled={busy}>{busy ? <Loader2 size={14} className="spin" /> : <LogOut size={14} />}{t("Sign out")}</button></>}>
      <div className="dlg-lines"><p className="dlg-warn">{t("Claude Code in the terminal signs out too.")}</p><p className="hint">{t("New projects and the chat pause until you sign in again.")}</p></div></Dialog>}
  </Group>;
}

/** Projects folder: the folder's name ("Standard folder" for the app's own), never its address; a click opens it in Explorer;
 *  Choose… on the same row. */
function ProjectsFolder() {
  const t = useT();
  const toast = useToast();
  const place = useData(() => get("/api/storage/location"));
  const [busy, setBusy] = useState(false);
  const set = async (path) => { try { await patch("/api/storage/location", { path }); toast(t("Projects folder changed")); place.reload(); } catch (e) { toast(e.message, "error"); } };
  const choose = async () => {
    setBusy(true);
    try { const r = await post("/api/dialog/folder", { title: t("Projects folder"), initial: place.data?.location ?? "" }); if (r.path) await set(r.path); }
    catch (e) { toast(e.message, "error"); } finally { setBusy(false); }
  };
  const open = async () => { try { await post("/api/storage/location/open"); } catch (e) { toast(e.message, "error"); } };          // a missing folder says so
  const d = place.data;
  return <Group title={t("Projects folder")}>
    <p className="hint">{t("Choose the folder that stores your projects.")}</p>
    {d ? <><div className="folder-line">
      <button type="button" className="path-link mono" onClick={open} title={t("Open in Explorer")}><FolderOpen size={14} />{d.location === d.standard ? t("Standard folder") : folderName(d.location)}</button>
      <span className="spacer" />
      <button type="button" className="btn sm" onClick={choose} disabled={busy}>{busy ? <Loader2 size={14} className="spin" /> : <FolderOpen size={14} />}{t("Choose…")}</button></div>
      {d.drive && <DriveNote />}
      {d.location !== d.standard && <button className="clink" onClick={() => set(d.standard)}>{t("Back to the standard folder")}</button>}</>
      : <div className="skeleton" style={{ height: "2.25rem" }} />}
  </Group>;
}

/** Appearance: the theme and the text size; resetting the panel layout is a small link at the foot, its confirm as before. */
function Appearance() {
  const t = useT();
  const [ask, setAsk] = useState(false);
  const { theme, setTheme, size, setSize } = useAppearance();
  const reset = () => { Object.keys(localStorage).filter((k) => k.startsWith("mw-pref:") && !KEEP_ON_RESET.includes(k)).forEach((k) => localStorage.removeItem(k)); flushPrefs().finally(() => location.reload()); };          // the removals reach the kept copy before the reload reads it
  return <Group title={t("Appearance")} foot={<p className="set-foot"><button className="clink" onClick={() => setAsk(true)}><RotateCcw size={12} />{t("Reset the panel layout")}</button></p>}>
    {THEMES_SHOWN.length > 1 && <Row icon={<Palette size={16} />} title={t("Theme")} desc={t("Each theme has its own look and layout.")}>
      <div className="theme-pick">{THEMES_SHOWN.map((x) => <button key={x.id} type="button" className="theme-card" aria-pressed={theme === x.id} onClick={() => setTheme(x.id)}>
        <span className="theme-swatch" data-t={x.id} aria-hidden="true"><i /><i /><i /><b>Aa</b></span>
        <span className="label-caps">{x.name}</span><span className="d">{t(x.desc)}</span></button>)}</div></Row>}
    <Row icon={<ALargeSmall size={16} />} title={t("Text size")} desc={t("A step smaller or larger than the window's size.")}>
      <div className="segmented" role="group" aria-label={t("Text size")}>{SIZES.map(([k, , label]) => <button key={k} type="button" aria-pressed={size === k} onClick={() => setSize(k)}>{t(label)}</button>)}</div></Row>
    {ask && <Dialog icon={<RotateCcw size={18} />} title={t("Reset the panel layout?")} onClose={() => setAsk(false)} footer={<><span className="spacer" /><button className="btn" onClick={() => setAsk(false)}>{t("Cancel")}</button>
      <button className="btn primary" onClick={reset}><RotateCcw size={14} />{t("Reset layout")}</button></>}>
        <div className="dlg-lines"><p>{t("Panel widths, views and filters go back to their defaults.")}</p><p>{t("Projects are not touched.")}</p></div></Dialog>}          {/* one idea a line */}
  </Group>;
}

/** Voice-over: one row a service, the spoken language under them. */
function VoiceOver() {
  const t = useT();
  const toast = useToast();
  const voice = useVoiceSettings();
  const setLang = async (language) => { try { await patch("/api/voice/settings", { language }); voice.reload(); } catch (e) { toast(e.message, "error"); } };
  return <Group title={t("Voice-over")}>
    {voice.error ? <Banner kind="error" action={<button className="btn sm" onClick={voice.reload}>{t("Retry")}</button>}>{voice.error.message}</Banner>
      : voice.data ? <Keys data={voice.data} reload={voice.reload} /> : <div className="skeleton" style={{ height: "4.5rem" }} />}
    <div className="set-line"><Languages size={15} aria-hidden="true" /><span>{t("Spoken language")}</span><span className="spacer" />
      {voice.data ? <select className="select" value={voice.data.settings.language} onChange={(e) => setLang(e.target.value)} aria-label={t("Spoken language")}>
        {[["vi", "Vietnamese"], ["en", "English"], ["auto", "Detect automatically"]].map(([k, l]) => <option key={k} value={k}>{t(l)}</option>)}</select>
        : <div className="skeleton" style={{ height: "2.25rem", width: "min(18rem, 100%)" }} />}</div>
  </Group>;
}

/** Render & export: where renders run and the last render, one line; After Effects, one line. */
const GPU_LABEL = { auto: "Automatic", cpu: "Always CPU" };
function RenderExport({ sys, reload }) {
  const t = useT();
  const toast = useToast();
  const rs = useData(() => get("/api/render/settings"));
  const ae = useData(() => get("/api/ae/status"));
  const save = async (gpu) => { try { await patch("/api/render/settings", { gpu }); toast(t("Saved")); rs.reload(); } catch (e) { toast(e.message, "error"); } };
  const last = rs.data?.lastCheck;
  const card = last?.renderer?.replace(/^ANGLE \(([^,]+), ([^(]+?) \(.*$/, "$2").trim();
  const now = rs.data?.gpu === "cpu" ? t("CPU") : card ? t("GPU ({card})", { card }) : t("GPU when it works");
  const lastRun = last ? (last.mode === "hardware" ? t("last render GPU") : t("last render CPU")) : null;
  const c = sys?.checks.afterEffects;
  const found = !!(c?.installs?.length || c?.status === "ok" || ae.data?.installs?.length), open = !!ae.data?.running;
  return <Group title={t("Render & export")}>
    <div className="set-line"><Cpu size={15} aria-hidden="true" /><span>{t("Renders on")}: <b>{rs.data ? now : "…"}</b>{lastRun && <span className="muted"> · {lastRun}</span>}</span>
      <span className="row-more" tabIndex={0} title={t("Automatic: the GPU when this computer has one that works, else the CPU. Before each render of a film with 3D (WebGL), one test frame is made on the GPU; if it comes out black or fails, that render uses the CPU. Always CPU: slower, the same picture on every computer.")}>?</span>
      <span className="spacer" />
      {rs.data && <div className="segmented" role="group" aria-label={t("Renders on")}>{rs.data.choices.map((k) => <button key={k} type="button" aria-pressed={rs.data.gpu === k} onClick={() => save(k)}>{t(GPU_LABEL[k])}</button>)}</div>}</div>
    <div className="set-line"><Clapperboard size={15} aria-hidden="true" /><span>After Effects</span>
      {!ae.data && !c ? <span className="muted"><Loader2 size={12} className="spin" /> {t("Checking…")}</span>
        : <span className={"status " + (open ? "ok" : found ? "warning" : "error")}><StatusIcon status={open ? "ok" : found ? "warning" : "error"} size={13} />{found ? (open ? t("Found · Open") : t("Found · Not open")) : t("Not found")}</span>}
      <span className="spacer" /><button className="btn ghost sm" onClick={() => { reload(); ae.reload(); }}><RefreshCw size={13} />{t("Check again")}</button></div>
  </Group>;
}

/** Director: the AI that makes the films (Claude today; the name leaves room for another later); compact rows. */
function Director() {
  const t = useT();
  const toast = useToast();
  const { data, reload } = useData(() => get("/api/agent/settings"));
  const save = async (k, v) => { try { await patch("/api/agent/settings", { [k]: v }); toast(t("Saved")); reload(); } catch (e) { toast(e.message, "error"); } };
  if (!data) return <Waiting rows={5} label={t("Loading…")} />;
  return <section className="section"><div className="panel settings-compact">
    <Row icon={<Brain size={16} />} title={t("Model")} desc={t("For every project that does not pick its own.")} more={t("Each reply in the chat shows the model and the time.")}>
      <select className="select" value={data.model} onChange={(e) => save("model", e.target.value)} aria-label={t("Model")}>{data.models.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
    </Row>
    {/* High is the default, as in New project; only the Motion Plan runs at Medium, the other steps at High at least */}
    <Row icon={<GaugeIcon size={16} />} title={t("Effort")} desc={t("Higher thinks longer and uses more of your plan.")}
      more={t("Storyboard, Character and Build run at High at least, even when this is lower. The Motion Plan runs at Medium.")}>
      <select className="select" value={data.effort} onChange={(e) => save("effort", e.target.value)} aria-label={t("Effort")}>{data.efforts.map((k) => <option key={k} value={k}>{t(k[0].toUpperCase() + k.slice(1))}{k === "high" ? " " + t("(default)") : ""}</option>)}</select>
    </Row>
    <Row icon={<ShieldCheck size={16} />} title={t("Mode")} desc={t("How freely it works, as in Claude Code.")} more={t("As in Claude Code. Auto: Claude decides and goes on. Manual: you allow every change. Accept edits: edits go through, the web asks. Plan: Claude only plans, no file changes.")}>
      <select className="select" value={data.mode} onChange={(e) => save("mode", e.target.value)} aria-label={t("Mode")}>{data.modes.map(([k, l]) => <option key={k} value={k}>{t(l)}</option>)}</select>
    </Row>
    <Row icon={<Globe size={16} />} title={t("Web")} desc={t("Each project can change it in the Editor.")} more={t("Research, the client's website, a pull request. Ask: Claude asks you the first time in a project. Each project can change it in the Editor.")}>
      <select className="select" value={data.web} onChange={(e) => save("web", e.target.value)} aria-label={t("Web")}>{data.webChoices.map((k) => <option key={k} value={k}>{t(WEB_LABEL[k])}</option>)}</select>
    </Row>
    <Row icon={<FlaskConical size={16} />} title={t("Bypass permissions (experiment)")} desc={t("For testing only.")} more={t("Adds a Bypass mode. Claude then leaves the project folder: it can run commands and change any file on this PC. Off by default; for testing only.")}>
      <label className="check"><input type="checkbox" checked={!!data.allowBypass} onChange={(e) => save("allowBypass", e.target.checked)} />{t("Allow Bypass permissions")}</label>
    </Row>
    <Row icon={<ShieldCheck size={16} />} title={t("What it may do")} desc={t("Set by the app; a film style cannot change it.")}>
      <details className="diag"><summary>{t("Details")}</summary><ul className="steps-list">
        <li>{t("Read and edit files in the open project folder only.")}</li>
        <li>{t("No commands, installs or other folders (unless you test Bypass permissions).")}</li>
        <li>{t("The web only as each project allows: ask first, on or off.")}</li>
        <li>{t("Nothing changes without a request you send; every change can be undone.")}</li>
        <li>{t("After each change, it reviews the work and the tech checks run.")}</li>
      </ul></details>
    </Row>
  </div></section>;
}

/** Health fixes the list cannot do on its own: HyperFrames' skills, the Python components, the fonts and libraries. */
function SetupJob({ url, label, done }) {
  const t = useT();
  const toast = useToast();
  const [job, setJob] = useState(null);
  const start = async () => {
    try { const j = await post(url); setJob(j); watchJob(j.id, (x) => { if (!x) return; setJob(x); if (x.status !== "running") { if (x.status === "failed") toast(x.error?.message ?? t("It did not finish"), "error"); done(); } }, 1000); }
    catch (e) { toast(e.message, "error"); }
  };
  return job?.status === "running" ? <div className="a"><Loader2 size={13} className="spin" /> {job.stage ?? t("Working…")}</div>
    : <button className="btn sm" style={{ marginTop: "0.4rem" }} onClick={start}><Download size={13} />{t(label)}</button>;
}

/** Backups: the app's git history, written to the backup folder after each commit (settings in runtime\ are not in it). Off unless
 *  storage.backupRoot names a folder (Google Drive on a computer that set it); when on, one line at the foot of System. */
function Backups() {
  const t = useT();
  const { data } = useData(() => get("/api/backup").catch(() => null));
  if (!data?.configured) return null;
  const bad = !data.reachable || (data.last && !data.last.ok);
  return <p className="sys-line hint"><StatusIcon status={bad ? "error" : "ok"} size={13} />{!data.reachable ? t("The backup folder is not reachable. On Google Drive: start Google Drive for desktop.")
    : data.last && !data.last.ok ? t("The last backup did not finish.") : t("The app is backed up after each commit.")}</p>;
}

/** System: the components as one line (what is left to download with Install, or "All ready" and their size on disk with Check
 *  again; a running install as one bar), under it only what needs the user (a failed check with its fix, FFmpeg or Python while missing);
 *  then the optional extras, "Open-source licences" folded and the backups line. No list of parts, versions or sources (owner 30/10). */
function Runtime({ sys, reload, loading }) {
  const t = useT();
  const fr = useChecks("/api/setup/first-run");
  const again = () => { reload(); fr.reload(); };
  const setup = useSetupJob(again);
  if (!sys || !fr.data) return <section className="section"><Waiting rows={3} label={t("Checking this computer…")} /></section>;
  const c = sys.checks;
  const keys = ["hfRuntime", "hfSkills", "chromium", "ffmpeg", "node", "python", "pyComponents", "fonts", "storage"].filter((k) => c[k]);
  const bad = keys.filter((k) => c[k].status !== "ok");
  const d = fr.data;
  const need = d.items.some((it) => !it.ready && it.from !== "yours" && !it.optional);
  const size = d.items.reduce((n, it) => n + (!it.optional && it.ready && it.diskMb ? it.diskMb : 0), 0);
  const busy = loading || fr.loading;
  // nothing to do while all is ready (the page checks by itself each time it opens): Check again only when something is wrong
  const wrong = bad.length > 0 || d.items.some((it) => it.from === "yours" && it.id !== "work" && !it.ready);
  return <section className="section set-general">
    <div className="panel">
      <ComponentsLine d={d} job={setup.job} label size={size > 0 ? mbOf(size) : null} problems={bad.length}
        action={setup.job ? null : need ? <button className="btn primary sm" onClick={() => setup.start()}><Download size={14} />{d.mb > 0 ? t("Install ({size})", { size: mbOf(d.mb) }) : t("Install")}</button>
          : wrong ? <button className="btn sm" onClick={again} disabled={busy}>{busy ? <Loader2 size={14} className="spin" /> : <RefreshCw size={14} />}{t("Check again")}</button> : null} />
      {bad.length > 0 && <div className="comp-body">{bad.map((k) => <Check key={k} c={c[k]}>
        {k === "fonts" && <SetupJob url="/api/setup/assets" label="Download" done={again} />}
        {k === "hfSkills" && <SetupJob url="/api/setup/hf-skills" label="Download (about 120 MB)" done={again} />}
        {k === "pyComponents" && c[k].action !== "Install Python 3.12" && <SetupJob url="/api/setup/python" label="Install" done={again} />}</Check>)}</div>}
      <YourSteps d={d} />
      <LicencesFold d={d} />
    </div>
    <VoiceOver />
    <Extras d={d} reload={again} />
    <Backups />
  </section>;
}

export default function Settings({ section, claude, onRecheckClaude, updateReady = false }) {
  const t = useT();
  const sys = useChecks("/api/system");          // the last checks at once, the fresh ones when ready
  const cur = SECTIONS.find((s) => s[0] === (ALIAS[section] ?? section)) ?? SECTIONS[0];
  useEffect(() => { if (section && ALIAS[section]) go(`/settings/${ALIAS[section]}`); }, [section]);          // an old address shows its new one
  return (
    <div className="page page-settings">
      <div className="page-head"><div><BackButton /><h1>{t("Settings")}</h1></div></div>
      {sys.error && <Banner kind="error" action={<button className="btn sm" onClick={sys.reload}><RotateCw size={13} />{t("Retry")}</button>}>{t("Could not run the checks.")} {sys.error.message}</Banner>}
      <div className="settings">
        <nav className="settings-nav" aria-label={t("Settings sections")}>{SECTIONS.map(([k, label, Icon]) => {
          const flag = k === "runtime" ? Object.entries(sys.data?.checks ?? {}).filter(([n, c]) => n !== "afterEffects" && c.status !== "ok").length : k === "general" ? (claude.loggedIn ? 0 : 1) : 0;
          return <button key={k} className={"rail-item" + (k === cur[0] ? " active" : "")} aria-current={k === cur[0] ? "page" : undefined} onClick={() => go(`/settings/${k}`)}>
            <Icon size={16} /><span>{t(label)}</span>{flag ? <span className="count"><span className="dot error" /></span> : null}
            {k === "update" && <UpdateDot on={updateReady} />}</button>;
        })}</nav>
        <div style={{ minWidth: 0 }}>
          {cur[0] === "general" && <section className="section set-general">
            <Account claude={claude} onRecheck={onRecheckClaude} />
            <ProjectsFolder />
            <Appearance />
            <RenderExport sys={sys.data} reload={sys.reload} />
          </section>}
          {cur[0] === "director" && <Director />}
          {cur[0] === "runtime" && <Runtime sys={sys.data} reload={sys.reload} loading={sys.loading} />}
          {cur[0] === "update" && <AppUpdate />}
        </div>
      </div>
    </div>
  );
}
