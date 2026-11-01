// The Map Explainer's lakes: Natural Earth's lake polygons, cut down to what the engine draws (name and rings, a thousandth of a degree). Run by hand when the source is updated:
//   node tools/map-lakes.mjs <ne_50m_lakes.geojson> <ne_10m_lakes.geojson>
// Source and commit: packages/map-explainer/data/CREDITS.md.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const DATA = join(dirname(fileURLToPath(import.meta.url)), "..", "packages", "map-explainer", "data");
const round = (ring) => {
  const out = [];
  for (const [lon, lat] of ring) {
    const p = [Math.round(lon * 1000) / 1000, Math.round(lat * 1000) / 1000], l = out.at(-1);
    if (!l || l[0] !== p[0] || l[1] !== p[1]) out.push(p);
  }
  return out;
};
const cut = (file, to) => {
  const g = JSON.parse(readFileSync(file, "utf8")), lakes = [];
  for (const f of g.features) {
    const polys = f.geometry?.type === "Polygon" ? [f.geometry.coordinates] : f.geometry?.type === "MultiPolygon" ? f.geometry.coordinates : [];
    const rings = polys.flat().map(round).filter((r) => r.length > 3);
    if (rings.length) lakes.push({ name: f.properties?.name ?? "", rings });
  }
  writeFileSync(join(DATA, to), JSON.stringify({ lakes }));
  console.log(to, lakes.length, "lakes");
};
cut(process.argv[2], "lakes-50m.json");
cut(process.argv[3], "lakes-10m.json");
