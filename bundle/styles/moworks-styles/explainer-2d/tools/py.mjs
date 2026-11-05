// py.mjs: run one of the kit's Python tools through uv, with its pinned packages, so nobody sets up Python by hand.
// uv fetches a matching Python and the packages the first time (cached afterwards).
//   node tools/py.mjs tools/audio/sfx.py --cues videos/<slug>/audio/cues.json --out-dir videos/<slug>/audio
import { ROOT, UV, run } from "./lib.mjs";

const [script, ...rest] = process.argv.slice(2);
if (!script) {
  console.error("usage: node tools/py.mjs <tools/…/script.py> [args…]");
  process.exit(1);
}
run(UV(), ["run", "--quiet", "--no-project", "--python", "3.12", "--with-requirements", "tools/audio/requirements.txt", "python", script, ...rest], { cwd: ROOT });
