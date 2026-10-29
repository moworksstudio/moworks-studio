// Magic UI highlighter (apps/www/registry/magicui/highlighter.tsx at efe76fc): wraps inline text in a rough-notation mark (highlight,
// underline, box, circle, strike-through, crossed-off, bracket) that draws itself: color #ffd1dc, strokeWidth 1.5, animationDuration
// 600 ms, iterations 2, padding 2, multiline. Port: rough-notation itself is not copied; the same kinds of mark are drawn here as seeded
// hand-drawn SVG strokes (two passes, each a little off), revealed with stroke-dashoffset over the same 600 ms on the film's timeline,
// so every render draws the same mark (upstream's rough strokes differ on each load).
export default {
  id: "highlighter",
  kind: "motion",
  title: "Text Highlighter",
  sub: "Nét bút vẽ tay đánh dấu chữ",
  desc: "A hand-drawn mark draws itself on a word: highlighter, underline, box, circle, strike-through, crossed-off or bracket (0.6 s, two rough passes).",
  category: "Text & titles",
  tags: ["highlight", "underline", "circle", "hand-drawn", "annotation", "marker", "magicui"],
  source: { path: "apps/www/registry/magicui/highlighter.tsx" },
  made: "adapted",
  notes: "Upstream draws with rough-notation (MIT, Preet Shihn); its code is not used: the strokes here are drawn with the app's seeded generator, same mark types, timing and defaults. Multiline: one mark per line box.",
  upstream: "rough-notation (MIT) by Preet Shihn draws the original marks",
  options: { action: "highlight | underline | box | circle | strike-through | crossed-off | bracket (highlight)", color: "#ffd1dc", strokeWidth: "px (1.5)",
    animationDuration: "s (0.6)", iterations: "2", padding: "px (2)", seed: "1" },
  defaults: { action: "highlight", color: "#ffd1dc", strokeWidth: 1.5, animationDuration: 0.6, iterations: 2, padding: 2, seed: 1 },
  uses: ["rand"],
  css: `.mw-highlighter { position: relative; display: inline-block; background: transparent; }
.mw-highlighter > svg.mw-hl { position: absolute; overflow: visible; pointer-events: none; left: 0; top: 0; }`,
  markup: `<span class="mw-highlighter">quan trọng</span>`,
  fn: function (el, tl, at, o) {
    var NS = "http://www.w3.org/2000/svg", r = MW.rand(o.seed * 977 + o.action.length);
    var W = el.offsetWidth, H = el.offsetHeight, p = o.padding, sw = o.strokeWidth;
    var svg = document.createElementNS(NS, "svg"); svg.setAttribute("class", "mw-hl"); svg.setAttribute("width", W); svg.setAttribute("height", H);
    var behind = o.action === "highlight";
    if (behind) { svg.style.zIndex = "-1"; el.style.zIndex = "0"; el.style.isolation = "isolate"; }
    el.appendChild(svg);
    var j = function (a) { return (r() - 0.5) * 2 * a; };
    // one rough line: a slightly bowed quadratic curve with jittered ends (roughness about 1.5 px)
    var line = function (x1, y1, x2, y2, rough) {
      var len = Math.hypot(x2 - x1, y2 - y1), off = Math.min(rough * 2, len * 0.02 + rough), mx = (x1 + x2) / 2 + j(off), my = (y1 + y2) / 2 + j(off);
      return "M" + (x1 + j(rough)).toFixed(1) + " " + (y1 + j(rough)).toFixed(1) + " Q" + mx.toFixed(1) + " " + my.toFixed(1) + " " + (x2 + j(rough)).toFixed(1) + " " + (y2 + j(rough)).toFixed(1);
    };
    var ellipse = function (cx, cy, rx, ry) {
      var d = "", start = j(0.4) - Math.PI / 2, steps = 24, over = 0.25 + r() * 0.15;
      for (var i = 0; i <= steps; i++) {
        var a = start + (Math.PI * 2 + over) * (i / steps), k = 1 + j(0.04);
        var x = cx + rx * k * Math.cos(a), y = cy + ry * k * Math.sin(a);
        d += (i ? " L" : "M") + x.toFixed(1) + " " + y.toFixed(1);
      }
      return d;
    };
    var paths = [];
    for (var it = 0; it < o.iterations; it++) {
      var d;
      switch (o.action) {
        case "highlight": d = line(-p, H / 2, W + p, H / 2, 1.5); break;
        case "underline": d = line(-p, H + p - 2, W + p, H + p - 2, 1.5); break;
        case "strike-through": d = line(-p, H / 2, W + p, H / 2, 1.5); break;
        case "crossed-off": d = it % 2 ? line(W + p, -p, -p, H + p, 1.5) : line(-p, -p, W + p, H + p, 1.5); break;
        case "box": d = [line(-p, -p, W + p, -p, 1.5), line(W + p, -p, W + p, H + p, 1.5), line(W + p, H + p, -p, H + p, 1.5), line(-p, H + p, -p, -p, 1.5)].join(" "); break;
        case "circle": d = ellipse(W / 2, H / 2, W / 2 + p * 2 + 4, H / 2 + p * 2 + 2); break;
        case "bracket": d = [line(-p + 6, -p, -p, -p, 1), line(-p, -p, -p, H + p, 1), line(-p, H + p, -p + 6, H + p, 1), line(W + p - 6, -p, W + p, -p, 1), line(W + p, -p, W + p, H + p, 1), line(W + p, H + p, W + p - 6, H + p, 1)].join(" "); break;
        default: d = line(-p, H / 2, W + p, H / 2, 1.5);
      }
      var path = document.createElementNS(NS, "path");
      path.setAttribute("d", d); path.setAttribute("fill", "none"); path.setAttribute("stroke", o.color);
      path.setAttribute("stroke-width", behind ? H * 0.9 : sw); path.setAttribute("stroke-linecap", behind ? "butt" : "round"); path.setAttribute("stroke-linejoin", "round");
      if (behind) path.setAttribute("stroke-opacity", "0.9");
      svg.appendChild(path); paths.push(path);
    }
    // the iterations draw one after another within animationDuration, as rough-notation splits its time
    var each = o.animationDuration / paths.length;
    paths.forEach(function (path, i) {
      var L = path.getTotalLength();
      path.setAttribute("stroke-dasharray", L + " " + L);
      tl.fromTo(path, { strokeDashoffset: L }, { strokeDashoffset: 0, duration: each, ease: "none", immediateRender: true }, at + i * each);
    });
    return at + o.animationDuration;
  },
  demo: {
    duration: 5,
    theme: "light",
    css: `.para { width: 1500px; font-size: 76px; line-height: 1.5; font-weight: 600; color: #18181b; }`,
    html: `<div class="center"><div class="para">Moworks giúp bạn <span class="mw-highlighter h1">làm video nhanh</span>, chuyển động <span class="mw-highlighter h2">mượt</span> và
<span class="mw-highlighter h3">đúng thương hiệu</span>, kể cả chữ <span class="mw-highlighter h4">tiếng Việt</span>.</div></div>`,
    run: `MW.highlighter(q(".h1"), tl, 0.4, { action: "highlight", color: "#fde68a" });
MW.highlighter(q(".h2"), tl, 1.2, { action: "circle", color: "#f43f5e", strokeWidth: 4, padding: 6 });
MW.highlighter(q(".h3"), tl, 2.0, { action: "underline", color: "#3b82f6", strokeWidth: 5, padding: 4 });
MW.highlighter(q(".h4"), tl, 2.8, { action: "box", color: "#10b981", strokeWidth: 4, padding: 6 });`,
  },
};
