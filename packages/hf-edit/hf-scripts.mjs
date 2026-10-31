// HyperFrames' own scripts and CLI commands, run by the app when Claude asks: the skills tell their agent to run
// `node scripts/<x>.mjs …` (media-use/audio: carve; hyperframes: locate…) or the CLI (`hyperframes capture`, `beats`, `audio`, `normalize-audio`…).
// Claude cannot run commands here, so it calls the app's hf_script tool and the app runs the script as HF ships it, from HF's skills at the
// pinned commit (bundle/hf, as the app ships them; never edited), in the project folder. Only the skills the project loaded, only
// allow-listed scripts and CLI commands, no path outside the project; a run that goes online (needsWeb) follows the project's web setting.
import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync } from "node:fs";
import { isAbsolute, join, normalize, resolve, sep } from "node:path";
import { APP_ROOT, loadPins, resolveRuntime } from "../version-manager/index.mjs";
import { cliEntry } from "../hf-qa/cli.mjs";

/** The folder of HyperFrames' entry skill (skills/hyperframes, the contract and its references): its name is the CLI's too, so it is
 *  named here, in an hf-* module, as the boundary rule asks (tools/check-boundary.mjs). */
export const HF_SKILL = "hyperframes";

/** CLI commands the app runs for Claude (everything else is the app's own job or needs the user: render, preview, publish, auth, tts…). */
export const CLI = new Set(["capture", "beats", "audio", "normalize-audio", "timeline", "compositions", "info", "lint", "validate", "inspect", "keyframes", "media-treatment", "add", "catalog"]);
/** CLI commands that go online. */
const CLI_WEB = new Set(["capture", "add", "catalog"]);
/** The skills' scripts the app runs for Claude, each from its own skill; web(args): that run goes online. carve is the voiceover carve on the
 *  music bed (the app's sound rule, config/rules/general-style/references/sound.md); locate finds a point in an image on a numbered grid
 *  (hyperframes/references/film.md), with ffmpeg only, except `auto`, which asks Gemini when a key is set. Every other script stays HF's
 *  and is not run here: media-use's audio.mjs, heygen-tts, heygen-voice, lyria-recipe, wait-bgm and extract-audio-data make or fetch voice and
 *  music (and can pip-install models into Python), media-use/scripts/* fetch and cut media; the app makes the voice-over, the music and the
 *  sound mix itself. bake-basemap takes its settings from environment variables and needs a browser library the clone does not have. */
export const SCRIPTS = {
  carve: { skill: "media-use", web: () => false },
  locate: { skill: HF_SKILL, web: (args) => args[0] === "auto" },
};
/** The CLI command a name asks for ("capture", "hyperframes capture", "npx hyperframes capture"), or null for a script. */
const cliOf = (name) => /^(?:hyperframes|npx hyperframes)\s+(\S+)$/.exec(String(name).trim())?.[1] ?? (CLI.has(String(name).trim()) ? String(name).trim() : null);
/** A script's name as Claude may write it ("carve", "scripts/carve.mjs", "media-use/audio/scripts/carve.mjs") → "carve". */
const scriptBase = (name) => String(name).trim().replace(/^(?:\.[\\/])?(?:[\w.-]+[\\/])*scripts[\\/]/, "").replace(/\.(mjs|py)$/, "");
/** True when this run goes online, so the app asks the project's web setting first: capture, add, catalog, or an allowed script's own case. */
export function needsWeb(name, args = []) {
  const cli = cliOf(name);
  if (cli) return CLI_WEB.has(cli);
  return !!SCRIPTS[scriptBase(name)]?.web(args.map(String));
}
const skillsRoot = (root) => loadPins(root).hyperframes?.skillsRoot ?? join(root, "bundle", "hf", "skills");

/** The scripts of the given skills: [{ skill, name, file, kind: "node" | "python" }]: <skill>/scripts and a part's own <skill>/<part>/scripts
 *  (media-use/audio/scripts holds carve). */
export function listScripts(skills, root = APP_ROOT) {
  const out = [];
  for (const sk of skills) {
    const base = join(skillsRoot(root), sk);
    if (!existsSync(base)) continue;
    const dirs = [join(base, "scripts"), ...readdirSync(base, { withFileTypes: true }).filter((e) => e.isDirectory() && e.name !== "scripts").map((e) => join(base, e.name, "scripts"))];
    for (const d of dirs.filter((x) => existsSync(x))) for (const n of readdirSync(d)) {
      if (/\.test\.mjs$/.test(n) || !/\.(mjs|py)$/.test(n) || out.some((x) => x.name === n.replace(/\.(mjs|py)$/, ""))) continue;
      out.push({ skill: sk, name: n.replace(/\.(mjs|py)$/, ""), file: join(d, n), kind: n.endsWith(".py") ? "python" : "node" });
    }
  }
  return out;
}

/** Where `keyframes --shot` pictures go: the film's cache, out of its root and out of git. */
export const DEBUG_DIR = ".moworks/cache/debug";
/** `hyperframes keyframes --shot <file>` draws one element's motion as a debug picture (guide lines over its samples, no HTML text), never a
 *  frame of the film. Whatever file is asked, it goes in DEBUG_DIR under its own name (T28-6: a path outside the film was refused, so the
 *  Review wrote capture/ at the film's root, 18 MB into the film's history). The other commands' arguments stay as they are. */
export function debugArgs(name, args) {
  if (cliOf(name) !== "keyframes") return args;
  const inCache = (v) => `${DEBUG_DIR}/${String(v).split(/[\\/]/).pop() || "keyframes.png"}`;
  return args.map((a, i) => (typeof a === "string" && a.startsWith("--shot=") ? `--shot=${inCache(a.slice(7))}` : args[i - 1] === "--shot" ? inCache(a) : a));
}

/** Arguments stay inside the project: no absolute path elsewhere, no "..", no shell. */
function checkArgs(dir, args) {
  for (const a of args) {
    if (typeof a !== "string" || a.length > 2000 || /[\0\r\n]/.test(a)) throw Object.assign(new Error("An argument is not a plain string"), { code: "INVALID" });
    const v = a.includes("=") && a.startsWith("--") ? a.slice(a.indexOf("=") + 1) : a;
    if (/^https?:\/\//i.test(v)) continue;
    if (v.split(/[\\/]/).includes("..")) throw Object.assign(new Error(`"${a}" leaves the project folder`), { code: "INVALID" });
    if (isAbsolute(v) && !normalize(resolve(v)).toLowerCase().startsWith(normalize(resolve(dir)).toLowerCase() + sep.toLowerCase()) && normalize(resolve(v)).toLowerCase() !== normalize(resolve(dir)).toLowerCase())
      throw Object.assign(new Error(`"${a}" is outside the project folder`), { code: "INVALID" });
  }
}

const python = () => { for (const exe of ["py", "python"]) { const r = spawnSync(exe, ["-c", "import sys; print(sys.version_info[0])"], { encoding: "utf8", windowsHide: true }); if (r.status === 0 && r.stdout.trim() === "3") return exe; } return null; };

/** Run one script or CLI command in the project: { ok, exitCode, stdout, stderr, command }. `name`: "carve", "hyperframes capture"… */
export async function runScript(dir, { name, args: asked = [], skills = [], root = APP_ROOT, timeoutMs = 10 * 60 * 1000, signal = null }) {
  const args = debugArgs(name, asked);
  checkArgs(dir, args);
  if (args !== asked) mkdirSync(join(dir, ...DEBUG_DIR.split("/")), { recursive: true });
  const rt = resolveRuntime();
  const env = { ...rt.env, NO_COLOR: "1" };
  let cmd, argv, shown;
  const cliName = cliOf(name);
  if (cliName) {
    if (!CLI.has(cliName)) throw Object.assign(new Error(`The app does not run "hyperframes ${cliName}" for Claude (it renders, previews and transcribes itself)`), { code: "INVALID" });
    cmd = process.execPath; argv = [cliEntry(rt.dir), cliName, ...args]; shown = `hyperframes ${cliName}`;
  } else {
    const base = scriptBase(name), allowed = SCRIPTS[base];
    if (!allowed) throw Object.assign(new Error(`The app does not run "${base}" for Claude: the voice-over, the music and the sound mix are the app's own work (Voice, Final Mix); the scripts it runs are ${Object.keys(SCRIPTS).join(", ")}`), { code: "INVALID" });
    const s = listScripts(skills.includes(allowed.skill) ? [allowed.skill] : [], root).find((x) => x.name === base);
    if (!s) throw Object.assign(new Error(`No script "${base}" in this project's skills (${skills.join(", ") || "none"})`), { code: "NOT_FOUND" });
    if (s.kind === "python") {
      const py = python();
      if (!py) throw Object.assign(new Error("Python 3 is not on this computer: install Python 3.12 (Settings › System shows how)"), { code: "NO_PYTHON" });
      cmd = py; argv = [...(py === "py" ? ["-3"] : []), s.file, ...args];
    } else {
      cmd = process.execPath; argv = [s.file, ...args];
      if (s.name === "carve" && !args.includes("--core")) argv.push("--core", rt.dir);          // @hyperframes/core from the pinned runtime
    }
    shown = `${s.skill}/scripts/${s.name}`;
  }
  return new Promise((ok) => {
    const c = spawn(cmd, argv, { cwd: dir, env, windowsHide: true });
    let out = "", err = "";
    c.stdout.on("data", (d) => { out = (out + d).slice(-60000); });
    c.stderr.on("data", (d) => { err = (err + d).slice(-20000); });
    const kill = () => spawnSync("taskkill", ["/PID", String(c.pid), "/T", "/F"], { windowsHide: true });
    const t = setTimeout(kill, timeoutMs);
    signal?.addEventListener("abort", kill, { once: true });
    c.on("error", (e) => { clearTimeout(t); ok({ ok: false, exitCode: null, stdout: out, stderr: String(e.message), command: shown }); });
    c.on("close", (code) => { clearTimeout(t); signal?.removeEventListener("abort", kill); ok({ ok: code === 0, exitCode: code, stdout: out, stderr: err, command: shown }); });
  });
}

/** The answer Claude reads. */
export function scriptText(r, args) {
  const tail = (s, n) => (s.length > n ? `…${s.slice(-n)}` : s);
  return [`${r.command} ${args.join(" ")}: ${r.ok ? "done" : `failed (exit ${r.exitCode})`}.`, r.stdout.trim() ? `stdout:\n${tail(r.stdout.trim(), 6000)}` : "",
    r.stderr.trim() ? `stderr:\n${tail(r.stderr.trim(), 3000)}` : ""].filter(Boolean).join("\n");
}
