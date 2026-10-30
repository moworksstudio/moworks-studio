// The chat's reads while Claude works: the tasks are read again and again until a read says no task runs. A read that fails, or that a
// busy server never answers, is given up after a time limit (aborted, so it frees the browser's connection to the app) and tried again
// a little later, so the chat's working state always ends once the task has ended (T26-3: the reads stopped at the first one that
// failed; T25-7: the chat said "Drawing the storyboard pictures…" with its Stop button for 7 minutes after the Storyboard had ended).

/** Read with `read(signal)` after `fast` ms, again every `fast` ms while the answer says a task runs (`running`), and every `slow` ms
 *  after a read that failed (threw or gave nothing) or took longer than its time limit: `limit` ms, twice as long after each read that
 *  ran out of time (at most `most` ms, so a slow server's answer is still waited for), `limit` again after an answer. A read that ran
 *  out of time has its signal aborted and is not waited for. The first answer with no task running ends the watch. Returns stop(): no
 *  read after it, the one going on aborted. */
export function watchTask(read, { fast = 1200, slow = 5000, limit = 20000, most = 80000 } = {}) {
  let alive = true, timer = null, ctl = null, wait = limit;
  const tick = async () => {
    if (!alive) return;
    const c = (ctl = new AbortController());
    let cut = null, late = false;
    const timeUp = new Promise((ok) => { cut = setTimeout(() => { late = true; c.abort(); ok(null); }, wait); });
    const r = await Promise.race([Promise.resolve().then(() => read(c.signal)).catch(() => null), timeUp]);
    clearTimeout(cut);
    if (!alive) return;
    wait = late ? Math.min(wait * 2, most) : limit;
    if (r?.running) timer = setTimeout(tick, fast);
    else if (!r) timer = setTimeout(tick, slow);
  };
  timer = setTimeout(tick, fast);
  return () => { alive = false; clearTimeout(timer); ctl?.abort(); };
}
