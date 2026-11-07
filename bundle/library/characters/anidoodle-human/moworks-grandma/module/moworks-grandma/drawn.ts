// GRANDMA, DRAWN. What is seen of her body is designed: cross-section tables (head units:
// lateral, medial, front, back) swept along gesture curves through her joints. The rig only says
// where the curves go; the shapes are these numbers.
//
// Shape language: ONE soft pear, rounded over the upper back (the stoop), sloping at the
// shoulders, widest at the hips, falling into an A-line skirt that kicks out a little at mid-calf;
// thin, straight shins under it; small, sensible shoes. The cardigan is a loose knit: soft tubes
// for sleeves that narrow into ribbed cuffs, a ribbed hem band at the hip, two patch pockets,
// five buttons, a V opening over a cream blouse with a round (Peter Pan) collar.
// Big (the cardigan-and-skirt pear), medium (sleeves, the cane), small (glasses, bun, buttons).
import type { P } from "anidoodle/canvas-core/core";
import { type Camera, type V3, add, apply, cross, dot, mix3, mul, mv, norm, project, sub, tr } from "anidoodle/canvas-core/character/math3";
import { type Section, type Station, curve, jointed, sectionAt, station, stationU, sweep } from "anidoodle/canvas-core/character/design";
import type { Mark, Part } from "anidoodle/canvas-core/character/types";
import { type Rig, type Side, SIDES, sgn } from "anidoodle/canvas-core/character/human/skeleton";

// ---- the cardigan: hem (0) to the back of the neck (1)
const CARDIGAN: Section[] = [
  [0, 0.6, 0.6, 0.47, 0.5], [0.12, 0.62, 0.62, 0.47, 0.53], [0.26, 0.58, 0.58, 0.46, 0.47], [0.42, 0.54, 0.54, 0.45, 0.39],
  [0.6, 0.54, 0.54, 0.46, 0.39], [0.73, 0.56, 0.56, 0.47, 0.43], [0.85, 0.58, 0.58, 0.39, 0.48], [0.93, 0.53, 0.53, 0.3, 0.39],
  [0.975, 0.31, 0.31, 0.22, 0.27], [1, 0.22, 0.22, 0.19, 0.22],
];
// ---- a sleeve: shoulder (0) to wrist (1); a soft cap, a loose tube, then the cuff ribs pull in
const SLEEVE: Section[] = [[0, 0.1, 0.09, 0.12, 0.12], [0.08, 0.165, 0.13, 0.165, 0.16], [0.25, 0.158, 0.14, 0.16, 0.155], [0.52, 0.14, 0.13, 0.14, 0.14], [0.8, 0.128, 0.118, 0.123, 0.123], [0.87, 0.125, 0.117, 0.12, 0.12], [0.9, 0.108, 0.104, 0.105, 0.105], [1, 0.1, 0.098, 0.098, 0.098]];
// ---- the skirt: hem (0) to the waist (1), A-line; the hem section widens with the stride
const SKIRT: Section[] = [[0, 0.74, 0.74, 0.56, 0.6], [0.3, 0.68, 0.68, 0.5, 0.56], [0.55, 0.63, 0.63, 0.46, 0.53], [0.78, 0.62, 0.62, 0.45, 0.54], [0.9, 0.58, 0.58, 0.44, 0.47], [1, 0.52, 0.52, 0.43, 0.4]];
// ---- a leg in stockings: hip (0) to ankle (1); a bony knee, a calf that has thinned, a slim ankle
const LEG: Section[] = [[0, 0.22, 0.2, 0.22, 0.24], [0.3, 0.18, 0.16, 0.18, 0.19], [0.5, 0.125, 0.12, 0.14, 0.115], [0.64, 0.13, 0.125, 0.112, 0.145], [0.8, 0.105, 0.1, 0.1, 0.11], [0.93, 0.085, 0.085, 0.085, 0.085], [1, 0.09, 0.09, 0.09, 0.09]];
// ---- a shoe: heel (0) to toe (1); top and sole equal (along a foot "front" has no meaning)
const SHOE: Section[] = [[0, 0.12, 0.12, 0.1, 0.1], [0.3, 0.15, 0.15, 0.12, 0.12], [0.68, 0.165, 0.165, 0.085, 0.085], [0.9, 0.12, 0.12, 0.06, 0.06], [1, 0.07, 0.07, 0.04, 0.04]];

// ---------------------------------------------------------------- points ON a designed surface
// The same frame a sweep uses (section axes square to the curve), so marks sit on the drawn mass,
// follow the stoop, and are seen only where that surface turns toward the lens.
type Surf = { pts: V3[]; X: V3[]; Z: V3[]; us: number[]; tab: Section[]; side: 1 | -1; hh: number };
const surfOf = (st: Station[], tab: Section[], side: 1 | -1, hh: number, n = 16): Surf => {
  const c = curve(st, n), X: V3[] = [], Z: V3[] = [];
  c.pts.forEach((_, i) => {
    const T = norm(sub(c.pts[Math.min(c.pts.length - 1, i + 1)], c.pts[Math.max(0, i - 1)]));
    const x = norm(sub(c.xs[i], mul(T, dot(c.xs[i], T)))), z0 = norm(cross(x, T));
    X.push(x); Z.push(dot(z0, c.zs[i]) >= 0 ? z0 : mul(z0, -1));
  });
  return { pts: c.pts, X, Z, us: c.us, tab, side, hh };
};
// phi: 0 = straight out the front, +pi/2 = the lateral side, pi = the back; lift in head units
const onSurf = (s: Surf, u: number, phi: number, lift = 0.012): { w: V3; n: V3 } => {
  let i = 0; while (i < s.us.length - 2 && s.us[i + 1] < u) i++;
  const t = Math.max(0, Math.min(1, (u - s.us[i]) / (s.us[i + 1] - s.us[i] || 1)));
  const p = mix3(s.pts[i], s.pts[i + 1], t), X = norm(mix3(s.X[i], s.X[i + 1], t)), Z = norm(mix3(s.Z[i], s.Z[i + 1], t));
  const [lat, med, fr, bk] = sectionAt(s.tab, u), sx = Math.sin(phi) * s.side, cz = Math.cos(phi);
  const wx = (sx * s.side > 0 ? lat : med) + lift, wz = (cz > 0 ? fr : bk) + lift;
  const w = add(p, add(mul(X, sx * wx * s.hh), mul(Z, cz * wz * s.hh)));
  return { w, n: norm(add(mul(X, sx / wx), mul(Z, cz / wz))) };
};
const runsOn = (s: Surf, cam: Camera, pts: [number, number][], min = 0.08, lift = 0.012): P[][] => {
  const out: P[][] = []; let cur: P[] = [];
  pts.forEach(([u, phi]) => { const q = onSurf(s, u, phi, lift); if (dot(q.n, norm(sub(cam.eye, q.w))) > min) { const pp = project(cam, q.w); cur.push([pp.x, pp.y]); } else { if (cur.length > 1) out.push(cur); cur = []; } });
  if (cur.length > 1) out.push(cur);
  return out;
};
const seen = (s: Surf, cam: Camera, u: number, phi: number, min = 0.1) => { const q = onSurf(s, u, phi); return dot(q.n, norm(sub(cam.eye, q.w))) > min; };
const lines = (runs: P[][], role: string, w: number, alpha = 0.8): Mark[] => runs.map((pts) => ({ kind: "line", pts, role, w, alpha }));
const span = (a: number, b: number, n: number) => Array.from({ length: n }, (_, i) => a + ((b - a) * i) / (n - 1));
// a knit rib band: the band's top edge round the visible surface, and short ribs below it
const ribBand = (s: Surf, cam: Camera, u0: number, u1: number, edge: number, w: number, ribs = 28): Mark[] => {
  const ring = span(-Math.PI, Math.PI, 49).map((ph) => [edge, ph] as [number, number]), out = lines(runsOn(s, cam, ring, 0.05), "line", w, 0.5);
  for (let k = 0; k < ribs; k++) { const ph = -Math.PI + ((k + 0.5) / ribs) * Math.PI * 2; out.push(...lines(runsOn(s, cam, [[u0 + (u1 - u0) * 0.12, ph], [u1 - (u1 - u0) * 0.1, ph]], 0.25), "line", w * 0.6, 0.28)); }
  return out;
};

const part = (id: string, role: string, polys: P[][], cam: Camera, at: V3, bias: number, o: Partial<Part> = {}): Part => {
  const q = project(cam, at); return { id, role, depth: q.z + bias, polys, size: q.s * 0.12, marks: [], ...o };
};
const pt = (cam: Camera, v: V3): P => { const q = project(cam, v); return [q.x, q.y]; };

export const drawnGrandma = (r: Rig, cam: Camera): Part[] => {
  const hh = r.dims.hh, out: Part[] = [], J = r.joints, px = project(cam, J.chest).s * hh, w = Math.max(0.8, px * 0.012);
  const hips = mix3(J.hipL, J.hipR, 0.5), knees = mix3(J.kneeL, J.kneeR, 0.5), ankles = mix3(J.ankleL, J.ankleR, 0.5);

  // ---- the skirt: hung from the waist, its hem between the calves wherever the legs have gone
  const calf = (s: Side) => mix3(J["knee" + s], J["ankle" + s], 0.45), d = mv(tr(r.pelvis.R), sub(calf("L"), calf("R")));
  const latH = Math.max(0.74, Math.abs(d[0]) / hh / 2 + 0.22), sagH = Math.max(0.56, Math.abs(d[2]) / hh / 2 + 0.22);
  const skirtTab: Section[] = SKIRT.map((row) => { const k = Math.max(0, 1 - row[0] / 0.4); return [row[0], row[1] + (latH - 0.74) * k, row[2] + (latH - 0.74) * k, row[3] + (sagH - 0.56) * k, row[4] + (sagH - 0.56) * k]; });
  const skSt: Station[] = [{ at: mix3(knees, ankles, 0.45), frame: r.pelvis }, { at: mix3(hips, knees, 0.5), frame: r.pelvis }, station(r.pelvis), station(r.lumbar)];
  const skirt = part("skirt", "skirt", sweep(cam, skSt, skirtTab, { hh, side: 1, n: 12, caps: [true, false] }), cam, mix3(hips, knees, 0.5), 0.02 * hh, { over: ["legL", "legR"], feature: "skirt" });
  // soft folds falling from the hips and opening toward the hem
  const sk = surfOf(skSt, skirtTab, 1, hh);
  [-2.2, -1.0, -0.4, 0.35, 0.95, 2.3].forEach((ph, i) => skirt.marks.push(...lines(runsOn(sk, cam, span(0.62, 0.04, 6).map((u, k) => [u, ph * (1 + 0.12 * (k / 5)) + (i % 2 ? 0.04 : -0.04) * Math.sin(k)] as [number, number]), 0.15), "line", w * 0.8, 0.38)));
  out.push(skirt);

  // ---- the cardigan's body: from the ribbed hem at the hip, up the rounded back, to the neck
  const hem = mix3(hips, knees, 0.22);
  const caSt: Station[] = [{ at: hem, frame: r.pelvis }, station(r.pelvis), station(r.lumbar), station(r.chest), station(r.chest, [0, 0.62 * hh, 0]), station(r.chest, [0, 0.84 * hh, -0.07 * hh])];   // the knit rises up the back of the neck
  const cardigan = part("cardigan", "cardigan", sweep(cam, caSt, CARDIGAN, { hh, side: 1, n: 12, caps: [true, false] }), cam, J.lumbar, 0, { over: ["skirt", "legL", "legR"], feature: "cardigan" });
  const ca = surfOf(caSt, CARDIGAN, 1, hh);
  // the V over the blouse, its two front edges, and the button band down to the hem
  const V: [number, number][] = [[0.995, -0.62], [0.94, -0.46], [0.83, -0.24], [0.7, 0.0], [0.83, 0.24], [0.94, 0.46], [0.995, 0.62]];
  if (seen(ca, cam, 0.8, 0, 0.15)) {
    cardigan.marks.push({ kind: "fill", pts: V.map(([u, ph]) => pt(cam, onSurf(ca, u, ph, 0.006).w)), role: "blouse", alpha: 1 });
    // two soft creases where the blouse gathers under the collar
    cardigan.marks.push(...lines(runsOn(ca, cam, [[0.9, -0.12], [0.8, -0.04]], 0.15), "line", w * 0.7, 0.3), ...lines(runsOn(ca, cam, [[0.9, 0.14], [0.8, 0.05]], 0.15), "line", w * 0.7, 0.3));
  }
  [-1, 1].forEach((k) => cardigan.marks.push(...lines(runsOn(ca, cam, [[0.995, k * 0.66], [0.94, k * 0.48], [0.83, k * 0.25], [0.7, k * 0.01]], 0.08), "line", w * 1.1, 0.8)));
  cardigan.marks.push(...lines(runsOn(ca, cam, span(0.7, 0.0, 10).map((u) => [u, 0.025] as [number, number]), 0.08), "line", w * 1.1, 0.8));
  cardigan.marks.push(...lines(runsOn(ca, cam, span(0.7, 0.0, 10).map((u) => [u, 0.12] as [number, number]), 0.12), "line", w * 0.6, 0.32));
  cardigan.marks.push(...ribBand(ca, cam, 0, 0.075, 0.075, w, 40));
  // two patch pockets on the hips, each with a ribbed top
  [-1, 1].forEach((k) => {
    const a = 0.36, b = 0.98, top = 0.25, bot = 0.1;
    const outline: [number, number][] = [[top, k * a], [bot + 0.01, k * a], [bot, k * (a + 0.05)], [bot, k * (b - 0.05)], [bot + 0.01, k * b], [top, k * b]];
    cardigan.marks.push(...lines(runsOn(ca, cam, outline, 0.12, 0.02), "line", w, 0.7), ...lines(runsOn(ca, cam, span(a, b, 8).map((ph) => [top - 0.025, k * ph] as [number, number]), 0.12, 0.02), "line", w * 0.6, 0.4));
  });
  // the stoop: a soft fold across the small of the back where the knit bunches
  cardigan.marks.push(...lines(runsOn(ca, cam, span(2.3, 3.98, 7).map((ph, i) => [0.44 + 0.02 * Math.sin(i), ph] as [number, number]), 0.15), "line", w * 0.8, 0.35));
  out.push(cardigan);

  // ---- the buttons: five, down her left front, small and pearly
  const btn: Mark[] = [];
  [0.64, 0.51, 0.38, 0.25, 0.12].forEach((u) => {
    const c = onSurf(ca, u, 0.075, 0.025); if (dot(c.n, norm(sub(cam.eye, c.w))) < 0.2) return;
    const up = norm(sub(onSurf(ca, u + 0.02, 0.075, 0.025).w, c.w)), side = norm(cross(c.n, up)), R = 0.038 * hh;
    const ring = Array.from({ length: 10 }, (_, i) => { const a = (i / 10) * Math.PI * 2; return pt(cam, add(c.w, add(mul(side, Math.cos(a) * R), mul(up, Math.sin(a) * R)))); });
    btn.push({ kind: "fill", pts: ring, role: "button", line: w * 0.8 });
    [-1, 1].forEach((sx) => btn.push({ kind: "dot", at: pt(cam, add(c.w, mul(side, sx * R * 0.3))), rx: Math.max(0.6, R * 0.16 * project(cam, c.w).s), ry: Math.max(0.6, R * 0.16 * project(cam, c.w).s), rot: 0, role: "line", alpha: 0.6 }));
  });
  out.push({ id: "buttons", role: "button", depth: cardigan.depth - 0.001, polys: [], size: px * 0.04, marks: btn, outline: false, fill: false, over: ["cardigan", "collar"], feature: "buttons" });

  // ---- the blouse collar: two rounded flaps lying on the cardigan's neckline
  const flaps: P[][] = [];
  if (seen(ca, cam, 0.96, 0, -0.35) || seen(ca, cam, 0.96, 1.2, 0.05) || seen(ca, cam, 0.96, -1.2, 0.05)) [-1, 1].forEach((k) => {
    const loop: [number, number][] = [[0.998, k * 0.04], [0.998, k * 0.6], [0.995, k * 1.15], [0.975, k * 1.42], [0.955, k * 1.3], [0.93, k * 0.95], [0.915, k * 0.55], [0.925, k * 0.22], [0.955, k * 0.06]];
    const pts = loop.map(([u, ph]) => onSurf(ca, u, ph, 0.03)), vis = pts.some((q) => dot(q.n, norm(sub(cam.eye, q.w))) > 0.1);
    if (vis) flaps.push(pts.map((q) => pt(cam, q.w)));
  });
  if (flaps.length) out.push({ id: "collar", role: "blouse", depth: project(cam, apply(r.chest, [0, 0.72 * hh, 0.2 * hh])).z - 0.01 * hh, polys: flaps, size: px * 0.05, marks: [], over: ["cardigan", "neck"], feature: "collar" });

  for (const s of SIDES) {
    const k = sgn(s) as 1 | -1;
    // ---- a sleeve: shoulder, elbow, wrist; cut at the elbow so a bent arm folds, never self-crosses
    const sl: Station[] = [station(r.upper[s], [-k * 0.03 * hh, -0.03 * hh, 0]), station(r.fore[s]), station(r.hand[s], [0, 0.03 * hh, 0])];
    const sleeve = part("sleeve" + s, "cardigan", jointed(cam, sl, SLEEVE, { hh, side: k, n: 10, cuts: [stationU(sl, 1)] }), cam, J["elbow" + s], -0.06 * hh, { seams: [{ at: pt(cam, J["shoulder" + s]), r: 0.24 * hh * project(cam, J["shoulder" + s]).s, with: "cardigan" }], feature: "cardigan" });
    const ss = surfOf(sl, SLEEVE, k, hh);
    sleeve.marks.push(...ribBand(ss, cam, 0.9, 0.995, 0.9, w * 0.9, 16));
    // the knit gathers in the crook of the elbow
    sleeve.marks.push(...lines(runsOn(ss, cam, [[0.47, -0.5], [0.5, 0], [0.47, 0.5]], 0.2), "line", w * 0.7, 0.35));
    out.push(sleeve);
    // ---- a leg in stockings: hip, knee, ankle (the skirt paints over all but the shin)
    const lg: Station[] = [station(r.thigh[s]), station(r.shin[s]), station(r.foot[s])];
    out.push(part("leg" + s, "stockings", jointed(cam, lg, LEG, { hh, side: k, n: 10, cuts: [stationU(lg, 1)] }), cam, J["knee" + s], -0.02 * hh));
    // ---- a shoe: a low, rounded lace-free shoe with a strap over the instep, on a small block heel
    const ft: Station[] = [station(r.foot[s], [0, -0.17 * hh, -0.19 * hh]), station(r.foot[s], [0, -0.16 * hh, 0.2 * hh]), station(r.toes[s], [0, 0.02 * hh, 0.17 * hh])];
    const heel = sweep(cam, [station(r.foot[s], [0, -0.215 * hh, -0.17 * hh]), station(r.foot[s], [0, -0.215 * hh, -0.04 * hh])], [[0, 0.1, 0.1, 0.05, 0.05], [1, 0.1, 0.1, 0.05, 0.05]], { hh, side: k, n: 4 });
    const shoe = part("shoe" + s, "shoes", [...sweep(cam, ft, SHOE, { hh, side: k, n: 8 }), ...heel], cam, apply(r.foot[s], [0, 0, 0.05 * hh]), -0.025 * hh, { over: ["leg" + s], feature: "shoes" });
    const F = (fr: "foot" | "toes", l: V3) => apply(r[fr][s], mul(l, hh));
    const facing = (at: V3, n: V3) => dot(norm(n), norm(sub(cam.eye, at))) > 0.1;
    const strapAt = F("foot", [0, -0.05, 0.08]);
    if (facing(strapAt, mv(r.foot[s].R, [0, 1, 0.4]))) shoe.marks.push({ kind: "line", pts: [F("foot", [k * 0.16, -0.13, 0.03]), F("foot", [k * 0.09, -0.06, 0.07]), strapAt, F("foot", [-k * 0.09, -0.06, 0.07]), F("foot", [-k * 0.16, -0.13, 0.03])].map((v) => pt(cam, v)), role: "shoeDark", w: w * 2.2, alpha: 0.9 });
    const welt = F("foot", [k * 0.17, -0.24, 0.1]);
    if (facing(welt, mv(r.foot[s].R, [k, 0, 0]))) shoe.marks.push({ kind: "line", pts: [F("foot", [k * 0.13, -0.24, -0.17]), F("foot", [k * 0.165, -0.245, 0.05]), F("foot", [k * 0.17, -0.25, 0.28]), F("toes", [k * 0.1, -0.03, 0.12])].map((v) => pt(cam, v)), role: "line", w: w * 0.8, alpha: 0.5 });
    out.push(shoe);
  }
  return out;
};
