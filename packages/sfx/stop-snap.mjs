// Example: the Motion Plan stopped the music at 31.5 s, inside the spoken "Hôm" (31.44-32.22 s); the Review said it would listen again in
// the Final Mix, and no step did. A music stop the app or Claude sets lands in a pause of the voice-over: a gap between two words, else
// (Whisper's words often touch, as there) just before the word after a sentence or clause ends; on a music beat in that pause when one is.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { filmWords } from "../hf-edit/tracks.mjs";

/** A gap between two words long enough to cut in, s; the margin kept from a word in it; the lead before a word that follows punctuation. */
export const STOP_GAP = { min: 0.12, margin: 0.04, lead: 0.12, reach: 2 };
const ENDS = /[.,!?;:…]["”’')\]]*$/;

/** `at` moved into the nearest pause of `words` ([{text, start, end}], film seconds) within `reach` s, a beat of `beats` (film seconds)
 *  in it when one is: { at, moved, word, after }. moved false when `at` already sits in a pause or no pause is near (word: the word it is on). */
export function snapStop(at, words, beats = [], g = STOP_GAP) {
  const t = Number(at);
  const ws = (words ?? []).filter((w) => Number.isFinite(w?.start) && Number.isFinite(w?.end) && w.end >= w.start).sort((a, b) => a.start - b.start);
  const on = ws.find((w) => t > w.start - g.margin && t < w.end);
  if (!Number.isFinite(t) || !ws.length || !on) return { at: t, moved: false, word: null, after: null };
  // the pauses: [from, to] with the word before them (null before the first word), punctuation first
  const pauses = [{ from: -Infinity, to: ws[0].start - g.margin, before: null, ends: true }];
  for (let i = 0; i < ws.length - 1; i++) {
    const a = ws[i], b = ws[i + 1], ends = ENDS.test(String(a.text ?? "").trim());
    if (b.start - a.end >= g.min) pauses.push({ from: a.end + g.margin, to: b.start - g.margin, before: a, ends });
    else if (ends && b.start - g.lead > a.start) pauses.push({ from: b.start - g.lead, to: b.start - g.lead, before: a, ends });
  }
  pauses.push({ from: ws.at(-1).end + g.margin, to: Infinity, before: ws.at(-1), ends: true });
  let best = null;
  for (const p of pauses) {
    const inside = (beats ?? []).map(Number).filter((x) => x >= p.from && x <= p.to);
    const point = inside.length ? inside.reduce((m, x) => (Math.abs(x - t) < Math.abs(m - t) ? x : m)) : Math.min(p.to, Math.max(p.from, t));
    const d = Math.abs(point - t);
    if (d > g.reach) continue;
    const score = d + (p.ends ? 0 : 0.5);          // a sentence's or a clause's end before a pause in the middle of one
    if (!best || score < best.score) best = { score, point, p };
  }
  if (!best) return { at: t, moved: false, word: on.text ?? null, after: null };
  return { at: Math.round(best.point * 1000) / 1000, moved: true, word: on.text ?? null, after: best.p.before?.text ?? null };
}

/** The voice-over's words and the music's beats, in film seconds, as a project has them now: { words, beats }. */
export function stopContext(dir, meta, musicStart = 0) {
  const read = (f) => { try { return JSON.parse(readFileSync(f, "utf8")); } catch { return null; } };
  const v = meta?.voice;
  const t = v?.file && !v.offTimeline && existsSync(join(dir, "transcript.json")) ? read(join(dir, "transcript.json")) : null;
  // where the film speaks them: through the clips that play the voice (one clip a line, Test 22), else as the transcript has them
  const words = !t ? [] : filmWords(dir) ?? (Array.isArray(t) ? t : Array.isArray(t?.words) ? t.words : []);
  const b = meta?.music?.beats ? read(join(dir, ...String(meta.music.beats).split("/"))) : null;
  const beats = (Array.isArray(b?.beats) ? b.beats : []).map((x) => Number(musicStart) + Number(x?.time ?? x)).filter(Number.isFinite);
  return { words, beats };
}
