// node packages/hf-qa/gates-cli.mjs <projectDir> [--blank <workDir>]  ->  runGates() result as JSON on stdout.
// Lets the app's server run the gates in a child process, so its own event loop never waits on HF's check. Each part's start goes to
// stderr as "STEP <done> <total> <what>" (the render's quick check otherwise showed no progress for minutes).
import { runGates } from "./gates.mjs";

const [dir, flag, workDir] = process.argv.slice(2);
const onStep = (done, total, what) => process.stderr.write(`STEP ${done} ${total} ${what ?? ""}\n`);
const r = await runGates(dir, flag === "--blank" ? { workDir, blank: true, onStep } : { blank: false, onStep });
process.stdout.write(JSON.stringify(r));
