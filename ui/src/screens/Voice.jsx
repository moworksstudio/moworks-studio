// Words dialog: the words of the voice the film is timed to. Any audio file of the project can be
// transcribed (Whisper); the user checks the words, edits them and presses Send again: Claude reads the new words and moves the timings.
// The transcript is saved as HyperFrames' transcript.json (word timings). Editing text keeps the timing; there is no recording, local voice
// or voice-gap editing. Where the voice comes from (an upload, ElevenLabs, Fish Audio) is folded under "Other ways".
import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, AudioLines, Bot, Check, ChevronDown, FileAudio, Info, Loader2, Mic2, Pause, Play, RefreshCw, Save, Search, Settings2, Sparkles, Square, Upload, X } from "lucide-react";
import { api, blobUrl, get, patch, post, upload, watchJob } from "../api.js";
import { Banner, Dialog, StatusIcon } from "../components.jsx";
import { ago, clock, go, locale, useData, useToast, words } from "../lib.jsx";
import { tr, useT } from "../i18n.jsx";
import { useCloseGuard, useStage } from "../workflow/stage.jsx";

// labels are English keys for t
const SOURCES = [["upload", "Upload audio", Upload, "Your own recording"], ["elevenlabs", "ElevenLabs", Sparkles, "Reads your script"],
  ["fishaudio", "Fish Audio", Sparkles, "Reads your script"], ["none", "No voice-over", X, "Go on without a voice"]];          // The Storyboard starts at once
const tc = (s) => { const m = Math.floor(s / 60), r = s - m * 60; return `${m}:${r.toFixed(1).padStart(4, "0")}`; };
const ACCEPT = ".mp3,.wav,.m4a,.aac,.flac,.ogg,.opus";
// no file names in the UI: a voice-over the app made shows its service and when it was made, in the computer's time;
// a recording the user added keeps their own name without its extension
const MADE = /^(elevenlabs|fishaudio)-(\d{4}-\d\d-\d\d)T(\d\d)-(\d\d)-(\d\d)-(\d{3})Z\.[a-z0-9]+$/i;
const SERVICE = { elevenlabs: "ElevenLabs", fishaudio: "Fish Audio" };
// The film's own voice-over also says whose voice it is ("ElevenLabs voice-over · Viên · 27 Oct, 23:49")
export function audioLabel(name, voiceName = null) {
  const m = MADE.exec(name ?? "");
  if (!m) return String(name ?? "").replace(/\.[a-z0-9]{2,4}$/i, "");
  const at = new Date(`${m[2]}T${m[3]}:${m[4]}:${m[5]}.${m[6]}Z`);
  const vars = { who: SERVICE[m[1].toLowerCase()], when: at.toLocaleString(locale(), { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) };
  const voice = String(voiceName ?? "").split(/\s+[-–]\s+/)[0].trim();
  return voice ? tr("{who} voice-over · {voice} · {when}", { ...vars, voice }) : tr("{who} voice-over · {when}", vars);
}

/** The source the screen shows as chosen. A new project has none until the user picks one, and "No voice-over" is
 *  only the user's own choice (`noVoice`), never a default; with none chosen the service whose key is saved is offered (ElevenLabs
 *  first, shown, not saved), else nothing. Older projects saved "fish". */
export function shownSource(voice, keys) {
  const s = voice?.source === "fish" ? "fishaudio" : voice?.source ?? null;
  if (s && (s !== "none" || voice?.noVoice)) return s;
  return ["elevenlabs", "fishaudio"].find((k) => keys?.[k]?.saved) ?? null;
}

function Waveform({ peaks, duration, time, onSeek }) {
  const t = useT();
  const ref = useRef(null);
  const n = peaks.length || 1;
  const click = (e) => { const r = ref.current.getBoundingClientRect(); onSeek(Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * duration); };
  const pos = duration ? time / duration : 0;
  return <svg ref={ref} className="waveform" viewBox={`0 0 ${n} 100`} preserveAspectRatio="none" onClick={click} role="slider" aria-label={t("Position in the voice-over")}
    aria-valuemin={0} aria-valuemax={Math.round(duration)} aria-valuenow={Math.round(time)} tabIndex={0}
    onKeyDown={(e) => { if (e.key === "ArrowRight") onSeek(Math.min(duration, time + 2)); if (e.key === "ArrowLeft") onSeek(Math.max(0, time - 2)); }}>
    {peaks.map((p, i) => { const h = Math.max(2, p * 92); return <rect key={i} x={i + 0.15} width={0.7} y={50 - h / 2} height={h} className={i / n <= pos ? "played" : ""} />; })}
    <line x1={pos * n} x2={pos * n} y1="0" y2="100" className="head" />
  </svg>;
}

/** Every audio file of the project and where its words stand; any of them can be transcribed (it then becomes the voice the film is timed to). */
// `stamp` (the voice-over's words: their state, when they were made and saved, the running job) reads the files again when
// the transcription ends: the list stayed on "Not transcribed" until the screen was opened again
function AudioFiles({ id, voiceFile, voiceName = null, onJob, running, focus = null, stamp = "" }) {
  const t = useT();
  const toast = useToast();
  const q = useData(() => get(`/api/projects/${id}/assets`).catch(() => null), [id, voiceFile, stamp]);
  const [busy, setBusy] = useState(null);
  // music and sound effects are not a voice-over: only the voice files are listed (one opened from the Files tab stays)
  const items = (q.data?.items ?? []).filter((x) => x.kind === "audio" && (!/(^|\/)(sfx|music)\//i.test(x.path) || x.path === focus));
  const asked = useRef(false);
  useEffect(() => {          // opened for one file from the Assets tab ("Transcribe"): start it once if it has no words yet
    const x = focus && items.find((i) => i.path === focus);
    if (x && (x.transcript ?? "none") === "none" && !asked.current && !running) { asked.current = true; go_(x); }
  }, [q.data]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!items.length) return null;
  const go_ = async (x) => {
    setBusy(x.path);
    try {
      const r = await post(`/api/projects/${id}/assets/transcribe`, { path: x.path });
      if (r.job) { onJob(r.job); toast(t("Transcribing {name}…", { name: audioLabel(x.name) })); } else if (r.needsModel) toast(r.needsModel, "error");
      q.reload();
    }
    catch (e) { toast(e.message, "error"); } finally { setBusy(null); }
  };
  return <section className="panel" aria-label={t("Transcript")}>
    <div className="panel-head"><FileAudio size={16} /><h2>{t("Transcript")}</h2><span className="muted end num">{items.length}</span></div>
    <ul className="plain vo-files">{items.map((x) => {
      const now = !!voiceFile && x.path.endsWith(voiceFile.split(/[\/]/).pop());
      const st = x.transcript ?? "none";
      return <li key={x.path} className={(now ? "current" : "") + (focus === x.path ? " focus" : "")}>
        <span className="vo-name"><b>{audioLabel(x.name, now ? voiceName : null)}</b><span className="muted">{(x.folder ?? "").split("/").pop()}</span></span>
        {x.duration != null && <span className="muted num">{clock(x.duration)}</span>}
        {now && <span className="chip teal">{t("The film follows this voice")}</span>}
        <span className={"chip" + (st === "saved" ? " teal" : st === "review" ? " amber" : "")}>{st === "saved" ? t("Words checked") : st === "review" ? t("Needs your check") : t("Not transcribed")}</span>
        {(st === "none" || !now) && <button className="btn sm" onClick={() => go_(x)} disabled={!!busy || !!running}>{busy === x.path ? <Loader2 size={14} className="spin" /> : <Mic2 size={14} />}{st === "none" ? t("Transcribe") : t("Use this voice")}</button>}
      </li>;
    })}</ul>
  </section>;
}

export default function Voice({ id, path = null, setCrumbs = () => {} }) {
  const t = useT();
  const stage = useStage(id);
  const toast = useToast();
  const project = useData(() => get(`/api/projects/${id}`), [id]);
  const v = useData(() => get(`/api/projects/${id}/voice`), [id]);
  const [segs, setSegs] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [job, setJob] = useState(null);
  const [up, setUp] = useState(null);               // upload progress 0..1
  const [audio, setAudio] = useState(null);         // blob URL
  const [peaks, setPeaks] = useState([]);
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [q, setQ] = useState("");
  const [model, setModel] = useState(null);
  const [lang, setLang] = useState(null);
  const [hints, setHints] = useState(null);       // words to expect (brand, script): helps Whisper spell them
  const [saving, setSaving] = useState(false);
  const player = useRef(null);
  const fileInput = useRef(null);
  const [drag, setDrag] = useState(false);
  useEffect(() => { setCrumbs(project.data ? [t("Projects"), project.data.title, t("Voice-over")] : null); }, [project.data, t]); // eslint-disable-line react-hooks/exhaustive-deps

  const d = v.data, voice = d?.voice, tr = d?.transcript;
  useCloseGuard(dirty);                           // closing the dialog with unsaved words asks first
  const source = shownSource(voice ?? project.data?.meta?.voice, d?.keys);
  useEffect(() => { if (tr) { setSegs(tr.segments.map((s) => ({ ...s }))); setDirty(false); } else setSegs(null); }, [tr?.createdAt, tr?.savedAt]); // eslint-disable-line react-hooks/exhaustive-deps
  // a first transcription detects the language instead of assuming Vietnamese
  useEffect(() => { if (d && !model) { setModel(d.settings.defaultModel); setLang(["vi", "en"].includes(d.transcript?.language) ? d.transcript.language : d.transcript ? d.settings.language : "auto"); } if (d && hints == null) setHints(d.hints ?? ""); }, [d]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { const r = d?.jobs?.find((j) => j.status === "running"); if (r && r.id !== job?.id) follow(r); }, [d]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {                                   // the audio: blob URL for the player, peaks for the waveform
    let url = null, alive = true;
    if (voice?.file) {
      blobUrl(`/api/projects/${id}/voice/audio`).then((u) => { if (alive) { url = u; setAudio(u); } else URL.revokeObjectURL(u); }).catch(() => setAudio(null));
      get(`/api/projects/${id}/voice/peaks`).then((r) => alive && setPeaks(r.peaks)).catch(() => {});
    } else { setAudio(null); setPeaks([]); }
    return () => { alive = false; if (url) URL.revokeObjectURL(url); };
  }, [voice?.file]); // eslint-disable-line react-hooks/exhaustive-deps

  function follow(j) {
    setJob(j);
    watchJob(j.id, (x) => {
      if (!x) return;
      setJob(x);
      if (x.status !== "running") { v.reload(); project.reload(); if (x.status === "failed") toast(x.error?.message ?? t("Failed"), "error"); }
    }, 1200);
  }
  const step = !voice?.file ? 0 : tr?.status === "saved" ? 3 : tr?.status === "review" ? 2 : 1;
  const tstat = voice?.transcript?.status;
  const running = job?.status === "running" ? job : null;

  const setSource = async (s) => { try { await patch(`/api/projects/${id}/voice`, { source: s }); v.reload(); project.reload(); } catch (e) { toast(e.message, "error"); } };
  const send = async (file) => {
    if (!file) return;
    setUp(0);
    try { const r = await upload(`/api/projects/${id}/voice/upload`, file, setUp); toast(t("Added {name}", { name: r.voice.name })); if (r.job) follow(r.job); if (r.needsModel) toast(r.needsModel, "error"); v.reload(); project.reload(); }
    catch (e) { toast(e.message, "error"); } finally { setUp(null); }
  };
  const transcribe = async () => { try { follow(await post(`/api/projects/${id}/voice/transcribe`, { model, language: lang, hints: hints ?? "" })); v.reload(); } catch (e) { toast(e.message, "error"); } };
  const stop = async () => { try { await post(`/api/jobs/${running.id}/cancel`); } catch (e) { toast(e.message, "error"); } };
  const save = async () => {
    setSaving(true);
    try { const r = await api("PUT", `/api/projects/${id}/voice/transcript`, { segments: segs }); toast(t("Words sent again ({n} words)", { n: r.words })); v.reload(); project.reload(); }
    catch (e) { toast(e.message, "error"); } finally { setSaving(false); }
  };
  const seek = (t, play = false) => { const a = player.current; if (!a) return; a.currentTime = t; setTime(t); if (play) a.play(); };
  const toggle = () => { const a = player.current; if (!a) return; if (a.paused) a.play(); else a.pause(); };
  const cur = segs?.findIndex((s) => time >= s.start && time < s.end) ?? -1;
  const shown = useMemo(() => (segs ?? []).map((s, i) => [s, i]).filter(([s]) => !q || s.text.toLowerCase().includes(q.toLowerCase())), [segs, q]);
  const models = d?.models ?? [];
  const chosen = models.find((m) => m.id === model);

  if (v.error) return <div className="page"><Banner kind="error" action={<button className="btn sm" onClick={v.reload}>{t("Retry")}</button>}>{v.error.message}</Banner></div>;
  // the sheet as wide as New project with room above and below; the four sources
  // compact (what each is, on hover); the explanation behind ⓘ, so the script gets the room
  return <div className="page vo-page">
    <section className="panel vo-src" aria-label={t("Voice-over")}>
      <div className="panel-head"><h2>{t("Voice-over")}</h2>
        <Info size={14} className="vo-info" aria-label={t("Choose where the voice-over comes from, then check its words: Claude times the film to them.")}
          title={t("Choose where the voice-over comes from, then check its words: Claude times the film to them.")} /></div>
      {/* Until the film's voice is read, the cards wait as skeletons (none looked chosen while the sheet loaded) */}
      {!d && !project.data ? <div className="radio-cards four" aria-busy="true">{SOURCES.map(([k]) => <span key={k} className="radio-card skeleton" aria-hidden="true" />)}</div>
      : <div className="radio-cards four">{SOURCES.map(([k, l, Icon, desc]) => (
        <button key={k} className="radio-card" aria-pressed={source === k} aria-label={`${t(l)}: ${t(desc)}`} onClick={() => setSource(k)}>
          {/* the cards as designed, their one-line description in small print */}
          {/* the key's chip in the card's top-right corner, on the name's line */}
          <span className="t"><Icon size={15} />{t(l)}{(k === "elevenlabs" || k === "fishaudio") && d && <span className={"chip" + (d.keys[k].saved ? " teal" : "")}>{d.keys[k].saved ? t("Key saved") : t("No key yet")}</span>}</span>
          <span className="d">{t(desc)}</span>
        </button>))}</div>}
    </section>

    {source === "upload" && <section className="panel" aria-label={t("Audio file")}>
      <div className="panel-head"><FileAudio size={16} /><h2>{t("Audio file")}</h2>{voice?.file && <button className="btn sm end" onClick={() => fileInput.current.click()}><Upload size={14} />{t("Replace")}</button>}</div>
      <input ref={fileInput} type="file" accept={ACCEPT} hidden onChange={(e) => { send(e.target.files[0]); e.target.value = ""; }} />
      {!voice?.file || voice.source !== "upload" ? <div className={"dropzone" + (drag ? " drag" : "")} onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); send(e.dataTransfer.files[0]); }} onClick={() => fileInput.current.click()} role="button" tabIndex={0}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") fileInput.current.click(); }}>
        {up != null ? <><Loader2 size={22} className="spin" /><b>{t("Uploading… {n}%", { n: Math.round(up * 100) })}</b><div className="bar"><span style={{ width: `${up * 100}%` }} /></div></>
          : <><Upload size={22} /><b>{t("Drop the voice-over here, or click to choose")}</b><span className="hint">{t("MP3, WAV, M4A, AAC, FLAC, OGG · up to 1 GB. Transcription starts right after.")}</span></>}
      </div> : null}
    </section>}

    {(source === "elevenlabs" || source === "fishaudio") && d && <TtsPanel id={id} provider={source} keySaved={d.keys[source].saved} brief={project.data?.meta?.brief} draft={d.scriptDraft?.text ?? ""} language={d.settings.language} onJob={follow} running={running}
      current={voice ?? project.data?.meta?.voice} />}
    <AudioFiles id={id} voiceFile={voice?.file} voiceName={voice?.voiceName} onJob={follow} running={running} focus={path}
      stamp={`${voice?.transcript?.status ?? ""}|${voice?.transcript?.at ?? ""}|${voice?.transcript?.savedAt ?? ""}|${running?.id ?? ""}`} />

    {voice?.file && source !== "none" && <section className="panel" aria-label={t("Voice-over audio")}>
      <div className="panel-head"><AudioLines size={16} /><h2>{audioLabel(voice.name, voice.voiceName)}</h2>
        <span className="muted end num" style={{ fontSize: "var(--fs-meta)" }}>{clock(voice.info?.duration ?? 0)} · {voice.info?.sampleRate / 1000} kHz · {voice.info?.channels === 1 ? t("mono") : t("stereo")} · {(voice.size / 1e6).toFixed(1)} MB</span></div>
      <div className="player-row">
        <button className="btn icon" onClick={toggle} disabled={!audio} aria-label={playing ? t("Pause") : t("Play")}>{playing ? <Pause size={16} /> : <Play size={16} />}</button>
        <span className="num timecode">{tc(time)} / {tc(voice.info?.duration ?? 0)}</span>
        {peaks.length ? <Waveform peaks={peaks} duration={voice.info?.duration ?? 0} time={time} onSeek={(t) => seek(t)} /> : <div className="waveform skeleton" />}
      </div>
      {audio && <audio ref={player} src={audio} preload="auto" onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)} />}
      {voice.source !== "upload" && voice.script && <details className="diag"><summary>{t("Script read by {who}", { who: voice.source === "elevenlabs" ? "ElevenLabs" : "Fish Audio" })}{voice.voiceName?.trim() ? ` (${voice.voiceName.trim()})` : ""}</summary><p className="secondary" style={{ whiteSpace: "pre-wrap" }}>{voice.script}</p></details>}
    </section>}

    {voice?.file && source !== "none" && <section className="panel" aria-label={t("Transcription")}>
      <div className="panel-head"><Mic2 size={16} /><h2>{t("Transcription")}</h2>
        {tr && !running && <span className="muted end" style={{ fontSize: "var(--fs-meta)" }}>{models.find((m) => m.id === tr.model)?.short ?? "Whisper"} · {tr.language ?? "?"}{tr.device ? ` · ${tr.device.toUpperCase()}` : ""} · {ago(tr.savedAt ?? tr.createdAt)}</span>}</div>
      {running?.kind === "transcribe" ? <div className="progress-line big">
        <StatusIcon status="running" /><div style={{ flex: 1, minWidth: 0 }}>
          <div><b>{t("Transcribing")}</b> <span className="muted">· {models.find((m) => m.id === running.model)?.short ?? running.model}{running.detected?.language ? " · " + t("language {code}", { code: running.detected.language }) : ""}{running.detected?.device ? ` · ${running.detected.device.toUpperCase()}` : ""}</span></div>
          <div className="bar"><span style={{ width: `${running.progress ?? 3}%` }} /></div>
          <span className="hint">{running.stage}{running.segments ? " · " + t("{n} segments so far", { n: running.segments }) : ""}</span></div>
        <button className="btn sm" onClick={stop}><Square size={13} />{t("Stop")}</button></div>
        : <div className="asr-controls">
          <label className="field-inline">{t("Model")}<select className="select" value={model ?? ""} onChange={(e) => setModel(e.target.value)} aria-label={t("Speech-to-text model")}>
            {models.map((m) => <option key={m.id} value={m.id} disabled={!m.ready}>{m.short}{m.ready ? "" : m.installed ? " " + t("(engine missing)") : " " + t("(not installed)")}</option>)}</select></label>
          <label className="field-inline">{t("Spoken in")}<select className="select" value={lang ?? "vi"} onChange={(e) => setLang(e.target.value)} aria-label={t("Spoken in")}>
            {[["vi", "Vietnamese"], ["en", "English"], ["auto", "Detect"]].map(([k, l]) => <option key={k} value={k}>{t(l)}</option>)}</select></label>
          <label className="field-inline hints">{t("Words to expect")}<input className="input" value={hints ?? ""} onChange={(e) => setHints(e.target.value)} maxLength={600}
            placeholder={t("Brand, product, names")} aria-label={t("Words to expect")} title={t("Whisper spells names better when it knows them.")} /></label>
          <button className="btn sm" onClick={transcribe} disabled={!chosen?.ready}><RefreshCw size={14} />{tr ? t("Transcribe again") : t("Transcribe")}</button>
          {!models.some((m) => m.ready) && <button className="btn ghost sm" onClick={() => go("/settings/runtime")}><Settings2 size={14} />{t("Install a model")}</button>}
        </div>}
      {(tstat === "failed" || tstat === "cancelled") && !running && <Banner kind={tstat === "failed" ? "error" : "warning"}>{tstat === "failed" ? t("The last transcription failed.") + (job?.error ? ` ${job.error.message}` : "") + " " + t("Try again, or pick another model.") : t("The last transcription was stopped.")}</Banner>}
      {tstat === "pending" && !running && !tr && <Banner kind="warning">{t("Not transcribed yet.")} {models.some((m) => m.ready) ? t("Press Transcribe.") : t("Install a speech-to-text model first (Settings › System).")}</Banner>}

      {segs && <>
        <div className="transcript-tools">
          <div className="search"><Search size={14} /><input className="input" placeholder={t("Search the transcript")} value={q} onChange={(e) => setQ(e.target.value)} aria-label={t("Search the transcript")} /></div>
          <span className="muted num" style={{ fontSize: "var(--fs-meta)" }}>{t("{n} segments · {w} words", { n: segs.length, w: words(segs.map((s) => s.text).join(" ")) })}</span>
          <span style={{ flex: 1 }} />
          {tr.status === "saved" && !dirty ? <span className="chip teal"><Check size={11} />{t("Saved {ago}", { ago: ago(tr.savedAt) })}</span> : <span className="chip amber">{dirty ? t("Unsaved edits") : t("Needs your check")}</span>}
          <button className="btn primary sm" onClick={save} disabled={saving || (tr.status === "saved" && !dirty)}>{saving ? <Loader2 size={14} className="spin" /> : <Save size={14} />}{t("Send again")}</button>
        </div>
        <ol className="transcript plain">{shown.map(([s, i]) => (
          <li key={s.id} className={"seg" + (i === cur ? " current" : "")}>
            <button className="seg-time num" onClick={() => seek(s.start, true)} title={t("Play from here")}>{tc(s.start)}<span className="muted">–{tc(s.end)}</span></button>
            <textarea className="textarea seg-text" rows={Math.max(1, Math.ceil(s.text.length / 90))} value={s.text} aria-label={t("Segment {n} text", { n: i + 1 })}
              onChange={(e) => { const t = e.target.value; setSegs((x) => x.map((y, j) => (j === i ? { ...y, text: t } : y))); setDirty(true); }} />
            {s.words?.some((w) => w.p != null && w.p < 0.5) && <span className="seg-flag" title={t("Some words here were uncertain")}><AlertTriangle size={13} /></span>}
          </li>))}</ol>
        <p className="hint">{t("Edits keep each line's timing. Send again saves the words as a change you can undo; Claude reads them and adjusts the timing.")}</p>
      </>}
    </section>}

    {source === "none" && <section className="panel"><p className="secondary">{t("No voice-over: Claude goes on without one and draws the Storyboard from the brief and the music. You can add one later.")}</p></section>}
    <p className="hint"><Bot size={12} /> {t("Claude reads the saved transcript when it plans shots, timing and text.")}</p>
  </div>;
}

// A Vietnamese project opened on "Roger · en, american" with its Vietnamese voices (★) at the end of 30+. The project's
// language is its brief's (Vietnamese letters), else the app's; the voices that speak it come first, then the user's own (★), then the rest
const VI_LETTERS = /[ăâđêôơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]/i;
const SPEAKS = { vi: /(^|[^a-z])(vi|vie|vietnamese|tiếng việt)([^a-z]|$)/i, en: /(^|[^a-z])(en|english)([^a-z]|$)/i };
const plainWords = (x) => String(x ?? "").normalize("NFC").replace(/[“”"«»]/g, "").replace(/\s+/g, " ").trim();
/** True when every line of Claude's voice-over draft is in the brief word for word: the narration is the user's. */
export function draftInBrief(draft, briefText) {
  const lines = String(draft ?? "").split(/\n+/).map(plainWords).filter(Boolean), all = plainWords(briefText);
  return lines.length > 0 && !!all && lines.every((l) => all.includes(l));
}
export const projectLanguage = (brief, fallback = "vi") => (brief?.text ? (VI_LETTERS.test(brief.text) ? "vi" : "en") : fallback);
/** The voices in the order the list shows them: the project's language first, then the user's own, then the rest, each as the service gave them. */
// A voice the account's plan does not allow (usable: false, an instantly cloned one) goes last, never first
export function voiceOrder(voices, lang) {
  const speaks = SPEAKS[lang], rank = (v) => (v.usable === false ? 3 : speaks?.test(`${v.labels ?? ""} ${v.name ?? ""}`) ? 0 : v.own ? 1 : 2);
  return (voices ?? []).map((v, i) => [v, i]).sort((a, b) => rank(a[0]) - rank(b[0]) || a[1] - b[1]).map(([v]) => v);
}

// The service's labels in plain words ("male, southern, vi, narrative_story" → "male, southern, Vietnamese, narrative story")
const LANG_NAME = (() => { try { return new Intl.DisplayNames(["en"], { type: "language" }); } catch { return null; } })();
const LABEL_WORDS = { middle_aged: "middle-aged", informative_educational: "informative, educational", entertainment_tv: "entertainment, TV",
  characters_animation: "characters, animation", social_media: "social media", narrative_story: "narrative story" };
export const plainLabels = (s) => String(s ?? "").split(/\s*,\s*/).filter(Boolean)
  .map((x) => LABEL_WORDS[x.toLowerCase()] ?? (/^[a-z]{2}(?:-[a-z]{2})?$/i.test(x) ? (() => { try { return LANG_NAME?.of(x) ?? x; } catch { return x; } })() : x.replace(/_/g, " "))).join(", ");

/** The voice list as the app's own dropdown (the system list opened upward over half the screen), each voice with its labels. */
function VoicePick({ voices, value, onChange }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const box = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const out = (e) => { if (!box.current?.contains(e.target)) setOpen(false); };
    const esc = (e) => { if (e.key === "Escape") { e.stopPropagation(); setOpen(false); } };
    addEventListener("pointerdown", out); addEventListener("keydown", esc, true);
    return () => { removeEventListener("pointerdown", out); removeEventListener("keydown", esc, true); };
  }, [open]);
  useEffect(() => { if (open) box.current?.querySelector("[aria-selected=true] button")?.scrollIntoView({ block: "nearest" }); }, [open]);
  const cur = voices.find((x) => x.id === value);
  const off = (x) => (x.usable === false ? (/plan/.test(x.why ?? "") ? t("not on your plan") : t("not ready")) : null);
  return <div className="pick vo-pick" ref={box}>
    <button type="button" className="pick-btn" aria-haspopup="listbox" aria-expanded={open} aria-labelledby="vo-voice-l" onClick={() => setOpen((o) => !o)}>
      <span className="t">{cur ? <>{cur.own ? "★ " : ""}{cur.name}{cur.labels && <span className="muted"> · {plainLabels(cur.labels)}</span>}</> : t("Choose a voice")}</span><ChevronDown size={14} /></button>
    {open && <ul className="pick-list vo-pick-list" role="listbox" aria-labelledby="vo-voice-l">{voices.map((x) => <li key={x.id} role="option" aria-selected={x.id === value} aria-disabled={x.usable === false}>
      <button type="button" disabled={x.usable === false} title={x.usable === false ? x.why : undefined} onClick={() => { onChange(x.id); setOpen(false); }}>
        <span className="tx"><b>{x.own ? "★ " : ""}{x.name}</b>{(x.labels || off(x)) && <span>{[plainLabels(x.labels), off(x)].filter(Boolean).join(" · ")}</span>}</span>
        {x.id === value && <Check size={14} />}</button></li>)}</ul>}
  </div>;
}

/** Each voice setting in plain words (ElevenLabs' and Fish Audio's, by the ids the server's GET voices gives). */
const SETTING_HINTS = {
  speed: "How fast the voice reads; 1 is its normal pace.",
  stability: "Higher reads evenly; lower gives more feeling, and each take differs more.",
  similarity_boost: "How closely it keeps to the original voice.",
  style: "Plays up the voice's own manner; 0 is the steadiest.",
  use_speaker_boost: "Sounds more like the speaker; takes a little longer to make.",
  volume: "Louder or softer, in decibels.",
  temperature: "Higher varies the reading more.",
  top_p: "Lower keeps the reading closer to the usual sound of the voice.",
  normalize: "Reads numbers and dates as words.",
};
/** A setting's name on the screen when the service's is too long for one line (no label runs onto two lines); its ⓘ gives the
 *  full name and what it does. "Style" is ElevenLabs' own field name. */
const SHORT_LABEL = { style: "Style" };
/** The settings that differ from the voice's defaults: only these go to the service (none: its own defaults apply). */
export function settingsChanged(fields, values, defaults) {
  const out = {};
  for (const f of fields ?? []) {
    const v = values?.[f.id], d = defaults?.[f.id];
    if (v === undefined || v === null || Number.isNaN(v)) continue;
    if (f.type === "boolean" ? !!v !== !!(d ?? false) : d === undefined || Math.abs(Number(v) - Number(d)) > 1e-9) out[f.id] = v;
  }
  return out;
}

/** The voice the box opens on: the one the film's voice-over was read with, when it came from this service and the service still
 *  lists it; else the first usable voice. */
export function pickVoice(voices, provider, current) {
  const own = current?.source === provider && current.voiceId ? voices.find((v) => v.id === current.voiceId) : null;
  return (own ?? voices.find((v) => v.usable !== false) ?? voices[0])?.id ?? "";
}

function TtsPanel({ id, provider, keySaved, brief, draft = "", language = "vi", onJob, running, current = null }) {
  const t = useT();
  const toast = useToast();
  const name = provider === "elevenlabs" ? "ElevenLabs" : "Fish Audio";
  const [list, setList] = useState(null);
  const [err, setErr] = useState(null);
  const [voiceId, setVoiceId] = useState("");
  const [model, setModel] = useState("");
  const [text, setText] = useState(brief?.mode === "script" ? brief.text ?? "" : "");
  // An empty Script box takes the words Claude wrote for the voice-over, one line per sentence
  useEffect(() => { if (draft) setText((x) => (x.trim() ? x : draft)); }, [draft]);
  // A script brief is the user's own words, not Claude's draft; so is a draft whose every line is in the brief as written
  // (an idea brief that carries its narration)
  const ownWords = brief?.mode === "script" || draftInBrief(draft, brief?.text);
  const [ask, setAsk] = useState(false);
  const [vs, setVs] = useState({});                   // the voice settings shown: the chosen voice's defaults until the user changes one
  const defaultsOf = (id_) => { const v = list?.voices.find((x) => x.id === id_); return { ...(list?.defaultSettings ?? {}), ...(v?.defaultSettings ?? {}) }; };
  useEffect(() => { setVs(defaultsOf(voiceId)); }, [voiceId, list]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!keySaved) return;
    setList(null); setErr(null);
    get(`/api/voice/providers/${provider}/voices?lang=${projectLanguage(brief, language)}`).then((r) => {
      // A provider's names can carry stray spaces (" Minh Trung - Narration"); the menu, the confirm and the saved name use them trimmed
      const voices = voiceOrder((r.voices ?? []).map((v) => ({ ...v, name: String(v.name ?? "").trim() })), projectLanguage(brief, language));
      setList({ ...r, voices }); setVoiceId(pickVoice(voices, provider, current));
      // The model the film's voice-over was made with, then the server's pick
      const same = current?.source === provider ? r.models.find((m) => m.id === current.model)?.id : null;
      setModel(same ?? r.models.find((m) => m.id === r.defaultModel)?.id ?? r.models.find((m) => m.vietnamese)?.id ?? r.models[0]?.id ?? "");          // the server's pick first
    }).catch(setErr);
  }, [provider, keySaved]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!keySaved) return <section className="panel"><Banner kind="warning" action={<button className="btn sm" onClick={() => go("/settings/general")}>{t("Add key")}</button>}>{t("Add your {name} key in Settings › General › Voice-over to choose a voice.", { name })}</Banner></section>;
  const voice = list?.voices.find((x) => x.id === voiceId);
  // the voice settings are left at the service's defaults: only what the user changed is sent
  const fields = list?.settings ?? [];
  const changed = settingsChanged(fields, vs, defaultsOf(voiceId));
  const changedText = fields.filter((f) => f.id in changed).map((f) => `${t(f.label)} ${f.type === "boolean" ? t(changed[f.id] ? "on" : "off") : changed[f.id]}`).join(" · ");
  const generate = async () => {
    setAsk(false);
    try { onJob(await post(`/api/projects/${id}/voice/tts`, { provider, voiceId, voiceName: voice?.name, model, text, ...(changedText ? { settings: changed } : {}) })); toast(t("{name} is reading the script…", { name })); }
    catch (e) { toast(e.message, "error"); }
  };
  // no "{name} voice" heading: the source card picked above already says it
  return <section className="panel vo-tts-panel" aria-label={t("{name} voice", { name })}>
    {err && <Banner kind="error">{err.message}</Banner>}
    {!list && !err && <div className="skeleton" style={{ height: "5.3333rem" }} />}
    {/* two columns, the voice and its settings on the left, the script with the room it needs on the right */}
    <div className="vo-tts">
      <div className="vo-tts-l">
        {list && <><div className="field"><span id="vo-voice-l">{t("Voice")}</span><VoicePick voices={list.voices} value={voiceId} onChange={setVoiceId} /></div>
          <label className="field"><span>{t("Model")}</span><select className="select" value={model} onChange={(e) => setModel(e.target.value)}>
            {list.models.map((m) => <option key={m.id} value={m.id}>{m.name}{m.vietnamese ? " · " + t("Vietnamese") : ""}</option>)}</select></label></>}
        {voice?.preview && <audio controls src={voice.preview} preload="none" style={{ width: "100%" }} aria-label={t("Voice sample")} />}
        {/* the settings in one row of narrow fields, what each does on hover (ⓘ) */}
        {fields.length > 0 && <details className="diag vo-settings">
          <summary>{t("Voice settings")}{changedText ? ` · ${changedText}` : ` · ${t("{name}'s defaults", { name })}`}</summary>
          <div className="vo-set-row">{fields.map((f) => { const hint = SETTING_HINTS[f.id] ? t(SETTING_HINTS[f.id]) : undefined; return f.type === "boolean"
            ? <label key={f.id} className="vo-bool" title={hint ? `${t(f.label)}: ${hint}` : t(f.label)}>          {/* the tick and its name on one line */}
              <input type="checkbox" checked={!!vs[f.id]} onChange={(e) => setVs({ ...vs, [f.id]: e.target.checked })} />{t(SHORT_LABEL[f.id] ?? f.label)}{hint && <Info size={11} className="vo-info" aria-hidden="true" />}</label>
            : <label key={f.id} className="field vo-set"><span title={hint ? `${t(f.label)}: ${hint}` : t(f.label)}>{t(SHORT_LABEL[f.id] ?? f.label)}{hint && <Info size={11} className="vo-info" aria-hidden="true" />}</span>
              <input className="input num" type="number" min={f.min} max={f.max} step={f.step ?? 0.01} value={vs[f.id] ?? ""} placeholder={t("Default")} title={hint}
                onChange={(e) => setVs({ ...vs, [f.id]: e.target.value === "" ? undefined : Number(e.target.value) })} /></label>; })}</div>
          {changedText && <button className="clink" onClick={() => setVs(defaultsOf(voiceId))}>{t("Reset to {name} defaults", { name })}</button>}
        </details>}
      </div>
      <div className="vo-tts-r">
        <label className="field vo-script"><span>{t("Script")}</span><textarea className="textarea" rows={5} value={text} onChange={(e) => setText(e.target.value)} placeholder={t("The words to read, exactly as they should sound.")} /></label>
        {draft && !ownWords && text === draft && <p className="hint"><Bot size={12} /> {t("Claude's draft: edit it before you make the voice-over")}</p>}
        <div className="vo-go"><span className="muted num">{t("{n} characters", { n: text.length.toLocaleString(locale()) })}</span><span className="spacer" />
          <button className="btn primary" onClick={() => setAsk(true)} disabled={!text.trim() || !voiceId || !!running}>{running?.kind === "tts" ? <Loader2 size={15} className="spin" /> : <Sparkles size={15} />}{t("Create voice-over")}</button></div>
        {running?.kind === "tts" && <p className="hint">{t("{name} is reading the script. Transcription starts when the audio arrives.", { name })}</p>}
      </div>
    </div>
    {/* one idea a line, the line that costs money in red */}
    {ask && <Dialog title={t("Create the voice-over with {name}?", { name })} onClose={() => setAsk(false)} footer={<><span className="spacer" /><button className="btn" onClick={() => setAsk(false)}>{t("Cancel")}</button>
      <button className="btn primary" onClick={generate}>{t("Create voice-over")}</button></>}>
      {/* One sentence with the cost (red); the changed settings only when there are some */}
      <div className="dlg-lines">
        <p className="dlg-warn">{t("“{voice}” reads {n} characters, from your {name} credit.", { name, n: text.length.toLocaleString(locale()), voice: voice?.name ?? "" })}</p>
        {changedText && <p className="hint">{t("Your voice settings: {what}", { what: changedText })}</p>}
      </div>
    </Dialog>}
  </section>;
}
