// Storyboard dialog: every
// option its own board, newest on top ("Option A", "Option B", "Option B2 · revised from Option B"; no "Round"), and for the chosen one three
// actions in the bar: Approve storyboard, Feedback (the box beside its card: notes for the board or per panel, saved in the project) and Make
// another option. Each asks first in a dialog with what it does and what it costs; then the dialog closes and Claude works, the chat shows it.
// Keep the design: the user's own frames are the storyboard, shown in order to approve, with no options. The way of working is asked once in
// Prepare, not here, and the placeholder shot a new project starts with is not shown. Approve records who, when and which revision.
import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Bot, Check, Film, Loader2, MessageSquareText, Plus, ShieldCheck } from "lucide-react";
import { get, post } from "../api.js";
import { Banner, Dialog } from "../components.jsx";
import { useData, useToast } from "../lib.jsx";
import { useT } from "../i18n.jsx";
import { useClaudeDone, useStage } from "../workflow/stage.jsx";
import Boards, { appendNote, nextLetter, nextRevision, noteCounts, optionsOf, useNotes } from "../workflow/Boards.jsx";
import UsageHint, { stepLine } from "../workflow/usage.jsx";

// the request "Ask Claude" sends from an empty storyboard (an English key for t)
export const WRITE_SB = "Write the storyboard for this video from the brief: propose the shots in STORYBOARD.md (title, visual direction, voice-over, length for each). Do not build any motion yet.";

/** Keep the design: the user's frames in order, large, as they will be animated. */
function Frames({ shots, posters }) {
  const t = useT();
  return <section className="sb-frames" aria-labelledby="sb-frames-h">
    <div className="panel-head"><h2 id="sb-frames-h">{t("Your frames, in order")}</h2><span className="muted num">{shots.length}</span></div>
    <p className="hint">{t("You kept your design: these frames are the storyboard. Claude animates them as they are.")}</p>
    <ol className="plain sb-frame-grid">{shots.map((s) => {
      const pst = posters?.find((x) => x.number === s.number);
      return <li key={s.number} className="sb-frame">
        <div className="sb-frame-pic">{pst ? <img src={pst.url} alt="" loading="lazy" /> : <span className="label"><Film size={13} />{t("No still yet")}</span>}<span className="num">{s.number}</span></div>
        <span className="sb-frame-t">{s.title}</span>
        {s.notInStoryboard && <span className="status warning"><AlertTriangle size={12} />{t("Built, not in the storyboard")}</span>}
      </li>;
    })}</ol>
  </section>;
}

export default function Storyboard({ id, setCrumbs = () => {} }) {
  const t = useT();
  const stage = useStage(id);
  const toast = useToast();
  const project = useData(() => get(`/api/projects/${id}`), [id]);
  const sb = useData(() => get(`/api/projects/${id}/shots`), [id]);
  const posters = useData(() => get(`/api/projects/${id}/posters`), [id]);
  const [sel, setSel] = useState(null);                // the chosen option's key
  const [board, setBoard] = useState(null);            // GET /boards, handed up by <Boards>
  const [chosenOnce, setChosenOnce] = useState(false);
  const [ask, setAsk] = useState(null);                // the action waiting for its yes: "approve" | "more" | "revise"
  const [busy, setBusy] = useState(false);
  const [boardsKey, setBoardsKey] = useState(0);
  const notes = useNotes(id, board ? Object.fromEntries(optionsOf(board).filter((o) => o.feedback).map((o) => [o.label, { text: o.feedback }])) : null);
  const [fbOpen, setFbOpen] = useState(false);
  const [fbFocus, setFbFocus] = useState(0);
  const working = useClaudeDone(id, () => { sb.reload(); posters.reload(); setBoardsKey((k) => k + 1); });       // Claude finished: show what it wrote; while it works, approving waits (looking and choosing never do)
  useEffect(() => {        // posters are made by HF snapshot per revision; start them when missing, then check back
    const st = posters.data?.status;
    if (st === "missing") post(`/api/projects/${id}/posters`).then(() => setTimeout(posters.reload, 4000)).catch(() => {});
    else if (st === "running") { const h = setTimeout(posters.reload, 3000); return () => clearTimeout(h); }
  }, [posters.data?.status]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { setCrumbs(project.data ? [t("Projects"), project.data.title, t("Storyboard")] : null); }, [project.data, t]); // eslint-disable-line react-hooks/exhaustive-deps
  const options = optionsOf(board);
  useEffect(() => {        // start from the option picked before, else the newest; the user's own choice is never overwritten
    if (!board || chosenOnce || !options.length) return;
    setSel((options.find((o) => o.picked && o.label !== "mix") ?? options[0]).key);
    setChosenOnce(true);
  }, [board]); // eslint-disable-line react-hooks/exhaustive-deps
  const reopened = useRef(new Set());          // a draft left from before (this dialog or the app closed): its box opens again, once per option
  useEffect(() => {
    const l = options.find((o) => o.key === sel)?.label;
    if (l && notes.textOf(l).trim() && !reopened.current.has(l)) { reopened.current.add(l); setFbOpen(true); }
  }, [sel, notes.notes]); // eslint-disable-line react-hooks/exhaustive-deps
  const shots = sb.data?.shots ?? [];
  const real = shots.filter((s) => s.index != null);
  const approval = sb.data?.approval;
  const keep = board?.frames === true || board?.way === "keep";          // GET /boards says it
  const hasOptions = !keep && options.length > 0;
  const option = options.find((o) => o.key === sel) ?? null;
  const label = option?.label ?? null;
  const draft = label ? notes.textOf(label) : "";
  const frames = hasOptions ? (option?.frames?.length ?? 0) : real.length;
  const recorded = !!option?.picked;      // this card is already what the project recorded
  const approved = !!approval && !sb.data?.changedSinceApproval && (!hasOptions || recorded);
  const taking = !!board?.taking;          // The app is taking the options' pictures
  const canApprove = !approved && !working && !taking && (hasOptions ? !!option : keep && !!sb.data?.storyboard?.exists && real.length > 0);
  // An option is approved only from pictures of it as it is now. While the app takes them Approve waits; a 409 says
  // the pictures were old (the app takes them again) or are being taken, in plain words on the bar, and the boards are read again
  const [stillsMsg, setStillsMsg] = useState(null);
  const sawTaking = useRef(false);
  const refetch = useRef(false);          // the boards read again after a 409: pictures already in (quicker than the read) clear the line too
  useEffect(() => {
    if (!board) return;
    if (taking) { sawTaking.current = true; refetch.current = false; }
    else if (sawTaking.current || refetch.current) { sawTaking.current = false; refetch.current = false; setStillsMsg(null); }
  }, [board]); // eslint-disable-line react-hooks/exhaustive-deps
  const stillsWait = (e) => {
    if (e?.code !== "STILLS_OLD" && e?.code !== "STILLS_TAKING") return false;
    setStillsMsg(e.code === "STILLS_OLD" ? t("Option {o} changed after its pictures were taken. Taking new pictures now: approve when they're in.", { o: label })
      : t("Taking new pictures of this option. Approve when they're in."));
    refetch.current = true;
    setBoardsKey((k) => k + 1);
    return true;
  };
  const run = async (fn, done) => { setBusy(true); try { await fn(); setAsk(null); done(); } catch (e) { if (!stillsWait(e)) toast(e.message, "error"); setAsk(null); } finally { setBusy(false); } };
  const approve = () => run(async () => {
    if (hasOptions && option && !recorded) await post(`/api/projects/${id}/boards/pick`, { round: option.draft, option: label, note: "" });
    await post(`/api/projects/${id}/storyboard/approve`, hasOptions && option ? { option: label, round: option.draft } : {});          // the server copies that card's storyboard in
  }, () => { toast(hasOptions ? t("Storyboard {o} approved", { o: label }) : t("Storyboard approved")); sb.reload(); project.reload(); stage.close(); });
  // the feedback (or a new, clearly different option) goes to Claude, the draft is cleared, the dialog closes, the chat shows the work
  const more = () => run(() => post(`/api/projects/${id}/boards/more`, draft.trim() ? { text: draft.trim() } : {}),
    () => { if (label) notes.set(label, "", true); toast(t("Claude is making Option {o}", { o: nextLetter(options) })); stage.close(); });
  const revise = () => run(() => post(`/api/projects/${id}/boards/${label}/feedback`, { text: draft.trim() }),
    () => { notes.set(label, "", true); toast(t("Claude is making Option {o}", { o: nextRevision(options, option.letter ?? label[0]) })); stage.close(); });
  const fb = { open: fbOpen, focus: fbFocus, textOf: notes.textOf, set: notes.set, close: () => setFbOpen(false), submit: () => setAsk("revise"),
    add: (o, n, note = "") => { notes.set(o.label, appendNote(notes.textOf(o.label), n, note)); setFbOpen(true); if (!note) setFbFocus((k) => k + 1); } };
  const panelNotes = Object.values(noteCounts(draft)).reduce((a, b) => a + b, 0);
  const askClaude = () => { stage.askClaude(t(WRITE_SB)); };
  const showBar = hasOptions || (keep && real.length > 0);
  const confirm = { approve: [hasOptions ? t("Approve storyboard {o}?", { o: label }) : t("Approve the storyboard?"), t("Approve"), approve],
    more: [t("Make another option?"), t("Make Option {o}", { o: nextLetter(options) }), more],
    revise: [t("Send your feedback on Option {o}?", { o: label }), t("Send feedback"), revise] }[ask] ?? null;
  return <div className="page sb2">
    {sb.error && <Banner kind="error" action={<button className="btn sm" onClick={sb.reload}>{t("Retry")}</button>}>{sb.error.message}</Banner>}
    {approval && sb.data?.changedSinceApproval && <Banner kind="warning">{sb.data?.movedBy
      ? t("“{step}” changed after you approved this. Approve it again, or keep it as it is from the Pipeline.", { step: t(sb.data.movedBy) })
      : t("The storyboard changed since you approved it. Approve it again to go on.")}</Banner>}
    {sb.data?.storyboard?.warnings?.length > 0 && <Banner kind="warning">{t("The storyboard file has {n} note(s) for Claude; the shots below still work.", { n: sb.data.storyboard.warnings.length })}
      <details className="diag"><summary>{t("Details")}</summary><ul className="plain mono">{sb.data.storyboard.warnings.map((w, i) => <li key={i}>{w.message ?? JSON.stringify(w)}</li>)}</ul></details></Banner>}
    <Boards key={boardsKey} projectId={id} sel={sel} onSel={setSel} onData={setBoard} locked={working} approved={!!approval && !sb.data?.changedSinceApproval} fb={fb} />
    {keep && real.length > 0 && <Frames shots={real} posters={posters.data?.posters} />}
    {!sb.loading && board && !hasOptions && !keep && !board.current?.some((c) => c.ready) && <div className="empty"><Film size={26} /><h2>{t("No storyboard yet")}</h2><p>{t("Claude makes one storyboard from the brief; you approve it or ask for another before anything is built.")}</p>
      <div className="row"><button className="btn primary" onClick={askClaude}><Bot size={16} />{t("Ask Claude to write it")}</button></div></div>}
    {keep && !sb.loading && real.length === 0 && <div className="empty"><Film size={26} /><h2>{t("Your frames are not read yet")}</h2><p>{t("Claude lists your frames in Prepare; they appear here to approve.")}</p></div>}
    {showBar && <div className="sb-bar">
      <span className="sb-bar-t">{approved ? <span className="state-badge ok"><ShieldCheck size={15} />{hasOptions ? t("Storyboard {o} is approved", { o: label }) : t("The storyboard is approved")}</span>
        : hasOptions ? (option ? t("Chosen: Option {o}", { o: label }) : t("Choose one option")) : t("{n} frames, in order", { n: real.length })}</span>
      <span className="spacer" />
      {working && <span className="state-line run"><Loader2 size={13} className="spin" />{t("Claude is working; these wait until it finishes")}</span>}
      {!working && !approved && (taking || stillsMsg) && <span className="state-line run" role="status"><Loader2 size={13} className="spin" />{stillsMsg ?? t("Taking new pictures of this option. Approve when they're in.")}</span>}
      {hasOptions && <>
        <button className="btn" onClick={() => { setFbOpen((x) => !x); setFbFocus((k) => k + 1); }} disabled={!option} aria-pressed={fbOpen}><MessageSquareText size={16} />{t("Feedback")}</button>
        <button className="btn" onClick={() => setAsk("more")} disabled={!option || working || busy}><Plus size={16} />{t("Make another option")}</button></>}
      <button className="btn ok" onClick={() => setAsk("approve")} disabled={!canApprove || busy}>{busy && ask === "approve" ? <Loader2 size={16} className="spin" /> : <Check size={16} />}{t("Approve storyboard")}</button>
    </div>}
    {confirm && <Dialog title={confirm[0]} onClose={() => setAsk(null)} footer={<><span className="spacer" />
      <button className="btn" onClick={() => setAsk(null)}>{t("Look again")}</button>
      <button className={"btn " + (ask === "approve" ? "ok" : "primary")} onClick={confirm[2]} disabled={busy}>{busy ? <Loader2 size={15} className="spin" /> : <Check size={15} />}{confirm[1]}</button></>}>
      {/* One sentence says what Claude does, how long and what it costs (normal text, not a warning); at most one short line under it */}
      {ask === "approve" && <UsageHint line={stepLine(t, t("Claude writes the motion for {n} shots", { n: frames }), board?.estimates?.motionFor?.[label] ?? board?.estimates?.motion)} />}
      {ask === "more" && <UsageHint line={stepLine(t, t("Claude makes Option {o}, unlike the ones you have", { o: nextLetter(options) }), board?.estimates?.option)}>
        <p className="hint">{draft.trim() ? t("Your feedback on Option {o} goes with it.", { o: label }) : t("Every option so far stays here.")}</p></UsageHint>}
      {ask === "revise" && option && <UsageHint line={stepLine(t, t("Claude makes Option {n} from your feedback", { n: nextRevision(options, option.letter ?? label[0]) }), board?.estimates?.feedback)}>
        <p className="hint">{panelNotes > 0 ? (panelNotes === 1 ? t("Only the panel with a note is drawn again.") : t("Only the {n} panels with a note are drawn again.", { n: panelNotes })) : t("Claude says first which panels it changes.")}</p></UsageHint>}
      </Dialog>}
  </div>;
}
