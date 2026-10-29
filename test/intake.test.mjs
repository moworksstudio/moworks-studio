// The library intake: Magic UI and Codrops written as HyperFrames components (packages/intake-library). Credits at the commit,
// no remote URL and no wall clock in any motion, Vietnamese typed in NFD splitting into whole letters, the library listing them under
// their authors (every item, none hidden), staging for Claude, and one real preview made the way a film is exported (finalize, the export checks,
// the render worker).
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const T = mkdtempSync(join(tmpdir(), "mw-intake-"));
process.env.MW_WORK_ROOT = join(T, "work");
process.env.MW_STATE_DIR = join(T, "state");
process.env.MW_BLOCKS_ROOT = join(T, "blocks");
process.env.MW_LOOKS_ROOT = join(T, "looks");
process.env.MW_INTAKE_ROOT = join(T, "intake");
process.env.MW_NO_BACKUP = "1";
process.env.MW_NO_LIBRARY_IMPORT = "1";
process.env.MW_NO_ASSET_INSTALL = "1";
process.env.MW_BACKUP_ROOT = join(T, "backup");
const intake = await import("../packages/intake-library/index.mjs");
const { buildItem } = await import("../packages/intake-library/build.mjs");
const { HELPERS, helperSource } = await import("../packages/intake-library/helpers.mjs");
const { previewOne } = await import("../packages/intake-library/previews.mjs");
const library = await import("../packages/library/index.mjs");
const { loadHf } = await import("../packages/hf-edit/load.mjs");
const { expandEnv, loadPins } = await import("../packages/version-manager/index.mjs");

let items;
before(async () => { items = await intake.loadItems(); await intake.buildStore(); intake.reloadItems(); library.reload(); });
after(() => rmSync(T, { recursive: true, force: true }));

test("every intake item is credited at its source: author, permalink at the commit (or the item's URL), licence, how it was made", () => {
  const by = (a) => items.filter((x) => x.author === a).length;
  assert.equal(by("magicui"), 79, "the 79 Magic UI components");
  assert.equal(by("codrops"), 34, "Codrops: 29 on-scroll effects and 5 image expansions");
  for (const it of items) {
    const c = intake.creditOf(it);
    if (it.author === "magicui") assert.match(c.link, /^https:\/\/github\.com\/magicuidesign\/magicui\/blob\/efe76fc5755eca1142dd4f74c1d6f0ace2887e3c\/apps\/www\/registry\/magicui\/[\w-]+\.tsx$/, it.uid);
    if (it.author === "codrops") assert.match(c.link, /^https:\/\/github\.com\/codrops\/(OnScrollTypographyAnimations\/blob\/af28d61d1f8d3d117f5d1e9b09d5209e20a1a212\/src\/js\/index2?\.js#L\d+-L\d+|ImageExpansionTypography\/blob\/0d614791f94198bcab655762b26a3cb85da851f4\/js\/effect-\d\/expandImageEffect\.js)$/, it.uid);
    if (it.author === "takayu") {
      // a website without a licence: ideas and numbers only, each motion written here; the credit links the motion's own page
      assert.match(c.link, /^https:\/\/motion-reference\.takayustudio\.jp\/#motion=[\w-]+$/, it.uid);
      assert.match(c.licence, /^No licence stated/); assert.ok(c.made.startsWith("written from the idea"), it.uid);
    } else assert.equal(c.licence, "MIT");
    assert.ok(["adapted", "as shipped", "written from the idea"].some((m) => c.made.startsWith(m)), it.uid);
    assert.ok(c.author && (c.commit || it.author === "takayu") && c.read, it.uid);
  }
  // the source file each permalink names exists in the clone read for the intake (when the clone is on this computer: vendor/intake/magicui
  // in the work folder, or MW_MAGICUI_CLONE)
  const clone = process.env.MW_MAGICUI_CLONE ?? join(expandEnv(loadPins().storage.workRoot), "vendor", "intake", "magicui");
  if (existsSync(clone)) for (const it of items.filter((x) => x.author === "magicui")) assert.ok(existsSync(join(clone, it.source.path)), it.source.path);
});

test("no remote URL, no wall clock: each component is a snippet, a demo on the film's GSAP and its timeline only", () => {
  for (const it of items) {
    const { files } = buildItem(it, intake.creditOf(it));
    for (const [n, text] of Object.entries(files)) if (n.endsWith(".html")) assert.doesNotMatch(text.replace(/http:\/\/www\.w3\.org\/[\w/.]+/g, ""), /https?:\/\//, `${it.uid} ${n}`);
    assert.match(files["demo.html"], /<script src="assets\/vendor\/gsap\.min\.js"><\/script>/, it.uid);
    assert.match(files["demo.html"], /window\.__timelines\["mw-demo"\] = tl/, it.uid);
    assert.doesNotMatch(it.fn.toString(), /Math\.random|Date\.now|performance\.now|requestAnimationFrame|setTimeout|setInterval|gsap\.timeline\(/, it.uid);
    assert.match(files[`${it.id}.html`], new RegExp(`MW\\.\\w+ = function \\(el, tl, at, options\\)`), it.uid);
    const reg = JSON.parse(files["registry-item.json"]);
    assert.equal(reg.type, it.kind === "block" ? "hyperframes:block" : "hyperframes:component");
    assert.equal(reg.moworks.credit.link, intake.creditOf(it).link);
  }
});

test("Vietnamese typed in NFD splits into whole letters (each mark stays on its letter)", async () => {
  const { linkedom } = await loadHf();
  const { document, window } = linkedom.parseHTML("<!doctype html><html><body><h1>x</h1></body></html>");
  const h = document.querySelector("h1");
  h.textContent = "Chuyển động".normalize("NFD");
  const MW = {};
  new Function("window", "document", "MW", helperSource(["split"]))(window, document, MW);
  const { chars, words } = MW.split(h, "chars");
  assert.deepEqual(chars.map((c) => c.textContent), [..."Chuyểnđộng"].map((c) => c.normalize("NFC")));
  assert.equal(words.length, 2);
  assert.ok(chars.every((c) => c.textContent === c.textContent.normalize("NFC")));
  assert.ok(Object.keys(HELPERS).includes("spring"));
});

test("the library lists the intake under its authors, with credits, every item shown; Claude gets the component", () => {
  const r = library.search({ limit: 5 });
  assert.equal(r.authors["Magic UI"], 79);
  assert.equal(r.authors["Codrops"], 34);
  const m = library.search({ author: "Magic UI", limit: 100 });
  assert.equal(m.kinds.motion + m.kinds.block, 79);
  const card = library.search({ q: "border beam", author: "Magic UI" }).items[0];
  assert.equal(card.uid, "in:magicui/border-beam");
  assert.equal(card.credit.author, "Magic UI (magicuidesign)");
  const full = library.getItem(card.uid);
  assert.equal(full.library, "intake");
  assert.match(full.spec, /MW\.borderBeam\(/);
  assert.match(full.spec, /github\.com\/magicuidesign\/magicui\/blob\/efe76fc/);
  const proj = join(T, "film");
  const staged = intake.stageForProject(proj, card.uid);
  for (const f of staged.files) assert.ok(existsSync(join(proj, f)), f);
  assert.match(readFileSync(join(proj, staged.files[0]), "utf8"), /MW\.borderBeam = function/);
  const globe = intake.stageForProject(proj, "in:magicui/globe");
  assert.ok(existsSync(join(proj, ".moworks/library/intake/magicui/globe/assets/vendor/cobe-0.6.4.js")), "the vendored cobe travels with the globe");
  void globe;
  assert.equal(library.search({ author: "Codrops" }).authors["Codrops"], 34, "every item of the source");
  assert.equal(typeof intake.setDropped, "undefined", "no item is hidden (owner: a source's items as shipped)");
});

test("the user deletes an item for good: card, component and preview leave, a rebuild keeps it out, restore brings it back", async () => {
  const uid = "in:codrops/flicker", st = intake.currentStore();
  assert.equal(library.search({ q: "flicker", author: "Codrops" }).items[0]?.deletable, true);
  const r = intake.deleteItem(uid);
  assert.equal(r.deleted, true);
  library.reload();
  assert.equal(library.search({ author: "Codrops" }).authors["Codrops"], 33);
  assert.equal(library.getItem(uid), null);
  assert.ok(!existsSync(join(st.dir, "items/codrops/flicker")));
  assert.deepEqual(intake.deletedList().map((x) => x.uid), [uid]);
  await intake.buildStore(); intake.reloadItems(); library.reload();
  assert.equal(library.getItem(uid), null, "a rebuild does not bring it back");
  assert.throws(() => intake.deleteItem(uid), /not found/);
  intake.restoreItem(uid);
  await intake.buildStore(); intake.reloadItems(); library.reload();
  assert.equal(library.getItem(uid)?.title, intake.getItem(uid).title);
  assert.ok(existsSync(join(st.dir, "items/codrops/flicker/demo.html")));
  assert.equal(intake.deletedList().length, 0);
});

test("delete through the server (the Delete button on a card): token needed, gone from the library, listed as deleted", async () => {
  const { startServer } = await import("../packages/server/index.mjs");
  const s = await startServer({ token: "k" });
  try {
    const call = (method, path, body) => fetch(`http://127.0.0.1:${s.port}/api${path}`, { method, headers: { "X-MW-Token": "k", ...(body ? { "Content-Type": "application/json" } : {}) },
      body: body && JSON.stringify(body) }).then(async (r) => ({ status: r.status, json: await r.json().catch(() => null) }));
    const uid = "in:magicui/meteors";
    assert.equal((await fetch(`http://127.0.0.1:${s.port}/api/library/intake/delete`, { method: "POST", body: JSON.stringify({ uid }) })).status, 401);
    const d = await call("POST", "/library/intake/delete", { uid });
    assert.equal(d.status, 200, JSON.stringify(d.json));
    assert.equal((await call("GET", `/library/item?uid=${encodeURIComponent(uid)}`)).status, 404);
    assert.deepEqual((await call("GET", "/library/intake/deleted")).json.items.map((x) => x.uid), [uid]);
    assert.equal((await call("POST", "/library/intake/delete", { uid: "in:magicui/nope" })).status, 404);
    intake.restoreItem(uid);
    await intake.buildStore(); intake.reloadItems(); library.reload();
  } finally { await s.close?.(); }
});

test("a preview is a film: finalize, the export checks (offline, fonts, Vietnamese letters, script errors), then the render worker", { timeout: 240000 }, async () => {
  const it = intake.getItem("in:codrops/tilt-pop");
  const r = await previewOne(it);
  assert.equal(r.error ?? null, null, r.error);
  assert.equal(r.check.pass, true, JSON.stringify(r.check.findings));
  assert.equal(r.vi, "ok", "the demo's Vietnamese headline passes G-GLYPH");
  const st = intake.currentStore();
  assert.ok(statSync(join(st.dir, r.preview.video)).size > 5000);
  assert.ok(statSync(join(st.dir, r.preview.poster)).size > 2000);
  intake.mergePreviews();
  assert.equal(intake.getItem("in:codrops/tilt-pop").preview.video, r.preview.video);
});

test("the user's filing (classification.json): every item has a kind and a category, none is left over, and a reclassification keeps a preview's hash", async () => {
  const filing = JSON.parse(readFileSync(new URL("../packages/intake-library/classification.json", import.meta.url), "utf8"));
  const items = await intake.loadItems();
  assert.deepEqual(items.filter((x) => !filing[x.uid]).map((x) => x.uid), [], "every item is filed");
  assert.deepEqual(Object.keys(filing).filter((u) => !items.some((x) => x.uid === u)), [], "no line for an item that is gone");
  for (const it of items) assert.ok(["motion", "block"].includes(it.kind) && it.category === filing[it.uid].category && it.kind === filing[it.uid].kind, it.uid);
  const { buildItem } = await import("../packages/intake-library/build.mjs");
  const it = items.find((x) => x.uid === "in:codrops/tilt-pop"), credit = intake.creditOf(it);
  assert.equal(buildItem({ ...it, kind: "block" }, credit).hash, buildItem({ ...it, kind: "motion" }, credit).hash, "the kind is not part of the film's hash");
});
