// The Writers Room (owner #1111, #1114, #1115, #1117, #1118; audit/104): where a film's idea is researched and its script written, before
// any project. One page, three tabs, the three steps of the flow (§0): Research (Claude pitches ten ideas in a film style's own way; the
// owner keeps the ones they want), Ideas (the ideas kept, the app's samples and OPUSCAR 98: IdeaLibrary.jsx), Scripts (the scripts written
// from kept ideas, scene by scene: time, narration, picture). An idea is not a script: Write the script turns one into the other, and
// Start a project takes the script into a film, whose idea then reads "In a project".
// Runs (a pitch, a script) are the server's: the page follows them (IdeaParts useIdeaJobs) and shows them in the Research tab's running
// panel whatever idea is in hand; the end of a run is said on every screen (the app's notices), so leaving the page loses nothing (#1115).
// Laid out for Operate (Impeccable): the app's tabs, panels and cards in both themes; The Studio lays the cards and the script on paper.
import { useEffect, useMemo, useState } from "react";
import { Check, ChevronDown, Copy, FileText, Lightbulb, Pencil, Plus, RotateCcw, Sparkles, Undo2 } from "lucide-react";
import { get, post, put } from "../api.js";
import { BackButton, Banner } from "../components.jsx";
import { ago, go, useToast } from "../lib.jsx";
import { useT } from "../i18n.jsx";
import { useThemeId } from "../theme.jsx";
import { useStyles } from "./StyleGallery.jsx";
import { CardBody, IdeaDialog, IdeasTab, StatusTag, clock, copyText, startProject, useIdeas } from "./IdeaLibrary.jsx";
import { RunPanel, Sources, Truth, stopJob, useIdeaJobs, useWriteScript } from "./IdeaParts.jsx";

/** A run's time and Claude's cost of it, as Claude Code counts it: "9 min, about $0.84" (T41-17). */
const runCost = (r, t) => [r.ms ? t("{n} min", { n: Math.max(1, Math.round(r.ms / 60000)) }) : null, r.costUsd != null ? t("about {cost}", { cost: "$" + Number(r.costUsd).toFixed(2) }) : null].filter(Boolean).join(", ");
const TABS = [["research", "Research", Lightbulb], ["ideas", "Ideas", Sparkles], ["scripts", "Scripts", FileText]];
const LANGS = [["vi", "Vietnamese"], ["en", "English"]];
const LANG_NAME = Object.fromEntries(LANGS);

/** The page. tab: "research" | "ideas" | "scripts"; id: an idea to open in that tab (#/ideas/scripts?id=…, the notices' Open). */
export default function WritersRoom({ tab = "research", id = null }) {
  const t = useT();
  const studio = useThemeId() === "studio";
  const lib = useIdeas();
  const [pitchAt, setPitchAt] = useState(0);          // a pitch run ended: the Research tab reads the round again
  const jobs = useIdeaJobs((j) => { lib.reload(); if (j.kind === "idea-pitch") setPitchAt(Date.now()); });
  const write = useWriteScript(jobs);
  const [edit, setEdit] = useState(null);             // the New idea / Edit idea dialog: { value } or null
  const cur = TABS.some(([k]) => k === tab) ? tab : "research";
  const mine = lib.items?.mine ?? [];
  const n = { ideas: lib.items?.all.length ?? null, scripts: mine.filter((x) => x.script).length };
  const openScript = (x) => go(`/ideas/scripts?id=${x.id}`);
  const head = studio
    ? <div className="st-head"><h1>{t("Writers Room")}</h1><span className="st-aside">{t("ideas first, then the script")}</span>
      <div className="st-acts"><button className="btn primary" onClick={() => setEdit({ value: null })}><Plus size={15} />{t("New idea")}</button></div></div>
    : <div className="page-head"><div><BackButton /><h1>{t("Writers Room")}</h1><p className="lead">{t("Research ideas, keep the good ones, write their scripts.")}</p></div>
      <div className="actions"><button className="btn primary" onClick={() => setEdit({ value: null })}><Plus size={15} />{t("New idea")}</button></div></div>;
  const busy = { research: !!jobs.pitch || jobs.scripts.length > 0, scripts: jobs.scripts.length > 0 };
  return <div className={"page gal-page idl-page wr-page" + (studio ? " st-motionlib st-ideas" : "")}>
    {head}
    <div className="tabs wr-tabs" role="tablist" aria-label={t("Writers Room")}>
      {TABS.map(([k, l, Icon]) => <button key={k} type="button" role="tab" aria-selected={cur === k} onClick={() => go(`/ideas/${k}`)}>
        <Icon size={14} />{t(l)}{n[k] != null && <span className="num wr-n">{n[k]}</span>}{busy[k] && <span className="dot busy" aria-label={t("Running")} />}</button>)}
    </div>
    {cur === "research" && <ResearchTab lib={lib} jobs={jobs} write={write} pitchAt={pitchAt} onOpenScript={openScript} />}
    {cur === "ideas" && <IdeasTab lib={lib} edit={(x) => setEdit({ value: x })} scriptRun={jobs.scriptRun} onScript={write} onOpenScript={openScript} pick={id} />}
    {cur === "scripts" && <ScriptsTab lib={lib} jobs={jobs} write={write} pick={id} />}
    {edit && <IdeaDialog value={edit.value} onClose={() => setEdit(null)} onSaved={(x) => { setEdit(null); lib.reload(); go(`/ideas/ideas?id=${x.id}`); }} />}
  </div>;
}

// ---- Research: the ask, the running panel, the round's cards
function ResearchTab({ lib, jobs, write, pitchAt, onOpenScript }) {
  const t = useT();
  const toast = useToast();
  const sq = useStyles();
  const styles = useMemo(() => [...(sq.data?.styles ?? [])].sort((a, b) => a.title.localeCompare(b.title)), [sq.data]);
  const [pitch, setPitch] = useState(undefined);      // undefined: loading; null: none in hand
  const [err, setErr] = useState(null), [saving, setSaving] = useState(false);
  const [form, setForm] = useState(null);
  const [open, setOpen] = useState(null);             // the one card open (More)
  const load = () => get("/api/ideas/pitch").then((r) => setPitch(r.pitch)).catch(setErr);
  useEffect(() => { load(); }, [pitchAt]); // eslint-disable-line react-hooks/exhaustive-deps
  // the ask starts from the round in hand (or Ricks Clip, whose source skill the pitch came from), its style's own length
  useEffect(() => {
    if (form || pitch === undefined || !styles.length) return;
    const sid = pitch?.styleId ?? (styles.some((s) => s.id === "ricks-clip") ? "ricks-clip" : styles[0].id), s = styles.find((x) => x.id === sid);
    setForm({ styleId: sid, topic: pitch?.topic ?? "", lang: pitch?.lang ?? "vi", lengthSec: pitch?.lengthSec ?? (Number(s?.defaultLength) || 30) });
  }, [pitch, styles.length]); // eslint-disable-line react-hooks/exhaustive-deps
  const run = jobs.pitch;
  const last = jobs.lastEnded("idea-pitch");
  const failed = !run && last?.status === "failed" && (!pitch || last.endedAt > pitch.at) ? last : null;
  const start = async (more) => {
    setErr(null);
    try { await post("/api/ideas/pitch", more ? { more: true } : { ...form, lengthSec: Number(form.lengthSec) || null }); jobs.refresh(); }
    catch (e) { setErr(e); }
  };
  const save = async (body) => {
    setSaving(true);
    try {
      const r = await post("/api/ideas/pitch/save", body);
      setPitch(r.pitch); lib.reload();
      toast(r.ideas.length === 1 ? t("“{name}” is in My ideas", { name: r.ideas[0].name }) : t("{n} ideas are in My ideas", { n: r.ideas.length }));
    } catch (e) { toast(e.message, "error"); } finally { setSaving(false); }
  };
  const style = styles.find((s) => s.id === form?.styleId);
  const left = pitch?.ideas.filter((x) => !x.savedAs).length ?? 0;
  const mine = new Map((lib.items?.mine ?? []).map((x) => [x.id, x]));
  const runSub = (p) => [p.styleTitle, LANG_NAME[p.lang] ? t(LANG_NAME[p.lang]) : p.lang, t("about {n} s", { n: p.lengthSec }), p.topic && `“${p.topic}”`].filter(Boolean).join(" · ");
  const askSub = form && style ? [style.title, t(LANG_NAME[form.lang]), t("about {n} s", { n: form.lengthSec }), form.topic.trim() && `“${form.topic.trim()}”`].filter(Boolean).join(" · ") : "";
  return <div className="wr-research">
    <aside className="wr-ask studio-paper" aria-label={t("The ask")}>
      <h2 className="wr-h">{t("The ask")}</h2>
      {!form ? <div className="skeleton" style={{ height: "18rem" }} /> : <div className="idl-form">
        <label className="field"><span className="label">{t("Film style")}</span>
          <select className="select" value={form.styleId} disabled={!!run} onChange={(e) => { const s = styles.find((x) => x.id === e.target.value);
            setForm((o) => ({ ...o, styleId: e.target.value, lengthSec: Number(s?.defaultLength) || o.lengthSec })); }}>
            {styles.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}</select>
          <span className="hint">{t("The film style decides what an idea looks like: its author's own way.")}</span></label>
        <label className="field"><span className="label">{t("Topic or direction")} <small className="opt">{t("optional")}</small></span>
          <textarea className="textarea wr-topic" value={form.topic} maxLength={2000} disabled={!!run} onChange={(e) => setForm((o) => ({ ...o, topic: e.target.value }))}
            placeholder={t("Leave empty and Claude mixes them as the film style does")} /></label>
        <div className="wr-row">
          <label className="field"><span className="label">{t("Language")}</span>
            <select className="select" value={form.lang} disabled={!!run} onChange={(e) => setForm((o) => ({ ...o, lang: e.target.value }))}>
              {LANGS.map(([k, l]) => <option key={k} value={k}>{t(l)}</option>)}</select></label>
          <label className="field"><span className="label">{t("Length (s)")}</span>
            <input className="input num" type="number" min={5} max={3600} value={form.lengthSec} disabled={!!run} onChange={(e) => setForm((o) => ({ ...o, lengthSec: e.target.value }))} /></label>
        </div>
        {left > 0 && !run && <p className="hint wr-warn">{left === 1 ? t("The one idea you did not save goes when the new ten come in.") : t("The {n} ideas you did not save go when the new ten come in.", { n: left })}</p>}
        <button className="btn primary lg wr-go" onClick={() => start(false)} disabled={!!run || !style}>{run ? <><span className="dot busy" aria-hidden="true" />{t("Pitching…")}</> : <><Lightbulb size={15} />{t("Pitch 10 ideas")}</>}</button>
        <p className="hint">{t("Takes 5–10 minutes. You can leave this page; it goes on.")}</p>
      </div>}
    </aside>
    <section className="wr-work" aria-label={t("Ideas")}>
      {err && <Banner kind="error">{err.message}</Banner>}
      {(run || failed) && <RunPanel job={run ?? failed} title={t(run?.more || failed?.more ? "Pitching 10 more ideas" : "Pitching 10 ideas")}
        sub={run?.more && pitch ? runSub(pitch) : askSub} onStop={run ? () => stopJob(run, toast) : null} />}
      {jobs.scripts.map((j) => <RunPanel key={j.id} job={j} title={t("Writing the script")} sub={j.ideaName} onStop={() => stopJob(j, toast)} />)}
      {pitch === undefined && <div className="skeleton" style={{ height: "20rem" }} />}
      {pitch === null && !run && <div className="empty wr-empty"><Lightbulb size={22} aria-hidden="true" />
        <p><b>{t("Ten ideas, in a film style's own way.")}</b></p>
        <p>{t("Choose a film style and pitch. Claude reads the style's rules, checks every true story on the web and pitches ten. Keep the ones you like; write their scripts later.")}</p></div>}
      {pitch && <>
        <div className="wr-bar">
          <span className="wr-sum"><b className="num">{pitch.ideas.length}</b> {t("ideas")} · {runSub(pitch)}{!pitch.web && <span className="wr-warn"> · {t("The web was off: no story was checked")}</span>}
            {pitch.runs?.length > 0 && <small className="wr-runs num">{pitch.runs.map((r, i) => [t("Round {n}", { n: r.round ?? i + 1 }), runCost(r, t)].filter(Boolean).join(": ")).join(" · ")}</small>}</span>
          <span className="spacer" />
          <button className="btn sm" onClick={() => start(true)} disabled={!!run}><RotateCcw size={13} />{t("10 more")}</button>
          <button className="btn sm primary" onClick={() => save({ all: true })} disabled={!!run || saving || !left}><Check size={14} />{left ? t("Save all ({n})", { n: left }) : t("All saved")}</button>
        </div>
        <ol className="wr-cards">{pitch.ideas.map((x, i) => <PitchCard key={x.id} x={x} n={i + 1} open={open === x.id} onToggle={() => setOpen((o) => (o === x.id ? null : x.id))}
          saved={x.savedAs ? mine.get(x.savedAs) ?? null : null} saving={saving} running={x.savedAs ? jobs.scriptRun(x.savedAs) : null}
          onSave={() => save({ ids: [x.id] })} onScript={(idea) => write(idea)} onOpenScript={onOpenScript} />)}</ol>
      </>}
    </section>
  </div>;
}

/** One pitched idea (#1114): read in ten seconds closed (number, title, truth, hook, the first item in two lines), the rest under More in
 *  sections with their own headings (Lucian #044's unfolding: the rows grow, the text arrives after them), the sources as numbered chips. */
function PitchCard({ x, n, open, onToggle, saved, saving, running, onSave, onScript, onOpenScript }) {
  const t = useT();
  const teaser = x.fields[0];
  return <li className={"wr-card studio-paper" + (x.savedAs ? " kept" : "") + (open ? " open" : "")}>
    <header><span className="wr-n num">{n}</span><h3>{x.title}</h3><Truth truth={x.truth} /></header>
    <p className="wr-hook">{x.hook}</p>
    {teaser && !open && <p className="wr-teaser"><b>{teaser.label}</b> {teaser.text}</p>}
    <div className="wr-more" aria-hidden={!open}><div className="wr-more-in">
      {open && <CardBody card={{ hook: "", fields: x.fields }} />}
    </div></div>
    {x.sources.length > 0 && <Sources sources={x.sources} />}
    <footer>
      <button type="button" className="btn ghost sm wr-more-btn" aria-expanded={open} onClick={onToggle}>{t(open ? "Less" : "More")}<ChevronDown size={13} className="chev" /></button>
      <span className="spacer" />
      {!x.savedAs ? <button type="button" className="btn sm" onClick={onSave} disabled={saving}><Plus size={13} />{t("Save")}</button>
        : <><span className="wr-kept"><Check size={13} />{t("Saved")}</span>
          {running ? <span className="wr-kept run"><span className="dot busy" aria-hidden="true" />{t("Writing…")}</span>
            : saved?.script ? <button type="button" className="btn sm" onClick={() => onOpenScript(saved)}><FileText size={13} />{t("Open the script")}</button>
              : saved && <button type="button" className="btn sm" onClick={() => onScript(saved)}><FileText size={13} />{t("Write the script")}</button>}</>}
    </footer>
  </li>;
}

/** A scene's narration a line at a time, each speaker's name in bold before their words (T40-7: who speaks stays in the narration). */
const SPEAKER = /^\s*(?:\[\s*([^\]:\n]{1,30}):\s*|(\p{Lu}[\p{L}\p{N}.'’-]*(?: [\p{L}\p{N}.'’-]+){0,2}):\s+(?=["“])|(\p{Lu}[\p{Lu}\p{N} .'’-]{0,24}):\s+)/u;
function Lines({ text }) {
  return String(text).split("\n").map((l, i) => { const m = SPEAKER.exec(l);
    return <span key={i} className="wr-line">{m ? <><b className="wr-who">{m[1] ?? m[2] ?? m[3]}</b> {l.slice(m[0].length).replace(/\]\s*$/, "")}</> : l}</span>; });
}

// ---- Scripts: the scripts written, one in hand, scene by scene
const SCRIPT_KEY = "mw-wr-script";
function ScriptsTab({ lib, jobs, write, pick }) {
  const t = useT();
  const items = lib.items;
  const writing = jobs.scripts;
  const list = useMemo(() => (items?.mine ?? []).filter((x) => x.script || writing.some((j) => j.ideaId === x.id))
    .sort((a, b) => ((b.script?.at ?? "9") > (a.script?.at ?? "9") ? 1 : -1)), [items, writing]);
  const [cur, setCur] = useState(() => pick ?? (() => { try { return sessionStorage.getItem(SCRIPT_KEY); } catch { return null; } })());
  useEffect(() => { if (pick) setCur(pick); }, [pick]);
  useEffect(() => { try { if (cur) sessionStorage.setItem(SCRIPT_KEY, cur); } catch { /* private */ } }, [cur]);
  if (lib.error) return <Banner kind="error">{lib.error.message}</Banner>;
  if (!items) return <div className="skeleton" style={{ height: "24rem" }} />;
  const sel = list.find((x) => x.id === cur) ?? list[0] ?? null;
  if (!list.length) return <div className="empty wr-empty"><FileText size={22} aria-hidden="true" /><p><b>{t("No scripts yet.")}</b></p>
    <p>{t("Keep an idea in Research or Ideas, then Write the script: Claude writes it scene by scene, in the idea's film style.")}</p>
    <button className="btn" onClick={() => go("/ideas/research")}><Lightbulb size={14} />{t("Go to Research")}</button></div>;
  return <div className="wr-scripts">
    <nav className="wr-slist" aria-label={t("Scripts")}>{list.map((x) => { const run = jobs.scriptRun(x.id);
      return <button key={x.id} type="button" className={"wr-sitem" + (sel?.id === x.id ? " on" : "")} aria-current={sel?.id === x.id || undefined} onClick={() => setCur(x.id)}>
        <b>{x.name}</b><small>{[x.style?.title, x.script && t("about {n} s", { n: x.script.seconds }), run ? t("Writing…") : x.script && ago(x.script.at)].filter(Boolean).join(" · ")}</small>
        <StatusTag status={x.status} /></button>; })}</nav>
    {sel && <ScriptView key={sel.id} x={sel} run={jobs.scriptRun(sel.id)} onWrite={() => write(sel)} reload={lib.reload} />}
  </div>;
}

/** One script, the width of the page: its head (style, words, length, the idea it came from, its films), a row a scene (number and time;
 *  the narration; the picture; its sources), and at the foot Copy, Edit, Undo, Write again and Start a project with this script. */
function ScriptView({ x, run, onWrite, reload }) {
  const t = useT();
  const toast = useToast();
  const sc = x.script?.scenes ?? [];
  const [draft, setDraft] = useState(null);          // the scenes being edited: [{ narration, picture }]
  const [busy, setBusy] = useState(false);
  const sources = x.card?.sources ?? [];
  const saveEdit = async () => {
    setBusy(true);
    try { await put(`/api/ideas/${x.id}/script`, { scenes: draft }); setDraft(null); reload(); toast(t("Script saved")); }
    catch (e) { toast(e.message, "error"); } finally { setBusy(false); }
  };
  const undo = async () => { try { await post(`/api/ideas/${x.id}/script/undo`); reload(); toast(t("The script before is back")); } catch (e) { toast(e.message, "error"); } };
  if (!x.script) return <section className="wr-sheet studio-paper"><div className="wr-sheet-head"><h2>{x.name}</h2></div>
    <p className="hint">{run ? t("Claude is writing this script. It shows here when it is done; you can leave the page.") : t("No script yet.")}</p></section>;
  return <section className="wr-sheet studio-paper" aria-label={x.name}>
    <div className="wr-sheet-head">
      <h2>{x.name}</h2>
      <p className="wr-meta">{[x.style?.title ?? x.script.style, t("{n} scenes", { n: sc.length }), t("{n} words", { n: x.script.words }), t("about {n} s", { n: x.script.seconds }),
        x.script.by === "owner" ? t("edited {when}", { when: ago(x.script.at) }) : t("written {when}", { when: ago(x.script.at) }), x.script.run && x.script.by !== "owner" ? runCost(x.script.run, t) : null].filter(Boolean).join(" · ")}
        {x.card && <Truth truth={x.card.truth} />}</p>
      <p className="wr-links"><a href={`#/ideas/ideas?id=${x.id}`}>{t("The idea")}</a>
        {x.projects?.map((p) => <a key={p.id} href={`#/projects/${p.id}`}>{t("Film: {title}", { title: p.title })}</a>)}</p>
      {run && <p className="wr-warn"><span className="dot busy" aria-hidden="true" /> {t("Claude is writing it again; this one stays until the new one is done.")}</p>}
    </div>
    <div className="wr-scenes" role="table" aria-label={t("Scenes")}>
      <div className="wr-scene wr-scene-h" role="row"><span role="columnheader">{t("Scene")}</span><span role="columnheader">{t("Narration")}</span><span role="columnheader">{t("Picture")}</span></div>
      {sc.map((s, i) => <div key={i} className="wr-scene" role="row">
        <span className="wr-st" role="cell"><b className="num">{i + 1}</b><small className="num">{clock(s.start)}–{clock(s.end)}</small></span>
        <span className="wr-say" role="cell">{draft ? <textarea className="textarea" value={draft[i].narration} onChange={(e) => setDraft((d) => d.map((y, k) => (k === i ? { ...y, narration: e.target.value } : y)))} aria-label={t("Narration of scene {n}", { n: i + 1 })} />
          : s.narration ? <Lines text={s.narration} /> : <i className="wr-silent">{t("No words: the picture holds")}</i>}
          {!draft && s.sources?.length > 0 && <span className="wr-cite">{s.sources.map((k) => <a key={k} className="num" href={sources[k - 1]?.url} target="_blank" rel="noopener noreferrer" title={sources[k - 1]?.title}>{k}</a>)}</span>}</span>
        <span className="wr-pic" role="cell">{draft ? <textarea className="textarea" value={draft[i].picture} onChange={(e) => setDraft((d) => d.map((y, k) => (k === i ? { ...y, picture: e.target.value } : y)))} aria-label={t("Picture of scene {n}", { n: i + 1 })} />
          : s.picture || <i className="wr-silent">{t("No picture note")}</i>}</span>
      </div>)}
    </div>
    {sources.length > 0 && <div className="wr-sheet-src"><span className="sgb-fl">{t("Sources")}</span><Sources sources={sources} max={8} /></div>}
    <div className="wr-sheet-foot">
      {draft ? <><button className="btn" onClick={() => setDraft(null)} disabled={busy}>{t("Cancel")}</button><span className="spacer" />
        <button className="btn primary" onClick={saveEdit} disabled={busy}><Check size={14} />{t("Save the script")}</button></>
        : <><button className="btn" onClick={() => copyText(x.script.text, toast, t)}><Copy size={14} />{t("Copy")}</button>
          <button className="btn" onClick={() => setDraft(sc.map((s) => ({ narration: s.narration, picture: s.picture })))} disabled={!!run}><Pencil size={14} />{t("Edit")}</button>
          {x.script.versions?.length > 0 && <button className="btn ghost" onClick={undo} disabled={!!run}><Undo2 size={14} />{t("Undo")}</button>}
          <button className="btn ghost" onClick={onWrite} disabled={!!run}><RotateCcw size={14} />{t("Write again")}</button>
          <span className="spacer" />
          <button className="btn primary" onClick={() => startProject(x)}><Sparkles size={14} />{t("Start a project with this script")}</button></>}
    </div>
  </section>;
}
