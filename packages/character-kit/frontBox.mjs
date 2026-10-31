// The Front figure on a character's model sheet (The Studio's height chart): the sheets are drawn by the character's own
// film (anidoodle's sheet page), each at its own size, with the turnaround as their first row and Front its leftmost figure. A card that
// shows the character standing takes that box of the sheet itself: nothing is drawn again and no image is added.
//   frontBoxOf(file, { sharp }) → [x, y, w, h] in the sheet's pixels, or null when no figure is found
// How: a pixel is ink when it is far from the paper (the sheet's commonest colour; the faint scale lines and the guide grid are near it).
// The turnaround is the first band of rows that holds ink taller than 12% of the sheet, under the title; its leftmost column run wider than
// 2.5% of the sheet is the Front figure (the scale's numbers at the far left are narrower); its rows are the tallest run of inked rows in
// those columns (the "FRONT" label under the feet is a run of its own).

import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { resolveRuntime } from "../version-manager/index.mjs";

const INK = 60;           // RGB distance from the paper
const runs = (xs, min) => { const out = []; let s = -1; xs.forEach((v, i) => { if (v >= min && s < 0) s = i; if ((v < min || i === xs.length - 1) && s >= 0) { out.push([s, v >= min ? i : i - 1]); s = -1; } }); return out; };
/** Runs closer than `gap` joined (a figure's arm apart from its body, a gap between the legs). */
const merge = (rs, gap) => rs.reduce((acc, r) => { const l = acc.at(-1); if (l && r[0] - l[1] <= gap) l[1] = r[1]; else acc.push([...r]); return acc; }, []);

export async function frontBoxOf(file, { sharp }) {
  // read from a copy in memory: sharp's cache would keep the sheet open on Windows, so the next drawing of it could not be written
  const { data, info } = await sharp(readFileSync(file)).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height, C = info.channels;
  // the paper: the commonest colour, in steps of 8
  const hist = new Map();
  for (let i = 0; i < data.length; i += C * 7) { const k = ((data[i] >> 3) << 10) | ((data[i + 1] >> 3) << 5) | (data[i + 2] >> 3); hist.set(k, (hist.get(k) ?? 0) + 1); }
  const top = [...hist.entries()].sort((a, b) => b[1] - a[1])[0][0];
  const bg = [((top >> 10) & 31) * 8 + 4, ((top >> 5) & 31) * 8 + 4, (top & 31) * 8 + 4];
  const ink = new Uint8Array(W * H);
  for (let p = 0, i = 0; p < W * H; p++, i += C) { const d = Math.hypot(data[i] - bg[0], data[i + 1] - bg[1], data[i + 2] - bg[2]); ink[p] = d > INK ? 1 : 0; }
  const rowInk = (x0, x1) => Array.from({ length: H }, (_, y) => { let n = 0; for (let x = x0; x <= x1; x++) n += ink[y * W + x]; return n; });
  // the turnaround: the first band of inked rows (gaps of up to 1.5% joined) at least 12% of the sheet tall
  const band = merge(runs(rowInk(0, W - 1), Math.max(3, W * 0.004)), Math.round(H * 0.015)).find(([a, b]) => b - a >= H * 0.12);
  if (!band) return null;
  const colInk = Array.from({ length: W }, (_, x) => { let n = 0; for (let y = band[0]; y <= band[1]; y++) n += ink[y * W + x]; return n; });
  // the figure's rows in a column run: the tallest inked run inside the band (the label under it is its own run: 2 px of paper part them)
  const tallest = (c) => {
    const rows = rowInk(c[0], c[1]).map((v, y) => (y < band[0] || y > band[1] ? 0 : v));
    return merge(runs(rows, 1), 2).sort((a, b) => (b[1] - b[0]) - (a[1] - a[0]))[0] ?? null;
  };
  // the leftmost column run as wide as a figure whose ink stands as tall as one (the title's words and the scale's numbers are short)
  let col = null, fig = null;
  for (const c of merge(runs(colInk, Math.max(3, (band[1] - band[0]) * 0.02)), Math.round(W * 0.006)).filter(([a, b]) => b - a >= W * 0.025)) {
    const f = tallest(c);
    if (f && f[1] - f[0] >= H * 0.1) { col = c; fig = f; break; }
  }
  if (!fig) return null;
  // its own columns again on those rows (the band's columns may hold the label's wider text), a few pixels of paper round it
  const cols = Array.from({ length: W }, (_, x) => { if (x < col[0] || x > col[1]) return 0; let n = 0; for (let y = fig[0]; y <= fig[1]; y++) n += ink[y * W + x]; return n; });
  const c2 = merge(runs(cols, 1), Math.round(W * 0.006)).sort((a, b) => (b[1] - b[0]) - (a[1] - a[0]))[0] ?? col;
  const pad = Math.max(2, Math.round(Math.max(W, H) * 0.002));          // a little paper, never the label's top under the feet
  const x = Math.max(0, c2[0] - pad), y = Math.max(0, fig[0] - pad);
  return [x, y, Math.min(W, c2[1] + pad + 1) - x, Math.min(H, fig[1] + pad + 1) - y];
}

// ---- kept with the character (library data): <character dir>/front.json { "<media field>": { box, file, size, mtimeMs } }, made again
// when its sheet changes. GET /api/characters reads it as it is and asks for a fill in the background when a sheet has none yet. A character
// the app ships keeps its measures elsewhere (`keep`, the state folder): nothing is ever written to bundle/.
export const FRONT_FILE = "front.json";
const readJson = (f) => { try { return JSON.parse(readFileSync(f, "utf8")); } catch { return null; } };
let sharpMod = null;
const loadSharp = () => (sharpMod ??= createRequire(join(resolveRuntime().dir, "node_modules", "sharp", "package.json"))("sharp"));
const stamp = (f) => { const s = statSync(f); return { size: s.size, mtimeMs: Math.round(s.mtimeMs) }; };

/** The Front boxes kept for a character's sheets ({ field: [x, y, w, h] }), only those whose sheet is the one they were measured on. */
export function frontBoxes(dir, sheets, { keep = null } = {}) {
  const kept = readJson(keep ?? join(dir, FRONT_FILE)) ?? {}, out = {};
  for (const [field, name] of sheets) {
    const k = kept[field], f = join(dir, name);
    if (k?.box && k.file === name && existsSync(f)) { const s = stamp(f); if (s.size === k.size && s.mtimeMs === k.mtimeMs) out[field] = k.box; }
  }
  return out;
}
/** Measure the sheets that have no fresh box yet and keep them; returns the fields measured. */
export async function fillFrontBoxes(dir, sheets, { sharp = null, keep = null } = {}) {
  const file = keep ?? join(dir, FRONT_FILE), have = frontBoxes(dir, sheets, { keep }), kept = readJson(file) ?? {}, done = [];
  for (const [field, name] of sheets) {
    const f = join(dir, name);
    if (have[field] || !existsSync(f)) continue;
    const box = await frontBoxOf(f, { sharp: sharp ?? loadSharp() });
    kept[field] = { box, file: name, ...stamp(f) };
    done.push(field);
  }
  if (done.length) { mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, JSON.stringify(kept, null, 2) + "\n"); }
  return done;
}
