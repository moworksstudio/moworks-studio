// Sound effects, the app's own cue format: storyboard frames carry `sfx:` cues ("whoosh, pop"); each cue name resolves to one file
// in assets/3_audio/sfx/; the film's root document gets one <audio id="el-sfx-N"> per cue at the frame's start (+ offset), on sound-effect
// lanes from track 20, at its family's level (actions.mjs LEVELS: under the music and the voice), and the scenes' ambience beds on
// tracks 12-14 (<audio id="el-amb-N">); a cue that finds nothing is skipped, never a blocker. HF asks a host app to bring its own SFX
// source; this app's is first its offline library (bundle/sfx, library.mjs: CC0 and public domain), then Openverse's Freesound section
// (no key), CC0 and CC BY only (client videos: no NC licences), and the Pixabay sounds HF ships in its media-use skill (Pixabay's,
// under the Pixabay Content License; HF only bundles them).
// Every sound is credited (title, author, page, licence, Openverse's attribution line) in .moworks/sfx.json and CREDITS.md.
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { docPath } from "../project-service/docs.mjs";
import { APP_ROOT, expandEnv, loadPins, sourceHead } from "../version-manager/index.mjs";
import { MAX_GAIN, levelOf } from "./actions.mjs";
import { matchLocal, plainName } from "./library.mjs";

export const OPENVERSE = "https://api.openverse.org/v1/audio/";
const LICENCES = { cc0: "CC0", by: "CC BY" };
// VOLUME: a sound with no family (the storyboard-only pass, apply); the Final Mix levels each by its family (actions.mjs LEVELS).
// TRACK: the first sound-effect lane, LANES of them (the owner's own clips start at 40)
export const VOLUME = 0.35, TRACK = 20, LANES = 16, MAX_AUTO_S = 6;
const readJson = (p, d) => { try { return JSON.parse(readFileSync(p, "utf8")); } catch { return d; } };
export const slug = (s) => String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "sound";
const r3 = (n) => Math.round(n * 1000) / 1000;

/** How long one search may take (Test 24: Openverse's search hung 15-20 s a query and the placement waited on every one), and one
 *  download. */
export const SEARCH_TIMEOUT_MS = 7000, DOWNLOAD_TIMEOUT_MS = 30000;
/** Searches in a row that failed, after which a placement stops asking (the search is down). */
export const DOWN_AFTER = 3;
/** The caller's signal and a time limit, as one. */
const within = (signal, ms) => (signal ? AbortSignal.any([signal, AbortSignal.timeout(ms)]) : AbortSignal.timeout(ms));

/** Openverse search, Freesound only, CC0 / CC BY only. Each result: { id, title, creator, licence, licenceUrl, page, url, durationS, attribution }. */
export async function search(q, { limit = 12, fetchImpl = fetch, signal, timeoutMs = SEARCH_TIMEOUT_MS } = {}) {
  const u = new URL(OPENVERSE);
  u.search = new URLSearchParams({ q: String(q).trim(), source: "freesound", license: "cc0,by", mature: "false", page_size: String(Math.min(20, limit)) });     // 20 is the most Openverse gives without a key (more answers 401)
  const r = await fetchImpl(u.href, { signal: within(signal, timeoutMs), headers: { "User-Agent": "MoworksStudio/1.0 (personal studio app)" } });
  if (!r.ok) throw Object.assign(new Error(`Openverse answered ${r.status}`), { code: "SFX_SEARCH" });
  const j = await r.json();
  return (j.results ?? []).filter((x) => LICENCES[x.license] && /^https:\/\//.test(x.url ?? "")).map((x) => ({
    id: x.id, source: "openverse", title: x.title ?? "", creator: x.creator ?? "", creatorUrl: x.creator_url ?? null,
    licence: `${LICENCES[x.license]} ${x.license_version ?? ""}`.trim(), licenceUrl: x.license_url ?? null, page: x.foreign_landing_url ?? null,
    url: x.url, durationS: x.duration != null ? x.duration / 1000 : null, attribution: x.attribution ?? null, provider: x.provider ?? "freesound" }));
}

/** One Openverse sound by its id, read again on the server (the browser only sends the id): null when it is not CC0 / CC BY. */
export async function details(id, { fetchImpl = fetch, signal, root = APP_ROOT } = {}) {
  if (String(id).startsWith("pixabay:")) return bundled(root).find((b) => b.id === id) ?? null;
  if (!/^[0-9a-f-]{36}$/i.test(String(id))) return null;
  const r = await fetchImpl(`${OPENVERSE}${id}/`, { signal, headers: { "User-Agent": "MoworksStudio/1.0 (personal studio app)" } });
  if (!r.ok) return null;
  const x = await r.json();
  if (!LICENCES[x.license] || !/^https:\/\//.test(x.url ?? "")) return null;
  return { id: x.id, source: "openverse", title: x.title ?? "", creator: x.creator ?? "", creatorUrl: x.creator_url ?? null,
    licence: `${LICENCES[x.license]} ${x.license_version ?? ""}`.trim(), licenceUrl: x.license_url ?? null, page: x.foreign_landing_url ?? null,
    url: x.url, durationS: x.duration != null ? x.duration / 1000 : null, attribution: x.attribution ?? null, provider: x.provider ?? "freesound" };
}

/** The offline set: Pixabay sounds that HyperFrames ships in its media-use skill (media-use/audio/assets/sfx in HF's skills at the pinned commit, bundle/hf; HF's
 *  CREDITS.md: "sourced from Pixabay … Pixabay Content License"). They are Pixabay's, not HyperFrames': credited to Pixabay, with the
 *  permalink of the copy HF ships. */
let bundledCache = null;
export function bundled(root = APP_ROOT) {
  const pins = loadPins(root), skills = expandEnv(pins.hyperframes.skillsRoot);
  const dir = join(skills, "media-use", "audio", "assets", "sfx");
  if (bundledCache?.dir === dir) return bundledCache.list;
  // the skills' own commit (their clone's .git, or bundle/hf/PINNED): never git in the folder above, which is the app's own repo on a new computer
  const commit = sourceHead(dirname(skills)) ?? pins.hyperframes.source?.commit ?? `v${pins.hyperframes.default}`;
  const list = Object.entries(readJson(join(dir, "manifest.json"), {})).map(([key, v]) => ({
    id: `pixabay:${key}`, source: "pixabay", title: key, creator: "Pixabay", creatorUrl: "https://pixabay.com/sound-effects/", licence: "Pixabay Content License",
    licenceUrl: "https://pixabay.com/service/license-summary/", page: "https://pixabay.com/sound-effects/", file: join(dir, v.file),
    via: `the copy HyperFrames ships in its media-use skill: https://github.com/${pins.hyperframes.repo}/blob/${commit}/skills/media-use/audio/assets/sfx/${v.file}`,
    durationS: v.duration ?? null, description: v.description ?? "", attribution: `"${key}" from Pixabay, Pixabay Content License (https://pixabay.com/service/license-summary/).` }));
  bundledCache = { dir, list };
  return list;
}
/** HF's matching rule for the bundled set: manifest key, file name, or slug. */
export function matchBundled(name, list) {
  const n = String(name).toLowerCase(), s = slug(name);
  return list.find((b) => b.title === n || `${b.title}.mp3` === n || slug(b.title) === s) ?? null;
}
// Words that name the same kind of sound as one of the bundled set (its manifest's descriptions), used only while the sound search does
// not answer: Openverse answered 504 to every search in Test 20 and "lamp ting", "boat bell" were dropped without a word.
// Test 24 (the search hung): "keyboard typing", "teletype ticks", "heavy enter key", "bell ding", "dot matrix printer", "switch click",
// "crt power on" all got nothing; a key, a printer, a teletype, a power switch and a relay are kinds the set has too
const NEAR = [
  [/^(ting|tink|ding|dong|bells?|chimes?|jingle|tinkle|ring|rings|ringing)$/, "chime"], [/^(ping|beep|beeps|bleep|blip|boop)$/, "ping"],
  [/^(sparkles?|sparkling|shimmer|twinkle|glitter|glint|shine|magic)$/, "sparkle"],
  [/^(clicks?|tap|taps|tick|ticks|ticking|toggle|button|clack|clacks|clunk|switch|relay|power|teletype|telegraph|morse)$/, "click"],
  [/^(keypress|keystroke|key|keys|keycap|enter|return|spacebar)$/, "key-press"], [/^(typing|typewriter|keyboard|printer|printing)$/, "typing"],
  [/^(pops?|plop|bloop)$/, "pop"],
  [/^(whoosh|woosh|swoosh|swish|swipe|whip)$/, "whoosh"], [/^(impact|thud|thump|boom|slam|bang|stomp)$/, "impact-bass-1"],
  [/^(riser|rise|swell)$/, "riser"], [/^(glitch|static|distortion)$/, "glitch-1"], [/^(error|buzzer|buzz|wrong)$/, "error"],
  [/^(notification|alert|notify)$/, "notification"],
];
/** The bundled sound closest to a cue's name, by the name's own words, the last first ("lamp ting": a ting, so the chime); null when no
 *  word names a kind of sound the set has (water, wind, an oar). */
export function nearBundled(name, list) {
  const exact = matchBundled(name, list);
  if (exact) return exact;
  for (const w of slug(name).split("-").reverse()) {
    const key = NEAR.find(([re]) => re.test(w))?.[1];
    const b = key && list.find((x) => x.title === key);
    if (b) return b;
  }
  return null;
}

const CUE = /^\s*(.+?)\s*(?:@\s*([\d.]+)\s*s?)?\s*$/;
/** A `- sound:` line that is a list of sound names ("water drip, bell, ting@0.4"), not a sentence about the sound ("nhạc vào nhẹ; tiếng
 *  nước; "ting" khi đèn sáng"): every part at most 4 words, no quotes or sentence marks. */
const soundList = (line) => !/[;"“”.!?:()]/.test(String(line).replace(/@\s*[\d.]+/g, "")) && String(line).split(",").every((p) => (CUE.exec(p)?.[1] ?? "").split(/\s+/).length <= 4);
/** Cues of the storyboard: [{ shot, index, name, offset }] ("whoosh@0.4" = 0.4 s after the shot starts; "none" = no sound). A frame's
 *  `- sfx:` line; a frame without one has its `- sound:` line read the same way when it is a list of names (Claude wrote
 *  `- sound: water drip, bell, ting` and the sounds were dropped). */
export function cuesOf(shots) {
  const out = [];
  for (const s of shots) {
    const line = s.sfx != null ? s.sfx : s.sound != null && soundList(s.sound) ? s.sound : "";
    for (const part of String(line).split(",")) {
      const m = CUE.exec(part);
      if (!m || !m[1] || /^none$/i.test(m[1])) continue;
      out.push({ shot: s.number, index: s.index, name: m[1].toLowerCase(), offset: m[2] ? Number(m[2]) : 0, start: s.start });
    }
  }
  return out;
}

const stateFile = (dir) => join(dir, ".moworks", "sfx.json");
export const readState = (dir) => readJson(stateFile(dir), { sounds: {} });
function saveState(dir, st) { mkdirSync(join(dir, ".moworks"), { recursive: true }); writeFileSync(stateFile(dir), JSON.stringify(st, null, 2) + "\n"); }
/** Change the state in one step (the placement's notes: what was thinned, the policy it followed). */
export function patchState(dir, fn) { const st = readState(dir); fn(st); saveState(dir, st); return st; }

/** Use the offline library's sound for a cue name: each choice (the best and its close variants, matchLocal) copied once into
 *  assets/3_audio/sfx/<id>.ogg, shared by every name that uses it; the first is the name's sound, all of them its variants (a film's
 *  repeats of one sound vary). weak: the library only had a loose match, looked up online again the next time the search may answer. */
export function useLibrarySound(dir, name, choices, { weak = false } = {}) {
  const list = (choices ?? []).filter((e) => e?.path && existsSync(e.path)).slice(0, 4);
  if (!list.length) return null;
  mkdirSync(join(dir, "assets", "3_audio", "sfx"), { recursive: true });
  const vs = list.map((e) => {
    const rel = `assets/3_audio/sfx/${e.id}.ogg`;
    if (!existsSync(join(dir, ...rel.split("/")))) copyFileSync(e.path, join(dir, ...rel.split("/")));
    return { id: e.id, title: e.id, family: e.family, file: rel, durationS: e.duration ?? null, lufs: e.lufs ?? null, onset: e.onset ?? 0, loop: !!e.loop, credit: e.source ?? null };
  });
  const st = readState(dir), c = vs[0].credit ?? {};
  st.sounds[name] = { ...vs[0], id: `library:${vs[0].id}`, source: "library", creator: c.author ?? "", licence: c.licence ?? "", licenceUrl: c.licenceUrl ?? null, page: c.url ?? null,
    ...(vs.length > 1 ? { variants: vs } : {}), ...(weak ? { weak: true } : {}), addedAt: new Date().toISOString() };
  saveState(dir, st);
  return st.sounds[name];
}
/** Names whose plain word ties many sounds, looked up by a narrower one (a cut's whoosh is a soft one of a second, not a 4 s thruster or a
 *  2.6 s swell that peaks after the cut). */
export const LIBRARY_QUERY = Object.freeze({ whoosh: "soft whoosh", footstep: "footstep wood", footsteps: "footstep wood", impact: "soft thud",
  rain: "steady rain", wind: "mild wind", crowd: "crowd murmur" });

/** Put one sound into the project (assets/3_audio/sfx/<name>.mp3, the user's folder layout; never over another file) and record
 *  it for this cue name. */
export async function useSound(dir, name, item, { fetchImpl = fetch, signal } = {}) {
  const st = readState(dir);
  const taken = new Set(Object.entries(st.sounds).filter(([n]) => n !== name).map(([, s]) => s.file));
  let rel = `assets/3_audio/sfx/${slug(name)}.mp3`;
  for (let i = 2; taken.has(rel) || (existsSync(join(dir, rel)) && st.sounds[name]?.file !== rel); i++) rel = `assets/3_audio/sfx/${slug(name)}-${i}.mp3`;
  mkdirSync(join(dir, "assets", "3_audio", "sfx"), { recursive: true });
  if (item.source === "pixabay") copyFileSync(item.file, join(dir, rel));
  else {
    const r = await fetchImpl(item.url, { signal: within(signal, DOWNLOAD_TIMEOUT_MS) });
    if (!r.ok) throw Object.assign(new Error(`Download failed (${r.status})`), { code: "SFX_DOWNLOAD" });
    writeFileSync(join(dir, rel), Buffer.from(await r.arrayBuffer()));
  }
  const { file: _f, ...meta } = item;
  st.sounds[name] = { ...meta, file: rel, addedAt: new Date().toISOString() };
  saveState(dir, st);
  return st.sounds[name];
}

/** A sound the user gave (in assets/3_audio/…), used for this cue name where it is (no copy); credited as the user's own. */
export function useOwnerSound(dir, name, srcRel, { durationS = null } = {}) {
  const st = readState(dir);
  const rel = srcRel;
  const base = srcRel.split("/").pop();
  st.sounds[name] = { id: `owner:${srcRel}`, source: "owner", title: base, creator: "the owner", licence: "provided by the owner", file: rel, durationS,
    attribution: `"${base}" provided by the owner (${srcRel}).`, addedAt: new Date().toISOString() };
  saveState(dir, st);
  return st.sounds[name];
}

/** Find a sound for every cue that has none yet: Openverse first (the first result of at most 6 s, else one of unknown length: never a long
 *  recording, which is a bed), HF's bundled set when offline or nothing is found. While the search does not answer (online, but every try
 *  failed), a name that only sounds like one of the bundled set ("lamp ting": the chime) gets that sound as a stand-in, looked up again the
 *  next time the search may answer.
 *  library: true (the Final Mix's placement) asks the offline library first, for one-shots only (its ambience loops are the beds'): a name
 *  it matches well, or with a sound of the cue's own kind, never goes to the search (and an older pick of the search or of HF's set is
 *  replaced by it; the library's own picks are matched again on every placement, so a better match replaces an old one); any other name
 *  goes to the search, and when the search finds nothing or does not answer, the library's best match stands in, before HF's set (Test 26:
 *  five cues were left out while the search did not answer, and "Place them again" left them out again).
 *  style: the library's style hint; families: Map name -> family (the action's own).
 *  Returns { added: [names], missing: [names], offline, near: [{ name, as }] } (near: the cues on a stand-in now). */
export async function resolveCues(dir, cues, { fetchImpl = fetch, signal, root = APP_ROOT, online = true, timeoutMs = SEARCH_TIMEOUT_MS, library = false, style = null, families = null } = {}) {
  let st = readState(dir);
  const local = bundled(root), added = [], missing = [], failed = [], near = [];
  const has = (name) => !!st.sounds[name] && existsSync(join(dir, st.sounds[name].file));
  const lib = new Map();
  const libOf = (name) => {
    if (!library) return null;
    if (!lib.has(name)) { let m = null; try { m = matchLocal(LIBRARY_QUERY[name] ?? name, { family: families?.get?.(name) ?? null, style, root, oneShot: true }); } catch { /* no library */ } lib.set(name, m); }
    return lib.get(name);
  };
  // the library answers well enough: a good match, or a sound of the cue's own kind (not worth waiting on the search)
  const enough = (name) => { const m = libOf(name); return !!m && (m.good || m.right); };
  let names = [...new Set(cues.map((c) => c.name))].filter((name) => {
    if (!has(name)) return true;
    const s = st.sounds[name];
    if (s.source === "owner") return false;
    if (online && (s.near || s.weak)) return true;
    if (library && s.source === "library") return true;
    return library && enough(name);
  });
  if (library) {
    // a pick the library would no longer give (Test 26: a plug for "thread pull", a loop of birds for "needle park") is dropped, not kept
    const stale = names.filter((name) => st.sounds[name]?.source === "library" && !enough(name) && (!st.sounds[name].weak || !libOf(name)));
    if (stale.length) st = patchState(dir, (x) => { for (const n of stale) delete x.sounds[n]; });
    // the library's answers: no search for them
    names = names.filter((name) => { if (!enough(name) || !useLibrarySound(dir, name, libOf(name).choices)) return true; added.push(name); return false; });
    st = readState(dir);
  }
  // the searches run four at a time (one at a time took about 5 minutes), each tried twice, each at most SEARCH_TIMEOUT_MS; one failed
  // search no longer sends every other sound offline (the automatic pass placed 0 of 13 that way), but three searches in a row that fail
  // do: the search is down, so the rest of this placement is not asked (Test 24: every query hung 15-20 s, and the Final Mix waited on
  // each), and the built-in sounds stand in
  const hits = new Map();
  let offline = !online, failedInRow = 0;
  const one = async (name) => {
    for (let k = 0; k < 2 && !offline; k++) {
      try { const h = await search(name, { limit: 10, fetchImpl, signal, timeoutMs }); failedInRow = 0; return h; }
      catch (e) { if (signal?.aborted) throw e; if (++failedInRow >= DOWN_AFTER) offline = true; }
    }
    return null;
  };
  if (!offline) {
    const queue = [...names];
    await Promise.all(Array.from({ length: Math.min(4, queue.length) }, async () => { while (queue.length && !offline) { const n = queue.shift(); hits.set(n, await one(n)); } }));
  }
  // a stand-in for a name the search could not look up (online, and it gave no answer); none in the bundled-only pass (online false)
  const standIn = (name) => { const b = nearBundled(name, local); return b ? { ...b, near: b.title } : null; };
  for (const name of names) {
    const h = hits.get(name) ?? null;          // null: the search failed or never ran (offline); []: it answered with nothing
    let item = h ? h.find((x) => x.durationS != null && x.durationS <= MAX_AUTO_S) ?? h.find((x) => x.durationS == null) ?? null : null;
    // the library's best match before HF's set; while the search had no answer it stands in (said so) and is looked up online again later
    const m = libOf(name), unanswered = online && !h;
    if (!item && m && useLibrarySound(dir, name, m.choices, { weak: h == null })) { added.push(name); if (unanswered) near.push({ name, as: plainName(m.entry) }); continue; }
    item ??= matchBundled(name, local);
    // a stand-in already in use stays until the search finds the sound itself
    if (!item && has(name)) { near.push({ name, as: st.sounds[name].near }); continue; }
    if (!item && unanswered) item = standIn(name);
    // its search failed: said apart from a name the search found nothing for
    if (!item) { missing.push(name); if (unanswered) failed.push(name); continue; }
    try { await useSound(dir, name, item, { fetchImpl, signal }); added.push(name); if (item.near) near.push({ name, as: item.near }); }
    catch (e) {
      if (signal?.aborted) throw e;
      // a failed download: the offline sound of that name, else one that sounds like it
      const b = item.source !== "pixabay" ? matchBundled(name, local) ?? standIn(name) : null;
      if (b) { await useSound(dir, name, b); added.push(name); if (b.near) near.push({ name, as: b.near }); } else { missing.push(name); failed.push(name); }
    }
  }
  // offline: no search answered at all (the bundled sounds were the only source)
  return { added, missing, failed, near, offline: offline || (online && names.length > 0 && [...hits.values()].every((h) => h == null)) };
}

/** The Final Mix's line about a placement, for the chat: what was placed, which named sounds use a stand-in and which could not be found
 *  (the search did not answer, or found nothing), in plain words with no paths. A sound left out or on a stand-in makes it a warning, which
 *  the chat always shows (Test 20: "placed 6 (pop, typing, whoosh)" and seven named sounds gone without a word). { text, vars, status? } */
export function placedNote(res) {
  const quote = (xs) => xs.map((x) => `"${x}"`).join(", ");
  const near = (res.near ?? []).filter((x) => !res.names || res.names.includes(x.name));
  const failed = (res.missing ?? []).filter((m) => (res.failed ?? []).includes(m)), none = (res.missing ?? []).filter((m) => !failed.includes(m));
  if (res.silent) return { text: "No sound effects placed: {why} asks for none", vars: { why: res.silent === "owner" ? "your choice" : res.silent === "style" ? "the film style's sound" : "the brief" } };
  const names = res.names ?? [], shown = names.length > 12 ? `${names.slice(0, 12).join(", ")} and ${names.length - 12} more` : names.join(", ");
  const parts = [`Sound effects placed by the app: {n} ({names})${res.ambience ? ", with an ambience bed under {beds} place(s)" : ""}`];
  const vars = { n: res.placed ?? 0, names: names.length ? shown : "none", ...(res.ambience ? { beds: res.ambience } : {}) };
  if (near.length) { parts.push("A close built-in sound stands in for now: {near}"); vars.near = near.map((x) => `"${x.name}" (${x.as})`).join(", "); }
  if (failed.length) { parts.push("Left out because the sound search did not answer: {failed}. Press Place them again in the Final Mix later"); vars.failed = quote(failed); }
  if (none.length) { parts.push("No sound found for {missing}: ask Claude for other names"); vars.missing = quote(none); }
  return parts.length > 1 ? { text: `${parts.join(". ")}.`, vars, status: "warning" } : { text: parts[0], vars };
}

const BEGIN = "<!-- mw:sfx (Moworks Studio: the storyboard's sfx: cues; rewritten on every change) -->", END = "<!-- /mw:sfx -->";

const attrsOf = (s) => Object.fromEntries([...s.matchAll(/([^\s=/]+)(?:\s*=\s*"([^"]*)")?/g)].map((m) => [m[1], m[2] ?? ""]));
const ALWAYS_KEPT = new Set(["data-volume"]);          // a volume set by hand in HyperFrames Studio survives a re-timed cue too

/**
 * Write the <audio> elements of the cues into index.html (the app's own block), replacing the previous block. HyperFrames Studio
 * edits these elements too (HF first), so an element that is still there with the same sound keeps what Studio wrote: its
 * data-hf-id and any other attribute the app does not set, its volume, and, while the storyboard has not moved that cue, its timing.
 */
export function mount(dir, cues, { filmEnd = null, endFade = 0, cueKey: key = undefined, left = undefined } = {}) {
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
  const old = new Map([...(blockRe.exec(html)?.[1] ?? "").matchAll(/<audio\b([^>]*)>/gi)].map((m) => attrsOf(m[1])).filter((a) => a.id).map((a) => [a.id, a]));
  const before = new Map((st.mounted ?? []).map((p, i) => [`el-sfx-${i}`, p]));
  html = html.replace(blockRe, "");
  const lines = [], placed = [];
  const muted = new Set((st.muted ?? []).map((m) => `${m.name}@${m.start}`));          // taken off the timeline by the user
  // lanes: a clip goes on the first sound-effect lane free at its start (HF: data-track-index is only a Studio lane), so a film with a
  // sound on every action keeps a few lanes, never one a cue up into the owner's clips' lanes (40 and up)
  const lanes = [];
  const laneAt = (start, dur) => {
    let k = lanes.findIndex((e) => e <= start + 1e-6);
    if (k < 0) k = lanes.length < LANES ? lanes.length : lanes.indexOf(Math.min(...lanes));
    lanes[k] = start + dur;
    return TRACK + k;
  };
  cues.forEach((c) => {
    const s = st.sounds[c.name];
    const v = c.variant ? (s?.variants ?? []).find((x) => x.id === c.variant) ?? null : null;          // this repeat's own file
    const file = v?.file ?? s?.file;
    if (!s || c.start == null || !file || !existsSync(join(dir, file))) return;
    const offset = Number(c.offset) || 0;
    if (muted.has(`${c.name}@${r3(c.start + offset)}`)) return;
    // `at` is the cue's moment; under a voice-over the clip starts its onset earlier, so its attack lands on the cue
    const i = placed.length, at = r3(c.start + offset), start = r3(Math.max(0, at - (Number(c.onset) || 0))), id = `el-sfx-${i}`;
    if (end != null && start >= end) return;
    let dur = r3(Math.max(0.05, Math.min(v?.durationS ?? s.durationS ?? 1, s.source === "owner" ? Infinity : MAX_AUTO_S, end != null ? end - start : Infinity)));
    // a typing, a pour or a machine lasts as long as its motion, with a short fade out
    const held = Number(c.hold) > 0 && s.source !== "owner" && c.hold + 0.25 < dur;
    if (held) dur = r3(c.hold + 0.25);
    const inFade = fadeAt != null && s.source !== "owner" && start + dur > fadeAt + 1e-6;
    const fadeGain = inFade && start > fadeAt ? Math.max(0.05, (end - start) / fadeLen) : 1;
    const fadeOut = Math.max(held ? 0.15 : 0, inFade ? r3(Math.max(0.05, start + dur - Math.max(fadeAt, start))) : 0);
    // the sound's level from the Final Mix (auto.mjs levels: its family's), else its family's, else the default; a small motion's cue is quieter
    const level = v?.volume ?? s.volume ?? (s.family ? levelOf(s.family) : VOLUME);
    const volume = String(Math.round(Math.min(MAX_GAIN, Math.max(0.01, level * (Number(c.gain) || 1) * fadeGain)) * 100) / 100);          // HF carries gain to +12 dB
    const ours = { id, src: file, "data-start": String(start), "data-duration": String(dur), "data-track-index": String(laneAt(start, dur)), "data-volume": volume,
      ...(fadeOut > 0 ? { "data-fade-out": String(Math.min(dur, fadeOut)) } : {}) };
    const was = old.get(id)?.src === file ? old.get(id) : null;
    const unmoved = before.get(id)?.name === c.name && before.get(id)?.start === at;
    // a volume the user set by hand stays; the app's own earlier level follows the new one
    const byHand = (k, v) => k === "data-volume" && v !== String(before.get(id)?.volume ?? VOLUME);
    const a = {};
    for (const [k, v] of Object.entries(was ?? {})) a[k] = k === "id" || k === "src" ? ours[k] : !(k in ours) || (ALWAYS_KEPT.has(k) && byHand(k, v)) || (unmoved && k !== "data-volume") ? v : ours[k];
    for (const [k, v] of Object.entries(ours)) if (!(k in a)) a[k] = v;
    if (!(Number(a["data-duration"]) <= dur)) a["data-duration"] = String(dur);          // a kept timing never runs past the cap either
    lines.push(`<audio ${Object.entries(a).map(([k, v]) => `${k}="${v}"`).join(" ")}></audio>`);
    placed.push({ ...c, file, start: at, ...(start !== at ? { placedAt: start } : {}), duration: dur, volume: Number(volume) });          // the app's own level (a hand-set one differs from it)
  });
  if (lines.length) {
    const root = /<[a-z]+\b[^>]*\bdata-composition-id="[^"]*"[^>]*>/i.exec(html);
    if (!root) throw Object.assign(new Error("index.html has no root composition"), { code: "INVALID" });
    const at = root.index + root[0].length;
    html = `${html.slice(0, at)}\n    ${BEGIN}\n    ${lines.join("\n    ")}\n    ${END}${html.slice(at)}`;
  }
  writeFileSync(f, html);
  st.mounted = placed;
  st.placedAt = new Date().toISOString();          // the Editor reads the Final Mix again when this changes (GET /pipeline's sfx)
  if (key !== undefined) st.cueKey = key;          // the storyboard's named cues this placement was made from
  if (left !== undefined) st.left = left;          // { missing, near }: named sounds left out or on a stand-in (GET /mix)
  saveState(dir, st);
  return placed;
}

/** The storyboard's named cues as one line ("1:whoosh@0|3:lamp ting@2.1"), whatever their times, with its frames' `- ambience:` lines
 *  ("2:ambience=rain"): what a placement was made from (a chat change of either places the sounds again). */
export const cueKey = (shots) => [...cuesOf(shots).map((c) => `${c.shot}:${c.name}@${c.offset}`),
  ...shots.filter((s) => String(s.ambience ?? "").trim()).map((s) => `${s.number}:ambience=${String(s.ambience).trim().toLowerCase()}`)].sort().join("|");
/** Did the storyboard's named cues change since the sounds were last placed? false while none were ever placed (the Final Mix places
 *  them first). A placement from before cueKey was kept counts as changed once. */
export function cuesChanged(dir, shots) {
  const st = readState(dir);
  if (!st.mounted && st.cueKey == null) return false;
  return st.cueKey !== cueKey(shots);
}

/** The Final Mix's "Place" again: the cues the user took off come back. */
export function unmuteAll(dir) { const st = readState(dir); if (st.muted?.length) { delete st.muted; saveState(dir, st); } }

/** The user took the app's sound `el-sfx-<i>` off the timeline: that cue stays off when the cues are placed again. */
export function muteMounted(dir, id) {
  const i = Number(/^el-sfx-(\d+)$/.exec(id)?.[1]);
  const st = readState(dir);
  const p = Number.isInteger(i) ? st.mounted?.[i] : null;
  if (!p) return null;
  st.muted = [...(st.muted ?? []).filter((m) => !(m.name === p.name && m.start === p.start)), { name: p.name, start: p.start, at: new Date().toISOString() }];
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
  const before = new Map((st.ambience?.placed ?? []).map((p, i) => [`el-amb-${i}`, p]));
  html = html.replace(blockRe, "");
  const lanes = [], lines = [], placed = [];
  for (const c of [...(clips ?? [])].sort((a, b) => a.start - b.start)) {
    if (!c.file || !existsSync(join(dir, ...c.file.split("/"))) || !(c.duration > 0.05)) continue;
    let k = lanes.findIndex((e) => e <= c.start + 1e-6);
    if (k < 0) k = lanes.length < AMB_LANES ? lanes.length : lanes.indexOf(Math.min(...lanes));
    lanes[k] = c.start + c.duration;
    const id = `el-amb-${placed.length}`, was = old.get(id)?.src === c.file ? old.get(id) : null;
    const a = { id, src: c.file, "data-start": String(r3(c.start)), "data-duration": String(r3(c.duration)), "data-track-index": String(AMB_TRACK + k),
      "data-volume": String(c.volume), "data-fade-in": String(r3(c.fadeIn ?? 0)), "data-fade-out": String(r3(c.fadeOut ?? 0)),
      ...(c.automation ? { "data-automation": JSON.stringify(c.automation).replace(/"/g, "&quot;") } : {}), "data-timeline-role": "sfx" };
    if (was?.["data-hf-id"]) a["data-hf-id"] = was["data-hf-id"];
    if (was?.["data-volume"] != null && before.get(id) && was["data-volume"] !== String(before.get(id).volume)) a["data-volume"] = was["data-volume"];
    lines.push(`<audio ${Object.entries(a).map(([n, v]) => `${n}="${v}"`).join(" ")}></audio>`);
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

/** One credit line. A Pixabay sound is one of the set HyperFrames bundles in its media-use skill: HF does not record the sound's own Pixabay
 *  page, so the line says so and links the exact file at the pinned HF commit instead of a generic Pixabay link. A sound of the app's
 *  library is credited from its catalog source (CC0 and public domain need none; it is listed all the same). */
export function creditLine(s) {
  if (s.source === "pixabay") return `"${s.title}", from the Pixabay sound set that HyperFrames bundles in its media-use skill (Pixabay Content License, ${s.licenceUrl}); HyperFrames does not record the sound's own Pixabay page. File: ${String(s.via ?? "").replace(/^.*?(https:\/\/\S+)$/, "$1")}`;
  if (s.source === "owner") return s.attribution;
  if (s.source === "library") {
    const c = s.credit ?? {};
    return `"${s.title}", from ${c.name ?? "the app's sound library"} by ${c.author ?? s.creator ?? "unknown"}, ${c.licence ?? s.licence}${c.licenceUrl ? ` (${c.licenceUrl})` : ""}. Source: ${c.url ?? s.page ?? ""}${c.file ? `; original file: ${c.file}` : ""}${c.how ? `; ${c.how}` : ""}.`;
  }
  return `${s.attribution ?? `"${s.title}" by ${s.creator}, ${s.licence}`}${s.page ? ` Source: ${s.page}` : ""}`;
}

/** CREDITS.md: a "Sound effects" section for the sounds in use, one line a file (a sound's variants each), the ambience beds too (other
 *  content of the file is kept). */
export function writeCredits(dir) {
  const st = readState(dir), f = docPath(dir, "CREDITS.md");
  const rows = new Map();
  const add = (name, file) => {
    const s = st.sounds[name];
    if (!s) return;
    const v = (s.variants ?? []).find((x) => x.file === file), rec = v ? { ...s, ...v } : s;
    if (!rows.has(rec.file)) rows.set(rec.file, [name, rec]);
  };
  for (const m of st.mounted ?? []) add(m.name, m.file);
  for (const a of st.ambience?.placed ?? []) add(a.name, a.file);
  const body = [...rows.values()].map(([n, s]) => `- **${n}** (\`${s.file}\`): ${creditLine(s)}`);
  const section = `<!-- mw:sfx-credits -->\n## Sound effects\n\n${body.length ? body.join("\n") : "None."}\n<!-- /mw:sfx-credits -->`;
  const old = existsSync(f) ? readFileSync(f, "utf8") : "# Credits\n";
  const next = /<!-- mw:sfx-credits -->[\s\S]*?<!-- \/mw:sfx-credits -->/.test(old)
    ? old.replace(/<!-- mw:sfx-credits -->[\s\S]*?<!-- \/mw:sfx-credits -->/, section) : `${old.trimEnd()}\n\n${section}\n`;
  mkdirSync(dirname(f), { recursive: true });          // docs/ in a film that has none yet
  writeFileSync(f, next);
  return rows.size;
}

/** The whole pass for a project: cues from the storyboard shots, sounds found, elements written, credits. */
export async function apply(dir, shots, opts = {}) {
  const cues = cuesOf(shots);
  const st = readState(dir);
  if (!cues.length && !(st.mounted ?? []).length) return { cues: 0, placed: 0, added: [], missing: [] };
  const res = await resolveCues(dir, cues, opts);
  const placed = mount(dir, cues, { cueKey: cueKey(shots), left: { missing: res.missing, near: res.near } });
  writeCredits(dir);
  return { cues: cues.length, placed: placed.length, ...res };
}

/** Set the level of each sound by name ({ name: 0-1 }) before mounting (the Final Mix levels). */
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
