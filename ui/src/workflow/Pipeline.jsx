// The Pipeline column of the Editor: its stages, the same for every style (the server computes them: `stages` of
// GET /pipeline, packages/pipeline stagesOf). Each stage is its state and one line; the stage that needs the user or is running stands
// out. The dialogs (Storyboard, Motion, Final Mix, Checks) open from one bar above the chat input, not from here. The app runs the next step by itself (autopilot); while it runs, the buttons of stages
// 1-3 are off ("press Stop in the chat to change this": the chat's own Stop is the only stop). A stopped or failed stage offers
// "Continue" (POST /pipeline/resume; writing "continue" in the chat does the same).
import { useEffect, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { post } from "../api.js";
import { useToast } from "../lib.jsx";
import { useT } from "../i18n.jsx";
import { useThemeId } from "../theme.jsx";

// no word for a running stage: its spinner, the strip and the chat already say it
const STATUS_WORD = { waiting: "Waiting for you", stopped: "Stopped", redo: "Approve again", failed: "Needs a fix" };
// what a stage's `open` opens, and the label of its button while it waits for the user
export const OPENS = { brief: ["brief", "Open the brief"], storyboard: ["storyboard", "Open Storyboard"], "motion-plan": ["motion-plan", "Open Motion"], mix: ["mix", "Open Final Mix"],
  character: ["character", "Open Characters"],          // the Storyboard stage while its Character step runs or waits
  // The Storyboard waits for the voice-over and its words, or for the lyrics' timing (`voiceWait`)
  voice: ["voice", "Open Voice-over"], lyrics: ["lyrics", "Open Lyrics"] };
// the dialogs a stage waiting on them opens even while the autopilot runs (the voice-over is never locked)
const NEVER_LOCKED = new Set(["voice", "lyrics"]);
const NOW = new Set(["running", "waiting", "stopped", "redo", "failed"]);

/** The stage the film is at, for the chat's suggestions: the one running or waiting for the user, the chat loop (Feedback) once
 *  the film is built and nothing else asks, else the first one not done yet (Final Mix is optional, so it is passed over). */
export function currentStage(stages) {
  if (!stages?.length) return null;
  const s = stages.find((x) => NOW.has(x.status) && x.id !== "feedback") ?? stages.find((x) => x.id === "feedback" && NOW.has(x.status));
  if (s) return s.id;
  // no Feedback row any more; once the film is built the chat is the place for changes, so the suggestions stay "feedback"
  if (stages.find((x) => x.id === "build")?.status === "done") return "feedback";
  return (stages.find((x) => x.status !== "done" && x.id !== "finalMix") ?? stages.at(-1)).id;
}

// the server's stage lines with "(s)", in their singular and plural
const PLURAL = { "Motion Plan approved for {n} shot(s)": ["Motion Plan approved for 1 shot", "Motion Plan approved for {n} shots"],
  "Brief ready · {n} file(s)": ["Brief ready · 1 file", "Brief ready · {n} files"] };

export default function Pipeline({ projectId, data, starting = false, onOpen, onAssets, onChanged, cast = false, here = null, actions = null, onPlayer = null, music = false, warnings = 0 }) {
  const t = useT();
  const toast = useToast();
  const studio = useThemeId() === "studio";
  const [resuming, setResuming] = useState(false);
  // a time left counts down here between two answers of the server
  const [, setTick] = useState(0);
  const counting = !!data?.stepEstimate || !!(data?.estimate?.minutes && data?.stages?.some((x) => x.id === "build" && x.status === "running"));
  useEffect(() => { if (!counting) return undefined; const h = setInterval(() => setTick((x) => x + 1), 20000); return () => clearInterval(h); }, [counting]);
  // five rows, the same for every style; no Feedback row (the chat stays open), Render is the top bar's button
  const stages = data?.stages?.filter((s) => s.id !== "feedback" && s.id !== "render") ?? null;
  // the cast opens from Prepare (its Character step, or characters picked for the film); the chat has no Characters button
  const hasCast = cast || !!data?.steps?.some((x) => x.id === "character");
  const running = !!(data?.autopilot?.running || data?.claudeBusy || starting);
  const resume = async () => {
    setResuming(true);
    try { await post(`/api/projects/${projectId}/pipeline/resume`, {}); onChanged(); } catch (e) { toast(e.message, "error"); } finally { setResuming(false); }
  };
  const tr = (key, vars) => (key ? t(key, Object.fromEntries(Object.entries(vars ?? {}).map(([k, v]) => [k, typeof v === "string" ? t(v) : v]))) : "");
  // A done step an earlier change asks to redo (canKeep): kept as it is here, or approved again in its dialog (the line opens it)
  const [keeping, setKeeping] = useState(null);
  // Problems that stop the render after a fix in the chat: the checks run again from here (Render › Tech checks was the only way)
  const [rechecking, setRechecking] = useState(false);
  const recheck = async () => {
    setRechecking(true);
    try { await post(`/api/projects/${projectId}/qa`); toast(t("Checking the film again")); onChanged(); } catch (e) { toast(e.message, "error"); } finally { setRechecking(false); }
  };
  const blocked = (data?.checks?.blocking ?? 0) > 0 && data?.checks?.pass === false;
  const keep = async (stepId) => {
    setKeeping(stepId);
    try { await post(`/api/projects/${projectId}/pipeline/${stepId}/keep`, {}); onChanged(); } catch (e) { toast(e.message, "error"); } finally { setKeeping(null); }
  };
  /** One stage as both layouts show it: its state (the app's own work counts as running), its line, whether it is locked, its dialog,
   *  and the step an earlier change asks to redo that can be kept as it is. */
  const view = (s0) => {
    // the app's own work between two steps (the music and sound effects placed, the checks prepared) shows on its stage as running
    const app = data?.appBusy?.stage === s0.id && !NOW.has(s0.status) ? data.appBusy : null;
    const s = app ? { ...s0, status: "running", line: app.key, lineVars: app.vars } : s0;
    const now = NOW.has(s.status);
    const off = running && s.n <= 3 && !NEVER_LOCKED.has(s.open);          // the user changes stages 1-3 only after pressing Stop in the chat
    const opens = OPENS[s.open];
    // "6 shots" / "1 shot", never the machine-like "shot(s)" of the server's line
    const plural = PLURAL[s.line];
    let line = plural ? t(plural[s.lineVars?.n === 1 ? 0 : 1], s.lineVars) : tr(s.line, s.lineVars);
    // the time left while Claude builds: the estimate less the time since the build started; none once the checks run
    const checking = data?.steps?.some((x) => x.id === "checks" && x.status === "running");
    if (s.id === "build" && s.status === "running" && !app && !checking && data?.estimate?.minutes) {
      const since = data.estimate.startedAt ?? data.build?.startedAt;
      line = `${line} · ${etaLeft(t, { minutes: stageMinutes(data.estimate), startedAt: since })}`;
    }
    // the Storyboard and the Motion Plan: the server's line ends with its time left; the time is worked out again from its estimate
    const eta = data?.stepEstimate;
    if (eta?.minutes && s.id === eta.stage && s.status === "running" && !app) {
      const base = String(s.line ?? "").replace(/ · (?:about \d+ min(?: left)?|taking longer than usual(?: · \d+ min so far)?)$/, "");
      line = `${tr(base, s.lineVars)} · ${etaLeft(t, eta)}`;
    }
    const stopped = s.status === "stopped" || s.status === "failed";
    // a stage that waits for the user says what for, on its own line ("Waiting for you: Characters to approve")
    if (s.status === "waiting" && line && !/^Waiting for you/.test(s.line ?? "")) line = t("Waiting for you: {what}", { what: line });
    const k = s.status === "redo" && !off ? data?.steps?.find((x) => s.steps?.includes(x.id) && x.status === "redo" && x.canKeep) : null;
    return { s, now, off, opens, line, stopped, k };
  };
  const done = stages?.filter((s) => s.status === "done").length ?? 0;
  if (studio) return <StudioLine {...{ data, stages, view, running, hasCast, here, actions, onOpen, onAssets, onPlayer, resume, resuming, keep, keeping, recheck, rechecking, blocked, music, warnings }} />;
  return <div className="pl2">
    <div className="pl-head"><span>{t("Pipeline")}</span><span className="pl-count num">{stages ? `${done} / ${stages.length}` : ""}</span></div>
    {data?.question?.kind === "brief-changed" && <p className="pl-ask">{t("The brief changed after the build.")}
      <button className="btn sm primary" onClick={() => onOpen("brief", { briefChanged: true })}>{t("Choose what to do")}</button></p>}
    <ol className="plain pl-stages">
      {!stages && Array.from({ length: 5 }, (_, i) => <li key={i} className="skeleton" style={{ height: "1.6rem", margin: "4px 10px" }} />)}
      {stages?.map((s0) => {
        const { s, now, off, opens, line: line0, stopped, k } = view(s0);
        // the Review link carries the score, so the Build row's "Review 6/10" is not said twice
        const line = s.id === "build" && s.line === "Review {score}/10" && data?.qc?.final != null ? "" : line0;
        return <li key={s.id} className={"pl-stage " + s.status + (now ? " now" : "")}>
          <span className="pl-no num" aria-hidden="true">{s.status === "done" ? <Check size={12} /> : s.status === "running" ? <Loader2 size={12} className="spin" /> : s.n}</span>
          <span className="pl-name">{t(s.title)}</span>
          {/* Final Mix is the hand-over, not an optional step: no "Optional" tag (its line says "After the build") */}
          <span className="pl-tag">{s.status !== "waiting" && STATUS_WORD[s.status] ? t(STATUS_WORD[s.status]) : ""}</span>
          {/* a stage with a dialog opens it from its line ("Approve again" could not be clicked) */}
          {line && (opens && !off && s.id !== "prepare" ? <button className="pl-line pl-go" title={t(opens[1])} onClick={() => onOpen(opens[0])}>{line}</button>
            : <span className="pl-line" title={line}>{line}</span>)}
          {s.id === "prepare" && (s.status === "done" || now) && <span className="pl-links">
            <button className="clink" disabled={off} onClick={() => onOpen("brief")} title={off ? t("Press Stop in the chat to change this") : undefined}>{t("Brief")}</button>
            <button className="clink" onClick={onAssets}>{t("Assets")}</button>
            {/* The voice-over is made while Claude works (Claude asks for it during the Storyboard): never locked */}
            <button className="clink" onClick={() => onOpen("voice")}>{t("Voice-over")}</button>
            {hasCast && <button className="clink" onClick={() => onOpen("character")}>{t("Characters")}</button>}</span>}
          {/* Build and review shows its four parts as The Studio's station 04 does, in The Desk's own links: Build (the
              film in the middle, so a state, not a link), Review with its score, Music and sound effects, Tech checks; a Music / Lyrics film adds
              its lyrics and its music map */}
          {s.id === "build" && <span className="pl-links pl-subs">{(s.steps?.length ? s.steps.filter((x) => SUB[x]) : Object.keys(SUB)).map((id) => {
            const st = data?.steps?.find((x) => x.id === id)?.status ?? null;
            const mark = st === "running" ? <Loader2 size={11} className="spin" /> : st === "done" ? <Check size={11} /> : null;
            if (id === "build") return <span key={id} className={"pl-sub" + (st ? " " + st : "")}>{mark}{t(SUB[id])}</span>;
            const open = id === "qcReview" ? (data?.qc ? () => onOpen("qc-review") : null)
              : id === "sound" ? (actions?.find((a) => a.key === "mix")?.off === false || st === "done" ? () => onOpen("mix") : null) : () => onOpen("qa");
            return <button key={id} type="button" className={"clink pl-sub" + (st ? " " + st : "")} disabled={!open} onClick={open ?? undefined}
              title={!open ? t("Opens once {step} is done", { step: t("Build") }) : undefined}>{mark}{t(SUB[id])}
              {id === "qcReview" && data?.qc?.final != null && <b className="num">{` ${data.qc.final}/10`}</b>}
              {id === "checks" && warnings > 0 && <span className="pl-warn num">{" · " + warnWords(t, warnings)}</span>}</button>;
          })}
            {music && <><button className="clink" onClick={() => onOpen("lyrics")}>{t("Lyrics")}</button>
              <button className="clink" onClick={() => onOpen("music-map")}>{t("Music map")}</button></>}</span>}
          {s.id === "build" && blocked && !running && <span className="pl-acts"><button className="btn sm" disabled={rechecking || data?.checks?.running} onClick={recheck}>
            {rechecking || data?.checks?.running ? <Loader2 size={13} className="spin" /> : null}{data?.checks?.running ? t("Checking…") : t("Run checks again")}</button></span>}
          {stopped && !running && <span className="pl-acts"><button className="btn sm" disabled={resuming} onClick={resume}>{resuming ? <Loader2 size={13} className="spin" /> : null}{t("Continue")}</button></span>}
          {k && <span className="pl-acts"><button className="btn sm" disabled={!!keeping} onClick={() => keep(k.id)}>{keeping === k.id ? <Loader2 size={13} className="spin" /> : null}{t("Keep it as it is")}</button>
            {opens && <button className="btn sm primary" onClick={() => onOpen(opens[0])}>{t("Approve again")}</button>}</span>}
          {/* only once the Motion Plan is made or being made, never on a stage not reached yet */}
          {off && s.n === 3 && s.status !== "todo" && <span className="pl-hint">{t("Press Stop in the chat to change this")}</span>}
        </li>;
      })}
    </ol>
  </div>;
}

// The Studio: the same five stages as stations on one rail across the top of the Editor. Each station is drawn in
// the material of its state (blue pencil: not yet · half inked: at work or waiting · ink: done · colour: ready to render); the stage
// whose sheet lies on the light table is lifted and lit by the lamp. A station opens its sheet on the table (Build and review: the film
// itself); every action of the column above is here: Waiting for you, Continue, Keep it as it is / Approve again, Run checks again, the
// Prepare links, "Press Stop in the chat to change this" and the brief that changed after the build.
const SUB = { build: "Build", qcReview: "Review", sound: "Music and sound effects", checks: "Tech checks" };
/** The time left of a running step, as the server's etaWords says it (packages/server/boards.mjs), from now: "about N min left" down
 *  to its estimate, then "taking longer than usual · N min so far". The time left never grows (T26-4: past the middle it jumped to the
 *  time to the slowest, and the Build's went past the top of the range its confirm gave). Both themes' Pipeline say it. */
export function etaLeft(t, est, now = Date.now()) {
  const gone = est.startedAt ? (now - Date.parse(est.startedAt)) / 60000 : NaN;
  if (!(gone >= 0)) return t("about {n} min", { n: est.minutes });
  if (gone < est.minutes) return t("about {n} min left", { n: Math.max(1, Math.round(est.minutes - gone)) });
  return t("taking longer than usual · {n} min so far", { n: Math.round(gone) });
}
/** What the Build row counts down to: the estimate "Approve and build" gave (`planned` once the server worked it out again), never one that grows
 *  past it (T26-4: it climbed from 76 to 103 min, past the 77 the confirm said, and the Review's "8 min left" became 32). Once the server
 *  works the time out from the steps left and they end sooner, those (T28-13: "about 43 min left" at a 2 min music step, counted to the plan). */
export const stageMinutes = (est) => (est.basis === "steps" ? Math.min(est.planned ?? est.minutes, est.minutes) : est.planned ?? est.minutes);
// The tech checks' warnings were only dots on the timeline ruler while the row said Tech checks ✓; the row says how many, its link opens the list
const warnWords = (t, n) => (n === 1 ? t("1 warning") : t("{n} warnings", { n }));
const MATERIAL = { todo: "todo", done: "done", running: "wip", waiting: "wip", stopped: "wip", redo: "wip", failed: "wip" };
// the chat's bar of dialogs (Editor `actions`) gives the stations their gates: Storyboard opens to look while Claude works, Motion Plan only
// after Stop, Final Mix once the film is built
const ACTION_OF = { storyboard: "sb", motion: "mo", finalMix: "mix" };

function StudioLine({ data, stages, view, running, hasCast, here, actions, onOpen, onAssets, onPlayer, resume, resuming, keep, keeping, recheck, rechecking, blocked, music, warnings }) {
  const t = useT();
  const at = stages ? stages.findIndex((s) => s.status !== "done") : -1;
  const doneTo = !stages ? 0 : at < 0 ? 100 : (at / Math.max(1, stages.length - 1)) * 100;
  const stepOf = (id) => data?.steps?.find((x) => x.id === id) ?? null;
  return <nav className="sp-line" aria-label={t("Pipeline")}>
    <span className="sp-rail" aria-hidden="true"><i style={{ transform: `scaleX(${doneTo / 100})` }} /></span>
    {!stages && Array.from({ length: 5 }, (_, i) => <span key={i} className="sp-st skeleton" />)}
    {stages?.map((s0) => {
      const { s, now, off, opens, line: line0, stopped, k } = view(s0);
      // the Review pill carries the score: the Build row's "Review 6/10" is not said twice
      const line = s.id === "build" && s.line === "Review {score}/10" && data?.qc?.final != null ? "" : line0;
      // A Storyboard waiting for the voice-over or the lyrics opens that dialog, not its own sheet
      const act = NEVER_LOCKED.has(s.open) ? null : actions?.find((a) => a.key === ACTION_OF[s.id]) ?? null;
      // what the station opens, and whether it may now (the same gates as the Desk's links and the chat's bar)
      const go = s.id === "build" ? { on: () => onPlayer?.(), off: false, title: t("Film") }
        : act ? { on: act.onClick, off: act.off, title: act.title }
          : opens ? { on: () => onOpen(opens[0]), off: s.id === "prepare" ? off && s.open !== "character" : off, title: off ? t("Press Stop in the chat to change this") : t(opens[1]) }
            : null;
      const mat = s.id === "finalMix" && s.status === "done" ? "final" : MATERIAL[s.status] ?? "todo";
      const subs = s.id === "build" ? (s.steps?.length ? s.steps.filter((x) => SUB[x]) : Object.keys(SUB)) : [];
      const pill = (id) => {
        const st = stepOf(id)?.status ?? null;
        const open = id === "build" ? () => onPlayer?.() : id === "qcReview" ? (data?.qc ? () => onOpen("qc-review") : null)
          : id === "sound" ? (actions?.find((a) => a.key === "mix")?.off === false || st === "done" ? () => onOpen("mix") : null) : () => onOpen("qa");
        return <button key={id} type="button" className={"sp-pill" + (st ? " " + st : "")} disabled={!open} onClick={open ?? undefined}
          title={!open ? t("Opens once {step} is done", { step: t("Build") }) : undefined}>
          {st === "running" ? <Loader2 size={11} className="spin" /> : st === "done" ? <Check size={11} /> : null}{t(SUB[id])}
          {id === "qcReview" && data?.qc?.final != null && <b className="num">{` ${data.qc.final}/10`}</b>}
          {id === "checks" && warnings > 0 && <span className="sp-warn num">{" · " + warnWords(t, warnings)}</span>}</button>;
      };
      // the whole station opens what its head opens (T24-5, T26-9: a click on "05 Final Mix" beside its title did nothing); its own
      // buttons inside keep theirs, and the head stays the control for the keyboard
      const card = go && !go.off ? (e) => { if (!e.target.closest("button, a, input, select, summary, label")) go.on(); } : undefined;
      return <div key={s.id} className={`sp-st ${mat} ${s.status}` + (here === s.id ? " here" : "") + (act?.att ? " att" : "") + (card ? " go" : "")} aria-current={here === s.id ? "step" : undefined}
        onClick={card}>
        <button type="button" className="sp-head" disabled={!go || go.off} title={go?.title} onClick={go?.on}>
          <span className="sp-mark" aria-hidden="true">{s.status === "done" ? <Check size={10} /> : s.status === "running" ? <Loader2 size={10} className="spin" /> : null}</span>
          <span className="sp-no num">{String(s.n).padStart(2, "0")}</span><span className="sp-name">{t(s.title)}</span>
          {s.status !== "waiting" && STATUS_WORD[s.status] && <span className="sp-tag">{t(STATUS_WORD[s.status])}</span>}</button>
        {line && (s.id !== "build" && go && !go.off ? <button type="button" className={"sp-text" + (s.status === "waiting" ? " wait" : "")} title={line} onClick={go.on}>{line}</button>
          : <span className={"sp-text" + (s.status === "waiting" ? " wait" : "")} title={line}>{line}</span>)}
        {(subs.length > 0 || (s.id === "prepare" && (s.status === "done" || now)) || k || (stopped && !running) || (s.id === "build" && blocked && !running) || (off && s.n === 3 && s.status !== "todo")) && <span className="sp-acts">
          {subs.map(pill)}
          {s.id === "build" && music && <>
            <button type="button" className="sp-pill" onClick={() => onOpen("lyrics")}>{t("Lyrics")}</button>
            <button type="button" className="sp-pill" onClick={() => onOpen("music-map")}>{t("Music map")}</button></>}
          {s.id === "prepare" && (s.status === "done" || now) && <>
            <button type="button" className="sp-pill" disabled={off} title={off ? t("Press Stop in the chat to change this") : undefined} onClick={() => onOpen("brief")}>{t("Brief")}</button>
            <button type="button" className="sp-pill" onClick={onAssets}>{t("Assets")}</button>
            {/* the voice-over opens while Claude works (Claude may send the user there during the Storyboard) */}
            <button type="button" className="sp-pill" onClick={() => onOpen("voice")}>{t("Voice-over")}</button>
            {hasCast && <button type="button" className="sp-pill" onClick={() => onOpen("character")}>{t("Characters")}</button>}</>}
          {s.id === "build" && blocked && !running && <button type="button" className="btn sm" disabled={rechecking || data?.checks?.running} onClick={recheck}>
            {rechecking || data?.checks?.running ? <Loader2 size={13} className="spin" /> : null}{data?.checks?.running ? t("Checking…") : t("Run checks again")}</button>}
          {stopped && !running && <button type="button" className="btn sm" disabled={resuming} onClick={resume}>{resuming ? <Loader2 size={13} className="spin" /> : null}{t("Continue")}</button>}
          {k && <><button type="button" className="btn sm" disabled={!!keeping} onClick={() => keep(k.id)}>{keeping === k.id ? <Loader2 size={13} className="spin" /> : null}{t("Keep it as it is")}</button>
            {opens && <button type="button" className="btn sm primary" onClick={() => onOpen(opens[0])}>{t("Approve again")}</button>}</>}
          {off && s.n === 3 && s.status !== "todo" && <span className="sp-hint">{t("Press Stop in the chat to change this")}</span>}
        </span>}
      </div>;
    })}
    {data?.question?.kind === "brief-changed" && <p className="sp-ask" role="status">{t("The brief changed after the build.")}
      <button type="button" className="btn sm primary" onClick={() => onOpen("brief", { briefChanged: true })}>{t("Choose what to do")}</button></p>}
  </nav>;
}
