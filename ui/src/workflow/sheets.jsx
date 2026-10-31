// Sheets of the Editor: the brief and its files, a document a step writes (Story, Script, Brief…), Import assets, and
// the Assets analysis: what Claude found in the files and the way of working, which the user confirms.
import { useEffect, useState } from "react";
import { Bot, Check, FileText, Loader2, Save } from "lucide-react";
import { get, patch, post, put } from "../api.js";
import { Banner } from "../components.jsx";
import { ago, clock, parseLength, useData, useToast, words } from "../lib.jsx";
import { useT } from "../i18n.jsx";
import Markdown from "../editor/Markdown.jsx";
import DesignView, { PlanView } from "../editor/DesignView.jsx";          // design.md / frame.md read as colours, letters and rules
import { ImportNow, size } from "./assets.jsx";
import StyleQuestions, { answersFor, questionsFor } from "./answers.jsx";
import { useCloseGuard, useStage } from "./stage.jsx";
import { WAYS, canonicalWay } from "./ways.js";
import BriefChanged from "./BriefChanged.jsx";
import { qcSummary } from "./qcSummary.js";

/** Brief & assets: the one brief, the style's questions and every file the project holds (assets/ and sources/), with Import assets. */
export function BriefSheet({ projectId, project, onChanged, briefChanged = false }) {
  const t = useT();
  const toast = useToast();
  const stage = useStage(projectId);
  const q = useData(() => get(`/api/projects/${projectId}/inputs`), [projectId]);
  const [f, setF] = useState(null);
  const [busy, setBusy] = useState(false);
  const pipe = useData(() => get(`/api/projects/${projectId}/pipeline`).catch(() => null), [projectId]);
  const [askChange, setAskChange] = useState(!!briefChanged);          // opened from the Pipeline's "brief changed" line: the question is shown at once
  const len0 = project?.meta?.targetDurationSec ? clock(project.meta.targetDurationSec) : "";
  useEffect(() => { if (q.data && !f) setF({ text: q.data.brief?.text ?? "", answers: q.data.brief?.answers ?? {}, length: len0 }); }, [q.data]); // eslint-disable-line react-hooks/exhaustive-deps
  const sid = project?.meta?.style?.id;
  useCloseGuard(!!q.data && !!f && (f.text !== (q.data.brief?.text ?? "") || JSON.stringify(answersFor(sid, f.answers)) !== JSON.stringify(answersFor(sid, q.data.brief?.answers)) || (f.length !== len0 && parseLength(f.length) >= 5)));
  if (q.error) return <Banner kind="error">{q.error.message}</Banner>;
  if (!q.data || !f) return <div className="skeleton" style={{ height: "16rem" }} />;
  const b = q.data.brief ?? {};
  const sec = parseLength(f.length);
  const styleId = project?.meta?.style?.id;
  const answers = answersFor(styleId, f.answers);
  const dirty = f.text !== (b.text ?? "") || JSON.stringify(answers) !== JSON.stringify(answersFor(styleId, b.answers)) || (f.length !== len0 && sec >= 5);
  const save = async () => {
    setBusy(true);
    try {
      await patch(`/api/projects/${projectId}/brief`, { text: f.text, answers, durationSec: sec >= 5 ? sec : undefined }); toast(t("Brief saved")); q.reload(); onChanged?.();
      const p = await get(`/api/projects/${projectId}/pipeline`).catch(() => null);       // edited after a build: the pipeline now asks what to do with the film
      pipe.reload(); if (p?.question?.kind === "brief-changed") setAskChange(true);
    } catch (e) { toast(e.message, "error"); } finally { setBusy(false); }
  };
  const way = WAY_NAMES[q.data.way?.id];
  return <div className="brief-one">
    {pipe.data?.question?.kind === "brief-changed" && <div style={{ gridColumn: "1 / -1" }}><Banner kind="warning" action={<button className="btn sm" onClick={() => setAskChange(true)}>{t("Decide")}</button>}>{t("The brief changed after the film was built. Say what should happen to the film.")}</Banner></div>}
    {askChange && <BriefChanged projectId={projectId} onClose={() => setAskChange(false)} onDone={() => { pipe.reload(); onChanged?.(); }} />}
    <section className="panel">
      {/* the dialog's title says Brief; the files are in the Files tab and the voice in Voice-over, not here */}
      {b.editedAt && <span className="muted brief-saved">{t("Saved {ago}", { ago: ago(b.editedAt) })}</span>}
      <textarea className="textarea" rows={10} value={f.text} onChange={(e) => setF({ ...f, text: e.target.value })} aria-label={t("Brief")} />
      {/* no word count under the brief */}
      <label className="field"><span>{t("Length")}</span><input className={"input num" + (f.length && !(sec >= 5) ? " invalid" : "")} value={f.length} onChange={(e) => setF({ ...f, length: e.target.value })} placeholder="1:30" style={{ width: "8rem" }} /></label>
      {b.direction && <p className="hint">{t("Direction (from an older brief): {text}", { text: b.direction })}</p>}
      {Object.values(questionsFor(styleId)).some(Boolean) && <StyleQuestions styleId={styleId} value={f.answers} onChange={(v) => setF({ ...f, answers: v })} idPrefix="bs" />}
      <dl className="kv">
        <dt>{t("Film style")}</dt><dd>{t(project?.meta?.style?.title ?? "–")}</dd>
        {/* the Brand Kit as New project names it: the kit chosen, the film style's own, or the brief's (no kit) */}
        <dt>{t("Design")}</dt><dd>{project?.meta?.designLocked ? t("Follows film style") : q.data.look ? q.data.look.title : t("From the brief")}</dd>
        {/* a Brand Kit chosen for an author's style is kept, not applied: Claude asks how to use it (T25) */}
        {project?.meta?.designLocked && project.meta.brandKitAsk?.title && <><dt>{t("Brand Kit")}</dt><dd>{t("{kit}: Claude asks how to use it", { kit: project.meta.brandKitAsk.title })}</dd></>}
        {way && <><dt>{t("Way of working")}</dt><dd>{t(way[0])}</dd></>}
      </dl>
      <div className="row"><button className="btn primary sm" onClick={save} disabled={!dirty || busy}>{busy ? <Loader2 size={14} className="spin" /> : <Save size={14} />}{t("Save")}</button>
        <span className="hint">{t("Claude reads the brief again with every task.")}</span></div>
    </section>
  </div>;
}

/** A text file a step writes (Story, Script, Brief, design notes): read it, edit it by hand, or ask Claude to change it. */
export function DocSheet({ projectId, path, approve, onChanged }) {
  const t = useT();
  const toast = useToast();
  const stage = useStage(projectId);
  const q = useData(() => get(`/api/projects/${projectId}/doc?path=${encodeURIComponent(path)}`), [projectId, path]);
  const [text, setText] = useState(null);
  const [edit, setEdit] = useState(false);
  const [busy, setBusy] = useState(false);
  const [approving, setApproving] = useState(false);
  useEffect(() => { if (q.data) { setText(q.data.text); setEdit(!q.data.exists); } }, [q.data]);
  useCloseGuard(!!q.data && text != null && edit && text !== q.data.text);
  if (q.error) return <Banner kind="error">{q.error.message}</Banner>;
  if (!q.data || text == null) return <div className="skeleton" style={{ height: "16rem" }} />;
  const file = q.data.path ?? path;
  const doApprove = async () => {
    setApproving(true);
    try { await post(`/api/projects/${projectId}/approve/${approve}`); toast(t("{file} approved", { file })); onChanged?.(); } catch (e) { toast(e.message, "error"); } finally { setApproving(false); }
  };
  const save = async () => {
    setBusy(true);
    try { await put(`/api/projects/${projectId}/doc`, { path: file, text }); toast(t("{file} saved", { file })); setEdit(false); q.reload(); onChanged?.(); }
    catch (e) { toast(e.message, "error"); } finally { setBusy(false); }
  };
  return <div className="doc-sheet">
    <div className="row">{q.data.at && <span className="muted">{t("Saved {ago}", { ago: ago(q.data.at) })}</span>}
      <span className="spacer" />
      {!edit && <button className="btn sm" onClick={() => setEdit(true)}>{t("Edit")}</button>}
      <button className="btn sm" onClick={() => stage.askClaude(t("Change {file}: ", { file }))}><Bot size={14} />{t("Ask Claude to change it")}</button>
      {approve && q.data.exists && <button className="btn primary sm" onClick={doApprove} disabled={approving || edit}>{approving ? <Loader2 size={14} className="spin" /> : <Check size={14} />}{t("Approve")}</button>}</div>
    {!q.data.exists && <Banner kind="info">{t("Nothing here yet. Write or paste it here, or let Claude write it in its step.", { file })}</Banner>}
    {edit ? <>
      <textarea className="textarea doc-edit" value={text} onChange={(e) => setText(e.target.value)} aria-label={file} />
      <div className="row"><span className="hint num">{t("{n} words", { n: words(text) })}</span><span className="spacer" />
        {q.data.exists && <button className="btn sm" onClick={() => { setText(q.data.text); setEdit(false); }}>{t("Cancel")}</button>}
        <button className="btn primary sm" onClick={save} disabled={busy || (q.data.exists && text === q.data.text)}>{busy ? <Loader2 size={14} className="spin" /> : <Save size={14} />}{t("Save")}</button></div>
    </> : <div className="doc-read">{/(^|\/)(design|frame)\.md$/i.test(file) ? <DesignView text={q.data.text} /> : /\.json$/i.test(file) ? <PlanView text={q.data.text} /> : <Markdown text={q.data.text} className="md" />}</div>}
  </div>;
}

/** Import assets in the Editor (top bar or the pipeline). */
export function ImportSheet({ projectId, project, onChanged }) {
  const t = useT();
  const toast = useToast();
  return <div className="import-sheet">
    <p className="secondary">{t("Files are copied into the project and sorted by kind. Claude is told in the chat what was added.")}</p>
    <ImportNow projectId={projectId}
      onDone={(r) => { onChanged?.(); if (r.ok) toast(t("{n} file(s) copied into the project; Claude is told", { n: r.ok })); if (r.same) toast(t("{n} identical file(s) left out: already there", { n: r.same })); if (r.voice?.job) toast(t("Transcribing the voice-over…"));
        for (const a of r.archives ?? []) if (!a.unpacked) toast(a.error, "error"); }} />
  </div>;
}

// The ways of working with the user's files: three (ways.js); an old project's id reads as its new name
export const WAY_NAMES = Object.fromEntries([...WAYS.map((w) => [w.id, [w.name, w.sub]]), ["relayout", [WAYS[0].name, WAYS[0].sub]], ["remake", [WAYS[2].name, WAYS[2].sub]]]);

/** Assets analysis: what Claude found in the files (ASSETS.md) and, for General, the way of working it proposes; the user confirms or picks another. */
export function AnalysisSheet({ projectId, onChanged }) {
  const t = useT();
  const toast = useToast();
  const stage = useStage(projectId);
  const q = useData(() => get(`/api/projects/${projectId}/analysis`), [projectId]);
  const [pick, setPick] = useState(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (q.data && !pick) setPick(canonicalWay(q.data.way?.id) ?? canonicalWay(q.data.general ? q.data.proposed : null) ?? "free"); }, [q.data]); // eslint-disable-line react-hooks/exhaustive-deps
  if (q.error) return <Banner kind="error">{q.error.message}</Banner>;
  if (!q.data) return <div className="skeleton" style={{ height: "16rem" }} />;
  const chosen = canonicalWay(q.data.way?.id);
  const confirm = async (way) => {
    setBusy(true);
    try { await patch(`/api/projects/${projectId}/way`, { way }); toast(q.data.general ? t("Way of working: {way}", { way: t(WAY_NAMES[way][0]) }) : t("Assets confirmed")); q.reload(); onChanged?.(); stage.close(); }          // confirmed: the sheet closes
    catch (e) { toast(e.message, "error"); } finally { setBusy(false); }
  };
  return <div className="sheet-cols analysis">
    <section className="panel">
      <div className="panel-head"><h2>{t("What Claude found")}</h2><span className="muted end num">{t("{n} file(s)", { n: q.data.inventory?.total ?? 0 })}</span></div>
      {q.data.text ? <div className="doc-read"><Markdown text={q.data.text} className="md" /></div>
        : <Banner kind="info">{t("Claude has not read the files yet; it does in the Assets step.")}</Banner>}
      <div className="row"><button className="btn sm" onClick={() => stage.askClaude(t("About the assets analysis: "))}><Bot size={14} />{t("Ask Claude")}</button></div>
    </section>
    {q.data.general ? <section className="panel">
      <div className="panel-head"><h2>{t("How to use your files")}</h2></div>
      <div className="np-modes ways" role="radiogroup" aria-label={t("How to use your files")}>{WAYS.map(({ id: k, name, sub }) => (
        <button type="button" key={k} className="radio-card" role="radio" aria-checked={pick === k} onClick={() => setPick(k)}>
          <span className="t">{t(name)}{canonicalWay(q.data.proposed) === k && <span className="tag">{t("Claude proposes")}</span>}{chosen === k && <span className="tag ok">{t("Chosen")}</span>}</span>
          <span className="d">{t(sub)}</span></button>))}</div>
      <div className="row"><span className="hint">{t("The steps change with the way you start: a reference adds a style guide, a remake adds a shot list.")}</span><span className="spacer" />
        <button className="btn primary sm" onClick={() => confirm(pick)} disabled={busy || !pick || pick === chosen}>{busy ? <Loader2 size={14} className="spin" /> : <Check size={14} />}{chosen ? t("Change the way") : t("Confirm")}</button></div>
    </section> : <section className="panel">
      <div className="panel-head"><h2>{t("Next")}</h2></div>
      <p className="secondary">{t("Read what Claude found, then confirm: the next steps use these files.")}</p>
      <div className="row"><span className="spacer" />
        <button className="btn primary sm" onClick={() => confirm("free")} disabled={busy || !!chosen}>{busy ? <Loader2 size={14} className="spin" /> : <Check size={14} />}{chosen ? t("Confirmed") : t("Confirm")}</button></div>
    </section>}
  </div>;
}

/** The Review (only trouble): Claude's final score in one line, then only what is still off, a score under 8 or a problem Claude
 *  left as it is, with its time (qcSummary.js). The full QC-REVIEW.md, the rounds, the seven scores and the stills stay out of the way. */
export function QcReviewSheet({ projectId }) {
  const t = useT();
  const stage = useStage(projectId);
  const q = useData(() => get(`/api/projects/${projectId}/qc`), [projectId]);
  if (q.error) return <Banner kind="error">{q.error.message}</Banner>;
  if (!q.data) return <div className="skeleton" style={{ height: "16rem" }} />;
  const s = qcSummary(q.data.text);
  const n = s?.score != null ? Number(String(s.score).replace(",", ".")) : null;
  const off = (s?.low.length ?? 0) + (s?.left.length ?? 0);
  // "Fix mistakes only" gives no score: what it found, as Claude wrote it
  const found = q.data.mode === "mistakes" ? q.data.rounds ?? [] : null;
  return <div className="qc-review">
    {found ? <><Banner kind="success">{found.some((r) => r.worst?.length) ? t("Claude checked your film for mistakes and fixed what it found.") : t("Claude checked your film for mistakes and found none.")}</Banner>
      {found.some((r) => r.worst?.length) && <ul className="plain qc-off">{found.flatMap((r) => r.worst ?? []).map((w, i) => <li key={i}>{w.at != null && <span className="num qc-n">{w.at} s</span>}<span>{w.text}</span></li>)}</ul>}</>
      : !s ? <Banner kind="info">{t("No review yet. It appears after the Review step.")}</Banner>
      : <Banner kind={n == null ? "info" : n < 8 ? "error" : off ? "warning" : "success"}>
        {n == null ? t("Claude is still reviewing the film.") : <><b>{t("Final score {n}/10", { n: s.score })}</b>{" "}
          {n < 8 ? t("Below the bar of 8.") : off ? t("Good to go; Claude left a few small things as they are.") : t("Nothing left to fix.")}</>}</Banner>}
    {off > 0 && <ul className="plain qc-off">
      {s.low.map(([what, v]) => <li key={what}><span className="num qc-n">{v}/10</span><span>{t(what)}</span></li>)}
      {s.left.map((l) => <li key={l}><span>{l}</span></li>)}</ul>}
    {q.data.brand && (q.data.brand.failed.length + q.data.brand.missing.length > 0
      ? <Banner kind="error">{t("Brand Kit: {done} of {total} rules checked and kept. Broken or not checked: {ids}.", { done: q.data.brand.done, total: q.data.brand.total, ids: [...q.data.brand.failed, ...q.data.brand.missing].join(", ") })}</Banner>
      : <Banner kind="success">{t("Brand Kit: all {total} rules checked and kept.", { total: q.data.brand.total })}</Banner>)}
    <div className="row"><button className="btn sm" onClick={() => stage.askClaude(t("About the review: "))}><Bot size={14} />{t("Ask Claude")}</button></div>
  </div>;
}
