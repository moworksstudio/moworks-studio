// Notes pinned to a time in the film (they go in the user's chat message, with the timecode): the user pins a note at a
// second of the film while watching (a point or a box on the frame if they like) and sends it with the message. Each note gets a still of
// its frame and the shot at its time; Claude reads them all, and a note whose time is past the film's end, or which names a shot that is not
// at its time, is Claude's to check first and ask about, as a storyboard note on a panel that does not exist.
// The user never sees a file path: stills go to the chat card as URLs, to Claude as project paths.
import { existsSync, mkdirSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
import { snapshotAtAsync } from "../hf-qa/cli.mjs";
import { placedShots, readShots } from "../hf-edit/shots.mjs";

const clamp01 = (v) => (Number.isFinite(Number(v)) ? Math.min(1, Math.max(0, Number(v))) : null);
const mmss = (t) => `${Math.floor(t / 60)}:${(t % 60).toFixed(1).padStart(4, "0")}`;


/** The film's shots on its time line and its length. */
export async function filmShots(dir) {
  const { shots, root } = await readShots(dir);
  const placed = placedShots(shots, root?.duration).filter((s) => s.duration);
  const duration = Number(root?.duration) || placed.reduce((a, s) => Math.max(a, s.start + s.duration), 0) || null;
  return { shots: placed.map((s) => ({ number: s.number, title: s.title, start: s.start, duration: s.duration })), duration };
}
/** The shot playing at t (the last one that started), or null. */
export const shotAt = (shots, t) => [...shots].reverse().find((s) => t >= s.start - 1e-6) ?? null;

/** A note as the user sent it, cleaned: { id, t, shot, x?, y?, box?, text, at }; the shot from its time. */
export function cleanNote(n, shots) {
  const t = Math.max(0, Math.round(Number(n.t) * 100) / 100 || 0);
  const pt = clamp01(n.x) != null && clamp01(n.y) != null ? { x: clamp01(n.x), y: clamp01(n.y) } : {};
  const b = n.box && ["x", "y", "w", "h"].every((k) => clamp01(n.box[k]) != null) ? { box: { x: clamp01(n.box.x), y: clamp01(n.box.y), w: clamp01(n.box.w), h: clamp01(n.box.h) } } : {};
  return { id: /^[\w-]{4,40}$/.test(String(n.id ?? "")) ? String(n.id) : randomBytes(5).toString("hex"), t, shot: shotAt(shots, t)?.number ?? null, ...pt, ...b,
    text: String(n.text ?? "").normalize("NFC").slice(0, 4000), at: n.at ?? new Date().toISOString() };
}

/** What does not fit in a note, for Claude to check first: past the end, or a shot named in its words that is not the one at its time. */
export function noteProblems(note, shots, duration) {
  const out = [];
  if (duration && note.t > duration + 0.05) out.push(`its time ${mmss(note.t)} is past the film's end (${mmss(duration)})`);
  const named = [...note.text.matchAll(/(?:@Shot_|\b(?:shot|cảnh|canh|scene)\s*)(\d{1,3})\b/gi)].map((m) => Number(m[1]));
  for (const n of [...new Set(named)]) {
    if (!shots.some((s) => s.number === n)) out.push(`it names shot ${n}, and the film has ${shots.length} shots`);
    else if (note.shot != null && n !== note.shot) out.push(`it names shot ${n}, but at ${mmss(note.t)} the film shows shot ${note.shot}`);
  }
  return out;
}

/** Notes for one chat turn: a still of each note's frame, what the app found that does not fit, the block Claude reads (each note's time,
 *  shot, place on the frame and still) and the chat card's media (URLs, never a path). notes: cleaned notes with text. */
export async function notesForChat(p, notes, { snap = snapshotAtAsync, signal = null, urlOf = () => null } = {}) {
  const { shots, duration } = await filmShots(p.path);
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const rel = `.moworks/cache/posters/notes/${stamp}`, out = join(p.path, ...rel.split("/"));          // under posters/: the preview origin serves it
  mkdirSync(out, { recursive: true });
  const times = notes.map((n) => Math.min(n.t, duration ? Math.max(0, duration - 0.04) : n.t));
  let stills = [];
  try {
    const x = await snap(p.path, times, out, { signal });
    const files = existsSync(out) ? readdirSync(out).filter((f) => /^frame-\d+-at-[\d.]+s\.png$/.test(f)).sort() : [];
    stills = notes.map((_, i) => (files[i] ? `${rel}/${files[i]}` : null));
    if (x?.exitCode !== 0 && !files.length) stills = [];
  } catch { stills = []; }
  const missing = notes.map((n) => ({ id: n.id, problems: noteProblems(n, shots, duration) })).filter((x) => x.problems.length);
  const place = (n) => (n.box ? `, the box at ${Math.round(n.box.x * 100)} % across, ${Math.round(n.box.y * 100)} % down, ${Math.round(n.box.w * 100)} × ${Math.round(n.box.h * 100)} % of the frame`
    : n.x != null ? `, the point ${Math.round(n.x * 100)} % across and ${Math.round(n.y * 100)} % down the frame` : "");
  const shotName = (k) => { const s = shots.find((x) => x.number === k); return s ? `shot ${k}${s.title ? ` "${s.title}"` : ""}` : "no shot"; };
  const lines = notes.map((n, i) => `${i + 1}. At ${mmss(n.t)} (${shotName(n.shot)})${place(n)}: ${n.text.trim()}${stills[i] ? `\n   Still of that frame: ${stills[i]}` : ""}`);
  const block = [
    `The owner watched the film and pinned ${notes.length} note(s) to its time line (their words, as they wrote them):`, "", ...lines, "",
    "First check each note against its frame: open its still (or take one at its time). A note that does not fit (its time is past the film's end, it names a shot that is not at its time, its point or box shows nothing it speaks of, two notes contradict) is a conflict (moworks-studio §2b): say each point, offer the choices (e.g. \"did you mean shot 4 at 0:15?\"), and change nothing for it.",
    ...(missing.length ? [`The app found these already: ${missing.map((x) => `note ${notes.findIndex((n) => n.id === x.id) + 1}: ${x.problems.join("; ")}`).join(". ")}.`] : []),
    "Make every note that fits, as your rules say; then look at what you changed (qc_sheets once) and say what you saw, shot by shot. Never tell the owner to render again: the app makes the film ready to render by itself.",
  ].join("\n");
  // the chat card shows each note's frame with its words and the point or box drawn on it
  const media = notes.map((n, i) => ({ url: urlOf(p.id, stills[i]), t: n.t, shot: n.shot, text: n.text.trim(),
    ...(n.x != null ? { x: n.x, y: n.y } : {}), ...(n.box ? { box: n.box } : {}) })).filter((m) => m.url);
  return { block, media, missing, stills, shots, duration };
}

/** notes pinned on the film now go in the user's chat message (POST tasks with notes: [{ t, x?, y?, box?, text }], 0-1 on
 *  the frame; text is that line's words in the message). Returns what to start the task with: the user's message plus the block Claude
 *  reads (each note's time, shot, place and still, what does not fit), the message as the user wrote it for the chat, and the card's
 *  media; null when the message carries no note with words. */
export async function chatNotes(ctx, p, b, { snap = snapshotAtAsync } = {}) {
  if (!Array.isArray(b?.notes) || !b.notes.length) return null;
  if (b.notes.length > 50) throw Object.assign(new Error("At most 50 notes in one message"), { code: "INVALID" });
  if (ctx.agent.running.has(p.id)) throw Object.assign(new Error("Claude is still working on this project. Stop it or wait for it to finish."), { code: "BUSY" });
  const { shots } = await filmShots(p.path);
  const notes = b.notes.map((n) => cleanNote(n, shots)).filter((n) => n.text.trim()).sort((a, c) => a.t - c.t);
  if (!notes.length) return null;
  const urlOf = (id, rel) => (rel ? `${ctx.preview?.base ?? ""}/p/${id}/${rel}` : null);
  const { block, media, missing } = await notesForChat(p, notes, { snap, signal: ctx.stopping?.signal ?? null, urlOf });
  const said = String(b.text ?? "").trim();
  return { text: said ? `${said}\n\n${block}` : block, shown: said || notes.map((n) => `${mmss(n.t)} · ${n.text.trim()}`).join("\n"), media, missing };
}
