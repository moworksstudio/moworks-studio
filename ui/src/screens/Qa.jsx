// Checks: Blocking Issues, Warnings, Visual Review and Passed Checks. Deterministic checks (HyperFrames' own check,
// offline, fonts, Vietnamese glyphs) are kept apart from heuristic visual review (empty-looking scenes, the contact sheet), which is never
// called a guaranteed pass. Each finding offers Fix with Claude (a prefilled request, nothing runs until sent) or Open Shot.
// Only problems show: blocking issues, warnings, checks that could
// not run and a visual hint that flagged something (with its shot, time and stills); nothing wrong is one line.
import { useEffect, useState } from "react";
import { AlertTriangle, Bot, Eye, Film, Loader2, ShieldCheck, XCircle } from "lucide-react";
import { get, post, watchJob } from "../api.js";
import { Banner } from "../components.jsx";
import { ago, clock, go, useData, useToast } from "../lib.jsx";
import { tr, useT } from "../i18n.jsx";
import { useStage } from "../workflow/stage.jsx";
import { checkLabel, notCheckedWhy, scriptTimedOut } from "../workflow/RenderSheet.jsx";
import { lookAt } from "../../../packages/hf-qa/look.mjs";

// What a finding says on screen: the server's `plain` sentence; a font or a loaded address in the app's own words; a check of the app's
// own (not HyperFrames') in the words the Render panel gives it, its shot said once (T26-8: three "A sound on every action" rows read
// "Something here may look wrong…" while Render named the second, the motion and its sound); else a short line (HyperFrames' own
// wording stays in "Fix with Claude", for Claude)
const ownWords = (c, f) => {
  const m = !/^G-HF-/.test(c?.id ?? "") ? f.message ?? f.reason : null;
  if (!m || /[\w-]+[\\/][\w./\\-]+\.(?:html?|m?js|tsx?|json|css)\b/i.test(m)) return null;          // never a file path on screen
  return f.shot != null ? String(m).replace(new RegExp(`^Shot ${f.shot} at `), "At ") : String(m);
};
export const say = (f, c = null) => f.plain || (f.family || f.url ? describe(f) : ownWords(c, f) ?? tr("Something here may look wrong. Fix with Claude, or look at the shot."));
const describe = (f) => f.message ?? f.reason ?? (f.family ? (f.missing ? tr("Font “{family}” is missing {chars}", { family: f.family, chars: f.missing }) : tr("Font “{family}” is not available offline", { family: f.family })) : null) ?? (f.url ? tr("Loads {url}", { url: f.url }) : JSON.stringify(f));

export default function Qa({ id, setCrumbs = () => {} }) {
  const t = useT();
  const stage = useStage(id);
  const toast = useToast();
  const project = useData(() => get(`/api/projects/${id}`), [id]);
  const qa = useData(() => get(`/api/projects/${id}/qa`), [id]);
  const [job, setJob] = useState(null);
  useEffect(() => { setCrumbs(project.data ? [t("Projects"), project.data.title, t("Tech checks")] : null); }, [project.data, t]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { const j = qa.data?.job; if (j?.status === "running" && j.id !== job?.id) follow(j); }, [qa.data]); // eslint-disable-line react-hooks/exhaustive-deps
  const follow = (j) => { setJob(j); watchJob(j.id, (x) => { if (!x) return; setJob(x); if (x.status !== "running") { qa.reload(); if (x.status === "failed") toast(x.error?.message, "error"); } }, 1200); };
  const run = async () => { try { follow(await post(`/api/projects/${id}/qa`)); } catch (e) { toast(e.message, "error"); } };
  // the request lands in the user's own chat box, which has no hidden part: the check's id and the file's path stay out (the shot,
  // the check's title and the finding say where)
  const fix = (check, f) => {
    const text = (f.shot ? t("Fix this check finding in shot {n}:", { n: f.shot }) : t("Fix this check finding:")) + ` ${check.title}. ${describe(f)}. ` + t("Keep everything else unchanged.");
    stage.askClaude(text);
  };
  const running = job?.status === "running";
  const r = qa.data?.report;
  // checks HF never ran are listed apart, neither a pass nor a problem in the film; a visual hint shows only when it
  // flagged something. One count for the banner, the group headers and the Pipeline's row (lookAt): the same line found at several
  // places is one line, and a check whose warnings list nothing is not shown
  const { blocking, warnings, visual, skipped, count: problems } = lookAt(r);
  const flaggedShots = new Set(visual.flatMap((c) => c.items.map((f) => f.shot)).filter(Boolean));
  const stills = (r?.stills ?? []).filter((s) => flaggedShots.has(s.shot));

  const Finding = ({ c, f }) => <li className="finding">
    <span className="where num">{f.shot ? t("Shot {n}", { n: f.shot }) : t("Film")}</span>
    <span className="what">{f.from != null && f.to != null && <span className="num muted">{f.from.toFixed(1)}–{f.to.toFixed(1)} s · </span>}{say(f, c)}
      {f.count > 1 && <span className="num muted"> · {t("{n} places", { n: f.count })}</span>}</span>
    <span className="acts">{f.shot && <button className="btn ghost sm" onClick={() => stage.close()}><Film size={13} />{t("Open shot")}</button>}
      <button className="btn ghost sm" onClick={() => fix(c, f)}><Bot size={13} />{t("Fix with Claude")}</button></span></li>;
  // the header counts the lines below it; no "Exact" / "Hint" tag, the group's name says which it is
  const Group = ({ title, icon, items, children }) => items.length === 0 ? null : <section className="panel qa-group" aria-label={title}>
    <div className="panel-head">{icon}<h2>{title}</h2><span className="muted end num">{items.reduce((n, c) => n + (c.notSeen ? 1 : c.items.length || 1), 0)}</span></div>
    {items.map((c) => <div key={c.id} className="qa-check">
      <div className="qa-check-head"><b>{scriptTimedOut(c) ? checkLabel(c, t) : c.title}</b></div>
      {/* a check that could not run says why in its own plain words when the server gives them (`why`: the pose check ran out of time) */}
      <p className="hint">{c.notSeen ? (scriptTimedOut(c) ? t("No script error was found before the check stopped.") : c.why ? t(c.why) : notCheckedWhy(c, t)) : c.explain}</p>
      {!c.notSeen && c.items.length > 0 && <ul className="plain">{c.items.slice(0, 20).map((f, i) => <Finding key={i} c={c} f={f} />)}</ul>}
    </div>)}
    {children}
  </section>;

  return <div className="page">
    <div className="page-head"><div><p className="lead">{t("Render runs a quicker check of its own. Hints are not guarantees.")}</p></div>
      <div className="actions"><button className="btn" onClick={() => stage.open("render")}>{t("Render")}</button>
        <button className="btn primary" onClick={run} disabled={running}>{running ? <Loader2 size={16} className="spin" /> : <ShieldCheck size={16} />}{running ? t("Running…") : t("Run checks")}</button></div></div>
    {running && <div className="panel"><div className="progress-line big"><div style={{ flex: 1 }}><div className="bar"><span style={{ width: `${job.progress ?? 5}%` }} /></div>
      <span className="hint">{job.stage === "contact sheet" ? t("Taking stills of each shot…") : t("Running the tech checks…")}</span></div></div></div>}
    {!r && !running && <div className="empty"><ShieldCheck size={26} /><h2>{t("No checks yet")}</h2><p>{t("Only what needs fixing shows here.")}</p>
      <div className="row"><button className="btn primary" onClick={run}><ShieldCheck size={16} />{t("Run checks")}</button></div></div>}
    {r && <>
      {/* No internal revision id; a result older than the film is yellow (waiting on a new run), not green */}
      <Banner kind={!r.pass ? "error" : qa.data.changedSince || problems || skipped.length ? "warning" : "success"}>
        {!r.pass ? (blocking.length === 1 ? t("1 blocking issue: the export waits until it is fixed.") : t("{n} blocking issues: the export waits until they are fixed.", { n: blocking.length }))
          : qa.data.changedSince ? t("Out of date: the film changed after these checks.")
          : problems === 1 ? t("1 thing to look at; it does not stop the render.") : problems ? t("{n} things to look at; they do not stop the render.", { n: problems })
          : skipped.length ? t("No problems found in what was checked.") : t("No problems found.")}
        <span className="muted"> {t("Checked {ago}.", { ago: ago(r.at) })}{qa.data.changedSince && !r.pass ? " " + t("The project changed since; run them again.") : ""}</span></Banner>
      <Group title={t("Blocking")} icon={<XCircle size={16} color="var(--danger)" />} items={blocking} />
      <Group title={t("Warnings")} icon={<AlertTriangle size={16} color="var(--status-stop)" />} items={warnings} />
      <Group title={t("Not checked")} icon={<Eye size={16} />} items={skipped.map((c) => ({ ...c, notSeen: true }))} />
      <Group title={t("Visual review")} icon={<Eye size={16} />} items={visual}>
        {stills.length > 0 && <div className="contact-sheet">{stills.map((s) => <button key={s.path} className="still" onClick={() => stage.close()} title={t("Shot {n} at {time}", { n: s.shot, time: clock(s.t) })}>
            <img src={s.url} alt={t("Shot {n} at {time}", { n: s.shot, time: `${s.t} s` })} loading="lazy" /><span className="num">{t("Shot {n}", { n: s.shot })} · {s.t.toFixed(2)} s</span></button>)}</div>}
      </Group>
    </>}
  </div>;
}
