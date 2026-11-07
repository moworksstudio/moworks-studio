// The 2D Explainer's kid on the house sheet (owner #1287-#1293, #1293 option A: the app draws what the source skill's drawing lacks, in its own
// layer). The source skill's house-hero.js draws the kid in one fixed stance: arms hanging, legs straight, faces from `worry` and `mouth` only.
// This is not an edit of that file (bundle/styles stays as pinned): when the house page loads its text, a few hooks are spliced into the copy in
// memory, so the app's layer (house/explainer-2d.js) can pose the kit's OWN parts, drawn by its own code and shading:
//   - its drawing functions are reachable (HOUSE.__heroKit: part, legs, sleeve, the colours, the rig),
//   - the front and back views draw their legs and sleeves through HOUSE.__pose.legsFront / armsFront when set (the app turns them about the
//     hip, knee, shoulder and elbow, each piece clipped from the kit's own drawing),
//   - the profile view's legs and near arm become closures the app can draw twice, once per segment (thigh / shin, upper arm / forearm),
//   - the brows can lift and the inner ends press down (browUp, browAngry) and the mouth can open (mouthOpen), in the kit's own brow() and mouth
//     shapes: the surprised, angry and talking faces the kit has no setting for.
// Each splice must match exactly once; a kit update that moves a line fails loudly (the gate says which), never draws a half-patched kid.
const SPLICES = [
  ["the kit's functions, reachable", "  HOUSE.hero = {\n    init:",
    "  HOUSE.__heroKit = { rig, mats, part, S, RP, fLens, fEll, rpoly, useM, mmul, mT, mS, mR, mAp, legs, shoe, hand, sleeve, torso, UNITS, HIP, NECK };\n  HOUSE.hero = {\n    init:"],
  ["the front and back legs, through the pose", "        legs(ctx, R, back);\n",
    "        if (HOUSE.__pose && HOUSE.__pose.legsFront) HOUSE.__pose.legsFront(ctx, R, () => legs(ctx, R, back)); else legs(ctx, R, back);\n"],
  ["the front sleeves, through the pose", "          for (const side of [-1, 1]) sleeve(ctx, R, side, false);\n",
    "          if (HOUSE.__pose && HOUSE.__pose.armsFront) HOUSE.__pose.armsFront(ctx, R, () => { for (const side of [-1, 1]) sleeve(ctx, R, side, false); }); else for (const side of [-1, 1]) sleeve(ctx, R, side, false);\n"],
  ["the back sleeves, through the pose", "          for (const side of [-1, 1]) sleeve(ctx, R, side, true);\n",
    "          if (HOUSE.__pose && HOUSE.__pose.armsFront) HOUSE.__pose.armsFront(ctx, R, () => { for (const side of [-1, 1]) sleeve(ctx, R, side, true); }); else for (const side of [-1, 1]) sleeve(ctx, R, side, true);\n"],
  ["the profile's far leg, a closure", "    // far leg, a touch forward and in shadow\n    sh(-0.9, true);\n",
    "    // far leg, a touch forward and in shadow\n    const farLeg = () => {\n    sh(-0.9, true);\n"],
  ["the profile's near leg, a closure", "    part(ctx, R, S(leg(-1.0)), J, { ds: 0, base: J.sh, rim: false, top: false });\n    sh(0.4, false);\n",
    "    part(ctx, R, S(leg(-1.0)), J, { ds: 0, base: J.sh, rim: false, top: false });\n    };\n    const nearLeg = () => {\n    sh(0.4, false);\n"],
  ["the profile's legs, through the pose", "        c.fill();\n      },\n    });\n  }\n\n  // ---------------------------------------------------------------- views",
    "        c.fill();\n      },\n    });\n    };\n    if (HOUSE.__pose && HOUSE.__pose.legsProfile) HOUSE.__pose.legsProfile(ctx, R, farLeg, nearLeg); else { farLeg(); nearLeg(); }\n  }\n\n  // ---------------------------------------------------------------- views"],
  ["the profile's near arm, a closure", "    // near arm\n", "    const nearArm = () => {\n    // near arm\n"],
  ["the profile's arm, through the pose", "    // droplets: shoulder, hood, arm top\n",
    "    };\n    if (HOUSE.__pose && HOUSE.__pose.armProfile) HOUSE.__pose.armProfile(ctx, R, nearArm); else nearArm();\n    // droplets: shoulder, hood, arm top\n"],
  // a posed piece keeps the scene's light: its cel shadow and its rims are offsets in the piece's own frame, so a piece turned by R.__rot
  // turns them back (without it, an arm raised overhead carries its top rim down its side)
  ["the light stays put on a turned piece", "    const sd = o.sd || [R.L[0] * ds, R.L[1] * ds];\n",
    "    const __u = (v) => { const a = R.__rot || 0; if (!a) return v; const c = Math.cos(a), s = Math.sin(a); return [v[0] * c + v[1] * s, -v[0] * s + v[1] * c]; };\n    const sd = __u(o.sd || [R.L[0] * ds, R.L[1] * ds]);\n"],
  ["the rims stay put on a turned piece", "      if (o.top !== false) cres(ctx, Sh, 0, rw * 0.8, m.top);\n      if (o.rim !== false) cres(ctx, Sh, -R.rimSide * rw, rw * 0.2, m.rim);\n",
    "      const __tp = __u([0, rw * 0.8]), __rm = __u([-R.rimSide * rw, rw * 0.2]);\n      if (o.top !== false) cres(ctx, Sh, __tp[0], __tp[1], m.top);\n      if (o.rim !== false) cres(ctx, Sh, __rm[0], __rm[1], m.rim);\n"],
  // a character of its own (owner #1302: "a new recurring character is designed from scratch, with its own silhouette and palette"): the kit
  // caches its materials by the flash alone; the cache key also takes the palette in hand, so a character's colours (HOUSE.pal for its draw)
  // are never served from another's
  ["the materials, by palette too", "    let C = matCache.get(q);\n", "    const __k = q + \"|\" + (HOUSE.__palKey || \"\"); let C = matCache.get(__k);\n"],
  ["the materials kept by palette", "    matCache.set(q, C);\n", "    matCache.set(__k, C);\n"],
  ["the brows' lift", "    const lift = -0.45 * R.up;\n    const wx = (x)", "    const lift = -0.45 * R.up - ((HOUSE.__pose && HOUSE.__pose.browUp) || 0);\n    const wx = (x)"],
  ["the brows' inner ends", "      const I = [wx(side * (1.5 - 0.15 * w)), -3.25 + fy + lift - 1.4 * w];\n",
    "      const I = [wx(side * (1.5 - 0.15 * w)), -3.25 + fy + lift - 1.4 * w + ((HOUSE.__pose && HOUSE.__pose.browAngry) || 0)];\n"],
  ["the mouth's opening", "    const open = 0.42 + 0.6 * Math.max(0, m) + 0.42 * w;\n",
    "    const open = 0.42 + 0.6 * Math.max(0, m) + 0.42 * w + ((HOUSE.__pose && HOUSE.__pose.mouthOpen) || 0);\n"],
];

/** house-hero.js's text with the hooks spliced in (the copy the house page runs). Throws, naming the splice, if one does not match exactly once. */
export function hookHero(text) {
  const nl = text.includes("\r\n") ? "\r\n" : "\n";
  let s = text;
  for (const [what, a, b] of SPLICES) {
    const from = a.replaceAll("\n", nl), to = b.replaceAll("\n", nl), n = s.split(from).length - 1;
    if (n !== 1) throw Object.assign(new Error(`the 2D Explainer kit changed: "${what}" matches ${n} times in house-hero.js`), { code: "INVALID" });
    s = s.replace(from, to);
  }
  return s;
}
export const SPLICE_COUNT = SPLICES.length;

/** house-hero.js keyed by palette only (the two material-cache splices): the copy a 2D Explainer film runs when its cast has a library character
 *  in a palette of its own (owner #1302), so the film can draw it with HOUSE.pal and HOUSE.__palKey swapped for that draw. The film's look is
 *  otherwise the kit's as shipped: with no __palKey the cache key is the kit's own. Throws as hookHero does. */
export function paletteKeyed(text) {
  const nl = text.includes("\r\n") ? "\r\n" : "\n";
  let s = text;
  for (const [what, a, b] of SPLICES.filter(([w]) => w.startsWith("the materials"))) {
    const from = a.replaceAll("\n", nl), to = b.replaceAll("\n", nl), n = s.split(from).length - 1;
    if (n !== 1) throw Object.assign(new Error(`the 2D Explainer kit changed: "${what}" matches ${n} times in house-hero.js`), { code: "INVALID" });
    s = s.replace(from, to);
  }
  return s;
}
