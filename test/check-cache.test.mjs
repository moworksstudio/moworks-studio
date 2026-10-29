// A slow check answers at once with its last result while it runs again;
// ?fresh=1 waits; a setup job that ends clears it. Run: npm test
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { cachedCheck } from "../packages/server/checkCache.mjs";
import { createJobs } from "../packages/server/jobs.mjs";

const T = mkdtempSync(join(tmpdir(), "mw-check-cache-"));
process.env.MW_STATE_DIR = T;
after(() => rmSync(T, { recursive: true, force: true }));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

test("the first read waits; later reads answer at once with the last result while the check runs again", async () => {
  let n = 0;
  const c = cachedCheck("demo", async () => { await wait(150); return { n: ++n }; }, { root: T });
  const first = await c.get();
  assert.deepEqual([first.n, first.cached], [1, false]);
  const a = performance.now(); const second = await c.get(); const took = performance.now() - a;
  assert.deepEqual([second.n, second.cached, second.checking], [1, true, true]);
  assert.ok(took < 50, `${took.toFixed(0)} ms`);
  await wait(250);
  assert.equal((await c.get()).n, 2, "the background run's result on the next read");
  assert.equal((await c.get({ fresh: true })).n >= 3, true, "fresh waits for a new run");
  assert.ok(existsSync(join(T, "check-demo.json")), "kept for the next start");
  const again = cachedCheck("demo", async () => ({ n: 99 }), { root: T });
  assert.equal((await again.get()).cached, true, "after a restart: the kept result at once");
});

test("clear: the next read waits for a new run, and a run that started before the clear is not kept", async () => {
  let n = 0;
  const c = cachedCheck("clear", async () => { await wait(100); return { n: ++n }; }, { root: T });
  await c.get();
  c.get();          // a background run starts
  c.clear();
  const r = await c.get();
  assert.equal(r.cached, false);
  await wait(150);
  assert.equal((await c.get()).n >= r.n, true);
});

test("a job's end reaches the ended hook (the server clears the setup checks with it)", async () => {
  const seen = [];
  const jobs = createJobs({ ended: (j) => seen.push([j.kind, j.status]) });
  jobs.start("model-install", { title: "x" }, async () => 1);
  await wait(20);
  assert.deepEqual(seen, [["model-install", "done"]]);
});
