// SHOTS, at the top of the Editor's left column (above the Pipeline): each shot's picture, number, name, start · length and
// file. A click jumps there and makes the shot Claude's target. The selected shot opens a small panel of its own (compact,
// set apart by colour, no speed): its length (HF's data-duration; later shots move with it) and its words on screen, one slim line each
// (the same hand edit as the card on the frame; a click on a word selects it in the film). A film drawn by code (one page, no mounted
// scene) shows the words its code draws in that shot instead (codeText.jsx).
import { useCallback, useEffect, useState } from "react";
import { Film, Loader2 } from "lucide-react";
import { get, post } from "../api.js";
import { useToast } from "../lib.jsx";
import { useT } from "../i18n.jsx";
import { CodeWords } from "./codeText.jsx";

const sec = (n) => (n == null ? "–" : `${Number(n).toFixed(1)} s`);
const clock = (s) => { s = Math.max(0, s || 0); const m = Math.floor(s / 60); return `${m}:${(s - m * 60).toFixed(1).padStart(4, "0")}`; };

function Words({ projectId, shot, locked, send, onChanged, version }) {
  const t = useT();
  const toast = useToast();
  const [list, setList] = useState(null);
  const [vals, setVals] = useState({});
  const load = useCallback(() => {
    if (!shot.src) { setList([]); return; }
    get(`/api/projects/${projectId}/edit/texts?file=${encodeURIComponent(shot.src)}`).then((r) => { setList(r.texts); setVals(Object.fromEntries(r.texts.map((x) => [x.hfId, x.text]))); }).catch(() => setList([]));
  }, [projectId, shot.src]);
  useEffect(load, [load, version]);
  if (list === null) return <div className="skeleton" style={{ height: "1.6rem" }} />;
  if (!list.length) return <p className="sl-note">{t("This shot has no words to edit here. For words made by code, ask Claude.")}</p>;
  return <div className="sl-words">{list.map((x) => <input key={x.hfId} className={"input sm sl-word" + (x.edited ? " edited" : "")} value={vals[x.hfId] ?? ""} disabled={locked} aria-label={t("Words")}
    onFocus={() => send("select", { hfId: x.hfId, file: shot.src })}
    onChange={(e) => { setVals((v) => ({ ...v, [x.hfId]: e.target.value })); send("live", { hfId: x.hfId, text: e.target.value }); }}
    onBlur={async (e) => { const v = e.target.value.trim(); if (!v || v === x.text) { send("live", { hfId: x.hfId, text: x.text }); setVals((o) => ({ ...o, [x.hfId]: x.text })); return; }
      try { const r = await post(`/api/projects/${projectId}/edit/text`, { file: shot.src, hfId: x.hfId, text: v }); toast(t("Words saved")); onChanged(!!r.reload); send("describe"); load(); } catch (er) { toast(er.message, "error"); load(); } }}
    onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }} />)}</div>;
}

function Timing({ projectId, shot, locked, onChanged }) {
  const t = useT();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const set = async (body) => {
    setBusy(true);
    try { await post(`/api/projects/${projectId}/edit/shot`, { mountId: shot.mountId, index: shot.index, number: shot.number, ...body }); toast(t("Shot {n} changed", { n: shot.number })); onChanged(true); }
    catch (e) { toast(e.message, "error"); } finally { setBusy(false); }
  };
  return <div className="sl-timing">
    <label><span>{t("Shot length")}</span><input className="sl-len num" type="number" step="0.1" min="0.2" defaultValue={shot.duration?.toFixed(2)} key={shot.duration} disabled={locked || busy}
      onBlur={(e) => { const v = Number(e.target.value); if (v && Math.abs(v - (shot.duration ?? 0)) > 0.001) set({ duration: v }); }} onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }} /> s</label>
    {busy && <Loader2 size={13} className="spin" />}
  </div>;
}

export default function ShotList({ projectId, shots, posters, shot, onShot, locked, send, onChanged, version = 0, blank = null }) {
  const t = useT();
  if (!shots) return <div className="sl"><div className="skeleton" style={{ height: "3rem" }} /></div>;
  if (!shots.length) return <div className="sl-empty"><Film size={18} /><span>{t("No shots yet. They appear when the storyboard is built.")}</span></div>;
  return <ol className="plain sl" aria-label={t("Shots")}>{shots.map((s) => {
    const poster = posters?.find((p) => p.number === s.number);
    const on = shot?.number === s.number;
    return <li key={s.mountId ?? s.number} className={on ? "on" : ""}>
      <button className="sl-row" aria-pressed={on} onClick={() => onShot(on ? null : s)}>
        <span className="sl-n num">{s.number}</span>
        <span className="sl-thumb">{poster ? <img src={poster.url} alt="" loading="lazy" /> : <Film size={13} />}</span>
        <span className="sl-t"><span className={"sl-title" + (s.title ? "" : " muted")}>{s.title || blank || t("Waits for the storyboard")}</span>
          <span className="sl-meta num">{s.start != null ? `${clock(s.start)} · ${sec(s.duration)}` : t("Not built")}{(s.rate ?? 1) !== 1 ? ` · ${s.rate}×` : ""}</span>
</span>
      </button>
      {on && s.mountId && <div className="sl-open">
        <Timing projectId={projectId} shot={s} locked={locked} onChanged={onChanged} />
        <Words projectId={projectId} shot={s} locked={locked} send={send} onChanged={onChanged} version={version} />
      </div>}
      {on && !s.mountId && s.start != null && <div className="sl-open">
        <CodeWords projectId={projectId} shot={s} locked={locked} onChanged={onChanged} version={version} />
      </div>}
    </li>;
  })}</ol>;
}
