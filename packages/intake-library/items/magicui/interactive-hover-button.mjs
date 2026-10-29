// Magic UI interactive-hover-button (apps/www/registry/magicui/interactive-hover-button.tsx at efe76fc): a pill button (1 px border,
// padding 8 x 24, semibold); on hover a 8 px dot scales x 100.8 and floods it with the accent, the label slides 48 px right and fades,
// and a copy of the label with an arrow slides from +48 px to -20 px and appears, all over 300 ms (Tailwind's cubic-bezier(0.4, 0, 0.2, 1));
// leaving plays them back. Port: the hover becomes [enter, leave] times on the film's timeline; the arrow is drawn here (lucide's ArrowRight
// path, ISC).
export default {
  id: "interactive-hover-button",
  kind: "motion",
  title: "Interactive Hover Button",
  sub: "Nút viên thuốc tràn màu, đổi nhãn",
  desc: "A pill button: on hover a small dot floods the whole button with colour while the label slides out and a new label with an arrow slides in.",
  category: "UI & mockups",
  tags: ["button", "cta", "hover", "flood", "arrow", "magicui"],
  source: { path: "apps/www/registry/magicui/interactive-hover-button.tsx" },
  notes: "hovers: [[enter, leave], ...] in s after `at` (leave null = stays). The arrow is lucide's ArrowRight (ISC) drawn inline.",
  options: { hovers: "[[0, null]]", accent: "#fafafa", accentText: "#09090b", background: "#09090b" },
  defaults: { hovers: [[0, null]], accent: "#fafafa", accentText: "#09090b", background: "#09090b" },
  uses: ["bezier"],
  css: `.mw-interactive-hover-button { position: relative; display: inline-block; overflow: hidden; border-radius: 9999px; border: 1px solid rgba(255,255,255,0.2); padding: 8px 24px; text-align: center; font-weight: 600; }
.mw-interactive-hover-button .mw-ih-row { display: flex; align-items: center; justify-content: center; gap: 8px; }
.mw-interactive-hover-button .mw-ih-dot { height: 8px; width: 8px; border-radius: 9999px; }
.mw-interactive-hover-button .mw-ih-text { display: inline-block; }
.mw-interactive-hover-button .mw-ih-over { position: absolute; top: 0; left: 0; z-index: 10; display: flex; height: 100%; width: 100%; align-items: center; justify-content: center; gap: 8px; opacity: 0; }
.mw-interactive-hover-button .mw-ih-over svg { width: 1em; height: 1em; }`,
  markup: `<div class="mw-interactive-hover-button">Bắt đầu</div>`,
  fn: function (el, tl, at, o) {
    var text = el.textContent; el.textContent = ""; el.style.background = o.background;
    el.innerHTML = '<div class="mw-ih-row"><div class="mw-ih-dot"></div><span class="mw-ih-text"></span></div><div class="mw-ih-over"><span></span>' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg></div>';
    var dot = el.querySelector(".mw-ih-dot"), lab = el.querySelector(".mw-ih-text"), over = el.querySelector(".mw-ih-over");
    lab.textContent = text; over.querySelector("span").textContent = text; dot.style.background = o.accent; over.style.color = o.accentText;
    var e = MW.bezier(0.4, 0, 0.2, 1), D = 0.3, s = { t: 0 }, end = 0;
    o.hovers.forEach(function (h) { end = Math.max(end, (h[1] == null ? h[0] : h[1]) + D); });
    var set = function () {
      var p = 0;
      for (var i = 0; i < o.hovers.length; i++) {
        var on = o.hovers[i][0], off = o.hovers[i][1];
        if (s.t < on) break;
        var from = p;
        if (off == null || s.t < off) { p = from + (1 - from) * e(Math.min(1, (s.t - on) / D)); continue; }
        var top = from + (1 - from) * e(Math.min(1, (off - on) / D)); p = top * (1 - e(Math.min(1, (s.t - off) / D)));
      }
      dot.style.transform = "scale(" + (1 + 99.8 * p) + ")";
      lab.style.transform = "translateX(" + 48 * p + "px)"; lab.style.opacity = 1 - p;
      over.style.transform = "translateX(" + (48 - 68 * p) + "px)"; over.style.opacity = p;
    };
    set();
    tl.fromTo(s, { t: 0 }, { t: end, duration: end, ease: "none", onUpdate: set, immediateRender: false }, at);
    return at + end;
  },
  demo: {
    duration: 5,
    css: `.mw-interactive-hover-button { font-size: 52px; padding: 24px 72px; }`,
    html: `<div class="center"><div class="mw-interactive-hover-button">Bắt đầu ngay</div></div>`,
    run: `MW.interactiveHoverButton(q(".mw-interactive-hover-button"), tl, 0.6, { hovers: [[0, 1.6], [2.4, null]] });`,
  },
};
