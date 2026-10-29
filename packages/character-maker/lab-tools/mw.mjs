// The Character creator's lab tools: what Claude runs in a lab folder, the app's way. Copied into <lab>/tools/; the app's
// folder comes from MW_APP_ROOT (set by the app when it starts Claude) or tools/app-root.txt. The project is an anidoodle
// project: the pinned engine staged as shipped in .moworks/library/anidoodle (never edited), the project's own modules in anidoodle/.
//   node tools/still.mjs <film module under anidoodle/, e.g. films/sheet-marker.ts> <out.png>     frame 0 of that film, a PNG
//   node tools/render.mjs <film module> <out.mp4>                                                  the whole film, an MP4
//   node tools/gate.mjs <check module, e.g. check.ts>                                             the character gate (exit 1 on a failure)
// A film module mounts its film and exports its meta: `mountFilm(film); export const __meta = film.meta;`. Renders run light (2 capture
// workers, below-normal priority) through HyperFrames, as the app renders.
import { copyFileSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
const APP = process.env.MW_APP_ROOT || readFileSync(join(import.meta.dirname, "app-root.txt"), "utf8").trim();
const imp = (p) => import(pathToFileURL(join(APP, p)).href);
const { build } = await import(pathToFileURL(join(APP, "node_modules/esbuild/lib/main.js")).href);
const ALIAS = { anidoodle: "./.moworks/library/anidoodle/engine/src" };
process.on("unhandledRejection", () => {});          // the meta probe's stubbed page: mountFilm's own start fails there, harmlessly

export async function stage(dir) { const { stageEngine } = await imp("packages/anidoodle-styles/index.mjs"); stageEngine(dir, APP); }

/** The film's meta, read by bundling its module for node with the browser parts stubbed. */
export async function metaOf(dir, entry) {
  const out = join(dir, ".moworks", "probe.mjs");
  const stub = "globalThis.window = globalThis; const __el = () => ({ getContext: () => ({}), style: {} }); globalThis.document = { getElementById: __el, createElement: __el, addEventListener() {} }; globalThis.addEventListener = () => {};";
  await build({ absWorkingDir: dir, entryPoints: [join(dir, "anidoodle", entry)], outfile: out, bundle: true, format: "esm", platform: "node", logLevel: "silent", banner: { js: stub }, alias: ALIAS });
  const m = await import(pathToFileURL(out).href + `?t=${Date.now()}`);
  rmSync(out, { force: true });
  // its meta: `export const __meta`, else the film it exports (its default, or any export with meta and shots), as the page below mounts it
  // (a sheet module that exports its film as its default would otherwise be refused and the Character step never get its sheets)
  const film = m.default?.meta && m.default?.shots ? m.default : Object.values(m).find((x) => !!x && typeof x === "object" && x.meta && x.shots);
  const meta = m.__meta ?? film?.meta;
  if (!meta) throw new Error(`${entry} exports no film: export the Film (meta and shots) as its default, or \`export const __meta = film.meta\``);
  return meta;
}

/** Render a film module of the project: frame 0 as a PNG (still) or the whole film as an MP4. Returns { W, H, fps, frames, ms }. */
export async function renderFilm(dir, entry, out, { still = false } = {}) {
  dir = resolve(dir);
  await stage(dir);
  const meta = await metaOf(dir, entry);
  const { W, H, fps } = meta, frames = still ? 1 : meta.durationFrames, dur = frames / fps;
  // the page: the module, mounted here when it only exports its film (a sheet module written to be imported by the film,
  // with no mountFilm call, left the page without window.FILM and HyperFrames waited 180 s for it)
  writeFileSync(join(dir, "anidoodle", "page.ts"), `import * as M from "./${entry.replace(/\.ts$/, "")}";
import { mountFilm } from "anidoodle/hosts/page";
const w = window as unknown as { FILM?: unknown };
if (!w.FILM) { const f = ((M as Record<string, unknown>).default ?? Object.values(M).find((x) => !!x && typeof x === "object" && "meta" in x && "shots" in x)) as Parameters<typeof mountFilm>[0] | undefined; if (f) mountFilm(f); }
`);
  writeFileSync(join(dir, "index.html"), `<!doctype html><html lang="en"><head><meta charset="UTF-8" /><meta name="viewport" content="width=${W}, height=${H}" />
<script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
<style>html, body { margin: 0; width: ${W}px; height: ${H}px; overflow: hidden; } #root { position: relative; width: ${W}px; height: ${H}px; overflow: hidden; } #film { position: absolute; inset: 0; width: ${W}px; height: ${H}px; display: block; }</style></head>
<body><div id="root" data-composition-id="main" data-start="0" data-duration="${dur}" data-width="${W}" data-height="${H}">
<canvas id="film" class="clip" data-start="0" data-duration="${dur}" data-track-index="1"></canvas></div>
<script src="compositions/anidoodle/film.js"></script></body></html>\n`);
  const { finalize } = await imp("packages/hf-edit/finalize.mjs");
  const rep = await finalize(dir, { googleFonts: false });
  if (!rep.anidoodle?.built) throw new Error(`the film did not bundle: ${JSON.stringify(rep.anidoodle)}`);
  // no bridge: the page never mounts a film, and HyperFrames would wait for it in vain (say so now, in plain words)
  if (!rep.lemo) throw new Error(`${entry} exports no film to draw: it needs a Film (meta and shots) as its default export, or mountFilm(film)`);
  const { render } = await imp("packages/hf-render-worker/client.mjs");
  const tmp = join(dir, ".moworks", "render-out");
  rmSync(tmp, { recursive: true, force: true });
  const t0 = Date.now();
  const r = await render({ projectDir: dir, outputPath: still ? tmp : out, fps: { num: fps, den: 1 }, format: still ? "png-sequence" : "mp4", workers: Number(process.env.MW_BG_WORKERS ?? 2), playerReadyTimeoutMs: 180000 },
    // below-normal priority (the computer stays usable) unless someone waits for it (MW_RENDER_FOREGROUND=1: the Character dialog's Draw
    // again and Claude's character_sheet; with three films rendering, one sheet took 2 to 7 minutes at the lower priority)
    { background: process.env.MW_RENDER_FOREGROUND !== "1", root: APP });
  if (r.type !== "done") throw new Error(`render ${r.type}: ${r.message ?? ""}`);
  mkdirSync(dirname(resolve(out)), { recursive: true });
  if (still) copyFileSync(join(tmp, readdirSync(tmp).filter((f) => f.endsWith(".png")).sort()[0]), out);
  return { W, H, fps, frames, ms: Date.now() - t0 };
}

/** The character gate: a check module exporting run() (or check, gate, the default) -> [{ section, results: [{ id, ok, detail }] }] (the
 *  author's runner, per character) or the results themselves, [{ id, ok, detail }]. The module is the character's OWN checks: a person on
 *  the human engine checks the human canon and joint limits, an animal or a thing on its own rig checks that rig's rules; nothing here assumes
 *  a human. The path is under anidoodle/ ("check.ts", "characters/turtle/check.ts"; a leading "anidoodle/" is the same file).
 *  When the module cannot be built or run, or exports nothing it can read, that is one FAIL line that says why. */
export async function gate(dir, entry) {
  dir = resolve(dir);
  await stage(dir);
  const rel = String(entry).replace(/\\/g, "/").replace(/^\.\//, "").replace(/^anidoodle\//, "");
  const fail1 = (why) => { console.log(`\ngate ${rel}\n${"-".repeat(Math.min(96, rel.length + 5))}\n  FAIL  ${"the gate itself".padEnd(34)} ${why}\n\n0 passed, 1 failed`); return { pass: 0, fail: 1 }; };
  let res;
  try {
    const js = (await build({ absWorkingDir: dir, entryPoints: [join(dir, "anidoodle", rel)], bundle: true, format: "esm", write: false, platform: "neutral", logLevel: "silent", alias: ALIAS })).outputFiles[0].text;
    const m = await import("data:text/javascript;base64," + Buffer.from(js).toString("base64"));
    const fn = [m.run, m.check, m.gate, m.default].find((f) => typeof f === "function");
    if (!fn) return fail1(`anidoodle/${rel} exports no run() (it exports: ${Object.keys(m).join(", ") || "nothing"}); export run() returning [{ section, results }] or [{ id, ok, detail }]`);
    res = await fn();
  } catch (e) {
    const why = (e.errors ?? []).map((x) => `${x.location ? `${x.location.file}:${x.location.line}: ` : ""}${x.text}`).join("; ") || String(e.message ?? e).split("\n")[0];
    return fail1(`could not ${e.errors ? "build" : "run"} anidoodle/${rel}: ${why}`.slice(0, 600));
  }
  // the author's sections, or one flat list of results (a character's own checks)
  const sections = Array.isArray(res) && res.every((x) => x && Array.isArray(x.results)) ? res
    : Array.isArray(res) && res.every((x) => x && "ok" in x) ? [{ section: rel, results: res }] : null;
  if (!sections) return fail1(`run() of anidoodle/${rel} returned ${Array.isArray(res) ? "a list the gate cannot read" : typeof res}; return [{ section, results }] or [{ id, ok, detail }]`);
  if (!sections.some((s) => s.results.length)) return fail1(`anidoodle/${rel} checks nothing (no results): a gate must check the character's own rules`);
  let pass = 0, fail = 0;
  for (const { section, results } of sections) {
    console.log(`\n${section}\n${"-".repeat(Math.min(96, section.length))}`);
    for (const x of results) { x.ok ? pass++ : fail++; console.log(`  ${x.ok ? "PASS" : "FAIL"}  ${String(x.id).padEnd(34)} ${x.detail ?? ""}`); }
  }
  console.log(`\n${pass} passed, ${fail} failed`);
  return { pass, fail };
}
