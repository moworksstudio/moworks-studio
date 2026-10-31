// The sounds drawer, the motion drawer's sibling: it opens in the timeline's place (over the table in The Studio), as tall as the timeline, so
// the film keeps its size. One list: the sounds that ship with the app at once, then what the online services find. Each row plays and stops on its
// own, never touching the film; Add puts the sound on the film at the playhead. × or Escape closes it and the timeline comes back; on The Desk,
// where the drawer covers the timeline, a thin strip shows the film's sound effects and moves the playhead.
import { memo, useEffect, useMemo, useRef, useState } from "react";
import { Check, CloudOff, Loader2, Play, Plus, Search, Square, X } from "lucide-react";
import { get } from "../api.js";
import { usePref, useToast } from "../lib.jsx";
import { useT } from "../i18n.jsx";
import { clockTenths } from "./Timeline.jsx";

// the kinds a person looks for (the server's SOUND_GROUPS): they sort the app's own sounds
const GROUPS = [["all", "All"], ["whooshes", "Whooshes"], ["hits", "Hits & pops"], ["clicks", "Clicks & keys"], ["bells", "Bells & magic"], ["things", "Everyday things"], ["nature", "Nature"], ["places", "Crowds & places"]];
const PAGE = 60;

/** A sound's length as people read it: "0.3 s", "4 s", "1:05". */
export const lengthOf = (s) => {
  if (s == null || !Number.isFinite(Number(s))) return "";
  const v = Number(s);
  if (v < 10) return `${Math.max(0.1, Math.round(v * 10) / 10)} s`;
  const n = Math.round(v);
  return `${Math.floor(n / 60)}:${String(n % 60).padStart(2, "0")}`;
};

/** One audio element for the drawer: a row plays and stops; another row's play stops the one before. The film has its own sound and is left alone. */
function usePreview(onFail) {
  const ref = useRef(null);
  const [on, setOn] = useState(null);          // the id playing
  useEffect(() => {
    const a = new Audio();
    a.preload = "none"; a.volume = 0.8;
    const stop = () => setOn(null);
    a.addEventListener("ended", stop);
    a.addEventListener("error", () => { if (a.getAttribute("src")) { setOn(null); onFail(); } });
    ref.current = a;
    return () => { a.pause(); a.removeAttribute("src"); a.load(); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const toggle = (row) => {
    const a = ref.current;
    if (!a) return;
    a.pause();
    if (on === row.id) { a.currentTime = 0; setOn(null); return; }
    a.src = row.url; setOn(row.id);
    a.play().catch((e) => { if (e?.name !== "AbortError") { setOn(null); onFail(); } });
  };
  return { on, toggle };
}

const Row = memo(function Row({ row, playing, adding, added, off, onToggle, onAdd }) {
  const t = useT();
  const online = row.source === "openverse" || row.source === "sfxmint";
  return <li className={"sdr-item" + (playing ? " on" : "")} title={row.licence ? `${row.title} · ${row.licence}` : row.title}>
    <button type="button" className="btn ghost icon sm sdr-play" onClick={() => onToggle(row)} aria-pressed={playing} aria-label={playing ? t("Stop {name}", { name: row.title }) : t("Play {name}", { name: row.title })}>
      {playing ? <Square size={13} fill="currentColor" /> : <Play size={14} />}</button>
    <span className="sdr-t"><span className="sdr-name">{row.title}</span>
      <span className="sdr-sub"><span className="num">{lengthOf(row.durationS)}</span>{online && <span>{t("Online")}</span>}</span></span>
    <button type="button" className="btn sm sdr-add" disabled={!!off || adding} onClick={() => onAdd(row)} title={off ?? t("Add at the playhead")}>
      {adding ? <Loader2 size={13} className="spin" /> : added ? <Check key="ok" size={13} className="icon-pop" /> : <Plus size={13} />}{t("Add")}</button>
  </li>;
});

/** The film's length with its sound effects on it and the playhead: a click or the arrows move the playhead. */
function Strip({ clips, time, duration, onSeek }) {
  const t = useT();
  if (!(duration > 0)) return null;
  const pc = (s) => `${Math.min(100, Math.max(0, (s / duration) * 100))}%`;
  const at = (e) => { const r = e.currentTarget.getBoundingClientRect(); onSeek(Math.max(0, Math.min(duration, ((e.clientX - r.left) / r.width) * duration))); };
  const key = (e) => { const d = e.key === "ArrowLeft" ? -1 : e.key === "ArrowRight" ? 1 : 0; if (d) { e.preventDefault(); onSeek(Math.max(0, Math.min(duration, time + d))); } };
  return <div className="sdr-strip" role="slider" tabIndex={0} aria-label={t("Playhead")} aria-valuemin={0} aria-valuemax={Math.round(duration)} aria-valuenow={Math.round(time)} aria-valuetext={clockTenths(time)} onClick={at} onKeyDown={key} title={t("Click to move the playhead")}>
    {clips.map((c) => <i key={c.hfId || c.id || `${c.src}@${c.start}`} className={/^el-clip-/.test(c.id ?? "") ? "mine" : ""} style={{ left: pc(c.start), width: `max(2px, ${pc(c.duration ?? 0.3)})` }} />)}
    <b style={{ left: pc(time) }} />
  </div>;
}

export default function SoundDrawer({ time = 0, duration = 0, clips = [], off = null, strip = true, onSeek, onAdd, onClose }) {
  const t = useT();
  const toast = useToast();
  const [group, setGroup] = usePref("editor:sound-group", "all");
  const [q, setQ] = useState(""), [dq, setDq] = useState("");
  const [local, setLocal] = useState(null);
  const [net, setNet] = useState({ status: "idle", results: [] });          // idle | running | ok | down
  const [again, setAgain] = useState(0);
  const [n, setN] = useState(PAGE);
  const [adding, setAdding] = useState(null);
  const [done, setDone] = useState(null);
  const list = useRef(null), now = useRef(time);
  now.current = time;
  const { on, toggle } = usePreview(() => toast(t("That sound cannot play right now."), "error"));
  useEffect(() => { const h = setTimeout(() => setDq(q.trim()), 300); return () => clearTimeout(h); }, [q]);
  useEffect(() => { const k = (e) => { if (e.key === "Escape" && !document.querySelector(".sheet-overlay")) onClose(); }; addEventListener("keydown", k); return () => removeEventListener("keydown", k); }, [onClose]);
  useEffect(() => { setN(PAGE); list.current?.scrollTo({ top: 0 }); }, [group, dq]);
  useEffect(() => {
    let alive = true;
    get(`/api/sfx/search?q=${encodeURIComponent(dq)}&group=${encodeURIComponent(group)}`).then((r) => { if (alive) setLocal(r.results); }).catch(() => { if (alive) setLocal([]); });
    return () => { alive = false; };
  }, [dq, group]);
  // online on its own request: the app's own sounds never wait on a service that does not answer
  useEffect(() => {
    if (!dq) { setNet({ status: "idle", results: [] }); return undefined; }
    const c = new AbortController();
    setNet({ status: "running", results: [] });
    get(`/api/sfx/search/online?q=${encodeURIComponent(dq)}${again ? "&again=1" : ""}`, { signal: c.signal }).then((r) => setNet({ status: r.status, results: r.results }))
      .catch(() => { if (!c.signal.aborted) setNet({ status: "down", results: [] }); });
    return () => c.abort();
  }, [dq, again]);
  const rows = useMemo(() => [...(local ?? []), ...net.results], [local, net.results]);
  const add = async (row) => {
    setAdding(row.id);
    try { await onAdd(row, now.current); setDone(row.id); setTimeout(() => setDone((x) => (x === row.id ? null : x)), 1600); }
    catch (e) { toast(e.message, "error"); }
    finally { setAdding(null); }
  };
  const more = (e) => { const el = e.currentTarget; if (el.scrollTop + el.clientHeight > el.scrollHeight - 200 && n < rows.length) setN((x) => x + PAGE); };
  const nothing = local !== null && !rows.length && net.status !== "running" && net.status !== "down";
  return <div className="mdr sdr" role="dialog" aria-label={t("Sounds")}>
    <div className="mdr-head">
      <b className="mdr-title">{t("Sounds")}</b>
      <div className="mdr-groups" role="group" aria-label={t("Kind")}>{GROUPS.map(([k, label]) => <button key={k} className="mdr-chip" aria-pressed={group === k} onClick={() => setGroup(k)}>{t(label)}</button>)}</div>
      <label className="mdr-search"><Search size={13} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("Search sounds")} aria-label={t("Search the sounds")} /></label>
      <span className="mdr-for">{t("Adds at {time}", { time: clockTenths(time) })}</span>
      <span className="mdr-count num">{rows.length}</span>
      <button className="btn ghost icon sm" onClick={onClose} aria-label={t("Close the sounds")} title={t("Close (Esc)")}><X size={15} /></button>
    </div>
    {strip && <Strip clips={clips} time={time} duration={duration} onSeek={onSeek} />}
    <ul className="plain mdr-row sdr-list" ref={list} onScroll={more} aria-busy={local === null || net.status === "running"}>
      {off && <li className="sdr-note">{off}</li>}
      {local === null && Array.from({ length: 6 }, (_, i) => <li key={i} className="sdr-item skeleton" />)}
      {rows.slice(0, n).map((row) => <Row key={row.id} row={row} playing={on === row.id} adding={adding === row.id} added={done === row.id} off={off} onToggle={toggle} onAdd={add} />)}
      {net.status === "running" && <li className="sdr-note" role="status"><Loader2 size={13} className="spin" />{t("Searching online…")}</li>}
      {net.status === "down" && <li className="sdr-note warn" role="status"><CloudOff size={13} />{t("The online sound services are not answering. The app's own sounds still work.")}
        <button type="button" className="clink" onClick={() => setAgain((x) => x + 1)}>{t("Try again")}</button></li>}
      {nothing && <li className="sdr-note">{t("Nothing found. Try another word or kind.")}</li>}
    </ul>
  </div>;
}
