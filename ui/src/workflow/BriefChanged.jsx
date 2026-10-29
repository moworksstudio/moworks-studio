// The brief was edited after the film was built: the pipeline asks what to do with the film, in three ways, and waits for the
// answer (pipeline.question.kind === "brief-changed" until POST /brief/after-change is called). Mounted by the Brief dialog and, when the
// Editor wants to show it, by the Editor (<BriefChanged projectId onClose onDone />).
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { post } from "../api.js";
import { Dialog } from "../components.jsx";
import { useToast } from "../lib.jsx";
import { useT } from "../i18n.jsx";

// English keys for t; the ids are what the server expects
export const BRIEF_CHOICES = [
  { id: "inplace", name: "Change the film you have", sub: "Claude changes only what the new brief asks, in the film you already have." },
  { id: "storyboard", name: "Start again from the storyboard", sub: "New options and motion from the new brief. The film you have is saved as a version." },
  { id: "keep", name: "Keep it as it is", sub: "The film does not change. The new brief is used from your next request." },
];

export default function BriefChanged({ projectId, onClose, onDone }) {
  const t = useT();
  const toast = useToast();
  const [pick, setPick] = useState("inplace");
  const [busy, setBusy] = useState(false);
  const go = async () => {
    setBusy(true);
    try { await post(`/api/projects/${projectId}/brief/after-change`, { choice: pick }); toast(t("Got it: {what}", { what: t(BRIEF_CHOICES.find((c) => c.id === pick).name) })); onDone?.(pick); onClose(); }
    catch (e) { toast(e.message, "error"); } finally { setBusy(false); }
  };
  return <Dialog title={t("The brief changed. What should happen to the film?")} onClose={onClose} footer={<><span className="spacer" />
    <button className="btn" onClick={onClose} disabled={busy}>{t("Not now")}</button>
    <button className="btn primary" onClick={go} disabled={busy}>{busy ? <Loader2 size={15} className="spin" /> : null}{t("Apply")}</button></>}>
    <div className="np-modes ways ways3 bc-choices" role="radiogroup" aria-label={t("What should happen to the film?")}>{BRIEF_CHOICES.map((c) => (
      <button type="button" key={c.id} className="radio-card" role="radio" aria-checked={pick === c.id} onClick={() => setPick(c.id)}>
        <span className="t">{t(c.name)}</span><span className="d">{t(c.sub)}</span></button>))}</div>
    <p className="hint">{t("Until you answer, the next steps wait.")}</p>
  </Dialog>;
}
