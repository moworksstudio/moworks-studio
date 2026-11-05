---
name: original-music
description: Compose ORIGINAL music in code (Python: numpy + scipy) for a video in this kit — a score, a theme, a bed, a sting — only when the user asks for music. Felt piano, plucked strings, pads and pulses from tools/sfx/sfxlib.py, composed to the video's time table, written to public/music/<slug>/, then ridden in the mix with volume keys. Use when the user says "add music", "a score", "a soundtrack", "a piano under it", "a theme", "make it emotional with music".
---

# Compose original music (only when asked)

The kit ships **sound effects, not music**. When the user asks for music, write it yourself, in code, for this
video. Never download music, sample a recording, or imitate a known song or artist. Write your own progression and
melody.

## Steps
1. **Ask only what you need, in one line:** mood, and where it should play (whole video, title only, ending).
   Propose a direction that fits the style:
   - **Stickman Explainer:** light, rhythmic plucks or marimba for the cold open; a swell into the title; a lift on
     the payoff; a minor pulse for the twist.
   - **Inner Voice Short:** a sparse felt piano in a minor key, mostly quarter-note arpeggios. It goes faster when
     time speeds up and **stops dead** when the hero fails. Low single notes and a minor-second cluster belong to the
     shadow. It warms up only at the climax.
2. **Copy** `templates/music.template.py` to `tools/music/music_<slug>.py`. Set `SLUG` and `SECONDS` (the video's
   length).
3. **Compose to the time table.** Use the shot table `S` or beat table `T`: chords change on cuts, accents land on
   beats, and the music leaves room for the voice and the key effects.
   - **Instruments** in `sfxlib`: `piano(f, dur, vel)` (a felt piano: soft hammer, two detuned strings, darker as it
     decays), `string_ks(f, dur, rng)` (a plucked string), `fm_bell`, `sub_kick` (a sting), and sines through `lp()`
     for pads.
   - **Reverb:** `space(rng, dry, wet, dur, tau)`.
4. **Build** with `uv run --with numpy --with scipy python tools/music/music_<slug>.py`, which writes
   `public/music/<slug>/score.wav`.
5. **Wire it:** in the composition's `SOUND`, set `music: { src: "public/music/<slug>/score.wav", keys: [[t, dB], …] }`.
   - **Under a voice:** about −8 to −10 dB, opening up in the gaps and on the title.
   - **Captions-only:** about 0 dB, with silence where the story wants it.
6. **Measure:** RMS per 0.5 s (silences where intended) and the render's loudness (`tools/qc.mjs`). For narrated
   videos, also the **voice clarity** (median ≥ 12 dB). Say that nobody has listened, and invite the user to.
