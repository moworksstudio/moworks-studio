// Magic UI animated-circular-progress-bar (apps/www/registry/magicui/animated-circular-progress-bar.tsx at efe76fc): a 160 px gauge,
// viewBox 100, r 45, stroke 10, round caps: a primary arc for the value and a secondary arc for the rest, 5 % gaps between them (rotated
// accordingly), the percentage in the middle; when the value changes the arcs slide over 1 s CSS ease (the number jumps). Port: the same
// two arcs; value changes become [t, value] keys, each eased over 1 s from the film's time.
export default {
  id: "animated-circular-progress-bar",
  kind: "block",
  title: "Animated Circular Progress Bar",
  sub: "Vòng tiến độ hai cung có khe",
  desc: "A circular gauge: a coloured arc for the value and a grey arc for the rest with small gaps, the percentage in the middle, sliding when the value changes.",
  category: "Data & charts",
  tags: ["progress", "gauge", "ring", "percent", "chart", "stat", "magicui"],
  source: { path: "apps/www/registry/magicui/animated-circular-progress-bar.tsx" },
  notes: "values: [[t, value], ...] in s after `at` (min..max). Upstream's number jumps to the new value; countNumber: true makes it count with the arc (this port's option).",
  options: { min: "0", max: "100", values: "[[0, 0], [0.5, 72]]", gaugePrimaryColor: "#a78bfa", gaugeSecondaryColor: "rgba(255,255,255,0.1)", countNumber: "false" },
  defaults: { min: 0, max: 100, values: [[0, 0], [0.5, 72]], gaugePrimaryColor: "#a78bfa", gaugeSecondaryColor: "rgba(255,255,255,0.1)", countNumber: false },
  uses: ["bezier"],
  css: `.mw-animated-circular-progress-bar { position: relative; width: 160px; height: 160px; font-size: 24px; font-weight: 600; transform: translateZ(0); }
.mw-animated-circular-progress-bar > svg { width: 100%; height: 100%; }
.mw-animated-circular-progress-bar > span { position: absolute; inset: 0; margin: auto; width: fit-content; height: fit-content; }`,
  markup: `<div class="mw-animated-circular-progress-bar"></div>`,
  fn: function (el, tl, at, o) {
    var C = 2 * Math.PI * 45, P = C / 100, gap = 5, NS = "http://www.w3.org/2000/svg";
    var svg = document.createElementNS(NS, "svg"); svg.setAttribute("fill", "none"); svg.setAttribute("viewBox", "0 0 100 100"); svg.setAttribute("stroke-width", "2");
    var mk = function (color) { var c = document.createElementNS(NS, "circle"); c.setAttribute("cx", 50); c.setAttribute("cy", 50); c.setAttribute("r", 45); c.setAttribute("stroke-width", 10);
      c.setAttribute("stroke-linecap", "round"); c.setAttribute("stroke-linejoin", "round"); c.style.stroke = color; c.style.transformOrigin = "50px 50px"; svg.appendChild(c); return c; };
    var sec = mk(o.gaugeSecondaryColor), pri = mk(o.gaugePrimaryColor), num = document.createElement("span");
    el.appendChild(svg); el.appendChild(num);
    var e = MW.bezier.apply(null, MW.CSS_EASE.ease), V = o.values, pct = function (v) { return Math.round(((v - o.min) / (o.max - o.min)) * 100); };
    var valueAt = function (t) {                          // each change slides from where the arc was over 1 s
      var shown = pct(V[0][1]);
      for (var k = 1; k < V.length; k++) { if (t < V[k][0]) break; var from = shown, f = Math.min(1, (t - V[k][0]) / 1); shown = from + (pct(V[k][1]) - from) * e(f); }
      return shown;
    };
    var targetAt = function (t) { var v = V[0][1]; for (var k = 0; k < V.length; k++) if (t >= V[k][0]) v = V[k][1]; return pct(v); };
    var s = { t: 0 }, set = function () {
      var p = valueAt(s.t);
      pri.style.strokeDasharray = p * P + "px " + C;
      pri.style.transform = "rotate(-90deg)";               // offset-factor 0: the primary arc starts at the top
      sec.style.display = p <= 90 && p >= 0 ? "" : "none";
      sec.style.strokeDasharray = (90 - p) * P + "px " + C;
      sec.style.transform = "rotate(calc(1turn - 90deg - " + gap * 3.6 + "deg)) scaleY(-1)";
      num.textContent = o.countNumber ? Math.round(p) : targetAt(s.t);
    };
    set();
    var end = V[V.length - 1][0] + 1;
    tl.fromTo(s, { t: 0 }, { t: end, duration: end, ease: "none", onUpdate: set, immediateRender: false }, at);
    return at + end;
  },
  demo: {
    duration: 6,
    css: `.mw-animated-circular-progress-bar { width: 420px; height: 420px; font-size: 96px; }
.cap { font-size: 40px; opacity: .6; margin-top: 30px; text-align: center; }`,
    html: `<div class="center"><div class="col"><div class="mw-animated-circular-progress-bar"></div><div class="cap">Đã hoàn thành dự án</div></div></div>`,
    run: `MW.animatedCircularProgressBar(q(".mw-animated-circular-progress-bar"), tl, 0, { values: [[0, 0], [0.5, 30], [2, 64], [3.5, 92]], gaugePrimaryColor: "#a78bfa" });`,
  },
};
