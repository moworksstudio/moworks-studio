// MW Character Sheet v1, reduced, for anidoodle's two characters on rigs of their own (owner #1287-#1293, survey §5.1: "animals, robots and things
// keep a reduced sheet: their own views and moves, faces only if they have one"). Drawn by the author's rigs as pinned, nothing added:
//   Bit      (bitRig.ts drawBit2: front only, sprites the plate drew once)  Faces: his own eyes, brows and mouths, in the standard's eight
//            moods; Poses: his own (rest, a lean, an arm up, both arms up, the cheer's jump, a squash); Views: the front only. Walk, Hands: n/a.
//   Cheetah  (cheetahRig.ts fk + cheetahBody.ts drawCheetah: side only)     Views: facing right and left; Poses: her held poses (stand, bow,
//            crouch, skid); Walk: four points of the rotary gallop. Faces, Hands: n/a (the rig has none).
// Both on the one sheet frame every engine keeps (../../character-kit/sheet-frame.js).
import { type Ctx, type Env, type P } from "anidoodle/canvas-core/core";
import type { Film } from "anidoodle/canvas-core/film";
import { ARM_MAX, FACE_SHEET, cheer, drawBit2, restPose, type BitPose } from "anidoodle/canvas-core/bitRig";
import { BOW, CROUCH, SKID, STAND, fk, gallopRig, gallopY, settle, type Rig } from "anidoodle/canvas-core/cheetahRig";
import { drawCheetah, headAnchor, type Pose as CPose } from "anidoodle/canvas-core/cheetahBody";
// the one sheet frame every engine keeps (packages/character-kit/sheet-frame.js, copied beside this file by v1.mjs)
import { FRAME, NA, cellRect, standardRows } from "./sheet-frame.js";

const PAPER = "#f7f1e3", CELL = "#ede3cd", INK = "#3a2f28", MUTED = "#7d7164";
type Row<T> = { title: string; items: { label: string; spec: T }[] };
const text = (ctx: Ctx, env: Env, t: string, x: number, y: number, font: string, color = INK) => { ctx.save(); ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0); ctx.fillStyle = color; ctx.font = font; ctx.fillText(t, x, y); ctx.restore(); };

/** A sheet on the one frame every engine keeps (../../character-kit/sheet-frame.js: 2436 x 3000, Views, Faces, Poses, Walk, Hands, cells of
 *  292 x 492, a row the rig has not got shown as one "n/a" cell), each cell drawn by cell(ctx, env, frame, x, y, w, h, spec) in logical px. */
const layout = <T>(name: string, rows: Row<T>[], cell: (ctx: Ctx, env: Env, frame: number, x: number, y: number, w: number, h: number, spec: T) => void): Film => {
  const R = standardRows(rows) as Row<T>[], W = FRAME.W, H = FRAME.H;
  const draw = (ctx: Ctx, frame: number, env: Env) => {
    ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0); ctx.fillStyle = PAPER; ctx.fillRect(0, 0, W, H);
    R.forEach((r, ri) => {
      for (let i = 0; i < Math.max(1, r.items.length); i++) { const c = cellRect(ri, i); ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0); ctx.fillStyle = CELL; ctx.fillRect(c.x, c.y, c.w, c.h); }
      r.items.forEach((it, i) => {
        const c = cellRect(ri, i);
        cell(ctx, env, frame, c.x, c.y, c.w, c.h, it.spec);
        text(ctx, env, it.label, c.x + 4, c.y + c.h + 26, "18px sans-serif", MUTED);
      });
      text(ctx, env, r.title, FRAME.PAD, FRAME.TOP + ri * FRAME.ROW + 22, "bold 22px sans-serif");
      if (!r.items.length) { const c = cellRect(ri, 0); ctx.save(); ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0); ctx.textAlign = "center"; ctx.fillStyle = MUTED; ctx.font = "bold 30px sans-serif"; ctx.fillText(NA, c.x + c.w / 2, c.y + c.h / 2 + 10); ctx.restore(); }
    });
    text(ctx, env, name, FRAME.PAD, 52, "bold 34px sans-serif");
  };
  return { meta: { title: `${name}: MW Character Sheet v1 (reduced)`, W, H, fps: 30, bpm: 120, durationFrames: 1 }, assets: { images: {} }, shots: [{ id: "sheet", start: 0, end: 1, draw }] };
};
// ---- Bit: drawn where his plate puts him (a 560 px square at the top left), then copied into his cell; the top left is cleared after
type BitSpec = { pose: Partial<BitPose>; face?: boolean };
const bit = (o: Partial<BitPose>): Partial<BitPose> => o;
const BIT_FACES: [string, Partial<BitPose>][] = [
  ["neutral", bit({ eyes: "open", brows: "neutral", mouth: "flat", blush: 0.6 })], ["happy", bit({ eyes: "open", brows: "neutral", mouth: "smile" })],
  ["laugh", bit({ eyes: "happy", brows: "up", mouth: "grin", blush: 1 })], ["surprised", bit({ eyes: "open", brows: "up", mouth: "o" })],
  ["worried", bit({ eyes: "open", brows: "worried", mouth: "wobble" })], ["angry", bit({ eyes: "squint", brows: "none", mouth: "flat", blush: 0.2 })],
  ["talk", bit({ eyes: "open", brows: "neutral", mouth: "o" })], ["blink", bit({ eyes: "open", blink: 1, mouth: "smile" })],
];
const cheered = (f: number): Partial<BitPose> => { const p = restPose(); cheer(p, f, 3, false); return { ...p, twinkles: [] }; };
const BIT_ROWS: Row<BitSpec>[] = [
  { title: "Views", items: [{ label: "front", spec: { pose: {} } }] },
  { title: "Faces", items: BIT_FACES.map(([label, pose]) => ({ label, spec: { pose, face: true } })) },
  { title: "Poses", items: [
    { label: "stand", spec: { pose: {} } }, { label: "lean", spec: { pose: { lean: -6, tilt: -6, headOff: [-6, 0], look: [-3, 0] } } },
    { label: "arm up", spec: { pose: { armR: ARM_MAX * 0.8, mouth: "grin", eyes: "happy" } } }, { label: "both arms up", spec: { pose: { armL: ARM_MAX, armR: ARM_MAX, brows: "up", mouth: "o", look: [0, -3] } } },
    { label: "cheer", spec: { pose: cheered(18) } }, { label: "squash", spec: { pose: { squash: 0.95, bob: 2, eyes: "shut", mouth: "flat" } } },
  ] },
];
const SRC: [number, number, number, number] = [32, 0, 496, 560], FACE_SRC: [number, number, number, number] = [FACE_SHEET[0] - 150, FACE_SHEET[1] - 170, 300, 300];
export const bitSheet = layout("Bit", BIT_ROWS, (ctx, env, _f, x, y, w, h, spec) => {
  const s = env.scale, [sx, sy, sw, sh] = spec.face ? FACE_SRC : SRC, keep = env.canvas(Math.ceil(560 * s), Math.ceil(560 * s));
  keep.ctx.drawImage(ctx.canvas as CanvasImageSource, 0, 0, 560 * s, 560 * s, 0, 0, 560 * s, 560 * s);          // what the sheet has there
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, 560 * s, 560 * s); ctx.restore();
  drawBit2(ctx, env, { ...restPose(), ...spec.pose });
  const k = Math.min(w / sw, h / sh), dw = sw * k, dh = sh * k, cut = env.canvas(Math.ceil(sw * s), Math.ceil(sh * s));
  cut.ctx.drawImage(ctx.canvas as CanvasImageSource, sx * s, sy * s, sw * s, sh * s, 0, 0, sw * s, sh * s);
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, 560 * s, 560 * s); ctx.drawImage(keep.canvas as CanvasImageSource, 0, 0);
  ctx.drawImage(cut.canvas as CanvasImageSource, 0, 0, sw * s, sh * s, (x + (w - dw) / 2) * s, (y + (h - dh) / 2) * s, dw * s, dh * s); ctx.restore();
});

// ---- the cheetah: her points from the rig, fitted to the cell (her own px, y down, the ground at 0)
type CatSpec = { rig: Rig; flip?: boolean; air?: number };
const box = (q: CPose) => { const pts: P[] = [...q.spine, ...q.tail, ...q.foreN, ...q.foreF, ...q.hindN, ...q.hindF], h = headAnchor(q); pts.push([h[0] + 70, h[1] - 45], [h[0] + 70, h[1] + 40], [h[0] - 30, h[1] - 55]); return { x0: Math.min(...pts.map((p) => p[0])) - 24, x1: Math.max(...pts.map((p) => p[0])) + 24, y0: Math.min(...pts.map((p) => p[1])) - 24, y1: Math.max(...pts.map((p) => p[1])) + 12 }; };
const held = (r: Rig): CatSpec => { const s = settle(r); return { rig: s.rig, air: s.y }; };
const galloping = (ph: number): CatSpec => ({ rig: gallopRig(ph), air: gallopY(ph) });
const CAT_ROWS: Row<CatSpec>[] = [
  { title: "Views", items: [{ label: "profile (right)", spec: held(STAND) }, { label: "profile (left)", spec: { ...held(STAND), flip: true } }] },
  { title: "Poses", items: [{ label: "stand", spec: held(STAND) }, { label: "bow", spec: held(BOW) }, { label: "crouch", spec: held(CROUCH) }, { label: "skid", spec: held(SKID) }] },
  // her walk is the rotary gallop: the sheet's Walk row shows four points of it
  { title: "Walk", items: [0, 0.25, 0.5, 0.75].map((ph, i) => ({ label: `gallop ${i + 1}/4`, spec: galloping(ph) })) },
];
// one scale for every cell, so her size reads the same in each: the widest pose fits
const CW = FRAME.CW - 2 * FRAME.INSET, CH = FRAME.CH - 2 * FRAME.INSET, FIT = Math.min(...CAT_ROWS.flatMap((r) => r.items).map((it) => { const b = box(fk(it.spec.rig, 0, it.spec.air ?? 0, 0)); return Math.min((CW - 40) / (b.x1 - b.x0), (CH - 50) / (b.y1 - b.y0)); }));
export const cheetahSheet = layout("Cheetah", CAT_ROWS, (ctx, env, _f, x, y, w, h, spec) => {
  const q = fk(spec.rig, 0, spec.air ?? 0, 0), b = box(q), k = FIT, cx = x + w / 2, floor = y + h - 22, mid = (b.x0 + b.x1) / 2, sx = spec.flip ? -1 : 1, s = env.scale;
  ctx.save(); ctx.setTransform(s, 0, 0, s, 0, 0); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  ctx.strokeStyle = "rgba(60,40,30,0.25)"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x + 16, floor); ctx.lineTo(x + w - 16, floor); ctx.stroke();
  ctx.setTransform(s * k * sx, 0, 0, s * k, s * (cx - mid * k * sx), s * floor);
  drawCheetah(ctx, q);
  ctx.restore();
});
