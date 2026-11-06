// Frame flicker (Test 39, T39-8): a film whose picture jumps to another picture for one frame and back (A-B-A), most often two 3D surfaces at the
// same height fighting for the depth buffer (z-fighting: a sewer's water and the top of a stone at y = 0). The Review's sheets and HF's checks
// sample a frame here and there and never see it. Read from the film's render as it is now (as G-CUTS is): each frame shrunk to 16 × 9 grey,
// a frame that differs from both its neighbours while they agree with each other is a flicker. A warning (owner #1109: never a block on its own).
import { execFile } from "node:child_process";
import { ffmpegExe } from "../library/preview-media.mjs";
import { freshRender } from "../moworks-styles/cuts.mjs";

// 32 × 18 cells: a z-fight flickers in one part of the frame, which a whole frame's mean hides (T39-8: the mean found 10, the eye many more)
const W = 32, H = 18, N = W * H;
/** A cell flickers at frame i: it jumps by more than JUMP from the frame before and back by as much in the next, the two neighbours within a
 *  third of that of each other (A-B-A, not a move or a cut). A frame flickers when at least CELLS of its cells do (a big flicker), or when at
 *  least SMALL do and the same cells flicker again in REPEAT other frames within 1.5 s (a small z-fight, a rug on a floor, keeps flickering in
 *  its place; a hand-drawn line's boil moves about). Test 39's water on stone: 52 big; Test 41's rug: 28 small that repeat; Test 38b's boil: none. */
export const JUMP = 24, CELLS = 25, SMALL = 6, REPEAT = 2;
const cellsFlicker = (p, x, n, jump) => {
  const out = [];
  for (let i = 0; i < N; i++) {
    const a = x[i] - p[i], b = x[i] - n[i];
    if (Math.abs(a) > jump && Math.abs(b) > jump && Math.sign(a) === Math.sign(b) && Math.abs(p[i] - n[i]) < Math.min(Math.abs(a), Math.abs(b)) / 3) out.push(i);
  }
  return out;
};

/** The frames of a video, shrunk: [Uint8Array(144)…] and its fps. */
export function tinyFrames(file, { timeoutMs = 10 * 60000 } = {}) {
  return new Promise((done, fail) => {
    execFile(ffmpegExe(), ["-hide_banner", "-nostats", "-i", file, "-map", "0:v:0", "-vf", `scale=${W}:${H}:flags=area,format=gray`, "-an", "-f", "rawvideo", "-"],
      { windowsHide: true, encoding: "buffer", maxBuffer: 1 << 30, timeout: timeoutMs }, (e, out, err) => {
        if (e && !out?.length) return fail(new Error(String(err ?? e.message).split(/\r?\n/).filter(Boolean).slice(-1)[0] ?? "ffmpeg failed"));
        const fps = Number(/(\d+(?:\.\d+)?) fps/.exec(String(err))?.[1]) || 30, frames = [];
        for (let o = 0; o + N <= out.length; o += N) frames.push(out.subarray(o, o + N));
        done({ frames, fps });
      });
  });
}

/** The flickers of a run of frames: [{ at (s), frame }]; and the spans they gather in (within 1 s of each other): [{ from, to, count }]. */
export function flickers(frames, fps, { jump = JUMP, cells = CELLS, small = SMALL, repeat = REPEAT } = {}) {
  const seen = [];
  for (let i = 1; i + 1 < frames.length; i++) {
    const c = cellsFlicker(frames[i - 1], frames[i], frames[i + 1], jump);
    if (c.length >= Math.min(small, cells)) seen.push({ frame: i, t: i / fps, set: new Set(c) });
  }
  const again = (h) => seen.filter((o) => o !== h && Math.abs(o.t - h.t) <= 1.5 && [...h.set].filter((x) => o.set.has(x)).length >= h.set.size / 2).length;
  const hits = seen.filter((h) => h.set.size >= cells || again(h) >= repeat).map((h) => ({ frame: h.frame, at: Math.round(h.t * 100) / 100, cells: h.set.size }));
  const spans = [];
  for (const h of hits) { const last = spans.at(-1); if (last && h.at - last.to <= 1) { last.to = h.at; last.count++; } else spans.push({ from: h.at, to: h.at, count: 1 }); }
  return { hits, spans };
}

const clock = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
/** Tech checks' G-FLICKER: "not checked" (said) before there is a render of the film as it is; else pass, or one warning with where. file: a video to read (tests). */
export async function gateFlicker(projectDir, { file = null } = {}) {
  const video = file ?? await freshRender(projectDir, { picture: true }).catch(() => null);          // the picture only (T40-17)
  // no render of the film as it is yet (it was just changed; the preview is made after the Build and after each change): said, never silent (owner #1175)
  if (!video) { const why = "Waiting for the preview of the film as it is now: it is made after the Build and after each change, then this check runs.";
    return { id: "G-FLICKER", blocking: false, pass: true, notChecked: true, why, findings: [{ severity: "info", code: "not_checked", message: why, plain: why }] }; }
  let r; try { r = flickers(...Object.values(await tinyFrames(video))); } catch (e) {
    return { id: "G-FLICKER", blocking: false, pass: false, notChecked: true, findings: [{ severity: "warning", code: "not_checked", message: `The render could not be read for flicker: ${e.message}` }] };
  }
  if (!r.hits.length) return { id: "G-FLICKER", blocking: false, pass: true, findings: [] };
  const where = r.spans.slice(0, 4).map((s) => (s.from === s.to ? clock(s.from) : `${clock(s.from)}–${clock(s.to)}`)).join(", ") + (r.spans.length > 4 ? "…" : "");
  const line = `The picture flickers for a frame ${r.hits.length} time${r.hits.length === 1 ? "" : "s"} (${where}): one frame jumps to another picture and back (in 3D most often two surfaces at the same height; else a light or a part that blinks). Ask Claude to fix it.`;
  return { id: "G-FLICKER", blocking: false, pass: false, warnings: 1, spans: r.spans, findings: [{ severity: "warning", code: "flicker", count: r.hits.length, time: r.spans[0].from, message: line, plain: line }] };
}
