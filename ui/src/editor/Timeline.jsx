// The Editor's timeline, for reading the film, not for cutting it: Shots, the voice-over's lines, the sound effects, the
// music with its waveform, and the last Checks run's findings as dots. Click to jump; drag to scrub; Shift + drag marks a part to loop;
// a shot's block selects that shot for Claude; Ctrl + wheel or − / + / Fit zoom. The fold button leaves only the Shots row. The how-to
// line is the lanes' tooltip (less text on screen). Colours after HF Studio's own timeline
// (packages/studio/src/styles/theme.css @ 490ecaf, Apache-2.0): a shot shows its picture under a dark name chip, the voice in teal, the
// sound effects in blue, the music as a clip with a white waveform; the lanes grow with the timeline's height (the user drags it).
// Sounds are clips as in HF Studio (HF 490ecaf packages/studio/src/player/components/timelineClipDragCommit.ts):
// drag one along its lane or onto another lane (Narration, SFX, Music), click to select it, Delete takes it off the timeline (the file
// stays in Assets). + and - zoom, not while typing. A sound dragged from the Assets tab drops on the lane under the pointer, at the
// pointer's time: the lane lights and a thin line shows the time while it is over it (not on a locked film or one shown as its render).
import { useEffect, useRef, useState } from "react";
import { Captions, ChevronDown, ChevronUp, Film, Mic2, Music, Sparkles, Trash2, ZoomIn, ZoomOut } from "lucide-react";
import { usePref, useToast } from "../lib.jsx";
import { useT } from "../i18n.jsx";
import { fmtTime } from "./Player.jsx";

const LABEL = 116;          // the label column, wide enough for "NARRATION"

const keyOf = (c) => c.hfId || c.id || `${c.src}@${c.start}`;
const cls_sfx = (audio) => sfxRows(audio.filter((c) => c.lane === "sfx"));

/** A sound dragged from the Assets tab: this type carries its project-relative path, which never shows on screen. */
export const SOUND_MIME = "application/x-moworks-sound";
/** The sound lanes by the names the Assets route gives them. */
export const DROP_LANE = { voice: "voiceover", sfx: "sfx", music: "music" };
/** A pointer's x as a time on the lanes: from their left edge on screen (it moves with the scroll), at their pixels per second (the zoom),
 *  on a frame of the film, within the film. A click, a scrub and a drop from the Assets tab read the time the same way. */
export const timeAtX = (clientX, left, scale, fps, max) => Math.max(0, Math.min(max, Math.round(((clientX - left) / scale) * fps) / fps));
/** A time as minutes and seconds, tenths when it has them: "1:05", "0:02.5". */
export const clockTenths = (s) => {
  const d = Math.round(Math.max(0, Number(s) || 0) * 10), m = Math.floor(d / 600), r = d - m * 600;
  return `${m}:${String(Math.floor(r / 10)).padStart(2, "0")}${r % 10 ? `.${r % 10}` : ""}`;
};
/** A sound's name as a label on its clip: "ambience-room-tone-1.ogg" reads "ambience room tone 1". */
export const clipLabel = (name) => String(name ?? "").replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").trim();
/** A sound's name in words, the one the Sounds drawer gives it ("Bell desk 1"), never its file's: what a toast, a button and a screen reader say. */
export const soundName = (c) => c?.title || clipLabel(c?.name).replace(/^./, (x) => x.toUpperCase());
/** The latest a sound may start: it ends with the film. One already running past the end (a long recording) may stay or move earlier, never later. */
export const latestStart = (c, filmEnd, from = c?.start ?? 0, last = 0) => Math.max(0, filmEnd - (c?.duration ?? 0), Math.min(from, filmEnd - last));
/** A long bed under the effects (an ambience): drawn lighter, so the effects over it stay readable. */
export const isBed = (c) => /^ambien/i.test(String(c.name ?? "")) || /^el-amb-/.test(String(c.id ?? ""));
/** The SFX lane's rows: one per HF track the sounds sit on (`data-track-index`, HF's own timeline data), beds first; a sound with no track takes
 *  the first row where it overlaps nothing, and so does every sound when they sit on more tracks than the lane has room for. Returns { rows, rowOf(clip) }.
 *  A film's 99 sounds on six tracks read one by one; on one bar they could not. */
const SFX_ROWS = 8;
export function sfxRows(all) {
  const many = new Set(all.map((c) => c.track).filter((n) => n != null)).size > SFX_ROWS;
  const clips = many ? all.map((c) => ({ ...c, track: null })) : all;
  const tracks = [...new Set(clips.filter((c) => c.track != null).map((c) => c.track))].sort((a, b) => a - b);
  const beds = tracks.filter((n) => clips.some((c) => c.track === n && isBed(c)));
  const order = [...beds, ...tracks.filter((n) => !beds.includes(n))];
  const row = new Map(order.map((n, i) => [n, i]));
  const ends = order.map((n) => Math.max(0, ...clips.filter((c) => c.track === n).map((c) => c.start + (c.duration ?? 0.3))));
  const free = new Map();
  for (const c of [...clips].filter((x) => x.track == null).sort((a, b) => a.start - b.start)) {
    let k = ends.findIndex((e) => e <= c.start + 1e-3);
    if (k < 0) { k = ends.length; ends.push(0); }
    ends[k] = c.start + (c.duration ?? 0.3);
    free.set(keyOf(c), k);
  }
  return { rows: Math.max(1, ends.length), rowOf: (c) => (!many && c.track != null && row.has(c.track) ? row.get(c.track) : free.get(keyOf(c)) ?? 0) };
}
/** The drop line on a lane while a sound from the Assets tab is over it, with the time it would start at (its chip turns left at the end). */
export const DropLine = ({ x, time, end = false }) => <div className={"tl-drop" + (end ? " end" : "")} style={{ left: x }} aria-hidden="true"><b className="num">{time}</b></div>;

export default function Timeline({ data, time, duration, shot, onSeek, onShot, range, onRange, posters = null, fps = 30, locked = false, onAudioMove = null, onAudioRemove = null, onCaptionSave = null, onCaptionLive = null,
  readOnly = false, onSoundDrop = null }) {
  const t = useT();
  const toast = useToast();
  const [pps, setPps] = usePref("editor:tl-pps", 0);          // pixels per second; 0 = fit
  const [folded, setFolded] = usePref("editor:tl-folded", false);
  const box = useRef(null);
  const [cue, setCue] = useState(null);             // the caption group whose words are open in the head: { file, start, parts }
  const [cueText, setCueText] = useState({});
  const [w, setW] = useState(800);
  const [drag, setDrag] = useState(null);           // { x0, t0, mode: "scrub" | "range" }
  useEffect(() => { const el = box.current; if (!el) return; const ro = new ResizeObserver(() => setW(el.clientWidth)); ro.observe(el); setW(el.clientWidth); return () => ro.disconnect(); }, []);
  const D = Math.max(duration || 0, data?.duration || 0, 1);
  const fit = Math.max(4, (w - LABEL - 16) / D);
  const scale = pps > 0 ? pps : fit;
  const width = Math.max(D * scale, w - LABEL - 16);
  const step = scale >= 120 ? 0.5 : scale >= 60 ? 1 : scale >= 25 ? 2 : scale >= 12 ? 5 : scale >= 5 ? 10 : 30;
  const ticks = []; for (let s = 0; s <= D + 1e-6; s += step) ticks.push(+s.toFixed(3));
  const lane = useRef(null);
  // a click or a scrub lands on a frame of the film (its own rate: 24, 30 or 60 fps); a click on a shot selects it and lands
  // where it was clicked, not on the shot's first frame, where its words have not come in yet
  const at = (clientX) => timeAtX(clientX, lane.current.getBoundingClientRect().left, scale, fps, D);
  const down = (e) => {
    if (e.button !== 0 || readOnly) return;          // a film shown as its render: no drag, scrub or loop on the lanes; a shot jumps to its start
    const s = at(e.clientX);
    if (e.shiftKey) { setDrag({ mode: "range", t0: s }); onRange([s, s]); }
    else { setDrag({ mode: "scrub" }); onSeek(s); }
  };
  useEffect(() => {
    if (!drag) return;
    const move = (e) => { const s = at(e.clientX); if (drag.mode === "range") onRange([Math.min(drag.t0, s), Math.max(drag.t0, s)]); else onSeek(s); };
    const up = () => { if (drag.mode === "range" && range && range[1] - range[0] < 0.05) onRange(null); setDrag(null); };
    addEventListener("pointermove", move); addEventListener("pointerup", up);
    return () => { removeEventListener("pointermove", move); removeEventListener("pointerup", up); };
  }, [drag, range, scale]); // eslint-disable-line react-hooks/exhaustive-deps
  const scroller = useRef(null);
  useEffect(() => {          // keep the playhead in view while playing
    const el = scroller.current; if (!el) return;
    const x = time * scale;
    if (x < el.scrollLeft || x > el.scrollLeft + el.clientWidth - 40) el.scrollLeft = Math.max(0, x - 80);
  }, [time, scale]);
  // sounds: selected (Delete takes it off), dragged along or across lanes; + and - zoom (not while typing)
  const [sel, setSel] = useState(null);
  const [move, setMove] = useState(null);          // { key, clip, x0, y0, start0, lane0, start, lane, moved }
  const moveNow = useRef(null);          // the same drag's latest, for the pointer's release
  const [say, setSay] = useState("");          // the live line: what a keyboard move did
  // A sound dropped stays where it was dropped until the film's own list says so, the server's fit and the history take a second or more: it jumped back meanwhile, and a
  // second drag from where it had been dropped pressed on the empty lane (T29-10). { key: { start, lane, n } }
  const [held, setHeld] = useState({});
  const heldN = useRef(0);
  const moveTo = (c, to) => {
    const k = keyOf(c), n = ++heldN.current;
    setHeld((h) => ({ ...h, [k]: { start: to.start ?? c.start, lane: to.lane ?? c.lane, n } }));
    Promise.resolve(onAudioMove(c, to)).finally(() => setHeld((h) => { if (h[k]?.n !== n) return h; const { [k]: _gone, ...rest } = h; return rest; }));
  };
  const rowsRef = useRef({});
  const audio = data?.audio ?? [];
  const selClip = audio.find((c) => keyOf(c) === sel) ?? null;
  useEffect(() => { if (sel && !selClip) setSel(null); }, [data]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const k = (e) => {
      const el = document.activeElement;
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(el?.tagName ?? "") || el?.isContentEditable || document.querySelector(".sheet-overlay")) return;
      if ((e.key === "+" || e.key === "=") && !e.ctrlKey && !e.metaKey) { e.preventDefault(); setPps(Math.min(400, scale * 1.4)); }
      else if ((e.key === "-" || e.key === "_") && !e.ctrlKey && !e.metaKey) { e.preventDefault(); setPps(Math.max(2, scale / 1.4)); }
      else if ((e.key === "Delete" || e.key === "Backspace") && selClip && onAudioRemove && !locked) { e.preventDefault(); onAudioRemove(selClip); setSel(null); }
      else if (e.key === "Escape" && sel) setSel(null);
    };
    addEventListener("keydown", k);
    return () => removeEventListener("keydown", k);
  }, [scale, selClip, sel, locked, onAudioRemove]); // eslint-disable-line react-hooks/exhaustive-deps
  const laneAt = (y) => { for (const [ln, el] of Object.entries(rowsRef.current)) { const r = el?.getBoundingClientRect(); if (r && y >= r.top && y <= r.bottom) return ln; } return null; };
  // a sound from the Assets tab over a sound lane: { lane, start } (the drag carries only SOUND_MIME, so a picture or a file from Explorer
  // finds no drop target); on a locked film or one shown as its render nothing takes a drop
  const canDrop = !!onSoundDrop && !locked && !readOnly;
  const [over, setOver] = useState(null);
  const overAt = (e) => {
    if (!canDrop || ![...(e.dataTransfer?.types ?? [])].includes(SOUND_MIME)) return null;
    const ln = laneAt(e.clientY);
    return ln && DROP_LANE[ln] ? { lane: ln, start: at(e.clientX) } : null;
  };
  const dragOver = (e) => {
    const o = overAt(e);
    setOver((x) => (x?.lane === o?.lane && x?.start === o?.start ? x : o));
    if (o) { e.preventDefault(); e.dataTransfer.dropEffect = "copy"; }
  };
  const dragLeave = (e) => { const r = lane.current.getBoundingClientRect(); if (e.clientX <= r.left || e.clientX >= r.right || e.clientY <= r.top || e.clientY >= r.bottom) setOver(null); };
  const drop = (e) => {
    const o = overAt(e), path = e.dataTransfer.getData(SOUND_MIME);
    setOver(null);
    if (!o || !path) return;
    e.preventDefault();
    onSoundDrop(path, { start: o.start, lane: DROP_LANE[o.lane] });
  };
  useEffect(() => {          // a drag that ends anywhere else (Esc, outside the window) leaves no lit lane behind
    if (!over) return;
    const end = () => setOver(null);
    addEventListener("dragend", end); addEventListener("drop", end);
    return () => { removeEventListener("dragend", end); removeEventListener("drop", end); };
  }, [!!over]); // eslint-disable-line react-hooks/exhaustive-deps
  const dropLine = (ln) => over?.lane === ln && <DropLine x={px(over.start)} time={clockTenths(over.start)} end={px(over.start) > width - 56} />;
  const dropRow = (ln) => (canDrop ? { "data-drop": DROP_LANE[ln] } : null);
  const grab = (c) => (e) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    setSel(keyOf(c));
    if (locked || !onAudioMove) return;
    const m0 = { key: keyOf(c), clip: c, x0: e.clientX, y0: e.clientY, start0: c.start, lane0: c.lane, start: c.start, lane: c.lane, moved: false };
    moveNow.current = m0;
    setMove(m0);
  };
  useEffect(() => {
    if (!move) return;
    const mv = (e) => {
      if (!moveNow.current) return;          // released a moment ago
      const dx = e.clientX - move.x0, dy = e.clientY - move.y0;
      // within the film: a clip stops where it ends with the film, as the Sounds drawer's Add moves one back
      const latest = latestStart(move.clip, data?.duration || D, move.start0, 1 / fps);
      // (a drag across the lanes only is no move in time, not even to the nearest frame)
      const start = Math.abs(dx) <= 3 ? move.start0 : Math.min(latest, Math.max(0, Math.round((move.start0 + dx / scale) * fps) / fps));
      // a sound effect stays on its lane: on Narration it would shift the voice's lines, on Music it would become the film's music (T29-5)
      const over = laneAt(e.clientY) ?? move.lane0, lane = move.clip.effect && over !== "sfx" ? move.lane0 : over;
      const m = { ...moveNow.current, start, lane, off: !!move.clip.effect && over !== "sfx", moved: moveNow.current.moved || Math.abs(dx) > 3 || Math.abs(dy) > 6 };
      moveNow.current = m;
      setMove(m);
    };
    const up = () => {
      const m = moveNow.current;
      moveNow.current = null;
      setMove(null);
      if (m?.moved && m.off) toast(t("A sound effect stays on the SFX lane. To use its file as the voice or the music, drop it there from Assets."));
      if (m?.moved && (Math.abs(m.start - m.start0) > 1e-3 || m.lane !== m.lane0)) moveTo(m.clip, { start: m.start !== m.start0 ? m.start : null, lane: m.lane !== m.lane0 ? m.lane : null });
    };
    addEventListener("pointermove", mv); addEventListener("pointerup", up);
    return () => { removeEventListener("pointermove", mv); removeEventListener("pointerup", up); };
  }, [move?.key, scale]); // eslint-disable-line react-hooks/exhaustive-deps
  const clipsIn = (ln) => audio.map((c) => (move && keyOf(c) === move.key ? { ...c, start: move.start, lane: move.lane, moving: true } : held[keyOf(c)] ? { ...c, start: held[keyOf(c)].start, lane: held[keyOf(c)].lane } : c)).filter((c) => c.lane === ln);
  // a sound moves without a mouse too (WCAG 2.2, 2.5.7): focus it, ←/→ one frame, Shift+←/→ one second, ↑/↓ the lane
  // next to it; Delete takes it off. Each move is said in the live line below the lanes.
  const LANES = ["voice", "sfx", "music"];
  const nudge = (c) => (e) => {
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key) || locked || !onAudioMove || e.ctrlKey || e.metaKey || e.altKey) return;
    e.preventDefault(); e.stopPropagation();          // the player's own arrow keys (a frame of the film) do not run as well
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      const step = (e.shiftKey ? 1 : 1 / fps) * (e.key === "ArrowLeft" ? -1 : 1);
      const start = Math.min(latestStart(c, data?.duration || D, c.start, 1 / fps), Math.max(0, Math.round((c.start + step) * fps) / fps));
      if (Math.abs(start - c.start) < 1e-6) return;
      moveTo(c, { start, lane: null });
      setSay(t("{name} starts at {time}", { name: soundName(c), time: fmtTime(start, fps) }));
    } else {
      const lane = LANES[LANES.indexOf(c.lane) + (e.key === "ArrowUp" ? -1 : 1)];
      if (!lane) return;
      if (c.effect && lane !== "sfx") { setSay(t("A sound effect stays on the SFX lane. To use its file as the voice or the music, drop it there from Assets.")); return; }
      moveTo(c, { start: null, lane });
      setSay(t("{name} moved to {lane}", { name: soundName(c), lane: t(NAME[lane]) }));
    }
  };
  // the SFX lane shows each sound: thin enough not to run into the next one at Fit, its name on it once a zoom gives it the room
  const sfx = cls_sfx(audio);
  const clip = (c, cls, inner = null) => <span key={keyOf(c)} className={`tl-aclip ${cls}` + (cls === "sfx" && isBed(c) ? " bed" : "") + (keyOf(c) === sel ? " sel" : "") + (c.moving ? " moving" : "") + (locked ? " locked" : "")}
    style={{ left: px(c.start), width: Math.max(cls === "sfx" ? 3 : 8, px(c.duration ?? (cls === "sfx" ? 0.3 : D - c.start))), ...(cls === "sfx" ? { "--row": sfx.rowOf(c) } : null) }} title={`${soundName(c)} · ${c.start.toFixed(2)} s`}
    tabIndex={0} role="button" aria-label={t("{name}, starts at {time}; arrow keys move it, Delete takes it off", { name: soundName(c), time: fmtTime(c.start, fps) })}
    onFocus={() => setSel(keyOf(c))} onKeyDown={nudge(c)} onPointerDown={grab(c)}>{inner}</span>;
  const wheel = (e) => { if (e.ctrlKey) { e.preventDefault(); setPps(Math.min(400, Math.max(2, scale * (e.deltaY < 0 ? 1.2 : 1 / 1.2)))); } };
  const px = (s) => s * scale;
  const music = data?.music;
  const hasAudio = !!data?.audio;
  const captions = data?.captions ?? [];
  const canEdit = !!onCaptionSave && !locked;
  const openCue = (host, c) => {
    onSeek(c.start + Math.min(0.2, (c.duration ?? 0.4) / 2));          // a little in: a group fades in from its first frame
    if (canEdit) { setCue({ file: host.file, start: c.start, parts: c.parts }); setCueText(Object.fromEntries(c.parts.map((x) => [x.hfId, x.text]))); }
  };
  const closeCue = () => { setCue(null); setCueText({}); };
  const rows = folded ? ["shots"] : ["shots", "voice", "captions", "sfx", "music"];
  const ICON = { shots: Film, voice: Mic2, captions: Captions, sfx: Sparkles, music: Music };
  const NAME = { shots: "Shots", voice: "Narration", captions: "Captions", sfx: "SFX", music: "Music" };
  return <div className={"tl" + (folded ? " folded" : "")} ref={box}>
    <span className="sr-only" role="status" aria-live="polite">{say}</span>
    <div className="tl-head">
      <span className="tl-name" title={t("Click to jump · drag to scrub · Shift + drag to loop a part · Ctrl + wheel to zoom")}>{t("Timeline")}</span>
      {cue ? <span className="tl-capedit">{cue.parts.map((x) => <input key={x.hfId} autoFocus={x === cue.parts[0]} spellCheck={false} className="input sm" value={cueText[x.hfId] ?? ""} aria-label={t("Caption words")}
        onChange={(e) => { const v = e.target.value; setCueText((o) => ({ ...o, [x.hfId]: v })); onCaptionLive?.(x.hfId, v); }}
        onKeyDown={(e) => { e.stopPropagation(); if (e.key === "Enter") e.currentTarget.blur(); if (e.key === "Escape") { onCaptionLive?.(x.hfId, x.text); closeCue(); } }}
        onBlur={(e) => { const v = e.target.value.trim(); if (!v || v === x.text) { onCaptionLive?.(x.hfId, x.text); if (e.relatedTarget?.closest?.(".tl-capedit") == null) closeCue(); return; }
          onCaptionSave(cue.file, x.hfId, v); if (e.relatedTarget?.closest?.(".tl-capedit") == null) closeCue(); }} />)}</span> : <span className="tl-gap" />}
      {selClip && onAudioRemove && <button className="btn ghost sm" disabled={locked} onClick={() => { onAudioRemove(selClip); setSel(null); }} title={t("Delete key")}>
        <Trash2 size={13} />{t("Take {name} off the timeline", { name: soundName(selClip) })}</button>}
      {range && <button className="clink" onClick={() => onRange(null)}>{t("Clear the loop {a}–{b} s", { a: range[0].toFixed(1), b: range[1].toFixed(1) })}</button>}
      <span className="tl-tools">
        <button className="btn ghost icon sm" onClick={() => setPps(Math.max(2, scale / 1.4))} aria-label={t("Zoom out")}><ZoomOut size={14} /></button>
        <button className="btn ghost icon sm" onClick={() => setPps(Math.min(400, scale * 1.4))} aria-label={t("Zoom in")}><ZoomIn size={14} /></button>
        <button className="btn ghost sm" onClick={() => setPps(0)}>{t("Fit")}</button>
        <button className="btn ghost icon sm" onClick={() => setFolded(!folded)} aria-label={folded ? t("Show all tracks") : t("Fold the timeline")} title={folded ? t("Show all tracks") : t("Fold the timeline")}>
          {folded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</button>
      </span>
    </div>
    <div className="tl-body" ref={scroller} onWheel={wheel} style={{ "--sfx-rows": sfx.rows }}>
      <div className="tl-labels">{["ruler", ...rows].map((k) => { const I = ICON[k]; return <div key={k} className={"tl-label " + k}>{I && <I size={12} />}{NAME[k] ? t(NAME[k]) : ""}</div>; })}</div>
      <div className={"tl-lanes" + (readOnly ? " ro" : "")} ref={lane} style={{ width }} onPointerDown={down}
        onDragOver={canDrop ? dragOver : undefined} onDragLeave={canDrop ? dragLeave : undefined} onDrop={canDrop ? drop : undefined}
        title={readOnly ? t("Click a shot to jump to its start") : t("Click to jump · drag to scrub · Shift + drag to loop a part · Ctrl + wheel to zoom")}>
        <div className="tl-ruler num">{ticks.map((s) => <i key={s} style={{ left: px(s) }}>{s % 1 ? s.toFixed(1) : `${s}s`}</i>)}
          {(data?.qc ?? []).map((q, i) => <button key={i} className={"tl-qc" + (q.blocking ? " stop" : "")} style={{ left: px(q.time) }} title={qcSay(t, q)}
            onPointerDown={(e) => { e.stopPropagation(); onSeek(q.time); }} aria-label={`${q.title} ${q.time}s`} />)}</div>
        <div className="tl-row shots">{(data?.shots ?? []).map((s) => { const pic = posters?.find((x) => x.number === s.number)?.url; return <button key={s.mountId ?? s.number} className={"tl-shot" + (shot?.number === s.number ? " sel" : "") + (pic ? " pic" : "") + (s.planned ? " planned" : "")}
          style={{ left: px(s.start) + 2, width: Math.max(2, px(s.duration ?? 0) - 4), ...(pic ? { backgroundImage: `url("${pic}")` } : null) }} title={`${t("Shot {n}", { n: s.number })} · ${s.title} · ${(s.duration ?? 0).toFixed(1)} s${s.rate !== 1 ? ` · ${s.rate}×` : ""}`}
          onPointerDown={(e) => { if (!e.shiftKey && e.button === 0) { onShot(s); if (readOnly) onSeek(s.start); } }}><span className="tl-chip"><b className="num">{s.number}</b> {s.title}</span></button>; })}</div>
        {!folded && <>
          <div className={"tl-row voice" + (over?.lane === "voice" ? " drop-on" : "")} {...dropRow("voice")} ref={(el) => { rowsRef.current.voice = el; }}>{hasAudio && clipsIn("voice").map((c) => clip(c, "voice"))}
            {(data?.voice ?? []).map((v, i) => <span key={i} className="tl-word" style={{ left: px(v.start), width: Math.max(2, px(v.end - v.start) - 1) }} title={v.text}>{v.text}</span>)}
            {!data?.voice?.length && !(hasAudio && clipsIn("voice").length) && <span className="tl-empty">{t("No voice-over")}</span>}{dropLine("voice")}</div>
          <div className="tl-row captions">{captions.flatMap((h) => (h.cues?.length ? h.cues.map((c) => <button key={`${h.id}@${c.start}`} type="button" className={"tl-cap" + (cue?.start === c.start ? " sel" : "")}
              style={{ left: px(c.start), width: Math.max(2, px(c.duration ?? 1)) }} title={canEdit ? `${c.text} · ${t("Click to change the words")}` : c.text} onPointerDown={(e) => e.stopPropagation()} onClick={() => openCue(h, c)}>{c.text}</button>)
            // words a script builds: the track shows where they are, Claude changes them
            : [<span key={h.id ?? h.start} className="tl-cap whole" style={{ left: px(h.start), width: Math.max(2, px(h.duration ?? D - h.start)) }} title={t("These captions are made by a script: ask Claude to change them")}>{t("Captions")}</span>]))}
            {!captions.length && <span className="tl-empty">{t("No captions")}</span>}</div>
          <div className={"tl-row sfx" + (over?.lane === "sfx" ? " drop-on" : "")} {...dropRow("sfx")} ref={(el) => { rowsRef.current.sfx = el; }}>{hasAudio ? clipsIn("sfx").map((c) => clip(c, "sfx", px(c.duration ?? 0.3) >= 44 ? <span className="tl-aname">{soundName(c)}</span> : null))
            : (data?.sfx ?? []).map((x, i) => <span key={i} className="tl-tick" style={{ left: px(x.start), width: Math.max(6, px(x.duration ?? 0.3)) }} title={`${x.name} · ${x.start.toFixed(2)} s`} />)}
            {!(hasAudio ? clipsIn("sfx").length : data?.sfx?.length) && <span className="tl-empty">{t("No sound effects")}</span>}{dropLine("sfx")}</div>
          <div className={"tl-row music" + (over?.lane === "music" ? " drop-on" : "")} {...dropRow("music")} ref={(el) => { rowsRef.current.music = el; }}>{hasAudio ? clipsIn("music").map((c) => clip(c, "music",
            music?.peaks?.length && c.name === music.name ? <svg viewBox={`0 0 ${music.peaks.length} 100`} preserveAspectRatio="none" aria-hidden="true"><path d={wave(music.peaks)} /></svg> : null))
            : music ? <span className="tl-music" style={{ left: px(music.start), width: px(music.duration ?? D) }} title={music.name}>
              {music.peaks?.length ? <svg viewBox={`0 0 ${music.peaks.length} 100`} preserveAspectRatio="none" aria-hidden="true"><path d={wave(music.peaks)} /></svg> : null}</span> : null}
            {!(hasAudio ? clipsIn("music").length : music) && <span className="tl-empty">{t("No music")}</span>}{dropLine("music")}</div>
        </>}
        {range && <div className="tl-range" style={{ left: px(range[0]), width: Math.max(2, px(range[1] - range[0])) }} />}
        <div className="tl-head-line" style={{ left: px(time) }} />
      </div>
    </div>
  </div>;
}

/** A filled waveform path from peaks (0..1), half the clip's height. */
/** A tech check's finding in plain words (`plain`); the checker's own wording (transformOrigin, svgOrigin…) is for Claude */
export const qcSay = (t, q) => q.plain || (q.blocking ? t("A tech check found a problem here that stops the render. Open Tech checks for details.")
  : t("A tech check found something to look at here. Open Tech checks for details."));

function wave(peaks) {
  const n = peaks.length;
  const top = peaks.map((v, i) => `${i},${50 - Math.min(1, Math.abs(v)) * 24}`).join(" L");
  const bot = peaks.map((v, i) => `${n - 1 - i},${50 + Math.min(1, Math.abs(peaks[n - 1 - i])) * 24}`).join(" L");
  return `M${top} L${bot} Z`;
}
