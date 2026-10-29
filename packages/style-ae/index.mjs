// Every film style's After Effects badge, so the user knows before choosing a style whether its films port to AE:
// what the AE export would give of a film in that style, measured on the style's demo by the export's own size
// check (packages/ae-export, port.py film_kind), never guessed:
//   editable  the film's layers (kind "layers", no canvas)
//   partial   "mostly-canvas", or layers with some canvas parts (or parts that show only later): those come as pictures (or not at all)
//   video     "canvas", "dynamic" (the picture made as it plays) or "empty": one video layer, the rendered film
// A style's demo: its author's demo source (Lemo-Opuscar styles/<slug>/demo, mg-styles-15 demos/<slug>), anidoodle's drawing film (the
// author's host page, the film its preview is rendered from), then the films the app made in that style (demo-… first, then any).
// A style none of whose demos measure says video, not checked yet (badge.mjs). A source's demos are made into a HyperFrames page as the app runs its films (the lemo bridge,
// packages/hf-edit/lemoPage.mjs) in a work folder; nothing is written into the clones or the projects.
// The measurements: config/style-ae.json (shipped, measured for the pinned commits) and <work>/library/style-ae.json (this computer's,
// newer); each records the source commit (or the project's film hash) it was measured at, so a pin update or a new style is measured again.
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { APP_ROOT } from "../version-manager/index.mjs";
import { aeExport, plainLog } from "../ae-export/index.mjs";
import { finalize } from "../hf-edit/finalize.mjs";
import { lemoFilm } from "../hf-edit/lemoPage.mjs";
import { vendorInto, withThreeMap } from "../hf-edit/vendorLibs.mjs";
import { projectsRoot } from "../project-service/index.mjs";
import { localFile, measurements, readJson, shippedFile } from "./badge.mjs";
import { lemoSource, readStyles as lemoStyles } from "../lemo-styles/index.mjs";
import { mgSource, readStyles as mgStyles } from "../mg-styles/index.mjs";
import { anidoodleSource } from "../anidoodle-styles/index.mjs";
import { DEMO as WI_DEMO, whatIfSource } from "../what-if-styles/index.mjs";
import { filmHash } from "../server/proxy.mjs";
import { isStarterPage } from "../hf-edit/shots.mjs";

/** The badge of one size check (aeExport's estimate), or null when it says nothing about the film's kind. */
export function aeLevel(est) {
  if (!est?.kind) return null;
  // pictures: every layer is an svg / video (a whole film in one <svg>): AE gets shapes where it can, else picture sequences
  if (est.kind === "layers") return est.canvas?.count || est.later || (est.pictures && est.pictures >= est.layers) ? "partial" : "editable";
  return { "mostly-canvas": "partial", canvas: "video", dynamic: "video", empty: "video" }[est.kind] ?? null;
}

export { aeBadge, localFile, measurements, shippedFile } from "./badge.mjs";

const LIMIT_MS = 5 * 60000;
const MEDIA = /\.(mp4|mov|webm|wav|mp3|m4a|flac|ogg|ply)$/i, SKIP_DIR = /[\\/](out|stills|work|node_modules)([\\/]|$)/;
const filesIn = (d) => { const out = []; const walk = (x) => { for (const n of readdirSync(x)) { const p = join(x, n); if (statSync(p).isDirectory()) walk(p); else out.push(p); } }; walk(d); return out; };

/** A code film's demo (a page that draws second t) as a HyperFrames project in `dir`: its files (no films, no sound), its <body> in a
 *  root composition of the film's size and length, its scripts after it, then finalized as the app finalizes its films (HF's runtime, the
 *  lemo bridge, the pinned three.js and libraries; offline). */
export async function codeDemoProject(srcDir, dir, { styleId, dur, size = [1920, 1080], at = null }) {
  rmSync(dir, { recursive: true, force: true });
  const keep = (p) => !MEDIA.test(p) && !SKIP_DIR.test(sep + relative(srcDir, p));
  cpSync(srcDir, dir, { recursive: true, filter: keep });
  // the demo again at its own path in the clone (`at`): a demo that reads its files from its author's server root (/demos/<id>/cues.json)
  if (at) cpSync(srcDir, join(dir, ...at.split("/")), { recursive: true, filter: keep });
  // fonts the author's own script downloads (fetch_fonts.mjs) are not in the clone: a face whose file is missing is taken out, so
  // document.fonts.load() does not fail the page; the measure reads layers, not letters
  for (const f of filesIn(dir).filter((x) => /\.(css|html)$/i.test(x))) {
    const t = readFileSync(f, "utf8"), base = join(f, "..");
    const u = t.replace(/@font-face\s*\{[^}]*\}/gi, (face) => { const m = /url\(\s*["']?([^"')]+)["']?\s*\)/i.exec(face);
      return m && !/^(data:|https?:)/i.test(m[1]) && !existsSync(join(base, decodeURIComponent(m[1].split(/[?#]/)[0]))) ? "" : face; });
    if (u !== t) writeFileSync(f, u);
  }
  const html = readFileSync(join(dir, "index.html"), "utf8");
  const cv = /<canvas\b[^>]*\bwidth=["']?(\d+)[^>]*\bheight=["']?(\d+)/i.exec(html);
  const [W, H] = cv ? [+cv[1], +cv[2]] : size;
  const m = /<body\b[^>]*>([\s\S]*?)<\/body>/i.exec(html);
  const body = m ? m[1] : "", scripts = body.match(/<script\b[\s\S]*?<\/script>/gi) ?? [], content = body.replace(/<script\b[\s\S]*?<\/script>/gi, "").trim();
  const film = `<div id="root" data-composition-id="main" data-start="0" data-duration="${dur}" data-width="${W}" data-height="${H}" style="position: relative; width: ${W}px; height: ${H}px; overflow: hidden">\n${content}\n</div>\n${scripts.join("\n")}`;
  writeFileSync(join(dir, "index.html"), m ? html.replace(m[0], `<body>\n${film}\n</body>`) : html);
  mkdirSync(join(dir, ".moworks"), { recursive: true });
  writeFileSync(join(dir, ".moworks", "project.json"), JSON.stringify({ style: { id: styleId } }));
  // the demo's scripts sit beside its page (an app film keeps them in compositions/, which finalize reads): the bridge first, then the rest
  const js = filesIn(dir).filter((f) => /\.m?js$/.test(f) && !/[\\/]assets[\\/]_app[\\/]/.test(f)).map((f) => relative(dir, f).split(sep).join("/"));
  const lf = lemoFilm(dir, js);
  if (!lf) throw new Error("the demo is not a page that draws by time");
  // a script beside the page got its library paths with no prefix ("assets/_app/…"): a module specifier needs "./"
  for (const f of [...js.filter((x) => !x.includes("/")), "index.html"]) {          // and the page's own inline modules
    const t = readFileSync(join(dir, f), "utf8"), u = t.replace(/(["'`])assets\/_app\//g, "$1./assets/_app/");
    if (u !== t) writeFileSync(join(dir, f), u);
  }
  await finalize(dir, { googleFonts: false });
  // three.js: the versions lemoFilm found in those scripts (finalize reads none of them): its files and the root's import map, after finalize
  if (lf.three.size) { vendorInto(dir, { three: lf.three }); writeFileSync(join(dir, "index.html"), withThreeMap(readFileSync(join(dir, "index.html"), "utf8"), lf.three)); }
  return dir;
}

/** The app's own built films in a style, the first-film rule (a style is measured when a film is first made in it): its demo-…
 *  films first, then any other, newest first, at most two a style. A film not built yet (the 3 s starter) is not one. */
function appFilms(root) {
  const d = projectsRoot(root), out = [];
  for (const n of existsSync(d) ? readdirSync(d) : []) {
    const p = join(d, n), j = readJson(join(p, ".moworks", "project.json"));
    if (!j?.style?.id || !existsSync(join(p, "index.html")) || isStarterPage(readFileSync(join(p, "index.html"), "utf8"))) continue;
    out.push({ styleId: j.style.id, dir: p, name: n, demo: /^demo-/.test(n), at: statSync(join(p, "index.html")).mtimeMs });
  }
  out.sort((a, b) => (b.demo - a.demo) || (b.at - a.at));
  const per = {};
  return out.filter((a) => (per[a.styleId] = (per[a.styleId] ?? 0) + 1) <= 2);
}

/** A film the app made, as a demo: measured where it lies (a size check writes nothing into it). */
export const filmCandidate = (styleId, dir, name, how = "a film made in the app") => ({ styleId, demo: `${name} (${how})`, source: `film:${filmHash(dir)}`, project: () => dir });

/** Every style's demos, in the order they are tried: its author's demo, then the films the app made in it. Each: { styleId, demo (its
 *  name), source (what it is measured at), project(work) -> a HyperFrames project folder }. */
export async function demos(root = APP_ROOT) {
  const list = [];
  const lemo = lemoSource(root);
  if (lemo) for (const s of lemoStyles(root)) if (existsSync(join(lemo.root, ...s.paths.demo.split("/"), "index.html")))
    list.push({ styleId: `lemo-${s.slug}`, demo: `lemo-opuscar/${s.paths.demo}@${lemo.commit.slice(0, 7)}`, source: lemo.commit,
      project: (w) => codeDemoProject(join(lemo.root, ...s.paths.demo.split("/")), w, { styleId: `lemo-${s.slug}`, dur: s.dur ?? 10, at: s.paths.demo }) });
  const mg = mgSource(root);
  if (mg) for (const s of mgStyles(root)) if (s.engine !== "blender" && existsSync(join(mg.root, ...s.paths.demo.split("/"), "index.html")))
    list.push({ styleId: `mg-${s.slug}`, demo: `mg-styles-15/${s.paths.demo}@${mg.commit.slice(0, 7)}`, source: mg.commit,
      project: (w) => codeDemoProject(join(mg.root, ...s.paths.demo.split("/")), w, { styleId: `mg-${s.slug}`, dur: s.dur ?? 10, size: s.size ?? [1920, 1080], at: s.paths.demo }) });
  const ani = anidoodleSource(root);
  if (ani) {
    const { previewPlan, previewProject } = await import("../anidoodle-styles/previews.mjs");
    for (const m of await previewPlan(root).catch(() => []))
      list.push({ styleId: `anidoodle-${m.id}`, demo: `anidoodle/engine/src/hosts/${m.page}.ts@${ani.commit.slice(0, 7)}`, source: ani.commit,
        project: (w) => previewProject(m, w, { root }) });
  }
  // the app's films (What If's earth-stops is demo-what-if-giong-doc)
  const wi = whatIfSource(root);
  for (const a of appFilms(root))
    list.push(filmCandidate(a.styleId, a.dir, a.name, a.styleId === "what-if" && wi && a.demo ? `${WI_DEMO.id}, the app's demo film` : a.demo ? "the app's demo film" : "a film made in the app"));
  return list;
}

/**
 * Measure the styles: every one (force), `only` these style ids, or those whose measurement is at none of their demos' current sources
 * and whose demos have not all failed at those sources (a new style, a new film, a pin update). A style's demos are tried in order until
 * one measures. One style at a time; each result saved at once into `file` (default: this computer's). Returns { measured, failed, skipped }.
 */
export async function measureStyles({ root = APP_ROOT, only = null, force = false, file = localFile(root), signal = null, onProgress = () => {}, probe = aeExport, list = null } = {}) {
  // a demo that could not be measured at a source is not tried again at every start (each try can take a minute): only at a new source
  const tried = { ...(readJson(shippedFile(root))?.failed ?? {}), ...(readJson(localFile(root))?.failed ?? {}) };
  const have = measurements(root), by = new Map();
  for (const d of (list ?? await demos(root)).filter((x) => !only || only.includes(x.styleId))) by.set(d.styleId, [...(by.get(d.styleId) ?? []), d]);
  const failedAt = (id) => new Set(tried[id]?.sources ?? (tried[id]?.source ? [tried[id].source] : []));
  const todo = [...by].filter(([id, ds]) => force || only || (!ds.some((d) => d.source === have[id]?.source) && ds.some((d) => !failedAt(id).has(d.source))));
  const out = readJson(file) ?? { about: "Each film style's After Effects badge, measured on its demo by the AE export's size check (packages/style-ae)", styles: {} };
  out.failed ??= {};
  const result = { measured: [], failed: [], skipped: by.size - todo.length, total: todo.length };
  const work = join(root, "runtime", "work", "style-ae");
  for (const [id, ds] of todo) {
    if (signal?.aborted) break;
    const errors = [];
    let got = null;
    for (const d of ds) {
      if (signal?.aborted) break;
      // a demo that failed at this source already: its reason kept, the next one tried (a film made in the style)
      const before = (tried[id]?.tried ?? [tried[id]]).find((t) => t?.source === d.source);
      if (!force && !only && before) { errors.push({ demo: before.demo, source: d.source, error: before.error }); continue; }
      try { got = await measureOne(d, { root, work, probe, signal }); break; }
      catch (err) { errors.push({ demo: d.demo, source: d.source, error: plainLog(String(err?.message ?? err)).slice(0, 300) }); }
    }
    if (signal?.aborted && !got) break;
    if (got) { out.styles[id] = got; delete out.failed[id]; result.measured.push(id); }
    else {
      // no demo of the style measures: it says "video, not checked yet" (badge.mjs), with why and at which sources
      delete out.styles[id];
      out.failed[id] = { ...errors[0], sources: errors.map((e) => e.source), ...(errors.length > 1 ? { tried: errors } : {}), at: new Date().toISOString().slice(0, 10) };
      result.failed.push({ id, error: errors[0]?.error });
    }
    mkdirSync(join(file, ".."), { recursive: true });
    const sorted = (o) => Object.fromEntries(Object.entries(o).sort(([a], [b]) => a.localeCompare(b)));
    out.styles = sorted(out.styles); out.failed = sorted(out.failed);
    writeFileSync(file, JSON.stringify(out, null, 1) + "\n");
    onProgress({ ...result, id });
  }
  return result;
}

/** One demo's size check: its measurement, or a thrown reason. A page that never answers a seek (lemo impasto held one for 20 min) stops
 *  after LIMIT_MS. */
async function measureOne(d, { root, work, probe, signal }) {
  const w = join(work, d.styleId), t0 = Date.now();
  const ac = new AbortController(), stop = () => ac.abort(), timer = setTimeout(stop, LIMIT_MS);
  signal?.addEventListener("abort", stop, { once: true });
  try {
    const dir = await d.project(w);
    const log = [];
    const r = await probe(dir, { fps: 25, estimateOnly: true, gpu: true, root, signal: ac.signal, onEvent: (e) => { if (e.type === "log" && e.line.trim()) log.push(e.line.trim()); } });
    if (ac.signal.aborted && !signal?.aborted) throw new Error(`the demo's page did not answer within ${LIMIT_MS / 60000} min`);
    const level = aeLevel(r.estimate);
    // the reason first (the page's own errors on HF's "not ready" line), the full log stays out
    const why = log.find((l) => /not ready|Error:/.test(l)) ?? log.at(-1) ?? "";
    if (r.status !== "estimate" || !level) throw new Error(r.message ?? `no size check (${r.code ?? r.status}): ${why.replace(/^.*?film not ready: /, "")}`);
    const e = r.estimate;
    return { level, kind: e.kind, layers: e.layers, canvas: e.canvas, later: e.later ?? 0, pictures: e.pictures ?? 0, measured: new Date().toISOString().slice(0, 10), demo: d.demo, source: d.source, ms: Date.now() - t0 };
  } finally { clearTimeout(timer); signal?.removeEventListener("abort", stop); try { rmSync(w, { recursive: true, force: true }); } catch { /* a browser still closing */ } }
}
