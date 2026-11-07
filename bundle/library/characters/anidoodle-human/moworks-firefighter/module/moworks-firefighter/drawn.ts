// THE FIREFIGHTER, DRAWN. Turnout gear as DESIGNED masses: authored cross-section tables swept
// along the gesture curves through the rig (character/design.ts). The rig only says where the
// curve goes; the shape is these numbers (head units: lateral, medial, front, back).
//
// Shape language: the turnout coat is a BOX, the one big shape: square shoulders, straight sides
// that barely taper to the waist, a hem that stands off the thighs at mid-thigh. Sleeves are wide
// stiff tubes with the weight of the fabric breaking at the elbow; the trousers are just as stiff
// and bell over the boot tops. Boots are heavy black cylinders on a broad, flat-soled foot. Big
// (coat), medium (trousers, sleeves, boots), small (gloves, bands, clasps).
//
// Reference opened: NFPA 1971 structural turnout ensembles (coat to mid-thigh, storm flap with
// hook-and-dee clasps, bellows pockets on the hips, "triple trim" reflective tape: lime-yellow /
// silver / lime-yellow, round the coat hem, the chest, both sleeves at the wrist and the trouser cuffs).
import type { P } from "anidoodle/canvas-core/core";
import { type Camera, type V3, add, apply, cross, dot, mix3, mul, norm, project, sub } from "anidoodle/canvas-core/character/math3";
import { type Section, type Station, curve, jointed, sectionAt, station, stationU, sweep } from "anidoodle/canvas-core/character/design";
import type { Mark, Part } from "anidoodle/canvas-core/character/types";
import { type Rig, SIDES, sgn } from "anidoodle/canvas-core/character/human/skeleton";

// ---- the coat: hem (0) to the collar seam (1). Square at the shoulders, never sloping to a point.
export const COAT: Section[] = [
  [0, 0.8, 0.8, 0.54, 0.56], [0.16, 0.76, 0.76, 0.52, 0.54], [0.33, 0.71, 0.71, 0.5, 0.52], [0.45, 0.69, 0.69, 0.49, 0.47], [0.61, 0.73, 0.73, 0.51, 0.46],
  [0.8, 0.76, 0.76, 0.5, 0.45], [0.9, 0.68, 0.68, 0.46, 0.43], [0.96, 0.52, 0.52, 0.37, 0.36], [1, 0.36, 0.36, 0.3, 0.3],   // square, but the shoulder rolls into the sleeve cap: no shelf past it
];
// ---- a sleeve: shoulder (0) to wrist (1); thick fabric, the cap rounds over the shoulder
export const SLEEVE: Section[] = [[0, 0.17, 0.15, 0.2, 0.2], [0.1, 0.27, 0.22, 0.27, 0.26], [0.3, 0.27, 0.23, 0.26, 0.25], [0.55, 0.24, 0.22, 0.24, 0.24], [0.8, 0.22, 0.21, 0.22, 0.22], [1, 0.23, 0.23, 0.23, 0.23]];
// ---- the gauntlet of the glove: over the sleeve end, narrowing to the wrist
const GAUNTLET: Section[] = [[0, 0.25, 0.24, 0.24, 0.24], [0.4, 0.21, 0.2, 0.19, 0.19], [1, 0.15, 0.14, 0.12, 0.12]];
// ---- a trouser leg: hip (0) to the cuff (1), belling over the boot
export const TROUSER: Section[] = [[0, 0.4, 0.34, 0.38, 0.42], [0.3, 0.35, 0.31, 0.34, 0.35], [0.52, 0.3, 0.27, 0.3, 0.28], [0.75, 0.28, 0.27, 0.27, 0.28], [0.92, 0.3, 0.3, 0.3, 0.3], [1, 0.31, 0.31, 0.31, 0.31]];
// ---- a boot: the shaft from mid-shin (0) to the ankle (1), then the foot heel (0) to toe (1)
const SHAFT: Section[] = [[0, 0.22, 0.22, 0.22, 0.22], [1, 0.19, 0.19, 0.19, 0.19]];
const FOOT: Section[] = [[0, 0.17, 0.17, 0.15, 0.15], [0.45, 0.2, 0.2, 0.14, 0.14], [0.85, 0.2, 0.2, 0.125, 0.125], [1, 0.16, 0.16, 0.09, 0.09]];
const SOLE: Section[] = [[0, 0.19, 0.19, 0.04, 0.04], [0.5, 0.215, 0.215, 0.04, 0.04], [0.9, 0.2, 0.2, 0.04, 0.04], [1, 0.16, 0.16, 0.035, 0.035]];
const COLLAR: Section[] = [[0, 0.4, 0.4, 0.36, 0.34], [0.5, 0.36, 0.36, 0.33, 0.31], [1, 0.35, 0.35, 0.32, 0.3]];

const P2 = (cam: Camera, v: V3): P => { const q = project(cam, v); return [q.x, q.y]; };
const mk = (id: string, role: string, polys: P[][], cam: Camera, at: V3, bias: number, o: Partial<Part> = {}): Part => { const q = project(cam, at); return { id, role, depth: q.z + bias, polys, size: q.s * 0.14, marks: [], ...o }; };

// ---- the surface of a sweep: at station u, a point at angle a round the section (0 lateral,
// pi/2 front, pi medial, 3pi/2 back) and its outward normal, on the SAME curve the sweep drew
type SweepO = { hh: number; side: 1 | -1; n: number };
export const ringOn = (st: Station[], tab: Section[], o: SweepO, u: number) => {
  const c = curve(st, o.n); let i = 0;
  while (i < c.us.length - 2 && c.us[i + 1] < u) i++;
  const j = i + 1, t = Math.max(0, Math.min(1, (u - c.us[i]) / ((c.us[j] - c.us[i]) || 1)));
  const p = mix3(c.pts[i], c.pts[j], t), T = norm(sub(c.pts[j], c.pts[i]));
  const xs = norm(mix3(c.xs[i], c.xs[j], t)), zs = norm(mix3(c.zs[i], c.zs[j], t));
  const X = norm(sub(xs, mul(T, dot(xs, T)))), Z0 = norm(cross(X, T)), Z = dot(Z0, zs) >= 0 ? Z0 : mul(Z0, -1);
  const [lat, med, fr, bk] = sectionAt(tab, u).map((v) => v * o.hh);
  return (a: number, lift = 0): { w: V3; n: V3 } => {
    const cx = Math.cos(a), sz = Math.sin(a), rx = cx >= 0 ? lat : med, rz = sz >= 0 ? fr : bk;
    return { w: add(p, add(mul(X, o.side * cx * (rx + lift)), mul(Z, sz * (rz + lift)))), n: norm(add(mul(X, (o.side * cx) / rx), mul(Z, sz / rz))) };
  };
};
const facing = (cam: Camera, s: { w: V3; n: V3 }) => dot(s.n, norm(sub(cam.eye, s.w)));
// the visible runs of a polyline on a surface
const runs = (cam: Camera, pts: { w: V3; n: V3 }[], min = 0.05): P[][] => {
  const out: P[][] = []; let cur: P[] = [];
  pts.forEach((s) => { if (facing(cam, s) > min) cur.push(P2(cam, s.w)); else { if (cur.length > 1) out.push(cur); cur = []; } });
  if (cur.length > 1) out.push(cur);
  return out;
};

// A band of tape round a sweep at u, `half` metres either side: the strip as polygons over the
// visible arc, each run carried one sample past the limb so it reaches the silhouette.
export const bandOn = (cam: Camera, st: Station[], tab: Section[], o: SweepO, u: number, half: number, lift: number) => {
  const du = half / curve(st, o.n).len, N = 48, A = (k: number) => (k / N) * Math.PI * 2;
  const mid = ringOn(st, tab, o, u), vis = Array.from({ length: N }, (_, k) => facing(cam, mid(A(k), lift)) > 0);
  const strip = (h: number): P[][] => {
    const top = ringOn(st, tab, o, u + du * h), bot = ringOn(st, tab, o, u - du * h), out: P[][] = [];
    if (vis.every(Boolean)) return [[...Array.from({ length: N + 1 }, (_, k) => P2(cam, top(A(k), lift).w)), ...Array.from({ length: N + 1 }, (_, k) => P2(cam, bot(A(N - k), lift).w))]];
    const s0 = vis.findIndex((v) => !v); let run: number[] = [];
    const flush = () => { if (run.length) { const ks = [run[0] - 1, ...run, run[run.length - 1] + 1]; out.push([...ks.map((k) => P2(cam, top(A(k), lift).w)), ...ks.slice().reverse().map((k) => P2(cam, bot(A(k), lift).w))]); } run = []; };
    for (let m = 1; m <= N; m++) { const k = s0 + m; if (vis[k % N]) run.push(k); else flush(); }
    flush();
    return out;
  };
  return { polys: strip(1), stripe: strip(0.3) };
};

// ---- the stations of every designed mass (shared by the sweeps and the surface marks)
export const coatStations = (r: Rig): Station[] => {
  const hh = r.dims.hh, C = r.chest;
  const knees = mix3(r.joints.kneeL, r.joints.kneeR, 0.5), hips = mix3(r.joints.hipL, r.joints.hipR, 0.5), hem = mix3(hips, knees, 0.42);
  return [{ at: hem, frame: r.pelvis }, station(r.pelvis), station(r.lumbar), station(C, [0, 0.45 * hh, 0]), station(C, [0, 1.0 * hh, 0]), station(C, [0, 1.22 * hh, -0.05 * hh])];
};
const sleeveStations = (r: Rig, s: "L" | "R"): Station[] => { const hh = r.dims.hh, k = sgn(s); return [station(r.upper[s], [-k * 0.03 * hh, -0.02 * hh, 0]), station(r.fore[s]), station(r.hand[s], [0, 0.05 * hh, 0])]; };
const legStations = (r: Rig, s: "L" | "R"): Station[] => [station(r.thigh[s]), station(r.shin[s]), station(r.shin[s], [0, -0.64 * r.dims.shin, 0])];

const BAND_HALF = 0.024;   // 2 in tape: 5 cm wide

export const drawnFirefighter = (r: Rig, cam: Camera): Part[] => {
  const hh = r.dims.hh, out: Part[] = [], C = r.chest, px = project(cam, r.joints.chest).s * hh, w = Math.max(0.9, px * 0.012);
  const tape = (id: string, host: Part, b: ReturnType<typeof bandOn>) => {
    if (!b.polys.length) return;
    out.push({ id, role: "band", depth: host.depth - 0.002, polys: b.polys.map((q) => q), size: host.size * 0.35, marks: b.stripe.map((q) => ({ kind: "fill", pts: q, role: "silver", alpha: 0.95 }) as Mark), over: [host.id], feature: "reflectiveBands" });
  };
  // ---- the coat
  const cs = coatStations(r), co: SweepO = { hh, side: 1, n: 12 };
  const coat = mk("coat", "coat", sweep(cam, cs, COAT, { ...co, caps: [true, false] }), cam, r.joints.lumbar, 0, { over: ["legL", "legR"], feature: "turnoutCoat" });
  coat.marks.push(...coatMarks(cam, cs, co, w));
  out.push(coat);
  tape("bandHem", coat, bandOn(cam, cs, COAT, co, 0.07, BAND_HALF, 0.006 * hh));
  tape("bandChest", coat, bandOn(cam, cs, COAT, co, 0.74, BAND_HALF, 0.006 * hh));
  // the stand-up collar, under the helmet's neck ring
  const cl: Station[] = [station(C, [0, 1.02 * hh, -0.05 * hh]), station(C, [0, 1.44 * hh, -0.03 * hh])];
  out.push(mk("collar", "coat", sweep(cam, cl, COLLAR, { hh, side: 1, n: 6, caps: [false, true] }), cam, apply(C, [0, 1.2 * hh, 0.1 * hh]), 0, { over: ["coat", "neck"] }));
  for (const s of SIDES) {
    const k = sgn(s) as 1 | -1;
    // sleeve: shoulder, elbow, wrist; cut at the elbow so a bent arm folds, never self-crosses
    const sl = sleeveStations(r, s), so: SweepO = { hh, side: k, n: 18 };
    const sleeve = mk("sleeve" + s, "coat", jointed(cam, sl, SLEEVE, { ...so, cuts: [stationU(sl, 1)] }), cam, r.joints["elbow" + s], -0.06 * hh, { seams: [{ at: P2(cam, r.joints["shoulder" + s]), r: 0.3 * hh * project(cam, r.joints["shoulder" + s]).s, with: "coat" }], feature: "turnoutCoat" });
    // the elbow break: two short folds in the crook, on whichever side faces us
    const eu = stationU(sl, 1), fold = (du: number, a0: number, a1: number) => { const rg = ringOn(sl, SLEEVE, so, eu + du); return runs(cam, Array.from({ length: 6 }, (_, i) => rg(a0 + ((a1 - a0) * i) / 5, 0.004 * hh)), 0.15); };
    [...fold(0.02, 1.2, 2.3), ...fold(-0.05, 1.35, 2.1)].forEach((pts) => sleeve.marks.push({ kind: "line", pts, role: "line", w: w * 0.9, alpha: 0.55 }));
    out.push(sleeve);
    tape("bandSleeve" + s, sleeve, bandOn(cam, sl, SLEEVE, so, 0.78, BAND_HALF, 0.006 * hh));
    // the glove's gauntlet over the sleeve end
    const ga: Station[] = [station(r.fore[s], [0, -0.8 * r.dims.forearm, 0]), station(r.hand[s], [0, -0.03 * hh, 0])];
    out.push(mk("glove" + s, "gloves", sweep(cam, ga, GAUNTLET, { hh, side: k, n: 6, caps: [true, false] }), cam, r.joints["wrist" + s], -0.075 * hh, { over: ["sleeve" + s, "bandSleeve" + s], feature: "gloves" }));
    // trouser leg: hip, knee, cuff; it bells over the boot top
    const lg = legStations(r, s), lo: SweepO = { hh, side: k, n: 18 };
    const leg = mk("leg" + s, "pants", jointed(cam, lg, TROUSER, { ...lo, cuts: [stationU(lg, 1)] }), cam, r.joints["knee" + s], -0.02 * hh, { over: ["boot" + s, "sole" + s] });
    out.push(leg);
    tape("bandLeg" + s, leg, bandOn(cam, lg, TROUSER, lo, 0.86, BAND_HALF, 0.006 * hh));
    // boot: the shaft from mid-shin to the ankle, and the foot from heel to toe, one part; a sole under it
    // the shaft runs on down INTO the foot (past the ankle to the instep), so shaft and foot are one boot, never two lumps
    const sh: Station[] = [station(r.shin[s], [0, -0.45 * r.dims.shin, 0]), station(r.foot[s], [0, -0.04 * hh, 0]), station(r.foot[s], [0, -0.17 * hh, 0.03 * hh])];
    const ft: Station[] = [station(r.foot[s], [0, -0.21 * hh, -0.2 * hh]), station(r.foot[s], [0, -0.21 * hh, 0.28 * hh]), station(r.toes[s], [0, -0.03 * hh, 0.17 * hh])];
    out.push(mk("boot" + s, "boots", [...sweep(cam, sh, SHAFT, { hh, side: k, n: 8, caps: [true, true] }), ...sweep(cam, ft, FOOT, { hh, side: k, n: 8 })], cam, apply(r.foot[s], [0, 0, 0.08 * hh]), -0.025 * hh, { feature: "boots" }));
    const so2: Station[] = [station(r.foot[s], [0, -0.325 * hh, -0.22 * hh]), station(r.foot[s], [0, -0.325 * hh, 0.3 * hh]), station(r.toes[s], [0, -0.05 * hh, 0.19 * hh])];
    out.push(mk("sole" + s, "sole", sweep(cam, so2, SOLE, { hh, side: k, n: 8 }), cam, apply(r.foot[s], [0, -0.3 * hh, 0.08 * hh]), -0.026 * hh, { over: ["boot" + s] }));
  }
  return out;
};

// ---- on the coat: the storm flap down the front, four hook-and-dee clasps across it, and the
// two bellows pockets on the hips with their flaps
const coatMarks = (cam: Camera, st: Station[], o: SweepO, w: number): Mark[] => {
  const m: Mark[] = [], hh = o.hh, lift = 0.008 * hh, U = (a: number, u0: number, u1: number, n = 14) => Array.from({ length: n }, (_, i) => ringOn(st, COAT, o, u0 + ((u1 - u0) * i) / (n - 1))(a, lift));
  const flapA = Math.PI / 2 - 0.2;
  runs(cam, U(flapA, 0.015, 0.965)).forEach((pts) => m.push({ kind: "line", pts, role: "line", w: w * 1.1, alpha: 0.85 }));
  [0.28, 0.4, 0.52, 0.62].forEach((u) => { const rg = ringOn(st, COAT, o, u); runs(cam, [rg(flapA - 0.02, lift * 1.5), rg(flapA + 0.2, lift * 1.5)], 0.1).forEach((pts) => m.push({ kind: "line", pts, role: "clasp", w: w * 3.4 })); });
  // the pockets: a box in (u, angle) on each hip, a flap across its top
  for (const [a0, a1] of [[0.32, 1.12], [Math.PI - 1.12, Math.PI - 0.32]]) {
    const u0 = 0.15, u1 = 0.34, edge = (pts: { w: V3; n: V3 }[]) => runs(cam, pts, 0.12).forEach((p) => m.push({ kind: "line", pts: p, role: "line", w: w * 0.95, alpha: 0.8 }));
    const across = (u: number) => Array.from({ length: 9 }, (_, i) => ringOn(st, COAT, o, u)(a0 + ((a1 - a0) * i) / 8, lift));
    edge(across(u0)); edge(U(a0, u0, u1, 6)); edge(U(a1, u0, u1, 6)); edge(across(u1)); edge(across(u1 - 0.045));
  }
  return m;
};
