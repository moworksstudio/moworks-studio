// Magic UI shimmer-button (apps/www/registry/magicui/shimmer-button.tsx at efe76fc): a dark pill (radius 100 px, rgba(0,0,0,1), 1 px
// white/10 border, padding 12 x 24) with a spark of light running round its rim: a square spark box (height 100cqh) slides across the
// button (shimmer-slide: translate(calc(100cqw - 100%), 0), 3 s ease-in-out, alternate) while a conic-gradient inside it (from 270 - 45°,
// colour over 90°) turns in steps (spin-around, 6 s linear: 0°, 90° held 15-35 %, 270° held 65-85 %, 360°); blurred 2 px and cut by a
// backdrop inset 0.05em, so only the rim glows; an inner highlight (inset 0 -8px 10px #ffffff1f). Port: the same layers (container units
// kept); both loops from the film's time.
export default {
  id: "shimmer-button",
  kind: "motion",
  title: "Shimmer Button",
  sub: "Nút tối có tia sáng chạy quanh mép",
  desc: "A dark pill button with a spark of light travelling around its edge and a soft inner highlight: a living call to action for dark end cards.",
  category: "UI & mockups",
  tags: ["button", "cta", "shimmer", "spark", "border", "loop", "magicui"],
  source: { path: "apps/www/registry/magicui/shimmer-button.tsx" },
  notes: "el is the button; its content stays on top.",
  options: { shimmerColor: "#ffffff", shimmerSize: "cut (0.05em)", shimmerDuration: "s (3)", borderRadius: "100px", background: "rgba(0, 0, 0, 1)", hold: "seconds (6)" },
  defaults: { shimmerColor: "#ffffff", shimmerSize: "0.05em", shimmerDuration: 3, borderRadius: "100px", background: "rgba(0, 0, 0, 1)", hold: 6 },
  uses: ["bezier"],
  css: `.mw-shimmer-button { position: relative; z-index: 0; display: flex; align-items: center; justify-content: center; overflow: hidden; border: 1px solid rgba(255,255,255,0.1); padding: 12px 24px; white-space: nowrap; color: #fff; }
.mw-shimmer-button > .mw-sb-sparks { position: absolute; inset: 0; z-index: -30; overflow: visible; filter: blur(2px); container-type: size; }
.mw-shimmer-button .mw-sb-spark { position: absolute; inset: 0; aspect-ratio: 1; height: 100cqh; }
.mw-shimmer-button .mw-sb-cone { position: absolute; inset: -100%; width: auto; }
.mw-shimmer-button > .mw-sb-hi { position: absolute; inset: 0; border-radius: 16px; box-shadow: inset 0 -8px 10px #ffffff1f; pointer-events: none; }
.mw-shimmer-button > .mw-sb-back { position: absolute; z-index: -20; }`,
  markup: `<div class="mw-shimmer-button">Bắt đầu ngay</div>`,
  fn: function (el, tl, at, o) {
    el.style.borderRadius = o.borderRadius; el.style.background = o.background;
    var sparks = document.createElement("div"), spark = document.createElement("div"), cone = document.createElement("div"), hi = document.createElement("div"), back = document.createElement("div");
    sparks.className = "mw-sb-sparks"; spark.className = "mw-sb-spark"; cone.className = "mw-sb-cone"; hi.className = "mw-sb-hi"; back.className = "mw-sb-back";
    cone.style.background = "conic-gradient(from calc(270deg - (90deg * 0.5)), transparent 0, " + o.shimmerColor + " 90deg, transparent 90deg)";
    back.style.inset = o.shimmerSize; back.style.borderRadius = o.borderRadius; back.style.background = o.background;
    spark.appendChild(cone); sparks.appendChild(spark); el.insertBefore(sparks, el.firstChild); el.appendChild(hi); el.appendChild(back);
    var e = MW.bezier.apply(null, MW.CSS_EASE.easeInOut), S = o.shimmerDuration, s = { t: 0 };
    var spin = function (f) { // spin-around keyframes, linear between them
      if (f < 0.15) return 90 * f / 0.15; if (f < 0.35) return 90; if (f < 0.65) return 90 + 180 * (f - 0.35) / 0.3; if (f < 0.85) return 270; return 270 + 90 * (f - 0.85) / 0.15;
    };
    var set = function () {
      var k = Math.floor(s.t / S), f = (s.t - k * S) / S; if (k % 2) f = 1 - f;           // alternate
      var u = e(f);
      spark.style.transform = "translate(calc((100cqw - 100%) * " + u + "), 0)";
      cone.style.transform = "translateZ(0) rotate(" + spin((s.t % (S * 2)) / (S * 2)) + "deg)";
    };
    set();
    tl.fromTo(s, { t: 0 }, { t: o.hold, duration: o.hold, ease: "none", onUpdate: set, immediateRender: false }, at);
    return at + o.hold;
  },
  demo: {
    duration: 6,
    css: `.mw-shimmer-button { font-size: 56px; font-weight: 500; letter-spacing: -0.01em; padding: 30px 70px; }`,
    html: `<div class="center"><div class="col"><div class="h2">Sẵn sàng bắt đầu?</div><div class="mw-shimmer-button">Dùng thử miễn phí</div></div></div>`,
    run: `MW.shimmerButton(q(".mw-shimmer-button"), tl, 0, { hold: 6 });`,
  },
};
