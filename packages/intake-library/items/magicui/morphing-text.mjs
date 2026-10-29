// Magic UI morphing-text (apps/www/registry/magicui/morphing-text.tsx at efe76fc): two stacked words melt into each other through an
// alpha-threshold SVG filter (feColorMatrix alpha row 0 0 0 255 -140, plus blur(0.6px) on the holder): over morphTime 1.5 s the
// incoming word goes blur min(8 / f - 8, 100) px, opacity f^0.4, the outgoing the inverse; then cooldownTime 0.5 s on the new word; loops.
// Port: the same state machine as a function of the film's time (cycle 2 s).
export default {
  id: "morphing-text",
  kind: "motion",
  title: "Morphing Text",
  sub: "Từ tan chảy sang từ khác",
  desc: "Words melt into each other in a loop: the old word blurs away while the next one forms through a gooey threshold filter (1.5 s morph, 0.5 s pause).",
  category: "Text & titles",
  tags: ["morph", "gooey", "blur", "words", "loop", "magicui"],
  source: { path: "apps/www/registry/magicui/morphing-text.tsx" },
  notes: "The SVG filter is added once to the page (#mw-morph-threshold). Text 40 pt / 6 rem bold as upstream; leading none: give the holder a height.",
  options: { texts: "list of words", cycles: "morphs to play (one loop)" },
  defaults: { texts: ["Xin chào", "Thiết kế", "Chuyển động"], cycles: 0 },
  css: `.mw-morphing-text { position: relative; text-align: center; font-weight: 700; line-height: 1; filter: url(#mw-morph-threshold) blur(0.6px); }
.mw-morphing-text > span { position: absolute; left: 0; right: 0; top: 0; margin: auto; display: inline-block; width: 100%; }`,
  markup: `<div class="mw-morphing-text" style="height:1.3em"><span></span><span></span></div>`,
  fn: function (el, tl, at, o) {
    if (!document.getElementById("mw-morph-threshold")) {
      var NS = "http://www.w3.org/2000/svg", svg = document.createElementNS(NS, "svg");
      svg.setAttribute("style", "position:fixed;width:0;height:0");
      svg.innerHTML = '<defs><filter id="mw-morph-threshold"><feColorMatrix in="SourceGraphic" type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 255 -140"/></filter></defs>';
      document.body.appendChild(svg);
    }
    var spans = el.querySelectorAll("span");
    var a = spans[0] || el.appendChild(document.createElement("span")), b = spans[1] || el.appendChild(document.createElement("span"));
    var T = o.texts, n = o.cycles || T.length, MORPH = 1.5, COOL = 0.5, C = MORPH + COOL;
    var s = { t: 0 };
    var set = function () {
      var k = Math.max(0, Math.min(n - 1, Math.floor(s.t / C))), local = s.t - k * C;
      a.textContent = T[k % T.length]; b.textContent = T[(k + 1) % T.length];
      if (s.t >= n * C || local >= MORPH) { a.style.filter = "none"; a.style.opacity = "0%"; b.style.filter = "none"; b.style.opacity = "100%"; return; }
      var f = Math.max(1e-4, local / MORPH), g = Math.max(1e-4, 1 - f);
      b.style.filter = "blur(" + Math.min(8 / f - 8, 100) + "px)"; b.style.opacity = Math.pow(f, 0.4) * 100 + "%";
      a.style.filter = "blur(" + Math.min(8 / g - 8, 100) + "px)"; a.style.opacity = Math.pow(g, 0.4) * 100 + "%";
    };
    set();
    tl.fromTo(s, { t: 0 }, { t: n * C, duration: n * C, ease: "none", onUpdate: set, immediateRender: false }, at);
    return at + n * C;
  },
  demo: {
    duration: 8,
    html: `<div class="center"><div class="mw-morphing-text" style="width:1600px;height:200px;font-size:180px"><span>Xin chào</span><span>Thiết kế</span></div></div>`,
    run: `MW.morphingText(q(".mw-morphing-text"), tl, 0, { texts: ["Xin chào", "Thiết kế", "Chuyển động", "Ra mắt"], cycles: 4 });`,
  },
};
