// Import assets: one shared button for every style. Files, a whole folder, or drag and drop; every file is
// COPIED into the project and sorted by kind (assets/1_images, 2_footage, 3_audio, 4_fonts, 5_design); the original stays untouched. Nobody
// says what an audio file is: the app sorts it (a voice, music or a sound effect) and the user can move it later in the Assets tab. In New
// project the files wait until the project exists; in the Editor they go in at once. Claude is told.
import { useRef, useState } from "react";
import { AlertCircle, AudioLines, File as FileIcon, FileImage, FileText, FileVideo, FolderOpen, Loader2, Type, Upload, X } from "lucide-react";
import { uploadAsset } from "../api.js";
import { useT } from "../i18n.jsx";

const RX = { image: /\.(png|jpe?g|webp|gif|avif|bmp|tiff?|heic|svg)$/i, video: /\.(mp4|mov|webm|m4v|mkv|avi)$/i, audio: /\.(mp3|wav|m4a|flac|ogg|aac|opus)$/i, font: /\.(ttf|otf|woff2?)$/i };
/** Same sorting as the server (packages/project-service classifyAsset), for showing where a file will go. */
export function kindOf(name) {
  if (RX.audio.test(name)) return "audio";
  if (RX.video.test(name)) return "video";
  if (RX.font.test(name)) return "font";
  if (RX.image.test(name)) return "image";
  return "source";
}
export const size = (n) => (n >= 1e9 ? `${(n / 1e9).toFixed(2)} GB` : n >= 1e6 ? `${(n / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1e3))} KB`);
const ICON = { image: FileImage, video: FileVideo, audio: AudioLines, font: Type, source: FileText };
const SKIP = /^(desktop\.ini|thumbs\.db|\.ds_store)$/i;
const RISKY = /\.(exe|msi|bat|cmd|com|scr|dll|ps1|vbs|lnk|jar|apk|dmg)$/i;   // programs are not film material: skipped, and said so

/** Every file of a drop, folders opened (webkitGetAsEntry). */
async function filesFromDrop(dt) {
  const entries = [...(dt.items ?? [])].map((i) => i.webkitGetAsEntry?.()).filter(Boolean);
  if (!entries.length) return [...(dt.files ?? [])];
  const out = [];
  const walk = async (e) => {
    if (e.isFile) await new Promise((ok) => e.file((f) => { out.push(f); ok(); }, ok));
    else if (e.isDirectory) {
      const r = e.createReader();
      for (;;) { const batch = await new Promise((ok) => r.readEntries(ok, () => ok([]))); if (!batch.length) break; for (const x of batch) await walk(x); }
    }
  };
  for (const e of entries) await walk(e);
  return out;
}

let seq = 0;
/** The pick / drop area and the list. items: [{ id, file, progress?, status?, error? }]; onAdd(files), onRemove(id).
 *  hint: a compact picker's one line about what it takes, inside the drop zone under its row (New project). */
export function AssetPicker({ items, onAdd, onRemove, busy = false, compact = false, hint = null }) {
  const t = useT();
  const [over, setOver] = useState(false);
  const [note, setNote] = useState(null);   // { bad: [names skipped], dup: [names that are already there] }
  const fileRef = useRef(null), dirRef = useRef(null);
  const add = (list) => {
    const all = [...list].filter((f) => f.size > 0 && !SKIP.test(f.name));
    const bad = all.filter((f) => RISKY.test(f.name)), fs = all.filter((f) => !RISKY.test(f.name));
    const have = new Set(items.map((x) => x.file.name.toLowerCase())), dup = [];
    for (const f of fs) { const k = f.name.toLowerCase(); if (have.has(k)) dup.push(f.name); have.add(k); }
    setNote(bad.length || dup.length ? { bad: bad.map((f) => f.name), dup } : null);
    if (fs.length) onAdd(fs.map((file) => ({ id: ++seq, file })));
  };
  return <div className="asset-import">
    <div className={"dropzone asset-drop" + (over ? " over" : "")} onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)}
      onDrop={async (e) => { e.preventDefault(); setOver(false); add(await filesFromDrop(e.dataTransfer)); }}>
      <Upload size={20} />
      <div style={{ flex: 1, minWidth: 0 }}><div className="drop-t">{t("Drop files or a folder here")}</div>
        {!compact && <div className="hint">{t("Pictures, video, audio, fonts, logos, PSD, PPTX, PDF and guidelines. The app sorts them into folders; files are copied and your originals stay as they are.")}</div>}</div>
      <button type="button" className="btn sm" onClick={() => fileRef.current?.click()} disabled={busy}><FileIcon size={14} />{t("Choose files")}</button>
      <button type="button" className="btn sm" onClick={() => dirRef.current?.click()} disabled={busy}><FolderOpen size={14} />{t("Choose a folder")}</button>
      {compact && hint && <p className="drop-fine">{hint}</p>}
      <input ref={fileRef} type="file" multiple hidden onChange={(e) => { add(e.target.files ?? []); e.target.value = ""; }} />
      <input ref={dirRef} type="file" multiple hidden webkitdirectory="" directory="" onChange={(e) => { add(e.target.files ?? []); e.target.value = ""; }} />
    </div>
    {items.length > 0 && <ul className="plain asset-list">{items.map((x) => {
      const k = kindOf(x.file.name), I = ICON[k];
      return <li key={x.id} className={x.status ?? ""}>
        <I size={15} className="k" />
        <span className="n" title={x.file.webkitRelativePath || x.file.name}>{x.file.name}</span>
        <span className="muted num s">{size(x.file.size)}</span>
        {x.status === "uploading" ? <span className="prog"><span style={{ width: `${Math.round((x.progress ?? 0) * 100)}%` }} /></span>
          : x.status === "done" ? <span className="ok-t">{t("Copied")}</span> : x.status === "error" ? <span className="error-text" title={x.error}>{t("Failed")}</span>
          : !busy && <button type="button" className="btn ghost icon sm" onClick={() => onRemove?.(x.id)} aria-label={t("Remove {name}", { name: x.file.name })}><X size={13} /></button>}
      </li>;
    })}</ul>}
    {note && <div className="asset-note" role="status"><AlertCircle size={14} /><span>
      {note.bad.length > 0 && <>{t("Skipped {n} program file(s), which are not film material: {names}.", { n: note.bad.length, names: note.bad.slice(0, 3).join(", ") + (note.bad.length > 3 ? "…" : "") })} </>}
      {note.dup.length > 0 && t("Same name twice: {names}. The second one gets a number.", { names: note.dup.slice(0, 3).join(", ") + (note.dup.length > 3 ? "…" : "") })}</span>
      <button type="button" className="btn ghost icon sm" onClick={() => setNote(null)} aria-label={t("Close")}><X size={14} /></button></div>}
  </div>;
}

/** Copy the files into a project, one after another; onItem(id, patch) follows each. Resolves with the counts; cancel stops what is left. */
export function uploadAll(projectId, items, onItem) {
  let current = null, stopped = false;
  const run = (async () => {
    let ok = 0, failed = 0, voice = null;
    for (const x of items) {
      if (stopped) break;
      onItem(x.id, { status: "uploading", progress: 0 });
      current = uploadAsset(projectId, x.file, { onProgress: (p) => onItem(x.id, { progress: p }) });
      try { const r = await current.done; ok++; if (r.voice) voice = r.voice; onItem(x.id, { status: "done", progress: 1 }); }
      catch (e) { if (e.code === "CANCELLED") { onItem(x.id, { status: null }); break; } failed++; onItem(x.id, { status: "error", error: e.message }); }
    }
    return { ok, failed, voice, cancelled: stopped };
  })();
  return { done: run, cancel: () => { stopped = true; current?.abort(); } };
}

/** Import assets in the Editor: pick, then they go in at once with a progress line and Cancel. */
export function ImportNow({ projectId, onDone }) {
  const t = useT();
  const [items, setItems] = useState([]);
  const [job, setJob] = useState(null);
  const patch = (id, p) => setItems((xs) => xs.map((x) => (x.id === id ? { ...x, ...p } : x)));
  const start = (list) => { setItems((xs) => [...xs.filter((x) => x.status === "done" || x.status === "error"), ...list]); return list; };
  const go = (next) => {
    const j = uploadAll(projectId, next, patch);
    setJob(j);
    j.done.then((r) => { setJob(null); onDone?.(r); });
  };
  const pending = items.filter((x) => !x.status);
  return <>
    <AssetPicker items={items} busy={!!job} onAdd={(fs) => go(start(fs))} onRemove={(id) => setItems((xs) => xs.filter((x) => x.id !== id))} />
    <div className="row asset-actions">
      {job ? <><span className="hint"><Loader2 size={13} className="spin" /> {t("Copying {done} of {n}…", { done: items.filter((x) => x.status === "done").length, n: items.length })}</span>
        <button className="btn sm" onClick={() => job.cancel()}>{t("Cancel")}</button></>
        : pending.length > 0 && <button className="btn primary sm" onClick={() => go(pending)}><Upload size={14} />{t("Copy {n} file(s) into the project", { n: pending.length })}</button>}
    </div>
  </>;
}
