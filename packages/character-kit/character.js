// character.js: Moworks Studio's character layer, written for the app on ClaudeAnimationBase's kit (John Heibel, MIT,
// https://github.com/JohnHeibel/ClaudeAnimationBase at 0ac8bf2). The kit draws one character, Clawd, with its body and key views written
// into clawd(); its faces, emotions, hats, emotes, moves and acting helpers work for any body. This layer draws ANY character from a
// definition (data): body shape and size, colours, where the face, head, legs and arms sit, and its five key views, then reuses the kit's
// eyes(), mouth(), hat(), faceHat(), blush(), gloom(), emote(), feel(), emotions(), move(), turn() and spinView() as shipped. The kit's
// own rules hold: flat 2D, drawn key views (never a rotated 3D box), painted with p5.brush through paint() and inkLine(), boil.
//
// A definition (units of u, the body unit; (x, y) is the ground point between the feet, negative y is up):
//   { id, name, colors: { col, dk, lt },
//     body:  { shape: box | round | egg | pill, w, h, bottom },        the body spans x -w/2..w/2, y bottom-h..bottom
//     face:  { y, dx, mouth, bx },                                     eye line, half the eye spacing, mouth below the eyes, cheeks
//     head:  { top, width },                                          where hats and over-head emotes sit
//     legs:  { xs: [front-view x of each leg], w, h },  arms: { x, y, len, th },
//     views: { front|q|side|qback|back: { L, R, strip, seam, face, legs, arms, hat, hw, back } }   optional; made from the body when absent
//   }
// The face features keep the kit's own layout (eyes 2.5 apart from the middle, mouth 1.7 below), scaled by face.dx / 2.5 and placed on
// face.y; hats are scaled by head.width / 10 and stand on head.top. So any face style and any of the 31 emotions fit any body.

// HyperFrames runs a page on virtual time: its requestAnimationFrame fires only when HF seeks, and p5 waits on a browser frame while it
// sets up and redraws, so p5 gets the browser's own frames. Time stays HyperFrames': the kit draws from T, which the bridge sets from t.
if (window.__HF_VIRTUAL_TIME__?.originalRequestAnimationFrame) {
  window.requestAnimationFrame = window.__HF_VIRTUAL_TIME__.originalRequestAnimationFrame;
  window.cancelAnimationFrame = window.__HF_VIRTUAL_TIME__.originalCancelAnimationFrame;
}
// The kit's PROJECT-driven setup says window.ready; the app's bridge waits on window.__ready (same as mg-styles-15's contract).
const __kitSetup = setup;
window.setup = async function () { await __kitSetup(); window.__ready = true; };
// p5 starts its global mode on the window's load event. HyperFrames' capture runs a page's own scripts after its fonts, when that event
// has passed, so the layer starts p5 itself then (once: p5.instance is the global sketch).
if (document.readyState === 'complete' && !p5.instance) new p5();
// HyperFrames only needs the frame painted, not returned as an image: renderAt(t) paints and composites (no toDataURL per frame)
window.renderAt = async (t) => { T = t; await redraw(); composite(t); };

const VIEW_NAMES = ['front', 'q', 'side', 'qback', 'back'];

/** The five key views of a definition, in the kit's VIEWS format; a definition's own views win, field by field. */
function charViews(def) {
  if (def.__views) return def.__views;
  const h = def.body.w / 2, f = def.face, ax = def.arms.x ?? h - .1, xs = def.legs?.xs ?? [], bx = f.bx ?? h * .72;
  const legs = (k, sh, farFirst) => xs.map((x, i) => [x * k + sh, farFirst && i === 0 ? 1 : 0]);
  const sideLegs = xs.length >= 4 ? [[-.42 * h, 1], [.26 * h, 1], [-.52 * h, 0], [.18 * h, 0]] : xs.length ? [[-.15 * h, 1], [-.35 * h, 0]] : [];
  const base = {
    front: { L: -h, R: h, face: { cx: 0, fw: 1, sides: [-1, 1], mx: 0, bx }, hat: 0, hw: 1, legs: legs(1, 0), arms: [[-ax, -1, 'L', 0], [ax, 1, 'R', 0]] },
    q: { L: -h, R: h * 1.02, strip: [-h, -h * .46], seam: -h * .46, face: { cx: .3 * h, fw: .74, sides: [-1, 1], mx: .3, bx }, hat: .12 * h, hw: 1,
         legs: legs(.9, .2, true), arms: [[ax * 1.02, 1, 'R', 2], [-ax * .96, -1, 'L', 1]] },
    side: { L: -h * .62, R: h * .62, face: { cx: (def.body.shape === 'box' ? .27 : .14) * h, fw: .55, sides: [1], mx: 1.7, bx: 1 }, hat: .06 * h, hw: .66, legs: sideLegs, arms: [[.32 * h, 0, 'L', 1]] },
    qback: { L: -h * 1.02, R: h, strip: [h * .46, h], seam: h * .46, face: null, hat: -.08 * h, hw: 1,
             legs: legs(.9, -.2, true).map(([x, far]) => [-x, far]), arms: [[-ax * 1.02, -1, 'R', 2], [ax * .96, 1, 'L', 1]] },
    back: { L: -h, R: h, face: null, hat: 0, hw: 1, back: true, legs: legs(1, 0), arms: [[-ax, -1, 'R', 0], [ax, 1, 'L', 0]] },
  };
  for (const v of VIEW_NAMES) if (def.views?.[v]) base[v] = { ...base[v], ...def.views[v] };
  Object.defineProperty(def, '__views', { value: base, enumerable: false });
  return base;
}

/** The body outline in one view (body-local, u units already applied): the shape across the view's width. */
function bodyPts(def, V, u, J) {
  const B = def.body, L = V.L * u, R = V.R * u, w = R - L, top = (B.bottom - B.h) * u, h = B.h * u, cx = (L + R) / 2;
  switch (B.shape) {
    case 'round': return rrPts(L, top, w, h, Math.min(w, h) * (B.r ?? .3), J * .5);
    case 'pill': return rrPts(L, top, w, h, Math.min(w, h) / 2 * .98, J * .5);
    case 'egg': {
      const p = [], n = 30, rx = w / 2, ry = h / 2, cy = top + ry;
      for (let i = 0; i < n; i++) { const a = i / n * TAU, s = Math.sin(a); p.push([cx + Math.cos(a) * rx * (s < 0 ? 1 + .18 * s : 1) + jit(J * .5), cy + s * ry + jit(J * .5)]); }
      return p;
    }
    default: return rectPts(L, top, w, h, J);
  }
}
const yBelow = (pts, cut) => pts.map(([x, y]) => [x, Math.max(y, cut)]);
const xWithin = (pts, a, b) => pts.map(([x, y]) => [clamp(x, a, b), y]);

// The head frame the kit's hats, gloom and emotes are drawn in (their own coordinates put the head top at -8u, 10u wide).
function headFrame(def, V, u) {
  const hk = def.head.width / 10;
  translate(V.hat * u, def.head.top * u); scale(V.hw * hk, hk); translate(0, 8 * u);
}

/** One frame of a character, with the same options as the kit's clawd() (pose, view, face, colour, extras; see clawd.js). */
function character(def, x, y, u, o = {}) {
  const id = o.boilKey ?? ++CLAWD_N, rs = part => boilSeed(`char ${def.id} ${id} ${part}`);
  x += (o.dx || 0) * u;
  const views = charViews(def), V = views[o.view] || views.front, B = def.body, F0 = def.face;
  const dy = (o.dy || 0) * u, sq = (o.sq || 0) + (o.take || 0), sm = clamp(o.smear || 0);
  const sw = clamp(u / 15, .45, 2.4) * (o.swMul || 1), J = u * .07;
  const { col, dk, lt } = tintCols({ ...o, col: o.col || def.colors.col, dk: o.dk || def.colors.dk, lt: o.lt || def.colors.lt }), far = mixCol(dk, PAL.ink, .22);
  const top = B.bottom - B.h, k = F0.dx / 2.5;
  // the kit's lunchbox lid is Clawd's own mouth; any other body shows its teeth instead
  const mouthName = o.mouth ?? ((o.lid || 0) > .01 ? 'teeth' : undefined);

  rs('shadow');
  if (!o.noShadow) {
    const f = 1 - Math.min(.5, Math.abs(o.dy || 0) * .06), w = (V.R - V.L) / 10;
    paint(ellPts(x, y + u * .15, u * 5.6 * f * w, u * f, 22), { fill: PAL.ink, fillOp: 90, bleed: .25, tex: .3, border: .1, ink: null });
  }
  if (sm > .05) smearTrail(x, y + dy, u, V, sm, o.smearDir ?? (o.flip ? -1 : 1), col);

  push();
  translate(x, y + dy);
  if (o.rot) rotate(o.rot);
  scale((o.flip ? -1 : 1) * (o.sx ?? 1) * (1 + sq * .6) * (1 + sm * .35), (o.sy ?? 1) * (1 - sq));

  const A = def.arms, aLen = A.len ?? 2.2, aTh = A.th ?? 1, ay = A.y ?? (top + B.h * .58);
  const arm = ([px, dir, which, layer]) => {
    rs('arm' + which);
    const a = which === 'L' ? (o.aL ?? .2) : (o.aR ?? .2), hook = which === 'L' ? o.armL : o.armR;
    push(); translate((px + dir * .55 * clamp((Math.abs(a) - .7) / .9)) * u, ay * u);
    if (dir === 0) {
      translate(0, .3 * u); rotate(.7 - a);
      paint(rectPts(-.2 * u, -aTh * .45 * u, (aLen + .1) * u, aTh * .9 * u, J * .6), { wash: col, washOp: 255, fill: dk, fillOp: 60, tex: .5, ink: PAL.ink, sw: sw * .8 });
      if (hook) { translate((aLen - .1) * u, 0); hook(u, sw); }
    } else {
      rotate(dir < 0 ? a : -a);
      paint(rectPts(dir < 0 ? -aLen * u : 0, -aTh * .5 * u, aLen * u, aTh * u, J * .6), { wash: layer === 2 ? mixCol(col, dk, .4) : col, washOp: 255, fill: dk, fillOp: 60, tex: .5, ink: PAL.ink, sw: sw * .8 });
      if (hook) { translate(dir * aLen * u, 0); if (dir < 0) scale(-1, 1); hook(u, sw); }
    }
    pop();
  };

  V.arms.filter(a => a[3] !== 1).forEach(arm);
  const LG = def.legs ?? {}, lw = LG.w ?? 1, lh = LG.h ?? 2.2;
  if (!o.noLegs) V.legs.forEach(([lx, isFar], i) => {
    rs('leg' + i);
    let h = lh, sx = 0;
    if (o.walk != null) {
      if (o.view === 'side') { const ph = (o.walk + [0, .5, .5, 0][i % 4]) * TAU; sx = Math.sin(ph) * .55; h = lh - Math.max(0, Math.cos(ph)) * .8; }
      else { const ph = Math.sin((o.walk + (i % 2 ? .5 : 0)) * TAU); if (ph > 0) h = lh - ph * .9; }
    }
    paint(rectPts((lx + sx) * u, (B.bottom - .4) * u, lw * u, h * u, J * .6), { wash: isFar ? far : dk, washOp: 255, ink: PAL.ink, sw: sw * .8 });
  });

  rs('body');
  const body = bodyPts(def, V, u, J), wk = (V.R - V.L) / 10;
  paint(body, { wash: col, washOp: 255, ink: null });
  const px = V.strip ? (V.strip[0] < 0 ? (V.seam + V.R) / 2 - 1.2 * wk : (V.L + V.seam) / 2 - .6 * wk) : -1.6 * wk;
  paint(ellPts(px * u, (top + B.h * .27) * u, 3.4 * u * (V.strip ? .75 : wk), B.h * .25 * u, 18, J * 2, -.08), { fill: lt, fillOp: V.back ? 80 : 120, bleed: .2, tex: .85, border: .8, ink: null });
  paint(yBelow(body, (B.bottom - B.h * .3) * u), { fill: dk, fillOp: 120, bleed: .03, tex: .7, border: .5, ink: null });
  if (V.strip) {
    paint(xWithin(body, V.strip[0] * u, V.strip[1] * u), { fill: dk, fillOp: 150, bleed: .04, tex: .6, border: .4, ink: null });
    inkLine([[V.seam * u + jit(J), (top + B.h * .08) * u], [V.seam * u + jit(J), (top + B.h * .5) * u], [V.seam * u + jit(J), (B.bottom - B.h * .08) * u]], sw * .55, PAL.ink, 'inkfine', 0);
  }
  paint(body, { ink: PAL.ink, sw });
  if (o.gloom > .02) { push(); headFrame(def, V, u); gloom(u, sw, { L: -5, R: 5 }, o.gloom); pop(); }
  if (V.face) {
    const F = V.face;
    push(); translate(F.cx * u, 0); scale(F.fw, 1);
    translate(0, F0.y * u); scale(k); translate(0, 6 * u);
    if (o.blush) blush(u, sw, F, o.blush === true ? 1 : o.blush);
    rs('eyes'); eyes(u, o, sw, F.sides, sm); rs('mouth');
    push(); translate(F.mx * u, ((F0.mouth ?? 1.7) - 1.7) * u); mouth(u, mouthName, sw); pop();
    if (['cat', 'masq', 'bowtie'].includes(o.hat)) faceHat(u, o.hat, sw, F.sides);
    pop();
  }
  rs('hat'); push(); headFrame(def, V, u); hat(u, o.hat, sw); pop();
  V.arms.filter(a => a[3] === 1).forEach(arm);
  rs('draw'); if (o.draw) o.draw(u, sw);
  pop();

  rs('emote');
  if (o.emote) {
    const hk = def.head.width / 10, isTop = EMOTE_TOP.includes(o.emote), dir = o.flip ? -1 : 1;
    const ex = isTop ? x + dir * V.hat * u : x + dir * (V.R + .4) * u, ey = y + dy + (isTop ? def.head.top - 2.4 * hk : def.head.top - .6 * hk) * u * (1 - sq);
    emote(o.emote, ex, ey, u * .9 * hk, o.emoteK ?? 1, o.emoteAge ?? T);
  }
  rs('after');
}

/** The kit's feel() and emotions(), coloured as this character (the kit's own default colour is Clawd's clay). */
function charFeel(def, name, t, over = {}) { return feel(name, t, { col: def.colors.col, dk: def.colors.dk, lt: def.colors.lt, ...over }); }
function charEmotions(def, t, keys, o = {}) {
  return emotions(t, keys.map(([t0, n, over]) => [t0, n, { col: def.colors.col, dk: def.colors.dk, lt: def.colors.lt, ...(over || {}) }]), o);
}

// ---------- model sheets and a showreel: the Character page's demo of what a definition can do ----------
// (the sheets keep the kit's own sizes: Clawd at u 11 on the emotions sheet, 19 / 13 / 8 on the views sheet)
const sheetLabel = (txt, x, y, size = 20) => letter(txt, x, y, size, PAL.ink, { ink: false, alpha: .8 });
const sheetFloor = (y, x0 = 0, x1 = W) => inkLine([[x0 + 40, y + 6], [W / 2, y + 4], [x1 - 40, y + 7]], .6, mixCol(PAL.paper, PAL.ink, .35), 'inkfine', .5);
/** How big a definition draws in a given space: u so the whole character (body and legs) is at most `px` tall and `wpx` wide. */
const unitFor = (def, px, wpx = Infinity) => Math.min(px / Math.max(1, -def.head.top, def.body.h - def.body.bottom), wpx / Math.max(1, def.body.w + 2 * (def.arms.len ?? 2.2)));

/** Every emotion of the kit on this character, alive (as the kit's own emotions sheet). */
function emotionSheet(def, t) {
  const names = Object.keys(EMO), cols = 8, cw = W / cols, ch = H / 4, u = unitFor(def, 88, cw * .62);
  names.forEach((name, i) => {
    const cx = cw * (i % cols) + cw / 2, gy = ch * Math.floor(i / cols) + ch - 58;
    character(def, cx, gy, u, charFeel(def, name, t, { seed: i }));
    sheetLabel(name, cx, gy + 32);
  });
  for (let r = 0; r < 4; r++) sheetFloor(ch * r + ch - 58);
}
/** The five key views, the motion helpers and the hats (as the kit's own views sheet). */
function viewSheet(def, t) {
  const u1 = unitFor(def, 152, 300), u2 = unitFor(def, 104, 250), u3 = unitFor(def, 64, 110);
  VIEW_NAMES.forEach((v, i) => { const x = 240 + i * 360; character(def, x, 420, u1, { ...charFeel(def, 'neutral', t, { seed: i }), view: v }); sheetLabel(v, x, 462, 24); });
  sheetFloor(420);
  const y2 = 730, row = [
    ['walk (side)', x => character(def, x, y2, u2, { ...move('walk', t), view: 'side' })],
    ['turn', x => character(def, x, y2, u2, { ...charFeel(def, 'happy', t), ...spinView(Math.floor(t * 2) / 8) })],
    ['smear', x => character(def, x, y2, u2, { ...charFeel(def, 'excited', t), view: 'side', smear: .8, smearDir: 1, dx: Math.sin(t * TAU / 2) * .3 })],
    ['jump', x => { const kk = t % 1.5; character(def, x, y2, u2, { ...charFeel(def, 'happy', t), ...jump(kk, .35, .95, 3) }); }],
    ['take', x => character(def, x, y2, u2, { ...charFeel(def, 'surprised', t), ...take(t % 2, .5, 1.2), emoteAge: (t % 2) - .5, emoteK: seg(t % 2, .5, .7) })],
    ['dance', x => character(def, x, y2, u2, { ...charFeel(def, 'happy', t), ...move('mix', t) })],
  ];
  row.forEach(([name, f], i) => { const x = 180 + i * 312; f(x); sheetLabel(name, x, y2 + 38); });
  sheetFloor(y2);
  const hats = ['party', 'hard', 'crown', 'halo', 'wizard', 'top', 'fedora', 'band', 'beanie', 'bow', 'flower', 'headphones', 'cat', 'masq', 'bowtie'];
  hats.forEach((hn, i) => { const x = 82 + i * 125.5; character(def, x, 985, u3, { ...charFeel(def, 'neutral', t, { seed: i }), hat: hn }); sheetLabel(hn, x, 1015, 17); });
  sheetFloor(985);
}
/** A short acted showreel (no lettering): the character reacts, gets an idea, turns, jumps and celebrates on the beat. */
function showreel(def, t) {
  const u = unitFor(def, 470, 1100), gy = 900;
  paint(ellPts(960, 560, 760, 330, 30, 20), { fill: PAL.sky, fillOp: 70, bleed: .3, ink: null });
  sheetFloor(gy, 160, W - 160);
  const keys = [[0, 'neutral'], [1, 'surprised'], [1.8, 'thinking'], [2.8, 'idea'], [3.6, 'excited'], [5, 'happy', { emote: 'music' }]];
  const tu = turn(t, 2.2, 2.6, 0, .125), back = turn(t, 3.1, 3.4, .125, 0), view = t < 2.2 ? { view: 'front', flip: false } : t < 3.1 ? tu : back;
  character(def, 960, gy, u, { ...charEmotions(def, t, keys), ...view, ...(t > 4 ? jump(t, 4.1, 4.6, 3) : {}), ...(t > 5 ? move('bounce', t) : {}) });
  if (t < .35) brushWipe(.5 + t / .7);
  if (t > PROJECT.duration - .35) brushWipe((t - (PROJECT.duration - .35)) / .7);
}
