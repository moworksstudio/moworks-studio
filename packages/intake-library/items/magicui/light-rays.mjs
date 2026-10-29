// Magic UI light-rays (apps/www/registry/magicui/light-rays.tsx at efe76fc): two soft glows (radial at 20 % 15 % and 80 % 10 %,
// colour-mix 45 % / 35 %, opacity 0.6) and `count` (7) blurred (36 px), screen-blended rays hanging from -12 % (length 70vh, origin top,
// gradient colour-mix 70 % -> transparent). Each ray: left 8-92 %, rotate -28..28°, width 160-320 px, swing 0.8-2.6°, delay 0..cycle,
// duration cycle x 0.75-1.25 (cycle = speed, 14 s), intensity 0.6-1.1; keyframes opacity 0 -> intensity -> 0 and rotate r - swing ->
// r + swing -> r - swing, easeInOut, repeatDelay duration x 0.1, forever. Port: the same rays from a seeded table, from the film's time.
export default {
  id: "light-rays",
  kind: "motion",
  title: "Light Rays",
  sub: "Tia sáng mềm rọi xuống từ trên",
  desc: "Soft blurred light shafts shine down from above, swinging slightly and fading in and out over two ambient glows: an atmosphere layer for titles and reveals.",
  category: "Backgrounds",
  tags: ["light", "rays", "god rays", "glow", "atmosphere", "background", "loop", "magicui"],
  source: { path: "apps/www/registry/magicui/light-rays.tsx" },
  notes: "Rays start dark until their delay, as upstream; `preroll` (s) starts the clock earlier so the first frame is already lit. length 70vh becomes px of the frame (70 % of its height).",
  options: { count: "7", color: "rgba(160, 210, 255, 0.2)", blur: "px (36)", speed: "cycle s (14)", length: "px (70 % of the frame height)", preroll: "s (0)", hold: "seconds (14)", seed: "1" },
  defaults: { count: 7, color: "rgba(160, 210, 255, 0.2)", blur: 36, speed: 14, length: null, preroll: 0, hold: 14, seed: 1 },
  uses: ["rand", "bezier"],
  css: `.mw-light-rays { position: absolute; inset: 0; isolation: isolate; overflow: hidden; pointer-events: none; border-radius: inherit; }
.mw-light-rays > .mw-lr-glow { position: absolute; inset: 0; opacity: 0.6; }
.mw-light-rays > .mw-lr-ray { position: absolute; top: -12%; transform-origin: top; border-radius: 9999px; mix-blend-mode: screen; opacity: 0;
  background: linear-gradient(to bottom, color-mix(in srgb, var(--mw-lr-color) 70%, transparent), transparent); filter: blur(var(--mw-lr-blur)); }`,
  markup: `<div class="mw-light-rays"></div>`,
  fn: function (el, tl, at, o) {
    var cycle = Math.max(o.speed, 0.1), r = MW.rand(o.seed * 2203), len = o.length || el.clientHeight * 0.7;
    el.style.setProperty("--mw-lr-color", o.color); el.style.setProperty("--mw-lr-blur", o.blur + "px");
    var g1 = document.createElement("div"), g2 = document.createElement("div"); g1.className = g2.className = "mw-lr-glow";
    g1.style.background = "radial-gradient(circle at 20% 15%, color-mix(in srgb, " + o.color + " 45%, transparent), transparent 70%)";
    g2.style.background = "radial-gradient(circle at 80% 10%, color-mix(in srgb, " + o.color + " 35%, transparent), transparent 75%)";
    el.appendChild(g1); el.appendChild(g2);
    var rays = [], ease = MW.bezier.apply(null, MW.CSS_EASE.easeInOut);
    for (var i = 0; i < o.count; i++) {
      var ray = { left: 8 + r() * 84, rotate: -28 + r() * 56, width: 160 + r() * 160, swing: 0.8 + r() * 1.8, delay: r() * cycle, duration: cycle * (0.75 + r() * 0.5), intensity: 0.6 + r() * 0.5 };
      var d = document.createElement("div"); d.className = "mw-lr-ray";
      d.style.left = ray.left + "%"; d.style.width = ray.width + "px"; d.style.height = len + "px"; d.style.marginLeft = (-ray.width / 2) + "px";
      el.appendChild(d); ray.el = d; rays.push(ray);
    }
    var s = { t: 0 };
    var set = function () {
      for (var i = 0; i < rays.length; i++) {
        var R = rays[i], u = s.t + o.preroll - R.delay, P = R.duration * 1.1, op = 0, rot = R.rotate;
        if (u >= 0) {
          var f = (u % P) / R.duration;
          if (f <= 1) { var half = f < 0.5, e = ease(half ? f * 2 : f * 2 - 1); op = half ? R.intensity * e : R.intensity * (1 - e); rot = half ? R.rotate - R.swing + 2 * R.swing * e : R.rotate + R.swing - 2 * R.swing * e; }
          else { op = 0; rot = R.rotate - R.swing; }
        }
        R.el.style.opacity = op; R.el.style.transform = "rotate(" + rot + "deg)";
      }
    };
    set();
    tl.fromTo(s, { t: 0 }, { t: o.hold, duration: o.hold, ease: "none", onUpdate: set, immediateRender: false }, at);
    return at + o.hold;
  },
  demo: {
    duration: 8,
    css: `.scene { position: absolute; inset: 0; background: radial-gradient(ellipse at 50% 0%, #0c1a2e 0%, #050608 70%); }`,
    html: `<div class="scene"></div><div class="mw-light-rays"></div><div class="center"><div class="col"><div class="h1">Ra mắt sản phẩm</div><div class="p">Ánh sáng dẫn lối</div></div></div>`,
    run: `MW.lightRays(q(".mw-light-rays"), tl, 0, { count: 9, color: "rgba(160, 210, 255, 0.45)", speed: 6, preroll: 6, hold: 8 });`,
  },
};
