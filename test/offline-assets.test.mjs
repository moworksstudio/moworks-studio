// The bundled fonts, GSAP and three.js come from their pinned upstream (google/fonts, jsDelivr), not from the kit. The download is served here
// from the app's own runtime copy (no network): files land at their config path, a wrong file is refused, nothing half-written stays.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const T = mkdtempSync(join(tmpdir(), "mw-assets-"));
const assets = await import("../packages/offline-assets/index.mjs");
const { APP_ROOT, loadPins } = await import("../packages/version-manager/index.mjs");
const fonts = JSON.parse(readFileSync(join(APP_ROOT, "config", "fonts.json"), "utf8"));
const realDir = assets.fontsDir(), realGsap = assets.gsapFile(), realMotionPath = assets.motionPathFile();
const byUrl = new Map(assets.wanted().map((w) => [w.url, w.dest]));
const serve = (bad = null) => async (url) => (url === bad ? new Response("not the font") : new Response(readFileSync(byUrl.get(url))));

before(() => {
  assert.ok(assets.status().ready, "the app's own copy is needed to serve this test (Settings > Health > Download)");
  process.env.MW_FONTS_DIR = join(T, "fonts");
  process.env.MW_GSAP_FILE = join(T, "gsap", "gsap.min.js");
  process.env.MW_MOTIONPATH_FILE = join(T, "gsap", "MotionPathPlugin.min.js");
  process.env.MW_THREE_DIR = join(T, "three");
  process.env.MW_CLIPPER_FILE = join(T, "clipper-lib", "clipper.js");
  process.env.MW_CODELIB_DIR = join(T, "lib");
});
const unset = () => { for (const k of ["MW_FONTS_DIR", "MW_GSAP_FILE", "MW_MOTIONPATH_FILE", "MW_THREE_DIR", "MW_CLIPPER_FILE", "MW_CODELIB_DIR"]) delete process.env[k]; };
after(() => { unset(); rmSync(T, { recursive: true, force: true }); });

test("every bundled file is pinned to google/fonts at one commit (OFL), GSAP to one version, with SHA-256", () => {
  const files = Object.values(fonts.families).flat();
  assert.equal(files.length, 62);
  assert.match(fonts.source.commit, /^[0-9a-f]{40}$/);
  for (const f of files) {
    assert.ok(f.url.startsWith(`https://raw.githubusercontent.com/google/fonts/${fonts.source.commit}/`), f.url);
    assert.match(f.sha256, /^[0-9a-f]{64}$/);
  }
  assert.ok(Object.values(fonts.licences).every((l) => l.licence === "OFL-1.1"));
  const g = loadPins().gsap;
  assert.equal(g.url, `https://cdn.jsdelivr.net/npm/gsap@${g.version}/dist/gsap.min.js`);
  assert.equal(g.motionPath.url, `https://cdn.jsdelivr.net/npm/gsap@${g.version}/dist/MotionPathPlugin.min.js`, "the plugin at the same version");
  assert.match(g.motionPath.sha256, /^[0-9a-f]{64}$/);
  assert.equal(loadPins().kit.fontsDir, undefined, "no kit font folder any more");
  const t = loadPins().three;
  assert.equal(t.default, "0.184.0");
  assert.deepEqual(Object.keys(t.versions).sort(), ["0.147.0", "0.170.0", "0.181.2", "0.184.0", "0.186.1"], "the default, the versions HF registry blocks pin, and the code-film styles' (audit 53, 55)");
  for (const [v, x] of Object.entries(t.versions)) {
    assert.ok(x.files.some((f) => f.path === "LICENSE"), `three.js ${v} carries its licence`);
    for (const f of x.files) { assert.match(f.sha256, /^[0-9a-f]{64}$/); assert.ok(f.size > 0); }
  }
  assert.equal(t.url, "https://cdn.jsdelivr.net/npm/three@{version}/{path}");
  assert.match(loadPins().clipperLib.sha256, /^[0-9a-f]{64}$/);
  const libs = loadPins().codeLibs;          // the code-film styles' npm libraries, each with its LICENSE
  for (const [name, p] of Object.entries(libs.packages)) {
    assert.ok(p.files.some((x) => /^licen[cs]e(\.\w+)?$/i.test(x.path)), name);
    for (const x of p.files) { assert.match(x.sha256, /^[0-9a-f]{64}$/); assert.ok(x.size > 0); }
  }
});

test("install: missing files downloaded and checked, a wrong file refused and not left behind", async () => {
  let st = assets.status();
  assert.equal(st.ready, false);
  const pinnedThree = Object.values(loadPins().three.versions).reduce((a, x) => a + x.files.length, 0)
    + Object.values(loadPins().codeLibs.packages).reduce((a, x) => a + x.files.length, 0);          // and the code-film libraries
  assert.equal(st.missing.length, 64 + pinnedThree + 1, "fonts, GSAP, three.js, clipper-lib");
  const gsapUrl = loadPins().gsap.url;
  const r = await assets.install({ fetchImpl: serve(gsapUrl) });
  assert.equal(r.downloaded, 63 + pinnedThree + 1);
  assert.deepEqual(r.failed.map((f) => [f.name, f.error]), [[`GSAP ${loadPins().gsap.version}`, "SHA-256 does not match the pinned file"]]);
  assert.ok(!existsSync(assets.gsapFile()) && !existsSync(assets.gsapFile() + ".part"));
  assert.ok(existsSync(join(T, "fonts", "google", "Inter", "Inter[opsz,wght].ttf")));
  const again = await assets.install({ fetchImpl: serve() });
  assert.equal(again.downloaded, 1, "only what was missing");
  assert.equal(again.ready, true);
  assert.deepEqual(readFileSync(assets.gsapFile()), readFileSync(realGsap));
  assert.deepEqual(readFileSync(assets.motionPathFile()), readFileSync(realMotionPath));
  assert.ok(existsSync(join(T, "three", "0.184.0", "build", "three.core.min.js")), "three.js keeps the npm layout under its version");
  const folders = new Set(Object.values(fonts.families).flat().filter((f) => f.file.startsWith("google/")).map((f) => f.file.split("/")[1]));
  assert.deepEqual(readdirSync(join(T, "fonts", "google")).sort(), [...folders].sort(), "the same layout as config/fonts.json");
});

test("app code finds the fonts and GSAP in the app's runtime folder, never in the kit", () => {
  unset();
  assert.equal(assets.fontsDir(), realDir);
  assert.ok(realDir.startsWith(join(APP_ROOT, "runtime")));
  assert.ok(!/Moworks Motion/.test(realDir + realGsap));
});
