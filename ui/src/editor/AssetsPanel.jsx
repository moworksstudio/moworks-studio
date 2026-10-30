// The Assets tab beside Shots, like the Project panel of After Effects or Premiere: every file the
// project holds, by folder (images, footage, audio as voice-over / music / sound effects, fonts, design files), each with its size,
// length or frame count, where the film uses it, and Claude's note. The list is read again on every visit and when the window comes
// back to the app (the server compares the film's paths with the disk): a file the film uses that is gone shows as "Missing" with
// "Relink"; a file copied in from Explorer shows as "New". Audio and footage can be transcribed and put on the timeline: at the
// playhead from the menu, or dragged onto a lane of the timeline.
import { useCallback, useEffect, useMemo, useState } from "react";
import { AudioLines, ChevronDown, ChevronRight, Clapperboard, FileText, Film, Folder, FolderOpen, Image as ImageIcon, Images, Loader2, MoreHorizontal, Trash2, Type } from "lucide-react";
import { get, post } from "../api.js";
import { Dialog, Menu } from "../components.jsx";
import { usePref, useToast } from "../lib.jsx";
import { useT } from "../i18n.jsx";
import { useThemeId } from "../theme.jsx";
import { SOUND_MIME, clockTenths } from "./Timeline.jsx";

const ICON = { image: ImageIcon, footage: Film, sequence: Images, audio: AudioLines, font: Type, design: FileText, other: FileText };
const KIND = { image: "Image", footage: "Footage", sequence: "Image sequence", audio: "Audio", font: "Font", design: "Design file", other: "File" };
const AUDIO_FOLDERS = [["voiceover", "Voice-over"], ["music", "Music"], ["sfx", "Sound effects"]];
// the folders, top to bottom: 1_Images, 2_Footage, 3_Design, 4_Fonts, 5_Audio; Audio opens onto Voice, SFX
// and Music (the timeline's three sound lanes). Missing files come first, anything else last.
const GROUPS = [["missing", "Missing files"], ["image", "1_Images"], ["footage", "2_Footage"], ["design", "3_Design"], ["font", "4_Fonts"], ["audio", "5_Audio"], ["other", "Other"]];
const AUDIO_KIDS = [["voiceover", "Voice"], ["sfx", "SFX"], ["music", "Music"]];
// The Studio: the groups in plain words, not the folder names on disk; The Desk keeps the folder names
const STUDIO_NAMES = { image: "Pictures", footage: "Footage", design: "Design files", font: "Fonts", audio: "Audio", voiceover: "Voice-over", sfx: "Sound effects", music: "Music" };

const fmtSize = (b) => (b == null ? "" : b >= 1024 ** 3 ? `${(b / 1024 ** 3).toFixed(1)} GB` : b >= 1024 ** 2 ? `${(b / 1024 ** 2).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);
const fmtDur = (s) => { if (!s && s !== 0) return ""; const m = Math.floor(s / 60); return `${m}:${String(Math.round(s - m * 60)).padStart(2, "0")}`; };
const audioFolder = (a) => AUDIO_FOLDERS.find(([k]) => new RegExp(`(^|/)${k}(/|$)`).test(a.folder ?? a.path))?.[0] ?? null;
// the server's own `group` for each file when it gives one (images, footage, design, fonts, voiceover, sfx, music, other), else
// the file's kind and folder
const GROUP_OF = { images: "image", footage: "footage", design: "design", fonts: "font", voiceover: "audio", sfx: "audio", music: "audio", other: "other" };
const groupOf = (a) => (a.status === "missing" ? "missing" : GROUP_OF[a.group] ?? (a.kind === "sequence" ? "footage" : a.kind in ICON && a.kind !== "other" ? a.kind : "other"));
const kidOf = (a) => (["voiceover", "sfx", "music"].includes(a.group) ? a.group : audioFolder(a));
// No file names on screen: a font family's files are one row with the family's name ("Be Vietnam Pro · 18 styles"),
// as the server already does for the app's own fonts (`app`); "BeVietnamPro-BoldItalic.ttf" → "Be Vietnam Pro"
export const fontFamily = (name) => String(name ?? "").replace(/\.[a-z0-9]+$/i, "").replace(/\[.*$/, "").replace(/[-_](?!.*[-_]).*$/, "").replace(/[-_]/g, " ")
  .replace(/([a-z])([A-Z])/g, "$1 $2").replace(/\s+/g, " ").trim();
export function fontRows(xs) {
  const fam = new Map(), out = [];
  for (const a of xs) {
    if (a.app || a.status === "missing") { out.push(a); continue; }
    const k = fontFamily(a.name) || a.name;
    const g = fam.get(k);
    if (!g) { const row = { ...a, name: k, files: 1, members: [a] }; fam.set(k, row); out.push(row); continue; }
    g.files++; g.members.push(a); g.size = (g.size ?? 0) + (a.size ?? 0); if (a.status === "new") g.status = "new";
    g.usedIn = [...new Set([...(g.usedIn ?? []), ...(a.usedIn ?? [])])];
  }
  return out;
}

/** Where "Put on the timeline" starts a sound: at the playhead; one that would run past the film's end is moved back to end with it,
 *  never before 0. `length` the sound's, `film` the film's (seconds; unknown: the playhead as it is). */
export function fitStart(at, length, film) {
  const f = Math.max(0, Number(film) || 0), l = Math.max(0, Number(length) || 0);
  const s = Math.max(0, Number(at) || 0);
  return Math.round((f > 0 && s + l > f ? Math.max(0, f - l) : s) * 1000) / 1000;
}

/** A sound onto the timeline, from the menu or a drop on a lane: `start` in seconds; `lane` ("voiceover" | "sfx" | "music") only for a
 *  drop, else the file's folder picks it. `at`: where it went, or null when it waits (a voice-over whose words are transcribed first). */
export async function putOnTimeline(projectId, path, { start = null, lane = null } = {}) {
  const r = await post(`/api/projects/${projectId}/assets/timeline`, { path, ...(start != null ? { start } : {}), ...(lane ? { lane } : {}) });
  const at = r.clip ? Number(r.clip["data-start"]) : r.lane === "voiceover" && !r.voice?.file ? null : start ?? 0;
  return { ...r, at };
}
/** The toast after it: "On the timeline at 1:05: bell.wav". */
export const placedSay = (t, name, at) => (at == null ? t("On the timeline: {name}", { name }) : t("On the timeline at {time}: {name}", { time: clockTenths(at), name }));

/** The server's list: { items } (pipeline v2), or the older { assets } read the same way. */
function normalise(r) {
  if (r.items) return r.items;
  return (r.assets ?? []).map((a) => ({ ...a, folder: a.path.split("/").slice(0, -1).join("/"), kind: a.kind === "video" ? "footage" : a.kind, status: "ok", usedIn: [] }));
}

export function useAssets(projectId) {
  const [items, setItems] = useState(null);
  const load = useCallback(() => get(`/api/projects/${projectId}/assets`).then((r) => setItems(normalise(r))).catch(() => setItems((x) => x ?? [])), [projectId]);
  useEffect(() => {
    load();
    const back = () => { if (!document.hidden) load(); };          // files changed in Explorer show when the window comes back
    addEventListener("focus", back); document.addEventListener("visibilitychange", back);
    return () => { removeEventListener("focus", back); document.removeEventListener("visibilitychange", back); };
  }, [load]);
  return [items, load];
}

/** "Relink": a missing file -> another file of the same kind in the project (copy it into assets/ in Explorer first; it shows as New). */
function Relink({ item, items, projectId, onDone, onClose }) {
  const t = useT();
  const toast = useToast();
  const same = items.filter((x) => x.status !== "missing" && (x.kind === item.kind || (item.kind === "footage" && x.kind === "sequence")));
  const [to, setTo] = useState(same[0]?.path ?? "");
  const [busy, setBusy] = useState(false);
  const go = async () => {
    setBusy(true);
    try { await post(`/api/projects/${projectId}/assets/relink`, { from: item.path, to }); toast(t("Relinked: {name}", { name: to.split("/").pop() })); onDone(true); onClose(); }
    catch (e) { toast(e.message, "error"); } finally { setBusy(false); }
  };
  return <Dialog title={t("Relink {name}", { name: item.name })} onClose={onClose} footer={<>
    <button className="btn ghost" onClick={onClose}>{t("Cancel")}</button>
    <button className="btn primary" disabled={!to || busy} onClick={go}>{busy && <Loader2 size={14} className="spin" />}{t("Relink")}</button></>}>
    <p>{item.usedIn?.length ? t("Used in shot {list}. Pick the file that replaces it everywhere in the film.", { list: item.usedIn.join(", ") })
      : t("Pick the file that replaces it everywhere in the film.")}</p>
    {same.length ? <select className="select" value={to} onChange={(e) => setTo(e.target.value)} aria-label={t("Replacement file")}>
      {same.map((x) => <option key={x.path} value={x.path}>{x.name}</option>)}</select>
      : <p className="hint">{t("No other file of this kind yet. Add one with Add files, then pick it here.")}</p>}
  </Dialog>;
}

function Row({ a, items, projectId, fileUrl, locked, time, length, onChanged, onTranscript, onShot }) {
  const t = useT();
  const toast = useToast();
  const [busy, setBusy] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [relink, setRelink] = useState(false);
  const [del, setDel] = useState(null);          // { inUse } while the delete question is open
  const I = ICON[a.kind] ?? FileText;
  const call = async (what, body, done) => {
    setBusy(what);
    try { const r = await post(`/api/projects/${projectId}/assets/${what}`, { path: a.path, ...body }); if (done) toast(done); onChanged(what === "timeline" || what === "move"); return r; }
    catch (e) { if (e.code === "IN_USE") setDel({ inUse: true }); else toast(e.message, "error"); return null; }
    finally { setBusy(null); }
  };
  const reveal = () => post(`/api/projects/${projectId}/files/reveal`, { path: a.path }).catch((e) => toast(e.message, "error"));
  // at the playhead, on the lane its folder gives
  const place = async () => {
    setBusy("timeline");
    try { const r = await putOnTimeline(projectId, a.path, { start: fitStart(time, a.duration, length) }); toast(placedSay(t, a.name, r.at)); onChanged(true); }
    catch (e) { toast(e.message, "error"); }
    finally { setBusy(null); }
  };
  // a sound drags onto a lane of the timeline (the menu item stays for the keyboard); the drag carries the path, never shown
  const drags = a.kind === "audio" && a.status !== "missing" && !locked && !busy;
  const dragProps = drags ? { draggable: true, onDragStart: (e) => { e.dataTransfer.setData(SOUND_MIME, a.path); e.dataTransfer.effectAllowed = "copy"; setDragging(true); },
    onDragEnd: () => setDragging(false) } : null;
  const sound = a.kind === "audio" || a.kind === "footage";
  const folder = kidOf(a);
  const showIt = { label: t("Show in Explorer"), icon: <FolderOpen size={14} />, onSelect: reveal };
  const menu = [
    a.kind === "audio" && !a.onTimeline && { label: t("Put on the timeline"), icon: <Clapperboard size={14} />, onSelect: place },
    sound && { label: a.transcript === "saved" || a.transcript === "review" ? t("Open the words") : t("Transcribe"), icon: <AudioLines size={14} />,
      onSelect: async () => { if (a.transcript !== "saved" && a.transcript !== "review") { if (!(await call("transcribe", {}))) return; } onTranscript(a.path); } },
    ...(a.kind === "audio" && !a.app ? AUDIO_FOLDERS.filter(([k]) => k !== folder).map(([k, l]) => ({ label: t("Move to: {where}", { where: t(l) }), onSelect: () => call("move", { folder: k }, t("Moved to {where}", { where: t(l) })) })) : []),
    showIt,
    // the app's own files (its embedded fonts, its sound effects: `app: true`) are not moved, relinked or deleted from here
    !a.app && !a.members && "-",
    !a.app && !a.members && { label: t("Delete"), icon: <Trash2 size={14} />, onSelect: () => setDel({ inUse: (a.usedIn ?? []).length > 0 }) },
  ].filter(Boolean);
  // kind, length and size only (no side notes such as "on the timeline" or "from the app")
  const sub = [t(KIND[a.kind] ?? "File"), a.files > 1 ? t("{n} styles", { n: a.files }) : null, a.duration ? fmtDur(a.duration) : null, a.frames ? t("{n} frames", { n: a.frames }) : null, fmtSize(a.size)].filter(Boolean).join(" · ");
  const shotsIn = (a.usedIn ?? []).filter((n) => Number.isFinite(Number(n)) && typeof n !== "boolean");
  // no paths on screen: the name, and the app's note when there is one
  return <li className={"as-row" + (a.status === "missing" ? " missing" : "") + (dragging ? " dragging" : "")} title={a.note ? `${a.name}\n${a.note}` : a.name} {...dragProps}>
    <span className={"as-thumb " + a.kind + (a.kind === "audio" ? " " + (folder ?? "audio") : "")} aria-hidden="true">
      {a.kind === "image" && a.status !== "missing" && fileUrl ? <img src={fileUrl(a.path)} alt="" loading="lazy" /> : <I size={14} />}</span>
    <span className="as-t">
      <span className="as-name">{a.name}{a.status === "new" && <span className="as-new">{t("New")}</span>}</span>
      <span className="as-sub">{a.status === "missing" ? t("Missing") : sub}</span>
      {shotsIn.length > 0 && <span className="as-used">{t("In shot")} {shotsIn.map((n, i) => <button key={n} className="clink" onClick={() => onShot(Number(n))}>{n}{i < shotsIn.length - 1 ? "," : ""}</button>)}</span>}
    </span>
    {busy ? <Loader2 size={14} className="spin as-busy" />
      : a.status === "missing" && !a.app ? <button className="btn sm" disabled={locked} onClick={() => setRelink(true)}>{t("Relink")}</button>
        : <Menu trigger={<MoreHorizontal size={14} />} label={t("More for {name}", { name: a.name })} items={locked ? [showIt] : menu} />}
    {relink && <Relink item={a} items={items} projectId={projectId} onDone={onChanged} onClose={() => setRelink(false)} />}
    {del && <Dialog title={t("Delete {name}?", { name: a.name })} danger onClose={() => setDel(null)} footer={<>
      <button className="btn ghost" onClick={() => setDel(null)}>{t("Cancel")}</button>
      <button className="btn danger" onClick={async () => { const ok = await call("delete", del.inUse ? { force: true } : {}, t("Deleted: {name}", { name: a.name })); if (ok) setDel(null); }}>{t("Delete")}</button></>}>
      <p>{del.inUse ? t("The film uses it in shot {list}: those shots will show a missing file until you relink or change them.", { list: (a.usedIn ?? []).join(", ") || "?" })
        : t("The file is removed from the project folder.")}</p>
    </Dialog>}
  </li>;
}

export default function AssetsPanel({ projectId, items, reload, fileUrl, locked, time = 0, length = 0, onTranscript, onTimelineChanged, onShot }) {
  const t = useT();
  const studio = useThemeId() === "studio";
  const [folded, setFolded] = usePref("editor:assets-folded", {});
  const groups = useMemo(() => {
    const by = new Map();
    for (const a of items ?? []) { const g = groupOf(a); if (!by.has(g)) by.set(g, []); by.get(g).push(a); }
    const order = (xs) => xs.sort((x, y) => (x.status === "new") - (y.status === "new") || x.name.localeCompare(y.name));
    return GROUPS.filter(([k]) => by.has(k)).map(([k, l]) => [k, studio ? STUDIO_NAMES[k] ?? l : l, order(by.get(k))]);
  }, [items, studio]);
  const changed = (timeline) => { reload(); if (timeline) onTimelineChanged?.(); };
  const row = (a) => <Row key={a.path} a={a} items={items} projectId={projectId} fileUrl={fileUrl} locked={locked} time={time} length={length} onChanged={changed} onTranscript={onTranscript} onShot={onShot} />;
  /** A folder that opens and closes like one of After Effects' Project panel. */
  const folder = (k, label, count, body, depth = 0) => <section key={k} className={"as-grp " + k + (depth ? " sub" : "")}>
    <h3><button className="as-fold" aria-expanded={!folded[k]} onClick={() => setFolded((f) => ({ ...f, [k]: !f[k] }))}>
      {folded[k] ? <ChevronRight size={12} /> : <ChevronDown size={12} />}{folded[k] ? <Folder size={14} /> : <FolderOpen size={14} />}<span>{t(label)}</span></button><span className="num">{count}</span></h3>
    {!folded[k] && body}
  </section>;
  return <div className="as">
    {items === null ? <div className="skeleton" style={{ height: "4rem", margin: "8px 10px" }} />
      : !items.length ? <p className="as-empty">{t("No files yet. Add pictures, footage, voice-over, music, fonts or design files.")}</p>
        : groups.map(([k, label, xs]) => k !== "audio" ? folder(k, label, xs.length, <ul className="plain">{(k === "font" ? fontRows(xs) : xs).map(row)}</ul>)
          : folder(k, label, xs.length, <>
            {AUDIO_KIDS.map(([kk, l]) => { const ys = xs.filter((a) => kidOf(a) === kk); return ys.length ? folder("audio-" + kk, studio ? STUDIO_NAMES[kk] : l, ys.length, <ul className="plain">{ys.map(row)}</ul>, 1) : null; })}
            {xs.some((a) => !kidOf(a)) && <ul className="plain">{xs.filter((a) => !kidOf(a)).map(row)}</ul>}
          </>))}
  </div>;
}
