// A new computer: portable pins ({app}, {work}, this computer's local pins, FFmpeg and Python found by themselves), a source's
// commit from git or from the PINNED file of a bundled copy, the style sources and HF's skills read from bundle/, the library stores copied
// into the work library one folder per pin, the offline files copied from bundle/ instead of downloaded, the launcher's npm check, the first-run
// list, and no drive letter left in config/pins.json.
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const T = mkdtempSync(join(tmpdir(), "mw-firstrun-"));
after(() => rmSync(T, { recursive: true, force: true }));
const vm = await import("../packages/version-manager/index.mjs");
const { APP_ROOT } = vm;

test("portable pins: {app} and {work} filled, this computer's local pins first, HF's skills from bundle/ when the configured folder is missing", () => {
  const root = join(T, "app");
  mkdirSync(join(root, "config"), { recursive: true });
  mkdirSync(join(root, "bundle", "hf", "skills"), { recursive: true }); mkdirSync(join(root, "bundle", "hf", "registry"), { recursive: true });
  writeFileSync(join(root, "config", "pins.json"), JSON.stringify({
    hyperframes: { skillsRoot: "{app}/nowhere/skills", registryRoot: "{app}/nowhere/registry" },
    lemo: { root: "{app}/bundle/styles/lemo-opuscar", commit: "x" },
    storage: { workRoot: "{app}/..", backupRoot: "{work}/backup" }, ffmpeg: { version: "9.0", dir: "{app}/no-ffmpeg" } }));
  const prev = process.env.MW_LOCAL_PINS;
  process.env.MW_LOCAL_PINS = join(T, "local-pins.json");
  try {
    let p = vm.loadPins(root);
    assert.equal(p.lemo.root, `${root}/bundle/styles/lemo-opuscar`);
    assert.equal(p.storage.backupRoot, `${root}/../backup`);
    assert.equal(p.hyperframes.skillsRoot, join(root, "bundle", "hf", "skills"), "the bundled skills when the configured folder is missing");
    vm.setLocalPins({ "lemo.root": "E:/clones/lemo", "storage.workRoot": "E:/Work" }, root);
    p = vm.loadPins(root);
    assert.deepEqual([p.lemo.root, p.storage.backupRoot], ["E:/clones/lemo", "E:/Work/backup"]);
    vm.setLocalPins({ "lemo.root": null }, root);
    assert.equal(vm.loadPins(root).lemo.root, `${root}/bundle/styles/lemo-opuscar`, "a cleared local pin falls back to the default");
  } finally { if (prev === undefined) delete process.env.MW_LOCAL_PINS; else process.env.MW_LOCAL_PINS = prev; }
});

test("a source's commit: a clone's git HEAD, or the PINNED file of a copy bundled with the app", () => {
  const d = join(T, "bundled");
  mkdirSync(d, { recursive: true });
  assert.equal(vm.sourceHead(d), null);
  writeFileSync(join(d, "PINNED"), "https://github.com/a/b 0123456789abcdef0123456789abcdef01234567\n");
  assert.equal(vm.sourceHead(d), "0123456789abcdef0123456789abcdef01234567");
  const g = join(T, "clone");
  mkdirSync(g);
  execFileSync("git", ["init", "-q"], { cwd: g, windowsHide: true }); writeFileSync(join(g, "f"), "x");
  execFileSync("git", ["-c", "user.email=t@t", "-c", "user.name=t", "add", "f"], { cwd: g, windowsHide: true }); execFileSync("git", ["-c", "user.email=t@t", "-c", "user.name=t", "commit", "-qm", "x"], { cwd: g, windowsHide: true });
  assert.equal(vm.sourceHead(g), execFileSync("git", ["rev-parse", "HEAD"], { cwd: g, encoding: "utf8", windowsHide: true }).trim());
});

test("the library stores that came with the app: one folder per pin; the store for this computer's pins is taken, its own stays, an older bundle copy is taken again", async () => {
  const root = join(T, "libapp"), work = join(T, "libwork");
  mkdirSync(join(root, "config"), { recursive: true });
  cpSync(join(APP_ROOT, "config", "pins.json"), join(root, "config", "pins.json"));
  const prev = process.env.MW_WORK_ROOT;
  process.env.MW_WORK_ROOT = work;
  const read = (...p) => readFileSync(join(work, "library", ...p), "utf8"), cur = (s) => JSON.parse(read(s, "current.json")).dir;
  const put = (f, text) => { mkdirSync(join(f, ".."), { recursive: true }); writeFileSync(f, text); };
  try {
    const fr = await import("../packages/setup/first-run.mjs");
    const names = { blocks: (await import("../packages/blocks-library/index.mjs")).storeName(root), looks: (await import("../packages/looks-library/index.mjs")).storeName(root),
      vocab: (await import("../packages/vocab-library/index.mjs")).storeName(root), intake: "intake-1" };
    assert.match(names.blocks, /^hf-[\d.]+-[0-9a-f]{7}$/);
    assert.match(names.vocab, /^mp-[0-9a-f]{7}-hf-[0-9a-f]{7}$/, "vocab: named for Motion Prompt's pin and HF's (the HF ids it cites)");
    const bundled = (s, text) => { put(join(root, "bundle", "library", s, names[s], "catalog.json"), text); put(join(root, "bundle", "library", s, "current.json"), JSON.stringify({ dir: names[s] })); };
    for (const s of ["blocks", "looks", "intake"]) bundled(s, `{"items":[],"v":"${s} 1"}`);
    bundled("vocab", JSON.stringify({ items: [{ id: "001", uid: "vocab:001", hash: "h1" }, { id: "002", uid: "vocab:002", hash: "h2" }] }));
    for (const [id, hash] of [["001", "h1"], ["002", "h2"]]) {
      put(join(root, "bundle", "library", "vocab", "previews", `${id}.json`), JSON.stringify({ hash, preview: { video: `${id}.mp4`, poster: `${id}.webp` } }));
      for (const f of [`${id}.mp4`, `${id}.webp`]) put(join(root, "bundle", "library", "vocab", "previews", f), "bundled");
    }
    put(join(root, "bundle", "library", "thumbs", "lemo", "a.webp"), "new");
    // the Lemo fonts' Vietnamese check made by make-bundle, a folder per pinned commit
    const lemoDir = `lemo-${JSON.parse(readFileSync(join(root, "config", "pins.json"), "utf8")).lemo.commit.slice(0, 7)}`, vi = { "a-style": { status: "missing", families: [{ family: "X", vi: false }] } };
    put(join(root, "bundle", "library", "lemo", lemoDir, "catalog.json"), JSON.stringify({ vi }));
    // this computer: looks built at an older pin (current.json points at it), blocks built here at the current pin, a vocab preview made here
    put(join(work, "library", "looks", "hf-0.0.1-0000000", "catalog.json"), "old pin"); put(join(work, "library", "looks", "current.json"), JSON.stringify({ dir: "hf-0.0.1-0000000" }));
    put(join(work, "library", "blocks", names.blocks, "catalog.json"), "mine");
    put(join(work, "library", "vocab", "previews", "002.json"), JSON.stringify({ hash: "h2", preview: { video: "002.mp4" } })); put(join(work, "library", "vocab", "previews", "002.mp4"), "mine");
    put(join(work, "library", "thumbs", "lemo", "a.webp"), "mine");
    assert.equal(fr.libraryState(root).ready, false);
    let r = fr.libraryFromBundle(root);
    assert.deepEqual(r.copied.filter((c) => ["blocks", "looks", "intake", "vocab", "vocab previews"].includes(c)).sort(), ["intake", "looks", "vocab", "vocab previews"]);
    assert.equal(cur("looks"), names.looks, "a store at an older pin is replaced by the one for the pins");
    assert.equal(read("looks", names.looks, "catalog.json"), '{"items":[],"v":"looks 1"}');
    assert.equal(read("looks", "hf-0.0.1-0000000", "catalog.json"), "old pin", "the older store is left where it is (never read)");
    assert.equal(read("blocks", names.blocks, "catalog.json"), "mine", "a store this computer built at the pins stays");
    assert.equal(cur("blocks"), names.blocks);
    assert.equal(read("vocab", "previews", "001.mp4"), "bundled", "a preview of the item as it is now is taken");
    assert.equal(read("vocab", "previews", "002.mp4"), "mine", "a preview made here stays");
    assert.equal(read("thumbs", "lemo", "a.webp"), "mine", "what is there stays");
    assert.deepEqual((await import("../packages/lemo-styles/index.mjs")).viChecks(root), vi, "the Lemo check reaches the Style Gallery");
    assert.deepEqual(fr.libraryState(root).stores, { blocks: true, intake: true, looks: true, vocab: true });
    // the next start: nothing new
    assert.ok(!fr.libraryFromBundle(root).copied.some((c) => ["blocks", "looks", "intake", "vocab"].includes(c)));
    // a newer app brings a changed copy under the same name: taken again while this computer's copy is the one it took
    bundled("intake", '{"items":[],"v":"intake 2"}');
    r = fr.libraryFromBundle(root);
    assert.ok(r.copied.includes("intake"));
    assert.equal(read("intake", "intake-1", "catalog.json"), '{"items":[],"v":"intake 2"}');
    // ... but not once this computer changed it (rebuilt, previews made here)
    put(join(work, "library", "intake", "intake-1", "catalog.json"), "changed here");
    bundled("intake", '{"items":[],"v":"intake 3"}');
    assert.ok(!fr.libraryFromBundle(root).copied.includes("intake"));
    assert.equal(read("intake", "intake-1", "catalog.json"), "changed here");
    // a bundle whose store is at another pin than this computer's: not taken, the library's own import builds it
    rmSync(join(work, "library", "blocks"), { recursive: true, force: true });
    rmSync(join(root, "bundle", "library", "blocks", names.blocks), { recursive: true, force: true });
    put(join(root, "bundle", "library", "blocks", "hf-0.0.2-1111111", "catalog.json"), "{}"); put(join(root, "bundle", "library", "blocks", "current.json"), JSON.stringify({ dir: "hf-0.0.2-1111111" }));
    assert.ok(!fr.libraryFromBundle(root).copied.includes("blocks"));
    assert.ok(!existsSync(join(work, "library", "blocks", "hf-0.0.2-1111111")));
    assert.equal(fr.libraryState(root).stores.blocks, false);
  } finally { if (prev === undefined) delete process.env.MW_WORK_ROOT; else process.env.MW_WORK_ROOT = prev; }
});

test("the offline files are copied from bundle/ (no download) when the bundled copy is the pinned file", async () => {
  const oa = await import("../packages/offline-assets/index.mjs");
  const root = join(T, "oaapp");
  mkdirSync(join(root, "config"), { recursive: true });
  for (const f of ["pins.json", "fonts.json"]) cpSync(join(APP_ROOT, "config", f), join(root, "config", f));
  const prevDirs = Object.fromEntries(["MW_FONTS_DIR", "MW_GSAP_FILE", "MW_THREE_DIR", "MW_CODELIB_DIR", "MW_CLIPPER_FILE", "MW_MOTIONPATH_FILE"].map((k) => [k, process.env[k]]));
  for (const k of Object.keys(prevDirs)) delete process.env[k];
  try {
    const all = oa.wanted(root), one = all.find((w) => w.kind === "gsap");
    const real = oa.wanted(APP_ROOT).find((w) => w.name === one.name).dest;
    const inBundle = join(root, "bundle", one.dest.slice(root.length + 1));
    mkdirSync(join(inBundle, ".."), { recursive: true }); cpSync(real, inBundle);
    let fetched = 0;
    const r = await oa.install({ root, fetchImpl: async () => { fetched++; throw new Error("offline"); } });
    assert.ok(existsSync(one.dest), "copied from the bundle");
    assert.ok(r.bundled >= 1);
    assert.equal(fetched, all.length - r.bundled, "only the files not in the bundle were asked for");
  } finally { for (const [k, v] of Object.entries(prevDirs)) if (v !== undefined) process.env[k] = v; }
});

test("the launcher's check: npm install on a new computer and when package-lock.json is newer than the last install", () => {
  const root = join(T, "npmapp");
  mkdirSync(join(root, "tools"), { recursive: true });
  cpSync(join(APP_ROOT, "tools", "needs-install.mjs"), join(root, "tools", "needs-install.mjs"));
  writeFileSync(join(root, "package-lock.json"), "{}");
  const run = () => spawnSync(process.execPath, [join(root, "tools", "needs-install.mjs")], { windowsHide: true }).status;
  assert.equal(run(), 1, "no node_modules yet");
  mkdirSync(join(root, "node_modules")); writeFileSync(join(root, "node_modules", ".package-lock.json"), "{}");
  utimesSync(join(root, "package-lock.json"), new Date(Date.now() - 60000), new Date(Date.now() - 60000));
  assert.equal(run(), 0);
  utimesSync(join(root, "package-lock.json"), new Date(Date.now() + 60000), new Date(Date.now() + 60000));
  assert.equal(run(), 1, "a newer lock file");
  assert.match(readFileSync(join(APP_ROOT, "Moworks Studio.bat"), "utf8"), /node tools\\needs-install\.mjs[\s\S]*npm install/);
});

test("the first-run list: every item with its size and where it comes from; on this computer everything is there", async () => {
  const fr = await import("../packages/setup/first-run.mjs");
  const r = fr.firstRunItems(APP_ROOT);
  for (const id of ["work", "hf-runtime", "hf-skills", "assets", "library", "style-lemo", "style-mgStyles", "style-anidoodle", "style-characterKit", "python", "ffmpeg"])
    assert.ok(r.items.some((i) => i.id === id), id);
  assert.ok(r.items.every((i) => ["bundle", "download", "yours", "clone"].includes(i.from) && typeof i.mb === "number"));
});

test("config/pins.json has no drive letter: every folder is {app}, {work} or an environment variable (this computer's are in its local pins)", () => {
  const pins = JSON.parse(readFileSync(join(APP_ROOT, "config", "pins.json"), "utf8")), bad = [];
  const walk = (o, at) => { for (const [k, v] of Object.entries(o)) { if (typeof v === "string" && /^[A-Za-z]:[\\/]/.test(v)) bad.push(`${at}${k}`); else if (v && typeof v === "object") walk(v, `${at}${k}.`); } };
  walk(pins, "");
  assert.deepEqual(bad, [], "run node tools/portable-pins.mjs");
});

test("the app backup is off unless this computer's local pins name a backup folder: no backup, no error", async () => {
  const pins = JSON.parse(readFileSync(join(APP_ROOT, "config", "pins.json"), "utf8"));
  assert.equal(pins.storage.backupRoot, undefined, "no default backup folder in git");
  const { backupApp, backupRoot, status } = await import("../packages/backup/index.mjs");
  const prev = { lp: process.env.MW_LOCAL_PINS, br: process.env.MW_BACKUP_ROOT };
  process.env.MW_LOCAL_PINS = join(T, "local-pins-nobackup.json"); delete process.env.MW_BACKUP_ROOT;
  try {
    assert.equal(backupRoot(), null);
    assert.deepEqual(status(), { configured: false });
    assert.equal(backupApp().written, false);
    vm.setLocalPins({ "storage.backupRoot": join(T, "bk") });
    assert.equal(backupRoot(), join(T, "bk"), "this computer's choice turns it on");
  } finally {
    for (const [k, v] of [["MW_LOCAL_PINS", prev.lp], ["MW_BACKUP_ROOT", prev.br]]) if (v === undefined) delete process.env[k]; else process.env[k] = v;
  }
});

test("a style read from bundle/ in place says In the app, not From GitHub ({app}/ fills with forward slashes)", async () => {
  const root = join(T, "app-bundled"), commit = "0123456789abcdef0123456789abcdef01234567", lemo = join(root, "bundle", "styles", "lemo-opuscar");
  mkdirSync(join(root, "config"), { recursive: true }); mkdirSync(lemo, { recursive: true });
  writeFileSync(join(lemo, "PINNED"), `https://github.com/lemomo-ai/lemo-opuscar ${commit}\n`);
  writeFileSync(join(root, "config", "pins.json"), JSON.stringify({ lemo: { root: "{app}/bundle/styles/lemo-opuscar", repo: "lemomo-ai/lemo-opuscar", commit }, storage: { workRoot: "{app}/.." } }));
  const prev = process.env.MW_LOCAL_PINS;
  process.env.MW_LOCAL_PINS = join(T, "local-pins-bundled.json");
  try {
    const fr = await import("../packages/setup/first-run.mjs");
    assert.equal(fr.styleSource("lemo", root).from, "bundle");
  } finally { if (prev === undefined) delete process.env.MW_LOCAL_PINS; else process.env.MW_LOCAL_PINS = prev; }
});

test("the preview origin starts before HyperFrames is installed (a new computer's first run); the player answers 503 until then", async () => {
  const { startPreviewServer } = await import("../packages/hf-preview/index.mjs");
  const pv = await startPreviewServer({ uiOrigin: "http://127.0.0.1:1", resolveProject: () => null, version: "0.0.0-not-installed" });
  try {
    assert.equal((await fetch(`${pv.base}/player.js`)).status, 503);
    assert.equal((await fetch(`${pv.base}/host.js`)).status, 200);
  } finally { await pv.close(); }
});

test("a computer without Python: its item is the user's step with the winget line, and Download all's Python step does not fail", () => {
  // no Python anywhere the app looks: %LOCALAPPDATA%\Programs\Python, PATH, the pinned path (under %LOCALAPPDATA%)
  const env = { ...process.env, LOCALAPPDATA: join(T, "no-localappdata"), PATH: join(process.execPath, ".."), MW_STATE_DIR: join(T, "state-nopy"), MW_LOCAL_PINS: join(T, "local-pins-nopy.json") };
  const code = `const m = await import(${JSON.stringify(new URL("../packages/setup/first-run.mjs", import.meta.url).href)});
    const r = await m.firstRunAll({ ids: ["python"] });
    console.log(JSON.stringify({ done: r.done, item: r.items.find((i) => i.id === "python") }));`;
  const r = spawnSync(process.execPath, ["--input-type=module", "-e", code], { env, encoding: "utf8", windowsHide: true, timeout: 120000 });
  assert.equal(r.status, 0, r.stderr);
  const { done, item } = JSON.parse(r.stdout.trim().split(/\r?\n/).pop());
  assert.deepEqual(done, ["python"]);
  assert.equal(item.from, "yours");
  assert.equal(item.ready, false);
  assert.match(item.command, /^winget install -e --id Python\.Python\.3\.12/);
});
