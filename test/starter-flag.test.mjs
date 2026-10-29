// a built film whose root kept the scaffold's data-no-timeline read as the starter ("Not built", would not play).
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { isStarterPage, readMounts } from "../packages/hf-edit/shots.mjs";
import { withoutStarterFlag } from "../packages/hf-edit/finalize.mjs";

const page = (mounts, { flag = true, script = "" } = {}) => `<!doctype html><html><body>
<div id="root" data-composition-id="main" data-start="0" data-duration="${3 * mounts.length}" data-width="1080" data-height="1080"${flag ? " data-no-timeline" : ""} data-fps="30">
${mounts.map((src, i) => `  <div id="f${i + 1}" data-composition-id="f${i + 1}" data-composition-src="${src}" data-start="${3 * i}" data-duration="3" data-track-index="1"></div>`).join("\n")}
</div>${script}
</body></html>`;
const starter = page(["compositions/f1.html"]);
const built = page(Array.from({ length: 12 }, (_, i) => `compositions/frames/${String(i + 1).padStart(2, "0")}-f${i + 1}.html`));

test("the starter is the scaffold's one title card under data-no-timeline, not every root that kept the flag", () => {
  assert.equal(isStarterPage(starter), true);
  assert.equal(isStarterPage(built), false, "12 scenes under the flag are a built film");
  assert.equal(isStarterPage(page(["compositions/f1.html"], { flag: false })), false, "no flag, no starter");
  assert.equal(isStarterPage(page(["compositions/frames/01-f1.html"])), false, "a built one-scene film is not the title card");
  const d = mkdtempSync(join(tmpdir(), "mw-starter-"));
  try {
    writeFileSync(join(d, "index.html"), built);
    assert.equal(readMounts(d).root.starter, undefined);
    writeFileSync(join(d, "index.html"), starter);
    assert.equal(readMounts(d).root.starter, true);
  } finally { rmSync(d, { recursive: true, force: true }); }
});

test("finalize keeps HF's data-no-timeline on a root with no timeline of its own; drops it once the root registers main", () => {
  assert.equal(withoutStarterFlag(starter), starter, "the starter keeps its flag");
  assert.equal(withoutStarterFlag(built), built, "a root that registers no timeline keeps it (HF: missing_timeline_registry otherwise)");
  const own = page(["compositions/a.html", "compositions/b.html"], { script: `<script>window.__timelines["main"] = gsap.timeline({ paused: true });</script>` });
  const report = {};
  const out = withoutStarterFlag(own, report);
  assert.doesNotMatch(out, /data-no-timeline/);
  assert.match(out, /data-composition-id="main" data-start="0" data-duration="6" data-width="1080" data-height="1080" data-fps="30">/);
  assert.equal(report.starterFlagDropped, true);
});
