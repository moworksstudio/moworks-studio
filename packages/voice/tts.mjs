// Text-to-speech providers (voice-over is uploaded audio, ElevenLabs or Fish Audio; no local voice). The key comes from the
// secret store and is sent only to the provider's own API; errors never echo it. Generation costs the user credits: it runs only on an
// explicit request from the Voice screen.
import { createWriteStream, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

const EL = "https://api.elevenlabs.io";
const FISH = "https://api.fish.audio";
const TIMEOUT = 20000;

async function call(url, init = {}, timeout = TIMEOUT) {
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), timeout);
  try {
    const r = await fetch(url, { ...init, signal: init.signal ?? ctl.signal });
    if (!r.ok) {
      let detail = ""; try { const j = await r.json(); detail = j?.detail?.message ?? j?.detail?.status ?? j?.message ?? (typeof j?.detail === "string" ? j.detail : ""); } catch { /* not JSON */ }
      // a voice the plan does not allow (an instantly cloned voice on a plan without cloning) is refused with 401/403 too:
      // that is the plan, never "the key"
      const planNo = /current plan|your plan|subscription|upgrade|not available on/i.test(String(detail));
      const plain = planNo ? "This voice is not available on the account's ElevenLabs plan: choose another voice"
        : r.status === 401 || r.status === 403 ? "The key was refused (check it in Settings)" : r.status === 402 ? "The account has no credit left for this"
        : r.status === 429 ? "Too many requests; try again in a minute" : `The service answered ${r.status}`;
      throw Object.assign(new Error(detail ? `${plain}: ${String(detail).slice(0, 200)}` : plain), { code: "PROVIDER", status: r.status });
    }
    return r;
  } catch (e) {
    if (e.code === "PROVIDER") throw e;
    throw Object.assign(new Error(e.name === "AbortError" ? "The service did not answer in time" : `Could not reach the service: ${e.message}`), { code: "PROVIDER_OFFLINE" });
  } finally { clearTimeout(t); }
}

/** Can the account's plan read with this ElevenLabs voice (an instantly cloned voice, chosen first, was refused by
 *  the plan)? { usable: true | false, why? }; true when the plan is not known (the provider then says it at Create).
 *  A voice added from the Voice Library is "professional" too (sharing "copied", not the account's own, trained by its maker)
 *  and reads on any plan: only an instant clone on a plan without cloning, or the account's own professional voice ElevenLabs never
 *  finished training (no model fine_tuned), cannot be read. */
export function usableOn(v, sub) {
  const cat = String(v.category ?? "");
  if (cat === "professional" && v.is_owner === true && v.fine_tuning?.state && !Object.values(v.fine_tuning.state).includes("fine_tuned"))
    return { usable: false, why: "ElevenLabs has not finished making this voice" };
  if (!sub) return { usable: true };
  if (cat === "cloned" && sub.can_use_instant_voice_cloning === false) return { usable: false, why: "an instantly cloned voice: not on this ElevenLabs plan" };
  return { usable: true };
}

/** Vietnamese text: a letter only Vietnamese writes. */
export const isVietnamese = (text) => /[ăâđêôơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]/i.test(String(text ?? ""));
/** ElevenLabs models that read Vietnamese, best first (an account's eleven_multilingual_v2 may list no Vietnamese; /v1/models names
 *  eleven_v3, eleven_v4… with a vi language). */
export const EL_VI_ORDER = ["eleven_v3", "eleven_v4", "eleven_v4_turbo", "eleven_turbo_v2_5", "eleven_flash_v2_5", "eleven_v3_conversational"];
/** The model to read the text with: the asked one when it reads the text's language, else (Vietnamese) the best Vietnamese one; null when
 *  the account has none for it. models: [{ id, vietnamese }]. */
export function pickModel(models, { text = "", asked = null, lang = null } = {}) {
  const list = models ?? [];
  // the film's language decides when it is set (an English film's text may quote a Vietnamese name), else the text
  if (lang === "en" || (lang !== "vi" && !isVietnamese(text))) return asked ?? list[0]?.id ?? null;
  const vi = list.filter((m) => m.vietnamese);
  if (asked && vi.some((m) => m.id === asked)) return asked;
  return EL_VI_ORDER.find((id) => vi.some((m) => m.id === id)) ?? vi[0]?.id ?? null;
}

/** The settings each service's Voice screen shows:
 *  the user sets them (everything else stays at the service's own default); the app never picks a value of its own. Ranges from each service's API reference (read 26/10/2026). */
export const SETTINGS = {
  elevenlabs: [
    { id: "speed", label: "Speed", type: "number", min: 0.7, max: 1.2, step: 0.01 },
    { id: "stability", label: "Stability", type: "number", min: 0, max: 1, step: 0.01 },
    { id: "similarity_boost", label: "Similarity", type: "number", min: 0, max: 1, step: 0.01 },
    { id: "style", label: "Style exaggeration", type: "number", min: 0, max: 1, step: 0.01 },
    { id: "use_speaker_boost", label: "Speaker boost", type: "boolean" },
  ],
  fishaudio: [
    { id: "speed", label: "Speed", type: "number", min: 0.5, max: 2, step: 0.01, default: 1 },
    { id: "volume", label: "Volume (dB)", type: "number", step: 0.5, default: 0 },          // the reference gives no range
    { id: "temperature", label: "Temperature", type: "number", min: 0, max: 1, step: 0.01, default: 0.7 },
    { id: "top_p", label: "Top P", type: "number", min: 0, max: 1, step: 0.01, default: 0.7 },
    { id: "normalize", label: "Normalize text", type: "boolean", default: true },
  ],
};
/** The known settings of a service's answer, by their own names (unknown keys and nulls dropped). */
function pickSettings(provider, raw) {
  const out = {};
  for (const f of SETTINGS[provider] ?? []) if (raw?.[f.id] != null) out[f.id] = raw[f.id];
  return out;
}
/** The settings the user set, checked against the service's ranges: null when none (the service's own defaults apply); a value out of
 *  range or of the wrong kind is refused with the field's name, never moved into range. */
export function voiceSettings(provider, settings) {
  if (!settings || typeof settings !== "object") return null;
  const out = {};
  for (const f of SETTINGS[provider] ?? []) {
    const v = settings[f.id];
    if (v == null || v === "") continue;
    if (f.type === "boolean") {
      if (typeof v !== "boolean") throw Object.assign(new Error(`${f.label} is on or off`), { code: "INVALID" });
      out[f.id] = v;
    } else {
      const n = Number(v);
      if (!Number.isFinite(n) || (f.min != null && n < f.min) || (f.max != null && n > f.max))
        throw Object.assign(new Error(f.min != null ? `${f.label} is from ${f.min} to ${f.max}` : `${f.label} is a number`), { code: "INVALID" });
      out[f.id] = n;
    }
  }
  return Object.keys(out).length ? out : null;
}

export const PROVIDERS = {
  elevenlabs: {
    title: "ElevenLabs",
    async test(key) {
      let u;
      try { u = await (await call(`${EL}/v1/user`, { headers: { "xi-api-key": key } })).json(); }
      catch (e) {
        // a key restricted to voices, models and speech has no user_read: it works, there is just no account to show
        if (e.status !== 401 || !/missing_permissions|user_read/i.test(e.message)) throw e;
        await call(`${EL}/v1/models`, { headers: { "xi-api-key": key } });
        return { ok: true, account: null, credits: null, note: "connected (no account info)" };
      }
      const s = u.subscription ?? {};
      return { ok: true, account: s.tier ?? null, credits: s.character_limit != null ? { used: s.character_count, limit: s.character_limit, unit: "characters" } : null };
    },
    async voices(key) {
      const j = await (await call(`${EL}/v1/voices`, { headers: { "xi-api-key": key } })).json();
      // which cloned voices the plan lets the account use (its subscription's can_use_*_voice_cloning); unknown without user_read
      let sub = null; try { sub = (await (await call(`${EL}/v1/user/subscription`, { headers: { "xi-api-key": key } })).json()) ?? null; } catch { /* no user_read */ }
      return (j.voices ?? []).map((v) => ({ id: v.voice_id, name: v.name, labels: Object.values(v.labels ?? {}).filter(Boolean).join(", "), preview: v.preview_url ?? null, own: v.category !== "premade",
        ...usableOn(v, sub), settings: v.settings ? pickSettings("elevenlabs", v.settings) : null }));          // the voice's own saved settings, when it has them
    },
    async models(key) {
      const j = await (await call(`${EL}/v1/models`, { headers: { "xi-api-key": key } })).json();
      return (j ?? []).filter((m) => m.can_do_text_to_speech !== false)
        .map((m) => ({ id: m.model_id, name: m.name, vietnamese: (m.languages ?? []).some((l) => /^vi/i.test(l.language_id ?? "")) }));
    },
    /** ElevenLabs' own default settings (GET /v1/voices/settings/default): what the Voice screen shows before the user changes anything. */
    async defaultSettings(key) {
      return pickSettings("elevenlabs", await (await call(`${EL}/v1/voices/settings/default`, { headers: { "xi-api-key": key } })).json());
    },
    async generate(key, { voiceId, text, model = "eleven_multilingual_v2", out, signal, settings = null }) {
      // only the settings the user set on the Voice screen go; none sent, ElevenLabs uses its own
      const vs = voiceSettings("elevenlabs", settings);
      const r = await call(`${EL}/v1/text-to-speech/${encodeURIComponent(voiceId)}?output_format=mp3_44100_128`,
        { method: "POST", headers: { "xi-api-key": key, "Content-Type": "application/json", Accept: "audio/mpeg" }, body: JSON.stringify({ text, model_id: model, ...(vs ? { voice_settings: vs } : {}) }), signal }, 300000);
      mkdirSync(dirname(out), { recursive: true });
      await pipeline(Readable.fromWeb(r.body), createWriteStream(out));
      return { file: out, format: "mp3" };
    },
  },
  fishaudio: {
    title: "Fish Audio",
    async test(key) {
      await call(`${FISH}/model?self=true&page_size=1`, { headers: { Authorization: `Bearer ${key}` } });
      return { ok: true, account: null, credits: null };
    },
    async voices(key, { q = "" } = {}) {
      const h = { headers: { Authorization: `Bearer ${key}` } };
      const own = await (await call(`${FISH}/model?self=true&page_size=50`, h)).json();
      const pub = await (await call(`${FISH}/model?language=vi&sort_by=score&page_size=40${q ? `&title=${encodeURIComponent(q)}` : ""}`, h)).json();
      const map = (v, mine) => ({ id: v._id, name: v.title, labels: [(v.languages ?? []).join("/"), v.author?.nickname].filter(Boolean).join(" · "), preview: v.samples?.[0]?.audio ?? null, own: mine });
      return [...(own.items ?? []).map((v) => map(v, true)), ...(pub.items ?? []).map((v) => map(v, false))];
    },
    async models() { return [{ id: "s2.1-pro", name: "S2.1 Pro (default)" }, { id: "s1", name: "S1" }, { id: "s2-pro", name: "S2 Pro" }]; },
    /** Fish Audio has no settings endpoint: its documented defaults (docs.fish.audio, TTS request body, read 26/10/2026). */
    async defaultSettings() { return Object.fromEntries(SETTINGS.fishaudio.map((f) => [f.id, f.default])); },
    async generate(key, { voiceId, text, model = "s2.1-pro", out, signal, settings = null, lang = null }) {
      const vs = voiceSettings("fishaudio", settings) ?? {};
      const { speed, volume, ...rest } = vs;
      const prosody = speed != null || volume != null ? { ...(speed != null ? { speed } : {}), ...(volume != null ? { volume } : {}) } : null;
      const r = await call(`${FISH}/v1/tts`, { method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", model },
        body: JSON.stringify({ text, reference_id: voiceId || undefined, format: "mp3", mp3_bitrate: 128, language: lang === "en" ? "en" : "vi", ...rest, ...(prosody ? { prosody } : {}) }), signal }, 300000);
      mkdirSync(dirname(out), { recursive: true });
      await pipeline(Readable.fromWeb(r.body), createWriteStream(out));
      return { file: out, format: "mp3" };
    },
  },
};
