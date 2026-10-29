// The voice: a voice the plan does not allow is said as the plan, never the key; the words of a voice-over
// read from a script are the script's at Whisper's times, or the user checks them; Whisper runs on the graphics card for the
// lyrics too when the CUDA pack is in.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { usableOn } from "../packages/voice/tts.mjs";
import { fromScript } from "../packages/voice/transcript.mjs";

test("an instant clone is not usable on a plan without cloning, a Library voice always is; a plan not known keeps every voice; the refusal names the plan", () => {
  const sub = { can_use_instant_voice_cloning: false, can_use_professional_voice_cloning: false };
  assert.deepEqual(usableOn({ category: "cloned" }, sub), { usable: false, why: "an instantly cloned voice: not on this ElevenLabs plan" });
  // a Voice Library voice (Kenh, "professional", copied, trained by its maker) reads on any plan; the account's own professional
  // voice ElevenLabs never trained does not
  const lib = { category: "professional", is_owner: false, sharing: { status: "copied" }, fine_tuning: { state: { eleven_v4: "fine_tuned", eleven_flash_v2: "not_started" } } };
  assert.equal(usableOn(lib, sub).usable, true);
  assert.equal(usableOn({ category: "professional", is_owner: true, fine_tuning: { state: {} } }, sub).usable, false);
  assert.equal(usableOn({ category: "professional", is_owner: true, fine_tuning: { state: { eleven_v4: "fine_tuned" } } }, sub).usable, true);
  assert.equal(usableOn({ category: "professional" }, sub).usable, true, "a professional voice with nothing said about its training is not locked");
  assert.equal(usableOn({ category: "premade" }, sub).usable, true);
  assert.equal(usableOn({ category: "cloned" }, { can_use_instant_voice_cloning: true }).usable, true);
  assert.equal(usableOn({ category: "cloned" }, null).usable, true);
  const src = readFileSync(join(import.meta.dirname, "..", "packages", "voice", "tts.mjs"), "utf8");
  assert.match(src, /current plan\|your plan\|subscription/, "a 401/403 that names the plan is said as the plan");
  const ui = readFileSync(join(import.meta.dirname, "..", "ui", "src", "screens", "Voice.jsx"), "utf8");
  assert.match(ui, /v\.usable === false \? 3/, "a voice the plan refuses goes last");
  assert.match(ui, /voices\.find\(\(v\) => v\.usable !== false\)/, "and is never chosen first");
});

test("Whisper's words become the script's (changed, missed and extra words), keeping its times; a far script is the user's to check", () => {
  const seg = (id, words) => ({ id, start: words[0][1], end: words.at(-1)[2], text: words.map((w) => w[0]).join(" "), words: words.map(([text, start, end]) => ({ text, start, end })) });
  const heard = [seg("s1", [["Đêm", 0, 0.3], ["thứ", 0.3, 0.5], ["một", 0.5, 0.7], ["nhìn,", 0.7, 1.0]]),
    seg("s2", [["tiết", 1.2, 1.5], ["mười", 1.5, 1.7], ["tuổi,", 1.9, 2.2], ["ừm", 2.2, 2.4]])];
  const r = fromScript(heard, "Đêm thứ một nghìn.\nTia, mười bảy tuổi,");
  assert.deepEqual(r.segments.map((s) => s.text), ["Đêm thứ một nghìn.", "Tia, mười bảy tuổi,"]);
  assert.deepEqual(r.segments[0].words.at(-1), { text: "nghìn.", start: 0.7, end: 1, p: null }, "a changed word keeps its heard word's times");
  const bay = r.segments[1].words.find((w) => w.text === "bảy");
  assert.ok(bay.start >= 1.7 && bay.end <= 1.9, "a missed word sits between its neighbours");
  assert.deepEqual([r.changed, r.missed, r.extra], [2, 1, 1]);
  assert.ok(r.match > 0.6);
  assert.ok(fromScript(heard, "Một đoạn khác hẳn, không ai nói câu này cả.").match < 0.6, "another take: below the bar, the owner checks it");
  assert.equal(fromScript(heard, ""), null);
});

test("the lyrics' Whisper gets the same device and CUDA folders as the voice-over's", () => {
  const lyr = readFileSync(join(import.meta.dirname, "..", "packages", "voice", "lyrics.mjs"), "utf8");
  assert.match(lyr, /asr\.whisperDevice\(root\)/);
  assert.match(lyr, /"--device", device/);
  assert.match(lyr, /\.\.\.cudaEnv/);
});
