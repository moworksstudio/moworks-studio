// fly.js — the Stickman Explainer worked example: "What If You Could Fly?" (37.5 s), drawn with src/stickman/kit.js.
// drawFly(ctx, t, frame) draws any frame. In production every beat was timed to the narration's word times; the kit
// ships the picture only (src/examples/ExampleFly.tsx adds the sound effects). Copy its devices, never its story.
//
//  0.00 S1  gridlock from above · 8 LANES · 0 KM/H · a honk          "Eight lanes. Nobody's moved in 20 minutes."
//  3.42 S2  the office: feet up, already at his desk                  "You're already at your desk."
//  5.25 S3  bedroom window at dawn: one step, launch (6.52)           "You left through your bedroom window."
//  7.00 S4  flying over the rooftops; the pigeon's double take        "Two rooftops. One very confused pigeon."
// 10.42 S5  map: the car route vs the flight line, 0:00 → 1:30        "90 seconds. Window to desk."
// 12.92 S6  coworker at the open window; the shrug                   "Did you just come in through the window?"
// 15.50 S7  title WHAT IF YOU COULD / FLY? (hit 15.95)
// 18.58 S8  the climb: high jump 2.45 m → 4 km skydivers → 11 km airliner → through the clouds → sandwich
// 29.25 S9  frost, breath, −55 °C
// 31.75 S10 he looks down                                            "Turns out flying is the easy part."
// 33.95 S11 inserts: the passenger · the flock · the radar            "Everything else is a problem."
import {
  C, E, W, H, alpha, armIK, at, circle, clamp, ellipse, figure, finish, glow, joints, layer, lerp, line, linGrad, path, poly,
  radGrad, ramp, rect, rgba, rnd, steam, text, track, walk, wob,
} from "../stickman/kit.js";

export const FPS = 24;
export const SECONDS = 37.5;
const S = { office: 82 / 24, bedroom: 126 / 24, roofs: 168 / 24, map: 250 / 24, cowork: 310 / 24, title: 372 / 24, climb: 446 / 24, frost: 702 / 24, down: 762 / 24, plane: 815 / 24, birds: 831 / 24, radar: 847 / 24 };

// ── the hero (crimson hoodie, broader build, quiff, sneakers) and the coworker ──
const OUTFIT = { hoodie: "#d23b45", dark: "#a52733", shade: "#86202b", strings: "#f7e6e6" };
const hero = (x, o) => figure(x, { tone: "hero", build: "muscular", hair: "quiff", shoes: "#f1f1ec", outfit: OUTFIT, ...o, face: { brows: true, ...(o.face || {}) } });
const coworker = (x, o) => figure(x, { tone: "hero", hair: "bun", hood: false, outfit: { hoodie: "#2f9c94", dark: "#237a73", shade: "#1d625c" }, ...o });
const WARM = { color: "#ffd9a6", width: 3.5, dx: 4, dy: -4 };
const COOL = { color: "#e8eef8", width: 3, dx: -3, dy: -3 };

// ── shared overlay: a small label pill (the "extra animation" layer) ──
const pill = (x, str, px, py, k, o = {}) =>
  alpha(x, clamp(k * 1.4), () =>
    at(x, px, py, 0, 0.85 + 0.15 * E.out(clamp(k)), 0.85 + 0.15 * E.out(clamp(k)), () => {
      x.font = `800 ${o.size ?? 30}px "Open Sans"`;
      x.letterSpacing = "2px";
      const w = x.measureText(str).width + 44;
      const h = (o.size ?? 30) * 1.7;
      rect(x, -w / 2, -h / 2, w, h, rgba(o.bg ?? "#0d1118", 0.72), h / 2);
      if (o.accent) rect(x, -w / 2, -h / 2, 10, h, o.accent, 5);
      text(x, str, 0, (o.size ?? 30) * 0.36, { size: o.size ?? 30, fill: o.fill ?? "#f6efe2", align: "center", track: 0.06 });
    }),
  );
const speedLines = (x, t, n, k, color = "#ffffff", vx = 2600) => {
  if (k <= 0.01) return;
  for (let i = 0; i < n; i++) {
    const y = 90 + rnd(i, 31) * 900;
    const len = 60 + rnd(i, 32) * 220;
    const px = ((((rnd(i, 33) * 2600 - ((t * (vx * (0.7 + 0.6 * rnd(i, 34)))) % 2600)) + 2600) % 2600) - 300);
    alpha(x, k * (0.15 + 0.35 * rnd(i, 35)), () => line(x, px, y, px + len, y, 2 + rnd(i, 36) * 2, color, "round"));
  }
};

// ── S1 · gridlock ──────────────────────────────────────────────────────────────────────────────────────────────
const CAR = ["#c94b4b", "#e9e6df", "#3c4250", "#d9a93a", "#5a7fb8", "#8b9096", "#2f6b55", "#b7b9be", "#7d4f9c", "#e9e6df"];
const topCar = (x, cx, cy, w, color, brake) =>
  at(x, cx, cy, 0, 1, 1, () => {
    const h = w * 0.46;
    alpha(x, 0.35, () => rect(x, -w / 2 + 7, -h / 2 + 9, w, h, "#000", h * 0.32));
    rect(x, -w / 2, -h / 2, w, h, color, h * 0.32);
    path(x, `M ${w * 0.1} ${-h * 0.38} L ${w * 0.3} ${-h * 0.33} L ${w * 0.3} ${h * 0.33} L ${w * 0.1} ${h * 0.38} Z`, "#1c222b");
    path(x, `M ${-w * 0.36} ${-h * 0.34} L ${-w * 0.22} ${-h * 0.38} L ${-w * 0.22} ${h * 0.38} L ${-w * 0.36} ${h * 0.34} Z`, "#1c222b");
    alpha(x, 0.18, () => rect(x, -w * 0.2, -h * 0.36, w * 0.28, h * 0.72, "#ffffff", 6));
    rect(x, w / 2 - 8, -h * 0.38, 6, h * 0.2, "#f5f0d0", 2);
    rect(x, w / 2 - 8, h * 0.18, 6, h * 0.2, "#f5f0d0", 2);
    const b = 0.55 + 0.45 * brake;
    if (brake > 0.05) {
      glow(x, -w / 2, -h * 0.28, 34, "#ff3b30", 0.45 * brake);
      glow(x, -w / 2, h * 0.28, 34, "#ff3b30", 0.45 * brake);
    }
    rect(x, -w / 2 - 1, -h * 0.38, 7, h * 0.2, rgba("#ff3b30", b), 2);
    rect(x, -w / 2 - 1, h * 0.18, 7, h * 0.2, rgba("#ff3b30", b), 2);
  });
const gridlock = (x, t) => {
  const s = lerp(1.1, 1.0, E.out(ramp(t, 0, 3.4, E.linear)));
  layer(x, { cam: { cx: 960, cy: 540, s, rot: -4 } }, (x) => {
    rect(x, -400, -400, 2720, 1880, "#5d6b4f");
    rect(x, -400, 110, 2720, 860, "#3b3f45");
    for (let i = 0; i < 160; i++) alpha(x, 0.08, () => circle(x, rnd(i, 3) * 2700 - 400, 110 + rnd(i, 4) * 860, 2 + rnd(i, 5) * 4, "#22252a"));
    rect(x, -400, 104, 2720, 8, "#cfcfc6");
    rect(x, -400, 968, 2720, 8, "#cfcfc6");
    for (let l = 1; l < 8; l++) {
      const y = 110 + l * 107.5;
      for (let k = -4; k < 30; k++) rect(x, k * 110, y - 3, 56, 6, l === 4 ? "#e3c04a" : "#d9d9d2");
    }
    for (let l = 0; l < 8; l++) {
      const y = 110 + l * 107.5 + 53.75;
      const off = rnd(l, 7) * 180 - 300;
      for (let k = 0; k < 13; k++) {
        const w = 150 + rnd(l * 20 + k, 8) * 30;
        const cx = off + k * 205 + rnd(l * 20 + k, 9) * 30 + 2 * Math.sin(t * 1.3 + l + k);
        const brake = 0.5 + 0.5 * Math.sin(t * 2.2 + rnd(l * 20 + k, 10) * 6) > 0.3 ? 1 : 0.35;
        topCar(x, cx, y + (rnd(l * 20 + k, 11) - 0.5) * 8, w, CAR[(l * 3 + k) % CAR.length], brake);
      }
    }
    // a honk rings out from one car
    const hk = ramp(t, 0.98, 1.7, E.linear);
    if (hk > 0 && hk < 1) for (let r = 0; r < 3; r++) alpha(x, (1 - hk) * (1 - r * 0.25), () => {
      x.strokeStyle = "#ffe08a";
      x.lineWidth = 5;
      x.beginPath();
      x.arc(1125, 434, 40 + hk * 160 + r * 30, -0.9, 0.9);
      x.stroke();
    });
    // heat shimmer over the asphalt
    for (let i = 0; i < 7; i++) alpha(x, 0.05, () => path(x, `M ${-300 + i * 400} ${560 + Math.sin(t * 3 + i) * 30} q 100 -20 200 0 t 200 0`, null, "#ffffff", 14));
  });
  layer(x, {}, (x) => {
    pill(x, "8 LANES", 300, 190, ramp(t, 0.35, 0.65), { accent: "#d23b45", size: 40 });
    pill(x, "0 KM/H", 300, 300, ramp(t, 1.3, 1.6), { accent: "#d23b45", size: 40 });
    pill(x, "20 MIN", 300, 410, ramp(t, 2.55, 2.85), { accent: "#e3c04a", size: 40 });
  });
};

// ── S2 / S6 · the office ───────────────────────────────────────────────────────────────────────────────────────
const officeBack = (x, windowOpen = 0, t = 0) => {
  x.fillStyle = linGrad(x, 0, 0, 0, 1080, [[0, "#dfe3e8"], [1, "#c9ced6"]]);
  x.fillRect(-300, -100, 2520, 1300);
  rect(x, -300, 150, 2520, 430, "#a9c7dd");
  x.fillStyle = linGrad(x, 0, 150, 0, 580, [[0, "#cfe3f2"], [1, "#a8c5db"]]);
  x.fillRect(-300, 150, 2520, 430);
  for (let i = 0; i < 26; i++) {
    const bx = -300 + i * 100 + rnd(i, 2) * 40;
    const bh = 120 + rnd(i, 3) * 260;
    rect(x, bx, 580 - bh, 80 + rnd(i, 4) * 40, bh, i % 2 ? "#8fa9c0" : "#7f99b2");
    for (let r = 0; r < bh / 34 - 1; r++) alpha(x, 0.35, () => rect(x, bx + 14, 580 - bh + 16 + r * 34, 50, 10, "#dfeaf3"));
  }
  for (let i = 0; i < 9; i++) rect(x, -300 + i * 300, 150, 16, 430, "#eef1f4");
  rect(x, -300, 572, 2520, 18, "#eef1f4");
  rect(x, -300, 40, 2520, 22, "#f6f7f8");
  for (let i = 0; i < 6; i++) rect(x, 60 + i * 330, 70, 200, 10, "#ffffff");
  rect(x, -300, 760, 2520, 400, "#8d7a68");
  // far desks: monitors + empty chairs
  for (let i = 0; i < 5; i++) {
    const dx = 120 + i * 380;
    rect(x, dx, 640, 300, 16, "#e8e2d8");
    rect(x, dx + 30, 656, 12, 104, "#b9b1a5");
    rect(x, dx + 258, 656, 12, 104, "#b9b1a5");
    rect(x, dx + 90, 560, 120, 76, "#2a2e36", 6);
    rect(x, dx + 140, 636, 20, 8, "#2a2e36");
    rect(x, dx + 110, 690, 80, 70, "#3a3f49", 12);
    rect(x, dx + 140, 760, 20, 30, "#3a3f49");
  }
};
const deskFront = (x, dx, dy, t, mug = true) => {
  rect(x, dx - 260, dy, 560, 26, "#d8c3a2", 4);
  rect(x, dx - 260, dy + 26, 560, 10, "#b9a17d");
  rect(x, dx - 240, dy + 36, 22, 260, "#8f7a5c");
  rect(x, dx + 258, dy + 36, 22, 260, "#8f7a5c");
  // laptop
  path(x, `M ${dx - 210} ${dy} L ${dx - 60} ${dy} L ${dx - 80} ${dy - 110} L ${dx - 190} ${dy - 110} Z`, "#2c313a");
  alpha(x, 0.5, () => path(x, `M ${dx - 196} ${dy - 8} L ${dx - 74} ${dy - 8} L ${dx - 90} ${dy - 100} L ${dx - 182} ${dy - 100} Z`, "#5f7c9c"));
  if (mug) {
    rect(x, dx + 170, dy - 62, 50, 62, "#f2efe8", 8);
    x.strokeStyle = "#f2efe8";
    x.lineWidth = 9;
    x.beginPath();
    x.arc(dx + 226, dy - 32, 15, -1.3, 1.3);
    x.stroke();
    rect(x, dx + 170, dy - 46, 50, 12, "#d23b45");
    steam(x, dx + 195, dy - 72, t, 0.42, true);
  }
};
const wallClock = (x, cx, cy, t, hh = 8, mm = 58) => {
  circle(x, cx, cy, 52, "#2a2e36");
  circle(x, cx, cy, 44, "#f7f7f4");
  for (let i = 0; i < 12; i++) at(x, cx, cy, i * 30, 1, 1, () => rect(x, -2, -40, 4, 8, "#2a2e36"));
  const sec = (t * 6) % 60;
  at(x, cx, cy, (hh % 12) * 30 + mm * 0.5, 1, 1, () => rect(x, -3, -24, 6, 26, "#2a2e36", 3));
  at(x, cx, cy, mm * 6, 1, 1, () => rect(x, -2, -36, 4, 38, "#2a2e36", 2));
  at(x, cx, cy, sec * 6, 1, 1, () => rect(x, -1, -38, 2, 44, "#d23b45", 1));
  circle(x, cx, cy, 4, "#d23b45");
};
const seatedPose = (lean, armsBehindHead) => {
  const j = joints(lean, 0);
  const pose = { lean, legL: [78, 88], legR: [86, 96] };
  if (armsBehindHead) {
    pose.armL = armIK(j.head[0] - 40 - j.shL[0], j.head[1] - 6 - j.shL[1], -1);
    pose.armR = armIK(j.head[0] - 30 - j.shR[0], j.head[1] - 18 - j.shR[1], 1);
  }
  return pose;
};
const officeDesk = (x, t) => {
  const u = t - S.office;
  layer(x, { blur: 7, cam: { cx: 960, cy: 540, s: 1.03 + 0.02 * ramp(u, 0, 1.9) } }, (x) => officeBack(x));
  layer(x, { cam: { cx: 960, cy: 540, s: 1.0 + 0.025 * ramp(u, 0, 1.9) } }, (x) => {
    wallClock(x, 330, 260, t);
    // chair
    rect(x, 1010, 560, 150, 210, "#2b2f37", 26);
    rect(x, 1075, 770, 20, 120, "#2b2f37");
    hero(x, { x: 1010, y: 980, s: 0.86, rim: COOL, pose: seatedPose(-14, true), face: { eyes: "smug", mouth: "smirk", look: 0.35 } });
    deskFront(x, 880, 760, t);
  });
  layer(x, {}, (x) => pill(x, "8:58 AM", 330, 370, ramp(u, 0.6, 0.9), { size: 32, accent: "#2f9c94" }));
};

// ── S3 · bedroom window at dawn ─────────────────────────────────────────────────────────────────────────────────
const skyline = (x, base, seed, color, n = 22, hmin = 120, hmax = 380, x0 = -300, step = 110) => {
  for (let i = 0; i < n; i++) {
    const bx = x0 + i * step + rnd(i, seed) * 30;
    const bh = hmin + rnd(i, seed + 1) * (hmax - hmin);
    const bw = step * (0.7 + rnd(i, seed + 2) * 0.5);
    rect(x, bx, base - bh, bw, bh, color);
    if (rnd(i, seed + 3) > 0.6) rect(x, bx + bw * 0.4, base - bh - 40, 6, 40, color);
  }
};
const curtain = (x, x0, dir, t, flare) => {
  const pts = [];
  for (let i = 0; i <= 12; i++) {
    const v = i / 12;
    const sway = (Math.sin(t * 3 + v * 4) * 14 + flare * 160 * v * v) * dir;
    pts.push([x0 + sway + dir * (60 + v * 30), 150 + v * 690]);
  }
  const d = `M ${x0} 150 ` + pts.map((p) => `L ${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ") + ` L ${x0} 840 Z`;
  alpha(x, 0.85, () => path(x, d, "#f3d9c4"));
  alpha(x, 0.4, () => path(x, `M ${x0 + dir * 30} 160 Q ${x0 + dir * (50 + flare * 80)} 500 ${x0 + dir * (40 + flare * 120)} 830`, null, "#e2bfa4", 6));
};
const bedroom = (x, t) => {
  const u = t - S.bedroom;
  const launch = ramp(t, 6.5, 6.86, E.in);
  const flare = ramp(t, 6.45, 6.7, E.out) * (1 - 0.4 * ramp(t, 6.75, 7.0));
  const shake = t > 6.5 && t < 6.85 ? (rnd(Math.floor(t * 60), 77) - 0.5) * 18 * (1 - ramp(t, 6.5, 6.85)) : 0;
  layer(x, { cam: { cx: 960 + shake, cy: 540 + shake * 0.6, s: 1.0 + 0.04 * ramp(u, 0, 1.75) } }, (x) => {
    // outside
    x.fillStyle = linGrad(x, 0, 150, 0, 840, [[0, "#86b4e0"], [0.65, "#f7c9a0"], [1, "#ffdcae"]]);
    x.fillRect(760, 150, 600, 690);
    glow(x, 1210, 700, 260, "#fff1c9", 0.8);
    skyline(x, 840, 40, "#8a9fbd", 10, 140, 320, 760, 62);
    skyline(x, 840, 50, "#6e819f", 8, 60, 200, 740, 80);
    // the room around the window
    x.fillStyle = linGrad(x, 0, 0, 0, 1080, [[0, "#d9b896"], [1, "#b8916d"]]);
    path(x, `M -300 -100 L 2220 -100 L 2220 1200 L -300 1200 Z M 760 150 L 760 840 L 1360 840 L 1360 150 Z`, x.fillStyle);
    rect(x, 740, 130, 640, 20, "#f4ece2");
    rect(x, 740, 840, 640, 26, "#f4ece2");
    rect(x, 740, 130, 20, 736, "#f4ece2");
    rect(x, 1360, 130, 20, 736, "#f4ece2");
    rect(x, 1055, 150, 10, 690, "#f4ece2");
    // the open sash, swung in
    alpha(x, 0.9, () => path(x, `M 1360 150 L 1500 110 L 1500 880 L 1360 840 Z`, "#efe6da"));
    alpha(x, 0.5, () => path(x, `M 1374 170 L 1486 140 L 1486 850 L 1374 822 Z`, "#bcd4ea"));
    curtain(x, 740, -1, t, flare);
    curtain(x, 1380, 1, t, flare);
    // bed + lamp
    rect(x, -100, 760, 620, 200, "#6f86a8", 20);
    rect(x, -100, 720, 620, 60, "#e9e4dc", 26);
    rect(x, 40, 690, 160, 60, "#f6f2ec", 24);
    rect(x, 560, 640, 26, 220, "#5b4a3c");
    path(x, "M 520 640 L 626 640 L 600 580 L 546 580 Z", "#f0d9a6");
    glow(x, 573, 620, 160, "#ffe2a8", 0.35);
    rect(x, -300, 960, 2520, 200, "#8a6a52");
    // the hero on the sill, seen from behind, backlit — then gone
    const crouch = ramp(t, 6.1, 6.45, E.inOut) * (1 - launch);
    const hy = 852 - launch * 1100;
    const hx = 1040 + launch * 260;
    alpha(x, 1 - ramp(t, 6.75, 6.86), () =>
      hero(x, {
        x: hx,
        y: hy,
        s: 0.62 * (1 - 0.2 * launch),
        rim: { color: "#ffd59a", width: 4, dx: 0, dy: -4, glow: 2 },
        pose: { legL: [-10 + crouch * 30, crouch * 70], legR: [12 + crouch * 25, crouch * 66], armL: [-25 - 20 * crouch, 20], armR: [25 + 20 * crouch, -20], bob: crouch * 40, lean: 0 },
        face: { eyes: "none", mouth: "none", look: 0 },
        flutter: launch > 0 ? t : undefined,
      }),
    );
    // papers lifting off the desk on the launch
    for (let i = 0; i < 6; i++) {
      const k = ramp(t, 6.52 + i * 0.03, 7.0, E.out);
      if (k > 0) at(x, 600 + i * 40 + k * (200 + i * 60), 700 - k * (300 + i * 50), k * (90 + i * 50), 1, 1, () => alpha(x, 1 - k * 0.3, () => rect(x, -24, -32, 48, 64, "#f8f7f2", 3)));
    }
  });
  layer(x, {}, (x) => speedLines(x, t, 30, ramp(t, 6.5, 6.6) * (1 - ramp(t, 6.75, 7.0)), "#ffffff", -2400));
};

// ── S4 · over the rooftops ─────────────────────────────────────────────────────────────────────────────────────
const rooftops = (x, pos) => {
  for (let i = 0; i < 26; i++) {
    const bx = i * 260 + rnd(i, 61) * 60 - 200;
    const top = 760 + rnd(i, 62) * 120;
    const bw = 200 + rnd(i, 63) * 60;
    rect(x, bx, top, bw, 600, i % 2 ? "#3e4656" : "#353c4b");
    rect(x, bx - 6, top - 12, bw + 12, 14, "#4b5466");
    const kind = Math.floor(rnd(i, 64) * 4);
    if (kind === 0) {
      // water tank
      rect(x, bx + 60, top - 130, 80, 90, "#6b5546", 10);
      path(x, `M ${bx + 56} ${top - 130} L ${bx + 100} ${top - 170} L ${bx + 144} ${top - 130} Z`, "#5a463a");
      line(x, bx + 70, top - 40, bx + 64, top, 6, "#2f3542");
      line(x, bx + 130, top - 40, bx + 136, top, 6, "#2f3542");
    } else if (kind === 1) {
      rect(x, bx + 40, top - 60, 90, 60, "#8d97a8", 6);
      rect(x, bx + 52, top - 50, 66, 8, "#6d7686");
      rect(x, bx + 52, top - 34, 66, 8, "#6d7686");
    } else if (kind === 2) {
      line(x, bx + 120, top, bx + 120, top - 180, 5, "#2b303b");
      line(x, bx + 90, top - 150, bx + 150, top - 150, 4, "#2b303b");
      line(x, bx + 98, top - 120, bx + 142, top - 120, 4, "#2b303b");
    } else rect(x, bx + 30, top - 80, 40, 80, "#5d4d45");
  }
};
const pigeon = (x, px, py, s, turn, wide, t) =>
  at(x, px, py, 0, s, s, () => {
    ellipse(x, 0, 0, 46, 30, "#8f97a6");
    ellipse(x, -10, 6, 34, 20, "#7d8595");
    path(x, "M -40 -4 L -78 -14 L -74 10 Z", "#6c7383");
    ellipse(x, -6, -2, 26, 16, "#9aa2b2");
    line(x, -6, 26, -10, 46, 4, "#d9725b");
    line(x, 10, 26, 12, 46, 4, "#d9725b");
    // head: turns to look back over its shoulder (turn 0 → 1)
    const hx = lerp(40, -20, turn);
    at(x, hx, -34, 0, 1, 1, () => {
      ellipse(x, 0, 10, 16, 20, "#7b6f97");
      circle(x, 0, -6, 20, "#9aa2b2");
      const dir = turn > 0.5 ? -1 : 1;
      path(x, `M ${dir * 16} -6 L ${dir * 34} -2 L ${dir * 16} 2 Z`, "#e0a34a");
      circle(x, dir * 6, -10, wide ? 8 : 5, "#ffffff");
      circle(x, dir * 7.5, -10, wide ? 4 : 3, "#111111");
    });
  });
const flyingHero = (x, hx, hy, t, o = {}) =>
  hero(x, {
    x: hx,
    y: hy,
    s: o.s ?? 0.5,
    rot: 90,
    rim: { color: "#fff0d0", width: 3, dx: -3, dy: -3 },
    pose: { armR: [176, 4], armL: [-10, 6], legL: [-3, 4], legR: [5, 6], lean: 0, tilt: 0 },
    face: { eyes: "happy", mouth: "grin", look: 0.15, up: 0.6 },
    flutter: t,
    ...o,
  });
const roofsShot = (x, t) => {
  const pos = track(t, [[S.roofs, 0], [8.4, 1960, E.linear], [8.95, 2260, E.out], [S.map, 2420, E.linear]]);
  const bob = Math.sin(t * 5) * 10;
  layer(x, {}, (x) => {
    x.fillStyle = linGrad(x, 0, 0, 0, 1080, [[0, "#6fa7dc"], [0.6, "#b9d6ea"], [1, "#f7d7b3"]]);
    x.fillRect(0, 0, W, H);
    glow(x, 1500, 760, 420, "#fff2cf", 0.7);
    for (let i = 0; i < 6; i++) {
      const cx = ((i * 520 - pos * 0.05) % 2600 + 2600) % 2600 - 300;
      alpha(x, 0.7, () => {
        ellipse(x, cx, 220 + i * 37 % 140, 160, 34, "#ffffff");
        ellipse(x, cx + 70, 205 + i * 37 % 140, 90, 30, "#ffffff");
      });
    }
    at(x, -((pos * 0.15) % 1100), 0, 0, 1, 1, () => {
      skyline(x, 980, 70, "#a9bfd6", 40, 160, 420, -300, 100);
    });
    at(x, -((pos * 0.45) % 1300), 0, 0, 1, 1, () => skyline(x, 1020, 80, "#7f93ad", 34, 120, 330, -300, 130));
  });
  layer(x, { cam: { cx: 960 + pos, cy: 540, s: 1 } }, (x) => {
    rooftops(x, pos);
    // the pigeon on its antenna
    const turn = ramp(t, 9.02, 9.32, E.out) * (1 - ramp(t, 9.5, 9.62, E.inOut)) + ramp(t, 9.7, 9.85, E.out);
    const px = 2260 + 860;
    line(x, px + 10, 640, px + 10, 1000, 6, "#2b303b");
    line(x, px - 60, 640, px + 80, 640, 5, "#2b303b");
    pigeon(x, px, 600, 1.15, clamp(turn), t > 9.1, t);
    const q = ramp(t, 9.85, 10.0, E.out);
    if (q > 0) at(x, px + 20, 470 - q * 20, 0, q, q, () => text(x, "?", 0, 0, { size: 90, fill: "#fff6dd", align: "center", glow: ["#000000", 2, 8, 0.4] }));
    // a feather drifting down
    const fk = ramp(t, 9.1, 10.42, E.linear);
    if (fk > 0) at(x, px - 20 - fk * 60 + Math.sin(fk * 9) * 14, 600 + fk * 220, Math.sin(fk * 7) * 40, 1, 1, () => ellipse(x, 0, 0, 16, 5, "#c9cfda"));
  });
  layer(x, {}, (x) => {
    const hx = 700 + Math.max(0, t - 8.4) ** 1.6 * 1500;
    if (hx < 2300) flyingHero(x, hx, 480 + bob, t, { s: 0.6 });
    speedLines(x, t, 34, 1 - ramp(t, 8.4, 8.9), "#ffffff", 2600);
  });
};

// ── S5 · the map ───────────────────────────────────────────────────────────────────────────────────────────────
const mapShot = (x, t) => {
  const u = t - S.map;
  const HOME = [470, 720];
  const WORK = [1460, 360];
  layer(x, { cam: { cx: 960, cy: 540, s: 1 + 0.03 * ramp(u, 0, 2.5), rot: 0 } }, (x) => {
    rect(x, -200, -200, 2320, 1480, "#141c28");
    at(x, 960, 540, -8, 1, 1, () => {
      x.translate(-960, -540);
      for (let i = -2; i < 18; i++)
        for (let j = -2; j < 11; j++) {
          const k = rnd(i * 31 + j, 5);
          rect(x, i * 130 + 14, j * 120 + 14, 102, 92, k > 0.86 ? "#1d4434" : "#1e2a3b", 6);
        }
    });
    alpha(x, 0.9, () => path(x, "M -200 470 C 300 420 700 640 1100 560 S 1800 420 2200 520 L 2200 640 C 1800 540 1400 690 1100 680 S 300 560 -200 600 Z", "#1c4a6e"));
    // the car route: around, around, and stuck
    const route = [HOME, [470, 900], [900, 900], [900, 760], [1240, 760], [1240, 920], [1660, 920], [1660, 600], [1460, 600], [1460, 360]];
    x.save();
    x.setLineDash([16, 14]);
    poly(x, route, 7, rgba("#e05a52", 0.85));
    x.restore();
    const ck = 0.12 * ramp(u, 0, 2.5, E.linear);
    at(x, 470 + 0, 720 + ck * 1500, 90, 0.6, 0.6, () => topCar(x, 0, 0, 90, "#e9e6df", 1));
    // the flight line, drawn over the timer run
    const dk = ramp(t, 10.6, 11.45, E.inOut);
    const pts = [];
    for (let i = 0; i <= 40; i++) {
      const v = (i / 40) * dk;
      pts.push([lerp(HOME[0], WORK[0], v), lerp(HOME[1], WORK[1], v) - Math.sin(v * Math.PI) * 180]);
    }
    if (pts.length > 1) {
      x.save();
      x.shadowColor = "#ff8a6a";
      x.shadowBlur = 18;
      x.setLineDash([2, 16]);
      poly(x, pts, 9, "#ffd8b0");
      x.restore();
      const p = pts[pts.length - 1];
      circle(x, p[0], p[1], 14, "#d23b45");
      circle(x, p[0], p[1], 7, "#ffe9d6");
    }
    const pin = (p, label, k, color) =>
      alpha(x, clamp(k * 2), () =>
        at(x, p[0], p[1] - (1 - E.out(clamp(k))) * 40, 0, 1, 1, () => {
          path(x, "M 0 0 C -28 -40 -34 -54 -34 -70 A 34 34 0 1 1 34 -70 C 34 -54 28 -40 0 0 Z", color);
          circle(x, 0, -70, 13, "#ffffff");
          text(x, label, 0, -122, { size: 26, fill: "#f6efe2", align: "center", track: 0.08 });
        }),
      );
    pin(HOME, "HOME", ramp(u, 0.0, 0.25), "#d23b45");
    pin(WORK, "OFFICE", ramp(u, 0.12, 0.37), "#2f9c94");
  });
  layer(x, {}, (x) => {
    const secs = Math.round(90 * ramp(t, 10.6, 11.42, E.linear));
    const str = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}`;
    alpha(x, ramp(u, 0, 0.15), () => {
      rect(x, 760, 120, 400, 120, rgba("#0b0f16", 0.8), 26);
      text(x, str, 960, 212, { size: 96, fill: secs >= 90 ? "#ffd27a" : "#f6efe2", align: "center", glow: secs >= 90 ? ["#ff9a3c", 3, 12, 0.8] : undefined });
    });
    pill(x, "WINDOW → DESK", 960, 950, ramp(t, 11.8, 12.1), { accent: "#d23b45", size: 40 });
  });
};

// ── S6 · "Did you just come in through the window?" ─────────────────────────────────────────────────────────────
const paper = (x, px, py, rot) => at(x, px, py, rot, 1, 1, () => rect(x, -26, -34, 52, 68, "#f8f7f2", 3));
const coworkShot = (x, t) => {
  const u = t - S.cowork;
  const talking = t > 13.28 && t < 15.0;
  const mouth = talking ? (Math.floor(t * 9) % 3 === 0 ? "flat" : "o") : "o";
  const shrug = ramp(t, 14.95, 15.2, E.out);
  layer(x, { blur: 5, cam: { cx: 980, cy: 540, s: 1.0 } }, (x) => officeBack(x));
  layer(x, { cam: { cx: 960, cy: 540, s: 1.0 + 0.02 * ramp(u, 0, 2.6) } }, (x) => {
    // the open window (left), curtains still swinging
    x.fillStyle = linGrad(x, 0, 160, 0, 760, [[0, "#9cc6ea"], [1, "#f6d3ac"]]);
    x.fillRect(80, 160, 420, 600);
    skyline(x, 760, 90, "#8ea4c0", 6, 120, 300, 80, 74);
    rect(x, 60, 140, 460, 20, "#f4f5f6");
    rect(x, 60, 760, 460, 22, "#f4f5f6");
    rect(x, 60, 140, 20, 640, "#f4f5f6");
    rect(x, 500, 140, 20, 640, "#f4f5f6");
    alpha(x, 0.9, () => path(x, "M 80 160 L -40 120 L -40 820 L 80 780 Z", "#eef1f4"));
    curtain(x, 520, 1, t, 0.5 + 0.3 * Math.sin(t * 2));
    for (let i = 0; i < 5; i++) {
      const k = ((t - S.cowork) * 0.32 + i * 0.21) % 1;
      paper(x, 300 + i * 150 + Math.sin(k * 8 + i) * 60, 140 + k * 820, Math.sin(k * 6 + i) * 70);
    }
    // coworker with her coffee
    coworker(x, {
      x: 820,
      y: 960,
      s: 0.8,
      rim: COOL,
      pose: { armR: [24, 138], armL: [-8, 10], tilt: -6 },
      holdR: { kind: "custom", draw: (x, sil, g) => rect(x, -18 - g, -40 - g, 36 + 2 * g, 44 + 2 * g, sil ? sil.color : "#f2efe8", 8 + g) },
      face: { eyes: "wide", mouth, look: 0.6, brows: true },
    });
    const bub = ramp(t, 13.3, 13.5, E.out) * (1 - ramp(t, 15.1, 15.3));
    if (bub > 0) at(x, 900, 360, 0, bub, bub, () => text(x, "?!", 0, 0, { size: 80, fill: "#ffe08a", align: "center", glow: ["#000000", 2, 8, 0.35] }));
    // the hero at his desk: a shrug
    rect(x, 1360, 560, 150, 210, "#2b2f37", 26);
    rect(x, 1425, 770, 20, 120, "#2b2f37");
    const j = joints(-6, 0);
    const pose = { lean: -6, legL: [78, 88], legR: [86, 96] };
    pose.armL = armIK(lerp(-60, -150, shrug), lerp(150, -10, shrug), 1);
    pose.armR = armIK(lerp(60, 150, shrug), lerp(150, -10, shrug), -1);
    hero(x, { x: 1360, y: 980, s: 0.86, rim: COOL, pose, face: { eyes: "smug", mouth: "smirk", look: -0.35, up: 0.1 } });
    deskFront(x, 1290, 760, t, false);
  });
};

// ── S7 · title ──────────────────────────────────────────────────────────────────────────────────────────────────
const titleShot = (x, t) => {
  const u = t - S.title;
  const hit = 15.95;
  const l1 = ramp(t, S.title + 0.05, S.title + 0.32, E.out);
  const l2 = ramp(t, hit, hit + 0.28, E.inOut);
  const flash = t < hit ? 0 : Math.exp(-(t - hit) / 0.22);
  const out = 1 - ramp(t, 18.25, 18.58);
  const push = 1 + 0.035 * ramp(u, 0, 3, E.linear);
  layer(x, {}, (x) => {
    x.fillStyle = radGrad(x, 960, 560, 1250, [[0, "#22304d"], [1, "#05080d"]]);
    x.fillRect(0, 0, W, H);
    for (let i = 0; i < 9; i++) {
      const cx = ((i * 330 + t * (30 + i * 6)) % 2400) - 240;
      alpha(x, 0.06 + 0.04 * rnd(i, 3), () => {
        ellipse(x, cx, 760 + rnd(i, 4) * 220, 220, 40, "#cfd9ee");
        ellipse(x, cx + 90, 744 + rnd(i, 4) * 220, 120, 34, "#cfd9ee");
      });
    }
    glow(x, 960, 500, 560, "#e8a868", 0.12 * out);
    glow(x, 960, 480, 900, "#fff1d6", 0.55 * flash);
    if (t > hit)
      for (let i = 0; i < 18; i++) {
        const a = rnd(i, 2) * Math.PI * 2;
        const d = (t - hit) * (120 + rnd(i, 3) * 420);
        alpha(x, 0.8 * Math.exp(-(t - hit) / 0.7), () => circle(x, 960 + Math.cos(a) * (240 + d), 480 + Math.sin(a) * (140 + d * 0.6), 1.6 + rnd(i, 4) * 1.8, "#ffe7b8"));
      }
    // wind streaks curling past the words
    for (let i = 0; i < 7; i++) {
      const k = ((t * 0.45 + i / 7) % 1);
      alpha(x, 0.18 * Math.sin(k * Math.PI) * out, () => path(x, `M ${-200 + k * 2400} ${300 + i * 80} q 120 -40 240 0 t 240 0`, null, "#dfe8ff", 3));
    }
  });
  layer(x, { opacity: out }, (x) =>
    at(x, 960, 500, 0, push, push, () => {
      x.translate(-960, -500);
      alpha(x, l1, () => text(x, "WHAT IF YOU COULD", 960, 420, { size: 84, track: 0.085, fill: "#fdf2e3", align: "center", glow: ["#ff9a3c", 3, 12, 0.85] }));
      if (t >= hit) {
        const letters = ["F", "L", "Y", "?"];
        x.font = '800 230px "Open Sans"';
        x.letterSpacing = "6px";
        const widths = letters.map((c) => x.measureText(c).width + 6);
        const total = widths.reduce((a, b) => a + b, 0);
        let lx = 960 - total / 2;
        letters.forEach((c, i) => {
          const hover = Math.sin(t * 2.4 + i * 0.9) * 10 * ramp(t, hit + 0.3, hit + 0.8);
          const lift = (1 - E.out(ramp(t, hit + i * 0.04, hit + 0.3 + i * 0.04))) * 60;
          const cx = lx + widths[i] / 2;
          lx += widths[i];
          alpha(x, 0.4 + 0.6 * l2, () => {
            const g = linGrad(x, 0, 640 - 175, 0, 640 + 10, [[0, "#ffe3a1"], [1, "#f3b552"]]);
            text(x, c, cx, 640 + hover + lift, { size: 230, fill: g, align: "center", stroke: "#3e2410", strokeWidth: 8, glow: ["#ff8a24", 6, 22, 0.95] });
            alpha(x, 0.7 * (1 - l2), () => text(x, c, cx, 640 + hover + lift, { size: 230, fill: "#4a2c14", align: "center" }));
          });
        });
      }
    }),
  );
};

// ── S8 · the climb ─────────────────────────────────────────────────────────────────────────────────────────────
// world y grows downward as usual; the stages stack upward: ground 0, skydivers −2600, airliner −5200, clouds −6700,
// the hero −7700. The altimeter (screen space) reads the stage the camera is passing.
const STAGE = { ground: 540, sky: -2400, jet: -5000, cloud: -6700, top: -7700 };
const climbCam = (t) => {
  const cy = track(t, [[S.climb, 520], [21.92, 520, E.linear], [22.55, STAGE.sky, E.inOut], [24.58, STAGE.sky - 60, E.linear], [25.15, STAGE.jet, E.inOut], [26.72, STAGE.jet - 50, E.linear], [27.95, STAGE.top, E.inOut], [S.frost, STAGE.top - 40, E.linear]]);
  const s = track(t, [[S.climb, 1.0], [21.92, 1.05, E.linear], [22.55, 0.9, E.inOut], [24.58, 0.95, E.linear], [25.15, 0.9, E.inOut], [26.72, 0.95, E.linear], [27.95, 1.0, E.inOut], [S.frost, 1.06, E.linear]]);
  return { cx: 960, cy, s };
};
const skyAt = (cy) => {
  const k = clamp((520 - cy) / 8300);
  const stops = [["#8fc4ef", "#d9ecf8"], ["#5d93d6", "#a9cff0"], ["#2f5fae", "#6f9ddb"], ["#1a2f66", "#3f6cb0"], ["#0f1a3e", "#2a4f93"]];
  const i = Math.min(3, Math.floor(k * 4));
  const f = k * 4 - i;
  const mix = (a, b) => {
    const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
    const ch = (s) => Math.round(lerp((pa >> s) & 255, (pb >> s) & 255, f));
    return `rgb(${ch(16)},${ch(8)},${ch(0)})`;
  };
  return [mix(stops[i][0], stops[i + 1][0]), mix(stops[i][1], stops[i + 1][1])];
};
const cloud = (x, cx, cy, s, a = 1, color = "#ffffff") =>
  alpha(x, a, () =>
    at(x, cx, cy, 0, s, s, () => {
      ellipse(x, 0, 0, 220, 60, color);
      circle(x, -90, -30, 70, color);
      circle(x, 0, -60, 95, color);
      circle(x, 100, -34, 72, color);
      alpha(x, 0.18, () => ellipse(x, 0, 30, 210, 22, "#9fb2cf"));
    }),
  );
const smallPlane = (x, cx, cy, s) =>
  at(x, cx, cy, 0, s, s, () => {
    path(x, "M -180 0 Q -170 -40 -60 -44 L 150 -40 Q 200 -30 210 0 Q 200 22 150 26 L -150 26 Q -184 20 -180 0 Z", "#f1f2f4");
    path(x, "M -170 -10 L -230 -90 L -190 -92 L -120 -30 Z", "#d23b45");
    rect(x, -40, -14, 260, 16, "#c7ccd4", 6);
    rect(x, 40, -30, 70, 40, "#2a2f38", 6);
    for (let i = 0; i < 4; i++) rect(x, -100 + i * 40, -30, 24, 18, "#5d7fa6", 4);
    rect(x, 196, -50, 8, 100, "#3a3f49", 3);
  });
const airliner = (x, cx, cy, s, t) =>
  at(x, cx, cy, 0, s, s, () => {
    // contrail
    for (let i = 0; i < 4; i++) alpha(x, 0.35 - i * 0.07, () => rect(x, 600 + i * 300, -18 + i * 3, 320, 14 + i * 6, "#ffffff", 8));
    path(x, "M -560 0 Q -540 -70 -420 -76 L 420 -76 Q 520 -70 560 -20 L 600 -14 Q 610 10 560 24 L -470 28 Q -560 24 -560 0 Z", "#f4f5f7");
    path(x, "M 420 -76 L 540 -230 L 600 -230 L 560 -40 Z", "#d23b45");
    path(x, "M -60 0 L 140 120 L 220 120 L 90 0 Z", "#cfd4dc");
    path(x, "M -60 -30 L 120 -150 L 180 -150 L 80 -30 Z", "#e0e4ea");
    ellipse(x, 60, 70, 90, 30, "#aeb5c0");
    rect(x, -520, -50, 30, 26, "#2a2f38", 8);
    for (let i = 0; i < 26; i++) rect(x, -440 + i * 34, -44, 16, 18, "#5d7fa6", 6);
    rect(x, -560, 6, 1120, 10, "#dfe3ea");
  });
const skydiver = (x, sx, sy, s, t, seed) =>
  figure(x, {
    x: sx,
    y: sy,
    s,
    tone: "crowd",
    color: "#2f293a",
    rot: 90 + Math.sin(t * 3 + seed) * 8,
    rim: { color: "#ffffff", width: 3, dx: 0, dy: -3 },
    pose: { armL: [-120, 40], armR: [120, -40], legL: [-30, 70], legR: [30, 70] },
  });
const athlete = (x, t) => {
  // run-up, take-off, a flop over the bar (hips just clearing it), the landing on the mat
  const HIPUP = 290 * 0.6; // hip height above the feet at this scale; rotation is about the hip
  const barY = 880 - 522;
  const run = ramp(t, 18.58, 19.25, E.linear);
  const air = ramp(t, 19.25, 19.92, E.linear);
  const land = ramp(t, 19.92, 20.2, E.out);
  let hx, hy, rot = 0, pose;
  if (air <= 0) {
    hx = lerp(240, 720, run);
    hy = 880 - HIPUP;
    pose = { ...walk(t * 18, 1.5), lean: 8 };
  } else if (land <= 0) {
    hx = lerp(720, 1240, air);
    hy = lerp(880 - HIPUP, 790, air) - Math.sin(air * Math.PI) * (lerp(880 - HIPUP, 790, 0.5) - (barY - 34));
    rot = lerp(0, 100, E.inOut(air));
    pose = { armL: [-40, 20], armR: [40, -20], legL: [-12, 40], legR: [12, 50], lean: -6 };
  } else {
    hx = 1240 + land * 30;
    hy = 790;
    rot = 100 - 8 * land;
    pose = { armL: [-150, 10], armR: [150, -10], legL: [-10, 20], legR: [14, 30] };
  }
  figure(x, { x: hx, y: hy + HIPUP, s: 0.6, tone: "crowd", color: "#2f293a", rot, rim: { color: "#ffffff", width: 3, dx: -2, dy: -3 }, pose });
};
const climbShot = (x, t) => {
  const cam = climbCam(t);
  const [top, bottom] = skyAt(cam.cy);
  layer(x, {}, (x) => {
    x.fillStyle = linGrad(x, 0, 0, 0, 1080, [[0, top], [1, bottom]]);
    x.fillRect(0, 0, W, H);
    if (cam.cy < STAGE.cloud) glow(x, 1500, 300, 700, "#fff3d6", 0.45 * ramp(-cam.cy, -STAGE.cloud, -STAGE.top));
  });
  layer(x, { cam }, (x) => {
    // ground stage: stadium, track, mat, the bar at 2.45 m (≈ 522 px above the ground at this scale)
    rect(x, -800, 600, 3520, 120, "#6f7c94");
    for (let i = 0; i < 40; i++) rect(x, -800 + i * 90, 600 + (i % 2) * 8, 70, 40, i % 3 ? "#8a97ae" : "#7a88a0");
    rect(x, -800, 720, 3520, 160, "#4f8f4a");
    rect(x, -800, 880, 3520, 400, "#c4553e");
    for (let i = 0; i < 6; i++) rect(x, -800, 900 + i * 30, 3520, 3, "#e9d6cc");
    rect(x, 1080, 820, 440, 60, "#2f5fae", 8);
    rect(x, 1080, 820, 440, 12, "#4f7fd0", 6);
    const barY = 880 - 522;
    rect(x, 880, barY - 6, 14, 880 - barY + 6, "#d9dde4");
    rect(x, 1290, barY - 6, 14, 880 - barY + 6, "#d9dde4");
    const flash = ramp(t, 20.27, 20.4) * (1 - ramp(t, 20.6, 21.2));
    if (flash > 0) glow(x, 1095, barY, 260, "#ffe9a8", 0.6 * flash);
    rect(x, 886, barY - 4, 412, 8, flash > 0.05 ? "#ffe9a8" : "#f2c94c", 3);
    athlete(x, t);
    // a measuring tape up the left of the stage
    rect(x, 600, barY - 120, 22, 880 - barY + 120, "#efe2b8");
    for (let m = 0; m <= 30; m++) {
      const y = 880 - m * 21.3;
      if (y > barY - 120) line(x, 600, y, m % 10 === 0 ? 622 : m % 5 === 0 ? 616 : 610, y, m % 5 ? 1.4 : 2, "#6d6247", "butt");
    }
    // skydive stage: a small plane, two jumpers in free fall
    const sk = ramp(t, 22.3, 24.6, E.linear);
    smallPlane(x, lerp(640, 1260, sk), STAGE.sky - 160, 0.9);
    if (t > 22.5) {
      skydiver(x, lerp(820, 980, sk), STAGE.sky + 40 + sk * 260, 0.32, t, 1);
      skydiver(x, lerp(900, 1100, sk), STAGE.sky + 120 + sk * 300, 0.3, t, 2);
    }
    cloud(x, 380, STAGE.sky + 420, 0.9, 0.85);
    cloud(x, 1560, STAGE.sky + 360, 1.1, 0.8);
    // airliner stage
    airliner(x, lerp(1700, 260, ramp(t, 24.75, 26.8, E.linear)), STAGE.jet + 20, 0.62, t);
    cloud(x, 300, STAGE.jet + 420, 1.2, 0.6);
    cloud(x, 1500, STAGE.jet + 480, 1.0, 0.6);
    // the cloud deck — the camera climbs straight through it
    for (let i = 0; i < 18; i++) cloud(x, -200 + i * 140 + rnd(i, 3) * 60, STAGE.cloud + rnd(i, 4) * 300, 1.2 + rnd(i, 5) * 0.8, 0.95);
    for (let i = 0; i < 10; i++) cloud(x, -300 + i * 260, STAGE.top + 420 + rnd(i, 6) * 60, 1.5, 1, "#f4f8ff");
    // the top: the hero, sitting on nothing, lunch in hand
    sittingHero(x, t, 960, STAGE.top + 260, 0.6);
  });
  layer(x, {}, (x) => {
    speedLines(x, t, 36, ramp(t, 21.95, 22.1) * (1 - ramp(t, 22.4, 22.6)) + ramp(t, 24.6, 24.7) * (1 - ramp(t, 25.0, 25.2)) + ramp(t, 26.75, 26.9) * (1 - ramp(t, 27.7, 27.95)), "#ffffff", -2200);
    // a white-out as we break through the cloud deck
    const wo = ramp(t, 27.15, 27.35) * (1 - ramp(t, 27.45, 27.75));
    if (wo > 0) alpha(x, wo * 0.85, () => rect(x, 0, 0, W, H, "#f4f8ff"));
    // labels: the record, the jump height, the cruise height
    const lab = (str, sub, k) =>
      alpha(x, clamp(k * 1.5), () =>
        at(x, 1500, 420 + (1 - E.out(clamp(k))) * 30, 0, 1, 1, () => {
          text(x, str, 0, 0, { size: 96, fill: "#fff7e8", align: "center", glow: ["#ffcf80", 3, 12, 0.7] });
          text(x, sub, 0, 54, { size: 26, track: 0.12, fill: "#fff2d8", align: "center" });
        }),
      );
    lab("2.45 m", "HIGH JUMP WORLD RECORD", ramp(t, 20.27, 20.5) * (1 - ramp(t, 21.85, 21.95)));
    lab("4 km", "SKYDIVERS JUMP", ramp(t, 23.6, 23.85) * (1 - ramp(t, 24.5, 24.6)));
    lab("11 km", "AIRLINERS CRUISE", ramp(t, 26.22, 26.45) * (1 - ramp(t, 26.68, 26.76)));
    altimeter(x, t, cam);
  });
};
const altimeter = (x, t, cam) => {
  // screen-space gauge, left edge: the scale scrolls with the climb; the readout says the stage
  const k = clamp((520 - cam.cy) / 8220);
  alpha(x, ramp(t, S.climb + 0.2, S.climb + 0.6) * (1 - ramp(t, 28.4, 28.9)), () => {
    rect(x, 70, 150, 16, 780, rgba("#0b0f16", 0.45), 8);
    for (let i = -6; i < 30; i++) {
      const y = 540 + ((i * 60 + k * 3000) % 1800) - 900;
      if (y > 150 && y < 930) line(x, 86, y, i % 5 ? 104 : 118, y, 2, "#f6efe2", "butt");
    }
    rect(x, 60, 532, 70, 16, "#d23b45", 6);
  });
};
const sandwich = (x, sil, g) => {
  const c = (v) => (sil ? sil.color : v);
  path(x, "M -6 -10 L 74 -50 L 70 8 Z", c("#e9d2a1"), sil ? sil.color : null, 2 * g);
  if (!sil) {
    path(x, "M -2 -4 L 70 -38 L 72 -30 L 0 2 Z", "#6aa84f");
    path(x, "M 0 0 L 70 -28 L 70 -20 L 2 6 Z", "#d9534f");
    path(x, "M -6 -10 L 74 -50 L 72 -46 L -2 -8 Z", "#c99a5a");
  }
};
const sittingHero = (x, t, sx, sy, s, o = {}) => {
  const bite = ramp(t, 28.82, 29.0, E.out) * (1 - ramp(t, 29.05, 29.3, E.inOut));
  const j = joints(0, 40);
  const handTo = [lerp(70, j.head[0] + 70, bite), lerp(-250, j.head[1] + 50, bite)];
  hero(x, {
    x: sx,
    y: sy,
    s,
    rim: { color: "#fff0d0", width: 3, dx: 3, dy: -3, glow: 1 },
    pose: { bob: 40, lean: 0, legL: [62, 150], legR: [-62, -150], armR: armIK(handTo[0] - j.shR[0], handTo[1] - j.shR[1], -1), armL: [-20, 40] },
    face: { eyes: o.eyes ?? "happy", mouth: o.mouth ?? (bite > 0.5 ? "o" : "smile"), look: o.look ?? 0.3, up: o.up ?? 0, brows: o.brows ?? true },
    holdR: { kind: "custom", draw: sandwich },
    flutter: o.flutter,
    ...o.extra,
  });
};

// ── S9 · frost ─────────────────────────────────────────────────────────────────────────────────────────────────
const thermometer = (x, px, py, k) =>
  at(x, px, py, 0, 1, 1, () => {
    rect(x, -26, -300, 52, 330, rgba("#0b0f16", 0.6), 26);
    rect(x, -12, -280, 24, 290, "#e9eef5", 12);
    circle(x, 0, 20, 34, "#e9eef5");
    const lv = lerp(-80, -260, 1 - k);
    rect(x, -7, lv, 14, 20 - lv, "#4fa3ff", 7);
    circle(x, 0, 20, 26, "#4fa3ff");
  });
const frostShot = (x, t) => {
  const u = t - S.frost;
  const fr = ramp(t, 29.4, 31.2, E.out);
  const shiver = t > 30.1 ? Math.sin(t * 70) * 4 * ramp(t, 30.1, 30.4) : 0;
  layer(x, {}, (x) => {
    x.fillStyle = linGrad(x, 0, 0, 0, 1080, [[0, "#0f1a3e"], [1, "#2d58a0"]]);
    x.fillRect(0, 0, W, H);
    glow(x, 1600, 220, 600, "#fff3d6", 0.4);
    for (let i = 0; i < 8; i++) cloud(x, -200 + i * 320, 1030 + rnd(i, 9) * 40, 1.6, 1, "#f1f6ff");
  });
  layer(x, { cam: { cx: 960 + shiver, cy: 540, s: 1.0 + 0.04 * ramp(u, 0, 2.5) } }, (x) => {
    sittingHero(x, t, 900, 1150, 1.3, { eyes: t > 30.0 ? "closed" : "dot", mouth: t > 30.1 ? "chatter" : "flat", look: 0.25, brows: t > 30.0 ? "worried" : true });
    // frost creeping over the hoodie and the quiff
    for (let i = 0; i < 26; i++) {
      const a = rnd(i, 41);
      const k = clamp(fr * 1.6 - a * 0.7);
      if (k <= 0) continue;
      const px = 700 + rnd(i, 42) * 420;
      const py = 330 + rnd(i, 43) * 520;
      alpha(x, 0.85 * k, () =>
        at(x, px, py, rnd(i, 44) * 360, k, k, () => {
          for (let r = 0; r < 6; r++) at(x, 0, 0, r * 60, 1, 1, () => {
            line(x, 0, 0, 0, -22, 3, "#eaf6ff");
            line(x, 0, -12, 7, -18, 2, "#eaf6ff");
            line(x, 0, -12, -7, -18, 2, "#eaf6ff");
          });
        }),
      );
    }
    // breath
    for (let b = 0; b < 3; b++) {
      const k = ((t - 29.4 + b * 0.6) % 1.8) / 1.8;
      if (t > 29.4) alpha(x, 0.55 * Math.sin(k * Math.PI), () => {
        circle(x, 1130 + k * 180, 520 - k * 80, 20 + k * 50, "#f2f7ff");
        circle(x, 1170 + k * 200, 500 - k * 90, 14 + k * 40, "#f2f7ff");
      });
    }
  });
  layer(x, {}, (x) => {
    const k = ramp(t, 29.6, 30.5, E.inOut);
    alpha(x, ramp(u, 0.1, 0.35), () => thermometer(x, 1620, 640, 1 - k));
    alpha(x, ramp(t, 30.32, 30.55), () => text(x, "−55 °C", 1620, 760, { size: 74, fill: "#e6f3ff", align: "center", glow: ["#4fa3ff", 3, 14, 0.8] }));
    // frost vignette
    alpha(x, 0.35 * fr, () => {
      const g = radGrad(x, 960, 540, 1100, [[0.55, "rgba(230,245,255,0)"], [1, "rgba(230,245,255,0.9)"]]);
      x.fillStyle = g;
      x.fillRect(0, 0, W, H);
    });
  });
};

// ── S10 · he looks down ────────────────────────────────────────────────────────────────────────────────────────
const downShot = (x, t) => {
  const u = t - S.down;
  const s = lerp(1.0, 0.62, E.inOut(ramp(u, 0.0, 2.1)));
  const sway = Math.sin(t * 1.6) * 8;
  layer(x, {}, (x) => {
    x.fillStyle = linGrad(x, 0, 0, 0, 1080, [[0, "#0f1a3e"], [1, "#3a6ab4"]]);
    x.fillRect(0, 0, W, H);
    glow(x, 1600 - u * 20, 220, 600, "#fff3d6", 0.4);
    speedLines(x, t, 14, 0.35, "#dfe8ff", 260);
  });
  layer(x, { cam: { cx: 960, cy: 600, s } }, (x) => {
    for (let i = 0; i < 16; i++) cloud(x, -900 + i * 260 - u * 70 * (0.6 + rnd(i, 21)), 980 + rnd(i, 19) * 90 + Math.sin(t * 0.8 + i) * 6, 1.4 + rnd(i, 20) * 0.6, 1, "#eef4ff");
    sittingHero(x, t, 960 + sway, 760 + Math.sin(t * 2.1) * 10, 0.62, { eyes: "dot", mouth: "flat", look: 0.1, up: -0.8, brows: "worried", extra: { flutter: t } });
  });
};

// ── S11 · everything else ──────────────────────────────────────────────────────────────────────────────────────
const planeInsert = (x, t) => {
  const u = t - S.plane;
  layer(x, { cam: { cx: 960, cy: 540, s: 1.0 + 0.06 * u } }, (x) => {
    rect(x, -200, -200, 2320, 1480, "#e9ebef");
    for (let i = 0; i < 3; i++) {
      const wx = 360 + i * 600;
      rect(x, wx - 150, 230, 300, 420, "#c9ced8", 140);
      x.fillStyle = linGrad(x, 0, 260, 0, 620, [[0, "#3f6cb0"], [1, "#9cc2ea"]]);
      x.beginPath();
      x.roundRect(wx - 120, 260, 240, 360, 116);
      x.fill();
      if (i === 1) {
        // the hero, out there, waving
        hero(x, { x: wx + 20, y: 560, s: 0.18, rot: 0, pose: { armR: [150 + Math.sin(t * 14) * 18, 10], armL: [-10, 6], bob: 30, legL: [62, 150], legR: [-62, -150] }, face: { eyes: "happy", mouth: "smile", look: -0.3 } });
      }
    }
    // the passenger, face to the glass
    figure(x, { x: 1060, y: 1420, s: 1.5, tone: "hero", hair: "bun", hood: false, outfit: { hoodie: "#e0a43a", dark: "#b8842c" }, face: { eyes: "wide", mouth: "o", look: -0.5, brows: true }, pose: { armL: [-150, -30], armR: [10, 10] } });
  });
};
const birdsInsert = (x, t) => {
  const u = t - S.birds;
  layer(x, {}, (x) => {
    x.fillStyle = linGrad(x, 0, 0, 0, 1080, [[0, "#173064"], [1, "#4a7cc4"]]);
    x.fillRect(0, 0, W, H);
    for (let i = 0; i < 6; i++) cloud(x, -100 + i * 400, 980, 1.6, 0.9, "#eef4ff");
    for (let i = 0; i < 22; i++) {
      const k = clamp(u / 0.68);
      const bx = 2100 - k * 1600 - (i % 6) * 70 - Math.floor(i / 6) * 40 + rnd(i, 3) * 60;
      const by = 260 + Math.floor(i / 6) * 90 + (i % 6) * 30 + Math.sin(t * 10 + i) * 6;
      const sz = 1.4 + k * 1.6;
      const flap = Math.sin(t * 24 + i) * 18;
      at(x, bx, by, 0, sz, sz, () => path(x, `M -30 ${flap} Q -14 -6 0 4 Q 14 -6 30 ${flap}`, null, "#141a28", 7));
    }
    flyingHero(x, 560, 640, t, { s: 0.36, face: { eyes: "wide", mouth: "o", look: 0.15, up: 0.6, brows: "worried" } });
  });
};
const radarInsert = (x, t) => {
  const u = t - S.radar;
  layer(x, {}, (x) => {
    rect(x, 0, 0, W, H, "#06120d");
    const cx = 960, cy = 560, r = 400;
    circle(x, cx, cy, r + 14, "#0f2a1f");
    circle(x, cx, cy, r, "#081a12");
    for (let i = 1; i <= 4; i++) {
      x.strokeStyle = "rgba(80,220,140,0.25)";
      x.lineWidth = 2;
      x.beginPath();
      x.arc(cx, cy, (r * i) / 4, 0, Math.PI * 2);
      x.stroke();
    }
    line(x, cx - r, cy, cx + r, cy, 2, "rgba(80,220,140,0.25)");
    line(x, cx, cy - r, cx, cy + r, 2, "rgba(80,220,140,0.25)");
    const a = (u * 2.4) % (Math.PI * 2) - Math.PI / 2;
    for (let i = 0; i < 24; i++) {
      const aa = a - i * 0.03;
      alpha(x, 0.5 * (1 - i / 24), () => line(x, cx, cy, cx + Math.cos(aa) * r, cy + Math.sin(aa) * r, 6, "#59f29a"));
    }
    const bx = cx + 190, by = cy - 150;
    const seen = ramp(u, 0.25, 0.35);
    const pulse = 0.5 + 0.5 * Math.sin(u * 9);
    if (seen > 0) {
      glow(x, bx, by, 60, "#ff4a3d", 0.6 * seen * (0.6 + 0.4 * pulse));
      circle(x, bx, by, 10, "#ff6a5d");
      x.strokeStyle = `rgba(255,90,80,${0.8 * (1 - ((u * 1.4) % 1))})`;
      x.lineWidth = 3;
      x.beginPath();
      x.arc(bx, by, 20 + ((u * 1.4) % 1) * 70, 0, Math.PI * 2);
      x.stroke();
    }
    alpha(x, ramp(u, 0.4, 0.6) * (u > 1.2 ? 0.55 + 0.45 * (Math.floor(u * 4) % 2) : 1), () => pill(x, "UNIDENTIFIED", bx + 10, by - 90, 1, { size: 30, fill: "#ffd7d2", accent: "#ff4a3d", bg: "#2a0b0b" }));
  });
};

// ── the edit ───────────────────────────────────────────────────────────────────────────────────────────────────
export const drawFly = (x, t, frame) => {
  x.setTransform(1, 0, 0, 1, 0, 0);
  x.fillStyle = "#000";
  x.fillRect(0, 0, W, H);
  if (t < S.office) gridlock(x, t);
  else if (t < S.bedroom) officeDesk(x, t);
  else if (t < S.roofs) bedroom(x, t);
  else if (t < S.map) roofsShot(x, t);
  else if (t < S.cowork) mapShot(x, t);
  else if (t < S.title) coworkShot(x, t);
  else if (t < S.climb) titleShot(x, t);
  else if (t < S.frost) climbShot(x, t);
  else if (t < S.down) frostShot(x, t);
  else if (t < S.plane) downShot(x, t);
  else if (t < S.birds) planeInsert(x, t);
  else if (t < S.radar) birdsInsert(x, t);
  else radarInsert(x, t);
  finish(x, frame, 0.55, 0.035);
  // fade out on the last beat
  const out = ramp(t, 37.0, 37.5);
  if (out > 0) alpha(x, out, () => rect(x, 0, 0, W, H, "#000"));
};
