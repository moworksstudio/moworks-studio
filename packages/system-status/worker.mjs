// The system checks off the server's thread: runtimeStatus runs a dozen synchronous probes (the browser's and FFmpeg's versions,
// Python, the HyperFrames skills' hashes, After Effects); on the server's own thread they held every other request for up to 16 s.
import { parentPort, workerData } from "node:worker_threads";
import { runtimeStatus } from "./index.mjs";

try { parentPort.postMessage({ ok: true, value: runtimeStatus(workerData.root) }); }
catch (e) { parentPort.postMessage({ ok: false, message: String(e?.message ?? e) }); }
