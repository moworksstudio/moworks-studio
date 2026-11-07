// Text over a canvas film: a film drawn on a canvas reaches After Effects as one rendered
// picture (its style's AE badge "video", packages/style-ae), so its plain text (titles, captions, data labels and numbers, lower thirds,
// end cards) goes in HTML over the canvas and After Effects gets it as editable text layers, looking the same; the text the style performs
// (a pen writing each stroke, painted letters, ASCII / CRT characters) stays on the canvas as its author ships it.
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { APP_ROOT } from "../version-manager/index.mjs";
import { aeBadge, measurements } from "../style-ae/badge.mjs";

/** A film's code that draws its picture on a canvas: a <canvas>, a 2D / WebGL context, three.js' renderer. */
const DRAWS = /<canvas\b|\.getContext\(\s*["'](2d|webgl2?|bitmaprenderer)["']|\bWebGLRenderer\b/;

/** The film's own code: index.html, its compositions and their scripts, an engine's page (anidoodle/page.ts). */
function filmCode(dir) {
  const comp = (() => { try { return readdirSync(join(dir, "compositions")).filter((n) => /\.(html|m?js|ts)$/i.test(n)).map((n) => join("compositions", n)); } catch { return []; } })();
  // story/ and film/: the 2D Explainer's and Ricks Clip's own code (T38b-17)
  const own = (d) => { try { return readdirSync(join(dir, d)).filter((n) => /\.m?js$/i.test(n)).map((n) => join(d, n)); } catch { return []; } };
  // src/: a Remotion film style's own code (Stickman, 3D Cartoon, Paper Collage: src/videos/film/…; T40-11 found its text unread)
  const deep = (d, out = []) => { try { for (const e of readdirSync(join(dir, d), { withFileTypes: true })) { const r = join(d, e.name); if (e.isDirectory()) { if (!e.name.startsWith(".") && e.name !== "node_modules") deep(r, out); } else if (/\.(m?js|tsx?)$/i.test(e.name)) out.push(r); } } catch { /* none */ } return out; };
  return ["index.html", ...comp, ...own("story"), ...own("film"), ...deep("src"), join("anidoodle", "page.ts")].map((f) => join(dir, f)).filter((f) => existsSync(f));
}

/** Text drawing in a film's code: the canvas's own calls, and an engine's text helpers given words (kit.js text(ctx, "…"), drawText, typeText). */
const DRAWN = /\.(fillText|strokeText)\s*\(|\b(text|drawText|typeText|typeOn)\s*\([^()]*?["'`][^"'`\n]{2,}/g;

/** The plain text the film's own code draws into its picture: [{ file, count }]. */
export function drawnText(dir) {
  const out = [];
  for (const f of filmCode(dir).filter((x) => /\.(m?js|tsx?)$|\.html$/i.test(x))) {
    let s = ""; try { s = readFileSync(f, "utf8"); } catch { continue; }
    const n = (s.match(DRAWN) ?? []).length;
    if (n) out.push({ file: relative(dir, f).split("\\").join("/"), count: n });
  }
  return out;
}
/** Words a Remotion style's film writes in its React code (src/videos/, the film's own code; the source skill's code beside it is not read):
 *  a text prop given words (<Tag text="DUTCH" />, <TypeOn text="…" />) or words between a tag and its end (<h1>Title</h1>). The page builds them
 *  at run time, so Studio picks them but cannot edit them (T43-6: "Not editable here"). [{ file, count }] */
const REACT_PROP = /\b(?:text|title|label|caption|words?)=\{?\s*["'`]([^"'`\n]*\p{L}{2,}[^"'`\n]*)["'`]/gu;
const REACT_CHILD = /<([A-Za-z][\w.]*)\b[^<>]*>\s*([^<>{}\n]*\p{L}{2,}[^<>{}\n]*?)\s*<\/\1>/gu;
export function reactText(dir) {
  const out = [], files = [];
  const walk = (d) => { try { for (const e of readdirSync(join(dir, d), { withFileTypes: true })) { const r = join(d, e.name); if (e.isDirectory()) { if (!e.name.startsWith(".") && e.name !== "node_modules") walk(r); } else if (/\.(jsx|tsx)$/i.test(e.name)) files.push(r); } } catch { /* none */ } };
  walk(join("src", "videos"));
  for (const f of files) {
    let s = ""; try { s = readFileSync(join(dir, f), "utf8"); } catch { continue; }
    const n = (s.match(REACT_PROP) ?? []).length + (s.match(REACT_CHILD) ?? []).length;
    if (n) out.push({ file: f.split("\\").join("/"), count: n });
  }
  return out;
}
/** A film style whose own rules name the text it draws as its performed text (moworks-studio §8a, owner #1134 step 3): the film's files where
 *  that text is drawn. Ricks Clip: the words painted in its 3D world (signs, carvings, banners), its engine's code in film/ (its pack §6; T39-12). */
export const PERFORMED_TEXT = { "ricks-clip": ["film/"] };
const styleOf = (dir) => { try { return JSON.parse(readFileSync(join(dir, ".moworks", "project.json"), "utf8"))?.style?.id ?? null; } catch { return null; } };
/** Tech checks' G-CANVAS-TEXT (owner #1134, a warning): text drawn into the picture cannot be edited in Studio or After Effects. A dated line
 *  in docs/NOTES.md saying the text stays on the canvas (performed text, or why) answers it; so does the style's own naming of its performed
 *  text (PERFORMED_TEXT), for the files where that text is drawn (plain overlay text elsewhere still counts). A film style that reaches After
 *  Effects only as the rendered picture (Paper Collage, 3D Cartoon) counts the words its React code writes too (owner 06/11 #1355, T43-6):
 *  neither Studio nor After Effects can edit them. */
export function gateCanvasText(dir, root = APP_ROOT) {
  const style = styleOf(dir), own = PERFORMED_TEXT[style] ?? [];
  const react = style && canvasFilm({ style: { id: style } }, null, root) === "style" ? reactText(dir) : [];
  const hits = [...drawnText(dir), ...react].filter((h) => !own.some((p) => h.file.startsWith(p)));
  let notes = ""; try { notes = readFileSync(join(dir, "docs", "NOTES.md"), "utf8"); } catch { /* none */ }
  const said = /stays? on the canvas|performed text|cannot be made to look the same in HTML/i.test(notes);
  if (!hits.length || said) return { id: "G-CANVAS-TEXT", blocking: false, pass: true, findings: [] };
  const n = hits.reduce((k, h) => k + h.count, 0), files = [...new Set(hits.map((h) => h.file.split("/").pop()))].join(", ");
  const line = `${n} text${n === 1 ? " is" : "s are"} drawn into the picture (${files}), so ${n === 1 ? "it" : "they"} cannot be edited in Studio or After Effects. Ask Claude to move ${n === 1 ? "it" : "them"} to editable text over the picture.`;
  return { id: "G-CANVAS-TEXT", blocking: false, pass: false, warnings: 1, findings: [{ severity: "warning", code: "canvas_text", count: n, message: line, plain: line }] };
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
    + "1. Plain text (titles, subtitles and captions, data labels and numbers, lower thirds, end cards) goes in HTML elements over the canvas, so After Effects gets editable text layers: the style's own font, size, colour, place, timing and motion, the frame looking the same as before, moved by the composition's film time, and the canvas no longer drawing it. A grain, paper, light or texture the style lays over the whole frame goes over that text too, as a CSS overlay on top. Text that cannot be made to look the same stays on the canvas, with why in docs/NOTES.md. "
    + "2. Performed text, whose look or reveal is the style's own drawing (a pen writing each stroke, painted letters, ASCII or CRT characters), stays on the canvas exactly as the author ships it. "
    + "Editable first (moworks-studio §8a, owner #1134): every plain text an element, never drawn with fillText or strokeText; a text that must stay on the canvas gets its reason in docs/NOTES.md, or Tech checks' G-CANVAS-TEXT names it. "
    + "Never edit HyperFrames' skills or the style author's sources for this: the film's own files only.";
}
