// The Blocks library, taken straight from the pinned HyperFrames registry. The import runs on three real registry items with the network
// replaced (preview downloads and the Google Fonts check are stubbed). A small fake kit store proves the import no longer reads the kit.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const T = mkdtempSync(join(tmpdir(), "mw-blocks-"));
process.env.MW_WORK_ROOT = join(T, "work");
process.env.MW_STATE_DIR = join(T, "state");
process.env.MW_BLOCKS_ROOT = join(T, "blocks");
process.env.MW_NO_BACKUP = "1";
process.env.MW_NO_LIBRARY_IMPORT = "1";
process.env.MW_BACKUP_ROOT = join(T, "backup");
const blocks = await import("../packages/blocks-library/index.mjs");
const { startServer } = await import("../packages/server/index.mjs");
const { expandEnv, loadPins } = await import("../packages/version-manager/index.mjs");

const HF = "block/app-showcase", KIT = "block/ai-answer-rank", NONE = "component/blur-out-up";
const entry = (id) => blocks.registryItems().find((e) => e.id === id);
const google = (answer) => async () => answer;

function fakeMotionStore() {     // the kit's clip of block/ai-answer-rank, which the import must ignore
  const dir = join(T, "motion", "kit-1.0.0-abc1234");
  mkdirSync(join(dir, "clips"), { recursive: true }); mkdirSync(join(dir, "thumbs"), { recursive: true });
  writeFileSync(join(dir, "clips", "layout__ai-answer-rank.mp4"), "kit clip");
  writeFileSync(join(dir, "thumbs", "layout__ai-answer-rank.png"), "kit thumb");
  writeFileSync(join(dir, "catalog.json"), JSON.stringify({ presets: [{ name: "layout/ai-answer-rank", lib: "layout", group: "layout", title: "AI Answer Rank", tags: [],
    clip: "clips/layout__ai-answer-rank.mp4", thumb: "thumbs/layout__ai-answer-rank.png", source: { label: "HyperFrames registry", path: "registry/blocks/ai-answer-rank/ai-answer-rank.html" } }] }));
  writeFileSync(join(dir, "manifest.json"), JSON.stringify({ kitVersion: "1.0.0", kitCommit: "abc1234" }));
  writeFileSync(join(T, "motion", "current.json"), JSON.stringify({ dir: "kit-1.0.0-abc1234" }));
}

let s, store, fetched = [];
const api = async (path) => { const r = await fetch(`http://127.0.0.1:${s.port}/api${path}`, { headers: { "X-MW-Token": "k" } }); return { status: r.status, json: await r.json().catch(() => null) }; };

before(async () => {
  fakeMotionStore();
  const fetchImpl = async (url) => { fetched.push(url); return new Response(`bytes of ${url.split("/").pop()}`); };
  store = await blocks.importFromRegistry({ only: [HF, KIT, NONE], fetchImpl, google: async (f) => f !== "DM Sans" });
  s = await startServer({ token: "k" });
});
after(async () => { await s?.close(); rmSync(T, { recursive: true, force: true }); });

test("categories come from HyperFrames' own tags, first rule wins", () => {
  assert.equal(blocks.categoryOf(["transition"]), "Transitions");
  assert.equal(blocks.categoryOf(["chart", "text"]), "Text & titles");
  assert.equal(blocks.categoryOf(["captions", "text"]), "Captions");
  assert.equal(blocks.categoryOf([]), "Other");
});

test("registry: every block and component at the pinned version, ids unique", () => {
  const all = blocks.registryItems();
  assert.ok(all.length > 400, `${all.length} items`);
  assert.equal(new Set(all.map((e) => e.id)).size, all.length);
  assert.ok(all.some((e) => e.kind === "block") && all.some((e) => e.kind === "component"));
  assert.equal(entry(HF).folder, "blocks/app-showcase");
});

test("Vietnamese check: Google answer, fallback in the same stack, bundled fonts, no text", async () => {
  const fam = (r) => r.families.map((f) => [f.family, f.vi, f.via]);
  let r = await blocks.vietnameseCheck(entry(HF), { google: google(false) });
  assert.equal(r.status, "missing");
  assert.deepEqual(fam(r), [["DM Sans", false, "Google Fonts"]]);
  assert.equal((await blocks.vietnameseCheck(entry(HF), { google: google(true) })).status, "ok");
  r = await blocks.vietnameseCheck(entry(HF), { google: google(null) });
  assert.equal(r.status, "unknown");
  assert.equal(r.families[0].via, "not on Google Fonts");
  r = await blocks.vietnameseCheck(entry("block/ai-chat-reveal"), { google: google(false) });
  assert.equal(r.status, "mixed", "the stack's Windows fallback has the letters");
  assert.equal(r.families[0].fallback, "Arial");
  const never = async () => { throw new Error("Google asked for a bundled font"); };
  assert.equal((await blocks.vietnameseCheck(entry(NONE), { google: never })).status, "ok");
  assert.equal((await blocks.vietnameseCheck(entry("block/blob"), { google: never })).status, "no-text");
  let calls = 0; const cache = new Map(), counting = async () => { calls++; return true; };
  await blocks.vietnameseCheck(entry(HF), { google: counting, cache }); await blocks.vietnameseCheck(entry("block/instagram-follow"), { google: counting, cache });
  assert.equal(calls, 1, "one question per family");
});

test("import: official preview with its SHA-256, nothing from the kit, credit at the registry commit", () => {
  const m = store.manifest;
  assert.equal(m.repo, loadPins().hyperframes.repo);
  assert.equal(m.version, loadPins().hyperframes.default);
  assert.deepEqual(m.previews, { hf: 1, rendered: 0, none: 2 });
  assert.deepEqual(m.vietnamese, { ok: 2, mixed: 0, missing: 1, unknown: 0, "no-text": 0 });
  assert.ok(fetched.some((u) => u.endsWith("/app-showcase.mp4")));
  const hf = blocks.getItem(HF), kit = blocks.getItem(KIT), none = blocks.getItem(NONE);
  assert.equal(hf.preview.source, "hf");
  assert.match(hf.preview.sha256, /^[0-9a-f]{64}$/);
  assert.equal(readFileSync(join(store.dir, hf.preview.video), "utf8"), "bytes of app-showcase.mp4");
  assert.equal(kit.preview, null, "the kit's clip is not used");
  assert.match(kit.sourceHash, /^[0-9a-f]{16}$/);
  assert.equal(none.preview, null);
  assert.equal(hf.collection, "HyperFrames");
  assert.equal(hf.credit.author, "HeyGen (HyperFrames)");
  assert.equal(hf.credit.made, "as shipped");
  assert.match(hf.credit.commit, /^[0-9a-f]{40}$/);
  assert.equal(hf.credit.link, `https://github.com/${m.repo}/blob/${hf.credit.commit}/registry/blocks/app-showcase/app-showcase.html`);
  assert.ok(!existsSync(store.dir + ".tmp"));
  assert.equal(JSON.parse(readFileSync(join(T, "blocks", "current.json"), "utf8")).dir, store.dir.split(/[\\/]/).pop());
});

test("search: words, author and category facets, Vietnamese filter, ids in order, 15 a page", () => {
  const all = blocks.search({});
  assert.equal(all.total, 3);
  assert.deepEqual(all.collections, { HyperFrames: 3 });
  assert.equal(Object.values(all.categories).reduce((a, b) => a + b, 0), 3);
  assert.deepEqual(blocks.search({ q: "showcase" }).items.map((x) => x.id), [HF]);
  assert.deepEqual(blocks.search({ kind: "component" }).items.map((x) => x.id), [NONE]);
  assert.deepEqual(blocks.search({ vi: "missing" }).items.map((x) => x.id), [HF]);
  assert.equal(blocks.search({ collection: "Someone else" }).total, 0);
  const cat = blocks.getItem(HF).category;
  assert.ok(blocks.search({ category: cat }).items.every((x) => x.category === cat));
  assert.deepEqual(blocks.search({ ids: [NONE, HF, "block/gone"] }).items.map((x) => x.id), [NONE, HF]);
  assert.deepEqual(blocks.search({ offset: 1, limit: 1 }).items.length, 1);
});

test("spec text: what it is, the Vietnamese warning, the credit link", () => {
  const t = blocks.specText(blocks.getItem(HF));
  assert.match(t, /^HyperFrames block: "App Showcase" \(registry blocks\/app-showcase/);
  assert.match(t, /Vietnamese: DM Sans has no Vietnamese letters; use a font that has them\./);
  assert.match(t, /Credit: HeyGen \(HyperFrames\), Apache-2\.0, as shipped, https:\/\/github\.com\/heygen-com\/hyperframes\/blob\//);
  assert.doesNotMatch(blocks.specText(blocks.getItem(NONE)), /Vietnamese:/);
});

test("staging copies the registry original into the project for Claude to read", () => {
  const dir = join(T, "project");
  const out = blocks.stageForProject(dir, HF);
  assert.deepEqual(out.files, [".moworks/library/blocks/app-showcase/hf-original/app-showcase.html"]);
  assert.ok(existsSync(join(dir, out.files[0])));
  assert.ok(existsSync(join(dir, ".moworks", "library", "blocks", "app-showcase", "hf-original", "registry-item.json")));
  assert.throws(() => blocks.stageForProject(dir, "block/nope"), { code: "NOT_FOUND" });
});

test("preview files stay inside the store", () => {
  assert.ok(blocks.mediaFile("previews/block__app-showcase.mp4"));
  for (const bad of ["previews/../catalog.json", "../current.json", "catalog.json", "previews/a/b.mp4", "previews/missing.mp4"]) assert.equal(blocks.mediaFile(bad), null, bad);
});

test("blocks API: search with facets, item with spec, media without the token, nothing outside", async () => {
  const r = await api("/library/blocks?q=showcase");
  assert.equal(r.status, 200);
  assert.deepEqual(r.json.items.map((x) => x.id), [HF]);
  assert.deepEqual(r.json.collections, { HyperFrames: 3 });
  assert.equal(r.json.store.items, 3);
  const it = await api("/library/blocks/item?id=" + encodeURIComponent(HF));
  assert.match(it.json.spec, /HyperFrames block: "App Showcase"/);
  assert.equal((await api("/library/blocks/item?id=block%2Fnope")).status, 404);
  const m = await fetch(`http://127.0.0.1:${s.port}/media/blocks/previews/block__app-showcase.mp4`);
  assert.equal(m.status, 200);
  assert.equal(await m.text(), "bytes of app-showcase.mp4");
  assert.equal((await fetch(`http://127.0.0.1:${s.port}/media/blocks/..%2Fcurrent.json`)).status, 404);
});

test("hosted assets: fetched once from HF's CDN only, placed at their path and install target", async () => {
  const e = entry("block/carousel-circle-1");
  const urls = blocks.hostedFilesOf(e.item).map((f) => f.url);
  assert.equal(urls.length, 12);
  let calls = 0;
  const fetchImpl = async (u) => { calls++; return new Response(`img ${u.split("/").pop()}`); };
  await blocks.ensureHosted(e, { fetchImpl });
  await blocks.ensureHosted(e, { fetchImpl });
  assert.equal(calls, 12, "cached after the first time");
  const dir = join(T, "hosted-copy");
  assert.equal(blocks.placeHosted(e, dir), 0);
  assert.equal(readFileSync(join(dir, "assets", "carousel-images", "artist-bob-seger.jpg"), "utf8"), "img 223d162eed10f08f.jpg");
  const off = { item: { files: [{ path: "x.jpg", url: "https://example.com/x.jpg" }, { path: "../../out.jpg", url: "https://static.heygen.ai/a.jpg" }] } };
  assert.deepEqual(blocks.hostedFilesOf(off.item).map((f) => f.path), ["../../out.jpg"], "only the registry CDN");
  await blocks.ensureHosted(off, { fetchImpl });
  blocks.placeHosted(off, dir);
  assert.ok(!existsSync(join(dir, "..", "..", "out.jpg")), "a path outside the copy is skipped");
});

test("preview projects follow HF's method: standalone entry, demo first, wrapper with the authored length", async () => {
  const { prepareProject, entryFileOf } = await import("../packages/blocks-library/previews.mjs");
  const registryDir = expandEnv(loadPins().hyperframes.registryRoot);
  assert.equal(entryFileOf(entry(NONE), registryDir), "demo.html");
  let p = await prepareProject(entry(KIT), { registryDir });
  assert.equal(p.mode, "standalone");
  assert.equal(readFileSync(join(p.dir, "index.html"), "utf8"), readFileSync(join(p.dir, "ai-answer-rank.html"), "utf8"));
  rmSync(p.dir, { recursive: true, force: true });
  p = await prepareProject(entry("block/code-snippet-dark-2026"), { registryDir });
  assert.equal(p.mode, "wrapper");
  const html = readFileSync(join(p.dir, "index.html"), "utf8");
  assert.match(html, /data-composition-id="preview-root"/);
  assert.match(html, /data-composition-src="compositions\/code-snippet-dark-2026\.html"/, "mounted from its install target");
  assert.ok(existsSync(join(p.dir, "compositions", "code-snippet-dark-2026.html")));
  rmSync(p.dir, { recursive: true, force: true });
});

test("rendering a missing preview: web encode, poster, catalog updated; a failure keeps the old preview", async () => {
  const { renderMissing } = await import("../packages/blocks-library/previews.mjs");
  const { execFileSync } = await import("node:child_process");
  const ff = join(expandEnv(loadPins().ffmpeg.dir), "ffmpeg.exe");
  const jobs = [];
  const renderImpl = async (job) => {      // stands in for the HF render: a 1 s test video
    jobs.push(job);
    execFileSync(ff, ["-v", "error", "-y", "-f", "lavfi", "-i", "testsrc=size=1920x1080:rate=24:duration=1", "-pix_fmt", "yuv420p", job.outputPath], { windowsHide: true });
    return { type: "done", duration: 1, hfVersion: "test" };
  };
  const r = await renderMissing({ only: [KIT], renderImpl });
  assert.deepEqual([r.ok, r.failed.length], [1, 0]);
  assert.deepEqual([jobs[0].fps, jobs[0].quality, jobs[0].strictness], [24, "draft", "best-effort"]);
  const it = blocks.getItem(KIT);
  assert.equal(it.preview.source, "rendered");
  assert.match(it.preview.method, /HyperFrames' own catalog preview method/);
  assert.ok(existsSync(join(store.dir, it.preview.poster)));
  const failing = async () => ({ type: "failed", code: "RENDER_FAILED", message: "no WebGPU adapter" });
  const before = blocks.getItem(NONE).preview;
  const f = await renderMissing({ only: [NONE], renderImpl: failing });
  assert.equal(f.failed[0].id, NONE);
  assert.equal(blocks.getItem(NONE).previewError, "RENDER_FAILED: no WebGPU adapter");
  assert.deepEqual(blocks.getItem(NONE).preview, before);
  const m = JSON.parse(readFileSync(join(store.dir, "manifest.json"), "utf8")).previews;
  assert.deepEqual([m.rendered, m.failed], [1, 1]);
  // a new import keeps the rendered preview while the item's files are unchanged
  const again = await blocks.importFromRegistry({ only: [HF, KIT, NONE], fetchImpl: async (u) => new Response("x " + u), google: async () => true });
  assert.equal(blocks.getItem(KIT).preview.source, "rendered");
  assert.ok(existsSync(join(again.dir, blocks.getItem(KIT).preview.video)));
  assert.equal(again.manifest.previews.rendered, 1);
});

test("an HF preview is kept by a new import only while its link and the item's files are the same; else it is downloaded again", async () => {
  const st = blocks.currentStore(), file = join(st.dir, "catalog.json"), cat = JSON.parse(readFileSync(file, "utf8"));
  const urls = [], fetchImpl = async (u) => { urls.push(u); return new Response(`again ${u.split("/").pop()}`); };
  await blocks.importFromRegistry({ only: [HF, KIT, NONE], fetchImpl, google: async () => true });
  assert.ok(!urls.some((u) => u.endsWith("/app-showcase.mp4")), "unchanged: the published preview is not fetched again");
  const now = JSON.parse(readFileSync(file, "utf8"));
  now.items.find((x) => x.id === HF).sourceHash = "0000000000000000";          // as a store built when the item's files were different
  writeFileSync(file, JSON.stringify(now));
  blocks.reloadItems();
  await blocks.importFromRegistry({ only: [HF, KIT, NONE], fetchImpl, google: async () => true });
  assert.ok(urls.some((u) => u.endsWith("/app-showcase.mp4")), "changed: the published preview is downloaded again");
  assert.equal(blocks.getItem(HF).sourceHash, cat.items.find((x) => x.id === HF).sourceHash);
  assert.equal(blocks.getItem(KIT).preview.source, "rendered", "a rendered preview of an unchanged item still carries over");
});

test("only the store for the pinned registry is read: a store built at another pin is never used", async () => {
  const name = blocks.storeName(), pin = loadPins().hyperframes;
  assert.equal(name, `hf-${pin.default}-${blocks.getItem(HF).credit.commit.slice(0, 7)}`);
  const old = join(T, "blocks", "hf-0.0.1-0000000");
  mkdirSync(old, { recursive: true });
  writeFileSync(join(old, "catalog.json"), JSON.stringify({ items: [{ ...blocks.getItem(HF), id: "block/from-another-pin", title: "Old" }] }));
  writeFileSync(join(T, "blocks", "current.json"), JSON.stringify({ dir: "hf-0.0.1-0000000" }));
  blocks.reloadItems();
  assert.equal(blocks.currentStore().dir, join(T, "blocks", name));
  assert.equal(blocks.getItem("block/from-another-pin"), null);
  assert.equal(blocks.items().length, 3);
  writeFileSync(join(T, "blocks", "current.json"), JSON.stringify({ dir: name }));
});
