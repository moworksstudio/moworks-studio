// Exit: stops the app's background service and closes the app window. Closing the window with its X does
// the same after ~10 s (the service sees the window's stream end), so the two are one action. The confirmation is short, with a warning
// icon, and lists per project what will be stopped (Claude tasks, render, transcription and its Whisper model, checks).
// Shown only when the app was started from its launcher.
import { useEffect, useState } from "react";
import { AlertTriangle, Loader2, Power } from "lucide-react";
import { get, post, setBusy } from "./api.js";
import { Dialog } from "./components.jsx";
import { useT } from "./i18n.jsx";

const KIND = { claude: "Claude task", export: "Render", transcribe: "Transcription (Whisper)", tts: "Voice-over", qa: "Checks", ae: "Export to AE", "ae-estimate": "Export to AE",
  "model-install": "Download", "offline-assets": "Download" };          // English keys for t()

export default function ExitButton({ className = "chip-status" }) {
  const t = useT();
  const [can, setCan] = useState(false);
  const [ask, setAsk] = useState(null);       // null | { running: [...] }
  const [state, setState] = useState(null);   // null | "stopping" | "closed" | error message
  useEffect(() => { get("/api/app").then((r) => setCan(r.canExit)).catch(() => {}); }, []);
  if (!can) return null;
  const open = async () => { try { const r = await get("/api/app"); setAsk({ running: r.running }); } catch { setAsk({ running: [] }); } };
  const exit = async () => {
    setState("stopping");
    try { setBusy(false); await post("/api/app/exit"); setState("closed"); setTimeout(() => window.close(), 400); }
    catch (e) { setState(e.message); }
  };
  if (state === "closed") return <div className="app-closed" role="status"><Power size={28} /><h2>{t("Moworks Studio is closed")}</h2><p>{t("You can close this window. Start the app again from its shortcut.")}</p></div>;
  const groups = new Map();
  for (const x of ask?.running ?? []) { const k = x.project ?? t("The app"); groups.set(k, [...(groups.get(k) ?? []), x]); }
  const work = (ask?.running ?? []).filter((x) => !x.idle).length;
  const close = () => { setAsk(null); setState(null); };
  return <>
    <button className={className} onClick={open} title={t("Exit Moworks Studio")}><Power size={13} />{t("Exit")}</button>
    {ask && <Dialog icon={<AlertTriangle size={18} />} danger title={work ? t("Stop {n} task(s) and exit?", { n: work }) : t("Exit Moworks Studio?")} onClose={close} footer={<><span className="spacer" />
      <button className="btn" onClick={close} disabled={state === "stopping"}>{t("Cancel")}</button>
      <button className="btn danger" onClick={exit} disabled={state === "stopping"}>{state === "stopping" ? <Loader2 size={14} className="spin" /> : <Power size={14} />}{t("Exit")}</button></>}>
      {groups.size > 0 ? <ul className="plain exit-list">{[...groups].map(([project, xs]) => <li key={project}><b>{project}</b>
        <span>{xs.map((x) => t(KIND[x.kind] ?? x.label ?? x.kind)).join(" · ")}</span></li>)}</ul>
        : <p>{t("Your projects are saved.")}</p>}
      {/* one idea a line; the work that stops, in red */}
      {work ? <div className="dlg-lines"><p className="dlg-warn">{t("Running work stops now.")}</p><p className="hint">{t("What changed so far is kept as an undoable revision.")}</p></div>
        : <p className="hint">{t("Closing the window does the same.")}</p>}
      {state && state !== "stopping" && <p className="error-text">{state}</p>}
    </Dialog>}
  </>;
}
