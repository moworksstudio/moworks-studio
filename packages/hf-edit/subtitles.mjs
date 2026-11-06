// The film's subtitles as files beside its render (owner 06/11/2026 #1244, from anidoodle's tools/captions.mjs idea, Apache-2.0, written
// here from the idea): SubRip (.srt) and WebVTT (.vtt), for YouTube and Facebook, where most viewers watch muted. Saved only when the Render
// dialog's box is ticked. The lines are the film's own captions track (HF's data-track-kind="captions", each group as the owner sees it),
// else the voice-over's words (transcript.json where the film plays them) cut into lines of at most MAX_CHARS characters and MAX_S seconds.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { captionCues } from "./handEdit.mjs";
import { filmWords } from "./tracks.mjs";

export const MAX_CHARS = 42, MAX_S = 4.5, MIN_S = 0.8;
const attr = (tag, name) => new RegExp(`\\b${name}="([^"]*)"`).exec(tag)?.[1] ?? null;
const r3 = (n) => Math.round(n * 1000) / 1000;

/** The voice's words cut into subtitle lines: a line ends at a sentence's end, at MAX_CHARS, or at MAX_S. [{ start, end, text }] */
export function linesOfWords(words) {
  const out = [];
  let cur = null;
  const close = () => { if (cur) out.push({ start: cur.start, end: Math.max(cur.end, cur.start + MIN_S), text: cur.text }); cur = null; };
  for (const w of words ?? []) {
    const t = String(w.text ?? "").trim();
    if (!t || !Number.isFinite(w.start) || !Number.isFinite(w.end)) continue;
    if (cur && (`${cur.text} ${t}`.length > MAX_CHARS || w.end - cur.start > MAX_S)) close();
    cur = cur ? { ...cur, end: w.end, text: `${cur.text} ${t}` } : { start: w.start, end: w.end, text: t };
    if (/[.!?…]["”’)]?$/.test(t)) close();
  }
  close();
  // a line never runs into the next one
  for (let i = 0; i + 1 < out.length; i++) if (out[i].end > out[i + 1].start) out[i].end = out[i + 1].start;
  return out.map((x) => ({ start: r3(x.start), end: r3(x.end), text: x.text }));
}

/** The film's subtitle lines in film seconds: its captions track's groups, else its voice-over's words. [] when the film says nothing. */
export async function filmSubtitles(dir) {
  let html = ""; try { html = readFileSync(join(dir, "index.html"), "utf8"); } catch { return []; }
  const tracks = html.match(/<(?:div|section)\b[^>]*\bdata-track-kind="captions"[^>]*>/g) ?? [];
  const lines = [];
  for (const t of tracks) {
    const start = Number(attr(t, "data-start") ?? 0), file = attr(t, "data-composition-src");
    const cues = file ? await captionCues(dir, file).catch(() => []) : [];
    for (const c of cues) {
      const s = start + (Number(c.start) || 0), d = Number(c.duration);
      if (c.text) lines.push({ start: r3(s), end: r3(s + (Number.isFinite(d) && d > 0 ? d : 2)), text: String(c.text).replace(/\s+/g, " ").trim() });
    }
  }
  if (lines.length) return lines.sort((a, b) => a.start - b.start);
  return linesOfWords(filmWords(dir) ?? []);
}

const pad = (n, w = 2) => String(n).padStart(w, "0");
const stamp = (s, sep) => { const ms = Math.max(0, Math.round(s * 1000)); return `${pad(Math.floor(ms / 3600000))}:${pad(Math.floor(ms / 60000) % 60)}:${pad(Math.floor(ms / 1000) % 60)}${sep}${pad(ms % 1000, 3)}`; };
/** SubRip: numbered cues, HH:MM:SS,mmm. */
export const toSrt = (lines) => lines.map((l, i) => `${i + 1}\n${stamp(l.start, ",")} --> ${stamp(l.end, ",")}\n${l.text}\n`).join("\n");
/** WebVTT: a header, then HH:MM:SS.mmm cues. */
export const toVtt = (lines) => `WEBVTT\n\n${lines.map((l) => `${stamp(l.start, ".")} --> ${stamp(l.end, ".")}\n${l.text}\n`).join("\n")}`;
