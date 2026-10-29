// First run: everything the app needs on this computer, as one list in order, the work
// folder first. Each item says what it is, where it comes from (the app's bundle, a download, a clone at its pinned commit, or a step the
// user does: FFmpeg, the work folder) and how much is left to download; "Download all" gets every missing item in order. The screen
// opens over the app on first start while something is missing ("Later" hides it for this session), and lives in Settings › System.
// Data: GET /api/setup/first-run; POST /api/setup/first-run, /api/setup/work-folder, /api/setup/style-source/<name>.
// The very first start asks which look the app wears, The Desk (the default) or The Studio, before anything else
// and whether or not something is missing; once answered it never asks again (theme.jsx themeAsked); Settings › Appearance changes it.
// Whisper on the graphics card (found by itself, asked like the other parts): on a computer with an NVIDIA card
// the list has an optional "whisper-gpu" item with a download of its own (not in "Download all"), and says where Whisper runs; once the
// first run is done, the app asks one time whether to get it (GET/POST/DELETE /api/setup/whisper-gpu).
import { useEffect, useRef, useState } from "react";
import { Check, CircleDashed, Copy, Cpu, Download, Loader2, Package, Trash2, User } from "lucide-react";
import { del, get, post, watchJob } from "../api.js";
import { Banner, Dialog, useChecks } from "../components.jsx";
import { useData, useToast } from "../lib.jsx";
import { useT } from "../i18n.jsx";
import { FolderField } from "./folder.jsx";
import { THEMES_SHOWN, markThemeAsked, themeAsked, useAppearance } from "../theme.jsx";
import SetupModels from "../voice/SetupModels.jsx";

const FROM = { bundle: "In the app", download: "Download", clone: "From GitHub", yours: "You do this" };
const LATER = "mw-first-run-later";
// an item's source: one link, a list, or links joined by " · "; a PyPI link is named by its package and version
const links = (src) => [].concat(src ?? []).flatMap((x) => String(x).split(" · ")).filter(Boolean)
  .map((u) => { const m = u.match(/pypi\.org\/project\/([^/]+)\/([^/]+)/); return [u, m ? `${m[1]} ${m[2]}` : null]; });
export const mb = (n) => (n >= 1024 ? `${(n / 1024).toFixed(1)} GB` : n > 0 && n < 1 ? "< 1 MB" : `${Math.round(n)} MB`);
/** The first-start screen lists what the user does or downloads; a part that came with the repository (or the user's own clone of a
 *  style) shows only when it is missing or broken on this computer. Settings › System keeps the whole list. */
export const shownAtSetup = (it) => !it.ready || it.from === "yours" || it.from === "download";

/** The list itself, shared by the first-start screen and Settings › System. Settings hands in its own
 *  answer (`q`), leaves out the work folder (its one folder is in General), shows one line a part with its size on disk, and keeps the
 *  sources and licences for its own "Sources and licences" fold (SourcesFold); "Included with the app" is not shown there. */
export function FirstRunList({ onDone, skip = [], creditsFolded = false, needed = false, q: given = null }) {
  const t = useT();
  const toast = useToast();
  const own = useChecks(given ? null : "/api/setup/first-run");          // the last answer at once, the fresh one when ready
  const q = given ?? own;
  const gpu = useData(() => get("/api/setup/whisper-gpu").catch(() => null), []);
  const [job, setJob] = useState(null);
  const [one, setOne] = useState(null);            // an author's source being cloned on its own, or an optional item downloaded on its own
  if (q.error) return q.error.status === 404 ? null : <Banner kind="error" action={<button className="btn sm" onClick={q.reload}>{t("Retry")}</button>}>{q.error.message}</Banner>;
  const d = q.data;
  if (!d) return <div className="skeleton" style={{ height: "18rem" }} />;
  const follow = (j, after) => watchJob(j.id, (x) => { if (!x) return; setJob(x); if (x.status !== "running") { setJob(null); after?.(); q.reload(); if (x.status === "failed") toast(x.error?.message ?? t("The download stopped."), "error"); else onDone?.(); } }, 1200);
  const all = async () => { try { const r = await post("/api/setup/first-run", {}); const j = r.job ?? r; setJob(j); follow(j); } catch (e) { toast(e.message, "error"); } };
  const source = async (id) => { const name = id.replace(/^style-/, ""); setOne(id);
    try { const r = await post(`/api/setup/style-source/${name}`); const j = r.job ?? r; setJob(j); follow(j, () => setOne(null)); } catch (e) { setOne(null); toast(e.message, "error"); } };
  const getOne = async (id) => { setOne(id);
    try { const r = await post("/api/setup/first-run", { ids: [id] }); const j = r.job ?? r; setJob(j); follow(j, () => { setOne(null); gpu.reload(); }); } catch (e) { setOne(null); toast(e.message, "error"); } };
  const dropGpu = async () => { try { await del("/api/setup/whisper-gpu"); toast(t("Whisper runs on the CPU again")); q.reload(); gpu.reload(); } catch (e) { toast(e.message, "error"); } };
  const setWork = async (path) => { try { await post("/api/setup/work-folder", { path }); toast(t("Work folder set")); q.reload(); } catch (e) { toast(e.message, "error"); } };
  const running = job?.stage ? String(job.stage).split(":")[0].trim() : one;          // job.stage is "<id>: <progress line>"
  const copy = async (s) => { try { await navigator.clipboard.writeText(s); toast(t("Copied")); } catch { toast(s); } };
  const parts = Array.isArray(d.bundle?.parts) ? d.bundle.parts : [];
  return <div className="fr">
    {(!creditsFolded || !d.ready) && <div className="fr-sum">
      {d.ready ? <span className="fr-ok"><Check size={15} />{t("Everything is on this computer.")}</span>
        : <span>{d.mb > 0 ? t("{size} to download", { size: mb(d.mb) }) : t("A few steps are yours")}</span>}
      <span className="spacer" />
      {job ? <span className="lk-stage"><Loader2 size={14} className="spin" />{job.stage ? t(String(job.stage).replace(/^[^:]+:\s*/, "")) : t("Starting…")}{job.progress != null ? ` · ${job.progress}%` : ""}</span>
        : !d.ready && d.mb > 0 && <button className="btn primary" onClick={all}><Download size={15} />{t("Download all ({size})", { size: mb(d.mb) })}</button>}
    </div>}
    <ol className="plain fr-list">{d.items.filter((it) => !skip.includes(it.id) && (!needed || shownAtSetup(it))).map((it) => {
      const cmd = it.command ?? null;          // FFmpeg's winget line while it is missing
      const busy = running === it.id;
      return <li key={it.id} className={"fr-item" + (it.ready ? " ready" : "") + (busy ? " busy" : "")}>
        <span className="fr-ic" aria-hidden="true">{busy ? <Loader2 size={15} className="spin" /> : it.ready ? <Check size={15} /> : it.from === "yours" ? <User size={15} /> : <CircleDashed size={15} />}</span>
        <div className="fr-main">
          <div className="fr-top"><b>{t(it.title)}</b>{it.version && <span className="fr-ver num">{it.version}</span>}<span className={"fr-from k-" + it.from}>{it.from === "bundle" && <Package size={11} />}{t(FROM[it.from] ?? it.from)}</span>{it.optional && <span className="fr-from">{t("Optional")}</span>}
            <span className="fr-mb num">{it.ready ? (creditsFolded && it.diskMb != null ? `${t("Ready")} · ${it.diskMb < 1 ? "< 1 MB" : mb(it.diskMb)}` : t("Ready")) : it.mb > 0 ? mb(it.mb) : ""}</span></div>
          {it.what && !creditsFolded && <p className="fr-what">{t(it.what)}</p>}          {/* Settings: one line a part */}
          {it.id === "work" && <FolderField value={it.path ?? ""} title={t("Work folder")} onChange={(path) => setWork(path)} />}
          {cmd && !it.ready && <div className="fr-cmd"><code className="mono">{cmd}</code><button type="button" className="btn ghost sm" onClick={() => copy(cmd)}><Copy size={13} />{t("Copy")}</button></div>}
          {it.id.startsWith("style-") && !it.ready && it.from === "clone" && !job && <button type="button" className="btn sm fr-one" onClick={() => source(it.id)}><Download size={13} />{t("Get this one")}</button>}
          {it.optional && !it.ready && !job && <button type="button" className="btn sm fr-one" onClick={() => getOne(it.id)}><Download size={13} />{t("Download ({size})", { size: mb(it.mb) })}</button>}
          {it.id === "whisper-gpu" && gpu.data && <WhereWhisper d={gpu.data} onRemove={it.ready && !job ? dropGpu : null} />}
          {/* credit every item: author, source links, licence when the server gives them */}
          {!creditsFolded && (it.author || it.licence || it.source) && <p className="credit-line">{[it.author, it.licence].filter(Boolean).join(" · ")}
            {links(it.source).map(([u, name], k) => <span key={u}>{(k || it.author || it.licence) ? " · " : ""}<a href={u} target="_blank" rel="noopener noreferrer">{name ?? t("Source")}</a></span>)}</p>}
        </div>
      </li>;
    })}</ol>
    {!creditsFolded && parts.length > 0 && <details className="fr-bundle"><summary>{t("Included with the app")} <span className="num">{parts.length}</span></summary>
      <ul className="plain">{parts.map((p, i) => <li key={p.name ?? i}><b>{p.name}</b>{p.bytes != null && <span className="muted num"> · {mb(p.bytes / 1048576)}</span>}
        {p.source && <> · <a href={p.source} target="_blank" rel="noopener noreferrer">{t("Source")}{p.commit ? ` @ ${String(p.commit).slice(0, 7)}` : ""}</a></>}
        {p.licence && <span className="muted"> · {p.licence}</span>}</li>)}</ul></details>}
  </div>;
}

/** Settings › System's "Sources and licences": every part's author, licence and links, and what came with the app, in one
 *  fold, one line each. `d` is GET /setup/first-run's answer; `more` adds lines (the speech models). */
export function SourcesFold({ d, more = [] }) {
  const t = useT();
  const items = (d?.items ?? []).filter((it) => it.author || it.licence || it.source);
  const parts = Array.isArray(d?.bundle?.parts) ? d.bundle.parts : [];
  if (!items.length && !parts.length && !more.length) return null;
  return <details className="diag fr-sources"><summary>{t("Sources and licences")}</summary>
    <ul className="plain">
      {items.map((it) => <li key={it.id}><b>{t(it.title)}</b>{[it.author, it.licence].filter(Boolean).map((x) => <span key={x} className="muted"> · {x}</span>)}
        {links(it.source).map(([u, name]) => <span key={u}> · <a href={u} target="_blank" rel="noopener noreferrer">{name ?? t("Source")}</a></span>)}</li>)}
      {more.map((m) => <li key={m.key}><b>{m.title}</b>{[m.author, m.licence].filter(Boolean).map((x) => <span key={x} className="muted"> · {x}</span>)}
        {m.link && <> · <a href={m.link} target="_blank" rel="noopener noreferrer">{t("Source")}</a></>}</li>)}
      {parts.map((p, i) => <li key={"b" + (p.name ?? i)}><b>{p.name}</b>{p.licence && <span className="muted"> · {p.licence}</span>}
        {p.source && <> · <a href={p.source} target="_blank" rel="noopener noreferrer">{t("Source")}{p.commit ? ` @ ${String(p.commit).slice(0, 7)}` : ""}</a></>}</li>)}
    </ul></details>;
}

/** Where Whisper ran: the card, or the CPU with the reason the card could not be used. */
function WhereWhisper({ d, onRemove }) {
  const t = useT();
  const onGpu = d.device === "gpu" && d.gpu;
  const why = d.lastRun?.device === "cpu" && d.lastRun.reason;
  return <div className="fr-cmd fr-gpu"><Cpu size={13} aria-hidden="true" />
    <span>{onGpu ? t("Whisper runs on the {card}.", { card: d.gpu.name }) : t("Whisper runs on the CPU.")}{why && <span className="muted"> {why}</span>}</span>
    {onRemove && <><span className="spacer" /><button type="button" className="btn ghost sm" onClick={onRemove} title={t("Back to the CPU; the download can be made again here")}><Trash2 size={13} />{t("Remove")}</button></>}</div>;
}

/** Asked one time once the first run is done (the server's `ask` is true): the card was found, the part is not on the computer yet. */
function WhisperGpuAsk({ d, onClose }) {
  const t = useT();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const size = mb(d.pack?.mb ?? 0);
  const answer = async (yes) => {
    setBusy(true);
    try {
      const r = await post("/api/setup/whisper-gpu", { answer: yes ? "yes" : "no" });
      if (yes) { const j = r.job ?? r; toast(t("Downloading the part for the graphics card…"));
        if (j?.id) watchJob(j.id, (x) => { if (x && x.status !== "running") toast(x.status === "failed" ? x.error?.message ?? t("The download stopped.") : t("Whisper now runs on the {card}.", { card: d.gpu?.name ?? "" }), x.status === "failed" ? "error" : undefined); }, 2000); }
      onClose();
    } catch (e) { setBusy(false); toast(e.message, "error"); }
  };
  return <Dialog title={t("Transcribe on the graphics card?")} onClose={onClose} footer={<><span className="spacer" />
    <button className="btn" disabled={busy} onClick={() => answer(false)}>{t("No")}</button>
    <button className="btn primary" disabled={busy} onClick={() => answer(true)}>{busy ? <Loader2 size={14} className="spin" /> : <Download size={14} />}{t("Download ({size})", { size })}</button></>}>
    {/* one idea a line */}
    <div className="dlg-lines"><p>{t("This computer has an {card}.", { card: d.gpu?.name ?? "NVIDIA" })}</p>
      <p>{t("Whisper can transcribe the voice-over on it, much faster than on the CPU.")}</p>
      <p className="hint">{t("One download of {size}. Settings › System can add or remove it later.", { size })}</p></div>
  </Dialog>;
}

/** The first start's first question: the two themes as the same cards as Settings › Appearance. A click wears the theme at once
 *  (the cards are the preview); Continue, Enter or Escape keeps what is on screen and the question never comes back. */
function ThemeAsk({ onDone }) {
  const t = useT();
  const { theme, setTheme } = useAppearance();
  const go = useRef(null);
  const done = () => { setTheme(theme); markThemeAsked(); onDone(); };          // stores the theme even when the default is kept
  useEffect(() => { go.current?.focus(); }, []);
  return <div className="overlay fr-overlay" onKeyDown={(e) => { if (e.key === "Escape") done(); }}>
    <div className="dialog fr-dialog fr-theme-ask" role="dialog" aria-modal="true" aria-labelledby="fr-theme-h" style={{ width: "min(40rem, calc(100vw - 2rem))" }}>
      <div className="dialog-head"><h2 id="fr-theme-h">{t("Choose a look")}</h2></div>
      <div className="dialog-body">
        <div className="theme-pick" role="radiogroup" aria-label={t("Theme")}>{THEMES_SHOWN.map((x) => <button key={x.id} type="button" className="theme-card" role="radio"
          aria-checked={theme === x.id} aria-pressed={theme === x.id} onClick={() => setTheme(x.id)}>
          <span className="theme-swatch" data-t={x.id} aria-hidden="true"><i /><i /><i /><b>Aa</b></span>
          <span className="label-caps">{x.name}</span><span className="d">{t(x.desc)}</span></button>)}</div>
      </div>
      <div className="dialog-foot"><span className="hint">{t("Settings › General changes it any time.")}</span><span className="spacer" />
        <button ref={go} className="btn primary" onClick={done}><Check size={14} />{t("Continue")}</button></div>
    </div>
  </div>;
}

/** The first-start dialogs, one at a time and in this order: the look, Set up (while something is missing, until "Later" for this
 *  session or everything is there), the graphics-card question, then the speech-to-text models. A ready computer sees none of them. */
export default function FirstRun() {
  const q = useData(() => get("/api/setup/first-run").catch(() => null), []);
  const [later, setLater] = useState(() => { try { return sessionStorage.getItem(LATER) === "1"; } catch { return false; } });
  const g = useData(() => get("/api/setup/whisper-gpu").catch(() => null), []);
  const [gpuAsked, setGpuAsked] = useState(false);
  const [lookAsked, setLookAsked] = useState(themeAsked);
  if (!lookAsked && THEMES_SHOWN.length > 1) return <ThemeAsk onDone={() => setLookAsked(true)} />;
  if (q.loading && !q.data) return null;          // not known yet: nothing, so no later dialog shows first
  if (q.data && !q.data.ready && !later) return <SetUp d={q.data} reload={q.reload} onLater={() => { try { sessionStorage.setItem(LATER, "1"); } catch { /* private */ } setLater(true); }} />;
  if (q.data?.ready && g.data?.ask && !gpuAsked) return <WhisperGpuAsk d={g.data} onClose={() => setGpuAsked(true)} />;
  if (g.loading && !g.data) return null;
  return <SetupModels />;
}

/** "Set up Moworks Studio": what the user does or downloads (shownAtSetup), with the one step or steps that are theirs named. */
function SetUp({ d, reload, onLater }) {
  const t = useT();
  const yours = d.items.filter((it) => it.from === "yours" && it.id !== "work" && !it.ready).map((it) => t(it.title));
  const lead = yours.length > 1 ? t("What the app needs on this computer, in order. Choose the work folder, then download the rest in one go; {steps} are steps you do yourself.", { steps: yours.join(t(" and ")) })
    : t("What the app needs on this computer, in order. Choose the work folder, then download the rest in one go; FFmpeg is the one step you do yourself.");
  const hide = onLater;
  return <div className="overlay fr-overlay">
    <div className="dialog fr-dialog" role="dialog" aria-modal="true" aria-labelledby="fr-h">
      <div className="dialog-head"><h2 id="fr-h">{t("Set up Moworks Studio")}</h2></div>
      <div className="dialog-body">
        <p className="fr-lead">{lead}</p>
        <FirstRunList onDone={reload} needed />
      </div>
      <div className="dialog-foot"><span className="hint">{t("You can come back to this in Settings › System.")}</span><span className="spacer" />
        <button className="btn" onClick={hide}>{t("Set up later")}</button></div>
    </div>
  </div>;
}
