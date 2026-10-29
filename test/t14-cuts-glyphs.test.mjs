// a one-page code film's shots are its own cut table (SHOTS = [{ a, b }]), not the storyboard's seconds stretched;
// each face is held against the words it draws, not every Vietnamese line of the page.
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { codeCuts, placedShots, readShots } from "../packages/hf-edit/shots.mjs";
import { stackUses } from "../packages/hf-qa/gates.mjs";
import { loadHf } from "../packages/hf-edit/load.mjs";

const T = mkdtempSync(join(tmpdir(), "mw-t14-"));
after(() => rmSync(T, { recursive: true, force: true }));
const put = (d, rel, text) => { const f = join(d, ...rel.split("/")); mkdirSync(join(f, ".."), { recursive: true }); writeFileSync(f, text); };

test("the film's own SHOTS table places its shots (the Motion Plan moved the cuts); a table without seconds, or of another length, does not", async () => {
  const d = join(T, "mg");
  put(d, "index.html", `<div id="root" data-composition-id="main" data-start="0" data-duration="46" data-width="1920" data-height="1080"><canvas id="c"></canvas></div><script src="compositions/mg/film.js"></script>`);
  put(d, "STORYBOARD.md", ["# Film", "", ...[1, 2, 3].map((n) => `## Frame ${n} — Shot ${n}\n- duration: 10s\n`)].join("\n"));
  put(d, "compositions/mg/shots.js", "(function () { const B = window.B = {}; B.SHOTS = [ { a: 0.0, b: 9.3, draw: s1 }, { a: 9.3, b: 33.0, draw: s2 }, { a: 33.0, b: 46.0, draw: s3 } ]; })();");
  put(d, "compositions/mg/film.js", "const CAMS = [{ cam: [1, 2, 3] }];");
  assert.deepEqual(codeCuts(d), [[0, 9.3], [9.3, 33], [33, 46]]);
  const { shots, root } = await readShots(d);
  assert.deepEqual(placedShots(shots, root.duration).map((s) => [s.number, s.start, s.duration]), [[1, 0, 9.3], [2, 9.3, 23.7], [3, 33, 13]]);
  // two cuts for three frames: not this film's table to trust, the storyboard's seconds stay
  put(d, "compositions/mg/shots.js", "B.SHOTS = [ { a: 0, b: 20 }, { a: 20, b: 46 } ];");
  const r2 = await readShots(d);
  assert.equal(placedShots(r2.shots, r2.root.duration)[1].start, 15.333);
});

test("a face set on one word is held against that word only; an @font-face alone is no use; a rule a script fills is the whole page", async () => {
  const html = `<style>.cap { font-family: 'Archivo', sans-serif; } .tia { font-family: 'Mr Dafoe', cursive; } .live { font-family: "VT323"; }
@font-face { font-family: "Mr Dafoe"; src: url("a.woff2"); } @font-face { font-family: "Unused"; src: url("b.woff2"); }</style>
<div class="cap">Thành phố Neon</div><div class="tia">Tia</div><div class="live"></div><p style="font-family: Kalam">Đêm</p>`;
  const { document } = (await loadHf()).linkedom.parseHTML(`<!doctype html><html><body>${html}</body></html>`);
  for (const s of document.querySelectorAll("style")) s.remove();
  const u = stackUses(html, document);
  assert.equal(u.get("mr dafoe").text.trim(), "Tia");
  assert.match(u.get("archivo").text, /Thành phố/);
  assert.equal(u.get("vt323").text, null, "empty in the page (a script writes it): judged against the whole page");
  assert.equal(u.get("unused").used, false);
  assert.equal(u.get("kalam").text.trim(), "Đêm");
});
