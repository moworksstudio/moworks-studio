// The service key for ElevenLabs: enter, replace, clear and test. The backend keeps the key encrypted
// for this Windows account; the browser only ever sees "saved" and when.
import { useState } from "react";
import { KeyRound, Loader2, PlugZap, Trash2 } from "lucide-react";
import { api, post } from "../api.js";
import { Dialog } from "../components.jsx";
import { ago, locale, useToast } from "../lib.jsx";
import { useT } from "../i18n.jsx";

const ABOUT = {
  elevenlabs: { where: "elevenlabs.io › Profile › API Keys", note: "A voice-over uses your ElevenLabs characters." },
};

export default function Keys({ data, reload }) {
  const t = useT();
  const toast = useToast();
  const [edit, setEdit] = useState(null);
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(null);
  const [tested, setTested] = useState({});
  const [ask, setAsk] = useState(null);
  const save = async () => {
    setBusy("save");
    try { await api("PUT", `/api/voice/keys/${edit}`, { value }); setValue(""); setEdit(null); toast(t("Key saved")); reload(); }
    catch (e) { toast(e.message, "error"); } finally { setBusy(null); }
  };
  const test = async (id) => {
    setBusy(id);
    try { const r = await post(`/api/voice/keys/${id}/test`); setTested((x) => ({ ...x, [id]: { ok: true, ...r } })); toast(t("Connected")); }
    catch (e) { setTested((x) => ({ ...x, [id]: { ok: false, message: e.message } })); } finally { setBusy(null); }
  };
  const clear = async (id) => { setAsk(null); try { await post(`/api/voice/keys/${id}/clear`); setTested((x) => ({ ...x, [id]: null })); toast(t("Key removed")); reload(); } catch (e) { toast(e.message, "error"); } };
  if (!data) return null;
  return <div className="key-rows">
    {data.providers.map(({ id, title }) => {
      const k = data.keys[id], res = tested[id];
      // one row a service: its dot, its name, its key's state, the actions as small icons at the end
      const state = !k.saved ? t("No key") : res ? (res.ok ? t("Connected") + (res.account ? " · " + t("plan {name}", { name: res.account }) : "") + (res.credits ? " · " + t("{used} of {limit} {unit} used", { used: res.credits.used.toLocaleString(locale()), limit: res.credits.limit.toLocaleString(locale()), unit: res.credits.unit }) : "") : res.message)
        : t("Key saved {ago}", { ago: ago(k.savedAt) });
      return <div key={id} className="key-row-wrap">
        <div className="key-row">
          <span className={"dot " + (!k.saved ? "off" : res && !res.ok ? "error" : "ok")} aria-hidden="true" />
          <b>{title}</b><span className="muted key-state" title={state}>{state}</span><span className="spacer" />
          {edit !== id && <>
            {k.saved ? <button className="btn ghost icon sm" onClick={() => setEdit(id)} title={t("Replace key")} aria-label={t("Replace key")}><KeyRound size={14} /></button>
              : <button className="btn ghost sm" onClick={() => setEdit(id)}><KeyRound size={14} />{t("Add key")}</button>}
            {k.saved && <button className="btn ghost icon sm" onClick={() => test(id)} disabled={busy === id} title={t("Test")} aria-label={t("Test")}>{busy === id ? <Loader2 size={14} className="spin" /> : <PlugZap size={14} />}</button>}
            {k.saved && <button className="btn ghost icon sm danger" onClick={() => setAsk(id)} title={t("Remove")} aria-label={t("Remove")}><Trash2 size={14} /></button>}</>}
        </div>
        {edit === id && <div className="key-edit">
          <input className="input mono" type="password" autoFocus autoComplete="off" spellCheck={false} placeholder={t("Paste the {name} API key", { name: title })} value={value}
            onChange={(e) => setValue(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && value.trim()) save(); if (e.key === "Escape") { setEdit(null); setValue(""); } }} aria-label={t("{name} API key", { name: title })} />
          <button className="btn primary sm" onClick={save} disabled={!value.trim() || busy === "save"}>{busy === "save" ? <Loader2 size={14} className="spin" /> : null}{t("Save key")}</button>
          <button className="btn ghost sm" onClick={() => { setEdit(null); setValue(""); }}>{t("Cancel")}</button>
          <p className="hint" style={{ flexBasis: "100%" }}>{t("Find it at {where}.", { where: ABOUT[id].where })} {t(ABOUT[id].note)} {t("The key is encrypted for your Windows account and never shown again.")}</p>
        </div>}
      </div>;
    })}
    {ask && <Dialog title={t("Remove the key?")} onClose={() => setAsk(null)} footer={<><span className="spacer" /><button className="btn" onClick={() => setAsk(null)}>{t("Cancel")}</button>
      <button className="btn danger" onClick={() => clear(ask)}>{t("Remove key")}</button></>}>
        {/* one idea a line, the loss in red */}
        <div className="dlg-lines"><p className="dlg-warn">{t("The app forgets this key.")}</p><p>{t("Voice-overs already made stay.")}</p></div></Dialog>}
  </div>;
}
