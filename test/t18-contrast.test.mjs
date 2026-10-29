// Tech checks warned that "MOON TREE" (1.36), "?" (1.17) and "Artemis I" (1.06) were hard to read in an
// mg-19-paperclip film, dark bold words on white stickers. HF's contrast audit had measured the sticker's white outline pass: a copy of the
// art painted white under the art, marked aria-hidden="true". HF's check stays as shipped; the app looks each contrast finding up again on
// HF's page and drops the ones inside aria-hidden decoration (packages/hf-qa/contrastDecor.mjs). Real words that are hard to read stay.
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { cpSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runGates } from "../packages/hf-qa/gates.mjs";
import { runHfJson } from "../packages/hf-qa/cli.mjs";
import { CHECK_ARGS } from "../packages/hf-qa/qc.mjs";
import { decorationContrast } from "../packages/hf-qa/contrastDecor.mjs";
import { APP_ROOT } from "../packages/version-manager/index.mjs";

const T = mkdtempSync(join(tmpdir(), "mw-t18-contrast-"));
after(() => rmSync(T, { recursive: true, force: true }));

// demo-sticker: a pale canvas; a sticker drawn the way (outline copy of the words, white and stroked, aria-hidden, under the dark
// words); and one real line of pale grey words on the canvas, which is hard to read
const dir = join(T, "demo-sticker");
cpSync(join(APP_ROOT, "test", "fixtures", "minimal"), dir, { recursive: true });
const art = (fill) => `<text x="400" y="420" font-family="RFlex" font-size="64" font-weight="800" fill="${fill}">MOON TREE</text>`;
writeFileSync(join(dir, "index.html"), `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=1920, height=1080" />
<script src="assets/vendor/gsap.min.js"></script>
<style>
@font-face { font-family: "RFlex"; src: url("assets/fonts/RobotoFlex-var.woff2") format("woff2"); font-weight: 100 1000; }
body { margin: 0; }
#root { position: relative; width: 1920px; height: 1080px; overflow: hidden; background: #d5dee6; font-family: "RFlex"; }
.ol * { fill: #fff !important; stroke: #fff !important; stroke-width: 20px !important; stroke-linejoin: round; }
#pale { position: absolute; left: 400px; top: 700px; margin: 0; font-size: 56px; font-weight: 700; color: #c4ccd3; }
</style>
</head>
<body>
<div id="root" data-composition-id="main" data-start="0" data-duration="3" data-width="1920" data-height="1080">
  <section id="s1" class="clip" data-start="0" data-duration="3" data-track-index="1" style="position:absolute;inset:0">
    <svg width="1920" height="1080" viewBox="0 0 1920 1080">
      <g id="sticker"><g class="ol" aria-hidden="true" data-layout-allow-overlap>${art("#1d2733")}</g>${art("#1d2733")}</g>
    </svg>
    <p id="pale">Pale words on the canvas</p>
  </section>
</div>
<script>
window.__timelines = window.__timelines || {};
const tl = gsap.timeline({ paused: true });
tl.fromTo("#sticker", { y: 30 }, { y: 0, duration: 2.5, ease: "power2.out" }, 0);
tl.to({}, { duration: 3 }, 0);
window.__timelines.main = tl;
</script>
</body>
</html>
`);

test("HF measures the sticker's aria-hidden outline copy; the app finds it again on HF's page as decoration, the pale words not", { timeout: 240000 }, async () => {
  const j = runHfJson("check", dir, CHECK_ARGS).json;
  assert.ok(j?.contrast, "HF's check gave its contrast section");
  const xs = j.contrast.findings;
  const outline = xs.findIndex((x) => x.text === "MOON TREE"), pale = xs.findIndex((x) => /Pale words/.test(x.text ?? ""));
  // the bug as HF ships it: the white copy, white on white (if HF stops measuring it one day, this test says so)
  assert.ok(outline >= 0, `HF no longer flags the outline copy: ${JSON.stringify(xs.map((x) => [x.text, x.ratio]))}`);
  assert.equal(xs[outline].fg, "rgb(255,255,255)");
  assert.ok(pale >= 0, "the pale words are flagged");
  const deco = await decorationContrast(j, dir);
  assert.deepEqual(deco.map((x) => x.index).sort(), xs.map((x, i) => (x.text === "MOON TREE" ? i : -1)).filter((i) => i >= 0).sort(),
    "every MOON TREE finding is the outline copy, and nothing else is");
});

test("Tech checks show the pale words, not the sticker's words", { timeout: 300000 }, async () => {
  const r = await runGates(dir, { blank: false });
  const g = r.gates.find((x) => x.id === "G-HF-CONTRAST");
  assert.ok(g && !g.notChecked, "HF's contrast section ran");
  const texts = g.findings.map((x) => x.text);
  assert.ok(!texts.includes("MOON TREE"), `the outline copy is still shown: ${JSON.stringify(g.findings)}`);
  assert.ok(texts.some((t) => /Pale words/.test(t ?? "")), "the real hard-to-read words are still shown");
  assert.equal(g.warnings, g.findings.filter((x) => x.severity === "warning").length);
});
