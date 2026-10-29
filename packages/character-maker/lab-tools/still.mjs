// node tools/still.mjs <film module under anidoodle/> <out.png>: frame 0 of that film (see mw.mjs)
import { renderFilm } from "./mw.mjs";
const [entry, out] = process.argv.slice(2);
if (!entry || !out) { console.error("usage: node tools/still.mjs <film module> <out.png>"); process.exit(2); }
try { const r = await renderFilm(process.cwd(), entry, out, { still: true }); console.log(`wrote ${out} (${r.W}x${r.H}, ${r.ms} ms)`); }
catch (e) { console.error(e.message); process.exit(1); }
