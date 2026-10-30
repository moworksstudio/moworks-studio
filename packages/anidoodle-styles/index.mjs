// anidoodle: the fifth author of the Style Gallery. 32 media by Alex Greenshpun (10x Company), each a way of
// making marks drawn entirely in code (crayon, woodblock, embroidery, risograph…), read from the read-only clone at the pinned commit
// (config/pins.json anidoodle): the engine's own registry (engine/styles.gen.json) and each medium's reference (references/styles/*.md).
// A film is the author's TypeScript film module written for the project, bundled with the pinned engine by esbuild
// (hf-edit/anidoodleBuild.mjs) into one page script that exposes window.FILM; HyperFrames drives it through the app's bridge
// (hf-edit/lemoPage.mjs, R-LEMO: FILM.seek(frame)). The gallery card is the medium's tile cut from the author's style sheet
// (skills/anidoodle/assets/styles.jpg), once, into the app's work folder. The app's sound, not the engine's score.
// Credit: Alex Greenshpun (10x Company), https://github.com/alexgreensh/anidoodle at the pinned commit, Apache-2.0 with its NOTICE.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { APP_ROOT, expandEnv, loadPins, sourceHead } from "../version-manager/index.mjs";
import { workRoot } from "../project-service/index.mjs";
import { ffmpegExe } from "../library/preview-media.mjs";
import { ensureShared, linkOrCopy, sharedDir } from "../project-service/shared-stage.mjs";

export const AUTHOR = { id: "alexgreensh", name: "Alex Greenshpun (10x Company)", source: "anidoodle" };
export const LICENCE = "Apache-2.0 (with NOTICE)";
const readText = (p) => { try { return readFileSync(p, "utf8"); } catch { return ""; } };
const readJson = (p, d) => { try { return JSON.parse(readFileSync(p, "utf8")); } catch { return d; } };
const sha256 = (s) => createHash("sha256").update(s).digest("hex");
// the author's style sheet: 8 × 4 tiles of 400 × 444 px (a 392 px picture over its label), in this order
const SHEET = ["ranunculus", "colouredPencil", "koi", "scrapbook", "pixelArt", "sumiE", "woodcut", "toyBrick",
  "pocketWatch", "brokenColour", "scratchboard", "isometric", "balloon", "paintedOil", "embroidery", "halftone",
  "wren", "midCentury", "stipple", "lowPoly", "moonPhases", "charcoalErasure", "rubberHose", "flatVector",
  "fox", "paperCraft", "lighthouse", "blueprint", "mellan", "storybook", "folkTale", "dreamGlaze"];
// Each medium's category among the catalog's own (the ones the Lemo-Opuscar styles use), so the gallery filter separates them
const H = "Hand-drawn & Painting", P = "Print & Printmaking", M = "Materials & 3D";
const CATEGORY = { balloon: H, blueprint: "Graphic & Type", brokenColour: H, charcoalErasure: H, colouredPencil: H, dreamGlaze: H, embroidery: M,
  flatVector: "Graphic & Type", folkTale: H, fox: M, halftone: P, isometric: M, koi: "Cartoon & Anime", lighthouse: P, lowPoly: M, mellan: P,
  midCentury: H, moonPhases: H, paintedOil: H, paperCraft: M, pixelArt: "Games", pocketWatch: H, ranunculus: H, rubberHose: "Cartoon & Anime",
  scrapbook: P, scratchboard: H, stipple: H, storybook: H, sumiE: "East Asian Traditions", toyBrick: M, woodcut: "East Asian Traditions", wren: H,
  adaptAlmond: H, adaptAquarelle: H, adaptScrapbook: P };

/** The clone and its pin: { repo, commit, root, skill (its folder), head, intact }. */
export function anidoodleSource(root = APP_ROOT) {
  const pin = loadPins(root).anidoodle;
  if (!pin) return null;
  const dir = resolve(expandEnv(pin.root));
  return { ...pin, root: dir, skillDir: join(dir, ...(pin.skill ?? "skills/anidoodle").split("/")), head: sourceHead(dir), get intact() { return this.head === pin.commit; } };
}
export const fileLink = (src, rel) => `https://github.com/${src.repo}/blob/${src.commit}/${rel}`;
export const treeLink = (src, rel = "") => `https://github.com/${src.repo}/tree/${src.commit}${rel ? `/${rel}` : ""}`;

/** The medium's reference doc under references/styles/ (its hero module's name, or its drawing film's), or null. */
function docOf(skillDir, s) {
  for (const n of [s.id, s.drawFilm, (s.module ?? "").split("/").pop()?.replace(/\.ts$/, "")].filter(Boolean)) if (existsSync(join(skillDir, "references", "styles", `${n}.md`))) return `references/styles/${n}.md`;
  return null;
}

/** The author's house styles (styles/house/*.json): a hand adapted from a picture (adapt-a-style.md), its recipe
 *  and the plate that proves it. The medium's id is its plate's name (adaptAlmond), the way the 32 are named by their modules. */
function houseStyles(src) {
  const dir = join(src.skillDir, "styles", "house");
  let names = []; try { names = readdirSync(dir).filter((n) => n.endsWith(".json")).sort(); } catch { return []; }
  return names.flatMap((n) => {
    const j = readJson(join(dir, n), null), plate = String(j?.plate ?? "");
    const id = /\/([A-Za-z0-9]+)\.ts$/.exec(plate)?.[1];
    if (!id) return [];
    return [{ id, name: j.title ?? j.name, family: "house style", medium: String(j.recipe?.mark ?? ""), hero: null, nearest: String(j.nearest ?? "").split(/[\s(]/)[0] || null,
      module: plate, drawFilm: plate, house: j.name ?? n.replace(/\.json$/, ""), houseDoc: `styles/house/${n}` }];
  });
}

let cache = null;
/** Every medium: [{ id, name, family, medium, hero, nearest, module, drawFilm, doc, card, hash, credit }]: the 32 of the registry, then the
 *  author's house styles (house: their name; doc: their recipe). */
export function readStyles(root = APP_ROOT) {
  const src = anidoodleSource(root);
  if (!src) return [];
  const reg = readJson(join(src.skillDir, "engine", "styles.gen.json"), null);
  if (!Array.isArray(reg)) return [];
  const key = `${src.root}@${src.head}`;
  if (cache?.key === key) return cache.list;
  const rel = (p) => `${src.skill ?? "skills/anidoodle"}/${p}`;
  const list = [...reg, ...houseStyles(src)].map((s) => {
    const doc = s.houseDoc ?? docOf(src.skillDir, s);
    const body = doc ? readText(join(src.skillDir, ...doc.split("/"))) : "";
    return { id: s.id, name: s.name, family: s.family ?? null, medium: s.medium ?? "", hero: s.hero ?? null, nearest: s.nearest ?? null,
      module: s.module, drawFilm: s.drawFilm ?? null, doc, ...(s.house ? { house: s.house } : {}), category: CATEGORY[s.id] ?? null, card: SHEET.includes(s.id) ? `${s.id}.jpg` : null, hash: sha256(`${s.medium}\n${body}`).slice(0, 16),
      credit: { author: AUTHOR.name, link: fileLink(src, rel(doc ?? s.module.replace(/^engine\//, "engine/"))), commit: src.commit, licence: LICENCE,
        made: "as shipped", madeNote: `${s.house ? "the author's house style (a hand adapted from a picture: its recipe and plate)" : "anidoodle's medium and engine"}, unchanged; the film is the project's own module, bundled with the engine and driven by HyperFrames through the app's bridge` } };
  });
  cache = { key, list };
  return list;
}
export const getMedium = (id, root = APP_ROOT) => readStyles(root).find((s) => s.id === id) ?? null;
/** "anidoodle-<id>" (a style id) → the medium id ("woodcut"), or null. */
export const anidoodleId = (styleId) => (/^anidoodle-([A-Za-z0-9]+)$/.exec(String(styleId ?? ""))?.[1] ?? null);

/** The app's anidoodle store for the pinned commit: <work>/library/anidoodle/anidoodle-<commit7>/ (cards/, previews/). */
export const storeDir = (root = APP_ROOT, src = anidoodleSource(root)) => (src ? join(process.env.MW_ANIDOODLE_ROOT ?? join(workRoot(root), "library", "anidoodle"), `anidoodle-${src.commit.slice(0, 7)}`) : null);
/** A medium's preview, rendered here from the author's own drawing film (previews.mjs): { video, poster } (names under previews/) or null. */
export function previewOf(id, root = APP_ROOT) {
  const d = storeDir(root);
  if (!d) return null;
  const has = (f) => existsSync(join(d, "previews", f));
  const video = has(`${id}.mp4`) ? `${id}.mp4` : null, poster = has(`${id}.webp`) ? `${id}.webp` : null;
  return video || poster ? { video, poster } : null;
}

/** The medium's gallery card: its tile cut from the author's style sheet into <work>/library/anidoodle/<commit7>/cards/, once; or its
 *  preview (previews/<id>.mp4 and .webp, rendered from the author's drawing film). */
export function mediaFile(rel, root = APP_ROOT) {
  const p = /^previews\/([A-Za-z0-9]+)\.(mp4|webp)$/.exec(rel);
  if (p) { const d = storeDir(root), f = d && join(d, "previews", `${p[1]}.${p[2]}`); return f && existsSync(f) ? f : null; }
  const m = /^([A-Za-z0-9]+)\.jpg$/.exec(rel), src = anidoodleSource(root);
  if (!m || !src) return null;
  const i = SHEET.indexOf(m[1]);
  if (i < 0) return null;
  const dir = join(storeDir(root, src), "cards"), out = join(dir, `${m[1]}.jpg`);
  if (existsSync(out)) return out;
  const sheet = join(src.skillDir, "assets", "styles.jpg");
  if (!existsSync(sheet)) return null;
  mkdirSync(dir, { recursive: true });
  const x = (i % 8) * 400 + 4, y = Math.floor(i / 8) * 444 + 4, tmp = `${out}.tmp.jpg`;
  try { execFileSync(ffmpegExe(root), ["-v", "error", "-y", "-i", sheet, "-vf", `crop=392:392:${x}:${y}`, "-q:v", "3", tmp], { windowsHide: true }); renameSync(tmp, out); }
  catch { rmSync(tmp, { force: true }); return null; }
  return out;
}

/** The medium's own rule file for a project: its reference doc as shipped (or the registry's description) under a short header. */
export function ruleText(id, root = APP_ROOT) {
  const s = getMedium(id, root), src = anidoodleSource(root);
  if (!s) return null;
  const body = s.house ? houseText(s, src) : s.doc ? readText(join(src.skillDir, ...s.doc.split("/"))) : `# ${s.name} (\`${s.id}\`)\n\n**Medium.** ${s.medium}\n\nThe medium's code: \`${s.module}\`${s.drawFilm ? `, its drawing film \`${s.drawFilm}\`` : ""}.\n`;
  const header = ["---", `name: anidoodle-${id}`, `description: "${s.name}: the anidoodle medium (marks, edge, order, palette, motion grammar) this film is drawn in."`, "---", "",
    `> anidoodle medium **${s.name}** (\`${s.id}\`, ${s.family ?? "medium"}) · by ${AUTHOR.name} · ${s.credit.link} · Apache-2.0 · used as shipped.`,
    `> Read with .moworks/rules/anidoodle/SKILL.md (how this app builds an anidoodle film inside HyperFrames). The engine and the author's own guides are staged in .moworks/library/anidoodle/; this medium's code is \`${s.module.replace(/^engine\/src\//, "anidoodle/")}\`.`,
    "", ""].join("\n");
  return `${header}\n${body}`;
}

/** A house style's rule: its recipe as shipped (the JSON), its plate, and the medium it is nearest to. */
function houseText(s, src) {
  const near = s.nearest ? getMedium(s.nearest) : null;
  return [`# ${s.name} (\`${s.id}\`, the author's house style "${s.house}")`, "",
    "A hand the author adapted from a picture, the way `references/workflows/adapt-a-style.md` says (borrow the hand, never the picture).",
    `Its recipe below is as shipped (\`${s.doc}\`). The plate that proves it is \`${s.module.replace(/^engine\/src\//, "anidoodle/")}\`: read its header and code`,
    `before drawing${near?.doc ? `; the medium it is nearest to is ${near.name} (\`.moworks/library/anidoodle/${near.doc}\`)` : ""}. Keep the recipe's mark, edge, order, paper and palette.`,
    "", "```json", readText(join(src.skillDir, ...s.doc.split("/"))).trim(), "```", ""].join("\n");
}

// What a project gets of the skill (paths under skills/anidoodle): the engine's source and the author's guides from the first step; since
// also the worked example (Mechanical Lepidoptera: to study, never to copy), the house styles and the launch kit's facts
const STAGED = ["engine/src", "references", "SKILL.md", "example", "styles/house", "engine/facts"];

/** The engine's source, the author's SKILL.md, references, worked example, house styles and LICENSE/NOTICE in .moworks/library/anidoodle/
 *  (from the first step: the engine is the drawing tool, not a demo to copy): a link to the pin's copy made once in the shared stage
 *  (project-service/shared-stage.mjs: runtime/stage/library/anidoodle@<commit>), a copy of it on a drive that takes no link. Returns
 *  { files } (what is new to the film: nothing when it was there already). */
export function stageEngine(projectDir, root = APP_ROOT) {
  const src = anidoodleSource(root);
  if (!src) throw Object.assign(new Error("anidoodle is not pinned"), { code: "NOT_FOUND" });
  const dest = join(projectDir, ".moworks", "library", "anidoodle");
  const whole = (d) => readText(join(d, "PINNED")).trim() === src.commit && STAGED.every((rel) => existsSync(join(d, ...rel.split("/"))) || !existsSync(join(src.skillDir, ...rel.split("/"))));
  const shared = ensureShared(sharedDir(root, "library", `anidoodle@${src.commit}`), (to) => fillEngine(to, src), whole);
  const was = existsSync(join(dest, "PINNED"));
  if (linkOrCopy(dest, shared) === "same") return { files: [] };
  return { files: was ? [] : [".moworks/library/anidoodle/SKILL.md", ".moworks/library/anidoodle/CREDIT.md"] };          // a copy of the same engine made a link: nothing new to read
}
function fillEngine(dest, src) {
  const copy = (rel) => { if (existsSync(join(src.skillDir, ...rel.split("/")))) cpSync(join(src.skillDir, ...rel.split("/")), join(dest, ...rel.split("/")), { recursive: true }); };
  STAGED.forEach(copy);
  for (const f of ["LICENSE", "NOTICE"]) if (existsSync(join(src.root, f))) cpSync(join(src.root, f), join(dest, f));
  writeFileSync(join(dest, "CREDIT.md"), `# anidoodle, staged for this project\n\nBy ${AUTHOR.name}. ${treeLink(src, src.skill ?? "skills/anidoodle")} (commit ${src.commit}), Apache-2.0 with NOTICE.\n`
    + "The engine's source (engine/src), the author's SKILL.md and references, the worked example (example/: study it, never copy it), the house\n"
    + "styles (styles/house/) and the launch kit's example facts (engine/facts/). The author's tools (engine/tools) are not here: Moworks Studio runs\n"
    + "every command. Import the engine as `anidoodle/...` (the app bundles it); never edit these files.\n");
  writeFileSync(join(dest, "PINNED"), `${src.commit}\n`);
}
