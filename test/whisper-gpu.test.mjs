// Whisper on the graphics card: offered as an
// optional first-run item only with an NVIDIA card strong enough, asked once on a computer past its first run, installed pinned and
// hash-checked, used when it is there (the CPU otherwise), the last run's device for Settings › System. The card is faked (MW_GPU), pip too.
// Run: npm test
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const T = mkdtempSync(join(tmpdir(), "mw-whisper-gpu-"));
process.env.MW_STATE_DIR = join(T, "state");
process.env.MW_MODELS_ROOT = join(T, "models");
process.env.MW_WORK_ROOT = join(T, "work");
process.env.MW_NO_BACKUP = "1";
process.env.MW_NO_LIBRARY_IMPORT = "1";
process.env.MW_CLAUDE_CONFIG_DIR = join(T, "claude-empty");
mkdirSync(process.env.MW_CLAUDE_CONFIG_DIR, { recursive: true });
const prevGpu = process.env.MW_GPU;
after(() => { if (prevGpu === undefined) delete process.env.MW_GPU; else process.env.MW_GPU = prevGpu; rmSync(T, { recursive: true, force: true }); });
const cuda = await import("../packages/voice/cuda.mjs");
const { APP_ROOT } = await import("../packages/version-manager/index.mjs");
const fr = await import("../packages/setup/first-run.mjs");

const STRONG = "NVIDIA GeForce RTX 5080, 610.88, 16303, 12.0";
/** A pip that lays the wheels' DLLs out as pip would (or none of them). */
const fakePip = (calls, { lay = true } = {}) => async (args, { dir }) => {
  calls.push(args);
  if (lay) for (const w of cuda.WHEELS) { mkdirSync(join(dir, ...w.bin.split("/")), { recursive: true }); if (w.dll) writeFileSync(join(dir, ...w.bin.split("/"), w.dll), "dll"); }
};

test("no NVIDIA card (or one too small): nothing offered, nothing asked, Whisper on the CPU", () => {
  for (const g of ["none", "NVIDIA GeForce GT 1030, 552.44, 2048, 6.1"]) {
    process.env.MW_GPU = g;
    const s = cuda.gpuState();
    assert.deepEqual([s.offer, s.ask, s.device], [false, false, "cpu"], g);
    assert.ok(!fr.firstRunItems(APP_ROOT).items.some((i) => i.id === "whisper-gpu"), "no first-run item");
  }
});

test("a strong NVIDIA card: one optional first-run item with its name, source, size and licence, outside Download all; asked once", () => {
  process.env.MW_GPU = STRONG;
  const r = fr.firstRunItems(APP_ROOT), it = r.items.find((i) => i.id === "whisper-gpu");
  assert.ok(it, "offered");
  assert.deepEqual([it.optional, it.from, it.ready, it.mb], [true, "download", false, 1309]);
  assert.match(it.what, /RTX 5080 instead of the CPU/);
  assert.match(it.source, /pypi\.org\/project\/nvidia-cublas-cu12\/12\.9\.2\.10\/ · .*nvidia-cudnn-cu12\/9\.27\.0\.42\//);
  assert.match(it.licence, /NVIDIA proprietary/);
  assert.equal(r.mb, r.items.filter((i) => !i.ready && i.from !== "yours" && i.id !== "whisper-gpu").reduce((n, i) => n + i.mb, 0), "not in Download all's size");
  assert.equal(cuda.gpuState().ask, true, "a computer past its first run is asked");
  cuda.answer("no");
  assert.equal(cuda.gpuState().ask, false, "asked once");
  assert.throws(() => cuda.answer("maybe"), /yes or no/);
});

test("installed pinned and hash-checked, then Whisper uses the card; incomplete libraries are refused; the last run's device is kept", async () => {
  process.env.MW_GPU = STRONG;
  const calls = [];
  await assert.rejects(cuda.install(APP_ROOT, { pip: fakePip(calls, { lay: false }) }), /incomplete: cublas64_12\.dll, cudnn64_9\.dll/);
  assert.equal(cuda.packStatus().installed, false);
  const st = await cuda.install(APP_ROOT, { pip: fakePip(calls) });
  assert.equal(st.installed, true);
  for (const a of ["--require-hashes", "--no-deps", "--only-binary=:all:", "--target"]) assert.ok(calls[1].includes(a), a);
  const req = readFileSync(join(cuda.packDir(), "requirements.txt"), "utf8");
  assert.match(req, /^nvidia-cublas-cu12==12\.9\.2\.10 --hash=sha256:623f4302/m);
  assert.match(req, /^nvidia-cudnn-cu12==9\.27\.0\.42 --hash=sha256:06e9b002/m);
  assert.equal(cuda.dllDirs().length, 3, "the DLL folders for the Whisper process");
  const s = cuda.gpuState();
  assert.deepEqual([s.device, s.ask, s.pack.installed], ["gpu", false, true]);
  assert.equal(fr.firstRunItems(APP_ROOT).items.find((i) => i.id === "whisper-gpu").ready, true);
  cuda.recordRun({ device: "cpu", reason: "cuda unavailable, using cpu: no kernel image" });
  assert.deepEqual([cuda.gpuState().lastRun.device, cuda.gpuState().lastRun.reason], ["cpu", "cuda unavailable, using cpu: no kernel image"]);
  cuda.recordRun({ device: "cuda" });
  assert.equal(cuda.gpuState().lastRun.device, "gpu");
  process.env.MW_GPU = "none";
  assert.equal(cuda.gpuState().device, "cpu", "the card gone: the CPU");
  cuda.remove();
  assert.equal(cuda.packStatus().installed, false);
});

test("Whisper's process gets the libraries' folders and tries the card only when they are there", async () => {
  // what the voice-over's and the lyrics' Whisper are started with (asr.mjs whisperDevice), not the words of the code
  const { whisperDevice } = await import("../packages/voice/asr.mjs");
  process.env.MW_GPU = STRONG;
  assert.deepEqual(whisperDevice(APP_ROOT), { gpu: false, device: "cpu", env: {} }, "a strong card without the libraries: the CPU");
  await cuda.install(APP_ROOT, { pip: fakePip([]) });
  const on = whisperDevice(APP_ROOT), dlls = cuda.dllDirs(APP_ROOT);
  assert.deepEqual([on.gpu, on.device, on.env.MW_CUDA_DLLS], [true, "auto", dlls.join(";")], "the card tried, the script falls back to the CPU");
  assert.deepEqual(on.env.PATH.split(";").slice(0, dlls.length), dlls, "the libraries' folders first on PATH");
  process.env.MW_GPU = "none";
  assert.deepEqual(whisperDevice(APP_ROOT), { gpu: false, device: "cpu", env: {} }, "the card gone: the CPU, no folders");
  cuda.remove();
  const py = readFileSync(new URL("../tools/asr/whisper_transcribe.py", import.meta.url), "utf8");
  assert.match(py, /os\.environ\.get\("MW_CUDA_DLLS", ""\)\.split\(os\.pathsep\)[\s\S]*os\.add_dll_directory\(d\)[\s\S]*from faster_whisper import WhisperModel/);
});

test("the server answers the card's state and records the user's answer", async () => {
  process.env.MW_GPU = "none";
  const { startServer } = await import("../packages/server/index.mjs");
  const s = await startServer({ token: "t" });
  try {
    const call = async (m, p, b) => { const r = await fetch(`http://127.0.0.1:${s.port}/api${p}`, { method: m, headers: { "x-mw-token": "t", "content-type": "application/json" }, body: b ? JSON.stringify(b) : undefined }); return { status: r.status, json: await r.json() }; };
    const g = await call("GET", "/setup/whisper-gpu");
    assert.deepEqual([g.status, g.json.offer, g.json.device, g.json.pack.mb], [200, false, "cpu", 1309]);
    assert.equal((await call("POST", "/setup/whisper-gpu", { answer: "yes" })).status, 409, "no card: nothing to install");
    assert.equal((await call("POST", "/setup/whisper-gpu", { answer: "x" })).status, 400);
  } finally { await s.close(); }
});
