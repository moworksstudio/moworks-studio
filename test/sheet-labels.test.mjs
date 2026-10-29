// the words of a model sheet drawn by code are read in its page (a canvas's words are no DOM text for HF's layout check):
// labels on each other, a caption touching the next part's heading, a label on the drawing
import { test } from "node:test";
import assert from "node:assert/strict";
import { labelLines, labelProblems } from "../packages/character-maker/sheetLabels.mjs";

const L = (text, left, top, right, bottom, ink = 0, scale = 1) => ({ text, box: { left: left * scale, top: top * scale, right: right * scale, bottom: bottom * scale }, ink, scale });

test("Mực's sheet: \"lo lắng\" touching \"Tư thế trong phim\" and \"bóng chậm ½ nhịp\" on the cat; a title and its subtitle are one block", () => {
  const p = labelProblems([
    L("Mực · bảng mẫu nhân vật", 56, 29, 458, 81), L("Rubber hose · khung xương riêng", 54, 86, 579, 111),           // 5 px, one left edge
    L("lo lắng", 161, 945, 220, 972), L("mệt", 523, 948, 558, 968), L("Tư thế trong phim", 53, 978, 236, 1009),
    L("bóng chậm ½ nhịp", 100, 1086, 228, 1106, 0.089), L("nhảy · nhịp 1", 77, 1267, 183, 1291),
    L("lo lắng", 161, 945, 220, 972, 0.9),                                                                         // drawn again: its own letters
  ]);
  assert.deepEqual(p.overlaps, []);
  assert.deepEqual(p.crowded, [{ a: "lo lắng", b: "Tư thế trong phim", gap: 6 }]);
  assert.deepEqual(p.onInk.map((x) => x.text), ["bóng chậm ½ nhịp"]);
  const lines = labelLines(p);
  assert.equal(lines.length, 2);
  assert.match(lines[0], /"lo lắng" and "Tư thế trong phim" touch \(6 px apart/);
  assert.match(lines[1], /"bóng chậm ½ nhịp" \(at 100, 1086\) sits on the drawing \(9 % ink/);
});

test("labels drawn over each other are said once as an overlap; a page that could not be read says nothing", () => {
  const p = labelProblems([L("vui", 100, 100, 160, 124, 0.4, 2), L("quát", 120, 104, 180, 128, 0, 2)]);
  assert.deepEqual(p.overlaps, [["vui", "quát"]]);
  assert.deepEqual(p.onInk, [], "the label under another is not also said as on the drawing");
  assert.deepEqual(p.boxes[0].box, { left: 100, top: 100, right: 160, bottom: 124 }, "in the sheet's own units");
  assert.deepEqual(labelLines({ error: "the sheet drew no words in the page" }), []);
  assert.deepEqual(labelLines(null), []);
});
