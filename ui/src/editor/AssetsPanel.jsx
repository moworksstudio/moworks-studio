// The Assets tab beside Shots, like the Project panel of After Effects or Premiere: every file the
// project holds, by folder (images, footage, audio as voice-over / music / sound effects, fonts, design files), each with its size,
// length or frame count, where the film uses it, and Claude's note. The list is read again on every visit and when the window comes
// back to the app (the server compares the film's paths with the disk): a file the film uses that is gone shows as "Missing" with
// "Relink"; a file copied in from Explorer shows as "New". Audio and footage can be transcribed and put on the timeline: at the
// playhead from the menu, or dragged onto a lane of the timeline.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AudioLines, ChevronDown, ChevronRight, Clapperboard, FileText, Film, Folder, FolderOpen, Image as ImageIcon, Images, Loader2, MoreHorizontal, Play, Replace, Square, Trash2, Type } from "lucide-react";
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
/** One folder, one lane (owner 03/11): a sound goes on its own folder's lane only; on another one it is moved there first, so the folder
 *  and the lane always say the same. A drop's lane ("voiceover" | "sfx" | "music") against the file: null, or why not. */
export function laneRefusal(a, lane, t) {
  const folder = a?.kind === "audio" ? kidOf(a) : null;
  if (!folder || !lane || lane === folder) return null;
  return t("Move it to {where} first", { where: t(AUDIO_FOLDERS.find(([k]) => k === lane)?.[1] ?? lane) });
}
// No file names on screen: a font family's files are one row with the family's name ("Be Vietnam Pro · 18 styles"),
// as the server already does for the app's own fonts (`app`); "BeVietnamPro-BoldItalic.ttf" → "Be Vietnam Pro"
/** The shots a file is in, sorted, runs of three or more joined: [{ from, to }] that reads "3–9, 12" (Test 30: "In shot 6,2,8,9,5,3,12,7…"). */
export function runsOfShots(usedIn) {
  const nums = [...new Set((usedIn ?? []).filter((n) => typeof n !== "boolean" && Number.isFinite(Number(n))).map(Number))].sort((a, b) => a - b);
  const runs = [];
  for (const n of nums) { const r = runs.at(-1); if (r && n === r.to + 1) r.to = n; else runs.push({ from: n, to: n }); }
  return runs.flatMap((r) => (r.to === r.from + 1 ? [{ from: r.from, to: r.from }, { from: r.to, to: r.to }] : [r]));
}
export const shotRunText = (r) => (r.from === r.to ? String(r.from) : `${r.from}–${r.to}`);
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
/** The toast after it: "On the timeline at 1:05: bell.wav"; cut: it stops where the film ends. */
export const placedSay = (t, name, at, cut = false) => (at == null ? t("On the timeline: {name}", { name })
  : cut ? t("On the timeline at {time}: {name}. It stops where the film ends.", { time: clockTenths(at), name })
    : t("On the timeline at {time}: {name}", { time: clockTenths(at), name }));

/** A sound heard at once from its row (owner #921), never put on the timeline: one at a time, it stops when another starts, when it is pressed again or
 *  when the tab closes. Listeners: the rows, to show which one plays. */
const listen = { el: null, path: null, subs: new Set() };
const listenSay = () => listen.subs.forEach((f) => f(listen.path));
export function stopListening() {
  if (listen.el) { listen.el.pause(); listen.el.removeAttribute("src"); listen.el.load(); }
  listen.el = null; listen.path = null; listenSay();
}
function startListening(path, url, onFail) {
  stopListening();
  const el = new Audio(url);
  listen.el = el; listen.path = path; listenSay();
  el.addEventListener("ended", () => { if (listen.el === el) stopListening(); });
  el.play().catch(() => { if (listen.el === el) { stopListening(); onFail?.(); } });
}
function useListening() {
  const [now, setNow] = useState(listen.path);
  useEffect(() => { listen.subs.add(setNow); return () => { listen.subs.delete(setNow); }; }, []);
  return now;
}

/** The warning before another voice becomes the film's after Version 1 (owner #920, #937): the picture was timed to the old voice. Claude does not
 *  re-time it; the Review says where it finds the picture off the voice. */
export function VoiceSwapDialog({ name, onYes, onClose }) {
  const t = useT();
  return <Dialog title={t("Use {name} as the film's voice-over?", { name })} onClose={onClose} footer={<>
    <button className="btn ghost" onClick={onClose}>{t("Cancel")}</button>
    <button className="btn primary" onClick={() => { onClose(); onYes(); }}>{t("Use this voice")}</button></>}>
    <p>{t("The picture was timed to the old voice.")}<br />{t("With this one it may be off in places.")}</p>
    <p className="hint">{t("Claude does not re-time the film. The Review says where it finds the picture off the voice.")}</p>
  </Dialog>;
}
/** Whether another voice made the film's after Version 1 needs that warning first. */
export const voiceSwapAsks = (project, path) => !!project?.meta?.pipeline?.version1?.at && !!project?.meta?.voice?.file && project.meta.voice.file !== path;

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

/** Where a sound plays in the film (owner 03/11, 1a): the film's own voice or music says its track; any other sound its times, each a link to the
 *  playhead; one nothing uses says so. At most MAX_TIMES links, then "+N". */
const MAX_TIMES = 6;
function SoundUse({ a, onSeek }) {
  const t = useT();
  const times = a.times ?? [];
  const track = a.track === "voice" ? t("On the Voice track") : a.track === "music" ? t("On the Music track") : null;
  if (!track && !times.length) return a.usedIn?.some((n) => typeof n === "number") ? null : <span className="as-used none">{t("Not used")}</span>;
  return <>
    {track && <span className="as-used track">{track}</span>}
    {times.length > 0 && <span className="as-used">{track ? t("Also used {n}×", { n: times.length }) : t("Used {n}×", { n: times.length })}{" "}
      {times.slice(0, MAX_TIMES).map((s, i) => <button key={`${s}-${i}`} className="clink num" onClick={() => onSeek?.(s)} title={t("Move the playhead to {time}", { time: clockTenths(s) })}>{clockTenths(s)}</button>)}
      {times.length > MAX_TIMES && <span className="num"> +{times.length - MAX_TIMES}</span>}</span>}
  </>;
}

function Row({ a, items, projectId, project, fileUrl, locked, time, length, flash, onChanged, onTranscript, onShot, onSeek }) {
  const t = useT();
  const toast = useToast();
  const [busy, setBusy] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [relink, setRelink] = useState(false);
  const [del, setDel] = useState(null);          // { inUse } while the delete question is open
  const [swap, setSwap] = useState(false);          // the voice warning before "Use as the film's voice-over"
  const listening = useListening() === a.path;
  const ref = useRef(null);
  useEffect(() => { if (flash) ref.current?.scrollIntoView({ block: "center", behavior: "smooth" }); }, [flash]);
  const I = ICON[a.kind] ?? FileText;
  const call = async (what, body, done) => {
    setBusy(what);
    try { const r = await post(`/api/projects/${projectId}/assets/${what}`, { path: a.path, ...body }); if (done) toast(done); onChanged(what === "timeline" || what === "move" || what === "use"); return r; }
    catch (e) { if (e.code === "IN_USE") setDel({ inUse: true }); else toast(e.message, "error"); return null; }
    finally { setBusy(null); }
  };
  const reveal = () => post(`/api/projects/${projectId}/files/reveal`, { path: a.path }).catch((e) => toast(e.message, "error"));
  // at the playhead, on the lane the menu names
  const place = async (lane) => {
    setBusy("timeline");
    try { const r = await putOnTimeline(projectId, a.path, { start: fitStart(time, a.duration, length), lane }); toast(placedSay(t, a.name, r.at, r.cut)); onChanged(true); }
    catch (e) { toast(e.message, "error"); }
    finally { setBusy(null); }
  };
  // "Use as the film's voice-over / music" (2a): the only way to replace them
  const useAs = async (as) => {
    const r = await call("use", { as });
    if (!r) return;
    // a new voice is transcribed first; with no speech model yet the server says how to get one
    if (as === "voiceover" && r.voice?.needsModel) toast(r.voice.needsModel, "error");
    else toast(as === "music" ? t("{name} is the film's music now", { name: a.name })
      : r.voice?.job ? t("{name} is the film's voice-over now. Its words are read first, then it goes on the timeline.", { name: a.name }) : t("{name} is the film's voice-over now", { name: a.name }));
  };
  // a sound drags onto a lane of the timeline (the menu item stays for the keyboard); the drag carries the path, never shown
  const drags = a.kind === "audio" && a.status !== "missing" && !locked && !busy;
  const dragProps = drags ? { draggable: true, onDragStart: (e) => { e.dataTransfer.setData(SOUND_MIME, a.path); e.dataTransfer.effectAllowed = "copy"; setDragging(true); },
    onDragEnd: () => setDragging(false) } : null;
  const sound = a.kind === "audio" || a.kind === "footage";
  const folder = kidOf(a);
  const showIt = { label: t("Show in Explorer"), icon: <FolderOpen size={14} />, onSelect: reveal };
  const trackName = (k) => t(AUDIO_KIDS.find(([x]) => x === k)[1]);
  const own = !!a.track && a.track === (folder === "voiceover" ? "voice" : folder);          // the film's own voice or music, in its own folder
  // The menu is the same for every file of a kind (owner 03/11, 1e): what cannot run now is greyed with its reason, never left out
  const menu = [
    // one folder, one lane (owner 03/11): a sound goes on its own folder's lane; the film's voice or music already on it says so instead
    // (a sound effect can be used again); a file in no sound folder (an older project) offers the three lanes
    ...(a.kind !== "audio" ? [] : !folder ? AUDIO_KIDS.map(([k, l]) => ({ label: t("Add to {track} track", { track: t(l) }), icon: <Clapperboard size={14} />, onSelect: () => place(k) }))
      : folder !== "sfx" && a.onTimeline && own ? [{ label: t("On the {track} track", { track: trackName(folder) }), icon: <Clapperboard size={14} />, disabled: true }]
        : [{ label: t("Add to {track} track", { track: trackName(folder) }), icon: <Clapperboard size={14} />, onSelect: () => place(folder) }]),
    // the only way to replace the film's voice or music (2a); "Add to … track" only ever adds a clip
    a.kind === "audio" && folder === "voiceover" && { label: t("Use as the film's voice-over"), icon: <Replace size={14} />,
      ...(a.track === "voice" ? { disabled: true, hint: t("It is the film's voice-over") } : { onSelect: () => (voiceSwapAsks(project, a.path) ? setSwap(true) : useAs("voiceover")) }) },
    a.kind === "audio" && folder === "music" && { label: t("Use as the film's music"), icon: <Replace size={14} />,
      ...(a.track === "music" ? { disabled: true, hint: t("It is the film's music") } : { onSelect: () => useAs("music") }) },
    sound && (a.kind === "footage" || folder === "voiceover" || a.transcript === "saved" || a.transcript === "review") && { label: a.transcript === "saved" || a.transcript === "review" ? t("Open the words") : t("Transcribe"), icon: <AudioLines size={14} />,
      onSelect: async () => { if (a.transcript !== "saved" && a.transcript !== "review") { if (!(await call("transcribe", {}))) return; } onTranscript(a.path); } },
    ...(a.kind === "audio" && !a.app ? AUDIO_FOLDERS.filter(([k]) => k !== folder).map(([k, l]) => ({ label: t("Move to: {where}", { where: t(l) }), onSelect: () => call("move", { folder: k }, t("Moved to {where}", { where: t(l) })) })) : []),
    showIt,
    // the app's own files (its embedded fonts, its sound effects: `app: true`) are not moved, relinked or deleted from here
    !a.app && !a.members && "-",
    !a.app && !a.members && { label: t("Delete"), icon: <Trash2 size={14} />, onSelect: () => setDel({ inUse: (a.usedIn ?? []).length > 0 }) },
  ].filter(Boolean);
  // while the film renders, the same items greyed with the reason; Show in Explorer still works
  const items_ = locked ? menu.map((it) => (it === "-" || it === showIt || it.disabled ? it : { ...it, disabled: true, hint: t("Wait until the render finishes"), onSelect: undefined })) : menu;
  // kind, length and size only (no side notes such as "on the timeline" or "from the app")
  const sub = [t(KIND[a.kind] ?? "File"), a.files > 1 ? t("{n} styles", { n: a.files }) : null, a.duration ? fmtDur(a.duration) : null, a.frames ? t("{n} frames", { n: a.frames }) : null, fmtSize(a.size)].filter(Boolean).join(" · ");
  const shotRuns = runsOfShots(a.usedIn);
  const url = a.kind === "audio" && a.status !== "missing" && fileUrl ? fileUrl(a.path) : null;
  // no paths on screen: the name, and the app's note when there is one
  return <li ref={ref} className={"as-row" + (a.status === "missing" ? " missing" : "") + (dragging ? " dragging" : "") + (a.kind === "audio" && a.status !== "missing" ? " snd" : "") + (flash ? " flash" : "")} title={a.note ? `${a.name}\n${a.note}` : a.name} {...dragProps}>
    <span className={"as-thumb " + a.kind + (a.kind === "audio" ? " " + (folder ?? "audio") : "")} aria-hidden="true">
      {a.kind === "image" && a.status !== "missing" && fileUrl ? <img src={fileUrl(a.path)} alt="" loading="lazy" /> : <I size={14} />}</span>
    <span className="as-t">
      <span className="as-name">{a.name}{a.status === "new" && <span className="as-new">{t("New")}</span>}</span>
      <span className="as-sub">{a.status === "missing" ? t("Missing") : sub}</span>
      {a.unread && <span className="as-unread">{t("Not read: {why}", { why: t(a.unread) })}</span>}
      {a.kind === "audio" && a.status !== "missing" && <SoundUse a={a} onSeek={onSeek} />}
      {shotRuns.length > 0 && <span className="as-used">{t("In shot")} {shotRuns.map((run, i) => <button key={run.from} className="clink" onClick={() => onShot(run.from)}>{shotRunText(run)}{i < shotRuns.length - 1 ? "," : ""}</button>)}</span>}
    </span>
    <span className="as-acts">
      {a.kind === "audio" && a.status !== "missing" && <button className={"btn ghost icon sm as-play" + (listening ? " on" : "")} aria-pressed={listening} disabled={!url}
        aria-label={listening ? t("Stop {name}", { name: a.name }) : t("Listen to {name}", { name: a.name })} title={!url ? t("The film's preview is still loading") : listening ? t("Stop") : t("Listen")}
        onClick={(e) => { e.stopPropagation(); if (listening) stopListening(); else startListening(a.path, url, () => toast(t("This sound could not be played"), "error")); }}>
        {listening ? <Square size={12} /> : <Play size={13} />}</button>}
      {busy ? <Loader2 size={14} className="spin as-busy" />
        : a.status === "missing" && !a.app ? <button className="btn sm" disabled={locked} onClick={() => setRelink(true)}>{t("Relink")}</button>
          : <Menu trigger={<MoreHorizontal size={14} />} label={t("More for {name}", { name: a.name })} items={items_} />}
    </span>
    {relink && <Relink item={a} items={items} projectId={projectId} onDone={onChanged} onClose={() => setRelink(false)} />}
    {swap && <VoiceSwapDialog name={a.name} onYes={() => useAs("voiceover")} onClose={() => setSwap(false)} />}
    {del && <Dialog title={t("Delete {name}?", { name: a.name })} danger onClose={() => setDel(null)} footer={<>
      <button className="btn ghost" onClick={() => setDel(null)}>{t("Cancel")}</button>
      <button className="btn danger" onClick={async () => { const ok = await call("delete", del.inUse ? { force: true } : {}, t("Deleted: {name}", { name: a.name })); if (ok) setDel(null); }}>{t("Delete")}</button></>}>
      <p>{del.inUse ? t("The film uses it in shot {list}: those shots will show a missing file until you relink or change them.", { list: runsOfShots(a.usedIn).map(shotRunText).join(", ") || "?" })
        : t("The file is removed from the project folder.")}</p>
    </Dialog>}
  </li>;
}

export default function AssetsPanel({ projectId, project = null, items, reload, fileUrl, locked, time = 0, length = 0, focus = null, onTranscript, onTimelineChanged, onShot, onSeek }) {
  const t = useT();
  const studio = useThemeId() === "studio";
  const [folded, setFolded] = usePref("editor:assets-folded", {});
  useEffect(() => () => stopListening(), []);          // the tab closed: what plays stops
  // "Show in Assets" from the timeline (1c): its folders open and its row lights for a moment
  const [flash, setFlash] = useState(null);
  useEffect(() => {
    if (!focus?.path || !items) return undefined;
    const a = items.find((x) => x.path === focus.path);
    if (!a) return undefined;
    const g = groupOf(a), k = kidOf(a);
    setFolded((f) => ({ ...f, [g]: false, ...(g === "audio" && k ? { ["audio-" + k]: false } : {}) }));
    setFlash(a.path);
    const h = setTimeout(() => setFlash(null), 2400);
    return () => clearTimeout(h);
  }, [focus?.n, !!items]); // eslint-disable-line react-hooks/exhaustive-deps
  const groups = useMemo(() => {
    const by = new Map();
    for (const a of items ?? []) { const g = groupOf(a); if (!by.has(g)) by.set(g, []); by.get(g).push(a); }
    const order = (xs) => xs.sort((x, y) => (x.status === "new") - (y.status === "new") || x.name.localeCompare(y.name));
    return GROUPS.filter(([k]) => by.has(k)).map(([k, l]) => [k, studio ? STUDIO_NAMES[k] ?? l : l, order(by.get(k))]);
  }, [items, studio]);
  const changed = (timeline) => { reload(); if (timeline) onTimelineChanged?.(); };
  const row = (a) => <Row key={a.path} a={a} items={items} projectId={projectId} project={project} fileUrl={fileUrl} locked={locked} time={time} length={length} flash={flash === a.path}
    onChanged={changed} onTranscript={onTranscript} onShot={onShot} onSeek={onSeek} />;
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
