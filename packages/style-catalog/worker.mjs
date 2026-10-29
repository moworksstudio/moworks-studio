// The style catalog built off the server's thread: about 1.6 s of synchronous reading at start held the app window's first page
// (a white window). The server primes its memo with the result (primeCatalog).
import { parentPort, workerData } from "node:worker_threads";
import { listStyles } from "./index.mjs";

try { parentPort.postMessage({ ok: true, value: listStyles(workerData.root) }); }
catch (e) { parentPort.postMessage({ ok: false, message: String(e?.message ?? e) }); }
