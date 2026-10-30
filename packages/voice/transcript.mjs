// The project's voice-over transcript for review: segments with word timings in .moworks/voice/transcript.json (kept in
// the project's revisions), and HyperFrames' transcript.json (word level) written from it through HF's own import. Editing text keeps the
// timing: same number of words -> each word keeps its time; otherwise the words are spread over the segment's own start..end.
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { importTranscript } from "../hf-audio/index.mjs";

export const FILE = ".moworks/voice/transcript.json";
const at = (dir) => join(dir, ...FILE.split("/"));
const round = (n) => Math.round(n * 1000) / 1000;
const nfc = (s) => String(s ?? "").normalize("NFC").replace(/\s+/g, " ").trim();

export function read(dir) {
  try { return JSON.parse(readFileSync(at(dir), "utf8")); } catch { return null; }
}

function write(dir, data) {
  const f = at(dir);
  mkdirSync(join(f, ".."), { recursive: true });
  writeFileSync(f + ".tmp", JSON.stringify(data, null, 2) + "\n");
  renameSync(f + ".tmp", f);
}

/** Words of one segment after an edit of its text. */
export function wordsFor(seg) {
  const text = nfc(seg.text);
  const tokens = text ? text.split(" ") : [];
  const old = seg.words ?? [];
  if (tokens.join(" ") === nfc(old.map((w) => w.text).join(" "))) return old;
  if (tokens.length === old.length) return old.map((w, i) => ({ ...w, text: tokens[i], p: null }));
  const span = Math.max(0.05, seg.end - seg.start), weight = tokens.map((t) => t.length + 1), sum = weight.reduce((a, b) => a + b, 0) || 1;
  let t = seg.start;
  return tokens.map((tok, i) => { const d = (span * weight[i]) / sum; const w = { text: tok, start: round(t), end: round(t + d), p: null }; t += d; return w; });
}

// ---- the words of a voice-over the app made from a script (ElevenLabs read the typed script word for word, Whisper heard
// four words wrong, "một nhìn", "tiết" for Tia, "nuốt tua", "thác truyền hình", and the app still said "Words checked") ----
const key = (w) => nfc(w).toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");
/** The script's words against Whisper's (a word alignment: equal, changed, missing or extra), each script word given Whisper's times (a
 *  changed word keeps its heard word's times; a word Whisper missed shares the time between its neighbours). Returns { segments, changed,
 *  missed, extra, match } (match: the share of the script's words Whisper heard the same); segments: Whisper's, each word now the script's. */
export function fromScript(segments, script) {
  const said = nfc(String(script ?? "")).split(/\s+/).filter((w) => key(w));
  const heard = segments.flatMap((s, si) => (s.words ?? []).map((w) => ({ ...w, seg: si }))).filter((w) => key(w.text));
  const n = said.length, m = heard.length;
  if (!n || !m) return null;
  // Needleman-Wunsch on normalised words: equal 0, changed 1.2, a missing or extra word 1 (a change costs a little more than one gap, so two
  // changes never win over a missing word and an extra one that let the words around them match; one changed word still beats two gaps)
  const SUB = 1.2, cost = (i, j) => (key(said[i]) === key(heard[j].text) ? 0 : SUB);
  const D = Array.from({ length: n + 1 }, (_, i) => Float64Array.from({ length: m + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)));
  for (let i = 1; i <= n; i++) for (let j = 1; j <= m; j++)
    D[i][j] = Math.min(D[i - 1][j - 1] + cost(i - 1, j - 1), D[i - 1][j] + 1, D[i][j - 1] + 1);
  const near = (a, b) => Math.abs(a - b) < 1e-9;
  const pairs = [];          // [scriptIndex | null, heardIndex | null], in order
  for (let i = n, j = m; i > 0 || j > 0;) {
    if (i > 0 && j > 0 && near(D[i][j], D[i - 1][j - 1] + cost(i - 1, j - 1))) { pairs.push([i - 1, j - 1]); i--; j--; }
    else if (i > 0 && near(D[i][j], D[i - 1][j] + 1)) { pairs.push([i - 1, null]); i--; }
    else { pairs.push([null, j - 1]); j--; }
  }
  pairs.reverse();
  let same = 0, changed = 0, missed = 0, extra = 0;
  const words = [];          // { text, start, end, seg }
  pairs.forEach(([si, hi], k) => {
    if (si == null) { extra++; return; }
    if (hi != null) { const h = heard[hi]; if (key(said[si]) === key(h.text)) same++; else changed++; words.push({ text: said[si], start: h.start, end: h.end, seg: h.seg }); return; }
    missed++;
    // missed: between the heard words around it
    const prev = [...pairs.slice(0, k)].reverse().find((p) => p[1] != null), next = pairs.slice(k + 1).find((p) => p[1] != null);
    const a = prev ? heard[prev[1]].end : heard[0].start, b = next ? heard[next[1]].start : heard[m - 1].end;
    words.push({ text: said[si], start: a, end: Math.max(a + 0.05, b), seg: (prev ? heard[prev[1]] : heard[0]).seg, guessed: true });
  });
  // spread the words that share one gap over it
  for (let i = 0; i < words.length;) {
    let j = i; while (j < words.length && words[j].guessed && words[j].start === words[i].start) j++;
    if (j > i) { const a = words[i].start, b = words[i].end, d = (b - a) / (j - i); for (let k = i; k < j; k++) { words[k].start = round(a + d * (k - i)); words[k].end = round(a + d * (k - i + 1)); } i = j; } else i++;
  }
  const out = segments.map((s, si) => {
    const ws = words.filter((w) => w.seg === si).map(({ text, start, end }) => ({ text, start: round(start), end: round(end), p: null }));
    return ws.length ? { ...s, start: Math.min(s.start, ws[0].start), end: Math.max(s.end, ws.at(-1).end), text: ws.map((w) => w.text).join(" "), words: ws } : null;
  }).filter(Boolean);
  return { segments: out, changed, missed, extra, match: same / n };
}

/** Store a fresh engine result (status "review": not yet saved by the user). */
export function fromEngine(dir, { audio, result }) {
  const data = { version: 1, status: "review", audio, model: result.model, engine: result.engine, language: result.language, probability: result.probability,
    duration: result.duration, device: result.device, prompt: result.prompt ?? null, createdAt: new Date().toISOString(), savedAt: null, segments: result.segments };
  write(dir, data);
  return data;
}

/** Save the user's reviewed segments; writes HF's transcript.json through HF (asynchronously: the server's event loop stays free).
 *  Resolves { transcript, hf }. */
export async function save(dir, segments, { workDir }) {
  const cur = read(dir);
  if (!cur) throw Object.assign(new Error("There is no transcript to save yet"), { code: "INVALID" });
  if (!Array.isArray(segments) || !segments.length) throw Object.assign(new Error("The transcript is empty"), { code: "INVALID" });
  const clean = segments.map((s, i) => {
    const start = Number(s.start), end = Number(s.end);
    if (!(end > start) || start < 0) throw Object.assign(new Error(`Segment ${i + 1} has a wrong time`), { code: "INVALID" });
    const seg = { id: String(s.id ?? `s${i + 1}`), start: round(start), end: round(end), text: nfc(s.text), words: Array.isArray(s.words) ? s.words : [] };
    seg.words = wordsFor(seg);
    return seg;
  }).filter((s) => s.text);
  const words = clean.flatMap((s) => s.words).map((w) => ({ text: w.text, start: w.start, end: w.end }));
  mkdirSync(workDir, { recursive: true });
  const wf = join(workDir, "transcript-words.json");
  writeFileSync(wf, JSON.stringify(words));
  const hf = await importTranscript(dir, wf);
  if (!hf.ok) throw Object.assign(new Error(`HyperFrames could not import the transcript (exit ${hf.exitCode})${hf.stderrTail.length ? `: ${hf.stderrTail.slice(-1)[0]}` : ""}`), { code: "HF_IMPORT" });
  const data = { ...cur, status: "saved", segments: clean, savedAt: new Date().toISOString(), hfTranscript: { file: "transcript.json", words: hf.words, hfVersion: hf.hfVersion } };
  write(dir, data);
  return { transcript: data, hf };
}

export const exists = (dir) => existsSync(at(dir));

/** The segments where the film plays them: a voice-over cut into clips of one file (`data-media-start` .. + `data-duration`)
 *  puts each segment at the start of the clip that holds most of it; a segment no clip plays is left out. Clips: { start, mediaStart, duration }.
 *  A sentence the cut splits (a pause put between two of its words) shows in each clip the words that clip plays. */
export function onFilm(segments, clips) {
  if (!clips.length) return segments.map((g) => ({ start: round(g.start), end: round(g.end), text: g.text }));
  const spans = clips.map((c) => { const a = c.mediaStart ?? 0; return { c, a, b: c.duration != null ? a + c.duration : Infinity }; });
  const place = ({ c, a, b }, start, end, text) => ({ start: round(Math.max(a, start) + c.start - a), end: round(Math.min(b, end) + c.start - a), text });
  return segments.flatMap((g) => {
    const runs = [];
    for (const w of g.words ?? []) {
      const mid = (w.start + w.end) / 2, s = Number.isFinite(mid) && w.text ? spans.find((x) => mid >= x.a && mid < x.b) : null;
      if (!s) continue;
      const r = runs.at(-1);
      if (r?.s === s) { r.end = w.end; r.words.push(w.text); } else runs.push({ s, start: w.start, end: w.end, words: [w.text] });
    }
    if (runs.length > 1 || (runs.length === 1 && runs[0].words.length < g.words.length)) return runs.map((r) => place(r.s, r.start, r.end, r.words.join(" ")));
    let best = null, most = 0;
    for (const s of spans) {
      const o = Math.min(s.b, g.end) - Math.max(s.a, g.start);
      if (o > most) { most = o; best = s; }
    }
    return best ? [place(best, g.start, g.end, g.text)] : [];
  });
}
