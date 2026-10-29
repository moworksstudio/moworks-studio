// Backend: service keys (DPAPI, never returned), speech-to-text model cards and install (checksums), transcript editing that keeps
// timing and is saved through HyperFrames' own import, voice-over upload (transcription first), Export (checks then the render worker),
// Checks (report + contact sheet) and the job list. A real transcription needs an installed model (MW_TEST_ASR=1 with the kit's Whisper).
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createServer } from "node:http";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const T = mkdtempSync(join(tmpdir(), "mw-prod-"));
process.env.MW_WORK_ROOT = join(T, "work");
process.env.MW_STATE_DIR = join(T, "state");
process.env.MW_MODELS_ROOT = join(T, "models");
process.env.MW_NO_BACKUP = "1";
process.env.MW_NO_LIBRARY_IMPORT = "1";
process.env.MW_BACKUP_ROOT = join(T, "backup");
const { startServer } = await import("../packages/server/index.mjs");
const { scaffold } = await import("../packages/hf-edit/scaffold.mjs");
const { expandEnv, loadPins, APP_ROOT } = await import("../packages/version-manager/index.mjs");
const secrets = await import("../packages/secrets/index.mjs");
const transcript = await import("../packages/voice/transcript.mjs");
const asr = await import("../packages/voice/asr.mjs");
const projects = await import("../packages/project-service/index.mjs");

let s, id, dir, wav;
const H = { "X-MW-Token": "k" };
const api = async (method, path, body, headers = {}) => {
  const r = await fetch(`http://127.0.0.1:${s.port}/api${path}`, { method, headers: { ...H, ...(body !== undefined ? { "Content-Type": "application/json" } : {}), ...headers },
    body: body === undefined ? undefined : JSON.stringify(body) });
  return { status: r.status, json: await r.json().catch(() => null) };
};
const waitJob = async (jid, ms = 240000) => {
  const t0 = Date.now();
  for (;;) { const j = (await api("GET", `/jobs/${jid}`)).json; if (j.status !== "running") return j; if (Date.now() - t0 > ms) throw new Error(`job ${jid} still running`); await new Promise((r) => setTimeout(r, 1000)); }
};

before(async () => {
  s = await startServer({ token: "k" });
  dir = join(T, "work", "projects", "demo");
  await scaffold(dir, readFileSync(join(import.meta.dirname, "fixtures", "storyboard", "STORYBOARD.md"), "utf8"), { registryRoot: expandEnv(loadPins().hyperframes.registryRoot) });
  id = (await api("POST", "/projects/open", { path: dir })).json.id;
  wav = join(T, "tone.wav");     // 1.5 s test tone made with the pinned FFmpeg
  execFileSync(join(expandEnv(loadPins().ffmpeg.dir), "ffmpeg.exe"), ["-v", "error", "-f", "lavfi", "-i", "sine=frequency=440:duration=1.5", "-ac", "1", wav], { windowsHide: true });
});
after(async () => { await s.close(); rmSync(T, { recursive: true, force: true }); });   // the opt-in Whisper download lives here too

test("service keys: encrypted for this Windows account, never returned by the API", async () => {
  const put = await api("PUT", "/voice/keys/elevenlabs", { value: "sk_test_secret_123" });
  assert.equal(put.status, 200);
  assert.equal(put.json.saved, true);
  const raw = readFileSync(join(T, "state", "secrets.json"), "utf8");
  assert.ok(!raw.includes("sk_test_secret_123"), "no plain key on disk");
  assert.equal(secrets.getSecret("elevenlabs"), "sk_test_secret_123");
  const settings = await api("GET", "/voice/settings");
  assert.ok(!JSON.stringify(settings.json).includes("sk_test_secret_123"), "no key in API answers");
  assert.deepEqual(Object.keys(settings.json.keys), ["elevenlabs", "fishaudio"]);
  assert.equal((await api("PUT", "/voice/keys/elevenlabs", { value: "  " })).status, 400);
  assert.equal((await api("PUT", "/voice/keys/other", { value: "x" })).status, 404);
  assert.equal((await api("POST", "/voice/keys/elevenlabs/clear")).json.saved, false);
  assert.equal((await api("POST", "/voice/keys/fishaudio/test")).status, 400, "test needs a saved key");
});

test("speech-to-text models: cards with size, source and engine state; unknown model refused", async () => {
  const { json } = await api("GET", "/voice/settings");
  const w = json.models.find((m) => m.id === "whisper-turbo");
  assert.equal(w.size, 1621665983);
  assert.equal(w.installed, false);
  assert.match(w.source, /deepdml\/faster-whisper-large-v3-turbo-ct2\/tree\/4df90f7/);
  assert.deepEqual(json.models.map((m) => m.id), ["whisper-turbo"], "Parakeet and EraX dropped after the owner's test (16/10); Small dropped (D43, D61: Turbo only)");
  assert.ok(json.models.every((m) => m.note), "each model says what it is good for");
  assert.equal(json.settings.defaultModel, "whisper-turbo", "the winner of the owner's voice-over test");
  assert.equal((await api("POST", "/voice/models/nope/install", {})).status, 404);
  assert.equal((await api("PATCH", "/voice/settings", { defaultModel: "nope" })).status, 400);
});

test("model install: downloaded from its pinned URL, every file checked against its SHA-256; a wrong file is not kept", async () => {
  // a tiny model served by a local server in a temporary app root, so the real Hugging Face download is not needed here
  const body = Buffer.from("model weights");
  const srv = createServer((req, res) => { if (req.url === "/w.bin") { res.writeHead(200, { "Content-Length": body.length }); res.end(body); } else { res.writeHead(404); res.end(); } });
  await new Promise((r) => srv.listen(0, "127.0.0.1", r));
  try {
    const R = join(T, "approot");
    mkdirSync(join(R, "config"), { recursive: true });
    writeFileSync(join(R, "config", "pins.json"), readFileSync(join(APP_ROOT, "config", "pins.json")));
    const card = (sha, file = "w.bin") => ({ models: [{ id: "tiny", engine: "faster-whisper", label: "Tiny", short: "Tiny", languages: "-", licence: "MIT", author: "test", source: "https://example.invalid", dir: "tiny",
      runtime: { python: ["json"], size: "-", install: null }, files: [{ to: "w.bin", size: body.length, sha256: sha, url: `http://127.0.0.1:${srv.address().port}/${file}` }] }] });
    writeFileSync(join(R, "config", "asr-models.json"), JSON.stringify(card("0".repeat(64))));
    await assert.rejects(asr.install("tiny", { root: R }), { code: "CHECKSUM" });
    assert.ok(!existsSync(join(T, "models", "tiny", "w.bin")) && !existsSync(join(T, "models", "tiny", "w.bin.partial")));
    writeFileSync(join(R, "config", "asr-models.json"), JSON.stringify(card(createHash("sha256").update(body).digest("hex"), "missing.bin")));
    await assert.rejects(asr.install("tiny", { root: R }), { code: "DOWNLOAD" });
    writeFileSync(join(R, "config", "asr-models.json"), JSON.stringify(card(createHash("sha256").update(body).digest("hex"))));
    const done = await asr.install("tiny", { root: R });
    assert.equal(done.installed, true);
    assert.equal(JSON.parse(readFileSync(join(T, "models", "tiny", "MODEL.json"), "utf8")).installedFrom, "download");
    asr.remove("tiny", R);
    assert.ok(!existsSync(join(T, "models", "tiny")));
  } finally { srv.close(); }
});

test("long Whisper segments are split at sentence ends and pauses, with exact word timing", () => {
  const w = (text, start, end) => ({ text, start, end, p: 0.9 });
  const one = { start: 0, end: 12, text: "x", words: [w("Chưa", 0, 0.3), w("cao", 0.3, 0.6), w("điểm.", 0.6, 1), w("Làm", 1.1, 1.3), w("sao", 1.3, 1.5), w("đây?", 1.5, 2),
    w("Trà", 3, 3.2), w("ngoài", 3.2, 3.5), w("ăn", 3.5, 3.7), w("thôi", 3.7, 12)] };
  const out = asr.resegment([one]);
  assert.deepEqual(out.map((x) => x.text), ["Chưa cao điểm.", "Làm sao đây?", "Trà ngoài ăn thôi"]);
  assert.deepEqual(out.map((x) => [x.start, x.end]), [[0, 1], [1.1, 2], [3, 12]]);
  assert.deepEqual(out.map((x) => x.id), ["s1", "s2", "s3"]);
  const short = { start: 0, end: 2, text: "Xin chào", words: [w("Xin", 0, 1), w("chào", 1, 2)] };
  assert.deepEqual(asr.resegment([short]), [{ ...short, id: "s1" }], "short segments stay as they are");
  const many = { start: 0, end: 6, text: "x", words: Array.from({ length: 20 }, (_, i) => w(`từ${i}`, i * 0.3, i * 0.3 + 0.3)) };
  assert.ok(asr.resegment([many]).every((x) => x.words.length <= 16), "no segment over 16 words");
});

test("transcript edits keep timing: same word count keeps each word's time, otherwise spread over the segment", () => {
  const seg = { start: 1, end: 2, text: "kids own tests", words: [{ text: "kids", start: 1, end: 1.3, p: 0.4 }, { text: "own", start: 1.3, end: 1.6, p: 0.9 }, { text: "tests", start: 1.6, end: 2, p: 0.9 }] };
  assert.deepEqual(transcript.wordsFor({ ...seg, text: "kit's own tests" }).map((w) => [w.text, w.start, w.end]), [["kit's", 1, 1.3], ["own", 1.3, 1.6], ["tests", 1.6, 2]]);
  const spread = transcript.wordsFor({ ...seg, text: "các bài kiểm tra" });
  assert.equal(spread.length, 4);
  assert.equal(spread[0].start, 1);
  assert.equal(spread.at(-1).end, 2);
  assert.ok(spread.every((w, i) => i === 0 || w.start >= spread[i - 1].end - 1e-9));
  assert.equal(transcript.wordsFor({ ...seg, text: "kids  own\ntests" }), seg.words, "whitespace only: words unchanged");
  assert.equal(transcript.wordsFor({ ...seg, text: "Tiếng" })[0].text, "Tiếng", "NFC");
});

test("voice-over upload: stored in assets/3_audio/voiceover, transcription first (no model here -> said so), audio and waveform served", async () => {
  const r = await fetch(`http://127.0.0.1:${s.port}/api/projects/${id}/voice/upload`, { method: "POST", headers: { ...H, "X-File-Name": encodeURIComponent("Giọng đọc.wav"), "Content-Type": "application/octet-stream" }, body: readFileSync(wav) });
  const j = await r.json();
  assert.equal(r.status, 200, JSON.stringify(j));
  assert.equal(j.voice.file, "assets/3_audio/voiceover/Giọng đọc.wav");
  assert.equal(j.voice.info.duration, 1.5);
  assert.equal(j.job, null);
  assert.match(j.needsModel, /not installed/);
  assert.ok(existsSync(join(dir, "assets", "3_audio", "voiceover", "Giọng đọc.wav")));
  const bad = await fetch(`http://127.0.0.1:${s.port}/api/projects/${id}/voice/upload`, { method: "POST", headers: { ...H, "X-File-Name": "notes.txt" }, body: "hello" });
  assert.equal(bad.status, 400);
  const fake = await fetch(`http://127.0.0.1:${s.port}/api/projects/${id}/voice/upload`, { method: "POST", headers: { ...H, "X-File-Name": "fake.mp3" }, body: "not audio" });
  assert.equal(fake.status, 400);
  assert.ok(!existsSync(join(dir, "assets", "3_audio", "voiceover", "fake.mp3")) && !existsSync(join(dir, "assets", "3_audio", "voiceover", "fake.mp3.part")));
  const audio = await fetch(`http://127.0.0.1:${s.port}/api/projects/${id}/voice/audio`, { headers: H });
  assert.equal(audio.headers.get("content-type"), "audio/wav");
  assert.equal(Buffer.from(await audio.arrayBuffer()).length, readFileSync(wav).length);
  assert.equal((await fetch(`http://127.0.0.1:${s.port}/api/projects/${id}/voice/audio`)).status, 401, "the audio needs the token");
  const pk = (await api("GET", `/projects/${id}/voice/peaks`)).json.peaks;
  assert.ok(pk.length > 100 && Math.max(...pk) === 1);
  const v = (await api("GET", `/projects/${id}/voice`)).json;
  assert.equal(v.voice.transcript.status, "pending");
  assert.equal((await api("POST", `/projects/${id}/voice/transcribe`, {})).status, 409, "no model installed");
  assert.equal((await api("POST", `/projects/${id}/voice/tts`, { provider: "elevenlabs", text: "Xin chào" })).status, 400, "no key");
});

test("transcript save goes through HyperFrames: transcript.json with word timings, a revision", async () => {
  transcript.fromEngine(dir, { audio: "assets/3_audio/voiceover/Giọng đọc.wav", result: { model: "whisper-turbo", engine: "faster-whisper", language: "vi", probability: 1, duration: 1.5, device: "cpu",
    segments: [{ id: "s1", start: 0, end: 1.4, text: "Xin chào", words: [{ text: "Xin", start: 0.1, end: 0.5, p: 0.9 }, { text: "chào", start: 0.5, end: 1.2, p: 0.8 }] }] } });
  const r = await api("PUT", `/projects/${id}/voice/transcript`, { segments: [{ id: "s1", start: 0, end: 1.4, text: "Xin chào Việt Nam", words: [{ text: "Xin", start: 0.1, end: 0.5 }, { text: "chào", start: 0.5, end: 1.2 }] }] });
  assert.equal(r.status, 200, JSON.stringify(r.json));
  assert.equal(r.json.words, 4);
  const hf = JSON.parse(readFileSync(join(dir, "transcript.json"), "utf8"));
  assert.deepEqual(hf.map((w) => w.text), ["Xin", "chào", "Việt", "Nam"]);
  assert.equal(hf[0].id, "w0");
  assert.equal(hf.at(-1).end, 1.4);
  assert.equal((await api("GET", `/projects/${id}/voice`)).json.transcript.status, "saved");
  assert.match(execFileSync("git", ["-C", dir, "log", "-1", "--format=%s"], { encoding: "utf8", windowsHide: true }), /Transcript saved/);
  assert.equal((await api("PUT", `/projects/${id}/voice/transcript`, { segments: [{ start: 2, end: 1, text: "x" }] })).status, 400);
});

test("checks: report with plain-language checks, deterministic vs heuristic, and a contact sheet", { timeout: 300000 }, async () => {
  const job = (await api("POST", `/projects/${id}/qa`)).json;
  assert.equal(job.kind, "qa");
  assert.equal((await api("POST", `/projects/${id}/qa`)).status, 409, "one run at a time");
  const seen = new Set();          // the job's own bar moves with the parts of the checks (it stood at 10 % for ~10 min)
  for (let j = job; j.status === "running"; await new Promise((r) => setTimeout(r, 100))) { j = (await api("GET", `/jobs/${job.id}`)).json; seen.add(j.progress); }
  assert.ok([...seen].some((v) => v > 10 && v < 60), `progress seen: ${[...seen].join(", ")}`);
  const done = await waitJob(job.id);
  assert.equal(done.status, "done", JSON.stringify(done.error));
  // since when the checks ran, and how long they took, for the next bar to follow the clock
  assert.ok(done.checksSince && done.checkSince, "the checks' and the last part's start");
  assert.ok(JSON.parse(readFileSync(join(dir, ".moworks", "cache", "qa", "check-time.json"), "utf8")).sec >= 0);
  const { report } = (await api("GET", `/projects/${id}/qa`)).json;
  assert.equal(report.pass, true, JSON.stringify(report.blockingFailures));
  const ids = report.checks.map((c) => c.id);
  for (const g of ["G-HF-LINT", "G-HF-SCRIPT", "G-REMOTE", "G-FONT", "G-GLYPH", "G-BLANK"]) assert.ok(ids.includes(g), g);
  assert.equal(report.checks.find((c) => c.id === "G-BLANK").kind, "heuristic");
  assert.equal(report.checks.find((c) => c.id === "G-FONT").kind, "deterministic");
  assert.equal(report.stills.length, 6, "two stills per shot");
  assert.match(report.stills[0].url, /\/p\/[0-9a-f]+\/\.moworks\/cache\/posters\/qa\//);
  assert.equal((await fetch(report.stills[0].url)).status, 200, "served by the preview origin");
  // the app's own records after the checks (a version, the pre-render's writes under .moworks/) are no change of the film
  const rev = await import("../packages/revisions/index.mjs");
  writeFileSync(join(dir, ".moworks", "after-checks.json"), "{}"); rev.commitAll(dir, "Version: build");
  assert.equal((await api("GET", `/projects/${id}/qa`)).json.changedSince, false);
});

test("export: checks first, then the render worker at the film's own rate (an fps asked for is ignored); Play/Reveal stay inside the project", { timeout: 400000 }, async () => {
  const job = (await api("POST", `/projects/${id}/exports`, { filename: "Phim thử", format: "mp4", quality: "draft", fps: 25 })).json;
  const done = await waitJob(job.id, 380000);
  assert.equal(done.status, "done", JSON.stringify(done.error));
  // the date and time of the render in its name
  const stamped = /[\\/]renders[\\/]\d{6}_Phim thử_\d{4}\.mp4$/;
  assert.match(done.result.file, stamped);
  const filmName = done.result.file.split(/[\\/]/).pop();
  // the checks' results in the project's own folder; renders/ holds only the films
  assert.ok(existsSync(join(done.result.file, "..", "..", ".moworks", "renders", filmName + ".gates.json")));
  assert.ok(!existsSync(done.result.file + ".gates.json"));
  const probe = execFileSync(join(expandEnv(loadPins().ffmpeg.dir), "ffprobe.exe"), ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=r_frame_rate", "-of", "csv=p=0", done.result.file], { encoding: "utf8", windowsHide: true }).trim();
  assert.equal(probe, "30/1", "the project's rate, not the 25 asked for");
  const list = (await api("GET", `/projects/${id}/exports`)).json;
  assert.equal(list.files[0].name, filmName);
  assert.equal((await api("POST", `/projects/${id}/files/reveal`, { path: "../../outside.txt" })).status, 404);
  const again = (await api("POST", `/projects/${id}/exports`, { filename: "Phim thử", quality: "draft", fps: 25 })).json;
  assert.match(again.output, /\d{6}_Phim thử_\d{4,6}(-\d+)?\.mp4$/); assert.notEqual(again.output, done.result.file, "never overwrites");
  assert.ok(!/\(\d+\)/.test(again.output), "never a (2)");
  await api("POST", `/jobs/${again.id}/cancel`);
  const stopped = await waitJob(again.id);
  assert.equal(stopped.status, "cancelled");
  const running = (await api("GET", "/tasks/running")).json;
  assert.ok(Array.isArray(running.jobs));
});

test("a 60 fps film whose index.html lost data-fps (Claude rewrote it) gets it back before checks, render and the AE export", { timeout: 400000 }, async () => {
  const { rootFps, setRootFps, keepRootFps } = await import("../packages/project-service/index.mjs");
  const d60 = join(T, "work", "projects", "demo-60");
  await scaffold(d60, readFileSync(join(import.meta.dirname, "fixtures", "storyboard", "STORYBOARD.md"), "utf8"), { registryRoot: expandEnv(loadPins().hyperframes.registryRoot) });
  assert.equal(setRootFps(d60, 60), true);
  const p60 = (await api("POST", "/projects/open", { path: d60 })).json;
  assert.equal(p60.meta.format.fps, 60);
  const lose = () => { const f = join(d60, "index.html"); writeFileSync(f, readFileSync(f, "utf8").replace(/\s*data-fps="[^"]*"/, "")); assert.equal(rootFps(d60), null); };
  const head = () => execFileSync("git", ["-C", d60, "show", "HEAD:index.html"], { encoding: "utf8", windowsHide: true });
  // the helper the agent runs after each Claude task, checks, render and AE: the project's rate, not 30
  lose();
  assert.equal(keepRootFps({ path: d60, meta: { format: { fps: 60 } } }), 60);
  assert.equal(rootFps(d60), 60);
  // checks: HF's check and the stills read the root's data-fps, so it is back (and committed) before they run
  lose();
  const qa = await waitJob((await api("POST", `/projects/${p60.id}/qa`)).json.id);
  assert.equal(qa.status, "done", JSON.stringify(qa.error));
  assert.equal(rootFps(d60), 60);
  assert.match(head(), /data-composition-id="[^"]*"[^>]*data-fps="60"/, "the preview and HF's player read the committed index.html at 60");
  // render: the film's rate; data-fps is back before the quick check (stopped once it renders, the 30 fps render above covers the rest)
  lose();
  const ex = (await api("POST", `/projects/${p60.id}/exports`, { filename: "Sáu mươi", quality: "draft", fps: 25 })).json;
  assert.equal(ex.settings.fps, 60, "the film's rate, not the 25 asked for");
  for (const t0 = Date.now(); ; ) {
    const j = (await api("GET", `/jobs/${ex.id}`)).json;
    if (j.status !== "running" || /^rendering/.test(j.stage ?? "")) break;
    if (Date.now() - t0 > 240000) throw new Error("the render never started");
    await new Promise((r) => setTimeout(r, 500));
  }
  assert.equal(rootFps(d60), 60);
  await api("POST", `/jobs/${ex.id}/cancel`);
  await waitJob(ex.id);
  // AE: the export follows the film too (an fps asked for is ignored), and PortAE reads the rate from GET /ae
  assert.equal((await api("GET", `/projects/${p60.id}/ae`)).json.fps, 60);
});

test("lyrics: saved as lyrics.txt (an .srt becomes line marks); timing needs a track and the lyrics; no model here -> said so", async () => {
  const empty = (await api("GET", `/projects/${id}/lyrics`)).json;
  assert.equal(empty.text, "");
  assert.equal(empty.timed, null);
  assert.equal((await api("POST", `/projects/${id}/lyrics/time`)).status, 400, "no music track yet");
  const srt = "1\n00:00:01,500 --> 00:00:03,000\nĐèn lên phố cũ\n\n2\n00:00:17,250 --> 00:00:19,000\nHere comes the rain\n";
  const saved = (await api("PUT", `/projects/${id}/lyrics`, { text: srt })).json;
  assert.equal(saved.text, "[1.50] Đèn lên phố cũ\n[17.25] Here comes the rain\n");
  assert.equal(readFileSync(join(dir, "lyrics.txt"), "utf8"), saved.text);
  mkdirSync(join(dir, "assets", "audio"), { recursive: true });
  writeFileSync(join(dir, "assets", "audio", "song.wav"), readFileSync(wav));
  assert.equal((await api("GET", `/projects/${id}/lyrics`)).json.track, "assets/audio/song.wav", "the first track in assets/audio when none is placed");
  const r = await api("POST", `/projects/${id}/lyrics/time`);
  assert.equal(r.status, 409, "Whisper turbo is not installed in this test's models folder");
  assert.equal(r.json.error.code, "MODEL_MISSING");
  rmSync(join(dir, "assets", "audio"), { recursive: true, force: true });
  // the music map for the user to read: the beat file `hyperframes beats` writes for the music track (HF's beatFilePathForSrc and
  // parseBeats), with the timed lyrics by line; the length is the track's own, never the last beat
  assert.equal((await api("GET", `/projects/${id}/beats`)).json.map, null, "no music map yet");
  const beatsOf = (src, beats) => { const f = join(dir, "beats", ...`${src}.json`.split("/")); mkdirSync(join(f, ".."), { recursive: true }); writeFileSync(f, JSON.stringify({ version: 1, audio: src, beats })); };
  beatsOf("assets/audio/song.wav", Array.from({ length: 101 }, (_, i) => ({ time: i / 2, strength: i % 4 ? 0.4 : 1.7 })));
  assert.equal((await api("GET", `/projects/${id}/beats`)).json.map, null, "a beat file alone is no map: it belongs to the music track");
  projects.updateMeta(id, (m) => { m.music = { file: "assets/audio/song.wav", duration: 61.5, beats: "beats/assets/audio/song.wav.json", title: "Rain on the roof" }; });
  beatsOf("assets/audio/other.wav", [{ time: 0, strength: 1 }, { time: 1, strength: 1 }]);          // newer, another track's: not read
  mkdirSync(join(dir, ".moworks", "lyrics"), { recursive: true });
  writeFileSync(join(dir, ".moworks", "lyrics", "words.json"), JSON.stringify({ words: [
    { text: "Đèn", start: 1, end: 1.2, line: 1, sure: "heard" }, { text: "lên", start: 1.2, end: 1.5, line: 1, sure: "placed" }, { text: "Here", start: 17.3, end: 17.5, line: 2, sure: "placed" }] }));
  const mm = (await api("GET", `/projects/${id}/beats`)).json;
  assert.equal(mm.file, undefined, "no file path for the UI");
  assert.deepEqual(mm.map.tempo, { bpm: 120, n_beats: 101 }, "only what HF measures: no metre, no bars");
  assert.deepEqual(mm.map.audio, { title: "Rain on the roof", duration_sec: 61.5 }, "the track's own length, past the last beat (50 s)");
  assert.deepEqual(mm.map.beats.slice(0, 2), [{ time: 0, strength: 1 }, { time: 0.5, strength: 0.4 }], "strengths as HF reads them (clamped to 0..1)");
  assert.deepEqual(mm.lyrics.map((l) => [l.line, l.text, l.start, l.heard, l.words]), [[1, "Đèn lên", 1, 1, 2], [2, "Here", 17.3, 0, 1]]);
  // one beat: no tempo can be worked out (null, never 0); no recorded length: the track is measured
  beatsOf("assets/audio/song.wav", [{ time: 2, strength: 0.5 }]);
  mkdirSync(join(dir, "assets", "audio"), { recursive: true });
  writeFileSync(join(dir, "assets", "audio", "song.wav"), readFileSync(wav));
  projects.updateMeta(id, (m) => { delete m.music.duration; });
  const one = (await api("GET", `/projects/${id}/beats`)).json.map;
  assert.equal(one.tempo.bpm, null);
  assert.ok(Math.abs(one.audio.duration_sec - 1.5) < 0.05, String(one.audio.duration_sec));
  projects.updateMeta(id, (m) => { delete m.music; });
  rmSync(join(dir, "assets", "audio"), { recursive: true, force: true });
  rmSync(join(dir, "beats"), { recursive: true, force: true }); rmSync(join(dir, ".moworks", "lyrics"), { recursive: true, force: true });
});

test("Exit: only when started by the launcher; lists what would stop, then calls the launcher's exit", async () => {
  assert.equal((await api("GET", "/app")).json.canExit, false);
  assert.equal((await api("POST", "/app/exit")).status, 404);
  let called = 0;
  const s2 = await startServer({ token: "k2", onExit: () => { called++; } });
  try {
    const call = (m, p) => fetch(`http://127.0.0.1:${s2.port}/api${p}`, { method: m, headers: { "X-MW-Token": "k2" } }).then((r) => r.json());
    assert.deepEqual(await call("GET", "/app"), { canExit: true, running: [] });
    assert.equal(s2.busy(), false);
    assert.ok(Date.now() - s2.lastSeen() < 5000, "requests mark the app as in use");
    assert.equal((await call("POST", "/app/exit")).ok, true);
    await new Promise((r) => setTimeout(r, 500));
    assert.equal(called, 1);
  } finally { await s2.close(); }
});

test("After Effects: installs listed; the port refuses to start when After Effects is closed", async () => {
  const st = (await api("GET", "/ae/status")).json;
  assert.ok(Array.isArray(st.installs));
  if (!st.running) assert.equal((await api("POST", `/projects/${id}/ae`, { fps: "25" })).status, 409);
  assert.equal((await api("GET", `/projects/${id}/ae`)).json.fps, 30, "the film's rate, shown read-only in PortAE (QC #121)");
});

test("a one-page code film (no scene files) counts as built for the AE export; the starter film does not", async () => {
  const d = join(T, "work", "projects", "demo-code-film");
  mkdirSync(d, { recursive: true });
  writeFileSync(join(d, "index.html"), '<div id="root" data-composition-id="main" data-start="0" data-duration="20" data-width="1920" data-height="1080" data-fps="30"><canvas id="film"></canvas></div>');
  const cid = (await api("POST", "/projects/open", { path: d })).json.id;
  const ae = (await api("GET", `/projects/${cid}/ae`)).json;
  assert.deepEqual([ae.built, ae.scenes], [true, 0], JSON.stringify(ae));
  assert.deepEqual([ae.canvas, ae.estimate], [1, null], "T17-4: the film's canvases for the dialog; no size check kept yet");
  // a size check is kept only for the film it measured; an older export's Log reads without addresses
  const cache = join(d, ".moworks", "cache", "ae");
  mkdirSync(cache, { recursive: true });
  writeFileSync(join(cache, "estimate.json"), JSON.stringify({ kind: "canvas", layers: 1, hash: "another film" }));
  writeFileSync(join(cache, "last.json"), JSON.stringify({ status: "done", at: new Date().toISOString(),
    log: ["  copied to D:/Moworks Studio/projects/x/renders/ae/261027_x_1401", "HF page http://localhost:5000/index.html; out D:/Moworks Studio/projects/x"] }));
  const ae2 = (await api("GET", `/projects/${cid}/ae`)).json;
  assert.equal(ae2.estimate, null);
  assert.deepEqual(ae2.last.log, ["  copied to 261027_x_1401", "HF page the film's page; out x"]);
  // the starter is the scaffold's own (data-no-timeline and its one title card); a code film whose root has no timeline keeps the flag
  writeFileSync(join(d, "index.html"), '<div id="root" data-composition-id="main" data-start="0" data-duration="20" data-width="1920" data-height="1080" data-no-timeline data-fps="30"><canvas id="film"></canvas></div>');
  assert.equal((await api("GET", `/projects/${cid}/ae`)).json.built, true, "a code film under HF's data-no-timeline is built");
  writeFileSync(join(d, "index.html"), '<div id="root" data-composition-id="main" data-start="0" data-duration="3" data-width="1920" data-height="1080" data-no-timeline><div id="f1" data-composition-id="f1" data-composition-src="compositions/f1.html" data-start="0" data-duration="3" data-track-index="1"></div></div>');
  assert.equal((await api("GET", `/projects/${cid}/ae`)).json.built, false, "the 3 s starter: not built yet");
});

test("real Whisper transcription of a short tone (opt-in: MW_TEST_ASR=1, downloads Whisper turbo from Hugging Face)", { skip: process.env.MW_TEST_ASR !== "1" ? "set MW_TEST_ASR=1" : false, timeout: 900000 }, async () => {
  const inst = (await api("POST", "/voice/models/whisper-turbo/install")).json;   // a real 1.6 GB download from Hugging Face
  assert.ok(inst.id, JSON.stringify(inst));
  assert.equal((await waitJob(inst.id)).status, "done");
  const up = await fetch(`http://127.0.0.1:${s.port}/api/projects/${id}/voice/upload`, { method: "POST", headers: { ...H, "X-File-Name": "tone.wav" }, body: readFileSync(wav) });
  const uj = await up.json();
  assert.ok(uj.job?.id, JSON.stringify(uj));             // the model is installed now: the upload itself starts transcription
  assert.equal((await waitJob(uj.job.id)).status, "done");
  const job = (await api("POST", `/projects/${id}/voice/transcribe`, { language: "auto" })).json;
  assert.ok(job.id, JSON.stringify(job));
  const done = await waitJob(job.id);
  assert.equal(done.status, "done", JSON.stringify(done.error));
});
