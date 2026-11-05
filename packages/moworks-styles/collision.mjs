// The 3D Cartoon's collision check (owner 04/11/2026 #931, #945): the source skill's own qa.mjs, run by the app. The check itself is the source skill's code as
// shipped (src/kit/collision.tsx: collisionReport steps through EVERY frame, poses the world exactly as the render does and tests every
// character's body against solid furniture, box and cylinder meshes, and against each other). The film's Video.tsx exports its twin
// (FilmCheck, from the source skill's template); the app bundles the film as finalize does (R-SKILL), opens its page with ?skill-check=1 in its own hidden
// browser (hf-qa/filmPage.mjs, closed after) so the host draws the twin, and reads the lines the source skill prints ("COLLISION none", or one line per
// problem: who ↔ what | frames | max depth in metres). Only a page that runs the 3D Cartoon (data-skill="cartoon-3d"); nothing for any other film.
// Used by Claude's collision_check tool, the Review (qc_sheets) and Tech checks (G-COLLISION, a warning).
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { APP_ROOT } from "../version-manager/index.mjs";
import { openFilmPage } from "../hf-qa/filmPage.mjs";
import { pageStyle, placeStyle } from "./index.mjs";

export const COLLISION_STYLE = "cartoon-3d";
/** The time a check may take: a minute, and a little more for each frame the source skill steps through (it poses the world once per frame). */
export const collisionLimitMs = (frames) => Math.max(120000, Math.min(15 * 60000, 60000 + (frames || 0) * 120));

/** "COLLISION Mika ↔ furniture @(…) size(…) | frames 12-40,90 | max 0.123" → { who, what, frames: [[from, to]…], depth }; null for any other line. */
export function parseLine(line) {
  const m = /^COLLISION (.+?) ↔ (.+?) \| frames ([\d,-]+) \| max ([\d.]+)$/.exec(String(line ?? "").trim());
  if (!m) return null;
  const frames = m[3].split(",").filter(Boolean).map((r) => { const [a, b = a] = r.split("-").map(Number); return [a, b]; });
  return { who: m[1], what: m[2], frames, depth: Number(m[4]) };
}
const sec = (f, fps) => (f / fps).toFixed(2).replace(/\.?0+$/, "");
/** Frame ranges as the film's seconds, "1.2-3.4 s, 7 s". */
export const spansText = (frames, fps) => frames.map(([a, b]) => (a === b ? sec(a, fps) : `${sec(a, fps)}-${sec(b, fps)}`)).join(", ") + " s";

/** { ran: false } when the film is not a 3D Cartoon; else { ran: true, pass, fps, frames, hits: [{ who, what, frames, depth, times }], lines } or
 *  { ran: true, error, timedOut? }. */
export async function collisionCheck(projectDir, { root = APP_ROOT, open = openFilmPage, timeoutMs = null } = {}) {
  let html = ""; try { html = readFileSync(join(projectDir, "index.html"), "utf8"); } catch { return { ran: false }; }
  if (pageStyle(html) !== COLLISION_STYLE) return { ran: false };
  let placed = null;
  try { placed = await placeStyle(projectDir, "index.html", { root }); } catch (e) { return { ran: true, error: `The film could not be bundled: ${e.message}` }; }
  if (!placed?.build) return { ran: true, error: "There is no film yet: src/videos/film/Video.tsx is missing" };
  if (placed.build.error) return { ran: true, error: `The film could not be bundled: ${placed.build.error}` };
  const lines = [], errors = [];
  let page = null, failedNow = null;
  const failed = new Promise((r) => { failedNow = r; });          // the page's own error ends the wait at once (a film with no twin throws on load)
  try {
    page = await open(projectDir, { query: "?skill-check=1", beforeLoad: (tab) => {
      tab.on("console", (m) => { const t = m.text(); if (t.startsWith("COLLISION")) lines.push(t); });
      tab.on("pageerror", (e) => { errors.push(String(e?.message ?? e).split("\n")[0]); failedNow(); });
    } });
    const cfg = await page.tab.evaluate(() => window.__skillConfig ?? window.__kitConfig ?? null);
    const limit = timeoutMs ?? collisionLimitMs(cfg?.durationInFrames);
    if (!errors.length) {
      const ready = page.tab.waitForFunction(() => window.READY === true || !!(window.__skillError ?? window.__kitError), { timeout: limit, polling: 500 });
      ready.catch(() => {});          // the page may close under it once an error ended the wait
      try {
        await Promise.race([ready, failed]);
      } catch {
        return { ran: true, timedOut: true, error: `It ran out of its time (${Math.round(limit / 1000)} s) before every frame was checked` };
      }
    }
    const skillError = await page.tab.evaluate(() => window.__skillError ?? window.__kitError ?? null);
    if (skillError || errors.length) return { ran: true, error: (skillError ?? errors[0]).slice(0, 400) };
    if (!lines.length) return { ran: true, error: "The film's collision check printed nothing: src/videos/film/Video.tsx must export FilmCheck as the source skill's template does" };
    // the twin may be drawn more than once while the page loads (each draw prints the same report): each line once
    const once = [...new Set(lines)], fps = cfg?.fps ?? 30, frames = cfg?.durationInFrames ?? null;
    const hits = once.map(parseLine).filter(Boolean).map((h) => ({ ...h, times: spansText(h.frames, fps) }));
    return { ran: true, pass: once.length === 1 && once[0] === "COLLISION none", fps, frames, hits, lines: once };
  } catch (e) {
    return { ran: true, error: String(e?.message ?? e).split("\n")[0].slice(0, 400) };
  } finally {
    await page?.close();
  }
}

/** The check in words, for Claude (collision_check, qc_sheets); "" when the film is not a 3D Cartoon. */
export function collisionText(r) {
  if (!r?.ran) return "";
  if (r.error) return `The collision check (the source skill's qa) could not run: ${r.error}. Check on the stills, at each shot's start, middle and end, that no one walks through furniture and no prop goes through a table, a hand or a body.`;
  if (r.pass) return `The collision check (the source skill's qa): COLLISION none. All ${r.frames ?? ""} frames are clear: no one walks through furniture, no character overlaps another, no foot below the floor.`.replace("All  frames", "Every frame");
  return [`The collision check (the source skill's qa) found ${r.hits.length} problem${r.hits.length === 1 ? "" : "s"}. Fix each one in the film's own files (world.ts, shots.ts; never the source skill), then call collision_check again until it says COLLISION none:`,
    ...r.hits.map((h) => `- ${h.who} ↔ ${h.what}: at ${h.times}, up to ${h.depth.toFixed(3)} ${/overlap/.test(h.what) ? "points inside" : "m deep"}`),
    "The source skill's ways (KIT.md, STAGING.md): move the route or the furniture so the walk lanes stay clear, hold a prop from the outside at its userData.grip, mark a set piece that must not collide with userData.noCollide only when it is not solid (a rug, a light)."].join("\n");
}

/** Tech checks: G-COLLISION, a warning (the owner judges the film; it never stops the render). null when the film is not a 3D Cartoon. */
export async function gateCollision(projectDir, opts = {}) {
  const r = await collisionCheck(projectDir, opts);
  if (!r.ran) return null;
  if (r.error) return { id: "G-COLLISION", blocking: false, pass: false, notChecked: true, findings: [{ severity: "warning", code: "not_checked", message: `The collision check could not run: ${r.error}` }] };
  return { id: "G-COLLISION", blocking: false, pass: r.pass, warnings: r.hits.length,
    findings: r.hits.map((h) => ({ severity: "warning", code: "collision", message: `${h.who} ↔ ${h.what} at ${h.times} (up to ${h.depth.toFixed(3)})` })) };
}
