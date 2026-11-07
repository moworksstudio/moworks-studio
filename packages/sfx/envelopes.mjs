// The volume lanes the app writes: the music ducked under the spoken words, an effect dipped under a word, a lane's points; their signature (sig), so a lane the user drew stays theirs.
// (audit/112a B11: one of the files packages/sfx/actions.mjs was split into; actions.mjs is still their door.)
import { DUCK } from "./mix/levels.mjs";
import { r3 } from "./rule-numbers.mjs";

/** A lane the app wrote keeps its signature beside it (data-mw-duck), so a lane the user changed in Studio stays theirs. */
export const sig = (s) => { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) | 0; return (h >>> 0).toString(36); };

// Owner 31/10: at 0.6 s the music rose and fell at every breath of the voice (Test 29: 14 times in 55 s). It holds through a pause under this,
// and rises slowly after a longer one.
export const SPEECH_GAP = 2, DUCK_RELEASE = 1;

/** The spoken spans (words closer than SPEECH_GAP merged), film seconds. */
export function speechSpans(words, gap = SPEECH_GAP) {
  const out = [];
  for (const w of [...(words ?? [])].sort((a, b) => a.start - b.start)) {
    const prev = out.at(-1);
    if (prev && w.start - prev.end < gap) prev.end = Math.max(prev.end, w.end); else out.push({ start: w.start, end: w.end });
  }
  return out;
}

/** The volume lane of a clip that ducks under the spans (clip-local seconds, HF's data-automation: full level before each span, `duck`
 *  from its first word to its last, back up after), or null when no word falls in it. The spans are SPEECH_GAP apart at least (speechSpans),
 *  more than an attack and a release, so the envelope never folds back. */
export function duckLane(clip, spans, { duck = DUCK, attack = 0.15, release = DUCK_RELEASE } = {}) {
  const a = clip.start, b = clip.start + clip.duration;
  const inside = (spans ?? []).filter((s) => s.end > a && s.start < b);
  if (!inside.length) return null;
  return envelopeLane(clip, inside.flatMap((s) => [[s.start - attack, 1], [s.start, s.duck ?? duck], [s.end, s.duck ?? duck], [s.end + release, 1]]));
}

/** An effect's own lane under the words it sounds on (voicefit.mjs): dips [{ start, end, gain }] in film seconds, by start; flat inside each
 *  word, so the word hears exactly that gain; back to full in a pause long enough, else straight on to the next word's gain. null with no dip. */
export function dipLane(clip, dips, { attack = 0.05, release = 0.1 } = {}) {
  if (!dips?.length) return null;
  const env = [[dips[0].start - attack, 1]];
  dips.forEach((d, i) => {
    const prev = dips[i - 1], next = dips[i + 1], turn = 0.01;          // two words with no pause: the turn inside the one that may be louder
    const from = prev && d.start - prev.end < turn * 1.2 ? (prev.gain < d.gain ? prev.end + turn : Math.max(d.start, prev.end + 0.001)) : d.start;
    const to = next && next.start - d.end < turn * 1.2 && next.gain < d.gain ? d.end - turn : d.end;
    env.push([from, d.gain], [to, d.gain]);
    if (!next) env.push([d.end + release, 1]);
    else if (next.start - d.end >= attack + release) env.push([d.end + release, 1], [next.start - attack, 1]);
  });
  return envelopeLane(clip, env);
}

/** An envelope [[film second, value]], by time, as HF's volume lane in the clip's own seconds. */
function envelopeLane(clip, env) {
  const a = clip.start, b = clip.start + clip.duration;
  const at = (t) => {
    if (t <= env[0][0]) return env[0][1];
    for (let i = 1; i < env.length; i++) if (t <= env[i][0]) { const [t0, v0] = env[i - 1], [t1, v1] = env[i]; return t1 > t0 ? v0 + ((v1 - v0) * (t - t0)) / (t1 - t0) : v1; }
    return env.at(-1)[1];
  };
  const pts = [{ t: 0, v: r3(at(a)) }];
  for (const [t, v] of env) if (t > a && t < b && r3(t - a) > pts.at(-1).t) pts.push({ t: r3(t - a), v });
  if (r3(clip.duration) > pts.at(-1).t) pts.push({ t: r3(clip.duration), v: r3(at(b)) });
  return { version: 1, lanes: [{ target: "volume", points: pts.slice(0, 512) }] };
}
