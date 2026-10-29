// The Google Fonts that draw Vietnamese. The pinned list (config/google-fonts-vi.json), the font check and the Brand Kit stop-and-ask
// that read it, and the one-time install of a family's pinned files into a film. No test reaches the network: a family's files are served here.
// Run: npm test
import { test, after, before } from "node:test";
import assert from "node:assert/strict";
import { cpSync, existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { APP_ROOT } from "../packages/version-manager/index.mjs";

const T = mkdtempSync(join(tmpdir(), "mw-fonts-vi-"));
const REAL = join(APP_ROOT, "config", "google-fonts-vi.json");
const mod = await import("../packages/hf-edit/googleFontsVi.mjs");
const { gitBlobSha1, installViFamily, placeViFamily, viCatalog, viCredit, viEntry, viLine, viOptionsText, viStatus, viSuggest, viVerified } = mod;
const real = JSON.parse(readFileSync(REAL, "utf8"));
const fonts = JSON.parse(readFileSync(join(APP_ROOT, "config", "fonts.json"), "utf8"));
before(() => { process.env.MW_FONTS_VI_DIR = join(T, "cache"); });
after(() => { delete process.env.MW_FONTS_VI_LIST; delete process.env.MW_FONTS_VI_DIR; rmSync(T, { recursive: true, force: true }); });

test("the list is pinned to one google/fonts commit and every family carries what the credit needs", () => {
  assert.match(real.source.commit, /^[0-9a-f]{40}$/);
  assert.equal(real.source.link, `https://github.com/google/fonts/tree/${real.source.commit}`);
  const names = Object.keys(real.families);
  assert.equal(names.length, 543, "543 families have the vietnamese subset at e7db6ca");
  for (const [name, f] of Object.entries(real.families)) {
    assert.match(f.licence, /^(OFL-1\.1|Apache-2\.0|UFL-1\.0)$/, name);
    assert.ok(f.designer, `${name}: designer`);
    assert.ok(["sans", "serif", "display", "handwriting", "mono"].includes(f.category), `${name}: ${f.category}`);
    assert.match(f.folder, /^(ofl|apache|ufl)\/[a-z0-9]+$/, name);
    assert.ok(f.files.length && f.files.every(([file, style, from, to, bytes, sha]) => file && ["normal", "italic"].includes(style) && from <= to && bytes > 0 && /^[0-9a-f]{40}$/.test(sha)), `${name}: files`);
    assert.equal(f.bytes, f.files.reduce((a, x) => a + x[4], 0), `${name}: bytes`);
  }
  assert.equal(names.filter((n) => real.families[n].bytes > real.bigBytes).length, 33, "33 families are large (over 5 MB)");
  assert.equal(names.filter((n) => !real.families[n].licenceFile).sort().join(), "M PLUS Rounded 1c,Tinos", "two folders have no licence file: found by hand when they are first used");
  assert.ok(!real.noVietnamese.some((n) => real.families[n]), "a family is either with or without Vietnamese");
});

test("the 26 families that come with the app are all in the list, and the status is known offline", () => {
  for (const name of Object.keys(fonts.families)) assert.equal(viStatus(name), true, name);
  assert.equal(viStatus("Be Vietnam Pro"), true);
  assert.equal(viStatus("be vietnam pro"), true, "case does not matter");
  assert.equal(viStatus("DM Sans"), false, "on Google Fonts, no vietnamese subset");
  assert.equal(viStatus("Helvetica Neue"), null, "not a google/fonts family: not known here");
  assert.equal(viEntry("Roboto").big, false);
  assert.equal(viEntry("Lato").big, true);
  assert.equal(viEntry("Roboto Slab").licence, "Apache-2.0");
});

test("credit: author, licence, link at the commit and how it comes", () => {
  const c = viCredit("Roboto");
  assert.deepEqual([c.family, c.licence, c.how], ["Roboto", "OFL-1.1", "as shipped by google/fonts"]);
  assert.equal(c.link, `https://github.com/google/fonts/tree/${real.source.commit}/ofl/roboto`);
  assert.match(c.designer, /Christian Robertson/);
  assert.equal(viCredit("Made Up Sans"), null);
  assert.match(viLine("Roboto"), /Christian Robertson.* · OFL-1\.1 · \d(\.\d)? MB/);
  assert.match(viLine("Lato"), /large: fetched through Google Fonts/);
});

test("the nearest Vietnamese families: the same kind, small ones first, the most used first, never the family itself", () => {
  const a = viSuggest("Old Display Serif", { n: 3 });
  assert.equal(a.length, 3);
  assert.ok(a.every((x) => x.category === "serif"), JSON.stringify(a));
  assert.ok(a.every((x) => x.mb <= 5), "no large family while small ones exist");
  const b = viSuggest("Roboto Mono", { n: 3 });
  assert.ok(b.every((x) => x.category === "mono") && !b.some((x) => x.family === "Roboto Mono"), JSON.stringify(b));
  assert.equal(viSuggest("Acme Brand Sans", { n: 2 }).every((x) => x.category === "sans"), true);
  assert.equal(viSuggest("Brush Hand Script", { n: 1 })[0].category, "handwriting");
  assert.match(viSuggest("Acme", { n: 1 })[0].line, /^\S.* \(sans, .* · OFL-1\.1 · /);
  const text = viOptionsText(5);
  assert.match(text, /^Google Fonts with Vietnamese letters[^\n]*543 families/);
  for (const k of ["sans", "serif", "display", "handwriting", "mono"]) assert.match(text, new RegExp(`\\n${k}: [^\\n]+`));
});

test("the font check names the author and licence of a family of the list and the nearest ones for a font that fails", async () => {
  const { fontCheckText, designLines } = await import("../packages/agent/index.mjs");
  const text = fontCheckText({ families: [{ family: "Be Vietnam Pro", available: true, vi: true }, { family: "Old Display", available: true, vi: false }, { family: "Made Up Sans", available: false, vi: null }] });
  assert.match(text, /Be Vietnam Pro: OK, draws Vietnamese \(.* · OFL-1\.1 · /);
  assert.match(text, /Old Display: no Vietnamese letters\. Nearest that draw Vietnamese: \S/);
  assert.match(text, /Made Up Sans: the app cannot get it[^\n]*Nearest that draw Vietnamese/);
  assert.match(text, /Vietnamese fonts the app bundles: [^\n]*Roboto Flex/);
  assert.match(text, /Google Fonts with Vietnamese letters that the app downloads/);
  const lines = designLines({ title: "x", look: { id: "frame/x", title: "Acme", frame: true } }, T, { families: [{ family: "Old Display", available: true, vi: false }] });
  assert.ok(lines.some((l) => /Old Display: it has no Vietnamese letters\. Stop in Prepare[^\n]*Nearest that draw Vietnamese, from the app's list of Google Fonts[^\n]*for Old Display: \S/.test(l)), lines.join("\n"));
});

test("the picker's catalog: the whole list with author, licence and size; installed once its files are on this PC", () => {
  const c = viCatalog();
  assert.equal(c.count, 543);
  assert.equal(c.families[0].family, "Roboto", "most used first");
  const r = c.families.find((x) => x.family === "Inter");
  assert.deepEqual([r.category, r.variable, r.italic, r.licence, r.big, r.installed], ["sans", true, true, "OFL-1.1", false, false]);
  assert.deepEqual(r.weights, [100, 900]);
  assert.match(r.link, /\/ofl\/inter$/);
  assert.equal(c.families.find((x) => x.family === "Lato").big, true);
});

// ---- the install, on a small list of its own
const TTF = join(APP_ROOT, "test", "golden", "hf-native-final", "assets", "fonts", "Inter", "Inter[opsz,wght].ttf");
const FILE = "Inter[opsz,wght].ttf", OFL = Buffer.from("SIL OPEN FONT LICENSE Version 1.1 (test copy)\n");
const bytes = readFileSync(TTF);
const COMMIT = "0123456789abcdef0123456789abcdef01234567";
const smallList = (extra = {}) => ({
  source: { repo: "google/fonts", commit: COMMIT, link: `https://github.com/google/fonts/tree/${COMMIT}` }, bigBytes: 5_000_000,
  families: {
    "Test Inter": { folder: "ofl/testinter", category: "sans", licence: "OFL-1.1", designer: "Test Author", added: "2020-01-01", pop: 1, upstream: "https://github.com/example/inter",
      licenceFile: ["OFL.txt", OFL.length, gitBlobSha1(OFL)], bytes: bytes.length, files: [[FILE, "normal", 100, 900, bytes.length, gitBlobSha1(bytes)]] },
    "Test Big": { folder: "ofl/testbig", category: "serif", licence: "OFL-1.1", designer: "Big Author", added: "2020-01-01", licenceFile: null, bytes: 6_000_000, files: [["Big.ttf", "normal", 400, 400, 6_000_000, "a".repeat(40)]] },
    ...extra },
  noVietnamese: ["Test NoVi"],
});
const serve = (log, { bad = null } = {}) => async (url) => {
  log.push(decodeURIComponent(url));
  assert.ok(url.startsWith(`https://raw.githubusercontent.com/google/fonts/${COMMIT}/ofl/testinter/`), url);
  const name = decodeURIComponent(url).split("/").pop();
  return name === "OFL.txt" ? new Response(OFL) : name === FILE ? new Response(bad ?? bytes) : new Response("not found", { status: 404 });
};
const useList = (name, doc) => { const f = join(T, `${name}.json`); writeFileSync(f, JSON.stringify(doc)); process.env.MW_FONTS_VI_LIST = f; };

test("a family's pinned files download once, each checked against the SHA-1 of the list; a wrong file leaves nothing behind", async () => {
  useList("small", smallList());
  const log = [];
  assert.equal(await installViFamily("Test Inter", { download: false }), null, "nothing downloads when it is not allowed");
  await assert.rejects(installViFamily("Test Inter", { fetchImpl: serve([], { bad: Buffer.from("not the font") }) }), { code: "FONT_HASH" });
  assert.ok(!existsSync(join(T, "cache", "test-inter")), "the wrong file was not kept");
  assert.deepEqual(readdirSync(join(T, "cache")).filter((n) => n.includes(".tmp")), [], "no half-written folder stays");
  const got = await installViFamily("test inter", { fetchImpl: serve(log) });
  assert.equal(got.cached, false);
  assert.deepEqual(log, [`https://raw.githubusercontent.com/google/fonts/${COMMIT}/ofl/testinter/${FILE}`, `https://raw.githubusercontent.com/google/fonts/${COMMIT}/ofl/testinter/OFL.txt`]);
  assert.ok(readFileSync(join(got.dir, FILE)).equals(bytes));
  const src = JSON.parse(readFileSync(join(got.dir, "source.json"), "utf8"));
  assert.deepEqual([src.designer, src.licence, src.how, src.link], ["Test Author", "OFL-1.1", "as shipped by google/fonts", `https://github.com/google/fonts/tree/${COMMIT}/ofl/testinter`]);
  assert.match(src.files[FILE].sha256, /^[0-9a-f]{64}$/);
  const again = await installViFamily("Test Inter", { fetchImpl: serve(log) });
  assert.equal(again.cached, true);
  assert.equal(log.length, 2, "the second call used the machine cache");
  assert.equal(viCatalog().families.find((x) => x.family === "Test Inter").installed, true);
});

test("a large family is left to the Google CSS route, and a name outside the list is not touched", async () => {
  useList("small2", smallList());
  const fetchImpl = async () => { throw new Error("must not be called"); };
  assert.equal(await installViFamily("Test Big", { fetchImpl }), null);
  assert.equal(await installViFamily("Made Up Sans", { fetchImpl }), null);
  assert.equal(await installViFamily("Test NoVi", { fetchImpl }), null);
  assert.equal(viStatus("Test NoVi"), false);
});

test("the family goes into the film with its licence text, a CREDIT.json and an @font-face for its weight range", async () => {
  useList("small3", smallList());
  const got = await installViFamily("Test Inter", { fetchImpl: serve([]) });
  const d = join(T, "film"); cpSync(join(APP_ROOT, "test", "fixtures", "minimal"), d, { recursive: true });
  const css = placeViFamily(d, got);
  assert.match(css, /@font-face \{ font-family: "Test Inter"; src: url\("assets\/_app\/fonts\/google-vi\/test-inter\/Inter\[opsz,wght\]\.ttf"\) format\("truetype"\); font-weight: 100 900; font-style: normal; font-display: block; \}/);
  const dir = join(d, "assets", "_app", "fonts", "google-vi", "test-inter");
  assert.ok(readFileSync(join(dir, FILE)).equals(bytes));
  assert.ok(readFileSync(join(dir, "OFL.txt")).equals(OFL), "OFL asks for its text to travel with the font");
  assert.equal(JSON.parse(readFileSync(join(dir, "CREDIT.json"), "utf8")).designer, "Test Author");
});

test("the first download checks the marked Vietnamese letters: a family that lacks some is told to Claude as having none (Bungee Color: 92 of 134 missing)", async () => {
  const GEIST = join(APP_ROOT, "test", "fixtures", "gates", "glyph", "assets", "fonts", "Geist-Bold.ttf"), geist = readFileSync(GEIST);
  useList("partial", smallList({ "Test Geist": { folder: "ofl/testgeist", category: "sans", licence: "OFL-1.1", designer: "Test Author", added: "2024-01-01", pop: 2, licenceFile: null,
    bytes: geist.length, files: [["Geist-Bold.ttf", "normal", 700, 700, geist.length, gitBlobSha1(geist)]] } }));
  const fetchImpl = async () => new Response(geist);
  const ok = await installViFamily("Test Inter", { fetchImpl: serve([]) });
  assert.equal(ok.missing, "", "Inter draws every marked letter");
  assert.deepEqual(viVerified("Test Inter"), { checked: 134, missing: "" });
  const got = await installViFamily("Test Geist", { fetchImpl });
  assert.ok(got.missing.length > 0 && got.missing.includes("ạ"), got.missing);
  assert.equal(viVerified("Test Geist").checked, 134);
  const { checkFonts, fontCheckText } = await import("../packages/agent/index.mjs");
  const r = await checkFonts(T, ["Test Geist", "Test Inter"], { google: async () => true });
  assert.deepEqual(r.families.map((f) => [f.family, f.vi]), [["Test Geist", false], ["Test Inter", true]]);
  const text = fontCheckText(r);
  assert.match(text, /Test Geist: no Vietnamese letters \(the app checked it: \d+ marked letters are missing, e\.g\. \S/);
  assert.match(text, /Test Inter: OK, draws Vietnamese \(Test Author · OFL-1\.1 · [^)]*all 134 marked letters checked\)/);
});

test("finalize serves a family of the list with its pinned files (R-FONTS) and records the credit; offline it uses the cache or reports the failure", { timeout: 120000 }, async () => {
  const { finalize } = await import("../packages/hf-edit/finalize.mjs");
  useList("small4", smallList());
  const mk = (name) => {
    const d = join(T, name); cpSync(join(APP_ROOT, "test", "fixtures", "gates", "remote"), d, { recursive: true });
    const p = join(d, "index.html");
    writeFileSync(p, readFileSync(p, "utf8").replace(/<img id="remote"[^>]*>/, "").replace("font-family: 'Be Vietnam Pro'", "font-family: 'Test Inter', serif"));
    return d;
  };
  const realFetch = globalThis.fetch, log = [];
  globalThis.fetch = serve(log);
  try {
    rmSync(join(T, "cache"), { recursive: true, force: true });
    const d = mk("film-a");
    const r = await finalize(d);
    assert.deepEqual(r.googleFontsVi.map((x) => [x.family, x.cached, x.credit.designer]), [["Test Inter", false, "Test Author"]]);
    assert.equal(log.length, 2, "the font file and its licence");
    assert.equal((await finalize(mk("film-a2"))).googleFontsVi[0].cached, true, "the second film takes the machine cache");
    assert.equal(log.length, 2);
    assert.deepEqual(r.googleFonts, [], "not the Google CSS route");
    assert.deepEqual(r.unresolvedFonts, []);
    const html = readFileSync(join(d, "index.html"), "utf8");
    assert.match(html, /<style data-mw="fonts">[\s\S]*font-family: "Test Inter"[\s\S]*assets\/_app\/fonts\/google-vi\/test-inter\/Inter\[opsz,wght\]\.ttf/);
    assert.ok(existsSync(join(d, "assets", "_app", "fonts", "google-vi", "test-inter", "OFL.txt")));
    // no cache and no network: finalize goes on and says why, the font gate then reports the family
    rmSync(join(T, "cache"), { recursive: true, force: true });
    globalThis.fetch = async () => { throw new Error("offline"); };
    const r2 = await finalize(mk("film-b"), { googleFonts: false });
    assert.deepEqual(r2.googleFontsVi ?? [], []);
    assert.deepEqual(r2.unresolvedFonts.map((x) => x.stack[0]), ["Test Inter"]);
    const r3 = await finalize(mk("film-c"));
    assert.match(r3.googleViFailed[0].error, /offline/);
  } finally { globalThis.fetch = realFetch; }
});
