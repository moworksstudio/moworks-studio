// A module's export run on a worker thread of its own (112a A9: a film's mix decoded and summed sample by sample held the server's
// thread for seconds, about half of a fit's time on a one-minute film). The answer and any error come back as they were; the worker
// ends with the call. Inside a worker the function runs where it is (no worker in a worker).
import { Worker } from "node:worker_threads";

/** moduleUrl's export `name` called with `args` (structured-clone values) on a worker thread: its answer, or its error (message, code). */
export function offThread(moduleUrl, name, args = []) {
  return new Promise((resolve, reject) => {
    const w = new Worker(new URL("./offThread-run.mjs", import.meta.url), { workerData: { moduleUrl, name, args } });
    let done = false;
    w.once("message", (m) => { done = true; if (m.ok) resolve(m.value); else reject(Object.assign(new Error(m.message), m.code ? { code: m.code } : {})); });
    w.once("error", (e) => { done = true; reject(e); });
    w.once("exit", (code) => { if (!done) reject(new Error(`The worker for ${name} stopped (exit ${code})`)); });
  });
}
