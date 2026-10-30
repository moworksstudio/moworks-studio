// Test 24's bugs: the owner's voice-over script cut by Prepare (T24-1). Run: node --test test/t24.test.mjs
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const T = mkdtempSync(join(tmpdir(), "mw-t24-"));
process.env.MW_WORK_ROOT = join(T, "work");
process.env.MW_STATE_DIR = join(T, "state");
process.env.MW_NO_BACKUP = "1";
const projects = await import("../packages/project-service/index.mjs");
const { createAutopilot, createRenderQueue } = await import("../packages/server/autopilot.mjs");
const { briefScript, scriptGap } = await import("../packages/voice/script.mjs");
const { briefText, voiceLine } = await import("../packages/agent/index.mjs");
after(() => rmSync(T, { recursive: true, force: true }));

// the shape of Test 24's brief: an instruction line about the voice, then the script under a heading of its own, at the very end
const SCRIPT = ["Đảo Hòn Gió nhỏ tới mức nhiều tấm bản đồ quên vẽ nó.", "Máy đáp: đã nhận. Rồi im lặng.", "Ông với tay tắt máy. Thì chuông reo.",
  "Ai đó trong đất liền đang gõ, rất nhanh. Cháu là Thảo.", "Máy in kêu lạch cạch.", "Ông Sáu gõ lại, từng chữ một. Bản tin cuối: trời quang, gió nhẹ, có người đọc.",
  "Có những bản tin, chỉ cần một người đọc là đủ."];
const BRIEF = `Phim ngắn kể chuyện, tiếng Việt.\n\nLời đọc: dùng đúng nguyên văn kịch bản dưới đây, giọng trầm.\n\nNhạc: synth analog chậm.\n\nKịch bản lời đọc:\n${SCRIPT.join("\n")}`;

test("T24-1: the whole brief reaches Claude; one past the app's limit says where it was cut", () => {
  const long = `${"x".repeat(4100)} Cháu là Thảo.`;
  assert.equal(briefText(long), long, "a 4,100-character brief is no longer cut at 4,000");
  assert.equal(projects.BRIEF_MAX, 20000);
  const over = briefText("y".repeat(20010));
  assert.match(over, /^y{20000}\n\[The app cut the brief here: 10 more characters are not shown\. Tell the owner/);
});

test("T24-1: Prepare is told the owner's script is read word for word, and changing it is asked", () => {
  const line = voiceLine({}, T);
  assert.match(line, /read word for word: docs\/VOICEOVER\.md holds every line of it as the owner wrote it/);
  assert.match(line, /moving lines to the screen is a conflict \(moworks-studio §2b\)/);
  assert.match(line, /Never call a script you changed "verbatim"/);
  const house = readFileSync(join(import.meta.dirname, "..", "config", "rules", "moworks-studio", "SKILL.md"), "utf8");
  assert.match(house, /version: 1\.3\.\d+/);
  assert.match(house, /a script the owner wrote for the voice-over[\s\S]*?it is read word for word unless the owner chooses otherwise/);
  const story = readFileSync(join(import.meta.dirname, "..", "config", "rules", "general-style", "references", "story.md"), "utf8");
  assert.match(story, /read it word for word, every line/);
});

test("T24-1: the script block of a brief, and the lines the words to read leave out", () => {
  assert.deepEqual(briefScript(BRIEF), SCRIPT, "the heading's lines, not the instruction line that goes on after its colon");
  assert.deepEqual(briefScript("**Voice-over script:**\n1. \"Hello there.\"\n2. Goodbye now.\n\nMusic: calm."), ["Hello there.", "Goodbye now."]);
  assert.deepEqual(briefScript("Lời đọc: giọng nữ, đọc chậm.\nMột dòng."), [], "an instruction, not a script");
  const d = join(T, "gap");
  mkdirSync(d, { recursive: true });
  assert.equal(scriptGap(d, BRIEF), null, "no words to read yet");
  // Test 24: the first lines only, the rest "told by typing"; the line cut mid-way counts as changed
  writeFileSync(join(d, "VOICEOVER.md"), `${SCRIPT.slice(0, 3).join("\n")}\nAi đó trong đất liền đang gõ, rất nhanh.\n`);
  const g = scriptGap(d, BRIEF);
  assert.equal(g.total, 7);
  assert.deepEqual(g.left, SCRIPT.slice(3));
  // every line there, split differently and with other punctuation: read as written
  writeFileSync(join(d, "VOICEOVER.md"), `# Words to read\n${SCRIPT.join(" ").replace("Máy đáp: đã nhận.", "Máy đáp — đã nhận.").replace(/\. /g, ".\n")}\n`);
  assert.equal(scriptGap(d, BRIEF), null);
  writeFileSync(join(d, "VOICEOVER.md"), SCRIPT.map((l) => l.replace("rất nhanh", "thật nhanh")).join("\n"));
  assert.deepEqual(scriptGap(d, BRIEF).left, [SCRIPT[3]], "a reworded line is not the owner's");
});

test("T24-1: Prepare left lines of the owner's script out without asking: Claude puts them back or asks, once; then the owner is told", async () => {
  const dir = join(T, "work", "projects", "demo-t24-script");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "index.html"), '<div data-composition-id="root" data-fps="24"></div>');
  writeFileSync(join(dir, "VOICEOVER.md"), SCRIPT.slice(0, 4).join("\n"));
  const p = projects.openProject(dir);
  projects.updateMeta(p.id, (m) => { m.brief = { text: BRIEF, mode: "idea", editedAt: "2026-10-29T15:59:01.342Z" }; });
  const started = [];
  let asking = false;
  const ctx = { root: T, renders: createRenderQueue(), agent: { running: new Map(), start: async (_id, t) => { started.push(t); return { id: `fix${started.length}` }; } },
    pipelineOf: async () => ({ p: projects.getProject(p.id), facts: {}, state: [{ id: "brief", stage: 1, status: "done", ...(asking ? { asking: true } : {}) }] }),
    startQa: () => null, mix: {} };
  const ap = createAutopilot(ctx);
  await ap.taskEnded(p.id, { id: "prep", status: "done", step: "brief" });
  assert.equal(started.length, 1, "one fix task");
  assert.equal(started[0].step, "brief");
  assert.match(started[0].text, /VOICEOVER\.md leaves out or changes 3 of them: "Máy in kêu lạch cạch\."/);
  assert.match(started[0].text, /ask the owner in one message with the choices \(the whole script as written first\)/);
  assert.equal(projects.getProject(p.id).meta.pipeline.scriptFix.taskId, "fix1");
  // the fix task ended and the words are still short: the owner is told once, in plain words, as a warning the chat shows
  await ap.taskEnded(p.id, { id: "fix1", status: "done", step: "brief" });
  await ap.taskEnded(p.id, { id: "fix1", status: "done", step: "brief" });
  assert.equal(started.length, 1, "Claude is asked once per brief");
  const told = projects.readNotes(dir).filter((n) => n.kind === "voice" && n.status === "warning");
  assert.equal(told.length, 1);
  assert.match(told[0].text, /still leave out \{n\} of the \{total\} lines of the script in your brief: \{lines\}\. Check the Script box on the Voice screen/);
  assert.deepEqual([told[0].vars.n, told[0].vars.total], [3, 7]);
  assert.doesNotMatch(JSON.stringify(told[0]), /[A-Z]:\\|VOICEOVER\.md/, "no paths, no file names");
  // Claude asked instead (the step is asking): nothing is started for a new brief either
  projects.updateMeta(p.id, (m) => { m.brief.editedAt = "2026-10-30T01:00:00.000Z"; });
  asking = true;
  await ap.taskEnded(p.id, { id: "prep2", status: "done", step: "brief" });
  assert.equal(started.length, 1, "a step that asks the owner is left to the owner's answer");
  // the whole script in the words to read: nothing to do
  asking = false;
  writeFileSync(join(dir, "VOICEOVER.md"), SCRIPT.join("\n"));
  await ap.taskEnded(p.id, { id: "prep3", status: "done", step: "brief" });
  assert.equal(started.length, 1);
});

test("T24-2: a voice-over that could not be made is said in plain words; a failure that may pass is tried once more", async () => {
  const { PROVIDERS, retryOnce, transient, ttsFailedText } = await import("../packages/voice/tts.mjs");
  const realFetch = globalThis.fetch;
  try {
    // Node's "fetch failed", in plain words from its cause
    globalThis.fetch = async () => { throw Object.assign(new TypeError("fetch failed"), { cause: { code: "ECONNRESET" } }); };
    const e = await PROVIDERS.elevenlabs.models("k").catch((x) => x);
    assert.equal(e.code, "PROVIDER_OFFLINE");
    assert.equal(e.message, "Could not reach the service (the connection was cut)");
    assert.equal(ttsFailedText(e, "ElevenLabs"), "The voice-over could not be made: could not reach ElevenLabs (the connection was cut). Try again.");
    assert.equal(ttsFailedText({ message: "The key was refused (check it in Settings)" }, "ElevenLabs"), "The voice-over could not be made: the key was refused (check it in Settings). Try again.");
    assert.equal(ttsFailedText({ message: "Too many requests; try again in a minute" }), "The voice-over could not be made: too many requests; try again in a minute.");
    assert.equal(ttsFailedText({ message: "The service answered 502" }, "Fish Audio"), "The voice-over could not be made: Fish Audio answered 502. Try again.");
    // tried once more after a failure that may pass; a refusal or a stop is not
    assert.equal(transient(e), true);
    assert.equal(transient({ code: "PROVIDER", status: 503 }), true);
    assert.equal(transient({ code: "PROVIDER", status: 401 }), false);
    let n = 0;
    assert.equal(await retryOnce(async () => { if (++n === 1) throw e; return "ok"; }, { waitMs: 1 }), "ok");
    assert.equal(n, 2);
    n = 0;
    await assert.rejects(retryOnce(async () => { n++; throw e; }, { waitMs: 1 }), /Could not reach/);
    assert.equal(n, 2, "once more, not again and again");
    n = 0;
    await assert.rejects(retryOnce(async () => { n++; throw Object.assign(new Error("The key was refused"), { code: "PROVIDER", status: 401 }); }, { waitMs: 1 }), /refused/);
    assert.equal(n, 1, "a refusal is not tried again");
    const stop = new AbortController(); stop.abort(); n = 0;
    await assert.rejects(retryOnce(async () => { n++; throw e; }, { signal: stop.signal, waitMs: 1 }));
    assert.equal(n, 1, "never after the user stopped it");
  } finally { globalThis.fetch = realFetch; }
});

test("T24-2: the Storyboard's wait says the voice-over could not be made, never quietly back to 'make the voice-over'", async () => {
  const pipe = await import("../packages/pipeline/index.mjs");
  const d = join(T, "tts-failed");
  mkdirSync(d, { recursive: true });
  writeFileSync(join(d, "VOICEOVER.md"), "Một dòng.\nDòng hai.");
  assert.equal(pipe.voiceWaitOf(d, { voice: { source: "elevenlabs" } }), "make");
  const failed = { voice: { source: "elevenlabs", ttsFailed: { at: "2026-10-29T16:04:33Z", message: "The voice-over could not be made: could not reach ElevenLabs (the connection was cut). Try again." } } };
  assert.equal(pipe.voiceWaitOf(d, failed), "ttsFailed");
  assert.equal(pipe.voiceWaitOf(d, failed, (k) => k === "tts"), "words", "a new try at work");
  assert.equal(pipe.voiceWaitOf(d, { voice: { ...failed.voice, noVoice: { at: "x" } } }), null, "No voice-over still goes on");
  assert.equal(pipe.VOICE_WAITS.ttsFailed, "Waiting for you: the voice-over could not be made, try again");
  // the server's job: tried once more, then said in the Voice box (ttsFailed), the chat (an error note) and the step
  const src = readFileSync(join(import.meta.dirname, "..", "packages", "server", "production.mjs"), "utf8");
  assert.match(src, /retryOnce\(\(\) => PROVIDERS\[provider\]\.generate/);
  assert.match(src, /m\.voice = \{ \.\.\.\(m\.voice \?\? \{\}\), ttsFailed: \{ at: [^}]*message: said \} \}/);
  assert.match(src, /note\(p, \{ kind: "voice", status: "error", text: said \}\)/);
});

test("T24-4: on-screen Vietnamese written without its marks is found and named, in pages and in a canvas film's code; English is not", async () => {
  const { viMarks, gateViMarks, viMarksText, vocabulary, unmarkedWords } = await import("../packages/hf-qa/viMarks.mjs");
  const film = (name, lang, files) => {
    const d = join(T, name);
    for (const [rel, text] of Object.entries(files)) { const f = join(d, ...rel.split("/")); mkdirSync(join(f, ".."), { recursive: true }); writeFileSync(f, text); }
    mkdirSync(join(d, ".moworks"), { recursive: true });
    writeFileSync(join(d, ".moworks", "project.json"), JSON.stringify({ language: lang ? { id: lang } : undefined, brief: { text: "Bản tin cho một người. Trạm khí tượng trên đảo Hòn Gió, chiều nay." } }));
    return d;
  };
  // Test 24's strips, as a canvas film would write them, beside the same words with their marks and a few English lines
  const d = film("crt", "vi", {
    "STORYBOARD.md": "## Frame 1\n- scene: dải \"NHẬT KÝ · TRẠM HÒN GIÓ\"; \"CHƯA GỬI\"; \"THÔNG BÁO TỪ ĐẤT LIỀN\", \"TIN HỆ THỐNG\"\n",
    "index.html": '<div data-composition-id="root"><canvas id="film"></canvas><p class="lt">TO BE CONTINUED</p></div><script src="compositions/lemo/film.js"></script>',
    "compositions/lemo/film.js": [
      "const FONT = 'VT323, monospace';",
      "headerBar(L, 'NHAT KY · TRAM HON GIO', '1985', 0.72);",
      "put(L, 3, 17, pad(' 18:00 · CHIỀU NAY · TRẠM HÒN GIÓ', 74, 'CHUA GUI '), 0.9, { inv: 1 });",
      "put(L, 2, 1, pad(' THONG BAO TU DAT LIEN', 56, 'TIN HE THONG '), 0.85, { inv: 1 });",
      "// 'NHAT KY' in a comment is never drawn",
      "const id = 'tram-hon-gio', key = 'THE END', mode = 'source-over';",
      "const ok = 'ĐÃ NHẬN.';",
    ].join("\n"),
  });
  const r = viMarks(d);
  assert.deepEqual(r.findings.map((x) => [x.text, x.words.join(" ")]), [
    ["NHAT KY · TRAM HON GIO", "NHAT KY TRAM HON GIO"],
    ["CHUA GUI", "CHUA GUI"],
    ["THONG BAO TU DAT LIEN", "THONG BAO TU DAT LIEN"],
    ["TIN HE THONG", "HE THONG"],
  ], "the marked strip, the comment, the slug, the English lines and \"ĐÃ NHẬN.\" are not taken");
  assert.equal(r.findings[0].file, "compositions/lemo/film.js");
  assert.equal(r.findings[0].line, 2);
  const g = gateViMarks(d);
  assert.deepEqual([g.id, g.blocking, g.pass, g.warnings], ["G-VI-MARKS", false, false, 4], "a warning, never a block");
  assert.equal(g.findings[1].message, "\"CHUA GUI\" is Vietnamese written without its marks (CHUA, GUI)");
  assert.doesNotMatch(g.findings.map((x) => x.message).join(" "), /film\.js|compositions/, "the Tech checks' words carry no paths");
  assert.match(viMarksText(r), /^Vietnamese written without its marks[^\n]*moworks-studio §4[\s\S]*- "NHAT KY · TRAM HON GIO" is Vietnamese written without its marks \(NHAT, KY, TRAM, HON, GIO\) \(compositions\/lemo\/film\.js:2\)/);
  // an English film, or one whose language is not Vietnamese: nothing
  assert.equal(gateViMarks(film("en", "en", { "index.html": '<div data-composition-id="root"><h1>NHAT KY TRAM</h1></div>' })), null);
  // a page's own text, with the marks there: nothing; the same text without them: found
  const ok = film("page-ok", "vi", { "index.html": '<div data-composition-id="root"><h1>Bản tin cho một người</h1><p>Trạm Hòn Gió &middot; chiều nay</p></div>' });
  assert.equal(viMarks(ok).findings.length, 0);
  const bad = film("page-bad", "vi", { "index.html": '<div data-composition-id="root"><h1>Bản tin cho một người</h1><p>BAN TIN CHO MOT NGUOI</p><script>const s = "NHAT KY TRAM";</script></div>' });
  assert.deepEqual(viMarks(bad).findings.map((x) => x.text), ["BAN TIN CHO MOT NGUOI"], "a page's script is not its text");
  // the word list alone: a word the film writes with no marks in a marked sentence ("chiều nay", "bản tin") never counts
  const v = vocabulary(["chiều nay, bản tin"]);
  assert.deepEqual(unmarkedWords("CHIEU NAY", v), [], "one word without its marks: too little to say");
  assert.deepEqual(unmarkedWords("THE END", v), []);
  assert.deepEqual(unmarkedWords("TO BE CONTINUED", v), []);
});

test("T24-4: the Build and the Review are told never to drop the marks, and the Review's sheets carry the check", async () => {
  const { filmLanguageLine } = await import("../packages/agent/index.mjs");
  assert.match(filmLanguageLine({ language: { id: "vi" } }, "build"), /an ASCII, CRT, monospace, pixel or all-caps look is never a reason to drop them/);
  assert.match(filmLanguageLine({ language: { id: "vi" } }, "build"), /a band, strip, highlight or inverted cell behind the text leaves room for the marks/);
  assert.doesNotMatch(filmLanguageLine({ language: { id: "en" } }, "build"), /marks/);
  const rules = (p) => readFileSync(join(import.meta.dirname, "..", "config", "rules", ...p.split("/")), "utf8");
  assert.match(rules("moworks-studio/SKILL.md"), /Vietnamese is always written with its marks, in every style/);
  assert.match(rules("moworks-qc/SKILL.md"), /version: 1\.1\.\d+[\s\S]*every mark of every Vietnamese word on every sheet/);
  const boards = readFileSync(join(import.meta.dirname, "..", "packages", "server", "boards.mjs"), "utf8");
  assert.match(boards, /qcText\(res, fresh\), pose, glyphText\(codeGlyphs\(project\.path\)\), viMarksText\(viMarks\(project\.path\)\)/);
  const gates = readFileSync(join(import.meta.dirname, "..", "packages", "hf-qa", "gates.mjs"), "utf8");
  assert.match(gates, /gateCodeGlyphs\(projectDir\), gateViMarks\(projectDir\)/);
});

// T24-8: Openverse's search hung (15-20 s a query) and none of the film's named cues got a sound
const sfx = await import("../packages/sfx/index.mjs");
const hang = (calls) => (url, { signal } = {}) => {
  if (!String(url).startsWith(sfx.OPENVERSE)) return Promise.resolve(new Response(readFileSync(sfx.bundled()[0].file)));
  calls.push(url);
  return new Promise((_, no) => signal?.addEventListener("abort", () => no(signal.reason ?? new Error("aborted"))));
};
const T24_NAMES = ["crt power on", "teletype ticks", "keyboard typing", "keyboard typing slow", "heavy enter key", "bell ding", "switch click",
  "crt power off", "fast keyboard typing", "dot matrix printer", "waves wind ambience"];

test("T24-8a: Test 24's sound names get a close built-in sound while the search is down", () => {
  const b = sfx.bundled();
  const near = Object.fromEntries(T24_NAMES.map((n) => [n, sfx.nearBundled(n, b)?.title ?? null]));
  assert.deepEqual(near, {
    "crt power on": "click", "teletype ticks": "click", "keyboard typing": "typing", "keyboard typing slow": "typing", "heavy enter key": "key-press",
    "bell ding": "chime", "switch click": "click", "crt power off": "click", "fast keyboard typing": "typing", "dot matrix printer": "typing",
    "waves wind ambience": null,
  });
});

test("T24-8c: each search has a short time limit, and a placement stops asking once the search is down", async () => {
  assert.ok(sfx.SEARCH_TIMEOUT_MS >= 6000 && sfx.SEARCH_TIMEOUT_MS <= 8000, "about 6-8 s");
  assert.ok(sfx.DOWN_AFTER >= 2 && sfx.DOWN_AFTER <= 3);
  const d = join(T, "sfx-down"); mkdirSync(d, { recursive: true });
  const calls = [], t0 = Date.now();
  const r = await sfx.resolveCues(d, T24_NAMES.map((name) => ({ name })), { fetchImpl: hang(calls), timeoutMs: 60 });
  assert.ok(calls.length <= 6, `${calls.length} searches, not 22 (11 names, each twice): none after three failed in a row`);
  assert.ok(Date.now() - t0 < 5000, "a down search does not hold the Final Mix for minutes");
  assert.equal(r.offline, true);
  assert.deepEqual(r.missing, ["waves wind ambience"]);
  assert.deepEqual(r.failed, ["waves wind ambience"], "said as left out because the search did not answer");
  assert.equal(r.near.length, 10, "every other name has a built-in stand-in");
  // (d) said in plain words
  const n = sfx.placedNote({ ...r, placed: 12, names: [...T24_NAMES.slice(0, 10), "typing"] });
  const said = n.text.replace(/\{(\w+)\}/g, (m, k) => n.vars[k]);
  assert.equal(n.status, "warning");
  assert.match(said, /A close built-in sound stands in for now: "crt power on" \(click\), "teletype ticks" \(click\), "keyboard typing" \(typing\)/);
  assert.match(said, /"heavy enter key" \(key-press\)/);
  assert.match(said, /"bell ding" \(chime\)/);
  assert.match(said, /Left out because the sound search did not answer: "waves wind ambience"/);
});

test("T24-8b: an automatic cue fills where a named cue near it got no sound; T24-9: no whoosh of the app's own in a style whose sounds have none", async () => {
  const { autoSfx, mixCues, whooshAllowed } = await import("../packages/sfx/auto.mjs");
  const d = join(T, "sfx-mix"); mkdirSync(d, { recursive: true });
  writeFileSync(join(d, "index.html"), '<div data-composition-id="root" data-width="1920" data-height="1080" data-duration="8">\n</div>');
  // shot 2 is typed 1 s in; its frame names "heartbeat" there, which neither the app's library nor a stand-in has while the search is
  // down ("waves wind ambience" of Test 24 is now found in the offline library)
  const shots = [{ number: 1, index: 0, start: 0, duration: 4, sfx: "crt power on" },
    { number: 2, index: 1, start: 4, duration: 4, sfx: "heartbeat@1", transitionIn: "wipe to the mainland screen", location: "mainland" }];
  shots[0].location = "island";
  const plan = { shots: [{ shot: 2, motions: [{ type: "text", start: 1, target: "Thảo's message", behavior: "types out fast" }] }] };
  assert.deepEqual(mixCues(shots, plan).map((c) => c.name), ["crt power on", "whoosh", "heartbeat"], "before the sounds are known: the named one wins over the typing at its moment");
  const calls = [];
  const r = await autoSfx(d, shots, plan, { fetchImpl: hang(calls), timeoutMs: 60, whoosh: true });
  assert.deepEqual(r.names.sort(), ["crt power on", "typing", "whoosh"], "the typing comes back where the named sound found none");
  assert.deepEqual(r.missing, ["heartbeat"]);
  assert.ok(!r.added.includes("crt power on") || readFileSync(join(d, ".moworks", "sfx.json"), "utf8").includes('"source": "library"'), "the named CRT sound from the app's library, no search");
  // T24-9: the style's palette names relays, keys and a printer, no whoosh: the app adds none
  const crt = readFileSync(join(import.meta.dirname, "..", "bundle", "styles", "lemo-opuscar", "styles", "ascii-crt", "STYLE.md"), "utf8");
  const palette = /^## 7\. Sound palette\n([\s\S]*?)^## /m.exec(crt.replace(/\r\n/g, "\n"))?.[1] ?? "";
  assert.ok(palette.length > 200);
  assert.equal(whooshAllowed(palette), false, "ASCII / CRT: relays, keys, teletype, BEL, a printer");
  assert.equal(whooshAllowed(""), true, "a style with no sound section keeps the whoosh");
  assert.equal(whooshAllowed("- Foley: whoosh on wipes, flap clicks"), true);
  assert.equal(whooshAllowed("- Foley: brush air (band-passed noise, never a metal whoosh)"), false);
  const d2 = join(T, "sfx-crt"); mkdirSync(d2, { recursive: true });
  writeFileSync(join(d2, "index.html"), '<div data-composition-id="root" data-width="1920" data-height="1080" data-duration="8">\n</div>');
  const r2 = await autoSfx(d2, shots, plan, { fetchImpl: hang([]), timeoutMs: 60, whoosh: whooshAllowed(palette) });
  assert.ok(!r2.names.includes("whoosh"), r2.names.join(", "));
  const boards = readFileSync(join(import.meta.dirname, "..", "packages", "server", "boards.mjs"), "utf8");
  assert.match(boards, /const whoosh = whooshAllowed\(styleSound\(p\.meta, root\) \?\? ""\);/);
});

test("T22-2: the app's own files are never files the user added; Claude's own writes are remembered as the app's", async () => {
  const { appMade, listAssets } = await import("../packages/project-service/assets.mjs");
  const dir = join(T, "work", "projects", "demo-t22-files");
  mkdirSync(join(dir, "assets", "3_audio", "voiceover"), { recursive: true });
  mkdirSync(join(dir, "assets", "1_design", "images"), { recursive: true });
  writeFileSync(join(dir, "index.html"), '<div data-composition-id="root" data-duration="10"></div>');
  const p = projects.openProject(dir);
  listAssets(dir, { meta: {} });          // the first look: everything there is seen
  const vo = "assets/3_audio/voiceover/elevenlabs-2026-10-29T16-38-02-118Z.mp3";
  writeFileSync(join(dir, ...vo.split("/")), "mp3");
  writeFileSync(join(dir, "assets", "1_design", "images", "logo.png"), "png");
  writeFileSync(join(dir, "assets", "1_design", "images", "map.svg"), "<svg/>");
  assert.ok(appMade(dir, {}).has(vo), "a voice service's file, by its name, before the voice is even recorded in the project");
  // Claude wrote map.svg in its task: remembered when the task ends
  const ap = createAutopilot({ root: T, renders: createRenderQueue(), agent: { running: new Map(), start: async () => ({ id: "x" }) },
    pipelineOf: async () => ({ p: projects.getProject(p.id), facts: {}, state: [] }), startQa: () => null, mix: {} });
  await ap.taskEnded(p.id, { id: "c1", status: "done", step: null, changed: [{ path: "assets/1_design/images/map.svg" }] });
  const fresh = listAssets(dir, { meta: { voice: { source: "elevenlabs", file: vo } } }).fresh;
  assert.deepEqual(fresh, ["assets/1_design/images/logo.png"], "only the user's own file is new");
  // the autopilot sends nothing in the user's name (the server's own route marks the voice before writing it too)
  const src = readFileSync(join(import.meta.dirname, "..", "packages", "server", "autopilot.mjs"), "utf8");
  assert.doesNotMatch(src, /I added \$\{/);
  assert.match(readFileSync(join(import.meta.dirname, "..", "packages", "server", "production.mjs"), "utf8"), /rememberAssets\(p\.path, \[relativeTo\(p\.path, out\)\]\);[^\n]*\n\s*const again/);
});
