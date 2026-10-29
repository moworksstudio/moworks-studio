// Settings › Update: the app folder, a git clone, checks the user's repo for a newer version (commits, files, what blocks it),
// fast-forwards to it and runs the steps after (packages when they changed, interface, start check); a failed step puts the folder back
// on the version before; files of the app changed on this computer, or commits of its own, block the update; the user's files outside
// git stay as they were.
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const T = mkdtempSync(join(tmpdir(), "mw-update-"));
process.env.MW_UPDATE_STATE = join(T, "update-state.json");
const up = await import("../packages/app-update/index.mjs");
after(() => rmSync(T, { recursive: true, force: true }));

const g = (dir, ...a) => execFileSync("git", ["-C", dir, ...a], { encoding: "utf8", windowsHide: true }).trim();
const id = ["-c", "user.name=Test", "-c", "user.email=test@example.invalid"];
const commit = (dir, file, text, msg) => { writeFileSync(join(dir, file), text); g(dir, "add", file); g(dir, ...id, "commit", "-q", "-m", msg); return g(dir, "rev-parse", "HEAD"); };

/** An upstream repo (the user's GitHub repo stands in as a local bare repo), its working copy for new commits, and the app's clone. */
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
  mkdirSync(join(app, "runtime", "state"), { recursive: true });
  writeFileSync(join(app, "runtime", "state", "settings.json"), "{\"mine\":true}");          // the user's own settings: outside git
  return { bare, dev, app };
}
const calls = [];
const steps = (failAt = null) => Object.fromEntries(["install", "build", "smoke"].map((k) => [k, async () => { calls.push(k); if (k === failAt) throw Object.assign(new Error(`${k} broke`), { detail: { tail: "boom" } }); }]));

test("up to date, then a new version: the commits and what changed; not a git clone or no repo is said plainly", async () => {
  const { dev, app } = setup("check");
  let c = await up.check(app);
  assert.equal(c.available, false); assert.equal(c.ahead, 0);
  commit(dev, "app.txt", "v2", "Second version"); commit(dev, "package.json", "{}", "New packages");
  g(dev, "push", "-q", "origin", "main");
  c = await up.check(app);
  assert.equal(c.available, true); assert.equal(c.ahead, 2); assert.equal(c.packages, true);
  assert.deepEqual(c.commits.map((x) => x.subject), ["New packages", "Second version"]);
  assert.deepEqual(c.blocked, []);
  const st = await up.status(app);
  assert.equal(st.configured, true); assert.equal(st.lastCheck.available, true);
  const plain = join(T, "plain"); mkdirSync(plain);
  await assert.rejects(up.check(plain), { code: "NOT_GIT" });
  writeFileSync(join(app, "config", "update.json"), JSON.stringify({ repo: null }));
  await assert.rejects(up.check(app), { code: "NO_REPO" });
});

test("the repo in config/update.json: a bare GitHub owner/name becomes its https URL; a URL or a folder stays as is", () => {
  assert.equal(up.repoUrl("moworksstudio/moworks-studio"), "https://github.com/moworksstudio/moworks-studio.git");
  assert.equal(up.repoUrl("moworksstudio/moworks-studio.git"), "https://github.com/moworksstudio/moworks-studio.git");
  assert.equal(up.repoUrl("https://github.com/a/b.git"), "https://github.com/a/b.git");
  assert.equal(up.repoUrl("git@github.com:a/b.git"), "git@github.com:a/b.git");
  assert.equal(up.repoUrl("C:\\Work\\repo.git"), "C:\\Work\\repo.git");
  const dir = join(T, "cfg"); mkdirSync(join(dir, "config"), { recursive: true });
  writeFileSync(join(dir, "config", "update.json"), JSON.stringify({ repo: "moworksstudio/moworks-studio" }));
  assert.deepEqual(up.updateConfig(dir), { repo: "https://github.com/moworksstudio/moworks-studio.git", branch: "main" });
  const shipped = JSON.parse(readFileSync(new URL("../config/update.json", import.meta.url), "utf8"));
  assert.match(up.repoUrl(shipped.repo), /^https:\/\/github\.com\/[\w.-]+\/[\w.-]+\.git$/);
});

test("apply: fast-forward, packages because they changed, interface, start check; the user's files untouched", async () => {
  const { dev, app } = setup("apply");
  commit(dev, "app.txt", "v2", "Second version"); commit(dev, "package-lock.json", "{}", "Lock");
  g(dev, "push", "-q", "origin", "main");
  calls.length = 0;
  const stages = [];
  const r = await up.apply(app, { steps: steps(), onStep: (s) => stages.push(s) });
  assert.equal(g(app, "rev-parse", "HEAD"), g(dev, "rev-parse", "HEAD"));
  assert.equal(readFileSync(join(app, "app.txt"), "utf8"), "v2");
  assert.deepEqual(calls, ["install", "build", "smoke"]);
  assert.equal(r.status, "done"); assert.equal(r.restart, true);
  assert.ok(stages.includes("building the interface"));
  assert.equal(readFileSync(join(app, "runtime", "state", "settings.json"), "utf8"), "{\"mine\":true}");
  await assert.rejects(up.apply(app, { steps: steps() }), { code: "UP_TO_DATE" });
});

test("a failed step puts the app back on the version before (and rebuilds it); no packages step when they did not change", async () => {
  const { dev, app } = setup("rollback");
  const before = g(app, "rev-parse", "HEAD");
  commit(dev, "app.txt", "v2", "Broken version"); g(dev, "push", "-q", "origin", "main");
  calls.length = 0;
  await assert.rejects(up.apply(app, { steps: steps("smoke") }), (e) => e.code === "UPDATE_FAILED" && e.detail.stage === "check" && e.detail.rolledBack);
  assert.equal(g(app, "rev-parse", "HEAD"), before);
  assert.equal(readFileSync(join(app, "app.txt"), "utf8"), "v1");
  assert.deepEqual(calls, ["build", "smoke", "build"]);
  const st = await up.status(app);
  assert.equal(st.last.status, "rolled-back"); assert.equal(st.last.failedAt, "check"); assert.equal(st.last.detail, "boom");
});

test("blocked: files of the app changed on this computer, or commits of its own", async () => {
  const { dev, app } = setup("blocked");
  commit(dev, "app.txt", "v2", "Second version"); g(dev, "push", "-q", "origin", "main");
  writeFileSync(join(app, "app.txt"), "changed here");
  let c = await up.check(app);
  assert.equal(c.blocked[0].code, "LOCAL_CHANGES");
  await assert.rejects(up.apply(app, { steps: steps() }), { code: "LOCAL_CHANGES" });
  g(app, "checkout", "--", "app.txt");
  commit(app, "own.txt", "mine", "A change of this computer");
  c = await up.check(app);
  assert.equal(c.available, false); assert.equal(c.blocked[0].code, "DIVERGED");
  assert.ok(existsSync(join(app, "own.txt")));
});
