// The 2D Explainer's kid on the house sheet (owner #1287-#1293; #1293 option A). Drawn by the source skill's own house-hero.js (engine/house-hero.js:
// the red hoodie, jeans and sneakers in flat cel fills, one hard cel shadow from HOUSE.light.key, warm and cool rims, no outlines), with the
// hooks of explainer-2d-hooks.mjs spliced into the copy the page runs. The kit draws the kid in one stance; the app poses the kit's OWN pieces:
//   views  front, back and profile are the kit's; three-quarter is the front with the kit's own head turn (headTurn 1) and the body narrowed
//   faces  neutral, happy, worried and blink are the kit's (mouth, worry, blink); laugh, surprised, angry and talk add the hooks' brow lift, inner
//          brow press and mouth opening to the kit's own brow() and mouth shapes
//   poses  each sleeve or leg of the kit's drawing is cut at the elbow or knee and turned about the shoulder, elbow, hip and knee (a piece of the
//          kit's drawing, never a redrawn limb): point, wave, reach in front; walk and sit in profile (sit on a plain stool, the only shape the
//          app paints, flat fills in the kit's way)
// Hands: n/a (the kit draws one relaxed hand). Lip sync: none (the mouth opens and closes by turns).
export const ENGINE = "explainer-2d";
const P = () => window.HOUSE.pal;
export const GROUND = "#14064a", CELL = "#1d0a5e", INK = "#f3ecff";
const DEG = Math.PI / 180, H = 880, X = 300, Y = 975, UNITS = 102.2;

/** The kid's colours a record shows (the kit's palette, with the character's own over it). */
export const palette = (o = {}) => { const p = { ...P(), ...(o.pal ?? {}) }; return { hoodie: p.hoodie, jeans: p.jeans, shoes: p.shoes, skin: p.skin, hair: p.hair }; };

// A character of its own (owner #1302; the source skill's STYLE.md §2: "a new recurring character is designed from scratch, with its own
// silhouette and palette"): the kit's body drawn in the character's own palette, the house hero's colour keys of HOUSE.pal (STYLE.md §2's
// table). Only the palette: the kit has one silhouette, and drawing another is not the app's to add.
export const PAL_KEYS = Object.freeze(["hoodie", "hoodieShade", "hoodieDeep", "hoodieLight", "strings", "jeans", "jeansShade", "shoes", "shoesShade", "soles",
  "skin", "skinShade", "skinDeep", "hair", "hairSheen", "eye", "mouth"]);
const HEX = /^#[0-9a-f]{6}$/i;
/** The gate's lines on a character's opts: only { pal } with the hero's colour keys as #rrggbb; an original (an id without moworks-) wears a
 *  hoodie of its own. */
export function optsLines(o = {}, id = "") {
  const out = [], ok = (p, w, why = "") => out.push(`${p ? "PASS" : "FAIL"}  ${w}${!p && why ? `: ${why}` : ""}`);
  const odd = Object.keys(o).filter((k) => k !== "pal");
  ok(!odd.length, "opts: only pal (the house hero's colours)", odd.join(", "));
  const pal = o.pal ?? {}, bad = Object.keys(pal).filter((k) => !PAL_KEYS.includes(k) || !HEX.test(String(pal[k])));
  ok(!bad.length, "opts.pal: the house hero's colour keys as #rrggbb (STYLE.md §2)", bad.map((k) => `${k} ${pal[k]}`).join(", "));
  if (!String(id).startsWith("moworks-")) {
    const base = P(), same = !pal.hoodie || pal.hoodie.toLowerCase() === String(base.hoodie).toLowerCase();
    ok(!same, "an original: a hoodie colour of its own (not the house hero's red)");
  }
  return out;
}

const FACES = {
  neutral: {}, happy: { mouth: 0.75 }, laugh: { mouth: 1, blink: 0.72, pose: { mouthOpen: 0.5, browUp: 0.4 } },
  surprised: { mouth: 0, look: [0, -0.2], pose: { browUp: 1.3, mouthOpen: 0.95 } }, worried: { worry: 0.9 },
  angry: { mouth: -0.75, pose: { browAngry: 1.7 } }, talk: { mouth: 0.2, pose: { mouthOpen: 0.55 } }, blink: { blink: 1 },
};

// The posed front arms, built the way a cut-out rig builds a joint (Toon Boom's rigging guide: the pivot in the centre of the articulation, so
// the limb turns and stays attached; the pieces overlapping so one outline sits in front of the other):
//   shoulder  the upper arm turns about the centre of the shoulder joint and lies OVER the body, as the kit's hanging sleeve does (owner 06/11:
//             the arm behind the body's layer was wrong); its root is cut round at the joint, so no square corner shows on the shoulder
//   elbow     the upper arm's end is cut round (a circle the sleeve's width at the elbow, of the upper arm's own fabric) and lies over the forearm,
//             which turns about the same centre; no added joint shape
//   light     the scene's: a turned piece passes its turn as R.__rot and the hooked part() turns its cel shadow and rims back
/** One piece of a limb: the kit's drawing turned about its joints, clipped to the piece (local frame, before the turns). clip(ctx) adds the
 *  piece's outline to the path. */
function piece(ctx, R, turns, clip, drawIt) {
  ctx.save();
  let rot = 0;
  for (const [px, py, a] of turns) { ctx.translate(px, py); ctx.rotate(a); ctx.translate(-px, -py); rot += a; }
  ctx.beginPath(); clip(ctx); ctx.clip();
  const was = R.__rot; R.__rot = (was || 0) + rot;
  try { drawIt(); } finally { R.__rot = was; ctx.restore(); }
}
const box = (x0, y0, x1, y1) => (c) => c.rect(x0, y0, x1 - x0, y1 - y0);
/** Front / back sleeves: for each screen side, the upper arm turned outward by a1 at the shoulder and the forearm a2 more at the elbow. */
const armsFront = (arms) => (ctx, R, drawSleeves) => {
  for (const s of [-1, 1]) {
    const [a1, a2] = arms[s < 0 ? "L" : "R"] ?? [0, 0], x0 = s < 0 ? -40 : 0, x1 = s < 0 ? 0 : 40;
    if (!a1 && !a2) { piece(ctx, R, [], box(x0, -90, x1, 0), drawSleeves); continue; }
    // the elbow a little above the kit's sleeve middle (owner 06/11: the upper arm read longer than the forearm; the two about the same length)
    const EY = -58.4, UP = [[s * 15.0, -67.4, -s * a1 * DEG]], FORE = [...UP, [s * 15.9, EY, -s * a2 * DEG]], E = [s * 15.9, EY], r = 2.6, SH = [s * 15.0, -67.4], rs = 3.4;
    // above the shoulder the shoulder girdle turns with the arm (the scapula about 1 degree for every 2 of the arm): the joint rises and comes
    // in toward the neck, so an arm overhead grows from the top of the shoulder
    const k = Math.min(1, Math.max(0, (a1 - 80) / 90));
    ctx.save(); ctx.translate(-s * 3.0 * k, -2.4 * k);
    piece(ctx, R, FORE, box(x0, E[1] - 0.4, x1, 0), drawSleeves);                                                       // forearm, cuff, hand
    // upper arm, its end round over the forearm and its root round at the shoulder, so it lies over the body as the hanging sleeve does
    piece(ctx, R, UP, (c) => { box(x0, SH[1], x1, E[1])(c); c.moveTo(E[0] + r, E[1]); c.arc(E[0], E[1], r, 0, Math.PI * 2); c.moveTo(SH[0] + rs, SH[1]); c.arc(SH[0], SH[1], rs, 0, Math.PI * 2); }, drawSleeves);
    ctx.restore();
  }
};
// The profile's walk and sit (approved by the owner as they are, 06/11): the kit's pieces turned at the joint lines, as first drawn
function pieceAsIs(ctx, turns, clip, drawIt) {
  ctx.save();
  for (const [px, py, a] of turns) { ctx.translate(px, py); ctx.rotate(a); ctx.translate(-px, -py); }
  ctx.beginPath(); if (typeof clip === "function") clip(ctx); else ctx.rect(clip[0], clip[1], clip[2] - clip[0], clip[3] - clip[1]); ctx.clip();
  drawIt();
  ctx.restore();
}
/** Profile near arm: swung forward by a1 at the shoulder, bent forward by a2 at the elbow. */
const armProfile = ([a1, a2]) => (ctx, R, nearArm) => {
  const sh = [0.3, -70], el = [0.4, -55.5];
  pieceAsIs(ctx, [[...sh, a1 * DEG], [...el, a2 * DEG]], [-30, el[1] - 0.6, 30, 0], nearArm);
  pieceAsIs(ctx, [[...sh, a1 * DEG]], [-30, -90, 30, el[1] + 0.6], nearArm);
};
/** Profile legs: each thigh swung forward by its angle at the hip, the shin bent back at the knee by its own. The knee is built as the elbow
 *  is (owner 06/11: a bent knee lost a piece of the leg at its corner): the shin turns about the centre of the knee, and the thigh's end is cut
 *  round, of the thigh's own denim, over the shin, so the knee's front stays whole however far it bends. */
const legsProfile = (far, near) => (ctx, R, farLeg, nearLeg) => {
  const hip = [0.5, -44], ky = -24.6, r = 3.7;
  // the kit's profile legs (legsProfile: leg(dx), the far one at dx -1.0, the near one at 0.4): 7.3 wide at the knee, centred 0.65 left of dx
  for (const [[t, k], drawIt, dx] of [[far, farLeg, -1.0], [near, nearLeg, 0.4]]) {
    const kc = [dx - 0.65, ky];
    pieceAsIs(ctx, [[...hip, t * DEG], [...kc, -k * DEG]], [-30, ky - 0.4, 30, 2], drawIt);                              // shin and sneaker
    pieceAsIs(ctx, [[...hip, t * DEG]], (c) => { c.rect(-30, -60, 60, 60 + ky); c.moveTo(kc[0] + r, ky); c.arc(kc[0], ky, r, 0, Math.PI * 2); }, drawIt);   // thigh, its end round over the shin
  }
};
// how far the hips come down so the lower foot stands on the floor (units): thigh 19.5, shin and shoe 24.5
const drop = (...legs) => 44 - Math.max(...legs.map(([t, k]) => 19.5 * Math.cos(t * DEG) + 24.5 * Math.cos((t - k) * DEG)));

/** The walk at phase 0..1: contact (thighs apart), pass (one knee bent), arms against the legs. */
function walkAt(ph) {
  const c = Math.cos(ph * Math.PI * 2), s = Math.sin(ph * Math.PI * 2);
  const near = [26 * c, 6 + 34 * Math.max(0, s)], far = [-26 * c, 6 + 34 * Math.max(0, -s)];
  return { near, far, arm: [-20 * c, 14 + 8 * Math.max(0, c)] };
}

/** A cell's arms: { front: { R: [a1, a2] } } for the posed front arm (degrees outward at the shoulder, then at the elbow), { side: [a1, a2] }
 *  for the profile's near arm (forward at the shoulder, then the forearm folding forward at the elbow), and how far the kid steps aside. */
function armsOf(spec, view) {
  if (view !== "profile") {
    if (spec.pose === "point") return { front: { R: [84, 4] }, dx: -122 };          // the kid a step to the left so the hand stays in the box
    if (spec.pose === "wave") return { front: { R: [118, 52 + (spec.wave != null ? 14 * Math.sin(spec.wave * 9) : 0)] } };
    if (spec.pose === "reach") return { front: { R: [168, 6] } };
    return {};
  }
  if (spec.pose === "walk") return { side: walkAt(spec.phase ?? 0).arm };
  if (spec.pose === "sit") return { side: [26, 38] };
  return {};
}
/** Where the arms are, for the anatomy gate: in profile the forearm's fold toward the front (the kid faces left: a2 > 0 folds it forward);
 *  in front, the posed arm's shoulder, elbow and hand in the design box (the kit's sleeve: the shoulder joint at (15, -67.4), the elbow at
 *  (16.1, -55.5), the hand at (15.7, -39.5), units of the 102.2-unit height). */
export function limbs(spec) {
  const v0 = spec.view ?? "front", view = v0 === "three-quarter" ? "front" : v0, A = armsOf(spec, view), k = H / UNITS;
  if (A.side) return [{ name: "the near arm", view: "side", flex: A.side[1] }];
  if (!A.front) return [];
  const out = [], rot = (v, a) => [v[0] * Math.cos(a) - v[1] * Math.sin(a), v[0] * Math.sin(a) + v[1] * Math.cos(a)];
  for (const [side, s] of [["L", -1], ["R", 1]]) {
    const ang = A.front[side]; if (!ang) continue;
    const q = Math.min(1, Math.max(0, (ang[0] - 80) / 90)), r1 = -s * ang[0] * DEG, r2 = -s * ang[1] * DEG;
    const sh = [s * 15.0 - s * 3.0 * q, -67.4 - 2.4 * q], u = rot([s * 1.1, 11.9], r1), f = rot([-s * 0.4, 16.0], r1 + r2);
    const el = [sh[0] + u[0], sh[1] + u[1]], hand = [el[0] + f[0], el[1] + f[1]], px = (p) => [X + (A.dx ?? 0) + p[0] * k, Y + p[1] * k];
    out.push({ name: side === "R" ? "the right arm" : "the left arm", view: "front", sh: px(sh), el: px(el), hand: px(hand) });
  }
  return out;
}

/** Draw the kid in the 600 x 1000 design box, its feet at (300, 975). spec: { view, face, pose, phase, t, wave }. */
export function draw(g, opts, spec) {
  const HOUSE = window.HOUSE, view0 = spec.view ?? "front", three = view0 === "three-quarter", view = three ? "front" : view0;
  const f = view === "back" ? {} : FACES[spec.face ?? "neutral"] ?? {};
  const o = { t: spec.t ?? 0, x: X, y: Y, h: H, view, seed: 3, blink: f.blink ?? 0, mouth: f.mouth ?? 0, worry: f.worry ?? 0, look: f.look ?? [0, 0], headTurn: three ? 1 : 0 };
  const pose = { ...(f.pose ?? {}) }, k = H / UNITS, A = armsOf(spec, view);
  let dy = 0, stool = null;
  if (A.front) { pose.armsFront = armsFront(A.front); o.x = X + (A.dx ?? 0); }
  if (spec.pose === "point" && view !== "profile") { o.headTurn = 0.45; o.look = [0.9, -0.1]; o.mouth = 0.3; }
  if (spec.pose === "wave" && view !== "profile") o.mouth = 0.8;
  if (spec.pose === "reach" && view !== "profile") { o.headUp = 0.7; o.look = [0.3, -1]; }
  if (spec.pose === "walk") {
    const w = walkAt(spec.phase ?? 0);
    pose.legsProfile = legsProfile(w.far, w.near); pose.armProfile = armProfile(A.side); dy = drop(w.far, w.near);
  }
  if (spec.pose === "sit") {
    const far = [88, 88], near = [92, 90];
    pose.legsProfile = legsProfile(far, near); pose.armProfile = armProfile(A.side); dy = drop(far, near); stool = 44 - dy - 3.5;
  }
  if (stool != null) {
    // a plain stool under the seat, in the kit's way: flat fills, one cel shadow away from the key light, a cool top rim, no outline
    const p = P(), top = Y - stool * k, w = 15 * k, legW = 1.8 * k;
    g.fillStyle = p.cloudMid; g.fillRect(X - w * 0.42, top, legW, Y - top); g.fillRect(X + w * 0.42 - legW, top, legW, Y - top);
    g.fillStyle = p.cloudTop; g.fillRect(X - w / 2, top - 1.6 * k, w, 2.4 * k);
    g.fillStyle = p.cloudMid; g.fillRect(X - w / 2, top + 0.2 * k, w, 0.6 * k);
    g.fillStyle = p.cloudCoolRim; g.fillRect(X - w / 2, top - 1.6 * k, w, 0.35 * k);
  }
  o.y = Y + dy * k;
  HOUSE.__pose = pose;
  // a character's own palette for this draw only (the hooked kit keys its materials by it); the house palette back after
  const basePal = HOUSE.pal, own = opts?.pal && Object.keys(opts.pal).length ? opts.pal : null;
  if (own) { HOUSE.pal = { ...basePal, ...own }; HOUSE.__palKey = JSON.stringify(own); }
  try {
    if (three) { g.save(); g.translate(X, 0); g.scale(0.88, 1); g.translate(-X, 0); }
    HOUSE.hero.draw(g, o);
    if (three) g.restore();
  } finally { HOUSE.__pose = null; if (own) { HOUSE.pal = basePal; HOUSE.__palKey = ""; } }
}
