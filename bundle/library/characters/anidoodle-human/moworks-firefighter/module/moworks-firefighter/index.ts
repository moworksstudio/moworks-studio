// THE FIREFIGHTER, v1.0.0. The ONE source of truth: canon, rig, drawn views, palette roles,
// distinguishing features, toScene(pose). Every sheet and film imports this module and poses
// them; nothing anywhere else is allowed to draw them.
//
// Who: an adult firefighter in full turnout gear, mid-thirties, 1.80 m, solid and square, made
// bulkier still by the gear. The read, in the order a child would draw it from memory: a ROUND
// WHITE HELMET like an astronaut's, a bubble with a big front visor and the face inside it; a RED
// turnout coat to mid-thigh; lime-and-silver REFLECTIVE BANDS round the hem, the chest, both
// sleeves and both trouser cuffs; CHARCOAL gauntlet GLOVES; heavy BLACK BOOTS. Inside the visor:
// short dark hair with a fringe swept to their left.
//
// Canon: CANON.adult, 7.5 heads, 1.80 m, realistic. No stylised row: the helmet is a garment over
// a real head, so the body keeps the adult canon and the bubble alone makes the silhouette
// top-heavy (7.74 heads to the helmet's crown).
//
// Parts that are volumes (coat, sleeves, trousers, boots, gloves) turn in 3D as designed sweeps
// (drawn.ts). The helmet is a true sphere on the head frame, cut flat at the neck ring; its visor
// is a spherical cap, and the face, hair and neck are CLIPPED to what the cap shows, so the face
// is only ever seen through the glass. The fringe is a drawing (2.5D: three authored views blended).
import type { P } from "anidoodle/canvas-core/core";
import { type Blob, type Camera, DEG, type V3, add, cross, dot, mul, mv, norm, project, sub } from "anidoodle/canvas-core/character/math3";
import { toPart } from "anidoodle/canvas-core/character/build";
import { ccw, hull, insidePoly } from "anidoodle/canvas-core/character/shape2d";
import { type Views, checkViews, place25d, viewOf } from "anidoodle/canvas-core/character/view25d";
import type { Character, Mark, Part, Pose, Scene } from "anidoodle/canvas-core/character/types";
import { CANON } from "anidoodle/canvas-core/character/human/canon";
import { ADULT_BODY, type BodySpec } from "anidoodle/canvas-core/character/human/mannequin";
import { ADULT_HEAD, type HeadCtx, hairCap } from "anidoodle/canvas-core/character/human/head";
import { type FigureSpec, assemble, build, checkPose } from "anidoodle/canvas-core/character/human/figure";
import { drawnFirefighter } from "./drawn";

export const FF_VERSION = "1.0.0";
// gloved hands: the same hand skeleton, thicker (a gauntlet glove adds ~15% girth), no skin detail
export const FF_BODY: BodySpec = { ...ADULT_BODY, handGirth: 1.16, handDetail: false };
export const FF_SPEC: FigureSpec = { canon: CANON.adult, height: 1.8, body: FF_BODY, head: ADULT_HEAD, roles: { skin: "skin", hand: "gloves" } };

// ---------------------------------------------------------------- palette ROLES (each hand maps them)
export const FF_ROLES = {
  coat: { family: "fire-engine red", hue: [350, 10] as [number, number], note: "THE identity colour: a red turnout coat, never orange, never pink" },
  pants: { family: "red, a step darker", hue: [348, 10] as [number, number], note: "turnout trousers, the coat's red in shadow" },
  band: { family: "lime-yellow tape", hue: [52, 72] as [number, number], note: "fluorescent lime-yellow either side of a silver stripe" },
  helmet: { family: "white", hue: [0, 360] as [number, number], note: "white shell: held by VALUE (lightness), not hue" },
  gloves: { family: "charcoal", hue: [0, 360] as [number, number], note: "charcoal: held by value, darker than mid-grey, lighter than the boots" },
  boots: { family: "black", hue: [0, 360] as [number, number], note: "black rubber: held by value" },
  glass: { family: "pale sky", hue: [185, 215] as [number, number], note: "the visor's tint, a cool pale blue" },
  skin: { family: "warm skin", hue: [12, 38] as [number, number], note: "" },
  hair: { family: "dark brown", hue: [10, 40] as [number, number], note: "" },
};
// the roles whose identity is a VALUE: [min, max] HSL lightness
export const FF_VALUES: Record<string, [number, number]> = { helmet: [0.86, 1], silver: [0.7, 0.95], gloves: [0.16, 0.36], boots: [0, 0.2] };

// ---------------------------------------------------------------- distinguishing features
export const FF_FEATURES = [
  { id: "helmet", parts: ["helmet"], note: "round white astronaut-style bubble helmet on a grey neck ring", visible: () => true },
  { id: "visor", parts: ["visor"], note: "big round front visor, grey rim, the face seen through the glass", visible: (y: number) => Math.abs(y) <= 120 },
  { id: "face", parts: ["head"], note: "the face inside the visor: never outside the glass", visible: (y: number) => Math.abs(y) <= 60 },
  { id: "turnoutCoat", parts: ["coat", "sleeveL", "sleeveR"], note: "red turnout coat to mid-thigh, storm flap, four clasps, hip pockets", visible: () => true },
  { id: "reflectiveBands", parts: ["bandHem", "bandChest", "bandSleeveL", "bandSleeveR", "bandLegL", "bandLegR"], note: "lime / silver / lime tape: hem, chest, sleeves, trouser cuffs", visible: () => true },
  { id: "gloves", parts: ["gloveL", "gloveR"], note: "charcoal gauntlet gloves over the sleeve ends", visible: () => true },
  { id: "boots", parts: ["bootL", "bootR"], note: "heavy black boots, flat soles, under belled trouser cuffs", visible: () => true },
];

// ---------------------------------------------------------------- the helmet (head units, head-local: origin at the chin, y up, z forward)
export const HELMET = { c: [0, 0.52, -0.02] as V3, r: 0.72, cut: -0.12, axis: norm([0, -0.1, 1]) as V3, half: 44 * DEG };
const capBasis = (): [V3, V3] => { const a = HELMET.axis, u = norm(cross([0, 1, 0], a)); return [u, cross(a, u)]; };
const onShell = (theta: number, phi: number): V3 => {
  const [u, v] = capBasis(), a = HELMET.axis, d = add(mul(a, Math.cos(theta)), mul(add(mul(u, Math.cos(phi)), mul(v, Math.sin(phi))), Math.sin(theta)));
  return add(HELMET.c, mul(d, HELMET.r));
};
const seen = (h: HeadCtx, q: V3) => { const w = h.M(q), n = mv(h.f.R, norm(sub(q, HELMET.c))); return { w, f: dot(n, norm(sub(h.cam.eye, w))) }; };
const P2 = (cam: Camera, v: V3): P => { const q = project(cam, v); return [q.x, q.y]; };

// the shell: the sphere cut flat at the neck ring, as its silhouette
const shellPoly = (h: HeadCtx): P[] => {
  const C = HELMET.c, R = HELMET.r, pts: P[] = [], rc = Math.sqrt(R * R - (HELMET.cut - C[1]) ** 2);
  for (let i = 0; i <= 18; i++) for (let j = 0; j < 28; j++) {
    const la = -Math.PI / 2 + (i / 18) * Math.PI, lo = (j / 28) * Math.PI * 2, q: V3 = [C[0] + R * Math.cos(la) * Math.cos(lo), C[1] + R * Math.sin(la), C[2] + R * Math.cos(la) * Math.sin(lo)];
    if (q[1] >= HELMET.cut) pts.push(P2(h.cam, h.M(q)));
  }
  for (let j = 0; j < 36; j++) { const lo = (j / 36) * Math.PI * 2; pts.push(P2(h.cam, h.M([rc * Math.cos(lo), HELMET.cut, C[2] + rc * Math.sin(lo)]))); }
  return ccw(hull(pts));
};
// the visor: the part of the spherical cap the camera can see, as a convex window (null when turned away)
export const visorWindow = (h: HeadCtx): P[] | null => {
  const pts: P[] = [];
  for (let i = 0; i <= 10; i++) for (let j = 0; j < 40; j++) { const q = onShell((i / 10) * HELMET.half, (j / 40) * Math.PI * 2), s = seen(h, q); if (s.f > 0) pts.push(P2(h.cam, s.w)); }
  if (pts.length < 6) return null;
  const w = ccw(hull(pts));
  return Math.abs(area(w)) > 4 ? w : null;
};
const area = (s: P[]) => s.reduce((a, p, i) => { const q = s[(i + 1) % s.length]; return a + p[0] * q[1] - q[0] * p[1]; }, 0) / 2;

// the helmet's marks: the rim of the visor (a raised grey gasket), the glass's tint and glint, and
// a small red shield decal above the visor, all ON the sphere's surface so they turn with it
const visorMarks = (h: HeadCtx, win: P[] | null, px: number): Mark[] => {
  const m: Mark[] = [], hh = h.hh;
  const runsOf = (qs: V3[], min: number): P[][] => { const out: P[][] = []; let cur: P[] = []; qs.forEach((q) => { const s = seen(h, q); if (s.f > min) cur.push(P2(h.cam, s.w)); else { if (cur.length > 1) out.push(cur); cur = []; } }); if (cur.length > 1) out.push(cur); return out; };
  if (win) {
    m.push({ kind: "fill", pts: win, role: "glass", alpha: 0.2 });
    // the glint: a crescent of sky on the upper side toward the light, and a short echo
    runsOf(Array.from({ length: 8 }, (_, i) => onShell(HELMET.half * 0.72, (116 + i * 6) * DEG)), 0.25).forEach((pts) => m.push({ kind: "line", pts, role: "white", w: Math.max(1.2, px * 0.028), alpha: 0.85 }));
    runsOf(Array.from({ length: 4 }, (_, i) => onShell(HELMET.half * 0.55, (168 + i * 6) * DEG)), 0.25).forEach((pts) => m.push({ kind: "line", pts, role: "white", w: Math.max(1, px * 0.016), alpha: 0.7 }));
  }
  // the gasket round the visor, closed; drawn where it faces us (it shows a little past the window's edge)
  const ring = Array.from({ length: 61 }, (_, i) => onShell(HELMET.half, (i / 60) * Math.PI * 2));
  runsOf(ring, -0.05).forEach((pts) => m.push({ kind: "line", pts, role: "trim", w: Math.max(1.6, px * 0.05) }));
  return m;
};
const decalMarks = (h: HeadCtx): Mark[] => {
  // a small shield, its centre 62 deg up the shell from the visor axis
  const up = norm(add(mul(HELMET.axis, Math.cos(62 * DEG)), mul(capBasis()[1], Math.sin(62 * DEG)))), e1 = capBasis()[0], e2 = norm(cross(up, e1));
  const at = (s: number, t: number): V3 => add(HELMET.c, mul(norm(add(up, add(mul(e1, s), mul(e2, t)))), HELMET.r + 0.004));
  if (seen(h, add(HELMET.c, mul(up, HELMET.r))).f < 0.15) return [];
  const k = 0.085, shield: [number, number][] = [[-1, 0.85], [-0.35, 1], [0, 0.85], [0.35, 1], [1, 0.85], [1, 0.05], [0.55, -0.6], [0, -1], [-0.55, -0.6], [-1, 0.05]];
  const pts = shield.map(([s, t]) => P2(h.cam, h.M(at(s * k, t * k))));
  const bar = (a: [number, number], b: [number, number]) => [a, b].map(([s, t]) => P2(h.cam, h.M(at(s * k, t * k))));
  return [{ kind: "fill", pts, role: "badge", line: 1.2 }, { kind: "line", pts: bar([0, 0.62], [0, -0.62]), role: "white", w: Math.max(1, project(h.cam, h.M(HELMET.c)).s * h.hh * 0.022) }, { kind: "line", pts: bar([-0.55, 0.1], [0.55, 0.1]), role: "white", w: Math.max(1, project(h.cam, h.M(HELMET.c)).s * h.hh * 0.022) }];
};

// ---------------------------------------------------------------- the 2.5D fringe: three authored views
// Units: head heights, origin at the front hairline (head-local [0, 0.84, 0.36]), x right, y DOWN.
// Eleven points in the same order in every view: the top edge from their right (screen left in
// the front view) over to their left, then the lower edge back, three locks hanging over the brow.
const FRINGE: Views = {
  yaw: [0, 45, 90],
  shapes: [
    [[-0.31, 0.02], [-0.2, -0.07], [-0.02, -0.1], [0.16, -0.08], [0.3, 0.0], [0.27, 0.1], [0.16, 0.05], [0.08, 0.15], [-0.02, 0.05], [-0.16, 0.09], [-0.28, 0.07]],
    [[-0.27, 0.02], [-0.17, -0.07], [-0.02, -0.1], [0.09, -0.08], [0.17, 0.0], [0.15, 0.1], [0.09, 0.05], [0.045, 0.15], [-0.02, 0.05], [-0.14, 0.09], [-0.24, 0.07]],
    [[-0.12, 0.03], [-0.08, -0.07], [-0.02, -0.1], [0.03, -0.08], [0.07, 0.0], [0.07, 0.1], [0.05, 0.05], [0.03, 0.15], [0.0, 0.05], [-0.05, 0.09], [-0.1, 0.07]],
  ],
};
checkViews("fringe", FRINGE);
const FRINGE_AT: V3 = [0, 0.84, 0.36];

// ---------------------------------------------------------------- clipping to the visor (every hand gets geometry, so the clip is geometric)
const clipConvex = (subject: P[], clip: P[]): P[] => {
  let out = subject; const n = clip.length;
  for (let i = 0; i < n && out.length; i++) {
    const a = clip[i], b = clip[(i + 1) % n], inn = (p: P) => (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]) >= 0, inp = out; out = [];
    inp.forEach((p, k) => { const q = inp[(k + inp.length - 1) % inp.length], pi = inn(p), qi = inn(q); if (pi !== qi) { const d1 = (b[0] - a[0]) * (q[1] - a[1]) - (b[1] - a[1]) * (q[0] - a[0]), d2 = (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]), t = d1 / (d1 - d2); out.push([q[0] + (p[0] - q[0]) * t, q[1] + (p[1] - q[1]) * t]); } if (pi) out.push(p); });
  }
  return out;
};
const clipRuns = (pts: P[], win: P[]): P[][] => { const out: P[][] = []; let cur: P[] = []; pts.forEach((p) => { if (insidePoly(win, p[0], p[1])) cur.push(p); else { if (cur.length > 1) out.push(cur); cur = []; } }); if (cur.length > 1) out.push(cur); return out; };
export const clipToVisor = (part: Part, win: P[] | null) => {
  if (!win) { part.polys = []; part.marks = []; return; }
  part.polys = part.polys.map((q) => clipConvex(ccw(q), win)).filter((q) => q.length >= 3).map(ccw);
  part.marks = part.marks.flatMap((m): Mark[] => {
    if (m.kind === "line") return clipRuns(m.pts, win).map((pts) => ({ ...m, pts }));
    if (m.kind === "fill") { const q = clipConvex(ccw(m.pts), win); return q.length >= 3 ? [{ ...m, pts: q }] : []; }
    return insidePoly(win, m.at[0], m.at[1]) ? [m] : [];
  });
};

const FACE = { line: "line", pupil: "pupil", white: "white", blush: "blush", brow: "hair", mouth: "mouth", lip: "lip" };
const HIDDEN = new Set(["torso", "hips", "upperArmL", "upperArmR", "foreArmL", "foreArmR", "thighL", "thighR", "shinL", "shinR", "footL", "footR"]);

export const firefighterScene = (p: Pose, cam: Camera, o: { clip?: boolean } = {}): Scene => {
  const b = build(FF_SPEC, p, cam), r = b.rig, hh = r.dims.hh, h = b.head;
  // the body under the gear is the invisible pose source: what is SEEN is drawn (drawn.ts)
  b.parts = b.parts.filter((q) => !HIDDEN.has(q.id));
  // the neck ring the helmet locks onto: a grey gasket round the cut, turning with the head
  const C = HELMET.c, rc = Math.sqrt(HELMET.r ** 2 - (HELMET.cut - C[1]) ** 2);
  const ring: Blob[] = Array.from({ length: 17 }, (_, i) => { const a = (i / 16) * Math.PI * 2; return { c: h.M([rc * Math.cos(a), HELMET.cut - 0.02, C[2] + rc * Math.sin(a)]), R: h.f.R, r: [0.07 * hh, 0.055 * hh, 0.07 * hh] }; });
  b.parts.push({ id: "neckRing", role: "trim", groups: [{ blobs: ring, mode: "chain" }], over: ["helmet", "collar", "coat"], depthAt: h.M([0, HELMET.cut, C[2] + rc * 0.6]) });
  const px = project(cam, r.joints.head).s * hh;
  return assemble(cam, b, p, FACE, { character: "moworks-firefighter", version: FF_VERSION }, (parts) => {
    const head = parts.find((q) => q.id === "head")!, hd = head.depth, out: Part[] = [];
    const win = visorWindow(h), vw = viewOf(cam, h.f), clip = o.clip !== false;
    // the shell, painted over the coat and collar; then the inside of the helmet seen through the window
    out.push({ id: "helmet", role: "helmet", depth: hd - 0.001, polys: [shellPoly(h)], size: px * 0.5, marks: decalMarks(h), over: ["coat", "collar", "neck"], feature: "helmet" });
    out.push({ id: "visorIn", role: "visorIn", depth: hd - 0.002, polys: win ? [win] : [], size: px * 0.3, marks: [], outline: false, over: ["helmet"] });
    // the head inside: no ears (the helmet liner covers them), skin and features clipped to the glass
    parts.forEach((q) => { if (q.id === "earL" || q.id === "earR") { q.polys = []; q.marks = []; } });
    parts.filter((q) => /^(thumb|index|middle|ring|little)[LR]$/.test(q.id)).forEach((q) => { q.marks = q.marks.filter((m) => m.role !== "nail"); });
    const neck = parts.find((q) => q.id === "neck")!, nose = parts.find((q) => q.id === "nose");
    neck.depth = hd - 0.0025; neck.over = ["visorIn"]; head.depth = hd - 0.003; head.over = ["neck", "visorIn"];
    if (nose) nose.depth = hd - 0.0035;
    const hair = hairCap(h, "hair", { front: 0.84, side: 0.56, back: 0.3, lift: 0.03, sideburn: 0.12 }); hair.depth = hd - 0.004; hair.feature = undefined;
    out.push(hair);
    if (Math.abs(vw.yaw) < 100) { const fr = place25d(cam, h.f, mul(sub(FRINGE_AT, FF_SPEC.head.pivot), hh), hh, FRINGE, { pitchShift: 0.1 }); out.push({ id: "fringe", role: "hair", depth: hd - 0.0045, polys: [ccw(fr.pts)], size: head.size * 0.6, marks: [], over: ["head", "hair"] }); }
    if (clip) [head, neck, ...(nose ? [nose] : []), ...out.filter((q) => q.id === "hair" || q.id === "fringe")].forEach((q) => clipToVisor(q, win));
    out.push({ id: "visor", role: "glass", depth: hd - 0.005, polys: [], size: px * 0.3, marks: visorMarks(h, win, px), outline: false, fill: false, over: ["head", "neck", "hair", "fringe", "visorIn", "helmet", ...(nose ? ["nose"] : [])], feature: "visor" });
    out.push(...drawnFirefighter(r, cam));
    return out;
  });
};

export const firefighter: Character = {
  id: "moworks-firefighter", name: "The firefighter", version: FF_VERSION, canonId: "adult",
  description: "Adult firefighter, 7.5 heads (adult canon), 1.80 m: round white astronaut-style bubble helmet with a big visor, red turnout coat with lime/silver reflective bands, charcoal gauntlet gloves, black boots.",
  roles: FF_ROLES, features: FF_FEATURES,
  pose: (p: Pose) => { checkPose(p, "firefighter"); return p; },
  toScene: (p: Pose, cam: Camera) => firefighterScene(p, cam),
};
export { toPart };
