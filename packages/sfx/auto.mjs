// Sound effects placed by the app at the Final Mix (only after the picture is locked, never during the build):
// the app reads the film's cuts (the timeline) and when things appear (the approved motion plan) and picks from the library the way the
// kit did: a whoosh into each cut, a pop when something enters, typing when text is typed. Cues the storyboard names (`- sfx:`) come first;
// an automatic cue never lands within 0.6 s of another. The sounds are HyperFrames' bundled set first (Pixabay, shipped in its media-use
// skill), then Openverse / Freesound for a name it lacks; mounted and credited by packages/sfx.
import { execFile } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { promisify } from "node:util";
import { cuesOf, mount, readState, resolveCues, setVolumes, slug, useOwnerSound, writeCredits } from "./index.mjs";
import { ffmpegExe } from "../library/preview-media.mjs";

const run = promisify(execFile);

const GAP = 0.6, PER_SHOT = 2;
const r3 = (n) => Math.round(n * 1000) / 1000;

/** The automatic cues: [{ shot, index, name, offset, start, auto: true }] (start = the shot's start, offset within it). */
export function autoCues(shots, plan = null) {
  const placed = shots.filter((s) => s.start != null && s.duration).sort((a, b) => a.start - b.start);
  const out = [];
  placed.forEach((s, i) => {
    if (i > 0) out.push({ shot: s.number, index: s.index, name: "whoosh", offset: 0, start: r3(Math.max(0, s.start - 0.2)), auto: true });       // lands on the cut
    const motions = plan?.shots?.find((x) => x.shot === s.number)?.motions ?? [];
    let n = 0;
    for (const m of [...motions].sort((a, b) => (a.start ?? 0) - (b.start ?? 0))) {
      if (n >= PER_SHOT) break;
      const at = r3(s.start + (Number(m.start) || 0));
      if (at >= s.start + s.duration) continue;
      const typed = /\btyp(e|es|ed|ing|ewriter)\b|keyboard|caret|g[õo] ch[ữu]/i.test(`${m.behavior ?? ""} ${m.target ?? ""}`);
      if (typed) { out.push({ shot: s.number, index: s.index, name: "typing", offset: 0, start: at, auto: true }); n++; }
      else if (m.type === "entrance" || m.type === "text") { out.push({ shot: s.number, index: s.index, name: "pop", offset: 0, start: at, auto: true }); n++; }
    }
  });
  return out;
}

/** The storyboard's own cues and the automatic ones, spaced. */
export function mixCues(shots, plan) {
  const named = cuesOf(shots).map((c) => ({ ...c, start: r3((c.start ?? 0) + (c.offset ?? 0)), offset: 0 }));
  const all = [...named];
  for (const c of autoCues(shots, plan)) if (!all.some((x) => Math.abs(x.start - c.start) < GAP)) all.push(c);
  return all.sort((a, b) => a.start - b.start);
}

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
  // the sounds the app downloaded share assets/3_audio/sfx with the user's: they are not the user's
  const mine = new Set(Object.values(readState(dir).sounds ?? {}).filter((s) => s.source !== "owner").map((s) => s.file));
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

/** The film's spoken words, in film seconds, when it has a voice-over with its reviewed transcript (HyperFrames' transcript.json, the
 *  voice's start added), else null. */
export function spokenWords(dir) {
  let words; try { words = JSON.parse(readFileSync(join(dir, "transcript.json"), "utf8")); } catch { return null; }
  if (!Array.isArray(words) || !words.length) return null;
  const tag = /<audio\b[^>]*\bid="el-voice"[^>]*>/i.exec(readFileSync(join(dir, "index.html"), "utf8"))?.[0];
  if (!tag) return null;
  const at = Number(/data-start="([^"]+)"/.exec(tag)?.[1] ?? 0) || 0;
  return words.filter((w) => Number.isFinite(w.start) && Number.isFinite(w.end)).map((w) => ({ text: w.text, start: r3(w.start + at), end: r3(w.end + at) }));
}
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

/** Find, mount and credit the sounds. Returns { cues, placed, added, missing }. Under a voice-over with its transcript, effects go after the
 *  words they would cover and line up by their attack. */
export async function autoSfx(dir, shots, plan, opts = {}) {
  const words = spokenWords(dir);
  let cues = afterWords(mixCues(shots, plan), words);
  const owned = await applyOwnerSounds(dir, cues, opts);
  const local = await resolveCues(dir, cues, { ...opts, online: false });
  const rest = local.missing.length ? await resolveCues(dir, cues.filter((c) => local.missing.includes(c.name)), opts) : { added: [], missing: [] };
  const lv = await levels(dir, [...new Set(cues.map((c) => c.name))], opts).catch(() => null);
  if (lv) setVolumes(dir, lv.volumes);
  if (words) {          // the attack of each sound on its cue
    const st = readState(dir), onsets = {};
    for (const n of new Set(cues.map((c) => c.name))) { const s = st.sounds[n]; if (s && existsSync(join(dir, ...s.file.split("/")))) onsets[n] = await onsetOf(join(dir, ...s.file.split("/")), opts.root).catch(() => 0); }
    cues = cues.map((c) => ({ ...c, onset: onsets[c.name] ?? 0 }));
  }
  const ends = (shots ?? []).map((s) => Number(s.start) + Number(s.duration)).filter((x) => Number.isFinite(x) && x > 0);
  const placed = mount(dir, cues, { filmEnd: ends.length ? Math.max(...ends) : null });
  writeCredits(dir);
  return { levels: lv, cues: cues.length, placed: placed.length, owned, added: [...local.added, ...rest.added], missing: rest.missing, names: [...new Set(placed.map((p) => p.name))] };
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
/** The kit's levels (references/sound.md §4): each effect about 4 dB over the music bed and at least 2 dB under the voice (4 dB under it
 *  when there is no music). Measured, never guessed: { volumes: { name: 0-1 }, bed, voice } or null when there is nothing to level against. */
export async function levels(dir, names, { root } = {}) {
  const html = readFileSync(join(dir, "index.html"), "utf8");
  const track = (id) => { const t = new RegExp(`<audio\\b[^>]*\\bid="${id}"[^>]*>`, "i").exec(html)?.[0]; if (!t) return null;
    const src = /\ssrc="([^"]+)"/.exec(t)?.[1], vol = /data-volume="([^"]+)"/.exec(t)?.[1] ?? "1"; return src && existsSync(join(dir, ...src.split("/"))) ? { src, vol: Number(vol) } : null; };
  const music = track("el-music"), voice = track("el-voice");
  if (!music && !voice) return null;
  const bed = music ? (await meanDb(join(dir, ...music.src.split("/")), root)) + db(music.vol) : null;
  const vo = voice ? (await meanDb(join(dir, ...voice.src.split("/")), root)) + db(voice.vol) : null;
  let target = bed != null ? bed + 4 : vo - 4;
  if (vo != null) target = Math.min(target, vo - 2);
  const st = readState(dir), volumes = {};
  for (const n of names) {
    const s = st.sounds[n];
    if (!s || !existsSync(join(dir, ...s.file.split("/")))) continue;
    const m = await lufsOf(join(dir, ...s.file.split("/")), root, { short: true });
    if (m == null) continue;
    volumes[n] = Math.min(1, Math.max(0.05, 10 ** ((target - m) / 20)));
  }
  return { volumes, bed, voice: vo, target };
}
