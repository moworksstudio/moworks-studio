// The page half of Ricks Clip's character checks and model sheet (packages/moworks-kits/ricks-page.mjs bundles it with toon.js): draws a
// character's card exactly as the film's engine does (main.js Card: a 1200 x 2000 canvas, the 600 x 1000 design space scaled 2x, a new Pen)
// and measures it. window.RC is the only thing it adds to the page.
import * as T from "mw-ricks-toon";

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

/** The model sheet: the three views, the faces, the arm poses, a walk, each labelled; on the kit's warm ground. */
function sheet(id) {
  const c = T.CAST[id], cell = 300, ch = 500, pad = 18;
  const rows = [
    { title: "Views", items: T.VIEWS.map((v) => ({ label: v, opts: { view: v } })) },
    { title: "Faces (front)", items: ["neutral", "smile", "grin", "laugh", "stern", "nervous", "shock", "squint"].map((e) => ({ label: e, opts: { view: "front", expr: e } })) },
    { title: "Faces (profile)", items: ["neutral", "smile", "laugh", "shock"].map((e) => ({ label: e, opts: { view: "profile", expr: e } })) },
    { title: "Arm poses (front)", items: ["point", "up", "wave", "hip", "belly", "temple", "reach", "cheek", "cross", "thumb"].map((a) => ({ label: a, opts: { view: "front", L: a } })) },
    { title: "Walk (profile, back)", items: [0, 0.25, 0.5, 0.75].map((ph) => ({ label: `profile ${ph}`, opts: { view: "profile", walk: true, phase: ph } })).concat([0, 0.5].map((ph) => ({ label: `back ${ph}`, opts: { view: "back", walk: true, phase: ph } }))) },
  ];
  const cols = Math.max(...rows.map((r) => r.items.length)), W = pad * 2 + cols * cell, H = 90 + rows.reduce((a) => a + ch + 60, 0);
  const s = canvas(W, H), g = s.getContext("2d");
  g.fillStyle = "#f3ead8"; g.fillRect(0, 0, W, H);
  g.fillStyle = "#241726"; g.font = "bold 34px sans-serif"; g.fillText(`${c?.name ?? id} · Ricks Clip`, pad, 52);
  g.font = "20px sans-serif"; g.fillText(c?.about ?? "", pad + 2, 80);
  let y = 100;
  for (const r of rows) {
    g.font = "bold 22px sans-serif"; g.fillText(r.title, pad, y + 22);
    r.items.forEach((it, i) => {
      const img = cardImage(id, it.opts), x = pad + i * cell;
      g.fillStyle = "#e6dcc6"; g.fillRect(x + 4, y + 34, cell - 8, ch - 8);
      g.drawImage(img, x + 4, y + 34, cell - 8, (cell - 8) * (CH / CW));
      g.fillStyle = "#241726"; g.font = "18px sans-serif"; g.fillText(it.label, x + 10, y + 34 + ch - 16);
    });
    y += ch + 60;
  }
  return s.toDataURL("image/png");
}
/** Frames of a short life clip: breathing (bob), blinks, a turn through the three views and a walk. Each a JPEG data URL. */
function lifeFrame(id, f, fps = 30) {
  const t = f / fps, c = canvas(540, 900), g = c.getContext("2d");
  g.fillStyle = "#f3ead8"; g.fillRect(0, 0, 540, 900);
  const view = t < 1.6 ? "front" : t < 2.4 ? "profile" : t < 3.2 ? "back" : "profile";
  const walk = t >= 3.2, blink = (f % 52) < 2 ? 0.5 : (f % 52) < 4 ? 1 : 0;
  g.setTransform(540 / 600, 0, 0, 900 / 1000, 0, 0);
  T.castDraw(new T.Pen(g), id, { view, walk, phase: walk ? (t * 1.2) % 1 : 0, bob: 0.006 * Math.sin(f * 0.11), headTilt: 1.5 * Math.sin(f * 0.037), blink, expr: t > 0.8 && t < 1.6 ? "smile" : "neutral" });
  return c.toDataURL("image/jpeg", 0.9);
}

/** The three views side by side on the kit's warm ground, as a PNG data URL (the Character creator's style tile). */
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
