// Text over a canvas film: a film drawn on a canvas reaches After Effects as one rendered
// picture (its style's AE badge "video", packages/style-ae), so its plain text (titles, captions, data labels and numbers, lower thirds,
// end cards) goes in HTML over the canvas and After Effects gets it as editable text layers, looking the same; the text the style performs
// (a pen writing each stroke, painted letters, ASCII / CRT characters) stays on the canvas as its author ships it.
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { APP_ROOT } from "../version-manager/index.mjs";
import { aeBadge, measurements } from "../style-ae/badge.mjs";

/** A film's code that draws its picture on a canvas: a <canvas>, a 2D / WebGL context, three.js' renderer. */
const DRAWS = /<canvas\b|\.getContext\(\s*["'](2d|webgl2?|bitmaprenderer)["']|\bWebGLRenderer\b/;

/** The film's own code: index.html, its compositions and their scripts, an engine's page (anidoodle/page.ts). */
function filmCode(dir) {
  const comp = (() => { try { return readdirSync(join(dir, "compositions")).filter((n) => /\.(html|m?js|ts)$/i.test(n)).map((n) => join("compositions", n)); } catch { return []; } })();
  return ["index.html", ...comp, join("anidoodle", "page.ts")].map((f) => join(dir, f)).filter((f) => existsSync(f));
}

/** Why the film is a canvas film, or null: "style" (its film style's After Effects badge is video, measured) or "film" (its own code draws
 *  on a canvas). A style not measured yet says video only until it is: its films are read by their code. */
export function canvasFilm(meta, dir = null, root = APP_ROOT) {
  const badge = aeBadge(meta?.style?.id, measurements(root));
  // textLayers: a canvas style whose app films get their plain text as layers (the badge says what the app's film gets) is one too
  if ((badge?.level === "video" && !badge.unmeasured) || badge?.textLayers) return "style";
  if (!dir) return null;
  return filmCode(dir).some((f) => { try { return DRAWS.test(readFileSync(f, "utf8")); } catch { return false; } }) ? "film" : null;
}

/** The steps that write the film's text: the Build, the Review's fixes and a chat change to the built film. */
const WRITES = (step, meta) => ["build", "qcReview"].includes(step) || (!step && !!(meta?.pipeline?.finished || meta?.pipeline?.ran?.build));

/** What Claude is told in those steps of a canvas film, "" otherwise. */
export function canvasTextLine(meta, dir = null, step = null, root = APP_ROOT) {
  if (!WRITES(step, meta)) return "";
  const why = canvasFilm(meta, dir, root);
  if (!why) return "";
  return `This film draws on a canvas (${why === "style" ? "its film style reaches After Effects only as the rendered picture" : "its code draws its picture on a canvas"}), so its text splits in two kinds (moworks-studio §8, owner 27/10). `
    + "1. Plain text (titles, subtitles and captions, data labels and numbers, lower thirds, end cards) goes in HTML elements over the canvas, so After Effects gets editable text layers: the style's own font, size, colour, place, timing and motion, the frame looking the same as before, moved by the composition's film time, and the canvas no longer drawing it. A grain, paper, light or texture the style lays over the whole frame goes over that text too, as a CSS overlay on top. Text that cannot be made to look the same stays on the canvas, with why in NOTES.md. "
    + "2. Performed text, whose look or reveal is the style's own drawing (a pen writing each stroke, painted letters, ASCII or CRT characters), stays on the canvas exactly as the author ships it. "
    + "Never edit HyperFrames' skills or the style author's sources for this: the film's own files only.";
}
