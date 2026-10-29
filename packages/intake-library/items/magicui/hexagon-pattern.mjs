// Magic UI hexagon-pattern (apps/www/registry/magicui/hexagon-pattern.tsx at efe76fc): a honeycomb <pattern> (radius 40 centre to
// vertex, gap 0, x = y = -1, flat-top "horizontal" or pointy-top "vertical"), the tile geometry of upstream's getHexSpacing /
// getTileGeometry / hexCenter (copied here, MIT), dashed strokes drawn as de-duplicated edges; filled hexagons at radius - 1; gray-400 at
// 30 %. Static upstream. Port: the same geometry; `drift` (px/s, default 0) slides it on the film's time.
export default {
  id: "hexagon-pattern",
  kind: "motion",
  title: "Hexagon Pattern",
  sub: "Nền tổ ong lục giác",
  desc: "A honeycomb background (flat-top or pointy-top hexagons) with optional gaps, dashes and filled cells, for tech, science and gaming frames.",
  category: "Backgrounds",
  tags: ["hexagon", "honeycomb", "pattern", "background", "tech", "magicui"],
  source: { path: "apps/www/registry/magicui/hexagon-pattern.tsx" },
  notes: "Static upstream; drift is this port's option. hexagons lists [col, row] cells to fill.",
  options: { radius: "40", gap: "0", x: "-1", y: "-1", direction: "horizontal | vertical (horizontal)", strokeDasharray: "'0'", hexagons: "[[col, row], ...]", color: "rgba(156,163,175,0.3)", drift: "[x, y] px/s ([0, 0])", hold: "seconds (10)" },
  defaults: { radius: 40, gap: 0, x: -1, y: -1, direction: "horizontal", strokeDasharray: "0", hexagons: [], color: "rgba(156,163,175,0.3)", drift: [0, 0], hold: 10 },
  css: `.mw-hexagon-pattern { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; overflow: visible; }`,
  markup: `<svg class="mw-hexagon-pattern" aria-hidden="true"></svg>`,
  fn: function (el, tl, at, o) {
    var NS = "http://www.w3.org/2000/svg", id = "mw-hex-" + (MW.__hp = (MW.__hp || 0) + 1), r = o.radius, dir = o.direction, gap = o.gap, s3 = Math.sqrt(3);
    var verts = function (cx, cy, rr) { var a0 = dir === "horizontal" ? 0 : 30, out = []; for (var i = 0; i < 6; i++) { var a = ((a0 + i * 60) * Math.PI) / 180; out.push([cx + rr * Math.cos(a), cy + rr * Math.sin(a)]); } return out; };
    var pts = function (cx, cy, rr) { return verts(cx, cy, rr).map(function (p) { return p[0] + "," + p[1]; }).join(" "); };
    var sp = dir === "horizontal" ? (function () { var c = (3 * r) / 2 + (s3 * gap) / 2, w = s3 * r + gap; return { col: c, row: w, tw: c * 2, th: w }; })()
      : (function () { var c = s3 * r + gap, w = (3 * r) / 2 + (s3 * gap) / 2; return { col: c, row: w, tw: c, th: w * 2 }; })();
    var canon = dir === "horizontal" ? [[sp.col / 2, sp.row / 2], [(sp.col * 3) / 2, sp.row]] : [[sp.col / 2, sp.row / 2], [sp.col, (sp.row * 3) / 2]];
    var centers = [];
    canon.forEach(function (p) {
      var cx = p[0], cy = p[1], W = sp.tw, H = sp.th;
      centers.push([cx, cy]);
      if (cy - r < 0) centers.push([cx, cy + H]); if (cy + r > H) centers.push([cx, cy - H]);
      if (cx - r < 0) centers.push([cx + W, cy]); if (cx + r > W) centers.push([cx - W, cy]);
      if (cy - r < 0 && cx - r < 0) centers.push([cx + W, cy + H]); if (cy - r < 0 && cx + r > W) centers.push([cx - W, cy + H]);
      if (cy + r > H && cx - r < 0) centers.push([cx + W, cy - H]); if (cy + r > H && cx + r > W) centers.push([cx - W, cy - H]);
    });
    var solid = !o.strokeDasharray || o.strokeDasharray === "0" || o.strokeDasharray === "none", body = "";
    if (solid) centers.forEach(function (c) { body += '<polygon fill="none" stroke="' + o.color + '" points="' + pts(c[0], c[1], r) + '"/>'; });
    else {
      var seen = {};
      centers.forEach(function (c) { var v = verts(c[0], c[1], r); for (var i = 0; i < 6; i++) { var a = v[i], b = v[(i + 1) % 6], pq = a[0] < b[0] || (a[0] === b[0] && a[1] <= b[1]) ? [a, b] : [b, a];
        var key = pq[0][0].toFixed(6) + "," + pq[0][1].toFixed(6) + "|" + pq[1][0].toFixed(6) + "," + pq[1][1].toFixed(6); if (seen[key]) continue; seen[key] = 1;
        body += '<line fill="none" stroke="' + o.color + '" x1="' + a[0] + '" y1="' + a[1] + '" x2="' + b[0] + '" y2="' + b[1] + '" stroke-dasharray="' + o.strokeDasharray + '"/>'; } });
    }
    el.innerHTML = '<defs><pattern id="' + id + '" width="' + sp.tw + '" height="' + sp.th + '" patternUnits="userSpaceOnUse" x="' + o.x + '" y="' + o.y + '">' + body + '</pattern></defs>' +
      '<rect width="100%" height="100%" fill="url(#' + id + ')" stroke="none"/>';
    var cells = document.createElementNS(NS, "svg"); cells.setAttribute("x", o.x); cells.setAttribute("y", o.y); cells.style.overflow = "visible";
    o.hexagons.forEach(function (h) {
      var cx = dir === "horizontal" ? h[0] * sp.col + sp.col / 2 : h[0] * sp.col + sp.col / 2 + (h[1] % 2 !== 0 ? sp.col / 2 : 0);
      var cy = dir === "horizontal" ? h[1] * sp.row + sp.row / 2 + (h[0] % 2 !== 0 ? sp.row / 2 : 0) : h[1] * sp.row + sp.row / 2;
      var p = document.createElementNS(NS, "polygon"); p.setAttribute("points", pts(cx, cy, r - 1)); p.setAttribute("fill", o.color); p.setAttribute("stroke", "none"); cells.appendChild(p);
    });
    el.appendChild(cells);
    if (!o.drift[0] && !o.drift[1]) return at;
    var pat = el.querySelector("pattern"), st = { t: 0 };
    var set = function () { var dx = o.drift[0] * st.t, dy = o.drift[1] * st.t; pat.setAttribute("x", o.x + dx); pat.setAttribute("y", o.y + dy); cells.setAttribute("x", o.x + dx); cells.setAttribute("y", o.y + dy); };
    set();
    tl.fromTo(st, { t: 0 }, { t: o.hold, duration: o.hold, ease: "none", onUpdate: set, immediateRender: false }, at);
    return at + o.hold;
  },
  demo: {
    duration: 6,
    css: `.holder { position: absolute; left: 0; right: 0; top: -15%; height: 130%; transform: skewY(6deg); -webkit-mask-image: radial-gradient(820px circle at center, white, transparent); mask-image: radial-gradient(820px circle at center, white, transparent); }`,
    html: `<div class="holder"><svg class="mw-hexagon-pattern" aria-hidden="true"></svg></div><div class="center"><div class="h1">Tổ ong số</div></div>`,
    run: `MW.hexagonPattern(q(".mw-hexagon-pattern"), tl, 0, { radius: 64, color: "rgba(156,163,175,0.35)", hexagons: [[10,4],[11,5],[12,4],[8,6],[13,6],[9,3],[14,3],[10,7],[12,7]], drift: [12, 6], hold: 6 });`,
  },
};
