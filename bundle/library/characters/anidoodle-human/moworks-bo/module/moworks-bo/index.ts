// BƠ, v1.0.0. The ONE source of truth for her: canon, rig, drawn views, palette roles,
// distinguishing features, toScene(pose). Every still, sheet and film imports this module and
// poses her; nothing anywhere else is allowed to draw her.
//
// Who: a seven-year-old, small for her age and quick. A black bowl cut with a blunt, dead-straight
// fringe; a little red hair clip shaped like a fish over her right temple; a round face with
// freckles scattered over both cheeks; big curious eyes; a grin with one front tooth missing.
// A coral-red crew-neck T-shirt, navy shorts, banana-leaf green rubber wellies a size too big,
// and a small cream canvas bag worn across the body (strap over her left shoulder, bag on her
// right hip) with her lunchbox lid peeking out of the top. Stubborn, a copycat, never gives up.
//
// Canon: a DECLARED stylised row, 5.0 heads, 1.15 m: the head of a real 5.9-head seven-year-old
// enlarged 1.18x (the description asks for "about five heads"). Below the neck, segment lengths
// are the real child's (Winter's table, checked against her body height).
//
// Parts that are volumes (arms, hands, head) turn in 3D. Clothes are designed sweeps (drawn.ts).
// Parts that are drawings (the fringe and side locks) are 2.5D, authored in three views and
// blended (character/view25d); the fish clip is a flat drawing lying on the hair's surface.
import type { P } from "anidoodle/canvas-core/core";
import { Blob, Camera, DEG, Frame, V3, add, apply, cross, dot, mm, mul, mv, norm, project, ry, rz, sub } from "anidoodle/canvas-core/character/math3";
import type { BlobPart } from "anidoodle/canvas-core/character/build";
import { ccw, hull } from "anidoodle/canvas-core/character/shape2d";
import { type Views, checkViews, place25d, viewOf } from "anidoodle/canvas-core/character/view25d";
import type { Character, Mark, Part, Pose, RoleSpec, Scene } from "anidoodle/canvas-core/character/types";
import { blob } from "anidoodle/canvas-core/character/human/mannequin";
import { type HeadCtx, onFace } from "anidoodle/canvas-core/character/human/head";
import { assemble, build, checkPose } from "anidoodle/canvas-core/character/human/figure";
import { BO_CANON, BO_HEAD, BO_SPEC } from "./spec";
import type { Rig } from "anidoodle/canvas-core/character/human/skeleton";
import { drawnBo } from "./drawn";

export const BO_VERSION = "1.0.0";

// ---------------------------------------------------------------- palette ROLES (each hand maps them)
// `light`: an HSL lightness range. A hue check cannot hold a black, a white or a cream (black has
// no hue; grey hair would sit in black's hue range), so those roles carry a lightness band too.
export type BoRole = RoleSpec & { light?: [number, number] };
export const BO_ROLES: Record<string, BoRole> = {
  skin: { family: "warm light-tan skin", hue: [16, 38], note: "a sun-warmed child's skin, never pink-grey", light: [0.62, 0.9] },
  hair: { family: "black (blue-black)", hue: [200, 310], note: "black, a cool black in flat colour", light: [0, 0.22] },
  brow: { family: "dark brown", hue: [0, 40], note: "", light: [0, 0.3] },
  freckle: { family: "warm brown", hue: [12, 34], note: "dots on both cheeks" },
  shirt: { family: "coral red", hue: [0, 16], note: "THE identity colour: coral red, warmer than the clip", light: [0.5, 0.75] },
  shorts: { family: "navy", hue: [215, 240], note: "dark cool blue", light: [0.08, 0.35] },
  boots: { family: "banana-leaf green", hue: [72, 105], note: "a yellow-green, not teal" },
  bag: { family: "cream canvas", hue: [32, 56], note: "pale warm cream", light: [0.8, 0.95] },
  clip: { family: "red", hue: [348, 8], note: "the fish clip: a pure red" },
  lunchbox: { family: "sky blue", hue: [185, 215], note: "the lid peeking from the bag" },
  pupil: { family: "near black", hue: [0, 360], note: "", light: [0, 0.16] },
  white: { family: "white", hue: [0, 360], note: "eye highlights and teeth", light: [0.92, 1] },
};

// ---------------------------------------------------------------- distinguishing features
export const BO_FEATURES = [
  { id: "bowlCut", parts: ["hairBack", "hairFront"], note: "black bowl cut, ears covered, ends curling in at the jaw", visible: () => true },
  { id: "bluntFringe", parts: ["hairFront"], note: "a dead-straight fringe at the brows", visible: (y: number) => Math.abs(y) < 105 },
  { id: "fishClip", parts: ["fishClip"], note: "a small red fish clip over her RIGHT temple, swimming toward her face", visible: (y: number) => y >= -20 && y <= 125 },
  { id: "freckles", parts: ["freckles"], note: "freckles scattered over both cheeks", visible: (y: number) => Math.abs(y) < 75 },
  { id: "gapTooth", parts: ["teeth"], note: "her grin shows a missing front tooth", visible: (y: number) => Math.abs(y) <= 45 },
  { id: "coralTee", parts: ["shirt", "sleeveL", "sleeveR"], note: "coral-red crew-neck T-shirt", visible: () => true },
  { id: "navyShorts", parts: ["shorts"], note: "navy shorts to mid-thigh", visible: () => true },
  { id: "wellies", parts: ["bootL", "bootR"], note: "banana-leaf green wellies, tall and a little too wide", visible: () => true },
  { id: "lunchBag", parts: ["bag"], note: "small cream canvas bag across the body, strap over the left shoulder, lunchbox lid peeking out", visible: (y: number) => !(y < -60 && y > -120) },
];

// ---------------------------------------------------------------- the 2.5D fringe and side locks
// Units: head heights, origin at the cranium centre, x right, y DOWN. 24 points per view, same
// order: near hem outer, up the near side, over the crown, down the far side, far hem, the far
// lock's inner edge, the blunt fringe from far to near (ONE straight cut), the near lock's inner edge.
const FRINGE: Views = {
  yaw: [0, 45, 90],
  shapes: [
    [[-0.48, 0.34], [-0.535, 0.13], [-0.52, -0.12], [-0.41, -0.35], [-0.21, -0.49], [0.0, -0.52], [0.21, -0.49], [0.41, -0.35], [0.52, -0.12], [0.535, 0.13], [0.48, 0.34], [0.42, 0.35], [0.405, 0.15], [0.395, -0.03],
      [0.35, -0.048], [0.23, -0.05], [0.115, -0.052], [0.0, -0.052], [-0.115, -0.052], [-0.23, -0.05], [-0.35, -0.048], [-0.395, -0.03], [-0.405, 0.15], [-0.42, 0.35]],
    [[-0.52, 0.36], [-0.585, 0.14], [-0.575, -0.12], [-0.46, -0.37], [-0.24, -0.51], [0.03, -0.54], [0.27, -0.49], [0.45, -0.34], [0.53, -0.12], [0.54, 0.1], [0.5, 0.3], [0.46, 0.31], [0.45, 0.12], [0.46, -0.03],
      [0.43, -0.048], [0.34, -0.05], [0.24, -0.052], [0.14, -0.053], [0.04, -0.053], [-0.05, -0.052], [-0.13, -0.05], [-0.17, 0.02], [-0.17, 0.18], [-0.16, 0.37]],
    [[-0.5, 0.36], [-0.585, 0.14], [-0.585, -0.12], [-0.46, -0.38], [-0.22, -0.53], [0.06, -0.55], [0.3, -0.47], [0.45, -0.32], [0.53, -0.15], [0.55, -0.08], [0.54, -0.05], [0.46, -0.05], [0.38, -0.052], [0.3, -0.054],
      [0.21, -0.03], [0.15, 0.04], [0.11, 0.12], [0.085, 0.2], [0.065, 0.27], [0.035, 0.33], [-0.01, 0.36], [-0.1, 0.38], [-0.27, 0.39], [-0.42, 0.38]],
  ],
};
checkViews("fringe", FRINGE);

const CRANIUM: V3 = [0, 0.6, -0.04];

// the bowl cut as a 3D shell round the cranium: a dome that falls straight to the jaw line and
// turns in at the ends (a mushroom), open in front of the face
const bowlShell = (h: HeadCtx): P[] => {
  const pts: P[] = [], C = CRANIUM, top = 0.51, bottom = 0.34;
  for (let i = 0; i <= 12; i++) for (let j = 0; j < 24; j++) {
    const v = i / 12, yl = C[1] + top - v * (top + bottom), th = (j / 24) * Math.PI * 2;
    if (Math.cos(th) > 0.5 && yl < 0.66) continue; // leave the face open
    const below = Math.max(0, C[1] - yl) / bottom;
    const r = yl >= C[1] ? Math.sqrt(Math.max(0, 1 - ((yl - C[1]) / (top + 0.03)) ** 2)) * 0.5 : 0.5 + 0.03 * Math.sin(Math.PI * Math.min(1, below) * 0.85);
    const q = h.M([C[0] + Math.sin(th) * r, yl, C[2] + Math.cos(th) * r * 1.03]), pq = project(h.cam, q); pts.push([pq.x, pq.y]);
  }
  return ccw(hull(pts));
};

// ---------------------------------------------------------------- the fish clip, lying on the hair
// A flat drawing on the surface over her right temple: (u, v) in head units, u toward her face.
const FISH: [number, number][] = [[0.105, 0], [0.08, 0.034], [0.035, 0.05], [-0.015, 0.046], [-0.06, 0.022], [-0.12, 0.056], [-0.104, 0], [-0.12, -0.056], [-0.06, -0.022], [-0.015, -0.046], [0.035, -0.05], [0.08, -0.034]];
const CLIP_AT: V3 = [-0.4, 0.72, 0.25], CLIP_N: V3 = norm([-0.8, 0.22, 0.56]), CLIP_TILT = 22 * DEG;
const clipAxes = () => { const eu = norm(sub([0, 0, 1], mul(CLIP_N, CLIP_N[2]))); let ev = cross(CLIP_N, eu); if (ev[1] < 0) ev = mul(ev, -1); return { eu, ev }; };
const fishClip = (h: HeadCtx, depth: number): Part | null => {
  const at = add(CLIP_AT, mul(CLIP_N, 0.035)), w = h.M(at), facing = dot(mv(h.f.R, CLIP_N), norm(sub(h.cam.eye, w)));
  if (facing < 0.05) return null;
  const { eu, ev } = clipAxes(), c = Math.cos(CLIP_TILT), s = Math.sin(CLIP_TILT), K = 1.15;
  const P2 = (u: number, v: number): P => { const uu = (u * c - v * s) * K, vv = (u * s + v * c) * K, q = project(h.cam, h.M(add(at, add(mul(eu, uu), mul(ev, vv))))); return [q.x, q.y]; };
  const px = project(h.cam, w).s * h.hh, lw = Math.max(0.9, px * 0.012);
  const marks: Mark[] = [
    { kind: "dot", at: P2(0.06, 0.012), rx: Math.max(1, px * 0.011 * facing), ry: Math.max(1, px * 0.011), rot: 0, role: "line" },
    { kind: "line", pts: [P2(0.025, 0.036), P2(0.012, 0), P2(0.025, -0.036)], role: "line", w: lw, alpha: 0.8 },          // the gill
    { kind: "line", pts: [P2(-0.03, 0.025), P2(-0.04, 0), P2(-0.03, -0.025)], role: "line", w: lw * 0.8, alpha: 0.55 },   // a scale
    { kind: "line", pts: [P2(0.07, 0.03), P2(0.02, 0.04), P2(-0.03, 0.034)], role: "white", w: lw * 1.2, alpha: 0.7 },  // the plastic's glint
  ];
  return { id: "fishClip", role: "clip", depth, polys: [ccw(FISH.map(([u, v]) => P2(u, v)))], size: px * 0.05, marks, over: ["hairBack", "hairFront", "head", "earL", "earR"], feature: "fishClip" };
};

// ---------------------------------------------------------------- freckles and the gap tooth
const FRECKLES: [number, number][] = [[0.15, 0.3], [0.185, 0.335], [0.22, 0.305], [0.2, 0.275], [0.255, 0.34], [0.165, 0.36], [0.24, 0.27]];
const freckles = (h: HeadCtx, depth: number): Part => {
  const marks: Mark[] = [];
  [-1, 1].forEach((s) => FRECKLES.forEach(([x, y], i) => {
    const f = onFace(h, s * (x + (s < 0 ? 0.006 * (i % 2) : 0)), y); if (f.facing < 0.25) return;
    const k = project(h.cam, f.world).s * h.hh, r = (0.0105 + 0.002 * ((i * 7) % 3)) * k;
    marks.push({ kind: "dot", at: f.p, rx: r * f.facing, ry: r, rot: 0, role: "freckle", alpha: 0.85 });
  }));
  return { id: "freckles", role: "freckle", depth, polys: [], size: 1, marks, outline: false, fill: false, over: ["head"], feature: "freckles" };
};
// The upper teeth hang from the top lip of the open mouth (the same curve head.ts draws), in two
// runs with the gap between them: her first front tooth on her left has fallen out.
const teeth = (h: HeadCtx, ex: Record<string, number>, depth: number): Part | null => {
  const S = h.spec, E = (k: string) => ex[k] ?? 0, sm = E("smile"), op = Math.max(0, E("mouthOpen"));
  if (op < 0.08 || onFace(h, 0, S.mouthY).facing < 0.1) return null;
  const mw = S.mouthW * (1 + E("mouthWide") * 0.35 + Math.max(0, sm) * 0.15), top = (t: number) => S.mouthY + sm * 0.032 * t * t + op * 0.012, tall = Math.min(0.028, 0.012 + op * 0.04);
  const band = (t0: number, t1: number): P[] | null => {
    const n = 6, ts = Array.from({ length: n + 1 }, (_, i) => t0 + ((t1 - t0) * i) / n);
    const pts = [...ts.map((t) => [t * mw, top(t) - 0.002] as [number, number]), ...ts.slice().reverse().map((t) => [t * mw, top(t) - tall * (1 - 0.35 * t * t)] as [number, number])].map(([x, y]) => onFace(h, x, y));
    return pts.every((q) => q.facing > 0.08) ? pts.map((q) => q.p) : null;
  };
  const marks: Mark[] = [], px = project(h.cam, h.M([0, S.mouthY, 0.4])).s * h.hh, lw = Math.max(0.6, px * 0.006);
  [band(-0.74, 0.02), band(0.3, 0.74)].forEach((b) => { if (b) marks.push({ kind: "fill", pts: b, role: "white", line: lw }); });
  // the join between the two front teeth on her right
  const j = [onFace(h, -0.3 * mw, top(-0.3) - 0.002), onFace(h, -0.3 * mw, top(-0.3) - tall * 0.8)];
  if (j.every((q) => q.facing > 0.08)) marks.push({ kind: "line", pts: j.map((q) => q.p), role: "line", w: lw, alpha: 0.6 });
  return marks.length ? { id: "teeth", role: "white", depth, polys: [], size: 1, marks, outline: false, fill: false, over: ["head", "freckles"], feature: "gapTooth" } : null;
};

// ---------------------------------------------------------------- the canvas bag and its lunchbox
const bagFrame = (r: Rig, swing: number): Frame => {
  // hangs on her RIGHT hip from the strap, broad face turned out and forward, swinging on the strap
  const P0 = r.pelvis, hh = r.dims.hh, hang = apply(P0, [-0.5 * hh, 0.12 * hh, 0.15 * hh]);
  const R = mm(P0.R, mm(ry(-138 * DEG), rz(swing * DEG * 0.35)));
  return { p: add(hang, mv(R, [0, -0.3 * hh, 0])), R };
};
const bag = (r: Rig, cam: Camera, swing: number): { bag: BlobPart; box: BlobPart } => {
  const hh = r.dims.hh, F = bagFrame(r, swing), c = 0.075 * hh, W = 0.27 * hh, H = 0.21 * hh, T = 0.07 * hh;
  const corners: Blob[] = [];
  for (const x of [-1, 1]) for (const y of [-1, 1]) for (const z of [-1, 1]) corners.push({ c: apply(F, [x * (T - c * 0.4), y * (H - c), z * (W - c)]), R: F.R, r: [c, c, c] });
  const marks: Mark[] = [], face = mv(F.R, [1, 0, 0]), faceOn = dot(face, norm(sub(cam.eye, F.p)));
  const P2 = (l: V3): P => { const q = project(cam, apply(F, l)); return [q.x, q.y]; };
  if (faceOn > 0.05) {
    // a soft flap over the top half, rounded at the bottom, and its wooden toggle button
    const x = T + 0.006 * hh, flap: P[] = [P2([x, H * 0.95, -W * 0.92]), P2([x, H * 0.95, W * 0.92]), P2([x, H * 0.05, W * 0.9]), P2([x, -H * 0.18, W * 0.55]), P2([x, -H * 0.26, 0]), P2([x, -H * 0.18, -W * 0.55]), P2([x, H * 0.05, -W * 0.9])];
    marks.push({ kind: "fill", pts: flap, role: "bagDark", line: 1.1 });
    const b = P2([x + 0.006 * hh, -H * 0.16, 0]), k = project(cam, F.p).s * hh;
    marks.push({ kind: "dot", at: b, rx: 0.035 * k * Math.max(0.4, faceOn), ry: 0.035 * k, rot: 0, role: "button" });
    // running stitches round the flap
    marks.push({ kind: "line", pts: [P2([x, H * 0.02, W * 0.78]), P2([x, -H * 0.12, W * 0.45]), P2([x, -H * 0.16, 0]), P2([x, -H * 0.12, -W * 0.45]), P2([x, H * 0.02, -W * 0.78])], role: "line", w: 0.8, alpha: 0.35 });
  }
  // the lunchbox, standing in the bag: its lid shows above the opening
  const bc: Blob[] = [], bw = W * 0.72, bt = T * 0.55, b0 = H * 0.3, b1 = H + 0.075 * hh, bcR = 0.03 * hh;
  for (const x of [-1, 1]) for (const y of [b0, b1]) for (const z of [-1, 1]) bc.push({ c: apply(F, [x * (bt - bcR * 0.5), y - (y === b1 ? bcR : -bcR), z * (bw - bcR) - W * 0.12]), R: F.R, r: [bcR, bcR, bcR] });
  const lidLine = (cam2: Camera): Mark[] => { const q = (l: V3): P => { const p = project(cam2, apply(F, l)); return [p.x, p.y]; }; return [{ kind: "line", pts: [q([bt + 0.004 * hh, b1 - 0.045 * hh, -bw - W * 0.12]), q([bt + 0.004 * hh, b1 - 0.045 * hh, bw - W * 0.12])], role: "line", w: 1, alpha: 0.6 }]; };
  return {
    bag: { id: "bag", role: "bag", groups: [{ blobs: corners, mode: "hull" }], marks, over: [], feature: "lunchBag", depthBias: -0.05 * hh },
    box: { id: "lunchbox", role: "lunchbox", groups: [{ blobs: bc, mode: "hull" }], depthBias: 0.02 * hh, marksFn: lidLine },
  };
};

// the strap: a line ON the shirt's surface, over her left shoulder, across the chest to the right hip
const surf = (r: Rig, cam: Camera, pts: ["chest" | "lumbar" | "pelvis", V3][], lift: number) => pts.map(([fn, l]) => {
  const hh = r.dims.hh, f = r[fn] as Frame, rad = Math.hypot(l[0], l[2]) || 1, local: V3 = [l[0] * hh * (1 + lift / rad), l[1] * hh, l[2] * hh * (1 + lift / rad)];
  const w = apply(f, local), n = norm(mv(f.R, [l[0], 0, l[2]])), q = project(cam, w);
  return { p: [q.x, q.y] as P, vis: dot(n, norm(sub(cam.eye, w))) > 0.15 };   // the strap sits ON the shirt (a small lift): lifted further it stood out of the outline edge-on
});
// a strap run needs three points: a two-point stub at the silhouette inks as a spike
// and where the strap turns edge-on its projection doubles back: split the run at every reversal
const runsOf = (s: { p: P; vis: boolean }[]): P[][] => {
  const o: P[][] = []; let c: P[] = [];
  const flush = () => { if (c.length > 2) o.push(c); c = []; };
  s.forEach((q) => {
    if (!q.vis) { flush(); return; }
    if (c.length >= 2) { const a = c[c.length - 2], b = c[c.length - 1], d1 = [b[0] - a[0], b[1] - a[1]], d2 = [q.p[0] - b[0], q.p[1] - b[1]]; if (d1[0] * d2[0] + d1[1] * d2[1] < 0.3 * Math.hypot(...d1) * Math.hypot(...d2)) { flush(); c = [b]; } }
    c.push(q.p);
  });
  flush();
  return o;
};
const strapMarks = (r: Rig, cam: Camera, px: number): Mark[] => {
  const w = Math.max(1, px * 0.02), m: Mark[] = [];
  const front = surf(r, cam, [["chest", [0.4, 0.84, 0.0]], ["chest", [0.38, 0.8, 0.14]], ["chest", [0.27, 0.62, 0.3]], ["chest", [0.08, 0.44, 0.35]], ["chest", [-0.12, 0.26, 0.36]], ["lumbar", [-0.3, 0.12, 0.31]], ["pelvis", [-0.42, 0.04, 0.22]]], 0.03);
  const back = surf(r, cam, [["chest", [0.4, 0.84, -0.02]], ["chest", [0.36, 0.78, -0.16]], ["chest", [0.24, 0.6, -0.3]], ["chest", [0.02, 0.42, -0.33]], ["chest", [-0.18, 0.24, -0.32]], ["lumbar", [-0.34, 0.12, -0.25]], ["pelvis", [-0.46, 0.04, -0.12]]], 0.03);
  // a diagonal strap is about as wide as it is tall on screen; edge-on (side views) it is a thin
  // vertical sliver along the silhouette, which reads as a spike: leave those out
  const sliver = (p: P[]) => { const xs = p.map((q) => q[0]), ys = p.map((q) => q[1]); return Math.max(...xs) - Math.min(...xs) < 0.25 * (Math.max(...ys) - Math.min(...ys)); };
  [...runsOf(front), ...runsOf(back)].filter((p) => !sliver(p)).forEach((p) => { m.push({ kind: "line", pts: p, role: "line", w: w * 4.4 }); m.push({ kind: "line", pts: p, role: "bag", w: w * 3.1 }); });
  return m;
};

// ---------------------------------------------------------------- the crew neck: a ribbed band round the neck
const collar = (r: Rig): BlobPart => {
  const hh = r.dims.hh, ring: Blob[] = Array.from({ length: 13 }, (_, i) => { const a = (i / 12) * Math.PI * 2; return blob(r, ["chest", [Math.sin(a) * 0.19, 0.83 + Math.cos(a) * 0.02, -0.04 + Math.cos(a) * 0.16], [0.042, 0.045, 0.042]], "L"); });
  return { id: "collar", role: "shirtRib", groups: [{ blobs: ring, mode: "chain" }], over: ["neck", "shirt"], depthAt: apply(r.chest, [0, 0.8 * hh, 0.1 * hh]) };
};

const FACE = { line: "line", pupil: "pupil", white: "white", blush: "blush", brow: "brow", mouth: "mouth", lip: "lip" };

export const boScene = (p: Pose, cam: Camera): Scene => {
  const b = build(BO_SPEC, p, cam), r = b.rig, hh = r.dims.hh, h = b.head, aux = p.aux ?? {};
  // the body under the clothes is the invisible pose source: what is SEEN of her shirt, shorts,
  // legs and wellies is DRAWN (drawn.ts). Her arms, hands, neck and head are her own volumes.
  const hidden = new Set(["torso", "hips", "thighL", "thighR", "shinL", "shinR", "footL", "footR"]);
  b.parts = b.parts.filter((q) => !hidden.has(q.id));
  b.parts.push(collar(r));
  const bg = bag(r, cam, aux.bagSwing ?? 0);
  // the bag paints over her clothes only on the side it hangs; from her left it is behind her
  const bagSide = dot(norm(sub(bagFrame(r, 0).p, r.joints.pelvis)), norm(sub(cam.eye, r.joints.pelvis)));
  bg.bag.over = bagSide > -0.15 ? ["shirt", "shorts", "lunchbox", "legR"] : ["lunchbox"];
  b.parts.push(bg.bag, bg.box);
  const px = project(cam, r.joints.chest).s * hh;
  return assemble(cam, b, p, FACE, { character: "moworks-bo", version: BO_VERSION }, (parts) => {
    const drawn = drawnBo(r, cam), head = parts.find((q) => q.id === "head")!, shirt = drawn.find((q) => q.id === "shirt")!, vw = viewOf(cam, h.f);
    shirt.marks.push(...strapMarks(r, cam, px));
    const face = Math.abs(vw.yaw) < 105, hd = head.depth, out: Part[] = [];
    const shell = bowlShell(h);
    out.push({ id: "hairBack", role: "hair", depth: face ? hd + 0.35 * hh : hd - 0.06 * hh, polys: [shell], size: head.size * 1.1, marks: [], over: face ? [] : ["head", "earL", "earR", "neck", "collar"], feature: "bowlCut" });
    if (face) {
      const fr = place25d(cam, h.f, [0, CRANIUM[1] - BO_HEAD.pivot[1], CRANIUM[2] - BO_HEAD.pivot[2]].map((v) => v * hh) as V3, hh, FRINGE, { pitchShift: 0.1 });
      out.push({ id: "hairFront", role: "hair", depth: hd - 0.02 * hh, polys: [ccw(fr.pts)], size: head.size, marks: [], over: ["head", "earL", "earR"], feature: "bluntFringe" });
    }
    out.push(freckles(h, hd - 0.005 * hh));
    const t = teeth(h, p.expression, hd - 0.006 * hh); if (t) out.push(t);
    const fc = fishClip(h, hd - 0.04 * hh); if (fc) out.push(fc);
    out.push(...drawn);
    return out;
  });
};

export const bo: Character = {
  id: "moworks-bo", name: "Bơ", version: BO_VERSION, canonId: BO_CANON.id,
  description: "Bơ, seven, small and quick, 5.0 heads (declared stylisation), 1.15 m: black bowl cut with a blunt fringe, a red fish hair clip, freckled round cheeks, big curious eyes, a gap-toothed grin, coral-red T-shirt, navy shorts, oversized banana-green wellies, a cream canvas lunch bag across the body.",
  roles: BO_ROLES, features: BO_FEATURES,
  pose: (p: Pose) => { checkPose(p, "bo"); return p; },
  toScene: (p: Pose, cam: Camera) => boScene(p, cam),
};
export { BO_CANON, BO_HEAD, BO_SPEC, BO_REAL_HEADS, BO_EXPRESSIONS } from "./spec";
export { BO_DIMS, relaxed, wave, handsOnHips, tiptoeReach, walkContact, BO_GRIN } from "./poses";
export { BO_MARKER } from "./palettes";
