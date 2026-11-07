// The elbow rule of the anatomy check (G-ANATOMY, owner #1254; anatomy.mjs reads films' code against it, with its RAISED_PX), as plain geometry so a character's own
// sheet can be held to it too (the house heroes' gate, packages/moworks-styles/house/harness.js). An elbow bends one way only:
//   side view   the forearm folds toward the front of the body (the way the character faces), never back past the straight arm
//   front view  an arm at or above its shoulder bends with its elbow under the line from the shoulder to the hand (its elbow hangs down),
//               the rule anatomy.mjs holds Inner Voice Short's hero to; a hanging arm is the kit's own and not judged
// Points are screen px (y down). A few px or degrees of slack: a straight arm drawn with a hair of bend is not an error.
export const ELBOW_SLACK_PX = 3, ELBOW_SLACK_DEG = 5, RAISED_PX = 30;          // 5 degrees: a hanging arm drawn with a hair of bend

/** One arm's elbow: { ok, why }. limb: { view: "side", flex } (degrees the forearm folds toward the front; negative is backward) or
 *  { view: "front", sh: [x, y], el: [x, y], hand: [x, y] }. */
export function elbowRight(limb) {
  if (limb.view === "side") {
    const ok = Number(limb.flex) >= -ELBOW_SLACK_DEG;
    return { ok, why: ok ? "" : `the forearm folds ${Math.round(-limb.flex)} degrees backward (the elbow bent the wrong way)` };
  }
  const [sx, sy] = limb.sh, [ex, ey] = limb.el, [hx, hy] = limb.hand;
  if (hy > sy + RAISED_PX) return { ok: true, why: "" };          // the hand below the shoulder: a hanging or reaching-down arm, the kit's own way
  const vx = hx - sx, vy = hy - sy, wx = ex - sx, wy = ey - sy, len = Math.hypot(vx, vy) || 1;
  if (Math.abs(vx) < 0.15 * len) return { ok: true, why: "" };   // straight up: no "under" to speak of
  const below = ((vx * wy - vy * wx) * Math.sign(vx)) / len;     // px the elbow sits under the shoulder-to-hand line
  const ok = below >= -ELBOW_SLACK_PX;
  return { ok, why: ok ? "" : `the elbow is ${Math.round(-below)} px above the line from the shoulder to the hand` };
}
