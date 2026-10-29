// The READMEs' diagrams as PNG pictures: docs/images/<name>.mmd (Mermaid source) -> docs/images/<name>.png at 2x.
// GitHub's web page draws Mermaid code blocks but its mobile app shows them as code, so the READMEs show pictures and keep the
// source here for the next change (the same method as the Moworks Motion kit's engine/tests/readme_diagrams.py). Needs the network
// once: Mermaid comes from jsDelivr at a pinned version. Renders in its own headless Edge (CDP on port 0, its own profile, no window).
//
//   node tools/readme-diagrams.mjs            every .mmd in docs/images
//   node tools/readme-diagrams.mjs workflow   the ones whose name contains the text
import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const IMG = join(import.meta.dirname, "..", "docs", "images");
const MERMAID = "https://cdn.jsdelivr.net/npm/mermaid@10.9.1/dist/mermaid.esm.min.mjs";
const EDGE = ["C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe", "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe"].find(existsSync);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const flt = process.argv[2] ?? "";
const files = readdirSync(IMG).filter((f) => f.endsWith(".mmd") && f.includes(flt)).sort();
if (!files.length) { console.error(`no .mmd in ${IMG}`); process.exit(1); }
if (!EDGE) { console.error("Microsoft Edge was not found"); process.exit(1); }

const work = mkdtempSync(join(tmpdir(), "mw-diagrams-"));
const profile = join(work, "profile");
const edge = spawn(EDGE, ["--headless=new", "--remote-debugging-port=0", `--user-data-dir=${profile}`, "--disable-sync", "--disable-extensions",
  "--no-first-run", "--no-default-browser-check", "about:blank"], { stdio: "ignore", windowsHide: true });

/** One CDP connection to the page target: send(method, params) -> result. */
async function connect() {
  const portFile = join(profile, "DevToolsActivePort");
  for (let i = 0; i < 100 && !existsSync(portFile); i++) await sleep(100);
  const port = Number(readFileSync(portFile, "utf8").split(/\r?\n/)[0]);
  const page = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find((t) => t.type === "page");
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((ok, fail) => { ws.onopen = ok; ws.onerror = fail; });
  let id = 0; const waiting = new Map();
  ws.onmessage = (e) => { const m = JSON.parse(e.data); if (waiting.has(m.id)) { const [ok, fail] = waiting.get(m.id); waiting.delete(m.id); m.error ? fail(new Error(m.error.message)) : ok(m.result); } };
  const send = (method, params = {}) => new Promise((ok, fail) => { waiting.set(++id, [ok, fail]); ws.send(JSON.stringify({ id, method, params })); });
  return { send, close: () => ws.close() };
}

const cdp = await connect();
try {
  await cdp.send("Emulation.setDeviceMetricsOverride", { width: 1100, height: 900, deviceScaleFactor: 2, mobile: false });
  for (const f of files) {
    const html = join(work, f.replace(/\.mmd$/, ".html"));
    writeFileSync(html, `<!doctype html><meta charset="utf-8"><body style="margin:0;padding:12px;background:#ffffff;width:1000px">`
      + `<pre class="mermaid">${esc(readFileSync(join(IMG, f), "utf8"))}</pre>`
      + `<script type="module">import mermaid from "${MERMAID}"; mermaid.initialize({ startOnLoad: false });`
      + `await mermaid.run(); document.title = "done";</script>`);
    await cdp.send("Page.navigate", { url: pathToFileURL(html).href });
    let box = null;
    for (let i = 0; i < 300 && !box; i++) {
      await sleep(100);
      const r = await cdp.send("Runtime.evaluate", { expression: `document.title === "done" ? JSON.stringify(document.querySelector("svg").getBoundingClientRect()) : ""`, returnByValue: true });
      if (r.result.value) box = JSON.parse(r.result.value);
    }
    if (!box) throw new Error(`${f}: Mermaid did not finish in 30 s`);
    const shot = await cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true,
      clip: { x: box.x, y: box.y, width: Math.ceil(box.width), height: Math.ceil(box.height), scale: 1 } });
    const out = join(IMG, f.replace(/\.mmd$/, ".png"));
    writeFileSync(out, Buffer.from(shot.data, "base64"));
    console.log(`docs/images/${f.replace(/\.mmd$/, ".png")}: ${Math.round(box.width)} x ${Math.round(box.height)} px (shown), 2x pixels`);
  }
} finally {
  try { await cdp.send("Browser.close"); } catch { /* already gone */ }
  cdp.close();
  await new Promise((r) => (edge.exitCode != null ? r() : edge.once("exit", r)));
  rmSync(work, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
}
