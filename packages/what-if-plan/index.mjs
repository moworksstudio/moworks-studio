// The shot list on the voice: What If animation's scripts/plan.py (FreshStack, MIT, at the pinned commit
// https://github.com/kelano86/what-if-animation/blob/3725a22d2d101320cae5b7d761af8d75120c4987/skills/what-if-animation/scripts/plan.py, with
// its cue helpers in scripts/wi.py) rewritten in JavaScript for the app, which has no Python: the edit's cues resolved against the word
// timings into the timeline the engine reads, the shot list and the pace report. The same cue forms and the same numbers (Python's
// rounding included). Differences: the words come from the app's checked voice-over transcript (transcript.json, HyperFrames' word
// timings) instead of ElevenLabs; a film with no narration has no words and ends at `end` (or New project's length); the sound stays on
// HyperFrames' timeline, so the timeline's `audio` is empty.
import { existsSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export const EPISODE = "whatif/episode.json", WORDS = "whatif/words.json", TIMELINE = "whatif/timeline.json", SHOTLIST = "whatif/shotlist.md";
const readJson = (f, d) => { try { return JSON.parse(readFileSync(f, "utf8")); } catch { return d; } };
const fail = (message) => { throw Object.assign(new Error(message), { code: "INVALID" }); };

/** Python's round(): half to even (plan.py's frames are Python's). */
export function pyRound(x) {
  const f = Math.floor(x), d = x - f;
  if (Math.abs(d - 0.5) < 1e-9) return f % 2 === 0 ? f : f + 1;
  return Math.round(x);
}
/** wi.py norm: lower case, the curly apostrophe straight, everything but word characters and the apostrophe dropped. */
export const norm = (w) => String(w ?? "").toLowerCase().replace(/’/g, "'").replace(/[^\p{L}\p{N}_']/gu, "");

/** The words of the voice-over as the engine's words.json ([{ w, s, e }], seconds) from the app's checked transcript (transcript.json:
 *  [{ id, text, start, end }]); written when the transcript is newer. Returns the words, or [] (no checked voice-over). */
export function wordsFromTranscript(dir) {
  const tf = join(dir, "transcript.json"), wf = join(dir, ...WORDS.split("/"));
  if (!existsSync(tf)) return readJson(wf, []);
  if (!existsSync(wf) || statSync(tf).mtimeMs > statSync(wf).mtimeMs) {
    const words = readJson(tf, []).filter((w) => w && String(w.text ?? "").trim()).map((w) => ({ w: String(w.text).trim(), s: Number(w.start), e: Number(w.end) }));
    writeFileSync(wf, JSON.stringify(words, null, 1) + "\n");
    return words;
  }
  return readJson(wf, []);
}

export function findWord(words, target, start = 0, nth = 1) {
  const t = norm(target);
  let seen = 0;
  for (let i = start; i < words.length; i++) if (norm(words[i].w) === t && ++seen === nth) return i;
  fail(`Cue word "${target}" (#${nth}) not found after word ${start}. Words: ${words.map((w) => w.w).join(" ")}`);
}
const CUE = /^(?<base>[^+\-#]+?)(?:#(?<nth>\d+))?(?<off>[+-]\d+)?$/u;
/** wi.py resolve: a cue to a global frame. f:123 · s:4.2 · S3+2 (frames after shot S3's first segment; S3#2+2 its second) · word+3. */
export function resolve(cue, words, fps, segments = null, shotIds = []) {
  const c = String(cue).trim();
  if (c.startsWith("f:")) return pyRound(Number(c.slice(2)));
  if (c.startsWith("s:")) return pyRound(Number(c.slice(2)) * fps);
  const m = CUE.exec(c);
  if (!m) fail(`Bad cue "${c}"`);
  const base = m.groups.base, nth = Number(m.groups.nth ?? 1), off = Number(m.groups.off ?? 0);
  if (segments && shotIds.includes(base)) {
    const segs = segments.filter((s) => s.shot === base);
    if (segs.length < nth) fail(`Cue "${c}": shot ${base} has only ${segs.length} segment(s)`);
    return segs[nth - 1].a + off;
  }
  if (!words.length) fail(`Cue "${c}" is a word, but this film has no narration: use s:, f: or +N`);
  return pyRound(words[findWord(words, base, 0, nth)].s * fps) + off;
}

const median = (xs) => { const s = [...xs].sort((a, b) => a - b), n = s.length; return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2; };

/** plan.py: the project's whatif/episode.json (shots, edit, fx; fps, lead, tail, end) on its words → whatif/timeline.json and
 *  whatif/shotlist.md. `lengthSec`: the end of a film with no narration and no `end` (New project's length). Returns { timeline, report:
 *  [lines], warnings: [lines], shotlist }; throws INVALID with plan.py's words on a bad episode. */
export function planEpisode(dir, { lengthSec = null } = {}) {
  const ep = readJson(join(dir, ...EPISODE.split("/")), null);
  if (!ep) fail(`No ${EPISODE} yet: write the script, shots and edit first`);
  if (!Array.isArray(ep.shots) || !ep.shots.length || !Array.isArray(ep.edit) || !ep.edit.length) fail(`${EPISODE} needs shots and edit`);
  const FPS = Number(ep.fps) || 30, LEAD = ep.lead ?? 2;
  const words = ep.narration === "none" ? [] : wordsFromTranscript(dir);
  if (!words.length && ep.edit.some((e) => !/^(f:|s:|\+)/.test(String(e.at)))) {
    fail(ep.narration === "none" ? "This film has no narration: cue every cut with s:, f: or +N" : "No checked voice-over yet: save the Voice-over's transcript first (or use s:/f:/+N cues)");
  }
  const shots = Object.fromEntries(ep.shots.map((s) => [s.id, s]));
  // ------------------------------------------------------------ cut points
  const starts = [];
  let wiPrev = 0, prev = 0;
  ep.edit.forEach((e, k) => {
    if (!shots[e.shot]) fail(`Edit entry ${k} uses unknown shot ${e.shot}`);
    const at = String(e.at);
    let a;
    if (at.startsWith("f:") || at.startsWith("s:")) a = resolve(at, words, FPS);
    else if (at.startsWith("+")) a = prev + Number.parseInt(at.slice(1), 10);
    else {
      const [base, off] = at.includes("+") ? [at.slice(0, at.indexOf("+")), at.slice(at.indexOf("+") + 1)] : [at, "0"];
      let i;
      if (base.includes("#")) { const [w, n] = base.split("#"); i = findWord(words, w, wiPrev, Number(n)); } else i = findWord(words, base, wiPrev);
      wiPrev = i + 1;
      a = Math.max(0, pyRound(words[i].s * FPS) - LEAD + Number.parseInt(off || "0", 10));
    }
    if (k === 0) a = 0;
    if (a <= prev && k > 0) fail(`Edit entry ${k} (${e.shot} at ${at}) starts at frame ${a}, not after the previous cut (${prev})`);
    starts.push(a); prev = a;
  });
  const end = ep.end != null ? resolve(ep.end, words, FPS) : words.length ? pyRound((words.at(-1).e + (ep.tail ?? 0.9)) * FPS)
    : Number(lengthSec) > 0 ? pyRound(Number(lengthSec) * FPS) : fail(`This film has no narration: give ${EPISODE} an "end" (e.g. "s:20")`);
  if (end <= starts.at(-1)) fail(`The last shot starts at ${starts.at(-1)} but the episode ends at ${end}`);
  // ------------------------------------------------------------ segments and shot clocks
  const segments = [], lastClock = {};
  ep.edit.forEach((e, k) => {
    const a = starts[k], b = k + 1 < starts.length ? starts[k + 1] : end;
    let t0, t1;
    if (e.reverse) { t0 = e.from ?? lastClock[e.shot] ?? b - a; t1 = e.to ?? 0; } else { t0 = e.from ?? 0; t1 = t0 + (b - a); }
    lastClock[e.shot] = t1;
    const line = words.filter((w) => a <= pyRound(w.s * FPS) + LEAD && pyRound(w.s * FPS) + LEAD < b).map((w) => w.w + String(w.p ?? "").trim()).join(" ");
    segments.push({ shot: e.shot, a, b, t0, t1, line, ...(e.look ? { look: e.look } : {}) });
  });
  const ids = [...new Set(segments.map((s) => s.shot))];
  const warnings = Object.keys(shots).filter((id) => !ids.includes(id)).map((id) => `note: shot ${id} is defined but not in the edit`);
  const info = ids.map((sid) => {
    const segs = segments.filter((s) => s.shot === sid), fwd = segs.filter((s) => s.t1 >= s.t0), d = shots[sid], first = segs[0];
    return { id: sid, size: d.size ?? "", key: d.key ?? Math.floor((first.b - first.a) / 2), len: Math.max(...fwd.map((s) => s.t1), ...segs.map((s) => s.t0)),
      first: first.a, line: first.line, note: d.note ?? "" };
  });
  // ------------------------------------------------------------ fx (the sound is on HyperFrames' timeline: no audio stems here)
  const fx = (ep.fx ?? []).map((e) => { const { at, ...item } = e; return { ...item, f: resolve(at, words, FPS, segments, ids) }; });
  const title = Array.isArray(ep.title) ? ep.title.join(" ") : ep.title ?? "";
  const timeline = { slug: ep.slug ?? "episode", title, fps: FPS, total: end, segments, shots: info, fx, audio: {} };
  writeFileSync(join(dir, ...TIMELINE.split("/")), JSON.stringify(timeline, null, 1) + "\n");
  // ------------------------------------------------------------ the pace report and the shot list
  const cuts = segments.slice(1).map((s) => s.a), lens = segments.map((s) => (s.b - s.a) / FPS), dur = end / FPS;
  const first10 = cuts.filter((c) => c < 10 * FPS).length, perMin = (cuts.length / dur) * 60;
  const report = [`${segments.length} segments, ${ids.length} shots, ${dur.toFixed(1)} s (${end} frames)`,
    `pace: ${Math.round(perMin)} cuts/min overall, ${Math.round((first10 / Math.min(10, dur)) * 60)} cuts/min in the first 10 s; median shot ${median(lens).toFixed(1)} s, longest ${Math.max(...lens).toFixed(1)} s`];
  if (perMin < 24) warnings.push("! slower than the genre opening (about 27 cuts a minute): split long shots or cut on more words");
  for (const s of segments) if ((s.b - s.a) / FPS > 4) warnings.push(`! ${s.shot} holds ${((s.b - s.a) / FPS).toFixed(1)} s: give it action inside (a move, a light change, a push in) or split it`);
  const rows = ["| # | Shot | Size | In | Length | Clock | Look | Words |", "|---|---|---|---|---|---|---|---|",
    ...segments.map((s, k) => `| ${k + 1} | ${s.shot} | ${shots[s.shot].size ?? ""} | ${(s.a / FPS).toFixed(2)} s | ${((s.b - s.a) / FPS).toFixed(2)} s | ${Math.round(s.t0)}→${Math.round(s.t1)}${s.t1 < s.t0 ? " (back)" : ""} | ${s.look ?? ""} | ${s.line} |`)];
  const shotlist = `# ${title}: shot list\n\n${dur.toFixed(1)} s, ${segments.length} segments, ${Math.round(perMin)} cuts/min\n\n${rows.join("\n")}\n`;
  writeFileSync(join(dir, ...SHOTLIST.split("/")), shotlist);
  return { timeline, report, warnings, shotlist };
}

/** What Claude reads back from the app's whatif_plan tool. */
export const planText = (r) => [`Wrote ${TIMELINE} and ${SHOTLIST}.`, ...r.report, ...r.warnings].join("\n");
