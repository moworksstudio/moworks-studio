// Magic UI text-animate (apps/www/registry/magicui/text-animate.tsx at efe76fc): splits text by text / word / character / line and staggers
// one of ten entrances across the pieces (stagger = duration / pieces, duration 0.3 s): fadeIn (y 20), blurIn (blur 10 px), blurInUp /
// blurInDown (blur 10 + y 20; y 0.3 s, opacity 0.4 s), slideUp / Down / Left / Right (20 px), scaleUp (0.5) / scaleDown (1.5) with a scale
// spring (stiffness 300, damping 15). Tweens use motion's default easeInOut. Port: the same table on the film's timeline; also exits.
export default {
  id: "text-animate",
  kind: "motion",
  title: "Text Animate",
  sub: "Mười kiểu vào chữ, tách từng mảnh",
  desc: "Ten ready text entrances (fade, blur, blur up/down, slide four ways, scale up/down) staggered across words, letters or lines.",
  category: "Text & titles",
  tags: ["entrance", "stagger", "words", "letters", "blur", "slide", "scale", "magicui"],
  source: { path: "apps/www/registry/magicui/text-animate.tsx" },
  notes: "animation: fadeIn | blurIn | blurInUp | blurInDown | slideUp | slideDown | slideLeft | slideRight | scaleUp | scaleDown. by: text | word | character | line. exit: true plays the matching exit (reverse order).",
  options: { animation: "fadeIn", by: "word", duration: "s spread over all pieces (0.3)", delay: "s (0)", exit: "false", hold: "s between the entrance and the exit (0.6)" },
  defaults: { animation: "fadeIn", by: "word", duration: 0.3, delay: 0, exit: false, hold: 0.6 },
  uses: ["split", "bezier", "spring"],
  css: `.mw-text-animate { white-space: pre-wrap; }`,
  markup: `<p class="mw-text-animate">Chữ vào từng từ một</p>`,
  fn: function (el, tl, at, o) {
    var V = {
      fadeIn: [{ opacity: 0, y: 20 }, { y: 20 }], blurIn: [{ opacity: 0, filter: "blur(10px)" }, { filter: "blur(10px)" }],
      blurInUp: [{ opacity: 0, filter: "blur(10px)", y: 20 }, { filter: "blur(10px)", y: 20 }], blurInDown: [{ opacity: 0, filter: "blur(10px)", y: -20 }, { filter: "blur(10px)", y: -20 }],
      slideUp: [{ y: 20, opacity: 0 }, { y: -20 }], slideDown: [{ y: -20, opacity: 0 }, { y: 20 }], slideLeft: [{ x: 20, opacity: 0 }, { x: -20 }],
      slideRight: [{ x: -20, opacity: 0 }, { x: 20 }], scaleUp: [{ scale: 0.5, opacity: 0 }, { scale: 0.5 }], scaleDown: [{ scale: 1.5, opacity: 0 }, { scale: 1.5 }],
    };
    var v = V[o.animation] || V.fadeIn, ease = MW.bezier.apply(null, MW.CSS_EASE.easeInOut);
    var parts;
    if (o.by === "text") parts = [el];
    else if (o.by === "line") {
      // lines as laid out (a <br> ends a line too), each wrapped in a block span
      var brs = Array.prototype.slice.call(el.querySelectorAll("br"));
      brs.forEach(function (b) { b.insertAdjacentText("afterend", " "); });
      var lines = MW.split(el, "words").lines;
      brs.forEach(function (b) { b.remove(); });
      parts = lines.map(function (ws) {
        var box = document.createElement("span"); box.style.display = "block"; ws[0].parentNode.insertBefore(box, ws[0]);
        ws.forEach(function (w, i) { box.appendChild(w); if (i < ws.length - 1) box.appendChild(document.createTextNode(" ")); });
        return box;
      });
    }
    else parts = MW.split(el, o.by === "character" ? "chars" : "words")[o.by === "character" ? "chars" : "words"];
    var each = o.duration / parts.length, spring = MW.spring(300, 15, 1);
    var hidden = v[0];
    parts.forEach(function (p, i) {
      var t = at + o.delay + i * each;
      var to = { opacity: 1, duration: 0.3, ease: ease, immediateRender: true };
      if (/blurIn(Up|Down)/.test(o.animation)) { to.duration = 0.4; tl.fromTo(p, { y: hidden.y }, { y: 0, duration: 0.3, ease: ease, immediateRender: true }, t); tl.fromTo(p, { filter: hidden.filter }, { filter: "blur(0px)", duration: 0.3, ease: ease, immediateRender: true }, t); tl.fromTo(p, { opacity: 0 }, to, t); return; }
      if (/^scale/.test(o.animation)) { tl.fromTo(p, { scale: hidden.scale }, { scale: 1, duration: spring.duration, ease: spring.ease, immediateRender: true }, t); tl.fromTo(p, { opacity: 0 }, to, t); return; }
      var from = {}, k;
      for (k in hidden) from[k] = hidden[k];
      for (k in hidden) if (k !== "opacity") to[k] = k === "filter" ? "blur(0px)" : 0;
      tl.fromTo(p, from, to, t);
    });
    var end = at + o.delay + (parts.length - 1) * each + 0.4;
    if (o.exit) {
      var ex = v[1];
      parts.slice().reverse().forEach(function (p, i) { var to = { opacity: 0, duration: 0.3, ease: ease }; for (var k in ex) to[k] = ex[k]; tl.to(p, to, end + o.hold + i * each); });
      end += o.hold + parts.length * each + 0.3;
    }
    return end;
  },
  demo: {
    duration: 7,
    css: `.grid { display: grid; grid-template-columns: 1fr 1fr; gap: 70px 140px; width: 1640px; } .grid .h2 { font-size: 78px; text-align: left; }
.grid small { display: block; font-size: 26px; opacity: .45; font-family: 'JetBrains Mono', monospace; margin-bottom: 10px; }`,
    html: `<div class="center"><div class="grid">
  <div><small>blurInUp · character</small><div class="h2 mw-text-animate a1">Mờ rồi rõ dần</div></div>
  <div><small>slideLeft · word</small><div class="h2 mw-text-animate a2">Trượt vào từ phải</div></div>
  <div><small>scaleUp · word</small><div class="h2 mw-text-animate a3">Bật lên nảy nhẹ</div></div>
  <div><small>fadeIn · line</small><div class="h2 mw-text-animate a4">Từng dòng<br>hiện lên</div></div>
</div></div>`,
    run: `var HOLD = 2.4;
MW.textAnimate(q(".a1"), tl, 0.3, { animation: "blurInUp", by: "character", duration: 0.9, exit: true, hold: HOLD });
MW.textAnimate(q(".a2"), tl, 0.9, { animation: "slideLeft", by: "word", duration: 0.5, exit: true, hold: HOLD - 0.4 });
MW.textAnimate(q(".a3"), tl, 1.5, { animation: "scaleUp", by: "word", duration: 0.5, exit: true, hold: HOLD - 0.8 });
MW.textAnimate(q(".a4"), tl, 2.1, { animation: "fadeIn", by: "line", duration: 0.4, exit: true, hold: HOLD - 1.2 });`,
  },
};
