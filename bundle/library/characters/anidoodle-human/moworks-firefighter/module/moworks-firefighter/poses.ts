// THE FIREFIGHTER'S POSES. Built from placed feet, solved legs, balance and reach targets, never
// from a pile of guessed angles where contact matters. Every pose passes the joint-limit check
// (firefighter.pose throws otherwise) and every standing pose is balance-checked by check.ts.
//
// Reference opened, per pose: contrapposto: Loomis "Figure Drawing for All It's Worth" p. 64
// (pelvis and shoulder lines tilting against each other); the braced hose stance: IFSTA
// "Essentials of Fire Fighting" (7th ed.), handline nozzle operation (feet staggered shoulder
// width, weight forward on the lead leg, back hand at the hip on the hose, front hand on the
// bail); the walk: Williams "The Animator's Survival Kit", the walk chapter (via walk.ts).
import { type Blob, DEG, I3, type V3, add, apply, mul, mv, norm, sub } from "anidoodle/canvas-core/character/math3";
import type { BlobPart } from "anidoodle/canvas-core/character/build";
import type { Pose } from "anidoodle/canvas-core/character/types";
import { dimsFromCanon, sgn } from "anidoodle/canvas-core/character/human/skeleton";
import { contrapposto, reach, stand } from "anidoodle/canvas-core/character/human/balance";
import { rigFor } from "anidoodle/canvas-core/character/human/figure";
import { planWalk, walkAt } from "anidoodle/canvas-core/character/human/walk";
import type { HandAngles } from "anidoodle/canvas-core/character/human/hands";
import { FF_SPEC, firefighter } from "./index";

export const FF_DIMS = dimsFromCanon(FF_SPEC.canon, FF_SPEC.height);
const D = FF_DIMS, hh = D.hh, AH = D.ankleH;
const ry = (yaw: number) => (v: V3): V3 => mv([Math.cos(yaw * DEG), 0, Math.sin(yaw * DEG), 0, 1, 0, -Math.sin(yaw * DEG), 0, Math.cos(yaw * DEG)], v);
// the arms stand a little off the body: the coat is thick, a hanging sleeve never sinks into it
export const base = (yaw = 0, j: Record<string, number> = {}, ex: Record<string, number> = {}): Pose => ({ root: [0, D.root, 0], yaw, joints: { shoulderRaiseL: 15, shoulderRaiseR: 15, shoulderSwingL: 16, shoulderSwingR: 16, elbowL: 14, elbowR: 14, ...j }, expression: ex, hands: { L: "relaxed", R: "relaxed" }, plant: true });

export const relaxed = (yaw: number, ex: Record<string, number> = {}): Pose => firefighter.pose(base(yaw, {}, ex));

// the wave: the right arm up and out, the forearm rocking about the elbow, head tipped toward it
export const wave = (yaw: number, t = 0, ex: Record<string, number> = { smile: 0.9, cheek: 0.6, lidLower: 0.25, browRaise: 0.35 }): Pose => {
  const rock = Math.sin(t);
  const p = base(yaw, { shoulderRaiseR: 132, shoulderSwingR: 18, shoulderTwistR: 32, elbowR: 52 + 14 * rock, pronationR: 25, wristDevR: -8 * rock, headTilt: -7, neckSide: -4, spineSide: -4, clavLiftR: 14 }, ex);
  return firefighter.pose({ ...p, hands: { L: "relaxed", R: "wave" } });
};

// a thumbs up: the fist's four fingers curled, the thumb straight and abducted off the index
export const THUMBS_UP: HandAngles = { thumb: [38, 6, 0, -6], index: [0, 86, 100, 62], middle: [0, 88, 102, 62], ring: [2, 90, 102, 62], little: [3, 90, 100, 60] };
// "All clear": weight on the left leg, the right forearm brought up in front of the chest, thumb up
export const thumbsUp = (yaw: number): Pose => {
  const T = ry(yaw); let p = base(yaw, { ...contrapposto("L", 0.6), headTilt: 5, shoulderRaiseL: 17 }, { smile: 0.75, cheek: 0.5, lidLower: 0.2, browRaise: 0.2 });
  const feet = { L: T([0.07, AH, 0]), R: T([-0.16, AH, 0.1]) }, over = T([0.07, 0, 0.06]);
  p = stand(D, p, feet, [over[0], over[2]], { R: 3 });
  for (let k = 0; k < 2; k++) {
    const r = rigFor(FF_SPEC, { ...p, plant: false }), target = apply(r.chest, [-0.42 * hh, 0.42 * hh, 1.05 * hh]);
    p = reach(D, { ...p, joints: { ...p.joints, shoulderRaiseR: p.joints.shoulderRaiseR ?? 40, shoulderSwingR: 80, elbowR: 110 } }, "R", target);
    p = stand(D, p, feet, [over[0], over[2]], { R: 3 }, 6);
  }
  return firefighter.pose({ ...p, hands: { L: "relaxed", R: { angles: THUMBS_UP } } });
};

// On the hose: feet staggered, left foot leading, knees soft, weight forward over the lead foot;
// the left hand forward on the nozzle, the right hand back on the hose at the hip.
export const hoseBrace = (yaw: number): Pose => {
  const T = ry(yaw); let p = base(yaw, { spineBend: 10, neckBend: -6, headNod: -6, pelvisTwist: 8, spineTwist: -6 }, { browFurrow: 0.8, lidUpper: 0.2, mouthWide: -0.2, smile: -0.05 });
  p = { ...p, root: [p.root[0], p.root[1] - 0.05, p.root[2]] };
  const feet = { L: T([0.14, AH, 0.26]), R: T([-0.17, AH, -0.24]) }, over = T([0.0, 0, 0.08]);
  // both soles flat: a pitched back foot pushes its toes through the floor and the settle lifts the lead foot off it
  p = stand(D, p, feet, [over[0], over[2]], {}, 10);
  for (let k = 0; k < 2; k++) {
    const nz = nozzleLine(p, T);
    p = reach(D, { ...p, joints: { ...p.joints, shoulderRaiseL: p.joints.shoulderRaiseL ?? 50, shoulderSwingL: 70, elbowL: 50 } }, "L", nz.front);
    p = reach(D, { ...p, joints: { ...p.joints, shoulderRaiseR: p.joints.shoulderRaiseR ?? 30, shoulderSwingR: 60, elbowR: 70 } }, "R", nz.back);
    p = stand(D, p, feet, [over[0], over[2]], {}, 8);
  }
  return firefighter.pose({ ...p, hands: { L: "grip", R: "grip" } });
};
// where the wrists go: a line out in front of the lead hip, at belt height, aimed a little down
const nozzleLine = (p: Pose, T: (v: V3) => V3) => { const r = rigFor(FF_SPEC, { ...p, plant: false }), hip = r.joints.pelvis; return { front: add([hip[0], 0, hip[2]], T([0.06, 1.0, 0.44])), back: add([hip[0], 0, hip[2]], T([-0.1, 0.94, 0.16])) }; };

// ---- props: the nozzle between the two grips, the hose from the back hand down to the floor and away
const gripAt = (p: Pose, s: "L" | "R"): V3 => { const r = rigFor(FF_SPEC, p); return apply(r.hand[s], [-sgn(s) * (0.075 * D.hand + 0.026), -0.46 * D.hand, 0]); };
export const hoseProps = (p: Pose): BlobPart[] => {
  // the nozzle is short (a hand's width past the front grip); the charged hose runs back from the rear
  // hand in a loose S, sagging under its own weight to the floor and away behind them
  const a = gripAt(p, "R"), b = gripAt(p, "L"), ax = norm(sub(b, a)), tip = add(b, mul(ax, 0.11)), B = (c: V3, r: number): Blob => ({ c, R: I3, r: [r, r, r] });
  const back = norm([-ax[0], 0, -ax[2]]), side: V3 = [back[2], 0, -back[0]], H = a[1];
  const hose: Blob[] = [B(add(b, mul(ax, -0.09)), 0.038), B(a, 0.038), ...[0.12, 0.26, 0.42, 0.6, 0.8, 1].map((t) => B(add([a[0], 0, a[2]], add(mul(back, 0.05 + t * 1.3), add(mul(side, Math.sin(t * Math.PI * 1.4) * 0.16), [0, 0.04 + (H - 0.04) * Math.pow(1 - Math.min(1, t / 0.6), 1.6), 0]))), 0.038))];
  return [
    { id: "hose", role: "hose", groups: [{ blobs: hose, mode: "chain" }], depthBias: 0.05 },
    { id: "nozzle", role: "nozzle", groups: [{ blobs: [B(add(b, mul(ax, -0.09)), 0.042), B(b, 0.044), B(add(b, mul(ax, 0.06)), 0.038), B(tip, 0.03)], mode: "chain" }], depthAt: add(b, mul(ax, 0.05)), over: ["hose"] },
  ];
};

// ---- THE WALK, from footsteps (character/human/walk.ts): an adult in gear, 0.62 m steps, a step
// every 15 frames (two a second), on a diagonal toward the camera's right
export const WALK_YAW = 45, WALK_DIR: V3 = [Math.sin(WALK_YAW * DEG), 0, Math.cos(WALK_YAW * DEG)];
export const WALK_PLAN = planWalk({ t0: 0, s0: 0, step: 0.62, cycle: 30, n: 10, first: "L", lateral: 0.09 });
export const WALK_ORIGIN: V3 = mul(WALK_DIR, -WALK_PLAN.rootS(45));          // mid-film (frame 45) at the world origin
export const walkPose = (f: number): Pose => {
  const w = walkAt(D, WALK_PLAN, f, base(WALK_YAW, {}, {}), { origin: WALK_ORIGIN, dir: WALK_DIR }, { armSwing: 20, bob: 0.024 });
  const j = { ...w.pose.joints };
  // the thick sleeves hold the arms off the coat: re-aim walk.ts's swing with 15 deg of abduction
  for (const s of ["L", "R"]) { const a = Math.sin((j["shoulderSwing" + s] ?? 0) * DEG) * (j["shoulderRaise" + s] ?? 0); j["shoulderRaise" + s] = Math.hypot(a, 15); j["shoulderSwing" + s] = Math.atan2(a, 15) / DEG; }
  // the head stays level and looks where they are going; a small set of the jaw
  j.headNod = (j.headNod ?? 0) - 2;
  return firefighter.pose({ ...w.pose, joints: j, expression: { smile: 0.25, browFurrow: 0.2, lookX: 0.1 } });
};
export const walkContact = (yaw: number): Pose => {
  const dir: V3 = [Math.sin(yaw * DEG), 0, Math.cos(yaw * DEG)];
  return firefighter.pose(walkAt(D, WALK_PLAN, 60, base(yaw, {}, { smile: 0.3 }), { origin: mul(dir, -WALK_PLAN.rootS(60)), dir }).pose);
};
