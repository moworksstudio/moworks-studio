// Vietnamese letters and the fonts that draw them, in one place (audit/112 2.4): the letters (every vowel with each tone mark, đ Đ), the
// marked ones a font must have (plain vowels are in every font), and the font reader of the pinned runtime (fontkit, HyperFrames' own
// dependency) the checks open font files with. The export gates, the code-film glyph check, the blocks' font check, the user's fonts on this
// PC, Google Fonts' families and the thumbnails' title check all read from here. It imports nothing of the app but the runtime's place, so
// any module can import it (the gates' own file is imported by the film's finishing step, which a font module imports: a loop).
import { createRequire } from "node:module";
import { join } from "node:path";
import { resolveRuntime } from "../version-manager/index.mjs";

// the letters themselves: vi-letters.mjs (pure, the UI reads them too)
import { VI, VI_MARKED } from "./vi-letters.mjs";
export { VI, VI_MARKED };

const kits = new Map();
/** The pinned runtime's fontkit (one per runtime), or null when it is not there. */
export function fontkitFor(root = undefined) {
  const key = root ?? "";
  if (!kits.has(key)) {
    try { kits.set(key, createRequire(join(resolveRuntime(null, root).dir, "node_modules", "fontkit", "package.json"))("fontkit")); } catch { kits.set(key, null); }
  }
  return kits.get(key);
}
/** The letters (default: the marked Vietnamese ones) an open font does not draw. */
export const lacking = (font, letters = VI_MARKED) => letters.filter((c) => !font.hasGlyphForCodePoint(c.codePointAt(0)));
