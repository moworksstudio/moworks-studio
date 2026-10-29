// Exit hung about 4.5 min while the app window held connections (the film streaming from the preview origin, kept-alive
// requests); the servers now cut them and stop within seconds. Run: npm test
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { connect } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";

const T = mkdtempSync(join(tmpdir(), "mw-exit-"));
process.env.MW_WORK_ROOT = join(T, "work");
process.env.MW_STATE_DIR = join(T, "state");
process.env.MW_NO_BACKUP = "1";
process.env.MW_NO_LIBRARY_IMPORT = "1";
process.env.MW_BACKUP_ROOT = join(T, "backup");
after(() => rmSync(T, { recursive: true, force: true }));
const { startServer } = await import("../packages/server/index.mjs");

// a connection held open as a browser window holds one: a request whose headers never end
const hold = (port) => new Promise((ok) => { const c = connect(port, "127.0.0.1", () => { c.write("GET /x HTTP/1.1\r\nHost: 127.0.0.1\r\nConnection: keep-alive\r\n"); ok(c); }); c.on("error", () => {}); });

test("Exit stops within seconds while the window holds connections to the app and to the preview", { timeout: 60000 }, async () => {
  const s = await startServer({ token: "t0k" });
  const held = [await hold(s.port), await hold(s.preview.port)];
  const t0 = Date.now();
  await s.shutdown();
  const ms = Date.now() - t0;
  for (const c of held) c.destroy();
  assert.ok(ms < 10000, `shutdown took ${ms} ms`);
});

test("Exit counts the tasks the user started; the app's own background work (the film's pre-render, its quiet checks) is listed idle", { timeout: 60000 }, async () => {
  const s = await startServer({ token: "t0k" });
  try {
    const hold = new Promise(() => {});
    s.jobs.start("preview-proxy", { title: "Rendering the film" }, () => hold);
    s.jobs.start("qa", { title: "Running checks", background: true }, () => hold);
    s.jobs.start("export", { title: "Export film.mp4" }, () => hold);
    const r = await (await fetch(`http://127.0.0.1:${s.port}/api/app`, { headers: { "x-mw-token": "t0k" } })).json();
    assert.deepEqual(r.running.filter((x) => !x.idle).map((x) => x.kind), ["export"]);
    assert.equal(r.running.length, 3, "all of it still stops on Exit");
  } finally { await s.shutdown(); }
});
