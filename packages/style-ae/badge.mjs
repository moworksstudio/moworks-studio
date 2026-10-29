// The After Effects badges the style catalog shows (index.mjs measures them): config/style-ae.json, shipped, under this computer's
// <work>/library/style-ae.json. Light on purpose: the catalog reads it on every build.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { APP_ROOT } from "../version-manager/index.mjs";
import { workRoot } from "../project-service/index.mjs";

export const shippedFile = (root = APP_ROOT) => join(root, "config", "style-ae.json");
export const localFile = (root = APP_ROOT) => process.env.MW_STYLE_AE_FILE ?? join(workRoot(root), "library", "style-ae.json");
export const readJson = (f) => { try { return JSON.parse(readFileSync(f, "utf8")); } catch { return null; } };

/** Every measurement, this computer's over the shipped ones: { "<style id>": { level, kind, measured, demo, source, ... } }. */
export function measurements(root = APP_ROOT) {
  return { ...(readJson(shippedFile(root))?.styles ?? {}), ...(readJson(localFile(root))?.styles ?? {}) };
}
/** The badge the style API carries: { level: "editable" | "partial" | "video", measured: "<date>", demo: "<demo id>" }. A style not measured
 *  yet (its demo does not run as shipped, or it has none) says video until a film made in it is measured or exported to AE:
 *  { level: "video", unmeasured: true }. */
export function aeBadge(id, all) {
  const m = all?.[id];
  if (!m?.level) return { level: "video", unmeasured: true };
  // a film the app makes in a canvas style its plain text goes in HTML over the canvas, so AE gets titles and
  // captions as text layers and the drawing as video; a style whose text is performed on the canvas keeps "video" (PERFORMED)
  if (m.kind === "canvas" && !PERFORMED.has(id)) return { level: "partial", textLayers: true, measured: m.measured, demo: m.demo };
  return { level: m.level, measured: m.measured, demo: m.demo };
}

/** The canvas styles whose text is the drawing itself, left on the canvas by the Build (Whiteboard pen writing, Brush
 *  painting, ASCII/CRT): a film made in them reaches AE as video. */
export const PERFORMED = new Set(["lemo-whiteboard", "lemo-ascii-crt", "brush-cartoon"]);
