// Magic UI animated-gradient-text (apps/www/registry/magicui/animated-gradient-text.tsx at efe76fc): text filled with a from-to-from
// gradient tile (300 % x speed wide) whose background-position runs to the tile size, 8 s linear, forever (registry keyframe "gradient").
// Port: the same CSS; the infinite keyframe becomes a linear tween per cycle on the film's timeline, repeated over `hold`.
export default {
  id: "animated-gradient-text",
  kind: "motion",
  title: "Animated Gradient Text",
  sub: "Chữ phủ gradient chảy ngang",
  desc: "A word filled with a from-to-from gradient (#ffaa40, #9c40ff) that flows sideways through the letters, one tile every 8 s / speed, linear, looping.",
  category: "Text & titles",
  tags: ["gradient", "text", "fill", "loop", "magicui"],
  source: { path: "apps/www/registry/magicui/animated-gradient-text.tsx" },
  notes: "Registry keyframe gradient: to { background-position: var(--bg-size) 0 }, 8 s linear infinite. A little padding keeps Vietnamese marks inside the clipped background.",
  options: { speed: "tile width x 300 % (1)", colorFrom: "#ffaa40", colorTo: "#9c40ff", hold: "seconds it runs (8)" },
  defaults: { speed: 1, colorFrom: "#ffaa40", colorTo: "#9c40ff", hold: 8 },
  css: `.mw-animated-gradient-text { display: inline-block; padding: 0.12em 0.02em; margin: -0.12em -0.02em; color: transparent;
  background-image: linear-gradient(to right, var(--mw-gt-from), var(--mw-gt-to), var(--mw-gt-from)); background-size: var(--mw-gt-size, 300%) 100%;
  -webkit-background-clip: text; background-clip: text; }`,
  markup: `<span class="mw-animated-gradient-text">Giới thiệu Magic UI</span>`,
  fn: function (el, tl, at, o) {
    var size = o.speed * 300;
    el.style.setProperty("--mw-gt-from", o.colorFrom);
    el.style.setProperty("--mw-gt-to", o.colorTo);
    el.style.setProperty("--mw-gt-size", size + "%");
    var cycles = Math.max(1, Math.ceil(o.hold / 8));
    tl.fromTo(el, { backgroundPosition: "0% 0%" }, { backgroundPosition: size + "% 0%", duration: 8, ease: "none", repeat: cycles - 1 }, at);
    return at + o.hold;
  },
  demo: {
    duration: 8,
    html: `<div class="center"><div class="col"><div class="h1"><span class="mw-animated-gradient-text">Chuyển động mượt mà</span></div>
<div class="h2"><span class="mw-animated-gradient-text g2">Thiết kế · Xây dựng · Ra mắt</span></div></div></div>`,
    run: `MW.animatedGradientText(q(".h1 .mw-animated-gradient-text"), tl, 0, { hold: 8 });
MW.animatedGradientText(q(".g2"), tl, 0, { speed: 2, colorFrom: "#4ade80", colorTo: "#06b6d4", hold: 8 });`,
  },
};
