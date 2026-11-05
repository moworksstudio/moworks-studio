---
name: sound-design
description: Design the sound of a 2D explainer — sound effects and a soft music bed synthesized in Python (numpy/scipy, seeded, no samples), keyed to words of the narration through story/sound.json, mixed under the voice and mastered to −14 LUFS with tools/sound.mjs — using the generic kit (pop, pop_big, tick, counter_roll, whoosh_pullback, whoosh_dive, impact, reveal, light_hit, sparkle, swish, title) or a bespoke per-film score built from the worked example's sound/ folder. Use for "add sound", "sound effects", "music", "a score", "no music", "no sound", "remove that sound", "the music is too loud", "make the title land", or step 10 of the explainer loop.
---

# Sound design

Everything you hear (apart from the voice) is synthesized in Python: no samples, no downloaded music, no other video's
audio. It's seeded, so the same cues always make the same sound. You can't listen: report the measured loudness and
say so.

## The two routes
| Route | When | Command |
|---|---|---|
| **Generic** (the default) | most films; fast | `node tools/sound.mjs <dir>` |
| **Bespoke** (a score and effects written for this film) | the user wants the best result, or a sound agent is on the roster | `node tools/sound.mjs <dir> --bespoke` |

Switches: `--music generic|off`, `--sfx generic|off` (defaults from `kit.config.json → sound`). "No music" → `--music
off`. "No effects" → `--sfx off`. A film without a voice is mastered to −14 LUFS on its own (no flag needed). "No
sound" on a film without a voice → don't run `sound.mjs` at all; the render is picture only.

`sound.mjs` runs: `build_cues.py` (word cues → absolute times in `audio/cues.json`) → `sfx.py` → `music.py` → `mix.py`
→ `verify_mix.py`, and exits non-zero on a FAIL (it prints what to fix: move a cue off a word, or re-run). It writes
the film's length from the root into the cue files. `--bespoke` runs the video's own `sound/build.mjs` instead.

## `story/sound.json` (you write it from the storyboard's event-cue table)
```json
{ "vo": "vo.wav",
  "title": { "word": "sting", "edge": "end", "offset": 0.6 },
  "cues": [
    { "word": "needle", "n": 1, "kind": "sparkle" },
    { "word": "drops", "offset": 0.3, "kind": "pop", "gain_db": -3, "pan": 0.2 },
    { "word": "one", "kind": "counter_roll", "dur_to": "minute" },
    { "t": 0.5, "kind": "sparkle" }
  ] }
```
- `word` + `n` (occurrence, default 1) + `offset` (seconds) anchor a cue to a spoken word; matching ignores case and
  punctuation, like the picture's word cues. `edge` is `start` (default) or `end` of the word.
- `dur_to` sets `dur` so the cue ends on that word's start.
- `t` places a cue at an absolute time (silent films, the opening).
- `gain_db` (loudness offset vs the kind's default), `pan` (−1..1), `dur`, `pitch` (semitones: pop, pop_big, tick,
  counter_roll, sparkle), `align` (`start`/`end`, counter_roll only).
- `title` is where the music resolves and swells (the on-screen title's time).
- Unknown kinds are skipped with a warning: read the output.

## The generic kinds
The transient (or peak) of every effect lands exactly on its time. Lead-ins start before it, so leave room at the head.

| Kind | Sound | Timing around `t` | `dur` (default) |
|---|---|---|---|
| `pop` | soft bubbly UI pop, in key | transient on t | – |
| `pop_big` | heavier pop and a low thump, 0.14 s airy pre-swell | slam on t | – |
| `tick` | short soft woody or glassy tick | on t | – |
| `counter_roll` | accelerating ticks (7 to 26 per s) and an accented last tick | first tick on t, last on t + dur (`"align": "end"`: last tick on t) | roll length (1.0) |
| `whoosh_pullback` | airy rising-then-falling sweep, soft sub swell, drifting left to right | peak on t (starts 0.62·dur before) | total (1.2) |
| `whoosh_dive` | darker falling sweep and a sub drop | peak on t (starts 0.55·dur before) | total (1.1) |
| `impact` | deep soft boom with a soft transient, 0.25 s pre-suck | hit on t | tail (2.2) |
| `reveal` | shimmering riser into a warm bloom | riser ends on t | riser (2.0) |
| `light_hit` | bright airy shimmer, 0.3 s swell-in | hit on t | tail (2.4) |
| `sparkle` | 5 tiny glassy chimes over 0.25 s | first chime on t | – |
| `swish` | short soft whoosh for slides | peak on t | total (0.4) |
| `title` | warm chord swell and a bell strike, 0.6 s swell-in | strike on t | ring (4.0) |

Everything musical is in D major, glued by one short shared reverb. The generic music cycles Dmaj9, Gmaj9♯11, Em9 and
A9sus4 (about 3.2 s each) so the sus4 falls just before the title, resolves on the title, swells about +5 dB there and
rings out; it fades in over the first second.

## Where sounds go
- **On events, on their word**: an arrival, a pop of a label pill, an impact, a reveal, the title. Pills get a `pop`;
  a counter gets a `counter_roll`; a sparkle on a glint.
- **Cuts are usually silent.** A `swish` or a whoosh only on a real move (something sliding in, a camera pull), not on
  every cut.
- Swells peak 0.1–0.35 s after the word starts; transients land on the cue.
- "Remove that sound" → remove exactly that cue, nothing else, and rebuild.

## Levels (measured BS.1770, relative to the voice)
| Stem | Target |
|---|---|
| Master | **−14 LUFS** integrated; true peak **≤ −1 dBTP** after the AAC encode (`qc.mjs` checks it) |
| Music bed | about −21 LU under the voice, nearly constant; ducked a few dB under words |
| Effects | median about −13 LU; hero events −1 to −7; ticks −16 to −24 |
| Title | the music swells about +5 dB into the title, resolves on it, with a 2–3 s tail |

Adjust with `gain_db` per cue. If the music feels loud to the user, lower the bed; never trade away the voice's
clarity.

## The bespoke route (a score for this film)
The worked example's `examples/where-the-needle-stops/sound/` is the template: shared DSP (`injsynth.py`), a cue map
from the storyboard (`cues_inj.py`), effects (`sfx_inj.py`), a score (`music_inj.py`), a mixer (`mix_inj.py`), and
`build.mjs`, which runs them in order and then the verifier (`tools/audio/verify_mix.py`).
1. Copy the example's `sound/` folder into `<dir>/sound/`. Keep `build.mjs` (`sound.mjs --bespoke` runs it); rename
   the `*_inj.py` files for this film and update `build.mjs` to match.
2. Rewrite the cue map from this film's event-cue table (word cues, not hand-typed times).
3. Write a new score for this film: chords that change on picture cuts read from `audio/cues.json` (one chord per
   shot), held soft pads, airy glass, a sparse motif that asks in the phrase gaps and answers under the title, no
   drums. Never copy the example's progression or motif: compose a new one in a key that suits the film.
4. Effects in a small, warm palette pitched in the score's key; long layers under words get a speech-band carve keyed
   from the voice; room tone follows the shots.
5. `node tools/sound.mjs <dir> --bespoke`. It must pass its verifier: −14.0 ± 0.1 LUFS, true peak under −1.0 dBTP
   after AAC, exact length in samples, the voice at lag 0, every effect on its cue, every word clear.

A sound agent can own this route in parallel with the art agents: give it `STORYBOARD.md`, `story/words.json`,
`audio/vo.wav` and this skill, and let it own only `<dir>/sound/`.

## Don't → do instead
| Don't | Do instead |
|---|---|
| Download a sound, a loop or music | Synthesize it (add a kind, or use the bespoke route) |
| Hand-type absolute times for a narrated film | Word cues in `sound.json`; the voice re-times them |
| Put a whoosh on every cut | Cuts silent; effects on events |
| Remove "some" sounds when one was named | Remove exactly that cue |
| Say it sounds good | Report the measured numbers and say you can't listen |
