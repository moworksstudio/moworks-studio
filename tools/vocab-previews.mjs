// Render the Vocabulary previews: every item with no preview of it as it is now, in N lanes (separate processes: HF's check runs
// synchronously), then copy them into the bundle (bundle/library/vocab/previews) for the installer.
//   node tools/vocab-previews.mjs [--lanes 3] [--force] [--retry] [--only 001,002] [--no-bundle]
//   node tools/vocab-previews.mjs --lane 0/3 [ids…]       (one lane; the parent starts these)
import { fork } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { APP_ROOT } from "../packages/version-manager/index.mjs";
import { items } from "../packages/vocab-library/index.mjs";
import { previewOne, previewsDir, todo } from "../packages/vocab-library/previews.mjs";

const args = process.argv.slice(2), flag = (k) => args.includes(k), val = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
if (flag("--lane")) {
  const ids = args.slice(args.indexOf("--lane") + 2), all = items(APP_ROOT);
  for (const id of ids) {
    const it = all.find((x) => x.id === id);
    const r = await previewOne(it);
    process.send?.({ id, ok: !!r.preview && !r.error, error: r.error ?? null });
  }
  process.exit(0);
}
const list = todo(APP_ROOT, { force: flag("--force"), retryFailed: flag("--retry"), only: val("--only")?.split(",") ?? null });
const lanes = Math.max(1, Math.min(6, Number(val("--lanes") ?? 3), list.length || 1));
console.log(`${list.length} previews to render in ${lanes} lane(s)`);
let done = 0, failed = 0;
const t0 = Date.now();
await Promise.all(Array.from({ length: list.length ? lanes : 0 }, (_, i) => new Promise((ok) => {
  const mine = list.filter((_, k) => k % lanes === i).map((x) => x.id);
  const c = fork(fileURLToPath(import.meta.url), ["--lane", `${i}/${lanes}`, ...mine], { stdio: "inherit", windowsHide: true });
  c.on("message", (m) => { done++; if (!m.ok) { failed++; console.log(`#${m.id} failed: ${m.error}`); } if (done % 10 === 0 || done === list.length) console.log(`${done}/${list.length} (${failed} failed, ${Math.round((Date.now() - t0) / 1000)} s)`); });
  c.on("exit", ok);
})));
if (!flag("--no-bundle")) {
  const src = previewsDir(APP_ROOT), dst = join(APP_ROOT, "bundle", "library", "vocab", "previews");
  if (existsSync(src)) { mkdirSync(dst, { recursive: true }); cpSync(src, dst, { recursive: true }); console.log(`bundle: ${readdirSync(dst).length} files in bundle/library/vocab/previews`); }
}
