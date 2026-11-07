// Settings › Update: the app updates itself from the project's GitHub repo. The version
// in use, "Check for updates", and when there is one: what changed (the commits, newest first, and CHANGELOG.md), what blocks it (local
// changes, a branch that went its own way), then "Update and restart". While it runs, its stage; the app restarts itself when it is done,
// and goes back to the version before if a step fails. The last update's result stays as one line.
// The app checks by itself too (every six hours): the panel opens with that check's answer already shown (the top bar's "A new version
// is ready · Update" lands here). Update while Claude works or a film renders asks to wait, by the rule the update itself keeps.
// Data: GET /api/app/update (with the last check's answer); POST /api/app/update/check; POST /api/app/update/apply (a job "app-update").
import { useState } from "react";
import { AlertTriangle, Check, Clock, Download, Loader2, RefreshCw, RotateCcw, Trash2 } from "lucide-react";
import { get, post } from "../api.js";
import { Banner, Dialog } from "../components.jsx";
import { ago, useData, useToast, useJob } from "../lib.jsx";
import { useT } from "../i18n.jsx";
import { UPDATE_CHANGED, versionDay as day } from "./UpdateNotice.jsx";

/** What runs that an update waits for, by the update's own rule (POST /app/update/apply: anything running that is not the app's quiet
 *  background work); [] when nothing does or the service cannot say (the update itself refuses then). */
/** A version as the screen says it: its number, else the day it is from. */
const versionOf = (c, day) => c?.version ?? day(c?.date);
const runningNow = async () => { try { return ((await get("/api/app")).running ?? []).filter((x) => !x.idle).map((x) => x.title); } catch { return []; } };

/** The last update, as one line in the state colours. No commit hash: the "In use" line above names the version by its date and subject. */
function LastResult({ last }) {
  const t = useT();
  if (!last?.status) return null;
  if (last.status === "done") return <p className="state-line ok"><Check size={14} />{t("Updated {when}.", { when: ago(last.at) })}</p>;
  return <p className="state-line stop"><AlertTriangle size={14} />{last.status === "rolled-back"
    ? t("The update failed at “{step}”; the app went back to the version before, {when}.", { step: t(last.failedAt ?? "?"), when: ago(last.at) })
    : t("The last update failed, {when}.", { when: ago(last.at) })}{last.error ? ` ${t(last.error)}` : ""}</p>;
}

/** Uninstall (owner 30/10, after the Moworks Motion kit's uninstall): the app and what it installed on this PC to the Recycle Bin after
 *  one question, to install it clean again. The films, the library and the models stay unless ticked; a copy with work of its own that is
 *  not on GitHub stays, with the reason. The removal runs in its own window once the app has stopped (packages/setup/uninstall.mjs).
 *  Data: GET /api/app/uninstall (what goes, sizes); POST /api/app/uninstall { models, films }. */
function Uninstall() {
  const t = useT();
  const [open, setOpen] = useState(false), [plan, setPlan] = useState(null), [models, setModels] = useState(false), [films, setFilms] = useState(false);
  const [busy, setBusy] = useState(false), [err, setErr] = useState(null);
  const size = (b) => (b == null ? "…" : b >= 1e9 ? `${(b / 1e9).toFixed(1)} GB` : `${Math.max(1, Math.round(b / 1e6))} MB`);
  const show = () => { setOpen(true); setErr(null); setPlan(null); setModels(false); setFilms(false); get("/api/app/uninstall").then((p) => { setPlan(p); if (p?.cached) get("/api/app/uninstall?fresh=1").then(setPlan).catch(() => {}); }).catch((e) => setErr(e.message)); };          // the last sizes at once, then the new ones (1.14)
  const go = async () => { setBusy(true); setErr(null); try { await post("/api/app/uninstall", { models, films }); } catch (e) { setErr(e.message); setBusy(false); } };
  const filmsSize = plan?.films?.length ? plan.films.reduce((a, f) => a + f.size, 0) : null;
  return <div className="panel upd-uninstall">
    <div className="panel-head"><h2>{t("Uninstall")}</h2>
      <button className="btn danger sm end" onClick={show}><Trash2 size={14} />{t("Uninstall…")}</button></div>
    <p className="hint">{t("Remove the app from this PC.")}</p>
    {open && <Dialog danger title={t("Uninstall Moworks Studio?")} onClose={busy ? undefined : () => setOpen(false)} footer={<>
      {err && <span className="state-line stop"><AlertTriangle size={14} />{t(err)}</span>}<span className="spacer" />
      <button className="btn" onClick={() => setOpen(false)} disabled={busy}>{t("Cancel")}</button>
      <button className="btn danger" onClick={go} disabled={busy || !plan}>{busy ? <Loader2 size={14} className="spin" /> : <Trash2 size={14} />}{t("Uninstall")}</button></>}>
      <div className="dlg-lines">
        <p>{plan?.app?.size != null ? t("Moves the app to the Recycle Bin ({size}).", { size: size(plan.app.size) }) : t("Moves the app to the Recycle Bin.")}</p>
        {plan?.app?.keep && <p className="dlg-warn">{t("The app folder stays ({why}).", { why: t(plan.app.keep) })}</p>}
        {!plan && !err && <p className="muted"><Loader2 size={13} className="spin" /> {t("Measuring…")}</p>}
        {plan?.models && <label className="check"><input type="checkbox" checked={models} disabled={busy} onChange={(e) => setModels(e.target.checked)} />
          {t("Also remove models ({size})", { size: size(plan.models.size) })}</label>}
        {filmsSize != null && <label className="check"><input type="checkbox" checked={films} disabled={busy} onChange={(e) => setFilms(e.target.checked)} />
          {t("Also remove films and library ({size})", { size: size(filmsSize) })}</label>}
        {films && <p className="dlg-warn">{t("Back up your films first.")}</p>}
        <p className="hint">{t("Git, Python, FFmpeg and Claude Code stay installed.")}</p>
      </div>
    </Dialog>}
  </div>;
}

export default function AppUpdate() {
  const t = useT();
  const toast = useToast();
  const q = useData(() => get("/api/app/update"), []);
  const [mine, setMine] = useState(undefined);        // the answer of this panel's own "Check for updates" (null: it failed)
  const [checking, setChecking] = useState(false);
  const [err, setErr] = useState(null);               // a check or apply error: { code, message, command }
  const [wait, setWait] = useState(null);             // what an update waits for (Claude's task, a render): their titles
  const [ask, setAsk] = useState(false);
  // the running update: { stage, status, result, error }; its end says how it went (jobs.mjs error: { code, message, detail })
  const [job, follow] = useJob((x) => {
    if (x.status === "failed") { setErr({ code: x.error?.code, message: x.error?.message ?? t("The update did not finish."), command: x.error?.detail?.command, tail: x.error?.detail?.tail }); q.reload(); }
    if (x.status === "done") toast(t("Updated: the app restarts in a moment"));
  });
  if (q.error) return q.error.status === 404 ? <p className="hint">{t("Updating from here is not available in this version.")}</p> : <Banner kind="error">{q.error.message}</Banner>;
  const d = q.data;
  if (!d) return <div className="skeleton" style={{ height: "12rem" }} />;
  const check = mine === undefined ? d.check ?? null : mine;          // the app's own last check until this panel checks
  const doCheck = async () => {
    setChecking(true); setErr(null); setWait(null);
    try { setMine(await post("/api/app/update/check")); q.reload(); }
    catch (e) { setErr({ code: e.code, message: e.message }); setMine(null); } finally { setChecking(false); dispatchEvent(new Event(UPDATE_CHANGED)); }
  };
  const askUpdate = async () => {          // while Claude works on a film or a render runs: say what it waits for, no dialog
    setErr(null);
    const busy = await runningNow();
    if (busy.length) { setWait(busy); return; }
    setWait(null); setAsk(true);
  };
  const apply = async () => {
    setAsk(false); setErr(null);
    try {
      const r = await post("/api/app/update/apply"); follow(r.job ?? r);
    } catch (e) {
      // something started meanwhile: the service's own answer names it ("Update when nothing is running: …")
      if (e.code === "BUSY") { const busy = await runningNow(); setWait(busy.length ? busy : [String(e.message).replace(/^[^:]*:\s*/, "")]); }
      else setErr({ code: e.code, message: e.message });
    }
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
        {/* the version and nothing else (owner 04/11: no list of every day's changes, no counts) */}
        <dt>{t("In use")}</dt><dd>{versionOf(d.current, day)}{d.source && <span className="muted"> · {t("source copy")}</span>}</dd>
        {check?.available && <><dt>{t("New")}</dt><dd>{versionOf(check.latest, day)} · {check.latest?.version && check.latest.version !== d.current?.version ? t("a new version") : t("bug fixes")}</dd></>}
      </dl>
      <LastResult last={d.last} />
    </div>

    {err && <div className="panel"><p className="state-line stop"><AlertTriangle size={14} />{t(err.message ?? "")}</p>
      {err.command && <><p className="hint">{t("Run this in the app folder to go back by hand:")}</p><pre className="mono upd-cmd">{err.command}</pre></>}
      {err.tail && <details className="upd-log"><summary>{t("What the step printed")}</summary><pre>{Array.isArray(err.tail) ? err.tail.join("\n") : String(err.tail)}</pre></details>}</div>}

    {check && !check.available && !running && !done && <p className="state-line ok"><Check size={14} />{check.source
      ? t("This is the source copy: releases are made from it, so it does not update itself.") : t("You have the latest version.")}</p>}

    {check?.available && <div className="panel">
      <div className="panel-head"><h2>{t("A new version is ready")}</h2>
        <button className="btn ok sm end" onClick={askUpdate} disabled={running || done || blocked.length > 0}><Download size={14} />{t("Update and restart")}</button></div>
      {wait && !running && !done && <p className="state-line run upd-wait"><Clock size={14} />{t("Wait until this has finished, then update: {what}.", { what: wait.join(", ") })}</p>}
      {/* changed files by their count, never their paths in the repo */}
      {blocked.map((b) => <p key={b.code} className="warn-note"><AlertTriangle size={13} />{b.code === "LOCAL_CHANGES"
        ? t("{n} app file(s) were changed on this computer.", { n: b.files?.length ?? 0 }) : t(b.message)}</p>)}
    </div>}

    {(running || done) && <div className="panel">
      {running && <p className="state-line run"><Loader2 size={14} className="spin" />{t("Updating… the app restarts when it is done.")}{job.progress != null ? ` · ${job.progress}%` : ""}</p>}
      {done && <p className="state-line ok"><RotateCcw size={14} />{check?.latest?.date ? t("Updated to the version of {date}. The app restarts now: a new window opens and this one closes.", { date: day(check.latest.date) })
        : t("Updated. The app restarts now: a new window opens and this one closes.")}</p>}
    </div>}

    {ask && <Dialog title={t("Update and restart?")} onClose={() => setAsk(false)} footer={<><span className="spacer" />
      <button className="btn" onClick={() => setAsk(false)}>{t("Not now")}</button>
      <button className="btn ok" onClick={apply}><Download size={14} />{t("Update and restart")}</button></>}>
      <p>{t("The app updates to the version of {date} and restarts. Your productions stay as they are. If a step fails, it goes back to the version you have now.", { date: day(check?.latest?.date) })}</p>
    </Dialog>}

    <Uninstall />
  </div>;
}
