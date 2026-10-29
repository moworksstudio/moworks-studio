// Settings › Update: the app updates itself from the project's private GitHub repo. The version
// in use, "Check for updates", and when there is one: what changed (the commits, newest first, and CHANGELOG.md), what blocks it (local
// changes, a branch that went its own way), then "Update and restart". While it runs, its stage; the app restarts itself when it is done,
// and goes back to the version before if a step fails. The last update's result stays as one line.
// Data: GET /api/app/update; POST /api/app/update/check; POST /api/app/update/apply (a job "app-update").
import { useState } from "react";
import { AlertTriangle, Check, Download, Loader2, RefreshCw, RotateCcw } from "lucide-react";
import { get, post, watchJob } from "../api.js";
import { Banner, Dialog } from "../components.jsx";
import { ago, useData, useToast } from "../lib.jsx";
import { useT } from "../i18n.jsx";

const day = (d) => { try { return new Date(d).toLocaleDateString(); } catch { return d ?? ""; } };

/** The last update, as one line in the state colours. No commit hash: the "In use" line above names the version by its date and subject. */
function LastResult({ last }) {
  const t = useT();
  if (!last?.status) return null;
  if (last.status === "done") return <p className="state-line ok"><Check size={14} />{t("Updated {when}.", { when: ago(last.at) })}</p>;
  return <p className="state-line stop"><AlertTriangle size={14} />{last.status === "rolled-back"
    ? t("The update failed at “{step}”; the app went back to the version before, {when}.", { step: t(last.failedAt ?? "?"), when: ago(last.at) })
    : t("The last update failed, {when}.", { when: ago(last.at) })}{last.error ? ` ${t(last.error)}` : ""}</p>;
}

export default function AppUpdate() {
  const t = useT();
  const toast = useToast();
  const q = useData(() => get("/api/app/update"), []);
  const [check, setCheck] = useState(null);           // the last check's answer
  const [checking, setChecking] = useState(false);
  const [err, setErr] = useState(null);               // a check or apply error: { code, message, command }
  const [ask, setAsk] = useState(false);
  const [job, setJob] = useState(null);               // the running update: { stage, status, result, error }
  if (q.error) return q.error.status === 404 ? <p className="hint">{t("Updating from here is not available in this version.")}</p> : <Banner kind="error">{q.error.message}</Banner>;
  const d = q.data;
  if (!d) return <div className="skeleton" style={{ height: "12rem" }} />;
  const doCheck = async () => {
    setChecking(true); setErr(null);
    try { setCheck(await post("/api/app/update/check")); q.reload(); }
    catch (e) { setErr({ code: e.code, message: e.message }); setCheck(null); } finally { setChecking(false); }
  };
  const apply = async () => {
    setAsk(false); setErr(null);
    try {
      const r = await post("/api/app/update/apply"); const j = r.job ?? r; setJob(j);
      watchJob(j.id, (x) => { if (!x) return; setJob(x);
        if (x.status === "failed") { setErr({ code: x.error?.code, message: x.error?.message ?? t("The update did not finish."), command: x.error?.detail?.command, tail: x.error?.detail?.tail }); q.reload(); }          // jobs.mjs: { code, message, detail }
        if (x.status === "done") toast(t("Updated: the app restarts in a moment")); }, 1000);
    } catch (e) { setErr({ code: e.code, message: e.message }); }
  };
  const running = job?.status === "running";
  const done = job?.status === "done";
  const blocked = check?.blocked ?? [];
  return <div className="upd">
    <div className="panel">
      <div className="panel-head"><h2>{t("Version")}</h2>
        <button className="btn sm end" onClick={doCheck} disabled={checking || running || !d.configured || !d.git}>{checking ? <Loader2 size={14} className="spin" /> : <RefreshCw size={14} />}{t("Check for updates")}</button></div>
      {!d.git ? <p className="state-line stop"><AlertTriangle size={14} />{t("This copy of the app cannot update itself; install the new version instead.")}</p>
        : !d.configured ? <p className="state-line run"><AlertTriangle size={14} />{t("Update address not set yet.")}</p> : null}
      <dl className="kv upd-kv">
        <dt>{t("In use")}</dt><dd>{day(d.current?.date)}{d.current?.subject && <span className="muted"> · {d.current.subject}</span>}</dd>
        {d.lastCheck?.at && <><dt>{t("Last check")}</dt><dd>{ago(d.lastCheck.at)} · {d.lastCheck.available ? t("{n} new change(s)", { n: d.lastCheck.ahead ?? 0 }) : t("up to date")}</dd></>}
      </dl>
      <LastResult last={d.last} />
    </div>

    {err && <div className="panel"><p className="state-line stop"><AlertTriangle size={14} />{t(err.message ?? "")}</p>
      {err.command && <><p className="hint">{t("Run this in the app folder to go back by hand:")}</p><pre className="mono upd-cmd">{err.command}</pre></>}
      {err.tail && <details className="upd-log"><summary>{t("What the step printed")}</summary><pre>{Array.isArray(err.tail) ? err.tail.join("\n") : String(err.tail)}</pre></details>}</div>}

    {check && !check.available && !running && !done && <p className="state-line ok"><Check size={14} />{t("You have the latest version.")}</p>}

    {check?.available && <div className="panel">
      <div className="panel-head"><h2>{t("What changed")}</h2><span className="muted num">{t("{n} change(s)", { n: check.ahead ?? check.commits?.length ?? 0 })}</span>
        <button className="btn ok sm end" onClick={() => setAsk(true)} disabled={running || done || blocked.length > 0}><Download size={14} />{t("Update and restart")}</button></div>
      {/* changed files by their count, never their paths in the repo */}
      {blocked.map((b) => <p key={b.code} className="warn-note"><AlertTriangle size={13} />{b.code === "LOCAL_CHANGES"
        ? t("{n} app file(s) were changed on this computer.", { n: b.files?.length ?? 0 }) : t(b.message)}</p>)}
      <ol className="plain upd-commits">{(check.commits ?? []).map((c) => <li key={c.short}><span className="muted">{day(c.date)}</span><span>{c.subject}</span></li>)}</ol>
      {(check.files != null || check.packages) && <p className="hint">{t("{n} file(s) change", { n: check.files ?? 0 })}{check.packages ? ` · ${t("the app's packages change too")}` : ""}</p>}
      {check.changelog && <details className="upd-log"><summary>CHANGELOG.md</summary><pre>{check.changelog}</pre></details>}
    </div>}

    {(running || done) && <div className="panel">
      {running && <p className="state-line run"><Loader2 size={14} className="spin" />{job.stage ? t(job.stage) : t("Starting…")}{job.progress != null ? ` · ${job.progress}%` : ""}</p>}
      {done && <p className="state-line ok"><RotateCcw size={14} />{check?.latest?.date ? t("Updated to the version of {date}. The app restarts now: a new window opens and this one closes.", { date: day(check.latest.date) })
        : t("Updated. The app restarts now: a new window opens and this one closes.")}</p>}
    </div>}

    {ask && <Dialog title={t("Update and restart?")} onClose={() => setAsk(false)} footer={<><span className="spacer" />
      <button className="btn" onClick={() => setAsk(false)}>{t("Not now")}</button>
      <button className="btn ok" onClick={apply}><Download size={14} />{t("Update and restart")}</button></>}>
      <p>{t("The app updates to the version of {date} and restarts. Your projects stay as they are. If a step fails, it goes back to the version you have now.", { date: day(check?.latest?.date) })}</p>
    </Dialog>}
  </div>;
}
