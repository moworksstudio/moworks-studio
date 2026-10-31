// A sound the user picked in the Editor's Sounds drawer. It lands where they put it, as their own clip (tracks.mjs placeClip: the block no
// placement rewrites), so "Place them again" and the automatic placing leave it alone; its file is a copy in the film's assets, credited like
// any other sound, and it goes through the levels: at the level the app would give that kind of sound, under the voice where a word is
// spoken (voicefit.mjs). A level the user sets in Studio afterwards stays theirs.
import { existsSync } from "node:fs";
import { join } from "node:path";
import { patchAudio } from "../hf-edit/handEdit.mjs";
import { placeClip } from "../hf-edit/tracks.mjs";
import { readMounts } from "../hf-edit/shots.mjs";
import { rememberAssets } from "../project-service/assets.mjs";
import { MAX_GAIN, levelOf } from "./actions.mjs";
import { durationOf, endFadeOf, levels } from "./auto.mjs";
import { ADDED, MAX_AUTO_S, VOLUME, addedNow, patchState, readState, setVolumes, useLibrarySound, useSound, writeCredits } from "./index.mjs";
import { fitEffects } from "./voicefit.mjs";

const r3 = (n) => Math.round(n * 1000) / 1000;
/** The shortest part of a long recording placed at the very end of the film, s. */
const LEAST_S = 1;
/** A sound's fade at its end at this place: while it sounds in the ending's fade it fades with the picture and the music; one the film's end cuts never ends on a click. */
const clipFade = ({ start, duration, length, fadeAt }) => (fadeAt != null && start + duration > fadeAt + 1e-3 ? r3(Math.max(0.05, start + duration - Math.max(fadeAt, start))) : duration < length - 1e-3 ? r3(Math.min(0.25, duration)) : 0);

/** Where a sound of `length` s starts and how long it plays when asked for at `at` s of a film of `film` s: at the playhead. A short effect that would
 *  run past the end moves back to end with the film (as "Put on the timeline" does); a long recording stays and is cut at the end. */
export function placeAt(at, length, film) {
  const t = Math.max(0, Number(at) || 0);
  if (!(film > 0)) return { start: r3(t), duration: r3(length) };
  const start = t + length <= film ? t : length <= MAX_AUTO_S ? Math.max(0, film - length) : Math.min(t, Math.max(0, film - LEAST_S));
  return { start: r3(start), duration: r3(Math.min(length, film - start)) };
}

/** Put a sound that is in the film's assets and in sfx.json (by its name there) on the timeline at `at` s, at its level, fitted to the words, in the
 *  credits. Returns { id, at, duration, volume, tag }: where it went (tag: the attributes written). */
export async function placeAdded(dir, name, { at = 0, root } = {}) {
  const s = readState(dir).sounds[name];
  if (!s?.file || !existsSync(join(dir, ...s.file.split("/")))) throw Object.assign(new Error("That sound is not in this film's assets"), { code: "NOT_FOUND" });
  const length = (await durationOf(join(dir, ...s.file.split("/")), root).catch(() => null)) ?? s.durationS ?? 1;
  const film = Number(readMounts(dir).root?.duration) || null;
  const { start, duration } = placeAt(at, length, film);
  const lv = await levels(dir, [name], { root }).catch(() => null);
  if (lv) setVolumes(dir, lv.volumes);
  const volume = readState(dir).sounds[name].volume ?? (s.family ? levelOf(s.family) : VOLUME);
  // the ending's fade: a sound in it fades with the picture and the music; one cut at the film's end never ends on a click
  const fade = film ? endFadeOf(dir, film) : 0;
  const fadeOut = clipFade({ start, duration, length, fadeAt: fade ? film - fade : null });
  const tag = placeClip(dir, { src: s.file, duration, start, volume, fadeOut, freeLane: true });
  patchState(dir, (st) => { st.added = [...(st.added ?? []).filter((m) => m.id !== tag.id), { id: tag.id, name, file: s.file, start, duration, volume, at: new Date().toISOString() }]; });
  await fitEffects(dir, { root }).catch(() => null);
  writeCredits(dir);
  const now = addedNow(dir).find((m) => m.id === tag.id);
  return { id: tag.id, at: start, duration, volume: now?.volume ?? volume, tag };
}

/** A sound effect moved on the timeline (`was`, `now`: its tag's attributes): what its old place gave it goes, what its new one gives it comes. The fade from the
 *  ending, or from a cut at the film's end, and the shorter length of that cut (T29-1: a bell moved from the end to mid-film still faded for 2.5 s), and for a cue
 *  of the app's the lower level inside the ending's fade (index.mjs mount). A fade or a length the user set in Studio is not what the old place gives: it stays,
 *  never past the film's end. */
export async function soundMoved(dir, was, now, { root } = {}) {
  const old = Number(was["data-start"]) || 0, start = Number(now["data-start"]) || 0;
  if (old === start || !now.src) return { changed: false };
  const film = Number(readMounts(dir).root?.duration) || null, st = readState(dir);
  const length = (await durationOf(join(dir, ...now.src.split("/")), root).catch(() => null)) ?? (Number(was["data-duration"]) || 1);
  const n = /^el-sfx-(\d+)$/.exec(now.id ?? "")?.[1], cue = n != null ? st.mounted?.[Number(n)] ?? null : null, sound = cue ? st.sounds[cue.name] : null;
  const owner = sound?.source === "owner", held = !!cue && !owner && Number(cue.hold) > 0 && cue.hold + 0.25 < length;
  const whole = cue ? Math.min(length, owner ? Infinity : MAX_AUTO_S, held ? cue.hold + 0.25 : Infinity) : length;
  const upTo = (t) => r3(Math.max(0.05, film ? Math.min(whole, film - t) : whole));
  const fade = film ? endFadeOf(dir, film) : 0, fadeAt = fade ? film - fade : null;
  const fadeOf = (t, d) => (cue ? Math.max(held ? 0.15 : 0, !owner && fadeAt != null && t + d > fadeAt + 1e-3 ? r3(Math.max(0.05, t + d - Math.max(fadeAt, t))) : 0) : clipFade({ start: t, duration: d, length, fadeAt }));
  const d0 = Number(was["data-duration"]) || 0, f0 = Number(was["data-fade-out"]) || 0;
  const duration = Math.abs(d0 - upTo(old)) < 0.002 ? upTo(start) : r3(film ? Math.min(d0, Math.max(0.05, film - start)) : d0);
  const fadeOut = Math.abs(f0 - fadeOf(old, d0)) <= 0.02 ? fadeOf(start, duration) : Math.min(f0, duration);
  const attrs = [];
  if (String(duration) !== was["data-duration"]) attrs.push({ property: "data-duration", value: String(duration) });
  if (fadeOut !== f0) attrs.push({ property: "data-fade-out", value: fadeOut > 0 ? String(fadeOut) : null });
  // a cue's level in the ending's fade: quieter the later it starts; whole again out of it. A level the user set stays theirs
  const gainAt = (t) => (!owner && fadeAt != null && t > fadeAt ? Math.max(0.05, (film - t) / fade) : 1);
  const scale = cue ? gainAt(start) / gainAt(old) : 1, level = Number(was["data-volume"]);
  let lifted = null;
  if (Math.abs(scale - 1) > 1e-3 && Math.abs(level - cue.volume) <= 0.0005 && Number.isFinite(cue.base ?? cue.volume)) {
    lifted = Math.min(MAX_GAIN, Math.max(0.01, Math.round((cue.base ?? cue.volume) * scale * 1000) / 1000));
    attrs.push({ property: "data-volume", value: String(lifted) });
  }
  const changed = await patchAudio(dir, { id: now.id, hfId: now["data-hf-id"], src: now.src, start }, attrs);
  if (lifted != null) patchState(dir, (x) => { const m = x.mounted?.[Number(n)]; if (m) { m.base = lifted; m.volume = lifted; } });
  return { changed, duration, fadeOut };
}

/** The Sounds drawer's Add: the sound's file into the film's assets once (a copy from the app's library or HF's set, a download from an online
 *  service; never a link into the app), recorded as the app's own copy so it is never taken for a file the user dropped in, then placeAdded.
 *  item: sfx.details(id). Throws SFX_LIMIT / SFX_DOWNLOAD when a download fails. */
export async function addSound(dir, item, { at = 0, root, fetchImpl = fetch, signal } = {}) {
  const name = `${ADDED}${item.id}`, had = readState(dir).sounds[name];
  if (!had?.file || !existsSync(join(dir, ...had.file.split("/")))) {
    if (item.source === "library") {
      if (!useLibrarySound(dir, name, [item.entry])) throw Object.assign(new Error("That sound's file is missing from the app"), { code: "NOT_FOUND" });
      patchState(dir, (st) => { st.sounds[name].title = item.title; });
    } else await useSound(dir, name, item, { fetchImpl, signal, fileName: item.title });
  }
  rememberAssets(dir, [readState(dir).sounds[name].file]);
  return placeAdded(dir, name, { at, root });
}
