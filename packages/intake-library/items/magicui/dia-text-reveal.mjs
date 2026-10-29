// Magic UI dia-text-reveal (apps/www/registry/magicui/dia-text-reveal.tsx at efe76fc): a band of colours (34 % of the width) sweeps
// from -17 % to 117 % across hidden text, leaving the text colour behind it: buildGradient() (text colour up to the band, the colours
// evenly across it, transparent after it), 1.5 s, easeInOutCubic; with several phrases it replays after repeatDelay 0.5 s on the next one,
// the width easing over 0.4 s cubic-bezier(0.4, 0, 0.2, 1). Port: the same gradient maths written every frame from the film's timeline.
export default {
  id: "dia-text-reveal",
  kind: "motion",
  title: "Dia Text Reveal",
  sub: "Dải màu quét lộ chữ (kiểu Dia)",
  desc: "A band of colours sweeps left to right across hidden text and leaves it in its final colour (1.5 s, ease-in-out cubic); with several phrases it rotates through them.",
  category: "Text & titles",
  tags: ["reveal", "gradient", "sweep", "headline", "text", "magicui"],
  source: { path: "apps/www/registry/magicui/dia-text-reveal.tsx" },
  notes: "Phrases change on a fixed schedule (duration + repeatDelay); widths are measured once. The band reaches past the letters, so marks above Vietnamese capitals are coloured too.",
  options: { texts: "list of phrases (the element's own text)", colors: "#c679c4, #fa3d1d, #ffb005, #e1e1fe, #0358f7", textColor: "final colour (currentColor of the parent)",
    duration: "s per sweep (1.5)", delay: "s (0)", repeat: "rotate through the phrases (false)", repeatDelay: "s (0.5)", cycles: "phrases shown when repeating (all)" },
  defaults: { texts: null, colors: ["#c679c4", "#fa3d1d", "#ffb005", "#e1e1fe", "#0358f7"], textColor: null, duration: 1.5, delay: 0, repeat: false, repeatDelay: 0.5, cycles: 0 },
  uses: ["bezier"],
  css: `.mw-dia-text-reveal { display: inline-block; vertical-align: bottom; white-space: nowrap; padding: 0.12em 0; margin: -0.12em 0; color: transparent;
  -webkit-background-clip: text; background-clip: text; overflow: hidden; }`,
  markup: `<span class="mw-dia-text-reveal">Trình duyệt thông minh</span>`,
  fn: function (el, tl, at, o) {
    var HALF = 17, START = -HALF, END = 100 + HALF;
    var texts = o.texts || [el.textContent];
    var textColor = o.textColor || getComputedStyle(el.parentNode).color;
    var grad = function (pos) {
      var a = pos - HALF, b = pos + HALF, n = o.colors.length, parts = [];
      if (a >= 100) return "linear-gradient(90deg, " + textColor + ", " + textColor + ")";
      if (a > 0) parts.push(textColor + " 0%", textColor + " " + a.toFixed(2) + "%");
      for (var i = 0; i < n; i++) parts.push(o.colors[i] + " " + (n === 1 ? pos : a + (i / (n - 1)) * HALF * 2).toFixed(2) + "%");
      if (b < 100) parts.push("transparent " + b.toFixed(2) + "%", "transparent 100%");
      return "linear-gradient(90deg, " + parts.join(", ") + ")";
    };
    // widths of every phrase, measured once (upstream measures with a hidden clone)
    var widths = texts.map(function (t) { el.textContent = t; return el.getBoundingClientRect().width; });
    el.textContent = texts[0];
    var multi = texts.length > 1 && o.repeat;
    if (multi) el.style.width = widths[0] + "px";
    var sweep = function (t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
    var cycle = o.duration + o.repeatDelay, n = multi ? (o.cycles || texts.length) : 1, wEase = MW.bezier(0.4, 0, 0.2, 1);
    var total = o.delay + n * cycle;
    // everything follows from the time alone (no callbacks), so any frame seeks exactly
    var s = { t: 0 }, shown = 0;
    var paint = function () {
      var t = s.t - o.delay, k = Math.max(0, Math.min(n - 1, Math.floor(t / cycle))), local = t - k * cycle;
      if (k !== shown) { el.textContent = texts[k % texts.length]; shown = k; }
      if (multi) {
        var w0 = widths[(k + texts.length - 1) % texts.length], w1 = widths[k % texts.length];
        el.style.width = (k === 0 ? w1 : w0 + (w1 - w0) * wEase(Math.max(0, Math.min(1, local / 0.4)))) + "px";
      }
      var p = t < 0 ? START : START + (END - START) * sweep(Math.max(0, Math.min(1, local / o.duration)));
      el.style.backgroundImage = grad(p);
    };
    paint();
    tl.fromTo(s, { t: 0 }, { t: total, duration: total, ease: "none", onUpdate: paint, immediateRender: false }, at);
    return at + total;
  },
  demo: {
    duration: 7,
    html: `<div class="center"><div class="col"><div class="h1"><span class="mw-dia-text-reveal r1">Trình duyệt AI</span></div>
<div class="h2"><span class="mw-dia-text-reveal r2">Viết nhanh hơn</span></div></div></div>`,
    run: `MW.diaTextReveal(q(".r1"), tl, 0.4, {});
MW.diaTextReveal(q(".r2"), tl, 1.2, { texts: ["Viết nhanh hơn", "Nghĩ rõ ràng hơn", "Làm ít hơn"], repeat: true, colors: ["#A97CF8", "#F38CB8", "#FDCC92"] });`,
  },
};
