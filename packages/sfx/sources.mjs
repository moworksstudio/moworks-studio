// The online sound services (Openverse's Freesound section, SFXMint), searched with a short time limit and left alone a while once down; a sound read again by its id (details).
// (audit/112a B11: one of the files packages/sfx/index.mjs was split into; index.mjs is still the package's door.)
import { APP_ROOT } from "../version-manager/index.mjs";
import { loadLibrary } from "./library.mjs";
import { bundled } from "./shipped.mjs";

export const OPENVERSE = "https://api.openverse.org/v1/audio/";

export const SFXMINT = "https://sfxmint.com/api/v1/";

const LICENCES = { cc0: "CC0", by: "CC BY" };

/** How long one search may take (Test 24: Openverse's search hung 15-20 s a query and the placement waited on every one), and one
 *  download. */
export const SEARCH_TIMEOUT_MS = 7000, DOWNLOAD_TIMEOUT_MS = 30000;

/** Searches in a row that failed, after which a placement stops asking (the search is down). */
export const DOWN_AFTER = 3;

/** The caller's signal and a time limit, as one. */
export const within = (signal, ms) => (signal ? AbortSignal.any([signal, AbortSignal.timeout(ms)]) : AbortSignal.timeout(ms));

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

// A film that must stay grave (a horror film): a cartoon's or a game's sound breaks it, however close its name (T32-3: "8-Bit Cartoon Slip", "Bacon Frying Sizzle" for a wick)
const OFF_TONE = /\b(8[- ]?bit|chiptune|cartoon|retro|arcade|video ?game|game|toy|kazoo|boing|cute|bacon|frying|comedy|funny)\b/i;

/** A sound (a library entry, or an item a search found) that is a cartoon's or a game's, by its tags and its title. */
export const offTone = (x) => OFF_TONE.test([...(x?.tags ?? []), x?.id, x?.title].filter(Boolean).join(" "));

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
