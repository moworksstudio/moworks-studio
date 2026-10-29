// Magic UI animated-beam (apps/www/registry/magicui/animated-beam.tsx at efe76fc): an SVG over a container draws a quadratic path from
// the centre of one element to the centre of another (control point (midX, startY - curvature)), a faint base stroke (gray, width 2,
// opacity 0.2, round caps) and the same path stroked with a userSpaceOnUse gradient (#ffaa40 0 -> #ffaa40 -> #9c40ff 32.5 % -> #9c40ff 0)
// whose x1 / x2 run 10 % -> 110 % / 0 % -> 100 % (reverse 90 % -> -10 % / 100 % -> 0 %) every 5 s, ease cubic-bezier(0.16, 1, 0.3, 1),
// repeat forever. Port: the path is measured once (a film's layout is fixed); x1 / x2 follow the film's time.
export default {
  id: "animated-beam",
  kind: "motion",
  title: "Animated Beam",
  sub: "Tia sáng chạy giữa hai khối",
  desc: "A gradient light streak travels along a curve from one element to another over a faint base line, every 5 s, like data flowing between apps.",
  category: "Lines & beams",
  tags: ["beam", "connector", "flow", "integration", "line", "loop", "magicui"],
  source: { path: "apps/www/registry/magicui/animated-beam.tsx" },
  notes: "el is the container (position: relative); from / to are elements inside it. Upstream's demo uses brand logos (trademarks): the demo here uses plain glyphs.",
  options: { from: "element or selector", to: "element or selector", curvature: "px (0)", reverse: "false", duration: "s (5)", delay: "s (0)", repeatDelay: "s (0)",
    pathColor: "gray", pathWidth: "2", pathOpacity: "0.2", gradientStartColor: "#ffaa40", gradientStopColor: "#9c40ff", startXOffset: "0", startYOffset: "0", endXOffset: "0", endYOffset: "0", hold: "seconds (10)" },
  defaults: { from: null, to: null, curvature: 0, reverse: false, duration: 5, delay: 0, repeatDelay: 0, pathColor: "gray", pathWidth: 2, pathOpacity: 0.2,
    gradientStartColor: "#ffaa40", gradientStopColor: "#9c40ff", startXOffset: 0, startYOffset: 0, endXOffset: 0, endYOffset: 0, hold: 10 },
  uses: ["bezier"],
  css: `.mw-animated-beam { position: absolute; left: 0; top: 0; pointer-events: none; overflow: visible; }`,
  markup: `<div style="position:relative"><div class="a"></div><div class="b"></div></div>`,
  use: `MW.animatedBeam(container, tl, 0, { from: ".a", to: ".b", curvature: -75 });`,
  fn: function (el, tl, at, o) {
    var NS = "http://www.w3.org/2000/svg", A = MW.el(o.from), B = MW.el(o.to);
    var c = el.getBoundingClientRect(), ra = A.getBoundingClientRect(), rb = B.getBoundingClientRect();
    var sx = ra.left - c.left + ra.width / 2 + o.startXOffset, sy = ra.top - c.top + ra.height / 2 + o.startYOffset;
    var ex = rb.left - c.left + rb.width / 2 + o.endXOffset, ey = rb.top - c.top + rb.height / 2 + o.endYOffset;
    var d = "M " + sx + "," + sy + " Q " + (sx + ex) / 2 + "," + (sy - o.curvature) + " " + ex + "," + ey;
    var id = "mw-beam-" + (MW.__beams = (MW.__beams || 0) + 1);
    var svg = document.createElementNS(NS, "svg");
    svg.setAttribute("class", "mw-animated-beam"); svg.setAttribute("fill", "none");
    svg.setAttribute("width", c.width); svg.setAttribute("height", c.height); svg.setAttribute("viewBox", "0 0 " + c.width + " " + c.height);
    svg.innerHTML = '<path d="' + d + '" stroke="' + o.pathColor + '" stroke-width="' + o.pathWidth + '" stroke-opacity="' + o.pathOpacity + '" stroke-linecap="round"/>' +
      '<path d="' + d + '" stroke-width="' + o.pathWidth + '" stroke="url(#' + id + ')" stroke-opacity="1" stroke-linecap="round"/>' +
      '<defs><linearGradient id="' + id + '" gradientUnits="userSpaceOnUse" x1="0%" x2="0%" y1="0%" y2="0%">' +
      '<stop stop-color="' + o.gradientStartColor + '" stop-opacity="0"/><stop stop-color="' + o.gradientStartColor + '"/>' +
      '<stop offset="32.5%" stop-color="' + o.gradientStopColor + '"/><stop offset="100%" stop-color="' + o.gradientStopColor + '" stop-opacity="0"/></linearGradient></defs>';
    el.insertBefore(svg, el.firstChild);
    var g = svg.querySelector("linearGradient"), e = MW.bezier(0.16, 1, 0.3, 1);
    var X1 = o.reverse ? [90, -10] : [10, 110], X2 = o.reverse ? [100, 0] : [0, 100], P = o.duration + o.repeatDelay;
    var s = { t: 0 };
    var set = function () {
      var t = s.t - o.delay;
      if (t < 0) { g.setAttribute("x1", "0%"); g.setAttribute("x2", "0%"); return; }       // motion starts from the initial 0 %
      var f = Math.min(1, (t % P) / o.duration), u = e(f);
      g.setAttribute("x1", (X1[0] + (X1[1] - X1[0]) * u) + "%"); g.setAttribute("x2", (X2[0] + (X2[1] - X2[0]) * u) + "%");
    };
    set();
    tl.fromTo(s, { t: 0 }, { t: o.hold, duration: o.hold, ease: "none", onUpdate: set, immediateRender: false }, at);
    return at + o.hold;
  },
  demo: {
    duration: 8,
    css: `.hub { position: relative; width: 1300px; height: 640px; display: flex; justify-content: space-between; align-items: center; padding: 0 40px; }
.col3 { display: flex; flex-direction: column; justify-content: space-between; height: 560px; }
.node { position: relative; z-index: 2; width: 130px; height: 130px; border-radius: 50%; background: #fff; border: 4px solid #e4e4e7; display: grid; place-items: center; box-shadow: 0 0 40px -24px rgba(0,0,0,.8); }
.node.big { width: 170px; height: 170px; } .node svg { width: 56%; height: 56%; }`,
    html: `<div class="center"><div class="hub">
  <div class="col3"><div class="node i1"><svg viewBox="0 0 24 24" fill="none" stroke="#f97316" stroke-width="2"><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/></svg></div>
    <div class="node i2"><svg viewBox="0 0 24 24" fill="none" stroke="#0ea5e9" stroke-width="2"><path d="M4 5h16v11H8l-4 4z"/></svg></div>
    <div class="node i3"><svg viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2"><path d="M7 18a5 5 0 1 1 1-9.9A6 6 0 0 1 19 10a4 4 0 0 1-1 8z"/></svg></div></div>
  <div class="node big hubc"><svg viewBox="0 0 24 24" fill="#8b5cf6"><path d="M13 2 4 14h7l-1 8 9-12h-7z"/></svg></div>
  <div class="col3"><div class="node o1"><svg viewBox="0 0 24 24" fill="none" stroke="#ec4899" stroke-width="2"><circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4-6 8-6s7 2 8 6"/></svg></div>
    <div class="node o2"><svg viewBox="0 0 24 24" fill="none" stroke="#eab308" stroke-width="2"><path d="M3 12h4l3 7 4-14 3 7h4"/></svg></div>
    <div class="node o3"><svg viewBox="0 0 24 24" fill="none" stroke="#14b8a6" stroke-width="2"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg></div></div>
</div></div>`,
    run: `var H = q(".hub"), o = { duration: 3, pathWidth: 4, hold: 8, pathColor: "#a1a1aa" };
MW.animatedBeam(H, tl, 0, Object.assign({ from: ".i1", to: ".hubc", curvature: -75, endYOffset: -10 }, o));
MW.animatedBeam(H, tl, 0, Object.assign({ from: ".i2", to: ".hubc" }, o));
MW.animatedBeam(H, tl, 0, Object.assign({ from: ".i3", to: ".hubc", curvature: 75, endYOffset: 10 }, o));
MW.animatedBeam(H, tl, 0, Object.assign({ from: ".o1", to: ".hubc", curvature: -75, endYOffset: -10, reverse: true }, o));
MW.animatedBeam(H, tl, 0, Object.assign({ from: ".o2", to: ".hubc", reverse: true }, o));
MW.animatedBeam(H, tl, 0, Object.assign({ from: ".o3", to: ".hubc", curvature: 75, endYOffset: 10, reverse: true }, o));`,
  },
};
