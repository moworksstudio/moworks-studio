// The UI's settings kept on this computer: the app serves its UI on a new port at
// every start, so the browser's storage starts empty; GET/POST /api/prefs keeps the mw-* keys in the state folder across restarts.
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const T = mkdtempSync(join(tmpdir(), "mw-prefs-"));
process.env.MW_WORK_ROOT = join(T, "work");
process.env.MW_STATE_DIR = join(T, "state");
process.env.MW_MODELS_ROOT = join(T, "models");
process.env.MW_NO_BACKUP = "1";
process.env.MW_NO_LIBRARY_IMPORT = "1";
process.env.MW_BACKUP_ROOT = join(T, "backup");
const { startServer } = await import("../packages/server/index.mjs");
const { prefsFile } = await import("../packages/server/prefs.mjs");
after(() => rmSync(T, { recursive: true, force: true }));

const call = async (s, method, path, body) => {
  const r = await fetch(`http://127.0.0.1:${s.port}/api${path}`, { method, headers: { "X-MW-Token": "k", ...(body ? { "Content-Type": "application/json" } : {}) }, body: body ? JSON.stringify(body) : undefined });
  return { status: r.status, json: await r.json().catch(() => null) };
};
const stop = (s) => s.close();

test("the UI's settings survive a restart on a new port; only a clean install starts empty", async () => {
  let a = await startServer({ token: "k" }), b;
  try {
    assert.deepEqual((await call(a, "GET", "/prefs")).json, { prefs: {} });          // a clean install: nothing kept, the first start asks
    const r = await call(a, "POST", "/prefs", { set: { "mw-pref:theme": "\"studio\"", "mw-pref:theme-asked": "1", "mw-pref:editor:tl-h": "240", "mw-token": "x", "other": "y", "mw-pref:big": "z".repeat(200001) } });
    assert.equal(r.status, 200);
    await call(a, "POST", "/prefs", { set: { "mw-pref:editor:tl-h": "300" }, remove: ["mw-pref:theme-asked"] });
    await stop(a);
    a = null;
    assert.ok(existsSync(prefsFile(join(T, "unused"))), "kept in the state folder");
    b = await startServer({ token: "k" });
    const { prefs } = (await call(b, "GET", "/prefs")).json;
    assert.deepEqual(prefs, { "mw-pref:theme": "\"studio\"", "mw-pref:editor:tl-h": "300" });          // never the session token, nor "other"; too long: left out
    assert.equal((await call(b, "GET", "/prefs")).status, 200);
    const noToken = await fetch(`http://127.0.0.1:${b.port}/api/prefs`);
    assert.equal(noToken.status, 401);          // like every API: the session token
  } finally { if (a) await stop(a).catch(() => {}); if (b) await stop(b).catch(() => {}); }
});
