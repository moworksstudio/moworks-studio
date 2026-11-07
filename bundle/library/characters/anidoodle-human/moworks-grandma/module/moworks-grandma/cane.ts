// HER CANE. A crook-handled walking stick in her right hand, and a RIGID body: it is defined once
// in the right hand's frame, so wherever the hand goes the cane goes, and the fist always closes
// on the same handle. A pose that wants the tip on the floor solves the ARM for it (solveCane);
// it never bends the cane or slides it through the fist.
//
// Reference opened: a standard wooden crook cane (fitted to the wrist crease with the arm hanging
// and the elbow bent 15-20 degrees; rubber ferrule ~3 cm); Hogarth "Drawing Dynamic Hands" pp.
// 70-75 for the cylinder grip (four fingers stacked round the form, the thumb across them).
//
// Hand-local units are METRES. Right hand frame: y runs back up the forearm (the fingers hang
// toward -y), +z is the thumb-and-index side (forward when the arm hangs), +x is her left, which
// for the right hand is the palm side: a gripped handle sits at +x.
import { type Blob, type Camera, type V3, I3, add, apply, dist, dot, mul, mv, norm, sub } from "anidoodle/canvas-core/character/math3";
import type { BlobPart } from "anidoodle/canvas-core/character/build";
import type { Mark, Pose } from "anidoodle/canvas-core/character/types";
import { type Rig, LIMITS, fk, limitViolations } from "anidoodle/canvas-core/character/human/skeleton";
import { DIGITS, type HandAngles, HAND_POSES, handModel, handViolations } from "anidoodle/canvas-core/character/human/hands";
import { project } from "anidoodle/canvas-core/character/math3";
import { GRANDMA_BODY, GRANDMA_DIMS } from "./spec";

const D = GRANDMA_DIMS, Lh = D.hand;
export const HANDLE_R = 0.0145;                  // the handle's tube radius: a 29 mm crook, what an old hand can close on
export const CROOK_R = 0.042;                    // radius of the crook's bends
const HALF = 0.04;                               // the straight top the fist holds, half its length
export const SHAFT = 0.55;                      // from the end of the front bend down to the tip of the ferrule
export const FERRULE = 0.034;
const G: V3 = [0.075 * Lh + HANDLE_R * 0.9, -0.46 * Lh, 0];   // the centre of the grip, on the palm side of the fist

// the cane's centre line, hand-local: hook end -> back bend -> straight grip -> front bend -> shaft -> tip
const arc = (c: V3, a0: number, a1: number, n: number, up: number, along: number): V3[] => Array.from({ length: n + 1 }, (_, i) => { const a = a0 + ((a1 - a0) * i) / n; return add(c, [0, Math.cos(a) * CROOK_R * up, Math.sin(a) * CROOK_R * along]); });
const FRONT: V3 = add(G, [0, 0, HALF]), BACK: V3 = add(G, [0, 0, -HALF]);
export const CROOK: V3[] = [
  ...arc(add(BACK, [0, -CROOK_R, 0]), Math.PI * 0.95, 0, 6, 1, -1),     // the hook: from its end below, up and over the back bend
  ...arc(add(FRONT, [0, -CROOK_R, 0]), 0, Math.PI / 2, 5, 1, 1),        // the front bend, from the grip down into the shaft
];
export const SHAFT_TOP: V3 = add(FRONT, [0, -CROOK_R, CROOK_R]);
export const TIP_LOCAL: V3 = add(SHAFT_TOP, [0, -SHAFT, 0]);
const FERRULE_TOP: V3 = add(TIP_LOCAL, [0, FERRULE, 0]);

// world points of the cane for a posed rig
export const caneTip = (r: Rig): V3 => add(apply(r.hand.R, TIP_LOCAL), [0, -0.012, 0]);   // the rubber's flat, 12 mm under its centre line
export const caneAxis = (r: Rig): V3 => norm(mv(r.hand.R.R, [0, -1, 0]));
export const gripCentre = (r: Rig): V3 => apply(r.hand.R, G);
export const caneLength = (r: Rig): number => dist(apply(r.hand.R, CROOK[0]), apply(r.hand.R, TIP_LOCAL)); // a rigid prop: the same in every pose

// ---- the grip: every finger joint pulled onto the handle (none inside it), solved ONCE,
// because the handle never moves in the hand
let gripCache: HandAngles | null = null;
export const caneGrip = (): HandAngles => {
  if (gripCache) return gripCache;
  const r = fk(D, { root: [0, D.root, 0], yaw: 0, joints: { elbowR: 15 }, expression: {} }), H = r.hand.R;
  const c = apply(H, G), a = norm(mv(H.R, [0, 0, 1]));
  const radial = (p: V3) => { const v = sub(p, c), t = dot(v, a); return dist(v, mul(a, t)); };
  const ang: HandAngles = JSON.parse(JSON.stringify(HAND_POSES.grip));
  const cost = (h: HandAngles) => {
    const hm = handModel(H, "R", Lh, h, GRANDMA_BODY.handGirth); let e = 0;
    hm.digits.forEach((d) => d.pts.slice(1).forEach((p, i) => { const gap = radial(p) - (HANDLE_R + d.radii[i + 1] * 0.92); e += gap < 0 ? gap * gap * 40 : gap * gap * (i === 2 ? 3 : 1); }));
    return e + handViolations(h, "").length * 10;
  };
  let e = cost(ang), step = 8;
  for (let it = 0; it < 50 && step > 0.2; it++) {
    let imp = false;
    for (const d of DIGITS) for (let i = 1; i < 4; i++) for (const s of [1, -1]) { const t: HandAngles = JSON.parse(JSON.stringify(ang)); t[d][i] += s * step; const et = cost(t); if (et < e) { e = et; Object.assign(ang, t); imp = true; } }
    if (!imp) step *= 0.5;
  }
  gripCache = ang;
  return ang;
};
// how well the fist closes on the handle: the largest gap from a fingertip pad to the handle's
// surface, and the deepest any finger joint sinks into it (mm). The gate holds both.
export const gripContact = (r: Rig, h: HandAngles) => {
  const H = r.hand.R, c = apply(H, G), a = norm(mv(H.R, [0, 0, 1])), hm = handModel(H, "R", Lh, h, GRANDMA_BODY.handGirth);
  const radial = (p: V3) => { const v = sub(p, c), t = dot(v, a); return dist(v, mul(a, t)); };
  let gap = 0, sink = 0;
  hm.digits.filter((d) => d.digit !== "thumb").forEach((d) => { d.pts.slice(1).forEach((p, i) => { const g = radial(p) - (HANDLE_R + d.radii[i + 1]); if (i === 2) gap = Math.max(gap, g); sink = Math.max(sink, -g); }); });
  return { gapMm: gap * 1000, sinkMm: sink * 1000 };
};

// ---- the arm solved so the tip lands on a point of the floor, starting from a cane-user's
// carriage (shoulder a little forward, elbow soft) and never leaving the range of motion.
// A hanging arm with a cane under it is nearly one vertical line, so every SINGLE joint moves the
// tip sideways: the engine's coordinate-descent solve cannot lift it (gate round 2). This is damped
// least squares on the tip error, every joint at once; its minimum-norm steps stay near the carriage.
const ARM = ["shoulderRaiseR", "shoulderSwingR", "shoulderTwistR", "elbowR", "pronationR", "wristFlexR", "wristDevR"];
export const ARM_REF: Record<string, number> = { shoulderRaiseR: 15, shoulderSwingR: 78, shoulderTwistR: 0, elbowR: 24, pronationR: 0, wristFlexR: 0, wristDevR: 0 };
export const solveCane = (pose: Pose, tip: V3, o: { ref?: Record<string, number> } = {}): Pose => {
  const start: Pose = { ...pose, joints: { ...pose.joints, ...ARM_REF, ...(o.ref ?? {}) } };
  if (limitViolations(start.joints).length) throw new Error("solveCane: the reference arm is outside its range: " + limitViolations(start.joints).join("; "));
  return dlsTip(start, tip);
};
// the arm that carries a cane never hangs dead plumb: at raise 0 the shoulder's swing axis means
// nothing and the arm cannot flex forward to lift the tip, so the carrying arm keeps 8 degrees
const RAISE_MIN = 10;
const stop = (k: string): [number, number] => { const L = LIMITS[k.slice(0, -1)]; return k === "shoulderRaiseR" ? [RAISE_MIN, L[1]] : L; };
const dlsTip = (p0: Pose, target: V3): Pose => {
  let p = { ...p0, joints: { ...p0.joints } };
  const tipOf = (q: Pose) => caneTip(fk(D, q)), h = 0.4, lam = 0.0003;   // light damping: the lift direction is the arm's small singular value, heavy damping never moves it
  for (let it = 0; it < 60; it++) {
    const t = tipOf(p), e = sub(target, t); if (Math.hypot(...e) < 2e-4) break;
    const J = ARM.map((k) => { const q = { ...p, joints: { ...p.joints, [k]: (p.joints[k] ?? 0) + h } }; return mul(sub(tipOf(q), t), 1 / h); });   // 7 columns, metres per degree
    // dq = J^T (J J^T + lam^2 I)^-1 e over the FREE joints; a joint pinned at its stop and pushed
    // further drops out and the rest carry the move (active set)
    const dqFor = (free: boolean[]) => {
      const A = [0, 1, 2].map((r) => [0, 1, 2].map((c) => J.reduce((s, col, i) => s + (free[i] ? col[r] * col[c] : 0), 0) + (r === c ? lam * lam : 0)));
      const det = A[0][0] * (A[1][1] * A[2][2] - A[1][2] * A[2][1]) - A[0][1] * (A[1][0] * A[2][2] - A[1][2] * A[2][0]) + A[0][2] * (A[1][0] * A[2][1] - A[1][1] * A[2][0]);
      const inv = [[A[1][1] * A[2][2] - A[1][2] * A[2][1], A[0][2] * A[2][1] - A[0][1] * A[2][2], A[0][1] * A[1][2] - A[0][2] * A[1][1]], [A[1][2] * A[2][0] - A[1][0] * A[2][2], A[0][0] * A[2][2] - A[0][2] * A[2][0], A[0][2] * A[1][0] - A[0][0] * A[1][2]], [A[1][0] * A[2][1] - A[1][1] * A[2][0], A[0][1] * A[2][0] - A[0][0] * A[2][1], A[0][0] * A[1][1] - A[0][1] * A[1][0]]].map((row) => row.map((v) => v / det));
      const y = [0, 1, 2].map((r) => inv[r][0] * e[0] + inv[r][1] * e[1] + inv[r][2] * e[2]);
      return J.map((col, i) => (free[i] ? col[0] * y[0] + col[1] * y[1] + col[2] * y[2] : 0));
    };
    const free = ARM.map(() => true); let dq = dqFor(free);
    for (let pass = 0; pass < ARM.length; pass++) {
      const pinned = ARM.findIndex((k, i) => { const L = stop(k), v = p.joints[k] ?? 0; return free[i] && ((v <= L[0] + 1e-6 && dq[i] < 0) || (v >= L[1] - 1e-6 && dq[i] > 0)); });
      if (pinned < 0) break; free[pinned] = false; dq = dqFor(free);
    }
    let step = 1, moved = false;
    while (step > 0.01 && !moved) {
      const q = { ...p, joints: { ...p.joints } };
      ARM.forEach((k, i) => { const L = stop(k); q.joints[k] = Math.max(L[0], Math.min(L[1], (q.joints[k] ?? 0) + step * dq[i])); });
      if (!limitViolations(q.joints).length && dist(tipOf(q), target) < dist(t, target)) { p = q; moved = true; } else step *= 0.5;
    }
    if (!moved) break;
  }
  return p;
};

// ---- the cane as parts of her Scene: the polished wood (crook and shaft) and the rubber ferrule
export const caneParts = (r: Rig, cam: Camera): BlobPart[] => {
  const H = r.hand.R, W = (l: V3) => apply(H, l), b = (l: V3, rad: number): Blob => ({ c: W(l), R: I3, r: [rad, rad, rad] });
  const crook = CROOK.map((l) => b(l, HANDLE_R));
  const shaft = [b(SHAFT_TOP, 0.0125), b(add(SHAFT_TOP, [0, -SHAFT * 0.5, 0]), 0.0115), b(FERRULE_TOP, 0.0105)];
  const ferrule = [b(FERRULE_TOP, 0.013), b(add(TIP_LOCAL, [0, 0.004, 0]), 0.014)];
  // a glint down the lit side of the polished shaft, and the brass collar under the crook
  const marksFn = (c: Camera): Mark[] => {
    const P = (l: V3) => { const q = project(c, W(l)); return [q.x, q.y] as [number, number]; }, s = project(c, W(SHAFT_TOP)).s, w = Math.max(0.8, s * 0.004);
    const side: V3 = [0.008, 0, -0.006];
    return [
      { kind: "line", pts: [P(add(SHAFT_TOP, add(side, [0, -0.04, 0]))), P(add(SHAFT_TOP, add(side, [0, -SHAFT * 0.55, 0])))], role: "white", w, alpha: 0.45 },
      { kind: "line", pts: [P(add(SHAFT_TOP, [-0.013, -0.012, 0])), P(add(SHAFT_TOP, [0.013, -0.012, 0]))], role: "glasses", w: w * 2.6, alpha: 0.95 },
    ];
  };
  void cam;
  return [
    { id: "cane", role: "cane", groups: [{ blobs: crook, mode: "chain" }, { blobs: shaft, mode: "chain" }], depthAt: W(add(SHAFT_TOP, [0, -SHAFT * 0.3, 0])), feature: "cane", marksFn },
    { id: "caneTip", role: "caneTip", groups: [{ blobs: ferrule, mode: "chain" }], depthAt: W(TIP_LOCAL), over: ["cane"] },
  ];
};
