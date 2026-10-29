// Vocabulary: Motion Prompt (Shohei Ohtaki, MIT), 168 names in 7 packs for the things you ask
// an AI to make, each with a one-line meaning, an example ask, its numbers in words (3-6 spec lines) and the author's own Canvas 2D sample.
// The Library's fourth type, beside Motions, Blocks and Looks, under the author's name. It is words and numbers for Claude, not a runnable
// motion: a film that uses an item is written with GSAP from the item's numbers, and the item says so (credit.madeNote).
// Taken as shipped: nothing is hidden, trimmed or renamed; the author's text (en, ja, zh-Hant), numbers and sample code are kept as
// he published them, from the pinned clone's generated API (api/v1: catalog.json, en/e/<id>.txt, ja/e/<id>.txt, kit/<pack>.js).
// The only words the app adds are the "Studio note" lines in STUDIO_NOTES (where the studio's own rules already forbid a default) and the
// HyperFrames item with the same name (HF_SAME: "HF first"); both are marked as the app's, never mixed into the author's text.
// Not used: the author's skill and CLI, the gallery, make-your-own, examples/found.json (other people's posts, not MIT).
// The store (<work>/library/vocab/mp-<commit>-hf-<commit>) is named for both pins it is built at: Motion Prompt's (the items) and HyperFrames'
// (the HF_SAME ids it cites); only the store for the current pins is read, so a new pin of either is a new folder.
import { createHash } from "node:crypto";
import { cpSync, existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { APP_ROOT, expandEnv, loadPins, sourceHead } from "../version-manager/index.mjs";
import { workRoot } from "../project-service/index.mjs";

const readJson = (p, d) => { try { return JSON.parse(readFileSync(p, "utf8")); } catch { return d; } };
export const storeRoot = (root = APP_ROOT) => process.env.MW_VOCAB_ROOT ?? join(workRoot(root), "library", "vocab");
export const AUTHOR = "Shohei Ohtaki";
export const MADE_NOTE = "the author's names, meanings, numbers and Canvas 2D sample, unchanged; a film that uses an item is written with GSAP from its numbers";
const READ = "2026-10-25";

/** The pinned source: { dir, repo, commit, date, licence }. The folder is the clone (a local pin) or the copy bundled with the app. */
export function source(root = APP_ROOT) {
  const pin = loadPins(root).motionPrompt;
  if (!pin) throw new Error("config/pins.json has no motionPrompt entry");
  return { dir: expandEnv(pin.root), repo: pin.repo, commit: pin.commit, date: pin.date, licence: pin.licence, demoUrl: pin.demoUrl };
}

/** The HyperFrames registry commit the HF_SAME ids are read at: the registry's clone or bundled copy, else the pin. */
function hfCommit(root) {
  const h = loadPins(root).hyperframes;
  return sourceHead(dirname(expandEnv(h.registryRoot))) ?? h.source?.commit ?? `v${h.default}`;
}
/** The folder of the store for the current pins: mp-<Motion Prompt commit>-hf-<HyperFrames commit>. */
export const storeName = (root = APP_ROOT) => `mp-${source(root).commit.slice(0, 7)}-hf-${hfCommit(root).slice(0, 7)}`;

/** The credit of one item (the Drive CLAUDE.md rule: author, link at the commit, commit, licence, how it was made). */
export function creditOf(it, src) {
  const base = `https://github.com/${src.repo}/blob/${src.commit}`;
  return { author: `${AUTHOR} (X @showheyohtaki)`, collection: AUTHOR, link: `${base}/packs/${it.pack}/meta.json`, codeLink: `${base}/packs/${it.pack}/pack.js`,
    demoLink: src.demoUrl.replace("{id}", it.id), commit: src.commit, read: READ, licence: "MIT", notice: "MIT License, Copyright (c) 2026 Shohei Ohtaki (LICENSE)",
    made: "as shipped", madeNote: MADE_NOTE, sourceText: `${src.repo} at ${src.commit.slice(0, 7)}, packs/${it.pack}/meta.json and pack.js, element #${it.id}`, upstream: null,
    line: `// Motion Prompt #${it.id} · MIT License (c) 2026 ${AUTHOR} · https://showheyohtaki.github.io/motion-prompt/#${it.id}` };
}

/** Where the studio's own rules forbid or limit a default an item names (the item is kept and marked; the studio's rule wins when Claude
 *  chooses). Each note names the rule; the item itself is not changed. */
export const STUDIO_NOTES = {
  "015": "Particles: the studio bans floating particles as decoration (motion-craft §3); a burst at a success moment is fine, never over text.",
  "022": "Light sweep: light only ON an object (inside a card or the strokes of letters), never a streak over the whole frame (motion-craft §4).",
  "010": "Overshoot: position and size may overshoot, opacity and colour never (motion-spec §3), and no bouncy easing on text (motion-craft §3).",
  "123": "Bounce: position and size only; no bouncy easing on text (motion-craft §3).",
  "040": "Freeze frame: nothing is still for more than 2 s and the camera never stops (moworks-alive); hold it with a micro drift, at most about 1 s.",
  "124": "Wiggle: text that moves while it is read is banned (motion-craft §3); use it on shapes, or on text before it must be read.",
  "129": "Text scramble: only while the text is not yet being read; it must settle and hold its reading time (motion-craft §4).",
  "130": "Wave text: text that moves while it is read is banned (motion-craft §3); only as an entrance or an accent, then still readable.",
  "095": "Animated gradient: purple or blue gradients and a title on a gradient are banned defaults (motion-craft §3); take the colours from the film's own design.",
  "109": "Lens flare: banned as a default (motion-craft §3); only when the owner or the brief names it.",
  "119": "Light leak: no light leak or white flash over the whole frame (motion-craft §4); only when the owner or the brief names it.",
  "118": "Film grain: no 'cinematic' grade + vignette + grain over footage by default (motion-craft §4); only when the owner or the brief names it.",
  "112": "Vignette: no 'cinematic' grade + vignette + grain over footage by default (motion-craft §4); only when the owner or the brief names it.",
  "117": "Teal and orange: a 'cinematic' grade over footage is not a default (motion-craft §4); only when the owner or the brief names it.",
};
/** The HyperFrames registry item that already covers the same name ("HF first", the registry at the pinned commit): cite it (source kind
 *  "library", its Library id) before this item's numbers. */
export const HF_SAME = {
  "001": "hf:component/spring-pop", "006": "hf:component/typewriter", "007": "hf:component/count-up", "020": "hf:component/zoom-through-transition",
  "023": "hf:block/glitch, hf:component/rgb-glitch-text", "025": "hf:component/pan-stations", "043": "hf:block/whip-pan, hf:component/whip-pan-cut",
};

const sha = (s) => createHash("sha256").update(s).digest("hex").slice(0, 16);
const ensureLines = (t) => String(t ?? "").replace(/\r\n/g, "\n");
/** The element's code as the author ships it: from its `// @element NN` marker to the end of api/v1/<lang>/e/<id>.txt. */
export function elementCode(eText) {
  const t = ensureLines(eText), at = t.search(/^\/\/ @element \d+/m);
  return at < 0 ? "" : t.slice(at);
}

/** Build (or bring up to date) the store from the pinned source. Items are replaced by number. Returns { dir, items, changed, commit }. */
export function buildStore({ root = APP_ROOT } = {}) {
  const src = source(root), api = join(src.dir, "api", "v1");
  if (!existsSync(join(api, "catalog.json"))) throw new Error(`Motion Prompt is not at ${src.dir}: no api/v1/catalog.json`);
  const head = sourceHead(src.dir);
  if (head && head !== src.commit) throw new Error(`The Motion Prompt clone is at ${head.slice(0, 7)} but config/pins.json pins ${src.commit.slice(0, 7)}`);
  const cat = readJson(join(api, "catalog.json"), null);
  if (!cat?.elements?.length || cat.elements.length !== cat.count) throw new Error("api/v1/catalog.json is not a Motion Prompt catalog");
  const base = storeRoot(root), dirName = storeName(root), dir = join(base, dirName), tmp = `${dir}.tmp`;
  rmSync(tmp, { recursive: true, force: true });
  mkdirSync(join(tmp, "items"), { recursive: true });
  mkdirSync(join(tmp, "kit"), { recursive: true });
  const packs = Object.fromEntries(cat.packs.map((p) => [p.pack, p]));
  for (const f of ["LICENSE", "THIRD-PARTY-NOTICES.md"]) cpSync(join(src.dir, f), join(tmp, f));
  for (const p of cat.packs) cpSync(join(api, "kit", `${p.pack}.js`), join(tmp, "kit", `${p.pack}.js`));
  // what "changed" counts against: this store, else the one built last at other pins (current.json)
  const last = readJson(join(base, "current.json"), null)?.dir, prevDir = existsSync(join(dir, "catalog.json")) || !last ? dir : join(base, last);
  const old = new Map((readJson(join(prevDir, "catalog.json"), { items: [] }).items ?? []).map((x) => [x.id, x]));
  const out = [];
  let changed = 0;
  for (const e of cat.elements) {
    const en = readFileSync(join(api, "en", "e", `${e.id}.txt`), "utf8"), ja = existsSync(join(api, "ja", "e", `${e.id}.txt`)) ? readFileSync(join(api, "ja", "e", `${e.id}.txt`), "utf8") : null;
    if (!elementCode(en)) throw new Error(`#${e.id}: no element code in en/e/${e.id}.txt`);
    writeFileSync(join(tmp, "items", `${e.id}.en.txt`), en);
    if (ja) writeFileSync(join(tmp, "items", `${e.id}.ja.txt`), ja);
    const pk = packs[e.pack], cats = Object.fromEntries(pk.categories.map((c) => [c.slug, c]));
    const hash = sha(JSON.stringify(e) + en + (ja ?? "") + readFileSync(join(tmp, "kit", `${e.pack}.js`), "utf8"));
    if (old.get(e.id)?.hash !== hash) changed++;
    const item = { uid: `vocab:${e.id}`, id: e.id, pack: e.pack, packTitle: pk.title, no: e.no, slug: e.slug, category: cats[e.category]?.en ?? e.category, categoryNames: cats[e.category] ?? null,
      title: e.name.en, names: e.name, meaning: e.meaning, ask: e.ask, summary: e.summary, spec: e.spec, use: e.use ?? null, tags: e.tags ?? [], width: e.width, height: e.height, cycle: e.cycle,
      languages: Object.keys(e.name), studioNote: STUDIO_NOTES[e.id] ?? null, hfSame: HF_SAME[e.id] ?? null, hash };
    item.credit = creditOf(item, src);
    out.push(item);
  }
  writeFileSync(join(tmp, "catalog.json"), JSON.stringify({ items: out, packs: cat.packs.map(({ pack, order, title, count, first, last, categories }) => ({ pack, order, title, count, first, last, categories })) }));
  const by = (f) => { const o = {}; for (const x of out) o[f(x)] = (o[f(x)] ?? 0) + 1; return o; };
  writeFileSync(join(tmp, "manifest.json"), JSON.stringify({ source: "Motion Prompt (Shohei Ohtaki, MIT), audit 79", repo: src.repo, commit: src.commit, hfCommit: hfCommit(root), catalogVersion: cat.version, items: out.length, packs: by((x) => x.pack),
    categories: by((x) => x.category), builtAt: new Date().toISOString() }, null, 2) + "\n");
  rmSync(dir, { recursive: true, force: true });
  renameSync(tmp, dir);
  writeFileSync(join(base, "current.json"), JSON.stringify({ dir: dirName }) + "\n");
  cache = null;
  return { dir, items: out.length, changed, commit: src.commit };
}

/** The store built at the current pins: { dir, manifest } or null (not built or copied yet). */
export function currentStore(root = APP_ROOT) {
  const dir = join(storeRoot(root), storeName(root));
  if (!existsSync(join(dir, "catalog.json"))) return null;
  return { dir, manifest: readJson(join(dir, "manifest.json"), {}) };
}

let cache = null;
export const reloadItems = () => { cache = null; };
export function items(root = APP_ROOT) {
  const st = currentStore(root);
  if (!st) return [];
  if (cache?.dir === st.dir) return cache.items;
  const list = readJson(join(st.dir, "catalog.json"), { items: [] }).items;
  cache = { dir: st.dir, items: list };
  return list;
}
export const getItem = (uid, root = APP_ROOT) => items(root).find((x) => x.uid === uid) ?? null;

/** The numbers as Claude reads them (the author's English spec lines, verbatim) with the app's notes marked as the app's. */
export function specLines(it) { return it.spec?.en ?? []; }

/** What goes into the Claude feedback, the clipboard and `library_search`'s answer for one item. */
export function specText(it) {
  return [`Vocabulary "${it.title}" (${it.names?.ja ?? ""}), ${it.packTitle?.en ?? it.pack}, library id ${it.uid}: ${it.meaning.en}.`,
    `What the sample shows: ${it.summary.en}`,
    `How to ask for it: ${it.ask.en}`,
    `The author's numbers (card ${it.width}x${it.height} px, one pass ${it.cycle} s):`, ...specLines(it).map((l) => `- ${l}`),
    it.use?.en ? `When to use it: ${it.use.en}` : "",
    it.hfSame ? `App note (HyperFrames first): HyperFrames already has this: ${it.hfSame}. Cite that, and use these numbers only for what it lacks.` : "",
    it.studioNote ? `Studio note: ${it.studioNote}` : "",
    "How to use it: these are words and numbers, not code to paste. Write the move on the film's timeline with GSAP from the numbers (ease, durations, amounts scaled from the card to the film's size); the author's Canvas sample is next to this file.",
    `Credit: ${it.credit.author}, ${it.credit.licence}, ${it.credit.made}, ${it.credit.link}`].filter(Boolean).join("\n");
}

/** Copy the item into a project for Claude (.moworks/library/vocab/<id>/): the author's file with its licence line, and the pack's kit once. */
export function stageForProject(projectDir, uid, root = APP_ROOT) {
  const it = getItem(uid, root), st = currentStore(root);
  if (!it || !st) throw Object.assign(new Error("Library item not found"), { code: "NOT_FOUND" });
  const rel = `.moworks/library/vocab/${it.id}`, dest = join(projectDir, ...rel.split("/")), kitRel = `.moworks/library/vocab/kit/${it.pack}.js`;
  rmSync(dest, { recursive: true, force: true });
  mkdirSync(dest, { recursive: true });
  cpSync(join(st.dir, "items", `${it.id}.en.txt`), join(dest, `${it.id}.txt`));
  writeFileSync(join(dest, "NUMBERS.txt"), specText(it) + "\n");
  mkdirSync(join(projectDir, ".moworks", "library", "vocab", "kit"), { recursive: true });
  cpSync(join(st.dir, "kit", `${it.pack}.js`), join(projectDir, ...kitRel.split("/")));
  return { item: it, files: [`${rel}/NUMBERS.txt`, `${rel}/${it.id}.txt`, kitRel] };
}

/** The runnable script of one item: the pack's kit and the element's code as the author ships them, in one function that returns the cell. */
export function runScript(it, st) {
  const kit = readFileSync(join(st.dir, "kit", `${it.pack}.js`), "utf8"), code = elementCode(readFileSync(join(st.dir, "items", `${it.id}.en.txt`), "utf8"));
  return `(function () {\n${ensureLines(kit)}\n${code}\nreturn { cell: CELLS[${Number(it.no) - 1}], w: ${it.width}, h: ${it.height}, cycle: ${it.cycle} };\n})()`;
}

/** The author's sample as a page: his function on a canvas, played live (?t=1.2 freezes it at that second). Served at /media/vocab/<id>.html. */
export function samplePage(it, st) {
  const js = runScript(it, st).replace(/<\/script/gi, "<\\/script");
  return `<!doctype html><html><head><meta charset="utf-8"><title>${it.title}</title><style>html,body{margin:0;background:#fff}canvas{display:block;width:100%;height:auto}</style></head><body>
<canvas id="c" width="${it.width}" height="${it.height}"></canvas>
<script>
${it.credit.line}
const M = ${js}, k = document.getElementById("c").getContext("2d"), q = new URLSearchParams(location.search), t0 = performance.now();
function frame(u) { k.setTransform(1, 0, 0, 1, 0, 0); k.clearRect(0, 0, M.w, M.h); k.save(); M.cell(k, M.w, M.h, u); k.restore(); }
if (q.has("t")) frame(Number(q.get("t")) % M.cycle); else (function loop() { frame(((performance.now() - t0) / 1000) % M.cycle); requestAnimationFrame(loop); })();
</script></body></html>
`;
}

/** An item's rendered preview (previews.mjs) while it is of the item as it is now: { poster, video } (files of previews/), or null. */
export function previewOf(it, root = APP_ROOT) {
  const dir = join(storeRoot(root), "previews"), r = readJson(join(dir, `${it.id}.json`), null);
  return r?.preview && r.hash === it.hash && existsSync(join(dir, r.preview.video)) ? r.preview : null;
}
/** Take the previews of another previews folder (the one that came with the app) for the items that have none of their own as they are now
 *  and whose preview there is of the item as it is now; a preview made here stays. Returns how many were taken. */
export function adoptPreviews(fromDir, root = APP_ROOT) {
  const dir = join(storeRoot(root), "previews");
  let n = 0;
  for (const it of items(root)) {
    if (previewOf(it, root)) continue;
    const r = readJson(join(fromDir, `${it.id}.json`), null), files = [r?.preview?.video, r?.preview?.poster].filter(Boolean);
    if (!r?.preview || r.hash !== it.hash || !files.every((f) => /^[\w.-]+$/.test(f) && existsSync(join(fromDir, f)))) continue;
    mkdirSync(dir, { recursive: true });
    for (const f of files) cpSync(join(fromDir, f), join(dir, f));
    cpSync(join(fromDir, `${it.id}.json`), join(dir, `${it.id}.json`));          // last: the record names files that are there
    n++;
  }
  return n;
}

/** A sample page or script of the store, by file name (<id>.html or <id>.js), or a rendered preview (previews/<id>.mp4 or .webp), contained
 *  in it: { type, body } or null. */
export function media(rel, root = APP_ROOT) {
  const p = /^previews\/(\d{3})\.(mp4|webp)$/.exec(rel);
  if (p) { const f = join(storeRoot(root), "previews", `${p[1]}.${p[2]}`); return existsSync(f) ? { type: p[2] === "mp4" ? "video/mp4" : "image/webp", body: readFileSync(f) } : null; }
  const m = /^(\d{3})\.(html|js)$/.exec(rel), st = currentStore(root);
  if (!m || !st) return null;
  const it = items(root).find((x) => x.id === m[1]);
  if (!it) return null;
  return m[2] === "html" ? { type: "text/html; charset=utf-8", body: samplePage(it, st) } : { type: "text/javascript; charset=utf-8", body: runScript(it, st) };
}

/** The short names table the Motion Plan reads (config/rules/motion-vocab/SKILL.md): the film packs only (motion, motion2, camera), name and
 *  meaning, with the studio's notes; every other item stays one `library_search` away (kind "vocab"). Generated, never typed by hand. */
export const GLOSSARY_PACKS = ["motion", "motion2", "camera"];
export function glossaryText(list, src) {
  const lines = [];
  lines.push("# Motion vocabulary: names and numbers for the Motion Plan",
    "",
    `From Motion Prompt (${AUTHOR}, MIT, ${`https://github.com/${src.repo}/tree/${src.commit}`}). This file is generated from the Library's Vocabulary (the app's intake of it, audit 79); do not edit it.`,
    "",
    "Use the names: a name is the word people in the field use, so put it in a row's `behavior` when it names the move (\"dolly in 5.8 m over 2.9 s\"), and in the shot's `says`. The numbers are not in this file:",
    "call **library_search** with kind \"vocab\" and the name (\"dolly zoom\") to read the author's numbers for it, then write your own numbers for this film. A vocabulary item is words and numbers, never code to paste.",
    "",
    "**HyperFrames first.** Where the list says \"HF:\", HyperFrames' registry already has the move: cite that Library item (source kind \"library\", its id), and use the vocabulary only for what it lacks.",
    "**The studio's rules win.** A line marked ⚠ names a default the studio bans or limits (motion-craft, motion-spec, moworks-alive); use it only the way its note says. Camera moves are not optional: every shot keeps a `camera` row (moworks-alive), and this is where its names come from.",
    "");
  const packs = [...new Set(list.map((x) => x.pack))].filter((p) => GLOSSARY_PACKS.includes(p)).sort((a, b) => GLOSSARY_PACKS.indexOf(a) - GLOSSARY_PACKS.indexOf(b));
  for (const p of packs) {
    const mine = list.filter((x) => x.pack === p);
    lines.push(`## ${mine[0].packTitle.en} (#${mine[0].id}-${mine.at(-1).id})`, "");
    for (const c of [...new Set(mine.map((x) => x.category))]) {
      lines.push(`**${c}**`);
      for (const x of mine.filter((y) => y.category === c)) {
        const hf = x.hfSame ? ` HF: ${x.hfSame}.` : "", warn = x.studioNote ? ` ⚠ ${x.studioNote}` : "";
        lines.push(`- #${x.id} ${x.title}: ${x.meaning.en}.${hf}${warn}`);
      }
      lines.push("");
    }
  }
  lines.push("Items outside these three packs (UI components, landing-page and web effects, photo looks and lighting) are in the Library too: call library_search with kind \"vocab\" when a shot needs one. Credit: every item carries its author, link at the commit and licence in the Library; the files copied into the project keep the author's `// Motion Prompt #ID · MIT License` line.");
  return lines.join("\n") + "\n";
}
