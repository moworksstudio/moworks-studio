// A rendered film handed over (audit/112b b2.4): the one delivery every render of a film goes through, the export, a size's render and
// the background render (Version 1, what Render reuses, a new sound mixed onto it), so none is delivered another way. A Standard MP4 is
// held to the web ceiling (grain and flicker cost bits: a grainy 1920s film was 26 Mbps), its sound mastered to the studio rule (-14 LUFS,
// true peak at most -1 dBTP; Quieter -16) and, when asked, measured.
import { existsSync } from "node:fs";
import { MASTER, loudness, masterLoudness } from "../hf-qa/loudness.mjs";
import { capWebBitrate } from "../hf-qa/webBitrate.mjs";

/** file: the render. format mp4 | mov | webm; quality standard | high; master: a MASTER key ("standard", "quiet") or "off"; measure: the
 *  sound measured after (the export's report). onStage(stage) says each step; log(line) what failed (never thrown: a delivery step that
 *  fails leaves the file as HF made it). Returns { web, loud }: web is capWebBitrate's answer or null, loud the measure (with .master). */
export async function deliverFile(file, { format = "mp4", quality = "standard", master = "standard", measure = false, root, signal = null, onStage = () => {}, log = () => {} } = {}) {
  let web = null, loud = null;
  if (!existsSync(file)) return { web, loud };
  if (format === "mp4" && quality === "standard") {
    onStage("web size");
    web = await capWebBitrate(file, { root, signal }).catch((e) => { log(`web size: ${e.message}`); return null; });
  }
  if (format === "mp4" || format === "mov") {
    const target = MASTER[master] ?? null;
    if (target) { onStage("master loudness"); await masterLoudness(file, { target, root }).catch((e) => log(`master loudness: ${e.message}`)); }
    if (measure) {
      onStage("loudness");
      loud = await loudness(file, { root, target: { lufs: (target ?? MASTER.standard).lufs, peak: (target ?? MASTER.standard).tp, tolerance: 1 } }).catch((e) => ({ error: e.message }));
      if (loud && !loud.error) loud.master = target ? master : "off";
    }
  }
  return { web, loud };
}
