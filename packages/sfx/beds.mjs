// Ambience beds: one loop per run of shots in one place, crossfaded between places, faded in at the start and out with the ending; a loop tiled to its length.
// (audit/112a B11: one of the files packages/sfx/actions.mjs was split into; actions.mjs is still their door.)
import { placeOf } from "./places.mjs";
import { r3 } from "./rule-numbers.mjs";

// ---- Ambience beds: one loop per run of shots in the same place, crossfaded between places, faded in at the start and out with the
// film's ending fade; ducked about 6 dB while words are spoken (HyperFrames' own volume lane, data-automation, the way its media-use
// skill's duck.mjs writes one; Apache-2.0)
export const XFADE = 1, FIRST_FADE = 1;

/** The beds: [{ key, query, entry, start, end, fadeIn, fadeOut, shots }]. find(query): the library's loop for a place (findAmbience). */
export function ambienceBeds(shots, { find, filmEnd = null, endFade = null, xf = XFADE } = {}) {
  const placed = [...(shots ?? [])].filter((s) => s.start != null && s.duration).sort((a, b) => a.start - b.start);
  const runs = [];
  for (const s of placed) {
    const p = placeOf(s), entry = p && !p.none ? find(p.query) : null;
    const prev = runs.at(-1), sEnd = r3(s.start + s.duration);
    if (entry && prev && prev.entry.id === entry.id && Math.abs(prev.end - s.start) < 0.05) { prev.end = sEnd; prev.shots.push(s.number); continue; }
    if (entry) runs.push({ key: `amb:${s.number}`, query: p.query, entry, start: s.start, end: sEnd, shots: [s.number], surface: p.surface });
  }
  const last = filmEnd ?? (placed.length ? Math.max(...placed.map((s) => s.start + s.duration)) : 0);
  return runs.map((b, i) => {
    const before = runs[i - 1], after = runs[i + 1];
    const start = r3(Math.max(0, b.start - (before && Math.abs(before.end - b.start) < 0.05 ? xf / 2 : 0)));
    const atEnd = b.end >= last - 0.05;
    const end = r3(atEnd ? last : Math.min(last, b.end + (after && Math.abs(after.start - b.end) < 0.05 ? xf / 2 : 0)));
    return { ...b, start, end, fadeIn: start <= 0.001 ? Math.min(FIRST_FADE, (end - start) / 3) : xf,
      fadeOut: r3(atEnd ? Math.max(xf, Number(endFade) || 0) : xf) };
  });
}

/** A bed as clips of its loop: one clip, or for a bed longer than the loop the loop again in equal clips crossfaded by xf (no stub at the
 *  end): [{ start, duration, fadeIn, fadeOut }]. */
export function tiles(bed, loopS, xf = XFADE) {
  const len = bed.end - bed.start;
  if (!(loopS > xf * 2) || len <= loopS + 0.01) return [{ start: bed.start, duration: r3(len), fadeIn: bed.fadeIn, fadeOut: bed.fadeOut }];
  const n = Math.ceil((len - xf) / (loopS - xf)), step = (len - xf) / n;
  return Array.from({ length: n }, (_, k) => ({ start: r3(bed.start + k * step), duration: r3(k === n - 1 ? len - k * step : step + xf),
    fadeIn: k ? xf : bed.fadeIn, fadeOut: k === n - 1 ? bed.fadeOut : xf }));
}
