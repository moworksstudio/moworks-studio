// The Map Explainer film style's engine in a film: the engine, its map data, its typed face and the words of the voice, copied beside the page that loads them
// (the film's index.html or a storyboard board, which HyperFrames serves as its own web root), and the worked example for Claude to read.
import { copyFileSync, cpSync, existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { gsapFile } from "../offline-assets/index.mjs";

export const MAP_STYLE_ID = "map-explainer";
const HERE = dirname(fileURLToPath(import.meta.url));
/** Where a page loads the engine from, beside itself. */
export const ENGINE_DIR = "assets/_app/map";
const FILES = [["engine/mapfilm.js", "mapfilm.js"], ["fonts/SpecialEliteVN-Regular.ttf", "fonts/SpecialEliteVN-Regular.ttf"], ["fonts/LICENSE-SpecialElite.txt", "fonts/LICENSE-SpecialElite.txt"],
  ["data/countries-50m.json", "data/countries-50m.json"], ["data/countries-10m.json", "data/countries-10m.json"], ["data/geographic-lines.geojson", "data/geographic-lines.geojson"], ["data/lakes-50m.json", "data/lakes-50m.json"], ["data/lakes-10m.json", "data/lakes-10m.json"], ["data/CREDITS.md", "data/CREDITS.md"]];

/** Does this page load the engine? */
export const loadsMapEngine = (html) => /assets\/_app\/map\/mapfilm\.js/.test(String(html ?? ""));

/** The voice's words from a film's transcript.json, in the order spoken: [{ text, start, end }]. */
export function wordsOf(transcript) {
  const t = transcript ?? {};
  const list = Array.isArray(t) ? t : Array.isArray(t.words) && t.words.length ? t.words : (t.segments ?? []).flatMap((s) => s.words ?? []);
  return list.map((w) => ({ text: String(w.word ?? w.text ?? "").trim(), start: Number(w.start), end: Number(w.end) })).filter((w) => w.text && Number.isFinite(w.start) && Number.isFinite(w.end));
}

const same = (from, to) => { try { const a = statSync(from), b = statSync(to); return a.size === b.size && b.mtimeMs >= a.mtimeMs; } catch { return false; } };

/** R-MAP: the engine's files and words.js in <pageDir>/assets/_app/map/. words.js comes from the project's transcript.json each time, so a new voice re-times the
 *  whole film without a line of it changing. Returns the files written, relative to pageDir. */
export function placeEngine(projectDir, pageDir = projectDir) {
  const dest = join(pageDir, ...ENGINE_DIR.split("/")), written = [];
  for (const [from, to] of FILES) {
    const src = join(HERE, ...from.split("/")), dst = join(dest, ...to.split("/"));
    if (!existsSync(src) || same(src, dst)) continue;
    mkdirSync(dirname(dst), { recursive: true }); copyFileSync(src, dst); written.push(`${ENGINE_DIR}/${to}`);
  }
  // the film's page loads GSAP from the app's own copy, whoever calls finalize; a board has its own folder as its web root
  const gsap = gsapFile(), gsapTo = join(pageDir, "assets", "_app", "vendor", "gsap.min.js");
  if (existsSync(gsap) && !existsSync(gsapTo)) { mkdirSync(dirname(gsapTo), { recursive: true }); copyFileSync(gsap, gsapTo); written.push("assets/_app/vendor/gsap.min.js"); }
  // a board shows the real ground too: the film's mosaics beside it
  const mosaics = join(projectDir, ...IMAGERY_DIR.split("/")), mine = join(dest, "imagery");
  if (mosaics !== mine && existsSync(join(mosaics, "imagery.json"))) { for (const n of readdirSync(mosaics)) if (!same(join(mosaics, n), join(mine, n))) { mkdirSync(mine, { recursive: true }); copyFileSync(join(mosaics, n), join(mine, n)); written.push(`${ENGINE_DIR}/imagery/${n}`); } }
  let transcript = null; try { transcript = JSON.parse(readFileSync(join(projectDir, "transcript.json"), "utf8")); } catch { /* no voice yet */ }
  const text = `window.MAP_WORDS = ${JSON.stringify(wordsOf(transcript))};\n`, f = join(dest, "words.js");
  let was = null; try { was = readFileSync(f, "utf8"); } catch { /* first time */ }
  if (was !== text) { mkdirSync(dest, { recursive: true }); writeFileSync(f, text); written.push(`${ENGINE_DIR}/words.js`); }
  return written;
}

// ---- the real ground: Sentinel-2 cloudless 2016 by EOX. Only this year's layer is CC BY 4.0 (commercial use with the credit); 2018-2025 are non-commercial, so never another layer ----
export const IMAGERY_DIR = `${ENGINE_DIR}/imagery`;
export const EOX_LAYER = "s2cloudless_3857";
/** EOX's licence page, https://cloudless.eox.at/license-non-commercial: the attribution of the 2016 layer, shown legibly beside the imagery. */
export const EOX_CREDIT = "EOxCloudless https://cloudless.eox.at by EOX IT Services GmbH (Contains modified Copernicus Sentinel data 2016 & 2017)";
const EOX_WMS = "https://tiles.maps.eox.at/wms";
const HALF = 20037508.342789244, MAX_SIDE = 4096, FINEST = 13.9;          // Sentinel-2 is 10 m a pixel: nothing finer exists
const wrap = (lon, center) => { const d = ((lon - center + 540) % 360 + 360) % 360; return d - 180; };
const worldX = (lon, center) => (wrap(lon, center) + 180) / 360 * 256;
const worldY = (lat) => (1 - Math.log(Math.tan(Math.PI / 4 + lat * Math.PI / 360)) / Math.PI) / 2 * 256;
/** The mosaics a camera needs, as the engine's drawn ground lays out its levels: a level every 2 zooms from 7.5 up to the closest view, each only where the camera goes that close.
 *  views: [[lon, lat, z], ...]. Returns [{ z, x0, y0, sc, w, h, feather }] in world units (256 = the globe, turned to `center`). */
export function groundLevels(views, center = 0) {
  const list = views.map((v) => ({ x: worldX(Number(v[0]), center), y: worldY(Number(v[1])), z: Number(v[2]) })).filter((v) => Number.isFinite(v.x) && Number.isFinite(v.y) && Number.isFinite(v.z));
  if (!list.length) return [];
  const maxZ = Math.max(...list.map((v) => v.z)), out = [];
  for (let z = 7.5; z < maxZ + 1.9; z += 2) {
    const m = 260 * (z > 8 ? 1 : 2), near = list.filter((v) => v.z >= z - 1.2);
    if (!near.length) continue;
    const boxes = near.map((v) => { const s = 2 ** v.z, hw = (960 + m) / s, hh = (540 + m) / s; return [v.x - hw, v.y - hh, v.x + hw, v.y + hh]; });
    const x0 = Math.max(0, Math.min(...boxes.map((b) => b[0]))), y0 = Math.max(0, Math.min(...boxes.map((b) => b[1]))), x1 = Math.min(256, Math.max(...boxes.map((b) => b[2]))), y1 = Math.min(256, Math.max(...boxes.map((b) => b[3])));
    const lz = Math.min(z, maxZ + .25, FINEST);
    let sc = 2 ** lz; const big = Math.max((x1 - x0) * sc, (y1 - y0) * sc); if (big > MAX_SIDE) sc *= MAX_SIDE / big;
    out.push({ z: lz, x0, y0, sc, w: Math.ceil((x1 - x0) * sc), h: Math.ceil((y1 - y0) * sc), feather: z > 7.5 ? 120 : 0 });
    if (lz >= maxZ || lz >= FINEST) break;
  }
  return out;
}
/** A level's requests to EOX: one, or two where it crosses the antimeridian. [{ x, w, url }] (x, w: the piece's place in the level's pixels). */
export function levelRequests(lv, center = 0) {
  const x1 = lv.x0 + lv.w / lv.sc, y1 = lv.y0 + lv.h / lv.sc, merc = (y) => (128 - y) / 128 * HALF, lonOf = (x) => x / 256 * 360 - 180 + center;
  let a = lonOf(lv.x0), b = lonOf(x1);
  while (a >= 180) { a -= 360; b -= 360; }
  while (a < -180) { a += 360; b += 360; }
  const ask = (l0, l1, x, w) => ({ x, w, url: `${EOX_WMS}?service=WMS&version=1.1.1&request=GetMap&styles=&format=image/jpeg&srs=EPSG:3857&layers=${EOX_LAYER}&width=${w}&height=${lv.h}&bbox=${[l0 / 180 * HALF, merc(y1), l1 / 180 * HALF, merc(lv.y0)].map((n) => n.toFixed(2)).join(",")}` });
  if (b <= 180) return [ask(a, b, 0, lv.w)];
  const w0 = Math.round(lv.w * (180 - a) / (b - a));
  return [ask(a, 180, 0, w0), ask(-180, b - 360, w0, lv.w - w0)];
}
/** Fetch the mosaics for a camera into assets/_app/map/imagery. All or nothing: a failure leaves the film as it was and says why. { ok, levels, bytes, reused } or { ok: false, reason }. */
export async function fetchImagery(projectDir, { views, center = 0 }, { fetchFn = fetch, timeoutMs = 120000 } = {}) {
  const levels = groundLevels(views, center);
  if (!levels.length) return { ok: false, reason: "no views" };
  const dest = join(projectDir, ...IMAGERY_DIR.split("/")), spec = JSON.stringify({ center, levels });
  try { const had = JSON.parse(readFileSync(join(dest, "imagery.json"), "utf8")); if (had.spec === spec) return { ok: true, levels: levels.length, bytes: 0, reused: true, credit: EOX_CREDIT }; } catch { /* first time */ }
  const tmp = `${dest}.part`; rmSync(tmp, { recursive: true, force: true }); mkdirSync(tmp, { recursive: true });
  try {
    let bytes = 0; const out = [];
    for (const [i, lv] of levels.entries()) {
      const pieces = [];
      for (const [k, r] of levelRequests(lv, center).entries()) {
        let body = null, why = null;
        for (let t = 0; t < 2 && !body; t++) {
          try {
            const res = await fetchFn(r.url, { signal: AbortSignal.timeout(timeoutMs) });
            if (!res.ok || !/^image\//.test(res.headers.get("content-type") ?? "")) { why = `the service answered ${res.status}`; continue; }
            body = Buffer.from(await res.arrayBuffer());
          } catch (e) { why = e?.name === "TimeoutError" ? "the service did not answer in time" : String(e?.cause?.code ?? e?.message ?? e); }
        }
        if (!body) throw Object.assign(new Error(why ?? "no picture"), { code: "IMAGERY" });
        const file = `level${i}-${k}.jpg`; writeFileSync(join(tmp, file), body); bytes += body.length; pieces.push({ file, x: r.x, w: r.w });
      }
      out.push({ ...lv, pieces });
    }
    writeFileSync(join(tmp, "imagery.json"), JSON.stringify({ source: "Sentinel-2 cloudless 2016 by EOX", layer: EOX_LAYER, licence: "CC BY 4.0", credit: EOX_CREDIT, center, levels: out, spec }));
    rmSync(dest, { recursive: true, force: true }); mkdirSync(dirname(dest), { recursive: true }); renameSync(tmp, dest);
    return { ok: true, levels: out.length, bytes, reused: false, credit: EOX_CREDIT };
  } catch (e) { rmSync(tmp, { recursive: true, force: true }); return { ok: false, reason: e.message }; }
}
/** The film's own credits name the imagery (docs/CREDITS.md, its own block). */
export function imageryCredit(file) {
  const block = `<!-- mw:map-credits -->\n## Satellite imagery\n\n- ${EOX_CREDIT}. Layer ${EOX_LAYER}, CC BY 4.0 (https://cloudless.eox.at/license-non-commercial). Land cut out and graded by Moworks Studio.\n<!-- /mw:map-credits -->`;
  let text = ""; try { text = readFileSync(file, "utf8"); } catch { text = "# Credits\n"; }
  const re = /<!-- mw:map-credits -->[\s\S]*?<!-- \/mw:map-credits -->/;
  mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, re.test(text) ? text.replace(re, block) : `${text.trimEnd()}\n\n${block}\n`);
}

/** For Claude to read, from the first step: the engine, the page to start from and the worked example, in .moworks/library/map-explainer/. */
export function stageGuide(projectDir) {
  const dest = join(projectDir, ".moworks", "library", "map-explainer");
  if (existsSync(join(dest, "scaffold.html")) && same(join(HERE, "engine", "mapfilm.js"), join(dest, "mapfilm.js"))) return { files: [] };
  mkdirSync(dest, { recursive: true });
  cpSync(join(HERE, "engine"), dest, { recursive: true });
  return { files: [".moworks/library/map-explainer/mapfilm.js", ".moworks/library/map-explainer/scaffold.html", ".moworks/library/map-explainer/example/film.js"] };
}
