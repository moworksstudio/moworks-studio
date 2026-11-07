// BƠ'S POSES. Built from placed feet, solved legs, balance and reach targets, never from a pile of
// guessed angles where contact matters. Every pose passes the joint-limit check at load (bo.pose
// throws otherwise) and every standing pose is balance-checked by the gate (check.ts).
//
// Two that are hers: the COPYCAT (feet planted wide, fists on her hips, chin up: a grown-up's
// stance, borrowed), and NOT GIVING UP (up on her toes in her big wellies, both arms at full
// stretch for something set too high, brows down).
import { DEG, V3, apply, mul, mv } from "anidoodle/canvas-core/character/math3";
import type { Pose } from "anidoodle/canvas-core/character/types";
import { dimsFromCanon } from "anidoodle/canvas-core/character/human/skeleton";
import { reach, stand } from "anidoodle/canvas-core/character/human/balance";
import { checkPose, rigFor } from "anidoodle/canvas-core/character/human/figure";
import { planWalk, walkAt } from "anidoodle/canvas-core/character/human/walk";
import { BO_SPEC } from "./spec";

export const BO_DIMS = dimsFromCanon(BO_SPEC.canon, BO_SPEC.height);
const D = BO_DIMS, hh = D.hh, AH = D.ankleH;
const turn = (yaw: number) => (v: V3): V3 => mv([Math.cos(yaw * DEG), 0, Math.sin(yaw * DEG), 0, 1, 0, -Math.sin(yaw * DEG), 0, Math.cos(yaw * DEG)], v);
const ok = (p: Pose, tag: string): Pose => { checkPose(p, `bo.${tag}`); return p; };

// her resting face: the gap-toothed grin
export const BO_GRIN: Record<string, number> = { smile: 0.75, cheek: 0.4, mouthOpen: 0.3, lidLower: 0.1 };
export const base = (yaw = 0, j: Record<string, number> = {}, ex: Record<string, number> = BO_GRIN): Pose => ({ root: [0, D.root, 0], yaw, joints: { shoulderRaiseL: 10, shoulderRaiseR: 10, shoulderSwingL: 20, shoulderSwingR: 20, elbowL: 14, elbowR: 14, ...j }, expression: ex, hands: { L: "relaxed", R: "relaxed" }, plant: true });

// the turnaround stance: feet under the hips, arms easy
export const relaxed = (yaw: number, ex: Record<string, number> = BO_GRIN): Pose => ok(base(yaw, {}, ex), "relaxed");

// the wave: her LEFT arm high and wide, the forearm rocking, head tipped into it, the big grin
export const wave = (yaw: number, t = 0, ex: Record<string, number> = { smile: 1, cheek: 0.8, lidLower: 0.3, browRaise: 0.45, mouthOpen: 0.42 }): Pose => {
  const rock = Math.sin(t);
  const p = base(yaw, { shoulderRaiseL: 138, shoulderSwingL: 14, shoulderTwistL: 30, elbowL: 46 + 16 * rock, pronationL: 25, wristDevL: -10 * rock, headTilt: 9, neckSide: 5, spineSide: 5, clavLiftL: 16, shoulderRaiseR: 14, elbowR: 22 }, ex);
  return ok({ ...p, hands: { L: "wave", R: "relaxed" } }, "wave");
};

// THE COPYCAT: a grown-up's stance borrowed whole. Feet planted wide, both hands on her hips,
// elbows out, chest puffed, chin up, a proud half-grin.
export const handsOnHips = (yaw: number): Pose => {
  const T = turn(yaw);
  let p = base(yaw, { spineBend: -7, neckBend: -6, headNod: -9, headTilt: 5 }, { browFurrow: 0.35, smile: 0.6, cheek: 0.35, lidUpper: 0.15, mouthOpen: 0.18 });
  const feet = { L: T([0.125, AH, 0.0]), R: T([-0.125, AH, 0.01]) }, over = T([0, 0, 0.04]);
  p = stand(D, p, feet, [over[0], over[2]]);
  for (const [s, k] of [["L", 1], ["R", -1]] as const) {
    const r = rigFor(BO_SPEC, { ...p, plant: false }), hip = apply(r.pelvis, [k * 0.58 * hh, 0.14 * hh, 0.02 * hh]);
    p = reach(D, { ...p, joints: { ...p.joints, ["shoulderSwing" + s]: -12, ["shoulderRaise" + s]: 42, ["elbow" + s]: 100, ["wristFlex" + s]: 12, ["pronation" + s]: 40, ["shoulderTwist" + s]: 20 } }, s, hip, { ["shoulderSwing" + s]: -12 });
  }
  return ok({ ...p, hands: { L: { fist: 0.6, relaxed: 0.4 }, R: { fist: 0.6, relaxed: 0.4 } } }, "handsOnHips");
};

// NOT GIVING UP: up on her toes, both arms at full stretch for something out of reach, brows down,
// eyes on the target, mouth set.
export const tiptoeReach = (yaw: number): Pose => {
  const T = turn(yaw);
  let p = base(yaw, { spineBend: -6, neckBend: -14, headNod: -14, toeL: 20, toeR: 20, clavLiftL: 22, clavLiftR: 22 }, { browFurrow: 0.8, lidUpper: 0.1, lookY: 0.9, mouthOpen: 0.14, mouthWide: -0.4, smile: -0.05 });
  p = { ...p, root: [p.root[0], p.root[1] + 0.035, p.root[2]] };
  const feet = { L: T([0.065, AH + 0.03, 0.0]), R: T([-0.065, AH + 0.03, -0.015]) }, fw = T([0, 0, 0.075]);
  p = stand(D, p, feet, [fw[0], fw[2]], { L: -20, R: -20 }, 14);
  // the raised arms move the centre of mass, so settle the balance again with the arms up, then re-aim the hands
  for (let k = 0; k < 2; k++) {
    p = reach(D, { ...p, joints: { ...p.joints, shoulderRaiseR: p.joints.shoulderRaiseR > 100 ? p.joints.shoulderRaiseR : 165, shoulderSwingR: p.joints.shoulderSwingR > 30 ? p.joints.shoulderSwingR : 70, elbowR: p.joints.elbowR ?? 10 } }, "R", T([-0.06, 1.42, 0.12]));
    p = reach(D, { ...p, joints: { ...p.joints, shoulderRaiseL: p.joints.shoulderRaiseL > 100 ? p.joints.shoulderRaiseL : 165, shoulderSwingL: p.joints.shoulderSwingL > 30 ? p.joints.shoulderSwingL : 70, elbowL: p.joints.elbowL ?? 10 } }, "L", T([0.07, 1.4, 0.12]));
    p = stand(D, p, feet, [fw[0], fw[2]], { L: -20, R: -20 }, 10);
  }
  return ok({ ...p, hands: { L: "open", R: "open" } }, "tiptoeReach");
};

// a walking frame (the contact position) from the same walk the film uses
export const walkContact = (yaw: number): Pose => {
  const plan = planWalk({ t0: 0, s0: 0, step: 0.3, cycle: 24, n: 8, first: "L", lateral: 0.05 });
  const dir: V3 = [Math.sin(yaw * DEG), 0, Math.cos(yaw * DEG)];
  return ok(walkAt(D, plan, 48, base(yaw, {}, { smile: 0.5, cheek: 0.3, mouthOpen: 0.2 }), { origin: mul(dir, -plan.rootS(48)), dir }, { armSwing: 26 }).pose, "walkContact");
};
