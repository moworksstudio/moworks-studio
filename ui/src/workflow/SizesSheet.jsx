// The Adaptation step's sheet (one film, several sizes: owner 06/11/2026, #1232-#1236): the master, then one row per other size with its
// state (Not made, Adapting…, Ready, Out of date, Stopped) and its one action: Adapt the first time, Update when the master's picture
// changed after it was made (warn, never block). "Add a size" offers the sizes the film does not have; a size taken off keeps its page in
// the film's history. Claude makes each size with the Adaptation rules; the timeline and the sound stay the master's.
import { useEffect, useState } from "react";
import { Loader2, Plus, RefreshCw, Wand2, X } from "lucide-react";
import { del, get, post } from "../api.js";
import { Menu } from "../components.jsx";
import { useToast } from "../lib.jsx";
import { useT } from "../i18n.jsx";

// each state's words and its status colour (green ready, yellow at work or waiting, red out of date or stopped, grey not made)
const STATE = { none: ["Not made", ""], adapting: ["Adapting…", "busy"], ready: ["Ready", "ok"], stale: ["Out of date", "error"], stopped: ["Stopped", "error"] };

export default function SizesSheet({ projectId, pipeline, onChanged }) {
  const t = useT();
  const toast = useToast();
  const [data, setData] = useState(null);
  const [doing, setDoing] = useState(null);
  // read again whenever the pipeline's view of the sizes moves (a size made, the master changed)
  const key = JSON.stringify(pipeline?.sizes ?? null);
  const load = () => get(`/api/projects/${projectId}/sizes`).then(setData).catch((e) => toast(e.message, "error"));
  useEffect(() => { load(); }, [projectId, key]); // eslint-disable-line react-hooks/exhaustive-deps
  const step = pipeline?.steps?.find((x) => x.id === "adaptation") ?? null;
  const blocked = step?.status === "blocked" ? step.reason?.text ?? t("Finish the Review first") : null;
  const busy = !!pipeline?.claudeBusy;
  const act = async (what, fn) => {
    setDoing(what);
    try { setData(await fn()); onChanged?.(); } catch (e) { toast(e.message, "error"); } finally { setDoing(null); }
  };
  const add = (aspect) => act(`add:${aspect}`, () => post(`/api/projects/${projectId}/sizes`, { aspect }));
  const remove = (r) => act(`del:${r.aspect}`, () => del(`/api/projects/${projectId}/sizes/${r.tag}`));
  const adapt = (r) => act(`adapt:${r.aspect}`, async () => { const x = await post(`/api/projects/${projectId}/sizes/${r.tag}/adapt`, {}); toast(t("Claude is making the {size} size", { size: r.aspect })); return x; });
  if (!data) return <div className="sz-sheet"><div className="skeleton" style={{ height: "6rem" }} /></div>;
  const rows = data.sizes ?? [];
  const why = blocked ?? (busy ? t("Claude is working: this waits for it") : null);
  return <div className="sz-sheet">
    <p className="hint sz-intro">{t("Each size is laid out again from the master film. The timeline and the sound stay the master's.")}</p>
    <ul className="plain sz-list">
      <li className="sz-row master"><span className="sz-aspect num">{data.master ?? "16:9"}</span><span className="sz-state">{t("Master")}</span></li>
      {rows.map((r) => {
        const [word, dot] = STATE[r.status] ?? STATE.none;
        const action = r.status === "stale" ? t("Update {size}", { size: r.aspect }) : r.status === "none" || r.status === "stopped" ? t("Adapt") : null;
        const going = doing === `adapt:${r.aspect}`;
        return <li key={r.aspect} className={"sz-row " + r.status}>
          <span className="sz-aspect num">{r.aspect}</span>
          <span className="sz-state">{dot && r.status !== "adapting" && <i className={"dot " + dot} aria-hidden="true" />}{r.status === "adapting" && <Loader2 size={13} className="spin" aria-hidden="true" />}{t(word)}
            {r.status === "stale" && <span className="sz-why">{t("The master film has changed.")}</span>}</span>
          {action && <button type="button" className={"btn sm" + (r.status === "none" && rows.every((x) => x.status !== "stale") ? " primary" : "")} disabled={!!why || !!doing}
            title={why ?? undefined} onClick={() => adapt(r)}>{going ? <Loader2 size={13} className="spin" /> : r.status === "stale" ? <RefreshCw size={13} /> : <Wand2 size={13} />}{action}</button>}
          <button type="button" className="btn ghost icon sm sz-off" disabled={r.status === "adapting" || !!doing} onClick={() => remove(r)}
            aria-label={t("Take {size} off this film", { size: r.aspect })} title={t("Take {size} off this film", { size: r.aspect })}><X size={14} /></button>
        </li>;
      })}
    </ul>
    {!rows.length && <p className="hint">{t("This film has one size. Add one to lay it out again for another screen.")}</p>}
    <div className="sz-foot">
      {data.choices?.length > 0 && <Menu label={t("Add a size")} trigger={<span className="sz-add"><Plus size={13} />{t("Add a size")}</span>}
        items={data.choices.map((a) => ({ label: a, onSelect: () => add(a) }))} />}
      {why && rows.some((r) => r.status !== "ready") && <span className="hint sz-wait">{why}</span>}
    </div>
  </div>;
}
