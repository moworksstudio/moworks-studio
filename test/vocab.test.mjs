// Vocabulary: Motion Prompt's 168 names, numbers and Canvas samples, taken as shipped from the pinned clone into the Library's
// fourth type under its author. Unit level: no server, no browser; the author's 168 sample functions are run against a stand-in canvas.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import vm from "node:vm";

const T = mkdtempSync(join(tmpdir(), "mw-vocab-"));
process.env.MW_WORK_ROOT = join(T, "work");
process.env.MW_STATE_DIR = join(T, "state");
process.env.MW_VOCAB_ROOT = join(T, "vocab");
process.env.MW_BLOCKS_ROOT = join(T, "blocks");
process.env.MW_LOOKS_ROOT = join(T, "looks");
process.env.MW_INTAKE_ROOT = join(T, "intake");
process.env.MW_NO_BACKUP = "1";
process.env.MW_NO_LIBRARY_IMPORT = "1";
process.env.MW_NO_ASSET_INSTALL = "1";
process.env.MW_BACKUP_ROOT = join(T, "backup");
const vocab = await import("../packages/vocab-library/index.mjs");
const library = await import("../packages/library/index.mjs");
const { librarySearch, searchText } = await import("../packages/library/search-tool.mjs");
const { requiredReads } = await import("../packages/agent/reads.mjs");
const { loadPins } = await import("../packages/version-manager/index.mjs");

const src = vocab.source();
const have = existsSync(join(src.dir, "api", "v1", "catalog.json"));
const opts = { skip: have ? false : `the Motion Prompt clone is not at ${src.dir}` };
let built;
before(() => { if (have) built = vocab.buildStore(); });
after(() => rmSync(T, { recursive: true, force: true }));

/** A canvas that accepts every call the author's samples make (they draw nothing here; the point is that no sample throws). */
function fakeCanvas(w = 539, h = 208) {
  const grad = { addColorStop() {} };
  const ctx = new Proxy({}, {
    get(o, p) {
      if (p in o) return o[p];
      if (p === "canvas") return fake;
      if (p === "measureText") return (s) => ({ width: String(s).length * 10, actualBoundingBoxAscent: 8, actualBoundingBoxDescent: 2 });
      if (p === "getImageData" || p === "createImageData") return (x, y, ww, hh) => ({ data: new Uint8ClampedArray(Math.max(1, (ww ?? w) * (hh ?? h) * 4)), width: ww ?? w, height: hh ?? h });
      if (p === "getTransform") return () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 });
      if (p === "createLinearGradient" || p === "createRadialGradient" || p === "createConicGradient") return () => grad;
      if (p === "createPattern") return () => ({});
      if (p === "isPointInPath" || p === "isPointInStroke") return () => false;
      return () => undefined;
    },
    set(o, p, v) { o[p] = v; return true; },
  });
  const fake = { width: w, height: h, getContext: () => ctx, style: {} };
  return { ctx, fake };
}

test("the pin names the author's commit and the store is built from exactly it", opts, () => {
  const pin = loadPins().motionPrompt;
  assert.equal(pin.commit, "bd6bf08d8d412cc82c1bbc8f1a81638617a45cfb");
  assert.equal(pin.repo, "showheyohtaki/motion-prompt");
  assert.equal(built.items, 168);
  assert.equal(built.commit, pin.commit);
  const st = vocab.currentStore();
  assert.equal(st.manifest.items, 168);
  assert.deepEqual(st.manifest.packs, { motion: 24, camera: 24, ui: 24, lp: 24, photo: 24, motion2: 24, lp2: 24 });
  for (const f of ["LICENSE", "THIRD-PARTY-NOTICES.md"]) assert.ok(existsSync(join(st.dir, f)), f);
  assert.match(readFileSync(join(st.dir, "LICENSE"), "utf8"), /MIT License[\s\S]*Shohei Ohtaki/);
});

test("168 items as shipped: numbers 001-168, every language and spec line kept, nothing hidden", opts, () => {
  const list = vocab.items();
  assert.deepEqual(list.map((x) => x.id), Array.from({ length: 168 }, (_, i) => String(i + 1).padStart(3, "0")));
  const st = vocab.currentStore();
  for (const it of list) {
    const e = readFileSync(join(st.dir, "items", `${it.id}.en.txt`), "utf8").replace(/\r\n/g, "\n");
    assert.ok(e.startsWith(it.credit.line), `${it.id}: the file starts with the author's licence line`);
    // the author's spec lines, verbatim, are the "Motion spec" block of his own file
    for (const l of it.spec.en) assert.ok(e.includes(l), `${it.id}: spec line kept: ${l.slice(0, 40)}`);
    assert.ok(it.spec.en.length >= 3 && it.title && it.meaning.en && it.ask.en && it.summary.en, `${it.id}: name, meaning, ask, summary and 3+ spec lines`);
    assert.ok(it.names.en && it.names.ja, `${it.id}: English and Japanese names`);
  }
  assert.ok(list.filter((x) => x.names["zh-Hant"]).length >= 120, "the traditional Chinese the author added to the first five packs");
  assert.equal(list.find((x) => x.id === "032").title, "Dolly zoom (Vertigo)");
});

test("every item carries the credit the user's rule asks for", opts, () => {
  for (const it of vocab.items()) {
    const c = it.credit;
    assert.match(c.author, /Shohei Ohtaki/);
    assert.equal(c.licence, "MIT");
    assert.equal(c.made, "as shipped");
    assert.equal(c.commit, "bd6bf08d8d412cc82c1bbc8f1a81638617a45cfb");
    assert.equal(c.link, `https://github.com/showheyohtaki/motion-prompt/blob/${c.commit}/packs/${it.pack}/meta.json`);
    assert.equal(c.codeLink, `https://github.com/showheyohtaki/motion-prompt/blob/${c.commit}/packs/${it.pack}/pack.js`);
    assert.equal(c.demoLink, `https://showheyohtaki.github.io/motion-prompt/#${it.id}`);
    assert.match(c.madeNote, /unchanged/);
    assert.equal(c.line, `// Motion Prompt #${it.id} · MIT License (c) 2026 Shohei Ohtaki · https://showheyohtaki.github.io/motion-prompt/#${it.id}`);
  }
});

test("the author's 168 sample functions compile and draw without throwing at three times in their cycle", opts, () => {
  const st = vocab.currentStore();
  let n = 0;
  for (const it of vocab.items()) {
    const { ctx, fake } = fakeCanvas(it.width, it.height);
    const sandbox = { document: { createElement: () => fakeCanvas(it.width, it.height).fake }, Math, performance: { now: () => 0 }, console };
    const m = vm.runInNewContext(vocab.runScript(it, st), sandbox, { filename: `vocab-${it.id}.js` });
    assert.equal(typeof m.cell, "function", `${it.id}: the element's function`);
    assert.equal(m.w, it.width); assert.equal(m.h, it.height); assert.equal(m.cycle, it.cycle);
    for (const u of [0, it.cycle / 2, it.cycle * 0.99]) { m.cell(ctx, m.w, m.h, u); n++; }
    void fake;
  }
  assert.equal(n, 168 * 3);
});

test("the Library lists them as the fourth type under their author, away from the runnable motions", opts, () => {
  assert.equal(library.KINDS.vocab, "Vocabulary");
  const r = library.search({ author: "Shohei Ohtaki", limit: 200 });
  assert.equal(r.total, 168);
  assert.deepEqual(r.kinds, { vocab: 168 });
  assert.ok(r.items.every((x) => x.kind === "vocab" && x.origin === "vocab" && x.canvas.page.startsWith("/media/vocab/") && x.credit.licence === "MIT"));
  assert.ok(Object.keys(r.categories).length >= 18, "the author's own categories");
  assert.ok(!library.search({ kind: "motion", limit: 500 }).items.some((x) => x.kind === "vocab"), "never mixed with Motions");
  const one = library.getItem("vocab:032");
  assert.equal(one.library, "vocab");
  assert.equal(one.author, "Shohei Ohtaki");
  assert.match(one.spec, /Dolly zoom/);
  assert.match(one.spec, /Credit: Shohei Ohtaki \(X @showheyohtaki\), MIT, as shipped, https:\/\/github\.com\/showheyohtaki\/motion-prompt\/blob\/bd6bf08/);
  assert.deepEqual(one.size, { w: 539, h: 208, cycle: 9.4 });
});

test("library_search asks for the names and numbers with kind vocab, and a plain search never returns them", opts, async () => {
  const hits = await librarySearch("dolly zoom vertigo", { kind: "vocab", root: undefined, hfRank: false });
  assert.equal(hits[0].uid, "vocab:032");
  const text = searchText("dolly zoom vertigo", hits);
  assert.match(text, /vocab:032 "Dolly zoom \(Vertigo\)" \(vocab\)/);
  assert.match(text, /3\.2 m → 8 m/, "the author's numbers come back with the name");
  const freeze = searchText("freeze frame", await librarySearch("freeze frame", { kind: "vocab", hfRank: false }));
  assert.match(freeze, /Studio note: Freeze frame: nothing is still for more than 2 s/);
  const type = searchText("typewriter", await librarySearch("typewriter text", { kind: "vocab", hfRank: false }));
  assert.match(type, /App note \(HyperFrames first\)/);
  const plain = await librarySearch("dolly zoom", { kind: "any", hfRank: false });
  assert.ok(plain.every((x) => x.kind !== "vocab"));
});

test("an item cited in a Motion Plan is copied into the project with the author's licence line and numbers", opts, () => {
  const p = join(T, "project");
  mkdirSync(p, { recursive: true });
  const r = library.stageItem(p, "vocab:027");
  assert.equal(r.uid, "vocab:027");
  assert.deepEqual(r.files, [".moworks/library/vocab/027/NUMBERS.txt", ".moworks/library/vocab/027/027.txt", ".moworks/library/vocab/kit/camera.js"]);
  for (const f of r.files) assert.ok(existsSync(join(p, ...f.split("/"))), f);
  assert.match(readFileSync(join(p, ".moworks/library/vocab/027/027.txt"), "utf8"), /^\/\/ Motion Prompt #027 · MIT License \(c\) 2026 Shohei Ohtaki/);
  assert.match(readFileSync(join(p, ".moworks/library/vocab/027/NUMBERS.txt"), "utf8"), /words and numbers, not code to paste/);
  assert.ok(library.stageItem(p, "#027"), "the author's number alone finds it too");
  assert.equal(library.stageItem(p, "vocab:999"), null);
});

test("the sample pages and scripts are served from the store and nowhere else", opts, () => {
  const html = vocab.media("032.html");
  assert.equal(html.type, "text/html; charset=utf-8");
  assert.match(html.body, /<canvas id="c" width="539" height="208">/);
  assert.match(html.body, /Motion Prompt #032 · MIT License/);
  assert.match(vocab.media("032.js").body, /^\(function \(\) \{/);
  for (const bad of ["../LICENSE", "032", "032.txt", "0320.html", "abc.html", "032.html/../x"]) assert.equal(vocab.media(bad), null, bad);
});

test("the Motion Plan reads a generated names table of the film packs; every other item stays a search away", opts, () => {
  const text = vocab.glossaryText(vocab.items(), src);
  const file = join(import.meta.dirname, "..", "config", "rules", "motion-vocab", "SKILL.md");
  assert.equal(readFileSync(file, "utf8"), text, "config/rules/motion-vocab/SKILL.md is generated: node tools/intake-motion-prompt.mjs");
  const lines = text.split("\n").filter((l) => l.startsWith("- #"));
  assert.equal(lines.length, 72, "motion, motion2 and camera only: 3 packs of 24");
  assert.ok(lines[0].startsWith("- #001 Pop-in:") && lines.at(-1).includes("L-cut"));
  assert.ok(!/ #(049|073|097|145)\b/.test(text), "the web and photo packs are not in the names table");
  assert.ok(text.length / 4 < 2400, `a short table: about ${Math.round(text.length / 4)} tokens`);
  assert.match(text, /library_search\*\* with kind "vocab"/);
  assert.match(text, /\*\*HyperFrames first\.\*\*/);
  // read in the Motion Plan only
  const dir = join(T, "film");
  mkdirSync(join(dir, ".moworks", "rules", "motion-vocab"), { recursive: true });
  writeFileSync(join(dir, ".moworks", "rules", "motion-vocab", "SKILL.md"), text);
  const reads = (step) => requiredReads(dir, { styleId: "general", step });
  assert.ok(reads("motionSpec").includes(".moworks/rules/motion-vocab/SKILL.md"));
  for (const s of ["brief", "storyboard", "build", "qcReview", "sound", "chat"]) assert.ok(!reads(s).includes(".moworks/rules/motion-vocab/SKILL.md"), s);
});

test("the studio's notes and HyperFrames-first lines are the app's and marked as such; the author's text is untouched", opts, () => {
  const lens = vocab.items().find((x) => x.id === "109");
  assert.match(lens.studioNote, /^Lens flare: banned as a default/);
  assert.equal(lens.summary.en, JSON.parse(readFileSync(join(src.dir, "api", "v1", "catalog.json"), "utf8")).elements.find((e) => e.id === "109").summary.en);
  assert.match(vocab.specText(lens), /\nStudio note: Lens flare/);
  assert.ok(vocab.items().filter((x) => x.studioNote).length >= 12);
});

test("over HTTP: the Library page, one item and the author's sample page", opts, async () => {
  const { startServer } = await import("../packages/server/index.mjs");
  const s = await startServer({ token: "k" });
  try {
    const api = async (path) => { const r = await fetch(`http://127.0.0.1:${s.port}/api${path}`, { headers: { "X-MW-Token": "k" } }); return { status: r.status, json: await r.json().catch(() => null) }; };
    const page = await api("/library?author=Shohei%20Ohtaki&kind=vocab&q=orbit&limit=5");
    assert.equal(page.status, 200);
    assert.ok(page.json.items.some((x) => x.uid === "vocab:030" && x.kind === "vocab" && x.credit.licence === "MIT"));
    assert.equal(page.json.stores.vocab.items, 168);
    assert.equal((await api("/library?kinds=motion,block&author=Shohei%20Ohtaki")).json.total, 0, "a page that asks only for motions and blocks does not get them");
    const item = await api("/library/item?uid=vocab:032");
    assert.equal(item.json.library, "vocab");
    assert.match(item.json.spec, /8 m/);
    const html = await fetch(`http://127.0.0.1:${s.port}/media/vocab/032.html`);
    assert.equal(html.status, 200);
    assert.match(html.headers.get("content-type"), /^text\/html/);
    assert.match(await html.text(), /Motion Prompt #032 · MIT License/);
    assert.equal((await fetch(`http://127.0.0.1:${s.port}/media/vocab/..%2Fcurrent.json`)).status, 404);
    assert.equal((await fetch(`http://127.0.0.1:${s.port}/media/vocab/999.html`)).status, 404);
  } finally { await s.close(); }
});

test("each item's preview is a HyperFrames page of the author's own sample, kept by the item's hash; the card shows it, the store serves it", async () => {
  const v = await import("../packages/vocab-library/index.mjs"), p = await import("../packages/vocab-library/previews.mjs");
  const st = v.currentStore();
  if (!st) return;
  const it = v.items()[0], page = p.previewPage(it, st);
  assert.match(page, new RegExp(`data-composition-id="main"[^>]*data-duration="${it.cycle}"[^>]*data-width="${it.width}"[^>]*data-height="${it.height}"`));
  assert.match(page, /window\.render = function \(t\)/);
  assert.match(page, /window\.READY = true/);
  assert.doesNotMatch(page, /["'`]https?:\/\//, "the author's links are never read as a load (G-REMOTE)");
  const pv = v.previewOf(it);
  if (pv) {
    const card = (await import("../packages/library/index.mjs")).all().find((x) => x.uid === it.uid);
    assert.equal(card.poster, `/media/vocab/previews/${pv.poster}`);
    assert.equal(v.media(`previews/${pv.poster}`).type, "image/webp");
  }
  assert.equal(v.media("previews/../x.webp"), null);
});
