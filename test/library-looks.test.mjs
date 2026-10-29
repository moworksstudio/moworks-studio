// HyperFrames' looks (the frame presets of the pinned hyperframes skill, assets/frame-presets) and the library as the user
// arranges it: author first, then Motions / Blocks / Looks, then category; HF's originals (the Moworks Motion kit's group was
// removed). Stores are small and built here; Google Fonts is stubbed; one real preview run uses the pinned Chromium.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const T = mkdtempSync(join(tmpdir(), "mw-looks-"));
process.env.MW_WORK_ROOT = join(T, "work");
process.env.MW_STATE_DIR = join(T, "state");
process.env.MW_BLOCKS_ROOT = join(T, "blocks");
process.env.MW_LOOKS_ROOT = join(T, "looks");
process.env.MW_NO_BACKUP = "1";
process.env.MW_NO_LIBRARY_IMPORT = "1";
process.env.MW_NO_ASSET_INSTALL = "1";
process.env.MW_BACKUP_ROOT = join(T, "backup");
const looks = await import("../packages/looks-library/index.mjs");
const blocks = await import("../packages/blocks-library/index.mjs");
const library = await import("../packages/library/index.mjs");
const { startServer } = await import("../packages/server/index.mjs");

let s;
const api = async (path) => { const r = await fetch(`http://127.0.0.1:${s.port}/api${path}`, { headers: { "X-MW-Token": "k" } }); return { status: r.status, json: await r.json().catch(() => null) }; };

before(async () => {
  await blocks.importFromRegistry({ only: ["component/blur-out-up", "block/app-showcase"], fetchImpl: async () => new Response("x"), google: async () => true });
  s = await startServer({ token: "k" });
});
after(async () => { await s?.close(); rmSync(T, { recursive: true, force: true }); });

test("looks from the pinned clone: 13 frame presets, each credited at the commit", () => {
  const all = looks.registryLooks();
  assert.equal(all.length, 13); assert.ok(all.every((x) => x.kind === "frame"));
  const bp = all.find((x) => x.id === "frame/bold-poster");
  assert.equal(bp.title, "Bold Poster");
  assert.ok(bp.colors.includes("#D8000F") && bp.fonts.includes("Shrikhand"));
  assert.match(bp.credit.link, /^https:\/\/github\.com\/heygen-com\/hyperframes\/blob\/[0-9a-f]{40}\/skills\/hyperframes\/assets\/frame-presets\/bold-poster\/FRAME\.md$/);
  assert.deepEqual([bp.credit.author, bp.credit.licence, bp.credit.made], ["HeyGen (HyperFrames)", "Apache-2.0", "as shipped"]);
});

test("Vietnamese check of a look's fonts: bundled, Windows, Google", async () => {
  const asked = [];
  const google = async (f) => { asked.push(f); return f !== "Shrikhand"; };
  assert.deepEqual((await looks.vietnameseCheck(["Inter", "Arial"], { google })).status, "ok");
  assert.deepEqual(asked, [], "bundled and Windows fonts need no question");
  const r = await looks.vietnameseCheck(["Libre Baskerville", "Shrikhand"], { google });
  assert.equal(r.status, "missing");
  assert.deepEqual(r.families.filter((f) => f.vi === false).map((f) => f.family), ["Shrikhand"]);
  assert.equal((await looks.vietnameseCheck([], { google })).status, null);
});

test("the store: checks and real previews (a frame preset: HF's own showcase frames as a slideshow)", { timeout: 180000 }, async () => {
  const st = await looks.importLooks({ only: ["frame/cobalt-grid", "frame/bold-poster"], google: async () => true });
  assert.deepEqual([st.manifest.items, st.manifest.previews], [2, 2]);
  const f = looks.getItem("frame/cobalt-grid");
  assert.ok(existsSync(join(st.dir, f.preview.poster)) && existsSync(join(st.dir, f.preview.video)));
  assert.equal(f.preview.frames, 6);
  assert.ok(looks.mediaFile(f.preview.poster));
  for (const bad of ["previews/../catalog.json", "../current.json", "catalog.json"]) assert.equal(looks.mediaFile(bad), null, bad);
});

test("staging a look for Claude: the preset with HF's guide to a design spec (references/look.md)", () => {
  const dir = join(T, "project");
  const r = looks.stageForProject(dir, "frame/cobalt-grid");
  assert.deepEqual(r.files, [".moworks/library/looks/frame/cobalt-grid/hf-original/FRAME.md", ".moworks/library/looks/frame/cobalt-grid/hf-original/look.md"]);
  assert.ok(r.files.every((f) => existsSync(join(dir, f))));
  assert.match(readFileSync(join(dir, r.files[1]), "utf8"), /^# The look/);
  assert.throws(() => looks.stageForProject(dir, "frame/nope"), { code: "NOT_FOUND" });
  assert.match(looks.specText(looks.getItem("frame/cobalt-grid")), /^HyperFrames look \(frame preset\): "Cobalt Grid"\. Adopt it the HyperFrames way: its FRAME\.md becomes the project's frame\.md/);
});

test("library: author first, then Motions / Blocks / Looks, then category; nothing of the removed kit group is listed", () => {
  const r = library.search({});
  assert.equal(r.authors.HyperFrames, 1 + 1 + 2, "HF: component (motion), block, 2 looks in the store");
  assert.equal(r.authors.Moworks, undefined, "the kit's authors are gone from the Author row");
  assert.ok(!library.all().some((x) => x.origin === "kit"));
  const hf = library.search({ author: "HyperFrames" });
  assert.deepEqual(hf.kinds, { motion: 1, block: 1, look: 2 });
  const motions = library.search({ author: "HyperFrames", kind: "motion" }).items.map((x) => x.uid).sort();
  assert.deepEqual(motions, ["hf:component/blur-out-up"]);
  assert.equal(library.search({ author: "HyperFrames", kind: "look" }).categories["Brand Kits"], 2);
  const look = library.getItem("look:frame/cobalt-grid");
  assert.deepEqual([look.library, look.kind], ["looks", "look"]);
  assert.equal(library.getItem("hf:component/blur-out-up").library, "blocks");
  assert.equal(library.getItem("kit:text/wobble"), null, "a kit id is no longer in the library");
});

test("library API: one list with the three facets, items with their text, previews served without the token", async () => {
  const r = await api("/library?author=HyperFrames&kind=look");
  assert.equal(r.status, 200);
  assert.deepEqual(r.json.items.map((x) => x.uid).sort(), ["look:frame/bold-poster", "look:frame/cobalt-grid"]);
  assert.ok(r.json.stores.looks && r.json.stores.blocks);
  assert.ok(!("motion" in r.json.stores), "no kit store in the Library");
  const it = await api("/library/item?uid=" + encodeURIComponent("look:frame/bold-poster"));
  assert.match(it.json.spec, /^HyperFrames look \(frame preset\): "Bold Poster"/);
  assert.equal((await api("/library/item?uid=look%3Anope")).status, 404);
  const poster = r.json.items.find((x) => x.uid === "look:frame/cobalt-grid").poster;
  const m = await fetch(`http://127.0.0.1:${s.port}${poster}`);
  assert.deepEqual([m.status, m.headers.get("content-type")], [200, "image/webp"], "posters are WebP (D40)");
  assert.equal((await fetch(`http://127.0.0.1:${s.port}/media/looks/..%2Fcurrent.json`)).status, 404);
});

test("only the store for the pinned clone is read: a store built at another pin (folders gone from the clone) never reaches lookFrame or staging", () => {
  const name = looks.storeName();
  assert.match(name, /^hf-\d+\.\d+\.\d+-[0-9a-f]{7}$/);
  assert.equal(looks.currentStore().dir, join(T, "looks", name));
  const old = join(T, "looks", "hf-0.0.1-0000000");          // as 0.8.163 stores were: the presets under another folder
  mkdirSync(old, { recursive: true });
  writeFileSync(join(old, "catalog.json"), JSON.stringify({ items: [{ ...looks.getItem("frame/cobalt-grid"), folder: "frame-presets/cobalt-grid", file: "frame-presets/cobalt-grid/FRAME.md" },
    { id: "style/old", kind: "style", name: "old", title: "Old", description: "", colors: [], fonts: [], folder: "styles/old", file: "styles/old/STYLE.md", credit: {} }] }));
  writeFileSync(join(T, "looks", "current.json"), JSON.stringify({ dir: "hf-0.0.1-0000000" }));
  assert.equal(looks.currentStore().dir, join(T, "looks", name));
  assert.deepEqual(looks.items().map((l) => l.id).sort(), ["frame/bold-poster", "frame/cobalt-grid"]);
  assert.ok(looks.items().every((l) => l.kind === "frame" && l.category === "Brand Kits"));
  assert.match(looks.lookFrame("frame/cobalt-grid").text, /^---/);
  assert.ok(existsSync(join(T, "p2", looks.stageForProject(join(T, "p2"), "frame/cobalt-grid").files[0])));
  writeFileSync(join(T, "looks", "current.json"), JSON.stringify({ dir: name }));
});
