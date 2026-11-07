// The page half of Ricks Clip's character checks and model sheet (packages/moworks-styles/ricks-page.mjs bundles it with toon.js): draws a
// character's card exactly as the film's engine does (main.js Card: a 1200 x 2000 canvas, the 600 x 1000 design space scaled 2x, a new Pen)
// and measures it. window.RC is the only thing it adds to the page.
import * as T from "mw-ricks-toon";
import { FRAME, drawFrame, fitInCell } from "../character-kit/sheet-frame.js";

const CW = 1200, CH = 2000;
const canvas = (w = CW, h = CH) => { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; };
/** FNV-1a over the RGBA bytes, sampled every `step` bytes (enough to tell two drawings apart). */
const hashOf = (data, step = 4) => { let h = 2166136261; for (let i = 0; i < data.length; i += step) { h ^= data[i]; h = Math.imul(h, 16777619) >>> 0; } return h.toString(16); };

/** One card: { hash, ms, pixels (opaque count), box: [x0, y0, x1, y1] in design units, sole (lowest opaque row), touches: edges hit }. */
function card(id, opts = {}) {
  const c = canvas(), g = c.getContext("2d");
  const t0 = performance.now();
  g.setTransform(CW / 600, 0, 0, CH / 1000, 0, 0);
  T.castDraw(new T.Pen(g), id, opts);
  const ms = performance.now() - t0;
  const d = g.getImageData(0, 0, CW, CH).data;
  let x0 = CW, y0 = CH, x1 = -1, y1 = -1, n = 0;
  for (let y = 0; y < CH; y += 2) for (let x = 0; x < CW; x += 2) if (d[(y * CW + x) * 4 + 3] > 24) { n++; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  const s = 600 / CW;
  return { hash: hashOf(d), ms, pixels: n, box: n ? [x0 * s, y0 * s, x1 * s, y1 * s] : null, sole: n ? y1 * s : null,
    touches: n ? ["left", "top", "right"].filter((e, i) => [x0 <= 2, y0 <= 2, x1 >= CW - 3][i]) : [] };
}
/** A card as a PNG data URL (for the sheet). */
function cardImage(id, opts = {}) {
  const c = canvas(), g = c.getContext("2d");
  g.setTransform(CW / 600, 0, 0, CH / 1000, 0, 0);
  T.castDraw(new T.Pen(g), id, opts);
  return c;
}

/** The model sheet, MW Character Sheet v1 (owner #1287-#1293): four rows in the standard's order, the views, the eight faces, the six poses, the walk's
 *  phases; the character's name the only other text (#1290). Hands: none of their own here (ink dots), so no row. On the source skill's warm ground. */
function sheet(id) {
  const c = T.CAST[id], F = T.STANDARD_FACES;
  const rows = [
    { title: "Views", items: T.ALL_VIEWS.map((v) => ({ label: v, opts: { view: v } })) },
    { title: "Faces", items: Object.entries(F).map(([k, e]) => ({ label: k, opts: { view: "front", expr: e, blink: k === "blink" ? 1 : 0 } })) },
    { title: "Poses", items: [["stand", {}], ["walk", { walk: true, phase: 0.25 }], ["point", { R: "point" }], ["wave", { R: "wave", expr: "grin" }], ["reach", { R: "reach" }], ["sit", { sit: true, view: "profile" }]]
      .map(([label, o]) => ({ label, opts: { view: "front", ...o } })) },
    { title: "Walk", items: [0, 0.25, 0.5, 0.75].map((ph, i) => ({ label: i % 2 ? "pass" : "contact", opts: { view: "profile", walk: true, phase: ph } })) },
  ];
  // the one frame every engine's sheet keeps (../character-kit/sheet-frame.js); Hands n/a (ink dots)
  const s = canvas(FRAME.W, FRAME.H), g = s.getContext("2d");
  drawFrame(g, { name: c?.name ?? id, rows: [...rows, { title: "Hands", items: [] }] },
    (gg, it, r) => { const f = fitInCell(r, 600, 1000); gg.drawImage(cardImage(id, it.opts), f.x, f.y, 600 * f.s, 1000 * f.s); });
  return s.toDataURL("image/png");
}
/** The life clip, 6 s at 30 fps (the standard's order): idle with a blink (0-1.5 s), a turn through the views (1.5-3.5), a walk (3.5-5), a talk
 *  with a wave (5-6). Each frame a JPEG data URL. */
const LIFE_FRAMES = 180;          // ricks-page.mjs drawLife takes as many
function lifeFrame(id, f, fps = 30) {
  const t = f / fps, c = canvas(540, 900), g = c.getContext("2d");
  g.fillStyle = "#f3ead8"; g.fillRect(0, 0, 540, 900);
  const turn = ["front", "three-quarter", "profile", "back"], blink = (t > 0.8 && t < 0.95) || (f % 52) < 2 ? 1 : 0;
  let o = { view: "front", bob: 0.006 * Math.sin(f * 0.11), headTilt: 1.5 * Math.sin(f * 0.037), blink, expr: "neutral" };
  if (t >= 1.5 && t < 3.5) o = { ...o, view: turn[Math.min(3, Math.floor((t - 1.5) / 0.5))], expr: t > 2.2 && t < 3 ? "grin" : "neutral" };
  else if (t >= 3.5 && t < 5) o = { ...o, view: "profile", walk: true, phase: ((t - 3.5) * 1.2) % 1 };
  else if (t >= 5) o = { ...o, R: "wave", wv: t * 9, expr: T.talkExpr(t) };
  g.setTransform(540 / 600, 0, 0, 900 / 1000, 0, 0);
  T.castDraw(new T.Pen(g), id, o);
  return c.toDataURL("image/jpeg", 0.9);
}

/** The three views side by side on the source skill's warm ground, as a PNG data URL (the Character creator's style tile). */
function strip(id, w = 320, h = 400) {
  const s = canvas(w, h), g = s.getContext("2d"), cw = w / 3;
  g.fillStyle = "#f3ead8"; g.fillRect(0, 0, w, h);
  // each card at its own aspect, as tall as the tile, centred on its third (the figures are narrower than their cards, so they never collide)
  const ch = h * 0.98, cwid = ch * (CW / CH);
  T.VIEWS.forEach((v, i) => g.drawImage(cardImage(id, { view: v }), (i + 0.5) * cw - cwid / 2, h - ch, cwid, ch));
  return s.toDataURL("image/png");
}

window.RC = {
  strip,
  ids: () => Object.keys(T.CAST), def: (id) => { const c = T.CAST[id]; return c ? { id: c.id, name: c.name ?? null, about: c.about ?? null, heightM: c.heightM ?? null, seed: c.seed, outfit: c.outfit ?? null, extra: Object.keys(c.extra ?? {}) } : null; },
  views: T.VIEWS, poses: T.ARM_POSES, faces: T.EXPRESSIONS, card, sheet, lifeFrame,
};
window.RC_READY = true;
