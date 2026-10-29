// The pinned HyperFrames runtime on a new computer: the npm packages of the pinned version into
// runtime/hf/<version> (the version manager's install, run as its own process so the server is never blocked), then HyperFrames' own
// Chrome (its `browser ensure`, a download into HF's cache) copied into runtime/chromium/<version> (ensureChromium). An hf-* adapter: the
// only place outside the render worker and QA that runs the CLI.
import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { APP_ROOT, ensureChromium, hfDir, installed, loadPins, runtimeEnv } from "../version-manager/index.mjs";

const run = (args, { cwd, env, onLine, signal }) => new Promise((ok, no) => {
  const c = spawn(process.execPath, args, { cwd, env, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
  const line = (d) => String(d).split(/\r?\n/).map((l) => l.trim()).filter(Boolean).forEach((l) => onLine(l.slice(0, 200)));
  c.stdout.on("data", line); c.stderr.on("data", line);
  signal?.addEventListener("abort", () => c.kill(), { once: true });
  c.on("close", (code) => (code === 0 ? ok() : no(Object.assign(new Error(`exit ${code}`), { code: signal?.aborted ? "CANCELLED" : "ERROR" }))));
  c.on("error", no);
});
const cliEntry = (dir) => {
  const pj = JSON.parse(readFileSync(join(dir, "node_modules", "hyperframes", "package.json"), "utf8"));
  return join(dir, "node_modules", "hyperframes", typeof pj.bin === "string" ? pj.bin : pj.bin.hyperframes);
};

/** What is there: { version, installed, chromium } (chromium: the copied browser's path, or null). */
export function runtimeReady(root = APP_ROOT) {
  const pins = loadPins(root), v = pins.hyperframes.default, chrome = pins.hyperframes.versions[v]?.chromium;
  let chromium = null;
  try { chromium = installed(root).includes(v) && chrome ? ensureChromium(chrome, root) : null; } catch { /* not downloaded yet */ }
  return { version: v, installed: installed(root).includes(v), chromium };
}

/** Install what is missing: the pinned version's packages (~276 MB), then its Chrome (~270 MB). Returns runtimeReady(). */
export async function installRuntime({ root = APP_ROOT, onLine = () => {}, signal = null } = {}) {
  const pins = loadPins(root), v = pins.hyperframes.default;
  if (!installed(root).includes(v)) {
    onLine(`Installing HyperFrames ${v} (about 276 MB)`);
    await run([join(root, "packages", "version-manager", "cli.mjs"), "install", v], { cwd: root, env: process.env, onLine, signal });
  }
  if (!runtimeReady(root).chromium) {
    onLine("Downloading HyperFrames' Chrome (about 270 MB)");
    const dir = hfDir(v, root);
    if (!existsSync(join(dir, "node_modules", "hyperframes"))) throw new Error(`HyperFrames ${v} is not installed`);
    await run([cliEntry(dir), "browser", "ensure"], { cwd: dir, env: { ...runtimeEnv(root), HYPERFRAMES_NO_TELEMETRY: "1" }, onLine, signal });
  }
  const r = runtimeReady(root);
  if (!r.chromium) throw new Error("HyperFrames' Chrome is not where config/pins.json expects it (chromium path)");
  return r;
}
