// A film rendered in the background (every style since): the hash of what the film is drawn and heard from changes
// with an edit, not with the app's own files, in two parts (picture, sound); the route says none / fresh / stale (soundOnly when only the
// sound changed), the Editor plays it only for a code film; a Brush film is pre-rendered (high), every other film at the export's
// quality, and an export reuses that file; made only when the pipeline asks; it yields to other renders; the bridge reads the Editor's
// preview scale.
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { filmHash, filmParts, proxyRoutes, soundOnRoot } from "../packages/server/proxy.mjs";
import { bridgeScript } from "../packages/hf-edit/lemoPage.mjs";

const T = mkdtempSync(join(tmpdir(), "mw-proxy-"));
after(() => rmSync(T, { recursive: true, force: true }));
/** The state a background render writes for the film as it is now. */
const stateNow = (dir, fps, extra) => { const { picture, sound } = filmParts(dir, fps), hash = filmHash(dir, fps), file = `.moworks/cache/proxy/${hash}.mp4`;
  writeFileSync(join(dir, file), "mp4"); writeFileSync(join(dir, ".moworks", "cache", "proxy", "proxy.json"), JSON.stringify({ hash, picture, sound, file, fps, ...extra })); return file; };
const film = (name, styleId) => {
  const dir = join(T, name);
  mkdirSync(join(dir, "compositions"), { recursive: true }); mkdirSync(join(dir, ".moworks", "cache", "proxy"), { recursive: true });
  writeFileSync(join(dir, "index.html"), "<html>one</html>"); writeFileSync(join(dir, "compositions", "a.js"), "draw()");
  return { id: name, path: dir, title: name, meta: { style: { id: styleId }, format: { fps: 24 } } };
};

test("the hash follows the film's own files, not the app's .moworks cache", () => {
  const p = film("hash", "brush-cartoon"), h1 = filmHash(p.path);
  writeFileSync(join(p.path, ".moworks", "cache", "proxy", "x.json"), "{}");
  assert.equal(filmHash(p.path), h1);
  writeFileSync(join(p.path, "compositions", "a.js"), "draw(2)");
  assert.notEqual(filmHash(p.path), h1);
  writeFileSync(join(p.path, "CHARACTERS.json"), "{}");
  const h2 = filmHash(p.path);
  assert.notEqual(h2, h1);
  assert.notEqual(filmHash(p.path, 24), filmHash(p.path, 30));          // a new fps makes the proxy stale (the film's own fps)
});

test("the route: none, then fresh, then stale after an edit (soundOnly for a sound alone); an HTML film has its file but plays live", () => {
  const code = film("code", "brush-cartoon"), html = film("html", "hf-swiss-pulse"), all = { code, html };
  const ctx = { root: T, preview: { base: "http://127.0.0.1:1/k" }, jobs: { start: () => { throw new Error("no render in this test"); } } };
  const { routes } = proxyRoutes(ctx, { r: (m, path, fn) => [m, new RegExp(`^/api${path}$`), fn], P: "([a-z]+)", mustProject: (id) => all[id] });
  const get = routes.find(([m]) => m === "GET")[2];
  assert.deepEqual([get(["code"]).codeFilm, get(["code"]).status, get(["code"]).fps], [true, "none", 24]);
  assert.equal(get(["html"]).codeFilm, false);
  const hash = filmHash(code.path, 24), rel = `.moworks/cache/proxy/${hash}.mp4`;
  writeFileSync(join(code.path, rel), "mp4");
  const state = (quality) => stateNow(code.path, 24, { at: "2026-10-23T00:00:00Z", quality });
  state("draft"); assert.equal(get(["code"]).status, "stale");          // a Brush film's older draft preview is not its pre-render
  state("high");
  const v = get(["code"]);
  assert.deepEqual([v.mode, v.quality], ["prerendered", "high"]);
  assert.equal(v.status, "fresh"); assert.equal(v.duration, null); assert.equal(v.audio, false); assert.equal(v.url, `http://127.0.0.1:1/k/p/code/${rel}`);
  writeFileSync(join(code.path, "index.html"), "<html>two</html>");
  assert.equal(get(["code"]).status, "stale");
  writeFileSync(join(code.path, "index.html"), "<html>one</html>"); assert.equal(get(["code"]).status, "fresh");
  // a sound added on the root page changes the sound only: the picture is still the rendered one
  writeFileSync(join(code.path, "index.html"), '<html>one<audio src="assets/m.mp3" data-start="0"></audio></html>');
  assert.deepEqual([get(["code"]).status, get(["code"]).soundOnly], ["stale", true]);
  writeFileSync(join(code.path, "index.html"), "<html>one</html>");
  code.meta.format.fps = 30; assert.deepEqual([get(["code"]).status, get(["code"]).soundOnly], ["stale", false]);          // the film's fps changed
  // an HTML film has its file too, never played by the Editor (codeFilm false)
  stateNow(html.path, 24, { quality: "standard" });
  assert.deepEqual([get(["html"]).codeFilm, get(["html"]).status, get(["html"]).mode], [false, "fresh", "film"]);
  // a sound-only change: every film's sound is mixed again onto its file in the background (seconds), HTML films included, so the
  // file stays current
  writeFileSync(join(html.path, "index.html"), '<html>one<audio src="assets/m.mp3"></audio></html>');
  assert.equal(get(["html"]).soundOnly, true);
  const started = [];
  ctx.jobs = { start: (kind, meta) => { started.push(meta.projectId); return { id: `j${started.length}` }; }, get: () => null };
  assert.ok(ctx.previewProxy("html"));
  code.meta.format.fps = 24; writeFileSync(join(code.path, "index.html"), '<html>one<audio src="assets/m.mp3"></audio></html>');
  assert.equal(get(["code"]).soundOnly, true);
  assert.ok(ctx.previewProxy("code"));
  assert.deepEqual(started, ["html", "code"]);
});

test("the bridge mounts anidoodle at the Editor's preview scale, full size when there is none", () => {
  const s = bridgeScript();
  assert.ok(s.includes("mounted = previewScale(); F.mount(mounted)"));
  assert.ok(s.includes("/[?&]mwScale=([0-9.]+)/"));
  assert.ok(s.includes("Number(window.__mwPreviewQuality)"));
  assert.ok(s.includes(`"mw:preview-quality"`));
  assert.ok(s.includes("F.mount(s); draw(lastT)"));
  // a render and the live preview draw at full size; only HyperFrames' check (its __hfScriptState mark) draws at half
  assert.match(s, /v >= 0\.25 && v <= 1 \? v : checking \? 0\.5 : 1/);
  assert.ok(s.includes(`var checking = typeof window.__hfScriptState === "function"`));
});

test("POST and GET give the job's public record (stage, progress, waitingFor), not its handle", async () => {
  const p = film("job", "brush-cartoon"), rec = { id: "preview-proxy-1", kind: "preview-proxy", status: "running", stage: "waiting", progress: null, waitingFor: "Other film" };
  const ctx = { root: T, preview: { base: "http://127.0.0.1:1/k" }, jobs: { start: () => rec, get: (id) => (id === rec.id ? rec : null) } };
  const { routes } = proxyRoutes(ctx, { r: (m, path, fn) => [m, new RegExp(`^/api${path}$`), fn], P: "([a-z]+)", mustProject: () => p });
  const post = routes.find(([m]) => m === "POST")[2], get = routes.find(([m]) => m === "GET")[2];
  const want = { id: rec.id, kind: "preview-proxy", status: "running", stage: "waiting", progress: null, waitingFor: "Other film" };
  assert.deepEqual(post(["job"]).job, want);
  assert.deepEqual([get(["job"]).status, get(["job"]).job], ["rendering", want]);
});

test("made once when the pipeline asks: opening the project or the Editor's polls never start it; not while Claude changes the film", () => {
  const p = film("once", "brush-cartoon"), started = [];
  p.meta.pipeline = { ran: { build: true }, delivered: { at: "2026-10-23T00:00:00Z" } };
  const agentRunning = new Set(["once"]);
  const ctx = { root: T, preview: { base: "http://127.0.0.1:1/k" }, agent: { running: agentRunning },
    jobs: { start: (kind, meta) => { const rec = { id: `j${started.length}`, kind, title: meta.title, status: "running", stage: "starting" }; started.push(rec); return rec; }, get: (id) => started.find((j) => j.id === id) ?? null } };
  const { routes } = proxyRoutes(ctx, { r: (m, path, fn) => [m, new RegExp(`^/api${path}$`), fn], P: "([a-z]+)", mustProject: () => p });
  const get = routes.find(([m]) => m === "GET")[2];
  for (let i = 0; i < 3; i++) assert.equal(get(["once"]).status, "none");
  assert.equal(started.length, 0);
  writeFileSync(join(p.path, "index.html"), `<div data-composition-id="main" data-start="0" data-duration="10.5"></div>`);
  let v = get(["once"]);
  assert.deepEqual([v.videoOnly, v.waitsFor, v.etaMinutes], [true, null, 3]);          // 252 frames × 0.7 s ≈ 3 min, before it starts
  delete p.meta.pipeline.delivered; v = get(["once"]); assert.equal(v.waitsFor, "film");          // not finished yet: nothing to render
  p.meta.pipeline.delivered = { at: "2026-10-23T00:00:00Z" };
  assert.equal(ctx.previewProxy("once"), null); assert.equal(started.length, 0);          // Claude is changing the film
  agentRunning.clear();
  const job = ctx.previewProxy("once");
  assert.equal(started.length, 1); assert.equal(job.title, "Rendering the film");
  assert.equal(ctx.previewProxy("once"), job); assert.equal(started.length, 1);          // one at a time
});

test("a background render takes no render slot: it waits while another film's export runs (and never for this film's own export)", async () => {
  const { createJobs } = await import("../packages/server/jobs.mjs");
  const p = film("yield", "lemo-sample"), other = { projectId: "x", title: "Other film" };
  let active = other;
  const ctx = { root: T, preview: { base: "http://127.0.0.1:1/k" }, jobs: createJobs(), agent: { running: new Set() }, renders: { status: () => ({ running: active, queued: 0 }) } };
  proxyRoutes(ctx, { r: (m, path, fn) => [m, new RegExp(`^/api${path}$`), fn], P: "([a-z]+)", mustProject: () => p });
  const job = ctx.previewProxy("yield");
  await new Promise((r) => setTimeout(r, 50));
  assert.deepEqual([ctx.jobs.get(job.id).stage, ctx.jobs.get(job.id).waitingFor], ["waiting", "Other film"]);
  ctx.jobs.cancel(job.id);
  await new Promise((r) => setTimeout(r, 100));
  assert.equal(ctx.jobs.get(job.id).status, "cancelled");
  active = { projectId: "yield", title: "yield" };          // this film's own export does not hold it back
  const { prerendered } = await import("../packages/server/proxy.mjs");
  assert.equal(prerendered("lemo-sample"), false); assert.equal(prerendered("brush-cartoon"), true);
});

test("an export reuses the film's render when nothing changed: every style at its quality; a webm, a draft, a higher quality asked or a changed picture renders again", async () => {
  const p = film("reuse", "brush-cartoon"), l = film("reuse-lemo", "lemo-sample"), h = film("reuse-html", "hf-swiss-pulse"), all = { reuse: p, "reuse-lemo": l, "reuse-html": h };
  const ctx = { root: T, preview: { base: "http://127.0.0.1:1/k" }, jobs: { start: () => { throw new Error("no render in this test"); } } };
  proxyRoutes(ctx, { r: (m, path, fn) => [m, new RegExp(`^/api${path}$`), fn], P: "([a-z-]+)", mustProject: (id) => all[id] });
  const at = (x) => join(x.path, ".moworks", "cache", "proxy", `${filmHash(x.path, 24)}.mp4`);
  stateNow(p.path, 24, { quality: "high" }); stateNow(l.path, 24, { quality: "draft" }); stateNow(h.path, 24, { quality: "standard" });
  assert.equal(await ctx.preRendered(p, { format: "mp4", fps: 24 }), at(p));
  assert.equal(await ctx.preRendered(p, { format: "mp4", fps: 24, quality: "high" }), at(p));
  assert.equal(await ctx.preRendered(p, { format: "webm", fps: 24 }), null);
  assert.equal(await ctx.preRendered(l, { format: "mp4", fps: 24 }), null, "an older draft preview is not an export");
  stateNow(l.path, 24, { quality: "standard" });
  assert.equal(await ctx.preRendered(l, { format: "mp4", fps: 24 }), at(l), "a lemo film reuses its render too");
  assert.equal(await ctx.preRendered(h, { format: "mp4", fps: 24 }), at(h), "and an HTML film");
  assert.equal(await ctx.preRendered(h, { format: "mp4", fps: 24, quality: "high" }), null, "a higher quality than it was made at");
  writeFileSync(join(p.path, "index.html"), "<html>changed</html>");
  assert.equal(await ctx.preRendered(p, { format: "mp4", fps: 24 }), null);
});

test("the sound apart from the picture; only a film whose sounds all sit on its root page has its sound mixed again", () => {
  const f = film("parts", "hf-swiss-pulse"), a = filmParts(f.path, 24);
  writeFileSync(join(f.path, "index.html"), '<html>one<audio src="assets/3_audio/music/m.mp3" data-volume="0.8"></audio></html>');
  const b = filmParts(f.path, 24);
  assert.deepEqual([b.picture === a.picture, b.sound === a.sound], [true, false], "a track placed");
  mkdirSync(join(f.path, "assets", "3_audio", "music"), { recursive: true });
  writeFileSync(join(f.path, "assets", "3_audio", "music", "m.mp3"), "ID3");
  const c = filmParts(f.path, 24);
  assert.deepEqual([c.picture === b.picture, c.sound === b.sound], [true, false], "a sound file");
  writeFileSync(join(f.path, "assets", "logo.png"), "png");
  const d = filmParts(f.path, 24);
  assert.deepEqual([d.picture === c.picture, d.sound === c.sound], [false, true], "a picture file");
  assert.equal(soundOnRoot(f.path), true);
  writeFileSync(join(f.path, "compositions", "scene.html"), '<div><audio src="x.mp3"></audio></div>');
  assert.equal(soundOnRoot(f.path), false, "a sound inside a scene: a full render");
});

test("one capture worker when the graphics card has under 8 GB free; what a reused export says about the pre-render", async () => {
  const { bgWorkers, BG_WORKERS } = await import("../packages/server/proxy.mjs");
  assert.equal(bgWorkers(5000), 1); assert.equal(bgWorkers(12000), BG_WORKERS); assert.equal(bgWorkers(null), BG_WORKERS);
  const p = film("info", "brush-cartoon");
  const ctx = { root: T, preview: { base: "http://127.0.0.1:1/k" }, jobs: { start: () => { throw new Error("no render in this test"); } } };
  proxyRoutes(ctx, { r: (m, path, fn) => [m, new RegExp(`^/api${path}$`), fn], P: "([a-z]+)", mustProject: () => p });
  assert.equal(ctx.preRenderInfo(p), null);
  writeFileSync(join(p.path, ".moworks", "cache", "proxy", "proxy.json"), JSON.stringify({ hash: "x", file: "x.mp4", at: "2026-10-24T00:00:00Z", ms: 135000, gpu: "auto", workers: 2 }));
  assert.deepEqual(ctx.preRenderInfo(p), { at: "2026-10-24T00:00:00Z", ms: 135000, gpu: "auto", workers: 2, remixed: null });
});
