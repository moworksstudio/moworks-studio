// The film's language: read from the brief when it says
// it, else Prepare asks and records the answer; the TTS model and Whisper follow it. Run: npm test
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const T = mkdtempSync(join(tmpdir(), "mw-film-lang-"));
process.env.MW_WORK_ROOT = join(T, "work");
process.env.MW_STATE_DIR = join(T, "state");
process.env.MW_NO_BACKUP = "1";
process.env.MW_NO_LIBRARY_IMPORT = "1";
process.env.MW_CLAUDE_CONFIG_DIR = join(T, "claude-empty");
mkdirSync(process.env.MW_CLAUDE_CONFIG_DIR, { recursive: true });
after(() => rmSync(T, { recursive: true, force: true }));
const projects = await import("../packages/project-service/index.mjs");
const A = await import("../packages/agent/index.mjs");
const { pickModel } = await import("../packages/voice/tts.mjs");

test("the brief's language: named (tiếng Anh, in English, Vietnamese) or written in Vietnamese; else none, for Prepare to ask", () => {
  const L = projects.briefLanguage;
  assert.deepEqual([L("Phim 30 giây về gạch"), L("Phim về gạch, lời đọc tiếng Anh"), L("A film, voice in Vietnamese"), L("A film about bricks in English"),
    L("A film about bricks"), L("Phim song ngữ tiếng Việt và tiếng Anh"), L("")], ["vi", "en", "vi", "en", null, null, null]);
});

test("a new film takes it from the brief; with none, Prepare asks it in its one message and records the answer with film_language", async () => {
  const vi = await projects.createProject({ title: "demo-lang-vi", aspect: "16:9", durationSec: 10, brief: "Phim về gạch", style: { id: "general", title: "General" } }, {});
  assert.deepEqual([vi.meta.language.id, vi.meta.language.by], ["vi", "brief"]);
  const none = await projects.createProject({ title: "demo-lang-none", aspect: "16:9", durationSec: 10, brief: "A film about bricks", style: { id: "general", title: "General" } }, {});
  assert.equal(none.meta.language, undefined);
  const sp = (meta, step) => A.systemPrompt({ meta: { title: "x", ...meta }, rules: [], shots: [], dir: process.cwd(), step });
  assert.ok(sp(none.meta, "brief").includes("\"Lời đọc và chữ trên phim: tiếng Việt hay tiếng Anh?\"") && sp(none.meta, "brief").includes("call film_language"));
  assert.ok(sp(vi.meta, "brief").includes("The film's language (the voice-over and every word on screen): Vietnamese."));
  assert.ok(!sp(vi.meta, "brief").includes("tiếng Việt hay tiếng Anh?"), "a brief that says it: no question");
  assert.equal(projects.setLanguage(none.id, "en", "claude").meta.language.id, "en");
  assert.throws(() => projects.setLanguage(none.id, "fr"), /vi or en/);
  assert.equal(A.APP_TOOLS.film_language.inputSchema.properties.language.enum.join(), "vi,en");
});

test("the voice follows the film's language: an English film is read by its own model, a Vietnamese one by a model that reads Vietnamese", () => {
  const models = [{ id: "eleven_multilingual_v2", vietnamese: false }, { id: "eleven_v3", vietnamese: true }];
  assert.equal(pickModel(models, { text: "Hello there", lang: "vi" }), "eleven_v3", "Vietnamese film, even when the words look English");
  assert.equal(pickModel(models, { text: "Xin chào Sài Gòn", lang: "en", asked: "eleven_multilingual_v2" }), "eleven_multilingual_v2", "English film quoting a Vietnamese name");
  assert.equal(pickModel(models, { text: "Mặt Trăng" }), "eleven_v3", "no language set: the text decides");
});
