// One film, several sizes (owner 06/11/2026, #1228, #1232-#1236; audit/105 §8). The film's own size is the master (meta.format, locked
// after the build by setOutputFormat); every other size is an adaptation of it, made after the Review from the master's final code: its
// own root page `index.<w>x<h>.html` beside index.html, sharing compositions/, assets/ and src/, with the master's timeline and sound.
// meta.sizes = [{ aspect, width, height, entry, status, madeFrom, at, task }]: status "none" (added, not made), "adapting" (its Claude task
// runs), "ready" (made; madeFrom is the master's picture hash it was made from), "stopped" (its task was stopped or failed). A ready size
// whose madeFrom is not the master's picture now is out of date ("stale"): the Adaptation step and the Film Editor say so, never block.
import { copyFileSync, existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, symlinkSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export const ASPECTS = { "16:9": [1920, 1080], "9:16": [1080, 1920], "1:1": [1080, 1080], "4:5": [1080, 1350] };
/** "9:16" -> "9x16" (file names, URLs). */
export const tagOf = (aspect) => String(aspect ?? "").replace(":", "x");
/** "9x16" -> "9:16", or null for a size the app does not make. */
export const aspectOfTag = (tag) => { const a = String(tag ?? "").replace("x", ":"); return ASPECTS[a] ? a : null; };
/** The size's root page: index.9x16.html. */
export const entryOf = (aspect) => `index.${tagOf(aspect)}.html`;
/** A file that belongs to one size only (`compositions/shot-03.9x16.html`, `src/layout.9x16.js`): never part of the master's picture. */
export const SIZE_FILE = /\.(16x9|9x16|1x1|4x5)\.[a-z0-9]+$/i;
/** A size's root page at the film's root (index.9x16.html). */
export const SIZE_ROOT = /^index\.(16x9|9x16|1x1|4x5)\.html$/i;

/** The master's size: the film's own format. */
export const masterAspect = (meta) => (ASPECTS[meta?.format?.aspect] ? meta.format.aspect : null);
/** The sizes made from the master (the master itself never counts). */
export const extraSizes = (meta) => (Array.isArray(meta?.sizes) ? meta.sizes : []).filter((s) => ASPECTS[s?.aspect] && s.aspect !== masterAspect(meta));
/** Every size the film has, the master first: ["16:9", "9:16"]. */
export const filmSizes = (meta) => [...new Set([masterAspect(meta) ?? meta?.format?.aspect ?? "16:9", ...extraSizes(meta).map((s) => s.aspect)])];
/** The sizes "Add a size" offers: 9:16, 4:5 and 1:1 from a 16:9 master, 16:9 from a vertical one; never the master or one already there. */
export function sizeChoices(meta) {
  const master = masterAspect(meta), have = new Set(extraSizes(meta).map((s) => s.aspect));
  const order = master === "16:9" || !master ? ["9:16", "4:5", "1:1", "16:9"] : ["16:9", "9:16", "4:5", "1:1"];
  return order.filter((a) => a !== master && !have.has(a));
}

/** Each extra size as the Adaptation step and the Editor show it: { aspect, tag, width, height, entry, status, at, madeFrom }, status one of
 *  none | adapting | ready | stale | stopped. masterPicture: the master's picture hash now (null: not known, a ready size stays ready);
 *  running: the aspect whose Claude task runs now (null: none). */
export function sizeRows(meta, { masterPicture = null, running = null, dir = null } = {}) {
  return extraSizes(meta).map((s) => {
    const [width, height] = ASPECTS[s.aspect], entry = entryOf(s.aspect);
    let status = s.status === "ready" ? "ready" : s.status === "stopped" ? "stopped" : "none";
    if (running === s.aspect) status = "adapting";
    // its root page gone (taken out by hand, an older version opened): not made
    else if (status === "ready" && dir && !existsSync(join(dir, entry))) status = "none";
    else if (status === "ready" && masterPicture && s.madeFrom && s.madeFrom !== masterPicture) status = "stale";
    return { aspect: s.aspect, tag: tagOf(s.aspect), width, height, entry, status, at: s.at ?? null, madeFrom: s.madeFrom ?? null };
  });
}

/** Add a size to the film's metadata (m: the project's meta, changed in place). Throws INVALID for the master, an unknown size or one already there. */
export function addSize(m, aspect) {
  const bad = (msg) => Object.assign(new Error(msg), { code: "INVALID" });
  if (!ASPECTS[aspect]) throw bad(`Unknown size ${aspect} (${Object.keys(ASPECTS).join(", ")})`);
  if (aspect === masterAspect(m)) throw bad(`${aspect} is the film's own size`);
  if (extraSizes(m).some((s) => s.aspect === aspect)) throw bad(`The film has ${aspect} already`);
  const [width, height] = ASPECTS[aspect];
  m.sizes = [...(Array.isArray(m.sizes) ? m.sizes : []), { aspect, width, height, entry: entryOf(aspect), status: "none", addedAt: new Date().toISOString() }];
  return m.sizes.at(-1);
}
/** Take a size off the film's list (its root page stays in the folder, and in the film's history). */
export function removeSize(m, aspect) {
  const before = (m.sizes ?? []).length;
  m.sizes = (m.sizes ?? []).filter((s) => s.aspect !== aspect);
  return m.sizes.length !== before;
}
/** One size's record, changed in place by fn (m: the project's meta). */
export function updateSize(m, aspect, fn) {
  const s = (m.sizes ?? []).find((x) => x.aspect === aspect);
  if (s) fn(s);
  return s ?? null;
}

/** The film as HyperFrames sees it at one size, for its stills and checks: .moworks/cache/sizes/<tag>/, whose index.html is the size's root
 *  page and whose other entries are the film's own (folders as junctions, files copied). HyperFrames' snapshot, check and render read a
 *  folder's index.html; the film's folder is never changed for it. Returns the folder, or null when the size's root page is not there. */
export function sizeStage(dir, aspect) {
  const page = join(dir, entryOf(aspect));
  if (!existsSync(page)) return null;
  const stage = join(dir, ".moworks", "cache", "sizes", tagOf(aspect));
  mkdirSync(stage, { recursive: true });
  const skip = (n) => n === ".git" || n === ".moworks" || n === ".claude" || /^index(\.[^.]+)?\.html$/i.test(n) || /^desktop\.ini$/i.test(n);
  const own = new Set(readdirSync(dir).filter((n) => !skip(n)));
  // what an earlier stage linked and the film no longer has
  for (const n of readdirSync(stage)) {
    if (n === "index.html" || own.has(n)) continue;
    const p = join(stage, n);
    try { if (lstatSync(p).isSymbolicLink() || lstatSync(p).isFile()) unlinkSync(p); } catch { /* left for the next stage */ }
  }
  for (const n of own) {
    const from = join(dir, n), to = join(stage, n);
    const st = lstatSync(from);
    if (st.isDirectory()) {
      let have = null; try { have = lstatSync(to); } catch { /* not linked yet */ }
      if (!have) symlinkSync(from, to, "junction");
    } else if (st.isFile()) copyFileSync(from, to);
  }
  writeFileSync(join(stage, "index.html"), readFileSync(page));
  // the film's metadata (its style, its language) for the checks that read it; the folder's own .moworks keeps their caches apart
  const meta = join(dir, ".moworks", "project.json");
  if (existsSync(meta)) { mkdirSync(join(stage, ".moworks"), { recursive: true }); copyFileSync(meta, join(stage, ".moworks", "project.json")); }
  return stage;
}

/** The Adaptation step every style's pipeline carries (owner 06/11, #1232): Version 1 -> Review -> Adaptation -> Tech checks -> Render.
 *  Optional: a film with one size counts it as done; the autopilot never starts it (the owner presses Adapt for each size), and it never
 *  holds the Tech checks or the render. */
export const ADAPTATION_STEP = Object.freeze({
  id: "adaptation", title: "Adaptation", stage: 4, optional: true,
  what: "Optional: the film laid out again for other sizes (9:16, 4:5, 1:1), on the same timeline and sound",
  needs: ["build", "qcReview"], done: { kind: "sizes" },
  action: { kind: "dialog", dialog: "sizes", label: "Open" }, review: { kind: "dialog", dialog: "sizes", label: "Open" },
});
/** A style's steps with the Adaptation step after its Review (before its Tech checks when it has no Review); unchanged when it has
 *  neither, or the step already. */
export function withAdaptation(steps) {
  const xs = Array.isArray(steps) ? steps : [];
  if (!xs.length || xs.some((s) => s.id === "adaptation")) return xs;
  const at = xs.findIndex((s) => s.id === "qcReview"), before = at >= 0 ? at + 1 : xs.findIndex((s) => s.id === "checks");
  if (before < 0) return xs;
  const step = { ...ADAPTATION_STEP, needs: ADAPTATION_STEP.needs.filter((n) => xs.some((s) => s.id === n)), done: { ...ADAPTATION_STEP.done },
    action: { ...ADAPTATION_STEP.action }, review: { ...ADAPTATION_STEP.review } };
  return [...xs.slice(0, before), step, ...xs.slice(before)];
}
