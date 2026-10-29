// First-start dialog: when no speech-to-text model is installed, list the models with their sizes and install only on request. Shown
// by FirstRun.jsx after Set up and the graphics-card question, never under them. "Later" hides it until a new model appears in the
// list; Settings › System has the same cards at any time.
import { useEffect } from "react";
import { Mic2 } from "lucide-react";
import { Dialog } from "../components.jsx";
import { go, usePref } from "../lib.jsx";
import Models, { useVoiceSettings } from "./Models.jsx";
import { useT } from "../i18n.jsx";

export default function SetupModels() {
  const t = useT();
  const { data, reload } = useVoiceSettings();
  const [seen, setSeen] = usePref("asr-setup-seen", []);
  const ids = (data?.models ?? []).map((m) => m.id);
  const show = !!data && !data.models.some((m) => m.installed) && ids.some((id) => !seen.includes(id));
  useEffect(() => { if (data && data.models.some((m) => m.installed)) setSeen(ids); }, [data]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!show) return null;
  const later = () => setSeen(ids);
  return <Dialog title={t("Speech-to-text models")} wide onClose={later} footer={<><button className="btn ghost" onClick={() => { later(); go("/settings/runtime"); }}>{t("Open settings")}</button>
    <span className="spacer" /><button className="btn" onClick={later}>{t("Later")}</button></>}>
    <p style={{ display: "flex", gap: "0.5333rem", alignItems: "flex-start" }}><Mic2 size={18} color="var(--accent-ink)" style={{ flex: "none", marginTop: "0.1333rem" }} />
      {t("Voice-overs are transcribed on this computer before anything is built. Install at least one model; nothing downloads until you confirm.")}</p>
    <Models data={data} reload={reload} compact />
  </Dialog>;
}
