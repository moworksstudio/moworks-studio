// Uninstall (owner 30/10, after the Moworks Motion kit's uninstall.bat): what goes and what stays, the app's folder kept while it holds
// work that is not on GitHub, the removal's own run (dry: nothing moves), and the Settings button. Run: npm test
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const T = mkdtempSync(join(tmpdir(), "mw-uninstall-"));
after(() => rmSync(T, { recursive: true, force: true }));
const work = join(T, "work"), app = join(work, "app");
for (const d of [app, join(work, "projects", "film-1"), join(work, "library", "characters"), join(work, "models", "whisper")]) mkdirSync(d, { recursive: true });
writeFileSync(join(app, "index.mjs"), "x".repeat(1000));
writeFileSync(join(work, "projects", "film-1", "index.html"), "y".repeat(500));
writeFileSync(join(work, "models", "whisper", "model.bin"), "z".repeat(2000));
process.env.MW_WORK_ROOT = work;
delete process.env.MW_MODELS_ROOT; delete process.env.MW_DATA_DIR;

test("the plan: the app with its size, the models and the films apart, the work folder itself never", async () => {
  const { uninstallPlan } = await import("../packages/setup/uninstall.mjs");
  const p = await uninstallPlan(app);
  assert.equal(p.app.size, 1000);
  assert.equal(p.app.keep, null, "not a git folder: nothing of the user's in it");
  assert.equal(p.models.size, 2000);
  assert.deepEqual(p.films.map((f) => f.path.split(/[\\/]/).pop()).sort(), ["library", "projects"]);
  assert.ok(!p.films.some((f) => f.path === work) && p.kept.some((k) => k.includes(work)), "the work folder stays");
});

test("a clone with changed files or no upstream is kept, with the reason", async () => {
  const { appKeepReason } = await import("../packages/setup/uninstall.mjs");
  const g = (...a) => execFileSync("git", ["-C", app, ...a], { windowsHide: true, stdio: "ignore" });
  g("init", "-q"); g("-c", "user.email=t@t", "-c", "user.name=t", "add", "."); g("-c", "user.email=t@t", "-c", "user.name=t", "commit", "-qm", "x");
  assert.match(appKeepReason(app), /no upstream/);
  writeFileSync(join(app, "mine.txt"), "1");
  assert.match(appKeepReason(app), /1 changed file/);
  rmSync(join(app, ".git"), { recursive: true, force: true }); rmSync(join(app, "mine.txt"));
});

test("the removal's own run: each item in turn, a kept one with its reason, then what stayed; a dry run moves nothing", () => {
  const plan = join(T, "plan.json");
  writeFileSync(plan, JSON.stringify({ items: [{ label: "The downloaded models", path: join(work, "models") },
    { label: "Moworks Studio", path: app, keep: "1 changed file(s) here are not on GitHub" }], kept: ["your films and your library"] }));
  const out = execFileSync(process.execPath, [join(import.meta.dirname, "..", "tools", "uninstall-run.mjs"), plan],
    { env: { ...process.env, MW_UNINSTALL_DRY: "1" }, encoding: "utf8", windowsHide: true });
  assert.match(out, /The downloaded models\s+would go to the Recycle Bin/);
  assert.match(out, /Moworks Studio\s+kept: 1 changed file/);
  assert.match(out, /Kept\s+your films and your library/);
  assert.ok(existsSync(join(work, "models", "whisper", "model.bin")) && existsSync(app), "nothing moved");
});

test("Settings › Update has the Uninstall button; the server starts the removal and stops the app", () => {
  const src = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
  assert.match(src("ui/src/workflow/AppUpdate.jsx"), /Uninstall Moworks Studio/);
  assert.match(src("packages/server/index.mjs"), /"\/app\/uninstall"[\s\S]{0,600}startUninstall[\s\S]{0,300}ctx\.onExit/);
  assert.match(src("tools/uninstall.bat"), /node tools\\uninstall\.mjs/);
});
