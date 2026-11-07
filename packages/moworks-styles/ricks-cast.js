// ---------------- Moworks Studio: Ricks Clip's cast layer (owner 05/11/2026 #1070, #1076; audit/102 §8c, §9) ----------------
// Bundled into toon.js after toon.ts and roman.js, in the same module scope (as the source skill's setup.sh builds toon.js), so it draws with their own
// Pen, head, face and outfit helpers and never edits either. It adds what the source skill has not: a character as a definition (defineCast), the
// THREE VIEWS a film needs (front: the source skill's romanFront as shipped; back: written here in the source skill's own hand, no face; profile: toon.ts's
// bodySide with the outfit mapped onto it) and one pose layer shared by the three (the 14 arm poses of roman.js, every face of toon.ts and
// roman.js, stand and walk, tilt, head tilt, bob, blink, look, the light). A card is still turned to the camera on yaw (main.js): the view
// picks the drawing. Credit: the layer is Moworks Studio's ("written from the idea"); toon.ts is Mr omi's (MIT); roman.js is the owner's.

export const VIEWS = ["front", "back", "profile"];
// MW Character Sheet v1 (owner #1287-#1293, method A): what the standard asks for that the cast has not, in the same hand:
//   the three-quarter view   romanFront as shipped, its head turned all the way it turns (its own `facing`, 1): the face slides to one side, the torso follows
//   sit                      the front (or three-quarter) body down on a seat, cut at the hips, over bent legs drawn here in roman.js's way
//   talk                     a face of toon.ts's own parts (its lid eyes, an "o" mouth), as roman.js adds snore, stubborn, squint
/** Every view a card can be drawn in (the sheet's order). */
export const ALL_VIEWS = ["front", "three-quarter", "profile", "back"];
FACE.talk = { eye: ["lid", "lid"], brow: [-1, -1], mouth: "o" };
/** The sheet standard's faces in this cast's own names (+ blink, a lid), its order. */
export const STANDARD_FACES = Object.freeze({ neutral: "neutral", happy: "grin", laugh: "laugh", surprised: "shock", worried: "nervous", angry: "stern", talk: "talk", blink: "neutral" });
/** A talking flap: the open mouth and the closed one by turns, about four a second (t in seconds); no lip sync. */
export const talkExpr = (t) => (Math.floor(t * 8) % 2 ? "neutral" : "talk");
export const ARM_POSES = ["hang", "spear", "point", "up", "wave", "hip", "belly", "temple", "lift", "reach", "cheek", "shield", "cross", "thumb"];
export const EXPRESSIONS = Object.keys(FACE);
/** The film's characters: id -> definition { id, name, about, heightM, seed, outfit, extra? }. */
export const CAST = {};
/** Register a character (a character file's one call). */
export const defineCast = (c) => {
  if (!c || !/^[a-z][a-z0-9-]{0,40}$/.test(String(c.id))) throw new Error(`defineCast: an id of lowercase letters, digits and dashes (${c?.id})`);
  CAST[c.id] = { seed: 3, extra: {}, ...c };
  return CAST[c.id];
};
const outfitOf = (who) => (typeof who === "string" ? (CAST[who]?.outfit ?? OUTFITS[who]) : who?.outfit ?? who);

/** The body's measures in the 600 x 1000 design space (soles at y = 975), as romanFront lays a body out. */
export const castGeometry = (O, opts = {}) => {
  const { seed = 3, bob = 0, light = rad(-120), facing = 0 } = opts;
  const H = headBlob(seed, 118, facing), W = 2 * H.a, HH = 2 * H.b, u = W / 100;
  const torsoL = O.stout ? 1.12 : 1.08, legsL = 1.38, sole = 975;
  const torsoBot = sole - legsL * HH - bob * HH, chin = torsoBot - torsoL * HH, hc = chin - H.b, hipY = torsoBot - 0.12 * HH;
  return { cx: 300, H, W, HH, u, sole, torsoBot, chin, hc, hipY, light, thick: thickAngle(light), ow: 5 * u };
};

/** The arm of a pose, as roman.js lays it out (side -1 screen left, +1 screen right). */
const castArm = (side, pose, G, T, tcx, opts) => {
  const { u, HH, H, cx, hc, chin, torsoBot } = G, s = [tcx + side * 0.85 * T.a, chin + 0.12 * HH], X = (k) => tcx + side * (T.a * 1.1 + k * u);
  switch (pose) {
    case "spear": return { pts: [s, [X(6), s[1] + 0.42 * HH], [X(10), s[1] + 0.2 * HH]], front: false };
    case "point": return { pts: [s, [X(28), s[1] - 0.02 * HH], [X(62), s[1] - 0.1 * HH]], front: false, finger: true };
    case "up": return { pts: [s, [X(14), s[1] - 0.3 * HH], [X(22), s[1] - 0.75 * HH]], front: false };
    case "wave": return { pts: [s, [X(16), s[1] - 0.2 * HH], [X(30 + 10 * Math.sin(opts.wv || 0)), s[1] - 0.62 * HH]], front: false };
    case "hip": return { pts: [s, [X(22), s[1] + 0.3 * HH], [tcx + side * T.a * 0.95, torsoBot - 0.3 * HH]], front: false };
    case "belly": return { pts: [s, [X(8), s[1] + 0.45 * HH], [tcx + side * 0.25 * T.a, torsoBot - 0.35 * HH]], front: true };
    case "temple": return { pts: [s, [X(26), s[1] + 0.05 * HH], [cx + side * (H.a + 16 * u), hc - 0.1 * HH]], front: false };
    case "lift": return { pts: [s, [X(20), s[1] - 0.25 * HH], [X(4), s[1] - 0.82 * HH]], front: false };
    case "shield": return { pts: [s, [X(4), s[1] + 0.4 * HH], [tcx + side * 0.6 * T.a, torsoBot - 0.1 * HH]], front: true };
    case "cross": return { pts: [s, [X(2), s[1] + 0.38 * HH], [tcx - side * 0.45 * T.a, s[1] + 0.32 * HH]], front: true };
    case "reach": { const lf = (opts.lift || 0) * 0.62 * HH; return { pts: [s, [X(42), s[1] - 0.12 * HH - lf * 0.6], [X(82), s[1] - 0.5 * HH - lf]], front: false }; }
    case "cheek": return { pts: [s, [X(16), s[1] + 0.05 * HH], [cx + side * (H.a + 2 * u), hc + 0.25 * H.b]], front: false };
    case "thumb": return { pts: [s, [X(20), s[1] + 0.12 * HH], [X(44), s[1] - 0.12 * HH]], front: false };
    default: return { pts: [s, [X(4), s[1] + 0.48 * HH], [X(3), chin + 1.04 * HH]], front: false };
  }
};

/** The back view, in roman.js's hand: the same legs, skirt, torso and outfit seen from behind; no face (the back of the head, hair or helmet
 *  over the nape); the arms on the other side (the right hand is screen left), what the front holds hidden behind the body, the cape on top. */
export const castBack = (p, who, opts = {}) => {
  const O = outfitOf(who);
  const { blink = 0, seed = 3, L = "hang", R = O.spear ? "spear" : "hang", tilt = 0, headTilt = 0, nohelmet = false, step = 0 } = opts;
  const G = castGeometry(O, { ...opts, facing: 0 }), { H, W, HH, u, sole, torsoBot, chin, hc, hipY, light, thick, ow, cx } = G;
  void blink;
  const skin = O.skin ?? SKIN, legCol = mix(O.tunic, INK, 0.62), armCol = mix(O.tunic, INK, 0.5);
  const helmet = !!O.helmet && !nohelmet, old = O.helmet === "old";
  p.rot = null;
  // ---- legs (the soles toward the viewer: the heel strap shows, the toe goes away) ----
  for (const side of [-1, 1]) {
    const up = Math.max(0, Math.sin(Math.PI * 2 * (step + (side > 0 ? 0.5 : 0)))) * 30 * (step ? 1 : 0);
    const hx = cx + side * 16 * u, fx = cx + side * 20 * u, fy = sole - 4 * u - up;
    p.stroke(curve([hx, hipY], [(hx + fx) / 2 + side * 2 * u, (hipY + fy) / 2], [fx, fy]), 5.8 * u, legCol);
    const sandal = O.helmet ? LEATHER : "#5a3b2a";
    p.stroke([[fx - side * 5 * u, fy], [fx + side * 5 * u, fy + 0.5 * u]], 7.5 * u + 3, INK);
    p.stroke([[fx - side * 5 * u, fy], [fx + side * 5 * u, fy + 0.5 * u]], 7.5 * u, sandal);
    if (O.helmet) for (let k = 1; k <= 3; k++) p.stroke([[fx - 4 * u, fy - k * 0.07 * HH], [fx + 4 * u, fy - k * 0.07 * HH - 2 * u]], 2 * u, LEATHER);
  }
  p.rot = tilt ? [rad(-tilt), cx, hipY] : null;
  const T = { a: (0.4 * W) / 1.06 * (O.stout ? 1.12 : 1), b: 0.5 * (torsoBot - (chin - 0.25 * HH)), nTop: 2.2, nBot: 2.6, egg: O.stout ? 0.17 : 0.12, asym: 0, rot: 0, noise: 0.006, seed: seed + 7 };
  const tcx = cx, tcy = torsoBot - T.b, tp = blobPts(tcx, tcy, T);
  // seen from behind, the right hand is on screen left
  const arms = [castArm(-1, R, G, T, tcx, opts), castArm(1, L, G, T, tcx, opts)];
  const drawArm = (a) => { p.stroke(curve(a.pts[0], a.pts[1], a.pts[2]), 5.2 * u, armCol); p.dot(a.pts[2][0], a.pts[2][1], 5.5 * u); };
  // what the front holds is behind the body now: the spear's shaft past the shoulder, the shield's rim, the arms that reach across the front
  if (O.spear && R === "spear") {
    const [hx] = arms[0].pts[2], s0 = [hx - 2 * u, sole - 2 * u], s1 = [hx + 3 * u, 70];
    p.band([s0, s1], old ? "#6d5236" : "#8a5a34", 4.2 * u, 1.4 * u, "round");
    p.poly([[s1[0] - 7 * u, s1[1] + 6 * u], [s1[0], s1[1] - 34 * u], [s1[0] + 7 * u, s1[1] + 6 * u], [s1[0], s1[1] + 14 * u]], old ? "#8b7c6a" : "#c9cfd6", 2 * u);
  }
  if (O.shield && L === "shield") {
    const sx = tcx + 0.55 * T.a, sy = torsoBot + 0.05 * HH, sw = 0.36 * W, sh = 0.78 * HH;
    p.poly(rrect(sx - sw, sy - sh, sx + sw, sy + sh, 8 * u), "#7d1d22", ow * 0.8);
  }
  for (const a of arms) if (a.front) drawArm(a);
  if (O.dress) {
    const D = { a: 0.5 * W * 0.98, b: 0.5 * ((sole - 0.35 * HH) - (chin - 0.2 * HH)), nTop: 2.0, nBot: 3.0, egg: 0.35, asym: 0, rot: 0, noise: 0.006, seed: seed + 9 };
    const dp = blobPts(cx, sole - 0.35 * HH - D.b, D);
    p.gradFill(dp, O.dress, mul(O.dress, SH_CLOTH), light); p.inkRing(dp, ow, thick);
  } else {
    const sk = [[tcx - 0.92 * T.a, torsoBot - 0.2 * HH], [tcx + 0.92 * T.a, torsoBot - 0.2 * HH], [tcx + 1.0 * T.a, torsoBot + 0.3 * HH], [tcx - 1.0 * T.a, torsoBot + 0.3 * HH]];
    p.gradFill(sk, O.tunic, mul(O.tunic, SH_CLOTH), light); p.poly(sk, null, ow * 0.8);
    if (O.armor) for (let i = -3; i <= 3; i++) { const x = tcx + i * 0.27 * T.a; p.poly([[x - 9 * u, torsoBot - 0.05 * HH], [x + 9 * u, torsoBot - 0.05 * HH], [x + 9 * u, torsoBot + 0.22 * HH], [x - 9 * u, torsoBot + 0.22 * HH]], old ? "#5e4632" : LEATHER, 1.6 * u); }
  }
  p.gradFill(tp, O.tunic, mul(O.tunic, SH_CLOTH), light);
  p.clip(tp, () => {
    if (O.armor) {
      const top = chin - 0.1 * HH, bot = torsoBot - 0.25 * HH, n = 5;
      for (let i = 0; i < n; i++) {
        const y0 = top + (bot - top) * i / n, y1 = top + (bot - top) * (i + 1) / n;
        p.poly([[tcx - 1.5 * T.a, y0 + 3 * u], [tcx + 1.5 * T.a, y0], [tcx + 1.5 * T.a, y1], [tcx - 1.5 * T.a, y1 + 3 * u]], old ? (i % 2 ? "#8d8679" : "#9a9384") : (i % 2 ? "#a7b0ba" : "#bcc4cc"), 1.8 * u);
      }
      p.stroke([[tcx, top], [tcx, bot]], 1.6 * u, old ? "#6f6a5e" : "#8f98a2");          // the back plate's seam
      p.band([[tcx - 1.4 * T.a, torsoBot - 0.2 * HH], [tcx + 1.4 * T.a, torsoBot - 0.2 * HH]], LEATHER, 0.08 * HH, 1.5 * u);
    } else {
      p.band([[tcx - 1.4 * T.a, torsoBot - 0.24 * HH], [tcx + 1.4 * T.a, torsoBot - 0.24 * HH]], O.apron ? "#5a3b2a" : "#e2c27a", 0.05 * HH, 1.2 * u);
      if (O.toga) p.band([[tcx + 1.0 * T.a, chin - 0.1 * HH], [tcx - 1.1 * T.a, torsoBot - 0.1 * HH]], O.toga, 0.16 * HH, 1.6 * u);
      if (O.apron) p.band([[tcx - 0.55 * T.a, torsoBot - 0.2 * HH], [tcx + 0.55 * T.a, torsoBot - 0.2 * HH]], "#5a3b2a", 0.03 * HH, 1 * u);          // the apron's strings tied at the back
    }
  });
  p.inkRing(tp, ow, thick);
  if (O.armor) for (const s of [-1, 1]) p.poly(ellPts(tcx + s * 0.72 * T.a, chin + 0.1 * HH, 0.42 * T.a, 0.13 * HH, 180, 360, -s * 8, 20), old ? "#9a9384" : "#c5ccd3", 1.8 * u);
  for (const a of arms) if (!a.front) drawArm(a);
  // the cape hangs over the back, from the shoulders to the calves
  if (O.cape) {
    const cp = [[cx - 0.5 * W, chin + 0.06 * HH], [cx + 0.5 * W, chin + 0.06 * HH], [cx + 0.6 * W, sole - 0.5 * HH], [cx + 0.2 * W, sole - 0.42 * HH], [cx - 0.2 * W, sole - 0.47 * HH], [cx - 0.6 * W, sole - 0.5 * HH]];
    p.gradFill(cp, O.cape, mul(O.cape, [0.6, 0.6, 0.7]), light);
    p.clip(cp, () => { for (const k of [-0.25, 0, 0.25]) p.stroke([[cx + k * W, chin + 0.2 * HH], [cx + k * 1.3 * W, sole - 0.5 * HH]], 1.6 * u, mul(O.cape, [0.7, 0.66, 0.74])); });
    p.inkRing(cp, ow * 0.8, thick);
  }
  // ---- the back of the head: skin, then hair, a cap or the helmet over it; never a face ----
  const [cpx, cpy] = rotAbout([cx, chin], rad(-tilt), [cx, hipY]);
  const Ah = -(tilt + headTilt);
  p.rot = Ah ? [rad(Ah), cx, chin, cpx - cx, cpy - chin] : null;
  const hp = blobPts(cx, hc, { ...H, asym: 0 });
  p.shadedFill(hp, skin, mul(skin, SH_SKIN), light, H.a);
  p.inkRing(hp, ow, thick);
  if (helmet) {
    galea(p, H, cx, hc, light, thick, ow, old, u);
    // the bowl reaches down over the back of the head, with its neck guard
    // the hair at the nape under it first (dark, close-cropped), so the skin left below reads as a neck, not a face
    p.clip(hp, () => p.poly([[cx - 2 * H.a, hc + 0.2 * H.b], [cx + 2 * H.a, hc + 0.2 * H.b], [cx + 2 * H.a, hc + 0.78 * H.b], [cx - 2 * H.a, hc + 0.78 * H.b]], O.hair ?? (old ? "#d9d4ca" : "#3b2a20"), 0));
    const nb = ellPts(cx, hc - H.b * 0.2, H.a * 1.04, H.b * 0.78, 180, 360, 0, 48);
    nb.push([cx + H.a * 1.1, hc + H.b * 0.5], [cx - H.a * 1.1, hc + H.b * 0.5]);
    const bowl = old ? "#8f8a7e" : STEEL;
    p.shadedFill(nb, bowl, mul(bowl, [0.62, 0.64, 0.72]), light, H.a, 0.4);
    p.inkRing(nb, ow * 0.9, thick);
    p.band([[cx - H.a * 1.12, hc + H.b * 0.5], [cx + H.a * 1.12, hc + H.b * 0.5]], old ? "#a88a4a" : BRASS, 6 * u, 1.6 * u, "round");
  } else if (O.hair || O.cap) {
    const col = O.cap ?? O.hair, hb = blobPts(cx, hc - 0.04 * HH, { ...H, a: H.a * 1.05, b: H.b * 1.04, asym: 0 });
    // hair from behind covers the head down to the nape; a cap covers the crown with the hair showing below it
    if (O.cap) p.clip(hb, () => p.poly([[cx - 2 * H.a, hc], [cx + 2 * H.a, hc], [cx + 2 * H.a, hc + 0.7 * H.b], [cx - 2 * H.a, hc + 0.7 * H.b]], O.hair ?? "#4a3328", 0));
    p.clip(hb, () => p.poly([[cx - 2 * H.a, hc - 2 * H.b], [cx + 2 * H.a, hc - 2 * H.b], [cx + 2 * H.a, hc + (O.cap ? 0.05 : 0.72) * H.b], [cx - 2 * H.a, hc + (O.cap ? 0.05 : 0.72) * H.b]], col, 0));
    if (O.cap) p.band([[cx - H.a * 1.02, hc + 0.05 * H.b], [cx + H.a * 1.02, hc + 0.05 * H.b]], mul(col, [0.75, 0.75, 0.8]), 5 * u, 1.4 * u, "round");
    p.inkRing(hb, ow * 0.7, thick);
  } else if (O.helmet && nohelmet) {
    for (const s of [-1, 1]) p.ell(cx + s * 0.9 * H.a, hc - 0.1 * H.b, 0.22 * H.a, 0.3 * H.b, "#f4f1ea", 3 * u);
    p.ell(cx, hc + 0.35 * H.b, 0.7 * H.a, 0.25 * H.b, "#f4f1ea", 2 * u);          // the white fringe at the nape
  }
  for (const s of [-1, 1]) p.ell(cx + s * 1.0 * H.a, hc + 0.05 * H.b, 0.1 * H.a, 0.16 * H.b, skin, 2 * u);          // the ears, from behind
  p.rot = null;
};

/** The outfit as toon.ts's bodySide reads one (jacket, pants, boots, hat, build). */
const sideOutfit = (O) => ({
  jacket: O.tunic, pants: mix(O.tunic, INK, 0.25), boots: O.helmet ? LEATHER : "#5a3b2a", skin: O.skin ?? SKIN, build: O.stout ? "stout" : "adult",
  hat: O.helmet ? null : O.cap ? "cap" : O.hair ? "hair" : null, cap: O.cap, hair: O.hair, moustache: O.moustache ?? O.beard, dress: O.dress,
  belt: O.armor ? LEATHER : null, sash: O.toga ?? null, buttons: O.armor ? BRASS : undefined,
});
/** Where bodySide puts the hip and the head for a mode (its own layout, so the helmet and the cape sit on its body). */
const sideLayout = (O, { mode = "stand", phase = 0, pose = 0, seed = 3, stride = 1 }) => {
  const Bd = O.stout ? { a: 118, torso: 1.15, legs: 1.32 } : { a: 118, torso: 1.1, legs: 1.4 };
  const H = { ...headBlob(seed, Bd.a, 1), asym: 0.12 }, W = 2 * H.a, HH = 2 * H.b, u = W / 100, ankY = 975 - 4 * u, legLen = (Bd.legs + 0.12) * HH - 4 * u;
  let hipY = ankY - legLen * 0.995, lean = 0;
  if (mode === "march") {
    const S = 370 * stride, st = (ph) => { const c = (((phase + ph) % 1) + 1) % 1; if (c < 0.5) { const s = c / 0.5; return { x: S / 2 - S * s, stance: true, s }; } const s = (c - 0.5) / 0.5; return { x: -S / 2 + S * s - (S / Math.PI) * Math.sin(2 * Math.PI * s), stance: false, s }; };
    const nL = st(0), fL = st(0.5), stance = nL.stance ? nL : fL, Leff = legLen * (1 - 0.035 * Math.sin(Math.PI * stance.s));
    hipY = ankY - Math.sqrt(Math.max(1, Leff * Leff - stance.x * stance.x)); lean = 4 + 3 * Math.cos(4 * Math.PI * phase);
  } else if (mode === "push") { hipY = ankY - 0.87 * legLen; lean = 14 * pose; }
  const torsoBot = hipY + 0.12 * HH, chin = torsoBot - Bd.torso * HH, hc = chin - H.b;
  return { H, W, HH, u, hipY, lean, torsoBot, chin, hc, hx: 300 + 4 * u };
};
/** The profile view, facing screen right (a film mirrors the card to face left): toon.ts's bodySide on the outfit, with the parts it has not
 *  (the cape behind, the helmet, the spear and the shield) drawn on its own layout. Arms: hang, walk; point or reach push forward. */
export const castProfile = (p, who, opts = {}) => {
  const O = outfitOf(who);
  const { expr = "neutral", blink = 0, seed = 3, light = rad(-120), walk = false, phase = 0, L = "hang", R = "hang", nohelmet = false } = opts;
  const forward = [L, R].some((a) => a === "point" || a === "reach"), mode = walk ? "march" : forward ? "push" : "stand", pose = forward ? 1 : 0;
  const Ly = sideLayout(O, { mode, phase, pose, seed }), { H, W, HH, u, hipY, lean, chin, hc, hx } = Ly, thick = thickAngle(light), ow = 5 * u, old = O.helmet === "old";
  if (O.cape) {
    p.rot = lean ? [rad(lean), 300, hipY] : null;
    const cp = [[300 - 0.05 * W, chin + 0.06 * HH], [300 + 0.12 * W, chin + 0.1 * HH], [300 - 0.08 * W, 975 - 0.5 * HH], [300 - 0.5 * W, 975 - 0.45 * HH]];
    p.gradFill(cp, O.cape, mul(O.cape, [0.6, 0.6, 0.7]), light); p.inkRing(cp, ow * 0.8, thick);
    p.rot = null;
  }
  bodySide(p, sideOutfit(O), { mode, phase, pose, expr, blink: lidOf(blink), light, seed });
  p.rot = lean ? [rad(lean), 300, hipY] : null;
  // a dress and an apron seen from the side (bodySide has neither; MW Character Sheet v1, #1287-#1293): the dress from the waist to the shins, the
  // apron on the front, in the outfit's own colours, shaded and inked as the front draws them
  const waist = hipY - 0.28 * HH;
  if (O.dress) {
    const hem = 975 - 0.3 * (975 - hipY), dp = [[300 - 0.3 * W, waist], [300 + 0.32 * W, waist], [300 + 0.42 * W, hem - 0.04 * HH], [300 + 0.36 * W, hem], [300 - 0.36 * W, hem], [300 - 0.4 * W, hem - 0.04 * HH]];
    p.gradFill(dp, O.dress, mul(O.dress, [0.62, 0.6, 0.7]), light); p.inkRing(dp, ow * 0.85, thick);
  }
  if (O.apron) {
    const bot = hipY + 0.42 * HH, ap = [[300 + 0.18 * W, waist + 0.02 * HH], [300 + 0.36 * W, waist], [300 + 0.4 * W, bot], [300 + 0.2 * W, bot + 0.02 * HH]];
    p.gradFill(ap, O.apron, mul(O.apron, [0.7, 0.68, 0.72]), light); p.inkRing(ap, ow * 0.7, thick);
  }
  if (O.helmet && !nohelmet) {
    // the bowl and the crest seen from the side: a cap over the crown and the fin of the crest along the top
    const bowl = old ? "#8f8a7e" : STEEL, crest = old ? "#8d4b3f" : "#d2372f";
    const fin = ellPts(hx - 2 * u, hc - H.b * 0.95, H.a * 0.9, H.b * 0.42, 180, 360, 0, 40); fin.push([hx + H.a * 0.88, hc - H.b * 0.9], [hx - H.a * 0.92, hc - H.b * 0.9]);
    p.shadedFill(fin, crest, mul(crest, [0.7, 0.62, 0.7]), light, H.a * 0.9, 0.3); p.inkRing(fin, ow * 0.85, thick);
    const bp = ellPts(hx, hc - H.b * 0.42, H.a * 1.05, H.b * 0.66, 180, 360, 0, 48); bp.push([hx - H.a * 1.05, hc + H.b * 0.25]);
    p.shadedFill(bp, bowl, mul(bowl, [0.62, 0.64, 0.72]), light, H.a, 0.4); p.inkRing(bp, ow * 0.9, thick);
    p.band([[hx - H.a * 1.04, hc - H.b * 0.42], [hx + H.a * 1.04, hc - H.b * 0.42]], old ? "#a88a4a" : BRASS, 7 * u, 1.8 * u, "round");
    // the cheek guard hangs by the ear, behind the eye (the face is toward the front: faceSide draws it from hx + 27u)
    const ck = [[hx - 0.2 * H.a, hc - H.b * 0.42], [hx + 0.12 * H.a, hc - H.b * 0.42], [hx + 0.08 * H.a, hc + H.b * 0.45], [hx - 0.16 * H.a, hc + H.b * 0.4]];
    p.shadedFill(ck, bowl, mul(bowl, [0.62, 0.64, 0.72]), light, 0.2 * H.a, 0.3); p.poly(ck, null, ow * 0.8);
  }
  if (O.spear && (R === "spear" || L === "spear")) {
    const x = 300 + 0.42 * W;
    p.band([[x, 973], [x - 2 * u, 70]], old ? "#6d5236" : "#8a5a34", 4.2 * u, 1.4 * u, "round");
    p.poly([[x - 9 * u, 76], [x - 2 * u, 36], [x + 5 * u, 76], [x - 2 * u, 84]], old ? "#8b7c6a" : "#c9cfd6", 2 * u);
  }
  if (O.shield && L === "shield") {
    const sx = 300 + 0.36 * W, sy = hipY - 0.1 * HH;
    const sp = ellPts(sx, sy, 0.1 * W, 0.8 * HH, 0, 360, 0, 40);
    p.gradFill(sp, "#c0302c", "#7d1d22", light); p.inkRing(sp, ow, thick);
  }
  p.rot = null;
};

/** Sitting (the sheet standard's sit): the body as the front draws it, cut at the hips and set down by about half its legs, over thighs coming toward
 *  the viewer and shins down to the floor, in roman.js's own strokes (its leg colour, its sandals and their straps). */
const castSit = (p, O, o, front) => {
  const G = castGeometry(O, o), { cx, u, HH, sole, hipY } = G, legs = sole - hipY, drop = 0.42 * legs, g = p.g;
  const legCol = mix(O.tunic, INK, 0.62), sandal = O.helmet ? LEATHER : "#5a3b2a", cut = hipY + 0.08 * HH, under = cut + drop;
  // a plain stool in the world's own wood under the seat (a film may set the character on its own seat instead)
  const wood = "#8a5a34", top = under - 4 * u;
  for (const side of [-1, 1]) p.stroke([[cx + side * 34 * u, top], [cx + side * 40 * u, sole - 2 * u]], 3.5 * u, mix(wood, INK, 0.35));
  p.poly(rrect(cx - 46 * u, top - 3 * u, cx + 46 * u, top + 8 * u, 3 * u), wood, 2.2 * u);
  // the body cut at the hips and set down onto the stool
  g.save(); g.translate(0, drop); g.beginPath(); g.rect(-600, -2000, 1800, cut + 2000); g.clip();
  front({ ...o, step: 0 });
  g.restore();
  // the legs over the stool's edge: thighs toward the viewer and out to the knees (short and thick), shins down to the floor, the sandals
  for (const side of [-1, 1]) {
    const hx = cx + side * 15 * u, hy = under - 6 * u, kx = cx + side * 30 * u, ky = under + 8 * u, fx = cx + side * 31 * u, fy = sole - 4 * u;
    p.stroke([[hx, hy], [kx, ky]], 10 * u, legCol);
    p.stroke(curve([kx, ky], [kx + side * 2 * u, (ky + fy) / 2], [fx, fy]), 5.8 * u, legCol);
    p.stroke([[fx - 6 * u, fy], [fx + 6 * u, fy + 0.5 * u]], 7.5 * u + 3, INK);
    p.stroke([[fx - 6 * u, fy], [fx + 6 * u, fy + 0.5 * u]], 7.5 * u, sandal);
    if (O.helmet) for (let k = 1; k <= 2; k++) p.stroke([[fx - 4 * u, fy - k * 0.07 * HH], [fx + 4 * u, fy - k * 0.07 * HH - 2 * u]], 2 * u, LEATHER);
  }
};
/** Sitting seen from the side (the clearest sit on a card): the profile as castProfile draws it, cut at the hips and set down onto a stool, the thigh
 *  straight out ahead, the shin down to the floor, the foot ahead, in the profile's own leg colour and sandal. */
const castSitSide = (p, O, o) => {
  const Ly = sideLayout(O, { mode: "stand", phase: 0, pose: 0, seed: o.seed ?? 3 }), { u, HH, hipY } = Ly, sole = 975, legs = sole - hipY, drop = 0.4 * legs, g = p.g;
  const legCol = mix(O.tunic, INK, 0.62), sandal = O.helmet ? LEATHER : "#5a3b2a", cut = hipY + 0.06 * HH, seat = cut + drop;
  const wood = "#8a5a34";
  for (const dx of [-26, 22]) p.stroke([[300 + dx * u, seat], [300 + (dx + (dx < 0 ? -3 : 3)) * u, sole - 2 * u]], 3.5 * u, mix(wood, INK, 0.35));
  p.poly(rrect(300 - 34 * u, seat - 2 * u, 300 + 30 * u, seat + 8 * u, 3 * u), wood, 2.2 * u);
  g.save(); g.translate(0, drop); g.beginPath(); g.rect(-600, -2000, 1800, cut + 2000); g.clip();
  castProfile(p, O, { ...o, walk: false });
  g.restore();
  const hip = [300 + 2 * u, seat - 5 * u], knee = [300 + 0.36 * legs, seat - 3 * u], foot = [300 + 0.38 * legs, sole - 4 * u];
  p.stroke([hip, knee], 7 * u, legCol);
  p.stroke(curve(knee, [knee[0] + 2 * u, (knee[1] + foot[1]) / 2], foot), 5.8 * u, legCol);
  p.stroke([[foot[0] - 3 * u, foot[1]], [foot[0] + 12 * u, foot[1] + 0.5 * u]], 7.5 * u + 3, INK);
  p.stroke([[foot[0] - 3 * u, foot[1]], [foot[0] + 12 * u, foot[1] + 0.5 * u]], 7.5 * u, sandal);
};
/** The three-quarter view: the front as shipped with its head turned (its own `facing`) and the body narrowed about its middle, as a turned body
 *  shows less of its width. */
const castThreeQuarter = (front, g, q) => { g.save(); g.translate(300, 0); g.scale(0.84, 1); g.translate(-300, 0); front(q); g.restore(); };

/** Draw a character in a view: { view: "front" | "three-quarter" | "profile" | "back", sit, expr, L, R, walk, phase, step, tilt, headTilt, bob, blink, look, light,
 *  lift, wv, swirl, nohelmet }. Its own extra parts (a hat, glasses, a bag, written in the same hand) draw after the body, on castGeometry's
 *  measures, in the view they belong to. */
export const castDraw = (p, who, opts = {}) => {
  const c = typeof who === "string" ? CAST[who] : who, O = outfitOf(who);
  if (!O) throw new Error(`castDraw: no character "${typeof who === "string" ? who : "?"}"`);
  const seed = opts.seed ?? c?.seed ?? 3, view = ALL_VIEWS.includes(opts.view) ? opts.view : "front", o = { ...opts, seed, view };
  const front = (q) => romanFront(p, O, q);
  if ((view === "front" || view === "three-quarter") && opts.sit) castSit(p, O, view === "three-quarter" ? { ...o, facing: opts.facing ?? 1 } : o, view === "three-quarter" ? (q) => castThreeQuarter(front, p.g, q) : front);
  else if (view === "three-quarter") castThreeQuarter(front, p.g, { ...o, facing: opts.facing ?? 1, step: opts.walk ? opts.phase ?? 0 : opts.step ?? 0 });
  else if (view === "profile" && opts.sit) castSitSide(p, O, o);
  else if (view === "front") romanFront(p, O, { ...o, step: opts.walk ? opts.phase ?? 0 : opts.step ?? 0 });
  else if (view === "back") castBack(p, O, { ...o, step: opts.walk ? opts.phase ?? 0 : opts.step ?? 0 });
  else castProfile(p, O, o);
  const extra = c?.extra?.[view] ?? (view === "three-quarter" ? c?.extra?.front : undefined);
  if (typeof extra === "function") {
    const G = view === "profile" ? { ...castGeometry(O, o), ...sideLayout(O, { mode: opts.walk ? "march" : "stand", phase: opts.phase ?? 0, seed }), cx: 300 } : castGeometry(O, o);
    p.rot = null; extra(p, G, o); p.rot = null;
  }
};
/** A character's card key part (q()-rounded options), so the canvas redraws only on a visible change. */
export const castKey = (id, opts = {}) => `${id}|${JSON.stringify(Object.fromEntries(Object.entries(opts).map(([k, v]) => [k, typeof v === "number" ? Math.round(v * 100) / 100 : v])))}`;
