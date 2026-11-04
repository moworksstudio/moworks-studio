// sync-engine.mjs: copy the shared engine into a video's own ex/ folder, so the video renders on its own.
// The engine scripts (engine/ex-*.js and engine/house-*.js), the Figtree font files (with their licence) and GSAP all
// come from this folder; nothing is fetched while rendering. Run it after `new-video.mjs`, and again whenever the engine
// changes. Never edit a video's ex/ folder: edit engine/ and sync.
//   node tools/sync-engine.mjs videos/<slug>
import fs from "node:fs";
import path from "node:path";
import { ROOT, fail } from "./lib.mjs";

const dir = process.argv[2];
if (!dir) fail("usage: node tools/sync-engine.mjs videos/<slug>");
const proj = path.resolve(ROOT, dir);
if (!fs.existsSync(path.join(proj, "index.html"))) fail(`${dir} has no index.html (make it with tools/new-video.mjs)`);

const out = path.join(proj, "ex");
fs.mkdirSync(path.join(out, "fonts"), { recursive: true });
const copy = (from, to) => {
  if (!fs.existsSync(from)) fail(`missing ${path.relative(ROOT, from)} (run npm install, then node tools/doctor.mjs)`);
  fs.copyFileSync(from, to);
};

const engine = fs.readdirSync(path.join(ROOT, "engine")).filter((f) => /^(ex|house)-.*\.js$/.test(f));
for (const f of engine) copy(path.join(ROOT, "engine", f), path.join(out, f));
const figtree = path.join(ROOT, "node_modules/@fontsource/figtree");
for (const w of [600, 700]) {
  const f = `figtree-latin-${w}-normal.woff2`;
  copy(path.join(figtree, "files", f), path.join(out, "fonts", f));
}
copy(path.join(figtree, "LICENSE"), path.join(out, "fonts", "OFL-figtree.txt"));
copy(path.join(ROOT, "node_modules/gsap/dist/gsap.min.js"), path.join(out, "gsap.min.js"));
console.log(`synced engine → ${path.relative(ROOT, out)} (${engine.length} scripts, Figtree 600/700, GSAP)`);
