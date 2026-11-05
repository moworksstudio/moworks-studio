// Pitch 10 ideas (owner #1101, audit/102 §12): the Idea Library's dialog where Claude pitches ten film ideas for one film style. The style
// decides what an idea looks like (its source skill's own way); the app's part is the same for every style: ten cards, every story told
// as true with the sources Claude checked, and none kept until the owner says so (Save on a card, Save all), Ten more for another round.
// The round in hand is the server's (GET /api/ideas/pitch), so closing the dialog loses nothing; a run goes on while it is closed.
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ExternalLink, Lightbulb, Loader2, Plus, RotateCcw } from "lucide-react";
import { get, post, watchJob } from "../api.js";
import { Banner, Dialog } from "../components.jsx";
import { useToast } from "../lib.jsx";
import { useT } from "../i18n.jsx";
import { useStyles } from "./StyleGallery.jsx";

export const LANGS = [["vi", "Vietnamese"], ["en", "English"]];
const TRUTH = { true: ["True", "ok"], disputed: ["Disputed", "warn"], legend: ["Legend", "plain"], fiction: ["Fiction", "plain"], unchecked: ["Not checked", "warn"] };
const host = (u) => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return u; } };
const mins = (e) => (e?.minutes ? `${e.minutes[0]}–${e.minutes[1]}` : null);

/** A running job of the Idea Library (the pitch, a script) followed until it ends: { job, follow(job) }; onEnd(job) once it ends. */
export function useIdeaJob(onEnd) {
  const [job, setJob] = useState(null);
  useEffect(() => {
    if (!job?.id || job.status !== "running") return undefined;
    return watchJob(job.id, (j) => { if (!j) return; setJob(j); if (j.status !== "running") onEnd?.(j); }, 1500);
  }, [job?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  return { job, follow: setJob };
}

/** How long a run has gone, ticking each second. */
function Elapsed({ from }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const i = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(i); }, []);
  const s = Math.max(0, Math.round((now - Date.parse(from)) / 1000));
  return <span className="num">{Math.floor(s / 60)}:{String(s % 60).padStart(2, "0")}</span>;
}

/** The running line: what Claude does now, how long it has gone, and Stop. */
export function JobLine({ job, onStop }) {
  const t = useT();
  const last = job.log?.at(-1);
  return <div className="ipt-run" role="status" aria-live="polite">
    <Loader2 size={15} className="spin" aria-hidden="true" />
    <span className="ipt-run-t"><b>{t(job.stage === "starting" ? "Starting" : job.stage)}</b>{last && <small>{last}</small>}</span>
    <Elapsed from={job.startedAt} />
    <button type="button" className="btn sm" onClick={onStop}>{t("Stop")}</button>
  </div>;
}

function PitchCard({ x, n, onSave, saving }) {
  const t = useT();
  const [label, tone] = TRUTH[x.truth] ?? TRUTH.unchecked;
  return <article className={"ipt-card" + (x.savedAs ? " kept" : "")} aria-labelledby={`ipt-${x.id}`}>
    <header><span className="ipt-n num">{n}</span><h3 id={`ipt-${x.id}`}>{x.title}</h3><span className={"ipt-truth " + tone}>{t(label)}</span></header>
    <p className="ipt-hook">{x.hook}</p>
    <dl>{x.fields.map((f, i) => <div key={i}><dt>{f.label}</dt><dd>{f.text}</dd></div>)}</dl>
    {x.sources.length > 0 && <ul className="ipt-src" aria-label={t("Sources")}>{x.sources.map((s, i) => <li key={i}>
      <a href={s.url} target="_blank" rel="noopener noreferrer" title={s.title}>{host(s.url)}<ExternalLink size={9} /></a></li>)}</ul>}
    <footer>{x.savedAs ? <span className="ipt-kept"><Check size={13} />{t("In My ideas")}</span>
      : <button type="button" className="btn sm" onClick={() => onSave(x)} disabled={saving}><Plus size={13} />{t("Save")}</button>}</footer>
  </article>;
}

/** The dialog. onSaved(): the library reloads (cards went into My ideas). */
export function PitchDialog({ onClose, onSaved }) {
  const t = useT();
  const toast = useToast();
  const sq = useStyles();
  const styles = useMemo(() => [...(sq.data?.styles ?? [])].sort((a, b) => a.title.localeCompare(b.title)), [sq.data]);
  const [pitch, setPitch] = useState(undefined);          // undefined: loading; null: none in hand
  const [form, setForm] = useState(null);                 // the New pitch form when shown: { styleId, topic, lang, lengthSec }
  const [err, setErr] = useState(null), [saving, setSaving] = useState(false);
  const load = async () => {
    try { const r = await get("/api/ideas/pitch"); setPitch(r.pitch); if (r.job) follow(r.job); return r; } catch (e) { setErr(e); return null; }
  };
  const { job, follow } = useIdeaJob((j) => {
    if (j.status === "done") { load(); setForm(null); toast(t("Ten ideas are in")); }
    else if (j.status === "failed") setErr(j.error ?? { message: t("The pitch stopped") });
  });
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const running = job?.status === "running";
  const style = styles.find((s) => s.id === form?.styleId);
  const openForm = () => {
    const id = pitch?.styleId ?? (styles.some((s) => s.id === "ricks-clip") ? "ricks-clip" : styles[0]?.id ?? "");
    const s = styles.find((x) => x.id === id);
    setForm({ styleId: id, topic: "", lang: pitch?.lang ?? "vi", lengthSec: Number(s?.defaultLength) || 30 });
  };
  useEffect(() => { if (pitch === null && !form && styles.length && !running) openForm(); }, [pitch, styles.length]); // eslint-disable-line react-hooks/exhaustive-deps
  const start = async (more) => {
    setErr(null);
    try { const r = await post("/api/ideas/pitch", more ? { more: true } : { ...form, lengthSec: Number(form.lengthSec) || null }); follow(r.job); }
    catch (e) { setErr(e); }
  };
  const stop = async () => { try { await post(`/api/jobs/${job.id}/cancel`); } catch (e) { toast(e.message, "error"); } };
  const save = async (body) => {
    setSaving(true);
    try {
      const r = await post("/api/ideas/pitch/save", body);
      setPitch(r.pitch);
      toast(r.ideas.length === 1 ? t("“{name}” is in My ideas", { name: r.ideas[0].name }) : t("{n} ideas are in My ideas", { n: r.ideas.length }));
      onSaved?.();
    } catch (e) { toast(e.message, "error"); } finally { setSaving(false); }
  };
  const left = pitch?.ideas.filter((x) => !x.savedAs).length ?? 0;
  const showForm = !!form && !running;

  const body = <>
    {err && <Banner kind="error">{err.message}</Banner>}
    {running && <JobLine job={job} onStop={stop} />}
    {showForm && <div className="idl-form ipt-form">
      <label className="field"><span className="label">{t("Film style")}</span>
        <select className="select" value={form.styleId} autoFocus onChange={(e) => { const s = styles.find((x) => x.id === e.target.value);
          setForm((o) => ({ ...o, styleId: e.target.value, lengthSec: Number(s?.defaultLength) || o.lengthSec })); }}>
          {styles.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}</select>
        <span className="hint">{t("The film style decides what an idea looks like: its author's own way of finding and telling one.")}</span></label>
      <label className="field"><span className="label">{t("Topic or direction")} <small className="opt">{t("optional")}</small></span>
        <textarea className="textarea ipt-topic" value={form.topic} maxLength={2000} onChange={(e) => setForm((o) => ({ ...o, topic: e.target.value }))}
          placeholder={t("Leave empty and Claude mixes them as the film style does")} /></label>
      <div className="ipt-row">
        <label className="field"><span className="label">{t("Language")}</span>
          <select className="select" value={form.lang} onChange={(e) => setForm((o) => ({ ...o, lang: e.target.value }))}>
            {LANGS.map(([k, l]) => <option key={k} value={k}>{t(l)}</option>)}</select></label>
        <label className="field"><span className="label">{t("Film length (seconds)")}</span>
          <input className="input num" type="number" min={5} max={3600} value={form.lengthSec} onChange={(e) => setForm((o) => ({ ...o, lengthSec: e.target.value }))} /></label>
      </div>
      {left > 0 && <p className="hint ipt-warn">{left === 1 ? t("The one idea you did not save goes when the new ten come in.") : t("The {n} ideas you did not save go when the new ten come in.", { n: left })}</p>}
      <p className="hint">{t("Takes about {m} minutes. Claude checks every story told as true on the web, with its links. Nothing is kept until you save it.", { m: "2–6" })}</p>
    </div>}
    {!showForm && pitch && <>
      <p className="ipt-sum">{t("{n} ideas for {style}", { n: pitch.ideas.length, style: pitch.styleTitle })}{pitch.topic && <> · <q>{pitch.topic}</q></>}
        {" · "}{LANGS.find(([k]) => k === pitch.lang)?.[1] ? t(LANGS.find(([k]) => k === pitch.lang)[1]) : pitch.lang}{" · "}{t("about {n} s", { n: pitch.lengthSec })}
        {!pitch.web && <span className="ipt-warn"> · {t("The web was off: no story was checked")}</span>}</p>
      <div className="ipt-grid">{pitch.ideas.map((x, i) => <PitchCard key={x.id} x={x} n={i + 1} saving={saving} onSave={(c) => save({ ids: [c.id] })} />)}</div>
    </>}
    {pitch === undefined && !err && <div className="skeleton" style={{ height: "18rem" }} />}
  </>;

  const footer = showForm
    ? <>{pitch && <button className="btn ghost" onClick={() => setForm(null)}>{t("Back to the ideas")}</button>}<span className="spacer" />
      <button className="btn" onClick={onClose}>{t("Close")}</button>
      <button className="btn primary" onClick={() => start(false)} disabled={!form.styleId || !style}><Lightbulb size={15} />{t("Pitch 10 ideas")}</button></>
    : <>{pitch && <button className="btn ghost" onClick={openForm} disabled={running}><RotateCcw size={14} />{t("New pitch")}</button>}
<span className="spacer" />
      <button className="btn" onClick={onClose}>{t("Close")}</button>
      {pitch && <button className="btn" onClick={() => start(true)} disabled={running}><Lightbulb size={14} />{t("10 more")}</button>}
      {pitch && <button className="btn primary" onClick={() => save({ all: true })} disabled={running || saving || !left}><Check size={15} />{left ? t("Save all ({n})", { n: left }) : t("All saved")}</button>}</>;

  return createPortal(<div className="idl-dlg ipt-dlg"><Dialog title={t("Pitch 10 ideas")} labelledBy="ipt-h" wide onClose={onClose} footer={footer}>{body}</Dialog></div>, document.body);
}

/** Write the script on an idea of My ideas: the button, its run, and the script once written. onWritten(): the library reloads. */
export function ScriptButton({ x, onWritten }) {
  const t = useT();
  const toast = useToast();
  const { job, follow } = useIdeaJob((j) => {
    if (j.status === "done") { toast(t("The script of “{name}” is written", { name: x.name })); onWritten?.(); }
    else if (j.status === "failed") toast(j.error?.message ?? t("The script stopped"), "error");
  });
  useEffect(() => {          // a script already being written for this idea (the page was left and opened again)
    get("/api/ideas/jobs").then((r) => { const j = r.jobs.find((y) => y.kind === "idea-script" && y.ideaId === x.id); if (j) follow(j); }).catch(() => {});
  }, [x.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const running = job?.status === "running" && job.ideaId === x.id;
  const go = async () => { try { const r = await post(`/api/ideas/${x.id}/script`, {}); follow(r.job); } catch (e) { toast(e.message, "error"); } };
  if (running) return <JobLine job={job} onStop={() => post(`/api/jobs/${job.id}/cancel`).catch((e) => toast(e.message, "error"))} />;
  return <button type="button" className="btn" onClick={go} title={t("Claude writes the narration in this film style's own way, sized to the film's length")}>
    <Lightbulb size={14} />{x.script ? t("Write the script again") : t("Write the script")}</button>;
}
