// npm run ae -- <project> [--fps 25|29.97|30000/1001] [--out <dir>] [--estimate] [--no-ae] [--check auto|t1,t2] [--events] [--film <mp4>]
// --events: every event as a line "EVENT <json>" and the result as "RESULT <json>" (the app's server runs the port this way).
// --film: the rendered film, for a film drawn on a canvas only (it goes into AE as one video layer).
// The backend command behind the UI's "Port to AE" button: one HF project in, an editable .aep (+ footage, Audio/) and check frames out.
import { aeExport, checkPython } from "./index.mjs";

const argv = process.argv.slice(2);
const opt = (name, dflt = null) => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : dflt; };
const project = argv.find((a, i) => !a.startsWith("--") && !argv[i - 1]?.match(/^--(fps|out|check|film)$/));
if (!project) { console.error("usage: npm run ae -- <project> [--fps 25] [--out dir] [--estimate] [--no-ae] [--check auto]"); process.exit(2); }
const f = opt("--fps", "30");
const fps = f.includes("/") ? { num: +f.split("/")[0], den: +f.split("/")[1] } : Number(f);
const py = checkPython();
if (!py.ok) { const m = `Python for the AE export: ${py.message}`; if (argv.includes("--events")) console.log(`RESULT ${JSON.stringify({ status: "failed", code: "PYTHON", message: m })}`); else console.error(m); process.exit(2); }
const r = await aeExport(project, { fps, outDir: opt("--out"), estimateOnly: argv.includes("--estimate"), runAe: !argv.includes("--no-ae"),
  check: opt("--check", "auto"), film: opt("--film"), onEvent: (e) => { if (argv.includes("--events")) console.log(`EVENT ${JSON.stringify(e)}`); else if (e.type === "log") console.log(e.line); } });
console.log(argv.includes("--events") ? `RESULT ${JSON.stringify(r)}` : JSON.stringify(r, null, 2));
process.exit(r.status === "done" || r.status === "estimate" ? 0 : 1);
