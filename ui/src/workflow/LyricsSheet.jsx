// Lyrics: the app transcribes speech, not singing. For a lyric video the user pastes the song's lyrics (or opens a
// .txt / .lrc / .srt), the app times every word to the track with Whisper turbo (the Moworks Motion kit's align method: heard words, the
// rest placed on the beats), and the table shows each line's start for a check by ear.
import { useEffect, useRef, useState } from "react";
import { Bot, FileUp, Loader2, Save, Square, Timer } from "lucide-react";
import { get, post, put, watchJob } from "../api.js";
import { Banner } from "../components.jsx";
import { ago, useData, useToast } from "../lib.jsx";
import { useT } from "../i18n.jsx";
import { useStage } from "./stage.jsx";

const mmss = (s) => `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, "0")}`;

export default function LyricsSheet({ projectId, onChanged }) {
  const t = useT();
  const toast = useToast();
  const stage = useStage(projectId);
  const q = useData(() => get(`/api/projects/${projectId}/lyrics`), [projectId]);
  const [text, setText] = useState(null);
  const [busy, setBusy] = useState(false);
  const [job, setJob] = useState(null);
  const file = useRef(null);
  useEffect(() => {
    // no lyrics yet and Whisper tried the song: what it heard, as a draft to correct; nothing is saved until the owner saves or times it
    if (q.data && text == null) setText(q.data.text || q.data.heard?.text || "");
    if (q.data?.job && q.data.job !== job?.id) follow({ id: q.data.job, status: "running" });
  }, [q.data]); // eslint-disable-line react-hooks/exhaustive-deps
  const follow = (j) => {
    setJob(j);
    watchJob(j.id, (x) => {
      if (!x) return;
      setJob(x);
      if (x.status === "done") { q.reload(); onChanged?.(); toast(t("Lyrics timed: {h} of {n} words heard", { h: x.result?.heard ?? 0, n: (x.result?.heard ?? 0) + (x.result?.placed ?? 0) })); }
      if (x.status === "failed") toast(x.error?.message ?? t("The lyrics could not be timed"), "error");
    }, 1500);
  };
  if (q.error) return <Banner kind="error" action={<button className="btn sm" onClick={q.reload}>{t("Retry")}</button>}>{q.error.message}</Banner>;
  if (!q.data || text == null) return <div className="skeleton" style={{ height: "16rem" }} />;
  const running = job?.status === "running";
  const dirty = text !== q.data.text;
  const draft = !q.data.text && q.data.heard;
  const save = async () => {
    setBusy(true);
    try { await put(`/api/projects/${projectId}/lyrics`, { text }); q.reload(); onChanged?.(); toast(t("Lyrics saved")); }
    catch (e) { toast(e.message, "error"); } finally { setBusy(false); }
  };
  const time = async () => {
    setBusy(true);
    try { if (dirty) await put(`/api/projects/${projectId}/lyrics`, { text }); follow(await post(`/api/projects/${projectId}/lyrics/time`)); }
    catch (e) { toast(e.message, "error"); } finally { setBusy(false); }
  };
  const stop = async () => { try { await post(`/api/jobs/${job.id}/cancel`); } catch (e) { toast(e.message, "error"); } };
  const open = async (e) => {
    const f = e.target.files?.[0]; e.target.value = "";
    if (!f) return;
    if (f.size > 200000) { toast(t("This file is too large for lyrics"), "error"); return; }
    setText((await f.text()).replace(/^﻿/, ""));
  };
  const lines = [];
  for (const w of q.data.words) if (w.layer !== "backing") (lines[w.line - 1] ??= []).push(w);
  const backing = q.data.words.filter((w) => w.layer === "backing");
  const tm = q.data.timed;
  return <div className="sheet-cols lyrics">
    <section className="panel">
      <div className="panel-head"><h2>{t("The song's lyrics")}</h2>{q.data.track && <span className="muted end">{q.data.track.split("/").pop()}</span>}</div>
      {draft ? <Banner kind={draft.unheard ? "warning" : "info"}>{draft.unheard ? t("Whisper could hardly hear this song ({n} words). Paste the real lyrics below: the app then times every word to the song.", { n: draft.words })
          : t("This is what Whisper heard of the song ({n} words), as a draft: it will have wrong and missing words. Correct it against the real lyrics, then time them.", { n: draft.words })}</Banner>
        : <Banner kind="info">{t("Speech-to-text hears only part of a sung line. Paste the lyrics and the app times every word to the song.")}</Banner>}
      {!q.data.track && <Banner kind="warning">{t("Add the music track first (the Music step).")}</Banner>}
      <textarea className="textarea lyrics-text" value={text} onChange={(e) => setText(e.target.value)} disabled={running} spellCheck={false}
        placeholder={t("One sung line per line, repeats written out (la la la), backing vocals in (parentheses). A rough start time helps a long song: [0:17.5] Here we go")}
        aria-label={t("The song's lyrics")} />
      <div className="row">
        <input ref={file} type="file" accept=".txt,.lrc,.srt,text/plain" hidden onChange={open} />
        <button className="btn sm" onClick={() => file.current?.click()} disabled={running}><FileUp size={14} />{t("Open a lyrics file")}</button>
        <span className="hint">{t(".txt, .lrc or .srt")}</span>
        <span className="spacer" />
        <button className="btn sm" onClick={save} disabled={busy || running || !dirty}><Save size={14} />{t("Save")}</button>
        {running ? <button className="btn sm" onClick={stop}><Square size={14} />{t("Stop")}</button>
          : <button className="btn primary sm" onClick={time} disabled={busy || !text.trim() || !q.data.track}>{busy ? <Loader2 size={14} className="spin" /> : <Timer size={14} />}{tm ? t("Time again") : t("Time the lyrics")}</button>}
      </div>
      {running && <p className="hint"><Loader2 size={13} className="spin" /> {q.data?.gpu ? t("Whisper turbo is listening to the song on the graphics card: a minute or two.")
        : t("Whisper turbo is listening to the song: several minutes on the CPU (about 8 for a 50 s song).")}</p>}
    </section>
    <section className="panel">
      <div className="panel-head"><h2>{t("Times")}</h2>{tm && <span className="muted end">{ago(tm.at)}</span>}</div>
      {!tm ? <Banner kind="info">{t("Not timed yet.")}</Banner> : <>
        {tm.stale && <Banner kind="warning">{t("The lyrics changed after they were timed: time them again.")}</Banner>}
        <p className="secondary num">{t("Whisper turbo heard {h} of {n} words; the others are placed on the song's attacks. A draft: listen and fix a line that is off.", { h: tm.heard, n: tm.heard + tm.placed })}</p>
        {tm.repeats?.map((x) => <Banner key={`${x.line}-${x.word}`} kind="warning">{t("Line {l}: \"{w}\" is written {a} times and Whisper heard {b}. The film keeps your count: listen, and change the text if the song says otherwise.", { l: x.line, w: x.word, a: x.text, b: x.heard })}</Banner>)}
        <table className="mp-table lyrics-times"><thead><tr><th>#</th><th>{t("Starts")}</th><th>{t("Line")}</th><th>{t("Heard")}</th></tr></thead>
          <tbody>{lines.filter(Boolean).map((ws, i) => <tr key={i}><td className="num muted">{i + 1}</td><td className="num">{mmss(ws[0].start)}</td>
            <td>{ws.map((w) => w.text).join(" ")}</td><td className="num muted">{ws.filter((w) => w.sure === "heard").length}/{ws.length}</td></tr>)}</tbody></table>
        {backing.length > 0 && <p className="hint">{t("Backing vocals, a layer of their own: {w}", { w: backing.map((w) => w.text).join(" ") })}</p>}
      </>}
      <div className="row"><button className="btn sm" onClick={() => stage.askClaude(t("About the lyrics and their times: "))}><Bot size={14} />{t("Ask Claude")}</button></div>
    </section>
  </div>;
}
