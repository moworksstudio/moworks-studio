// The app checks for its own new version by itself: a minute after it starts, then every six hours, only as a git clone with a repo,
// never while it updates itself or renders (it tries again later), quiet when the repo cannot be reached or signed in to; the answer is
// kept, so GET /api/app/update answers from it without asking the repo again. The first start after an update says it once.
// The timers are a fake clock; the repo is a local bare repo (never GitHub).
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const T = mkdtempSync(join(tmpdir(), "mw-update-check-"));
process.env.MW_UPDATE_STATE = join(T, "update-state.json");
process.env.MW_WORK_ROOT = join(T, "work");
process.env.MW_STATE_DIR = join(T, "state");
const up = await import("../packages/app-update/index.mjs");
const { createUpdateChecker, FIRST_CHECK_MS, CHECK_EVERY_MS, BUSY_RETRY_MS } = await import("../packages/app-update/schedule.mjs");
after(() => rmSync(T, { recursive: true, force: true }));

const g = (dir, ...a) => execFileSync("git", ["-C", dir, ...a], { encoding: "utf8", windowsHide: true }).trim();
const id = ["-c", "user.name=Test", "-c", "user.email=test@example.invalid"];
const commit = (dir, file, text, msg) => { writeFileSync(join(dir, file), text); g(dir, "add", file); g(dir, ...id, "commit", "-q", "-m", msg); return g(dir, "rev-parse", "HEAD"); };
/** The user's repo as a local bare repo, a working copy for new commits, and the app's clone of it. */
function setup(name) {
  const base = join(T, name), bare = join(base, "repo.git"), dev = join(base, "dev"), app = join(base, "app");
  mkdirSync(base, { recursive: true });
  execFileSync("git", ["init", "-q", "--bare", "-b", "main", bare], { windowsHide: true });
  execFileSync("git", ["clone", "-q", bare, dev], { windowsHide: true });
  g(dev, "symbolic-ref", "HEAD", "refs/heads/main");
  mkdirSync(join(dev, "config"));
  writeFileSync(join(dev, "config", "update.json"), JSON.stringify({ repo: bare, branch: "main" }));
  writeFileSync(join(dev, ".gitignore"), "runtime/\n");
  g(dev, "add", "."); commit(dev, "app.txt", "v1", "First version");
  g(dev, "push", "-q", "origin", "main");
  execFileSync("git", ["clone", "-q", bare, app], { windowsHide: true });
  return { dev, app };
}

/** setTimeout / clearTimeout on a clock the test moves. */
function fakeClock() {
  let t = 0, seq = 0;
  const timers = new Map();
  const settle = () => new Promise((r) => setImmediate(r));
  return {
    setTimeout(fn, ms) { const n = ++seq; timers.set(n, { at: t + ms, fn }); return n; },
    clearTimeout(n) { timers.delete(n); },
    now: () => new Date(Date.UTC(2026, 9, 30, 8) + t),
    pending: () => [...timers.values()].map((x) => x.at - t),
    async advance(ms) {
      const end = t + ms;
      for (;;) {
        const [n, next] = [...timers.entries()].sort((a, b) => a[1].at - b[1].at)[0] ?? [];
        if (!next || next.at > end) break;
        timers.delete(n); t = next.at; next.fn();
        for (let i = 0; i < 5; i++) await settle();          // the check's promise chain
      }
      t = end;
    },
  };
}
const answer = (n, subject = "New version") => ({ available: true, ahead: n, current: { short: "aaaa1111", date: "2026-10-29T10:00:00+07:00", subject: "Old" },
  latest: { short: `bbbb${n}000`, hash: `bbbb${n}000`.padEnd(40, "0"), date: "2026-10-30T09:00:00+07:00", subject }, commits: [], blocked: [], at: "2026-10-30T08:01:00.000Z" });

test("the first check a minute after start, then every six hours; the app's own check is quiet", async () => {
  assert.equal(FIRST_CHECK_MS, 60 * 1000);
  assert.equal(CHECK_EVERY_MS, 6 * 60 * 60 * 1000);
  const clock = fakeClock(), calls = [];
  const u = createUpdateChecker({ root: "app", eligible: () => true, whatUpdated: async () => null, clock, now: clock.now,
    check: async (root, o) => { calls.push([root, o]); return answer(calls.length); } });
  assert.equal(u.start(), true);
  assert.deepEqual(clock.pending(), [FIRST_CHECK_MS]);
  await clock.advance(FIRST_CHECK_MS - 1);
  assert.equal(calls.length, 0, "nothing before the minute");
  await clock.advance(1);
  assert.deepEqual(calls, [["app", { quiet: true }]]);
  assert.deepEqual(clock.pending(), [CHECK_EVERY_MS], "the next one six hours later");
  assert.deepEqual(u.notice(), { available: true, latest: { id: "bbbb1000", date: "2026-10-30T09:00:00+07:00", subject: "New version" }, ahead: 1,
    checkedAt: "2026-10-30T08:01:00.000Z", checkError: null, updated: null });
  await clock.advance(CHECK_EVERY_MS - 1);
  assert.equal(calls.length, 1);
  await clock.advance(1);
  assert.equal(calls.length, 2);
  assert.equal(u.notice().latest.id, "bbbb2000");
  u.stop();
  assert.deepEqual(clock.pending(), [], "stopping clears the timer");
  await clock.advance(CHECK_EVERY_MS * 2);
  assert.equal(calls.length, 2);
});

test("only a git clone with a repo checks: elsewhere no timer starts", async () => {
  const { app } = setup("eligible");
  assert.equal(up.canCheck(app), true);
  const plain = join(T, "plain"); mkdirSync(join(plain, "config"), { recursive: true });
  assert.equal(up.canCheck(plain), false, "not a git clone");
  writeFileSync(join(app, "config", "update.json"), JSON.stringify({ repo: null }));
  assert.equal(up.canCheck(app), false, "no repo");
  for (const root of [plain, app]) {
    const clock = fakeClock();
    const u = createUpdateChecker({ root, clock, check: async () => { throw new Error("never"); } });
    assert.equal(u.start(), false);
    assert.deepEqual(clock.pending(), []);
  }
});

test("never while an update or a render runs: skipped, tried again a little later", async () => {
  const clock = fakeClock(), calls = [];
  let busy = true;
  const u = createUpdateChecker({ root: "app", eligible: () => true, whatUpdated: async () => null, clock, now: clock.now, busy: () => busy,
    check: async () => { calls.push(1); return answer(1); } });
  u.start();
  await clock.advance(FIRST_CHECK_MS);
  assert.equal(calls.length, 0);
  assert.equal(u.state().skipped.reason, "busy");
  assert.deepEqual(clock.pending(), [BUSY_RETRY_MS]);
  await clock.advance(BUSY_RETRY_MS);
  assert.equal(calls.length, 0, "still busy");
  busy = false;
  await clock.advance(BUSY_RETRY_MS);
  assert.equal(calls.length, 1);
  assert.equal(u.state().skipped, null);
  assert.deepEqual(clock.pending(), [CHECK_EVERY_MS]);
  u.stop();

  // the server's rule: the update itself, an export, the film's pre-render, or a render in the queue
  const { updateCheckWaits } = await import("../packages/server/index.mjs");
  const jobs = (...kinds) => ({ running: () => kinds.map((kind) => ({ kind })) });
  const renders = (running) => ({ status: () => ({ running, queued: 0 }) });
  assert.equal(updateCheckWaits(jobs(), renders(null)), false);
  assert.equal(updateCheckWaits(jobs("transcribe", "qa"), renders(null)), false, "other work does not hold it");
  for (const k of ["app-update", "export", "preview-proxy"]) assert.equal(updateCheckWaits(jobs(k), renders(null)), true, k);
  assert.equal(updateCheckWaits(jobs(), renders({ projectId: "p", title: "Film" })), true);
});

test("quiet on failure: offline or not signed in is only noted; the last answer stays; the user's own check still sees the error", async () => {
  const clock = fakeClock(), lines = [];
  let fail = null, calls = 0;
  const u = createUpdateChecker({ root: "app", eligible: () => true, whatUpdated: async () => null, clock, now: clock.now, log: (l) => lines.push(l),
    check: async () => { calls++; if (fail) throw Object.assign(new Error(fail === "AUTH" ? "GitHub did not let the app read the repo" : "The repo could not be reached"), { code: fail }); return answer(1); } });
  u.start();
  await clock.advance(FIRST_CHECK_MS);
  assert.equal(u.notice().available, true);
  fail = "AUTH";
  await clock.advance(CHECK_EVERY_MS);          // no unhandled rejection: the test would fail on one
  assert.equal(calls, 2);
  assert.equal(u.notice().available, true, "the last answer is kept");
  assert.equal(u.notice().checkError.code, "AUTH");
  assert.equal(lines.length, 1);
  assert.match(lines[0], /\[update\].*AUTH/);
  assert.deepEqual(clock.pending(), [CHECK_EVERY_MS], "it goes on checking");
  fail = "FETCH";
  await assert.rejects(u.run(), { code: "FETCH" }, "Check for updates shows its error");
  assert.equal(lines.length, 1, "the user's own check is not logged as the quiet one");
  fail = null;
  await u.run();
  assert.equal(u.notice().checkError, null);
  u.stop();
});

test("the user's check meeting a quiet one waits for it, and asks again itself only when the quiet one could not sign in", async () => {
  const seen = [];
  let release;
  const u = createUpdateChecker({ root: "app", eligible: () => true, check: (root, o) => { seen.push(o.quiet); if (o.quiet) return new Promise((_, no) => { release = () => no(Object.assign(new Error("no sign-in"), { code: "AUTH" })); }); return Promise.resolve(answer(3)); } });
  const quiet = u.run({ quiet: true }).catch((e) => e.code);
  const mine = u.run();
  release();
  assert.equal(await quiet, "AUTH");
  assert.equal((await mine).ahead, 3);
  assert.deepEqual(seen, [true, false]);
});

test("GET /api/app/update answers from the kept check, with no fetch: available, the new version's date and subject, when it was checked", async () => {
  const { dev, app } = setup("cached");
  commit(dev, "app.txt", "v2", "Second version"); commit(dev, "app.txt", "v3", "Third version");
  g(dev, "push", "-q", "origin", "main");
  let fetches = 0;
  const updates = createUpdateChecker({ root: app, whatUpdated: async () => null, check: (root, o) => { fetches++; return up.check(root, o); } });
  const { routes } = await import("../packages/server/index.mjs");
  const table = routes({ root: app, updates, running: () => [] });
  const route = (m, p) => { const r = table.find(([method, re]) => method === m && re.test(`/api${p}`)); assert.ok(r, `${m} ${p}`); return () => r[2]([], {}, new URLSearchParams()); };
  let d = await route("GET", "/app/update")();
  assert.equal(d.available, false, "before the first check");
  assert.equal(d.check, null);
  assert.equal(fetches, 0, "the read never asks the repo");
  await updates.run({ quiet: true });          // the app's own check (quiet: no sign-in window), against the local repo
  assert.equal(fetches, 1);
  for (let i = 0; i < 2; i++) {
    d = await route("GET", "/app/update")();
    assert.equal(d.available, true);
    assert.deepEqual(Object.keys(d.latest).sort(), ["date", "id", "subject"]);
    assert.equal(d.latest.subject, "Third version");
    assert.match(d.latest.date, /^\d{4}-\d\d-\d\dT/);
    assert.match(d.checkedAt, /^\d{4}-\d\d-\d\dT/);
    assert.deepEqual(d.check.commits.map((c) => c.subject), ["Third version", "Second version"], "Settings › Update opens with the answer");
    assert.equal(d.current.subject, "First version");
  }
  assert.equal(fetches, 1, "two reads, still one fetch");
  const c = await route("POST", "/app/update/check")();          // "Check for updates" goes through the same answer
  assert.equal(c.ahead, 2);
  assert.equal(fetches, 2);
  assert.equal(updates.answer(), c);
});

test("the first start after an update says it once: the version's date and subject, then never again", async () => {
  const { dev, app } = setup("announce");
  assert.equal(await up.justUpdated(app), null, "no update yet");
  commit(dev, "app.txt", "v2", "Sound effects in the chat"); g(dev, "push", "-q", "origin", "main");
  const steps = Object.fromEntries(["install", "build", "smoke"].map((k) => [k, async () => {}]));
  const r = await up.apply(app, { steps });
  assert.equal(r.status, "done");
  const clock = fakeClock();
  const u = createUpdateChecker({ root: app, clock, check: async () => answer(0) });
  assert.equal(u.start(), true);
  await new Promise((ok) => setTimeout(ok, 300));
  for (let i = 0; i < 20 && !u.notice().updated; i++) await new Promise((ok) => setTimeout(ok, 100));
  const said = u.notice().updated;
  assert.equal(said.subject, "Sound effects in the chat");
  assert.equal(said.id, g(app, "rev-parse", "--short=8", "HEAD"));
  assert.match(said.date, /^\d{4}-\d\d-\d\dT/);
  u.stop();
  assert.equal(await up.justUpdated(app), null, "said once: the next start does not say it again");
});
