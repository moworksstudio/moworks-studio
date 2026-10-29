// Speech-to-text model cards: installed or not, size, path, source and licence, Install (after a confirmation that
// states the size and where it comes from), Remove (confirmed), and the default model. Used by Settings and by the first-run dialog.
import { useEffect, useState } from "react";
import { CheckCircle2, Download, ExternalLink, HardDrive, Loader2, Trash2, XCircle } from "lucide-react";
import { get, patch, post, watchJob } from "../api.js";
import { Dialog, StatusIcon } from "../components.jsx";
import { useToast } from "../lib.jsx";
import { useT } from "../i18n.jsx";

export const mb = (n) => (n >= 1e9 ? `${(n / 1e9).toFixed(2)} GB` : `${Math.round(n / 1e6)} MB`);

export function useVoiceSettings() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const reload = () => get("/api/voice/settings").then((d) => { setData(d); setError(null); }).catch(setError);
  useEffect(() => { reload(); }, []);
  return { data, error, reload };
}

export default function Models({ data, reload, compact = false }) {
  const t = useT();
  const toast = useToast();
  const [ask, setAsk] = useState(null);       // { model, kind: "install" | "remove" }
  const [jobs, setJobs] = useState({});        // model id -> job
  useEffect(() => {                             // pick up installs already running (e.g. started from the other screen)
    for (const j of data?.jobs ?? []) if (j.status === "running" && !jobs[j.model]) follow(j);
  }, [data]); // eslint-disable-line react-hooks/exhaustive-deps
  const follow = (job) => {
    setJobs((x) => ({ ...x, [job.model]: job }));
    watchJob(job.id, (j) => {
      if (!j) return;
      setJobs((x) => ({ ...x, [job.model]: j }));
      if (j.status === "done") { toast(t("Model downloaded and checked")); reload(); }
      if (j.status === "failed") { toast(j.error?.message ?? t("Install failed"), "error"); reload(); }
    });
  };
  const install = async (m) => {
    setAsk(null);
    try { follow(await post(`/api/voice/models/${m.id}/install`)); } catch (e) { toast(e.message, "error"); }
  };
  const remove = async (m) => { setAsk(null); try { await post(`/api/voice/models/${m.id}/remove`); toast(t("Model removed")); reload(); } catch (e) { toast(e.message, "error"); } };
  const setDefault = async (id) => { try { await patch("/api/voice/settings", { defaultModel: id }); reload(); } catch (e) { toast(e.message, "error"); } };
  const cancel = async (job) => { try { await post(`/api/jobs/${job.id}/cancel`); } catch (e) { toast(e.message, "error"); } };
  if (!data) return <div className="skeleton" style={{ height: "10.6667rem" }} />;

  return <div style={{ display: "flex", flexDirection: "column", gap: "0.6667rem" }}>
    {data.models.map((m) => {
      const job = jobs[m.id]?.status === "running" ? jobs[m.id] : null;
      return <div key={m.id} className="model-card">
        <div className="model-head">
          <StatusIcon status={m.installed ? (m.runtime.ok ? "ok" : "warning") : "neutral"} />
          <div style={{ minWidth: 0 }}>
            <div className="t">{m.label}{m.isDefault && <span className="chip teal" style={{ marginLeft: "0.5333rem" }}>{t("Default")}</span>}</div>
            <div className="d">{m.languages}</div>
          </div>
          <span className="end num muted" style={{ fontSize: "var(--fs-meta)" }}><HardDrive size={12} /> {mb(m.size)}</span>
        </div>
        {!compact && <details className="diag model-more"><summary>{t("Details")}</summary>          {/* the note and facts behind one fold */}
          {m.note && <p className="d" style={{ color: "var(--text-secondary)", margin: "0.4rem 0" }}>{m.note}</p>}
          <dl className="kv small">
          <dt>{t("Status")}</dt><dd>{m.installed ? (m.runtime.ok ? t("Installed, ready") : t("Installed; the engine is missing")) : t("Not installed")}</dd>
          <dt>{t("By")}</dt><dd>{m.author} · {m.licence}</dd>
          <dt>{t("Source")}</dt><dd><a href={m.source} target="_blank" rel="noopener noreferrer" className="ext">{m.source.replace("https://", "").replace(/\/tree\/([0-9a-f]{7})[0-9a-f]+/, "@$1")}<ExternalLink size={11} /></a></dd>
          <dt>{t("Engine")}</dt><dd>{m.runtime.ok ? <span className="status ok"><CheckCircle2 size={13} /> {t("Ready ({size})", { size: m.runtime.size })}</span>
            : <span className="status warning"><XCircle size={13} /> {t("Not installed: {size}", { size: m.runtime.size })}</span>}</dd>
        </dl></details>}
        {job && <div className="progress-line"><div className="bar"><span style={{ width: `${job.progress ?? 0}%` }} /></div>
          <span className="num">{job.progress ?? 0}%</span><span className="muted">{job.stage}{job.bytes ? " · " + t("{done} of {total}", { done: mb(job.bytes.done), total: mb(job.bytes.total) }) : ""}</span>
          <button className="btn ghost sm" onClick={() => cancel(job)}>{t("Stop")}</button></div>}
        {!job && <div className="model-actions">
          {(!m.installed || (!m.runtime.ok && m.runtime.withModel)) && <button className="btn primary sm" onClick={() => setAsk({ model: m, kind: "install" })}><Download size={14} />{m.installed ? t("Install the engine") : t("Install")}</button>}
          {m.installed && !m.isDefault && <button className="btn sm" onClick={() => setDefault(m.id)}>{t("Make default")}</button>}
          {m.installed && <button className="btn ghost sm" onClick={() => setAsk({ model: m, kind: "remove" })}><Trash2 size={14} />{t("Remove")}</button>}
          {!m.runtime.ok && m.runtime.install && !m.runtime.withModel && <span className="hint">{t("Engine: {how}. It is a large download; ask Claude in a terminal to set it up.", { how: m.runtime.install })}</span>}
        </div>}
      </div>;
    })}
    {/* no "Nothing downloads without your OK" line: each Install asks with its size and source */}
    {ask?.kind === "install" && <Dialog title={t("Install {name}?", { name: ask.model.short })} onClose={() => setAsk(null)} footer={<><span className="spacer" />
      <button className="btn" onClick={() => setAsk(null)}>{t("Cancel")}</button>
      <button className="btn primary" onClick={() => install(ask.model)}><Download size={14} />{t("Download {size}", { size: mb(ask.model.size) })}</button></>}>
      {/* one idea a line; no folder on this computer is shown (no paths in the UI) */}
      <div className="dlg-lines">
        <p>{t("Downloads {size} from Hugging Face", { size: mb(ask.model.size) })}: <span className="mono">{ask.model.source.replace("https://huggingface.co/", "").replace(/\/tree\/([0-9a-f]{7})[0-9a-f]+/, " @$1")}</span></p>
        <p className="hint">{t("A fixed version; every file is checked after the download.")}</p>
        {!ask.model.runtime.ok && (ask.model.runtime.withModel ? <p>{t("Then its engine from PyPI: {size}.", { size: ask.model.runtime.size })}</p>
          : <><p className="dlg-warn">{t("The engine that runs it is not installed yet ({size}).", { size: ask.model.runtime.size })}</p>
          <p className="hint">{t("Until it is, the model cannot transcribe.")}</p></>)}
      </div>
    </Dialog>}
    {ask?.kind === "remove" && <Dialog title={t("Remove {name}?", { name: ask.model.short })} onClose={() => setAsk(null)} footer={<><span className="spacer" />
      <button className="btn" onClick={() => setAsk(null)}>{t("Cancel")}</button><button className="btn danger" onClick={() => remove(ask.model)}>{t("Remove model")}</button></>}>
      <div className="dlg-lines"><p className="dlg-warn">{t("Deletes this model ({size}).", { size: mb(ask.model.size) })}</p>
        <p>{t("Transcripts already made stay.")}</p><p className="hint">{t("You can install it again later.")}</p></div>
    </Dialog>}
  </div>;
}
