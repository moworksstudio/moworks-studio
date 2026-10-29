// The style catalog in memory: a second call reads it from memory, a caller's change never reaches the next answer, and a change
// to a file it was built from (here config/styles.json's time) builds it again.
import { test } from "node:test";
import assert from "node:assert/strict";
import { statSync, utimesSync } from "node:fs";
import { join } from "node:path";
import { getStyle, listStyles } from "../packages/style-catalog/index.mjs";
import { APP_ROOT } from "../packages/version-manager/index.mjs";

test("the style catalog: kept in memory, a copy per caller, built again when one of its files changes", () => {
  const a = listStyles();
  let t0 = performance.now(); const b = listStyles(); const warm = performance.now() - t0;
  assert.deepEqual(b, a);
  assert.ok(warm < 60, `a warm call took ${warm.toFixed(0)} ms`);
  b.styles[0].title = "changed by a caller"; getStyle(a.styles[0].id).title = "changed too";
  assert.equal(listStyles().styles[0].title, a.styles[0].title, "a caller's change stays its own");
  assert.equal(getStyle(a.styles[0].id).title, a.styles[0].title);
  const f = join(APP_ROOT, "config", "styles.json"), s = statSync(f);
  try {
    utimesSync(f, s.atime, new Date(s.mtimeMs + 2000));
    t0 = performance.now(); const c = listStyles(); const rebuilt = performance.now() - t0;
    assert.deepEqual(c, a);
    assert.ok(rebuilt > warm, "built again after the file changed");
  } finally { utimesSync(f, s.atime, s.mtime); }
});

test("the gallery's light list: no pipeline or rule files, a short credit, a thumbnail per still; one style in full by id; the thumbnail served small", { timeout: 120000 }, async () => {
  const { styleList } = await import("../packages/style-catalog/index.mjs");
  const full = listStyles(), list = styleList();
  assert.equal(list.styles.length, full.styles.length);
  assert.ok(list.styles.every((s) => !("pipeline" in s) && !("rules" in s) && !("readFirst" in s) && s.ruleCount > 0));
  assert.ok(JSON.stringify(list).length < JSON.stringify(full).length * 0.25, "a quarter of the full list at most");
  assert.ok(list.styles.every((s) => !s.preview?.image || s.preview.thumb), "every still has a tile");
  const { mkdtempSync, rmSync } = await import("node:fs"), { tmpdir } = await import("node:os");
  const T = mkdtempSync(join(tmpdir(), "mw-thumbs-"));
  Object.assign(process.env, { MW_THUMBS_ROOT: join(T, "thumbs"), MW_WORK_ROOT: join(T, "work"), MW_STATE_DIR: join(T, "state"), MW_BACKUP_ROOT: join(T, "backup"),
    MW_NO_BACKUP: "1", MW_NO_LIBRARY_IMPORT: "1", MW_NO_ASSET_INSTALL: "1" });
  const { startServer } = await import("../packages/server/index.mjs");
  const s = await startServer({ token: "t0k" });
  try {
    const get = (p) => fetch(`http://127.0.0.1:${s.port}${p}`, { headers: { "x-mw-token": "t0k" } });
    assert.equal((await (await get("/api/styles/list")).json()).styles.length, list.styles.length);
    const lemo = list.styles.find((x) => x.preview?.thumb?.startsWith("/media/thumb/lemo/"));
    const one = await (await get(`/api/styles/${lemo.id}`)).json();
    assert.ok(one.pipeline && one.rules?.length, "the style in full");
    assert.equal((await get("/api/styles/no-such-style")).status, 404);
    const [th, im] = await Promise.all([get(lemo.preview.thumb), get(lemo.preview.image)]);
    assert.equal(th.status, 200); assert.equal(th.headers.get("content-type"), "image/webp");
    assert.ok(Number(th.headers.get("content-length")) < Number(im.headers.get("content-length")), "the tile is smaller than the still");
    assert.equal((await get("/media/thumb/lemo/..%2F..%2Fconfig%2Fpins.json")).status, 404);
  } finally { await s.close(); rmSync(T, { recursive: true, force: true }); }
});
