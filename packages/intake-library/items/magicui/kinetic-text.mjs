// Magic UI kinetic-text (apps/www/registry/magicui/kinetic-text.tsx at efe76fc): per-letter spans at weight 300 with a transparent
// stroke of 1em x 125 / 6000; the hovered letter goes to 900 with a currentColor stroke twice as wide and padding 1em / 12, its
// neighbours to 600 (with the padding), the next ones to 400; every change is a 0.4 s CSS transition (ease). Port: the hover becomes a
// scripted pointer crossing the word (`path`: letter positions over time); each letter replays the same transitions from the film's time.
export default {
  id: "kinetic-text",
  kind: "motion",
  title: "Kinetic Text",
  sub: "Nét chữ phình theo con trỏ lướt",
  desc: "Letters swell in weight around a pointer that glides along the headline: the touched letter goes black-heavy with an outline, its neighbours less, each change easing over 0.4 s.",
  category: "Text & titles",
  tags: ["variable font", "weight", "hover", "kinetic", "text", "magicui"],
  source: { path: "apps/www/registry/magicui/kinetic-text.tsx" },
  notes: "Needs a variable font (Inter, Roboto Flex...). Upstream reacts to the mouse; here `path` lists [time s, letter index] points the pointer passes (linear between them, -1 = off the word).",
  options: { path: "[[t, letter], ...] relative to `at` (sweep left to right and back over 3 s)", base: "weight (300)", peak: "weight (900)" },
  defaults: { path: null, base: 300 },
  uses: ["split", "bezier"],
  css: `.mw-kinetic-text { display: flex; flex-wrap: wrap; font-weight: 300; }
.mw-kinetic-text .mw-ch { -webkit-text-stroke-color: transparent; }`,
  markup: `<h1 class="mw-kinetic-text">Kinetic</h1>`,
  fn: function (el, tl, at, o) {
    var chars = MW.split(el, "chars").chars, n = chars.length;
    var fs = parseFloat(getComputedStyle(el).fontSize), sw = fs * 125 / 6000, pad = fs / 12;
    var path = o.path || [[0, -1], [0.2, 0], [1.4, n - 1], [1.7, n - 1], [2.9, 0], [3.1, -1]];
    var css = MW.bezier.apply(null, MW.CSS_EASE.ease);
    // the letter under the pointer at time t (or -1)
    var hoverAt = function (t) {
      if (t <= path[0][0]) return Math.round(path[0][1]);
      for (var i = 1; i < path.length; i++) if (t <= path[i][0]) { var a = path[i - 1], b = path[i], f = (t - a[0]) / Math.max(1e-6, b[0] - a[0]); if (a[1] < 0 || b[1] < 0) return f < 0.5 ? Math.round(a[1]) : Math.round(b[1]); return Math.round(a[1] + (b[1] - a[1]) * f); }
      return Math.round(path[path.length - 1][1]);
    };
    // target state of letter i when letter h is hovered: [weight, stroke colour on (0/1), stroke x, padding]
    var target = function (i, h) {
      if (h < 0) return [o.base, 0, 1, 0];
      var d = i - h;
      if (d === 0) return [900, 1, 2, pad];
      if (d === -1 || d === 1) return [600, 0, 1, pad];
      if (d === -2 || d === 2) return [400, 0, 1, 0];
      return [o.base, 0, 1, 0];
    };
    // hover changes, sampled on a 60 fps grid
    var end = path[path.length - 1][0], events = [[0, hoverAt(0)]];
    for (var f = 1; f <= Math.ceil(end * 60) + 1; f++) { var h = hoverAt(f / 60); if (h !== events[events.length - 1][1]) events.push([f / 60, h]); }
    var stateAt = function (i, t) {
      var cur = target(i, events[0][1]), from = cur, t0 = -1;
      for (var k = 1; k < events.length && events[k][0] <= t; k++) {
        var next = target(i, events[k][1]);
        if (next.join() === from.join() && t0 < 0) continue;
        // the value at this event time is where the running transition had got to
        var p = t0 < 0 ? 1 : css(Math.min(1, (events[k][0] - t0) / 0.4));
        var now = cur.map(function (v, j) { return from[j] + (v - from[j]) * p; });
        from = now; cur = next; t0 = events[k][0];
      }
      var q = t0 < 0 ? 1 : css(Math.min(1, (t - t0) / 0.4));
      return cur.map(function (v, j) { return from[j] + (v - from[j]) * q; });
    };
    var s = { t: 0 };
    var draw = function () {
      for (var i = 0; i < n; i++) {
        var v = stateAt(i, s.t), c = chars[i].style;
        c.fontWeight = Math.round(v[0]);
        c.webkitTextStrokeWidth = (sw * v[2]) + "px";
        c.webkitTextStrokeColor = v[1] > 0.5 ? "currentColor" : "transparent";
        c.paddingLeft = c.paddingRight = v[3] + "px";
      }
    };
    draw();
    tl.fromTo(s, { t: 0 }, { t: end + 0.4, duration: end + 0.4, ease: "none", onUpdate: draw, immediateRender: false }, at);
    return at + end + 0.4;
  },
  demo: {
    duration: 6,
    html: `<div class="center"><div class="col"><div class="h1 mw-kinetic-text" style="font-size:190px;letter-spacing:-0.01em">Chuyển động</div>
<div class="p">Con trỏ lướt qua, nét chữ phình lên</div></div></div>`,
    run: `MW.kineticText(q(".mw-kinetic-text"), tl, 0.3, { path: [[0, -1], [0.3, 0], [2.0, 10], [2.4, 10], [4.1, 0], [4.4, -1]] });`,
  },
};
