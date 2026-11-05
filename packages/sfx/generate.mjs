// Sound effects made from a description with ElevenLabs Sound Effects (owner 05/11/2026 #1096 B, audit/103): for a cue the library has no
// right sound for ("bicycle pump squeak" became an animal's squeak), the sound the storyboard describes, at the cue's length. Only with the
// owner's ElevenLabs key (Settings › System › Voice-over); it uses their credits (about 40 a second of sound), so a placement makes at most
// GEN_MAX sounds and GEN_MAX_S seconds, and every sound made is kept: in the film (assets/3_audio/sfx) and in the studio's own cache on this
// computer (<work root>/data/sfx-generated, never in the app or on GitHub), so the same description at the same length is never paid twice.
// API: POST https://api.elevenlabs.io/v1/sound-generation { text, duration_seconds 0.5-30, prompt_influence, model_id } -> audio bytes
// (elevenlabs.io/docs/api-reference/text-to-sound-effects/convert, read 05/11/2026). Licence: usable commercially; a free plan must credit
// elevenlabs.io (elevenlabs.io/sound-effects/commercial), which the credit line then says.
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync, copyFileSync } from "node:fs";
import { join } from "node:path";
import { APP_ROOT } from "../version-manager/index.mjs";
import { workRoot } from "../project-service/index.mjs";
import { getSecret } from "../secrets/index.mjs";
import { patchState, readState, slug } from "./index.mjs";
import { familyOf } from "./library.mjs";

export const EL = "https://api.elevenlabs.io";
export const EL_SFX_MODEL = "eleven_text_to_sound_v3";
/** At most this many sounds, and this many seconds of sound, made in one placement (the owner's credits). */
export const GEN_MAX = 30, GEN_MAX_S = 60;
export const GEN_MIN_S = 0.5, GEN_TOP_S = 30;
export const GEN_TIMEOUT_MS = 60000;

/** The studio's cache of made sounds (outside the app's folder). */
export const genCache = (root = APP_ROOT) => join(workRoot(root), "data", "sfx-generated");
const keyOf = (text, durationS, model) => createHash("sha1").update(`${model}|${String(text).trim().toLowerCase()}|${durationS}`).digest("hex").slice(0, 16);
const clampS = (s) => Math.round(Math.min(GEN_TOP_S, Math.max(GEN_MIN_S, Number(s) || 1)) * 10) / 10;

let tierCache = null;
/** The account's plan ("free", "creator"…), or null when the key cannot read it; asked once a run. */
export async function planTier(key, { fetchImpl = fetch } = {}) {
  if (tierCache?.key === key) return tierCache.tier;
  let tier = null;
  try { const r = await fetchImpl(`${EL}/v1/user/subscription`, { headers: { "xi-api-key": key }, signal: AbortSignal.timeout(10000) }); if (r.ok) tier = (await r.json())?.tier ?? null; } catch { /* unknown */ }
  tierCache = { key, tier };
  return tier;
}

/** Make one sound (or take it from the cache): { file (in the cache), durationS, model, cached }. Throws { code: "SFX_GEN" | "SFX_GEN_CREDITS" }. */
export async function makeSound(text, { durationS = 1, key, fetchImpl = fetch, signal, root = APP_ROOT, model = EL_SFX_MODEL } = {}) {
  const dur = clampS(durationS), dir = genCache(root), id = keyOf(text, dur, model), file = join(dir, `${id}.mp3`);
  if (existsSync(file)) return { id, file, durationS: dur, model, cached: true };
  const body = (m) => JSON.stringify({ text: String(text).slice(0, 450), duration_seconds: dur, prompt_influence: 0.5, ...(m ? { model_id: m } : {}) });
  const post = (m) => fetchImpl(`${EL}/v1/sound-generation?output_format=mp3_44100_128`, { method: "POST", headers: { "xi-api-key": key, "content-type": "application/json", accept: "audio/mpeg" },
    body: body(m), signal: AbortSignal.any([AbortSignal.timeout(GEN_TIMEOUT_MS), ...(signal ? [signal] : [])]) });
  let r = await post(model), used = model;
  // a model id the account or the API does not know: the service's own default
  if ((r.status === 400 || r.status === 422) && model) { r = await post(null); used = "default"; }
  if (r.status === 401 || r.status === 402 || r.status === 429) {
    const detail = await r.text().catch(() => "");
    throw Object.assign(new Error(/quota|credit|limit/i.test(detail) || r.status !== 401 ? "The ElevenLabs credits for sound effects are used up" : "The ElevenLabs key cannot make sound effects"), { code: "SFX_GEN_CREDITS" });
  }
  if (!r.ok) throw Object.assign(new Error(`ElevenLabs could not make the sound (${r.status})`), { code: "SFX_GEN" });
  const bytes = Buffer.from(await r.arrayBuffer());
  if (!bytes.length) throw Object.assign(new Error("ElevenLabs gave an empty sound"), { code: "SFX_GEN" });
  mkdirSync(dir, { recursive: true });
  writeFileSync(file, bytes);
  writeFileSync(join(dir, `${id}.json`), JSON.stringify({ text, durationS: dur, model: used, madeAt: new Date().toISOString() }, null, 2) + "\n");
  return { id, file, durationS: dur, model: used, cached: false };
}

/** The credit line's words for a made sound (index.mjs creditLine reads them). */
export const genAttribution = (text, { model, tier, date }) =>
  `"${text}", made for this film with ElevenLabs Sound Effects (${model === "default" ? "ElevenLabs' default model" : model}, ${date})${tier === "free" ? "; sound effects by elevenlabs.io (ElevenLabs' free plan asks for this credit)" : ", used under the owner's ElevenLabs plan"}.`;

/** Put a made sound into the film for a cue name: assets/3_audio/sfx/gen-<words>.mp3, recorded as the name's sound (source "elevenlabs"). */
export function useMadeSound(dir, name, made, { text, tier = null } = {}) {
  const st = readState(dir), base = `gen-${slug(text).slice(0, 48).replace(/-$/, "")}`;
  const taken = new Set(Object.entries(st.sounds).filter(([n]) => n !== name).map(([, s]) => s.file));
  let rel = `assets/3_audio/sfx/${base}.mp3`;
  for (let i = 2; taken.has(rel) && st.sounds[name]?.file !== rel; i++) rel = `assets/3_audio/sfx/${base}-${i}.mp3`;
  mkdirSync(join(dir, "assets", "3_audio", "sfx"), { recursive: true });
  copyFileSync(made.file, join(dir, ...rel.split("/")));
  const date = new Date().toISOString().slice(0, 10);
  return patchState(dir, (x) => {
    x.sounds[name] = { id: `elevenlabs:${made.id}`, source: "elevenlabs", title: text, family: familyOf(name) ?? familyOf(text) ?? null, file: rel, durationS: made.durationS,
      creator: "ElevenLabs", licence: tier === "free" ? "ElevenLabs Sound Effects, credit elevenlabs.io" : "ElevenLabs Sound Effects (the owner's plan)",
      page: "https://elevenlabs.io/sound-effects", prompt: text, model: made.model, attribution: genAttribution(text, { model: made.model, tier, date }), addedAt: new Date().toISOString() };
  }).sounds[name];
}

/** The app's maker for a placement, or null when this computer has no ElevenLabs key (or a test runs): make(name, text, durationS) puts the
 *  made sound into the film; it says no (null) past GEN_MAX sounds or GEN_MAX_S seconds, and stops for good once the credits are used. */
export function soundMaker(dir, { root = APP_ROOT, fetchImpl = fetch, signal, key = undefined } = {}) {
  const k = key !== undefined ? key : process.env.NODE_TEST_CONTEXT || process.env.MW_SFX_MAKE === "none" ? null : getSecret("elevenlabs", root);
  if (!k) return null;
  let n = 0, secs = 0, stopped = null;
  const made = [], errors = [];
  const make = async (name, text, durationS) => {
    const dur = clampS(durationS);
    if (stopped || n >= GEN_MAX || secs + dur > GEN_MAX_S) return null;
    try {
      const m = await makeSound(text, { durationS: dur, key: k, fetchImpl, signal, root });
      if (!m.cached) { n++; secs += dur; }
      const s = useMadeSound(dir, name, m, { text, tier: await planTier(k, { fetchImpl }) });
      made.push({ name, text, durationS: dur, cached: m.cached });
      return s;
    } catch (e) {
      if (signal?.aborted) throw e;
      if (e.code === "SFX_GEN_CREDITS") stopped = e.message;
      errors.push({ name, error: e.message });
      return null;
    }
  };
  return { make, made, errors, get stopped() { return stopped; }, get seconds() { return secs; } };
}

/** A made sound's cache entry exists (tests, the drawer). */
export const madeExists = (text, durationS, { root = APP_ROOT, model = EL_SFX_MODEL } = {}) => existsSync(join(genCache(root), `${keyOf(text, clampS(durationS), model)}.mp3`));
export const _readMeta = (id, root = APP_ROOT) => { try { return JSON.parse(readFileSync(join(genCache(root), `${id}.json`), "utf8")); } catch { return null; } };
