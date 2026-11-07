// MW Character Sheet v1, one frame for every engine (owner #1287-#1293; the coordinator's call 06/11 after the audit of every sheet, #1319
// item 4: five page sizes were one too many). Every sheet is the same page: 2436 x 3000 (shipped at 2400 wide, 2400 x 2956), the name at the
// top, then five rows in the standard's order, Views, Faces, Poses, Walk, Hands, each a title and up to eight cells of 292 x 492 with the
// label under each cell. A row the engine cannot draw (hands that are ink dots, a rig with no walk) keeps its place with one cell that says
// "n/a", so every sheet reads the same at a glance. Plain JavaScript with no imports: the canvas pages (the house heroes, Ricks Clip, the rigs)
// bundle it, and composeSheet (./sheet-compose.mjs) runs it in a page of its own for the engines whose cells are a film's stills.
export const FRAME = Object.freeze({ CW: 300, CH: 500, PAD: 18, COLS: 8, ROW: 584, TOP: 80, W: 2436, H: 3000, INSET: 4 });
export const ROW_ORDER = Object.freeze(["Views", "Faces", "Poses", "Walk", "Hands"]);
export const NA = "n/a";

/** The rows in the standard's order, each { title, items } (items [] when the engine has none: an n/a cell). Extra rows are refused. */
export function standardRows(rows) {
  const by = new Map(rows.map((r) => [r.title, r]));
  const odd = rows.filter((r) => !ROW_ORDER.includes(r.title)).map((r) => r.title);
  if (odd.length) throw new Error(`not a row of the sheet: ${odd.join(", ")}`);
  return ROW_ORDER.map((t) => ({ title: t, items: (by.get(t)?.items ?? []).slice(0, FRAME.COLS) }));
}

/** Where cell i of row r sits: { x, y, w, h } on the page. */
export const cellRect = (r, i) => ({ x: FRAME.PAD + i * FRAME.CW + FRAME.INSET, y: FRAME.TOP + r * FRAME.ROW + 34, w: FRAME.CW - 2 * FRAME.INSET, h: FRAME.CH - 2 * FRAME.INSET });

/** The whole page on a 2D canvas context of FRAME.W x FRAME.H: the ground, the name, each row's title, its cells (drawCell(g, item, rect)
 *  draws one; it is clipped to its cell), the labels; an empty row gets one cell with "n/a". colours: { ground, cell, ink, muted } (muted: the labels; ink at 70 % when not given, so they read on a dark ground too). */
export function drawFrame(g, { name, rows, ground = "#f3ead8", cell = "#e6dcc6", ink = "#241726", muted = null }, drawCell) {
  const R = standardRows(rows);
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
  g.fillStyle = ground; g.fillRect(0, 0, FRAME.W, FRAME.H);
  R.forEach((row, r) => {
    const n = Math.max(1, row.items.length);
    for (let i = 0; i < n; i++) { const c = cellRect(r, i); g.fillStyle = cell; g.fillRect(c.x, c.y, c.w, c.h); }
  });
  g.restore();
  R.forEach((row, r) => row.items.forEach((it, i) => {
    const c = cellRect(r, i);
    g.save(); g.beginPath(); g.rect(c.x, c.y, c.w, c.h); g.clip();
    try { drawCell(g, it, c); } finally { g.restore(); }
  }));
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
  g.fillStyle = ink; g.font = "bold 34px sans-serif"; g.textAlign = "left"; g.textBaseline = "alphabetic"; g.fillText(name, FRAME.PAD, 52);
  R.forEach((row, r) => {
    const y = FRAME.TOP + r * FRAME.ROW;
    g.fillStyle = ink; g.font = "bold 22px sans-serif"; g.fillText(row.title, FRAME.PAD, y + 22);
    if (!row.items.length) {
      const c = cellRect(r, 0);
      g.fillStyle = muted ?? ink; g.globalAlpha = muted ? 1 : 0.7; g.font = "bold 30px sans-serif"; g.textAlign = "center"; g.fillText(NA, c.x + c.w / 2, c.y + c.h / 2 + 10); g.textAlign = "left"; g.globalAlpha = 1;
      return;
    }
    g.fillStyle = muted ?? ink; g.globalAlpha = muted ? 1 : 0.7; g.font = "18px sans-serif";
    row.items.forEach((it, i) => { const c = cellRect(r, i); g.fillText(String(it.label ?? ""), c.x + 4, c.y + c.h + 26); });
    g.globalAlpha = 1;
  });
  g.restore();
}

/** A drawing of design size dw x dh put into a cell, its whole width filling the cell and its foot on the cell's foot (the feet keep the
 *  floor in every cell): the transform to draw it with. */
export function fitInCell(c, dw, dh) {
  const s = c.w / dw, h = dh * s;
  return { s, x: c.x, y: c.y + c.h - h };
}
