// The first-run list off the server's thread: its checks (HF skills' hashes, Python's components, nvidia-smi) take about 1.7 s and
// the app window asks for it on every start; on the server's own thread they held every other request.
import { parentPort, workerData } from "node:worker_threads";
import { firstRunItems } from "./first-run.mjs";

try { parentPort.postMessage({ ok: true, value: firstRunItems(workerData.root, { sizes: workerData.sizes !== false }) }); }
catch (e) { parentPort.postMessage({ ok: false, message: String(e?.message ?? e) }); }
