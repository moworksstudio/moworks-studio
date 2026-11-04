// __SLUG__.js — the scenes of "__TITLE__" (Inner Voice Short). Scaffolded by tools/new-video.mjs: a cold-open caption and one room scene
// to build from. Replace the T table with the beat sheet from projects/__SLUG__/PLAN.md, then build each scene.
// The worked example with every device (glances, a time-skip, the shadow, typed red words): src/examples/firstchord.js.
import { E, P, armchair, caption, dayLabel, finish, hero, life, moonShaft, moonWindow, ramp, room, typed, wallClock } from "../../inner-voice/kit.js";

export const FPS = 30;
export const SECONDS = __SECONDS__;

// the edit: every time lives here (the sound script mirrors these numbers)
export const T = {
  open: 0.35, // the cold-open line
  aIn: 3.0, // fade up on the first room
  cap: 4.3, // a white line
  w1: Math.min(8.0, SECONDS - 2.5), // a red line
  out: SECONDS - 0.65, // fade out
};
const WIN = { x: 1490, y: 150, w: 275, h: 260 };

// ── 0 · the cold open ───────────────────────────────────────────────────────────────────────────────────────────
const open = (x, t) => {
  room(x, { floor: false });
  caption(x, "The cold-open line goes here.", 960, 556, { size: 58, op: life(t, T.open, 2.95, 0.7, 0.5) });
};

// ── A · the routine ─────────────────────────────────────────────────────────────────────────────────────────────
const sceneA = (x, t) => {
  room(x);
  moonShaft(x, WIN, {});
  moonWindow(x, WIN, {});
  wallClock(x, 300, 270, 60, 22 * 60 + 10);
  armchair(x, 560);
  hero(x, {
    x: 566,
    y: 668,
    lean: -6,
    breathe: t,
    legs: [
      { knee: [70, 6], foot: [84, 60], toe: 1 },
      { knee: [98, 18], foot: [190, 60], toe: 1 },
    ],
    arms: [
      { hand: [26, -42], bend: -1 },
      { hand: [40, -50], bend: -1, front: true },
    ],
    face: { eyes: "half", lid: 0.55, brows: "flat", mouth: "line", turn: 0.3, look: [3, 3], bags: 0.4 },
  });
  caption(x, "A white line, past tense.", 880, 262, { op: life(t, T.cap, T.cap + 3, 0.6, 0.45) });
  const w1 = "a red line.";
  caption(x, w1, 770, 342, { color: P.red, reveal: typed(t, T.w1, w1), op: life(t, T.w1, T.w1 + 2, 0.05, 0.35) });
  dayLabel(x, "DAY 1", life(t, T.aIn + 0.5, SECONDS + 1, 0.6, 0.1));
};

// ── the edit ────────────────────────────────────────────────────────────────────────────────────────────────────
export const draw = (x, t, frame) => {
  x.setTransform(1, 0, 0, 1, 0, 0);
  let black = 0;
  if (t < T.aIn) open(x, t);
  else {
    sceneA(x, t);
    black = Math.max(1 - ramp(t, T.aIn, T.aIn + 0.8, E.sine), ramp(t, T.out, SECONDS, E.sine));
  }
  finish(x, frame, { black });
};
