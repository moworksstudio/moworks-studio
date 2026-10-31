// First run: the look, then "Set up Moworks Studio": the projects folder and one Install for every component the app needs to make
// films (HyperFrames and its Chrome, FFmpeg and Python 3.12 with winget, the Python components, the speech-to-text model; what came
// with the app is only copied). No list of parts, versions or sources on screen (owner 30/10): one line, one progress. Only on a
// computer without winget are FFmpeg and Python the user's own steps, shown while missing with the line to copy. "Set up later" hides
// the dialog for this session (no internet, or a film to finish); it comes back at the next start until the app has what it needs.
// One choice beside that line: the free voice (Kokoro), on by default. It is optional, so a computer without it stays ready. Other optional
// extras (Whisper on an NVIDIA card) are no part of it: Settings › System offers them all, beside the same one line and the open-source licences.
// Data: GET /api/setup/first-run; POST /api/setup/first-run (a job: stage "<id>: <line>", progress 0-100); PATCH /api/storage/location;
// GET / DELETE /api/setup/whisper-gpu; DELETE /api/setup/kokoro.
// The very first start asks which look the app wears, The Desk (the default) or The Studio, before anything else; once answered it
// never asks again (theme.jsx themeAsked); Settings › General changes it.
import { useEffect, useRef, useState } from "react";
import { Check, Copy, Cpu, Download, Loader2, Trash2, User } from "lucide-react";
import { del, get, patch, post, watchJob } from "../api.js";
import { StatusIcon } from "../components.jsx";
import { useData, useToast } from "../lib.jsx";
import { useT } from "../i18n.jsx";
import { FolderField } from "./folder.jsx";
import { THEMES_SHOWN, markThemeAsked, themeAsked, useAppearance } from "../theme.jsx";

export const mb = (n) => (n >= 1024 ? `${(n / 1024).toFixed(1)} GB` : n > 0 && n < 1 ? "< 1 MB" : `${Math.round(n)} MB`);
// a source: one link, a list, or links joined by " · "; a PyPI link is named by its package and version
const links = (src) => [].concat(src ?? []).flatMap((x) => String(x).split(" · ")).filter(Boolean)
  .map((u) => { const m = u.match(/pypi\.org\/project\/([^/]+)\/([^/]+)/); return [u, m ? `${m[1]} ${m[2]}` : null]; });
// a licence line without the note that names files ("(each sound's source in sfx/catalog.json …)"): no file names on screen
const plain = (s) => String(s).replace(/\s*\([^)]*\.(?:json|md)\b[^)]*\)/g, "");
/** What the progress line says while a part is set up. */
const DOING = { library: "Copying the library", assets: "Copying fonts and code libraries", "hf-skills": "Copying HyperFrames' skills", "hf-runtime": "Downloading the engine",
  ffmpeg: "Installing FFmpeg", python: "Installing Python and its components", speech: "Downloading the speech-to-text model", "whisper-gpu": "Downloading the graphics-card part", kokoro: "Downloading the free voice" };
const doing = (id) => DOING[id] ?? (String(id ?? "").startsWith("style-") ? "Copying the film styles" : "Setting up");
const LATER = "mw-first-run-later";
const needed = (d) => d.items.filter((it) => !it.ready && it.from !== "yours" && !it.optional);
const yours = (d) => d.items.filter((it) => it.from === "yours" && it.id !== "work" && !it.ready);

/** The setup job: start it (every missing part, or only `ids`; `extras`: optional items chosen beside them) and follow its stage and progress; `after` once it ends. */
export function useSetupJob(after) {
  const t = useT();
  const toast = useToast();
  const [job, setJob] = useState(null);
  const start = async (ids = null, extras = []) => {
    try {
      const r = await post("/api/setup/first-run", { ...(ids ? { ids } : {}), ...(extras.length ? { extras } : {}) }); const j = r.job ?? r; setJob(j);
      watchJob(j.id, (x) => { if (!x) return; setJob(x.status === "running" ? x : null);
        if (x.status !== "running") { after?.(); if (x.status === "failed") toast(x.error?.message ?? t("The download stopped."), "error");
          if (x.result?.skipped?.length) toast(t("The free voice could not be installed. Settings › System can try again."), "error"); } }, 1000);
    } catch (e) { toast(e.message, "error"); }
  };
  return { job, start };
}

/** The components as one line: what is left to download, or "all ready" (and the size on disk), or the running install's bar.
 *  `label`: the line names itself (Settings; the setup dialog's step title already does). */
export function ComponentsLine({ d, job, label = false, size = null, problems = 0, action = null, plusMb = 0 }) {
  const t = useT();
  const need = needed(d);
  const id = job?.stage ? String(job.stage).split(":")[0].trim() : null;
  const pct = job?.progress ?? 0;
  return <div className={"fr-comp" + (job ? " busy" : "")}>
    {job ? <Loader2 size={15} className="spin fr-comp-ic" /> : <StatusIcon status={need.length ? "neutral" : problems ? "error" : "ok"} size={15} />}
    {label && <b>{t("Components")}</b>}
    {job ? <><span className="fr-bar" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}><i style={{ width: `${pct}%` }} /></span>
      <span className="muted num">{pct}% · {t(doing(id))}</span></>
      : <span className="muted num">{need.length ? (d.mb + plusMb > 0 ? t("{size} to download", { size: mb(d.mb + plusMb) }) : t("Not set up yet"))
        : [problems ? t("{n} need attention", { n: problems }) : t("All ready"), size].filter(Boolean).join(" · ")}</span>}
    {action && <><span className="spacer" />{action}</>}
  </div>;
}

/** The user's own steps still missing (FFmpeg, Python 3.12): one line each, with the winget line to copy. */
export function YourSteps({ d }) {
  const t = useT();
  const toast = useToast();
  const list = yours(d);
  if (!list.length) return null;
  const copy = async (s) => { try { await navigator.clipboard.writeText(s); toast(t("Copied")); } catch { toast(s); } };
  return <ul className="plain fr-yours">{list.map((it) => <li key={it.id}><User size={14} aria-hidden="true" />
    <div><p><b>{t(it.title)}</b> <span className="muted">{t(it.what)}</span></p>
      {it.command && <div className="fr-cmd"><code className="mono">{it.command}</code><button type="button" className="btn ghost sm" onClick={() => copy(it.command)}><Copy size={13} />{t("Copy")}</button></div>}</div></li>)}</ul>;
}

/** Settings › System's optional extras (the free voice; Whisper on an NVIDIA card, offered only on such a computer): download or remove each. */
export function Extras({ d, reload }) {
  const t = useT();
  const toast = useToast();
  const gpu = useData(() => get("/api/setup/whisper-gpu").catch(() => null), []);
  const { job, start } = useSetupJob(() => { reload(); gpu.reload(); });
  const list = d.items.filter((it) => it.optional);
  if (!list.length) return null;
  const drop = async (id) => { try {
    if (id === "kokoro") { await del("/api/setup/kokoro"); toast(t("The free voice is removed")); } else { await del("/api/setup/whisper-gpu"); toast(t("Whisper runs on the CPU again")); }
    reload(); gpu.reload(); } catch (e) { toast(e.message, "error"); } };
  const jobId = job?.stage ? String(job.stage).split(":")[0].trim() : null;
  return <div className="panel">
    <div className="panel-head"><h2>{t("Optional")}</h2></div>
    {list.map((it) => <div key={it.id} className="fr-extra">
      <div className="fr-comp">
        <StatusIcon status={it.ready ? "ok" : "neutral"} size={15} /><b>{it.id === "whisper-gpu" ? t("Whisper on the graphics card") : t(it.title)}</b>
        {job && jobId === it.id ? <><span className="fr-bar"><i style={{ width: `${job.progress ?? 0}%` }} /></span><span className="muted num">{job.progress ?? 0}%</span></>
          : <span className="muted">{t(it.what)}</span>}
        <span className="spacer" />
        {!job && (it.ready ? <button type="button" className="btn ghost sm" onClick={() => drop(it.id)}><Trash2 size={13} />{t("Remove")}</button>
          : <button type="button" className="btn sm" onClick={() => start([it.id])}><Download size={13} />{t("Download ({size})", { size: mb(it.mb) })}</button>)}
      </div>
      {it.id === "whisper-gpu" && gpu.data && <WhereWhisper d={gpu.data} />}
    </div>)}
  </div>;
}

/** Where Whisper ran: the card, or the CPU with the reason the card could not be used. */
function WhereWhisper({ d }) {
  const t = useT();
  const onGpu = d.device === "gpu" && d.gpu;
  const why = d.lastRun?.device === "cpu" && d.lastRun.reason;
  return <p className="fr-gpu"><Cpu size={13} aria-hidden="true" />{onGpu ? t("Whisper runs on the {card}.", { card: d.gpu.name }) : t("Whisper runs on the CPU.")}{why && <span className="muted"> {why}</span>}</p>;
}

// the parts that came with the app named in the licences, by their manifest name; the rest are the studio's own or repeat a line here
// (the library's copies of a style source, the gallery's tiles), and each Motion Library item keeps its source in its catalog
const PARTS = { fonts: "Fonts", libraries: "Code libraries", "hf-skills": "HyperFrames skills", "hf-registry": "HyperFrames registry", "lemo-opuscar": "Lemo-Opuscar",
  "mg-styles-15": "mg-styles-15", anidoodle: "anidoodle", "claude-animation-base": "ClaudeAnimationBase", "motion-prompt": "Motion Prompt", "what-if-animation": "What If animation", sfx: "Sound effects" };
/** Settings › System's "Open-source licences", folded: each outside part by its name, its author and licence, and a link to its source. */
export function LicencesFold({ d }) {
  const t = useT();
  const parts = (Array.isArray(d?.bundle?.parts) ? d.bundle.parts : []).filter((p) => PARTS[p.name]);
  const items = (d?.items ?? []).filter((it) => it.licence);
  return <details className="diag fr-sources"><summary>{t("Open-source licences")}</summary>
    <ul className="plain">
      {parts.map((p) => <li key={p.name}><b>{t(PARTS[p.name])}</b>{p.licence && <span className="muted"> · {plain(p.licence)}</span>}
        {p.source && <> · <a href={p.source} target="_blank" rel="noopener noreferrer">{t("Source")}</a></>}</li>)}
      {items.map((it) => <li key={it.id}><b>{it.label ?? (it.id === "whisper-gpu" ? "NVIDIA CUDA" : t(it.title))}</b>{[it.author, it.licence].filter(Boolean).map((x) => <span key={x} className="muted"> · {x}</span>)}
        {links(it.source).map(([u, name]) => <span key={u}> · <a href={u} target="_blank" rel="noopener noreferrer">{name ?? t("Source")}</a></span>)}</li>)}
      <li><b>{t("Motion Library")}</b><span className="muted"> · {t("built from open-source items; their licences come with the app")}</span></li>
    </ul></details>;
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

/** The first-start dialogs, in this order: the look, then Set up while the app lacks what it needs. A ready computer sees neither. */
export default function FirstRun() {
  const q = useData(() => get("/api/setup/first-run").catch(() => null), []);
  const [lookAsked, setLookAsked] = useState(themeAsked);
  const [later, setLater] = useState(() => { try { return sessionStorage.getItem(LATER) === "1"; } catch { return false; } });
  if (!lookAsked && THEMES_SHOWN.length > 1) return <ThemeAsk onDone={() => setLookAsked(true)} />;
  if (!q.data || q.data.ready || later) return null;
  return <SetUp d={q.data} reload={q.reload} onLater={() => { try { sessionStorage.setItem(LATER, "1"); } catch { /* private */ } setLater(true); }} />;
}

/** "Set up Moworks Studio": 1 the projects folder, 2 the components in one line, the user's own steps while missing; Install. */
function SetUp({ d, reload, onLater }) {
  const t = useT();
  const toast = useToast();
  const { job, start } = useSetupJob(reload);
  const work = d.items.find((it) => it.id === "work");
  const setWork = async (path) => { try { await patch("/api/storage/location", { path }); reload(); } catch (e) { toast(e.message, "error"); } };
  const need = needed(d).length > 0;
  // the free voice: one choice beside the components, on until the user turns it off; only while there is an Install to go with it
  const voice = d.items.find((it) => it.id === "kokoro" && !it.ready);
  const [freeVoice, setFreeVoice] = useState(true);
  const extraMb = voice && freeVoice ? voice.mb : 0, total = d.mb + extraMb;
  return <div className="overlay fr-overlay">
    <div className="dialog fr-dialog" role="dialog" aria-modal="true" aria-labelledby="fr-h">
      <div className="dialog-head"><h2 id="fr-h">{t("Set up Moworks Studio")}</h2></div>
      <div className="dialog-body">
        <ol className="plain fr-steps">
          <li className="fr-step"><div className="fr-step-h"><span className="np2-n">1</span><b>{t("Projects folder")}</b></div>
            <p className="fr-what">{t("Choose the folder that stores your projects.")}</p>
            <FolderField value={work?.path ?? ""} title={t("Projects folder")} onChange={(path) => setWork(path)} /></li>
          <li className="fr-step"><div className="fr-step-h"><span className="np2-n">2</span><b>{t("Components")}</b></div>
            <p className="fr-what">{t("Everything the app needs to make films, installed in one go.")}</p>
            <ComponentsLine d={d} job={job} plusMb={extraMb} />
            <YourSteps d={d} />
            {voice && need && <label className="fr-choice"><input type="checkbox" checked={freeVoice} disabled={!!job} onChange={(e) => setFreeVoice(e.target.checked)} />
              <span><b>{t("Free voice (Kokoro)")}</b>{" "}{t("A voice model that reads your script on this computer, free, with no account. About {size}. No Vietnamese.", { size: mb(voice.mb) })}</span></label>}</li>
        </ol>
      </div>
      <div className="dialog-foot"><span className="hint">{t("Also in Settings › System.")}</span><span className="spacer" />
        {!job && <button className="btn" onClick={onLater}>{t("Set up later")}</button>}
        {job ? <button className="btn primary" disabled><Loader2 size={14} className="spin" />{t("Installing…")}</button>
          : need ? <button className="btn primary" onClick={() => start(null, voice && freeVoice ? [voice.id] : [])}><Download size={14} />{total > 0 ? t("Install ({size})", { size: mb(total) }) : t("Install")}</button>
            : <button className="btn" onClick={reload}>{t("Check again")}</button>}</div>
    </div>
  </div>;
}
