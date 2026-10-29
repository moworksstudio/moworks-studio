// Render: the top bar's button, available any time with whatever is on the timeline; not a pipeline step. A quick
// check runs first and only what would break the render stops it (script errors, missing files, remote URLs, fonts that are missing or
// lack Vietnamese letters), with "Ask Claude to fix"; quality findings are warnings next to the result. Then HyperFrames' render worker.
import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Bot, Check, CheckCircle2, Film, FolderOpen, Loader2, Play, RefreshCw, Square, XCircle } from "lucide-react";
import { get, post, watchJob } from "../api.js";
import { Banner } from "../components.jsx";
import { ago, useData, useToast } from "../lib.jsx";
import { useT } from "../i18n.jsx";
import { size } from "./assets.jsx";
import { stampName } from "../../../packages/render-names/index.mjs";
import { useStage } from "./stage.jsx";

// plain words for each check, English keys for t
export const CHECK_WORDS = { "G-HF-LINT": "Composition files", "G-HF-SCRIPT": "Script errors in the preview", "G-REMOTE": "Loads something from the internet",
  "G-FONT": "A font that is not on this computer", "G-GLYPH": "A font without Vietnamese letters",
  "G-GLYPH-CODE": "A font without Vietnamese letters in the film's code", "G-BLANK": "Scenes that look empty",
  "G-HF-LAYOUT": "Layout: text overlapping, hidden or cut", "G-HF-CONTRAST": "Contrast too low to read", "G-HF-MOTION": "Motion",
  "G-VOICE": "Effects or music over the voice" };          // a warning, never a block
/** A check that did not run says so instead of reporting the film. G-HF-SCRIPT's skippedReason: "deadline" (ran
 *  out of time, no error found before it stopped), "lint" (HF skipped its browser stages after a lint error), "failed" (HF's browser
 *  check did not run); G-HF-LAYOUT / -CONTRAST / -MOTION carry notChecked when HF never ran them: "Not checked", not a pass or a problem. */
export const scriptTimedOut = (g) => g.id === "G-HF-SCRIPT" && (g.skippedReason === "deadline" || g.timedOut === true || ((g.findings ?? []).length > 0 && g.findings.every((f) => f.code === "check_timed_out")));
export const notChecked = (g) => g.notChecked === true || (g.id === "G-HF-SCRIPT" && (g.skippedReason === "lint" || g.skippedReason === "failed"));
export function checkLabel(g, t) {
  if (scriptTimedOut(g)) return t("Could not finish checking the scripts in time");
  const name = t(CHECK_WORDS[g.id] ?? g.title ?? g.id);
  if (g.id === "G-HF-SCRIPT" && notChecked(g)) return t("Not checked: scripts in the preview");
  return notChecked(g) ? t("Not checked: {what}", { what: t(NOT_CHECKED_WORDS[g.id] ?? name) }) : name;
}
const NOT_CHECKED_WORDS = { "G-HF-LAYOUT": "layout", "G-HF-CONTRAST": "contrast", "G-HF-MOTION": "motion" };
/** The server's reasons name the file in brackets ("… (compositions/scene-2.html)"); the UI shows no paths. */
export const noPaths = (s) => String(s ?? "").replace(/\s*\([^()]*[\\/][^()]*\)/g, "").trim();
/** Why a check did not run, in plain words (no "HF", no "browser stages"): the lint error itself, without its file. */
export function notCheckedWhy(g, t) {
  const raw = String(g.skipped || g.findings?.[0]?.message || "");
  const lint = /lint error:\s*(.+)$/i.exec(raw);
  if (g.skippedReason === "lint" || lint) { const what = noPaths(lint?.[1] ?? "").replace(/\.$/, ""); return what ? t("A code problem stopped this check ({what})", { what }) : t("A code problem stopped this check"); }
  if (g.skippedReason === "failed") return t("The check could not run this time");
  return t("This check did not run");
}
const checkDetail = (g, t) => (scriptTimedOut(g) ? t("No script error was found before the check stopped.") : notChecked(g) ? notCheckedWhy(g, t) : null);
const findingText = (f) => f.message ?? f.reason ?? (f.url ? "a file it loads is missing" : f.family ? `${f.family}${f.chars ? ` (${f.chars})` : ""}` : f.composition ?? JSON.stringify(f));

/** The text "Ask Claude to fix" sends: each render-breaking finding, in Claude's own terms. */
export const fixText = (t, blocking) => t("The render is blocked. Fix only these issues, change nothing else:") + "\n" +
  blocking.map((g) => `- ${g.id} (${t(CHECK_WORDS[g.id] ?? g.id)}): ${(g.findings ?? []).slice(0, 6).map(findingText).join("; ")}`).join("\n");

/** The render's loudness in words ("Standard for web and social ✓"); the LUFS and peak numbers only in the details under it. */
export function LoudLine({ l, master }) {
  const t = useT();
  const words = master === "off" ? "Kept as mixed" : l.ok ? (master === "loud" ? "Louder, as the client asked" : "Standard for web and social")
    : l.truePeak != null && l.target?.peak != null && l.truePeak > l.target.peak ? "Peaks a little too loud" : l.lufs != null && l.target?.lufs != null && l.lufs < l.target.lufs ? "Quieter than the standard" : "Louder than the standard";
  return <details className="loud-line"><summary>{t(words)}{l.ok && master !== "off" ? <Check size={13} className="ok" aria-label={t("on target")} /> : null}</summary>
    <span className="hint num">{l.lufs} LUFS · {t("peak")} {l.truePeak} dBTP{l.target?.lufs != null ? ` · ${t("target {lufs} LUFS, peak under {peak} dBTP", { lufs: l.target.lufs, peak: l.target.peak ?? -1 })}` : ""}</span></details>;
}

// why the quick check runs before the file is written (`checksWhy`)
const CHECKS_WHY = { changed: "The film changed since its last check, so the app checks it before writing the file.",
  never: "The film was never checked, so the app checks it before writing the file." };
const CHECKS_WHY_DONE = { changed: "checked first: the film had changed since its last check", never: "checked first: the film had never been checked" };

/** "Used the finished render (1 min ago · on the GPU · took 32 s)": the pre-render an export reused (the server's result.reusedFrom);
 *  when it was made comes first, as a time ago ("made earlier in 1 min" read as a time). */
export function reusedLine(from, t, now = Date.now()) {
  const s = from?.at ? (now - Date.parse(from.at)) / 1000 : null;
  const when = s == null || Number.isNaN(s) ? null : s < 60 ? t("just now") : s < 3600 ? t("{n} min ago", { n: Math.floor(s / 60) })
    : s < 86400 ? t("{n} h ago", { n: Math.floor(s / 3600) }) : t("{n} d ago", { n: Math.floor(s / 86400) });
  const on = from?.gpu === "hardware" ? t("on the GPU") : from?.gpu === "software" ? t("on the CPU") : null;
  const took = from?.ms == null ? null : from.ms < 60000 ? t("took {n} s", { n: Math.max(1, Math.round(from.ms / 1000)) }) : t("took {n} min", { n: Math.round(from.ms / 60000) });
  const how = [when, on, took].filter(Boolean).join(" · ");
  return how ? t("Used the finished render ({how})", { how }) : t("Used the finished render");
}

/** A rendered file's place in the project ("renders/x.mp4"), from what the server gives (it may be a full path). */
const relPath = (p) => { const s = String(p ?? "").replace(/\\/g, "/"); const i = s.lastIndexOf("/renders/"); return i >= 0 ? s.slice(i + 1) : s; };
/** The name the file gets: the server's own rule (packages/render-names, which the server's stampedName uses), at this minute. (The server adds
 *  the seconds, or -2, when that name is taken.) */
export const stampedPreview = (name, ext, now = new Date()) => stampName(name, ext ? `.${ext}` : "", now);
const CODEC = { mp4: "H.264", mov: "QuickTime", webm: "WebM" };
/** What the render makes, in one line: size · aspect · length · codec; the frame rate has its own field above. */
export function specLine(d, film, format) {
  const g = (a, b) => (b ? g(b, a % b) : a);
  const r = d.width && d.height ? g(d.width, d.height) : 0;
  const aspect = film?.aspect ?? (r ? `${d.width / r}:${d.height / r}` : null);
  const sec = film?.duration ?? null;
  return [d.width && d.height ? `${d.width}×${d.height}` : null, aspect, sec ? `${Number(sec).toFixed(1)} s` : null, CODEC[format] ?? null].filter(Boolean).join(" · ");
}
/** One bar for the whole render: the quick check and the GPU test are its first steps, then the frames; the time left is measured
 *  from the frames done so far. { pct, left } (left in seconds, null until it can be told). */
export function renderProgress(job, framesSince, now = Date.now()) {
  if (!job) return { pct: 0, left: null };
  // the quick check moves with the clock when this film's last check time is known (checkExpectSec);
  // the first time there is no honest %, so it is dropped (pct null) and the bar only steps through the parts
  if (job.stage === "checks" && (job.checkTotal > 0 || job.checksSince)) {
    const el = job.checksSince ? Math.max(0, (now - Date.parse(job.checksSince)) / 1000) : 0;
    if (job.checkExpectSec > 0 && job.checksSince) return { pct: Math.round(1 + 5 * Math.min(0.95, el / job.checkExpectSec)), left: el < job.checkExpectSec * 0.95 ? Math.round(job.checkExpectSec - el) : null };
    return { pct: null, bar: Math.round(1 + 4 * Math.min(1, (job.checkDone ?? 0) / (job.checkTotal || 1))), left: null };
  }
  if (job.stage === "checks" || job.stage === "starting") return { pct: 3, left: null };
  if (job.stage === "gpu check") return { pct: 6, left: null };
  const p = Math.max(0, Math.min(100, Number(job.progress) || 0));
  const pct = Math.round(8 + p * 0.92);
  const left = framesSince && p >= 3 ? Math.round(((now - framesSince) / 1000) * (100 - p) / p) : null;
  return { pct, left };
}
const forText = (since, now, t) => { const s = Math.max(0, Math.round((now - Date.parse(since)) / 1000)); return s < 60 ? t("{n} s", { n: s }) : t("{m} min {n} s", { m: Math.floor(s / 60), n: s % 60 }); };
const leftText = (s, t) => (s == null ? null : s < 60 ? t("about {n} s left", { n: Math.max(5, Math.round(s / 5) * 5) }) : t("about {n} min left", { n: Math.round(s / 60) }));

export default function RenderSheet({ projectId, format: initialFormat = "mp4" }) {
  const t = useT();
  const toast = useToast();
  const stage = useStage(projectId);
  const ex = useData(() => get(`/api/projects/${projectId}/exports`), [projectId]);
  const [form, setForm] = useState(null);
  const mix = useData(() => get(`/api/projects/${projectId}/mix`), [projectId]);          // the music's licence (a Mixkit track is online-only)
  const film = useData(() => get(`/api/projects/${projectId}`), [projectId]);          // its length and aspect, for the line under the fields
  const framesSince = useRef(null);          // when the frames began, for the time left
  const [now, setNow] = useState(() => new Date());          // the minute the name preview shows
  useEffect(() => { const h = setInterval(() => setNow(new Date()), 20000); return () => clearInterval(h); }, []);
  const [job, setJob] = useState(null);
  useEffect(() => {
    if (ex.data && !form) setForm({ filename: ex.data.defaults.filename, format: initialFormat, quality: "standard", master: "kit" });
    const r = ex.data?.jobs.find((j) => j.status === "running"); if (r && r.id !== job?.id) follow(r);
    else if (!r && !job && ex.data?.jobs?.[0]) setJob(ex.data.jobs[0]);          // the last render, its result and its checks stay here after reopening
  }, [ex.data]); // eslint-disable-line react-hooks/exhaustive-deps
  const follow = (j) => { framesSince.current = null; setJob(j); watchJob(j.id, (x) => { if (!x) return;
    if (x.stage === "rendering" && framesSince.current == null) framesSince.current = Date.now();
    setJob(x); if (x.status !== "running") ex.reload(); }, 1000); };
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const start = async () => { try { follow(await post(`/api/projects/${projectId}/exports`, { filename: form.filename, format: form.format, quality: form.quality, master: form.master })); } catch (e) { toast(e.message, "error"); } };
  const stop = async () => { try { await post(`/api/jobs/${job.id}/cancel`); } catch (e) { toast(e.message, "error"); } };
  const file = (how, path) => post(`/api/projects/${projectId}/files/${how}`, { path }).catch((e) => toast(e.message, "error"));
  // in the Editor a render plays in the app; elsewhere the system's player opens it
  // the player opens in front, so the Render dialog closes first
  const play = (path) => { if (stage?.play) { stage.close?.(); stage.play(relPath(path)); } else file("open", path); };
  if (ex.error) return <Banner kind="error" action={<button className="btn sm" onClick={ex.reload}>{t("Retry")}</button>}>{ex.error.message}</Banner>;
  if (!form) return <div className="skeleton" style={{ height: "16rem" }} />;
  const running = job?.status === "running";
  const verdict = job?.error?.detail?.verdict;
  const warnings = job?.warnings ?? verdict?.warnings ?? [];
  const d = ex.data.defaults;
  // the loudness setting only means something when the film has music, a voice or sound effects
  const hasSound = !mix.data || !!(mix.data.music || mix.data.voice || mix.data.sfx?.length);
  return <div className="render-sheet">
    <section className="panel">
      <div className="form-cols">
        <label className="field"><span>{t("File name")}</span><input className="input" value={form.filename} onChange={(e) => set("filename", e.target.value)} maxLength={80} disabled={running} />
          {form.filename.trim() && <span className="hint num render-name" title={t("The date and time of the render are added to the name")}>{stampedPreview(form.filename, form.format, now)}</span>}</label>
        <label className="field"><span>{t("Format")}</span><select className="select" value={form.format} onChange={(e) => set("format", e.target.value)} disabled={running}>
          <option value="mp4">MP4 (H.264)</option><option value="mov">MOV</option><option value="webm">WebM</option></select></label>
        <label className="field"><span>{t("Quality")}</span><select className="select" value={form.quality} onChange={(e) => set("quality", e.target.value)} disabled={running}>
          <option value="draft">{t("Draft (fast check)")}</option><option value="standard">{t("Standard")}</option><option value="high">{t("High")}</option></select></label>
        {/* the film renders at its own rate, the one its timeline is built at: shown, not chosen */}
        <div className="field"><span>{t("Frame rate")}</span><span className="input ro num" aria-readonly="true">{t("{n} fps · as the film", { n: ex.data.defaults.fps ?? 30 })}</span></div>
        {hasSound && <label className="field" title={t("Evens out the sound to the studio's level: -16 LUFS, true peak at most -1 dBTP")}><span>{t("Loudness")}</span><select className="select" value={form.master} onChange={(e) => set("master", e.target.value)} disabled={running || form.format === "webm"}>
          <option value="kit">{t("Standard, for web and social (recommended)")}</option><option value="loud">{t("Louder, when the client asks")}</option><option value="off">{t("Keep the mix as it is")}</option></select></label>}
      </div>
      {mix.data?.music?.licence && /mixkit/i.test(mix.data.music.licence) && <Banner kind="warning">{t("Mixkit music is for online use only (YouTube, social, websites, online ads). For TV, radio, cinema, DVD or games, use broadcast-licensed music.")}</Banner>}
      <p className="hint num render-spec">{specLine(d, { aspect: film.data?.aspect ?? film.data?.meta?.format?.aspect, duration: film.data?.duration ?? film.data?.meta?.targetDurationSec }, form.format)}</p>
      <div className="row"><span className="spacer" />
        {running ? <button className="btn" onClick={stop}><Square size={14} />{t("Stop")}</button>
          : <button className="btn primary" onClick={start} disabled={!form.filename.trim()}><Film size={16} />{job ? t("Render again") : t("Render")}</button>}</div>
    </section>

    {job && <section className="panel" aria-live="polite">
      <div className="panel-head">
        {running ? <Loader2 size={16} className="spin" /> : job.status === "done" ? <CheckCircle2 size={16} color="var(--status-ok)" className="icon-pop" /> : job.status === "cancelled" ? <Square size={16} /> : <XCircle size={16} color="var(--status-stop)" />}
        <h2>{running ? (job.stage === "checks" ? t("Quick check…") : t("Rendering")) : job.status === "done" ? t("Render finished") : job.status === "cancelled" ? t("Render stopped") : job.error?.code === "RENDER_BLOCKED" ? t("The render is blocked") : t("Render failed")}</h2>
        <span className="muted end">{ago(job.endedAt ?? job.startedAt)}</span></div>
      {running && (() => { const pr = renderProgress(job, framesSince.current);
        return <div className="progress-line big"><div style={{ flex: 1 }}><div className="bar" role="progressbar" aria-valuenow={pr.pct ?? undefined} aria-valuemin={0} aria-valuemax={100}><span style={{ transform: `scaleX(${(pr.pct ?? pr.bar) / 100})` }} /></div>
          <span className="hint num">{[pr.pct != null ? `${pr.pct}%` : null, leftText(pr.left, t), job.stage === "checks" ? (job.checkWhat ? t("checking the film first: {what} ({done} of {n})", { what: t(job.checkWhat), done: Math.min(job.checkTotal, (job.checkDone ?? 0) + 1), n: job.checkTotal }) : t("checking the film first"))
            + (pr.pct == null && job.checkSince ? ` · ${t("for")} ${forText(job.checkSince, Date.now(), t)}` : "") : job.stage === "gpu check" ? t("one test frame on the GPU") : null].filter(Boolean).join(" · ")}</span></div></div>; })()}
      {/* `checksWhy`: why the checks run before the file is written */}
      {running && job.stage === "checks" && job.checksWhy && <p className="hint">{t(CHECKS_WHY[job.checksWhy] ?? CHECKS_WHY.changed)}</p>}
      {job.gpu && ["test-blank", "test-failed"].includes(job.gpu.reason) && <p className="hint"><AlertTriangle size={13} color="var(--status-pending)" /> {t("The GPU test frame came out wrong, so this render runs on the CPU (slower).")}</p>}
      {job.status === "done" && job.result && <><dl className="kv"><dt>{t("File")}</dt><dd>{String(job.result.file ?? "").split(/[\\/]/).pop()}</dd><dt>{t("Size")}</dt><dd>{size(job.result.size)}</dd>
        {job.result.duration && <><dt>{t("Length")}</dt><dd className="num">{job.result.duration.toFixed(2)} s</dd></>}
        {/* a Brush film's export is the render made when the film was finished: said so, not "0 s on the CPU" */}
        {job.result.reused ? <><dt>{t("Source")}</dt><dd>{reusedLine(job.result.reusedFrom, t)}</dd>
          {/* the time the copy took, and why, when the checks ran first */}
          {job.endedAt && job.startedAt && <><dt>{t("Took")}</dt><dd className="num">{Math.max(1, Math.round((Date.parse(job.endedAt) - Date.parse(job.startedAt)) / 1000))} s
            {job.checksWhy ? ` · ${t(CHECKS_WHY_DONE[job.checksWhy] ?? CHECKS_WHY_DONE.changed)}` : ""}</dd></>}</>
          : <><dt>{t("Took")}</dt><dd className="num">{Math.round(job.result.wallMs / 1000)} s</dd></>}
        {job.result.gpu && !job.result.reused && <><dt>{t("Rendered on")}</dt><dd>{job.result.gpu.mode === "auto" ? t("Automatic (2D film, no test frame)") : job.result.gpu.mode === "hardware" ? t("GPU") + (job.result.gpu.renderer ? ` · ${job.result.gpu.renderer.replace(/^ANGLE \(([^,]+), ([^(]+?) \(.*$/, "$2").trim()}` : "") : t("CPU")}</dd></>}
        {job.result.loudness && !job.result.loudness.silent && !job.result.loudness.error && <><dt>{t("Loudness")}</dt><dd><LoudLine l={job.result.loudness} master={job.settings?.master} /></dd></>}</dl>
        <div className="row"><button className="btn primary sm" onClick={() => play(job.result.file)}><Play size={14} />{t("Play")}</button>
          <button className="btn sm" onClick={() => file("reveal", job.result.file)}><FolderOpen size={14} />{t("Show in folder")}</button>
          <button className="btn sm" onClick={() => stage.open("ae")}>{t("Export to AE")}</button></div></>}
      {job.status === "failed" && verdict && <>
        <ul className="plain checklist blocking">{verdict.blocking.map((g) => <li key={g.id}><XCircle size={14} color="var(--status-stop)" /><div><b>{checkLabel(g, t)}</b>
          <span className="hint"> {(g.findings ?? []).slice(0, 4).map(findingText).join("; ")}</span></div></li>)}</ul>
        <div className="row"><button className="btn primary sm" onClick={() => stage.askClaude(fixText(t, verdict.blocking), { send: true })}><Bot size={14} />{t("Ask Claude to fix")}</button>
          <button className="btn sm" onClick={start}><RefreshCw size={14} />{t("Check again")}</button></div></>}
      {job.status === "failed" && !verdict && <><Banner kind="error" action={<button className="btn sm" onClick={start}>{t("Retry")}</button>}>{job.error?.message}</Banner>
        <details className="diag"><summary>{t("Diagnostics")}</summary><pre className="mono">{JSON.stringify({ code: job.error?.code, detail: job.error?.detail, log: job.log?.slice(-20) }, null, 2)}</pre></details></>}
      {job.status === "cancelled" && <p className="secondary">{t("Stopped before it finished. Nothing was kept.")}</p>}
      {/* the tech checks' own dialog, for whoever wants the detail (it is no step or button in the Editor) */}
      {(verdict || warnings.length > 0) && <button className="clink" onClick={() => stage.open("qa")}>{t("Tech checks: details")}</button>}
      {warnings.length > 0 && <details className="warn-list" open><summary><AlertTriangle size={13} color="var(--status-pending)" /> {warnings.length === 1 ? t("1 thing to look at · it does not stop the render") : t("{n} things to look at · they do not stop the render", { n: warnings.length })}</summary>
        <ul className="plain">{warnings.map((g, i) => <li key={i}><b>{checkLabel(g, t)}</b> <span className="hint">{checkDetail(g, t) ?? (g.findings ?? []).slice(0, 3).map(findingText).join("; ")}</span></li>)}</ul></details>}
    </section>}

    <section className="panel">
      <div className="panel-head"><h2>{t("Rendered files")}</h2>
        {/* after the app restarts the render job is gone, but the last render's checks stay one click away */}
        {!job && (ex.data.files[0]?.gates || ex.data.lastQa) && <button className="clink end" onClick={() => stage.open("qa")}>{t("Tech checks: details")}</button>}</div>
      {ex.data.files.length === 0 ? <p className="muted">{t("Nothing rendered yet.")}</p> : <ul className="plain file-list">{ex.data.files.map((f) => (
        <li key={f.path}><Film size={14} /><span className="name">{f.name}</span><span className="muted num">{size(f.size)} · {ago(f.at)}</span>
          <button className="btn ghost sm" onClick={() => play(f.path)}><Play size={13} />{t("Play")}</button>
          <button className="btn ghost sm" onClick={() => file("reveal", f.path)}><FolderOpen size={13} />{t("Show")}</button></li>))}</ul>}
    </section>
  </div>;
}
