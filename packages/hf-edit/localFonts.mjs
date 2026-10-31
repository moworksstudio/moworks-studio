// Fonts the user installed on this PC: only the per-user font folder
// (%LOCALAPPDATA%\Microsoft\Windows\Fonts, where a font installed "for me" lands, the studio's bought and client fonts), never the
// Windows system fonts (Microsoft's licence keeps those on this PC). Each family is read with fontkit (HF's own dependency in the pinned
// runtime) and checked for every Vietnamese marked letter, the same check as the export gate. A family used in a film is copied into the
// project (assets/1_design/fonts/<family>/, the user's fonts) and declared in index.html, so the film renders offline and on another PC.
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { basename, extname, isAbsolute, join, relative, sep } from "node:path";
import { resolveRuntime } from "../version-manager/index.mjs";
import { VI } from "../hf-qa/gates.mjs";

const EXT = /\.(ttf|otf|ttc|woff2?)$/i;
// read when first needed: the export gates import the film's finishing step, which reads this file
const marked = () => [...VI].filter((c) => !/^[a-zA-Z]$/.test(c));
export const userFontDir = () => (process.env.LOCALAPPDATA ? join(process.env.LOCALAPPDATA, "Microsoft", "Windows", "Fonts") : null);
const slug = (s) => String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "font";
/** The folder name a family gets in a film (assets/1_design/fonts/<it>/). */
export const fontSlug = slug;
/** A family's name to compare by: "AcmeSansHead" and "Acme Sans Head" are one family. */
export const familyKey = (s) => String(s ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
let cache = null;

function fontkit() {
  return createRequire(join(resolveRuntime().dir, "node_modules", "fontkit", "package.json"))("fontkit");
}

/** One font file as the file itself says: [{ family, vi, weight, italic }] (a .ttc holds several). Throws when it is no font. */
export function readFaces(file) {
  const f = fontkit().openSync(file), letters = marked();
  return (f.fonts ?? [f]).map((face) => {
    const family = String(face.getName?.("preferredFamily") ?? face.familyName ?? "").trim();
    const axis = face.variationAxes?.wght;          // a variable font serves its whole weight range
    // CSS weights are 1-1000: a face that says 1100 (some fonts' widest) would make its @font-face rule invalid
    const cw = (n) => Math.min(1000, Math.max(1, Math.round(Number(n) || 400)));
    return { family, vi: letters.every((c) => face.hasGlyphForCodePoint(c.codePointAt(0))), weight: axis ? `${cw(axis.min)} ${cw(axis.max)}` : cw(face["OS/2"]?.usWeightClass ?? 400),
      italic: /italic|oblique/i.test(String(face.subfamilyName ?? "")) };
  }).filter((x) => x.family);
}

// a font that came in several formats (a type foundry's TTF, OTF, WOFF and WOFF2 of one face) is one face: the first of these is kept
const FORMAT_ORDER = [".ttf", ".otf", ".woff2", ".woff"];
const formatRank = (file) => { const i = FORMAT_ORDER.indexOf(extname(file).toLowerCase()); return i < 0 ? FORMAT_ORDER.length : i; };

/** [{ family, vi, files: [{ file, weight, italic }] }], sorted by family, one file a face; read once per folder change. */
export function listLocalFonts({ dir = userFontDir() } = {}) {
  if (!dir || !existsSync(dir)) return [];
  // a project's own fonts (assets/1_design/fonts) may sit in a folder per family: read the folders below too
  const names = [];
  const walk = (d, pre) => { for (const n of readdirSync(d)) { const f = join(d, n); let s; try { s = statSync(f); } catch { continue; } if (s.isDirectory()) walk(f, `${pre}${n}/`); else if (EXT.test(n)) names.push(`${pre}${n}`); } };
  walk(dir, "");
  const key = `${dir}|${names.join("|").length}|${names.length}|${statSync(dir).mtimeMs}`;
  if (cache?.key === key) return cache.list;
  const fams = new Map();
  for (const n of names) {
    let faces;
    try { faces = readFaces(join(dir, ...n.split("/"))); } catch { continue; }
    for (const { family, vi, weight, italic } of faces) {
      const e = fams.get(family) ?? { family, vi: true, files: [] };
      e.vi = e.vi && vi;
      if (!/\.ttc$/i.test(n)) {
        const file = join(dir, ...n.split("/")), had = e.files.findIndex((x) => x.weight === weight && x.italic === italic);
        if (had < 0) e.files.push({ file, weight, italic });
        else if (formatRank(file) < formatRank(e.files[had].file)) e.files[had] = { file, weight, italic };
      }
      fams.set(family, e);
    }
  }
  const list = [...fams.values()].filter((x) => x.files.length).sort((a, b) => a.family.localeCompare(b.family));
  cache = { key, list };
  return list;
}

const FORMAT = { ".ttf": "truetype", ".otf": "opentype", ".woff": "woff", ".woff2": "woff2" };
const faceRule = (family, url, x) => `@font-face { font-family: "${family}"; src: url("${url}") format("${FORMAT[extname(url).toLowerCase()] ?? "truetype"}"); font-weight: ${x.weight}; font-style: ${x.italic ? "italic" : "normal"}; font-display: block; }`;

/** The font files in the project's own folder (assets/1_design/fonts) by familyKey: { family, vi, css(written) }, css the @font-face rules
 *  with project-root paths under the name the film wrote. R-FONTS declares them in each file that uses the family. */
export function projectFonts(projectDir) {
  let list = [];
  try { list = listLocalFonts({ dir: join(projectDir, "assets", "1_design", "fonts") }); } catch { /* no fontkit: nothing to declare */ }
  return new Map(list.map((fam) => [familyKey(fam.family), { family: fam.family, vi: fam.vi,
    css: (written) => fam.files.map((x) => faceRule(written, relative(projectDir, x.file).split(sep).join("/"), x)).join("\n") }]));
}

/** Copy a family from this PC into the project and declare it in index.html (once). Returns { family, files } or null when unknown. */
export function useLocalFont(projectDir, family, opts = {}) {
  const fam = listLocalFonts(opts).find((x) => familyKey(x.family) === familyKey(family));
  if (!fam) return null;
  const rel = `assets/1_design/fonts/${slug(fam.family)}`;
  const faces = [];
  for (const x of fam.files) {
    const name = basename(x.file);
    // a font already in the project (the user's 1_design/fonts) is declared where it is; one from this PC is copied in first
    const inside = relative(projectDir, x.file);
    let url;
    if (inside && !inside.startsWith("..") && !isAbsolute(inside)) url = inside.split(sep).join("/");
    else {
      mkdirSync(join(projectDir, ...rel.split("/")), { recursive: true });
      if (!existsSync(join(projectDir, ...rel.split("/"), name))) copyFileSync(x.file, join(projectDir, ...rel.split("/"), name));
      url = `${rel}/${name}`;
    }
    faces.push(faceRule(fam.family, url, x));
  }
  const root = join(projectDir, "index.html");
  if (existsSync(root)) {
    let html = readFileSync(root, "utf8");
    const mark = `data-mw="font-local-${slug(fam.family)}"`;
    if (!html.includes(mark)) {
      html = html.replace("</head>", `<style ${mark}>\n${faces.join("\n")}\n</style>\n</head>`);
      writeFileSync(root, html);
    }
  }
  return { family: fam.family, files: fam.files.map((x) => basename(x.file)), vi: fam.vi };
}
