// GRANDMA'S CANON, BODY AND HEAD: the numbers everything else is built from.
//
// Who: a small woman of about seventy-eight. 1.52 m (she has lost a few centimetres to her spine
// since she was young). A soft, slight build; a gentle stoop at the upper back that carries her
// head a little forward of her shoulders; knees never quite straight.
//
// Canon: there is no elder row in human/canon.ts, so she DECLARES one. In life an elderly woman
// is about 7 heads (Loomis' adult 7.5, less the height lost to the discs; the head does not
// shrink). Storybook enlarges the head 1.17x so the face carries the acting: 6.0 heads declared,
// measured against the body a real 7-head woman of her height would have. Below the neck the
// limb lengths are Winter's (fractions of that body height), so arms, legs, hands and feet are a
// real old woman's, not a child's. The trunk is short (disc compression); the neck is short and
// set forward; the shoulders slope and sit narrow; the pelvis is a woman's, wider at the hips.
import type { CanonRow } from "anidoodle/canvas-core/character/human/canon";
import { CHILD_BODY, type BodySpec } from "anidoodle/canvas-core/character/human/mannequin";
import type { HeadSpec } from "anidoodle/canvas-core/character/human/head";
import type { FigureSpec } from "anidoodle/canvas-core/character/human/figure";
import { dimsFromCanon } from "anidoodle/canvas-core/character/human/skeleton";

export const GRANDMA_VERSION = "1.0.0";
export const REAL_HEADS = 7.0;

export const CANON_ELDER: CanonRow = {
  id: "storybookElder", label: "Elder woman ~78 y, storybook (6.0 heads, declared stylisation of a real 7.0)", age: 78, stylised: true,
  note: "head enlarged 1.17x over a real 7-head elderly woman; Winter limb ratios below the neck; short trunk, short forward neck, sloping shoulders",
  heads: 6.0, eyeLine: 0.5,
  root: 3.33, hip: 3.15, knee: 1.72, ankle: 0.28, lumbar: 3.62, chest: 4.0, neckBase: 4.82, pivot: 5.24, shoulder: 4.66,
  hipX: 0.36, shoulderX: 0.64, upperArm: 1.09, forearm: 0.86, hand: 0.63, foot: 0.88, heel: 0.2, build: 0.4,
};

// The mannequin under the clothes is only the pose source (drawn.ts draws what is seen); what
// stays visible of it is her neck and her hands. Old hands: slimmer than a child's, and with the
// knuckle wrinkles and creases the adult detail pass draws.
export const GRANDMA_BODY: BodySpec = {
  ...CHILD_BODY,
  neck: [["neck", [0, 0.0, 0.02], [0.19, 0.12, 0.18]], ["neck", [0, 0.4, 0.0], [0.165, 0.09, 0.16]]],   // sheet round 3: thinner read as a pole
  handGirth: 0.96, handDetail: true,
};

// Her head: Loomis' adult construction, made hers. A rounder, narrower woman's cranium; soft
// cheekbones; a narrow jaw with a little softness (jowls) under the corners of the mouth; a
// rounded chin; a nose a touch longer than in youth; ears LARGER (cartilage keeps growing); eyes
// set under slightly hooded lids (eyeH small); thin brows.
export const ELDER_HEAD: HeadSpec = {
  pivot: [0, 0.27, -0.06],
  skull: [
    { c: [0, 0.63, -0.05], r: [0.365, 0.41, 0.45] },
    { c: [0.235, 0.43, 0.17], r: [0.11, 0.1, 0.14] }, { c: [-0.235, 0.43, 0.17], r: [0.11, 0.1, 0.14] },   // soft cheekbones
    { c: [0.235, 0.16, 0.0], r: [0.085, 0.1, 0.1] }, { c: [-0.235, 0.16, 0.0], r: [0.085, 0.1, 0.1] },     // a narrow jaw
    { c: [0.165, 0.1, 0.17], r: [0.095, 0.08, 0.1] }, { c: [-0.165, 0.1, 0.17], r: [0.095, 0.08, 0.1] },   // jowls
    { c: [0, 0.61, 0.33], r: [0.24, 0.045, 0.07] },                                                          // a light brow ridge
    { c: [0, 0.2, 0.27], r: [0.14, 0.12, 0.11] },                                                           // the muzzle over the teeth
    { c: [0, 0.05, 0.28], r: [0.085, 0.065, 0.08] },                                                        // a rounded chin
  ],
  nose: [{ c: [0, 0.54, 0.4], r: [0.03, 0.04, 0.03] }, { c: [0, 0.45, 0.44], r: [0.034, 0.05, 0.034] }, { c: [0, 0.35, 0.475], r: [0.045, 0.036, 0.036] }],
  ear: { c: [0.355, 0.41, -0.03], r: [0.05, 0.155, 0.09] },
  face: { c: [0, 0.45, -0.05], r: [0.34, 0.56, 0.46] },
  eyeStyle: "almond", eyeY: 0.5, eyeX: 0.135, eyeW: 0.06, eyeH: 0.022,
  browY: 0.6, noseY: 0.33, mouthY: 0.19, mouthW: 0.092, blush: true,
};

export const GRANDMA_SPEC: FigureSpec = {
  canon: CANON_ELDER, height: 1.52, body: GRANDMA_BODY, head: ELDER_HEAD,
  roles: { skin: "skin" },
};
export const GRANDMA_DIMS = dimsFromCanon(GRANDMA_SPEC.canon, GRANDMA_SPEC.height);
