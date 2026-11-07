// The one sheet frame (./sheet-frame.js) for the engines whose cells are a film's stills (3D Cartoon's c3d-sheet.tsx, What If's wi-sheet.tsx,
// the brush layer's "cells" scene): each cell is one still with the character alone in the middle; composeSheet cuts the middle of each still
// (the cell's own shape, feet at the foot) and lays the page out in a headless page of its own (the same browser the canvas engines draw in), so
// every engine's sheet is the same page. Nothing of a source skill is changed.
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const FRAME_SRC = () => readFileSync(join(HERE, "sheet-frame.js"), "utf8").replace(/^export /gm, "");

/** The sheet as a PNG at `out`. rows: [{ title, items: [{ label, file }] }] in any order (missing rows show n/a); crop: the part of each still
 *  to keep, { x, y, w, h } in the still's pixels (the middle of the frame, the cell's shape); colours: { ground, cell, ink, muted }. */
export async function composeSheet({ name, rows, crop, colours = {} }, out, { root }) {
  const { launch } = await import("../moworks-styles/ricks-page.mjs");
  const b = await launch(root);
  try {
    // the stills one at a time (22 full-HD PNGs in one message hung the page's socket), each decoded and kept in the page
    await b.evaluate("window.__cells = []; true");
    for (const r of rows) for (const it of r.items) {
      const src = `data:image/png;base64,${readFileSync(it.file).toString("base64")}`;
      await b.evaluate(`new Promise((ok, no) => { const i = new Image(); i.onload = () => { window.__cells.push(i); ok(true); }; i.onerror = () => no(new Error("a still did not load")); i.src = ${JSON.stringify(src)}; })`);
    }
    let k = 0;
    const plan = rows.map((r) => ({ title: r.title, items: r.items.map((it) => ({ label: it.label, at: k++ })) }));
    const url = await b.evaluate(`(() => {
      ${FRAME_SRC()}
      const D = ${JSON.stringify({ name, rows: plan, crop, colours })};
      const c = document.createElement("canvas"); c.width = FRAME.W; c.height = FRAME.H;
      const g = c.getContext("2d"); g.imageSmoothingQuality = "high";
      drawFrame(g, { name: D.name, rows: D.rows, ...D.colours }, (gg, it, cell) => {
        const k = D.crop, f = fitInCell(cell, k.w, k.h);
        gg.drawImage(window.__cells[it.at], k.x, k.y, k.w, k.h, f.x, f.y, k.w * f.s, k.h * f.s);
      });
      return c.toDataURL("image/png");
    })()`);
    writeFileSync(out, Buffer.from(url.split(",")[1], "base64"));
    return out;
  } finally { b.close(); }
}

/** The standard's cells in order, one a still: [{ row, label, index }] (index: the still's place), from rows [{ title, cols }]. */
export const cellsOf = (rows) => { let k = 0; return rows.flatMap((r) => r.cols.map((label) => ({ row: r.title, label, index: k++ }))); };
