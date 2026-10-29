// Whisper on the graphics card, detected and offered at the first run like the app's other components. On a computer
// with an NVIDIA card strong enough (nvidia-smi answers: 4 GB or more, compute capability 6.0 or more) the app offers NVIDIA's CUDA
// libraries for CTranslate2 (cuBLAS 12, cuDNN 9, NVRTC 12) as one optional first-run item; installed only when the user says yes, pinned
// and hash-checked (pip --require-hashes) into <work folder>/models/whisper-cuda. Whisper then tries the card and falls back to the CPU
// (tools/asr/whisper_transcribe.py); the device of the last run is recorded for Settings › System. With no NVIDIA card nothing is offered.
import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { APP_ROOT, expandEnv, loadPins } from "../version-manager/index.mjs";
import { modelsRoot } from "./asr.mjs";

const MB = 1048576;
const readJson = (f, d) => { try { return JSON.parse(readFileSync(f, "utf8")); } catch { return d; } };

/** The pinned wheels (PyPI, win_amd64, read 26/10/2026): name, version, SHA-256 of the wheel, its size, the folder its DLLs land in. */
export const WHEELS = [
  { name: "nvidia-cublas-cu12", version: "12.9.2.10", sha256: "623f43027d40d44ceadf0043f002bd25cf353e8f13ce90b9a87057019f560661", bytes: 553162896, bin: "nvidia/cublas/bin", dll: "cublas64_12.dll" },
  { name: "nvidia-cudnn-cu12", version: "9.27.0.42", sha256: "06e9b0026f3bad97d2b58666330fabec04fe1672f776661ecb0ce0029c27f142", bytes: 743068852, bin: "nvidia/cudnn/bin", dll: "cudnn64_9.dll" },
  { name: "nvidia-cuda-nvrtc-cu12", version: "12.9.86", sha256: "72972ebdcf504d69462d3bcd67e7b81edd25d0fb85a2c46d3ea3517666636349", bytes: 76408187, bin: "nvidia/cuda_nvrtc/bin", dll: null },
];
export const PACK = {
  id: "whisper-gpu", title: "Whisper on the graphics card (NVIDIA CUDA libraries)", version: "CUDA 12.9 · cuDNN 9.27",
  mb: Math.round(WHEELS.reduce((n, w) => n + w.bytes, 0) / MB),
  source: WHEELS.map((w) => `https://pypi.org/project/${w.name}/${w.version}/`).join(" · "),
  licence: "NVIDIA proprietary (CUDA Toolkit EULA, cuDNN Software License Agreement): free to use, redistributed by NVIDIA on PyPI",
  author: "NVIDIA",
};
const MIN = { memoryMB: 4096, computeCap: 6.0 };

const stateFile = (root) => join(process.env.MW_STATE_DIR ?? join(root, "runtime", "state"), "whisper-gpu.json");
const readState = (root) => readJson(stateFile(root), {});
function writeState(root, patch) {
  const next = { ...readState(root), ...patch };
  mkdirSync(join(stateFile(root), ".."), { recursive: true });
  writeFileSync(stateFile(root), JSON.stringify(next, null, 2) + "\n");
  return next;
}

let gpuCache = null;
/** The NVIDIA card nvidia-smi reports (the first one): { name, driver, memoryMB, computeCap }, or null. MW_GPU fakes it in tests:
 *  "none", or "name,driver,memoryMB,computeCap". */
export function detectGpu({ fresh = false } = {}) {
  const fake = process.env.MW_GPU;
  const parse = (line) => { const [name, driver, mem, cc] = String(line).split(",").map((x) => x.trim()); return name ? { name, driver, memoryMB: parseInt(mem, 10) || 0, computeCap: Number(cc) || 0 } : null; };
  if (fake !== undefined) return fake === "none" ? null : parse(fake);
  if (gpuCache && !fresh) return gpuCache.value;
  const r = spawnSync("nvidia-smi", ["--query-gpu=name,driver_version,memory.total,compute_cap", "--format=csv,noheader,nounits"], { encoding: "utf8", windowsHide: true, timeout: 15000 });
  const value = r.status === 0 ? parse((r.stdout ?? "").trim().split(/\r?\n/)[0]) : null;
  gpuCache = { value };
  return value;
}
/** Strong enough for Whisper Turbo in float16. */
export const eligible = (gpu) => !!gpu && gpu.memoryMB >= MIN.memoryMB && gpu.computeCap >= MIN.computeCap;

export const packDir = (root = APP_ROOT) => join(modelsRoot(root), "whisper-cuda");
/** The folders of the pack's DLLs that are there (for the Whisper process's PATH). */
export const dllDirs = (root = APP_ROOT) => WHEELS.map((w) => join(packDir(root), ...w.bin.split("/"))).filter((d) => existsSync(d));
/** { installed, version } — installed when PACK.json is there at this pin and each library's DLL is on disk. */
export function packStatus(root = APP_ROOT) {
  const meta = readJson(join(packDir(root), "PACK.json"), null);
  const installed = !!meta && meta.version === PACK.version && WHEELS.every((w) => !w.dll || existsSync(join(packDir(root), ...w.bin.split("/"), w.dll)));
  return { installed, version: installed ? meta.version : null };
}

/** What Settings › System and the first-run question need: the card, whether the pack is offered, installed, asked, and the device the
 *  last transcription ran on ({ device: "gpu" | "cpu", reason, at }). `ask`: a computer past its first run with a strong card and no pack,
 *  not asked yet (the app asks once; Settings › System keeps the item). */
export function gpuState(root = APP_ROOT) {
  const gpu = detectGpu(), offer = eligible(gpu), pack = packStatus(root), st = readState(root);
  return { gpu, offer, pack: { ...PACK, ...pack }, answer: st.answer ?? null, ask: offer && !pack.installed && !st.answer,
    device: pack.installed && offer ? "gpu" : "cpu", lastRun: st.lastRun ?? null };
}
/** The user's answer to the one question: "yes" (the app installs it) or "no" (not asked again; Settings › System can still install it). */
export function answer(a, root = APP_ROOT) {
  if (!["yes", "no"].includes(a)) throw Object.assign(new Error("The answer is yes or no"), { code: "INVALID" });
  return writeState(root, { answer: a, answeredAt: new Date().toISOString() });
}
/** The device a transcription ran on, for Settings › System. */
export const recordRun = ({ device, reason = null }, root = APP_ROOT) => writeState(root, { lastRun: { device: device === "cuda" ? "gpu" : "cpu", reason, at: new Date().toISOString() } });

/** pip install the pinned wheels, hash-checked, no other package, into packDir; PACK.json once every DLL is there. `pip`: tests fake it. */
export function install(root = APP_ROOT, { signal = null, onLine = () => {}, pip = null } = {}) {
  const exe = expandEnv(loadPins(root).python?.exe ?? "");
  if (!pip && !(exe && existsSync(exe))) return Promise.reject(Object.assign(new Error("Python is not on this computer"), { code: "NO_PYTHON" }));
  const dir = packDir(root);
  mkdirSync(dir, { recursive: true });
  const req = join(dir, "requirements.txt");
  writeFileSync(req, WHEELS.map((w) => `${w.name}==${w.version} --hash=sha256:${w.sha256}`).join("\n") + "\n");
  const args = ["-m", "pip", "install", "--disable-pip-version-check", "--no-input", "--no-deps", "--only-binary=:all:", "--require-hashes", "--target", dir, "--upgrade", "-r", req];
  const run = pip ? pip(args, { dir, onLine }) : new Promise((ok, bad) => {
    const c = spawn(exe, args, { env: { ...process.env, PYTHONIOENCODING: "utf-8", PYTHONUTF8: "1" }, windowsHide: true });
    let log = "";
    const take = (d) => { const s = String(d); log = (log + s).slice(-20000); for (const l of s.split(/\r?\n/)) if (l.trim()) onLine(l.trim().slice(0, 160)); };
    c.stdout.on("data", take); c.stderr.on("data", take);
    const kill = () => spawnSync("taskkill", ["/PID", String(c.pid), "/T", "/F"], { windowsHide: true });
    signal?.addEventListener("abort", kill, { once: true });
    c.on("close", (code) => { signal?.removeEventListener("abort", kill); code === 0 ? ok() : bad(Object.assign(new Error(`pip failed (exit ${code}): ${log.trim().split(/\r?\n/).slice(-2).join(" ")}`), { code: "PIP_FAILED" })); });
  });
  return run.then(() => {
    const missing = WHEELS.filter((w) => w.dll && !existsSync(join(dir, ...w.bin.split("/"), w.dll)));
    if (missing.length) throw Object.assign(new Error(`The CUDA libraries are incomplete: ${missing.map((w) => w.dll).join(", ")}`), { code: "INCOMPLETE" });
    writeFileSync(join(dir, "PACK.json"), JSON.stringify({ version: PACK.version, wheels: WHEELS.map(({ name, version, sha256 }) => ({ name, version, sha256 })), licence: PACK.licence,
      installedAt: new Date().toISOString() }, null, 2) + "\n");
    return packStatus(root);
  });
}
/** Remove the pack (Settings › System); Whisper runs on the CPU again. */
export function remove(root = APP_ROOT) { rmSync(packDir(root), { recursive: true, force: true }); return packStatus(root); }
