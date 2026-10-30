// The Voice screen's voice list (Test 25: ElevenLabs took 2-24 s on a busy computer, the list failed after 25 s with a 502, Retry worked on
// the 2nd-3rd try): each call waits up to 45 s and the calls go at once; the list is kept 10 minutes per service, key, language and search,
// so reopening the dialog asks nothing; two reads at once share one; a failure is not kept and says which service, in plain words, for the
// screen's Retry. The service is faked. Run: npm test
import { test, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { LIST_TIMEOUT, LIST_TTL_MS, clearVoiceLists, voiceList } from "../packages/voice/tts.mjs";

const realFetch = globalThis.fetch;
after(() => { globalThis.fetch = realFetch; });
beforeEach(() => clearVoiceLists());
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const MODELS = [{ model_id: "eleven_multilingual_v2", name: "Multilingual v2", languages: [{ language_id: "en" }] }, { model_id: "eleven_v3", name: "Eleven v3", languages: [{ language_id: "vi" }, { language_id: "en" }] }];
/** A fake ElevenLabs that counts the calls; `delay` ms before each answer. */
function fakeEl({ delay = 0 } = {}) {
  const calls = [];
  globalThis.fetch = async (u) => {
    const url = String(u); calls.push(url.replace("https://api.elevenlabs.io", ""));
    if (delay) await new Promise((ok) => setTimeout(ok, delay));
    if (url.endsWith("/v1/models")) return json(MODELS);
    if (url.endsWith("/v1/voices/settings/default")) return json({ stability: 0.5, speed: 1 });
    if (url.endsWith("/v1/user/subscription")) return json({ can_use_instant_voice_cloning: true });
    if (url.endsWith("/v1/voices")) return json({ voices: [{ voice_id: "ngoc", name: "Ngọc - Warm, Smooth and Sincere", category: "professional", settings: { speed: 0.95 } }] });
    return json({}, 404);
  };
  return calls;
}

test("a call waits up to 45 s, and the list is kept 10 minutes", () => {
  assert.equal(LIST_TIMEOUT, 45000);
  assert.equal(LIST_TTL_MS, 10 * 60 * 1000);
});

test("the list is read once: the calls go at once, and reopening within 10 minutes asks the service nothing", async () => {
  const calls = fakeEl({ delay: 100 });
  let t = 1_000_000;
  const now = () => t;
  const t0 = Date.now();
  const a = await voiceList("elevenlabs", "key-1", { lang: "vi", now });
  assert.ok(Date.now() - t0 < 300, "the four calls go at once, not one after another (400 ms)");
  assert.deepEqual(calls.slice().sort(), ["/v1/models", "/v1/user/subscription", "/v1/voices", "/v1/voices/settings/default"]);
  assert.equal(a.voices[0].name, "Ngọc - Warm, Smooth and Sincere");
  assert.deepEqual(a.voices[0].defaultSettings, { stability: 0.5, speed: 0.95 }, "the voice's own settings over the service's defaults");
  assert.equal(a.defaultModel, "eleven_v3", "Vietnamese: a model that reads it");
  t += LIST_TTL_MS - 1000;
  assert.deepEqual(await voiceList("elevenlabs", "key-1", { lang: "vi", now }), a);
  assert.equal(calls.length, 4, "kept: nothing asked again");
  // another language is its own list (its default model differs); another key too
  assert.equal((await voiceList("elevenlabs", "key-1", { lang: "en", now })).defaultModel, "eleven_multilingual_v2");
  await voiceList("elevenlabs", "key-2", { lang: "vi", now });
  assert.equal(calls.length, 12);
  // ten minutes on, or asked fresh: read again
  t += 2000;
  await voiceList("elevenlabs", "key-1", { lang: "vi", now });
  assert.equal(calls.length, 16);
  await voiceList("elevenlabs", "key-1", { lang: "vi", now, fresh: true });
  assert.equal(calls.length, 20);
  // a key saved or cleared forgets the lists
  clearVoiceLists("elevenlabs");
  await voiceList("elevenlabs", "key-1", { lang: "vi", now });
  assert.equal(calls.length, 24);
});

test("two reads at the same time share one", async () => {
  const calls = fakeEl({ delay: 40 });
  const [a, b] = await Promise.all([voiceList("elevenlabs", "k", { lang: "vi" }), voiceList("elevenlabs", "k", { lang: "vi" })]);
  assert.equal(a, b);
  assert.equal(calls.length, 4);
});

test("a failure says which service in plain words, is not kept, and the next read (Retry) asks again", async () => {
  globalThis.fetch = async () => { throw Object.assign(new TypeError("fetch failed"), { cause: { code: "ECONNRESET" } }); };
  await assert.rejects(voiceList("elevenlabs", "k", { lang: "vi" }), (e) => {
    assert.equal(e.message, "Could not read the ElevenLabs voices: could not reach ElevenLabs (the connection was cut). Try again in a moment.");
    assert.equal(e.code, "PROVIDER_OFFLINE");          // the server answers 502; the Voice screen shows the message with Retry
    return true;
  });
  // a service that does not answer within the time: said so (the time is shortened here)
  globalThis.fetch = (u, o) => new Promise((_, no) => o.signal.addEventListener("abort", () => no(Object.assign(new Error("aborted"), { name: "AbortError" }))));
  await assert.rejects(voiceList("elevenlabs", "k", { lang: "vi", timeout: 50 }), /^Error: Could not read the ElevenLabs voices: ElevenLabs did not answer in time\. Try again in a moment\.$/);
  // a refusal is no "try again"
  globalThis.fetch = async () => json({ detail: { status: "invalid_api_key", message: "Invalid API key" } }, 401);
  await assert.rejects(voiceList("elevenlabs", "k", { lang: "vi" }), (e) => /^Could not read the ElevenLabs voices: the key was refused \(check it in Settings\): Invalid API key\.$/.test(e.message) && e.code === "PROVIDER");
  const calls = fakeEl();
  assert.equal((await voiceList("elevenlabs", "k", { lang: "vi" })).voices.length, 1, "nothing kept from the failures");
  assert.equal(calls.length, 4);
});

test("Fish Audio's two lists go at once too, and its list is kept the same way", async () => {
  const calls = [];
  globalThis.fetch = async (u) => { calls.push(String(u)); return json({ items: [{ _id: String(u).includes("self=true") ? "mine" : "pub", title: "Giọng", languages: ["vi"] }] }); };
  const a = await voiceList("fishaudio", "k", { lang: "vi" });
  assert.deepEqual(a.voices.map((v) => [v.id, v.own]), [["mine", true], ["pub", false]]);
  assert.equal(a.defaultModel, "s2.1-pro");
  await voiceList("fishaudio", "k", { lang: "vi" });
  assert.equal(calls.length, 2);
  assert.notEqual((await voiceList("fishaudio", "k", { lang: "vi", q: "nam" })), a, "a search is its own list");
});
