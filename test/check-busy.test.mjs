// T22: a render's quick check was killed by its 5 min limit while the computer sat at 100 % CPU, and the render read "The render is
// blocked · Composition files: hyperframes check gave no JSON (exit null)"; nobody saw it for 70 min. The check's limit now follows the film's
// length, a stopped check runs once more by itself, and a second stop is said plainly: a wait for the user with a Retry, never a block.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const T = mkdtempSync(join(tmpdir(), "mw-busy-"));
Object.assign(process.env, { MW_WORK_ROOT: join(T, "work"), MW_STATE_DIR: join(T, "state"), MW_MODELS_ROOT: join(T, "models"), MW_NO_BACKUP: "1", MW_NO_LIBRARY_IMPORT: "1",
  MW_NO_ASSET_INSTALL: "1", MW_BACKUP_ROOT: join(T, "backup") });
after(() => rmSync(T, { recursive: true, force: true }));
const { CHECK_BUSY, checkOnceMore, checkStopped, checkTimeoutMs, filmSeconds } = await import("../packages/hf-qa/qc.mjs");
const { gatesFromHfCheck, runGates } = await import("../packages/hf-qa/gates.mjs");

const MIN = 60000;
const film = (seconds) => {
  const d = mkdtempSync(join(T, "film-"));
  writeFileSync(join(d, "index.html"), `<!doctype html><html><body><div id="root" data-composition-id="main" data-width="1920" data-height="1080" data-duration="${seconds}"></div></body></html>`);
  return d;
};
const clean = () => ({ ok: true, lint: { findings: [], warningCount: 0 }, runtime: { findings: [] }, layout: { findings: [] }, contrast: { findings: [] }, motion: { findings: [] } });
const STOPPED = { command: "check", exitCode: null, json: null, timedOut: true, stderrTail: [] };

test("the check's time limit follows the film: 10 min, 5 s more a second of film, at most 25 min", () => {
  assert.equal(checkTimeoutMs(0), 10 * MIN);
  assert.equal(checkTimeoutMs(60), 15 * MIN, "a one-minute film: 15 min (the old limit was 5 min for any film)");
  assert.equal(checkTimeoutMs(120), 20 * MIN);
  assert.equal(checkTimeoutMs(3600), 25 * MIN);
  assert.equal(filmSeconds(film(42.5)), 42.5);
  assert.equal(filmSeconds(T), 0, "no page: no length");
});

test("a stopped check (its time ran out, or killed: exit null) runs once more by itself; an answer or an exit code is kept", async () => {
  assert.equal(checkStopped(STOPPED), true);
  assert.equal(checkStopped({ exitCode: null, json: null }), true, "killed: no exit code");
  assert.equal(checkStopped({ exitCode: 1, json: null }), false, "HF failed with a code: not a busy machine");
  assert.equal(checkStopped({ exitCode: null, json: clean() }), false, "it answered");
  let n = 0, retries = 0;
  const twice = await checkOnceMore(async () => (n++ ? { exitCode: 0, json: clean() } : STOPPED), { onRetry: () => retries++ });
  assert.deepEqual([n, retries, twice.retried, twice.busy, !!twice.json], [2, 1, true, undefined, true]);
  n = 0;
  const busy = await checkOnceMore(async () => { n++; return STOPPED; });
  assert.deepEqual([n, busy.retried, busy.busy], [2, true, true], "stopped twice: busy, never a third run");
  n = 0;
  const failed = await checkOnceMore(async () => { n++; return { exitCode: 1, json: null }; });
  assert.deepEqual([n, failed.retried], [1, undefined]);
});

test("the HF gates: the limit scaled by the film's length; once more after a stop; stopped twice is CHECK_BUSY in plain words, not 'no JSON'", async () => {
  const d = film(60), limits = [];
  let n = 0, retries = 0;
  const once = await gatesFromHfCheck(d, { onRetry: () => retries++, runner: (ms) => { limits.push(ms); return async () => (n++ ? { exitCode: 0, json: clean() } : STOPPED); } });
  assert.deepEqual(limits, [15 * MIN]);
  assert.equal(retries, 1);
  assert.equal(once.find((g) => g.id === "G-HF-LINT").pass, true, "the second run's answer is the film's checks");
  await assert.rejects(gatesFromHfCheck(d, { runner: () => async () => STOPPED }), (e) => e.code === "CHECK_BUSY" && e.message === CHECK_BUSY);
  assert.equal(CHECK_BUSY, "The quick check did not finish in time (the computer is busy). Try again.");
  // HF's own failure with an exit code stays what it was: a blocking finding with HF's exit
  const failed = await gatesFromHfCheck(d, { runner: () => async () => ({ exitCode: 1, json: null, stderrTail: ["boom"] }) });
  assert.match(failed[0].findings[0].reason, /gave no JSON \(exit 1\)/);
});

test("runGates: a busy check ends the run at once with busy and the plain line; no gate is blamed; the retry is said as a step", async () => {
  const steps = [];
  const r = await runGates(film(20), { blank: false, onStep: (done, total, what) => steps.push(what),
    hfCheck: async (_dir, { onRetry }) => { onRetry(); throw Object.assign(new Error(CHECK_BUSY), { code: "CHECK_BUSY" }); } });
  assert.deepEqual([r.pass, r.busy, r.message, r.blockingFailures], [false, true, CHECK_BUSY, []]);
  assert.ok(steps.includes("HyperFrames' check of the film, once more (the computer is busy)"), steps.join(" | "));
});

// ---- the server's Render: its quick check in its child process, stopped twice (MW_FAKE_CHECK=stopped)
let s, id, dir;
const H = { "X-MW-Token": "k" };
const api = async (method, path, body) => {
  const r = await fetch(`http://127.0.0.1:${s.port}/api${path}`, { method, headers: { ...H, ...(body !== undefined ? { "Content-Type": "application/json" } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
  return { status: r.status, json: await r.json().catch(() => null) };
};
const waitJob = async (jid, ms = 120000) => {
  const t0 = Date.now();
  for (;;) { const j = (await api("GET", `/jobs/${jid}`)).json; if (j.status !== "running") return j; if (Date.now() - t0 > ms) throw new Error(`job ${jid} still running`); await new Promise((r) => setTimeout(r, 500)); }
};
before(async () => {
  process.env.MW_FAKE_CHECK = "stopped";          // the gates' child inherits it
  const { startServer } = await import("../packages/server/index.mjs");
  const { scaffold } = await import("../packages/hf-edit/scaffold.mjs");
  const { expandEnv, loadPins } = await import("../packages/version-manager/index.mjs");
  s = await startServer({ token: "k" });
  dir = join(T, "work", "projects", "busy");
  mkdirSync(join(dir, ".."), { recursive: true });
  await scaffold(dir, readFileSync(join(import.meta.dirname, "fixtures", "storyboard", "STORYBOARD.md"), "utf8"), { registryRoot: expandEnv(loadPins().hyperframes.registryRoot) });
  id = (await api("POST", "/projects/open", { path: dir })).json.id;
});
after(async () => { delete process.env.MW_FAKE_CHECK; await s?.close?.(); });

test("Render on a busy machine: the check runs twice, then the render waits for the user (CHECK_BUSY, a Retry), said in the chat; nothing is kept as the film's checks", { timeout: 180000 }, async () => {
  const job = (await api("POST", `/projects/${id}/exports`, { filename: "Busy", format: "mp4", quality: "draft" })).json;
  const done = await waitJob(job.id);
  assert.equal(done.status, "failed");
  assert.equal(done.error.code, "CHECK_BUSY", JSON.stringify(done.error));
  assert.equal(done.error.message, CHECK_BUSY);
  assert.deepEqual([done.error.detail?.waitsOnUser, done.error.detail?.retry], [true, true]);
  assert.ok(!/no JSON|blocked/i.test(JSON.stringify(done.error)), "never a blocked render with 'no JSON'");
  assert.equal(done.gates, undefined, "no verdict: nothing in the film was checked");
  const notes = (await api("GET", `/projects/${id}/tasks`)).json.notes;
  const n = notes.filter((x) => x.kind === "render").at(-1);
  assert.deepEqual([n?.status, n?.text, n?.open], ["warning", CHECK_BUSY, "render"], "the chat says it, with the Render dialog to open");
  assert.equal(existsSync(join(dir, ".moworks", "cache", "gates", "checked.json")), false, "a stopped check is never reused as the film's checks");
});
