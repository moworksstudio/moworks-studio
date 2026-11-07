// The worker side of offThread.mjs: imports the module, calls its export, posts the answer or the error.
import { parentPort, workerData } from "node:worker_threads";

const { moduleUrl, name, args } = workerData;
try {
  const m = await import(moduleUrl);
  parentPort.postMessage({ ok: true, value: await m[name](...args) });
} catch (e) {
  parentPort.postMessage({ ok: false, message: String(e?.message ?? e), code: e?.code ?? null });
}
