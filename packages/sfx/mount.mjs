// The sounds on the film's page: the effects' <audio> tags (mount) and the ambience beds' (mountAmbience), what is placed now and what the user moved, taken off or muted, each sound's level.
// (audit/112a B11: one of the files packages/sfx/index.mjs was split into; index.mjs is still the package's door.)
import { attrsOf, audioLine } from "../hf-edit/tag.mjs";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { MAX_GAIN, levelOf } from "./mix/levels.mjs";
import { sig } from "./actions.mjs";
import { cueIdOf, sameCue } from "./cues.mjs";
import { ADDED, patchState, r3, readState, saveState } from "./state.mjs";
import { libraryTitle } from "./sources.mjs";

// VOLUME: a cue placed with no level of its own; the placement levels each by its family (sfx/mix/levels.mjs LEVELS). MAX_AUTO_S: longer is a recording, not an effect.
// TRACK: the first sound-effect lane, LANES of them (the owner's own clips start at 40)
export const VOLUME = 0.35, TRACK = 20, LANES = 16, MAX_AUTO_S = 6;

/** The app's sounds on the page: Map identity -> { tag: its attributes, before: its record in sfx.json, app: the second the app placed it at, moved: seconds off that. */
function placedTags(html, st) {
  const out = new Map();
  for (const m of String(html).matchAll(/<audio\b([^>]*)>/gi)) {
    const a = attrsOf(m[1]), n = /^el-sfx-(\d+)$/.exec(a.id ?? "")?.[1];
    if (n == null) continue;
    const rec = st.mounted?.[Number(n)] ?? null, before = a["data-mw-cue"] == null ? (rec?.file === a.src ? rec : null) : rec && cueIdOf(rec) === a["data-mw-cue"] ? rec : null;
    const key = a["data-mw-cue"] ?? (before && cueIdOf(before));
    if (!key) continue;
    const app = Number(a["data-mw-at"] ?? before?.placedAt ?? before?.start), moved = Number.isFinite(app) ? r3((Number(a["data-start"]) || 0) - app) : 0;
    out.set(key, { tag: a, before, app, moved: Math.abs(moved) < 0.002 ? 0 : moved });
  }
  return out;
}

/** The cues the user moved by hand, among `cues`: Map identity -> { by: seconds off the app's place, file, name }. */
export function handMoves(dir, cues) {
  const out = new Map();
  let html; try { html = readFileSync(join(dir, "index.html"), "utf8"); } catch { return out; }
  const keys = new Set(cues.map(cueIdOf));
  for (const [key, x] of placedTags(html, readState(dir))) {
    if (!x.moved) continue;
    const to = keys.has(key) ? key : [...keys].find((k) => sameCue(key, k, keys) === "shot");          // a cue the storyboard moved itself goes where it says
    if (to) out.set(to, { by: x.moved, file: x.tag.src, name: x.before?.name ?? null });
  }
  return out;
}

/** The app's sounds as the film has them now: each record with the second and file of its tag (a move on the timeline or in Studio counts); one taken off, or gone with
 *  an earlier version, is left out. By their place in the placement. */
export function mountedNow(dir) {
  const st = readState(dir);
  let html; try { html = readFileSync(join(dir, "index.html"), "utf8"); } catch { return st.mounted ?? []; }
  const tags = new Map([...html.matchAll(/<audio\b([^>]*)>/gi)].map((m) => attrsOf(m[1])).filter((a) => /^el-sfx-\d+$/.test(a.id ?? "")).map((a) => [a.id, a]));
  const mounted = st.mounted ?? [];
  const known = mounted.flatMap((m, i) => { const a = tags.get(`el-sfx-${i}`); return a ? [{ ...m, start: Number(a["data-start"]) || 0, file: a.src ?? m.file }] : []; });
  // a page whose sounds sfx.json no longer lists (T38b-13: Open version brought back a page with 157 sounds, Final Mix said "None placed yet"):
  // its sounds as the page has them, named by their file
  const extra = [...tags.entries()].filter(([id]) => Number(id.slice(7)) >= mounted.length).map(([id, a]) => ({ id: a["data-mw-cue"] ?? id,
    name: String(a.src ?? "").split("/").pop().replace(/\.[a-z0-9]+$/i, "").replace(/[-_~]+/g, " ").trim() || "sound", start: Number(a["data-start"]) || 0, file: a.src ?? null, auto: false, fromPage: true }));
  return [...known, ...extra];
}

/** Every sound file of the film by the name the Sounds drawer gives it ("Bell desk 1", "Soft Service Bell 01"): Map file -> title. */
export function soundTitles(st) {
  const out = new Map(), nice = (t) => (/^[a-z0-9]+(-[a-z0-9]+)*$/.test(t) ? libraryTitle({ id: t }) : t);
  for (const [name, s] of Object.entries(st?.sounds ?? {})) for (const x of [s, ...(s.variants ?? [])]) if (x.file && x.title && (!out.has(x.file) || name.startsWith(ADDED))) out.set(x.file, nice(String(x.title)));
  return out;
}

/** A shot's length changed by hand and the sounds after it moved with it (handEdit setShotTiming): the app's record of where it placed them follows, so an older film's
 *  tags (no data-mw-at) do not read as moved by the user. */
export function shiftPlaced(dir, from, delta) {
  if (!delta || from == null || !readState(dir).mounted?.length) return;
  patchState(dir, (st) => { for (const m of st.mounted) if ((m.placedAt ?? m.start) >= from - 1e-3) { m.start = r3(m.start + delta); if (m.placedAt != null) m.placedAt = r3(m.placedAt + delta); } });
}

const BEGIN = "<!-- mw:sfx (Moworks Studio: the storyboard's sfx: cues; rewritten on every change) -->", END = "<!-- /mw:sfx -->";

const ALWAYS_KEPT = new Set(["data-volume"]);

// a volume set by hand in HyperFrames Studio survives a re-timed cue too
const OURS_ALWAYS = new Set(["id", "src", "data-mw-cue", "data-mw-at"]);

// what says which cue this is and where the app put it, always the app's

/** A cue that says the sound is right here ("wooden chair scrape close"), not a thing that shuts ("small wooden box close"). */
export const saysNear = (name) => {
  const s = String(name ?? "").toLowerCase();
  return /\b(very close|close[- ]up|up close|nearby|right here|near)\b/.test(s) || (/\bclose$/.test(s) && !/\b(door|drawer|lid|box|gate|book|notebook|cabinet|cupboard|hatch|laptop|window|shutter|locker|fridge|oven|case|chest|trunk|safe)\b/.test(s));
};

/**
 * Write the <audio> elements of the cues into index.html (the app's own block), replacing the previous block. HyperFrames Studio and the Editor's timeline edit these
 * elements too (HF first), so a cue that is still there, known by its identity (cueIdOf), keeps what they wrote: its data-hf-id and any other attribute the app does not
 * set, its volume, and, while the plan has not moved that cue, its timing. A cue the user moved stays as far off its place as they moved it and keeps its file; one they took
 * off stays off.
 */
export function mount(dir, cues, { filmEnd = null, endFade = 0, cueKey: key = undefined, times = undefined, left = undefined } = {}) {
  const st = readState(dir), f = join(dir, "index.html");
  let html = readFileSync(f, "utf8");
  // a 181 s "film-projector" clip went into a 40 s film from 0 s and covered the whole SFX lane. A clip plays at most
  // MAX_AUTO_S (an effect, not a bed; the user's own sounds keep their length) and never past the film's end when the caller knows it
  // (autoSfx: the shots' end; a starter page's data-duration is no measure of the film)
  const end = Number(filmEnd) > 0 ? Number(filmEnd) : null;
  // the ending's fade (autoSfx: the music's, else the plan's): a sound in it fades with the picture and the music (Test 26: a 4.3 s clip
  // played on at its full level into the last frame), quieter the later it starts, and faded out by its own end
  const fadeLen = end != null && Number(endFade) > 0 ? Math.min(Number(endFade), end) : 0, fadeAt = fadeLen ? end - fadeLen : null;
  const blockRe = new RegExp(`\\s*${BEGIN.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([\\s\\S]*?)${END}`);
  // each sound the page has now, by its cue (its tag before the block is taken out: a cue that moved in the list keeps what was written on it)
  const earlier = placedTags(blockRe.exec(html)?.[1] ?? "", st), keys = new Set(cues.map(cueIdOf));
  html = html.replace(blockRe, "");
  const rows = [];
  // taken off the timeline by the user: the cue itself, also moved in its shot or in a shot renumbered since; and by its name and second (an older record has only those, and
  // another motion's cue of that sound at that moment would sound as the same one come back)
  const offRecords = st.muted ?? [];
  const isOff = (k, name, at) => offRecords.some((m) => (m.key && (m.key === k || !!sameCue(m.key, k, keys))) || (m.name === name && m.start === at));
  // this cue's tag from before: its own, else (none of its own) the nearest tag of a cue the plan no longer has that is the same one. retimed: the storyboard moved it itself
  const claim = (k, app) => {
    let x = earlier.get(k), from = k, how = null;
    if (!x) for (const [o, y] of earlier) { const h = sameCue(o, k, keys); if (h && (!x || (h === "time" && how !== "time") || (h === how && Math.abs(y.app - app) < Math.abs(x.app - app)))) { x = y; from = o; how = h; } }
    if (x) earlier.delete(from);
    return x ? { ...x, moved: how === "time" ? 0 : x.moved, retimed: how === "time" } : null;
  };
  cues.forEach((c) => {
    if (c.start == null) return;
    const offset = Number(c.offset) || 0, k = cueIdOf(c);
    // `at` is the cue's moment; under a voice-over the clip starts its onset earlier, so its attack lands on the cue
    const at = r3(c.start + offset), app = r3(Math.max(0, at - (Number(c.onset) || 0)));
    if (isOff(k, c.name, at)) return;
    const had = claim(k, app), moved = had?.moved ? had : null, s = st.sounds[c.name];
    const kept = moved && moved.tag.src && existsSync(join(dir, moved.tag.src)) ? moved.tag.src : null;          // the sound the user moved, not the next of its variants
    const v = (kept ? (s?.variants ?? []).find((x) => x.file === kept) : c.variant ? (s?.variants ?? []).find((x) => x.id === c.variant) : null) ?? null;          // this repeat's own file
    const file = kept ?? v?.file ?? s?.file;
    if (!s || !file || !existsSync(join(dir, file))) return;
    const id = `el-sfx-${rows.length}`;
    let start = moved ? r3(Math.max(0, app + moved.moved)) : app;
    if (moved && end != null && start >= end) start = r3(Math.max(0, end - 0.05));
    if (end != null && start >= end) return;
    const whole = kept && !v && kept !== s.file ? Number(moved.tag["data-duration"]) || 1 : v?.durationS ?? s.durationS ?? 1;
    let dur = r3(Math.max(0.05, Math.min(whole, s.source === "owner" ? Infinity : MAX_AUTO_S, end != null ? end - start : Infinity)));
    // a typing, a pour or a machine lasts as long as its motion, with a short fade out
    const held = Number(c.hold) > 0 && s.source !== "owner" && c.hold + 0.25 < dur;
    if (held) dur = r3(c.hold + 0.25);
    const inFade = fadeAt != null && s.source !== "owner" && start + dur > fadeAt + 1e-6;
    // a sound the storyboard names as close by plays whole at its level: the film's last sound, "wooden chair scrape close", once faded away over all of itself, at -45 dB (T32-2); it fades only where the film's end cuts it
    const named = c.prio === 0 && saysNear(c.name);
    const fadeGain = inFade && !named && start > fadeAt ? Math.max(0.05, (end - start) / fadeLen) : 1;
    const fadeOut = named ? (dur < whole ? Math.min(0.15, dur) : 0) : Math.max(held ? 0.15 : 0, inFade ? r3(Math.max(0.05, start + dur - Math.max(fadeAt, start))) : 0);
    // the sound's level from Final Mix (auto.mjs levels: its family's), else its family's, else the default; a small motion's cue is quieter
    const level = v?.volume ?? s.volume ?? (s.family ? levelOf(s.family) : VOLUME);
    const volume = String(Math.round(Math.min(MAX_GAIN, Math.max(0.01, level * (Number(c.gain) || 1) * fadeGain)) * 100) / 100);          // HF carries gain to +12 dB
    const ours = { id, src: file, "data-start": String(start), "data-duration": String(dur), "data-track-index": "", "data-volume": volume,
      ...(fadeOut > 0 ? { "data-fade-out": String(Math.min(dur, fadeOut)) } : {}), "data-mw-cue": k.replace(/"/g, "'"), "data-mw-at": String(app) };
    const was = had?.tag.src === file ? had.tag : null;
    const unmoved = !!had && !had.retimed && had.app === app && (!had.before || had.before.name === c.name);
    // a volume the user set by hand stays; the app's own earlier level follows the new one
    const byHand = (a0, v0) => a0 === "data-volume" && v0 !== String(had?.before?.volume ?? VOLUME);
    const a = {};
    for (const [a0, v0] of Object.entries(was ?? {})) {
      if (a0 === "data-fade-out" && !(a0 in ours) && !unmoved) continue;          // its fade belonged to the place it left
      a[a0] = OURS_ALWAYS.has(a0) ? ours[a0] : !(a0 in ours) || (ALWAYS_KEPT.has(a0) && byHand(a0, v0)) || (unmoved && a0 !== "data-volume") ? v0 : ours[a0];
    }
    for (const [a0, v0] of Object.entries(ours)) if (!(a0 in a)) a[a0] = v0;
    // the lane the app wrote for the words (voicefit.mjs) belongs to the last placement; one the user drew in Studio stays
    if (a["data-automation"] != null && a["data-mw-duck"] === sig(a["data-automation"])) { delete a["data-automation"]; delete a["data-mw-duck"]; }
    if (!(Number(a["data-duration"]) <= dur)) a["data-duration"] = String(dur);          // a kept timing never runs past the cap either
    // the app's own level (a hand-set one differs from it)
    rows.push({ a, start: Number(a["data-start"]) || start, dur: Number(a["data-duration"]) || dur, placed: { ...c, file, start: at, ...(app !== at ? { placedAt: app } : {}), duration: dur, volume: Number(volume) } });
  });
  // lanes: a clip goes on the first sound-effect lane free at its start, in the order they play, a moved one where it is now (HF: data-track-index is only a Studio lane), so
  // a film with a sound on every action keeps a few lanes, never one a cue up into the owner's clips' lanes (40 and up). A lane outside these is the user's.
  const lanes = [];
  const laneAt = (start, dur) => {
    let k = lanes.findIndex((e) => e <= start + 1e-6);
    if (k < 0) k = lanes.length < LANES ? lanes.length : lanes.indexOf(Math.min(...lanes));
    lanes[k] = start + dur;
    return TRACK + k;
  };
  for (const r of [...rows].sort((x, y) => x.start - y.start)) {
    const lane = laneAt(r.start, r.dur), had = Number(r.a["data-track-index"]);
    if (!r.a["data-track-index"] || (had >= TRACK && had < TRACK + LANES)) r.a["data-track-index"] = String(lane);
  }
  const lines = rows.map((r) => audioLine(r.a, { close: true })), placed = rows.map((r) => r.placed);
  if (lines.length) {
    const root = /<[a-z]+\b[^>]*\bdata-composition-id="[^"]*"[^>]*>/i.exec(html);
    if (!root) throw Object.assign(new Error("index.html has no root composition"), { code: "INVALID" });
    const at = root.index + root[0].length;
    html = `${html.slice(0, at)}\n    ${BEGIN}\n    ${lines.join("\n    ")}\n    ${END}${html.slice(at)}`;
  }
  writeFileSync(f, html);
  st.mounted = placed;
  delete st.fit;          // the lanes went with the old placement: fitted again (voicefit.mjs)
  st.placedAt = new Date().toISOString();          // the Editor reads Final Mix again when this changes (GET /pipeline's sfx)
  if (key !== undefined) st.cueKey = key;          // the storyboard's named cues this placement was made from
  if (times !== undefined) st.times = times;          // where the shots stood when it was made (timeKey)
  if (left !== undefined) st.left = left;          // { missing, near }: named sounds left out or on a stand-in (GET /mix)
  saveState(dir, st);
  return placed;
}

/** Final Mix's "Place" again: the cues the user took off come back. */
export function unmuteAll(dir) { const st = readState(dir); if (st.muted?.length) { delete st.muted; saveState(dir, st); } }

/** The user took the app's sound `el-sfx-<i>` off the timeline: that cue stays off when the cues are placed again, by its identity (cue: the one written on its tag, else
 *  its record's), so a cue added in front of it does not bring it back (T29-3). */
export function muteMounted(dir, id, { cue = null } = {}) {
  const i = Number(/^el-sfx-(\d+)$/.exec(id)?.[1]);
  const st = readState(dir);
  const rec = Number.isInteger(i) ? st.mounted?.[i] : null, p = rec && (!cue || cueIdOf(rec) === cue) ? rec : (st.mounted ?? []).find((m) => cueIdOf(m) === cue) ?? null;
  if (!p) return null;
  const key = cueIdOf(p);
  st.muted = [...(st.muted ?? []).filter((m) => (m.key ? m.key !== key : !(m.name === p.name && m.start === p.start))), { key, name: p.name, start: p.start, at: new Date().toISOString() }];
  saveState(dir, st);
  return { name: p.name, start: p.start };
}

const AMB_BEGIN = "<!-- mw:ambience (Moworks Studio: the scenes' ambience beds; rewritten on every placement) -->", AMB_END = "<!-- /mw:ambience -->";

/** The ambience beds' lanes (between the music, 11, and the sound effects, 20). */
export const AMB_TRACK = 12, AMB_LANES = 3;

/** Write the ambience clips into index.html, their own block: [{ key, name, file, start, duration, volume, fadeIn, fadeOut, automation }]
 *  (automation: HF's data-automation, the volume lane that ducks the bed under the words). Two beds that overlap (a crossfade) go on two
 *  lanes. An element Studio stamped keeps its data-hf-id, and a volume set by hand there stays. [] takes them all off. */
export function mountAmbience(dir, clips) {
  const st = readState(dir), f = join(dir, "index.html");
  let html = readFileSync(f, "utf8");
  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const blockRe = new RegExp(`\\s*${esc(AMB_BEGIN)}([\\s\\S]*?)${esc(AMB_END)}`);
  const old = new Map([...(blockRe.exec(html)?.[1] ?? "").matchAll(/<audio\b([^>]*)>/gi)].map((m) => attrsOf(m[1])).filter((a) => a.id).map((a) => [a.id, a]));
  // each bed's clips by its key and their order in it, whatever beds came before: what the user did to one (a move on the timeline, a level) stays with it (T29-3)
  const earlier = new Map(), seen = new Map();
  (st.ambience?.placed ?? []).forEach((p, i) => { const n = seen.get(p.key) ?? 0; seen.set(p.key, n + 1); earlier.set(`${p.key}#${n}`, { p, tag: old.get(`el-amb-${i}`) ?? null }); });
  seen.clear();
  html = html.replace(blockRe, "");
  const lanes = [], lines = [], placed = [];
  for (const c of [...(clips ?? [])].sort((a, b) => a.start - b.start)) {
    if (!c.file || !existsSync(join(dir, ...c.file.split("/"))) || !(c.duration > 0.05)) continue;
    const nth = seen.get(c.key) ?? 0; seen.set(c.key, nth + 1);
    const had = earlier.get(`${c.key}#${nth}`), was = had?.tag?.src === c.file ? had.tag : null;
    const moved = was ? r3((Number(was["data-start"]) || 0) - had.p.start) : 0, start = r3(Math.max(0, c.start + (Math.abs(moved) < 0.002 ? 0 : moved)));
    let k = lanes.findIndex((e) => e <= start + 1e-6);
    if (k < 0) k = lanes.length < AMB_LANES ? lanes.length : lanes.indexOf(Math.min(...lanes));
    lanes[k] = start + c.duration;
    const id = `el-amb-${placed.length}`;
    const a = { id, src: c.file, "data-start": String(start), "data-duration": String(r3(c.duration)), "data-track-index": String(AMB_TRACK + k),
      "data-volume": String(c.volume), "data-fade-in": String(r3(c.fadeIn ?? 0)), "data-fade-out": String(r3(c.fadeOut ?? 0)),
      ...(c.automation ? { "data-automation": JSON.stringify(c.automation).replace(/"/g, "&quot;") } : {}), "data-timeline-role": "sfx" };
    if (was?.["data-hf-id"]) a["data-hf-id"] = was["data-hf-id"];
    if (was?.["data-volume"] != null && was["data-volume"] !== String(had.p.volume)) a["data-volume"] = was["data-volume"];
    lines.push(audioLine(a, { close: true }));
    placed.push({ key: c.key, name: c.name, file: c.file, start: r3(c.start), duration: r3(c.duration), volume: Number(c.volume), shots: c.shots ?? [] });
  }
  if (lines.length) {
    const root = /<[a-z]+\b[^>]*\bdata-composition-id="[^"]*"[^>]*>/i.exec(html);
    if (!root) throw Object.assign(new Error("index.html has no root composition"), { code: "INVALID" });
    const at = root.index + root[0].length;
    html = `${html.slice(0, at)}\n    ${AMB_BEGIN}\n    ${lines.join("\n    ")}\n    ${AMB_END}${html.slice(at)}`;
  }
  writeFileSync(f, html);
  st.ambience = { placed, at: new Date().toISOString() };
  saveState(dir, st);
  return placed;
}

/** Set the level of each sound by name ({ name: 0-1 }) before mounting (Final Mix levels). */
export function setVolumes(dir, levels) {
  const st = readState(dir);
  for (const [k, v] of Object.entries(levels)) {
    if (!Number.isFinite(v)) continue;
    const [n, vid] = k.split(VARIANT_KEY), s = st.sounds[n];          // "name|#|variant id": one variant's own level
    const x = vid ? (s?.variants ?? []).find((y) => y.id === vid) : s;
    if (x) x.volume = Math.round(v * 100) / 100;
  }
  saveState(dir, st);
}

/** The key setVolumes reads for one variant of a sound: `${name}${VARIANT_KEY}${id}`. */
export const VARIANT_KEY = "|#|";
