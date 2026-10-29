// Magic UI number-ticker (apps/www/registry/magicui/number-ticker.tsx at efe76fc): a number moves from startValue to value on motion's
// useSpring (stiffness 100, damping 60, mass 1: overdamped, fast start and a long soft landing), shown with Intl.NumberFormat("en-US",
// decimalPlaces). Port: the same spring solved in closed form (MW.spring) on the film's timeline; the locale is an option (vi-VN shows
// 1.234,5).
export default {
  id: "number-ticker",
  kind: "motion",
  title: "Number Ticker",
  sub: "Số đếm lên bằng lò xo mềm",
  desc: "A number counts up (or down) to its value on a soft overdamped spring: fast at first, then a long gentle landing, with thousands separators.",
  category: "Data & charts",
  tags: ["counter", "number", "count up", "spring", "stat", "magicui"],
  source: { path: "apps/www/registry/magicui/number-ticker.tsx" },
  notes: "Spring stiffness 100, damping 60 (damping ratio 3): it settles in about 4 s. tabular-nums keeps the width steady.",
  options: { value: "target (100)", startValue: "0", direction: "up | down (up)", delay: "s (0)", decimalPlaces: "0", locale: "en-US (vi-VN for 1.234,5)" },
  defaults: { value: 100, startValue: 0, direction: "up", delay: 0, decimalPlaces: 0, locale: "en-US" },
  uses: ["spring"],
  css: `.mw-number-ticker { display: inline-block; letter-spacing: 0.05em; font-variant-numeric: tabular-nums; }`,
  markup: `<span class="mw-number-ticker">0</span>`,
  fn: function (el, tl, at, o) {
    var a = o.direction === "down" ? o.value : o.startValue, b = o.direction === "down" ? o.startValue : o.value;
    var sp = MW.spring(100, 60, 1);
    var fmt = new Intl.NumberFormat(o.locale, { minimumFractionDigits: o.decimalPlaces, maximumFractionDigits: o.decimalPlaces });
    var s = { v: a };
    var set = function () { el.textContent = fmt.format(Number(s.v.toFixed(o.decimalPlaces))); };
    set();
    tl.fromTo(s, { v: a }, { v: b, duration: sp.duration, ease: sp.ease, onUpdate: set, immediateRender: false }, at + o.delay);
    return at + o.delay + sp.duration;
  },
  demo: {
    duration: 6,
    css: `.stats { display: flex; gap: 120px; } .stat { text-align: center; } .stat b { display: block; font-size: 170px; font-weight: 800; letter-spacing: -0.03em; }
.stat > span { font-size: 40px; opacity: .6; }`,
    html: `<div class="center"><div class="stats">
  <div class="stat"><b><span class="mw-number-ticker n1">0</span>+</b><span>khách hàng</span></div>
  <div class="stat"><b><span class="mw-number-ticker n2">0</span>%</b><span>hài lòng</span></div>
</div></div>`,
    run: `MW.numberTicker(q(".n1"), tl, 0.4, { value: 12500, locale: "vi-VN" });
MW.numberTicker(q(".n2"), tl, 0.7, { value: 98.6, decimalPlaces: 1, locale: "vi-VN" });`,
  },
};
