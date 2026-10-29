// TakayuStudio, Transitions (batch 3.1): scene changes written here from the site's ideas and numbers (no code of the site). Each is called
// on the incoming scene: MW.<name>(incoming, tl, at, { from: outgoing }); the outgoing scene defaults to the incoming's previous sibling.
// Both scenes fill the same box; everything is a function of the film's time (MW.drive), so a frame seeks exactly.
import { T } from "../../takayu/define.mjs";
import { scenes, demo } from "../../takayu/stages.mjs";

const D = (run, duration = 3, opts = {}, css = "") => demo(scenes(opts), run, duration, css);
const RUN = (name, at = 1.1, opts = "{}") => `MW.${name}(q(".tk-b"), tl, ${at}, ${opts});`;

export default [
  T("transition/hard-cut", {
    fn: function (el, tl, at, o) {
      var out = o.from ? MW.el(o.from) : el.previousElementSibling;
      gsap.set(el, { autoAlpha: 0 });
      tl.set(el, { autoAlpha: 1 }, at);
      if (out) tl.set(out, { autoAlpha: 0 }, at);
      return at;
    },
    options: { from: "the outgoing scene (the previous sibling)" }, defaults: { from: null },
    demo: D(RUN("transitionHardCut", 1.5), 3),
  }),

  T("transition/crossfade", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      var out = o.from ? MW.el(o.from) : el.previousElementSibling, ease = gsap.parseEase(o.ease);
      return MW.drive(tl, at, o.duration, function (t) {
        var p = t / o.duration;
        el.style.opacity = ease(p); el.style.visibility = p > 0 ? "visible" : "hidden";
        if (out) out.style.visibility = p >= 1 ? "hidden" : "visible";
      });
    },
    options: { duration: "s (0.5)", ease: "none, or sine.inOut as the site's demo", from: "the outgoing scene" }, defaults: { duration: 0.5, ease: "none", from: null },
    demo: D(RUN("transitionCrossfade", 1.2, "{ duration: 0.5, ease: \"sine.inOut\" }"), 3),
  }),

  T("transition/blur-crossfade", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      var out = o.from ? MW.el(o.from) : el.previousElementSibling, ease = gsap.parseEase("sine.inOut");
      return MW.drive(tl, at, o.duration, function (t) {
        var p = t / o.duration, b = o.blur * Math.sin(Math.PI * p);
        el.style.opacity = ease(p); el.style.visibility = p > 0 ? "visible" : "hidden"; el.style.filter = b > 0.01 ? "blur(" + b + "px)" : "";
        if (out) { out.style.filter = b > 0.01 ? "blur(" + b + "px)" : ""; out.style.visibility = p >= 1 ? "hidden" : "visible"; }
      });
    },
    options: { duration: "s (0.6)", blur: "px at the peak, half-way (14; the site's demo 10, here ×4 for the film)", from: "the outgoing scene" },
    defaults: { duration: 0.6, blur: 40, from: null },
    demo: D(RUN("transitionBlurCrossfade", 1.2), 3),
  }),

  T("transition/push-slide", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      var out = o.from ? MW.el(o.from) : el.previousElementSibling, ease = gsap.parseEase(o.ease);
      var ax = o.direction === "left" || o.direction === "right" ? "x" : "y", s = o.direction === "right" || o.direction === "down" ? -1 : 1;
      var W = el.offsetWidth, H = el.offsetHeight, L = ax === "x" ? W : H;
      return MW.drive(tl, at, o.duration, function (t) {
        var p = ease(t / o.duration), a = s * L * (1 - p), b = -s * L * p;
        gsap.set(el, ax === "x" ? { x: a, y: 0 } : { y: a, x: 0 }); el.style.visibility = t > 0 ? "visible" : "hidden";
        if (out) gsap.set(out, ax === "x" ? { x: t > 0 ? b : 0 } : { y: t > 0 ? b : 0 });
      });
    },
    options: { duration: "s (0.4; 0.3-0.5)", direction: "where the new scene comes from: left (from the right, default), right, up, down", ease: "power2.inOut (cubic)", from: "the outgoing scene" },
    defaults: { duration: 0.4, direction: "left", ease: "power2.inOut", from: null },
    demo: D(RUN("transitionPushSlide", 1.2), 3),
  }),

  T("transition/whip-pan", {
    uses: ["drive", "eases"],
    fn: function (el, tl, at, o) {
      var out = o.from ? MW.el(o.from) : el.previousElementSibling, ease = MW.ez(o.ease), W = el.offsetWidth, ghosts = [];
      // four trailing copies of each scene (18 % opacity, spaced 4 % of the width × sin(πp)): the smear that hides the cut
      [el, out].forEach(function (sc) {
        if (!sc) return;
        for (var k = 1; k <= 4; k++) { var g = sc.cloneNode(true); g.removeAttribute("id"); g.style.opacity = "0"; g.style.pointerEvents = "none"; sc.parentNode.insertBefore(g, sc.nextSibling); ghosts.push({ g: g, sc: sc, k: k }); }
      });
      return MW.drive(tl, at, o.duration, function (t) {
        var u = t / o.duration, p = ease(u), sm = Math.sin(Math.PI * u), b = o.blur * sm;
        gsap.set(el, { x: W * (1 - p) }); el.style.visibility = u > 0 ? "visible" : "hidden"; el.style.filter = b > 0.05 ? "blur(" + b + "px)" : "";
        if (out) { gsap.set(out, { x: u > 0 ? -W * p : 0 }); out.style.filter = b > 0.05 ? "blur(" + b + "px)" : ""; out.style.visibility = u >= 1 ? "hidden" : "visible"; }
        ghosts.forEach(function (h) {
          var base = h.sc === el ? W * (1 - p) : -W * p;
          gsap.set(h.g, { x: base + h.k * 0.04 * W * sm }); h.g.style.opacity = u > 0 && u < 1 ? String(0.18 * sm) : "0"; h.g.style.filter = b > 0.05 ? "blur(" + b + "px)" : "";
        });
      });
    },
    options: { duration: "s (0.25, 8-14 frames)", ease: "whip, cubic-bezier(.9,0,.1,1)", blur: "px at the peak (8, ×2 here)", from: "the outgoing scene" },
    defaults: { duration: 0.25, ease: "whip", blur: 16, from: null },
    demo: D(RUN("transitionWhipPan", 1.3), 3),
  }),

  T("transition/linear-wipe", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      var out = o.from ? MW.el(o.from) : el.previousElementSibling, ease = gsap.parseEase(o.ease), W = el.offsetWidth, H = el.offsetHeight, bar = null;
      if (o.bar > 0) { bar = document.createElement("div"); bar.style.cssText = "position:absolute;pointer-events:none;background:" + o.color + ";"; el.parentNode.appendChild(bar); }
      return MW.drive(tl, at, o.duration, function (t) {
        var p = ease(t / o.duration), r = (1 - p) * 100, d = o.direction;
        var inset = d === "right" ? "0 " + r + "% 0 0" : d === "left" ? "0 0 0 " + r + "%" : d === "down" ? "0 0 " + r + "% 0" : "0 0 " + 0 + "% 0";
        if (d === "up") inset = r + "% 0 0 0";
        el.style.clipPath = "inset(" + inset + ")"; el.style.visibility = t > 0 ? "visible" : "hidden";
        if (out) out.style.visibility = p >= 1 ? "hidden" : "visible";
        if (bar) {
          var on = t > 0 && p < 1; bar.style.display = on ? "block" : "none";
          if (d === "right" || d === "left") { var x = d === "right" ? W * p : W * (1 - p); bar.style.left = (x - o.bar / 2) + "px"; bar.style.top = "0"; bar.style.width = o.bar + "px"; bar.style.height = H + "px"; }
          else { var y = d === "down" ? H * p : H * (1 - p); bar.style.top = (y - o.bar / 2) + "px"; bar.style.left = "0"; bar.style.height = o.bar + "px"; bar.style.width = W + "px"; }
        }
      });
    },
    options: { duration: "s (0.5)", direction: "the way the edge travels: right (default), left, up, down", bar: "px of the brand bar riding the edge (4; 0 for none; ×3 here)", color: "the bar's colour", ease: "power2.inOut", from: "the outgoing scene" },
    defaults: { duration: 0.5, direction: "right", bar: 12, color: "#ffb547", ease: "power2.inOut", from: null },
    demo: D(RUN("transitionLinearWipe", 1.2), 3),
  }),

  T("transition/inset-reveal", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      var out = o.from ? MW.el(o.from) : el.previousElementSibling, ease = gsap.parseEase(o.ease);
      if (o.reverse && out) out.parentNode.appendChild(out);
      return MW.drive(tl, at, o.duration, function (t) {
        var p = ease(t / o.duration);
        if (!o.reverse) { el.style.clipPath = "inset(" + (50 * (1 - p)) + "%)"; el.style.visibility = t > 0 ? "visible" : "hidden"; if (out) out.style.visibility = p >= 1 ? "hidden" : "visible"; }
        else if (out) { out.style.clipPath = "inset(" + (50 * p) + "%)"; out.style.visibility = p >= 1 ? "hidden" : "visible"; el.style.visibility = "visible"; }
      });
    },
    options: { duration: "s (0.5)", ease: "power2.inOut, or expo.out as the site's demo", reverse: "true: the outgoing scene closes to the centre instead", from: "the outgoing scene" },
    defaults: { duration: 0.5, ease: "power2.inOut", reverse: false, from: null },
    demo: D(RUN("transitionInsetReveal", 1.2, "{ ease: \"expo.out\", duration: 0.6 }"), 3),
  }),

  T("transition/clock-wipe", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      var out = o.from ? MW.el(o.from) : el.previousElementSibling, ease = gsap.parseEase(o.ease), N = 72;
      var W = el.offsetWidth, H = el.offsetHeight, R = Math.hypot(W, H), dir = o.clockwise ? 1 : -1, a0 = (o.start - 90) * Math.PI / 180;
      return MW.drive(tl, at, o.duration, function (t) {
        var p = ease(t / o.duration), pts = ["50% 50%"];
        // a pie with a fixed number of vertices (the clip's shape never changes its point count)
        for (var i = 0; i <= N; i++) { var a = a0 + dir * (p * 2 * Math.PI) * (i / N); pts.push((W / 2 + R * Math.cos(a)) + "px " + (H / 2 + R * Math.sin(a)) + "px"); }
        el.style.clipPath = p >= 1 ? "none" : "polygon(" + pts.join(",") + ")"; el.style.visibility = t > 0 ? "visible" : "hidden";
        if (out) out.style.visibility = p >= 1 ? "hidden" : "visible";
      });
    },
    options: { duration: "s (0.7)", start: "degrees from 12 o'clock (0)", clockwise: "true (default)", ease: "sine.inOut", from: "the outgoing scene" },
    defaults: { duration: 0.7, start: 0, clockwise: true, ease: "sine.inOut", from: null },
    demo: D(RUN("transitionClockWipe", 1.1), 3),
  }),

  T("transition/iris-open", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      var out = o.from ? MW.el(o.from) : el.previousElementSibling, ease = gsap.parseEase(o.ease), W = el.offsetWidth, H = el.offsetHeight;
      var cx = o.x * W, cy = o.y * H, R = Math.max(Math.hypot(cx, cy), Math.hypot(W - cx, cy), Math.hypot(cx, H - cy), Math.hypot(W - cx, H - cy));
      return MW.drive(tl, at, o.duration, function (t) {
        var p = ease(t / o.duration);
        el.style.clipPath = p >= 1 ? "none" : "circle(" + (R * p) + "px at " + cx + "px " + cy + "px)"; el.style.visibility = t > 0 ? "visible" : "hidden";
        if (out) out.style.visibility = p >= 1 ? "hidden" : "visible";
      });
    },
    options: { duration: "s (0.6; a 2-4 frame iris also works)", x: "centre, 0-1 of the width (0.5)", y: "centre, 0-1 of the height (0.5)", ease: "power2.in (cubic); the site's demo eases in-out", from: "the outgoing scene" },
    defaults: { duration: 0.6, x: 0.5, y: 0.5, ease: "power2.in", from: null },
    demo: D(RUN("transitionIrisOpen", 1.2), 3),
  }),

  T("transition/shape-iris", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      var out = o.from ? MW.el(o.from) : el.previousElementSibling, ease = gsap.parseEase(o.ease), W = el.offsetWidth, H = el.offsetHeight, N = 96, base = [];
      // the shape as a polygon with a fixed vertex count, unit size (a heart by default; a star or a diamond as options)
      for (var i = 0; i < N; i++) {
        var a = (i / N) * 2 * Math.PI, x, y;
        if (o.shape === "star") { var r = i % 2 ? 0.45 : 1, b = (i / N) * 2 * Math.PI; x = r * Math.sin(b); y = -r * Math.cos(b); }
        else if (o.shape === "diamond") { var q = (i / N) * 4, s = Math.floor(q), f = q - s, P = [[0, -1], [1, 0], [0, 1], [-1, 0], [0, -1]]; x = P[s][0] + (P[s + 1][0] - P[s][0]) * f; y = P[s][1] + (P[s + 1][1] - P[s][1]) * f; }
        else { x = Math.pow(Math.sin(a), 3); y = -(13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a)) / 16; }
        base.push([x, y]);
      }
      var size = o.size * W / 2, cover = Math.hypot(W, H) / (size * 0.5);
      return MW.drive(tl, at, o.duration, function (t) {
        var p = ease(t / o.duration), k = size * cover * p;
        el.style.clipPath = p >= 1 ? "none" : "polygon(" + base.map(function (v) { return (W / 2 + v[0] * k) + "px " + (H / 2 + v[1] * k) + "px"; }).join(",") + ")";
        el.style.visibility = t > 0 ? "visible" : "hidden"; if (out) out.style.visibility = p >= 1 ? "hidden" : "visible";
      });
    },
    options: { shape: "heart (default), star, diamond", size: "0-1 of the width at scale 1 (0.16)", duration: "s (0.7)", ease: "power2.in", from: "the outgoing scene" },
    defaults: { shape: "heart", size: 0.16, duration: 0.7, ease: "power2.in", from: null },
    demo: D(RUN("transitionShapeIris", 1.1, "{ duration: 0.9 }"), 3),
  }),

  T("transition/color-flood", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      var out = o.from ? MW.el(o.from) : el.previousElementSibling, W = el.offsetWidth, H = el.offsetHeight, cx = o.x * W, cy = o.y * H;
      var R = Math.max(Math.hypot(cx, cy), Math.hypot(W - cx, cy), Math.hypot(cx, H - cy), Math.hypot(W - cx, H - cy)), fin = gsap.parseEase("power2.in"), fout = gsap.parseEase("power2.out");
      var disc = document.createElement("div"); disc.style.cssText = "position:absolute;inset:0;pointer-events:none;background:" + o.color + ";"; el.parentNode.appendChild(disc);
      return MW.drive(tl, at, o.duration, function (t) {
        var h = o.duration / 2, r = t < h ? R * fin(t / h) : R * (1 - fout((t - h) / h));
        disc.style.clipPath = "circle(" + Math.max(0, r) + "px at " + cx + "px " + cy + "px)"; disc.style.visibility = t > 0 && t < o.duration ? "visible" : "hidden";
        el.style.visibility = t >= h ? "visible" : "hidden"; if (out) out.style.visibility = t >= h ? "hidden" : "visible";
      });
    },
    options: { duration: "s (0.8: 0.4 covering, 0.4 clearing)", x: "point, 0-1 of the width (0.12)", y: "0-1 of the height (0.8)", color: "the flood colour", from: "the outgoing scene" },
    defaults: { duration: 0.8, x: 0.12, y: 0.8, color: "#ffb547", from: null },
    demo: D(RUN("transitionColorFlood", 1.0), 3),
  }),

  T("transition/scale-through", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      var out = o.from ? MW.el(o.from) : el.previousElementSibling, ease = gsap.parseEase("power2.inOut"), T1 = 0.35 / 0.6 * o.duration, T0 = 0.25 / 0.6 * o.duration;
      return MW.drive(tl, at, o.duration, function (t) {
        var a = ease(Math.min(1, t / T1)), b = ease(Math.max(0, Math.min(1, (t - T0) / (o.duration - T0))));
        if (out) { gsap.set(out, { scale: t > 0 ? 1 + (o.scaleOut - 1) * a : 1, zIndex: t > 0 && t < o.duration ? 3 : "auto" }); out.style.opacity = t > 0 ? 1 - a : 1; out.style.visibility = t >= T1 ? "hidden" : "visible"; }
        gsap.set(el, { scale: t > 0 ? o.scaleIn + (1 - o.scaleIn) * b : 1 }); el.style.visibility = t > 0 ? "visible" : "hidden";
      });
    },
    options: { duration: "s (0.6)", scaleOut: "the outgoing scene grows to (1.3) while fading over 0-0.35 s", scaleIn: "the incoming starts at (0.8), 0.25-0.6 s", from: "the outgoing scene" },
    defaults: { duration: 0.6, scaleOut: 1.3, scaleIn: 0.8, from: null },
    demo: D(RUN("transitionScaleThrough", 1.2), 3),
  }),

  T("transition/blinds", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      var out = o.from ? MW.el(o.from) : el.previousElementSibling, ease = gsap.parseEase("power2.out"), W = el.offsetWidth, H = el.offsetHeight, n = o.slats, sw = W / n;
      var total = (n - 1) * o.stagger + o.each;
      return MW.drive(tl, at, total, function (t) {
        // the union of the slats as one polygon: each slat drawn from the bottom edge, joined along it (zero-area threads)
        var pts = [], done = true;
        for (var i = 0; i < n; i++) {
          var p = ease(Math.max(0, Math.min(1, (t - i * o.stagger) / o.each))), x0 = i * sw, x1 = x0 + sw * p + (p > 0 ? 0.5 : 0);
          if (p < 1) done = false;
          pts.push(x0 + "px " + H + "px", x0 + "px 0px", x1 + "px 0px", x1 + "px " + H + "px");
        }
        el.style.clipPath = done ? "none" : "polygon(" + pts.join(",") + ")"; el.style.visibility = t > 0 ? "visible" : "hidden";
        if (out) out.style.visibility = done ? "hidden" : "visible";
      });
    },
    options: { slats: "vertical slats (7)", stagger: "s between slats, left to right (0.05)", each: "s each slat takes to open from its left edge (0.4)", from: "the outgoing scene" },
    defaults: { slats: 7, stagger: 0.05, each: 0.4, from: null },
    demo: D(RUN("transitionBlinds", 1.2), 3),
  }),

  T("transition/block-cover", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      var out = o.from ? MW.el(o.from) : el.previousElementSibling, W = el.offsetWidth, H = el.offsetHeight, cw = W / o.cols, ch = H / o.rows, tiles = [];
      var grid = document.createElement("div"); grid.style.cssText = "position:absolute;inset:0;pointer-events:none;z-index:5;"; el.parentNode.appendChild(grid);
      for (var j = 0; j < o.rows; j++) for (var i = 0; i < o.cols; i++) {
        var d = document.createElement("div"); d.style.cssText = "position:absolute;left:" + (i * cw - 0.5) + "px;top:" + (j * ch - 0.5) + "px;width:" + (cw + 1) + "px;height:" + (ch + 1) + "px;background:" + o.color + ";transform:scale(0);";
        grid.appendChild(d); tiles.push({ d: d, k: i + j });
      }
      var fin = gsap.parseEase("power2.out"), fout = gsap.parseEase("power2.in"), half = o.duration / 2;
      return MW.drive(tl, at, o.duration, function (t) {
        tiles.forEach(function (x) {
          var s0 = x.k * o.stagger, s;
          if (t < half) s = fin(Math.max(0, Math.min(1, (t - s0) / o.each)));
          else s = 1 - fout(Math.max(0, Math.min(1, (t - half - s0) / o.each)));
          x.d.style.transform = "scale(" + s + ")";
        });
        grid.style.visibility = t > 0 && t < o.duration ? "visible" : "hidden";
        el.style.visibility = t >= half ? "visible" : "hidden"; if (out) out.style.visibility = t >= half ? "hidden" : "visible";
      });
    },
    options: { cols: "8", rows: "5", stagger: "s per diagonal step (0.01)", each: "s each tile scales (0.25)", duration: "s (0.8: cover, cut at the middle, clear)", color: "tile colour", from: "the outgoing scene" },
    defaults: { cols: 8, rows: 5, stagger: 0.01, each: 0.25, duration: 0.8, color: "#8b7bff", from: null },
    demo: D(RUN("transitionBlockCover", 1.0), 3),
  }),

  T("transition/pixel-dissolve", {
    uses: ["drive", "rand"],
    fn: function (el, tl, at, o) {
      var out = o.from ? MW.el(o.from) : el.previousElementSibling, W = el.offsetWidth, H = el.offsetHeight, c = o.cell * W, cols = Math.ceil(W / c), rows = Math.ceil(H / c);
      var r = MW.rand(o.seed), cells = [];
      for (var j = 0; j < rows; j++) for (var i = 0; i < cols; i++) cells.push({ x: i * c, y: j * c, th: r() });
      return MW.drive(tl, at, o.duration, function (t) {
        var p = t / o.duration, pts = ["0px 0px"], all = true;
        // the cells already switched, as one polygon: each cell joined to the corner by a zero-area thread
        for (var k = 0; k < cells.length; k++) {
          var q = cells[k]; if (q.th >= p) { all = false; continue; }
          pts.push(q.x + "px " + q.y + "px", (q.x + c) + "px " + q.y + "px", (q.x + c) + "px " + (q.y + c) + "px", q.x + "px " + (q.y + c) + "px", q.x + "px " + q.y + "px", "0px 0px");
        }
        el.style.clipPath = all ? "none" : pts.length < 3 ? "inset(50%)" : "polygon(" + pts.join(",") + ")"; el.style.visibility = t > 0 ? "visible" : "hidden";
        if (out) out.style.visibility = all ? "hidden" : "visible";
      });
    },
    options: { cell: "cell size, 0-1 of the width (0.05)", duration: "s (0.6), linear", seed: "the cells' order" },
    defaults: { cell: 0.05, duration: 0.6, seed: 7, from: null },
    demo: D(RUN("transitionPixelDissolve", 1.2), 3),
  }),

  T("transition/shape-morph-bridge", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      var out = o.from ? MW.el(o.from) : el.previousElementSibling, ease = gsap.parseEase("power2.inOut"), N = 64, root = el.parentNode;
      var box = root.getBoundingClientRect(), A = (o.fromShape ? MW.el(o.fromShape) : out.querySelector(".tk-mark")).getBoundingClientRect();
      var vis = el.style.visibility; el.style.visibility = "hidden"; var B = (o.toShape ? MW.el(o.toShape) : el.querySelector(".tk-mark")).getBoundingClientRect(); el.style.visibility = vis;
      var veil = document.createElement("div"); veil.style.cssText = "position:absolute;inset:0;pointer-events:none;z-index:6;background:" + o.veil + ";opacity:0;"; root.appendChild(veil);
      var shp = document.createElement("div"); shp.style.cssText = "position:absolute;inset:0;pointer-events:none;z-index:7;background:" + o.color + ";visibility:hidden;"; root.appendChild(shp);
      var cA = [A.left - box.left + A.width / 2, A.top - box.top + A.height / 2, A.width / 2], cB = [B.left - box.left + B.width / 2, B.top - box.top + B.height / 2, B.width / 2];
      var circ = [], sq = [];
      for (var i = 0; i < N; i++) {
        var a = (i / N) * 2 * Math.PI - Math.PI / 4; circ.push([Math.cos(a), Math.sin(a)]);
        // the same angle on the square's outline (a square of half-size 1 with corners cut round a little)
        var m = Math.max(Math.abs(Math.cos(a)), Math.abs(Math.sin(a))); sq.push([Math.cos(a) / m, Math.sin(a) / m]);
      }
      return MW.drive(tl, at, o.duration, function (t) {
        var u = t / o.duration, q = ease(u), cx = cA[0] + (cB[0] - cA[0]) * q, cy = cA[1] + (cB[1] - cA[1]) * q, r = cA[2] + (cB[2] - cA[2]) * q;
        shp.style.clipPath = "polygon(" + circ.map(function (c, i) { var x = c[0] + (sq[i][0] - c[0]) * q, y = c[1] + (sq[i][1] - c[1]) * q; return (cx + x * r) + "px " + (cy + y * r) + "px"; }).join(",") + ")";
        shp.style.visibility = u > 0 && u < 1 ? "visible" : "hidden"; veil.style.opacity = u > 0 && u < 1 ? String(Math.sin(Math.PI * q)) : "0";
        el.style.visibility = q >= 0.5 ? "visible" : "hidden"; if (out) out.style.visibility = q >= 0.5 ? "hidden" : "visible";
      });
    },
    options: { duration: "s (0.7)", fromShape: "the outgoing scene's shape (its .tk-mark)", toShape: "the incoming scene's shape", color: "the morphing shape's colour", veil: "the veil's colour (it peaks half-way, the scenes swap behind it)", from: "the outgoing scene" },
    defaults: { duration: 0.7, fromShape: null, toShape: null, color: "#e8ebf3", veil: "#2a2350", from: null },
    demo: D(RUN("transitionShapeMorphBridge", 1.1, "{ duration: 0.9 }"), 3, {}, ".tk-b { flex-direction: row-reverse; }"),
  }),

  T("transition/takayu-match-cut", {
    fn: function (el, tl, at, o) {
      var out = o.from ? MW.el(o.from) : el.previousElementSibling;
      gsap.set(el, { autoAlpha: 0 });
      tl.set(el, { autoAlpha: 1 }, at);
      if (out) tl.set(out, { autoAlpha: 0 }, at);
      return at;
    },
    notes: "The motion is a plain cut; the match is in the layout: the last frame of the outgoing scene and the first of the incoming share a shape at the same place and size.",
    options: { from: "the outgoing scene" }, defaults: { from: null },
    demo: {
      duration: 3,
      css: `#demo { background: #0b0d12; color: #e8ebf3; }
.mc { position: absolute; inset: 0; display: grid; place-items: center; }
.mc-a { background: radial-gradient(120% 120% at 50% 40%, #2f6bff, #173a9e 70%); }
.mc-b { background: radial-gradient(120% 120% at 50% 40%, #f7f4ec, #e3ddcf 80%); }
.sunc { width: 480px; height: 480px; border-radius: 50%; background: radial-gradient(circle at 40% 35%, #fff4a8, #ffd23d 55%, #f0a500); box-shadow: 0 0 160px rgba(255, 210, 61, 0.55); }
.coin { width: 480px; height: 480px; border-radius: 50%; background: radial-gradient(circle at 40% 35%, #fff1b0, #ffc633 60%, #d99400); display: grid; place-items: center; box-shadow: 0 30px 80px rgba(120, 80, 0, 0.3); }
.coin .ring { width: 360px; height: 360px; border-radius: 50%; border: 18px solid rgba(140, 90, 0, 0.55); display: grid; place-items: center; font-size: 190px; font-weight: 800; color: rgba(120, 76, 0, 0.75); }
.mc-cap { position: absolute; bottom: 120px; left: 0; right: 0; text-align: center; font-size: 44px; font-weight: 600; }
.mc-a .mc-cap { color: rgba(255, 255, 255, 0.85); } .mc-b .mc-cap { color: #6b5a2a; }`,
      html: `<section class="mc mc-a"><div class="sunc"></div><div class="mc-cap">Mặt trời lặn</div></section>
<section class="mc mc-b"><div class="coin"><div class="ring">₫</div></div><div class="mc-cap">Đồng xu tiết kiệm</div></section>`,
      run: `MW.transitionTakayuMatchCut(q(".mc-b"), tl, 1.5, {});`,
    },
  }),

  T("transition/glitch-cut", {
    uses: ["drive", "rand"],
    fn: function (el, tl, at, o) {
      var out = o.from ? MW.el(o.from) : el.previousElementSibling, root = el.parentNode, H = el.offsetHeight, n = o.slices, slices = [];
      for (var k = 0; k < n; k++) {
        var a = out.cloneNode(true), b = el.cloneNode(true);
        [a, b].forEach(function (g) { g.removeAttribute("id"); g.style.pointerEvents = "none"; g.style.zIndex = "8"; g.style.visibility = "hidden"; g.style.opacity = "1"; root.appendChild(g); });
        slices.push([a, b]);
      }
      var red = document.createElement("div"); red.style.cssText = "position:absolute;inset:0;pointer-events:none;z-index:9;background:rgba(255,40,70,0.35);mix-blend-mode:screen;visibility:hidden;"; root.appendChild(red);
      var win = o.duration, fps = 24;
      return MW.drive(tl, at - win / 2, win, function (t) {
        var on = t > 0 && t < win, f = Math.floor(t * fps), r = MW.rand(o.seed * 977 + f), cut = t >= win / 2;
        el.style.visibility = cut ? "visible" : "hidden"; el.style.opacity = "1"; if (out) out.style.visibility = cut ? "hidden" : "visible";
        red.style.visibility = on ? "visible" : "hidden"; if (on) gsap.set(red, { x: o.split * (r() > 0.5 ? 1 : -1) });
        slices.forEach(function (s, k) {
          var y = r() * H, h = o.minH + r() * (o.maxH - o.minH), x = (r() * 2 - 1) * o.amp, useB = (k + f) % 2 === 1, g = useB ? s[1] : s[0], other = useB ? s[0] : s[1];
          other.style.visibility = "hidden";
          g.style.visibility = on ? "visible" : "hidden"; g.style.clipPath = "inset(" + y + "px 0 " + Math.max(0, H - y - h) + "px 0)"; gsap.set(g, { x: x });
        });
      });
    },
    options: { duration: "s of the glitch window around the cut (0.2: 0.1 either side)", slices: "horizontal slices, new each frame (6)", minH: "px (30)", maxH: "px (120)", amp: "px of sideways shift (±90)", split: "px of the red offset (16)", seed: "the glitch pattern" },
    defaults: { duration: 0.2, slices: 6, minH: 30, maxH: 120, amp: 90, split: 16, seed: 3, from: null },
    demo: D(RUN("transitionGlitchCut", 1.5, "{ duration: 0.4 }"), 3),
  }),

  T("transition/light-leak", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      var out = o.from ? MW.el(o.from) : el.previousElementSibling, root = el.parentNode, W = el.offsetWidth, H = el.offsetHeight, R = o.radius * W, ease = gsap.parseEase("sine.inOut");
      var leak = document.createElement("div");
      leak.style.cssText = "position:absolute;pointer-events:none;z-index:6;mix-blend-mode:screen;width:" + 2 * R + "px;height:" + 2 * R + "px;border-radius:50%;background:radial-gradient(circle, rgba(255,214,140," + o.peak + ") 0%, rgba(255,140,80,0.45) 50%, rgba(255,140,80,0) 70%);";
      root.appendChild(leak);
      return MW.drive(tl, at - o.duration / 2, o.duration, function (t) {
        var u = t / o.duration, x = -R * 0.6 + (W + R * 1.2) * ease(u);
        leak.style.left = (x - R) + "px"; leak.style.top = (o.y * H - R) + "px"; leak.style.opacity = u > 0 && u < 1 ? String(Math.sin(Math.PI * u)) : "0";
        el.style.visibility = u >= 0.5 ? "visible" : "hidden"; if (out) out.style.visibility = u >= 0.5 ? "hidden" : "visible";
      });
    },
    options: { duration: "s (0.8; the cut is under the peak, at the middle)", radius: "0-1 of the width (0.62: 200 on a 320 frame)", y: "0-1 of the height (0.4)", peak: "opacity of the warm core (0.95)", from: "the outgoing scene" },
    defaults: { duration: 0.8, radius: 0.62, y: 0.4, peak: 0.95, from: null },
    notes: "Called with the cut time: the leak starts half its duration before it.",
    demo: D(RUN("transitionLightLeak", 1.5), 3),
  }),

  T("transition/card-flip", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      var out = o.from ? MW.el(o.from) : el.previousElementSibling, ease = gsap.parseEase("power2.inOut");
      el.parentNode.style.perspective = o.perspective + "px";
      return MW.drive(tl, at, o.duration, function (t) {
        var q = ease(t / o.duration), s = 1 - (1 - o.scale) * Math.sin(Math.PI * q);
        // fold to 90 degrees and swap: a back face is never shown
        if (q < 0.5) { if (out) { gsap.set(out, { rotationY: t > 0 ? 180 * q : 0, scale: t > 0 ? s : 1 }); out.style.visibility = "visible"; } el.style.visibility = "hidden"; }
        else { if (out) out.style.visibility = "hidden"; gsap.set(el, { rotationY: 180 * q - 180, scale: s }); el.style.visibility = "visible"; }
      });
    },
    options: { duration: "s (0.6)", perspective: "px (2400)", scale: "scale during the turn (0.9)", from: "the outgoing scene" },
    defaults: { duration: 0.6, perspective: 2400, scale: 0.9, from: null },
    demo: D(RUN("transitionCardFlip", 1.2, "{ duration: 0.8 }"), 3, {}, "#demo { background: #05060a; }"),
  }),

  T("transition/brush-wipe", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      var out = o.from ? MW.el(o.from) : el.previousElementSibling, ease = gsap.parseEase(o.ease), W = el.offsetWidth, H = el.offsetHeight, n = o.strokes;
      var pitch = H / n, bh = H / 4, slant = o.slant, total = (n - 1) * o.stagger + o.each;
      return MW.drive(tl, at, total, function (t) {
        var pts = ["0px 0px"], done = true;
        for (var i = 0; i < n; i++) {
          var p = ease(Math.max(0, Math.min(1, (t - i * o.stagger) / o.each))), x = -0.05 * W + 1.12 * W * p, top = i * pitch - (bh - pitch) / 2, bot = top + bh;
          if (p < 1) done = false;
          if (p <= 0) continue;
          // a band from the left edge to its leading edge, the top edge slanting up toward the lead
          pts.push("0px " + top + "px", x + "px " + (top - slant) + "px", x + "px " + bot + "px", "0px " + bot + "px", "0px " + top + "px", "0px 0px");
        }
        el.style.clipPath = done ? "none" : pts.length < 3 ? "inset(50%)" : "polygon(" + pts.join(",") + ")"; el.style.visibility = t > 0 ? "visible" : "hidden";
        if (out) out.style.visibility = done ? "hidden" : "visible";
      });
    },
    options: { strokes: "bands (5)", stagger: "s between bands (0.06)", each: "s each band's edge crosses the frame (0.36)", slant: "px the top edge rises toward the lead (30)", ease: "power2.out (cubic); the site's demo eases in-out", from: "the outgoing scene" },
    defaults: { strokes: 5, stagger: 0.06, each: 0.36, slant: 30, ease: "power2.out", from: null },
    demo: D(RUN("transitionBrushWipe", 1.2), 3),
  }),

  T("transition/letter-zoom", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      var out = o.from ? MW.el(o.from) : el.previousElementSibling, W = el.offsetWidth, H = el.offsetHeight, ez = gsap.parseEase("expo.in"), id = "mwlz" + Math.floor(at * 1000);
      // the letter as an SVG clip path in the page (so it uses the page's font), scaled about the frame centre
      var NS = "http://www.w3.org/2000/svg", svg = document.createElementNS(NS, "svg"), cp = document.createElementNS(NS, "clipPath"), tx = document.createElementNS(NS, "text");
      svg.setAttribute("width", "0"); svg.setAttribute("height", "0"); svg.style.position = "absolute";
      cp.setAttribute("id", id); cp.setAttribute("clipPathUnits", "userSpaceOnUse");
      tx.setAttribute("x", W / 2); tx.setAttribute("y", H / 2); tx.setAttribute("text-anchor", "middle"); tx.setAttribute("dominant-baseline", "central");
      tx.setAttribute("font-family", o.font); tx.setAttribute("font-weight", "900"); tx.setAttribute("font-size", o.size); tx.textContent = o.letter;
      cp.appendChild(tx); svg.appendChild(cp); el.parentNode.appendChild(svg);
      return MW.drive(tl, at, o.duration, function (t) {
        var a = 0.4 / 0.9 * o.duration, s = t < a ? 0.9 + 0.1 * (t / a) : 1 + (o.scale - 1) * ez((t - a) / (o.duration - a));
        tx.setAttribute("transform", "translate(" + W / 2 + " " + H / 2 + ") scale(" + s + ") translate(" + (-W / 2) + " " + (-H / 2) + ")");
        el.style.clipPath = t >= o.duration ? "none" : "url(#" + id + ")"; el.style.visibility = t > 0 ? "visible" : "hidden"; el.style.opacity = t > 0 ? String(Math.min(1, t / (0.15 * o.duration))) : "0";
        if (out) out.style.visibility = t >= o.duration ? "hidden" : "visible";
      });
    },
    options: { letter: "the letter or short word (B)", size: "px at scale 1 (760)", scale: "scale it reaches (30)", duration: "s (0.9: 0.4 the letter appears, 0.5 it zooms, expo.in)", font: "font family (Inter)", from: "the outgoing scene" },
    defaults: { letter: "B", size: 760, scale: 30, duration: 0.9, font: "Inter", from: null },
    demo: D(RUN("transitionLetterZoom", 0.9, "{ duration: 1.4 }"), 3),
  }),

  T("transition/gravity-drop", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      var out = o.from ? MW.el(o.from) : el.previousElementSibling, ease = gsap.parseEase(o.ease), H = el.offsetHeight;
      el.style.visibility = "visible";
      return MW.drive(tl, at, o.duration, function (t) {
        var p = ease(t / o.duration);
        if (out) { gsap.set(out, { y: o.drop * H * p, rotation: o.rotate * p, transformOrigin: "50% 0%", zIndex: 3 }); out.style.visibility = p >= 1 ? "hidden" : "visible"; }
      });
    },
    options: { duration: "s (0.7)", drop: "fall, × the frame height (1.2; the site's demo 1.3)", rotate: "degrees about the top centre (10; demo 20)", ease: "power1.in (quad; demo power2.in)", from: "the outgoing scene, which falls; the incoming waits still underneath" },
    defaults: { duration: 0.7, drop: 1.2, rotate: 10, ease: "power1.in", from: null },
    demo: D(RUN("transitionGravityDrop", 1.1, "{ drop: 1.3, rotate: 20, ease: \"power2.in\" }"), 3),
  }),

  T("transition/light-streak-whip", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      var out = o.from ? MW.el(o.from) : el.previousElementSibling, root = el.parentNode, W = el.offsetWidth, ease = gsap.parseEase(o.ease), bands = [];
      for (var k = 0; k < 6; k++) {
        var b = document.createElement("div"), w = (0.28 + (0.84 - 0.28) * k / 5) * W;
        b.style.cssText = "position:absolute;top:0;bottom:0;pointer-events:none;z-index:6;width:" + w + "px;opacity:0.25;background:linear-gradient(90deg, rgba(255,255,255,0), rgba(255,255,255,0.95) 50%, rgba(255,255,255,0));";
        root.appendChild(b); bands.push({ b: b, w: w });
      }
      return MW.drive(tl, at, o.duration, function (t) {
        var u = t / o.duration, cx = -0.4 * W + 1.8 * W * ease(u), on = u > 0 && u < 1;
        bands.forEach(function (x) { x.b.style.left = (cx - x.w / 2) + "px"; x.b.style.visibility = on ? "visible" : "hidden"; });
        var cut = cx >= W / 2; el.style.visibility = cut && u > 0 ? "visible" : "hidden"; if (out) out.style.visibility = cut && u > 0 ? "hidden" : "visible";
      });
    },
    options: { duration: "s (0.35; 0.3-0.4)", ease: "power3.in", from: "the outgoing scene; the cut happens as the band's centre crosses the frame's" },
    defaults: { duration: 0.35, ease: "power3.in", from: null },
    demo: D(RUN("transitionLightStreakWhip", 1.2, "{ duration: 0.5 }"), 3),
  }),

  T("motion/j-l-cut", {
    kind: "block",
    fn: function (el, tl, at, o) {
      var head = el.querySelectorAll(".jl-head"), span = o.loop;
      for (var i = 0; i < o.loops; i++) head.forEach(function (h) { tl.fromTo(h, { left: "0%" }, { left: "100%", duration: span, ease: "none", immediateRender: i === 0 }, at + i * span); });
      return at + o.loops * span;
    },
    options: { loop: "s for the playhead to cross the 3 s ruler (3)", loops: "times (1)" }, defaults: { loop: 3, loops: 1 },
    notes: "A lesson as a diagram: picture over sound; the J row's sound of B starts before the cut, the L row's sound of A runs past it. In a film: place the voice clip a few frames early or late against the scene cut.",
    demo: {
      duration: 3.2,
      css: `#demo { background: #0b0d12; color: #e8ebf3; font-family: Inter, sans-serif; }
.jl { position: absolute; left: 200px; right: 200px; top: 170px; }
.jl-row { position: relative; margin-bottom: 110px; }
.jl-title { font-size: 46px; font-weight: 800; margin-bottom: 26px; } .jl-title span { color: #8f9ab3; font-weight: 500; font-size: 34px; margin-left: 20px; }
.jl-track { position: relative; height: 92px; margin-bottom: 16px; border-radius: 14px; overflow: hidden; background: #151a24; }
.jl-lab { position: absolute; left: -150px; width: 130px; text-align: right; top: 26px; font-size: 30px; color: #8f9ab3; }
.jl-seg { position: absolute; top: 0; bottom: 0; display: grid; place-items: center; font-size: 34px; font-weight: 700; }
.jl-a { background: #2a3350; color: #c9d2ea; } .jl-b { background: #7a5cf5; color: #fff; }
.jl-wave { background-image: repeating-linear-gradient(90deg, rgba(255,255,255,0.0) 0 6px, rgba(255,255,255,0.35) 6px 9px); }
.jl-cut { position: absolute; top: -12px; bottom: -12px; left: 50%; width: 6px; margin-left: -3px; background: #ffd23d; border-radius: 3px; }
.jl-head { position: absolute; top: -26px; bottom: -26px; width: 4px; margin-left: -2px; background: #ff5d8f; }`,
      html: `<div class="jl">
<div class="jl-row"><div class="jl-title">J-cut<span>tiếng cảnh sau vào trước hình</span></div>
<div class="jl-track"><div class="jl-lab">Hình</div><div class="jl-seg jl-a" style="left:0;width:50%">A</div><div class="jl-seg jl-b" style="left:50%;width:50%">B</div></div>
<div class="jl-track"><div class="jl-lab">Tiếng</div><div class="jl-seg jl-a jl-wave" style="left:0;width:40%">A</div><div class="jl-seg jl-b jl-wave" style="left:40%;width:60%">B</div></div>
<div class="jl-cut"></div><div class="jl-head"></div></div>
<div class="jl-row"><div class="jl-title">L-cut<span>tiếng cảnh trước kéo dài sau điểm cắt</span></div>
<div class="jl-track"><div class="jl-lab">Hình</div><div class="jl-seg jl-a" style="left:0;width:50%">A</div><div class="jl-seg jl-b" style="left:50%;width:50%">B</div></div>
<div class="jl-track"><div class="jl-lab">Tiếng</div><div class="jl-seg jl-a jl-wave" style="left:0;width:60%">A</div><div class="jl-seg jl-b jl-wave" style="left:60%;width:40%">B</div></div>
<div class="jl-cut"></div><div class="jl-head"></div></div></div>`,
      run: `MW.motionJLCut(q(".jl"), tl, 0.1, {});`,
    },
  }),
];
