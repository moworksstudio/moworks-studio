// Sound effects placed by the app at the Final Mix (only after the picture is locked, never during the build), a sound on every action
// (the owner, 30/10: "every film in every style must have full sound effects on every action in the film, for a lively mood"): the app
// reads the film's cuts (the timeline) and every motion of the approved Motion Plan, and gives each its sound: the storyboard's own
// named cues first (`- sfx:`, or a `- sound:` list), then the Motion Plan's per-motion `sound`, then the action's own (actions.mjs: an
// entrance pops, an exit whooshes out, a landing thuds in its material, a walk steps, a door opens…), and a whoosh into a cut where the
// picture really changes. Lively but never cluttered: density limits instead of a cap per shot (actions.mjs thin), each family at its
// own level under the music and the voice, repeats of one sound varied and one file at most MAX_REPEATS times a film, the sounds in the
// ending's fade faded with it, and a quiet ambience bed under every scene that has a place.
// The owner's choices (prefs.mjs: no whoosh, no ambience, the density, single sounds taken out) hold on every placement. Sounds come
// from the app's offline library first, then Openverse / Freesound, then HyperFrames' bundled set; mounted and credited by index.mjs.
import { execFile } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { promisify } from "node:util";
import { VARIANT_KEY, cueKey, cuesOf, mount, mountAmbience, patchState, readState, resolveCues, setVolumes, slug, useLibrarySound, useOwnerSound, writeCredits } from "./index.mjs";
import { DENSITY, TYPING, ambienceBeds, boostOf, duckLane, motionCues, mixShift, placeOf, speechSpans, styleHint, thin, tiles, volumeFor } from "./actions.mjs";
import { familyOf, findAmbience, pickVariant } from "./library.mjs";
import { DEFAULT_DENSITY, briefOf, isOff, readPrefs, soundPolicy } from "./prefs.mjs";
import { fadeOfTotal, planEnding } from "../hf-edit/ending.mjs";
import { filmWords, trackClips } from "../hf-edit/tracks.mjs";
import { ffmpegExe } from "../library/preview-media.mjs";

export { TYPING };
const run = promisify(execFile);
const r3 = (n) => Math.round(n * 1000) / 1000;

// What a frame's transition says: one continuous scene (no cut: a camera move, a match cut), a soft dissolve, or a real change of picture.
const CONTINUOUS = /\bcontinu|same (scene|shot|place|room|set|location|frame)|match[- ]?cut|(one|single) (shot|take)|\boner\b|no cut|seamless|cùng (một )?(cảnh|khung)|cảnh liền|liền mạch|không cắt|nối tiếp/i;
const SOFT = /cross-?fade|dissolve|\bfades?\b|mờ dần|hoà tan|hòa tan/i;
const CHANGE = /whoosh|swoosh|swish|whip|wipe|swipe|slide|spin|flip|iris|smash|\bcut\b|cutaway|\btransition\b|new (scene|place|location)|chuyển cảnh|cắt sang|cảnh mới/i;
const said = (t) => (!String(t ?? "").trim() ? null : CONTINUOUS.test(t) ? "continuous" : SOFT.test(t) ? "soft" : CHANGE.test(t) ? "change" : null);
/** Does the cut into shot `s` (after `prev`) get a whoosh? Only where the picture really changes: the frame's `transition_in` says so
 *  (a cut, a wipe, a whip…), its `- location:` differs from the shot before's, or the Motion Plan places a transition at the shot's start.
 *  One continuous scene, a dissolve, or a cut that nothing describes: none (Test 20 got 10 whooshes over one continuous scene). */
export function whooshInto(s, prev, plan = null) {
  const own = said(s.transitionIn);
  if (own === "continuous" || own === "soft") return false;
  const a = String(prev?.location ?? "").trim().toLowerCase(), b = String(s.location ?? "").trim().toLowerCase();
  if (a && b) return a !== b;
  if ((plan?.shots?.find((x) => x.shot === s.number)?.motions ?? []).some((m) => m.type === "transition" && (Number(m.start) || 0) <= 0.5)) return true;
  return own === "change";
}

/** May the app add its own whoosh at the cuts? Not in a film style whose author's sound palette names no whoosh (Test 24: an ASCII / CRT
 *  film, whose author's sounds are relays, keys, teletype ticks, BEL and a printer, got four whooshes): the storyboard's named sounds carry
 *  its cuts. A style with no sound section of its own keeps the whoosh; "never a … whoosh" (ink wash) is no whoosh. */
export function whooshAllowed(palette) {
  const all = String(palette ?? "");
  if (!all.trim()) return true;
  return /\b(whoosh|woosh|swoosh|swish|whip|swipe)/i.test(all.replace(/never (?:a |an |any )?(?:[\w-]+ )?(?:whoosh|woosh|swoosh|swish)\w*/gi, ""));
}

/** The automatic cues, unthinned: a whoosh into each real cut and every motion row's own sound (motionCues), each { id, shot, index,
 *  name, family, start, offset: 0, prio, gain, auto | plan, cut? }. whoosh: false leaves the cuts to the storyboard's own sounds
 *  (whooshAllowed); allow(family): false for a family the style or the owner keeps out; style: the library's hint. */
export function autoCues(shots, plan = null, { whoosh = true, allow = null, style = null, density = DEFAULT_DENSITY } = {}) {
  const placed = shots.filter((s) => s.start != null && s.duration).sort((a, b) => a.start - b.start);
  const ok = allow ?? ((f) => f !== "whoosh" || whoosh);
  const step = (DENSITY[density] ?? DENSITY.lively).step;
  const out = [];
  placed.forEach((s, i) => {
    const cutHere = i > 0 && whooshInto(s, placed[i - 1], plan);
    if (cutHere && whoosh && ok("whoosh")) out.push({ id: `cut:${s.number}`, shot: s.number, index: s.index, name: "whoosh", family: "whoosh", offset: 0,
      start: r3(Math.max(0, s.start - 0.2)), prio: 2, gain: 1, auto: true, cut: true });          // lands on the cut
    const motions = plan?.shots?.find((x) => x.shot === s.number)?.motions ?? [];
    out.push(...motionCues(s, motions, { allow: ok, surface: placeOf(s)?.surface ?? null, style, step, skipCut: cutHere }));
  });
  return out.sort((a, b) => a.start - b.start);
}

/** The storyboard's named cues as the mix reads them: at their moment, each with its id (what the Final Mix's "remove" keeps out). */
function namedCues(shots) {
  const seen = new Map();
  return cuesOf(shots).map((c) => {
    const base = `sb:${c.shot}:${slug(c.name)}@${c.offset ?? 0}`, n = seen.get(base) ?? 0;
    seen.set(base, n + 1);
    return { ...c, id: n ? `${base}#${n}` : base, family: familyOf(c.name), start: r3((c.start ?? 0) + (c.offset ?? 0)), offset: 0, prio: 0, gain: 1 };
  });
}
/** Every cue a placement may use (named, the plan's, automatic, unthinned) less those the owner keeps out: the names to find sounds for. */
function everyCue(shots, plan, { whoosh = true, prefs = {}, style = null, density = DEFAULT_DENSITY } = {}) {
  const skip = new Set(prefs.skip ?? []), allow = (f) => (f !== "whoosh" || whoosh) && !isOff(prefs, { family: f });
  return [...namedCues(shots), ...autoCues(shots, plan, { whoosh, allow, style, density })].filter((c) => !skip.has(c.id) && !isOff(prefs, c));
}

/** The mix: { kept, thinned }. The storyboard's own cues, the plan's and the automatic ones, less what the owner keeps out (prefs: off,
 *  skip), moved off the spoken words (afterWords), then thinned to the density (actions.mjs thin: named, then plan, then auto).
 *  sounded(name) (once the sounds are found) keeps only the cues that got a sound, so an automatic cue fills where a named or planned one
 *  found none (Test 24: the automatic "typing" gave way to a named "keyboard typing" that then got no sound). familyOfSound(name): the
 *  family of the sound found for a name (a named cue's own words may not say it). */
export function planCues(shots, plan, { sounded = null, whoosh = true, prefs = {}, density = null, words = null, style = null, familyOfSound = null, drop = null } = {}) {
  const dens = density ?? prefs.density ?? DEFAULT_DENSITY;
  const all = everyCue(shots, plan, { whoosh, prefs, style, density: dens }).filter((c) => (!sounded || sounded(c.name)) && !drop?.has(useKey(c)))
    .map((c) => ({ ...c, family: familyOfSound?.(c.name) ?? c.family ?? null }));
  return thin(afterWords(all, words), dens);
}
/** One cue of the mix, told apart from the stand-by sound of the same motion row (which shares its id). */
const useKey = (c) => `${c.id}|${c.name}`;
/** The cues the mix keeps, by time (planCues's kept). */
export const mixCues = (shots, plan, opts = {}) => planCues(shots, plan, opts).kept;

const AUDIO = /\.(wav|mp3|m4a|ogg|flac|aac)$/i;
/** Cue names a brief line asks a sound for: whoosh / transition, typing / keyboard, else the entrance "pop" (a tick, a click, a ding). */
const cueWords = (line) => {
  const w = line.toLowerCase(), out = new Set();
  if (/\b(whoosh|swoosh|transition)\b|chuyển cảnh/.test(w)) out.add("whoosh");
  if (/\b(typ(e|es|ed|ing|ewriter)|keyboard)\b/.test(w)) out.add("typing");
  for (const m of w.matchAll(/\b(tick|click|pop|ding|ping|hit|blip|beep)\b/g)) { out.add("pop"); out.add(m[1]); }
  if (!out.size && /\b(sfx|sound effects?)\b|hiệu ứng âm thanh/.test(w)) out.add("pop");
  return out;
};

/** The user's own sounds (assets/audio/): a file the brief names for a sound effect ("soft tick (qc-tone.wav)") or a storyboard cue that
 *  is the file's name replaces the automatic pick for that cue. Returns the cue names it set (so the brief's own tick is not ignored). */
export async function applyOwnerSounds(dir, cues, { root } = {}) {
  // the user's sounds: assets/3_audio/sfx/ and music/, or the old assets/audio/; f is the project-relative path below
  // the sounds the app copied share assets/3_audio/sfx with the user's (the library's variants and ambience loops too): they are not the user's
  const mine = new Set(Object.values(readState(dir).sounds ?? {}).filter((s) => s.source !== "owner").flatMap((s) => [s.file, ...(s.variants ?? []).map((v) => v.file)]));
  const files = ["assets/3_audio/sfx", "assets/3_audio/music", "assets/audio"].flatMap((rel) => {
    const d = join(dir, ...rel.split("/"));
    return existsSync(d) ? readdirSync(d).filter((n) => AUDIO.test(n)).map((n) => `${rel}/${n}`).filter((p) => !mine.has(p)) : [];
  });
  if (!files.length) return [];
  const brief = ["BRIEF.md", "STORYBOARD.md"].map((f) => join(dir, f)).filter(existsSync).map((f) => readFileSync(f, "utf8")).join("\n");
  const names = new Map();                                          // cue name -> file
  for (const path of files) {
    const f = path.split("/").pop();
    const stem = f.replace(/\.[^.]+$/, "");
    for (const c of cues) if (c.name === f.toLowerCase() || c.name === stem.toLowerCase() || slug(c.name) === slug(stem)) names.set(c.name, path);
    for (const line of brief.split(/\r?\n/)) if (line.toLowerCase().includes(f.toLowerCase()) || (stem.length > 3 && line.toLowerCase().includes(stem.toLowerCase())))
      for (const n of cueWords(line)) if (!names.has(n)) names.set(n, path);
  }
  const st = readState(dir), set = [];
  for (const [name, path] of names) {
    const cur = st.sounds[name];
    if (cur?.source === "owner" && cur.id === `owner:${path}` && existsSync(join(dir, cur.file))) continue;
    const dur = await durationOf(join(dir, ...path.split("/")), root).catch(() => null);
    useOwnerSound(dir, name, path, { durationS: dur });
    set.push(name);
  }
  return set;
}
async function durationOf(file, root) {
  const { stderr } = await run(ffmpegExe(root), ["-hide_banner", "-i", file], { windowsHide: true }).catch((e) => ({ stderr: String(e.stderr ?? "") }));
  const m = /Duration:\s*(\d+):(\d+):([\d.]+)/.exec(stderr);
  return m ? Math.round((Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3])) * 1000) / 1000 : null;
}

/** The film's spoken words, in film seconds, when it has a voice-over with its reviewed transcript (HyperFrames' transcript.json), else
 *  null: each word where the clip that plays it puts it, a voice cut into one clip a line (el-voice-01…, Test 22) too (tracks.mjs filmWords). */
export const spokenWords = (dir) => filmWords(dir);
/** Under a voice-over (from What If animation's references/sound.md, FreshStack, MIT): an effect that would land
 *  inside a spoken word goes into the pause just after it, so the word stays clear and the sound answers it. Returns the cues, moved. */
export function afterWords(cues, words) {
  if (!words?.length) return cues;
  return cues.map((c) => {
    const w = words.find((x) => c.start >= x.start - 0.02 && c.start < x.end);
    return w ? { ...c, start: r3(w.end + 0.04), offset: 0, movedFrom: c.start, afterWord: w.text } : c;
  }).sort((a, b) => a.start - b.start);
}
/** Where each sound starts sounding (its attack), in seconds from the file's start: FFmpeg's silencedetect below -40 dB. */
export async function onsetOf(file, root) {
  const { stderr } = await run(ffmpegExe(root), ["-hide_banner", "-nostats", "-i", file, "-map", "0:a:0", "-t", "3", "-af", "silencedetect=noise=-40dB:d=0.005", "-f", "null", "-"], { windowsHide: true, maxBuffer: 16 << 20, timeout: 60000 })
    .catch((e) => ({ stderr: String(e.stderr ?? "") }));
  const first = /silence_start:\s*(-?[\d.]+)/.exec(stderr), end = /silence_end:\s*([\d.]+)/.exec(stderr);
  return first && Number(first[1]) <= 0.001 && end ? Math.min(1, r3(Number(end[1]))) : 0;
}

/** Repeats of one sound vary: each cue of a sound with variants gets the variant the film has used least so far (by any name: the library's
 *  files are shared, "thread pull" and "needle through cloth" both rustle), never the one its name had the time before; pickVariant (by the
 *  sound and its count) breaks a tie. */
export function withVariants(cues, sounds) {
  const last = new Map(), count = new Map(), used = new Map();
  const uses = (v) => used.get(v.file ?? v.id) ?? 0;
  return cues.map((c) => {
    const s = sounds?.[c.name], vs = s?.variants;
    if (!vs?.length) { if (s?.file) used.set(s.file, (used.get(s.file) ?? 0) + 1); return c; }
    const k = count.get(c.name) ?? 0;
    count.set(c.name, k + 1);
    const seed = pickVariant(vs, `${c.name}#${k}`).id;
    const pool = vs.length > 1 ? vs.filter((v) => v.id !== last.get(c.name)) : vs;
    const v = [...pool].sort((a, b) => uses(a) - uses(b) || (a.id === seed ? -1 : b.id === seed ? 1 : String(a.id).localeCompare(String(b.id))))[0];
    used.set(v.file ?? v.id, uses(v) + 1);
    last.set(c.name, v.id);
    return { ...c, variant: v.id };
  });
}

/** How many times one sound file may play in a film (owner 30/10, Test 26: a plug's pull twelve times, one bee buzz twelve times). */
export const MAX_REPEATS = 3;
/** The same file at most `max` times: the uses past it are left out ({ kept, thinned }, why "repeat"), the storyboard's named sounds kept
 *  first, then the Motion Plan's, then the automatic ones, each kept set spread over the film. A walk's steps are one use; the owner's own
 *  sounds are never left out. */
export function capRepeats(cues, sounds, max = MAX_REPEATS) {
  const fileOf = (c) => { const s = sounds?.[c.name]; if (!s || s.source === "owner") return null;
    return (c.variant ? (s.variants ?? []).find((v) => v.id === c.variant)?.file : null) ?? s.file ?? null; };
  const walk = (c) => (c.family === "footstep" && /:\d+$/.test(String(c.id ?? "")) ? String(c.id).replace(/:\d+$/, "") : null);
  const prio = (c) => c.prio ?? 2, out = new Set();
  const byFile = new Map();
  for (const c of cues) { const f = fileOf(c); if (f) byFile.set(f, [...(byFile.get(f) ?? []), c]); }
  for (const list of byFile.values()) {
    const groups = new Map();
    for (const c of list) { const k = walk(c) ?? c; groups.set(k, [...(groups.get(k) ?? []), c]); }
    const uses = [...groups.values()].sort((a, b) => a[0].start - b[0].start);
    if (uses.length <= max) continue;
    const keep = new Set();
    for (const p of [0, 1, 2]) {
      const tier = uses.filter((u) => Math.min(...u.map(prio)) === p), room = max - keep.size;
      if (room <= 0) break;
      if (tier.length <= room) for (const u of tier) keep.add(u);
      else for (let i = 0; i < room; i++) keep.add(tier[room === 1 ? 0 : Math.round((i * (tier.length - 1)) / (room - 1))]);
    }
    for (const u of uses) if (!keep.has(u)) for (const c of u) out.add(c);
  }
  return { kept: cues.filter((c) => !out.has(c)), thinned: cues.filter((c) => out.has(c)).map((c) => ({ ...c, why: "repeat" })) };
}

/** The ending's fade at the film's end, for the ambience: the music's own fade when it plays to the end (tracks.mjs fitted it to the
 *  plan's ending), else the plan's ending fade, else ending.mjs's for the film's length. */
function endFadeOf(dir, filmEnd) {
  try {
    // the music's last clip: a song played again after itself ends on its repeat (tracks.mjs musicLoop)
    const last = trackClips(readFileSync(join(dir, "index.html"), "utf8"), "music").filter((c) => c.duration != null)
      .sort((x, y) => x.start + x.duration - (y.start + y.duration)).at(-1);
    if (last && last.fadeOut > 0 && filmEnd && last.start + last.duration >= filmEnd - 0.1) return last.fadeOut;
  } catch { /* no film page */ }
  const e = planEnding(dir);
  if (Number(e.fade) > 0) return Number(e.fade);
  return filmEnd ? fadeOfTotal(filmEnd, { endCard: e.kind === "endCard", inside: e.inside === true || e.kind === "author" }) : 0;
}

/** The ambience beds of the film, placed (mountAmbience): one loop of the library per run of shots in one place, crossfaded at a change of
 *  place, faded in at the start and out with the ending's fade, ducked under the words. Returns the beds placed. */
async function placeAmbience(dir, shots, { prefs = {}, filmEnd = null, endFade = 0, words = null, shift = 0, root } = {}) {
  const skip = new Set(prefs.skip ?? []);
  const beds = ambienceBeds(shots, { find: (q) => { try { return findAmbience(q, { root }); } catch { return null; } }, filmEnd, endFade })
    .filter((b) => !skip.has(b.key) && !isOff(prefs, { name: b.query, family: b.entry.family }));
  const spans = words?.length ? speechSpans(words) : [], clips = [];
  for (const b of beds) {
    const name = `ambience: ${b.query}`, s = useLibrarySound(dir, name, [b.entry]);
    if (!s) continue;
    const volume = volumeFor("ambience", b.entry.lufs, { shift, maxBoost: boostOf(b.entry) });
    for (const t of tiles(b, b.entry.duration)) clips.push({ key: b.key, name, file: s.file, ...t, volume, shots: b.shots, automation: duckLane(t, spans) });
  }
  mountAmbience(dir, clips);
  return beds.filter((b) => clips.some((c) => c.key === b.key));
}

/** Find, mount and credit the sounds. Returns { cues, placed, added, missing, failed, near, offline, names, ambience, thinned, density,
 *  silent }. opts: whoosh (false: the style's palette has no whoosh, whooshAllowed), palette (the style's sound section: silence or fewer
 *  sounds, its material), styleId / styleTitle (the material when the palette says none), root, signal, fetchImpl, timeoutMs, online. */
export async function autoSfx(dir, shots, plan, opts = {}) {
  const prefs = readPrefs(dir), palette = opts.palette ?? "";
  const policy = soundPolicy({ prefs, brief: briefOf(dir), palette });
  const style = opts.style ?? styleHint({ palette, id: opts.styleId, title: opts.styleTitle });
  const words = spokenWords(dir), whoosh = opts.whoosh !== false && !isOff(prefs, { family: "whoosh" });
  const ends = (shots ?? []).map((s) => Number(s.start) + Number(s.duration)).filter((x) => Number.isFinite(x) && x > 0);
  const filmEnd = ends.length ? Math.max(...ends) : null;
  const note = (extra) => patchState(dir, (st) => { st.policy = { density: policy.density, whoosh, silent: policy.silent, ambience: policy.ambience, style }; Object.assign(st, extra); });
  if (policy.silent) {          // the owner, the style or the brief asks for no sound effects: none of the app's own
    mount(dir, [], { cueKey: cueKey(shots ?? []), left: { missing: [], near: [] } });
    mountAmbience(dir, []);
    note({ thinned: [] });
    writeCredits(dir);
    return { cues: 0, placed: 0, owned: [], added: [], missing: [], failed: [], near: [], offline: false, names: [], ambience: 0, thinned: 0, density: policy.density, silent: policy.silent };
  }
  const o = { whoosh, prefs, density: policy.density, style };
  const every = everyCue(shots, plan, o);
  const owned = await applyOwnerSounds(dir, every, opts);
  const families = new Map(every.filter((c) => c.family).map((c) => [c.name, c.family]));
  const res = await resolveCues(dir, every, { ...opts, library: true, style, families });
  // the mix once the sounds are known: a cue with no sound leaves its place to an automatic one; one file at most MAX_REPEATS times, and a
  // repeat left out may leave its moment to another sound (the motion's own), so the mix is planned again without it
  const st1 = readState(dir), sounded = (n) => !!st1.sounds[n] && existsSync(join(dir, ...String(st1.sounds[n].file).split("/")));
  const drop = new Set(), repeats = [];
  let kept = [], thinned = [];
  for (let pass = 0; pass < 4; pass++) {
    ({ kept, thinned } = planCues(shots, plan, { ...o, sounded, words, familyOfSound: (n) => st1.sounds[n]?.family ?? null, drop }));
    const capped = capRepeats(withVariants(kept, st1.sounds), st1.sounds);
    kept = capped.kept;
    if (!capped.thinned.length) break;
    for (const c of capped.thinned) { drop.add(useKey(c)); repeats.push(c); }
  }
  thinned = [...thinned, ...repeats].sort((a, b) => a.start - b.start);
  const lv = await levels(dir, [...new Set(kept.map((c) => c.name))], opts).catch(() => null);
  if (lv) setVolumes(dir, lv.volumes);
  const st = readState(dir);
  let cues = kept;
  if (words) {          // the attack of each sound on its cue: the library's own, else measured
    const onsets = new Map();
    for (const c of cues) {
      const s = st.sounds[c.name], v = c.variant ? s?.variants?.find((x) => x.id === c.variant) : null, file = v?.file ?? s?.file;
      if (!file || onsets.has(file)) continue;
      const known = v?.onset ?? s?.onset;
      onsets.set(file, Number.isFinite(known) ? known : existsSync(join(dir, ...file.split("/"))) ? await onsetOf(join(dir, ...file.split("/")), opts.root).catch(() => 0) : 0);
    }
    cues = cues.map((c) => { const s = st.sounds[c.name], v = c.variant ? s?.variants?.find((x) => x.id === c.variant) : null; return { ...c, onset: onsets.get(v?.file ?? s?.file) ?? 0 }; });
  }
  const near = res.near ?? [];
  const endFade = filmEnd ? endFadeOf(dir, filmEnd) : 0;          // the ending's fade: the beds and the sounds in it fade with the film
  const placed = mount(dir, cues, { filmEnd, endFade, cueKey: cueKey(shots ?? []), left: { missing: res.missing, near } });
  const beds = policy.ambience ? await placeAmbience(dir, shots, { prefs, filmEnd, endFade, words, shift: lv?.shift ?? 0, root: opts.root }) : (mountAmbience(dir, []), []);
  note({ thinned: thinned.map((c) => ({ id: c.id, name: c.name, start: c.start, why: c.why })) });
  writeCredits(dir);
  return { levels: lv, cues: cues.length, placed: placed.length, owned, added: res.added, missing: res.missing, failed: res.failed ?? [],
    near, offline: !!res.offline, names: [...new Set(placed.map((p) => p.name))], ambience: beds.length, thinned: thinned.length, density: policy.density, silent: null };
}

/** Loudness (LUFS, FFmpeg EBU R128): a bed or a voice by its integrated loudness; a short effect by its loudest 400 ms (momentary max),
 *  since an effect is mostly silence around one hit. */
async function lufsOf(file, root, { short = false } = {}) {
  const { stderr } = await run(ffmpegExe(root), ["-hide_banner", "-nostats", "-i", file, "-map", "0:a:0", "-af", "ebur128", "-f", "null", "-"], { windowsHide: true, maxBuffer: 64 << 20, timeout: 180000 });
  if (short) {
    const ms = [...stderr.matchAll(/\sM:\s*(-?[\d.]+)/g)].map((m) => Number(m[1])).filter(Number.isFinite);
    return ms.length ? Math.max(...ms) : null;
  }
  const i = /I:\s*(-?[\d.]+)\s*LUFS/.exec(stderr.slice(stderr.lastIndexOf("Summary:")));
  return i ? Number(i[1]) : null;
}
const meanDb = (file, root) => lufsOf(file, root);
const db = (v) => 20 * Math.log10(Math.max(0.001, Number(v) || 0));
/** Levels by family (actions.mjs LEVELS: one-shots under the music bed and the voice): each sound at its family's level, brought from its
 *  own loudness (the library's catalog LUFS, else measured) to the level's, the whole set moved with the film's measured mix (mixShift: the
 *  music bed, else the voice) and kept 4 dB under the voice. { volumes: { name: 0-1, "name|#|variant": 0-1 }, bed, voice, shift }. */
export async function levels(dir, names, { root } = {}) {
  const html = readFileSync(join(dir, "index.html"), "utf8");
  // the voice-over and the music, however many clips each is on (a voice cut into one clip a line, a song played again): their file
  const track = (kind) => { const c = trackClips(html, kind).find((x) => x.src && existsSync(join(dir, ...x.src.split("/"))));
    return c ? { src: c.src, vol: c.volume } : null; };
  const music = track("music"), voice = track("voice");
  const bed = music ? (await meanDb(join(dir, ...music.src.split("/")), root).catch(() => null)) : null;
  const vo = voice ? (await meanDb(join(dir, ...voice.src.split("/")), root).catch(() => null)) : null;
  const mix = { bed: bed != null ? bed + db(music.vol) : null, voice: vo != null ? vo + db(voice.vol) : null };
  const shift = mixShift(mix);
  const st = readState(dir), volumes = {};
  for (const n of names) {
    const s = st.sounds[n];
    if (!s || !existsSync(join(dir, ...s.file.split("/")))) continue;
    const loud = Number.isFinite(s.lufs) ? s.lufs : await lufsOf(join(dir, ...s.file.split("/")), root, { short: true }).catch(() => null);
    const family = s.family ?? familyOf(n), maxBoost = boostOf(s);
    volumes[n] = volumeFor(family, loud, { shift, voice: mix.voice, maxBoost });
    for (const v of s.variants ?? []) volumes[`${n}${VARIANT_KEY}${v.id}`] = volumeFor(family, Number.isFinite(v.lufs) ? v.lufs : loud, { shift, voice: mix.voice, maxBoost });
  }
  return { volumes, bed: mix.bed, voice: mix.voice, shift };
}
