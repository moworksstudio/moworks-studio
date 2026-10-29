// node packages/intake-library/tools/make-land-dots.mjs <world-atlas land-110m.json> > items/magicui/assets/land-dots.mjs
// The land of Natural Earth 1:110m (public domain, via world-atlas 2.0.2 by Michael Bostock, ISC) sampled on Magic UI dotted-map's grid:
// a 150 x 75 equirectangular view, spacing sqrt(150 x 75 / mapSamples 5000) = 1.5, odd rows shifted half a step. Writes the dots as a
// compact string "x,y x,y ..." (one decimal) for the dotted-map item. Antarctica (below 60° S) is left out, as dotted world maps usually do.
import { readFileSync } from "node:fs";

const topo = JSON.parse(readFileSync(process.argv[2], "utf8"));
const { scale = [1, 1], translate = [0, 0] } = topo.transform ?? {};
const arcs = topo.arcs.map((arc) => { let x = 0, y = 0; return arc.map(([dx, dy]) => { x += dx; y += dy; return [x * scale[0] + translate[0], y * scale[1] + translate[1]]; }); });
const arcPts = (i) => (i >= 0 ? arcs[i] : arcs[~i].slice().reverse());
const ring = (idx) => idx.flatMap((i, k) => (k ? arcPts(i).slice(1) : arcPts(i)));
const polys = [];
const geom = topo.objects.land;
for (const g of geom.type === "GeometryCollection" ? geom.geometries : [geom]) {
  if (g.type === "Polygon") polys.push(g.arcs.map(ring));
  if (g.type === "MultiPolygon") for (const p of g.arcs) polys.push(p.map(ring));
}
const inRing = (x, y, r) => { let c = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const [xi, yi] = r[i], [xj, yj] = r[j]; if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c; } return c; };
const onLand = (lon, lat) => polys.some((p) => inRing(lon, lat, p[0]) && !p.slice(1).some((h) => inRing(lon, lat, h)));
const W = 150, H = 75, step = Math.sqrt((W * H) / 5000), out = [];
for (let row = 0, y = step / 2; y < H; row++, y += step) {
  for (let x = step / 2 + (row % 2 ? step / 2 : 0); x < W; x += step) {
    const lon = (x / W) * 360 - 180, lat = 90 - (y / H) * 180;
    if (lat > -60 && onLand(lon, lat)) out.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  }
}
console.log(`// Land dots for Magic UI dotted-map's 150 x 75 grid (spacing ${step.toFixed(3)}, odd rows offset), from Natural Earth 1:110m land
// (public domain) as packaged in world-atlas 2.0.2 (Michael Bostock, ISC: registry.npmjs.org/world-atlas/-/world-atlas-2.0.2.tgz, land-110m.json),
// made by tools/make-land-dots.mjs. ${out.length} dots.
export const LAND_DOTS = "${out.join(" ")}";`);
