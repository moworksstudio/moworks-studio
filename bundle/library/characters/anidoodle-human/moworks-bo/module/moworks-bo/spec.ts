// BƠ'S CANON, HEAD AND FIGURE SPEC: the numbers the rig, the poses and the gate all read.
// Kept apart from index.ts so the poses can import them without a cycle.
import { type CanonRow, headsForAge } from "anidoodle/canvas-core/character/human/canon";
import { CHILD_BODY } from "anidoodle/canvas-core/character/human/mannequin";
import { CHILD_HEAD, EXPRESSIONS, type HeadSpec } from "anidoodle/canvas-core/character/human/head";
import type { FigureSpec } from "anidoodle/canvas-core/character/human/figure";

// ---------------------------------------------------------------- canon: a declared stylised row
// A real seven-year-old is ~5.9 heads (Loomis' age chart). Bơ is drawn at 5.0: the head is
// enlarged, the body below it keeps a seven-year-old's ratios (legs ~45% of height, short neck).
export const BO_REAL_HEADS = headsForAge(7);
export const BO_CANON: CanonRow = {
  id: "child7Stylised", label: "Child 7 y, stylised (5.0 heads, declared enlargement of a real 5.9-head child)", age: 7, stylised: true,
  note: "head enlarged 1.18x over the age-7 canon; body ratios kept", heads: 5.0, eyeLine: 0.42,
  root: 2.54, hip: 2.44, knee: 1.32, ankle: 0.22, lumbar: 2.72, chest: 2.94, neckBase: 3.82, pivot: 4.26, shoulder: 3.75,
  hipX: 0.27, shoulderX: 0.56, upperArm: 0.9, forearm: 0.7, hand: 0.52, foot: 0.74, heel: 0.15, build: 0.3,
};

// ---------------------------------------------------------------- the head: round, big-eyed
export const BO_HEAD: HeadSpec = {
  ...CHILD_HEAD,
  // a rounder face than the stock child: fuller cheeks, a small chin
  skull: [{ c: [0, 0.6, -0.04], r: [0.44, 0.43, 0.46] }, { c: [0.2, 0.26, 0.12], r: [0.235, 0.235, 0.21] }, { c: [-0.2, 0.26, 0.12], r: [0.235, 0.235, 0.21] }, { c: [0, 0.08, 0.17], r: [0.18, 0.085, 0.14] }, { c: [0.13, 0.11, 0.15], r: [0.15, 0.11, 0.14] }, { c: [-0.13, 0.11, 0.15], r: [0.15, 0.11, 0.14] }],
  nose: [{ c: [0, 0.335, 0.4], r: [0.04, 0.04, 0.035] }, { c: [0, 0.3, 0.43], r: [0.043, 0.038, 0.04] }],   // a button nose
  eyeY: 0.42, eyeX: 0.165, eyeW: 0.064, eyeH: 0.082,                                                       // big, curious eyes
  browY: 0.565, noseY: 0.29, mouthY: 0.175, mouthW: 0.08, blush: true, freckles: [],
};

// 1.15 m: a small seven-year-old girl (the median is ~1.22 m; "nhỏ con", small for her age)
export const BO_SPEC: FigureSpec = { canon: BO_CANON, height: 1.15, body: { ...CHILD_BODY, handGirth: 1.1 }, head: BO_HEAD, roles: { skin: "skin" } };

// her expressions: the stock six, with her grin OPEN, because the gap tooth is who she is
export const BO_EXPRESSIONS: Record<string, Record<string, number>> = {
  ...EXPRESSIONS,
  happy: { smile: 0.85, cheek: 0.6, lidLower: 0.2, browRaise: 0.25, mouthOpen: 0.32 },
  determined: { browFurrow: 1, lidUpper: 0.2, smile: 0.1, mouthWide: -0.25, lookX: 0.3, mouthOpen: 0.12 },
};
