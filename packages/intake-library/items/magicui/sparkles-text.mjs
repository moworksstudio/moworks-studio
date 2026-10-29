// Magic UI sparkles-text (apps/www/registry/magicui/sparkles-text.tsx at efe76fc): bold text with sparklesCount (10) four-point stars
// (21 x 21 path from the source, colours #9E7AFF / #FE8BBB 50/50) at random spots over the text box; each star cycles every 0.8 s
// (opacity [0, 1, 0], scale [0, s, 0] with s 0.3-1.3, rotate [75, 120, 150] deg, motion's default easeInOut per segment) after a first
// delay of 0-2 s, and moves to a new spot after a 5-15 s lifespan. Port: the same schedule from a seeded table, drawn from the film's time.
export default {
  id: "sparkles-text",
  kind: "motion",
  title: "Sparkles Text",
  sub: "Chữ có sao lấp lánh nhảy quanh",
  desc: "Bold text with small four-point stars that keep popping, spinning and fading at random spots over it (0.8 s cycles, purple and pink).",
  category: "Text & titles",
  tags: ["sparkle", "stars", "twinkle", "magic", "text", "loop", "magicui"],
  source: { path: "apps/www/registry/magicui/sparkles-text.tsx" },
  notes: "Upstream uses Math.random and a 100 ms interval: here a seeded table (seed option), so every render is the same. The star path is upstream's (MIT).",
  options: { sparklesCount: "10", size: "star size in px (21)", colors: "{ first: #9E7AFF, second: #FE8BBB }", hold: "seconds (10)", seed: "1" },
  defaults: { sparklesCount: 10, size: 21, colors: { first: "#9E7AFF", second: "#FE8BBB" }, hold: 10, seed: 1 },
  uses: ["rand", "bezier"],
  css: `.mw-sparkles-text { position: relative; display: inline-block; font-weight: 700; }
.mw-sparkles-text > svg { position: absolute; z-index: 20; pointer-events: none; width: 21px; height: 21px; overflow: visible; }`,
  markup: `<span class="mw-sparkles-text">Lấp lánh</span>`,
  fn: function (el, tl, at, o) {
    var NS = "http://www.w3.org/2000/svg", D = "M9.82531 0.843845C10.0553 0.215178 10.9446 0.215178 11.1746 0.843845L11.8618 2.72026C12.4006 4.19229 12.3916 6.39157 13.5 7.5C14.6084 8.60843 16.8077 8.59935 18.2797 9.13822L20.1561 9.82534C20.7858 10.0553 20.7858 10.9447 20.1561 11.1747L18.2797 11.8618C16.8077 12.4007 14.6084 12.3916 13.5 13.5C12.3916 14.6084 12.4006 16.8077 11.8618 18.2798L11.1746 20.1562C10.9446 20.7858 10.0553 20.7858 9.82531 20.1562L9.13819 18.2798C8.59932 16.8077 8.60843 14.6084 7.5 13.5C6.39157 12.3916 4.19225 12.4007 2.72023 11.8618L0.843814 11.1747C0.215148 10.9447 0.215148 10.0553 0.843814 9.82534L2.72023 9.13822C4.19225 8.59935 6.39157 8.60843 7.5 7.5C8.60843 6.39157 8.59932 4.19229 9.13819 2.72026L9.82531 0.843845Z";
    var ease = MW.bezier.apply(null, MW.CSS_EASE.easeInOut), stars = [];
    for (var i = 0; i < o.sparklesCount; i++) {
      var svg = document.createElementNS(NS, "svg"); svg.setAttribute("viewBox", "0 0 21 21"); svg.style.width = svg.style.height = o.size + "px";
      var p = document.createElementNS(NS, "path"); p.setAttribute("d", D); svg.appendChild(p); el.appendChild(svg);
      // a star's lives: spot, colour, scale, first delay, lifespan; each new life is a new star at a new spot (upstream regenerates it)
      var r = MW.rand(o.seed * 1013 + i * 7), lives = [], t = 0;
      while (t < o.hold + 1) { var life = { x: r() * 100, y: r() * 100, c: r() > 0.5 ? o.colors.first : o.colors.second, s: r() + 0.3, d: r() * 2, l: r() * 10 + 5, t0: t }; lives.push(life); t += life.l; }
      stars.push({ svg: svg, path: p, lives: lives });
    }
    var s = { t: 0 };
    var draw = function () {
      for (var i = 0; i < stars.length; i++) {
        var st = stars[i], L = st.lives[0];
        for (var k = 0; k < st.lives.length; k++) if (st.lives[k].t0 <= s.t) L = st.lives[k];
        var local = s.t - L.t0 - L.d, op = 0, sc = 0, rot = 75;
        if (local >= 0) {
          var f = (local % 0.8) / 0.8, half = f < 0.5, u = ease(half ? f * 2 : f * 2 - 1);
          op = half ? u : 1 - u; sc = half ? L.s * u : L.s * (1 - u); rot = half ? 75 + 45 * u : 120 + 30 * u;
        }
        st.svg.style.left = L.x + "%"; st.svg.style.top = L.y + "%"; st.path.setAttribute("fill", L.c);
        st.svg.style.opacity = op; st.svg.style.transform = "scale(" + sc + ") rotate(" + rot + "deg)";
      }
    };
    draw();
    tl.fromTo(s, { t: 0 }, { t: o.hold, duration: o.hold, ease: "none", onUpdate: draw, immediateRender: false }, at);
    return at + o.hold;
  },
  demo: {
    duration: 6,
    html: `<div class="center"><div class="h1" style="font-size:170px"><span class="mw-sparkles-text">Lấp lánh ✦ diệu kỳ</span></div></div>`,
    run: `MW.sparklesText(q(".mw-sparkles-text"), tl, 0, { sparklesCount: 14, size: 56, hold: 6 });`,
  },
};
