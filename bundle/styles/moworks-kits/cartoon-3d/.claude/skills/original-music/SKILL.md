---
name: original-music
description: Compose ORIGINAL music in code (Python: numpy + scipy) for a 3D cartoon video in this kit — a light bed under the narration, a sting on the title or the payoff, a mood turn for the consequences half — only when the user asks for music. Felt piano, plucked strings, bells, pads and pulses from tools/sfx/sfxlib.py, composed to the video's shots and word times, written to public/music/<slug>/, then ridden in the mix under the voice. Use when the user says "add music", "a score", "a soundtrack", "a bed under it", "a little theme", "make it more upbeat / emotional with music".
---

# Compose original music (only when asked)

**Module check.** If `kit.config.json → modules.music` is `false`, tell the user in one line that the Original Music
module is switched off and offer to switch it on (kit-setup → "Modules").

The kit ships **sound effects, not music**. When the user asks for music, write it yourself, in code, for this video.
Never download music, sample a recording, or imitate a known song or artist: write your own progression and melody.

## Steps
1. **Ask only what you need, in one line:** the mood, and where it plays (the whole video, the cold open, the title,
   the ending). Propose a direction that fits the style:
   - **The friendly half** (the setup, the cool and useful beats): light plucks or a marimba-like bell on a bright
     major progression, quarter notes, leaving room for the voice.
   - **The turn to consequences:** the same motif in a minor key, sparser, lower.
   - **The payoff / kicker:** one warm chord that rings out, or a full stop of silence before the last line.
2. **Copy** `templates/music.template.py` to `tools/music/music_<slug>.py`; set `SLUG` and `SECONDS` (the video's length:
   `FRAMES / 30`).
3. **Compose to the video's timing:** chords change on cuts (`shots.ts`), accents land on the key words (`vo.ts →
   WORDS`), and the music leaves the voice's frequencies clear. Instruments in `sfxlib`: `piano(f, dur, vel)` (a felt
   piano), `string_ks(f, dur, rng)` (a plucked string), `fm_bell`, `sub_kick` (a sting), sines through `lp()` for pads;
   reverb with `space(rng, dry, wet, dur, tau)`.
4. **Build:** `uv run --with numpy --with scipy python tools/music/music_<slug>.py` → `public/music/<slug>/score.wav`.
5. **Wire it** in the video's `Video.tsx → SOUND`: `music: { src: "public/music/<slug>/score.wav", keys: [[t, dB], …] }`.
   Under a voice, ride it at about −8 to −10 dB, opening up in the gaps and on the title; without a voice, about 0 dB.
6. **Measure:** render, then `node tools/qc.mjs <CompId>`: loudness −14 LUFS and the **voice clarity** (median ≥ 12 dB).
   If clarity drops, lower the music under speech with more keys. Say that nobody has listened, and invite the user to.
