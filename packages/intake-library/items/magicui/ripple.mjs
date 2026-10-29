// Magic UI ripple (apps/www/registry/magicui/ripple.tsx at efe76fc): numCircles (8) concentric circles behind an element, ring i
// mainCircleSize + 70 i px (210 + 70 i), opacity 0.24 - 0.03 i, delay i x 0.06 s, running the registry keyframe "ripple" (scale 1 -> 0.9
// -> 1) over 2 s with CSS ease, forever; fill foreground at 25 %, a 1 px border, shadow-xl; the holder fades toward the bottom (mask).
// Port: the same rings; each ring's scale from the film's time.
export default {
  id: "ripple",
  kind: "motion",
  title: "Ripple",
  sub: "Các vòng tròn đồng tâm thở nhẹ",
  desc: "Concentric soft circles behind a logo or button gently breathe in and out, one after another (2 s, eight rings).",
  category: "Effects & overlays",
  tags: ["ripple", "rings", "pulse", "halo", "logo", "loop", "magicui"],
  source: { path: "apps/www/registry/magicui/ripple.tsx" },
  notes: "el is a full-size layer behind the subject (the rings centre in it). The inline delay i x 0.06 s overrides the registry class's i x 0.2 s, as upstream.",
  options: { mainCircleSize: "px (210)", mainCircleOpacity: "0.24", numCircles: "8", color: "ring colour (#fafafa)", hold: "seconds (10)" },
  defaults: { mainCircleSize: 210, mainCircleOpacity: 0.24, numCircles: 8, color: "#fafafa", hold: 10 },
  uses: ["bezier"],
  css: `.mw-ripple { position: absolute; inset: 0; pointer-events: none; -webkit-mask-image: linear-gradient(to bottom, white, transparent); mask-image: linear-gradient(to bottom, white, transparent); }
.mw-ripple > i { position: absolute; left: 50%; top: 50%; border-radius: 9999px; border-style: solid; border-width: 1px; box-shadow: 0 20px 25px -5px rgba(0,0,0,.1), 0 8px 10px -6px rgba(0,0,0,.1); }`,
  markup: `<div class="mw-ripple"></div>`,
  fn: function (el, tl, at, o) {
    var rings = [], ease = MW.bezier.apply(null, MW.CSS_EASE.ease);
    for (var i = 0; i < o.numCircles; i++) {
      var c = document.createElement("i"), size = o.mainCircleSize + i * 70;
      c.style.width = c.style.height = size + "px"; c.style.opacity = o.mainCircleOpacity - i * 0.03;
      c.style.background = "color-mix(in srgb, " + o.color + " 25%, transparent)";
      c.style.borderColor = "color-mix(in srgb, " + o.color + " " + (5 + i * 5) + "%, transparent)";
      el.appendChild(c); rings.push(c);
    }
    var s = { t: 0 };
    var set = function () {
      for (var i = 0; i < rings.length; i++) {
        var u = s.t - i * 0.06, f = u < 0 ? 0 : (u % 2) / 2, k = f < 0.5 ? 1 - 0.1 * ease(f * 2) : 0.9 + 0.1 * ease(f * 2 - 1);
        rings[i].style.transform = "translate(-50%, -50%) scale(" + k + ")";
      }
    };
    set();
    tl.fromTo(s, { t: 0 }, { t: o.hold, duration: o.hold, ease: "none", onUpdate: set, immediateRender: false }, at);
    return at + o.hold;
  },
  demo: {
    duration: 6,
    css: `.app { position: relative; z-index: 2; width: 200px; height: 200px; border-radius: 48px; background: linear-gradient(135deg,#6366f1,#ec4899); display: grid; place-items: center; font-size: 110px; font-weight: 800; box-shadow: 0 20px 60px rgba(99,102,241,.4); }`,
    html: `<div class="mw-ripple" style="top:-80px"></div><div class="center"><div class="app">M</div></div>`,
    run: `MW.ripple(q(".mw-ripple"), tl, 0, { mainCircleSize: 300, mainCircleOpacity: 0.4, hold: 6 });`,
  },
};
