// Archives the user imports (.zip, .rar, .7z): unpacked with Windows' own tar.exe (bsdtar reads zip, 7z and RAR 4 / 5), so the files
// in them go through the normal import (copied by kind, the same naming rules; design files and files over 20 MB stay out of git like
// any import). Test 25: a .rar of fonts and a .zip of logos stayed archives, and the PSD in the zip was never read.
// Guarded: an archive whose entries would land outside its folder (zip-slip: "..", an absolute path, a drive) is not opened and a link
// in one is never followed; one of more than MAX_UNPACK_FILES files or MAX_UNPACK_BYTES unpacked is not opened (a zip bomb): its
// listing is checked first, and tar is stopped when what it writes goes past either. It unpacks into a folder of its own under the
// system's temp folder, which the caller removes (cleanup) once the files are copied into the project.
import { spawn } from "node:child_process";
import { lstatSync, mkdtempSync, readdirSync, realpathSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative, sep } from "node:path";

export const ARCHIVE = /\.(zip|rar|7z)$/i;
export const MAX_UNPACK_BYTES = 4 * 1024 ** 3;          // as one imported file (MAX_ASSET_BYTES)
export const MAX_UNPACK_FILES = 2000;
const TIMEOUT_MS = 4 * 60 * 1000;
/** Windows' own tar (bsdtar, in System32 since Windows 10 1803). */
export const tarPath = () => join(process.env.SystemRoot ?? process.env.windir ?? "C:\\Windows", "System32", "tar.exe");
// left out without a word: a Mac's resource forks and folder files, Windows' own
const JUNK = /(^|\/)(__MACOSX\/|\.DS_Store$|\._[^/]+$|Thumbs\.db$|desktop\.ini$)/i;
/** Programs are not film material: left out of an archive's files, and said so (the picker does the same for loose files). */
export const PROGRAM = /\.(exe|msi|bat|cmd|com|scr|dll|ps1|vbs|lnk|jar|apk|dmg)$/i;

/** An entry name that would land outside the folder it is unpacked into: "..", a path from the root, a drive. */
export const unsafeEntry = (name) => {
  const n = String(name ?? "").replace(/\\/g, "/");
  return n.startsWith("/") || /^[a-z]:/i.test(n) || n.split("/").includes("..");
};

/** Run tar with its window hidden: { code, stdout, stderr, stopped } (stopped: the watch's reason, or "timeout"). watch() is asked every
 *  half second while tar runs; a reason it returns stops tar. */
function runTar(args, { timeoutMs = TIMEOUT_MS, watch = null, tar = tarPath() } = {}) {
  return new Promise((done) => {
    let out = "", err = "", stopped = null;
    let c;
    try { c = spawn(tar, args, { windowsHide: true, stdio: ["ignore", "pipe", "pipe"] }); } catch (e) { done({ code: -1, stdout: "", stderr: String(e.message ?? e), stopped: null }); return; }
    const stop = (why) => { if (stopped) return; stopped = why; try { c.kill(); } catch { /* gone */ } };
    const t = setTimeout(() => stop("timeout"), timeoutMs);
    const w = watch ? setInterval(() => { const why = watch(); if (why) stop(why); }, 500) : null;
    c.stdout.on("data", (b) => { if (out.length < 8 << 20) out += b; });
    c.stderr.on("data", (b) => { if (err.length < 64 << 10) err += b; });
    const end = (code) => { clearTimeout(t); if (w) clearInterval(w); done({ code, stdout: out, stderr: err, stopped }); };
    c.on("error", (e) => { err += String(e.message ?? e); end(-1); });
    c.on("close", (code) => end(code ?? -1));
  });
}

/** The archive's entries as tar lists them: { ok, entries: [{ name, dir, size }] }. The names come from `tar -tf` (one a line), the
 *  sizes from `tar -tvf` (its fifth column), line by line. */
export async function listArchive(file, opts = {}) {
  const names = await runTar(["-tf", file], opts);
  if (names.code !== 0 || names.stopped) return { ok: false, error: names.stderr.trim() || names.stopped || "tar could not read it" };
  const verbose = await runTar(["-tvf", file], opts);
  const vs = verbose.code === 0 ? verbose.stdout.split(/\r?\n/).filter(Boolean) : [];
  const entries = names.stdout.split(/\r?\n/).filter(Boolean).map((name, i) => {
    const v = (vs[i] ?? "").trim().split(/\s+/), size = Number(v[4]);
    return { name, dir: /[\\/]$/.test(name) || v[0]?.[0] === "d", size: Number.isFinite(size) ? size : 0 };
  });
  return { ok: true, entries };
}

/** Every file under `dir` (links are not followed, and not files): [{ abs, rel, size }], rel with "/". */
function filesUnder(dir) {
  const out = [];
  const walk = (d) => {
    let names = []; try { names = readdirSync(d); } catch { return; }
    for (const n of names) {
      const f = join(d, n);
      let s; try { s = lstatSync(f); } catch { continue; }
      if (s.isSymbolicLink()) continue;
      if (s.isDirectory()) walk(f); else if (s.isFile()) out.push({ abs: f, rel: relative(dir, f).split(sep).join("/"), size: s.size });
    }
  };
  walk(dir);
  return out;
}

/** Unpack an archive into a folder of its own. { ok: true, dir, files: [{ abs, rel, name, size }], skipped: [names], cleanup } or
 *  { ok: false, reason } with reason "unreadable" | "unsafe" | "empty" | "too-many" | "too-large" | "timeout" (nothing is left on disk).
 *  files: the regular files inside the folder, without a Mac's or Windows' own files; skipped: the programs left out. */
export async function unpackArchive(file, { maxBytes = MAX_UNPACK_BYTES, maxFiles = MAX_UNPACK_FILES, timeoutMs = TIMEOUT_MS, tar = tarPath() } = {}) {
  const list = await listArchive(file, { timeoutMs, tar });
  if (!list.ok) return { ok: false, reason: "unreadable", detail: list.error };
  if (list.entries.some((e) => unsafeEntry(e.name))) return { ok: false, reason: "unsafe" };
  const listed = list.entries.filter((e) => !e.dir);
  if (!listed.length) return { ok: false, reason: "empty" };
  if (listed.length > maxFiles) return { ok: false, reason: "too-many", count: listed.length };
  if (listed.reduce((n, e) => n + e.size, 0) > maxBytes) return { ok: false, reason: "too-large" };
  const dir = mkdtempSync(join(tmpdir(), "mw-unpack-"));
  const cleanup = () => rmSync(dir, { recursive: true, force: true });
  // what tar writes is counted while it runs: a listing can lie about sizes
  const watch = () => { const fs = filesUnder(dir); return fs.length > maxFiles ? "too-many" : fs.reduce((n, f) => n + f.size, 0) > maxBytes ? "too-large" : null; };
  const r = await runTar(["-xf", file, "-C", dir], { timeoutMs, watch, tar });
  if (r.stopped || r.code !== 0) { cleanup(); return { ok: false, reason: r.stopped ?? "unreadable", detail: r.stderr.trim() }; }
  const real = realpathSync(dir);
  const inside = (f) => { try { const p = realpathSync(f); return p === real || p.startsWith(real + sep); } catch { return false; } };
  const all = filesUnder(dir).filter((f) => inside(f.abs) && !JUNK.test(f.rel));
  if (all.length > maxFiles || all.reduce((n, f) => n + f.size, 0) > maxBytes) { cleanup(); return { ok: false, reason: all.length > maxFiles ? "too-many" : "too-large" }; }
  const skipped = all.filter((f) => PROGRAM.test(f.rel)).map((f) => f.rel.split("/").pop());
  const files = all.filter((f) => !PROGRAM.test(f.rel)).map((f) => ({ ...f, name: f.rel.split("/").pop() }));
  return { ok: true, dir, files, skipped, cleanup };
}

/** What the import result says about an archive that was not unpacked (its name, never a path). */
export function archiveMessage(name, reason) {
  switch (reason) {
    case "unsafe": return `Did not open ${name}: it has files that point outside it. Unpack it and add the files.`;
    case "too-many": return `Did not open ${name}: it has over ${MAX_UNPACK_FILES} files. Unpack it and add the files you need.`;
    case "too-large": return `Did not open ${name}: it is over ${Math.round(MAX_UNPACK_BYTES / 1024 ** 3)} GB unpacked. Unpack it and add the files you need.`;
    case "empty": return `${name} has no files to add.`;
    default: return `Could not open ${name}; unpack it and add the files.`;
  }
}
