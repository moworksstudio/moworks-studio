// The shot names without the storyboard's stale seconds, and the Tech checks' findings in their shot with one
// plain line each. Pure functions, a temp folder for the shots' files.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { untimedTitle } from "../packages/hf-edit/shots.mjs";
import { elementName, findingShot, plainFinding } from "../packages/hf-qa/plain.mjs";
import { checkFindings } from "../packages/hf-qa/qc.mjs";

test("a shot's name drops the seconds Claude wrote into its storyboard heading; other brackets stay", () => {
  assert.equal(untimedTitle("Vì sao? (6.3-7.7s)"), "Vì sao?");
  assert.equal(untimedTitle("Diều nghiêng 15 độ, bay lên (37.5-41.3s)"), "Diều nghiêng 15 độ, bay lên");
  assert.equal(untimedTitle("Kết (41.3 – 47.5 s)"), "Kết");
  assert.equal(untimedTitle("Mở [0:06-0:08]"), "Mở");
  assert.equal(untimedTitle("Bảng 2 (A-B)"), "Bảng 2 (A-B)");
  assert.equal(untimedTitle("Lần thử 3"), "Lần thử 3");
  assert.equal(untimedTitle(undefined), "");
});

test("HF's finding on an element of a shot's own file is in that shot (HF names index.html), else by file, else by time", () => {
  const dir = mkdtempSync(join(tmpdir(), "mw-qc4-"));
  try {
    mkdirSync(join(dir, "compositions"));
    writeFileSync(join(dir, "compositions", "f5.html"), `<svg><g id="s5-dial"></g></svg>`);
    writeFileSync(join(dir, "compositions", "f6.html"), `<svg><g id="s6-kite" transform="rotate(80)"></g><path id="s6-kite-tail"/></svg>`);
    const placed = [{ number: 5, start: 22.3, duration: 9.7, src: "compositions/f5.html" }, { number: 6, start: 31.5, duration: 6, src: "compositions/f6.html" }];
    const kite = findingShot({ selector: "#s6-kite", file: "index.html", time: 37.25 }, placed, dir);
    assert.deepEqual([kite.shot?.number, kite.file], [6, "compositions/f6.html"]);
    assert.equal(findingShot({ selector: ".x", file: "compositions/f5.html" }, placed, dir).shot?.number, 5);
    assert.equal(findingShot({ selector: null, file: "index.html", time: 33 }, placed, dir).shot?.number, 6);
    assert.equal(findingShot({ selector: null, time: null }, placed, dir).shot, null);          // no time is no "0 s"
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("one plain line a finding: where (shot and its times), what, what to do; a kite is never called a dial's needle", () => {
  assert.equal(elementName("#s6-kite"), "kite");
  assert.equal(elementName("#f7-wind_arrow"), "wind arrow");
  assert.equal(elementName("[data-composition-id]"), null);
  const shot = { number: 6, start: 31.5, duration: 6 };
  const drift = plainFinding({ code: "rotation_pivot_drift", selector: "#s6-kite", time: 37.25,
    message: "Rotating element's bounding-box center drifts 352px across rotation — it is not spinning about its own center (check transformOrigin/svgOrigin)." }, { shot });
  assert.match(drift, /^Shot 6 \(0:31\.5–0:37\.5\): the kite spins around a point 352 px away/);
  assert.doesNotMatch(drift, /transformOrigin|svgOrigin|bounding/);
  const pivot = plainFinding({ code: "off_pivot_rotation", selector: "#s6-kite", time: 37.25, message: "Gauge/dial pointer rotates about a point 1912px from the dial hub" }, { shot });
  assert.match(pivot, /took the kite for the needle of a dial/);
  assert.match(pivot, /A kite is not a needle: ignore this/);
  const needle = plainFinding({ code: "off_pivot_rotation", selector: "#s7-needle", message: "… 40px from the dial hub" }, { shot: { number: 7, start: 37.5, duration: 4.3 } });
  assert.match(needle, /the needle turns around a point 40 px from the centre of its dial/);
  assert.match(plainFinding({ code: "text_box_overflow", text: "SÓNG 88.8", time: 12 }), /^At 0:12\.0: the words "SÓNG 88\.8" run out of their box/);
  assert.match(plainFinding({ code: "transition_seams_not_sampled", time: null }), /^The check ran out of time at the cuts/);
  assert.match(plainFinding({ code: "something_new", selector: "#s2-sun", time: 7 }, { check: "Layout" }), /^At 0:07\.0: the layout check found a problem with the sun/);
});

test("checkFindings keeps the words of a text finding (the plain line quotes them)", () => {
  const j = { layout: { findings: [{ severity: "warning", code: "text_box_overflow", message: "Text overflows its box", text: "  Lần thử thứ 3  ", time: 4, selector: "#s1-count" }] } };
  assert.equal(checkFindings(j, ".").layout[0].text, "Lần thử thứ 3");
});
