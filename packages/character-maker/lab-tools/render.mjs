// node tools/render.mjs <film module under anidoodle/> <out.mp4>: the whole film (see mw.mjs)
import { renderFilm } from "./mw.mjs";
const [entry, out] = process.argv.slice(2);
if (!entry || !out) { console.error("usage: node tools/render.mjs <film module> <out.mp4>"); process.exit(2); }
try { const r = await renderFilm(process.cwd(), entry, out); console.log(`wrote ${out} (${r.W}x${r.H}, ${r.frames} frames at ${r.fps} fps, ${r.ms} ms)`); }
catch (e) { console.error(e.message); process.exit(1); }
