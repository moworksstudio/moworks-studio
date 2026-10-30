// The app checks for its own new version by itself, as Claude Desktop does: about a minute after it starts, then every six hours while
// it runs. Only a git clone with a repo configured checks. The check is check() of index.mjs, quiet: git fetch beside the server's thread
// (async, windowsHide), never a sign-in window; offline, signed out or refused is only noted (in memory and the log), never an error on
// screen. Never while the app updates itself or renders (it tries again a little later). The answer is kept, so the top bar's notice and
// Settings › Update read it (GET /api/app/update) without asking the repo again; "Check for updates" goes through here too and keeps its
// answer the same way, with its errors shown as before.
import { canCheck, check as checkRepo, justUpdated } from "./index.mjs";

export const FIRST_CHECK_MS = 60 * 1000;
export const CHECK_EVERY_MS = 6 * 60 * 60 * 1000;
export const BUSY_RETRY_MS = 10 * 60 * 1000;          // an update or a render was running: the next try

/** The background check. Everything it touches can be given (tests): `check(root, { quiet })`, `eligible()`, `busy()`, `whatUpdated()`,
 *  the timers (`clock.setTimeout / clearTimeout`), `now()` and `log(line)`. */
export function createUpdateChecker({ root, check = checkRepo, eligible = () => canCheck(root), busy = () => false, whatUpdated = () => justUpdated(root),
  firstDelayMs = FIRST_CHECK_MS, everyMs = CHECK_EVERY_MS, busyRetryMs = BUSY_RETRY_MS, clock = globalThis, now = () => new Date(), log = () => {} } = {}) {
  let started = false, timer = null, inFlight = null;
  let answer = null, checkedAt = null, error = null, skipped = null, updated = null;
  const iso = () => now().toISOString();

  const schedule = (ms) => {
    clock.clearTimeout(timer);
    timer = clock.setTimeout(tick, ms);
    timer?.unref?.();          // a waiting check never keeps the process alive
  };

  const once = (quiet) => {
    const p = (async () => {
      try {
        const r = await check(root, { quiet });
        answer = r; checkedAt = r?.at ?? iso(); error = null;
        return r;
      } catch (e) {
        error = { code: e?.code ?? "ERROR", at: iso() };
        if (quiet) log(`[update] the automatic check did not reach the repo (${error.code}): ${e?.message ?? e}`);
        throw e;
      } finally { if (inFlight?.p === p) inFlight = null; }
    })();
    inFlight = { p, quiet };
    return p;
  };

  /** One check now (single flight: a check already running is joined). `quiet`: the background's (no sign-in window; the caller
   *  swallows its error). The answer and any error are kept either way. The user's own check that meets a quiet one waits for it,
   *  and asks again itself only when the quiet one could not sign in (its own may open the sign-in window). */
  async function run({ quiet = false } = {}) {
    if (inFlight && (quiet || !inFlight.quiet)) return inFlight.p;
    if (inFlight) { try { return await inFlight.p; } catch (e) { if (e?.code !== "AUTH") throw e; } }
    return inFlight && !inFlight.quiet ? inFlight.p : once(quiet);
  }

  async function tick() {
    timer = null;
    if (!started) return;
    if (busy()) {          // an update or a render: never fetch beside it
      skipped = { at: iso(), reason: "busy" };
      schedule(busyRetryMs);
      return;
    }
    skipped = null;
    try { await run({ quiet: true }); } catch { /* noted by run() */ }
    if (started) schedule(everyMs);
  }

  return {
    /** Starts the timer (a git clone with a repo only): true when it checks. Also reads once whether this start follows an update. */
    start() {
      if (started) return true;
      if (!eligible()) return false;
      started = true;
      Promise.resolve().then(whatUpdated).then((u) => { updated = u ?? null; }, () => {});
      schedule(firstDelayMs);
      return true;
    },
    stop() { started = false; clock.clearTimeout(timer); timer = null; },
    run,
    /** What the notice needs, from the last answer (no git): { available, latest: { id, date, subject }, checkedAt, checkError, updated }. */
    notice() {
      const l = answer?.latest;
      return { available: !!answer?.available, latest: l ? { id: l.short, date: l.date, subject: l.subject } : null, ahead: answer?.ahead ?? 0,
        checkedAt, checkError: error, updated };
    },
    /** The last full answer of check() (the commits, what blocks it, the changelog), for Settings › Update; null before the first. */
    answer: () => answer,
    /** For tests and the log: started, waiting, the last skip. */
    state: () => ({ started, waiting: !!timer, checking: !!inFlight, skipped }),
  };
}
