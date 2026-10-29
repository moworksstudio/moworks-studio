// The app's own update: Settings › Update brings this app folder to the newest version on the maintainer's private GitHub
// repo. The app folder is a git clone of that repo; an update is a fast-forward to the repo's branch, then the app's npm packages (when
// package.json / package-lock.json changed), the interface build and a start check, then a restart. A step that fails puts the folder back
// on the commit it came from (packages and interface rebuilt for it). Only files git tracks change: the user's work (the work folder:
// projects, library, characters; runtime/: settings, local pins, HF runtimes, logs) is outside git and is never touched.
// The repo (GitHub `owner/name`, or a URL) and branch come from config/update.json; the sign-in is git's own (Git Credential Manager on Windows asks once).
import { execFile, spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { APP_ROOT } from "../version-manager/index.mjs";

const REF = "refs/mw-update/latest";          // the fetched tip of the repo's branch, kept apart from the clone's own remotes
const configFile = (root) => join(root, "config", "update.json");
const stateFile = (root) => process.env.MW_UPDATE_STATE ?? join(root, "runtime", "state", "update.json");          // MW_UPDATE_STATE: tests
const readJson = (f, d) => { try { return JSON.parse(readFileSync(f, "utf8")); } catch { return d; } };
const writeState = (root, patch) => {
  const f = stateFile(root), next = { ...readJson(f, {}), ...patch };
  mkdirSync(dirname(f), { recursive: true }); writeFileSync(f, JSON.stringify(next, null, 2) + "\n");
  return next;
};
const fail = (code, message, detail = null) => Object.assign(new Error(message), { code, detail });

/** git in the app folder: stdout trimmed; throws with git's own message. No prompt in a console that nobody sees (the sign-in window of
 *  Git Credential Manager still opens). */
export function git(root, args, { timeout = 120000 } = {}) {
  return new Promise((ok, no) => execFile("git", ["-C", root, ...args], { windowsHide: true, timeout, maxBuffer: 32 * 1024 * 1024,
    env: { ...process.env, GIT_TERMINAL_PROMPT: "0" } }, (e, out, err) => {
    if (e) return no(fail("GIT", (String(err || e.message).trim().split(/\r?\n/).filter(Boolean).pop() ?? "git failed"), { args: args.join(" "), stderr: String(err ?? "").slice(-2000) }));
    ok(String(out).trim());
  }));
}

/** The repo as git fetches it: a bare GitHub `owner/name` becomes its https URL (git would read it as a folder); a URL or path as is. */
export const repoUrl = (repo) => (/^[\w.-]+\/[\w.-]+$/.test(repo) ? `https://github.com/${repo.replace(/\.git$/, "")}.git` : repo);

export function updateConfig(root = APP_ROOT) {
  const c = readJson(configFile(root), {});
  return { repo: c.repo ? repoUrl(String(c.repo)) : null, branch: c.branch || "main" };
}

const commitInfo = async (root, rev) => {
  const [hash, date, subject] = (await git(root, ["log", "-1", "--format=%H%x00%cI%x00%s", rev])).split("\0");
  return { hash, short: hash.slice(0, 8), date, subject };
};

/** Where the app is: its commit, the repo it updates from, the last check and the last update's result. */
export async function status(root = APP_ROOT) {
  const cfg = updateConfig(root), st = readJson(stateFile(root), {});
  const isGit = existsSync(join(root, ".git"));
  let current = null;
  if (isGit) { try { current = await commitInfo(root, "HEAD"); } catch { /* an empty clone */ } }
  return { git: isGit, repo: cfg.repo, branch: cfg.branch, configured: !!cfg.repo, current, lastCheck: st.check ?? null, last: st.update ?? null };
}

/** Files git tracks that differ from the commit (an update would overwrite them): none on a user's computer. */
const localChanges = async (root) => (await git(root, ["status", "--porcelain", "--untracked-files=no"])).split(/\r?\n/).filter(Boolean).map((l) => l.slice(3));

/** Ask the repo for its newest version: { available, current, latest, commits: [{short, date, subject}], files, blocked, changelog }. */
export async function check(root = APP_ROOT) {
  const cfg = updateConfig(root);
  if (!existsSync(join(root, ".git"))) throw fail("NOT_GIT", "This copy of the app is not a git clone, so it cannot update itself: install it with git clone");
  if (!cfg.repo) throw fail("NO_REPO", "No update address yet: config/update.json has no repo");
  try { await git(root, ["fetch", "--no-tags", "--quiet", cfg.repo, `+refs/heads/${cfg.branch}:${REF}`], { timeout: 300000 }); }
  catch (e) {
    const auth = /authentication|could not read username|permission denied|repository not found|403/i.test(e.message);
    throw fail(auth ? "AUTH" : "FETCH", auth ? "GitHub did not let the app read the repo: sign in to GitHub with git (Git Credential Manager), then check again"
      : `The repo could not be reached: ${e.message}`, e.detail);
  }
  const current = await commitInfo(root, "HEAD"), latest = await commitInfo(root, REF);
  const [ahead, behind] = (await git(root, ["rev-list", "--left-right", "--count", `${REF}...HEAD`])).split(/\s+/).map(Number);
  const commits = ahead ? (await git(root, ["log", "--format=%h%x00%cI%x00%s", "--max-count=100", `HEAD..${REF}`])).split(/\r?\n/).filter(Boolean)
    .map((l) => { const [short, date, subject] = l.split("\0"); return { short, date, subject }; }) : [];
  const files = ahead ? (await git(root, ["diff", "--name-only", `HEAD...${REF}`])).split(/\r?\n/).filter(Boolean) : [];
  let changelog = null;
  if (ahead && files.includes("CHANGELOG.md")) { try { changelog = (await git(root, ["show", `${REF}:CHANGELOG.md`])).slice(0, 8000); } catch { /* none */ } }
  const blocked = [];
  if (behind) blocked.push({ code: "DIVERGED", message: `This copy has ${behind} change(s) of its own that the repo does not have: it can only be updated by hand` });
  const changed = ahead ? await localChanges(root) : [];
  if (changed.length) blocked.push({ code: "LOCAL_CHANGES", message: `Files of the app were changed on this computer: ${changed.slice(0, 5).join(", ")}${changed.length > 5 ? "…" : ""}`, files: changed });
  const result = { available: ahead > 0 && !behind, current, latest, ahead, behind, commits, files: files.length, packages: files.some((f) => /^package(-lock)?\.json$/.test(f)),
    changelog, blocked, at: new Date().toISOString() };
  writeState(root, { check: { at: result.at, available: result.available, latest: latest.short, ahead } });
  return result;
}

const npm = process.platform === "win32" ? "npm.cmd" : "npm";
/** A command in the app folder (npm install, the interface build, the start check); the last lines of its output on failure. */
function run(root, cmd, args, { timeout = 900000, signal = null } = {}) {
  return new Promise((ok, no) => {
    const c = spawn(cmd, args, { cwd: root, windowsHide: true, shell: cmd.endsWith(".cmd"), env: { ...process.env, NO_COLOR: "1" } });
    let tail = "";
    const keep = (d) => { tail = (tail + d).slice(-4000); };
    c.stdout.on("data", keep); c.stderr.on("data", keep);
    const t = setTimeout(() => c.kill(), timeout);
    signal?.addEventListener("abort", () => c.kill(), { once: true });
    c.on("error", (e) => { clearTimeout(t); no(fail("RUN", `${cmd} could not start: ${e.message}`)); });
    c.on("close", (code) => { clearTimeout(t); code === 0 ? ok(tail) : no(fail("RUN", `${[cmd, ...args].join(" ")} failed (exit ${code})`, { tail })); });
  });
}

/** The steps after the code changed: packages (when they changed), the interface, a start check (the service's modules load). */
export const defaultSteps = {
  install: (root, o) => run(root, npm, ["install", "--no-audit", "--no-fund"], o),
  build: (root, o) => run(root, npm, ["run", "build"], o),
  smoke: (root, o) => run(root, process.execPath, ["--input-type=module", "-e", "await import('./packages/server/index.mjs');"], { ...o, timeout: 120000 }),
};

/** Update to the newest version (check() must say available). onStep(stage) for the job. Returns { from, to }; on a failure the folder is
 *  back on `from` and the error says which step failed (rolledBack: true). */
export async function apply(root = APP_ROOT, { onStep = () => {}, signal = null, steps = defaultSteps } = {}) {
  onStep("checking");
  const c = await check(root);
  if (!c.ahead) throw fail("UP_TO_DATE", "The app is already on the newest version");
  if (c.blocked.length) throw fail(c.blocked[0].code, c.blocked[0].message, { blocked: c.blocked });
  const from = c.current.hash, to = c.latest.hash, at = new Date().toISOString();
  writeState(root, { update: { status: "applying", from, to, at } });
  let stage = "code";
  try {
    onStep("updating the code");
    await git(root, ["merge", "--ff-only", "--quiet", REF]);
    if (c.packages) { stage = "packages"; onStep("installing the app's packages"); await steps.install(root, { signal }); }
    stage = "interface"; onStep("building the interface"); await steps.build(root, { signal });
    stage = "check"; onStep("checking the new version starts"); await steps.smoke(root, { signal });
  } catch (e) {
    onStep("going back to the version before");
    let back = null;
    try {
      await git(root, ["reset", "--keep", from]);
      if (c.packages && stage !== "code") await steps.install(root, { signal: null });
      if (stage !== "code") await steps.build(root, { signal: null });
    } catch (e2) { back = e2.message; }
    writeState(root, { update: { status: back ? "failed" : "rolled-back", from, to, at, failedAt: stage, error: e.message, detail: e.detail?.tail ?? null, rollbackError: back } });
    throw fail(back ? "ROLLBACK_FAILED" : "UPDATE_FAILED", back ? `The update failed (${stage}: ${e.message}) and going back failed too (${back}): run git reset --keep ${from.slice(0, 8)} in the app folder`
      : `The update failed at "${stage}" and the app is back on the version before: ${e.message}`, { stage, rolledBack: !back, tail: e.detail?.tail ?? null, command: back ? `git reset --keep ${from}` : null });
  }
  const done = writeState(root, { update: { status: "done", from, to, at, endedAt: new Date().toISOString(), commits: c.commits.length } });
  return { from, to, commits: c.commits, restart: true, ...done.update };
}
