# Audio tools

Synthesized sound effects, a music bed and a loudness-correct mixer, all driven by one cue file. Pure numpy/scipy,
seeded and deterministic, written as 48 kHz stereo 24-bit WAV. There are no samples anywhere.

## Run them

Use `node tools/sound.mjs <video dir>`. It runs the whole chain and stops on a failure:

```
story/sound.json + story/words.json ──build_cues.py──▶ audio/cues.json
audio/cues.json ──sfx.py──▶ audio/sfx.wav        ──music.py──▶ audio/music.wav
vo.wav + music.wav + sfx.wav ──mix.py──▶ audio/mix.wav (+ mix.m4a, mix.json)
everything ──verify_mix.py──▶ PASS / FAIL
```

| Flag | Does |
| --- | --- |
| `--music generic\|off` | the music bed, or none (default: `kit.config.json → sound.music`, else `generic`) |
| `--sfx generic\|off` | the effects, or none (default: `kit.config.json → sound.sfx`, else `generic`) |
| `--bespoke` | run the video's own `sound/build.mjs` instead (a score written for one film; see `examples/where-the-needle-stops/sound/`) |

The film length always comes from `index.html`'s root. `sound.mjs` writes it into `story/sound.json` and
`audio/cues.json`. With no `audio/vo.wav` the music and effects carry the film on their own and are mastered to
−14 LUFS (`mix.py --normalize`). With no voice, no music and no effects, `sound.mjs` writes a silent `mix.wav` so the
film still checks and renders.

To run one tool alone, go through uv with the kit's pins:

```bash
node tools/py.mjs tools/audio/build_cues.py videos/<slug> --duration 40
node tools/py.mjs tools/audio/sfx.py   --cues videos/<slug>/audio/cues.json --out-dir videos/<slug>/audio
node tools/py.mjs tools/audio/music.py --cues videos/<slug>/audio/cues.json --out-dir videos/<slug>/audio
node tools/py.mjs tools/audio/mix.py   --cues videos/<slug>/audio/cues.json --out-dir videos/<slug>/audio
node tools/py.mjs tools/audio/verify_mix.py videos/<slug>
```

`sfx.py` and `music.py` take `--seed N` (default: `seed` in cues.json, else 1234). `sfx.py --list` prints the
kinds. Each script takes about 1 s per 15 s of audio.

## The cue sheet: `story/sound.json`

Write cues against words of the narration, the same way `story.js` keys the picture with `EX.cue`:

```json
{ "duration": 40, "vo": "vo.wav",
  "title": { "word": "sting", "edge": "end", "offset": 0.6 },
  "cues": [
    { "word": "needle", "kind": "sparkle", "gain_db": -4 },
    { "word": "in", "n": 2, "offset": -0.05, "kind": "swish", "dur": 0.3 },
    { "word": "one", "kind": "counter_roll", "dur_to": "minute" },
    { "t": 0.5, "kind": "sparkle" } ] }
```

- `word` matches `story/words.json` like `EX.cue`: case and punctuation are ignored. `n` is the occurrence (1 =
  first). `edge` is `start` (default) or `end`. `offset` is added in seconds.
- `t` is an absolute time. A film with no narrator uses only `t` cues.
- `dur_to` sets `dur` so the cue ends on that word's start. It takes a word or an anchor such as
  `{"word": "minute", "edge": "end"}`.
- `title` is where the music resolves and swells. Leave it out and the music picks a point near the end.
- `seed` (optional) changes every random choice at once. `fade_s` (optional) is the end fade (default 1.0 s).
- Write one cue per line. It keeps a 50-cue sheet readable.

`build_cues.py` turns it into `audio/cues.json` with absolute times:

```json
{ "duration": 40, "sr": 48000, "vo": "vo.wav", "title_t": 35.15, "seed": 1234,
  "cues": [ { "t": 0.99, "kind": "sparkle", "gain_db": -4 } ] }
```

Per-cue fields the tools read:
- `t` (s) and `kind` (required);
- `gain_db`: loudness offset against the kind's default;
- `pan`: −1..1;
- `dur`: see the table;
- `pitch`: semitones, for pop, pop_big, tick, counter_roll and sparkle;
- `align`: `"start"` or `"end"`, counter_roll only.

Unknown kinds are skipped with a warning. Any other field (an `id`, a note) is passed through untouched.

## Effect kinds

The transient or peak of every effect lands on `t`. Risers end on `t`. Lead-ins start before `t`, so leave room
at the head of the film.

| kind | sound | timing around `t` | `dur` |
| --- | --- | --- | --- |
| `pop` | soft bubbly UI pop (in-key pitch) | transient on t | – |
| `pop_big` | heavier pop + low thump, 0.14 s airy pre-swell | slam on t | – |
| `tick` | short soft woody/glassy tick | on t | – |
| `counter_roll` | accelerating run of ticks (7 to 26 per s) + accented last tick | first tick on t, last on t+dur (`"align":"end"`: last tick on t) | roll length (1.0) |
| `whoosh_pullback` | airy rising-then-falling sweep, soft sub swell, left to right drift | peak on t (starts 0.62·dur before) | total length (1.2) |
| `whoosh_dive` | darker, falling sweep + sub drop | peak on t (starts 0.55·dur before) | total length (1.1) |
| `impact` | deep soft boom + soft transient, 0.25 s pre-suck | hit on t | tail (2.2) |
| `reveal` | shimmering riser into a warm Dadd9 bloom | riser ends on t, bloom after | riser length (2.0) |
| `light_hit` | bright airy shimmer, 0.3 s swell-in | hit on t | tail (2.4) |
| `sparkle` | 5 tiny glassy chimes over 0.25 s | first chime on t | – |
| `swish` | short whoosh for slides and cuts | peak on t | total length (0.4) |
| `title` | soft warm D chord swell + bell strike | strike on t (0.6 s swell-in) | ring length (4.0) |

Everything musical is in D major, so the effects sit with the bed. Each event is levelled by K-weighted momentary
loudness, plus a per-kind trim (`SFX_TRIM_LU` in `audio_common.py`) and its `gain_db`. A shared short stereo reverb
glues the effects together.

## Music (`music.py`)

Dmaj9, Gmaj9#11, Em9, A9sus4 at about 3.2 s per chord, cycled to fill `[0, title_t)` so the sus4 always falls just
before the title. The Dadd9 resolution strikes exactly on `title_t`. A crescendo is calibrated so the loudness under
the title is +5 dB over the bed, then the chord rings out to the end. The bed fades in over 1 s.

## Mix (`mix.py`)

- **Balance** (BS.1770 K-weighted). The bed's integrated loudness before the title sits at `--music-lu` re the
  voice. The effects' median per-cue momentary peak (trims and `gain_db` removed) sits at `--sfx-lu` re the voice.
  `sound.mjs` uses `--music-lu -21 --sfx-lu -13`.
- **Duck.** A voice-envelope sidechain (40 ms attack, 300 ms release) lowers the bed by `--duck-music` dB and the
  effects by `--duck-sfx` dB under words. `sound.mjs` uses 3 and 0.
- **Fades.** 5 ms in; out over `--fade-out` s (default: cues.json `fade_s`, else 1.0 s).
- **Master.** Gain plus a 5 ms look-ahead true-peak limiter: −14 LUFS integrated, `--ceiling` −2.9 dBTP. Then
  mix.m4a (AAC 256k, the delivery codec) is measured with ffmpeg `ebur128`. If its true peak is over `--tp-limit`
  (−2.2), the ceiling drops and the master is redone.
- **No voice.** The stems are placed against a virtual voice at the target. The bed then sits at
  `--music-lu-alone` (−10) and the effects at `--sfx-lu-alone` (−6), because the music now carries the film. With
  `--normalize` the mix is mastered to −14 LUFS; `sound.mjs` adds it, with `--ceiling -1.8 --tp-limit -1.2`, whenever
  there is no `vo.wav`.
- **mix.json** records the settings and the final ceiling, so `verify_mix.py` can rebuild every stem exactly as it
  sits in `mix.wav`.
- **Report.** The summary lists every stem as it sits in the final file.

Expect these:
- The voice measures slightly hotter than the mix, because passages without speech (the title) count in the mix.
- While speaking, the bed sits about −24 LU under the voice (−21 bed, −3 duck).

## Verify (`verify_mix.py <video dir>`)

PASS needs all of these:
- `mix.wav` is 48 kHz stereo 24-bit with exactly duration × 48000 samples;
- −14.0 ± 0.1 LUFS integrated (ffmpeg and pyloudnorm) and an AAC 256k true peak under −1.0 dBTP;
- with a voice: the voice in the mix lines up with `vo.wav` at lag 0;
- every effect lands on its cue and makes up at least −10 dB of the effects stem around its own peak. A pop or tick
  must start within 15 ms before its cue (5 ms for a film's own effects) and show a clear rise in the stem; a sweep
  must peak within 60 ms;
- with a voice, word by word in the speech band (300 Hz–4 kHz): SNR median ≥ +8 dB, clarity index ≥ 0.6, at most
  25 % of the word masked. Above 10 % masked, under +12 dB, or a 10th percentile under 0 dB is a warning;
- the first 2 ms under 1e-3; the last 10 ms under −60 dBFS.

A FAIL names the effect or the word. The usual fix is to lower that cue's `gain_db` or move it off the word, then run
`sound.mjs` again. The full report is written to `verify.json` in the scratch folder it prints.

A film with its own effects passes `--events <its sfx script>`. That script defines
`isolated_events(doc, vo, n)`, which returns every effect rendered alone (see the worked example's `sfx_inj.py`).
Its mix script writes `mix.json` with `"route": "stems"`, because its `music.wav` and `sfx.wav` are written exactly
as they sit in the mix.
