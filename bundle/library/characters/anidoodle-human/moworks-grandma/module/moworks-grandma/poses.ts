// GRANDMA'S POSES. Built from placed feet, solved legs, balance and a cane tip placed on the floor
// (the arm is SOLVED to put it there), never from a pile of guessed angles where contact matters.
// Every pose passes the joint-limit check at load (checkPose throws) and check.ts holds each to
// its balance. A cane she leans on is part of her support, as a seat is part of a sitter's.
//
// Reference opened: Loomis "Figure Drawing for All It's Worth" p. 64 (weight over the support);
// the older body's posture (thoracic kyphosis carrying the head forward, the pelvis tucked, knees
// soft) from geriatric posture studies (Kado et al. 2004: an average kyphosis angle that grows
// past 50 degrees in the late seventies); a cane's standard fitting (tip ~15 cm ahead and ~15 cm
// out from the little toe, elbow bent 15-20 degrees).
import { type V3, DEG, add, apply, mv } from "anidoodle/canvas-core/character/math3";
import type { Pose } from "anidoodle/canvas-core/character/types";
import { reach, stand } from "anidoodle/canvas-core/character/human/balance";
import { checkPose, rigFor } from "anidoodle/canvas-core/character/human/figure";
import { GRANDMA_DIMS, GRANDMA_SPEC } from "./spec";
import { caneGrip, caneTip, gripCentre, solveCane } from "./cane";

export const GRANDMA_POSE_DIMS = GRANDMA_DIMS;
const D = GRANDMA_DIMS, hh = D.hh, AH = D.ankleH;
export const turn = (yaw: number) => (v: V3): V3 => mv([Math.cos(yaw * DEG), 0, Math.sin(yaw * DEG), 0, 1, 0, -Math.sin(yaw * DEG), 0, Math.cos(yaw * DEG)], v);

// her carriage: the pelvis tucked, the upper back rounded, the neck extended to bring the eyes
// level again, the knees never quite locked (the root sits a little low, so the leg IK bends them)
export const STOOP: Record<string, number> = { pelvisTilt: -4, spineBend: 26, neckBend: -12, headNod: -8 };
export const base = (yaw = 0, j: Record<string, number> = {}, ex: Record<string, number> = {}): Pose => ({
  root: [0, D.root - 0.016, 0], yaw, joints: { ...STOOP, shoulderRaiseL: 10, shoulderSwingL: 30, elbowL: 22, ...j }, expression: ex,
  hands: { L: "relaxed", R: { angles: caneGrip() } }, plant: false,
});

// feet, balance, then the arm that puts the cane's tip where it is asked; twice, because moving
// the arm moves the centre of mass and settling the pelvis moves the shoulder
const caneStance = (p: Pose, yaw: number, feet: { L: V3; R: V3 }, over: V3, tip: V3, ref?: Record<string, number>, settle?: (p: Pose) => Pose): Pose => {
  const T = turn(yaw), F = { L: T(feet.L), R: T(feet.R) }, o = T(over), t = T(tip);
  for (let k = 0; k < 2; k++) { p = stand(D, p, F, [o[0], o[2]]); if (settle) p = settle(p); p = solveCane(p, t, { ref }); }
  return checked(p);
};
const checked = (p: Pose): Pose => { checkPose(p, "grandma"); return p; };
const FEET = { L: [0.085, AH, 0.0] as V3, R: [-0.085, AH, 0.0] as V3 };

// standing easy, the cane planted beside her right foot, both feet even
export const relaxed = (yaw: number, ex: Record<string, number> = {}): Pose =>
  caneStance(base(yaw, {}, ex), yaw, FEET, [0, 0, 0.035], [-0.25, 0, 0.11]);
// the cane tip the relaxed stance asks for (world, at that yaw)
export const relaxedTip = (yaw: number): V3 => turn(yaw)([-0.25, 0, 0.11]);

// the wave: her free LEFT hand up, palm out, the forearm rocking; head tipped toward it, a smile
export const wave = (yaw: number, t = 0, ex: Record<string, number> = { smile: 0.95, cheek: 0.7, lidLower: 0.3, browRaise: 0.35 }): Pose => {
  const rock = Math.sin(t);
  const p = base(yaw, { shoulderRaiseL: 118, shoulderSwingL: 22, shoulderTwistL: 28, elbowL: 62 + 14 * rock, pronationL: 25, wristDevL: -8 * rock, clavLiftL: 10, headTilt: 7, neckSide: 3, spineSide: 3 }, ex);
  return caneStance({ ...p, hands: { L: "wave", R: p.hands!.R } }, yaw, FEET, [0, 0, 0.035], [-0.25, 0, 0.11]);
};

// resting on the cane: tip planted in front of her, both hands stacked on the crook, leaning a little
export const restOnCane = (yaw: number): Pose => {
  const T = turn(yaw), p = base(yaw, { spineBend: 30, neckBend: -16, headNod: -8 }, { smile: 0.45, cheek: 0.35, lidLower: 0.2, lookY: -0.1 });
  const ref = { shoulderRaiseR: 32, shoulderSwingR: 78, shoulderTwistR: -10, elbowR: 48, pronationR: 20, wristFlexR: 0, wristDevR: 0 };
  // the left hand comes over to rest on the back of the right fist
  const leftOnRight = (q: Pose): Pose => {
    const r = rigFor(GRANDMA_SPEC, q), on = add(gripCentre(r), add(T([0.035, 0, -0.01]), [0, 0.075, 0]));
    return reach(D, { ...q, joints: { ...q.joints, shoulderRaiseL: 34, shoulderSwingL: 92, elbowL: 70, pronationL: 70, wristFlexL: 25 } }, "L", on);
  };
  let q = caneStance(p, yaw, { L: [0.085, AH, -0.01], R: [-0.08, AH, 0.0] }, [0, 0, 0.07], [-0.03, 0, 0.27], ref);
  q = leftOnRight(q);
  return checked({ ...q, hands: { L: { relaxed: 0.55, open: 0.45 }, R: q.hands!.R } });
};

// an aching back: a deeper stoop, the left hand pressed into the small of her back, weight
// tipped onto the cane, the face screwed up a little
export const achingBack = (yaw: number): Pose => {
  const p = base(yaw, { pelvisTilt: 0, spineBend: 34, spineSide: -3, neckBend: -20, headNod: -10, headTilt: -5 }, { browSad: 0.55, lidUpper: 0.3, smile: -0.15, mouthWide: 0.2, lookY: 0.1 });
  const ref = { shoulderRaiseR: 20, shoulderSwingR: 55, elbowR: 14 };
  const handOnBack = (q: Pose): Pose => {
    const r = rigFor(GRANDMA_SPEC, q), small = apply(r.lumbar, [0.2 * hh, 0.02 * hh, -0.52 * hh]);
    return reach(D, { ...q, joints: { ...q.joints, shoulderRaiseL: 38, shoulderSwingL: -50, shoulderTwistL: 30, elbowL: 95, pronationL: 60, wristFlexL: -30 } }, "L", small);
  };
  let q = caneStance(p, yaw, { L: [0.09, AH, -0.02], R: [-0.08, AH, 0.0] }, [-0.04, 0, 0.06], [-0.27, 0, 0.21], ref, handOnBack);
  q = handOnBack(q);
  return checked({ ...q, hands: { L: { open: 0.7, relaxed: 0.3 }, R: q.hands!.R } });
};

// the tip each library pose plants (check.ts holds it to the floor and counts it as support)
export const tipOf = (p: Pose): V3 => caneTip(rigFor(GRANDMA_SPEC, p));
