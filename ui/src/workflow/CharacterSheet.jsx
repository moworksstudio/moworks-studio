// The Characters dialog (Brush cartoon): the film's characters as Claude wrote them in
// CHARACTERS.json, each with its two sheets the app draws (views: five key views, moves and hats; emotions: all 31), so the user checks
// them before the storyboard. Draw again (one character or all), save a character to "my characters" for later films, then Approve, which
// approves the file as it is now (like the style guide). Data: GET /api/projects/<id>/characters.
// An anidoodle film whose hand draws people: its cast are anidoodle's human characters, each with one model
// sheet in the film's hand and a poster; Claude draws them (no Draw again here), and Check runs each character's own tests in seconds.
import { useEffect, useState } from "react";
import { AlertTriangle, ArrowRight, Check, Loader2, MessageSquare, RefreshCw, Save, ShieldCheck } from "lucide-react";
import { get, post, watchJob } from "../api.js";
import { Banner } from "../components.jsx";
import { ago, useData, useToast } from "../lib.jsx";
import { useT } from "../i18n.jsx";
import { useClaudeDone, useStage } from "./stage.jsx";
import { CreditLine } from "../screens/StyleGallery.jsx";

// from: null when Claude made it in this film, else { library: "app" | "yours", at }
const FROM = { yours: "From your characters", app: "Moworks sample", anidoodle: "From anidoodle's characters" };
const fromLabel = (f) => (f?.library ? FROM[f.library] ?? f.library : "New for this film");

function Swatches({ colors }) {
  const list = Object.values(colors ?? {});
  if (!list.length) return null;
  return <span className="lk-sw" aria-hidden="true">{list.map((c) => <i key={c} style={{ background: c }} />)}</span>;
}

/** One sheet as a picture that opens full size, or a placeholder while it is not drawn. */
function SheetPic({ sheet, label, name, drawing, hint }) {
  const t = useT();
  const [state, setState] = useState("loading");          // a 3-4 MB sheet takes a moment; a failed one says so
  const src = sheet?.url ? sheet.url + `?v=${encodeURIComponent(sheet.at ?? "")}` : null;
  useEffect(() => { setState("loading"); }, [src]);
  return <figure className="chs-sheet"><figcaption title={hint}>{label}{hint && <span className="muted"> · {hint}</span>}{sheet?.at && <span className="muted"> · {ago(sheet.at)}</span>}</figcaption>
    {src ? <a href={src} target="_blank" rel="noopener noreferrer" title={t("Open full size")} className={"chs-pic " + state}>
      <img src={src} alt={`${name} · ${label}`} decoding="async" onLoad={() => setState("ok")} onError={() => setState("err")} />
      {state === "loading" && <span className="chs-load"><Loader2 size={14} className="spin" />{t("Loading…")}</span>}
      {state === "err" && <span className="chs-load err">{t("This sheet did not load.")} <button type="button" className="clink" onClick={(e) => { e.preventDefault(); setState("loading"); e.currentTarget.closest("a").querySelector("img").src = src + "&r=" + Date.now(); }}>{t("Try again")}</button></span>}</a>
      : <span className="chs-none">{drawing ? <><Loader2 size={14} className="spin" />{t("Drawing…")}</> : t("Not drawn yet")}</span>}</figure>;
}

/** What a finished redraw job did not draw: the job failed, or it ended with the cast's problems or a character's error
 *  (kit.characterSheets: { characters: [{ id, name, error }], problems }); null when every asked character was drawn. */
export function drawFailure(job, cast = [], ids = null) {
  if (job?.status === "failed") return { names: [], why: job.error?.message ?? "" };
  const res = job?.result ?? null;
  if (!res) return null;
  const bad = (res.characters ?? []).filter((c) => c.error);
  const asked = cast.filter((c) => !ids || ids.includes(c.id));
  if (res.problems?.length) return { names: [], why: res.problems.join("; ") };
  if (bad.length) return { names: bad.map((c) => c.name ?? c.id), why: bad.map((c) => `${c.name ?? c.id}: ${c.error}`).join("; ") };
  if (asked.length && !(res.characters ?? []).length) return { names: asked.map((c) => c.name), why: "" };
  return null;
}

export default function CharacterSheet({ projectId, onChanged }) {
  const t = useT();
  const toast = useToast();
  const q = useData(() => get(`/api/projects/${projectId}/characters`), [projectId]);
  const stage = useStage(projectId);
  const working = useClaudeDone(projectId, q.reload);          // Claude wrote or changed the characters: read them again
  const [going, setGoing] = useState(false);
  const [job, setJob] = useState(null);                         // a redraw: { ids, stage, progress }
  const [notReady, setNotReady] = useState(null);             // why the cast cannot be approved yet (the server's 409 NOT_READY)
  const [busy, setBusy] = useState(null);                       // "approve" | "save:<id>" | "check"
  const [gate, setGate] = useState(null);                       // the last Check: { pass, characters: [{ id, passed, failed }] }
  const [drawErr, setDrawErr] = useState(null);                 // A redraw that drew nothing says so: { names, why }
  if (q.error) return <Banner kind="error">{q.error.message}</Banner>;
  const d = q.data;
  if (!d) return <div className="skeleton" style={{ height: "20rem" }} />;
  const drawing = !!job || !!d.drawing;
  const redraw = async (ids) => {
    try {
      setDrawErr(null);
      const r = await post(`/api/projects/${projectId}/characters/sheets`, ids ? { ids } : {}); const j = r.job ?? r; setJob({ ...j, ids });
      watchJob(j.id, (x) => { if (!x) return; setJob((o) => ({ ...o, ...x })); if (x.status !== "running") { setJob(null); q.reload(); setDrawErr(drawFailure(x, d.characters ?? [], ids)); } }, 1500);
    } catch (e) { setDrawErr({ names: [], why: e.message }); }
  };
  const save = async (c) => {
    setBusy("save:" + c.id);
    try { await post(`/api/projects/${projectId}/characters/${c.id}/save`); toast(t("{name} saved to your characters", { name: c.name })); q.reload(); }
    catch (e) { toast(e.message, "error"); } finally { setBusy(null); }
  };
  const approve = async () => {
    setBusy("approve");
    setNotReady(null);
    try { await post(`/api/projects/${projectId}/approve/characters`); toast(t("Characters approved")); q.reload(); onChanged?.(); }
    catch (e) { if (e.code === "NOT_READY") setNotReady(e.message); else toast(e.message, "error"); } finally { setBusy(null); }
  };
  // once approved and nothing runs, the next step starts from here too (the autopilot normally does it)
  const goOn = async () => {
    setGoing(true);
    // a storyboard already done is not started again; the pipeline just goes on
    try { const r = await post(`/api/projects/${projectId}/pipeline/storyboard/run`, {}); toast(t(r?.alreadyDone ? "Going on" : "Claude starts the storyboard")); stage.close(); }
    catch (e) { toast(e.message, "error"); setGoing(false); }
  };
  const check = async () => {
    setBusy("check");
    try { setGate(await post(`/api/projects/${projectId}/characters/gate`)); }
    catch (e) { toast(e.message, "error"); } finally { setBusy(null); }
  };
  // a character that does not look right goes back to Claude with what to change
  const askChange = (c) => stage.askClaude(t("Change the character {name}: ", { name: c.name }));
  const chars = d.characters ?? [];
  const human = !!d.humanHand;          // anidoodle's people in this film's hand
  const allDrawn = chars.length > 0 && chars.every((c) => (c.engine === "anidoodle-human" ? c.sheets?.sheet : c.sheets?.views && c.sheets?.emotions));
  const gateOf = (c) => gate?.characters?.find((x) => x.id === c.id);
  // the approve route keeps the file's hash: `changed` says the file moved on since (an older server: compare the times)
  const changed = !!d.approval?.at && (d.changed ?? (d.hash && d.approval.hash ? d.hash !== d.approval.hash : !!d.at && new Date(d.at) > new Date(d.approval.at)));
  const approved = !!d.approval?.at && !changed;
  return <div className="chs">
    <div className="chs-bar">
      {approved ? <span className="state-badge ok"><Check size={15} />{t("Approved {when}", { when: ago(d.approval.at) })}</span>
        : <span className={"chs-state" + (changed ? " redo" : "")}>{changed ? <><AlertTriangle size={14} />{t("Changed since approval: check again")}</> : t("Not approved yet")}</span>}
      {drawing && <span className="lk-stage"><Loader2 size={14} className="spin" />{job?.stage ? t(job.stage) : t("Drawing the sheets…")}{job?.progress != null ? ` · ${job.progress}%` : ""}</span>}
      <span className="spacer" />
      {gate && <span className={"state-line " + (gate.pass ? "ok" : "stop")}>{gate.pass ? <><Check size={14} />{t("Every character passed its checks")}</> : <><AlertTriangle size={14} />{t("A character failed its checks")}</>}</span>}
      {human && chars.length > 0 && <button className="btn sm" onClick={check} disabled={busy === "check" || working} title={t("Runs each character's own checks; takes a few seconds")}>{busy === "check" ? <Loader2 size={13} className="spin" /> : <ShieldCheck size={13} />}{t("Check")}</button>}
      {!human && chars.length > 1 && <button className="btn sm" onClick={() => redraw(null)} disabled={drawing || working}><RefreshCw size={13} />{t("Draw all again")}</button>}
      {approved && !working && <button className="btn primary sm" onClick={goOn} disabled={going}>{going ? <Loader2 size={14} className="spin" /> : <ArrowRight size={14} />}{t("Go on to the storyboard")}</button>}
      {!approved && <button className="btn ok sm" onClick={approve} disabled={!allDrawn || drawing || working || busy === "approve"}
        title={!allDrawn ? t(human ? "Every character needs its sheet first" : "Every character needs both sheets first") : working ? t("Claude is still working") : undefined}>
        {busy === "approve" ? <Loader2 size={14} className="spin" /> : <Check size={14} />}{t("Approve")}</button>}
    </div>
    {chars.length > 0 && human && <p className="chs-note">{t("Each person is anidoodle's character, posed and animated by its own engine. The sheet shows them in this film's hand; if one looks wrong, ask Claude to change it before you approve.")}</p>}
    {chars.length > 0 && !human && <p className="chs-note">{t("These sheets are the character's model: body, colours, faces and moves. Small details from the brief (hair, clothes, props) are added when the film is built. If the model is wrong, ask Claude to change it before you approve.")}</p>}
    {notReady && <Banner kind="warning">{t(notReady)}</Banner>}
    {drawErr && !drawing && <p className="warn-note chs-drawerr" role="alert"><AlertTriangle size={13} />
      {drawErr.names.length ? t("The sheets of {names} were not drawn.", { names: drawErr.names.join(", ") }) : t("The sheets were not drawn.")}
      <button type="button" className="clink" disabled={working} onClick={() => stage.askClaude(t("Draw all again did not draw the model sheets. What the app said: {why} ", { why: drawErr.why }))}>{t("Ask Claude to fix")}</button></p>}
    {d.problems?.length > 0 && <div className="chs-problems">{d.problems.map((p, i) => <p key={i} className="warn-note"><AlertTriangle size={13} />{t(String(p))}</p>)}</div>}
    {!d.exists || chars.length === 0 ? <div className="empty"><p>{working ? t("Claude is writing the characters from the brief…") : t(human ? "No characters yet. Claude casts them from the brief and draws each one's sheet here." : "No characters yet. Claude writes them from the brief, then the app draws their sheets here.")}</p></div>
      : chars.map((c) => <section key={c.id} className="chs-char" aria-label={c.name}>
        <div className="chs-head"><h3>{c.name}</h3><Swatches colors={c.colors} /><span className="au-tag">{t(fromLabel(c.from))}</span>
          {c.engine === "anidoodle-human" && c.made && <span className="au-tag" title={t(c.made === "as shipped" ? "Used exactly as its author published it" : "Made new for the app from the author's idea or a description")}>{t(c.made === "as shipped" ? "As shipped" : "Written from the idea")}</span>}
          {c.needsPalette && <span className="tech">{t("Takes this film's colours")}</span>}
          {gateOf(c) && (gateOf(c).failed ? <span className="tech bad"><AlertTriangle size={11} />{gateOf(c).failed === 1 ? t("1 check failed") : t("{n} checks failed", { n: gateOf(c).failed })}</span>
            : <span className="tech ok"><Check size={11} />{t("Checks passed")}</span>)}
          <span className="spacer" />
          <button className="btn ghost sm" onClick={() => (gateOf(c)?.failed ? stage.askClaude(t("{name} failed its character checks: fix them in this film's copy. ", { name: c.name })) : askChange(c))} disabled={working}><MessageSquare size={13} />{t(gateOf(c)?.failed ? "Ask Claude to fix" : "Ask Claude to change")}</button>
          {c.engine !== "anidoodle-human" && <button className="btn ghost sm" onClick={() => redraw([c.id])} disabled={drawing || working}><RefreshCw size={13} />{t("Draw again")}</button>}
          {/* An anidoodle-engine character is in the user's characters only when it came from them; Save keeps Brush ones only */}
          {(c.engine === "anidoodle-human" ? c.from?.library === "yours" : c.saved) ? <span className="tech ok"><Check size={11} />{t("In your characters")}</span>
            : c.engine !== "anidoodle-human" && <button className="btn ghost sm" onClick={() => save(c)} disabled={busy === "save:" + c.id || !c.sheets?.views}><Save size={13} />{t("Save to my characters")}</button>}</div>
        {c.about && <p className="chs-about">{t(c.about)}</p>}
        {c.engine === "anidoodle-human" ? <div className={"chs-sheets" + (c.sheets?.poster ? "" : " one")}>
          <SheetPic sheet={c.sheets?.sheet} label={t("Model sheet")} hint={t("every angle, face and pose")} name={c.name} drawing={working || (drawing && (!job?.ids || job.ids.includes(c.id)))} />
          {c.sheets?.poster && <SheetPic sheet={c.sheets.poster} label={t("Poster")} hint={t("how it looks in this film")} name={c.name} />}
        </div>
        : <div className="chs-sheets">
          <SheetPic sheet={c.sheets?.views} label={t("Views")} name={c.name} drawing={drawing && (!job?.ids || job.ids.includes(c.id))} />
          <SheetPic sheet={c.sheets?.emotions} label={t("Emotions")} name={c.name} drawing={drawing && (!job?.ids || job.ids.includes(c.id))} />
        </div>}
      </section>)}
    {/* The credit of the engine that draws this film's cast, one line each, in the standard form; anidoodle's people never
        read as ClaudeAnimationBase's */}
    {(() => { const anidoodle = human || chars.some((c) => c.engine === "anidoodle-human"), brush = chars.some((c) => c.engine === "brush-kit") || (!anidoodle && !chars.length);
      return <>{anidoodle && <CreditLine author="anidoodle · Alex Greenshpun (10x Company)" licence="Apache-2.0 (NOTICE)" link="https://github.com/alexgreensh/anidoodle/tree/f746cbd8a7032463bd0bc88ee8ff852599193b8c" commit="f746cbd8a7032463bd0bc88ee8ff852599193b8c" />}
        {brush && <CreditLine author="ClaudeAnimationBase · John Heibel" licence="MIT" link="https://github.com/JohnHeibel/ClaudeAnimationBase/tree/0ac8bf2b31942376cb6b8c4074715595d512acd2" commit="0ac8bf2b31942376cb6b8c4074715595d512acd2" />}</>; })()}
  </div>;
}
