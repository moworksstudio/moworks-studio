// Ricks Clip's characters outside a film (owner 05/11/2026 #1076, audit/102 §9): the character checks (the gate), the model sheet and the life
// clip, for the Character creator's lab, a film's character gate and the tests. A character is one file, characters/<id>.js, that calls
// defineCast({ id, name, about, heightM, seed, outfit, extra }) in toon.js's module scope (ricks-cast.js); the page bundles it with toon.ts,
// roman.js and the cast layer exactly as a film does (ricks.mjs toonText), and draws its cards exactly as the film's engine does
// (ricks-harness.js). The browser is the app's own headless shell, hidden, on port 0 (its DevToolsActivePort), no GPU; only the process
// started here is ever stopped.
import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import { APP_ROOT } from "../version-manager/index.mjs";
import { toonText } from "./ricks.mjs";

const HERE = fileURLToPath(new URL(".", import.meta.url)), HARNESS = join(HERE, "ricks-harness.js");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** The app's headless shell (runtime/chromium/<version>/chrome-headless-shell.exe). */
export function shellExe(root = APP_ROOT) {
  if (process.env.MW_HEADLESS_SHELL) return process.env.MW_HEADLESS_SHELL;
  const dir = join(root, "runtime", "chromium");
  const v = existsSync(dir) ? readdirSync(dir).filter((n) => existsSync(join(dir, n, "chrome-headless-shell.exe"))).sort().at(-1) : null;
  if (!v) throw Object.assign(new Error("The app's headless browser is not installed (Settings › System)"), { code: "NOT_FOUND" });
  return join(dir, v, "chrome-headless-shell.exe");
}
/** Start the browser: { evaluate(expr), navigate(url), close() }. */
export async function launch(root = APP_ROOT) {
  const profile = mkdtempSync(join(tmpdir(), "mw-rccheck-"));
  const proc = spawn(shellExe(root), ["--disable-gpu", "--no-first-run", "--no-default-browser-check", "--disable-extensions", "--mute-audio", "--hide-scrollbars",
    "--force-device-scale-factor=1", `--user-data-dir=${profile}`, "--remote-debugging-port=0", "about:blank"], { windowsHide: true, stdio: "ignore", detached: false });
  let port = null;
  for (let i = 0; i < 200 && !port; i++) { await sleep(50); try { port = Number(readFileSync(join(profile, "DevToolsActivePort"), "utf8").split(/\r?\n/)[0]) || null; } catch { /* not yet */ } }
  const stop = () => {
    try { spawnSync("taskkill", ["/PID", String(proc.pid), "/T", "/F"], { windowsHide: true, stdio: "ignore" }); } catch { /* gone */ }
    for (let i = 0; i < 20; i++) { try { rmSync(profile, { recursive: true, force: true }); break; } catch { spawnSync(process.execPath, ["-e", "setTimeout(()=>{},100)"], { windowsHide: true }); } }
  };
  if (!port) { stop(); throw new Error("the headless browser did not start"); }
  let list = [];
  for (let i = 0; i < 40 && !list.some((t) => t.type === "page"); i++) { try { list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json(); } catch { await sleep(50); } }
  const page = list.find((t) => t.type === "page");
  if (!page) { stop(); throw new Error("no page in the headless browser"); }
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((ok, no) => { ws.onopen = ok; ws.onerror = () => no(new Error("the browser's socket failed")); });
  let id = 0;
  const waiting = new Map(), events = [];
  ws.onmessage = (m) => { const msg = JSON.parse(m.data); if (msg.id && waiting.has(msg.id)) { const w = waiting.get(msg.id); waiting.delete(msg.id); msg.error ? w.no(new Error(msg.error.message)) : w.ok(msg.result); } else if (msg.method) events.push(msg); };
  const send = (method, params = {}) => new Promise((ok, no) => { const i = ++id; waiting.set(i, { ok, no }); ws.send(JSON.stringify({ id: i, method, params })); });
  await send("Page.enable");
  const evaluate = async (expression) => {
    const r = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(`in the page: ${r.exceptionDetails.exception?.description?.split("\n")[0] ?? r.exceptionDetails.text}`);
    return r.result.value;
  };
  const navigate = async (url) => { events.length = 0; await send("Page.navigate", { url }); for (let i = 0; i < 200; i++) { if (events.some((e) => e.method === "Page.loadEventFired")) return; await sleep(25); } };
  return { evaluate, navigate, close: () => { try { ws.close(); } catch { /* closed */ } stop(); } };
}

/** The page script: toon.js with the characters, and the harness (window.RC). Throws with esbuild's own words when a file does not build. */
export async function castBundle(files, { root = APP_ROOT } = {}) {
  const text = toonText({ root, cast: files });
  const plugin = { name: "mw-ricks-toon", setup(b) {
    b.onResolve({ filter: /^mw-ricks-toon$/ }, () => ({ path: "toon.js", namespace: "rc-toon" }));
    b.onLoad({ filter: /.*/, namespace: "rc-toon" }, () => ({ loader: "ts", contents: text, resolveDir: HERE }));
  } };
  try {
    const r = await build({ entryPoints: [HARNESS], bundle: true, write: false, format: "iife", platform: "browser", target: "es2022", logLevel: "silent", plugins: [plugin] });
    return r.outputFiles[0].text;
  } catch (e) {
    const first = (e.errors ?? [])[0];
    throw Object.assign(new Error(first ? `${first.text}${first.location ? ` (line ${first.location.line} of the bundled toon.js: ${first.location.lineText?.trim().slice(0, 120)})` : ""}` : String(e.message)), { code: "BUILD_FAILED" });
  }
}
/** Run fn(page) with the characters' page loaded: the browser started, the bundle evaluated, the browser stopped after. */
export async function withCastPage(files, fn, { root = APP_ROOT } = {}) {
  const js = await castBundle(files, { root }), b = await launch(root);
  try {
    await b.navigate("data:text/html,<!doctype html><html><body style=\"margin:0\"></body></html>");
    await b.evaluate(`${js}\n//# sourceURL=ricks-cast-page.js`);
    return await fn(b);
  } finally { b.close(); }
}

const EXPECT_FACES = ["neutral", "stern", "grin", "laugh", "nervous", "shock", "smile", "squint"];
/** The checks of one character file (the gate): { id, passed, failed, lines: ["PASS  …" | "FAIL  …"], record: { id, name, about, heightM } }. */
export async function checkCharacter(file, { root = APP_ROOT } = {}) {
  const src = readFileSync(file, "utf8"), want = basename(file).replace(/\.js$/, ""), lines = [];
  const ok = (cond, text, why) => lines.push(cond ? `PASS  ${text}` : `FAIL  ${text}${why ? `: ${why}` : ""}`);
  // what the file is (read as text)
  const calls = [...src.matchAll(/\bdefineCast\s*\(/g)].length;
  ok(calls === 1, "one defineCast call", `${calls} found`);
  ok(!/\b(fillText|strokeText)\s*\(|\.font\s*=/.test(src), "no text in the drawing (the film writes its own words)");
  ok(!/\b(Math\.random|Date\.now|performance\.now|new Date)\b/.test(src), "deterministic: no random numbers, no clock");
  ok(!/\b(import|export)\b/.test(src), "a plain file in toon.js's scope: no import or export");
  let record = null;
  try {
    await withCastPage([file], async (b) => {
      const ids = await b.evaluate("RC.ids()");
      ok(ids.length === 1 && ids[0] === want, `the character's id is its file's name (${want})`, `defined: ${ids.join(", ") || "none"}`);
      const id = ids[0];
      if (!id) return;
      record = await b.evaluate(`RC.def(${JSON.stringify(id)})`);
      ok(!!record.name && String(record.name).length <= 40, "a name", record.name ?? "none");
      ok(!!record.about && String(record.about).length >= 20, "an about (one sentence: who, and what a child would remember)");
      ok(Number(record.heightM) > 0.3 && Number(record.heightM) < 2.6, "its real height in metres (heightM, 0.3-2.6)", String(record.heightM));
      const bad = Object.entries(record.outfit ?? {}).filter(([k, v]) => typeof v === "string" && k !== "helmet" && !/^#[0-9a-f]{6}$/i.test(v));
      ok(!!record.outfit && !bad.length, "every outfit colour as #rrggbb", bad.map(([k, v]) => `${k}: ${v}`).join(", "));
      const C = (opts) => b.evaluate(`RC.card(${JSON.stringify(id)}, ${JSON.stringify(opts)})`);
      const base = {};
      for (const v of ["front", "back", "profile"]) {
        const a = await C({ view: v }), again = await C({ view: v });
        base[v] = a;
        ok(a.pixels > 5000, `${v}: a drawing`, `${a.pixels} pixels`);
        ok(a.hash === again.hash, `${v}: the same drawing every time`);
        // a spear's tip may reach the card's top (the kit's own legionary's does)
        const edges = a.touches.filter((e) => !(e === "top" && record.outfit?.spear));
        ok(!edges.length, `${v}: inside its card`, `touches the ${edges.join(", ")} edge`);
        ok(a.sole != null && a.sole >= 930 && a.sole <= 1000, `${v}: standing on the card's ground (soles about y = 975)`, `lowest at ${a.sole?.toFixed(0)}`);
        ok(a.ms < 120, `${v}: drawn in under 120 ms`, `${a.ms.toFixed(0)} ms`);
      }
      ok(base.front.hash !== base.back.hash && base.back.hash !== base.profile.hash && base.front.hash !== base.profile.hash, "the three views differ");
      const faces = [];
      for (const e of EXPECT_FACES.slice(1)) { const f = await C({ view: "front", expr: e }); if (f.hash === base.front.hash) faces.push(e); }
      ok(!faces.length, "every face changes the front", `no change: ${faces.join(", ")}`);
      const back = await C({ view: "back", expr: "laugh" }), side = await C({ view: "profile", expr: "laugh" });
      ok(back.hash === base.back.hash, "the back shows no face (a face changes nothing there)");
      ok(side.hash !== base.profile.hash, "the profile shows its face");
      const still = [];
      for (const a of ["point", "up", "wave", "hip", "belly", "reach", "cross"]) { const f = await C({ view: "front", L: a }); if (f.hash === base.front.hash) still.push(a); }
      ok(!still.length, "every arm pose moves an arm", `no change: ${still.join(", ")}`);
      const w0 = await C({ view: "profile", walk: true, phase: 0 }), w1 = await C({ view: "profile", walk: true, phase: 0.25 });
      ok(w0.hash !== w1.hash, "it walks (the profile changes along the step)");
    }, { root });
  } catch (e) { ok(false, "the character builds and draws", e.message); }
  const failed = lines.filter((l) => l.startsWith("FAIL")).length;
  return { id: record?.id ?? want, passed: lines.length - failed, failed, lines, record };
}
/** The model sheet as a PNG file. */
export async function drawSheet(file, out, { root = APP_ROOT } = {}) {
  const id = basename(file).replace(/\.js$/, "");
  const url = await withCastPage([file], (b) => b.evaluate(`RC.sheet(${JSON.stringify(id)})`), { root });
  writeFileSync(out, Buffer.from(url.split(",")[1], "base64"));
  return out;
}
/** The life clip's frames (JPEG files frame-0000.jpg … in dir): 4.5 s at 30 fps, front, turn, back, a walk. */
export async function drawLife(file, dir, { root = APP_ROOT, frames = 135 } = {}) {
  const id = basename(file).replace(/\.js$/, "");
  await withCastPage([file], async (b) => {
    for (let f = 0; f < frames; f++) { const url = await b.evaluate(`RC.lifeFrame(${JSON.stringify(id)}, ${f})`); writeFileSync(join(dir, `frame-${String(f).padStart(4, "0")}.jpg`), Buffer.from(url.split(",")[1], "base64")); }
  }, { root });
  return dir;
}
