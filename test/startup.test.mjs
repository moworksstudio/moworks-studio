// A white "127.0.0.1_/" window showed for a long time at start: the style catalog (1.6 s) and the first-run checks (1.7 s) run
// off the server's thread, so the app window's first page comes at once. Run: npm test
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const T = mkdtempSync(join(tmpdir(), "mw-startup-"));
process.env.MW_STATE_DIR = join(T, "state");
process.env.MW_WORK_ROOT = join(T, "work");
process.env.MW_NO_BACKUP = "1";
process.env.MW_NO_LIBRARY_IMPORT = "1";
process.env.MW_CLAUDE_CONFIG_DIR = join(T, "claude-empty");
mkdirSync(process.env.MW_CLAUDE_CONFIG_DIR, { recursive: true });
after(() => rmSync(T, { recursive: true, force: true }));

test("the first page comes while the style catalog is built in a worker, which then fills the catalog's memory", async () => {
  const { startServer } = await import("../packages/server/index.mjs");
  const s = await startServer({ token: "t" });
  try {
    const a = performance.now();
    const r = await fetch(`http://127.0.0.1:${s.port}/`);
    await r.arrayBuffer();
    const took = performance.now() - a;
    assert.ok(r.status === 200 || r.status === 503, String(r.status));
    assert.ok(took < 800, `the first page took ${took.toFixed(0)} ms (1946 ms before #501)`);
  } finally { await s.close(); }
});

test("warmCatalog primes the catalog once; a warm read is quick", async () => {
  const cat = await import("../packages/style-catalog/index.mjs");
  await cat.warmCatalog();
  const a = performance.now(); const styles = cat.listStyles().styles; const took = performance.now() - a;
  assert.ok(styles.length > 10 && took < 100, `${styles.length} styles in ${took.toFixed(0)} ms`);
  assert.equal(await cat.warmCatalog(), false, "already in memory: kept");
});

test("the first-run list from its worker is the same list", async () => {
  const fr = await import("../packages/setup/first-run.mjs");
  const { APP_ROOT } = await import("../packages/version-manager/index.mjs");
  const [async, sync] = [await fr.firstRunItemsAsync(APP_ROOT), fr.firstRunItems(APP_ROOT)];
  assert.ok(async.items.filter((i) => i.ready && i.id !== "work").every((i) => i.diskMb === null || Number.isInteger(i.diskMb)), "the worker measures diskMb");
  assert.deepEqual(async.items.map((i) => [i.id, i.ready]), sync.items.map((i) => [i.id, i.ready]));
});

test("the status button's word: updating, then downloading, then working, else idle", async () => {
  const { appState } = await import("../packages/server/index.mjs");
  const j = (kind, title = kind) => ({ id: kind, kind, title });
  assert.deepEqual([appState({ tasks: [], jobs: [] }).state, appState({ tasks: [], jobs: [] }).about], ["idle", null]);
  assert.equal(appState({ tasks: [{ taskId: "t" }], jobs: [] }).state, "working");
  assert.equal(appState({ tasks: [], jobs: [j("export")] }).state, "working");
  const dl = appState({ tasks: [{ taskId: "t" }], jobs: [j("export"), j("model-install", "Whisper turbo")] });
  assert.deepEqual([dl.state, dl.about], ["downloading", "Whisper turbo"]);
  assert.equal(appState({ tasks: [], jobs: [j("first-run"), j("app-update", "Updating Moworks Studio")] }).state, "updating");
  assert.equal(appState({ tasks: [], jobs: [j("style-source")] }).tasks.length, 0, "the lists stay as they were");
});

test("an installed item's size on the disk (diskMb): measured once per folder, kept for a day; none for a missing folder", async () => {
  const { writeFileSync: w, mkdirSync: md, readFileSync: rf } = await import("node:fs");
  const fr = await import("../packages/setup/first-run.mjs");
  const d = join(T, "sized"); md(join(d, "a", "b"), { recursive: true });
  w(join(d, "one.bin"), Buffer.alloc(3 * 1048576)); w(join(d, "a", "b", "two.bin"), Buffer.alloc(2 * 1048576));
  assert.equal(fr.diskMb([d], T), 5);
  w(join(d, "three.bin"), Buffer.alloc(4 * 1048576));
  assert.equal(fr.diskMb([d], T), 5, "the day's measure");
  assert.equal(fr.diskMb([d], T, { maxAgeMs: 0 }), 9, "measured again when old");
  assert.ok(JSON.parse(rf(join(process.env.MW_STATE_DIR, "disk-sizes.json"), "utf8"))[d], "kept in the state folder");
  assert.equal(fr.diskMb([join(T, "nowhere"), null], T), null);
});
