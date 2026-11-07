// The sounds that ship with the app: the Sounds drawer's list (the offline library first, then the set HyperFrames ships), a file the page may play, HF's set matched by name, a close one of it standing in.
// (audit/112a B11: one of the files packages/sfx/index.mjs was split into; index.mjs is still the package's door.)
import { APP_ROOT, expandEnv, loadPins, sourceHead } from "../version-manager/index.mjs";
import { familyOf, loadLibrary, rankLocal } from "./library.mjs";
import { dirname, join } from "node:path";
import { libraryTitle } from "./sources.mjs";
import { readJson, slug } from "./state.mjs";

// ---- The Editor's Sounds drawer: the sounds that ship with the app as one list, the library first, then the set HF ships.
/** The drawer's kinds of sound, as a person looks for them: the library's families gathered. */
export const SOUND_GROUPS = Object.freeze({ whooshes: ["whoosh"], hits: ["impact", "pop"], clicks: ["click", "switch", "typing"], bells: ["bell", "magic", "electronic"],
  things: ["door", "paper", "cloth", "footstep", "mechanical"], nature: ["water", "wind", "rain", "fire", "animal"], places: ["crowd", "ambience"] });
/** The Sounds drawer's kinds as it shows them (the page draws these: 112a B12), "all" first. */
export const SOUND_GROUP_TITLES = Object.freeze({ all: "All", whooshes: "Whooshes", hits: "Hits & pops", clicks: "Clicks & keys", bells: "Bells & magic",
  things: "Everyday things", nature: "Nature", places: "Crowds & places" });

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
