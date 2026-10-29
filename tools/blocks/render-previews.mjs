// Render the block previews HyperFrames publishes none for, outside the app (long run: about 300 items).
//   node tools/blocks/render-previews.mjs [--only id,id] [--force] [--retry-failed]
// Same code as the app's "Render missing previews" job (packages/blocks-library/previews.mjs); the catalog is saved after each item.
import { renderMissing } from "../../packages/blocks-library/previews.mjs";

const arg = (k) => { const i = process.argv.indexOf(k); return i < 0 ? null : process.argv[i + 1]; };
const only = arg("--only")?.split(",") ?? null;
const t0 = Date.now();
const res = await renderMissing({ only, force: process.argv.includes("--force"), retryFailed: process.argv.includes("--retry-failed"),
  onProgress: ({ done, total, ok, failed, id }) => console.log(`${new Date().toISOString().slice(11, 19)} ${done}/${total} ok ${ok} failed ${failed.length}  ${id}${failed.at(-1)?.id === id ? "  FAILED: " + failed.at(-1).error : ""}`) });
console.log(JSON.stringify({ made: res.ok, failed: res.failed, total: res.total, minutes: Math.round((Date.now() - t0) / 60000) }, null, 1));
