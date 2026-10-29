// Project revisions (git): a local git repository inside each project folder records every change the app or
// Claude makes, so any change can be reviewed and reverted. Nothing is pushed anywhere. Generated files (posters, renders, HF snapshot
// output) are not tracked. The client's source files (sources/: PSD, PPTX, PDF, guidelines) and any file over 20 MB stay in the project
// folder, so a copied folder still has everything, but out of the history.
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
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

/** New files over 20 MB go into .gitignore before they are committed. Returns the paths added. */
export function ignoreLarge(dir) {
  let out = "";
  try { out = git(dir, ["ls-files", "--others", "--exclude-standard", "-z"]); } catch { return []; }
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

/** Make sure the project has its own repository with the ignore rules; first commit if it has none. */
export function ensureRepo(dir) {
  if (!existsSync(join(dir, ".git"))) {
    // a project on Google Drive keeps its history on this PC (drive.mjs); the folder gets a `.git` file pointing there
    if (isDrivePath(dir)) { const store = gitStoreFor(dir); mkdirSync(join(store, ".."), { recursive: true }); git(dir, ["init", "-q", "-b", "main", `--separate-git-dir=${store}`]); }
    else git(dir, ["init", "-q", "-b", "main"]);
  }
  const gi = join(dir, ".gitignore");
  const have = existsSync(gi) ? readFileSync(gi, "utf8") : "";
  const missing = IGNORE.filter((l) => !have.split(/\r?\n/).includes(l));
  if (missing.length) writeFileSync(gi, (have && !have.endsWith("\n") ? have + "\n" : have) + missing.join("\n") + "\n");
  if (!head(dir)) commitAll(dir, "Project start");
}

export function head(dir) {
  try { return git(dir, ["rev-parse", "--verify", "-q", "HEAD"]); } catch { return null; }
}

export function isDirty(dir) { return git(dir, ["status", "--porcelain"]).length > 0; }

/** Commit everything that changed; returns the new revision, or the current one when nothing changed. */
export function commitAll(dir, message) {
  ignoreLarge(dir);
  git(dir, ["add", "-A"]);
  if (!git(dir, ["status", "--porcelain"]).length) return head(dir);
  git(dir, ["commit", "-q", "-m", message]);
  return head(dir);
}

/** Files changed between two revisions: [{ status: "A"|"M"|"D"|"R", path }]. */
export function changedFiles(dir, from, to) {
  if (!from || !to || from === to) return [];
  // lines added / removed per file (null for a binary file), as the Claude panel shows them ("models.js +88 −1")
  const counts = new Map();
  for (const l of git(dir, ["diff", "--numstat", "-M", from, to]).split(/\r?\n/).filter(Boolean)) {
    const [a, r, ...p] = l.split("\t");
    const path = p.join("\t").replace(/^.*\{.* => (.*)\}.*$/, (m) => m.replace(/\{.* => (.*?)\}/, "$1")).replace(/^.* => /, "");
    counts.set(path, { added: a === "-" ? null : Number(a), removed: r === "-" ? null : Number(r) });
  }
  return git(dir, ["diff", "--name-status", "-M", from, to]).split(/\r?\n/).filter(Boolean).map((l) => {
    const [st, ...rest] = l.split("\t");
    const path = rest.at(-1);
    return { status: st[0], path, ...(counts.get(path) ?? { added: null, removed: null }) };
  });
}

/** Undo one revision with a new revision (history is kept). Returns the new revision, or throws { code: "CONFLICT" }. */
export function revert(dir, rev) {
  if (isDirty(dir)) commitAll(dir, "Changes before revert");
  try { git(dir, ["revert", "--no-edit", rev]); }
  catch (e) {
    try { git(dir, ["revert", "--abort"]); } catch { /* nothing to abort */ }
    throw Object.assign(new Error("This change cannot be undone automatically because later changes touched the same lines. Undo the later changes first."), { code: "CONFLICT" });
  }
  return head(dir);
}

/** The revision HyperFrames Studio makes when it opens a film (it writes its element ids, nothing the film shows changes). */
export const STUDIO_IDS = "Opened in HyperFrames Studio (element ids)";
/** The revisions of the Final Mix (music, sound effects, levels): sound only, so the picture's checks still hold. */
export const SOUND_MIX = "Final Mix (sound only)";

/** When the film's own work last changed under a path (ms), leaving out Studio's element-id revisions; uncommitted changes count now. */
export function lastWorkChange(dir, path) {
  try {
    if (git(dir, ["status", "--porcelain", "--", path]).length) return Date.now();
    const out = git(dir, ["log", "-1", "--format=%ct", "--invert-grep", "-F", `--grep=${STUDIO_IDS}`, "--", path]);
    return out ? Number(out) * 1000 : null;
  } catch { return null; }
}

/** The last revision that changed the film's pictures (compositions, index.html, assets), leaving out Studio's element-id revisions. */
export function lastWorkRev(dir) {
  try { return git(dir, ["log", "-1", "--format=%H", "--invert-grep", "-F", `--grep=${STUDIO_IDS}`, "--", "compositions", "index.html", "assets"]) || null; } catch { return null; }
}

/** Did the film change since this revision? Studio's element-id revisions, the Final Mix's sound-only revisions and the app's own records
 *  (.moworks/) do not count, so a check stays valid when Studio opens the film, the sound is mixed or the app writes its notes. */
export function changedSince(dir, from) {
  try {
    const h = head(dir);
    if (!from || !h) return true;
    if (from === h) return false;
    // Claude's notes and the step documents are not the film either (a NOTES.md line would make the checks stale)
    return git(dir, ["log", "--format=%H", "--invert-grep", "-F", `--grep=${STUDIO_IDS}`, `--grep=${SOUND_MIX}`, `${from}..${h}`, "--", ".", ":(exclude).moworks",
      ":(exclude)NOTES.md", ":(exclude)QC-REVIEW.md", ":(exclude)QC-REVIEW.json", ":(exclude)ASSETS.md", ":(exclude)BRIEF.md"]).length > 0;
  } catch { return true; }
}

/** Put the project's files back as they were at a revision (a named version), as a new revision: what was there is
 *  committed first, the app's own records (.moworks/) are left as they are, files added since are removed. Returns the new revision. */
export function restoreTree(dir, rev, message) {
  if (isDirty(dir)) commitAll(dir, "Changes before opening a version");
  const added = git(dir, ["diff", "--name-only", "--diff-filter=A", rev, "HEAD", "--", ".", ":(exclude).moworks"]).split(/\r?\n/).filter(Boolean);
  for (const f of added) git(dir, ["rm", "-q", "--", f]);
  git(dir, ["checkout", rev, "--", ".", ":(exclude).moworks"]);
  return commitAll(dir, message);
}

export function log(dir, n = 50) {
  if (!head(dir)) return [];
  return git(dir, ["log", `-n${n}`, "--format=%H%x1f%cI%x1f%s"]).split(/\r?\n/).filter(Boolean).map((l) => { const [rev, at, message] = l.split("\x1f"); return { rev, at, message }; });
}

/** A file as it was at a revision, or null (e.g. the approved storyboard as it was before a step's task). */
export function fileAt(dir, rev, path) {
  try { return git(dir, ["show", `${rev}:${path}`], { stdio: ["ignore", "pipe", "ignore"] }); } catch { return null; }
}
