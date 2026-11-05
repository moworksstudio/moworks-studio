// The faces of the owner's film styles that have no Vietnamese letters, each drawn by the closest face that has them (every font in a film must carry
// the Vietnamese marks, main chat 04/11/2026). The source skill's code keeps its own family names; the page declares each of those names with the twin's
// files (@font-face), so the engines draw exactly as shipped, a declared name never reaches the system (Comic Sans MS is a Windows font) and
// R-FONTS leaves it alone (a declared family). The twins:
//   Figtree (2D Explainer)              → Hanken Grotesk (bundled, OFL)     a near grotesk of the same build
//   Outfit (3D Cartoon UI, captions)    → Lexend (bundled, OFL)             a round geometric sans
//   Comic Sans MS, Comic Neue, Chalkboard SE (Inner Voice Short) → Pangolin (google/fonts, OFL, fetched once into the machine cache)
//   Caveat Brush (3D Cartoon marker)    → Sedgwick Ave Display (bundled, OFL), the marker the Map Explainer uses
//   Special Elite (Paper Collage)       → Special Elite VN (the app's: Special Elite with the Vietnamese letters added, Apache-2.0)
//   DejaVu Serif (Ricks Clip's painted and carved words) → Source Serif 4 (bundled, OFL), a sturdy text serif drawn bold
//   Arial Black (Ricks Clip's sleeping Z)                → Archivo (bundled, OFL), drawn at 900
// The faces that have Vietnamese stay themselves (Anton, Playfair Display, Open Sans, Patrick Hand): R-FONTS installs them.
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { APP_ROOT } from "../version-manager/index.mjs";
import { fontsDir } from "../offline-assets/index.mjs";
import { installViFamily } from "../hf-edit/googleFontsVi.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
export const TWINS = Object.freeze({
  "Figtree": "Hanken Grotesk", "Outfit": "Lexend", "Comic Sans MS": "Pangolin", "Comic Neue": "Pangolin", "Chalkboard SE": "Pangolin",
  "Caveat Brush": "Sedgwick Ave Display", "Special Elite": "Special Elite VN",
  "DejaVu Serif": "Source Serif 4", "Arial Black": "Archivo",
});
/** Where a page finds the twins' files, beside itself. */
export const FONT_DIR = "assets/_app/style-fonts";
const FORMAT = { ttf: "truetype", otf: "opentype", woff: "woff", woff2: "woff2" };
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const SPECIAL_ELITE_VN = join(HERE, "..", "map-explainer", "fonts");

/** A twin's files: [{ path, style, weight: [from, to] }] and its licence file, or null (not on this computer, and the download failed). */
async function twinFiles(twin, root) {
  if (twin === "Special Elite VN") return { files: [{ path: join(SPECIAL_ELITE_VN, "SpecialEliteVN-Regular.ttf"), style: "normal", weight: [400, 400] }], licence: join(SPECIAL_ELITE_VN, "LICENSE-SpecialElite.txt") };
  const bundled = JSON.parse(readFileSync(join(root, "config", "fonts.json"), "utf8")).families?.[twin];
  if (bundled?.length) {
    const dir = fontsDir(root), files = bundled.filter((f) => /^google\//.test(f.file)).map((f) => ({ path: join(dir, ...f.file.split("/")), style: f.style, weight: f.weight }));
    // its licence: beside the files, else in the copy bundled with the app (bundle/runtime/fonts keeps each family's OFL.txt)
    const folder = bundled.find((f) => /^google\//.test(f.file))?.file.split("/").slice(0, -1) ?? [];
    const lic = [join(dir, ...folder, "OFL.txt"), join(root, "bundle", "runtime", "fonts", "bundled", ...folder, "OFL.txt")].find((f) => existsSync(f)) ?? null;
    if (files.every((f) => existsSync(f.path))) return { files, licence: lic };
  }
  const got = await installViFamily(twin);
  return got ? { files: got.files.map((f) => ({ path: join(got.dir, f.file), style: f.style, weight: f.weight })), licence: got.licenceFile ? join(got.dir, got.licenceFile) : null } : null;
}

/** The source skill families a text names (a page, a film's code): the ones with a twin. */
export const twinnedIn = (text) => Object.keys(TWINS).filter((f) => new RegExp(`["'\`]${f.replace(/ /g, "\\s?")}["'\`]|google-fonts/${f.replace(/ /g, "")}\\b`).test(String(text ?? "")));

/** R-SKILL fonts: the twins of `families` copied into the project's assets/_app/style-fonts/<twin>/ and declared under the source skill's names in the page's
 *  <style data-mw="style-fonts"> (replaced each time; none when nothing is twinned), by "assets/…" (a board's stills reach the project's assets through
 *  the board's assets junction). pageRel: the page, relative to the project. Returns { css, missing }. */
export async function declareTwins(projectDir, pageRel, families, { root = APP_ROOT } = {}) {
  const page = join(projectDir, ...pageRel.split("/")), pageDir = projectDir;
  if (!existsSync(page)) return { css: "", missing: [] };
  const rules = [], missing = [], up = "";
  for (const fam of [...new Set(families)].filter((f) => TWINS[f]).sort()) {
    const twin = TWINS[fam];
    let got = null;
    try { got = await twinFiles(twin, root); } catch { /* offline: said below */ }
    if (!got) { missing.push(twin); continue; }
    const rel = `${FONT_DIR}/${slug(twin)}`, dst = join(pageDir, ...rel.split("/"));
    mkdirSync(dst, { recursive: true });
    for (const f of got.files) if (!existsSync(join(dst, basename(f.path)))) copyFileSync(f.path, join(dst, basename(f.path)));
    if (got.licence && !existsSync(join(dst, basename(got.licence)))) copyFileSync(got.licence, join(dst, basename(got.licence)));
    for (const f of got.files) rules.push(`@font-face { font-family: "${fam}"; src: url("${up}${rel}/${basename(f.path)}") format("${FORMAT[f.path.split(".").pop().toLowerCase()] ?? "truetype"}"); font-weight: ${f.weight[0] === f.weight[1] ? f.weight[0] : `${f.weight[0]} ${f.weight[1]}`}; font-style: ${f.style}; font-display: block; } /* ${twin}: ${fam} has no Vietnamese letters */`);
  }
  const was = readFileSync(page, "utf8"), html = was.replace(/\n?<style data-mw="(?:style|kit)-fonts">[\s\S]*?<\/style>/g, "");          // an older film's kit-fonts too
  const css = rules.join("\n"), next = css ? html.replace(/<\/head>/i, `<style data-mw="style-fonts">\n${css}\n</style>\n</head>`) : html;
  if (next !== was) writeFileSync(page, next);
  return { css, missing };
}
