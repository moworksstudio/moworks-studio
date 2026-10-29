// Export to AE: after a film is built, the existing aeExport turns it into an editable After Effects project.
// Prerequisites first (After Effects found and open, no dialog showing), the known limit (AE's caches and Undo history are cleared) and a
// confirmation right before the run; then progress, the .aep, the frame checks against HyperFrames' stills, and the notes (font
// substitutions). No round trip back into the app is claimed. Plain words, one checklist in green / amber / red (the
// two reminders about After Effects' state merged into one line), and "Check size" read out as a sentence with its key numbers in bold.
import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Clapperboard, FolderOpen, Gauge, Loader2, RefreshCw, Square, XCircle, Info } from "lucide-react";
import { get, post, watchJob } from "../api.js";
import { Banner, Dialog, StatusIcon } from "../components.jsx";
import { ago, go, locale, useData, useToast } from "../lib.jsx";
import { useT } from "../i18n.jsx";
import { stampedPreview } from "../workflow/RenderSheet.jsx";
import AeBadge, { AE_STATE, aeLevel } from "../workflow/AeBadge.jsx";

// English keys for t
// the size check's numbers and how heavy they are: under the first bound green, under the second amber, else red
const HEAVY = { layers: [600, 1500], mb: [300, 1000], minutes: [3, 10] };
const level = (k, v) => (v == null || !HEAVY[k] ? 0 : v < HEAVY[k][0] ? 0 : v < HEAVY[k][1] ? 1 : 2);
const LEVEL = [["ok", "ok"], ["run", "warning"], ["stop", "error"]];

/** "About 252 layers in 6 comps, ~41 MB, about 1 min to export. Heaviest scene: 3 (92 layers)." with the numbers in bold, coloured by weight.
 *  A film drawn on one canvas says so, and "0 layers" is never green (red: nothing to export). The canvas notice takes the
 *  style's AE badge colour (amber when the style has none). */
export function SizeSummary({ e, ae = null }) {
  const t = useT();
  const n = (v) => Number(v ?? 0).toLocaleString(locale());
  const as = LEVEL.find(([k]) => k === AE_STATE[ae]) ?? LEVEL[1];
  if (VIDEO[e.kind]) return <div className={"ae-size state-line " + as[0]} role="status"><StatusIcon status={as[1]} />
    <span><b>{t(VIDEO[e.kind])}</b> {t("After Effects gets it as")} <b>{t("one video layer")}</b> {t("(the rendered film), not as layers you can edit. About")} <b>{t("{n} min", { n: Math.max(1, Math.round(e.minutes ?? 1)) })}</b> {t("to export.")}</span></div>;
  if (!e.layers) return <div className="ae-size state-line stop" role="status"><StatusIcon status="error" />
    <span><b>{t("Nothing to export:")}</b> {t("the film has no layers After Effects can take.")}</span></div>;
  const later = e.kind === "layers" && e.later > 0;          // parts that show only later in the film: the export reads the layers at 0 s
  const worst = Math.max(level("layers", e.layers), level("mb", e.mb), level("minutes", e.minutes), e.kind === "mostly-canvas" || later ? 1 : 0);
  const top = Array.isArray(e.most) && e.most[0];
  const scene = top ? String(top[0]).match(/(\d+)$/)?.[1] ?? String(top[0]) : null;
  const min = Math.max(1, Math.round(e.minutes ?? 0));
  return <div className={"ae-size state-line " + LEVEL[worst][0]} role="status"><StatusIcon status={LEVEL[worst][1]} />
    <span>{t("About")} <b>{t("{n} layers", { n: n(e.layers) })}</b> {t("in")} <b>{t("{n} comps", { n: n(e.comps) })}</b>, <b>~{n(Math.round(e.mb ?? 0))} MB</b>, {t("about")} <b>{t("{n} min", { n: min })}</b> {t("to export.")}
      {scene && <> {t("Heaviest scene:")} <b>{scene}</b> ({t("{n} layers", { n: n(top[1]) })}).</>}
      {e.kind === "mostly-canvas" && <> {t("Most of the picture is drawn on a canvas: it comes as pictures; the other layers can be edited.")}</>}
      {later && <> {t("Some parts show only later in the film: After Effects does not get them.")}</>}
      {worst > 0 && e.kind !== "mostly-canvas" && !later && <> {t(worst === 2 ? "A very large export: expect a long run and a heavy project." : "A large export: it takes a while.")}</>}</span></div>;
}
// the films After Effects gets as one video layer (the rendered film), and why, as the size check names them (port.py film_kind)
const VIDEO = { canvas: "This film is drawn on one canvas:", dynamic: "This film makes its picture as it plays:", empty: "This film draws outside its layers:" };
const STAGE = { page: "Opening the film in HyperFrames", reference: "Taking HyperFrames reference stills", record: "Recording the motion", pictures: "Making pictures for non-native layers",
  keys: "Writing keyframes", ae: "Building the project in After Effects", check: "Checking frames against HyperFrames", copy: "Copying footage and audio", film: "Getting the rendered film", starting: "Starting" };

export default function PortAE({ id, setCrumbs = () => {} }) {
  const t = useT();
  const toast = useToast();
  const project = useData(() => get(`/api/projects/${id}`), [id]);
  const st = useData(() => get(`/api/projects/${id}/ae`), [id]);
  // the film style's AE badge (the server's `ae`): what After Effects gets of this kind of film, beside Check size
  const styles = useData(() => get("/api/styles/list"), []);
  const [job, setJob] = useState(null);
  const [est, setEst] = useState(null);
  const [ask, setAsk] = useState(false);
  useEffect(() => { setCrumbs(project.data ? [t("Projects"), project.data.title, t("Export to AE")] : null); }, [project.data, t]); // eslint-disable-line react-hooks/exhaustive-deps
  // the frame rate is the film's, everywhere: shown, never chosen here, and not sent; the server exports at the film's rate
  const fps = st.data?.fps ?? project.data?.meta?.format?.fps ?? 30;
  useEffect(() => { const r = st.data?.jobs.find((j) => j.status === "running"); if (r && r.id !== job?.id) follow(r); }, [st.data]); // eslint-disable-line react-hooks/exhaustive-deps
  const follow = (j) => { (j.kind === "ae-estimate" ? setEst : setJob)(j); watchJob(j.id, (x) => { if (!x) return; (x.kind === "ae-estimate" ? setEst : setJob)(x); if (x.status !== "running") st.reload(); }, 1500); };
  const start = async (estimate) => { setAsk(false); try { follow(await post(`/api/projects/${id}/ae`, { estimate })); } catch (e) { toast(e.message, "error"); st.reload(); } };
  const stop = async (j) => { try { await post(`/api/jobs/${j.id}/cancel`); } catch (e) { toast(e.message, "error"); } };
  const reveal = (path) => post(`/api/projects/${id}/files/reveal`, { path }).catch((e) => toast(e.message, "error"));
  const d = st.data, p = project.data;
  const style = p?.meta?.style?.ae ? p.meta.style : styles.data?.styles?.find((x) => x.id === p?.meta?.style?.id) ?? null;
  const projectName = String(p?.path ?? p?.title ?? "").split(/[\\/]/).pop();          // the folder's own name: the export folder takes it, with the date and time
  // the server says built (a one-page code film has no scene files); its count is the scenes, else the shots
  const built = d?.built ?? (p?.scenes ?? 0) > 0;
  const parts = (p?.scenes ?? 0) > 0 ? (p.scenes === 1 ? t("1 scene") : t("{n} scenes", { n: p.scenes })) : d?.shots ? t("{n} shots", { n: d.shots }) : null;
  const running = job?.status === "running" ? job : null;
  const last = running ? null : job?.status ? (job.result ?? job.error?.detail ?? null) : d?.last;
  // A Stop kept with the film is "stopped" when the page opens again, never "failed"
  const lastStatus = running ? null : job?.status ?? (["done", "cancelled"].includes(d?.last?.status) ? d.last.status : d?.last ? "failed" : null);
  // the size check of the film as it is now: this session's, or the last one kept with the film (what AE gets of a canvas film)
  const size = est?.status === "done" && est.result?.estimate ? est.result.estimate : d?.estimate ?? null;
  // The last export to After Effects (the Render's time is not one)
  const exportedAt = d?.last?.status === "done" ? d.last.at : null;
  if (st.error) return <div className="page"><Banner kind="error" action={<button className="btn sm" onClick={st.reload}>{t("Retry")}</button>}>{st.error.message}</Banner></div>;
  if (!d || !p) return <div className="page"><div className="skeleton" style={{ height: "21.3333rem" }} /></div>;

  return <div className="page">
    {/* no lone Render button here; it sits on the "Build the film first" line, where it has a reason */}
    <div className="page-head"><div><p className="lead">{t("Makes an After Effects project you can edit, with the film's footage and sound, then checks its frames against the film.")}</p></div></div>

    <section className="panel" aria-label={t("Before you start")}>
      <div className="panel-head"><h2>{t("Before you start")}</h2><button className="btn sm end" onClick={st.reload}><RefreshCw size={14} />{t("Check again")}</button></div>
      <ul className="plain checklist ae-checks">
        <li className={d.installs.length ? "ok" : "stop"}><StatusIcon status={d.installs.length ? "ok" : "error"} />{d.installs.length ? <span>{t("After Effects found")} <span className="muted">· {d.installs.map((x) => x.name).join(", ")}</span></span> : t("After Effects is not installed on this computer.")}</li>
        <li className={d.running ? "ok" : "run"}><StatusIcon status={d.running ? "ok" : "warning"} />{d.running ? t("After Effects is open.") : <span><b>{t("Open After Effects")}</b> {t("and wait for its start screen to close, then Check again.")}</span>}</li>
        {/* a reminder, never a stop: it does not hold the Export button (the user read the warning sign as "stuck") */}
        <li><Info size={16} className="ico muted" aria-hidden="true" /><span><b>{t("Save your work in After Effects and close its dialogs:")}</b> {t("the export clears its caches and Undo history.")}</span></li>
        <li className={built ? "ok" : "stop"}><StatusIcon status={built ? "ok" : "error"} />{built ? <span>{t("The film is built:")} {parts && <><b>{parts}</b>, </>}<b>{t("{n} fps", { n: fps })}</b>{exportedAt ? <span className="muted"> · {t("exported to AE {ago}", { ago: ago(exportedAt) })}</span> : null}</span> : <b>{t("Build the film first: there is nothing to export yet.")}</b>}</li>
      </ul>
      {size && <SizeSummary e={size} ae={aeLevel(style)} />}
      {est?.status === "failed" && <p className="state-line stop"><XCircle size={14} />{t("The size check did not finish:")} {est.error?.message}</p>}
      <div className="ae-acts">
        <AeBadge s={style} />
        <button className="btn" onClick={() => start(true)} disabled={!built || est?.status === "running" || !!running} title={t("Counts the layers, comps and size before the real export; takes seconds")}>{est?.status === "running" ? <Loader2 size={14} className="spin" /> : <Gauge size={14} />}{t("Check size")}</button>
        <button className="btn primary" onClick={() => setAsk(true)} disabled={!built || !d.running || !!running}><Clapperboard size={16} />{t("Export to AE")}</button></div>
    </section>

    {running && <section className="panel" aria-label={t("Progress")}>
      <div className="panel-head"><Loader2 size={16} className="spin" /><h2>{t("Exporting to AE")}</h2><button className="btn sm end" onClick={() => stop(running)}><Square size={13} />{t("Stop")}</button></div>
      <div className="progress-line big"><div style={{ flex: 1 }}><div className="bar"><span style={{ width: `${running.progress ?? 5}%` }} /></div>
        <span className="hint">{STAGE[running.stage] ? t(STAGE[running.stage]) : running.stage}{running.progress != null ? ` · ${running.progress}%` : ""}</span></div></div>
      <details className="diag" open><summary>{t("Log")}</summary><pre className="mono log">{running.log.slice(-14).join("\n")}</pre></details>
    </section>}

    {last && <section className="panel" aria-label={t("Result")}>
      <div className="panel-head">{lastStatus === "done" ? <CheckCircle2 size={16} color="var(--success)" /> : lastStatus === "cancelled" ? <Square size={16} /> : <XCircle size={16} color="var(--danger)" />}
        <h2>{lastStatus === "done" ? t("Export to AE finished") : lastStatus === "cancelled" ? t("Export to AE stopped") : t("Export to AE failed")}</h2>{last.at && <span className="muted end" style={{ fontSize: "var(--fs-meta)" }}>{ago(last.at)}</span>}</div>
      {lastStatus === "cancelled" && <p className="hint">{t("You stopped the export.")}</p>}
      {lastStatus !== "done" && lastStatus !== "cancelled" && <Banner kind="error">{last.message ?? job?.error?.message ?? t("Export to AE failed.")}{last.code === "AE_NOT_RUNNING" ? "" : " " + t("See the log below.")}</Banner>}

      {last.aep && <div><button className="btn sm" onClick={() => reveal(last.aep)}><FolderOpen size={14} />{t("Show in folder")}</button></div>}
      {last.checks?.length > 0 && <><h3 style={{ fontSize: "var(--fs-control)", fontWeight: 500 }}>{t("Frame checks (After Effects against the film)")}</h3>
        <ul className="plain checklist">{last.checks.map((c) => <li key={c.t}><StatusIcon status={c.diff <= 0.02 ? "ok" : c.diff <= 0.06 ? "warning" : "error"} /><span className="num">{t("{time} s: {pct} % of pixels differ", { time: c.t.toFixed(2), pct: (c.diff * 100).toFixed(2) })}</span></li>)}</ul>
        <p className="hint">{t("Small differences come from anti-aliasing and motion blur; a large one points at a layer to check.")}</p></>}
      {last.notes?.length > 0 && <><h3 style={{ fontSize: "var(--fs-control)", fontWeight: 500 }}><AlertTriangle size={13} color="var(--warning)" /> {t("Notes, font swaps included")}</h3>
        <ul className="plain checklist">{last.notes.map((n, i) => <li key={i}><StatusIcon status="warning" />{n}</li>)}</ul></>}
      {(last.log ?? job?.log)?.length > 0 && <details className="diag"><summary>{t("Log")}</summary><pre className="mono log">{(last.log ?? job.log).slice(-60).join("\n")}</pre></details>}
      <p className="hint">{t("Changes made in After Effects stay there; they do not come back into the app.")}</p>
    </section>}

    {ask && <Dialog title={t("Export to After Effects now?")} onClose={() => setAsk(false)} footer={<><span className="spacer" /><button className="btn" onClick={() => setAsk(false)}>{t("Cancel")}</button>
      <button className="btn primary" onClick={() => start(false)}>{t("Export to AE")}</button></>}>
      <p>{t("The app drives After Effects for a few minutes; do not use it until it finishes.")}</p>
      <p><b>{t("Its caches and Undo history are cleared.")}</b> {t("Save your AE work first.")}</p>
      {/* What After Effects gets of a film drawn on a canvas, said before the export */}
      {VIDEO[size?.kind] ? <p><b>{t(VIDEO[size.kind])}</b> {t("After Effects gets it as one video layer, not as layers you can edit.")}</p>
        : size?.kind === "mostly-canvas" ? <p><b>{t("Most of the picture is drawn on a canvas:")}</b> {t("it comes as pictures; the other layers can be edited.")}</p>
        : !size && d.canvas > 0 ? <p><b>{t("This film draws on a canvas:")}</b> {t("what is drawn there comes as video or pictures, not as layers you can edit.")}</p> : null}
      {/* each export goes into its own folder named for the film and the date and time it was made (the server's stampedName) */}
      <p className="hint">{t("{fps} fps. Saved with the project in a folder named like {name}; Show in folder opens it when it is done.", { fps, name: stampedPreview(projectName, "") })}</p>
    </Dialog>}
  </div>;
}
