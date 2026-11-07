// BƠ, DRAWN. Her T-shirt, shorts, legs and wellies as DESIGNED masses: an authored cross-section
// table swept along the gesture curve through her joints. The rig only says where the curve goes;
// the shape is these numbers, placed by hand (head units: lateral, medial, front, back).
//
// Shape language: the T-shirt is a short box, a touch A-line, wider than the narrow child under it;
// the short sleeves stand off the thin arms like bells; the shorts are a block with two wide leg
// openings; the legs are a seven-year-old's, thin, straight in front, knees barely there; the
// wellies are stiff cylinders VISIBLY wider than the shin inside them (a size too big), on round,
// stubby toes. Big (shirt), medium (wellies, shorts), small (clip, bag, hands).
import type { P } from "anidoodle/canvas-core/core";
import type { Camera, V3 } from "anidoodle/canvas-core/character/math3";
import { apply, dot, mv, norm, project, sub } from "anidoodle/canvas-core/character/math3";
import { type Section, type Station, jointed, station, stationU, sweep } from "anidoodle/canvas-core/character/design";
import type { Mark, Part } from "anidoodle/canvas-core/character/types";
import { type Rig, SIDES, sgn } from "anidoodle/canvas-core/character/human/skeleton";

// ---- the T-shirt: hem (0) to collar (1)
const SHIRT: Section[] = [
  [0, 0.5, 0.5, 0.38, 0.36], [0.1, 0.49, 0.49, 0.37, 0.35], [0.3, 0.455, 0.455, 0.35, 0.33], [0.55, 0.465, 0.465, 0.345, 0.32],
  [0.8, 0.5, 0.5, 0.32, 0.3], [0.9, 0.49, 0.49, 0.28, 0.27], [0.95, 0.34, 0.34, 0.22, 0.22], [1, 0.2, 0.2, 0.17, 0.17],
];
// ---- a short sleeve: shoulder (0) to hem (1); it bells away from the thin arm
const SLEEVE: Section[] = [[0, 0.11, 0.09, 0.12, 0.12], [0.25, 0.175, 0.15, 0.175, 0.17], [0.65, 0.17, 0.15, 0.165, 0.165], [1, 0.17, 0.155, 0.165, 0.165]];
// ---- the shorts: crotch (0) up to the waistband (1); and a leg opening down the thigh
const SHORTS: Section[] = [[0, 0.3, 0.3, 0.28, 0.3], [0.3, 0.47, 0.47, 0.36, 0.39], [1, 0.46, 0.46, 0.35, 0.35]];
const SHORT_LEG: Section[] = [[0, 0.26, 0.22, 0.27, 0.29], [0.6, 0.255, 0.22, 0.245, 0.255], [1, 0.255, 0.23, 0.245, 0.245]];
// ---- a bare leg: hip (0) to ankle (1): thin, a soft knee near the middle, the calf barely there
const LEG: Section[] = [[0, 0.2, 0.18, 0.2, 0.22], [0.28, 0.165, 0.15, 0.165, 0.175], [0.46, 0.13, 0.12, 0.14, 0.12], [0.51, 0.125, 0.118, 0.14, 0.115], [0.6, 0.13, 0.12, 0.112, 0.145], [0.72, 0.115, 0.108, 0.1, 0.125], [0.9, 0.085, 0.08, 0.08, 0.08], [1, 0.075, 0.075, 0.075, 0.075]];
// ---- a welly: shaft top (0) down to the ankle (1), then the foot from heel (0) to toe (1)
const SHAFT: Section[] = [[0, 0.195, 0.195, 0.195, 0.195], [0.1, 0.182, 0.182, 0.182, 0.182], [0.7, 0.155, 0.155, 0.155, 0.16], [1, 0.145, 0.145, 0.145, 0.145]];
const FOOT: Section[] = [[0, 0.14, 0.14, 0.12, 0.12], [0.35, 0.15, 0.15, 0.115, 0.115], [0.75, 0.15, 0.15, 0.095, 0.095], [1, 0.115, 0.115, 0.07, 0.07]];   // as wide as the shaft: one rubber boot, not a ball under a tube
const BOOT_TOP = 0.3; // the shaft starts this far down the shin (fraction): tall wellies, just under the knee

const part = (id: string, role: string, polys: P[][], cam: Camera, at: V3, bias: number, o: Partial<Part> = {}): Part => {
  const q = project(cam, at); return { id, role, depth: q.z + bias, polys, size: q.s * 0.12, marks: [], ...o };
};
const pt = (cam: Camera, v: V3): P => { const q = project(cam, v); return [q.x, q.y]; };

export const drawnBo = (r: Rig, cam: Camera): Part[] => {
  const hh = r.dims.hh, out: Part[] = [];
  // the shirt's gesture: from a hem just below the waist up the spine to the collar
  const shirtSt: Station[] = [station(r.pelvis, [0, -0.13 * hh, 0]), station(r.pelvis), station(r.lumbar), station(r.chest), station(r.chest, [0, 0.74 * hh, 0]), station(r.chest, [0, 0.86 * hh, -0.02 * hh])];
  out.push(part("shirt", "shirt", sweep(cam, shirtSt, SHIRT, { hh, side: 1, n: 12, caps: [true, false] }), cam, r.joints.lumbar, 0, { over: ["shorts", "legL", "legR"] }));
  // the shorts: the seat and the two leg openings, one part
  const shortsSt: Station[] = [station(r.pelvis, [0, -0.3 * hh, 0]), station(r.pelvis), station(r.lumbar, [0, 0.02 * hh, 0])];
  const shortsPolys = [...sweep(cam, shortsSt, SHORTS, { hh, side: 1, n: 8, caps: [false, false] })];
  for (const s of SIDES) { const k = sgn(s) as 1 | -1, lg: Station[] = [station(r.thigh[s], [0, 0.02 * hh, 0]), station(r.thigh[s], [0, -0.5 * r.dims.thigh, 0.01 * hh])]; shortsPolys.push(...sweep(cam, lg, SHORT_LEG, { hh, side: k, n: 8 })); }
  out.push(part("shorts", "shorts", shortsPolys, cam, r.joints.pelvis, -0.01 * hh, { over: ["legL", "legR"], marks: shortsMarks(r, cam) }));
  for (const s of SIDES) {
    const k = sgn(s) as 1 | -1;
    // the short sleeve: from the shoulder seam to a hem 45% down the upper arm
    const sl: Station[] = [station(r.upper[s], [-k * 0.03 * hh, 0.02 * hh, 0]), station(r.upper[s], [0, -0.45 * r.dims.upperArm, 0])];
    out.push(part("sleeve" + s, "shirt", sweep(cam, sl, SLEEVE, { hh, side: k, n: 8 }), cam, r.joints["shoulder" + s], -0.07 * hh, { over: ["upperArm" + s], seams: [{ at: pt(cam, r.joints["shoulder" + s]), r: 0.24 * hh * project(cam, r.joints["shoulder" + s]).s, with: "shirt" }] }));
    // the bare leg: hip, knee, ankle
    const lg: Station[] = [station(r.thigh[s]), station(r.shin[s]), station(r.foot[s])];
    out.push(part("leg" + s, "skin", jointed(cam, lg, LEG, { hh, side: k, n: 10, cuts: [stationU(lg, 1)] }), cam, r.joints["knee" + s], -0.02 * hh));
    // the welly: the shaft from just under the knee to the ankle, and the foot from heel to toe, one part
    const sh: Station[] = [station(r.shin[s], [0, -BOOT_TOP * r.dims.shin, 0]), station(r.foot[s], [0, 0.02 * hh, 0])];
    const ft: Station[] = [station(r.foot[s], [0, -0.1 * hh, -0.1 * hh]), station(r.foot[s], [0, -0.105 * hh, 0.14 * hh]), station(r.toes[s], [0, 0.03 * hh, 0.12 * hh])];
    out.push(part("boot" + s, "boots", [...sweep(cam, sh, SHAFT, { hh, side: k, n: 8, caps: [true, false] }), ...sweep(cam, ft, FOOT, { hh, side: k, n: 8 })], cam, apply(r.foot[s], [0, 0, 0.05 * hh]), -0.025 * hh, { over: ["leg" + s], feature: "wellies", marks: bootMarks(r, cam, s) }));
  }
  return out;
};

// the welly's mouth: seen from above, the dark inside and the thin shin standing in it with room
// to spare; from any side, a rolled rim and a sole stripe
const bootMarks = (r: Rig, cam: Camera, s: "L" | "R"): Mark[] => {
  const hh = r.dims.hh, S = r.shin[s], top = apply(S, [0, -BOOT_TOP * r.dims.shin, 0]), up = norm(mv(S.R, [0, 1, 0])), see = dot(up, norm(sub(cam.eye, top)));
  const ring = (rad: number, dy = 0) => Array.from({ length: 24 }, (_, i) => { const a = (i / 24) * Math.PI * 2; return pt(cam, apply(S, [Math.cos(a) * rad * hh, -BOOT_TOP * r.dims.shin + dy * hh, Math.sin(a) * rad * hh])); });
  const px = project(cam, top).s * hh, w = Math.max(1, px * 0.018), m: Mark[] = [];
  if (see > 0.04) { m.push({ kind: "fill", pts: ring(0.18), role: "bootIn" }); m.push({ kind: "fill", pts: ring(0.115, 0.02), role: "skin", line: w * 0.6 }); }
  // the rolled rim: the front half of a ring a little below the top
  const front = Array.from({ length: 13 }, (_, i) => { const a = Math.PI * (i / 12), l: V3 = [Math.cos(a) * 0.196 * hh, -BOOT_TOP * r.dims.shin - 0.05 * hh, Math.sin(a) * 0.196 * hh], wpt = apply(S, l), n = norm(mv(S.R, [Math.cos(a), 0, Math.sin(a)])); return { p: pt(cam, wpt), vis: dot(n, norm(sub(cam.eye, wpt))) > 0.05 }; });
  const all = [...front, ...Array.from({ length: 13 }, (_, i) => { const a = Math.PI * (1 + i / 12), l: V3 = [Math.cos(a) * 0.196 * hh, -BOOT_TOP * r.dims.shin - 0.05 * hh, Math.sin(a) * 0.196 * hh], wpt = apply(S, l), n = norm(mv(S.R, [Math.cos(a), 0, Math.sin(a)])); return { p: pt(cam, wpt), vis: dot(n, norm(sub(cam.eye, wpt))) > 0.05 }; })];
  let cur: P[] = []; all.forEach((q) => { if (q.vis) cur.push(q.p); else { if (cur.length > 1) m.push({ kind: "line", pts: cur, role: "bootDark", w: w * 1.3 }); cur = []; } }); if (cur.length > 1) m.push({ kind: "line", pts: cur, role: "bootDark", w: w * 1.3 });
  return m;
};

// the shorts: a waistband line and a centre seam, where the camera sees them
const shortsMarks = (r: Rig, cam: Camera): Mark[] => {
  const hh = r.dims.hh, P0 = r.pelvis, px = project(cam, P0.p).s * hh, w = Math.max(0.8, px * 0.012), m: Mark[] = [];
  const seen = (l: V3) => { const wpt = apply(P0, [l[0] * hh, l[1] * hh, l[2] * hh]), n = norm(mv(P0.R, [l[0], 0, l[2]])); return { p: pt(cam, wpt), vis: dot(n, norm(sub(cam.eye, wpt))) > 0.15 }; };
  [[0, -0.05, 0.37], [0, -0.17, 0.36], [0, -0.27, 0.3]].reduce<P[]>((acc, l) => { const q = seen(l as V3); if (q.vis) acc.push(q.p); return acc; }, []).forEach((_, i, arr) => { if (i === arr.length - 1 && arr.length > 1) m.push({ kind: "line", pts: arr, role: "line", w, alpha: 0.55 }); });
  return m;
};
