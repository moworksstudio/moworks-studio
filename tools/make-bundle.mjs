// Build app/bundle/: what a clean computer gets with the repository instead of downloading, from this computer's pinned
// sources. Each part keeps only what the app reads at run time, with its licence and credit, and no git history:
//   runtime/   the offline fonts and libraries (config/pins.json fonts, gsap, three, clipperLib, codeLibs), as installed (SHA-256 checked)
//   hf/        HyperFrames' skills/ and registry/ at the pinned commit, its skills-manifest.json and PINNED
//   styles/    lemo-opuscar, mg-styles-15, anidoodle, ClaudeAnimationBase, motion-prompt, what-if-animation: the run-time files at each
//              pinned commit, PINNED; the gallery stills re-encoded at 960 px under their own names (JPEG stays JPEG, WebP stays WebP),
//              no demo films, no audio
//   library/   the built stores (Blocks, intake, Looks, Vocabulary, tiles, anidoodle cards, the Clawd demo media at the shipped size) and
//              What If's demo film (made in the app, kept as it is)
//   MANIFEST.json  every part: files, bytes, source, commit, licence
// Usage: node tools/make-bundle.mjs [outDir] [--only part,part]   (default app/bundle; each part's folder is replaced, a part whose pinned
//   source is its own bundle folder is kept as it is, and a folder no part makes stays). Nothing is downloaded.
//   --only: remake just these parts (e.g. --only anidoodle,library-anidoodle after a pin moves): the rest of the bundle stays and
//   MANIFEST.json keeps its other entries.
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { APP_ROOT, expandEnv, loadPins } from "../packages/version-manager/index.mjs";
import { workRoot } from "../packages/project-service/index.mjs";
import { ffmpegExe } from "../packages/library/preview-media.mjs";
import { storeName as blocksStore } from "../packages/blocks-library/index.mjs";
import { storeName as looksStore } from "../packages/looks-library/index.mjs";
import { storeName as vocabStore } from "../packages/vocab-library/index.mjs";

const argv = process.argv.slice(2), onlyAt = argv.indexOf("--only");
const ONLY = onlyAt >= 0 ? new Set(String(argv[onlyAt + 1] ?? "").split(",").filter(Boolean)) : null;
const OUT = argv.filter((a, i) => onlyAt < 0 || (i !== onlyAt && i !== onlyAt + 1))[0] ?? join(APP_ROOT, "bundle"), pins = loadPins(), work = workRoot();
const wanted = (name) => !ONLY || ONLY.has(name);
const parts = [];
const rel = (base, p) => relative(base, p).split(sep).join("/");
function walk(dir, keep = () => true, base = dir) {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const n of readdirSync(dir)) {
    if (n === ".git" || n === "node_modules" || /^desktop\.ini$/i.test(n)) continue;
    const p = join(dir, n), r = rel(base, p);
    if (statSync(p).isDirectory()) out.push(...walk(p, keep, base)); else if (keep(r)) out.push(r);
  }
  return out;
}
const ff = (args) => execFileSync(ffmpegExe(), ["-v", "error", "-y", ...args], { windowsHide: true, stdio: "ignore" });
/** Copy the files of `from` that `keep` accepts into `to`; `recode(r)` names files re-encoded smaller (stills, demo films). */
function copyPart(name, from, to, { keep = () => true, recode = () => null, source, commit = null, licence }) {
  if (!wanted(name)) return;
  if (resolve(from) === resolve(to)) {          // pinned to the bundled copy itself (no clone on this computer): kept, only counted
    const files = walk(to), bytes = files.reduce((a, r) => a + statSync(join(to, ...r.split("/"))).size, 0);
    if (!files.length) return console.log(`${name}: not in ${OUT}, skipped`);
    parts.push({ name, path: rel(OUT, to), files: files.length, bytes, source, commit, licence });
    return console.log(`${name}: ${files.length} files, ${(bytes / 1048576).toFixed(1)} MB (kept: the pin is this folder)`);
  }
  rmSync(to, { recursive: true, force: true });
  const files = walk(from, keep);
  let bytes = 0;
  for (const r of files) {
    const how = recode(r), s = join(from, ...r.split("/"));
    // a still made WebP keeps its name with .webp (the app reads <base>.jpg or <base>.webp: lemo-styles picture())
    const d = join(to, ...(how === "still-to-webp" ? r.replace(/\.jpe?g$/i, ".webp") : r).split("/"));
    mkdirSync(dirname(d), { recursive: true });
    if (how === "still-webp" || how === "still-to-webp") ff(["-i", s, "-vf", "scale='min(960,iw)':-2", "-c:v", "libwebp", "-quality", "75", d]);
    else if (how === "film") ff(["-i", s, "-vf", "scale='min(640,iw)':-2,fps=24", "-c:v", "libx264", "-crf", "30", "-preset", "slow", "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-an", d]);
    else cpSync(s, d);
    bytes += statSync(d).size;
  }
  if (commit) writeFileSync(join(to, "PINNED"), `${source} ${commit}\n`);
  parts.push({ name, path: rel(OUT, to), files: files.length, bytes, source, commit, licence });
  console.log(`${name}: ${files.length} files, ${(bytes / 1048576).toFixed(1)} MB`);
}

mkdirSync(OUT, { recursive: true });

// runtime: fonts and libraries as installed by offline-assets (the same paths and SHA-256 config/pins.json lists)
// (not the .missing markers of failed font lookups: a cache, and it names the family a client's film asked for)
copyPart("fonts", join(APP_ROOT, "runtime", "fonts"), join(OUT, "runtime", "fonts"), { keep: (r) => !r.endsWith(".missing"), source: "Google Fonts and the bundled families (config/pins.json fonts)", licence: "SIL OFL 1.1 / Apache-2.0 (each family's licence in its folder)" });
copyPart("libraries", join(APP_ROOT, "runtime", "vendor"), join(OUT, "runtime", "vendor"), { source: "jsDelivr npm copies at pinned versions (config/pins.json gsap, three, clipperLib, codeLibs)", licence: "GSAP Standard License; three.js MIT; clipper-lib Boost; opentype.js, simplex-noise, p5.brush MIT; d3, topojson-client ISC; p5.js LGPL-2.1 (each LICENSE kept)" });

// hf: skills/ and registry/ at the pinned commit (the layout of the thin fetch, runtime/hf-src)
const hf = pins.hyperframes, hfRepo = dirname(expandEnv(hf.skillsRoot));
copyPart("hf-skills", expandEnv(hf.skillsRoot), join(OUT, "hf", "skills"), { source: hf.source.url, commit: null, licence: "Apache-2.0" });
copyPart("hf-registry", expandEnv(hf.registryRoot), join(OUT, "hf", "registry"), { source: hf.source.url, commit: null, licence: "Apache-2.0" });
if (wanted("hf-skills") || wanted("hf-registry")) {
  for (const f of ["skills-manifest.json", "LICENSE", "NOTICE"]) if (existsSync(join(hfRepo, f)) && resolve(hfRepo) !== resolve(OUT, "hf")) cpSync(join(hfRepo, f), join(OUT, "hf", f));
  writeFileSync(join(OUT, "hf", "PINNED"), `${hf.source.url} ${hf.source.commit}\n`);
}

// styles: the run-time files of each pinned source
const style = (key) => ({ root: expandEnv(pins[key].root), repo: pins[key].repo, commit: pins[key].commit });
const lemo = style("lemo");
copyPart("lemo-opuscar", lemo.root, join(OUT, "styles", "lemo-opuscar"), {
  keep: (r) => /^(styles|core|styleboard)\//.test(r) || /^[^/]+\.md$/.test(r) || r === "LICENSE",
  recode: (r) => /^styles\/[^/]+\/(poster\.jpg|demo\/stills\/styleframe\.jpg)$/.test(r) || /^styleboard\/img\/opuscar98\/\d+\.jpg$/.test(r) ? "still-to-webp" : null,     // 960 px WebP
  source: `https://github.com/${lemo.repo}`, commit: lemo.commit, licence: "MIT; demo stills CC BY 4.0; Poly Haven assets CC0; OPUSCAR 98 frames as shipped in the repo" });
const mg = style("mgStyles");
copyPart("mg-styles-15", mg.root, join(OUT, "styles", "mg-styles-15"), {
  keep: (r) => (/^(prompts|lib|demos|assets)\//.test(r) && !/\.(ply|hdr|wav|flac|mp3|mp4|mov)$/i.test(r) && !/^lib\/audio\/samples\//.test(r)) || /^docs\/readme\/films\/[^/]+\.webp$/.test(r) || ["LICENSE", "README.md"].includes(r),
  recode: (r) => /^docs\/readme\/films\/[^/]+\.webp$/.test(r) ? "still-webp" : null,
  source: `https://github.com/${mg.repo}`, commit: mg.commit, licence: "MIT; a few images CC0 / public domain; no audio" });
const ani = style("anidoodle");
copyPart("anidoodle", ani.root, join(OUT, "styles", "anidoodle"), {
  keep: (r) => /^skills\/anidoodle\//.test(r) || ["LICENSE", "NOTICE", "README.md"].includes(r),
  source: `https://github.com/${ani.repo}`, commit: ani.commit, licence: "Apache-2.0 with NOTICE" });
const mp = style("motionPrompt");
copyPart("motion-prompt", mp.root, join(OUT, "styles", "motion-prompt"), {
  keep: (r) => r.startsWith("api/v1/") ||["LICENSE", "THIRD-PARTY-NOTICES.md"].includes(r),          // what the intake reads: no gallery, skill, make-your-own, found.json
  source: `https://github.com/${mp.repo}`, commit: mp.commit, licence: "MIT (Copyright (c) 2026 Shohei Ohtaki)" });
const cab = style("characterKit");
copyPart("claude-animation-base", cab.root, join(OUT, "styles", "ClaudeAnimationBase"), {
  keep: (r) => ["src/core.js", "src/timeline.js", "src/clawd.js", "ANIMATION_GUIDE.md", "LICENSE", "README.md", "package.json", "package-lock.json"].includes(r),     // no docs/ (Clawd's pictures)
  source: `https://github.com/${cab.repo}`, commit: cab.commit, licence: "MIT" });
const wi = style("whatIf");
copyPart("what-if-animation", wi.root, join(OUT, "styles", "what-if-animation"), {
  // the engine, the two worked episodes, the skill, references and scripts (first-run.mjs STYLE_SOURCES.whatIf); never the author's sound
  keep: (r) => /^(studio\/src|references|scripts)\//.test(r) || ["studio/package.json", "studio/tsconfig.json", "SKILL.md", "README.md", "LICENSE"].includes(r),
  source: `https://github.com/${wi.repo}`, commit: wi.commit, licence: "MIT (Copyright (c) 2026 FreshStack)" });

// library: the built stores, so a clean computer's library is not empty: the store for the pins (the folder the app reads), never one built
// at another pin; intake has one folder (current.json)
const lib = join(work, "library");
const current = (store) => { try { return JSON.parse(readFileSync(join(lib, store, "current.json"), "utf8")).dir; } catch { return null; } };
const pinned = { blocks: blocksStore, intake: () => current("intake"), looks: looksStore };
const pointAt = (store, dir) => writeFileSync(join(OUT, "library", store, "current.json"), JSON.stringify({ dir }) + "\n");
for (const store of ["blocks", "intake", "looks"]) {
  const cur = pinned[store]();
  if (!cur || !existsSync(join(lib, store, cur, "catalog.json"))) { console.log(`${store}: no store built at the pins (${cur ?? "none"}), skipped`); continue; }
  copyPart(`library-${store}`, join(lib, store, cur), join(OUT, "library", store, cur), { source: `built by Moworks Studio (${store})`, licence: "as each item's source (credit in its catalog)" });
  if (!wanted(`library-${store}`)) continue;
  pointAt(store, cur);
  // the intake's licence texts live in the package (the store on this computer has none): copied in, so the bundle keeps them
  if (store === "intake") {
    const from = join(APP_ROOT, "packages", "intake-library", "LICENSES"), part = parts.at(-1);
    for (const r of walk(from)) { const d = join(OUT, "library", store, cur, "LICENSES", ...r.split("/")); mkdirSync(dirname(d), { recursive: true }); cpSync(join(from, ...r.split("/")), d); part.files++; part.bytes += statSync(d).size; }
  }
}
// the vocabulary: its store at the pins and the previews beside it (kept by item hash), never an older store
const vocabCur = vocabStore();
if (wanted("library-vocab") && !existsSync(join(lib, "vocab", vocabCur, "catalog.json"))) throw new Error(`vocab: no store built at the pins (${vocabCur}): run node tools/intake-motion-prompt.mjs`);
copyPart("library-vocab", join(lib, "vocab"), join(OUT, "library", "vocab"), { keep: (r) => r.startsWith(`${vocabCur}/`) || r.startsWith("previews/"),
  source: "built by Moworks Studio from Motion Prompt (Vocabulary, audit 79)", licence: "MIT (Copyright (c) 2026 Shohei Ohtaki)" });
if (wanted("library-vocab")) pointAt("vocab", vocabCur);
copyPart("library-thumbs", join(lib, "thumbs"), join(OUT, "library", "thumbs"), { source: "the Style Gallery's tiles (#202)", licence: "as each style's still" });
// the pinned commit's cards and previews only (the previews are the author's own drawing films rendered here; no logs, no older pin)
const aniStore = `anidoodle-${pins.anidoodle.commit.slice(0, 7)}`;
copyPart("library-anidoodle", join(lib, "anidoodle"), join(OUT, "library", "anidoodle"), {
  keep: (r) => new RegExp(`^${aniStore}/(cards|previews)/[A-Za-z0-9]+\\.(jpg|webp|mp4)$`).test(r),
  source: "anidoodle cards cut from the author's style sheet, and previews rendered from the author's drawing films", licence: "Apache-2.0" });
copyPart("library-characters", join(lib, "characters"), join(OUT, "library", "characters"), {
  // the kit's demo (Clawd; the sample Pip was removed) and anidoodle's own characters as shipped: never the
  // user's characters (user/, their anidoodle humans)
  keep: (r) => /^clawd\//.test(r) || /^anidoodle-human\/(mira|theo|bit|cheetah)\//.test(r),
  recode: (r) => r.endsWith(".mp4") ? "film" : null,
  source: "the Character page's demo media (Clawd: the kit's demo, a demo of the layer only, never in a film)", licence: "ClaudeAnimationBase MIT (Clawd is Anthropic's mascot); anidoodle Apache-2.0" });
// What If's demo film: made in the app, not from a pinned source, so it is only kept and counted (packages/what-if-styles DEMO)
copyPart("library-what-if", join(OUT, "library", "what-if"), join(OUT, "library", "what-if"), {
  source: "made by Moworks Studio in the What If style (FreshStack's engine): the app's ElevenLabs voice-over, Mixkit music", licence: "Moworks; engine MIT (FreshStack)" });

// --only: the other parts' entries stay as they were, in their order
let all = parts;
if (ONLY) { let old = []; try { old = JSON.parse(readFileSync(join(OUT, "MANIFEST.json"), "utf8")).parts ?? []; } catch { /* none */ }
  all = [...old.map((p) => parts.find((x) => x.name === p.name) ?? p), ...parts.filter((x) => !old.some((p) => p.name === x.name))]; }
const total = all.reduce((a, p) => a + p.bytes, 0);
writeFileSync(join(OUT, "MANIFEST.json"), JSON.stringify({ about: "What Moworks Studio ships with the repository instead of downloading (audit 60 §6). Made by tools/make-bundle.mjs.", made: new Date().toISOString(), bytes: total, parts: all }, null, 2) + "\n");
console.log(`bundle: ${(total / 1048576).toFixed(1)} MB in ${OUT}`);
