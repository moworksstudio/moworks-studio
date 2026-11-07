// GRANDMA, v1.0.0. The ONE source of truth for her: canon, rig, drawn masses, palette roles,
// distinguishing features, toScene(pose). Every sheet and film imports this module and poses her;
// nothing anywhere else is allowed to draw her.
//
// Who: a small woman of about seventy-eight, 1.52 m, slight and soft, with a gentle stoop at the
// upper back that carries her head forward. Silver-grey hair swept back from her face into a
// round BUN high on the back of her head; ROUND gold wire GLASSES; a rose knit CARDIGAN (five
// pearly buttons, ribbed hem and cuffs, two patch pockets) open in a V over a cream blouse with a
// round collar; a heather blue-grey A-line SKIRT to mid-calf; tan stockings; brown strap SHOES;
// and a dark wooden crook-handled CANE in her right hand, which she leans on. Kind, crinkled eyes:
// crow's feet, laugh lines, soft lids. What a child would draw from memory: the bun, the round
// glasses, the cane, the cardigan with buttons, the stoop.
//
// Canon: CANON_ELDER (spec.ts), 6.0 heads, declared over a real 7.0-head elderly woman.
// Parts that are volumes (body, clothes, bun, cane) turn in 3D; her hair is the engine's hair cap
// (a shell clipped at the hairline) with strands drawn ON it; the glasses are 3D wire rims.
import type { P } from "anidoodle/canvas-core/core";
import { type Blob, type Camera, type V3, add, blobPts, dot, mm, mul, mv, norm, project, rx, sub } from "anidoodle/canvas-core/character/math3";
import { ccw, hull, insidePoly } from "anidoodle/canvas-core/character/shape2d";
import { viewOf } from "anidoodle/canvas-core/character/view25d";
import type { Character, Mark, Part, Pose, Scene } from "anidoodle/canvas-core/character/types";
import { type HeadCtx, hairCap, onFace } from "anidoodle/canvas-core/character/human/head";
import { assemble, build, checkPose } from "anidoodle/canvas-core/character/human/figure";
import { toPart } from "anidoodle/canvas-core/character/build";
import { GRANDMA_SPEC, GRANDMA_VERSION } from "./spec";
import { drawnGrandma } from "./drawn";
import { caneParts } from "./cane";

export { GRANDMA_SPEC, GRANDMA_VERSION, GRANDMA_DIMS, CANON_ELDER, REAL_HEADS } from "./spec";

// ---------------------------------------------------------------- palette ROLES (each hand maps them)
export const GRANDMA_ROLES = {
  skin: { family: "warm light skin", hue: [14, 36] as [number, number], note: "peach, a little paler than in youth" },
  hair: { family: "silver grey", hue: [196, 236] as [number, number], note: "THE identity: a cool, LIGHT, nearly colourless grey (also held to saturation and value)" },
  cardigan: { family: "rose", hue: [330, 355] as [number, number], note: "a dusty rose knit, never red, never purple" },
  blouse: { family: "cream", hue: [34, 56] as [number, number], note: "warm off-white" },
  button: { family: "pearl", hue: [30, 56] as [number, number], note: "pale and warm" },
  skirt: { family: "heather blue-grey", hue: [208, 236] as [number, number], note: "a muted cool blue" },
  stockings: { family: "tan", hue: [16, 36] as [number, number], note: "skin-toned, a shade darker than her face" },
  shoes: { family: "brown leather", hue: [14, 32] as [number, number], note: "" },
  cane: { family: "dark wood", hue: [16, 34] as [number, number], note: "walnut" },
  glasses: { family: "gold wire", hue: [36, 52] as [number, number], note: "thin round gold rims" },
};

// ---------------------------------------------------------------- distinguishing features
export const GRANDMA_FEATURES = [
  { id: "bun", parts: ["bun"], note: "a round grey bun high on the back of her head; from the front it peeks over the crown", visible: () => true },
  { id: "greyHair", parts: ["hair"], note: "silver-grey, swept back from the face, soft at the temples", visible: () => true },
  { id: "glasses", parts: ["glasses"], note: "round gold wire rims", visible: (y: number) => Math.abs(y) < 150 },
  { id: "cardigan", parts: ["cardigan", "sleeveL", "sleeveR"], note: "rose knit, ribbed hem and cuffs, patch pockets", visible: () => true },
  { id: "buttons", parts: ["buttons"], note: "five pearly buttons down the front", visible: (y: number) => Math.abs(y) < 80 },
  { id: "collar", parts: ["collar"], note: "a cream round collar in the cardigan's V", visible: (y: number) => Math.abs(y) < 100 },
  { id: "skirt", parts: ["skirt"], note: "heather A-line to mid-calf", visible: () => true },
  { id: "cane", parts: ["cane"], note: "dark wooden crook cane, right hand, rubber tip on the floor", visible: () => true },
  { id: "shoes", parts: ["shoeL", "shoeR"], note: "brown strap shoes, small block heel", visible: () => true },
];

// ---------------------------------------------------------------- the face's years
// marks ON the face surface, split where it turns away: crow's feet, the bags under the eyes, the
// laugh lines from nose to mouth, the forehead, the little lines at the mouth's corners. Faint;
// they deepen with the expression that makes them.
const faceRuns = (h: HeadCtx, pts: [number, number][], min = 0.15): P[][] => {
  const out: P[][] = []; let cur: P[] = [];
  pts.forEach(([x, y]) => { const f = onFace(h, x, y); if (f.facing > min) cur.push(f.p); else { if (cur.length > 1) out.push(cur); cur = []; } });
  if (cur.length > 1) out.push(cur);
  return out;
};
const ageLines = (h: HeadCtx, ex: Record<string, number>, px: number): Mark[] => {
  const S = h.spec, E = (k: string) => ex[k] ?? 0, w = Math.max(0.7, px * 0.011), m: Mark[] = [];
  const add2 = (runs: P[][], a: number, k = 1) => runs.forEach((pts) => m.push({ kind: "line", pts, role: "line", w: w * k, alpha: Math.min(0.8, a) }));
  const smile = Math.max(0, E("smile")), squint = Math.min(1, smile * 0.6 + E("cheek") * 0.5 + Math.max(0, E("lidUpper")) * 0.3);
  [-1, 1].forEach((s) => {
    const ox = s * (S.eyeX + S.eyeW * 1.15), oy = S.eyeY;
    // crow's feet: three short lines fanning from the outer corner
    [[0.02, 0.022], [0.0, 0.03], [-0.02, 0.024]].forEach(([dy, len], i) => add2(faceRuns(h, [[ox + s * 0.008, oy + dy * 0.4], [ox + s * len, oy + dy]]), 0.28 + 0.35 * squint, i === 1 ? 0.9 : 0.75));
    // the soft bag under the eye
    add2(faceRuns(h, Array.from({ length: 6 }, (_, i) => { const t = i / 5; return [s * (S.eyeX - S.eyeW * 0.7 + t * S.eyeW * 1.5), oy - 0.045 - Math.sin(t * Math.PI) * 0.012 + squint * 0.008] as [number, number]; })), 0.3, 0.8);
    // the laugh line from the nose's wing to beside the mouth corner
    const mw = S.mouthW * (1 + Math.max(0, E("smile")) * 0.15);
    add2(faceRuns(h, Array.from({ length: 6 }, (_, i) => { const t = i / 5; return [s * (0.05 + t * (mw + 0.025 - 0.05) + Math.sin(t * Math.PI) * 0.018 * (1 + smile)), S.noseY + 0.005 - t * (S.noseY - S.mouthY + 0.02)] as [number, number]; })), 0.32 + 0.3 * smile, 0.9);
    // the little lines down from the mouth's corners
    add2(faceRuns(h, [[s * (mw + 0.012), S.mouthY - 0.012], [s * (mw + 0.02), S.mouthY - 0.06]]), 0.22, 0.7);
  });
  // two forehead lines, deeper when the brows go up
  [0.73, 0.785].forEach((y, i) => add2(faceRuns(h, Array.from({ length: 7 }, (_, k) => { const t = -1 + k / 3; return [t * 0.16, y + 0.01 * (1 - t * t) + E("browRaise") * 0.012] as [number, number]; }), 0.2), 0.18 + 0.3 * Math.max(0, E("browRaise")) + 0.15 * Math.max(0, E("browSad")) - i * 0.04, 0.8));
  // worry or determination: the vertical lines between the brows
  const knit = Math.max(E("browFurrow"), E("browSad") * 0.7);
  if (knit > 0.2) [-1, 1].forEach((s) => add2(faceRuns(h, [[s * 0.022, S.browY + 0.005], [s * 0.016, S.browY + 0.06]]), 0.2 + 0.4 * knit, 0.8));
  return m;
};

// ---------------------------------------------------------------- hair: the swept-back cap and its strands
const STRANDS: [number, number][][] = [
  ...[-0.24, -0.12, 0.0, 0.12, 0.24].map((x) => [[x, 0.36], [x * 0.85, 0.2], [x * 0.55, 0.0], [x * 0.3, -0.16]] as [number, number][]),
  ...[-1, 1].map((s) => [[s * 0.34, 0.16], [s * 0.32, 0.0], [s * 0.24, -0.16], [s * 0.12, -0.26]] as [number, number][]),
  ...[-1, 1].map((s) => [[s * 0.3, 0.28], [s * 0.26, 0.08], [s * 0.18, -0.1]] as [number, number][]),
];
const hairStrands = (h: HeadCtx, cam: Camera): Mark[] => {
  const c = h.spec.skull[0], R = [c.r[0] + 0.05, c.r[1] + 0.05, c.r[2] + 0.05], px = project(cam, h.M(c.c)).s * h.hh, w = Math.max(0.7, px * 0.008), out: Mark[] = [];
  STRANDS.forEach((st) => {
    let cur: P[] = []; const flush = () => { if (cur.length > 1) out.push({ kind: "line", pts: cur, role: "hairLine", w, alpha: 0.6 }); cur = []; };
    st.forEach(([x, z]) => {
      const u = x / R[0], v = z / R[2], y = c.c[1] + R[1] * Math.sqrt(Math.max(0, 1 - u * u - v * v)) + 0.01, q = h.M([x, y, c.c[2] + z]), n = norm(mv(h.f.R, [u / R[0], (y - c.c[1]) / R[1] / R[1], v / R[2]]));
      if (dot(n, norm(sub(cam.eye, q))) > 0.12) { const p = project(cam, q); cur.push([p.x, p.y]); } else flush();
    });
    flush();
  });
  return out;
};

// ---------------------------------------------------------------- the bun: a coiled volume high on the back of the head
const BUN_C: V3 = [0, 1.05, -0.2], BUN_R: V3 = [0.19, 0.14, 0.19];   // high enough that from the front it rises over the crown (sheet round 1: hidden)
const bunPart = (h: HeadCtx, cam: Camera, head: Part): Part => {
  const R = mm(h.f.R, rx(-42 * Math.PI / 180)), c = h.M(BUN_C), b: Blob = { c, R, r: mul(BUN_R, h.hh) };
  const poly = ccw(hull(blobPts(cam, b))), px = project(cam, c).s * h.hh, w = Math.max(0.7, px * 0.009), marks: Mark[] = [];
  // the coil: a spiral wound on the dome, seen where the dome faces the lens
  let cur: P[] = []; const flush = () => { if (cur.length > 1) marks.push({ kind: "line", pts: cur, role: "hairLine", w, alpha: 0.65 }); cur = []; };
  for (let i = 0; i <= 64; i++) {
    const t = i / 64, a = t * Math.PI * 5.2, rr = 0.95 - 0.8 * t, hy = Math.sqrt(Math.max(0, 1 - rr * rr));
    const l: V3 = [Math.cos(a) * rr * BUN_R[0], hy * BUN_R[1], Math.sin(a) * rr * BUN_R[2]], q = add(c, mv(R, mul(l, h.hh)));
    const n = norm(mv(R, [l[0] / BUN_R[0] ** 2, l[1] / BUN_R[1] ** 2, l[2] / BUN_R[2] ** 2]));
    if (dot(n, norm(sub(cam.eye, q))) > 0.1) { const p = project(cam, q); cur.push([p.x, p.y]); } else flush();
  }
  flush();
  // seen from the front the bun sits BEHIND the head and only its top shows over the crown;
  // from the side and back it sits on the hair
  const vw = Math.abs(viewOf(cam, h.f).yaw), behind = vw < 70;
  return { id: "bun", role: "hair", depth: behind ? head.depth + 0.4 * h.hh : project(cam, c).z - 0.05 * h.hh, polys: [poly], size: head.size * 0.45, marks, over: behind ? [] : ["hair", "head", "earL", "earR"], feature: "bun" };
};
const project2 = (cam: Camera, v: V3): P => { const q = project(cam, v); return [q.x, q.y]; };

// ---------------------------------------------------------------- glasses: round gold wire rims, occluded by the head
const glassesParts = (h: HeadCtx, head: Part, hair: P[], front: number): Part[] => {
  const S = h.spec, marks: Mark[] = [], temples: Mark[] = [], hd = project(h.cam, h.M([0, 0.5, 0])).z, px = project(h.cam, h.M([0, 0.5, 0])).s * h.hh;
  const hidden = (w: V3) => { const q = project(h.cam, w); return q.z > hd - 0.02 * h.hh && (head.polys.some((pl) => insidePoly(pl, q.x, q.y)) || insidePoly(hair, q.x, q.y)); };
  const run = (pts: V3[], w: number, role = "glasses", into = marks) => { let cur: P[] = []; const flush = () => { if (cur.length > 1) into.push({ kind: "line", pts: cur, role, w }); cur = []; }; pts.forEach((p) => { if (hidden(p)) flush(); else { const q = project(h.cam, p); cur.push([q.x, q.y]); } }); flush(); };
  const R = 0.078, zf = 0.448, w = Math.max(1, px * 0.016);
  [-1, 1].forEach((s) => {
    const cx = s * S.eyeX, cy = S.eyeY + 0.004, z = (x: number) => zf - Math.abs(x) * 0.25;
    const ring: V3[] = Array.from({ length: 33 }, (_, i) => { const a = (i / 32) * Math.PI * 2, x = cx + Math.cos(a) * R; return h.M([x, cy + Math.sin(a) * R, z(x)]); });
    const n = mv(h.f.R, [0, 0, 1]), f = dot(n, norm(sub(h.cam.eye, h.M([cx, cy, zf]))));
    if (f > 0.3) { const g: V3[] = Array.from({ length: 6 }, (_, i) => { const a = Math.PI * (1.08 + i * 0.07); return h.M([cx + Math.cos(a) * R * 0.7, cy - Math.sin(a) * R * 0.7, z(cx) + 0.006]); }); run(g, w * 1.1, "white"); }
    run(ring, w * 1.2);
    // the temple arm, back over the top of the ear
    run(Array.from({ length: 9 }, (_, i) => { const t = i / 8; return h.M([s * (S.eyeX + R + t * (0.37 - S.eyeX - R)), cy + 0.008 + t * 0.03, z(S.eyeX + R) - t * (z(S.eyeX + R) + 0.02)]); }), w * 0.9, "glasses", temples);
  });
  // the bridge, a little keyhole arch over the nose
  run(Array.from({ length: 7 }, (_, i) => { const a = Math.PI * (i / 6); return h.M([-Math.cos(a) * (S.eyeX - R), S.eyeY + 0.022 + Math.sin(a) * 0.022, zf + 0.004]); }), w * 1.05);
  return [{ id: "glasses", role: "glasses", depth: front, polys: [], size: px * 0.1, marks, outline: false, fill: false, over: ["head", "nose", "hair", "earL", "earR", "temples"], feature: "glasses" },
    { id: "temples", role: "glasses", depth: front + 0.06 * h.hh, polys: [], size: px * 0.1, marks: temples, outline: false, fill: false, over: ["head", "earL", "earR"] }];
};

const FACE = { line: "line", pupil: "iris", white: "white", blush: "blush", brow: "brow", mouth: "mouth", lip: "lip" };
// her lids sit a little lower at rest than a young woman's
const aged = (ex: Record<string, number>) => ({ ...ex, lidUpper: Math.min(1, (ex.lidUpper ?? 0) + 0.12) });
const DIGITS_R = ["thumbR", "indexR", "middleR", "ringR", "littleR"];

export const grandmaScene = (pose: Pose, cam: Camera): Scene => {
  const p = { ...pose, expression: aged(pose.expression) };
  const b = build(GRANDMA_SPEC, p, cam), r = b.rig, hh = r.dims.hh, h = b.head;
  // the body under the clothes is the invisible pose source: what is SEEN is drawn (drawn.ts)
  const hidden = new Set(["torso", "hips", "upperArmL", "upperArmR", "foreArmL", "foreArmR", "thighL", "thighR", "shinL", "shinR", "footL", "footR"]);
  b.parts = b.parts.filter((q) => !hidden.has(q.id));
  b.parts.push(...caneParts(r, cam));
  const px = project(cam, r.joints.head).s * hh;
  const sc = assemble(cam, b, p, FACE, { character: "moworks-grandma", version: GRANDMA_VERSION }, (parts) => {
    const head = parts.find((q) => q.id === "head")!;
    head.marks.push(...ageLines(h, p.expression, head.size * 2));
    // the fist closes OVER the cane's handle
    parts.filter((q) => DIGITS_R.includes(q.id)).forEach((q) => { q.over = [...(q.over ?? []), "cane"]; });
    const hair = hairCap(h, "hair", { front: 0.87, side: 0.68, back: 0.3, lift: 0.045, volume: [{ c: [0.29, 0.86, 0.0], r: [0.08, 0.09, 0.17] }, { c: [-0.29, 0.86, 0.0], r: [0.08, 0.09, 0.17] }] });   // soft at the temples (sheet round 3: bigger puffs read as ear-flaps)
    hair.marks.push(...hairStrands(h, cam));
    const out: Part[] = [hair, bunPart(h, cam, head)];
    if (Math.abs(viewOf(cam, h.f).yaw) < 160) out.push(...glassesParts(h, head, hair.polys[0] ?? [], head.depth - 0.06 * hh));
    out.push(...drawnGrandma(r, cam));
    // the neck's years: two soft rings across the front of the throat
    const neck = parts.find((q) => q.id === "neck");
    if (neck) [0.18, 0.3].forEach((y, i) => { const pts = [-0.11, -0.05, 0, 0.05, 0.11].map((x) => apply3(r.neck, [x * hh, y * hh - Math.abs(x) * 0.25 * hh, (0.12 - Math.abs(x) * 0.35) * hh])), n = mv(r.neck.R, [0, 0, 1]); if (dot(n, norm(sub(cam.eye, pts[2]))) > 0.2) neck.marks.push({ kind: "line", pts: pts.map((v) => project2(cam, v)), role: "line", w: Math.max(0.7, px * 0.01), alpha: 0.28 - i * 0.06 }); });
    return out;
  });
  return sc;
};
const apply3 = (f: { p: V3; R: import("anidoodle/canvas-core/character/math3").M3 }, l: V3): V3 => add(f.p, mv(f.R, l));

export const grandma: Character = {
  id: "moworks-grandma", name: "Grandma", version: GRANDMA_VERSION, canonId: "storybookElder",
  description: "A small elderly woman (~78), 6.0 heads (storybook, declared over a real 7), 1.52 m, gentle stoop: silver-grey hair in a bun, round gold glasses, rose cardigan with buttons over a cream collar, heather skirt, brown strap shoes, a wooden crook cane in her right hand.",
  roles: GRANDMA_ROLES, features: GRANDMA_FEATURES,
  pose: (p: Pose) => { checkPose(p, "grandma"); return p; },
  toScene: (p: Pose, cam: Camera) => grandmaScene(p, cam),
};
export { toPart };
