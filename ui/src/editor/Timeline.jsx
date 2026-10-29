// The Editor's timeline, for reading the film, not for cutting it: Shots, the voice-over's lines, the sound effects, the
// music with its waveform, and the last Checks run's findings as dots. Click to jump; drag to scrub; Shift + drag marks a part to loop;
// a shot's block selects that shot for Claude; Ctrl + wheel or − / + / Fit zoom. The fold button leaves only the Shots row. The how-to
// line is the lanes' tooltip (less text on screen). Colours after HF Studio's own timeline
// (packages/studio/src/styles/theme.css @ 490ecaf, Apache-2.0): a shot shows its picture under a dark name chip, the voice in teal, the
// sound effects in blue, the music as a clip with a white waveform; the lanes grow with the timeline's height (the user drags it).
// Sounds are clips as in HF Studio (HF 490ecaf packages/studio/src/player/components/timelineClipDragCommit.ts):
// drag one along its lane or onto another lane (Narration, SFX, Music), click to select it, Delete takes it off the timeline (the file
// stays in Assets). + and - zoom, not while typing.
import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp, Film, Mic2, Music, Sparkles, Trash2, ZoomIn, ZoomOut } from "lucide-react";
import { usePref } from "../lib.jsx";
import { useT } from "../i18n.jsx";
import { fmtTime } from "./Player.jsx";

const LABEL = 116;          // the label column, wide enough for "NARRATION"

const keyOf = (c) => c.hfId || c.id || `${c.src}@${c.start}`;

export default function Timeline({ data, time, duration, shot, onSeek, onShot, range, onRange, posters = null, fps = 30, locked = false, onAudioMove = null, onAudioRemove = null,
  readOnly = false }) {
  const t = useT();
  const [pps, setPps] = usePref("editor:tl-pps", 0);          // pixels per second; 0 = fit
  const [folded, setFolded] = usePref("editor:tl-folded", false);
  const box = useRef(null);
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
  const at = (clientX) => { const r = lane.current.getBoundingClientRect(); return Math.max(0, Math.min(D, Math.round(((clientX - r.left) / scale) * fps) / fps)); };
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
  const [move, setMove] = useState(null);
  const [say, setSay] = useState("");          // the live line: what a keyboard move did          // { key, clip, x0, y0, start0, lane0, start, lane, moved }
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
  const grab = (c) => (e) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    setSel(keyOf(c));
    if (locked || !onAudioMove) return;
    setMove({ key: keyOf(c), clip: c, x0: e.clientX, y0: e.clientY, start0: c.start, lane0: c.lane, start: c.start, lane: c.lane, moved: false });
  };
  useEffect(() => {
    if (!move) return;
    const mv = (e) => {
      const dx = e.clientX - move.x0, dy = e.clientY - move.y0;
      const start = Math.max(0, Math.round((move.start0 + dx / scale) * fps) / fps);
      const lane = laneAt(e.clientY) ?? move.lane0;
      setMove((m) => (m ? { ...m, start, lane, moved: m.moved || Math.abs(dx) > 3 || Math.abs(dy) > 6 } : m));
    };
    const up = () => {
      setMove((m) => {
        if (m?.moved && (Math.abs(m.start - m.start0) > 1e-3 || m.lane !== m.lane0)) onAudioMove(m.clip, { start: m.start !== m.start0 ? m.start : null, lane: m.lane !== m.lane0 ? m.lane : null });
        return null;
      });
    };
    addEventListener("pointermove", mv); addEventListener("pointerup", up);
    return () => { removeEventListener("pointermove", mv); removeEventListener("pointerup", up); };
  }, [move?.key, scale]); // eslint-disable-line react-hooks/exhaustive-deps
  const clipsIn = (ln) => audio.map((c) => (move && keyOf(c) === move.key ? { ...c, start: move.start, lane: move.lane, moving: true } : c)).filter((c) => c.lane === ln);
  // a sound moves without a mouse too (WCAG 2.2, 2.5.7): focus it, ←/→ one frame, Shift+←/→ one second, ↑/↓ the lane
  // next to it; Delete takes it off. Each move is said in the live line below the lanes.
  const LANES = ["voice", "sfx", "music"];
  const nudge = (c) => (e) => {
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key) || locked || !onAudioMove || e.ctrlKey || e.metaKey || e.altKey) return;
    e.preventDefault(); e.stopPropagation();          // the player's own arrow keys (a frame of the film) do not run as well
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      const step = (e.shiftKey ? 1 : 1 / fps) * (e.key === "ArrowLeft" ? -1 : 1);
      const start = Math.max(0, Math.round((c.start + step) * fps) / fps);
      if (Math.abs(start - c.start) < 1e-6) return;
      onAudioMove(c, { start, lane: null });
      setSay(t("{name} starts at {time}", { name: c.name, time: fmtTime(start, fps) }));
    } else {
      const lane = LANES[LANES.indexOf(c.lane) + (e.key === "ArrowUp" ? -1 : 1)];
      if (!lane) return;
      onAudioMove(c, { start: null, lane });
      setSay(t("{name} moved to {lane}", { name: c.name, lane: t(NAME[lane]) }));
    }
  };
  const clip = (c, cls, inner = null) => <span key={keyOf(c)} className={`tl-aclip ${cls}` + (keyOf(c) === sel ? " sel" : "") + (c.moving ? " moving" : "") + (locked ? " locked" : "")}
    style={{ left: px(c.start), width: Math.max(8, px(c.duration ?? (cls === "sfx" ? 0.3 : D - c.start))) }} title={`${c.name} · ${c.start.toFixed(2)} s`}
    tabIndex={0} role="button" aria-label={t("{name}, starts at {time}; arrow keys move it, Delete takes it off", { name: c.name, time: fmtTime(c.start, fps) })}
    onFocus={() => setSel(keyOf(c))} onKeyDown={nudge(c)} onPointerDown={grab(c)}>{inner}</span>;
  const wheel = (e) => { if (e.ctrlKey) { e.preventDefault(); setPps(Math.min(400, Math.max(2, scale * (e.deltaY < 0 ? 1.2 : 1 / 1.2)))); } };
  const px = (s) => s * scale;
  const music = data?.music;
  const hasAudio = !!data?.audio;
  const rows = folded ? ["shots"] : ["shots", "voice", "sfx", "music"];
  const ICON = { shots: Film, voice: Mic2, sfx: Sparkles, music: Music };
  const NAME = { shots: "Shots", voice: "Narration", sfx: "SFX", music: "Music" };
  return <div className={"tl" + (folded ? " folded" : "")} ref={box}>
    <span className="sr-only" role="status" aria-live="polite">{say}</span>
    <div className="tl-head">
      <span className="tl-name" title={t("Click to jump · drag to scrub · Shift + drag to loop a part · Ctrl + wheel to zoom")}>{t("Timeline")}</span>
      <span className="tl-gap" />
      {selClip && onAudioRemove && <button className="btn ghost sm" disabled={locked} onClick={() => { onAudioRemove(selClip); setSel(null); }} title={t("Delete key")}>
        <Trash2 size={13} />{t("Take {name} off the timeline", { name: selClip.name })}</button>}
      {range && <button className="clink" onClick={() => onRange(null)}>{t("Clear the loop {a}–{b} s", { a: range[0].toFixed(1), b: range[1].toFixed(1) })}</button>}
      <span className="tl-tools">
        <button className="btn ghost icon sm" onClick={() => setPps(Math.max(2, scale / 1.4))} aria-label={t("Zoom out")}><ZoomOut size={14} /></button>
        <button className="btn ghost icon sm" onClick={() => setPps(Math.min(400, scale * 1.4))} aria-label={t("Zoom in")}><ZoomIn size={14} /></button>
        <button className="btn ghost sm" onClick={() => setPps(0)}>{t("Fit")}</button>
        <button className="btn ghost icon sm" onClick={() => setFolded(!folded)} aria-label={folded ? t("Show all tracks") : t("Fold the timeline")} title={folded ? t("Show all tracks") : t("Fold the timeline")}>
          {folded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</button>
      </span>
    </div>
    <div className="tl-body" ref={scroller} onWheel={wheel}>
      <div className="tl-labels">{["ruler", ...rows].map((k) => { const I = ICON[k]; return <div key={k} className={"tl-label " + k}>{I && <I size={12} />}{NAME[k] ? t(NAME[k]) : ""}</div>; })}</div>
      <div className={"tl-lanes" + (readOnly ? " ro" : "")} ref={lane} style={{ width }} onPointerDown={down}
        title={readOnly ? t("Click a shot to jump to its start") : t("Click to jump · drag to scrub · Shift + drag to loop a part · Ctrl + wheel to zoom")}>
        <div className="tl-ruler num">{ticks.map((s) => <i key={s} style={{ left: px(s) }}>{s % 1 ? s.toFixed(1) : `${s}s`}</i>)}
          {(data?.qc ?? []).map((q, i) => <button key={i} className={"tl-qc" + (q.blocking ? " stop" : "")} style={{ left: px(q.time) }} title={qcSay(t, q)}
            onPointerDown={(e) => { e.stopPropagation(); onSeek(q.time); }} aria-label={`${q.title} ${q.time}s`} />)}</div>
        <div className="tl-row shots">{(data?.shots ?? []).map((s) => { const pic = posters?.find((x) => x.number === s.number)?.url; return <button key={s.mountId ?? s.number} className={"tl-shot" + (shot?.number === s.number ? " sel" : "") + (pic ? " pic" : "") + (s.planned ? " planned" : "")}
          style={{ left: px(s.start) + 2, width: Math.max(2, px(s.duration ?? 0) - 4), ...(pic ? { backgroundImage: `url("${pic}")` } : null) }} title={`${t("Shot {n}", { n: s.number })} · ${s.title} · ${(s.duration ?? 0).toFixed(1)} s${s.rate !== 1 ? ` · ${s.rate}×` : ""}`}
          onPointerDown={(e) => { if (!e.shiftKey && e.button === 0) { onShot(s); if (readOnly) onSeek(s.start); } }}><span className="tl-chip"><b className="num">{s.number}</b> {s.title}</span></button>; })}</div>
        {!folded && <>
          <div className="tl-row voice" ref={(el) => { rowsRef.current.voice = el; }}>{hasAudio && clipsIn("voice").map((c) => clip(c, "voice"))}
            {(data?.voice ?? []).map((v, i) => <span key={i} className="tl-word" style={{ left: px(v.start), width: Math.max(2, px(v.end - v.start) - 1) }} title={v.text}>{v.text}</span>)}
            {!data?.voice?.length && !(hasAudio && clipsIn("voice").length) && <span className="tl-empty">{t("No voice-over")}</span>}</div>
          <div className="tl-row sfx" ref={(el) => { rowsRef.current.sfx = el; }}>{hasAudio ? clipsIn("sfx").map((c) => clip(c, "sfx"))
            : (data?.sfx ?? []).map((x, i) => <span key={i} className="tl-tick" style={{ left: px(x.start), width: Math.max(6, px(x.duration ?? 0.3)) }} title={`${x.name} · ${x.start.toFixed(2)} s`} />)}
            {!(hasAudio ? clipsIn("sfx").length : data?.sfx?.length) && <span className="tl-empty">{t("No sound effects")}</span>}</div>
          <div className="tl-row music" ref={(el) => { rowsRef.current.music = el; }}>{hasAudio ? clipsIn("music").map((c) => clip(c, "music",
            music?.peaks?.length && c.name === music.name ? <svg viewBox={`0 0 ${music.peaks.length} 100`} preserveAspectRatio="none" aria-hidden="true"><path d={wave(music.peaks)} /></svg> : null))
            : music ? <span className="tl-music" style={{ left: px(music.start), width: px(music.duration ?? D) }} title={music.name}>
              {music.peaks?.length ? <svg viewBox={`0 0 ${music.peaks.length} 100`} preserveAspectRatio="none" aria-hidden="true"><path d={wave(music.peaks)} /></svg> : null}</span> : null}
            {!(hasAudio ? clipsIn("music").length : music) && <span className="tl-empty">{t("No music")}</span>}</div>
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
