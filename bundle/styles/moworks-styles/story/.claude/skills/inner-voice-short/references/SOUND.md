# Sound for an Inner Voice Short

The sound of this style is quiet and close: room tone, a thumb on a phone, a clock, an alarm, breath under the red
words, small object sounds, and one dark swell when the shadow arrives. There's no voice. **Every sound is made in
code** by `tools/sfx/build_inner_voice.py`, which writes `public/sfx/inner-voice/` (its `INDEX.md` lists every sound
with its length and level). No downloaded sounds. No whooshes unless the user asks.

**No music ships with the kit.** These shorts often carry a sparse piano. When the user asks for music, compose it
with the `original-music` skill (felt piano and strings in Python), written to the beat table. Without music, the
room tone and the foley carry the mood, and silence is part of the design.

## The library (`public/sfx/inner-voice/`)
| Sound | What it is | Typical gain (dB) |
|---|---|---|
| `room` | 20 s of faint dark air with a low hum; lay it under a whole scene | 0 |
| `tap` | a thumb flicks a phone; one per visible scroll | −6 |
| `alarm` | a bedside alarm clock: four square-ish beeps near 2.8 kHz, a pause, again (2.9 s) | −4 |
| `clock-spin` | a clock spinning through a time-skip (2.3 s); the ticks bunch in the middle like the eased hands | −4 |
| `whisper` | breath shaped into soft syllables under a red inner-voice line (never words) | −6 to −8 |
| `harmonics` | two guitar harmonics ring out (an object "calls" the hero) | −4 |
| `strum-sour` | a badly tuned first chord, every string a little off, one buzzing, clamped at 0.70 s | 0 |
| `string-mute` | a hand clamps the strings: thump, choke, squeak | −3 |
| `dread` | the shadow arrives: a low D swell, a faint high minor second, dark air (3.8 s) | −2 |

## Ingredients (`tools/sfx/sfxlib.py`; copy and adapt the recipes in `build_inner_voice.py`)
| Recipe | How |
|---|---|
| Out-of-tune strings | `string_ks(f, dur, rng, bright, decay)` per string, each detuned in cents; a sign-clipped rattle makes fret buzz; a 16 ms stagger makes a downstroke |
| Clock ticks | 2.9 kHz and 1.45 kHz damped sines plus a transient. For a time-skip, place the ticks where the eased hand progress crosses k/N |
| Whisper | noise through a moving band-pass (1.8 kHz ± 0.9) in syllable-shaped bursts, high-passed at 900 Hz |
| Dread | D1 and A1 sines with a slow attack, a faint minor second with tremolo, low-passed air |
| Room | low-passed noise plus a 55/110 Hz hum, about −44 LUFS momentary |

A sound that must follow one video's timing (a swell that ends on a cut, a choke on a frame) goes in its own
`tools/sfx/build_<slug>.py`, with times that mirror the video's `T` table and output to `public/sfx/<slug>/`. Point
those cues' folder at it. Reusable designs go in the library.

## The arc in sound
- **The routine:** room tone, small foley (taps, ticks), whispers under the red words.
- **The attempt:** the object's own sound (the strum, the alarm). If there is music, a failed attempt can **cut it
  dead**: silence is the joke and the wound.
- **The shadow:** `dread` on its entrance, and whispers on its lines.
- **Later acts**, if the user extends the short: a pulse (footsteps, a heartbeat) in the rebuild, and warmth at the
  summit (music, if they asked for it).

## The mix
`SOUND` in the composition has these fields:
- `voice: null`
- `master: true`
- the cues, with `sfxDir: "sfx/inner-voice"`
- optionally `music: { src, keys }` (only when asked) and `fade: [in, out]`

`tools/sfx/mix.py` masters the result: one static gain to **−14 LUFS integrated**, and a 4×-oversampled limiter
that keeps the **true peak at −1.5 dBTP or lower**. The style plays quiet, but we master to −14 because that's what
YouTube normalises to.

Check:
- RMS per 0.5 s (silences where they're meant to be)
- FFT peaks of pitched effects (the detuned strings land where intended)
- `tools/qc.mjs` for loudness and peaks

Every sound is checked by measurement; say that nobody has listened.
