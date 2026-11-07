// GRANDMA WALKS: 3 s, from footsteps (character/human/walk.ts). Short, careful steps (30 cm,
// one every 20 frames: 90 bpm at 30 fps), a small arm swing, almost no bob, and the cane in the
// right hand moving WITH THE LEFT LEG, the way a cane is used: it lands with each left heel strike,
// stays planted while the left foot carries her, and swings forward when the left leg swings.
// The arm is solved every frame to put the tip where the cane plan says, so the tip never slides.
//
// Reference opened: Williams "The Animator's Survival Kit", the old-person walk (short steps, the
// feet barely leave the ground, the body leads); Perry & Burnfield "Gait Analysis" for the timing;
// physiotherapy cane-gait instruction (the cane and the weaker leg advance together).
import { type V3, DEG, add, mix3, mul } from "anidoodle/canvas-core/character/math3";
import type { Pose } from "anidoodle/canvas-core/character/types";
import { planWalk, walkAt } from "anidoodle/canvas-core/character/human/walk";
import { GRANDMA_DIMS } from "./spec";
import { base } from "./poses";
import { solveCane } from "./cane";

export const WALK_N = 90;
export const WALK_YAW = 78;                                   // walking to screen right, a little toward us: the cane side faces the lens
export const WALK_DIR: V3 = [Math.sin(WALK_YAW * DEG), 0, Math.cos(WALK_YAW * DEG)];
export const PLAN = planWalk({ t0: 0, s0: 0, step: 0.3, cycle: 40, n: 5, first: "L", lateral: 0.075 });
export const WALK_ORIGIN: V3 = mul(WALK_DIR, -PLAN.rootS(WALK_N) * 0.5);   // the stretch she covers is centred on the world origin
const LEFT: V3 = [Math.cos(WALK_YAW * DEG), 0, -Math.sin(WALK_YAW * DEG)];
const onPath = (s: number, l: number, u: number): V3 => add(add(WALK_ORIGIN, mul(WALK_DIR, s)), add(mul(LEFT, l), [0, u, 0]));

// the cane plan: a plant beside each LEFT heel strike, out to her right and a little ahead
const CANE_LAT = -0.21, CANE_AHEAD = 0.1, CANE_STANCE = PLAN.cycle * 0.5, CANE_LIFT = 0.045;   // lifts as the weight passes onto the right leg
const LS = PLAN.strikes.filter((k) => k.side === "L");
const plantAt = (i: number): V3 => onPath(LS[i].s + CANE_AHEAD, CANE_LAT, 0);
const ease = (u: number) => u * u * (3 - 2 * u);
export const caneTarget = (f: number): { tip: V3; planted: boolean } => {
  let k = 0; for (let i = 0; i < LS.length; i++) if (LS[i].t <= f) k = i;
  const lift = LS[k].t + CANE_STANCE;
  if (k + 1 >= LS.length || f < lift) return { tip: plantAt(k), planted: true };
  const u = Math.max(0, Math.min(1, (f - lift) / (LS[k + 1].t - lift)));
  return { tip: add(mix3(plantAt(k), plantAt(k + 1), ease(u)), [0, CANE_LIFT * Math.sin(Math.PI * u), 0]), planted: false };
};

// she walks through the whole film: the planner's closing step (feet together, knees bent) asks her
// ankle for more than its 25 degrees of dorsiflexion and lifts the heel (gate round 2), so it falls
// after the last frame
const WALK_BASE = base(WALK_YAW, { spineBend: 28 }, {});
// the right arm's carriage while walking, the solve's starting point every frame (so the frame is a pure function of f)
const WALK_ARM = { shoulderRaiseR: 16, shoulderSwingR: 78, shoulderTwistR: 0, elbowR: 24, pronationR: 0, wristFlexR: 0, wristDevR: 0 };

export const grandmaWalkAt = (f: number): { pose: Pose; tip: V3; planted: boolean } => {
  const w = walkAt(GRANDMA_DIMS, PLAN, f, WALK_BASE, { origin: WALK_ORIGIN, dir: WALK_DIR }, { armSwing: 9, bob: 0.009, twist: 4 });
  const c = caneTarget(f);
  let p = solveCane(w.pose, c.tip, { ref: WALK_ARM });
  // the face: a little concentration on the step, a blink, then a smile as she arrives
  const blink = f >= 48 && f < 53 ? Math.sin(((f - 48) / 5) * Math.PI) : 0, arrive = ease(Math.max(0, Math.min(1, (f - 62) / 20)));
  p = { ...p, expression: { lookY: -0.35 * (1 - arrive), browFurrow: 0.15 * (1 - arrive), smile: 0.15 + 0.55 * arrive, cheek: 0.4 * arrive, lidUpper: blink, lookX: 0 }, hands: { L: "relaxed", R: WALK_BASE.hands!.R } };
  return { pose: p, tip: c.tip, planted: c.planted };
};
