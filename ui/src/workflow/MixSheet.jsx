// Final Mix: the audio review after the build. The app already placed the music and the
// sound effects. Music: the three tracks as one list, each on one line (title · author · length), Claude's pick and the one in use marked on
// the list itself (no separate block for the current track), one player for the whole dialog so two tracks never play at once; "Use this"
// switches the track on the timeline (from 0 s, beats measured, credited), "Three other tracks" asks for more. Sound effects: placed by the app
// from the cuts and the motion plan, a sound on every action; their count, the list folded (one sound or one ambience bed taken out with
// its ×, kept out on every placement), how many (every action, most, only the big ones) and the ambience on or off, place again or remove.
// Levels: only the action that applies (the music ducked under the voice with HyperFrames' carve) and the last render's loudness, without
// the studio-rule notice. The last placement's result is said under the count: the sounds left out and those on a stand-in. The sounds the
// user added from the Editor's Sounds drawer are in the list too, each with its ×; placing again leaves them where they are.
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { AlertTriangle, AudioLines, Check, Info, Loader2, Music, Pause, Play, RefreshCw, RotateCcw, ShieldCheck, Sparkles, Trash2, X } from "lucide-react";
import { get, post } from "../api.js";
import { Banner } from "../components.jsx";
import { useData, useToast } from "../lib.jsx";
import { useT } from "../i18n.jsx";
import { LoudLine } from "./RenderSheet.jsx";

// what the music button asks Claude (an English key for t; Claude reads the English)
export const FIND_MUSIC = "Find three music tracks on mixkit.co that fit this film: its brief, its pace and its length ({length}). For each, its page and the direct .mp3 link of the track. Hand them to me with the app's music_options tool, then stop.";
export const FIND_OTHERS = "Find three other music tracks on mixkit.co for this film, different from the ones I heard ({heard}). Hand them to me with the app's music_options tool, then stop.";

const mmss = (s) => { const v = Math.max(0, Math.round(s || 0)); return `${Math.floor(v / 60)}:${String(v % 60).padStart(2, "0")}`; };

/** One audio element for the dialog: playing a track stops the one before. */
function usePlayer() {
  const ref = useRef(null);
  const [cur, setCur] = useState(null);          // the url loaded
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [dur, setDur] = useState(0);
  useEffect(() => {
    const a = new Audio();
    a.preload = "none";
    const on = () => { setPlaying(!a.paused); setTime(a.currentTime); setDur(Number.isFinite(a.duration) ? a.duration : 0); };
    for (const ev of ["play", "pause", "timeupdate", "loadedmetadata", "ended"]) a.addEventListener(ev, on);
    ref.current = a;
    return () => { a.pause(); a.src = ""; };
  }, []);
  const toggle = (url) => {
    const a = ref.current;
    if (!a) return;
    if (cur === url) { if (a.paused) a.play().catch(() => {}); else a.pause(); return; }
    a.pause(); a.src = url; setCur(url); setTime(0); setDur(0); a.play().catch(() => {});
  };
  const seek = (url, f) => { const a = ref.current; if (a && cur === url && a.duration) a.currentTime = f * a.duration; };
  return { cur, playing, time, dur, toggle, seek };
}

function Track({ x, pick, player, busy, onUse }) {
  const t = useT();
  const mine = player.cur === x.url;
  const on = mine && player.playing;
  const length = x.duration ? mmss(x.duration) : mine && player.dur ? mmss(player.dur) : "";
  return <li className={"mix-row" + (x.current ? " current" : "") + (mine ? " loaded" : "")}>
    <button type="button" className="btn icon mix-play" onClick={() => player.toggle(x.url)} aria-label={on ? t("Pause {title}", { title: x.title }) : t("Play {title}", { title: x.title })}>
      {on ? <Pause size={15} /> : <Play size={15} />}</button>
    <div className="mix-t">
      <div className="mix-line"><b>{x.title}</b>{x.artist && <span className="muted">· {x.artist}</span>}{length && <span className="muted num">· {length}</span>}
        {pick && <span className="tag">{t("Claude's pick")}</span>}</div>
      <div className="mix-bar" role="slider" aria-label={t("Position in {title}", { title: x.title })} aria-valuemin={0} aria-valuemax={Math.round(player.dur)} aria-valuenow={mine ? Math.round(player.time) : 0} tabIndex={mine ? 0 : -1}
        onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); player.seek(x.url, Math.min(1, Math.max(0, (e.clientX - r.left) / r.width))); }}>
        <span style={{ width: mine && player.dur ? `${(player.time / player.dur) * 100}%` : "0%" }} /></div>
    </div>
    {mine && <span className="muted num mix-time">{mmss(player.time)}</span>}
    {x.current ? <span className="state-badge ok mix-act mix-sel"><ShieldCheck size={15} />{t("Selected")}</span>
      : onUse && <button className="btn sm mix-act" disabled={!!busy} onClick={onUse}>
      {busy === "use" + x.file ? <Loader2 size={14} className="spin" /> : <Check size={14} />}{busy === "use" + x.file ? t("Adding the music…") : t("Use this")}</button>}
  </li>;
}

// The Editor opens the dialog anew each time the sounds are placed (its key): where it was scrolled to and whether "Where they are" was
// open come back with it (Test 26: after "Place them again" it jumped back to the top with the list closed). Only right after such a
// change, never when the dialog is opened again later.
const kept = new Map();          // project id -> { top, list, gone }
const scrollerOf = (el) => { for (let p = el?.parentElement; p; p = p.parentElement) { const o = getComputedStyle(p).overflowY; if (o === "auto" || o === "scroll") return p; } return null; };
const quoted = (xs) => xs.map((x) => `“${x}”`).join(", ");
// a stand-in's name in plain words ("chime", "cloth rustle"), never a file's
const plain = (s) => String(s ?? "").replace(/[-_]+/g, " ").replace(/\s*\d+$/, "").trim();

const MIXKIT = "Mixkit music is for online use only (YouTube, social, websites, online ads). For TV, radio, cinema, DVD or games, use broadcast-licensed music.";

export default function MixSheet({ projectId, project, onChanged }) {
  const t = useT();
  const toast = useToast();
  const q = useData(() => get(`/api/projects/${projectId}/mix`), [projectId]);
  const pipe = useData(() => get(`/api/projects/${projectId}/pipeline`).catch(() => null), [projectId]);          // is the film really ready
  const [busy, setBusy] = useState(null);
  const [waitSfx, setWaitSfx] = useState(false);
  const [stopAt, setStopAt] = useState("");          // "Stop the music at" (the twist)
  const player = usePlayer();
  const root = useRef(null);
  const [back] = useState(() => { const k = kept.get(projectId); return k?.gone && Date.now() - k.gone < 8000 ? k : null; });
  const [listOpen, setListOpen] = useState(!!back?.list);
  useEffect(() => () => { kept.set(projectId, { ...kept.get(projectId), gone: Date.now() }); }, [projectId]);
  useLayoutEffect(() => {
    const el = q.data ? scrollerOf(root.current) : null;
    if (!el) return undefined;
    if (back?.top) el.scrollTop = back.top;
    const on = () => kept.set(projectId, { ...kept.get(projectId), top: el.scrollTop });
    el.addEventListener("scroll", on, { passive: true });
    return () => el.removeEventListener("scroll", on);
  }, [!!q.data]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (waitSfx) { const h = setTimeout(() => { q.reload(); setWaitSfx(false); }, 4000); return () => clearTimeout(h); } }, [waitSfx]); // eslint-disable-line react-hooks/exhaustive-deps
  if (q.error) return <Banner kind="error">{q.error.message}</Banner>;
  if (!q.data) return <div className="skeleton" style={{ height: "16rem" }} />;
  const d = q.data;
  const round = d.options.at(-1);
  // the music covers the whole film: the content and the ending's fade after it (the server's project.length)
  const sec = Math.ceil(project?.length?.total ?? project?.meta?.targetDurationSec ?? 60);
  const length = sec >= 60 ? `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}` : `${sec} s`;
  const act = async (key, fn, done) => { setBusy(key); try { const r = await fn(); done?.(r); q.reload(); onChanged?.(); } catch (e) { toast(e.message, "error"); } finally { setBusy(null); } };
  const ask = (text) => act("find", () => post(`/api/projects/${projectId}/pipeline/finalMix/run`, { text }), () => toast(t("Claude is looking on Mixkit; the tracks appear here")));
  // the owner's sound choices: kept for the film, and the sounds placed again with them
  const prefs = d.sfxPrefs ?? { density: "lively", ambience: true, skipped: 0 };
  const setPref = (body) => act("prefs", () => post(`/api/projects/${projectId}/mix/sfx/prefs`, body), () => setWaitSfx(true));
  const placing = !!busy || waitSfx;
  const added = d.added ?? [];
  const sounds = [...(d.ambience ?? []).map((x) => ({ ...x, bed: true })), ...d.sfx, ...added.map((x) => ({ ...x, mine: true }))].sort((a, b) => a.start - b.start);
  const takeOff = (x) => act("off" + x.id, () => post(`/api/projects/${projectId}/edit/audio/remove`, { id: x.id, src: x.file, name: x.name }), () => toast(t("Taken off the timeline: {name} (it stays in Assets)", { name: x.name })));
  const ownSong = !!project?.styleInfo?.music && !!d.music && !round;          // the film is built on the song the user gave: no stock tracks offered
  // The Mixkit licence only for a Mixkit track (or while Mixkit tracks are offered and none is placed), never the user's own file
  const mixkit = !ownSong && (d.music ? /mixkit/i.test(`${d.music.licence ?? ""} ${d.music.page ?? ""}`) : !!round);
  const heard = d.options.flatMap((r) => r.tracks.map((x) => x.title)).join(", ");
  // the list: the latest round's three tracks; with no round (the user's own song) the track on the timeline alone
  const tracks = round ? round.tracks : d.music ? [{ ...d.music, title: d.music.title ?? d.music.file.split("/").pop(), current: true }] : [];
  const left = d.sfxPlacing ? [] : d.sfxMissing ?? [], near = d.sfxPlacing ? [] : d.sfxNear ?? [];
  return <div className="mix" ref={root}>
    {/* Final Mix hands the film over: no score, no Tech checks; a change asked in the chat is rebuilt and rendered by itself */}
    {/* Not "ready" while something stops the render or Claude waits for an answer */}
    {/* the same rule as the Pipeline: ready only when nothing blocks and the Final Mix row is done ("Your film is ready to export.") */}
    {(() => { const ck = pipe.data?.checks, blocking = ck?.pass === false ? ck.blocking ?? 0 : 0;
      const waits = pipe.data?.stages?.some((s) => s.status === "waiting") || !!pipe.data?.question;
      const mixRow = pipe.data?.stages?.find((s) => s.id === "finalMix");
      return blocking > 0 || waits || (mixRow && mixRow.status !== "done")
        ? <p className="hint">{blocking > 0 ? t("The film is not ready yet: {n} problem(s) to fix before the render. Claude asks you in the chat; you can already listen and change the music or the sound effects here.", { n: blocking })
          : pipe.data?.version1?.card?.kind === "ask" ? t("Version {n} is ready. Change the music or the sound effects here if you like, then answer the question in the chat.", { n: pipe.data.version1.n })
          : waits ? t("The film is not ready yet: Claude waits for your answer in the chat. You can already listen and change the music or the sound effects here.")
          : t("The film is not ready yet: it is still being made. You can already listen and change the music or the sound effects here.")}</p>
        : <p className="hint">{t("Your film is ready to export. Change the music or sound effects here; for the picture, ask Claude in the chat.")}</p>; })()}
    <section className="panel">
      {/* the Mixkit licence once, as an ⓘ by the heading (Render keeps its own line where the file is written) */}
      <div className="panel-head"><h2><Music size={16} /> {t("Music")}{mixkit && <Info size={14} className="mix-info" tabIndex={0} role="img" aria-label={t(MIXKIT)} title={t(MIXKIT)} />}</h2>
        {/* Claude searching the web for new music costs a turn: a secondary button that says so, not the dialog's main action */}
        {!ownSong && <button className={"btn sm end" + (round ? "" : " primary")} disabled={!!busy} onClick={() => ask(round ? t(FIND_OTHERS, { heard }) : t(FIND_MUSIC, { length }))} title={t("Claude searches Mixkit on the web for new music. This uses Claude.")}>
          {busy === "find" ? <Loader2 size={14} className="spin" /> : round ? <RefreshCw size={14} /> : <Sparkles size={14} />}{round ? t("Ask Claude for 3 new tracks") : t("Ask Claude for 3 tracks")}</button>}</div>
      {tracks.length ? <ul className="plain mix-list">{tracks.map((x, i) => <Track key={x.file} x={x} pick={!!round && (x.pick ?? i === 0)} player={player} busy={busy}
        onUse={round ? () => act("use" + x.file, () => post(`/api/projects/${projectId}/mix/music`, { file: x.file }), () => toast(t("“{title}” is on the timeline", { title: x.title }))) : null} />)}</ul>
        : <p className="muted">{t("No music on the timeline yet.")}</p>}
      {round?.failed?.length > 0 && <p className="hint">{t("{n} track(s) could not be saved", { n: round.failed.length })}</p>}
      {/* a song far shorter than the film plays again after itself to the film's end (T22-9): said, so the owner can pick a longer one */}
      {d.music?.repeat?.short && d.music.stopAt == null && <p className="hint warn"><AlertTriangle size={12} /> {t("The song is shorter than the film; it repeats from {at}. Pick a longer track if you hear the repeat.", { at: d.music.repeat.at })}</p>}
      {d.music && <div className="row mix-stop">
        <label className="hint" htmlFor="mix-stop-at">{d.music.stopAt != null ? t("The music stops at {s} s", { s: d.music.stopAt }) : t("Stop the music at")}</label>
        <input id="mix-stop-at" className="input num" style={{ width: "6rem" }} inputMode="decimal" value={stopAt} placeholder={t("e.g. 18")}
          onChange={(e) => setStopAt(e.target.value)} aria-label={t("Second where the music stops")} /><span className="muted">{t("s")}</span>
        <button className="btn ghost sm" disabled={!!busy || !(Number(stopAt) > 0)} onClick={() => act("stop", () => post(`/api/projects/${projectId}/mix/music/stop`, { at: Number(stopAt) }), () => { setStopAt(""); toast(t("The music stops at {s} s", { s: Number(stopAt) })); })}>
          {busy === "stop" ? <Loader2 size={14} className="spin" /> : null}{t("Stop here")}</button>
        {d.music.stopAt != null && <button className="btn ghost sm" disabled={!!busy} onClick={() => act("play", () => post(`/api/projects/${projectId}/mix/music/stop`, { at: null }), () => toast(t("The music plays to its end")))}>{t("Play to the end")}</button>}
      </div>}
      {/* The empty field said nothing about what it is for */}
      {d.music && d.music.stopAt == null && <p className="hint">{t("Optional. Left empty, the music plays to the end.")}</p>}
      {ownSong && <p className="hint">{t("The film uses the song you gave. Another track would replace it.")}</p>}
    </section>
    <section className="panel">
      <div className="panel-head"><h2><AudioLines size={16} /> {t("Sound effects")}</h2><span className="muted num">{d.sfx.length + added.length}</span>
        <span className="end mix-sfx-acts">
          <button className="btn ghost sm" disabled={!!busy || waitSfx} onClick={() => act("sfx", () => post(`/api/projects/${projectId}/mix/sfx`), () => setWaitSfx(true))}>
            {busy === "sfx" || waitSfx ? <Loader2 size={14} className="spin" /> : <Sparkles size={14} />}{d.sfx.length ? t("Place them again") : t("Place sound effects")}</button>
          {d.sfx.length > 0 && <button className="btn ghost sm" disabled={!!busy} onClick={() => act("clear", () => post(`/api/projects/${projectId}/mix/sfx/clear`))}><Trash2 size={14} />{t("Remove them")}</button>}</span></div>
      <p className="secondary">{d.sfx.length ? t("Placed from the cuts and the Motion Plan.") : t("None placed yet.")}{added.length > 0 && <> {added.length === 1 ? t("The one you added stays when they are placed again.") : t("The {n} you added stay when they are placed again.", { n: added.length })}</>}</p>
      {/* what the last placement could not do, said here too (Test 26: "Place them again" changed nothing and said nothing) */}
      {(d.sfxPlacing || waitSfx) && <p className="hint"><Loader2 size={12} className="spin" /> {t("Placing the sound effects…")}</p>}
      {left.length > 0 && <p className="hint warn"><AlertTriangle size={12} /> {t("Not placed: {names}. Press Place them again later, or ask Claude for other names.", { names: quoted(left) })}</p>}
      {/* said plainly, as the chat's note does: these are not the sound the film asks for */}
      {near.length > 0 && <p className="hint">{t("Stand-ins, not the real sound: {names}. Press Place them again when the sound search is back, or add your own.", { names: `${near.slice(0, 10).map((x) => (plain(x.as) ? `“${x.name}” (${plain(x.as)})` : `“${x.name}”`)).join(", ")}${near.length > 10 ? ` ${t("and {n} more", { n: near.length - 10 })}` : ""}` })}</p>}
      <div className="row mix-density">
        <label className="hint" htmlFor="mix-density">{t("Sounds on")}</label>
        <select id="mix-density" className="select sm" value={prefs.density} disabled={placing} onChange={(e) => setPref({ density: e.target.value })}>
          <option value="lively">{t("Every action")}</option>
          <option value="normal">{t("Most actions")}</option>
          <option value="low">{t("Only the big actions")}</option>
        </select>
        <label className="mix-amb"><input type="checkbox" checked={prefs.ambience !== false} disabled={placing} onChange={(e) => setPref({ ambience: e.target.checked })} />{t("Ambience under each place")}</label>
        {prefs.skipped > 0 && <button className="btn ghost sm end" disabled={placing} onClick={() => setPref({ unskip: true })}><RotateCcw size={14} />{t("Bring back {n} removed", { n: prefs.skipped })}</button>}
      </div>
      {sounds.length > 0 && <details className="mix-sfx-list" open={listOpen} onToggle={(e) => { const o = e.currentTarget.open; setListOpen(o); kept.set(projectId, { ...kept.get(projectId), list: o }); }}><summary>{t("Where they are")}</summary>
        <ul className="plain mix-sfx">{sounds.map((x, i) => <li key={i}><span className="num">{x.start.toFixed(2)} s</span> {x.bed ? t("{name} (ambience)", { name: x.name }) : x.mine ? t("{name} (you added it)", { name: x.name }) : x.name}
          {x.id && <button type="button" className="btn icon ghost mix-sfx-x" disabled={placing} onClick={() => (x.mine ? takeOff(x) : setPref({ skip: x.id }))}
            aria-label={t("Take out {name} at {s} s", { name: x.name, s: x.start.toFixed(2) })} title={t("Take this sound out")}><X size={12} /></button>}</li>)}</ul></details>}
      {/* only a film whose voice is on the timeline (meta.voice.offTimeline once the user chose not to use it) */}
      {d.voice && !d.voice.offTimeline && !project?.meta?.voice?.offTimeline && d.music && <div className="row mix-duck"><button className="btn ghost sm" disabled={!!busy} onClick={() => act("carve", () => post(`/api/projects/${projectId}/mix/carve`), () => toast(t("The music now dips under the voice")))}>
        {busy === "carve" ? <Loader2 size={14} className="spin" /> : <AudioLines size={14} />}{d.carved ? t("Duck the music again") : t("Duck the music under the voice")}</button></div>}
      {d.loudness && !d.loudness.silent && <div className="row mix-loud"><span className="hint">{t("Last render's loudness:")}</span><LoudLine l={d.loudness} /></div>}
    </section>
  </div>;
}
