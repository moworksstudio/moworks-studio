// mg-styles-15: the fourth author of the Style Gallery. 15 motion-design styles by Vincentwei1021, each a
// prompt (prompts/<id>.md: output spec, technical route, creative seed, signature features, how to work) and a 10-second film made in
// code with its full source (demos/<id>/), read from the read-only clone at the pinned commit (config/pins.json mgStyles; shallow and
// sparse: no videos, no audio samples). Nothing is downloaded at run time: the gallery shows the author's film card (docs/readme/films),
// the demo film is a link to the author's page. Same contract as Lemo-Opuscar, so a film is built inside HyperFrames through the same
// bridge (hf-edit/lemoPage.mjs, R-LEMO: renderAt(t) / __ready); the app's sound, not the author's.
// Credit: Vincentwei1021, https://github.com/Vincentwei1021/mg-styles-15 at the pinned commit, MIT, used as shipped.
import { createHash } from "node:crypto";
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join, resolve, sep } from "node:path";
import { APP_ROOT, expandEnv, loadPins, sourceHead } from "../version-manager/index.mjs";

export const AUTHOR = { id: "vincentwei", name: "Vincentwei1021", source: "mg-styles-15" };
export const LICENCE = "MIT";
const CATEGORY = "Motion design (15)";
const readText = (p) => { try { return readFileSync(p, "utf8"); } catch { return ""; } };
const sha256 = (s) => createHash("sha256").update(s).digest("hex");
const NOTES = {          // what the gallery and Claude must know, from the prompt and the demo themselves
  "04-3d-render": "The demo film was rendered in Blender; in this app the style is built in three.js inside HyperFrames.",
  "19-paperclip": "The style is named after the look of PaperClip, a real Chinese science channel (Lin Chao): use its grammar, never its name, characters or brand.",
};

// The gallery's one line per style (written for the app from the prompt's signature features, 视觉特征) and its category among the
// catalog's own (the ones the Lemo-Opuscar styles use), so the filter separates the styles
const LOOK = {
  "01-flat-vector": ["Flat explainer look: solid colour blocks, geometric characters, no outlines, a bright brand palette, elastic overshoot entrances.", "Graphic & Type"],
  "02-line-art": ["One continuous thin line draws itself, turns and becomes the next shape; one or two colours on a lot of empty space.", "Graphic & Type"],
  "03-isometric": ["A miniature world in 30° isometric projection: buildings grow up from the ground, the camera slides on parallel rails.", "Materials & 3D"],
  "04-3d-render": ["Rendered 3D materials (soft rubber, glass, metal) in studio light, cloner arrays, shallow depth of field, slow long-tail easing.", "Materials & 3D"],
  "05-cel-boil": ["Hand-drawn frame-by-frame feel: boiling lines, animation on twos, smear frames, cel smoke and splashes over paper grain.", "Cartoon & Anime"],
  "06-collage": ["Retro cut-out collage: photo cut-outs with white edges, halftone and newsprint, odd proportions, stop-motion jitter.", "Print & Printmaking"],
  "07-liquid": ["Shapes that flow like liquid: wave-edged wipes, drips, stretching necks and metaball merges, never a straight line.", "Motion graphics"],
  "08-morph": ["One shape morphs smoothly into the next through a simple in-between form, with squash and stretch on every change.", "Motion graphics"],
  "09-bauhaus": ["Circles, triangles and squares on a strict grid in red, yellow, blue and black, moving mechanically on the beat.", "Graphic & Type"],
  "10-synthwave": ["80s synthwave and VHS: neon glow, a scrolling perspective grid, sunset gradients, chrome type, scanlines and RGB split.", "Cinema & Eras"],
  "12-aurora-glass": ["Slow-drifting blurred aurora colour behind frosted-glass cards with 1 px highlights: calm, translucent, premium.", "Motion graphics"],
  "18-hanazi": ["Variety-show captions for vertical video: chunky multi-outline type that pops in and changes with the mood, with doodle symbols.", "Video overlays"],
  "19-paperclip": ["Knowledge-explainer look: photos turned into white-edged stickers, flat icons and exact charts on a big canvas the camera pans across.", "Information & Keynote"],
  "20-pixel": ["Retro game pixels: big hard-edged pixels, a limited palette, low-frame-rate sprite animation, dithering and CRT scanlines.", "Games"],
  "22-hud": ["Sci-fi HUD interface: cyan and orange neon wireframes, target-lock brackets, radar sweeps and streams of monospaced data.", "Information & Keynote"],
};

/** The clone and its pin: { repo, commit, root, three, demoUrl, head, intact }. head is the clone's own commit. */
export function mgSource(root = APP_ROOT) {
  const pin = loadPins(root).mgStyles;
  if (!pin) return null;
  const dir = resolve(expandEnv(pin.root));
  return { ...pin, root: dir, head: sourceHead(dir), get intact() { return this.head === pin.commit; } };
}
export const fileLink = (src, rel) => `https://github.com/${src.repo}/blob/${src.commit}/${rel}`;
export const treeLink = (src, rel = "") => `https://github.com/${src.repo}/tree/${src.commit}${rel ? `/${rel}` : ""}`;

/** The prompt's own parts: { cn, en, film, size: [w, h], fps, score, prompt (the English block), sections: { name: text } }. */
export function parsePrompt(md) {
  const h1 = /^#\s+(.+)$/m.exec(md)?.[1]?.trim() ?? "";
  // "<Chinese name> <English name>": the English part starts after the last CJK or full-width character
  let cut = -1;
  for (let i = 0; i < h1.length; i++) if (/[　-鿿＀-￯]/.test(h1[i])) cut = i;
  const en = cut >= 0 ? h1.slice(cut + 1).trim() : h1, cn = cut >= 0 ? h1.slice(0, cut + 1).trim() : null;
  const orig = /\*\*原片\*\*[:：]\s*(.+)$/m.exec(md)?.[1] ?? "";
  const film = /^(.*?)\s·\s\d{3,4}×\d{3,4}/.exec(orig)?.[1]?.trim() ?? orig.split("·")[0].trim();
  const size = /(\d{3,4})×(\d{3,4})/.exec(orig), fps = /(\d+)\s*fps/.exec(orig), score = /(\d+\.\d+)\s*\/\s*10/.exec(orig);
  const prompt = /```text\n([\s\S]*?)\n```/.exec(md.replace(/\r\n/g, "\n"))?.[1] ?? "";
  const sections = {};
  for (const m of prompt.split(/\n(?=# )/)) { const t = /^# ([^\n]+)\n([\s\S]*)$/.exec(m.trim()); if (t) sections[t[1].trim()] = t[2].trim(); }
  return { cn, en, film: film || null, size: size ? [Number(size[1]), Number(size[2])] : [1920, 1080], fps: fps ? Number(fps[1]) : 30,
    score: score ? Number(score[1]) : null, prompt, sections };
}

/** What the demo draws with: "three", "webgl", "svg" or "canvas" (Blender for the 3D demo). */
function engineOf(dir, id) {
  if (id === "04-3d-render") return { engine: "blender", engines: ["blender"] };
  const kinds = new Set();
  const walk = (d) => { for (const n of existsSync(d) ? readdirSync(d) : []) {
    const p = join(d, n);
    if (statSync(p).isDirectory()) { if (!/^(work|assets|node_modules)$/.test(n)) walk(p); continue; }
    if (!/\.(m?js|html)$/.test(n)) continue;
    const s = readText(p);
    if (/['"]\/node_modules\/three|from\s*['"]three/.test(s)) kinds.add("three");
    if (/getContext\(\s*['"`](?:webgl2?|experimental-webgl)['"`]/.test(s)) kinds.add("webgl");
    if (/getContext\(\s*['"`]2d['"`]/.test(s)) kinds.add("canvas");
    if (/<svg|createElementNS/.test(s)) kinds.add("svg");
  } };
  walk(dir);
  return { engine: kinds.has("three") ? "three" : kinds.has("webgl") ? "webgl" : kinds.has("svg") && !kinds.has("canvas") ? "svg" : "canvas", engines: [...kinds].sort() };
}

/** The README's card for each film: { slug: { en, film } } from its alt text ("<style>: <film>"). */
function readmeCards(src) {
  const out = {}, md = readText(join(src.root, "README.md"));
  for (const m of md.matchAll(/#(\d\d-[a-z0-9-]+)"><img [^>]*alt="([^"]+)"/g)) {
    const [en, ...film] = m[2].split(": ");
    out[m[1]] ??= { en: en.trim(), film: film.join(": ").trim() || null };
  }
  return out;
}

let cache = null;
/** Every style in the clone: [{ id, slug, en, cn, film, size, fps, aspect, dur, score, engine, engines, card, note, paths, hash, credit }]. */
export function readStyles(root = APP_ROOT) {
  const src = mgSource(root);
  if (!src || !existsSync(join(src.root, "prompts"))) return [];
  const key = `${src.root}@${src.head}`;
  if (cache?.key === key) return cache.list;
  const list = [], cards = readmeCards(src);
  for (const n of readdirSync(join(src.root, "prompts")).filter((x) => /^\d\d-[a-z0-9-]+\.md$/.test(x)).sort()) {
    const slug = n.slice(0, -3), md = readText(join(src.root, "prompts", n)), p = parsePrompt(md);
    const card = existsSync(join(src.root, "docs", "readme", "films", `${slug}.webp`)) ? `${slug}.webp` : null;
    list.push({ slug, en: cards[slug]?.en ?? p.en, cn: p.cn, film: cards[slug]?.film ?? p.film, filmOriginal: p.film, size: p.size, fps: p.fps, aspect: p.size[0] >= p.size[1] ? "16:9" : "9:16", dur: 10, score: p.score,
      seed: p.sections["Creative seed"] ?? "", signature: p.sections[Object.keys(p.sections).find((k) => k.startsWith("Signature")) ?? ""] ?? "",
      ...engineOf(join(src.root, "demos", slug), slug), card, note: NOTES[slug] ?? null, line: LOOK[slug]?.[0] ?? "", category: LOOK[slug]?.[1] ?? null,
      paths: { prompt: `prompts/${n}`, demo: `demos/${slug}` }, hash: sha256(md).slice(0, 16),
      credit: { author: AUTHOR.name, link: fileLink(src, `prompts/${n}`), demo: src.demoUrl.replace("{id}", slug), commit: src.commit, licence: LICENCE,
        made: "as shipped", madeNote: "mg-styles-15's prompt and demo source, unchanged; the film is built with HyperFrames through the app's bridge" } });
  }
  cache = { key, list };
  return list;
}
export const getMg = (slug, root = APP_ROOT) => readStyles(root).find((s) => s.slug === slug) ?? null;
/** "mg-<slug>" (a style id) → the slug ("09-bauhaus"), or null. */
export const mgSlug = (styleId) => (/^mg-(\d\d-[a-z0-9-]+)$/.exec(String(styleId ?? ""))?.[1] ?? null);

/** A gallery picture from the clone: "<slug>.webp" (the author's film card) → its file, or null. */
export function mediaFile(rel, root = APP_ROOT) {
  const m = /^(\d\d-[a-z0-9-]+)\.webp$/.exec(rel), src = mgSource(root);
  if (!m || !src) return null;
  const f = join(src.root, "docs", "readme", "films", `${m[1]}.webp`);
  return f.startsWith(join(src.root, "docs") + sep) && existsSync(f) ? f : null;
}

/** The style's own rule file for a project: the prompt as shipped under a short header. Written to .moworks/rules/mg-<slug>/SKILL.md. */
export function ruleText(slug, root = APP_ROOT) {
  const s = getMg(slug, root), src = mgSource(root);
  if (!s) return null;
  const md = readText(join(src.root, ...s.paths.prompt.split("/")));
  const header = ["---", `name: mg-${slug}`, `description: "${s.en}: the mg-styles-15 style prompt (output, technical route, creative seed, signature features) this film keeps."`, "---", "",
    `> mg-styles-15 style **${s.en}**${s.cn ? ` (${s.cn})` : ""} · by ${AUTHOR.name} · ${s.credit.link} · MIT · used as shipped.`,
    "> Read with .moworks/rules/mg-styles/SKILL.md (how this app builds such a film inside HyperFrames). The prompt's Output, length and sound are the author's defaults: the brief and the app's pipeline win (the app adds music and sound effects).",
    s.note ? `> ${s.note}` : "",
    `> The demo film (${s.film ?? "demo"}, ${s.credit.demo}) is one example; its source is staged into .moworks/library/mg/${slug}/ for the build only.`, "", ""].filter((l) => l !== "").join("\n");
  return `${header}\n\n${md}`;
}

/** Copy the demo's source (code, cue sheet, its own pictures; no audio) and the author's rubric into .moworks/library/mg/<slug>/ for
 *  Claude to read at the build. Returns { item, files }. */
export function stageDemo(projectDir, slug, root = APP_ROOT) {
  const s = getMg(slug, root), src = mgSource(root);
  if (!s) throw Object.assign(new Error("mg-styles-15 style not found"), { code: "NOT_FOUND" });
  const dest = join(projectDir, ".moworks", "library", "mg", slug);
  rmSync(dest, { recursive: true, force: true }); mkdirSync(dest, { recursive: true });
  cpSync(join(src.root, "demos", slug), join(dest, "demo"), { recursive: true, filter: (p) => !/\.(wav|flac|mp3|mp4|mov|ply)$/i.test(p) && !/[\\/](out|work)([\\/]|$)/.test(p) });
  for (const f of ["rubric.md", "template.md"]) if (existsSync(join(src.root, f))) cpSync(join(src.root, f), join(dest, f));
  writeFileSync(join(dest, "CREDIT.md"), `# ${s.en}: the mg-styles-15 demo source\n\nBy ${AUTHOR.name}. ${fileLink(src, `demos/${slug}`)} (commit ${src.commit}), MIT.\n`
    + "Read it for techniques only: never its story, brand, copy or timeline. Library paths in it (/assets/…, /node_modules/…) are rewritten by the app when the film uses them.\n");
  const rel = (f) => `.moworks/library/mg/${slug}/${f}`;
  return { item: s, files: [rel("CREDIT.md"), ...["index.html", "film.js", "main.js", "cues.json"].filter((f) => existsSync(join(dest, "demo", f))).map((f) => rel(`demo/${f}`)), rel("rubric.md")] };
}
