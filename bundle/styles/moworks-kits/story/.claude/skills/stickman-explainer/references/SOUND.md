# Sound for a Stickman Explainer

Cinematic and soft, under a voice: glassy UI blips and marimba tags for labels, a deep sub boom for the title, small
physical foley, and city and sky beds. **Every sound is made in code** by `tools/sfx/build_stickman.py`, which writes
`public/sfx/stickman/` (its `INDEX.md` lists every sound with its length and level). No downloaded sounds.
**No music ships with the kit**: when the user asks for music, compose it with the `original-music` skill.

## The library (`public/sfx/stickman/`)
| Group | Sounds |
|---|---|
| labels and UI | `tag-d` `tag-fs` `tag-a` (marimba notes: **the** sound for a label pill landing) · `ui` (a small round blip) · `screen-on` · `led` · `ding` · `signal` (a three-note success chime) · `chime` (a cabin chime) · `ping` (radar) · `alert` (beeps) · `timer` (racing ticks) |
| reveals | `boom` (the title hit) · `swell` (soft rise into a reveal) · `shimmer` (a line or curve draws) · `reveal` (the big number) |
| foley | `papers` · `swish` (cloth) · `steps` · `thud` (a landing) · `bite` · `frost` · `breath` · `chatter` (teeth) · `thermo` (a thermometer drops) · `chip-seat` · `wire` · `crack` · `door` · `honk` · `pigeon` |
| beds and passes | `traffic` · `office` (room tone, a clock, keys) · `dawn` (a breeze, birds) · `wind` (flying) · `takeoff` · `prop` (a prop plane) · `jet` (an airliner) · `cloud` · `crowd` · `cheer` · `flock` |
| **opt-in whooshes** | `snap-out` · `flythrough` · `pass` · `up`: only when the user asks for whooshes |
| avoid on labels | `pop` (a cartoon pop): never for labels or icons; use a marimba tag instead |

## Cue rules
- **A cue is `{ n, t, g }`:** the sound, its start in seconds, and a gain in dB relative to its designed level. Put it
  **on the visual beat** (the frame where the thing happens), not near it.
- **Typical gains:**

  | Sounds | Gain (dB) |
  |---|---|
  | beds | −6 to −12 |
  | foley | −4 to −8 |
  | tags | −8 |
  | the title `boom` | −3, with `swell` at −12 leading into it |

- **Keep words clear:**
  - Place hits in the narration's pauses (words.json → `pauses`).
  - A hit that must land on a word goes 3–6 dB lower.
  - Effects near speech get shorter tails.
- **Sparse beats busy:** one or two sounds per shot. A power moment (title, launch, reveal) gets the room to itself.
- **New sounds:** design them in code and add them to `build_stickman.py`. Build them from the ingredients in
  `tools/sfx/sfxlib.py` (noise transients, damped modes, sub kicks, FM bells, moving band-pass, room reverb), level
  them with a loudness target, and re-run the script.

## The mix
`tools/render.mjs` → `tools/sfx/mix.py` lays the voice, the cues and any music, then masters the result:
- **Gain:** one static gain to **−14 LUFS integrated**.
- **Peaks:** a 4×-oversampled limiter keeps the **true peak at −1.5 dBTP or lower**.

`tools/qc.mjs` reports the loudness, the per-channel peaks and the **voice clarity** (median ≥ 12 dB). Every sound
is checked by measurement; say that nobody has listened.
