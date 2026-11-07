// BƠ WALKS: the walk from footsteps (character/human/walk.ts), shared by the film and the gate.
// A seven-year-old's walk: short steps (0.30 m), a quick cadence (a step every 12 frames at 30 fps,
// 150 steps a minute), a bigger arm swing than an adult's, and a little extra bob from the big
// wellies. She walks screen-left to screen-right, side-on (yaw 90: we see her right side, the
// fish clip and the bag), for the whole 3 s; the canvas bag swings on its strap a beat behind her hips.
import type { V3 } from "anidoodle/canvas-core/character/math3";
import type { Pose } from "anidoodle/canvas-core/character/types";
import { planWalk, walkAt } from "anidoodle/canvas-core/character/human/walk";
import { BO_DIMS, base } from "./poses";

export const WALK_FRAMES = 90, WALK_YAW = 90;
export const BO_WALK = planWalk({ t0: 4, s0: 0, step: 0.3, cycle: 24, n: 8, first: "L", lateral: 0.05 });
export const WALK_DIR: V3 = [1, 0, 0], WALK_ORIGIN: V3 = [-1.15, 0, 0];

export const boWalkAt = (f: number): Pose => {
  // the pelvis rides a centimetre higher than the standing root: a child's walk is springy, not crouched
  const b = base(WALK_YAW, {}, {}), w = walkAt(BO_DIMS, BO_WALK, f, { ...b, root: [b.root[0], b.root[1] + 0.012, b.root[2]] }, { origin: WALK_ORIGIN, dir: WALK_DIR }, { armSwing: 28, bob: 0.016, twist: 7 });
  const p = w.pose;
  // a blink at 1.6 s; the grin opens as she goes
  const blink = f >= 48 && f < 53 ? Math.sin(((f - 48) / 5) * Math.PI) : 0;
  const ex = { smile: 0.7, cheek: 0.35, mouthOpen: 0.26, lidUpper: blink, lookX: 0.1 };
  return { ...p, joints: { ...p.joints, headNod: -3 }, expression: ex, hands: { L: "relaxed", R: "relaxed" }, aux: { bagSwing: 11 * Math.sin(2 * Math.PI * w.phase * 2 - 0.9) * w.amp } };
};
