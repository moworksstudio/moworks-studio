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
const MARKED = [...VI].filter((c) => !/^[a-zA-Z]$/.test(c));
export const userFontDir = () => (process.env.LOCALAPPDATA ? join(process.env.LOCALAPPDATA, "Microsoft", "Windows", "Fonts") : null);
const slug = (s) => String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "font";
let cache = null;

function fontkit() {
  return createRequire(join(resolveRuntime().dir, "node_modules", "fontkit", "package.json"))("fontkit");
}

/** [{ family, vi, files: [{ file, weight, italic }] }], sorted by family; read once per folder change. */
export function listLocalFonts({ dir = userFontDir() } = {}) {
  if (!dir || !existsSync(dir)) return [];
  // a project's own fonts (assets/1_design/fonts) may sit in a folder per family: read the folders below too
  const names = [];
  const walk = (d, pre) => { for (const n of readdirSync(d)) { const f = join(d, n); let s; try { s = statSync(f); } catch { continue; } if (s.isDirectory()) walk(f, `${pre}${n}/`); else if (EXT.test(n)) names.push(`${pre}${n}`); } };
  walk(dir, "");
  const key = `${dir}|${names.join("|").length}|${names.length}|${statSync(dir).mtimeMs}`;
  if (cache?.key === key) return cache.list;
  const fk = fontkit();
  const fams = new Map();
  for (const n of names) {
    let f;
    try { f = fk.openSync(join(dir, ...n.split("/"))); } catch { continue; }
    const faces = f.fonts ?? [f];          // a .ttc holds several
    for (const face of faces) {
      const family = String(face.getName?.("preferredFamily") ?? face.familyName ?? "").trim();
      if (!family) continue;
      const vi = MARKED.every((c) => face.hasGlyphForCodePoint(c.codePointAt(0)));
      const axis = face.variationAxes?.wght;          // a variable font serves its whole weight range
      // CSS weights are 1-1000: a face that says 1100 (some fonts' widest) would make its @font-face rule invalid
      const cw = (n) => Math.min(1000, Math.max(1, Math.round(Number(n) || 400)));
      const weight = axis ? `${cw(axis.min)} ${cw(axis.max)}` : cw(face["OS/2"]?.usWeightClass ?? 400);
      const italic = /italic|oblique/i.test(String(face.subfamilyName ?? ""));
      const e = fams.get(family) ?? { family, vi: true, files: [] };
      e.vi = e.vi && vi;
      if (!/\.ttc$/i.test(n)) e.files.push({ file: join(dir, ...n.split("/")), weight, italic });
      fams.set(family, e);
    }
  }
  const list = [...fams.values()].filter((x) => x.files.length).sort((a, b) => a.family.localeCompare(b.family));
  cache = { key, list };
  return list;
}

const FORMAT = { ".ttf": "truetype", ".otf": "opentype", ".woff": "woff", ".woff2": "woff2" };

/** Copy a family from this PC into the project and declare it in index.html (once). Returns { family, files } or null when unknown. */
export function useLocalFont(projectDir, family, opts = {}) {
  const fam = listLocalFonts(opts).find((x) => x.family.toLowerCase() === String(family).toLowerCase());
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
    faces.push(`@font-face { font-family: "${fam.family}"; src: url("${url}") format("${FORMAT[extname(name).toLowerCase()] ?? "truetype"}"); font-weight: ${x.weight}; font-style: ${x.italic ? "italic" : "normal"}; font-display: block; }`);
  }
  const root = join(projectDir, "index.html");
  let html = readFileSync(root, "utf8");
  const mark = `data-mw="font-local-${slug(fam.family)}"`;
  if (!html.includes(mark)) {
    html = html.replace("</head>", `<style ${mark}>\n${faces.join("\n")}\n</style>\n</head>`);
    writeFileSync(root, html);
  }
  return { family: fam.family, files: fam.files.map((x) => basename(x.file)), vi: fam.vi };
}
