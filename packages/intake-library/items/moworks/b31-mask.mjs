// Mask & Clip (batch 3.1): text and scenes revealed through masks, written here. Masks leave room above and below each line for Vietnamese
// marks. Each text motion can also run its exit (`exit`: seconds after `at`, or null).
import { T } from "../../moworks/define.mjs";
import { headline, ui, demo, CURSOR } from "../../moworks/stages.mjs";

const H = (text, run, duration = 4, opt = {}, css = "") => demo(headline(text, opt), run, duration, css);

export default [
  T("text/line-mask-rise", {
    uses: ["lines"],
    fn: function (el, tl, at, o) {
      var L = MW.lines(el, "words").lines, inner = [];
      L.forEach(function (l) {
        var s = document.createElement("span"); s.style.display = "inline-block";
        while (l.firstChild) s.appendChild(l.firstChild);
        l.appendChild(s); l.style.overflow = "hidden"; l.style.padding = "0.22em 0.08em"; l.style.margin = "-0.22em -0.08em"; inner.push(s);
      });
      inner.forEach(function (s, i) { tl.fromTo(s, { yPercent: 135 }, { yPercent: 0, duration: o.duration, ease: o.ease, immediateRender: true }, at + i * o.stagger); });
      if (o.exit != null) inner.forEach(function (s, i) { tl.to(s, { yPercent: -135, duration: 0.6, ease: "power2.in", immediateRender: false }, at + o.exit + i * o.stagger); });
      return at + o.duration + (L.length - 1) * o.stagger;
    },
    options: { duration: "s per line (1)", stagger: "s between lines (0.1)", ease: "expo.out (cubic-bezier(.16,1,.3,1))", exit: "s after the start to rise out (null: stay)" },
    defaults: { duration: 1, stagger: 0.1, ease: "expo.out", exit: null },
    demo: H("Mỗi dòng trồi lên<br>khỏi mặt nạ riêng<br>rồi dừng thật êm", `MW.textLineMaskRise(q(".tk-head"), tl, 0.3, { exit: 2.6 });`, 4, { size: 116 }),
  }),

  T("text/char-mask-rise", {
    uses: ["lines"],
    fn: function (el, tl, at, o) {
      var S = MW.lines(el, "chars"), n = S.chars.length, st = Math.min(o.stagger, 0.9 / Math.max(1, n - 1));
      S.lines.forEach(function (l) { l.style.overflow = "hidden"; l.style.padding = "0.22em 0.08em"; l.style.margin = "-0.22em -0.08em"; });
      S.chars.forEach(function (c, i) { tl.fromTo(c, { yPercent: 135 }, { yPercent: 0, duration: o.duration, ease: "power2.out", immediateRender: true }, at + i * st); });
      if (o.exit != null) S.chars.forEach(function (c, i) { tl.to(c, { yPercent: -135, duration: 0.4, ease: "power2.in", immediateRender: false }, at + o.exit + i * st); });
      return at + o.duration + (n - 1) * st;
    },
    options: { duration: "s per character (0.5), ease-out cubic", stagger: "s (0.035, capped so the line takes ≤ 0.9 s)", exit: "s after the start to leave upward (null: stay)" },
    defaults: { duration: 0.5, stagger: 0.035, exit: null },
    demo: H("Chuyển động có chủ đích", `MW.textCharMaskRise(q(".tk-head"), tl, 0.3, { exit: 2.2 });`, 3.6),
  }),

  T("text/slide-x-mask", {
    uses: ["split", "mask"],
    fn: function (el, tl, at, o) {
      var ch = MW.split(el, "chars").chars, n = ch.length, st = Math.min(o.stagger, 0.6 / Math.max(1, n - 1));
      MW.mask(ch, 0.22);
      ch.forEach(function (c, i) { tl.fromTo(c, { xPercent: 105 }, { xPercent: 0, duration: o.duration, ease: "expo.out", immediateRender: true }, at + i * st); });
      if (o.exit != null) ch.forEach(function (c, i) { tl.to(c, { xPercent: -105, duration: 0.5, ease: "expo.in", immediateRender: false }, at + o.exit + i * st); });
      return at + o.duration + (n - 1) * st;
    },
    options: { duration: "s per character (0.8), expo.out", stagger: "s (0.042, capped 0.6 s in all)", exit: "s after the start to slide out left (null: stay)" },
    defaults: { duration: 0.8, stagger: 0.042, exit: null },
    demo: H("Trượt vào từng chữ", `MW.textSlideXMask(q(".tk-head"), tl, 0.3, { exit: 2.3 });`, 3.8),
  }),

  T("text/split-halves", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      var html = el.innerHTML; el.innerHTML = "";
      el.style.position = "relative";
      var A = document.createElement("span"), B = document.createElement("span");
      A.style.display = "block"; A.innerHTML = html; B.innerHTML = html; B.style.cssText = "display:block;position:absolute;left:0;top:0;width:100%;";
      el.appendChild(A); el.appendChild(B);
      A.style.clipPath = "inset(-0.4em -0.2em " + (100 - o.split) + "% -0.2em)"; B.style.clipPath = "inset(" + o.split + "% -0.2em -0.3em -0.2em)";
      var tint = o.tint ? gsap.utils.interpolate(o.tint, getComputedStyle(el).color) : null;
      if (tint) MW.drive(tl, at, 1.2, function (t) { B.style.color = tint(Math.max(0, Math.min(1, (t - 0.7) / 0.4))); });
      tl.fromTo(A, { x: -o.distance }, { x: 0, duration: o.duration, ease: "expo.out", immediateRender: true }, at);
      tl.fromTo(B, { x: o.distance }, { x: 0, duration: o.duration, ease: "expo.out", immediateRender: true }, at);
      if (o.exit != null) { tl.to(A, { x: o.distance, duration: 0.5, ease: "expo.in" }, at + o.exit); tl.to(B, { x: -o.distance, duration: 0.5, ease: "expo.in" }, at + o.exit); }
      return at + o.duration;
    },
    options: { distance: "px each half slides (600; 200 on the small frame)", duration: "s (0.7), expo.out", split: "% of the line height where the halves meet (52)", tint: "colour of the lower half that fades to the text colour 0.7-1.1 s in (null: none)", exit: "s after the start to slide apart (0.5 s expo.in; null: stay)" },
    defaults: { distance: 600, duration: 0.7, split: 52, tint: null, exit: null },
    demo: H("KHỚP NỐI HOÀN HẢO", `MW.textSplitHalves(q(".tk-head"), tl, 0.3, { tint: "#8b7bff", exit: 2.5 });`, 3.8, { size: 140 }),
  }),

  T("text/soft-mask-wipe", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      var out = gsap.parseEase("power2.out"), io = gsap.parseEase("power2.inOut"), F = o.feather;
      var end = o.exit == null ? o.duration : o.exit + o.duration;
      return MW.drive(tl, at, end, function (t) {
        var W = el.offsetWidth, m;
        if (o.exit == null || t < o.exit) { var e = -F + (W + 2 * F) * out(Math.min(1, t / o.duration)); m = "linear-gradient(90deg, #000 " + (e - F / 2) + "px, transparent " + (e + F / 2) + "px)"; }
        else { var x = -F + (W + 2 * F) * io(Math.min(1, (t - o.exit) / o.duration)); m = "linear-gradient(90deg, transparent " + (x - F / 2) + "px, #000 " + (x + F / 2) + "px)"; }
        el.style.webkitMaskImage = m; el.style.maskImage = m;
      });
    },
    options: { duration: "s (1.2), ease-out cubic", feather: "px of the soft edge (240; 70 in the small demo)", exit: "s after the start when a second edge hides it left to right (1.2 s ease-in-out; null: stay)" },
    defaults: { duration: 1.2, feather: 240, exit: null },
    demo: H("Hiện dần qua mép mềm", `MW.textSoftMaskWipe(q(".tk-head"), tl, 0.3, { exit: 2.5 });`, 4.2),
  }),

  T("text/bar-wipe", {
    uses: ["lines", "drive"],
    fn: function (el, tl, at, o) {
      var L = MW.lines(el, "words").lines, io = gsap.parseEase("power2.inOut"), parts = [];
      L.forEach(function (l) {
        var s = document.createElement("span"); s.style.display = "inline-block"; while (l.firstChild) s.appendChild(l.firstChild); l.appendChild(s);
        l.style.position = "relative"; var b = document.createElement("span");
        b.style.cssText = "position:absolute;top:-3%;height:106%;pointer-events:none;background:" + o.color + ";transform-origin:0 50%;"; l.appendChild(b); parts.push({ l: l, s: s, b: b });
      });
      var each = 2 * o.duration, end = (L.length - 1) * o.stagger + each + (o.exit == null ? 0 : o.exit);
      return MW.drive(tl, at, end, function (t) {
        parts.forEach(function (p, i) {
          var w = p.s.offsetWidth, x0 = p.s.offsetLeft - o.overhang, W = w + 2 * o.overhang, u = t - i * o.stagger, lead, trail, clipL = 0, clipR = 0;
          p.b.style.left = x0 + "px"; p.b.style.width = W + "px";
          if (o.exit != null && u >= o.exit) {
            var v = u - o.exit;
            if (v < o.duration) { lead = W * io(v / o.duration); trail = 0; clipL = lead; } else { trail = W * io(Math.min(1, (v - o.duration) / o.duration)); lead = W; clipL = W; }
          } else if (u < o.duration) { lead = W * io(Math.max(0, u) / o.duration); trail = 0; clipR = W; }
          else { trail = W * io(Math.min(1, (u - o.duration) / o.duration)); lead = W; clipR = W - trail; }
          gsap.set(p.b, { x: trail, scaleX: Math.max(0, (lead - trail) / W) });
          // the text shows left of the bar's trailing edge on the way in, right of its leading edge on the way out
          var a = Math.max(0, clipL - o.overhang), b = Math.max(0, clipR - o.overhang);
          p.s.style.clipPath = "inset(-0.5em " + Math.min(w, b) + "px -0.5em " + Math.min(w, a) + "px)";
          if (u <= 0) p.s.style.clipPath = "inset(-0.5em " + w + "px -0.5em 0px)";
        });
      });
    },
    options: { duration: "s the bar grows, then the same to pull away (0.4 + 0.4)", stagger: "s between lines (0.08)", overhang: "px past each side (24)", color: "bar colour", exit: "s after the start for the mirrored exit (null: stay)" },
    defaults: { duration: 0.4, stagger: 0.08, overhang: 24, color: "#8b7bff", exit: null },
    demo: H("Thanh màu quét qua<br>chữ hiện ngay sau", `MW.textBarWipe(q(".tk-head"), tl, 0.3, { exit: 2.4 });`, 4, { size: 120 }),
  }),

  T("text/iris-reveal", {
    uses: ["drive", "eases"],
    fn: function (el, tl, at, o) {
      var ease = MW.ez(o.ease), host = el.parentNode, rim = document.createElement("div");
      if (getComputedStyle(host).position === "static") host.style.position = "relative";
      rim.style.cssText = "position:absolute;pointer-events:none;border-radius:50%;box-sizing:border-box;border:" + o.rim + "px solid " + o.color + ";opacity:0;"; host.appendChild(rim);
      var end = o.close == null ? o.duration : o.close + o.duration;
      return MW.drive(tl, at, end, function (t) {
        var w = el.offsetWidth, h = el.offsetHeight, cx = o.x * w, cy = o.y * h, R = Math.max(Math.hypot(cx, cy), Math.hypot(w - cx, cy), Math.hypot(cx, h - cy), Math.hypot(w - cx, h - cy)) * 1.05;
        var p = o.close != null && t >= o.close ? 1 - ease(Math.min(1, (t - o.close) / o.duration)) : ease(Math.min(1, t / o.duration)), r = R * p;
        el.style.clipPath = "circle(" + r + "px at " + cx + "px " + cy + "px)";
        rim.style.left = (el.offsetLeft + cx - r) + "px"; rim.style.top = (el.offsetTop + cy - r) + "px"; rim.style.width = rim.style.height = 2 * r + "px";
        rim.style.opacity = p > 0 && p < 0.92 ? String(Math.min(1, (0.92 - p) / 0.15)) : "0";
      });
    },
    options: { x: "centre, 0-1 of the text's width (0.3)", y: "0-1 of its height (0.5)", duration: "s (0.8)", ease: "cubic-bezier(.7,0,.3,1)", rim: "px of the accent rim (4.5)", color: "rim colour", close: "s after the start to close the same way (null: stay)" },
    defaults: { x: 0.3, y: 0.5, duration: 0.8, ease: "cubic-bezier(.7,0,.3,1)", rim: 4.5, color: "#8b7bff", close: null },
    demo: demo(ui(`<div class="ui-card" style="width:1400px;height:440px;display:grid;place-items:center;overflow:hidden"><h1 class="tk-head ir" style="font-size:120px;margin:0">Bấm để mở ra</h1></div>${CURSOR}`,
      ".tk-head { font-weight: 800; letter-spacing: -0.03em; text-align: center; }"),
      `var c = q(".ui-cursor"); tl.fromTo(c, { x: 1200, y: 900 }, { x: 690, y: 520, duration: 0.45, ease: "power2.inOut", immediateRender: true }, 0.05); tl.to(c, { scale: 0.9, duration: 0.08, yoyo: true, repeat: 1 }, 0.5);
MW.textIrisReveal(q(".ir"), tl, 0.7, { close: 2.2 });`, 4.2),
  }),

  T("transition/shape-mask-cut", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      var out = o.from ? MW.el(o.from) : el.previousElementSibling, root = el.parentNode, W = el.offsetWidth, Hh = el.offsetHeight, ease = gsap.parseEase(o.ease), N = 10;
      var c = o.center ? MW.el(o.center).getBoundingClientRect() : null, rb = root.getBoundingClientRect(), cx = c ? c.left - rb.left + c.width / 2 : W / 2, cy = c ? c.top - rb.top + c.height / 2 : Hh / 2;
      var NS = "http://www.w3.org/2000/svg", svg = document.createElementNS(NS, "svg"), pl = document.createElementNS(NS, "polygon");
      svg.setAttribute("width", W); svg.setAttribute("height", Hh); svg.style.cssText = "position:absolute;left:0;top:0;pointer-events:none;z-index:6;";
      pl.setAttribute("fill", "none"); pl.setAttribute("stroke", o.outline); pl.setAttribute("stroke-width", o.stroke); svg.appendChild(pl); root.appendChild(svg);
      var R = Math.hypot(W, Hh), r0 = o.start;
      var star = function (r, rot) { var pts = []; for (var i = 0; i < N; i++) { var a = rot + (i / N) * 2 * Math.PI - Math.PI / 2, rr = i % 2 ? r * o.inner : r; pts.push([cx + rr * Math.cos(a), cy + rr * Math.sin(a)]); } return pts; };
      var end = o.back == null ? o.duration : o.back + o.duration;
      return MW.drive(tl, at, end, function (t) {
        var p = o.back != null && t >= o.back ? 1 - ease(Math.min(1, (t - o.back) / o.duration)) : ease(Math.min(1, t / o.duration));
        var r = r0 + (R / o.inner * 1.1 - r0) * p, pts = star(r, (o.rotate * Math.PI / 180) * p), s = pts.map(function (q) { return q[0] + "px " + q[1] + "px"; }).join(",");
        var full = p >= 1;
        el.style.clipPath = full ? "none" : p <= 0 ? "polygon(0 0, 0 0, 0 0)" : "polygon(" + s + ")"; el.style.visibility = "visible";
        pl.setAttribute("points", pts.map(function (q) { return q[0] + "," + q[1]; }).join(" ")); svg.style.visibility = p > 0 && r * o.inner < R ? "visible" : "hidden";
        if (out) out.style.visibility = full ? "hidden" : "visible";
      });
    },
    options: { duration: "s (0.6), ease-in", ease: "power2.in (cubic)", start: "px of the star at the start (0; the recipe 0.4 em)", inner: "inner radius ÷ outer (0.45)", rotate: "degrees it turns while growing (30)", center: "element the star is centred on (the frame's centre)", outline: "outline colour", stroke: "px (4.5)", back: "s after the start to shrink back (null: stay)", from: "the outgoing scene" },
    defaults: { duration: 0.6, ease: "power2.in", start: 0, inner: 0.45, rotate: 30, center: null, outline: "#0b0d12", stroke: 4.5, back: null, from: null },
    demo: {
      duration: 4.8,
      css: `#demo { background: #0b0d12; color: #e8ebf3; }
.sm { position: absolute; inset: 0; display: grid; place-items: center; text-align: center; }
.sm-a { background: radial-gradient(120% 120% at 50% 30%, #1b2440, #0b0d12); } .sm-b { background: radial-gradient(120% 120% at 50% 30%, #a28cff, #5232d8); }
.sm h2 { margin: 0; font-size: 150px; font-weight: 800; letter-spacing: -0.03em; } .sm p { margin: 18px 0 0; font-size: 44px; opacity: 0.75; }`,
      html: `<section class="sm sm-a"><div><h2>Phần I</h2><p>Câu chuyện bắt đầu</p></div></section><section class="sm sm-b"><div><h2>Phần II</h2><p>Mọi thứ thay đổi</p></div></section>`,
      run: `MW.transitionShapeMaskCut(q(".sm-b"), tl, 1.2, { back: 1.8 });`,
    },
  }),

  T("text/blinds-reveal", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      var html = el.innerHTML, n = o.slats, strips = [], fin = gsap.parseEase("power1.out"), fout = gsap.parseEase("power1.in");
      el.style.position = "relative";
      for (var i = 0; i < n; i++) { var s = document.createElement("div"); s.innerHTML = html; s.style.cssText = "position:absolute;left:0;top:0;width:100%;pointer-events:none;"; el.appendChild(s); strips.push(s); }
      var orig = []; Array.prototype.slice.call(el.childNodes).forEach(function (c) { if (strips.indexOf(c) < 0) orig.push(c); });
      var wrap = document.createElement("span"); wrap.style.visibility = "hidden"; el.insertBefore(wrap, el.firstChild); orig.forEach(function (c) { wrap.appendChild(c); });
      var end = (n - 1) * o.stagger + o.duration + (o.exit == null ? 0 : o.exit);
      return MW.drive(tl, at, end, function (t) {
        var fs = parseFloat(getComputedStyle(el).fontSize), top = -0.3 * fs, bot = el.offsetHeight + 0.2 * fs, h = (bot - top) / n;
        strips.forEach(function (s, i) {
          var u = t - i * o.stagger, y0 = top + i * h, a, b;
          if (o.exit != null && u >= o.exit) { var q = fout(Math.min(1, (u - o.exit) / 0.5)); a = y0 + h * q; b = y0 + h; }
          else { var p = fin(Math.max(0, Math.min(1, u / o.duration))); a = y0; b = y0 + h * p; }
          s.style.clipPath = "inset(" + a + "px -0.3em " + Math.max(0, el.offsetHeight - b) + "px -0.3em)";
          if (b >= el.offsetHeight + 0.2 * fs - 0.5) s.style.clipPath = "inset(" + a + "px -0.3em -" + (0.3 * fs) + "px -0.3em)";
          s.style.visibility = b - a > 0.2 ? "visible" : "hidden";
        });
      });
    },
    options: { slats: "horizontal strips (10)", duration: "s each strip opens from its top edge (0.6), ease-out quad", stagger: "s (0.05)", exit: "s after the start when each strip folds to its bottom edge (0.5 s ease-in; null: stay)" },
    defaults: { slats: 10, duration: 0.6, stagger: 0.05, exit: null },
    demo: H("Mười nan rèm<br>mở lần lượt", `MW.textBlindsReveal(q(".tk-head"), tl, 0.3, { exit: 2.5 });`, 4, { size: 150 }),
  }),

  T("text/diagonal-cut", {
    uses: ["split", "drive"],
    fn: function (el, tl, at, o) {
      var ws = MW.split(el, "words").words, tn = Math.tan(o.angle * Math.PI / 180), ex = gsap.parseEase("expo.out"), ei = gsap.parseEase("expo.in"), blades = [];
      el.style.position = "relative";
      ws.forEach(function () { var b = document.createElement("div"); b.style.cssText = "position:absolute;pointer-events:none;width:" + o.blade + "px;background:" + o.color + ";opacity:0;transform-origin:50% 100%;"; el.appendChild(b); blades.push(b); });
      var end = (ws.length - 1) * o.stagger + o.duration + (o.exit == null ? 0.3 : o.exit + 0.5 + (ws.length - 1) * 0.08);
      return MW.drive(tl, at, end, function (t) {
        ws.forEach(function (w, i) {
          var fs = parseFloat(getComputedStyle(w).fontSize), wh = w.offsetHeight + 0.6 * fs, top = -0.35 * fs, lean = wh * tn, W = w.offsetWidth;
          var u = t - i * o.stagger, ue = o.exit == null ? -1 : t - o.exit - i * 0.08, pts;
          if (ue >= 0) { var x = -lean + (W + 2 * lean) * ei(Math.min(1, ue / 0.5)); pts = [[x + lean, top], [W + lean + 20, top], [W + lean + 20, top + wh], [x, top + wh]]; }
          else { var e = -lean + (W + 2 * lean + 10) * ex(Math.max(0, Math.min(1, u / o.duration))); pts = [[-20, top], [e + lean, top], [e, top + wh], [-20, top + wh]]; if (u <= 0) pts = [[0, 0], [0, 0], [0, 0], [0, 0]]; }
          w.style.clipPath = "polygon(" + pts.map(function (q) { return q[0] + "px " + q[1] + "px"; }).join(",") + ")";
          var b = blades[i], bx = ue >= 0 ? pts[0][0] : pts[1][0];
          b.style.left = (w.offsetLeft + bx - o.blade / 2 - lean / 2) + "px"; b.style.top = (w.offsetTop + top) + "px"; b.style.height = wh / Math.cos(o.angle * Math.PI / 180) + "px";
          gsap.set(b, { rotation: o.angle, transformOrigin: "50% 0%" });
          var fade = u < 0 ? 0 : u < 0.6 ? 1 : Math.max(0, 1 - (u - 0.6) / 0.3); b.style.opacity = String(ue >= 0 ? 0 : fade);
        });
      });
    },
    options: { angle: "degrees the edge leans (15)", duration: "s per word (0.7), expo.out", stagger: "s between words (0.12)", blade: "px of the accent blade (12)", color: "blade colour", exit: "s after the start when the edge sweeps on, hiding (0.5 s expo.in, 0.08 s apart; null: stay)" },
    defaults: { angle: 15, duration: 0.7, stagger: 0.12, blade: 12, color: "#8b7bff", exit: null },
    demo: H("Cắt chéo từng từ", `MW.textDiagonalCut(q(".tk-head"), tl, 0.3, { exit: 2.4 });`, 3.8, { size: 150 }),
  }),

  T("text/outline-fill-sweep", {
    uses: ["drive", "eases"],
    fn: function (el, tl, at, o) {
      var ol = el.cloneNode(true), edge = document.createElement("div"), ease = MW.ez(o.ease), sw = o.stroke;
      el.style.position = "relative"; ol.removeAttribute("id"); ol.style.position = "absolute"; ol.style.left = "0"; ol.style.top = "0"; ol.style.width = "100%"; ol.style.margin = "0"; ol.style.maxWidth = "none";
      ol.style.pointerEvents = "none"; ol.style.color = "transparent"; ol.style.webkitTextFillColor = "transparent";
      el.appendChild(ol); edge.style.cssText = "position:absolute;top:-0.15em;bottom:-0.15em;width:" + o.line + "px;background:" + o.color + ";pointer-events:none;opacity:0;"; el.appendChild(edge);
      // the filled text is the element's own; the outline copy sits on top
      var fill = Array.prototype.slice.call(el.childNodes).filter(function (n) { return n !== ol && n !== edge; }), wrap = document.createElement("span");
      wrap.style.display = "inline-block"; el.insertBefore(wrap, el.firstChild); fill.forEach(function (n) { wrap.appendChild(n); });
      var col = getComputedStyle(el).color, end = o.exit == null ? 0.5 + o.delay + o.duration : o.exit + 0.9;
      return MW.drive(tl, at, end, function (t) {
        var W = wrap.offsetWidth, a = Math.min(1, t / 0.5), p = ease(Math.max(0, Math.min(1, (t - o.delay) / o.duration))), right = W * (1 - p), left = 0, olo = a;
        if (o.exit != null && t >= o.exit) { var q = ease(Math.min(1, (t - o.exit) / 0.6)); left = W * q; right = 0; olo = t > o.exit + 0.6 ? Math.max(0, 1 - (t - o.exit - 0.6) / 0.3) : 1; }
        ol.style.webkitTextStroke = (sw * a) + "px " + col; ol.style.opacity = String(olo);
        wrap.style.clipPath = "inset(-0.4em " + right + "px -0.4em " + left + "px)";
        var ex = o.exit != null && t >= o.exit ? left : W - right, on = (p > 0 && p < 1) || (o.exit != null && t >= o.exit && left > 0 && left < W);
        edge.style.left = (wrap.offsetLeft + ex - o.line / 2) + "px"; edge.style.opacity = on ? "1" : "0";
      });
    },
    options: { stroke: "px of the outline (4)", delay: "s from the outline's start to the fill (0.7)", duration: "s of the fill sweep (1)", ease: "css-in-out, cubic-bezier(.42,0,.58,1)", line: "px of the accent edge line (4)", color: "edge colour", exit: "s after the start: the fill wipes off left to right in 0.6 s, then the outline fades (null: stay)" },
    defaults: { stroke: 4, delay: 0.7, duration: 1, ease: "css-in-out", line: 4, color: "#8b7bff", exit: null },
    demo: H("Viền trước, ruột sau", `MW.textOutlineFillSweep(q(".tk-head"), tl, 0.2, { exit: 2.9 });`, 4.2, { size: 150, weight: 900 }),
  }),

  T("text/texture-fill", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      var waves = "data:image/svg+xml," + encodeURIComponent("<svg xmlns='http://www.w3.org/2000/svg' width='240' height='60'><path d='M0 30 Q30 10 60 30 T120 30 T180 30 T240 30' fill='none' stroke='rgba(255,255,255,0.35)' stroke-width='5'/></svg>");
      var bubbles = "data:image/svg+xml," + encodeURIComponent("<svg xmlns='http://www.w3.org/2000/svg' width='300' height='300'><g fill='rgba(255,255,255,0.5)'><circle cx='40' cy='60' r='9'/><circle cx='150' cy='200' r='14'/><circle cx='240' cy='110' r='7'/><circle cx='90' cy='260' r='5'/><circle cx='200' cy='30' r='11'/></g></svg>");
      if (!o.image) { el.style.backgroundImage = "url(\"" + bubbles + "\"), url(\"" + waves + "\"), linear-gradient(90deg, " + o.colors.join(", ") + ")"; el.style.backgroundSize = "300px 300px, 240px 60px, 200% 100%"; }
      else { el.style.backgroundImage = "url(" + o.image + ")"; el.style.backgroundSize = "200% auto"; }
      el.style.webkitBackgroundClip = "text"; el.style.backgroundClip = "text"; el.style.color = "transparent"; el.style.webkitTextFillColor = "transparent";
      // the fill paints only inside the box: room above and below for Vietnamese marks
      el.style.paddingTop = "0.3em"; el.style.paddingBottom = "0.12em"; el.style.marginTop = "-0.3em"; el.style.marginBottom = "-0.12em";
      return MW.drive(tl, at, o.duration, function (t) {
        var c = (t / o.period) % 2, pp = c < 1 ? c : 2 - c;
        if (!o.image) el.style.backgroundPosition = "0px " + (-t * 60) + "px, " + (t * 20) + "px 0px, " + (pp * 100) + "% 50%";
        else el.style.backgroundPosition = (pp * 100) + "% 50%";
      });
    },
    options: { image: "a picture to run inside the letters (an assets/ path); none: a drawn pattern (gradient, wavy lines, rising bubbles)", colors: "the pattern's gradient", period: "s for one pass across, ping-pong (20; 0 → 100 % in 20 s)", duration: "s it runs" },
    defaults: { image: null, colors: ["#2f6bff", "#8b7bff", "#3dd6f5", "#2f6bff"], period: 20, duration: 5 },
    demo: H("BIỂN XANH", `MW.textTextureFill(q(".tk-head"), tl, 0, { duration: 5, period: 6 });`, 5, { size: 300, weight: 900 }),
  }),
];
