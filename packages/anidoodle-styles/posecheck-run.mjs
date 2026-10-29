// The whole-film pose check's worker (posecheck.mjs runs it in its own process, with a time limit): an anidoodle film's page bundled for
// Node with the engine's host replaced by a stub that keeps the film, then every frame (or every `step`-th) drawn into a canvas that only
// records coordinates. Collected: what a frame throws (the human engine's checkPose throws on a joint outside its limits), what the film
// logs with console.error / console.warn (HyperFrames counts those as script errors), and coordinates that are not numbers (a rig gone
// wrong: Bit, the cheetah). Prints one JSON line: { films: [{ title, fps, frames, checked, findings: [{ kind, message, frames }] }] }.
//   node posecheck-run.mjs <projectDir> <entry, e.g. anidoodle/page.ts> <outDir> [step]
import { createRequire } from "node:module";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const [, , projectDir, entry, outDir, stepArg] = process.argv;
const { build } = createRequire(import.meta.url)("esbuild");
const engine = join(projectDir, ".moworks", "library", "anidoodle", "engine", "src");
const out = join(outDir, `posecheck-${process.pid}.mjs`);
// the host stub keeps the film and gives the page a window.FILM to wrap (a page may wrap seek to move its HTML layers)
const HOST = "export const mountFilm = (film) => { (globalThis.__MW_FILMS__ ??= []).push(film); globalThis.FILM = { meta: film.meta, ready: Promise.resolve(), mount: () => film.meta, seek: () => ({}), hash: () => '', audio: () => null }; return globalThis.FILM; };";
await build({ entryPoints: [join(projectDir, ...entry.split("/"))], bundle: true, format: "esm", platform: "node", outfile: out, logLevel: "silent", absWorkingDir: projectDir,
  alias: { anidoodle: engine },
  plugins: [{ name: "mw-host", setup(b) {
    b.onResolve({ filter: /hosts\/page$/ }, (a) => ({ path: "mw-host", namespace: "mw" }));
    b.onLoad({ filter: /.*/, namespace: "mw" }, () => ({ contents: HOST, loader: "js" }));
  } }] });

let frame = -1, bad = false;
const logs = [];
const oneLine = (s) => String(s).split("\n").map((l) => l.trim()).filter(Boolean).join("; ");
for (const k of ["error", "warn"]) console[k] = (...a) => logs.push({ kind: `console.${k}`, frame, message: oneLine(a.map((x) => (x instanceof Error ? x.message : String(x))).join(" ")) });
const num = (v) => typeof v !== "number" || Number.isFinite(v);
const stub = () => new Proxy({ canvas: { width: 1, height: 1 } }, {
  get(t, k) {
    if (k in t) return t[k];
    if (k === "getImageData" || k === "createImageData") return (x, y, w = 1, h = 1) => ({ data: new Uint8ClampedArray(Math.max(4, Math.min(4e6, (w | 0) * (h | 0) * 4))), width: w, height: h });
    if (k === "measureText") return (s) => ({ width: String(s ?? "").length * 8, actualBoundingBoxAscent: 8, actualBoundingBoxDescent: 2 });
    if (k === "getTransform") return () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0, inverse() { return this; } });
    if (k === "isPointInPath" || k === "isPointInStroke") return () => false;
    if (typeof k === "string" && k.startsWith("create")) return () => ({ addColorStop() {}, setTransform() {} });
    return (...a) => { if (!a.every(num)) bad = true; };
  },
  set(t, k, v) { t[k] = v; return true; },
});
const surface = (w, h) => ({ canvas: { width: w, height: h }, ctx: stub() });

// a page may also move HTML layers over the canvas (titles): a DOM that accepts everything and finds nothing
const el = () => new Proxy({ style: {}, dataset: {}, classList: { add() {}, remove() {}, toggle() {}, contains: () => false }, children: [], childNodes: [] }, {
  get(t, k) { if (k in t) return t[k]; if (k === "querySelectorAll" || k === "getElementsByClassName" || k === "getElementsByTagName") return () => []; if (k === "querySelector" || k === "getElementById" || k === "closest") return () => null;
    if (k === "getContext") return () => stub(); if (k === "getBoundingClientRect") return () => ({ x: 0, y: 0, width: 0, height: 0, top: 0, left: 0, right: 0, bottom: 0 }); return () => el(); },
  set(t, k, v) { t[k] = v; return true; } });
globalThis.document = new Proxy({ body: el(), documentElement: el(), head: el() }, { get(t, k) { if (k in t) return t[k]; if (k === "querySelectorAll") return () => []; if (k === "querySelector" || k === "getElementById") return () => null; if (k === "createElement") return () => el(); return () => el(); } });
globalThis.window ??= globalThis;
globalThis.requestAnimationFrame ??= () => 0;
globalThis.addEventListener ??= () => {};
await import(pathToFileURL(out).href);
const films = (globalThis.__MW_FILMS__ ?? []).filter((f) => f?.meta && Array.isArray(f.shots));
const report = [];
for (const film of films) {
  const N = Math.max(1, film.meta.durationFrames | 0), step = Math.max(1, Number(stepArg) || (N > 3600 ? Math.ceil(N / 3600) : 1));
  const env = { W: film.meta.W, H: film.meta.H, scale: 1, cache: new Map(), canvas: surface, image: () => undefined, root: true };
  const found = new Map(), add = (kind, message, f) => { const key = `${kind}\u0000${message}`; const x = found.get(key) ?? { kind, message, frames: [] }; x.frames.push(f); found.set(key, x); };
  let checked = 0;
  logs.length = 0;
  for (let f = 0; f < N; f += step) {
    frame = f; bad = false;
    const shot = film.shots.find((s) => f >= s.start && f < s.end);
    if (!shot) { add("no-shot", "no shot covers this frame", f); continue; }
    try { shot.draw(stub(), f - shot.start, env); } catch (e) { add("throws", String(e?.message ?? e).split("\n").map((l) => l.trim()).filter(Boolean).join("; "), f); }
    if (bad) add("nan", "a point drawn is not a number (a rig or a pose gone wrong)", f);
    checked++;
  }
  for (const l of logs) add(l.kind, l.message, l.frame);
  report.push({ title: film.meta.title ?? null, fps: film.meta.fps, frames: N, checked, step, findings: [...found.values()] });
}
process.stdout.write(JSON.stringify({ films: report }) + "\n");
process.exit(0);
