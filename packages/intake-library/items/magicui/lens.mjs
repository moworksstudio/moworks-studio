// Magic UI lens (apps/www/registry/magicui/lens.tsx at efe76fc): the children rendered twice; the copy is scaled by zoomFactor (1.3) about
// the lens point and cut by a hard radial mask (circle lensSize / 2 px, 170 px across, black 100 %, transparent 100 %); the lens pops in
// (opacity 0 -> 1, scale 0.58 -> 1) and out (opacity 0, scale 0.8) over `duration` (0.1 s, motion's default ease) as the pointer enters
// and leaves. Port: the pointer becomes a path [t, x, y] and enter / leave times; the copy is a clone of the content.
export default {
  id: "lens",
  kind: "motion",
  title: "Lens",
  sub: "Kính lúp tròn phóng to chi tiết",
  desc: "A round magnifying lens glides over a picture or UI and zooms into the detail under it (x1.3, 170 px), popping in and out.",
  category: "Effects & overlays",
  tags: ["magnifier", "zoom", "lens", "loupe", "detail", "magicui"],
  source: { path: "apps/www/registry/magicui/lens.tsx" },
  notes: "el is the holder (position relative, overflow hidden); its content is cloned for the zoomed copy (ids in the clone are removed). path: [[t, x, y], ...] px in el; enter / leave in s after `at`.",
  options: { zoomFactor: "1.3", lensSize: "px (170)", duration: "s (0.1)", lensColor: "black", path: "[[0, x, y], ...]", enter: "0", leave: "end of the path" },
  defaults: { zoomFactor: 1.3, lensSize: 170, duration: 0.1, lensColor: "black", path: null, enter: 0, leave: null },
  uses: ["bezier"],
  css: `.mw-lens { position: relative; overflow: hidden; }
.mw-lens > .mw-lens-copy { position: absolute; inset: 0; overflow: hidden; z-index: 50; pointer-events: none; }
.mw-lens > .mw-lens-copy > div { position: absolute; inset: 0; }`,
  markup: `<div class="mw-lens"><img src="assets/picture.svg" alt=""></div>`,
  fn: function (el, tl, at, o) {
    var W = el.clientWidth, H = el.clientHeight, path = o.path || [[0, W * 0.3, H * 0.4], [1.5, W * 0.7, H * 0.6], [3, W * 0.4, H * 0.7]];
    var copy = document.createElement("div"), inner = document.createElement("div"); copy.className = "mw-lens-copy";
    Array.prototype.forEach.call(el.childNodes, function (n) { var c = n.cloneNode(true); if (c.removeAttribute) c.removeAttribute("id"); inner.appendChild(c); });
    copy.appendChild(inner); el.appendChild(copy);
    var leave = o.leave == null ? path[path.length - 1][0] : o.leave, e = MW.bezier.apply(null, MW.CSS_EASE.easeInOut), D = o.duration;
    var pos = function (t) {
      if (t <= path[0][0]) return [path[0][1], path[0][2]];
      for (var k = 1; k < path.length; k++) if (t <= path[k][0]) { var a = path[k - 1], b = path[k], f = (t - a[0]) / (b[0] - a[0]), g = f * f * (3 - 2 * f); return [a[1] + (b[1] - a[1]) * g, a[2] + (b[2] - a[2]) * g]; }
      return [path[path.length - 1][1], path[path.length - 1][2]];
    };
    var s = { t: 0 }, set = function () {
      var p = pos(s.t), x = p[0], y = p[1], op = 0, sc = 0.58;
      if (s.t >= o.enter && s.t < leave) { var k = e(Math.min(1, (s.t - o.enter) / D)); op = k; sc = 0.58 + 0.42 * k; }
      else if (s.t >= leave) { var j = e(Math.min(1, (s.t - leave) / D)); op = 1 - j; sc = 1 - 0.2 * j; }
      var m = "radial-gradient(circle " + o.lensSize / 2 + "px at " + x + "px " + y + "px, " + o.lensColor + " 100%, transparent 100%)";
      copy.style.webkitMaskImage = copy.style.maskImage = m; copy.style.opacity = op;
      copy.style.transformOrigin = x + "px " + y + "px"; copy.style.transform = "scale(" + sc + ")";
      inner.style.transformOrigin = x + "px " + y + "px"; inner.style.transform = "scale(" + o.zoomFactor + ")";
    };
    set();
    var end = leave + D;
    tl.fromTo(s, { t: 0 }, { t: end, duration: end, ease: "none", onUpdate: set, immediateRender: false }, at);
    return at + end;
  },
  assets: [{ path: "picture.svg", data: (await import("../../demo-media.mjs")).PRODUCT }],
  demo: {
    duration: 6,
    css: `.mw-lens { width: 900px; height: 900px; border-radius: 24px; } .mw-lens img { display: block; width: 900px; height: 900px; }`,
    html: `<div class="center"><div class="mw-lens"><img src="assets/picture.svg" alt=""></div></div>`,
    run: `MW.lens(q(".mw-lens"), tl, 0.4, { zoomFactor: 2, lensSize: 300, path: [[0, 300, 420], [1.6, 690, 610], [3.2, 420, 760], [4.6, 600, 360]], enter: 0, leave: 4.6 });`,
  },
};
