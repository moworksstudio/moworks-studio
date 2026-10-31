// A lyrics video's beat map: what the app already measures of the song, in one place Claude must read (docs/BEATMAP.md, docs/BEATMAP.json; moworks-alive/lyric-video.md §2). The beats and their
// strength are HyperFrames' own (`hyperframes beats`, hf-edit/beats.mjs); the rest comes from the scan's own reading of the track (tools/intake/intake.py music, librosa: hits, kicks,
// sections, loudest passages). No second analysis of the beats: the librosa grid stands in only when HF's file is not there. HF's file has no metre, so the bars are every 4th beat,
// from the phase whose first beats are strongest (a guess at the downbeat, said as one).
import { existsSync, mkdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { writeDoc } from "../project-service/docs.mjs";
import { runPy } from "../setup/python.mjs";
import { APP_ROOT } from "../version-manager/index.mjs";
import { readBeats, tempoOf } from "./beats.mjs";

const r3 = (n) => Math.round(n * 1000) / 1000;
const slug = (p) => p.replace(/[^\w.-]+/g, "_");
const mmss = (t) => `${Math.floor(t / 60)}:${(t % 60).toFixed(2).padStart(5, "0")}`;
const readJson = (f, d = null) => { try { return JSON.parse(readFileSync(f, "utf8")); } catch { return d; } };

/** The scan's reading of a track, read now when the scan has none yet. { hits, kicks, sections, loudest, beat_times, duration } or null. */
export async function trackAnalysis(dir, src, { root = APP_ROOT } = {}) {
  const sub = join(dir, ".moworks", "scan", slug(src)), f = join(sub, "ANALYSIS.json"), track = join(dir, ...src.split("/"));
  const fresh = existsSync(f) && existsSync(track) && statSync(f).mtimeMs >= statSync(track).mtimeMs;
  if (!fresh) {
    if (!existsSync(track)) return null;
    mkdirSync(sub, { recursive: true });
    const m = await runPy(root, "tools/intake/intake.py", ["music", track, sub], { timeoutMs: 5 * 60 * 1000 });
    if (!m.ok) return null;
  }
  return readJson(f);
}

/** The bars from the beats: every 4th beat, from the phase with the strongest first beats (HF gives strengths; none: from the first beat). */
export function barsOf(times, strengths = null) {
  let phase = 0;
  if (strengths?.length === times.length && times.length >= 8) {
    let best = -1;
    for (let p = 0; p < 4; p++) { let s = 0, n = 0; for (let i = p; i < times.length; i += 4) { s += strengths[i]; n++; } if (n && s / n > best) { best = s / n; phase = p; } }
  }
  const bars = [];
  if (phase > 0) bars.push({ n: 0, start: times[0], beats: times.slice(0, phase) });
  for (let i = phase, n = 1; i < times.length; i += 4, n++) bars.push({ n, start: times[i], beats: times.slice(i, i + 4) });
  return bars;
}
const inBar = (ts, a, b) => (ts ?? []).filter((t) => t >= a - 0.02 && t < b - 0.02);

/** The map as data: { track, duration, bpm, beat, eighth, source, bars: [{ n, start, beats, hits, kicks }], sections, loudest }. */
export function beatMapOf({ src, beats, analysis, fps = 30 }) {
  const times = beats?.times?.length ? beats.times : (analysis?.beat_times ?? []), hf = !!beats?.times?.length;
  if (!times.length) return null;
  const bpm = (hf ? beats.bpm : null) ?? tempoOf(times) ?? analysis?.bpm ?? null, beat = bpm ? 60 / bpm : null;
  const dur = analysis?.duration ?? (times.at(-1) + (beat ?? 0.5));
  const bars = barsOf(times, hf ? beats.strengths : null).map((b, i, all) => {
    const end = all[i + 1]?.start ?? dur;
    return { n: b.n, start: r3(b.start), beats: b.beats.map(r3), hits: inBar(analysis?.hits, b.start, end).map(r3), kicks: inBar(analysis?.kicks, b.start, end).map(r3) };
  });
  return { track: src, duration: r3(dur), bpm, beat: beat ? r3(beat) : null, eighth: beat ? r3(beat / 2) : null, framesPerBeat: beat ? Math.round(beat * fps * 10) / 10 : null, fps,
    source: hf ? "HyperFrames' beats" : "the scan's beats (HyperFrames' file is not there yet)", bars, sections: analysis?.sections ?? [], loudest: analysis?.loudest ?? [] };
}
/** The map as Claude reads it. */
export function beatMapMd(m) {
  const list = (xs) => xs.map((t) => t.toFixed(2)).join(" ") || "-";
  return [`# Beat map of ${m.track.split("/").pop()}`, "",
    `The film's one grid, measured: ${m.duration} s, ${m.bpm ?? "?"} BPM, a beat every ${m.beat ?? "?"} s (${m.framesPerBeat ?? "?"} frames at ${m.fps} fps), an eighth ${m.eighth ?? "?"} s. Beats from ${m.source}; hits, kicks and sections from the app's reading of the track. All in seconds of the song (the film plays the song from its music clip's data-media-start).`, "",
    "This is data to use, not a guide (`.moworks/rules/moworks-alive/lyric-video.md` §2): shots follow the sections and cut on bars; every move lands on a beat or a hit, so it STARTS before it by about 30 % of its length; an entrance is never longer than the note. The bars start on the strongest beat of four, a guess at the downbeat: move them by a beat if a section sounds off.", "",
    "## Sections", "", "| # | From | To | Energy |", "|---|---|---|---|",
    ...m.sections.map((s, i) => `| ${i + 1} | ${mmss(s.start)} (${s.start} s) | ${mmss(s.end)} (${s.end} s) | ${s.energy} |`), ...(m.sections.length ? [] : ["| - | not read | | |"]), "",
    `Loudest passages (s): ${m.loudest.join(", ") || "-"}`, "",
    "## Bars", "", "| Bar | Starts | Beats | Hits (the strongest attacks) | Kicks |", "|---|---|---|---|---|",
    ...m.bars.map((b) => `| ${b.n} | ${b.start.toFixed(2)} | ${list(b.beats)} | ${list(b.hits)} | ${list(b.kicks)} |`), ""].join("\n");
}
/** Writes docs/BEATMAP.md and docs/BEATMAP.json for the track. false when the track gives no beats. */
export async function writeBeatMap(dir, src, { root = APP_ROOT, fps = 30, version = null } = {}) {
  const beats = await readBeats(dir, src, { version }).catch(() => null);
  const analysis = await trackAnalysis(dir, src, { root });
  const m = beatMapOf({ src, beats, analysis, fps });
  if (!m) return false;
  writeDoc(dir, "BEATMAP.json", `${JSON.stringify(m, null, 1)}\n`);
  writeDoc(dir, "BEATMAP.md", beatMapMd(m));
  return true;
}
/** The track the beat map was made from, or null. */
export const beatMapTrack = (dir) => readJson(join(dir, "docs", "BEATMAP.json"))?.track ?? null;
