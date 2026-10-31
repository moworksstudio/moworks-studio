// Is this computer so busy that a film will take longer (owner 31/10: three films at once, with every core taken, took hours and nobody was told why). The top bar says so in one
// line while the app has work running. High for minutes, not a moment: a render fills the CPU for a while by itself on any machine, so a short peak says nothing.
import { cpus } from "node:os";

export const BUSY_AT = 90, CALM_AT = 70;          // percent of all cores
export const BUSY_FOR_MS = 3 * 60 * 1000, CALM_FOR_MS = 60 * 1000, SAMPLE_MS = 15 * 1000;

/** The next state from one reading: busy once it has stayed at BUSY_AT or over for BUSY_FOR_MS, calm again once it has stayed under CALM_AT for CALM_FOR_MS; between the two it stays as it is. */
export function nextBusy(s = {}, percent, t) {
  const high = percent >= BUSY_AT, low = percent < CALM_AT;
  const highSince = high ? s.highSince ?? t : null, lowSince = low ? s.lowSince ?? t : null;
  const busy = highSince != null && t - highSince >= BUSY_FOR_MS ? true : lowSince != null && t - lowSince >= CALM_FOR_MS ? false : !!s.busy;
  return { busy, highSince, lowSince };
}

/** All cores' times added up, for cpuPercent. */
export const cpuTimes = () => cpus().reduce((a, c) => {
  const total = Object.values(c.times).reduce((x, y) => x + y, 0);
  return { idle: a.idle + c.times.idle, total: a.total + total };
}, { idle: 0, total: 0 });

/** The percent of all cores in use between two cpuTimes readings. */
export function cpuPercent(a, b) {
  const total = b.total - a.total;
  return total > 0 ? Math.round((1 - (b.idle - a.idle) / total) * 100) : 0;
}

/** Reads the CPU every SAMPLE_MS for as long as the service lives (it never keeps the process up). `busy()` is the answer. */
export function busyWatch({ read = cpuTimes, every = SAMPLE_MS, now = Date.now } = {}) {
  let last = read(), state = {};
  const timer = setInterval(() => { const cur = read(); state = nextBusy(state, cpuPercent(last, cur), now()); last = cur; }, every);
  timer.unref?.();
  return { busy: () => !!state.busy, stop: () => clearInterval(timer) };
}
