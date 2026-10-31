// The Style Gallery's preview of every anidoodle medium: the author's own drawing film of the medium (its
// host page engine/src/hosts/page-<drawFilm>.ts, as shipped) rendered here through HyperFrames the way the app renders an anidoodle film
// (finalize bundles it with the pinned engine, the bridge seeks window.FILM by HyperFrames' time), then encoded for the cards (see
// ../library/preview-media.mjs) with a WebP poster of its last frame, the finished picture. A plate that is a still (two house styles) gets
// its poster only. Files: <work>/library/anidoodle/anidoodle-<commit7>/previews/<id>.mp4 and .webp, outside git like the cards. The
// author's rigged characters in the Characters library (Bit, the cheetah) get their poster and film the same way, straight into the app's
// bundle/library/characters/ (a maintainer's tool: the running app only reads that folder).
// Credit: Alex Greenshpun (10x Company), https://github.com/alexgreensh/anidoodle at the pinned commit, Apache-2.0 with its NOTICE.
import { createRequire } from "node:module";
import { copyFileSync, existsSync, mkdirSync, readdirSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { APP_ROOT } from "../version-manager/index.mjs";
import { render as renderJob } from "../hf-render-worker/client.mjs";
import { execFileSync } from "node:child_process";
import { encodePoster, encodeVideo, ffmpegExe } from "../library/preview-media.mjs";
import { finalize } from "../hf-edit/finalize.mjs";
import { buildAnidoodle } from "../hf-edit/anidoodleBuild.mjs";
import { anidoodleSource, readStyles, stageEngine, storeDir } from "./index.mjs";
import { AUTHOR_RIGS, shippedHumanDir } from "../character-kit/index.mjs";

const { build } = createRequire(import.meta.url)("esbuild");
const nameOf = (rel) => String(rel ?? "").split("/").pop().replace(/\.ts$/, "");

/** What each medium's preview is made from: [{ id, film (the module's export), page (its host page), meta }]. */
export async function previewPlan(root = APP_ROOT, { only = null } = {}) {
  return filmPlan(readStyles(root).filter((s) => !only || only.includes(s.id)).map((s) => ({ id: s.id, film: nameOf(s.drawFilm ?? s.module) })), root);
}
/** The author's films with a host page, each with its meta, read by bundling the film modules for Node (no browser): every module of the
 *  engine is a pure description until it draws. */
async function filmPlan(list, root) {
  const src = anidoodleSource(root);
  if (!src) throw Object.assign(new Error("anidoodle is not pinned"), { code: "NOT_FOUND" });
  const hosts = join(src.skillDir, "engine", "src", "hosts");
  const media = list.filter((m) => existsSync(join(hosts, `page-${m.film}.ts`)));
  if (!media.length) return [];
  const tmp = join(storeDir(root, src), "_meta");
  mkdirSync(tmp, { recursive: true });
  const out = join(tmp, `films-${Date.now()}.mjs`);
  try {
    await build({ stdin: { contents: [...new Set(media.map((m) => m.film))].map((f) => `export { ${f} } from "./canvas-core/${f}";`).join("\n"), resolveDir: join(src.skillDir, "engine", "src"), loader: "ts" },
      bundle: true, format: "esm", platform: "node", outfile: out, logLevel: "silent" });
    const mod = await import(pathToFileURL(out).href);
    return media.map((m) => ({ ...m, page: `page-${m.film}`, meta: mod[m.film]?.meta ?? null })).filter((m) => m.meta);
  } finally { rmSync(tmp, { recursive: true, force: true }); }
}

const pageHtml = ({ W, H, seconds }) => `<!doctype html>
<!-- An anidoodle medium's preview: the author's drawing film, mounted by the engine's host on <canvas id="film"> and seeked by HyperFrames. -->
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=${W}, height=${H}" />
<script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
<style>
  html, body { margin: 0; width: ${W}px; height: ${H}px; overflow: hidden; background: #ffffff; }
  #root { position: relative; width: ${W}px; height: ${H}px; overflow: hidden; }
  #film { position: absolute; inset: 0; width: ${W}px; height: ${H}px; display: block; }
</style>
</head>
<body>
<div id="root" data-composition-id="main" data-start="0" data-duration="${seconds}" data-width="${W}" data-height="${H}">
  <canvas id="film" class="clip" data-start="0" data-duration="${seconds}" data-track-index="1"></canvas>
</div>
<script src="compositions/anidoodle/film.js"></script>
</body>
</html>
`;

/**
 * Render the previews: every medium without one (or `only` these ids, or all with `force`). One medium at a time, at below-normal
 * priority with `workers` capture workers. Returns { done, ok, failed: [{ id, error }], total }.
 */
export async function makePreviews({ root = APP_ROOT, only = null, force = false, workers = 2, signal = null, onProgress = () => {}, render = renderJob } = {}) {
  const src = anidoodleSource(root);
  if (!src?.intact) throw Object.assign(new Error("The anidoodle clone is not at the pinned commit"), { code: "NOT_FOUND" });
  const store = storeDir(root, src), dir = join(store, "previews"), work = join(store, "_render");
  mkdirSync(dir, { recursive: true });
  const plan = (await previewPlan(root, { only })).filter((m) => force || only || !existsSync(join(dir, `${m.id}.webp`)));
  const result = { done: 0, ok: 0, failed: [], total: plan.length };
  for (const m of plan) {
    if (signal?.aborted) throw Object.assign(new Error("Cancelled"), { code: "CANCELLED" });
    try {
      const r = await renderPage(m, { root, store, work, workers, signal, render });
      const poster = join(dir, `${m.id}.webp`);
      if (r.still) encodePoster(r.out, `${poster}.part.webp`, { root });
      else {
        encodeVideo(r.out, join(dir, `${m.id}.mp4.part.mp4`), { root });
        renameSync(join(dir, `${m.id}.mp4.part.mp4`), join(dir, `${m.id}.mp4`));
        encodePoster(r.out, `${poster}.part.webp`, { root, at: Math.max(0, r.seconds - 0.1) });          // the last frame: the finished picture
      }
      renameSync(`${poster}.part.webp`, poster);
      result.ok++;
    } catch (err) {
      if (signal?.aborted) throw Object.assign(new Error("Cancelled"), { code: "CANCELLED" });
      result.failed.push({ id: m.id, error: String(err.message ?? err).slice(0, 400) });
    }
    result.done++;
    onProgress({ ...result, id: m.id });
  }
  rmSync(work, { recursive: true, force: true });
  return result;
}

/** One of the author's host pages (a previewPlan entry) as a HyperFrames project in `work`, bundled and finalized as an anidoodle film:
 *  the film a preview is rendered from, and the demo the style's After Effects badge is measured on (packages/style-ae). Returns work. */
export async function previewProject(m, work, { root = APP_ROOT } = {}) {
  const still = m.meta.durationFrames <= 1, fps = m.meta.fps || 30, seconds = still ? 1 : +(m.meta.durationFrames / fps).toFixed(3);
  rmSync(work, { recursive: true, force: true }); mkdirSync(join(work, "anidoodle"), { recursive: true });
  writeFileSync(join(work, "index.html"), pageHtml({ W: m.meta.W, H: m.meta.H, seconds }));
  writeFileSync(join(work, "anidoodle", "page.ts"), `// ${m.id}: the author's film as shipped (engine/src/hosts/${m.page}.ts)\nimport "anidoodle/hosts/${m.page}";\n`);
  stageEngine(work, root);
  const b = await buildAnidoodle(work, { root, force: true });
  if (!b?.built) throw new Error(`bundle: ${b?.error ?? "not built"}`);
  await finalize(work, { googleFonts: false });
  return work;
}

/** Render one of the author's host pages through HyperFrames, as the app renders an anidoodle film: { out (an MP4, or a PNG for a still),
 *  still, seconds }. */
async function renderPage(m, { root, store, work, workers, signal, render }) {
  const still = m.meta.durationFrames <= 1, seconds = still ? 1 : +(m.meta.durationFrames / (m.meta.fps || 30)).toFixed(3);
  await previewProject(m, work, { root });
  const out = join(work, still ? "_frames" : "_master.mp4");
  mkdirSync(join(store, "logs"), { recursive: true });
  const r = await render({ projectDir: work, outputPath: out, fps: still ? { num: 1, den: 1 } : { num: 24, den: 1 }, format: still ? "png-sequence" : "mp4", quality: "draft", workers, strictness: "best-effort" },
    { signal, root, background: true, logFile: join(store, "logs", `${m.id}.log`) });
  if (r.type !== "done") throw new Error(`${r.code ?? r.type}: ${String(r.message ?? "").slice(0, 300)}`);
  if (!still) return { out, still, seconds };
  const png = readdirSync(out).filter((f) => f.endsWith(".png")).sort()[0];
  if (!png) throw new Error("no frame");
  return { out: join(out, png), still, seconds };
}

/** The Characters library's media of the author's rigged characters (Bit, the cheetah): poster.webp and walk.mp4 (the slot the library
 *  plays) in their folder of the app's bundle, from a medium's preview (Bit: the storybook plate, Bit waving) or from their own page (the
 *  cheetah's run). */
export async function makeCharacterMedia({ root = APP_ROOT, force = false, workers = 2, signal = null, render = renderJob } = {}) {
  const src = anidoodleSource(root), store = storeDir(root, src), work = join(store, "_render"), done = [];
  for (const a of AUTHOR_RIGS) {
    const d = join(shippedHumanDir(root), a.id);
    mkdirSync(d, { recursive: true });
    if (!force && existsSync(join(d, "poster.webp"))) continue;
    if (a.media.from) {
      const pv = join(store, "previews", a.media.from);
      if (!existsSync(`${pv}.webp`)) continue;          // the medium's preview first
      copyFileSync(`${pv}.webp`, join(d, "poster.webp"));
      if (existsSync(`${pv}.mp4`)) copyFileSync(`${pv}.mp4`, join(d, "walk.mp4"));
    } else {
      const [m] = await filmPlan([{ id: a.id, film: a.media.page.replace(/^page-/, "") }], root);
      if (!m) continue;
      const r = await renderPage({ ...m, id: `character-${a.id}` }, { root, store, work, workers, signal, render });
      // the stretch of the author's film where the character acts (the cheetah's run), as the library's 10 s film; the poster in it
      const part = join(work, "_part.mp4");
      if (a.media.at) execFileSync(ffmpegExe(root), ["-v", "error", "-y", "-ss", String(a.media.at), "-i", r.out, "-t", "10", "-c:v", "libx264", "-crf", "16", "-an", part], { windowsHide: true, stdio: "ignore" });
      encodeVideo(a.media.at ? part : r.out, join(d, "walk.mp4"), { root });
      encodePoster(r.out, join(d, "poster.webp"), { root, at: a.media.poster ?? Math.min(r.seconds * 0.6, 8) });
      rmSync(work, { recursive: true, force: true });
    }
    done.push(a.id);
  }
  return done;
}
