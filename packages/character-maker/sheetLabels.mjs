// The words of a model sheet drawn by code (on Mực's sheet "lo lắng / mệt / quyết tâm" sat on the heading "Tư thế trong
// phim" and "bóng chậm ½ nhịp" on the cat). A canvas's words are no DOM text, so HyperFrames' layout check never sees them: the sheet's page
// (the still tool's, in its scratch copy) is opened once more in the runtime's own Chromium with fillText / strokeText recorded, each label's
// box in canvas pixels from measureText and the context's transform, and the ink already under it read just before it is drawn.
import { pathToFileURL } from "node:url";
import { puppeteerOf } from "../looks-library/index.mjs";
import { resolveRuntime } from "../version-manager/index.mjs";

// in the page, before its scripts: every label a 2D context draws, with the share of dark ink already in its box
const HOOK = `(() => {
  const seen = window.__mwLabels = [];
  const P = CanvasRenderingContext2D.prototype;
  const wrap = (name) => { const f = P[name]; P[name] = function (text, x, y, ...rest) {
    try {
      const t = String(text ?? "").trim();
      if (t && /\\p{L}/u.test(t)) {
        const m = this.measureText(String(text)), k = this.getTransform();
        const l = x - m.actualBoundingBoxLeft, r = x + m.actualBoundingBoxRight, tp = y - m.actualBoundingBoxAscent, b = y + m.actualBoundingBoxDescent;
        const pts = [[l, tp], [r, tp], [l, b], [r, b]].map(([px, py]) => [k.a * px + k.c * py + k.e, k.b * px + k.d * py + k.f]);
        const box = { left: Math.min(...pts.map((p) => p[0])), right: Math.max(...pts.map((p) => p[0])), top: Math.min(...pts.map((p) => p[1])), bottom: Math.max(...pts.map((p) => p[1])) };
        let ink = 0;
        const cv = this.canvas, bx = Math.max(0, Math.floor(box.left)), by = Math.max(0, Math.floor(box.top));
        const bw = Math.min(cv.width, Math.ceil(box.right)) - bx, bh = Math.min(cv.height, Math.ceil(box.bottom)) - by;
        if (bw > 0 && bh > 0) {
          // dark against the box's own paper (its bright end): the print's paper is textured and darkens toward the corners
          const d = this.getImageData(bx, by, bw, bh).data, lum = [];
          for (let i = 0; i < d.length; i += 4) lum.push(d[i + 3] > 128 ? 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2] : 255);
          const paper = [...lum].sort((u, v) => u - v)[Math.floor(lum.length * 0.9)];
          ink = lum.filter((v) => v < 0.6 * paper).length / lum.length;
        }
        seen.push({ text: t, box, ink, scale: Math.hypot(k.a, k.b), canvas: [cv.width, cv.height] });
      }
    } catch { /* a label that cannot be measured is drawn all the same */ }
    return f.call(this, text, x, y, ...rest);
  }; };
  wrap("fillText"); wrap("strokeText");
})();`;

const area = (b) => Math.max(0, b.right - b.left) * Math.max(0, b.bottom - b.top);
const meet = (a, b) => area({ left: Math.max(a.left, b.left), right: Math.min(a.right, b.right), top: Math.max(a.top, b.top), bottom: Math.min(a.bottom, b.bottom) });

/** From the labels a sheet drew (each { text, box, ink, scale }, in canvas pixels): two labels whose boxes share more than a fifth of the
 *  smaller one, two of different parts of the sheet that touch, and a label drawn where ink already darkened more than 3 % of its box (a
 *  drawing, a shadow, a rule). Boxes are
 *  in the sheet's own units (divided by the canvas scale), each label's first draw (a still may draw its one frame more than once). */
export function labelProblems(labels) {
  const last = new Map();          // one entry a label
  for (const l of labels) {
    const s = l.scale || 1, box = { left: l.box.left / s, right: l.box.right / s, top: l.box.top / s, bottom: l.box.bottom / s };
    const key = `${l.text}@${Math.round(box.left)},${Math.round(box.top)}`;
    if (!last.has(key)) last.set(key, { text: l.text, box, ink: l.ink });          // the first draw: a later one sees its own letters as ink
  }
  const xs = [...last.values()], overlaps = [], crowded = [], onInk = [];
  const h = (b) => b.bottom - b.top, mid = (b) => (b.left + b.right) / 2;
  for (let i = 0; i < xs.length; i++) for (let j = i + 1; j < xs.length; j++) {
    const a = xs[i].box, b = xs[j].box, m = meet(a, b);
    if (m > 0.2 * Math.min(area(a), area(b))) { overlaps.push([xs[i].text, xs[j].text]); continue; }
    // one label's caption against the next section's heading (Mực: "lo lắng" 6 px over "Tư thế trong phim"): side by side in x, under
    // 0.3 of the smaller one's height apart in y, and not one block (a title and its subtitle share a left edge or a centre)
    const gap = Math.max(a.top, b.top) - Math.min(a.bottom, b.bottom), sideBySide = Math.min(a.right, b.right) > Math.max(a.left, b.left);
    const oneBlock = Math.abs(a.left - b.left) <= 8 || Math.abs(mid(a) - mid(b)) <= 8;
    if (sideBySide && gap >= 0 && gap < 0.3 * Math.min(h(a), h(b)) && !oneBlock) crowded.push({ a: xs[i].text, b: xs[j].text, gap: Math.round(gap) });
  }
  const hit = new Set(overlaps.flat());
  // 3 % of the box: a label on paper reads 0 (Mực's 30 labels), the one over the cat's ear and its shadow 8.9
  for (const x of xs) if (x.ink > 0.03 && !hit.has(x.text)) onInk.push({ text: x.text, at: [Math.round(x.box.left), Math.round(x.box.top)], ink: Math.round(x.ink * 100) });
  return { labels: xs.length, overlaps, crowded, onInk, boxes: xs };
}

/** Open a still tool's page (its index.html in `dir`, the film bundled) and read its labels: labelProblems of what frame 0 drew, or
 *  { error } when the page could not be read (the sheet itself is drawn all the same). */
export async function sheetLabels(dir, { root, timeoutMs = 30000 } = {}) {
  const rt = resolveRuntime(null, root);
  const browser = await puppeteerOf(root).launch({ executablePath: rt.chromium, headless: true, args: ["--hide-scrollbars", "--allow-file-access-from-files", "--force-color-profile=srgb"] });
  try {
    const page = await browser.newPage();
    await page.evaluateOnNewDocument(HOOK);
    await page.goto(pathToFileURL(`${dir}/index.html`).href, { waitUntil: "load", timeout: timeoutMs });
    await page.evaluate(() => document.fonts?.ready);
    // the film draws once its timeline is seeked: wait for the labels to stop coming (a sheet is one drawing)
    const t0 = Date.now(); let n = -1, still = 0;
    while (Date.now() - t0 < timeoutMs) {
      const k = await page.evaluate(() => window.__mwLabels.length);
      still = k > 0 && k === n ? still + 1 : 0; n = k;
      if (still >= 3) break;
      await new Promise((r) => setTimeout(r, 300));
    }
    const labels = await page.evaluate(() => window.__mwLabels);
    return labels.length ? labelProblems(labels) : { error: "the sheet drew no words in the page" };
  } catch (e) { return { error: String(e.message ?? e).split("\n")[0].slice(0, 200) }; }
  finally { await browser.close().catch(() => {}); }
}

/** The problems in one line each, for Claude's tool reply (empty when the labels are clear). */
export function labelLines(p) {
  if (!p || p.error) return [];
  return [...p.overlaps.map(([a, b]) => `labels "${a}" and "${b}" overlap: move one`),
    ...(p.crowded ?? []).map((x) => `labels "${x.a}" and "${x.b}" touch (${x.gap} px apart, and they belong to different parts of the sheet): give them room`),
    ...p.onInk.map((x) => `label "${x.text}" (at ${x.at[0]}, ${x.at[1]}) sits on the drawing (${x.ink} % ink under it): move it clear`)];
}
