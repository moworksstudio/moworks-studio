// Camera timed to words (owner #1264, #1267; audit/111 H1, the P3 of audit/108): the app's own helper for the Ricks Clip and 3D Cartoon film styles.
// The idea, that each key of a camera path lands on a word of the voice and the move eases only at its first and last key so it never stops on
// the way, is from @Huzaifa's skill animated-3d-story-video (SOURCES.md S-HUZ). That skill ships no licence, so none of its code is used: this
// file is written by Moworks Studio from the idea alone. Credit: Moworks Studio (the code), @Huzaifa (the idea).
//
// Pure functions, no three.js: arrays in, arrays out, the same frame drawn the same way every time.
//   Ricks Clip   film/story.js: import { camOnWords, wordTime } from "./camtime.js"; keys like camFromKeys' ({ f, pos, look, fov, roll }), or timed by
//                a word ({ word: "vault", pos, … }) or a second ({ t: 3.2, … }); call it with the frame and fps 30. It replaces camFromKeys for a
//                glide of three keys or more (camFromKeys' smootherstep stops at every key); add the source skill's kicks after it, as camAt does.
//   3D Cartoon   src/videos/film/shots.ts: import { camOnWords } from "mw:camtime"; inside a shot's cam(T, t), camOnWords(keys, T, { words: WORDS })
//                gives { pos, look } as arrays (wrap them in THREE.Vector3). T is the film's own second (out / FPS), the voice's time.

const norm = (s) => String(s ?? "").normalize("NFC").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();

/** The second a word (or a phrase of words, "you see") is said: its start (at: "start") or end (at: "end"), the nth time it is said (0 the first).
 *  words: [{ word, start, end }] seconds, the voice's words (Ricks: WORDS of "./words.js"; 3D Cartoon: WORDS of "mw:words"). A word the voice does
 *  not say throws, unless `or` gives the second to use instead (a voice made again may have changed a word). */
export function wordTime(words, text, { nth = 0, at = "start", or } = {}) {
  const want = norm(text).split(" ").filter(Boolean), said = (words ?? []).map((w) => norm(w.word));
  let seen = 0;
  if (want.length) for (let i = 0; i + want.length <= said.length; i++) {
    if (!want.every((w, k) => said[i + k] === w)) continue;
    if (seen++ === nth) return at === "end" ? Number(words[i + want.length - 1].end) : Number(words[i].start);
  }
  if (Number.isFinite(or)) return or;
  throw new Error(`camtime: "${text}"${nth ? ` (time ${nth + 1})` : ""} is not in the voice's words`);
}

/** Each key's second: key.t, else key.f / fps, else the second its key.word is said (key.nth, key.at as in wordTime; key.lead moves it, seconds,
 *  negative to arrive before the word). Throws when two keys are not in order. */
export function keyTimes(keys, { fps = 30, words = [] } = {}) {
  const t = keys.map((k) => (Number.isFinite(k.t) ? k.t : Number.isFinite(k.f) ? k.f / fps : wordTime(words, k.word, { nth: k.nth ?? 0, at: k.at ?? "start", or: k.or })) + (Number(k.lead) || 0));
  for (let i = 1; i < t.length; i++) if (!(t[i] > t[i - 1])) throw new Error(`camtime: key ${i + 1} (${t[i].toFixed(3)} s) is not after key ${i} (${t[i - 1].toFixed(3)} s)`);
  return t;
}

/** The time warp: a monotone cubic through (times[i], i), so u(times[i]) = i exactly. Its slope is 0 at the first and last key (the move eases in
 *  and out there) and never 0 in between (the tangents are the harmonic mean of the two neighbouring slopes, so the curve keeps rising and never
 *  overshoots a key): the camera passes every key in time without stopping on it. Returns (t) => u in [0, n-1], held before and after. */
export function timeWarp(times) {
  const n = times.length;
  if (n < 2) return () => 0;
  const h = [], d = [], m = new Array(n).fill(0);
  for (let i = 0; i < n - 1; i++) { h[i] = times[i + 1] - times[i]; d[i] = 1 / h[i]; }
  for (let i = 1; i < n - 1; i++) m[i] = (2 * d[i - 1] * d[i]) / (d[i - 1] + d[i]);
  return (t) => {
    if (!(t > times[0])) return 0;
    if (t >= times[n - 1]) return n - 1;
    let i = 0;
    while (t > times[i + 1]) i++;
    const s = (t - times[i]) / h[i], s2 = s * s, s3 = s2 * s;
    return (2 * s3 - 3 * s2 + 1) * i + (s3 - 2 * s2 + s) * h[i] * m[i] + (-2 * s3 + 3 * s2) * (i + 1) + (s3 - s2) * h[i] * m[i + 1];
  };
}

/** A Catmull-Rom curve through values (numbers or [x, y, z]) at u in [0, n-1]: it passes through each value with no corner. */
export function through(values, u) {
  const n = values.length - 1;
  if (n <= 0 || !(u > 0)) return values[0];
  if (u >= n) return values[n];
  const i = Math.max(0, Math.min(n - 1, Math.floor(u))), s = Math.max(0, Math.min(1, u - i));
  const p0 = values[Math.max(0, i - 1)], p1 = values[i], p2 = values[i + 1], p3 = values[Math.min(n, i + 2)];
  const one = (a, b, c, e) => 0.5 * (2 * b + (-a + c) * s + (2 * a - 5 * b + 4 * c - e) * s * s + (-a + 3 * b - 3 * c + e) * s * s * s);
  return Array.isArray(p1) ? p1.map((_, k) => one(p0[k], p1[k], p2[k], p3[k])) : one(p0, p1, p2, p3);
}

/** The camera at `time` on a path of keys ({ pos, look, fov?, roll? } with f, t or word; see keyTimes): { pos, look, fov, roll }. `time` is a frame
 *  when opts.fps is given and opts.seconds is not true (Ricks: camOnWords(K, f, { fps: 30, words: WORDS })), else seconds (3D Cartoon:
 *  camOnWords(K, T, { words: WORDS })). Before the first key the camera is at it, after the last it holds there; opts.creep (a share of the fov
 *  per second, e.g. 0.004) keeps that hold pushing in slowly so it never freezes. */
export function camOnWords(keys, time, { fps = null, seconds = false, words = [], creep = 0 } = {}) {
  if (!Array.isArray(keys) || !keys.length) throw new Error("camtime: no keys");
  const sec = fps && !seconds ? time / fps : time, times = keyTimes(keys, { fps: fps ?? 30, words }), u = timeWarp(times)(sec);
  const pick = (name, dflt) => keys.map((k) => k[name] ?? dflt);
  const fov0 = through(pick("fov", keys.find((k) => Number.isFinite(k.fov))?.fov ?? 40), u);
  const after = Math.max(0, sec - times[times.length - 1]);
  return { pos: through(pick("pos"), u), look: through(pick("look"), u), fov: fov0 * (1 - creep * after), roll: through(pick("roll", 0), u) };
}
