// The page of the house heroes' sheets (owner #1287-#1293: MW Character Sheet v1): the hero a film style's source skill draws itself, with no
// Characters-page way of its own (Stickman Explainer's hoodie hero, Inner Voice Short's hero and its shadow, the 2D Explainer's kid). house-page.mjs
// bundles this with the style's drawer (house/<engine>.js: the source skill's own drawing as shipped, and the app's layer for what it lacks) and
// the character's file (CHARACTER = { id, name, about, heightM, engine, opts }). Every cell is a 600 x 1000 design box, the feet at y = 975, drawn
// at 2x; the sheet lays the standard's rows in its order (views, faces, poses, the walk's phases) with the name and the labels its only text.
import * as D from "mw-house-drawer";
import { CHARACTER } from "mw-house-character";
import { elbowRight } from "../../hf-qa/anatomy-rule.mjs";
import { FRAME, drawFrame, fitInCell } from "../../character-kit/sheet-frame.js";

const CW = 600, CH = 1000;
const canvas = (w, h) => { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; };
const hashOf = (data, step = 4) => { let h = 2166136261; for (let i = 0; i < data.length; i += step) { h ^= data[i]; h = Math.imul(h, 16777619) >>> 0; } return h.toString(16); };
export const ROWS = [
  { title: "Views", items: ["front", "three-quarter", "profile", "back"].map((v) => ({ label: v, spec: { view: v } })) },
  { title: "Faces", items: ["neutral", "happy", "laugh", "surprised", "worried", "angry", "talk", "blink"].map((f) => ({ label: f, spec: { view: "front", face: f } })) },
  { title: "Poses", items: ["stand", "walk", "point", "wave", "reach", "sit"].map((p) => ({ label: p, spec: { view: p === "walk" || p === "sit" ? "profile" : "front", pose: p, phase: 0.25 } })) },
  { title: "Walk", items: [0, 0.25, 0.5, 0.75].map((ph, i) => ({ label: i % 2 ? "pass" : "contact", spec: { view: "profile", pose: "walk", phase: ph } })) },
];

/** One cell drawn: a canvas of 2 x the design box. */
function cell(spec) {
  const c = canvas(CW * 2, CH * 2), g = c.getContext("2d");
  g.setTransform(2, 0, 0, 2, 0, 0);
  D.draw(g, CHARACTER.opts ?? {}, { t: 0, ...spec });
  return c;
}
/** What one cell's drawing is: { hash, pixels, box } (for the gate). */
function measure(spec) {
  const c = cell(spec), d = c.getContext("2d").getImageData(0, 0, c.width, c.height).data;
  let n = 0, x0 = c.width, y0 = c.height, x1 = -1, y1 = -1;
  for (let y = 0; y < c.height; y += 4) for (let x = 0; x < c.width; x += 4) if (d[(y * c.width + x) * 4 + 3] > 24) { n++; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  return { hash: hashOf(d, 16), pixels: n, box: n ? [x0 / 2, y0 / 2, x1 / 2, y1 / 2] : null };
}

/** The sheet on the one frame every engine's sheet keeps (../../character-kit/sheet-frame.js); Hands n/a: a house hero's hands are its kit's
 *  one drawing (round ends, ink dots). */
function sheet() {
  const s = canvas(FRAME.W, FRAME.H), g = s.getContext("2d");
  drawFrame(g, { name: CHARACTER.name ?? CHARACTER.id, rows: [...ROWS, { title: "Hands", items: [] }], ground: D.GROUND ?? "#f3ead8", cell: D.CELL ?? "#e6dcc6", ink: D.INK ?? "#241726" },
    (gg, it, c) => { const f = fitInCell(c, CW, CH); gg.drawImage(cell(it.spec), f.x, f.y, CW * f.s, CH * f.s); });
  return s.toDataURL("image/png");
}
/** The life clip, 6 s at 30 fps: idle with a blink (0-1.5 s), a turn through the views (1.5-3.5), a walk (3.5-5), a talk with a wave (5-6). */
function lifeFrame(f, fps = 30) {
  const t = f / fps, c = canvas(540, 900), g = c.getContext("2d");
  g.fillStyle = D.GROUND ?? "#f3ead8"; g.fillRect(0, 0, 540, 900);
  let spec = { view: "front", t, face: t > 0.8 && t < 0.95 ? "blink" : "neutral" };
  if (t >= 1.5 && t < 3.5) spec = { view: ["front", "three-quarter", "profile", "back"][Math.min(3, Math.floor((t - 1.5) / 0.5))], t, face: t > 2.2 && t < 3 ? "happy" : "neutral" };
  else if (t >= 3.5 && t < 5) spec = { view: "profile", pose: "walk", phase: ((t - 3.5) * 1.2) % 1, t };
  else if (t >= 5) spec = { view: "front", pose: "wave", t, face: Math.floor(t * 8) % 2 ? "neutral" : "talk", wave: t };
  g.setTransform(540 / CW, 0, 0, 900 / CH, 0, 0);
  D.draw(g, CHARACTER.opts ?? {}, spec);
  return c.toDataURL("image/jpeg", 0.9);
}
/** The gate's own part: every cell of the sheet draws, the same every time, inside its box; the views differ; the faces change the front. */
function check() {
  const out = [], ok = (p, w, why = "") => out.push(`${p ? "PASS" : "FAIL"}  ${w}${!p && why ? `: ${why}` : ""}`);
  const C = CHARACTER;
  ok(!!C && typeof C === "object", "the file exports CHARACTER");
  if (!C) return out;
  ok(typeof C.name === "string" && C.name.trim().length > 0 && C.name.length <= 40, "a name of 1-40 letters");
  ok(typeof C.about === "string" && C.about.trim().length >= 10 && C.about.length <= 300, "about: one line on who it is (10-300 letters)");
  ok(Number(C.heightM) >= 0.5 && Number(C.heightM) <= 2.3, "its real height in metres (heightM, 0.5-2.3)", `heightM ${C.heightM}`);
  ok(C.engine === D.ENGINE, `drawn by its film style's own engine (${D.ENGINE})`, `engine ${C.engine}`);
  ok(typeof C.id === "string" && /^[a-z][a-z0-9-]*$/.test(C.id), "an id of lower-case letters, digits and dashes", `id ${C.id}`);
  // a drawer that makes new characters says which options a file may set (Stickman: outfit, build, hair, shoes; owner #1302)
  if (D.optsLines) out.push(...D.optsLines(C.opts ?? {}, C.id));
  const broken = [], outside = [], blank = [], cells = {};
  for (const r of ROWS) for (const it of r.items) {
    const k = `${r.title}:${it.label}:${it.spec.phase ?? ""}`;
    try { const a = measure(it.spec), b = measure(it.spec); cells[k] = a; if (a.hash !== b.hash) broken.push(`${k} differs between two draws`); if (a.pixels < 200) blank.push(k); else if (a.box[0] < 2 || a.box[2] > CW - 2 || a.box[1] < 2) outside.push(k); }
    catch (e) { broken.push(`${k}: ${String(e?.message ?? e).split("\n")[0]}`); }
  }
  ok(!broken.length, "every cell of the sheet draws, the same every time", broken.join("; "));
  ok(!blank.length, "every cell shows the character", blank.join(", "));
  ok(!outside.length, "every cell inside its box", outside.join(", "));
  // the anatomy gate's elbow rule (G-anatomy, ../../hf-qa/anatomy-rule.mjs) on every cell whose drawer says where its arms are
  if (D.limbs) {
    const bad = [];
    for (const r of ROWS) for (const it of r.items) for (const l of D.limbs(it.spec) ?? []) { const e = elbowRight(l); if (!e.ok) bad.push(`${r.title}:${it.label}: ${l.name}: ${e.why}`); }
    ok(!bad.length, "every elbow bends the way an arm bends (the anatomy gate's rule)", bad.join("; "));
  }
  const v = ["front", "three-quarter", "profile", "back"].map((x) => cells[`Views:${x}:`]?.hash);
  ok(new Set(v).size === 4, "the four views differ");
  const fs = ["happy", "laugh", "surprised", "worried", "angry", "talk", "blink"].filter((f) => cells[`Faces:${f}:`]?.hash === cells["Faces:neutral:"]?.hash);
  ok(!fs.length, "every face changes the front", fs.join(", "));
  return out;
}

window.HH = { sheet, lifeFrame, check, record: () => ({ id: CHARACTER?.id ?? null, name: CHARACTER?.name ?? null, about: CHARACTER?.about ?? null, heightM: Number(CHARACTER?.heightM) || null, engine: CHARACTER?.engine ?? null, palette: D.palette?.(CHARACTER?.opts ?? {}) ?? {} }) };
window.HH_READY = true;
