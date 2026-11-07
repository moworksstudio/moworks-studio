// Gated render of the libraries' previews (intake and vocab previews): the checks run first and are judged as a Render judges them
// (hf-qa/checks.mjs judge, through runGates); what stops a render starts no worker. A film's export is production.mjs's, not this.
// G-BLANK's stills are slow and say little of a short preview: off unless asked (audit/112b b2.5).
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { runGates } from "../hf-qa/gates.mjs";
import { render } from "../hf-render-worker/client.mjs";

export async function gatedRender(job, { onEvent, signal, version, workDir, blank = false } = {}) {
  const gates = await runGates(job.projectDir, { workDir: workDir ?? join(dirname(job.outputPath), ".gates"), blank });
  const reportPath = `${job.outputPath}.gates.json`;
  mkdirSync(dirname(reportPath), { recursive: true });
  writeFileSync(reportPath, JSON.stringify(gates, null, 2));
  // HF's check stopped twice on a busy machine: nothing in the film is blamed, the caller may try again
  if (gates.busy) return { type: "blocked", code: "CHECK_BUSY", message: gates.message, retryable: true, blockingFailures: [], gates, gatesReport: reportPath };
  if (!gates.pass) return { type: "blocked", code: "GATES_FAILED", blockingFailures: gates.blockingFailures, gates, gatesReport: reportPath };
  const result = await render(job, { onEvent, signal, version });
  return { ...result, gates, gatesReport: reportPath };
}
