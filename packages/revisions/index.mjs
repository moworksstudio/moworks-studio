// Project revisions (git): a local git repository inside each project folder records every change the app or
// Claude makes, so any change can be reviewed and reverted. Nothing is pushed anywhere. Generated files (posters, renders, HF snapshot
// output) are not tracked. The client's source files (sources/: PSD, PPTX, PDF, guidelines) and any file over 20 MB stay in the project
// folder, so a copied folder still has everything, but out of the history.
// Every operation comes in two forms: the sync one (`commitAll`), for the CLI tools and the tests, and the one the server uses
// (`commitAllAsync`), which runs git beside the server's thread and one call at a time per project (below).
import { execFile, execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { gitStoreFor, isDrivePath } from "./drive.mjs";

const ID = ["-c", "user.name=Moworks Studio", "-c", "user.email=studio@moworks.local", "-c", "core.autocrlf=false", "-c", "core.quotepath=false"];
// .thumbnails/ and .waveform-cache/ are HyperFrames Studio's caches
const IGNORE = [".moworks/cache/", ".moworks/rules/", ".moworks/library/", ".moworks/tasks.json", ".moworks/claude.json", ".moworks/notes.json", "renders/", ".hyperframes/",
  ".thumbnails/", ".waveform-cache/", "*.tmp", "*.part", "Thumbs.db", "desktop.ini", "sources/", "assets/5_design/",
  // the design files at 1_design's top level stay out of git; its images/ and fonts/ are the film's own files
  "assets/1_design/*", "!assets/1_design/images/", "!assets/1_design/fonts/",
  ".moworks/qc/", ".moworks/scan/", "audio/music-options/"];          // made again on demand: QC sheets, the files scan, the music options to listen to
export const LARGE_BYTES = 20 * 1024 * 1024;
const LARGE_HEAD = "# over 20 MB: kept in the project folder, not in the history";
const escapeIgnore = (p) => "/" + p.replace(/([\\*?[\]!#])/g, "\\$1").replace(/ $/, "\\ ");

/** New files over 20 MB go into .gitignore before they are committed. Returns the paths added. `listed`: git's list of new files, when
 *  the caller read it already. */
export function ignoreLarge(dir, listed = null) {
  let out = listed ?? "";
  if (listed == null) { try { out = git(dir, ["ls-files", "--others", "--exclude-standard", "-z"]); } catch { return []; } }
  const big = out.split("\0").filter(Boolean).filter((p) => { try { return statSync(join(dir, p)).size > LARGE_BYTES; } catch { return false; } });
  if (!big.length) return [];
  const gi = join(dir, ".gitignore");
  let have = existsSync(gi) ? readFileSync(gi, "utf8") : "";
  if (have && !have.endsWith("\n")) have += "\n";
  if (!have.includes(LARGE_HEAD)) have += LARGE_HEAD + "\n";
  writeFileSync(gi, have + big.map(escapeIgnore).join("\n") + "\n");
  return big;
}

function git(dir, args, opts = {}) {
  return execFileSync("git", [...ID, ...args], { cwd: dir, encoding: "utf8", windowsHide: true, maxBuffer: 64 * 1024 * 1024, ...opts }).trim();
}
// ---- the same without holding the server's thread (T26-3: the Editor's opening waited 138 s behind its git calls on a loaded machine;
// T22-5: about 40 git calls on the server's requests and jobs, 0.1-0.7 s each, held every other request). execFile keeps git's stderr
// to itself, so the sync form's `stdio` is not needed.
const gitAsync = (dir, args) => new Promise((ok, no) => execFile("git", [...ID, ...args], { cwd: dir, encoding: "utf8", windowsHide: true, maxBuffer: 64 * 1024 * 1024 },
  (e, out) => (e ? no(e) : ok(String(out ?? "").trim()))));

// Each operation is written once, as the git calls it makes: a generator yields each call (its arguments, or { args, opts }) and gets
// its output back, or its error thrown in at the yield. runSync runs the calls at once; runAsync runs them off the server's thread.
const callOf = (v) => (Array.isArray(v) ? { args: v, opts: {} } : { args: v.args, opts: v.opts ?? {} });
function runSync(dir, op) {
  let step = op.next();
  while (!step.done) {
    const { args, opts } = callOf(step.value);
    let out, failed = false, error;
    try { out = git(dir, args, opts); } catch (e) { failed = true; error = e; }
    step = failed ? op.throw(error) : op.next(out);
  }
  return step.value;
}
async function runAsync(dir, op) {
  let step = op.next();
  while (!step.done) {
    const { args } = callOf(step.value);
    let out, failed = false, error;
    try { out = await gitAsync(dir, args); } catch (e) { failed = true; error = e; }
    step = failed ? op.throw(error) : op.next(out);
  }
  return step.value;
}

// One project's git runs one operation at a time, in the order the server asked for them: a small promise queue per repository, so two
// requests never run git in one repository at once (git's index.lock) and commits keep their order. Projects run side by side.
const queues = new Map();
const keyOf = (dir) => { const k = resolve(String(dir)); return process.platform === "win32" ? k.toLowerCase() : k; };
/** fn() run after every operation already asked for in this project's repository, before any asked for after it; resolves its result.
 *  fn never awaits an …Async of the same project (it would wait for itself). */
export function inRepo(dir, fn) {
  const k = keyOf(dir), before = queues.get(k) ?? Promise.resolve();
  const run = before.then(() => fn());
  const tail = run.then(() => {}, () => {});
  queues.set(k, tail);
  tail.then(() => { if (queues.get(k) === tail) queues.delete(k); });
  return run;
}
/** Resolves once no project's git runs or waits (the server's Exit lets a commit it asked for finish). */
export async function settled() { while (queues.size) await Promise.all([...queues.values()]); }
/** The sync form and the queued async form of an operation. A read (read: true) asked again while the same read waits in the queue
 *  shares it (the Editor polls the pipeline, sometimes from two windows: the queue never fills with copies of one question). */
const pending = new Map();
const forms = (op, { read = false } = {}) => [(dir, ...a) => runSync(dir, op(dir, ...a)), (dir, ...a) => {
  if (!read) return inRepo(dir, () => runAsync(dir, op(dir, ...a)));
  const k = `${keyOf(dir)}|${op.name}|${JSON.stringify(a)}`;
  if (pending.has(k)) return pending.get(k);
  const p = inRepo(dir, () => { pending.delete(k); return runAsync(dir, op(dir, ...a)); });
  pending.set(k, p);
  return p;
}];

function* headOp() { try { return yield ["rev-parse", "--verify", "-q", "HEAD"]; } catch { return null; } }
function* dirtyOp() { return (yield ["status", "--porcelain"]).length > 0; }
function* commitAllOp(dir, message) {
  let listed = "";
  try { listed = yield ["ls-files", "--others", "--exclude-standard", "-z"]; } catch { /* none listed */ }
  if (listed) ignoreLarge(dir, listed);
  yield ["add", "-A"];
  if (!(yield ["status", "--porcelain"]).length) return yield* headOp(dir);
  yield ["commit", "-q", "-m", message];
  return yield* headOp(dir);
}
function* ensureRepoOp(dir) {
  if (!existsSync(join(dir, ".git"))) {
    // a project on Google Drive keeps its history on this PC (drive.mjs); the folder gets a `.git` file pointing there
    if (isDrivePath(dir)) { const store = gitStoreFor(dir); mkdirSync(join(store, ".."), { recursive: true }); yield ["init", "-q", "-b", "main", `--separate-git-dir=${store}`]; }
    else yield ["init", "-q", "-b", "main"];
  }
  const gi = join(dir, ".gitignore");
  const have = existsSync(gi) ? readFileSync(gi, "utf8") : "";
  const missing = IGNORE.filter((l) => !have.split(/\r?\n/).includes(l));
  if (missing.length) writeFileSync(gi, (have && !have.endsWith("\n") ? have + "\n" : have) + missing.join("\n") + "\n");
  if (!(yield* headOp(dir))) yield* commitAllOp(dir, "Project start");
}
function* saveOp(dir, message) { yield* ensureRepoOp(dir); return yield* commitAllOp(dir, message); }
function* changedFilesOp(dir, from, to) {
  if (!from || !to || from === to) return [];
  // lines added / removed per file (null for a binary file), as the Claude panel shows them ("models.js +88 −1")
  const counts = new Map();
  for (const l of (yield ["diff", "--numstat", "-M", from, to]).split(/\r?\n/).filter(Boolean)) {
    const [a, r, ...p] = l.split("\t");
    const path = p.join("\t").replace(/^.*\{.* => (.*)\}.*$/, (m) => m.replace(/\{.* => (.*?)\}/, "$1")).replace(/^.* => /, "");
    counts.set(path, { added: a === "-" ? null : Number(a), removed: r === "-" ? null : Number(r) });
  }
  return (yield ["diff", "--name-status", "-M", from, to]).split(/\r?\n/).filter(Boolean).map((l) => {
    const [st, ...rest] = l.split("\t");
    const path = rest.at(-1);
    return { status: st[0], path, ...(counts.get(path) ?? { added: null, removed: null }) };
  });
}
function* revertOp(dir, rev) {
  if (yield* dirtyOp(dir)) yield* commitAllOp(dir, "Changes before revert");
  try { yield ["revert", "--no-edit", rev]; }
  catch {
    try { yield ["revert", "--abort"]; } catch { /* nothing to abort */ }
    throw Object.assign(new Error("This change cannot be undone automatically because later changes touched the same lines. Undo the later changes first."), { code: "CONFLICT" });
  }
  return yield* headOp(dir);
}
function* lastWorkChangeOp(dir, path) {
  try {
    if ((yield ["status", "--porcelain", "--", path]).length) return Date.now();
    const out = yield ["log", "-1", "--format=%ct", "--invert-grep", "-F", `--grep=${STUDIO_IDS}`, "--", path];
    return out ? Number(out) * 1000 : null;
  } catch { return null; }
}
function* lastWorkRevOp() {
  try { return (yield ["log", "-1", "--format=%H", "--invert-grep", "-F", `--grep=${STUDIO_IDS}`, "--", "compositions", "index.html", "assets"]) || null; } catch { return null; }
}
function* changedSinceOp(dir, from) {
  try {
    const h = yield* headOp(dir);
    if (!from || !h) return true;
    if (from === h) return false;
    // Claude's notes and the step documents are not the film either (a NOTES.md line would make the checks stale)
    return (yield ["log", "--format=%H", "--invert-grep", "-F", `--grep=${STUDIO_IDS}`, `--grep=${SOUND_MIX}`, `${from}..${h}`, "--", ".", ":(exclude).moworks",
      ":(exclude)NOTES.md", ":(exclude)QC-REVIEW.md", ":(exclude)QC-REVIEW.json", ":(exclude)ASSETS.md", ":(exclude)BRIEF.md"]).length > 0;
  } catch { return true; }
}
function* restoreTreeOp(dir, rev, message) {
  if (yield* dirtyOp(dir)) yield* commitAllOp(dir, "Changes before opening a version");
  const added = (yield ["diff", "--name-only", "--diff-filter=A", rev, "HEAD", "--", ".", ":(exclude).moworks"]).split(/\r?\n/).filter(Boolean);
  for (const f of added) yield ["rm", "-q", "--", f];
  yield ["checkout", rev, "--", ".", ":(exclude).moworks"];
  return yield* commitAllOp(dir, message);
}
function* logOp(dir, n = 50) {
  if (!(yield* headOp(dir))) return [];
  return (yield ["log", `-n${n}`, "--format=%H%x1f%cI%x1f%s"]).split(/\r?\n/).filter(Boolean).map((l) => { const [rev, at, message] = l.split("\x1f"); return { rev, at, message }; });
}
function* fileAtOp(dir, rev, path) {
  try { return yield { args: ["show", `${rev}:${path}`], opts: { stdio: ["ignore", "pipe", "ignore"] } }; } catch { return null; }
}

/** Make sure the project has its own repository with the ignore rules; first commit if it has none. */
export const [ensureRepo, ensureRepoAsync] = forms(ensureRepoOp);
/** The current revision, or null before the first commit. */
export const [head, headAsync] = forms(headOp, { read: true });
export const [isDirty, isDirtyAsync] = forms(dirtyOp, { read: true });
/** Commit everything that changed; returns the new revision, or the current one when nothing changed. */
export const [commitAll, commitAllAsync] = forms(commitAllOp);
/** ensureRepo, then commitAll, in one turn of the project's queue: the server's usual "record this change". Returns the revision. */
export const [save, saveAsync] = forms(saveOp);
/** Files changed between two revisions: [{ status: "A"|"M"|"D"|"R", path }]. */
export const [changedFiles, changedFilesAsync] = forms(changedFilesOp, { read: true });
/** Undo one revision with a new revision (history is kept). Returns the new revision, or throws { code: "CONFLICT" }. */
export const [revert, revertAsync] = forms(revertOp);

/** The revision HyperFrames Studio makes when it opens a film (it writes its element ids, nothing the film shows changes). */
export const STUDIO_IDS = "Opened in HyperFrames Studio (element ids)";
/** The revisions of the Final Mix (music, sound effects, levels): sound only, so the picture's checks still hold. */
export const SOUND_MIX = "Final Mix (sound only)";

/** When the film's own work last changed under a path (ms), leaving out Studio's element-id revisions; uncommitted changes count now. */
export const [lastWorkChange, lastWorkChangeAsync] = forms(lastWorkChangeOp, { read: true });
/** The last revision that changed the film's pictures (compositions, index.html, assets), leaving out Studio's element-id revisions. */
export const [lastWorkRev, lastWorkRevAsync] = forms(lastWorkRevOp, { read: true });
/** Did the film change since this revision? Studio's element-id revisions, the Final Mix's sound-only revisions and the app's own records
 *  (.moworks/) do not count, so a check stays valid when Studio opens the film, the sound is mixed or the app writes its notes. */
export const [changedSince, changedSinceAsync] = forms(changedSinceOp, { read: true });
/** Put the project's files back as they were at a revision (a named version), as a new revision: what was there is
 *  committed first, the app's own records (.moworks/) are left as they are, files added since are removed. Returns the new revision. */
export const [restoreTree, restoreTreeAsync] = forms(restoreTreeOp);
/** The last `n` revisions: [{ rev, at, message }], newest first. */
export const [log, logAsync] = forms(logOp, { read: true });
/** A file as it was at a revision, or null (e.g. the approved storyboard as it was before a step's task). */
export const [fileAt, fileAtAsync] = forms(fileAtOp, { read: true });
