// A slow check answered at once from its last result (Settings › System took seconds to show otherwise): the page gets what was
// found last time (cached: true, checkedAt) while the check runs again in the background, and the next read has the new result; ?fresh=1
// waits for a new run. The first read ever waits. The last result is kept in the state folder, so it survives a restart.
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export function cachedCheck(name, run, { root }) {
  const file = join(process.env.MW_STATE_DIR ?? join(root, "runtime", "state"), `check-${name}.json`);
  let last = null; try { last = JSON.parse(readFileSync(file, "utf8")); } catch { /* none yet */ }
  let running = null, gen = 0;
  const refresh = () => { const g = gen; return (running ??= Promise.resolve().then(run).then((value) => {
    if (g !== gen) return { value, at: new Date().toISOString() };          // cleared meanwhile: an older run is not kept
    last = { value, at: new Date().toISOString() };
    try { mkdirSync(join(file, ".."), { recursive: true }); writeFileSync(file, JSON.stringify(last)); } catch { /* kept in memory */ }
    return last;
  }).finally(() => { if (g === gen) running = null; })); };
  return {
    async get({ fresh = false } = {}) {
      if (fresh || !last) { const r = await refresh(); return { ...r.value, checkedAt: r.at, cached: false }; }
      refresh().catch(() => {});
      return { ...last.value, checkedAt: last.at, cached: true, checking: true };
    },
    /** A setup step changed what the check finds: the next read waits for a new run. */
    clear() { gen++; last = null; running = null; rmSync(file, { force: true }); },
  };
}
