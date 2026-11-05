// __SLUG__.js — the shots of "__TITLE__" (Stickman Explainer). Scaffolded by tools/new-video.mjs: a cold-open shot and
// the title card to build from. Each shot is a function (x, t) drawn with src/stickman/kit.js; draw() picks the shot
// from the shot table S. Replace S with the shot plan from projects/__SLUG__/PLAN.md: each shot starts on the first
// word of its line (projects/__SLUG__/words.json). The worked example with every device: src/examples/fly.js.
import { E, W, H, alpha, at, clamp, figure, finish, glow, layer, linGrad, ramp, rect, rgba, rnd, text, voidBg, wob, circle } from "../../stickman/kit.js";

export const FPS = 24;
export const SECONDS = __SECONDS__;
// the shot table (seconds): one spoken line = one shot
export const S = { open: 0, title: +Math.min(4.0, SECONDS * 0.5).toFixed(2) };

// the hero: give each video its own look (outfit colours, build: "muscular", hair: "quiff" | "bun", shoes)
const OUTFIT = { hoodie: "#2f6fe0", dark: "#2459bd", shade: "#1f4ea6", strings: "#e8eef8" };
const hero = (x, o) => figure(x, { tone: "hero", outfit: OUTFIT, ...o, face: { brows: true, ...(o.face || {}) } });
const WARM = { color: "#ffd9a6", width: 3.5, dx: 4, dy: -4 };

// a label pill: springs in on the word it echoes (cue a marimba tag on the same frame)
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

// ── S1 · the cold open (replace with the first line's picture) ──────────────────────────────────────────────────
const openShot = (x, t) => {
  const u = t - S.open;
  layer(x, { cam: { cx: 960, cy: 540, s: 1 + 0.02 * ramp(u, 0, 3, E.linear) } }, (x) => {
    voidBg(x, "#26324f", 960, 640);
    glow(x, 960, 820, 560, "#ffd9a6", 0.16);
    hero(x, { x: 960, y: 900, s: 0.9, rim: WARM, face: { eyes: "smug", mouth: "smirk", look: 0.2 * wob(t, 1) } });
  });
  layer(x, {}, (x) => pill(x, "A LABEL", 1320, 420, ramp(u, 0.6, 0.9), { accent: "#2f9c94" }));
};

// ── the title card: cream line + gold payoff word, a flash on the hit ───────────────────────────────────────────
const LINE1 = "__TITLE_LINE1__";
const PAYOFF = "__TITLE_PAYOFF__";
const titleShot = (x, t) => {
  const u = t - S.title;
  const hit = S.title + 0.45;
  const l1 = ramp(u, 0.05, 0.32, E.out);
  const l2 = ramp(t, hit, hit + 0.28, E.inOut);
  const flash = t < hit ? 0 : Math.exp(-(t - hit) / 0.22);
  const push = 1 + 0.06 * ramp(u, 0, 8, E.linear); // a slow push for the whole card: a held shot never freezes
  layer(x, {}, (x) => {
    voidBg(x, "#22304d", 960, 560);
    glow(x, 960, 500, 560, "#e8a868", 0.12);
    glow(x, 960, 480, 900, "#fff1d6", 0.55 * flash);
    if (t > hit)
      for (let i = 0; i < 18; i++) {
        const a = rnd(i, 2) * Math.PI * 2;
        const d = (t - hit) * (120 + rnd(i, 3) * 420);
        alpha(x, 0.8 * Math.exp(-(t - hit) / 0.7), () => circle(x, 960 + Math.cos(a) * (240 + d), 480 + Math.sin(a) * (140 + d * 0.6), 1.6 + rnd(i, 4) * 1.8, "#ffe7b8"));
      }
  });
  layer(x, {}, (x) =>
    at(x, 960, 500, 0, push, push, () => {
      x.translate(-960, -500);
      alpha(x, l1, () => text(x, LINE1, 960, 420, { size: 84, track: 0.085, fill: "#fdf2e3", align: "center", glow: ["#ff9a3c", 3, 12, 0.85] }));
      if (t >= hit) {
        const size = Math.min(230, 1500 / Math.max(1, PAYOFF.length * 0.62));
        const lift = (1 - E.out(ramp(t, hit, hit + 0.3))) * 60;
        const hover = Math.sin(t * 2.4) * 8 * ramp(t, hit + 0.3, hit + 0.8);
        alpha(x, 0.4 + 0.6 * l2, () => {
          const g = linGrad(x, 0, 640 - size * 0.76, 0, 650, [[0, "#ffe3a1"], [1, "#f3b552"]]);
          text(x, PAYOFF, 960, 640 + lift + hover, { size, fill: g, align: "center", stroke: "#3e2410", strokeWidth: 8, glow: ["#ff8a24", 6, 22, 0.95], track: 0.02 });
        });
      }
    }),
  );
};

// ── the edit ────────────────────────────────────────────────────────────────────────────────────────────────────
export const draw = (x, t, frame) => {
  x.setTransform(1, 0, 0, 1, 0, 0);
  x.fillStyle = "#000";
  x.fillRect(0, 0, W, H);
  if (t < S.title) openShot(x, t);
  else titleShot(x, t);
  finish(x, frame, 0.55, 0.035);
  const out = ramp(t, SECONDS - 0.5, SECONDS);
  if (out > 0) alpha(x, out, () => rect(x, 0, 0, W, H, "#000"));
};
