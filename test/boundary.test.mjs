import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { findViolations, isAdapterPath } from "../tools/check-boundary.mjs";

test("adapter paths are recognised", () => {
  assert.equal(isAdapterPath("packages/hf-render-worker/worker.mjs"), true);
  assert.equal(isAdapterPath("packages/version-manager/index.mjs"), false);
  assert.equal(isAdapterPath("src/ui/app.mjs"), false);
});

test("an @hyperframes import outside hf-* is a violation; inside hf-* it is allowed", () => {
  const dir = mkdtempSync(join(tmpdir(), "mw-boundary-"));
  try {
    mkdirSync(join(dir, "packages", "hf-edit"), { recursive: true });
    mkdirSync(join(dir, "src"), { recursive: true });
    writeFileSync(join(dir, "packages", "hf-edit", "ok.mjs"), 'import { openComposition } from "@hyperframes/sdk";\n');
    writeFileSync(join(dir, "src", "bad.mjs"), 'const p = await import("@hyperframes/producer");\n');
    writeFileSync(join(dir, "src", "badcli.mjs"), 'spawn("hyperframes", ["render"]);\n');
    const v = findViolations(dir);
    assert.deepEqual(v.map((x) => `${x.file}:${x.rule}`).sort(), ["src/bad.mjs:hf-import", "src/badcli.mjs:hf-cli"]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("the repo itself has no violations", () => {
  assert.deepEqual(findViolations(join(import.meta.dirname, "..")), []);
});
