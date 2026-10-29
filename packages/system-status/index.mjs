// Health checks behind the Settings screens and the Claude chip in the top bar. Read-only: nothing is installed,
// downloaded or changed here (sign-in and sign-out are Claude Code's own commands, run only when the user asks). Each check
// returns { status: "ok" | "warning" | "error", label, detail, action? } in plain words.
import { execFileSync, spawn, spawnSync } from "node:child_process";
import { existsSync, readdirSync, statSync } from "node:fs";
import { join, normalize } from "node:path";
import { APP_ROOT, checkFfmpeg, expandEnv, installed, loadPins, readState, resolveRuntime } from "../version-manager/index.mjs";
import { aeRunning, checkPython } from "../ae-export/index.mjs";
import { status as offlineStatus } from "../offline-assets/index.mjs";
import { verifySkills } from "../setup/hf-skills.mjs";
import { status as pyStatus } from "../setup/python.mjs";
import { projectsRoot, workRoot } from "../project-service/index.mjs";

const ok = (label, detail, extra = {}) => ({ status: "ok", label, detail, ...extra });
const warn = (label, detail, action, extra = {}) => ({ status: "warning", label, detail, action, ...extra });
const bad = (label, detail, action, extra = {}) => ({ status: "error", label, detail, action, ...extra });

/** Where the Claude desktop app keeps Claude Code. Since its update of 20/10/2026 the app keeps its data outside the package, in
 *  %LOCALAPPDATA%\Claude-Data\claude_<package id>\claude-code (searched first). Before that, the Store / MSIX build wrote it into its
 *  package's private copy of AppData (%LOCALAPPDATA%\Packages\Claude_*\LocalCache\Roaming\Claude\claude-code): processes started inside
 *  the Claude app see that folder as %APPDATA%\Claude\claude-code, a process started by a double-click does not, so both places are
 *  still searched (real package folder first). */
export function claudeCodeDirs() {
  const out = [];
  const data = join(process.env.LOCALAPPDATA ?? "", "Claude-Data");
  if (existsSync(data)) for (const n of readdirSync(data).filter((x) => /^claude_/i.test(x))) out.push(join(data, n, "claude-code"));
  const pk = join(process.env.LOCALAPPDATA ?? "", "Packages");
  if (existsSync(pk)) for (const n of readdirSync(pk).filter((x) => /^Claude_/i.test(x))) out.push(join(pk, n, "LocalCache", "Roaming", "Claude", "claude-code"));
  out.push(join(process.env.APPDATA ?? "", "Claude", "claude-code"));
  return out.filter((d) => existsSync(d));
}

/** Claude Code on this machine: one named in pins (claude.exe), else the newest one the Claude desktop app installed, else the
 *  native installer's ~/.local/bin/claude.exe, else a claude.exe on PATH. */
export function findClaude(root = APP_ROOT) {
  const pinned = loadPins(root).claude?.exe;
  if (pinned && existsSync(expandEnv(pinned))) return expandEnv(pinned);
  const num = (v) => v.split(".").map(Number);
  const cmp = (a, b) => { const x = num(a), y = num(b); for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return (x[i] ?? 0) - (y[i] ?? 0); return 0; };
  const found = [];
  for (const base of claudeCodeDirs()) {
    for (const v of readdirSync(base).filter((d) => /^\d+\.\d+\.\d+$/.test(d))) {
      const dir = join(base, v);
      for (const sub of [dir, ...readdirSync(dir).map((s) => join(dir, s)).filter((s) => statSync(s).isDirectory())]) {
        const exe = join(sub, "claude.exe");
        if (existsSync(exe)) { found.push({ v, exe }); break; }
      }
    }
  }
  found.sort((a, b) => cmp(b.v, a.v));
  if (found.length) return found[0].exe;
  const local = join(process.env.USERPROFILE ?? "", ".local", "bin", "claude.exe");
  if (existsSync(local)) return local;
  // installed another way (winget, a package manager): a claude.exe on PATH (an npm .cmd shim cannot be spawned without a shell)
  for (const d of String(process.env.PATH ?? "").split(";")) if (d && existsSync(join(d, "claude.exe"))) return join(d, "claude.exe");
  return null;
}

/** The environment every Claude Code call of the app runs with: no API key from the shell (the user's sign-in only), and
 *  MW_CLAUDE_CONFIG_DIR, when set, as Claude Code's own config folder (tests use an empty one to see "signed out" without signing the
 *  user out). The prompt cache lives 5 minutes, not an hour (same model and answers, about -17 % cost: a
 *  step's turns follow each other within minutes, so the dearer 1-hour cache write was rarely read again). */
export function claudeEnv(base = process.env) {
  const env = { ...base, ANTHROPIC_API_KEY: "", FORCE_PROMPT_CACHING_5M: "1" };
  if (base.MW_CLAUDE_CONFIG_DIR) env.CLAUDE_CONFIG_DIR = base.MW_CLAUDE_CONFIG_DIR;
  return env;
}

const parseStatus = (exe, version, stdout) => {
  let s = {};
  try { s = JSON.parse(stdout); } catch { /* not signed in prints text */ }
  return { installed: true, path: exe, version, loggedIn: !!s.loggedIn, authMethod: s.authMethod ?? null,
    subscriptionType: s.subscriptionType ?? null, email: s.email ?? null, orgName: s.orgName ?? null };
};

/** Sign-in state of Claude Code (its own `auth status`): { installed, path, version, loggedIn, authMethod, subscriptionType, email }. */
export function claudeStatus(root = APP_ROOT) {
  const exe = findClaude(root);
  if (!exe) return { installed: false, loggedIn: false };
  const run = (args) => spawnSync(exe, args, { encoding: "utf8", timeout: 20000, windowsHide: true, env: claudeEnv() });
  const v = run(["--version"]);
  return parseStatus(exe, (v.stdout ?? "").trim().split(/\s/)[0] || null, run(["auth", "status"]).stdout);
}

/** Run one Claude Code command without blocking the server; resolves { code, stdout, stderr } (a timeout ends it). */
function runClaude(exe, args, timeout = 20000) {
  return new Promise((ok) => {
    const c = spawn(exe, args, { windowsHide: true, env: claudeEnv(), stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "", stderr = "";
    const h = setTimeout(() => c.kill(), timeout);
    c.stdout.on("data", (d) => { stdout += d; }); c.stderr.on("data", (d) => { stderr += d; });
    c.on("error", (e) => { clearTimeout(h); ok({ code: -1, stdout, stderr: String(e.message) }); });
    c.on("close", (code) => { clearTimeout(h); ok({ code, stdout, stderr }); });
  });
}

/** claudeStatus without blocking the server's event loop (the server's chip and the agent's sign-in check use this one). */
export async function claudeStatusAsync(root = APP_ROOT) {
  const exe = findClaude(root);
  if (!exe) return { installed: false, loggedIn: false };
  const [v, a] = await Promise.all([runClaude(exe, ["--version"]), runClaude(exe, ["auth", "status"])]);
  return parseStatus(exe, v.stdout.trim().split(/\s/)[0] || null, a.stdout);
}

/** `claude auth login`: Claude Code opens the browser to sign in and waits for it; the app never sees a password. Returns the
 *  child process (the caller follows it and polls `auth status`); the sign-in page's address, when Claude Code prints one, is in .url. */
export function claudeLogin(root = APP_ROOT) {
  const exe = findClaude(root);
  if (!exe) throw Object.assign(new Error("Claude Code was not found on this computer"), { code: "NO_CLAUDE" });
  const c = spawn(exe, ["auth", "login", "--claudeai"], { windowsHide: true, env: claudeEnv(), stdio: ["pipe", "pipe", "pipe"] });
  const out = { process: c, url: null, output: "" };
  const read = (d) => { out.output = (out.output + d).slice(-4000); out.url ??= /https:\/\/\S+/.exec(out.output)?.[0] ?? null; };
  c.stdout.on("data", read); c.stderr.on("data", read);
  c.on("error", (e) => { out.output += String(e.message); });
  return out;
}

/** `claude auth logout`: signs Claude Code out on this computer (the terminal's Claude Code too: they share the sign-in). */
export async function claudeLogout(root = APP_ROOT) {
  const exe = findClaude(root);
  if (!exe) throw Object.assign(new Error("Claude Code was not found on this computer"), { code: "NO_CLAUDE" });
  const r = await runClaude(exe, ["auth", "logout"]);
  return { ok: r.code === 0, output: (r.stdout + r.stderr).trim().slice(-500) };
}

function tryCheck(label, fn) { try { return fn(); } catch (e) { return bad(label, String(e.message ?? e).split("\n")[0], "See details"); } }

function aeInstall() {
  const base = "C:/Program Files/Adobe";
  if (!existsSync(base)) return null;
  const dirs = readdirSync(base).filter((d) => /^Adobe After Effects/i.test(d));
  return dirs.length ? dirs.map((d) => join(base, d)) : null;
}

/** Runtime & Media, After Effects and storage checks. */
export function runtimeStatus(root = APP_ROOT) {
  const pins = loadPins(root);
  const state = readState(root);
  const checks = {};
  checks.hfRuntime = tryCheck("HyperFrames", () => {
    const rt = resolveRuntime(null, root);
    return ok("HyperFrames", `Version ${rt.version} (pinned). Installed: ${installed(root).join(", ")}`, { version: rt.version, previous: state.previous ?? null });
  });
  checks.chromium = tryCheck("Browser runtime", () => {
    const rt = resolveRuntime(null, root);
    const v = execFileSync(rt.chromium, ["--version"], { encoding: "utf8", windowsHide: true }).trim();
    return ok("Browser runtime", v, { path: rt.chromium });
  });
  checks.ffmpeg = tryCheck("FFmpeg", () => { const f = checkFfmpeg(root); return ok("FFmpeg / ffprobe", `${f.ffmpeg.split(" Copyright")[0]}`); });
  checks.node = ok("Node.js", process.version);
  // normalize(): one kind of slash (pins.json writes them forward, so the path showed half and half)
  checks.python = (() => { const p = checkPython(root); return p.ok ? ok("Python (AE export)", normalize(p.message)) : bad("Python (AE export)", p.message, "Install the Python modules listed in config/pins.json"); })();
  const skills = verifySkills(root, { fresh: true });
  const bad0 = Object.entries(skills.skills).filter(([, x]) => !x.ok).map(([n]) => n);
  checks.hfSkills = skills.error ? bad("HyperFrames skills", `${skills.error}. The app fetches only skills/ and registry/ at the pinned commit (about 120 MB).`, "Click Download")
    : skills.ok ? ok("HyperFrames skills", `skills/ and registry/ at ${(skills.head ?? skills.commit ?? "").slice(0, 7)}; all ${Object.keys(skills.skills).length} skills match HyperFrames' own manifest.`, { where: skills.where })
    : bad("HyperFrames skills", `Changed since the pinned commit: ${[...bad0, ...skills.changedFiles.slice(0, 3)].join(", ") || "a different commit is checked out"}. The styles that use them are locked until the files are as HyperFrames ships them.`, "Click Download to fetch them again", { where: skills.where, changed: bad0 });
  const py = pyStatus(root);
  checks.pyComponents = !py.python ? bad("Python components", "Python is not on this computer.", "Install Python 3.12 (winget install -e --id Python.Python.3.12 --scope user), then restart the app")
    : py.ready ? ok("Python components", `${py.components.map((c) => `${c.pip.split("==")[0]} (${c.for})`).join(", ")}: ready.`, { components: py.components })
    : bad("Python components", `Missing: ${py.missing.join(", ")}. Needed for ${py.components.filter((c) => !c.ok).map((c) => c.for).join(", ")}.`, "Click Install", { components: py.components });
  const assets = offlineStatus(root);
  checks.fonts = assets.ready
    ? ok("Offline fonts", `${assets.fonts.total} font files with Vietnamese letters, GSAP and three.js are on this computer; other Google fonts are downloaded once when a project needs them, so rendering works offline.`, { path: assets.dir })
    : bad("Offline fonts", `${assets.missing.length} of ${assets.total} files are not downloaded yet (${(assets.bytesMissing / 1e6).toFixed(0)} MB from google/fonts and jsDelivr).`, "Click Download");
  const ae = aeInstall();
  const running = aeRunning();
  checks.afterEffects = !ae ? warn("After Effects", "After Effects was not found on this computer.", "Install After Effects to use Export to AE")
    : running ? ok("After Effects", "Installed and running. Export to AE needs it open with no dialog showing.", { installs: ae, running })
    : warn("After Effects", "Installed but not running.", "Open After Effects before Export to AE", { installs: ae, running });
  const wr = workRoot(root);
  // the real places (not <work>\skills, which does not exist; HyperFrames' skills are the pinned clone or the app's own thin
  // copy), one kind of slash, and only folders that are there
  const all = { workRoot: wr, projects: projectsRoot(root), library: join(wr, "library"), skills: expandEnv(loadPins(root).hyperframes?.skillsRoot ?? ""), models: join(wr, "models"),
    logs: join(root, "runtime", "logs") };
  const storage = Object.fromEntries(Object.entries(all).filter(([k, v]) => v && (k === "workRoot" || existsSync(v))).map(([k, v]) => [k, normalize(v)]));
  checks.storage = /My Drive|Google Drive/i.test(wr)
    ? bad("Storage", "Work folder is on Google Drive; projects must stay off Drive.", "Change storage.workRoot in config/pins.json")
    : ok("Storage", `Projects and libraries are kept in ${wr} (not on Google Drive).`);
  return { checks, storage };
}

/** runtimeStatus in a worker thread (Settings and every request waited while it ran on the server's thread). One run at a time:
 *  callers during a run share it. */
let statusRun = null;
export function runtimeStatusAsync(root = APP_ROOT) {
  statusRun ??= (async () => {
    const { Worker } = await import("node:worker_threads");
    return new Promise((ok, no) => {
      const w = new Worker(new URL("./worker.mjs", import.meta.url), { workerData: { root }, env: process.env });
      w.once("message", (m) => (m.ok ? ok(m.value) : no(new Error(m.message))));
      w.once("error", no);
      w.once("exit", (code) => { if (code !== 0) no(new Error(`The system checks stopped (${code})`)); });
    });
  })().finally(() => { statusRun = null; });
  return statusRun;
}
