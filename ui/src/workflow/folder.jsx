// A folder field with "Choose…": the local service opens the Windows folder picker (a web page cannot pick a real path)
// and answers with the folder. A Google Drive folder is allowed; the note says the history stays on this PC (packages/revisions/drive.mjs).
import { useState } from "react";
import { Cloud, FolderOpen, Loader2 } from "lucide-react";
import { post } from "../api.js";
import { useToast } from "../lib.jsx";
import { useT } from "../i18n.jsx";

/** A folder by its name, never its address ("C:\Work\Films\" → "Films"). */
export const folderName = (path) => String(path ?? "").replace(/[\\/]+$/, "").split(/[\\/]/).pop();

export function DriveNote() {
  const t = useT();
  return <span className="hint drive-note"><Cloud size={13} />{t("Google Drive folder: the history is kept on this PC; the film files sync with Drive.")}</span>;
}

/** value: the path; drive: is it a Drive folder; onChange(path, drive). editable: the path can also be typed. */
export function FolderField({ id, value, drive, onChange, title, editable = false, placeholder = "" }) {
  const t = useT();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const choose = async () => {
    setBusy(true);
    try { const r = await post("/api/dialog/folder", { title: title ?? t("Choose a folder"), initial: value ?? "" }); if (r.path) onChange(r.path, r.drive); }
    catch (e) { toast(e.message, "error"); } finally { setBusy(false); }
  };
  return <div className="folder-field">
    <div className="row">
      {editable ? <input id={id} className="input mono" value={value ?? ""} onChange={(e) => onChange(e.target.value, null)} placeholder={placeholder} spellCheck={false} />
        : <span id={id} className="path">{folderName(value)}</span>}
      <button type="button" className="btn sm" onClick={choose} disabled={busy}>{busy ? <Loader2 size={14} className="spin" /> : <FolderOpen size={14} />}{t("Choose…")}</button>
    </div>
    {drive && <DriveNote />}
  </div>;
}
