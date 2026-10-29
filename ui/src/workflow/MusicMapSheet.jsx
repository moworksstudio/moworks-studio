// The music map for the user to read, not raw JSON: what `hyperframes beats` measures on the music track (the beats and their strength,
// and the tempo they give), with the lyrics the app timed. Here: the facts, one strip over the song's own length (beats, lyric lines), and
// the lyrics in words. HF's beat file has no metre or bars, so none are shown.
import { Bot } from "lucide-react";
import { get } from "../api.js";
import { Banner } from "../components.jsx";
import { ago, useData } from "../lib.jsx";
import { useT } from "../i18n.jsx";
import { useStage } from "./stage.jsx";
import "./musicmap.css";

const mmss = (s) => `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, "0")}`;
/** The part of the song the film plays ({ start, end } in the song's seconds), or null when it plays the whole song or nobody said. */
export function usedPart(data, dur) {
  const u = data?.used ?? null;
  const start = Math.max(0, Number(u?.start) || 0), end = Math.min(dur, Number(u?.end) || dur);
  return u && end > start && (start > 0.05 || end < dur - 0.05) ? { start, end } : null;
}

export default function MusicMapSheet({ projectId }) {
  const t = useT();
  const stage = useStage(projectId);
  const q = useData(() => get(`/api/projects/${projectId}/beats`), [projectId]);
  if (q.error) return <Banner kind="error" action={<button className="btn sm" onClick={q.reload}>{t("Retry")}</button>}>{q.error.message}</Banner>;
  if (!q.data) return <div className="skeleton" style={{ height: "16rem" }} />;
  const a = q.data.map;
  // an empty music map says what comes next and offers it (the same Ask Claude as below, its message ready in the chat)
  if (!a) return <Banner kind="info" action={<button className="btn sm" onClick={() => stage.askClaude(t("Run HyperFrames' beats on this film's music track."))}><Bot size={14} />{t("Ask Claude")}</button>}>
    {t("No music map yet. Claude makes it from the song with HyperFrames' beats.")}</Banner>;
  // the strip spans the track's own length; when it could not be measured, what is drawn on it (the Length then reads "–")
  const known = a.audio?.duration_sec || null;
  const dur = known || Math.max(1, ...(a.beats ?? []).map((b) => b.time), ...(q.data.lyrics ?? []).map((l) => l.end));
  const pct = (s) => `${Math.min(100, Math.max(0, (s / dur) * 100))}%`;
  // The film plays part of the song: that part is marked, the rest dimmed, and the lyric lines outside it are dimmed too
  const used = usedPart(q.data, dur);
  const out = (s, e) => !!used && (e <= used.start || s >= used.end);          // a lyric line from s to e
  const outTitle = used ? ` · ${t("Outside the film")}` : "";
  const lyrics = q.data.lyrics ?? [];
  const beats = (a.beats ?? []).filter((b) => b.time <= dur);
  const bpm = a.tempo?.bpm ?? null;
  const ticks = []; for (let s = 0; s <= dur; s += dur > 90 ? 15 : 5) ticks.push(s);
  return <div className="mm">
    <section className="panel">
      <div className="panel-head"><h2>{t("The song")}</h2><span className="muted end">{a.audio?.title}{q.data.at && ` · ${ago(q.data.at)}`}</span></div>
      <dl className="mm-facts">
        <div><dt>{t("Tempo")}</dt><dd className="num">{bpm ? `${Math.round(bpm)} BPM` : "–"}</dd></div>
        <div><dt>{t("Length")}</dt><dd className="num">{known ? mmss(known) : "–"}</dd></div>
        {used && <div><dt>{t("In the film")}</dt><dd className="num">{mmss(used.start)}–{mmss(used.end)} · {Math.round(used.end - used.start)} s</dd></div>}
        <div><dt>{t("Beats")}</dt><dd className="num">{a.tempo?.n_beats ?? "–"}</dd></div>
      </dl>
      <div className={"mm-strip" + (used ? " part" : "")} role="img" aria-label={used ? t("The song over time: beats and lyric lines; the film plays {from}–{to}", { from: mmss(used.start), to: mmss(used.end) }) : t("The song over time: beats and lyric lines")}>
        {used && <><span className="mm-out" style={{ left: 0, width: pct(used.start) }} aria-hidden="true" /><span className="mm-out" style={{ left: pct(used.end), right: 0 }} aria-hidden="true" />
          <span className="mm-used" style={{ left: pct(used.start), width: pct(used.end - used.start) }} aria-hidden="true"><b>{t("In the film")}</b></span></>}
        <div className="mm-row mm-beats" title={t("Beats")}>
          {beats.map((b, i) => <i key={i} className="mm-beat" style={{ left: pct(b.time), "--s": b.strength }} />)}
        </div>
        {lyrics.length > 0 && <div className="mm-row mm-lyrics">
          {lyrics.map((l) => <span key={l.line} className={"mm-ly" + (out(l.start, l.end) ? " out" : "")} style={{ left: pct(l.start), width: pct(Math.max(0.3, Math.min(dur, l.end) - l.start)) }} title={`${mmss(l.start)} · ${l.text}${out(l.start, l.end) ? outTitle : ""}`}>{l.line}</span>)}
        </div>}
        <div className="mm-axis">{ticks.map((s) => <span key={s} style={{ left: pct(s) }}>{mmss(s).replace(/\.0$/, "")}</span>)}</div>
      </div>
      <div className="mm-legend hint">
        <span><i className="mm-beat inline" style={{ "--s": 1 }} />{t("Beats (taller: stronger)")}</span>
        {lyrics.length > 0 && <span><i className="mm-sw ly" />{t("Lyric lines")}</span>}
        {used && <span><i className="mm-sw out" />{t("Outside the film")}</span>}
      </div>
    </section>
    <section className="panel">
      <div className="panel-head"><h2>{t("Lyrics")}</h2></div>
      {lyrics.length ? <ol className="mm-list">{lyrics.map((l) => <li key={l.line} className={out(l.start, l.end) ? "out" : undefined} title={out(l.start, l.end) ? t("Outside the film: not heard in it") : undefined}><span className="num">{mmss(l.start)}</span><span>{l.text}</span></li>)}</ol>
        : <p className="secondary">{t("No timed lyrics yet.")}</p>}
    </section>
    <div className="row">
      <button className="btn sm" onClick={() => stage.askClaude(t("About the music map: "))}><Bot size={14} />{t("Ask Claude")}</button>
    </div>
  </div>;
}
