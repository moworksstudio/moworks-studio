// The sample brief behind the Sample brief button in New project (one per style). For a user who does not know what a brief is: it shows one that fits the chosen style. Its `fields` (length, aspect ratio and
// frame rate) are what the sample was written for: the dialog shows them under Format, with one button to take them; the boxes never change by themselves.
// The text lives in the Idea Library's data (packages/idea-library/samples.json, audit/97), which the Idea Library page reads too; this
// file only looks a sample up. Where each sample comes from (kept with the data's credit fields):
// - "general" is the sample prompt shared as an image ("From idea to app with Claude Code"; author unknown), kept as written (Three.js, materials, scene timings, the finish; its SF Pro, which the app does not have, became Inter: #172, owner 01/11) with only what the dialog
//   chooses taken out: the length (15 seconds), the size (1920x1080), the frame rate (60 fps) and the render method (the app renders); its
//   fields put 0:15, 16:9 and 60 fps back in the dialog. Its Vietnamese is a full translation. The other hf-*, slideshow, what-if and
//   map-explainer samples are written for this app from each style's own inputs (config/styles.json).
// - The 66 Lemo-Opuscar styles ("lemo-<slug>"): written from each style's STYLE.md (Lemomo, MIT, ea34ff9), a story of their own, never the demo's (audit 91).
// - The 15 mg-styles-15 styles ("mg-<id>"): written from each style's prompt (Vincentwei1021, MIT, 49052d8).
// - The 35 anidoodle media ("anidoodle-<id>"): written from each medium's reference (Alex Greenshpun, Apache-2.0, f746cbd); its two other film
//   kinds (anidoodleKinds) from the author's workflows.
// - Brush cartoon: written from ClaudeAnimationBase's ANIMATION_GUIDE.md (John Heibel, MIT, 0ac8bf2). Never Clawd.
// - What If (style and film kind): our own premises from the What If formula (FreshStack, MIT, 3725a22); no channel's episode.
// Two languages, the same content; the words inside the film stay English in both, as in the original.
import { styleFamily } from "../../../packages/style-catalog/family.mjs";
import DATA from "../../../packages/idea-library/samples.json" with { type: "json" };

export const BRIEF_SAMPLES = DATA.styles;
/** Anidoodle's other film kinds (a picture that draws itself, a product launch), for any anidoodle style: { label, fields, credit, en, vi }. */
export const ANIDOODLE_KIND_SAMPLES = DATA.anidoodleKinds;
/** The What If film kind's two samples, any style: one for a style that draws characters, one for the others. */
export const WHAT_IF_SAMPLES = DATA.whatIf;
/** OPUSCAR 98 prompt number → the Lemo-Opuscar style with the same look (none when no style matches). */
export const OPUSCAR_STYLES = DATA.opuscarStyles;

const whatIfDrawn = (styleId) => ["anidoodle", "brush"].includes(styleFamily(styleId).family);          // a style that draws its cast
/** The sample a style and a film kind use: the What If kind's own (any style), else the style's. An Anidoodle style's Sample brief is
 *  "A picture that draws itself" (owner #1004); its Story film and the product launch stay in the Idea Library. */
export const sampleOf = (styleId, kind = null) => (kind === "whatIf" ? WHAT_IF_SAMPLES[whatIfDrawn(styleId) ? "characters" : "general"]
  : styleFamily(styleId).family === "anidoodle" && ANIDOODLE_KIND_SAMPLES[kind ?? "drawing"] ? ANIDOODLE_KIND_SAMPLES[kind ?? "drawing"] : BRIEF_SAMPLES[styleId] ?? BRIEF_SAMPLES.general);
/** The samples a style offers on its Sample brief button: [kind or null, label]; one for every style. The OPUSCAR 98 prompts and
 *  Anidoodle's other kinds are never samples here: they are in the Idea Library (owner #1002, #1004). */
export const samplesFor = () => [[null, "Sample brief"]];
/** The sample for a style (and film kind) in the UI language (falls back to the general one). */
export const briefSampleFor = (styleId, lang, kind = null) => sampleOf(styleId, kind)[lang === "vi" ? "vi" : "en"];
/** The dialog fields that go with a style's sample: { length, aspect, fps? }. */
export const sampleFieldsFor = (styleId, kind = null) => sampleOf(styleId, kind).fields;
/** Every sample text there is (a box still holding one of them is a sample). */
export const ALL_SAMPLES = [...Object.values(BRIEF_SAMPLES), ...Object.values(WHAT_IF_SAMPLES), ...Object.values(ANIDOODLE_KIND_SAMPLES)];
