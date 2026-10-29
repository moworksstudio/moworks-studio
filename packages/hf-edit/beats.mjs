// The beat file HyperFrames writes for a project's music track (`hyperframes beats`: beats/<audio path>.json, { version: 1, audio,
// beats: [{ time, strength }] }), read with HF's own code from the pinned runtime: @hyperframes/core/beats `beatFilePathForSrc` (which
// file belongs to a track), `parseBeats` (version 1 only, strengths clamped to 0..1) and `findMusicAudioSrc` (which <audio> is the music,
// the rule the CLI and Studio share), as HF ships them in packages/core/src/beats/beatFile.ts:
// https://github.com/heygen-com/hyperframes/blob/4719543e972548a261b8354f0a8dada479ae5d93/packages/core/src/beats/beatFile.ts
// HF's file holds the beats and their strength only: no metre, no bars. The tempo is the one the beats give (60 / the median gap).
import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { resolveRuntime } from "../version-manager/index.mjs";

const core = (version) => import(pathToFileURL(join(resolveRuntime(version).dir, "node_modules", "@hyperframes", "core", "dist", "beats", "beatFile.js")).href);

/** The music track's src: the one the app placed (meta.music.file), else the <audio> HF itself takes as the music in index.html; or null. */
export async function musicSrc(dir, music = null, { version = null } = {}) {
  if (music?.file) return String(music.file);
  let html = ""; try { html = readFileSync(join(dir, "index.html"), "utf8"); } catch { return null; }
  return (await core(version)).findMusicAudioSrc(html) ?? null;
}

/** The tempo the beats give, BPM: 60 / the median gap between beats; null when it cannot be worked out (fewer than two beats). */
export function tempoOf(times) {
  const ts = [...(times ?? [])].filter(Number.isFinite).sort((a, b) => a - b);
  const gaps = ts.slice(1).map((t, i) => t - ts[i]).filter((g) => g > 0).sort((a, b) => a - b);
  if (!gaps.length) return null;
  const mid = gaps.length % 2 ? gaps[(gaps.length - 1) / 2] : (gaps[gaps.length / 2 - 1] + gaps[gaps.length / 2]) / 2;
  return mid > 0 ? Math.round((60 / mid) * 10) / 10 : null;
}

/** The beat file of the track `src` as HF reads it: { file (project-relative), at, times, strengths, bpm }, or null when the track has
 *  none (or HF would not read it: another version, no beats). */
export async function readBeats(dir, src, { version = null } = {}) {
  if (!src) return null;
  const hf = await core(version);
  const file = hf.beatFilePathForSrc(src);
  const abs = file ? join(dir, ...file.split("/")) : null;
  if (!abs || !existsSync(abs)) return null;
  let parsed = null; try { parsed = hf.parseBeats(readFileSync(abs, "utf8")); } catch { return null; }
  if (!parsed?.times.length) return null;
  return { file, at: statSync(abs).mtime.toISOString(), times: parsed.times, strengths: parsed.strengths, bpm: tempoOf(parsed.times) };
}
