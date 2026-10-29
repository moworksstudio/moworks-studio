// hf-studio: HyperFrames Studio in the Editor, exactly as the pinned CLI ships it (no code of Studio is
// rewritten, patched or wrapped, so nothing conflicts with it and updating HF updates the editor). The app runs
// `hyperframes preview <project> --no-open --foreground --port <port>` for the project open in the Editor, one at a time, on a fixed
// loopback port so Studio keeps its own saved layout. Usage data stays off: the CLI runs with HYPERFRAMES_NO_TELEMETRY=1 (config/pins.json),
// and it tells the Studio page so (window.__HF_CLI_TELEMETRY_DISABLED).
// Studio publishes the element the user selects (PUT /api/projects/<name>/selection, HF's agent hand-off); the app reads it for the
// Claude panel's Selection scope. Hand edits are committed as a revision when Studio stops or the next Claude task starts.
// Studio source: https://github.com/heygen-com/hyperframes/blob/490ecafbc4d1fba3dd9246d516390d4a1a188089/packages/cli/src/commands/preview.ts
import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createServer } from "node:net";
import { basename, dirname, join, resolve } from "node:path";
import { resolveRuntime } from "../version-manager/index.mjs";
import { cliEntry } from "../hf-qa/cli.mjs";

const READY = /Studio\s+(https?:\/\/[^\s]+)/;
const IDLE_MS = 10 * 60 * 1000;          // no Editor asked for 10 minutes: Studio stops
export const PORT_RANGE = 5;             // Studio runs on the first free port of [port, port + 4]; the UI's CSP names all five

/** A free loopback port, trying `from` first (the Studio page keeps its layout per origin, so the same port is better). */
export function freePort(from = 4320, tries = 20) {
  const attempt = (p, left) => new Promise((ok, fail) => {
    const s = createServer();
    s.once("error", () => (left > 0 ? attempt(p + 1, left - 1).then(ok, fail) : fail(new Error("No free port for HyperFrames Studio"))));
    s.listen(p, "127.0.0.1", () => s.close(() => ok(p)));
  });
  return attempt(from, tries);
}

function killTree(child) {
  if (!child || child.exitCode !== null) return;
  if (process.platform === "win32") spawnSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], { windowsHide: true });
  else child.kill("SIGTERM");
}

/** A Studio left running by an app that did not close normally (its PID file is still there): stopped if it is really HF's preview. */
export function stopLeftover(pidFile) {
  if (!pidFile || !existsSync(pidFile)) return false;
  let pid = null;
  try { pid = JSON.parse(readFileSync(pidFile, "utf8")).pid; } catch { /* unreadable: just remove it */ }
  rmSync(pidFile, { force: true });
  try { process.kill(pid, 0); } catch { return false; }          // not running
  if (process.platform === "win32") {
    const cmd = spawnSync("powershell.exe", ["-NoProfile", "-Command", `(Get-CimInstance Win32_Process -Filter "ProcessId=${Number(pid)}").CommandLine`],
      { encoding: "utf8", windowsHide: true, timeout: 15000 }).stdout ?? "";
    if (!/hyperframes/i.test(cmd) || !/\bpreview\b/.test(cmd)) return false;          // the PID was reused by something else
    spawnSync("taskkill", ["/PID", String(pid), "/T", "/F"], { windowsHide: true });
  } else process.kill(pid, "SIGTERM");
  return true;
}

/**
 * One Studio for the whole app, on the first free port of [port, port + 4] (the UI's CSP names them); `onStop(project)` runs after
 * Studio stops (the server commits hand edits there). `pidFile` remembers the running Studio, so one left by a crash is stopped.
 */
export function createStudioHost({ port, version = null, onStop = () => {}, startTimeoutMs = 30000, pidFile = null } = {}) {
  let cur = null;          // { project, child, url, origin, name, lastSeen, starting }
  let idle = null;
  try { stopLeftover(pidFile); } catch { /* best effort */ }
  const remember = (c) => { if (!pidFile) return; try { mkdirSync(dirname(pidFile), { recursive: true }); writeFileSync(pidFile, JSON.stringify({ pid: c.child.pid, project: c.project.id, at: new Date().toISOString() })); } catch { /* best effort */ } };
  const forget = () => { if (pidFile) rmSync(pidFile, { force: true }); };

  const stop = async () => {
    const c = cur;
    cur = null;
    clearInterval(idle); idle = null;
    if (!c) return;
    try { await c.starting; } catch { /* it failed to start */ }
    killTree(c.child);
    forget();
    try { onStop(c.project); } catch { /* committing hand edits is best effort */ }
  };

  const start = (project, at) => {
    const rt = resolveRuntime(version);
    const name = basename(resolve(project.dir));
    const child = spawn(process.execPath, [cliEntry(rt.dir), "preview", resolve(project.dir), "--no-open", "--foreground", "--port", String(at)],
      { env: { ...rt.env, NO_COLOR: "1", FORCE_COLOR: "0" }, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
    const c = { project, child, name, url: null, origin: null, lastSeen: Date.now(), log: [] };
    remember(c);
    c.starting = new Promise((ok, fail) => {
      const timer = setTimeout(() => fail(new Error("HyperFrames Studio did not start in time")), startTimeoutMs);
      const read = (d) => {
        const text = String(d);
        c.log.push(text); if (c.log.length > 50) c.log.shift();
        const m = READY.exec(text.replace(/\x1b\[[0-9;?]*[A-Za-z]/g, ""));
        if (m && !c.url) {
          const u = new URL(m[1]);
          if (Number(u.port) < at || Number(u.port) >= port + PORT_RANGE) { clearTimeout(timer); fail(new Error(`HyperFrames Studio took port ${u.port}, outside ${port}-${port + PORT_RANGE - 1}`)); return; }
          c.origin = `http://127.0.0.1:${u.port}`;          // the UI's CSP names 127.0.0.1, and Studio trusts it like localhost
          c.studioUrl = `${c.origin}/#project/${encodeURIComponent(name)}`;
          c.url = openPage(project.dir, name, c.origin) ?? c.studioUrl;
          clearTimeout(timer); ok(c);
        }
      };
      child.stdout.on("data", read);
      child.stderr.on("data", read);
      child.on("error", (e) => { clearTimeout(timer); fail(e); });
      child.on("exit", (code) => {
        clearTimeout(timer);
        if (!c.url) fail(new Error(`HyperFrames Studio stopped (exit ${code}): ${c.log.join("").trim().split(/\r?\n/).slice(-3).join(" ")}`));
        if (cur === c) { cur = null; clearInterval(idle); idle = null; forget(); try { onStop(c.project); } catch { /* best effort */ } }
      });
    });
    c.starting.catch(() => {});
    return c;
  };

  return {
    port,
    /** Every origin Studio may use (for the UI's frame-src). */
    origins: Array.from({ length: PORT_RANGE }, (_, i) => `http://127.0.0.1:${port + i}`),
    /** Studio for this project (started, or the running one); resolves when Studio answers. */
    async open(project) {
      if (cur && cur.project.id === project.id && cur.child.exitCode === null) { cur.lastSeen = Date.now(); await cur.starting; return info(cur); }
      await stop();
      cur = start(project, await freePort(port, PORT_RANGE - 1));
      idle = setInterval(() => { if (cur && Date.now() - cur.lastSeen > IDLE_MS) stop(); }, 60000);
      idle.unref?.();
      const c = cur;
      try { await c.starting; } catch (e) { killTree(c.child); if (cur === c) { cur = null; clearInterval(idle); idle = null; } throw e; }
      return info(c);
    },
    /** The element selected in Studio for this project (HF's StudioSelectionSnapshot), or null. Also keeps Studio from idling out. */
    async selection(projectId) {
      const c = cur;
      if (!c || c.project.id !== projectId || !c.url) return null;
      c.lastSeen = Date.now();
      try {
        const r = await fetch(`${c.origin}/api/projects/${encodeURIComponent(c.name)}/selection`, { signal: AbortSignal.timeout(3000) });
        return r.ok ? (await r.json()).selection ?? null : null;
      } catch { return null; }
    },
    current: () => (cur?.url ? info(cur) : null),
    stop,
  };
}

const info = (c) => ({ projectId: c.project.id, url: c.url, studioUrl: c.studioUrl, origin: c.origin, name: c.name, pid: c.child.pid });

/** The app's defaults for Studio's own preferences: dark (both app themes are dark). */
export const STUDIO_DEFAULTS = { theme: "dark" };

/**
 * Studio keeps its preferences (theme, dock layout…) in the browser, per origin, under "hf-studio-ui-preferences", and opens light unless
 * they say dark. The app cannot reach that storage from its own page, so Studio is opened through a small page served by Studio's own
 * server from the project (`/api/projects/<name>/preview/<file>`, same origin; `.moworks/cache/` is not tracked): it writes the app's
 * defaults only where the user has not chosen yet, then goes on to Studio. No Studio code is changed; it is the same as pressing the
 * moon button once. Returns the page's URL, or null when it cannot be written (Studio then opens as HF ships it).
 */
export function openPage(projectDir, name, origin) {
  try {
    const dir = join(projectDir, ".moworks", "cache");
    mkdirSync(dir, { recursive: true });
    const target = `/#project/${encodeURIComponent(name)}`;
    writeFileSync(join(dir, "studio-open.html"), `<!doctype html><meta charset="utf-8"><title>HyperFrames Studio</title>
<style>html,body{margin:0;height:100%;background:#0e1013}</style>
<script>
try {
  var k = "hf-studio-ui-preferences", p = JSON.parse(localStorage.getItem(k) || "{}"), d = ${JSON.stringify(STUDIO_DEFAULTS)}, n;
  for (n in d) if (!(n in p)) p[n] = d[n];
  localStorage.setItem(k, JSON.stringify(p));
} catch (e) {}
location.replace(${JSON.stringify(target)});
</script>
`);
    return `${origin}/api/projects/${encodeURIComponent(name)}/preview/.moworks/cache/studio-open.html`;
  } catch { return null; }
}

/** Short text for Claude: what the user selected in Studio (file, element, its text and the styles that matter). */
export function selectionContext(s) {
  if (!s) return null;
  const css = ["font-family", "font-size", "font-weight", "color", "background-color", "opacity", "transform", "left", "top", "width", "height"]
    .filter((k) => s.computedStyles?.[k] != null && s.computedStyles[k] !== "").map((k) => `${k}: ${s.computedStyles[k]}`);
  const target = s.target?.hfId ? `[data-hf-id="${s.target.hfId}"]` : s.target?.id ? `#${s.target.id}` : s.target?.selector ?? s.tagName;
  return [
    `File: ${s.sourceFile || s.compositionPath}`,
    `Element: <${s.tagName}> ${target}${s.label ? ` ("${s.label}")` : ""}`,
    `Playhead: ${Number(s.currentTime ?? 0).toFixed(2)} s`,
    s.textContent ? `Text: ${String(s.textContent).slice(0, 400)}` : null,
    s.boundingBox ? `Box: x ${Math.round(s.boundingBox.x)}, y ${Math.round(s.boundingBox.y)}, ${Math.round(s.boundingBox.width)} × ${Math.round(s.boundingBox.height)} px` : null,
    css.length ? `Styles: ${css.join("; ")}` : null,
  ].filter(Boolean).join("\n");
}
