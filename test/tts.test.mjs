// ElevenLabs for Vietnamese: Vietnamese text is read by a model that lists Vietnamese, never
// eleven_multilingual_v2 by default; a key with no user_read still tests as connected. The service is faked. Run: npm test
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { PROVIDERS, SETTINGS, pickModel, isVietnamese, voiceSettings } from "../packages/voice/tts.mjs";

const realFetch = globalThis.fetch;
after(() => { globalThis.fetch = realFetch; });
const MODELS = [
  { model_id: "eleven_multilingual_v2", name: "Multilingual v2", languages: [{ language_id: "en" }, { language_id: "fr" }] },
  { model_id: "eleven_flash_v2_5", name: "Flash v2.5", languages: [{ language_id: "vi" }] },
  { model_id: "eleven_v3", name: "Eleven v3", languages: [{ language_id: "en" }, { language_id: "vi" }] },
];
const fake = (routes) => { globalThis.fetch = async (url) => { const hit = Object.entries(routes).find(([k]) => String(url).includes(k)); return hit ? hit[1]() : new Response("{}", { status: 404 }); }; };
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

test("Vietnamese text gets a model that reads Vietnamese (eleven_v3 first), the asked one only when it reads it", async () => {
  fake({ "/v1/models": () => json(MODELS) });
  const models = await PROVIDERS.elevenlabs.models("k");
  assert.deepEqual(models.map((m) => [m.id, m.vietnamese]), [["eleven_multilingual_v2", false], ["eleven_flash_v2_5", true], ["eleven_v3", true]]);
  assert.equal(isVietnamese("Nếu Trái Đất bỗng đứng yên?"), true);
  assert.equal(pickModel(models, { text: "Nếu Trái Đất bỗng đứng yên?" }), "eleven_v3");
  assert.equal(pickModel(models, { text: "Nếu Trái Đất bỗng đứng yên?", asked: "eleven_multilingual_v2" }), "eleven_v3", "never multilingual_v2 for Vietnamese here");
  assert.equal(pickModel(models, { text: "Mặt đất dừng", asked: "eleven_flash_v2_5" }), "eleven_flash_v2_5");
  assert.equal(pickModel(models, { text: "What if the Earth stopped?", asked: "eleven_multilingual_v2" }), "eleven_multilingual_v2");
  assert.equal(pickModel(models.filter((m) => !m.vietnamese), { text: "tiếng Việt" }), null, "none reads Vietnamese: the app says so");
});

test("a key without user_read tests as connected (no account info); a wrong key is still refused", async () => {
  fake({ "/v1/user": () => json({ detail: { status: "missing_permissions", message: "The API key you used is missing the permission user_read" } }, 401), "/v1/models": () => json(MODELS) });
  assert.deepEqual(await PROVIDERS.elevenlabs.test("k"), { ok: true, account: null, credits: null, note: "connected (no account info)" });
  fake({ "/v1/user": () => json({ detail: { status: "invalid_api_key", message: "Invalid API key" } }, 401) });
  await assert.rejects(PROVIDERS.elevenlabs.test("bad"), /The key was refused/);
  fake({ "/v1/user": () => json({ subscription: { tier: "creator", character_count: 10, character_limit: 100 } }) });
  assert.deepEqual(await PROVIDERS.elevenlabs.test("k"), { ok: true, account: "creator", credits: { used: 10, limit: 100, unit: "characters" } });
});

test("only the settings the user set go to ElevenLabs as voice_settings; none set, none sent (its own defaults); out of range refused", async () => {
  const { mkdtempSync, rmSync } = await import("node:fs");
  const { tmpdir } = await import("node:os");
  const { join } = await import("node:path");
  const d = mkdtempSync(join(tmpdir(), "mw-tts-settings-"));
  const bodies = [];
  globalThis.fetch = async (u, o) => { bodies.push(JSON.parse(o.body)); return new Response(new Uint8Array([1, 2, 3]), { status: 200, headers: { "content-type": "audio/mpeg" } }); };
  const settings = { speed: 0.9, stability: 0.3, similarity_boost: 0.8, style: 0.1, use_speaker_boost: false, made_up: 5 };
  await PROVIDERS.elevenlabs.generate("k", { voiceId: "v", text: "Xin chào", model: "eleven_v3", out: join(d, "a.mp3"), settings });
  await PROVIDERS.elevenlabs.generate("k", { voiceId: "v", text: "Xin chào", model: "eleven_v3", out: join(d, "b.mp3") });
  await PROVIDERS.elevenlabs.generate("k", { voiceId: "v", text: "Xin chào", model: "eleven_v3", out: join(d, "c.mp3"), settings: { speed: null, stability: "" } });
  assert.deepEqual(bodies.map((b) => b.voice_settings ?? null), [{ speed: 0.9, stability: 0.3, similarity_boost: 0.8, style: 0.1, use_speaker_boost: false }, null, null]);
  assert.throws(() => voiceSettings("elevenlabs", { speed: 3 }), /Speed is from 0.7 to 1.2/, "refused, never moved into range");
  assert.throws(() => voiceSettings("elevenlabs", { use_speaker_boost: "yes" }), /on or off/);
  rmSync(d, { recursive: true, force: true });
});

test("ElevenLabs' defaults come from its own API, each voice's saved settings from its answer", async () => {
  globalThis.fetch = async (u) => {
    if (String(u).endsWith("/v1/voices/settings/default")) return new Response(JSON.stringify({ stability: 0.5, similarity_boost: 0.75, style: 0, use_speaker_boost: true, speed: 1, clone_strength: null }), { status: 200 });
    return new Response(JSON.stringify({ voices: [{ voice_id: "a", name: "A", category: "premade", settings: { stability: 0.4, speed: 1.1 } }, { voice_id: "b", name: "B", category: "cloned" }] }), { status: 200 });
  };
  assert.deepEqual(await PROVIDERS.elevenlabs.defaultSettings("k"), { speed: 1, stability: 0.5, similarity_boost: 0.75, style: 0, use_speaker_boost: true });
  assert.deepEqual((await PROVIDERS.elevenlabs.voices("k")).map((v) => v.settings), [{ speed: 1.1, stability: 0.4 }, null]);
  assert.ok(SETTINGS.elevenlabs.every((f) => f.default === undefined), "no value of our own for ElevenLabs");
});

test("Fish Audio gets the user's settings the same way (speed and volume as its prosody) and the film's language", async () => {
  const { mkdtempSync, rmSync } = await import("node:fs");
  const { tmpdir } = await import("node:os");
  const { join } = await import("node:path");
  const d = mkdtempSync(join(tmpdir(), "mw-tts-fish-"));
  const bodies = [];
  globalThis.fetch = async (u, o) => { bodies.push(JSON.parse(o.body)); return new Response(new Uint8Array([1]), { status: 200 }); };
  await PROVIDERS.fishaudio.generate("k", { voiceId: "r", text: "Hello", out: join(d, "a.mp3"), settings: { speed: 1.3, temperature: 0.5, normalize: false }, lang: "en" });
  await PROVIDERS.fishaudio.generate("k", { voiceId: "r", text: "Xin chào", out: join(d, "b.mp3") });
  assert.deepEqual([bodies[0].prosody, bodies[0].temperature, bodies[0].normalize, bodies[0].language], [{ speed: 1.3 }, 0.5, false, "en"]);
  assert.deepEqual([bodies[1].prosody, bodies[1].temperature, bodies[1].top_p, bodies[1].language], [undefined, undefined, undefined, "vi"], "nothing set: Fish Audio's own defaults");
  assert.deepEqual(await PROVIDERS.fishaudio.defaultSettings(), { speed: 1, volume: 0, temperature: 0.7, top_p: 0.7, normalize: true });
  rmSync(d, { recursive: true, force: true });
});
