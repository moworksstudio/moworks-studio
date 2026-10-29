// Magic UI dotted-map (apps/www/registry/magicui/dotted-map.tsx at efe76fc): a world map of staggered dots (svg-dotted-map's createMap
// on a 150 x 75 viewBox, mapSamples 5000, dot radius 0.2, gray-500 currentColor) with orange (#FF6900) markers that pulse: a ring grows
// r -> 2.8 r and fades 1 -> 0 over 1.4 s (stroke 0.35), a second ring 0.7 s later (opacity 0.9, stroke 0.3), forever (SVG SMIL); an
// optional overlay per marker (a flag and a label pill). Port: the land comes from Natural Earth 1:110m (public domain, world-atlas
// 2.0.2, ISC) sampled on the same grid (assets/land-dots.mjs, made by tools/make-land-dots.mjs; svg-dotted-map itself is not used: its
// npm package states no licence); the pulses are tweens of r and opacity on the film's time; label pills drawn here (flags are not taken).
import { LAND_DOTS } from "./assets/land-dots.mjs";

export default {
  id: "dotted-map",
  kind: "block",
  title: "Dotted Map",
  sub: "Bản đồ chấm, ghim nhấp nháy",
  desc: "A world map drawn as staggered dots with orange location markers that pulse, optionally with label pills: for 'global offices' and 'customers worldwide'.",
  category: "3D, camera & maps",
  tags: ["map", "world", "dots", "markers", "pulse", "locations", "magicui"],
  source: { path: "apps/www/registry/magicui/dotted-map.tsx" },
  thirdParty: [{ name: "Natural Earth 1:110m land (via world-atlas 2.0.2)", author: "Natural Earth; packaged by Michael Bostock", licence: "Public domain (data); ISC (package)", link: "https://github.com/topojson/world-atlas", npm: "https://www.npmjs.com/package/world-atlas/v/2.0.2", made: "sampled on the 150 x 75 dot grid" }],
  notes: "Markers are { lat, lng, size, label }. Antarctica is left out. Upstream's flags come from flagcdn.com at runtime (remote): not taken; labels are text pills.",
  options: { dotRadius: "0.2", dotColor: "#6b7280", markerColor: "#FF6900", markers: "[{ lat, lng, size (0.3), label }]", pulse: "true", hold: "seconds (8)" },
  defaults: { dotRadius: 0.2, dotColor: "#6b7280", markerColor: "#FF6900", markers: [], pulse: true, hold: 8, land: LAND_DOTS },
  css: `.mw-dotted-map { position: relative; width: 100%; aspect-ratio: 2 / 1; }
.mw-dotted-map > svg { width: 100%; height: 100%; overflow: visible; }`,
  markup: `<div class="mw-dotted-map"></div>`,
  fn: function (el, tl, at, o) {
    var NS = "http://www.w3.org/2000/svg", svg = document.createElementNS(NS, "svg");
    svg.setAttribute("viewBox", "0 0 150 75"); el.appendChild(svg);
    var g = document.createElementNS(NS, "g"); g.setAttribute("fill", o.dotColor); svg.appendChild(g);
    o.land.split(" ").forEach(function (p) { var xy = p.split(","), c = document.createElementNS(NS, "circle"); c.setAttribute("cx", xy[0]); c.setAttribute("cy", xy[1]); c.setAttribute("r", o.dotRadius); g.appendChild(c); });
    var proj = function (lat, lng) { return [((lng + 180) / 360) * 150, ((90 - lat) / 180) * 75]; }, rings = [];
    o.markers.forEach(function (m) {
      var p = proj(m.lat, m.lng), r = m.size || 0.3;
      var dot = document.createElementNS(NS, "circle"); dot.setAttribute("cx", p[0]); dot.setAttribute("cy", p[1]); dot.setAttribute("r", r); dot.setAttribute("fill", o.markerColor);
      if (o.pulse) [[0, 1, 0.35], [0.7, 0.9, 0.3]].forEach(function (d) {
        var ring = document.createElementNS(NS, "circle"); ring.setAttribute("cx", p[0]); ring.setAttribute("cy", p[1]); ring.setAttribute("r", r); ring.setAttribute("fill", "none");
        ring.setAttribute("stroke", o.markerColor); ring.setAttribute("stroke-width", d[2]); ring.setAttribute("opacity", 0); svg.appendChild(ring); rings.push({ el: ring, r: r, delay: d[0], op: d[1] });
      });
      svg.appendChild(dot);
      if (m.label) {
        var fs = r * 0.9 * 3, w = m.label.length * fs * 0.55 + fs * 1.4, h = fs * 1.7, gx = p[0] + r * 1.6, gy = p[1] - h / 2;
        var pill = document.createElementNS(NS, "rect"); pill.setAttribute("x", gx); pill.setAttribute("y", gy); pill.setAttribute("width", w); pill.setAttribute("height", h); pill.setAttribute("rx", h / 2); pill.setAttribute("fill", "rgba(0,0,0,0.55)");
        var tx = document.createElementNS(NS, "text"); tx.setAttribute("x", gx + fs * 0.7); tx.setAttribute("y", p[1] + fs * 0.35); tx.setAttribute("font-size", fs); tx.setAttribute("fill", "#fff"); tx.setAttribute("font-weight", "600"); tx.textContent = m.label;
        svg.appendChild(pill); svg.appendChild(tx);
      }
    });
    if (!rings.length) return at;
    var s = { t: 0 }, set = function () {
      for (var i = 0; i < rings.length; i++) {
        var q = rings[i], u = s.t - q.delay;
        if (u < 0) { q.el.setAttribute("opacity", 0); continue; }
        var f = (u % 1.4) / 1.4; q.el.setAttribute("r", q.r * (1 + 1.8 * f)); q.el.setAttribute("opacity", q.op * (1 - f));
      }
    };
    set();
    tl.fromTo(s, { t: 0 }, { t: o.hold, duration: o.hold, ease: "none", onUpdate: set, immediateRender: false }, at);
    return at + o.hold;
  },
  demo: {
    duration: 7,
    css: `.mw-dotted-map { width: 1700px; } .mw-dotted-map text { font-family: Inter, sans-serif; }
.fadeout { position: absolute; inset: 0; background: radial-gradient(ellipse at center, transparent 60%, var(--bg) 100%); pointer-events: none; }`,
    html: `<div class="center"><div class="mw-dotted-map"></div></div><div class="fadeout"></div>`,
    run: `MW.dottedMap(q(".mw-dotted-map"), tl, 0, { dotColor: "#52525b", dotRadius: 0.32, markers: [
  { lat: 21.03, lng: 105.85, size: 0.7, label: "Hà Nội" }, { lat: 10.82, lng: 106.63, size: 0.7, label: "TP.HCM" }, { lat: 35.68, lng: 139.69, size: 0.6, label: "Tokyo" },
  { lat: 1.35, lng: 103.82, size: 0.5 }, { lat: 51.5, lng: -0.12, size: 0.6, label: "London" }, { lat: 40.71, lng: -74.0, size: 0.6, label: "New York" }, { lat: -33.87, lng: 151.21, size: 0.5 }], hold: 7 });`,
  },
};
