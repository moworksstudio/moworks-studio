// Previews for the blocks HyperFrames publishes none for (no kit clips at run time). Made the way HyperFrames makes its own catalog
// previews (scripts/generate-catalog-previews.ts in the pinned clone): the item copied into a temp project with its hosted assets and the
// install-layout copies of its files; its standalone entry (demo.html first) promoted to index.html when it carries its own timeline, else
// mounted in HF's preview wrapper; rendered with the pinned producer at 24 fps, draft quality, best effort; then encoded for the cards (at
// most 640 px wide, 24 fps, H.264 CRF 30, no sound; ../library/preview-media.mjs) with a WebP poster at min(3 s, 60 % of the length). Also
// adds a poster to official videos without one.
import { createHash } from "node:crypto";
import { copyFileSync, cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve, sep } from "node:path";
import { APP_ROOT, expandEnv, loadPins } from "../version-manager/index.mjs";
import { render } from "../hf-render-worker/client.mjs";
import { encodePosterAsync, encodeVideoAsync, posterAt } from "../library/preview-media.mjs";
import { currentStore, ensureHosted, placeHosted, registryItems, reloadItems } from "./index.mjs";

const METHOD = "rendered here from the HF original with HyperFrames' own catalog preview method (24 fps draft, web encode)";
const readJson = (p, d) => { try { return JSON.parse(readFileSync(p, "utf8")); } catch { return d; } };
const inside = (root, rel) => { const p = resolve(root, rel); return p.startsWith(resolve(root) + sep) ? p : null; };

/** HF's resolveEntryFile: an authored demo first; a component without one has no preview; a block renders its composition. */
export function entryFileOf(e, registryDir) {
  const dir = join(registryDir, e.folder);
  if (existsSync(join(dir, "demo.html"))) return "demo.html";
  if (e.kind === "component") return null;
  const f = (e.item.files ?? []).find((x) => x.type === "hyperframes:composition")?.path ?? `${e.name}.html`;
  return existsSync(join(dir, f)) ? f : null;
}

const hasTimeline = (html) => html.replace(/<template\b[\s\S]*?<\/template>/gi, "").includes("__timelines");

/** HF's styleSocialOverlay: transparent overlays get a dark backdrop, centred, big cards scaled down. */
function styleSocialOverlay(html) {
  let c = html.replace("background: transparent", "background: #1a1a2e");
  c = c.replace(/bottom:\s*\d+px;\s*\n(\s*)left:\s*50%;\s*\n(\s*)transform:\s*translateX\(-50%\)/, "top: 50%;\n$1left: 50%;\n$2transform: translate(-50%, -50%)");
  if (/margin-top:\s*-[3-9]\d\dpx/.test(c)) c = c.replace(/(<body[^>]*>)/, "$1\n<style>body { transform: scale(0.55); transform-origin: center center; }</style>");
  return c;
}

/** The authored length on the entry's root composition (HF's authoredEntryDuration), in seconds. */
function authoredDuration(html) {
  const tag = /<[a-z][^>]*\sdata-composition-id=[^>]*>/i.exec(html.replace(/<template\b[\s\S]*?<\/template>/gi, ""))?.[0]
    ?? /<[a-z][^>]*\sdata-composition-id=[^>]*>/i.exec(html)?.[0];
  const m = tag && (/\sdata-duration=["']?([\d.]+)/i.exec(tag) ?? /\sdata-composition-duration=["']?([\d.]+)/i.exec(tag));
  return m ? Number(m[1]) : null;
}

/** HF's renderWrapperHtml (preview-root mounting the item). */
function wrapperHtml({ name, entrySrc, width, height, duration, bg }) {
  const timing = duration == null ? "" : ` data-duration="${duration}"`;
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=${width}, height=${height}" />
  <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
  <style>* { margin: 0; padding: 0; } html, body { width: ${width}px; height: ${height}px; overflow: hidden; background: ${bg}; }</style>
</head>
<body>
  <div data-composition-id="preview-root" data-width="${width}" data-height="${height}" data-start="0"${timing}>
    <div data-composition-id="${name}" data-composition-src="${entrySrc}" data-start="0"${timing} data-track-index="0" data-width="${width}" data-height="${height}"></div>
  </div>
  <script>
    window.__timelines = window.__timelines || {};
    window.__timelines["preview-root"] = gsap.timeline({ paused: true });
  </script>
</body>
</html>`;
}

/** HF's prepareProjectDir: a temp project ready to render. Returns { dir, entryFile, mode }. */
export async function prepareProject(e, { root = APP_ROOT, registryDir, fetchImpl = fetch, signal } = {}) {
  const entryFile = entryFileOf(e, registryDir);
  if (!entryFile) throw Object.assign(new Error("No standalone entry to render (a component without a demo)"), { code: "NO_ENTRY" });
  const dir = mkdtempSync(join(tmpdir(), `mw-preview-${e.name.slice(0, 30)}-`));
  try {
    cpSync(join(registryDir, e.folder), dir, { recursive: true });
    await ensureHosted(e, { root, fetchImpl, signal });
    placeHosted(e, dir, root);
    for (const f of e.item.files ?? []) {           // mirrorRegistryTargets: blocks reference assets where `hyperframes add` puts them
      const from = f.path && inside(dir, f.path), to = f.target && inside(dir, f.target);
      if (from && to && from !== to && existsSync(from)) { mkdirSync(dirname(to), { recursive: true }); copyFileSync(from, to); }
    }
    const entry = readFileSync(join(dir, entryFile), "utf8");
    let mode = "wrapper";
    if (!existsSync(join(dir, "index.html")) && hasTimeline(entry)) {     // promoteStandaloneEntry
      writeFileSync(join(dir, "index.html"), (e.item.tags ?? []).includes("social") ? styleSocialOverlay(entry) : entry);
      mode = "standalone";
    }
    if (!existsSync(join(dir, "index.html"))) {
      const tags = e.item.tags ?? [];
      const target = (e.item.files ?? []).find((f) => f.path === entryFile)?.target;
      writeFileSync(join(dir, "index.html"), wrapperHtml({ name: e.name, entrySrc: target && existsSync(join(dir, target)) ? target : entryFile,
        width: e.item.dimensions?.width ?? 1920, height: e.item.dimensions?.height ?? 1080, duration: authoredDuration(entry) ?? e.item.duration ?? null,
        bg: tags.includes("social") || tags.includes("overlay") ? "#1a1a2e" : "#ffffff" }));
    }
    return { dir, entryFile, mode };
  } catch (err) { rmSync(dir, { recursive: true, force: true }); throw err; }
}

/** The cards' encode, then a poster frame; off the event loop (this runs in a job of the app's server). */
async function encode(root, master, mp4, poster, seconds) {
  await encodeVideoAsync(master, mp4, { root });
  await encodePosterAsync(mp4, poster, { root, at: posterAt(seconds) });
}

function saveCatalog(dir, items) {
  writeFileSync(join(dir, "catalog.json.part"), JSON.stringify({ items }));
  renameSync(join(dir, "catalog.json.part"), join(dir, "catalog.json"));
  const m = readJson(join(dir, "manifest.json"), {});
  const n = (src) => items.filter((x) => (src ? x.preview?.source === src : !x.preview)).length;
  m.previews = { hf: n("hf"), rendered: n("rendered"), none: n(null), failed: items.filter((x) => x.previewError).length };
  writeFileSync(join(dir, "manifest.json"), JSON.stringify(m, null, 2) + "\n");
  reloadItems();
}

/** Render a preview for every item HF publishes none for (or, with `only`, those ids; `force` renders again; `retryFailed` only the items
 *  that failed before, one worker and 2 minutes for the page to be ready, for slow WebGL pages). Progress after each item; the catalog is
 *  saved after each, so a stopped run picks up where it was. */
export async function renderMissing({ root = APP_ROOT, only = null, force = false, retryFailed = false, signal, onProgress = () => {}, fetchImpl = fetch, renderImpl = render, timeoutMs = 300_000 } = {}) {
  const st = currentStore(root);
  if (!st) throw Object.assign(new Error("Import the blocks first"), { code: "NO_STORE" });
  const registryDir = expandEnv(loadPins(root).hyperframes.registryRoot);
  const items = readJson(join(st.dir, "catalog.json"), { items: [] }).items;
  const entries = new Map(registryItems(root).map((e) => [e.id, e]));
  mkdirSync(join(st.dir, "previews"), { recursive: true });
  // official videos without a poster: one frame from the video
  for (const it of items) if (it.preview?.source === "hf" && !it.preview.poster && existsSync(join(st.dir, it.preview.video))) {
    const rel = `previews/${it.id.replace("/", "__")}.webp`;
    try { await encodePosterAsync(join(st.dir, it.preview.video), join(st.dir, rel), { root, at: posterAt(it.duration) }); it.preview.poster = rel; it.preview.posterMadeHere = true; } catch { /* keep none */ }
  }
  saveCatalog(st.dir, items);
  const todo = items.filter((it) => (only ? only.includes(it.id) : retryFailed ? !!it.previewError
    : it.preview?.source !== "hf" && (force || it.preview?.source !== "rendered")));
  const slow = retryFailed ? { workers: 1, playerReadyTimeoutMs: 120_000 } : {};
  const result = { done: 0, ok: 0, failed: [], total: todo.length };
  for (const it of todo) {
    if (signal?.aborted) throw Object.assign(new Error("Cancelled"), { code: "CANCELLED" });
    const e = entries.get(it.id), slug = it.id.replace("/", "__");
    let proj = null;
    try {
      if (!e) throw new Error("Not in the registry any more");
      proj = await prepareProject(e, { root, registryDir, fetchImpl, signal });
      const master = join(proj.dir, "_master.mp4");
      const sig = AbortSignal.any([signal ?? new AbortController().signal, AbortSignal.timeout(timeoutMs)]);
      const r = await renderImpl({ projectDir: proj.dir, outputPath: master, fps: 24, quality: "draft", format: "mp4", strictness: "best-effort", ...slow },
        { signal: sig, root, logFile: join(proj.dir, "_render.log") });
      if (r.type !== "done" || !existsSync(master)) throw new Error(`${r.code ?? r.type}: ${String(r.message ?? "").slice(0, 300)}`);
      const mp4 = `previews/${slug}.mp4`, png = `previews/${slug}.webp`;
      await encode(root, master, join(st.dir, mp4 + ".part.mp4"), join(st.dir, png), r.duration ?? it.duration);
      renameSync(join(st.dir, mp4 + ".part.mp4"), join(st.dir, mp4));
      const buf = readFileSync(join(st.dir, mp4));
      it.preview = { source: "rendered", video: mp4, poster: png, mode: proj.mode, entry: proj.entryFile, method: METHOD, hfVersion: r.hfVersion,
        sha256: createHash("sha256").update(buf).digest("hex"), size: statSync(join(st.dir, mp4)).size, renderedAt: new Date().toISOString() };
      delete it.previewError;
      result.ok++;
    } catch (err) {
      if (signal?.aborted) throw Object.assign(new Error("Cancelled"), { code: "CANCELLED" });
      it.previewError = String(err.message ?? err).slice(0, 400);       // the old preview (if any) stays
      result.failed.push({ id: it.id, error: it.previewError });
      if (proj && existsSync(join(proj.dir, "_render.log"))) { mkdirSync(join(st.dir, "logs"), { recursive: true }); copyFileSync(join(proj.dir, "_render.log"), join(st.dir, "logs", `${slug}.log`)); }
    } finally {
      if (proj) rmSync(proj.dir, { recursive: true, force: true });
    }
    result.done++;
    saveCatalog(st.dir, items);
    onProgress({ ...result, id: it.id });
  }
  return result;
}
