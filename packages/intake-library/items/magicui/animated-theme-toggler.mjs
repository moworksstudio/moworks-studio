// Magic UI animated-theme-toggler (apps/www/registry/magicui/animated-theme-toggler.tsx at efe76fc): a light / dark toggle (lucide Sun /
// Moon) whose new theme is revealed through a shape growing from the button (or the screen centre): View Transitions + a clip-path
// animation, 400 ms ease-in-out (star: linear), from a collapsed shape to one covering the view: circle 0 -> maxRadius (hypot of the
// farthest corner), square (half side max(halfW, halfH) x 1.05), triangle (scale maxRadius x 2.2), diamond / hexagon (R = maxRadius x
// sqrt 2), rectangle (the covering box), star (R x 1.03, inner ratio 0.42, from R x 0.025). Port: getThemeTransitionClipPaths' geometry
// (MIT) on the film: the "new theme" layer is clipped from the collapsed shape to the full one at the toggle time; no View Transitions.
export default {
  id: "animated-theme-toggler",
  kind: "motion",
  title: "Theme Toggler",
  sub: "Đổi giao diện sáng tối qua hình nở",
  desc: "A light-to-dark (or any) switch revealed through a shape that grows from a point: circle, square, triangle, diamond, hexagon, rectangle or star (0.4 s).",
  category: "Transitions",
  tags: ["transition", "iris", "reveal", "dark mode", "theme", "shape", "magicui"],
  source: { path: "apps/www/registry/magicui/animated-theme-toggler.tsx" },
  notes: "el is the layer with the new look, over the old one (same size). origin: an element (the toggle button) or [x, y] px in el; fromCenter uses el's centre. at = the toggle time.",
  options: { variant: "circle | square | triangle | diamond | hexagon | rectangle | star (circle)", duration: "s (0.4)", origin: "element / selector / [x, y]", fromCenter: "false", reverse: "false (true closes the shape)" },
  defaults: { variant: "circle", duration: 0.4, origin: null, fromCenter: false, reverse: false },
  uses: ["bezier"],
  css: `.mw-animated-theme-toggler { position: absolute; inset: 0; }`,
  markup: `<div class="mw-animated-theme-toggler">…the new theme…</div>`,
  fn: function (el, tl, at, o) {
    var W = el.offsetWidth, H = el.offsetHeight, cx = W / 2, cy = H / 2;
    if (!o.fromCenter && o.origin) {
      if (Array.isArray(o.origin)) { cx = o.origin[0]; cy = o.origin[1]; }
      else { var b = MW.el(o.origin).getBoundingClientRect(), r0 = el.getBoundingClientRect(); cx = b.left - r0.left + b.width / 2; cy = b.top - r0.top + b.height / 2; }
    }
    var maxR = Math.hypot(Math.max(cx, W - cx), Math.max(cy, H - cy)), pt = function (x, y) { return x.toFixed(2) + "px " + y.toFixed(2) + "px"; };
    var shape = function (k) {                          // k 0 -> 1: the collapsed shape grows to the covering one (same vertex count)
      var v = o.variant, L = function (a, b) { return a + (b - a) * k; }, verts = [];
      if (v === "circle") return "circle(" + (maxR * k).toFixed(2) + "px at " + pt(cx, cy) + ")";
      if (v === "square" || v === "rectangle") {
        var hw = Math.max(cx, W - cx), hh = Math.max(cy, H - cy), sx = v === "square" ? Math.max(hw, hh) * 1.05 : hw, sy = v === "square" ? sx : hh;
        verts = [[cx - sx, cy - sy], [cx + sx, cy - sy], [cx + sx, cy + sy], [cx - sx, cy + sy]];
      } else if (v === "triangle") { var sc = maxR * 2.2, dx = (Math.sqrt(3) / 2) * sc; verts = [[cx, cy - sc], [cx + dx, cy + 0.5 * sc], [cx - dx, cy + 0.5 * sc]]; }
      else if (v === "diamond") { var R = maxR * Math.SQRT2; verts = [[cx, cy - R], [cx + R, cy], [cx, cy + R], [cx - R, cy]]; }
      else if (v === "hexagon") { var R2 = maxR * Math.SQRT2; for (var i = 0; i < 6; i++) { var a = -Math.PI / 2 + (i * Math.PI) / 3; verts.push([cx + R2 * Math.cos(a), cy + R2 * Math.sin(a)]); } }
      else if (v === "star") {
        var R3 = maxR * Math.SQRT2 * 1.03, start = Math.max(2, R3 * 0.025), rad = L(start, R3);
        for (var j = 0; j < 5; j++) { var oa = -Math.PI / 2 + (j * 2 * Math.PI) / 5, ia = oa + Math.PI / 5; verts.push([cx + rad * Math.cos(oa), cy + rad * Math.sin(oa)]); verts.push([cx + rad * 0.42 * Math.cos(ia), cy + rad * 0.42 * Math.sin(ia)]); }
        return "polygon(" + verts.map(function (p) { return pt(p[0], p[1]); }).join(", ") + ")";
      }
      return "polygon(" + verts.map(function (p) { return pt(L(cx, p[0]), L(cy, p[1])); }).join(", ") + ")";
    };
    var e = o.variant === "star" ? function (x) { return x; } : MW.bezier.apply(null, MW.CSS_EASE.easeInOut), s = { k: o.reverse ? 1 : 0 };
    // before its toggle the new look is not there at all (upstream's View Transition only exists while it runs)
    var set = function () { el.style.clipPath = s.k <= 0 ? "circle(0px at 0px 0px)" : shape(e(s.k)); };
    set();
    tl.fromTo(s, { k: o.reverse ? 1 : 0 }, { k: o.reverse ? 0 : 1, duration: o.duration, ease: "none", onUpdate: set, immediateRender: false }, at);
    return at + o.duration;
  },
  demo: {
    duration: 7,
    css: `.ui { position: absolute; inset: 0; display: grid; place-items: center; } .ui .panel { width: 1200px; padding: 70px; border-radius: 36px; }
.ui .panel h2 { margin: 0 0 16px; font-size: 72px; } .ui .panel p { margin: 0; font-size: 34px; opacity: .65; }
.light { background: #fafafa; color: #09090b; } .light .panel { background: #fff; border: 2px solid #e4e4e7; } .dark { background: #09090b; color: #fafafa; } .dark .panel { background: #111114; border: 2px solid #27272a; }
.dark2 { background: #1e1b4b; color: #fafafa; } .dark2 .panel { background: #312e81; border: 2px solid #4338ca; }
.tg { position: absolute; right: 120px; top: 90px; width: 110px; height: 110px; border-radius: 9999px; display: grid; place-items: center; border: 2px solid currentColor; }
.tg svg { width: 56px; height: 56px; }`,
    html: `<div class="ui light"><div class="panel"><h2>Giao diện sáng</h2><p>Bấm nút để chuyển sang chế độ tối.</p></div><div class="tg"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg></div></div>
<div class="ui dark mw-animated-theme-toggler t1"><div class="panel"><h2>Giao diện tối</h2><p>Hình tròn nở ra từ nút bấm.</p></div><div class="tg"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z"/></svg></div></div>
<div class="ui dark2 mw-animated-theme-toggler t2"><div class="panel"><h2>Hình ngôi sao</h2><p>Cùng hiệu ứng, hình khác.</p></div></div>`,
    run: `MW.animatedThemeToggler(q(".t1"), tl, 1.2, { origin: [1855, 145], duration: 0.6 });
MW.animatedThemeToggler(q(".t2"), tl, 3.8, { variant: "star", fromCenter: true, duration: 0.8 });`,
  },
};
