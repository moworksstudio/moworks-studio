// Cuts against the shot table (owner 04/11/2026 #951, the cut measure of the source skills' own qc.mjs, the only one of its measures the app takes):
// the hard cuts of the film's render, found the way each source skill's qc finds them, against the cuts the film's own code declares:
//   2D Explainer        ffmpeg scdet (threshold 12); the entries of story/story.js's `const CUT = {…}` (or CUTS = […]), counted as the source skill's qc counts
//   3D Cartoon          select gt(scene, 0.25); a hard cut at every shot change: SHOTS in src/videos/film/shots.ts, less one
//   Stickman Explainer  select gt(scene, 0.25); a cut on every spoken line: the shot table S in src/videos/film/film.js (its keys, less `open`)
//   Inner Voice Short   select gt(scene, 0.25); none: every change is a fade
// Read on the film's own render (the pre-render, .moworks/cache/proxy, else the last export) only while it is the film as it is now; nothing before there is one.
// A warning in Tech checks (G-CUTS), never a block: a soft change may not register, and a jump that is not a cut is worth a look.
import { execFile } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { ffmpegExe } from "../library/preview-media.mjs";
import { pageStyle } from "./index.mjs";

export const CUT_STYLES = Object.freeze({
  "explainer-2d": { find: "scdet", table: "story/story.js", name: "CUT", what: "the cuts story/story.js declares (CUT)" },
  "cartoon-3d": { find: "scene", table: "src/videos/film/shots.ts", name: "SHOTS", less: 1, what: "the shot changes of SHOTS in shots.ts" },
  "stickman-explainer": { find: "scene", table: "src/videos/film/film.js", name: "S", keys: true, what: "the shots of the shot table S in film.js" },
  "inner-voice-short": { find: "scene", none: true, what: "none: every change in this style is a fade" },
});

/** The entries of `<name> = {…}` or `<name> = […]` in a source (the 2D source skill's qc.mjs declaredCuts, as shipped, for any name); null when there is
 *  none. keys: the keys of an object instead ({ open: 0, title: 4 } → ["open", "title"]). */
export function declaredEntries(src, name, { keys = false } = {}) {
  const m = new RegExp(`\\b${name}S?\\s*(?::[^=]+)?=\\s*([{[])`).exec(src);
  if (!m) return null;
  let depth = 1, entries = 0, token = false, str = null, key = "";
  const names = [];
  for (let i = m.index + m[0].length; i < src.length && depth > 0; i++) {
    const c = src[i];
    if (str) { if (c === "\\") i++; else if (c === str) str = null; continue; }
    if (c === "/" && src[i + 1] === "/") { i = src.indexOf("\n", i); if (i < 0) break; continue; }
    if (c === "/" && src[i + 1] === "*") { i = src.indexOf("*/", i) + 1; continue; }
    if (`"'\``.includes(c)) { str = c; token = true; }
    else if ("{[(".includes(c)) { depth++; token = true; }
    else if ("}])".includes(c)) depth--;
    else if (depth === 1 && c === ",") { if (token) entries++; token = false; key = ""; }
    else if (depth === 1 && c === ":" && keys && key) { names.push(key.trim()); key = "\0"; }
    else if (!/\s/.test(c)) { token = true; if (keys && depth === 1 && key !== "\0") key += c; }
  }
  return keys ? names : entries + (token ? 1 : 0);
}

/** The hard cuts of a video, s: the source skill's own way of finding them. */
export function hardCuts(file, find = "scene") {
  const vf = find === "scdet" ? "scdet=threshold=12" : "select='gt(scene,0.25)',showinfo";
  return new Promise((done, fail) => execFile(ffmpegExe(), ["-hide_banner", "-nostats", "-i", file, "-map", "0:v:0", "-vf", vf, "-an", "-f", "null", "-"],
    { windowsHide: true, maxBuffer: 64 << 20, timeout: 10 * 60000 }, (err, _out, log) => {
      if (err) return fail(new Error(String(log ?? "").trim().split(/\r?\n/).pop() || err.message));
      const re = find === "scdet" ? /lavfi\.scd\.time:\s*([\d.]+)/g : /pts_time:([\d.]+)/g;
      done([...String(log).matchAll(re)].map((m) => Math.round(Number(m[1]) * 100) / 100));
    }));
}

/** How many cuts the film's own table declares: { declared, table } or { declared: null } when it has none to compare. */
export function declaredCuts(projectDir, styleId) {
  const s = CUT_STYLES[styleId];
  if (!s) return { declared: null };
  if (s.none) return { declared: 0, table: null };
  let src = ""; try { src = readFileSync(join(projectDir, ...s.table.split("/")), "utf8"); } catch { return { declared: null }; }
  const got = declaredEntries(src, s.name, { keys: !!s.keys });
  if (got == null) return { declared: null };
  const n = s.keys ? got.filter((k) => k !== "open").length : Math.max(0, got - (s.less ?? 0));
  return { declared: n, table: s.table };
}

/** The film's render while it is the film as it is now: the pre-render, else the last export (the export's render did not refresh the
 *  pre-render, and G-CUTS never showed for Test 38, T38-7), or null. */
export async function freshRender(projectDir, { picture = false } = {}) {
  const { filmHash, filmParts } = await import("../project-service/film-hash.mjs");          // late: the render's own module, only when there is a render
  const read = (f) => { try { return JSON.parse(readFileSync(join(projectDir, ...f), "utf8")); } catch { return null; } };
  const st = read([".moworks", "cache", "proxy", "proxy.json"]), ex = read([".moworks", "project.json"])?.lastExport ?? null;
  for (const r of [st, ex ? { file: ex.file, hash: ex.hash, fps: Number(ex.fps) || null } : null]) {
    if (!r?.file || !r.hash) continue;
    const file = join(projectDir, ...r.file.split("/"));
    if (!existsSync(file)) continue;
    if (filmHash(projectDir, r.fps ?? null) === r.hash) return file;
    // picture: a check that reads the picture only (G-FLICKER, G-CUTS) takes a render whose picture is the film's: the sound levelled
    // again since (the checks level the tracks first) made it wait for a preview it had (T40-17)
    if (picture && r.picture && filmParts(projectDir, r.fps ?? null).picture === r.picture) return file;
  }
  return null;
}

/** { ran: false } for any other style, or before there is a render of the film as it is; else { ran: true, cuts, declared, table, match } or
 *  { ran: true, error }. file: a render to read instead (tests). */
export async function cutCheck(projectDir, { file = null } = {}) {
  let html = ""; try { html = readFileSync(join(projectDir, "index.html"), "utf8"); } catch { return { ran: false }; }
  const style = pageStyle(html), s = CUT_STYLES[style];
  if (!s) return { ran: false };
  const video = file ?? await freshRender(projectDir, { picture: true }).catch(() => null);
  if (!video) return { ran: false };
  let cuts;
  try { cuts = await hardCuts(video, s.find); } catch (e) { return { ran: true, style, error: e.message }; }
  const { declared, table = null } = declaredCuts(projectDir, style);
  return { ran: true, style, cuts, declared, table, what: s.what, match: declared == null ? null : cuts.length === declared };
}

/** Tech checks: G-CUTS, a warning; null when nothing was measured. */
export async function gateCuts(projectDir, opts = {}) {
  const r = await cutCheck(projectDir, opts);
  if (!r.ran) return null;
  if (r.error) return { id: "G-CUTS", blocking: false, pass: false, notChecked: true, findings: [{ severity: "warning", code: "not_checked", message: `The cuts could not be read from the render: ${r.error}` }] };
  if (r.match !== false) return { id: "G-CUTS", blocking: false, pass: true, findings: [] };
  const at = r.cuts.length ? ` at ${r.cuts.join(", ")} s` : "";
  return { id: "G-CUTS", blocking: false, pass: false, warnings: 1, findings: [{ severity: "warning", code: "cuts_differ",
    message: `${r.cuts.length} hard cut${r.cuts.length === 1 ? "" : "s"} in the render${at}, ${r.table ? `${r.declared} in ${r.what}` : `where there should be ${r.what}`}. A soft change (a fade, a dip to black) may not register; a jump that is not a cut is worth a look at those times.` }] };
}
