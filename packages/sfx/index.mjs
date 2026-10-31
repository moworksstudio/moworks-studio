// Sound effects, the app's own cue format: storyboard frames carry `sfx:` cues ("whoosh, pop"); each cue name resolves to one file
// in assets/3_audio/sfx/; the film's root document gets one <audio id="el-sfx-N"> per cue at the frame's start (+ offset), on sound-effect
// lanes from track 20, at its family's level (actions.mjs LEVELS: under the music and the voice), and the scenes' ambience beds on
// tracks 12-14 (<audio id="el-amb-N">); a cue that finds nothing is skipped, never a blocker. HF asks a host app to bring its own SFX
// source; this app's is first its offline library (bundle/sfx, library.mjs: CC0 and public domain), then Openverse's Freesound section
// (no key), CC0 and CC BY only (client videos: no NC licences), SFXMint when Openverse is down or finds nothing useful (no key, CC0 as the
// site states it, onlineSources), and the Pixabay sounds HF ships in its media-use skill (Pixabay's, under the Pixabay Content License; HF
// only bundles them). Every sound is credited (title, author, page, licence, Openverse's attribution line, the date read) in
// .moworks/sfx.json and CREDITS.md.
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { docPath } from "../project-service/docs.mjs";
import { APP_ROOT, expandEnv, loadPins, sourceHead } from "../version-manager/index.mjs";
import { MAX_GAIN, levelOf, sig } from "./actions.mjs";
import { SUSTAINED_MIN_S, familyOf, loadLibrary, matchLocal, plainName, rankLocal, stepsRun, sustainedCue, sustainedQuery, sustainedStandIn, words } from "./library.mjs";

export const OPENVERSE = "https://api.openverse.org/v1/audio/";
export const SFXMINT = "https://sfxmint.com/api/v1/";
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
/** One placement asks online for at most this many names the library only has something like, and downloads at most this many sounds: SFXMint lets one network have 20
 *  different sounds a day (past that its download answers 429), and Openverse is often down. What it does not get stays on the library's stand-in, said so. */
export const ONLINE_LOOKUPS = 24, ONLINE_DOWNLOADS = 6;
/** The caller's signal and a time limit, as one. */
const within = (signal, ms) => (signal ? AbortSignal.any([signal, AbortSignal.timeout(ms)]) : AbortSignal.timeout(ms));
const UA = { "User-Agent": "MoworksStudio/1.0 (personal studio app)" };
const today = () => new Date().toISOString().slice(0, 10);

/** Openverse search, Freesound only, CC0 / CC BY only. Each result: { id, title, creator, licence, licenceUrl, page, url, durationS, attribution }. */
export async function search(q, { limit = 12, fetchImpl = fetch, signal, timeoutMs = SEARCH_TIMEOUT_MS } = {}) {
  const u = new URL(OPENVERSE);
  u.search = new URLSearchParams({ q: String(q).trim(), source: "freesound", license: "cc0,by", mature: "false", page_size: String(Math.min(20, limit)) });     // 20 is the most Openverse gives without a key (more answers 401)
  const r = await fetchImpl(u.href, { signal: within(signal, timeoutMs), headers: UA });
  if (!r.ok) throw Object.assign(new Error(`Openverse answered ${r.status}`), { code: "SFX_SEARCH" });
  const j = await r.json();
  return (j.results ?? []).filter((x) => LICENCES[x.license] && /^https:\/\//.test(x.url ?? "")).map(openverseItem);
}
const openverseItem = (x) => ({ id: x.id, source: "openverse", title: x.title ?? "", creator: x.creator ?? "", creatorUrl: x.creator_url ?? null,
  licence: `${LICENCES[x.license]} ${x.license_version ?? ""}`.trim(), licenceUrl: x.license_url ?? null, page: x.foreign_landing_url ?? null,
  url: x.url, durationS: x.duration != null ? x.duration / 1000 : null, attribution: x.attribution ?? null, provider: x.provider ?? "freesound", read: today() });

// ---- SFXMint (https://sfxmint.com/api/openapi.json, read 31/10/2026): a library of AI-generated sounds with no key. Its CC0 is stated by the
// site alone (its License page and each sound's `license`), there is no recording or author behind a sound to check it against. Its files
// are never shipped with the app: each one is downloaded into the film that uses it, at most 20 different sounds a day per network without
// a key (past that the download answers 429). A search always answers with something: `fit: "full"` has every word of the query,
// `fit: "closest"` only some of them, up to none ("zzqxv" answers five unrelated sounds).
const MINT_FILE = /^https:\/\/sfxmint\.com\/dl\/[^/?#]+$/, MINT_SLUG = /^[a-z0-9][a-z0-9-]{0,159}$/i;
/** One SFXMint sound as this module's item, or null when it is not stated as CC0 or its file is not on the site's own download path. */
function mintItem(x) {
  if (!/^CC0\b/i.test(String(x?.license ?? "")) || !MINT_SLUG.test(String(x?.slug ?? "")) || !MINT_FILE.test(x?.mp3_url ?? "")) return null;
  if (x.recommendation_status && x.recommendation_status !== "eligible") return null;
  const title = String(x.title ?? x.slug).trim();
  return { id: `sfxmint:${x.slug}`, source: "sfxmint", title, creator: "SFXMint", creatorUrl: "https://sfxmint.com/", licence: "CC0 1.0",
    licenceUrl: /^https:\/\//.test(x.license_url ?? "") ? x.license_url : "https://creativecommons.org/publicdomain/zero/1.0/",
    page: /^https:\/\/sfxmint\.com\//.test(x.page_url ?? "") ? x.page_url : `https://sfxmint.com/sounds/${x.slug}`, url: x.mp3_url,
    durationS: Number(x.duration_ms) > 0 ? Number(x.duration_ms) / 1000 : null, provider: "sfxmint", fit: x.fit ?? null, read: today(),
    attribution: `"${title}" from SFXMint, CC0 1.0 as the site states it (https://sfxmint.com/license).` };
}
/** SFXMint search, CC0 only. By default only the sounds with every word of the query (its own `full`, which also reaches for a like meaning); closest: also those with at
 *  least half of its words; closest "any": with at least one (the placement weighs them by their titles). */
export async function searchMint(q, { limit = 12, fetchImpl = fetch, signal, timeoutMs = SEARCH_TIMEOUT_MS, closest = false } = {}) {
  const words = String(q).trim(), u = new URL("search", SFXMINT);
  u.search = new URLSearchParams({ q: words, limit: String(Math.max(1, Math.min(50, limit))) });
  const r = await fetchImpl(u.href, { signal: within(signal, timeoutMs), headers: UA });
  if (!r.ok) throw Object.assign(new Error(`SFXMint answered ${r.status}`), { code: "SFX_SEARCH" });
  const j = await r.json();
  if (!Array.isArray(j)) throw Object.assign(new Error("SFXMint answered something else"), { code: "SFX_SEARCH" });
  const n = words.split(/\s+/).filter(Boolean).length;
  return j.filter((x) => x?.fit !== "closest" || (closest === "any" ? (x.missing_terms?.length ?? n) < n : closest && (x.missing_terms?.length ?? n) <= n / 2)).map(mintItem).filter(Boolean);
}

/** The online services in their order, for one placement or for the Sounds drawer: Openverse first, SFXMint when it is down or finds nothing
 *  useful. find(q, { limit, useful }) answers the hits ([] when each service answered with nothing), or null when no service answered. A
 *  service that failed DOWN_AFTER times in a row is not asked again, so a dead one costs one wait; with restMs it is left alone that long
 *  after a failure instead (the drawer: typing a word must not wait on it each time). down(): no service is left to ask. */
export function onlineSources({ fetchImpl = fetch, signal, timeoutMs = SEARCH_TIMEOUT_MS, closest = false, restMs = 0, now = Date.now } = {}) {
  const list = [{ ask: (q, limit) => search(q, { limit, fetchImpl, signal, timeoutMs }), failed: 0, until: 0 },
    { ask: (q, limit) => searchMint(q, { limit, fetchImpl, signal, timeoutMs, closest }), failed: 0, until: 0 }];
  const open = (s) => (restMs ? s.until <= now() : s.failed < DOWN_AFTER);
  return {
    down: () => !list.some(open),
    wake: () => { for (const s of list) { s.failed = 0; s.until = 0; } },
    async find(q, { limit = 10, useful = (h) => h.length > 0 } = {}) {
      let hits = null;
      for (const s of list.filter(open)) {
        try { const h = await s.ask(q, limit); s.failed = 0; s.until = 0; hits = [...(hits ?? []), ...h]; if (useful(h)) break; }
        catch (e) { if (signal?.aborted) throw e; s.failed++; s.until = now() + restMs; }
      }
      return hits;
    },
  };
}

/** One Openverse sound by its id, read again on the server (the browser only sends the id): null when it is not CC0 / CC BY. */
export async function details(id, { fetchImpl = fetch, signal, root = APP_ROOT, timeoutMs = SEARCH_TIMEOUT_MS } = {}) {
  const key = String(id);
  if (key.startsWith("pixabay:")) return bundled(root).find((b) => b.id === id) ?? null;
  if (key.startsWith("library:")) { const e = loadLibrary(root).sounds.find((s) => s.id === key.slice(8)); return e ? { id: key, source: "library", title: libraryTitle(e), family: e.family, durationS: e.duration ?? null, entry: e } : null; }
  if (key.startsWith("sfxmint:")) {
    if (!MINT_SLUG.test(key.slice(8))) return null;
    const r = await fetchImpl(new URL(`sounds/${key.slice(8)}`, SFXMINT).href, { signal: within(signal, timeoutMs), headers: UA });
    return r.ok ? mintItem(await r.json()) : null;
  }
  if (!/^[0-9a-f-]{36}$/i.test(key)) return null;
  const r = await fetchImpl(`${OPENVERSE}${id}/`, { signal: within(signal, timeoutMs), headers: UA });
  if (!r.ok) return null;
  const x = await r.json();
  return LICENCES[x.license] && /^https:\/\//.test(x.url ?? "") ? openverseItem(x) : null;
}
/** A library sound's name on screen: "whoosh-soft-2" reads "Whoosh soft 2". */
export const libraryTitle = (e) => String(e?.id ?? "").replace(/-/g, " ").replace(/^./, (c) => c.toUpperCase());

// ---- The Editor's Sounds drawer: the sounds that ship with the app as one list, the library first, then the set HF ships.
/** The drawer's kinds of sound, as a person looks for them: the library's families gathered. */
export const SOUND_GROUPS = Object.freeze({ whooshes: ["whoosh"], hits: ["impact", "pop"], clicks: ["click", "switch", "typing"], bells: ["bell", "magic", "electronic"],
  things: ["door", "paper", "cloth", "footstep", "mechanical"], nature: ["water", "wind", "rain", "fire", "animal"], places: ["crowd", "ambience"] });
/** Every sound that ships with the app, or those a search's words find, best first; group: one of SOUND_GROUPS. Rows for the screen: { id, title,
 *  durationS, family, source, url } (url: where the page plays it from; no path of this computer). */
export function localSounds(q, { group = null, root = APP_ROOT } = {}) {
  const words = String(q ?? "").trim(), kinds = Object.hasOwn(SOUND_GROUPS, group ?? "") ? SOUND_GROUPS[group] : null;
  const library = (words ? rankLocal(words, { root }).map((r) => r.entry) : loadLibrary(root).sounds).map((e) => ({ id: `library:${e.id}`, title: libraryTitle(e), durationS: e.duration ?? null, family: e.family,
    source: "library", url: `/media/sfx/library/${encodeURIComponent(e.id)}.ogg` }));
  const asked = words ? slug(words).split("-").filter(Boolean) : [];
  const hf = bundled(root).filter((b) => asked.every((w) => slug(`${b.title} ${b.description ?? ""}`).split("-").includes(w))).map((b) => ({ id: b.id, title: libraryTitle({ id: b.title }), durationS: b.durationS,
    family: familyOf(b.title), source: "pixabay", url: `/media/sfx/pixabay/${encodeURIComponent(b.title)}.mp3` }));
  return [...library, ...hf].filter((x) => !kinds || kinds.includes(x.family));
}
/** A file the page may play: the library's sound by its id, HF's by its key; null for anything else. */
export function localFile(kind, name, root = APP_ROOT) {
  if (kind === "library") return loadLibrary(root).sounds.find((s) => `${s.id}.ogg` === name)?.path ?? null;
  if (kind === "pixabay") return bundled(root).find((b) => `${b.title}.mp3` === name)?.file ?? null;
  return null;
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
/** A frame's line of sound names: its `- sfx:` line; a frame without one has its `- sound:` line read the same way when it is a list of names (Claude wrote
 *  `- sound: water drip, bell, ting` and the sounds were dropped). */
const cueLine = (s) => (s.sfx != null ? s.sfx : s.sound != null && soundList(s.sound) ? s.sound : "");
/** A frame that says `none`: silent. The app adds none of its own there either, no whoosh into it (T30-9: six whooshes on shots whose storyboard says none). */
export const sfxNone = (s) => /^\s*none\s*$/i.test(String(cueLine(s)));
/** Cues of the storyboard: [{ shot, index, name, offset }] ("whoosh@0.4" = 0.4 s after the shot starts; "none" = no sound). */
export function cuesOf(shots) {
  const out = [];
  for (const s of shots) {
    const line = cueLine(s);
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
/** The start of a sound's name in sfx.json when the user added it from the Sounds drawer: never a storyboard cue's, which a placement replaces. */
export const ADDED = "added:";
function saveState(dir, st) { mkdirSync(join(dir, ".moworks"), { recursive: true }); writeFileSync(stateFile(dir), JSON.stringify(st, null, 2) + "\n"); }
/** The sounds the user added from the Sounds drawer as the film has them now (a move in Studio or on the timeline counts): [{ id, name, title, file,
 *  start, duration, volume }], by time. A clip taken off, or gone with an earlier version, is left out; its record stays, so a version brought
 *  back still finds its credit and its level (sfx.json is the app's own record: Versions leaves it as it is). */
export function addedNow(dir) {
  const st = readState(dir);
  if (!st.added?.length) return [];
  let html; try { html = readFileSync(join(dir, "index.html"), "utf8"); } catch { return []; }
  const tags = new Map([...html.matchAll(/<audio\b([^>]*)>/gi)].map((m) => attrsOf(m[1])).filter((a) => a.id).map((a) => [a.id, a]));
  return st.added.filter((m) => tags.get(m.id)?.src === m.file).map((m) => { const a = tags.get(m.id);
    return { ...m, title: st.sounds[m.name]?.title ?? m.name, start: Number(a["data-start"]) || 0, duration: Number(a["data-duration"]) || m.duration, volume: Number(a["data-volume"]) || m.volume }; })
    .sort((x, y) => x.start - y.start);
}
/** Change the state in one step (the placement's notes: what was thinned, the policy it followed). */
export function patchState(dir, fn) { const st = readState(dir); fn(st); saveState(dir, st); return st; }

// ---- A cue's identity. `el-sfx-<n>` is only a sound's place in the last placement: a cue added in front moved every later n, and a sound the user had moved went back,
// one they had taken off came back (T29-3). What stays is the cue itself: the id the plan gives it (`sb:3:door-open@1.2`, `m:3:m5f2a`, `cut:3`), written on its tag
// (data-mw-cue) beside the second the app placed it at (data-mw-at). data-start away from that second is the user's move; it counts from the cue's place, so it stays
// when the shots before it change length. An older film's tags have neither: its sfx.json says the same by their n.
/** A cue's identity, for the life of the film. */
export const cueIdOf = (c) => c.id ?? (c.shot != null ? `sb:${c.shot}:${slug(c.name)}@${c.offset ?? 0}` : `at:${slug(c.name)}@${r3((Number(c.start) || 0) + (Number(c.offset) || 0))}`);
/** The identity without its shot's number: a shot added or taken out renumbers the shots after it. null for a cut, which is only its shot. */
const sansShot = (key) => (/^(sb|m):\d+:/.test(key) ? key.replace(/^(sb|m):\d+:/, "$1:") : null);
/** A storyboard cue without its second in the shot: the same cue when the storyboard moves it (null for the others). */
const sansTime = (key) => (/^sb:/.test(key) ? key.replace(/@[^@]*$/, "") : null);
/** Is this earlier cue the one the plan now calls `key`, though its identity changed? It is gone from the plan (`keys`), and its shot and name are the same (moved in its shot), or
 *  all but its shot's number is. "time" | "shot" | null. */
const sameCue = (old, key, keys) => (keys.has(old) ? null : sansTime(key) && sansTime(old) === sansTime(key) ? "time" : sansShot(key) && sansShot(old) === sansShot(key) ? "shot" : null);
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
  return (st.mounted ?? []).flatMap((m, i) => { const a = tags.get(`el-sfx-${i}`); return a ? [{ ...m, start: Number(a["data-start"]) || 0, file: a.src ?? m.file }] : []; });
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
 *  it for this cue name. fileName: the file's name when it is not the cue's. */
export async function useSound(dir, name, item, { fetchImpl = fetch, signal, fileName = null } = {}) {
  const st = readState(dir), base = slug(fileName ?? name).slice(0, 60).replace(/-$/, "");          // a sound's title can run long; the film's paths stay short
  const taken = new Set(Object.entries(st.sounds).filter(([n]) => n !== name).map(([, s]) => s.file));
  let rel = `assets/3_audio/sfx/${base}.mp3`;
  for (let i = 2; taken.has(rel) || (existsSync(join(dir, rel)) && st.sounds[name]?.file !== rel); i++) rel = `assets/3_audio/sfx/${base}-${i}.mp3`;
  mkdirSync(join(dir, "assets", "3_audio", "sfx"), { recursive: true });
  if (item.source === "pixabay") copyFileSync(item.file, join(dir, rel));
  else {
    const r = await fetchImpl(item.url, { signal: within(signal, DOWNLOAD_TIMEOUT_MS) });
    if (r.status === 429) throw Object.assign(new Error("The sound service's download allowance for today is used"), { code: "SFX_LIMIT" });
    if (!r.ok) throw Object.assign(new Error(`Download failed (${r.status})`), { code: "SFX_DOWNLOAD" });
    const bytes = Buffer.from(await r.arrayBuffer());
    if (!bytes.length) throw Object.assign(new Error("The download was empty"), { code: "SFX_DOWNLOAD" });
    writeFileSync(join(dir, rel), bytes);
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

/** The results a cue may take by their length, best first as the service ranks them: those of at most MAX_AUTO_S, else those of unknown length; for a sustained action those
 *  that last (at least SUSTAINED_MIN_S; a longer recording is cut to the clip's length, up to half a minute), else those of unknown length. */
function fittingItems(results, name) {
  const fits = sustainedCue(name) ? (x) => x.durationS >= SUSTAINED_MIN_S && x.durationS <= 30 : (x) => x.durationS <= MAX_AUTO_S;
  const known = results.filter((x) => x.durationS != null && fits(x));
  return known.length ? known : results.filter((x) => x.durationS == null);
}
/** The search's answer a cue takes: the first that fits. null: none. */
const pickItem = (results, name) => fittingItems(results, name)[0] ?? null;
/** The share of a cue's words a result's title says. A title is what can be checked: SFXMint's `full` also reaches for a like meaning ("hurried footsteps": a chair set down). */
const titleShare = (x, name) => { const said = words(name), has = new Set(words(x.title)); return said.length ? said.filter((w) => has.has(w)).length / said.length : 1; };
/** The first that fits with the most of the cue's words in its title: { item, share }, or null. A run of steps takes only steps that last ("footsteps slowing stop" is no car
 *  skidding to a stop, and one short step is what it had). */
function closestItem(results, name) {
  let top = null;
  const steps = stepsRun(name);
  for (const item of fittingItems(results, name)) {
    if (steps && (!words(item.title).some((w) => w === "footstep" || w === "step") || item.durationS < SUSTAINED_MIN_S)) continue;
    const share = titleShare(item, name);
    if (!top || share > top.share) top = { item, share };
  }
  return top;
}

/** Find a sound for every cue that has none yet: Openverse first (the first result of at most 6 s, else one of unknown length: never a long
 *  recording, which is a bed), SFXMint when it is down or has none that fits (onlineSources), HF's bundled set when offline or nothing is found. While the search does not answer (online, but every try
 *  failed), a name that only sounds like one of the bundled set ("lamp ting": the chime) gets that sound as a stand-in, looked up again the
 *  next time the search may answer.
 *  library: true (the Final Mix's placement) asks the offline library first, for one-shots only (its ambience loops are the beds'): a name
 *  it matches well, or with a sound of the cue's own kind, never goes to the search (and an older pick of the search or of HF's set is
 *  replaced by it; the library's own picks are matched again on every placement, so a better match replaces an old one); any other name
 *  goes to the search, and when the search finds nothing or does not answer, the library's best match stands in, before HF's set (Test 26:
 *  five cues were left out while the search did not answer, and "Place them again" left them out again).
 *  A sustained action (sustainedCue: a roll, a long slide, a pour) takes only a sound that lasts: from the library when it has one, else from
 *  the search (all of its name, then the thing and its action alone), else a sound of the library that lasts as a stand-in, said so and looked
 *  up again later (Test 28: the library has no rolling sound, and fifteen marbles were short ticks that nobody was told about).
 *  A name the storyboard or the Motion Plan gives that the library only has something of the same kind for (not all its words: "bus door air hiss" a sci-fi door,
 *  "hurried footsteps" one step) is looked up online before the library's sound is settled for, the least matched first, at most ONLINE_LOOKUPS names: the result whose title
 *  says most of its words, as many as the library's sound at least, and a result without all of them is said to be a stand-in. A name the library has nothing for takes the
 *  closest the services have, said so too, before it is left out (T29-12, T29-13, T28-2). Such a name downloads at most ONLINE_DOWNLOADS sounds, the closest first and after
 *  those with nothing else, none from SFXMint once it answers 429; a sound once found online stays. No search and no download can fail a placement.
 *  style: the library's style hint; families: Map name -> family (the action's own); keep: names whose sound stays as it is (a cue of theirs the user moved).
 *  Returns { added: [names], missing: [names], offline, near: [{ name, as, lasting? }] } (near: the cues on a stand-in now; lasting: a stand-in
 *  for a sound that lasts). */
export async function resolveCues(dir, cues, { fetchImpl = fetch, signal, root = APP_ROOT, online = true, timeoutMs = SEARCH_TIMEOUT_MS, library = false, style = null, families = null, keep = null } = {}) {
  let st = readState(dir);
  const local = bundled(root), added = [], missing = [], failed = [], near = [];
  const has = (name) => !!st.sounds[name] && existsSync(join(dir, st.sounds[name].file));
  const lib = new Map();
  const libOf = (name) => {
    if (!library) return null;
    if (!lib.has(name)) { let m = null; try { m = matchLocal(LIBRARY_QUERY[name] ?? name, { family: families?.get?.(name) ?? null, style, root, oneShot: true, minDuration: sustainedCue(name) ? SUSTAINED_MIN_S : 0 }); } catch { /* no library */ } lib.set(name, m); }
    return lib.get(name);
  };
  // the library answers well enough: a good match, or a sound of the cue's own kind (not worth waiting on the search)
  const enough = (name) => { const m = libOf(name); return !!m && (m.good || m.right); };
  // a name someone wrote (the storyboard's, the Motion Plan's: the app's own automatic names are the library's words) that the library answers only with something like it
  const written = new Set(cues.filter((c) => (c.prio ?? 0) < 2).map((c) => c.name));
  const likeOnly = (name) => library && written.has(name) && enough(name) && !libOf(name).exact;
  let names = [...new Set(cues.map((c) => c.name))].filter((name) => {
    if (keep?.has(name) && has(name)) return false;
    if (!has(name)) return true;
    const s = st.sounds[name];
    if (s.source === "owner") return false;
    if (online && (s.near || s.weak)) return true;
    if (library && s.source === "library") return true;
    return library && enough(name) && !likeOnly(name);          // a sound found online for such a name stays: never downloaded twice
  });
  let look = new Set();
  if (library) {
    // a pick the library would no longer give (Test 26: a plug for "thread pull", a loop of birds for "needle park") is dropped, not kept
    const stale = names.filter((name) => st.sounds[name]?.source === "library" && !enough(name) && (!st.sounds[name].weak || !libOf(name)));
    if (stale.length) st = patchState(dir, (x) => { for (const n of stale) delete x.sounds[n]; });
    if (online) look = new Set(names.filter(likeOnly).sort((a, b) => libOf(a).closeness - libOf(b).closeness).slice(0, ONLINE_LOOKUPS));
    // the library's answers: no search for them. One only like the name, past the lookups a placement makes, stands in
    names = names.filter((name) => {
      if (!enough(name) || look.has(name) || !useLibrarySound(dir, name, libOf(name).choices)) return true;
      added.push(name);
      if (online && likeOnly(name)) near.push({ name, as: plainName(libOf(name).entry) });
      return false;
    });
    st = readState(dir);
  }
  // the searches run four at a time (one at a time took about 5 minutes), each tried twice, each at most SEARCH_TIMEOUT_MS; one failed
  // search no longer sends every other sound offline (the automatic pass placed 0 of 13 that way), but three searches in a row that fail
  // leave that service out for the rest of this placement (Test 24: every query hung 15-20 s, and the Final Mix waited on each): SFXMint
  // answers without another wait on Openverse, and with both down the built-in sounds stand in
  const hits = new Map(), sources = onlineSources({ fetchImpl, signal, timeoutMs, closest: library ? "any" : false });
  let offline = !online;
  // what the search's answer gives a name (the placement: `library`). Without all its words in the title it is a stand-in, said so. A name the library has something like takes
  // it only when it says more than the library's sound does, or as much of a good half of them, or the library's is of another kind; a run of steps takes any steps, one step
  // being none ("pen nib hatching" is no ship's hatch for one word in common). A name with nothing else takes what the service gives, unless the service itself says it is only
  // close and the title says none of its words
  const best = (h, name) => {
    if (!library) return pickItem(h, name);
    const top = closestItem(h, name);
    if (!top) return null;
    const stand = top.share < 1 ? { ...top.item, near: top.item.title } : top.item;
    if (!look.has(name)) return top.item.fit === "closest" ? (top.share > 0 ? stand : null) : top.item;
    const share = Math.round(top.share * 100) / 100, lib = libOf(name);
    return share > 0 && (stepsRun(name) || share > lib.closeness || (share === lib.closeness && (share >= 0.5 || !lib.right))) ? stand : null;
  };
  const exactly = (h, name) => library && h.some((x) => titleShare(x, name) === 1);
  const one = async (query, name) => {
    for (let k = 0; k < 2 && !offline; k++) {
      const h = await sources.find(query, { limit: 10, useful: (x) => (library ? exactly(x, name) : !!pickItem(x, name)) });
      if (h) return h;
      if (sources.down()) offline = true;
    }
    return null;
  };
  if (!offline) {
    const queue = [...names];
    await Promise.all(Array.from({ length: Math.min(4, queue.length) }, async () => {
      while (queue.length && !offline) {
        const n = queue.shift();
        let h = await one(n, n);
        // nothing that lasts for all of a sustained cue's name ("marble rolling long brass rail"): the thing and its action; nothing for a run of steps: steps
        const q = h && !best(h, n) ? (sustainedCue(n) ? sustainedQuery(n) : library && stepsRun(n) ? "footsteps" : null) : null;
        if (q && q !== n) h = [...((await one(q, n)) ?? []), ...h];
        hits.set(n, h);
      }
    }));
  }
  // a stand-in for a name the search could not look up (online, and it gave no answer); none in the bundled-only pass (online false)
  const standIn = (name) => { const b = nearBundled(name, local); return b ? { ...b, near: b.title } : null; };
  let downloads = 0, limited = false;
  const held = new Set();          // names whose download this placement could not make
  const closeOf = (name) => { const h = hits.get(name); return look.has(name) && h ? closestItem(h, name)?.share ?? 0 : 2; };          // a name with nothing else first, then the closest
  for (const name of [...names].sort((a, b) => closeOf(b) - closeOf(a))) {
    const h = hits.get(name) ?? null;          // null: the search failed or never ran (offline); []: it answered with nothing
    let item = h ? best(h, name) : null;
    // the same sound found again: it stays, no second download
    if (item && has(name) && st.sounds[name].id === item.id) { added.push(name); if (item.near) near.push({ name, as: item.near }); continue; }
    if (item && ((look.has(name) && downloads >= ONLINE_DOWNLOADS) || (limited && item.source === "sfxmint"))) { item = null; held.add(name); }
    // the library's best match before HF's set; while the search had no answer, or it is not the name's own sound, it stands in (said so), looked up online again later
    const m = libOf(name), unanswered = online && !h;
    if (!item && m && useLibrarySound(dir, name, m.choices, { weak: h == null })) { added.push(name); if (online) near.push({ name, as: plainName(m.entry) }); continue; }
    // a sound that lasts, or a stand-in that lasts: never HF's ticks and pings for it, and never left out while a stand-in can sound
    if (!item && sustainedCue(name)) {
      const stand = sustainedStandIn(name, { root });
      if (stand.length && useLibrarySound(dir, name, stand, { weak: true })) { added.push(name); near.push({ name, as: plainName(stand[0]), lasting: true }); continue; }
      missing.push(name); if (unanswered) failed.push(name);
      continue;
    }
    item ??= matchBundled(name, local);
    // a stand-in already in use stays until the search finds the sound itself
    if (!item && has(name)) { near.push({ name, as: st.sounds[name].near }); continue; }
    if (!item && (unanswered || held.has(name))) item = standIn(name);
    // its search failed, or today's downloads are used: said apart from a name the search found nothing for
    if (!item) { missing.push(name); if (unanswered || held.has(name)) failed.push(name); continue; }
    try { if (item.source !== "pixabay") downloads++; await useSound(dir, name, item, { fetchImpl, signal }); added.push(name); if (item.near) near.push({ name, as: item.near }); }
    catch (e) {
      if (signal?.aborted) throw e;
      if (e.code === "SFX_LIMIT") limited = true;
      // a failed download: the library's sound like it, the offline sound of that name, else one that sounds like it
      if (m && useLibrarySound(dir, name, m.choices, { weak: true })) { added.push(name); near.push({ name, as: plainName(m.entry) }); continue; }
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
  const heard = (res.near ?? []).filter((x) => !res.names || res.names.includes(x.name));
  const near = heard.filter((x) => !x.lasting), lasting = heard.filter((x) => x.lasting);
  const some = (xs, max = 10) => (xs.length > max ? `${xs.slice(0, max).join(", ")} and ${xs.length - max} more` : xs.join(", "));
  const failed = (res.missing ?? []).filter((m) => (res.failed ?? []).includes(m)), none = (res.missing ?? []).filter((m) => !failed.includes(m));
  if (res.silent === "song") return { text: "No sound effects placed: this film is made for its song, so the song is what is heard. Tell Claude if you want some." };
  if (res.silent) return { text: "No sound effects placed: {why} asks for none", vars: { why: res.silent === "owner" ? "your choice" : res.silent === "style" ? "the film style's sound" : "the brief" } };
  const names = res.names ?? [], shown = names.length > 12 ? `${names.slice(0, 12).join(", ")} and ${names.length - 12} more` : names.join(", ");
  const parts = [`Sound effects placed by the app: {n} ({names})${res.ambience ? ", with an ambience bed under {beds} place(s)" : ""}`];
  const vars = { n: res.placed ?? 0, names: names.length ? shown : "none", ...(res.ambience ? { beds: res.ambience } : {}) };
  if (near.length) { parts.push("A close sound stands in for now: {near}"); vars.near = some(near.map((x) => `"${x.name}" (${x.as})`)); }
  // said plainly, name by name: these are not the sound the film asks for (Test 28: fifteen marbles were ticks and the note only said "close")
  if (lasting.length) { parts.push("The app has no such sound of its own and the sound search found none, so these are stand-ins, not the real sound: {lasting}. Press Place them again in the Final Mix when the search is back, or add your own"); vars.lasting = lasting.map((x) => `"${x.name}" plays ${x.as}`).join(", "); }
  if (failed.length) { parts.push("Left out because the sound search did not answer: {failed}. Press Place them again in the Final Mix later"); vars.failed = quote(failed); }
  if (none.length) { parts.push("No sound found for {missing}: ask Claude for other names"); vars.missing = quote(none); }
  return parts.length > 1 ? { text: `${parts.join(". ")}.`, vars, status: "warning" } : { text: parts[0], vars };
}

const BEGIN = "<!-- mw:sfx (Moworks Studio: the storyboard's sfx: cues; rewritten on every change) -->", END = "<!-- /mw:sfx -->";

const attrsOf = (s) => Object.fromEntries([...s.matchAll(/([^\s=/]+)(?:\s*=\s*"([^"]*)")?/g)].map((m) => [m[1], m[2] ?? ""]));
const ALWAYS_KEPT = new Set(["data-volume"]);          // a volume set by hand in HyperFrames Studio survives a re-timed cue too
const OURS_ALWAYS = new Set(["id", "src", "data-mw-cue", "data-mw-at"]);          // what says which cue this is and where the app put it, always the app's

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
    const fadeGain = inFade && start > fadeAt ? Math.max(0.05, (end - start) / fadeLen) : 1;
    const fadeOut = Math.max(held ? 0.15 : 0, inFade ? r3(Math.max(0.05, start + dur - Math.max(fadeAt, start))) : 0);
    // the sound's level from the Final Mix (auto.mjs levels: its family's), else its family's, else the default; a small motion's cue is quieter
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
  const lines = rows.map((r) => `<audio ${Object.entries(r.a).map(([a0, v0]) => `${a0}="${v0}"`).join(" ")}></audio>`), placed = rows.map((r) => r.placed);
  if (lines.length) {
    const root = /<[a-z]+\b[^>]*\bdata-composition-id="[^"]*"[^>]*>/i.exec(html);
    if (!root) throw Object.assign(new Error("index.html has no root composition"), { code: "INVALID" });
    const at = root.index + root[0].length;
    html = `${html.slice(0, at)}\n    ${BEGIN}\n    ${lines.join("\n    ")}\n    ${END}${html.slice(at)}`;
  }
  writeFileSync(f, html);
  st.mounted = placed;
  delete st.fit;          // the lanes went with the old placement: fitted again (voicefit.mjs)
  st.placedAt = new Date().toISOString();          // the Editor reads the Final Mix again when this changes (GET /pipeline's sfx)
  if (key !== undefined) st.cueKey = key;          // the storyboard's named cues this placement was made from
  if (times !== undefined) st.times = times;          // where the shots stood when it was made (timeKey)
  if (left !== undefined) st.left = left;          // { missing, near }: named sounds left out or on a stand-in (GET /mix)
  saveState(dir, st);
  return placed;
}

/** The storyboard's named cues as one line ("1:whoosh@0|3:lamp ting@2.1"), whatever their times, with its frames' `- ambience:` lines
 *  ("2:ambience=rain"): what a placement was made from (a chat change of either places the sounds again). */
export const cueKey = (shots) => [...cuesOf(shots).map((c) => `${c.shot}:${c.name}@${c.offset}`),
  ...shots.filter((s) => String(s.ambience ?? "").trim()).map((s) => `${s.number}:ambience=${String(s.ambience).trim().toLowerCase()}`)].sort().join("|");
/** Where every shot starts and how long it lasts: a Review that moved a shot leaves the sounds placed for the film as it was (timesChanged). */
export const timeKey = (shots) => (shots ?? []).filter((s) => s.start != null).map((s) => `${s.number}:${Number(s.start).toFixed(2)}+${Number(s.duration ?? 0).toFixed(2)}`).join("|");
/** Did a shot move or change its length since the sounds were last placed? false while none were placed, or for a placement from before this was kept. */
export function timesChanged(dir, shots) {
  const st = readState(dir);
  return !!st.mounted && st.times != null && st.times !== timeKey(shots);
}
/** Did the storyboard's named cues change since the sounds were last placed? false while none were ever placed (the Final Mix places
 *  them first). A placement from before cueKey was kept counts as changed once. */
export function cuesChanged(dir, shots) {
  const st = readState(dir);
  if (!st.mounted && st.cueKey == null) return false;
  return st.cueKey !== cueKey(shots);
}

/** The Final Mix's "Place" again: the cues the user took off come back. */
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
  const read = s.read ?? String(s.addedAt ?? "").slice(0, 10);
  return `${s.attribution ?? `"${s.title}" by ${s.creator}, ${s.licence}`}${s.page ? ` Source: ${s.page}` : ""}${read ? ` (read ${read})` : ""}`;
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
  for (const a of addedNow(dir)) add(a.name, a.file);
  const body = [...rows.values()].map(([n, s]) => `- **${n.startsWith(ADDED) ? s.title : n}** (\`${s.file}\`): ${creditLine(s)}`);
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
