// firstchord.js — "First Chord": the opening 20 s of an original short in the inner-voice style (no narration; the
// story is told in captions). A guitar bought in January waits by the moonlit window while he scrolls; on DAY 1 he
// finally plays it, the first chord is awful, and the shadow arrives with its advice.
// The Inner Voice Short worked example. Drawn with src/inner-voice/kit.js. Times below are the edit; the sound cues in
// src/examples/ExampleFirstChord.tsx sit on the same numbers. Copy its devices, never its story.
import {
  E, FLOOR, P, alarmMarks, armchair, caption, clamp, dayLabel, finish, guitar, guitarStand, hero, lerp, life, moonShaft,
  moonWindow, phone, radial, ramp, room, shadowFigure, softLight, typed, wallClock,
} from "../inner-voice/kit.js";

export const FPS = 30;
export const SECONDS = 20;

export const T = {
  open: 0.35, // "He bought the guitar in January."
  aIn: 3.0, // fade up on the room
  cap: 4.3, // "Every night, it waited."
  look: 7.55, // he glances at the guitar
  w1: 8.55, // "one more video."
  skip: 10.45, // the clock spins
  skipEnd: 12.75,
  w2: 11.85, // "it's too late now."
  aOut: 13.15, // fade to black
  b: 13.75, // DAY 1
  strum: 15.15, // the downstroke (the chord sounds at 15.25)
  shadow: 16.25, // the shadow fades in
  w3: 16.95, // "you sound awful."
  w4: 18.3, // "put it down."
  lower: 18.85, // the guitar dips
  out: 19.35, // fade out
};
const WIN = { x: 1490, y: 150, w: 275, h: 260 };
const CLOCK = [300, 270, 60];
const TAPS = [3.95, 4.7, 5.6, 6.35, 7.15, 9.15, 9.9, 10.5, 11.0, 11.45, 11.9, 12.3];

// ── 0 · the cold open ───────────────────────────────────────────────────────────────────────────────────────────
const open = (x, t) => {
  room(x, { floor: false });
  caption(x, "He bought the guitar in January.", 960, 556, { size: 58, op: life(t, T.open, 2.95, 0.7, 0.5) });
};

// ── A · every night ─────────────────────────────────────────────────────────────────────────────────────────────
const tapAt = (t) => TAPS.reduce((m, k) => (t >= k && t - k < 0.16 ? Math.sin(((t - k) / 0.16) * Math.PI) : m), 0);
const sceneA = (x, t) => {
  const skip = ramp(t, T.skip, T.skipEnd, E.inOut);
  const glance = Math.min(ramp(t, T.look, T.look + 0.45, E.out), 1 - ramp(t, 8.85, 9.3, E.inOut));
  room(x);
  moonShaft(x, WIN, { k: 1 - skip * 0.25 });
  moonWindow(x, WIN, { moon: [lerp(0.68, 0.84, skip), lerp(0.28, 0.5, skip)] });
  wallClock(x, ...CLOCK, lerp(9 * 60 + 10, 25 * 60 + 40, skip));
  // the guitar on its stand, in the moonlight (its strings shimmer once when he looks)
  guitarStand(x, 1230);
  const call = ramp(t, 7.7, 7.8) * (1 - ramp(t, 7.8, 8.6, E.out));
  guitar(x, 1232, 589, 3, 0.85, { vibrate: call * 0.6, phase: t * 70 });
  armchair(x, 560);
  // the hero, scrolling
  const tap = tapAt(t);
  const hipY = 668 + skip * 8;
  const lean = -6 - skip * 5;
  const hand = [lerp(96, 100, glance), lerp(-152, -128, glance) - tap * 4];
  const flick = 0.86 + 0.14 * Math.abs(Math.sin(t * 7.3)) + tap * 0.1;
  const lit = clamp(flick + skip * 0.1 * Math.sin(t * 23));
  softLight(x, (y) => radial(y, 566 + 74, hipY - 190, 210, P.phoneGlow, 0.5 * lit), { blur: 7 });
  hero(x, {
    x: 566,
    y: hipY,
    lean,
    breathe: t,
    legs: [
      { knee: [70, 6], foot: [84, 60], toe: 1 },
      { knee: [98, 18], foot: [190, 60], toe: 1 },
    ],
    arms: [
      { hand: [26, -42], bend: -1 },
      { hand, bend: -1, front: true },
    ],
    glow: [74, -186, 130, "#a8c8ff", 0.32 * lit],
    face: {
      eyes: "half",
      lid: lerp(lerp(0.55, 0.22, glance), 0.85, skip),
      brows: "flat",
      mouth: "line",
      turn: lerp(0.6, 0.85, glance),
      look: [lerp(5, 10, glance), lerp(4, -1, glance)],
      bags: lerp(0.45, 1, skip),
    },
    front: (y, hands) => phone(y, hands[1][0] + 6, hands[1][1] - 16, -16, 1, lit),
  });
  // words
  caption(x, "Every night, it waited.", 880, 262, { op: life(t, T.cap, 7.35, 0.6, 0.45) });
  const w1 = "one more video.";
  caption(x, w1, 770, 342, { color: P.red, reveal: typed(t, T.w1, w1), op: life(t, T.w1, 10.25, 0.05, 0.35) });
  const w2 = "it's too late now.";
  caption(x, w2, 770, 342, { color: P.red, reveal: typed(t, T.w2, w2), op: life(t, T.w2, 13.4, 0.05, 0.3) });
};

// ── B · DAY 1 ───────────────────────────────────────────────────────────────────────────────────────────────────
const sceneB = (x, t) => {
  room(x);
  moonShaft(x, WIN, {});
  moonWindow(x, WIN, { moon: [0.6, 0.26] });
  wallClock(x, ...CLOCK, 20 * 60 + 5);
  armchair(x, 560);
  // the guitar he holds: its pose dips when the shadow tells him to put it down
  const dip = ramp(t, T.lower, T.lower + 0.9, E.inOut);
  const g = { o: [-10, -50 + dip * 40], rot: 62 + dip * 14, s: 0.85 };
  const gp = (lx, ly) => {
    const r = (g.rot * Math.PI) / 180;
    return [g.o[0] + (lx * Math.cos(r) - ly * Math.sin(r)) * g.s, g.o[1] + (lx * Math.sin(r) + ly * Math.cos(r)) * g.s];
  };
  // strum: wind up, one downstroke, then the hand clamps the strings
  const up = ramp(t, 14.8, T.strum, E.inOut);
  const down = ramp(t, T.strum, T.strum + 0.1, E.in);
  const settle = ramp(t, 15.95, 16.15, E.out);
  const base = gp(0, -20);
  const perp = [Math.cos((g.rot * Math.PI) / 180), Math.sin((g.rot * Math.PI) / 180)]; // across the strings
  const off = -38 * up + 68 * down - 26 * settle;
  const strumHand = [base[0] + perp[0] * off, base[1] + perp[1] * off];
  const fretHand = gp(0, -225);
  const ring = clamp(1 - (t - 15.25) / 0.75) * (t >= 15.25 ? 1 : 0) * (1 - settle);
  // the wince
  const wince = ramp(t, 15.3, 15.38) * (1 - ramp(t, 16.15, 16.3));
  const after = ramp(t, 16.15, 16.4);
  const jit = wince * (1 - ramp(t, 15.3, 15.75)) * Math.sin(t * 95) * 3;
  const sad = ramp(t, T.lower, T.lower + 0.6);
  hero(x, {
    x: 1040 + jit,
    y: 566,
    lean: 2 + dip * 3,
    breathe: t,
    legs: [
      { knee: [-16, 90], foot: [-20, 162], toe: -1 },
      { knee: [18, 90], foot: [26, 162], toe: 1 },
    ],
    arms: [
      { hand: strumHand, bend: -1, front: true },
      { hand: fretHand, bend: -1, front: true },
    ],
    face: {
      eyes: wince > 0.5 ? "squeeze" : "dot",
      brows: wince > 0.5 ? "angry" : after > 0.5 ? (sad > 0.5 ? "sad" : "worried") : "flat",
      mouth: wince > 0.5 ? "grit" : after > 0.5 ? (sad > 0.5 ? "frown" : "wavy") : "line",
      turn: 0.3,
      look: [lerp(6, 3, sad), lerp(7, 10, sad)],
      sweat: Math.max(ramp(t, 15.45, 15.6) * (1 - ramp(t, 17.6, 18.0)), 0),
    },
    prop: (y) => guitar(y, g.o[0], g.o[1], g.rot, g.s, { vibrate: ring, phase: t * 80 }),
  });
  alarmMarks(x, 1040 + 30, 330, 96, "#9a9a9a", ramp(t, 15.3, 15.36) * (1 - ramp(t, 15.75, 15.95)));
  // the shadow: it leans in and, on "put it down.", lays a hand on the headstock and presses it down
  const sOp = ramp(t, T.shadow, T.shadow + 0.75, E.sine);
  const reach = ramp(t, T.w4 - 0.1, T.w4 + 0.5, E.inOut);
  const SX = 1580;
  const SS = 0.95;
  const head = gp(0, -400); // the headstock, hip-local → world → shadow-local
  const press = [(1040 + head[0] - SX) / SS, (566 + head[1] - 26 - FLOOR) / SS];
  shadowFigure(x, {
    x: SX,
    y: FLOOR,
    s: SS,
    op: sOp,
    t,
    lean: -6 - reach * 6,
    look: -1,
    eyes: ramp(t, 16.7, 16.95),
    smug: 0.25,
    slant: 1.3,
    smile: ramp(t, 17.1, 17.5) * 0.7,
    arms: [
      { hand: [lerp(-78, press[0], reach), lerp(-182, press[1], reach)], bend: -1 },
      { hand: [74, -190], bend: 1 },
    ],
  });
  // words
  dayLabel(x, "DAY 1", life(t, 14.3, 21, 0.6, 0.1));
  const w3 = "you sound awful.";
  caption(x, w3, 1240, 246, { color: P.red, reveal: typed(t, T.w3, w3), op: life(t, T.w3, 18.15, 0.05, 0.3) });
  const w4 = "put it down.";
  caption(x, w4, 1240, 246, { color: P.red, reveal: typed(t, T.w4, w4, 18), op: life(t, T.w4, 21, 0.05, 0.1) });
};

// ── the edit ────────────────────────────────────────────────────────────────────────────────────────────────────
export const drawFirstChord = (x, t, frame) => {
  x.setTransform(1, 0, 0, 1, 0, 0);
  let black = 0;
  if (t < T.aIn) open(x, t);
  else if (t < T.b) {
    sceneA(x, t);
    black = Math.max(1 - ramp(t, T.aIn, T.aIn + 0.8, E.sine), ramp(t, T.aOut, T.b, E.sine));
  } else {
    sceneB(x, t);
    black = Math.max(1 - ramp(t, T.b, T.b + 0.6, E.sine), ramp(t, T.out, SECONDS, E.sine));
  }
  finish(x, frame, { black });
};
