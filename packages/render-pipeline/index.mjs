// Gated render: the only way the app starts an export. Gates run first (hf-qa); a blocking failure means no worker is started.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { runGates } from "../hf-qa/gates.mjs";
import { render } from "../hf-render-worker/client.mjs";

export async function gatedRender(job, { onEvent, signal, version, workDir, blank = true } = {}) {
  const gates = await runGates(job.projectDir, { workDir: workDir ?? join(dirname(job.outputPath), ".gates"), blank });
  const reportPath = `${job.outputPath}.gates.json`;
  mkdirSync(dirname(reportPath), { recursive: true });
  writeFileSync(reportPath, JSON.stringify(gates, null, 2));
  if (!gates.pass) return { type: "blocked", code: "GATES_FAILED", blockingFailures: gates.blockingFailures, gates, gatesReport: reportPath };
  const result = await render(job, { onEvent, signal, version });
  return { ...result, gates, gatesReport: reportPath };
}
