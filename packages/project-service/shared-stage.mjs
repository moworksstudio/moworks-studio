// The app's read-only sources a film's Claude reads (the style's rules, the anidoodle and What If engines) are made once per version
// in runtime/stage/ and linked into each film's .moworks/ (a directory junction: no files of its own), instead of a copy in every film
// (13,000 files over 47 films on 30/10/2026). Claude reads them through the link: the stage is one of its working directories
// (--add-dir), where edits are refused (agent/index.mjs claudeArgs). A drive that takes no junctions (Google Drive for desktop) gets a
// copy, as before. Removing a link (rmSync) removes the link only, never the stage behind it.
import { cpSync, existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, readlinkSync, renameSync, rmSync, symlinkSync, utimesSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { randomBytes } from "node:crypto";

/** runtime/stage of this install (MW_STAGE_DIR: tests). */
export const stageRoot = (root) => resolve(process.env.MW_STAGE_DIR ?? join(root, "runtime", "stage"));
/** A folder as Claude Code's permission rules write it: //d/Moworks Studio/app/runtime/stage (Windows' path in POSIX form, from the root). */
export const rulePath = (p) => `/${String(p).replace(/\\/g, "/").replace(/^([A-Za-z]):/, (_m, d) => `/${d.toLowerCase()}`)}`;
/** A shared folder: runtime/stage/<kind>/<name> (name carries the version: anidoodle@<commit>, a style's rules and their hash). */
export const sharedDir = (root, kind, name) => join(stageRoot(root), kind, String(name).replace(/[^A-Za-z0-9@._-]+/g, "-"));

/** The shared folder, made by fill(folder) when it is not there yet: filled in a temporary folder and renamed when complete, so a half-made
 *  stage is never read; two films making it at once keep the first. One that fails its check (`ok(folder)`: a file deleted through a
 *  film's link reaches the stage itself) is made again. Touched when used (housekeeping removes the ones unused for long). */
export function ensureShared(dir, fill, ok = null) {
  if (existsSync(dir) && ok && !ok(dir)) rmSync(dir, { recursive: true, force: true });
  if (!existsSync(dir)) {
    const tmp = `${dir}.tmp-${process.pid}-${randomBytes(3).toString("hex")}`;
    mkdirSync(tmp, { recursive: true });
    try { fill(tmp); renameTried(tmp, dir); }
    catch (e) { rmSync(tmp, { recursive: true, force: true }); if (!existsSync(dir)) throw e; }
  }
  try { const t = new Date(); utimesSync(dir, t, t); } catch { /* read-only: still usable */ }
  return dir;
}

// a folder just filled with thousands of files is often held for a moment by Windows' indexer or Defender (EPERM, EBUSY on rename)
function renameTried(from, to, tries = 8) {
  for (let i = 1; ; i++) {
    try { renameSync(from, to); return; }
    catch (e) { if (existsSync(to) || i >= tries || !/^(EPERM|EBUSY|EACCES)$/.test(e.code)) throw e; Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 150 * i); }
  }
}

const norm = (p) => { const r = resolve(String(p).replace(/^\\\\\?\\/, "")).replace(/[\\/]+$/, ""); return process.platform === "win32" ? r.toLowerCase() : r; };
/** Where a link points, or null when the path is no link (a folder, a copy, nothing). */
export function linkTarget(p) {
  try { return lstatSync(p).isSymbolicLink() ? resolve(dirname(p), readlinkSync(p)) : null; } catch { return null; }
}
/** Is dest the link to shared already? */
export const linkedTo = (dest, shared) => { const t = linkTarget(dest); return !!t && norm(t) === norm(shared); };
// a copy made because the drive takes no link names the shared folder it was copied from; a copy without it (a film staged before the
// shared stage) is replaced by the link
const COPY_MARK = ".stage-copy";
/** Is dest the shared folder already: its link, or the copy made of it where no link can be made? */
export function upToDate(dest, shared) {
  if (linkedTo(dest, shared)) return true;
  try { return !linkTarget(dest) && readFileSync(join(dest, COPY_MARK), "utf8").trim() === basename(shared); } catch { return false; }
}

/** dest made the link to the shared folder: "same" (it was), "linked", or "copied" (this drive takes no junction: a copy, as before). */
export function linkOrCopy(dest, shared) {
  if (upToDate(dest, shared)) return "same";
  rmSync(dest, { recursive: true, force: true });
  mkdirSync(dirname(dest), { recursive: true });
  try { symlinkSync(shared, dest, "junction"); return "linked"; }
  catch { cpSync(shared, dest, { recursive: true }); writeFileSync(join(dest, COPY_MARK), `${basename(shared)}\n`); return "copied"; }
}

/** Shared folders not used for `days` (no film task touched them): removed (housekeeping). Returns their names. */
export function pruneStage(root, { days = 30, now = Date.now() } = {}) {
  const out = [];
  for (const kind of (() => { try { return readdirSync(stageRoot(root)); } catch { return []; } })()) {
    const base = join(stageRoot(root), kind);
    let names = [];
    try { names = readdirSync(base); } catch { continue; }
    for (const n of names) {
      const p = join(base, n);
      let old = false;
      // a half-made stage left by a stopped app goes after an hour (one being made right now is younger)
      try { const age = now - lstatSync(p).mtimeMs; old = age > days * 864e5 || (/\.tmp-\d+-/.test(n) && age > 3600e3); } catch { continue; }
      if (old) { try { rmSync(p, { recursive: true, force: true }); out.push(`${kind}/${n}`); } catch { /* in use */ } }
    }
  }
  return out;
}
