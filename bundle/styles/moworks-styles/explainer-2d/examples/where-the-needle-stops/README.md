# Where the Needle Stops (worked example)

A finished 40-second, 16:9, 60 fps explainer on how injections work, made with this kit: 12 shots, three art modules
written in parallel, every cut, label and sound keyed to a word of the 103-word narration, and a score and effects
written for this film. It renders on any machine where `node tools/doctor.mjs` says ready.

## Render it

Run these from the kit folder:

```bash
node tools/sync-engine.mjs examples/where-the-needle-stops        # engine, fonts and GSAP into ex/
node tools/sound.mjs examples/where-the-needle-stops --bespoke    # this film's own score → audio/mix.wav
node tools/snapshot.mjs examples/where-the-needle-stops --at 1.6,6,8.6,13,16,18.5,23.5,27.2,29.6,32,34.6,37.5
node tools/render.mjs examples/where-the-needle-stops             # → renders/where-the-needle-stops.mp4
```

`snapshot.mjs` and `render.mjs` start headless Chrome: in Claude Code they run with the sandbox disabled.
`sound.mjs examples/where-the-needle-stops` without `--bespoke` uses the kit's generic effects and music instead
(from `story/sound.json`), so you can hear the two routes side by side.

**The narrator's voice is not included.** Out of the box the film renders with its music and effects only, mastered
to −14 LUFS. The picture is still timed to a real read of the script: `story/words.json` holds the word times of the
take it was built on.

## Put your own voice on it

The whole film re-times to your voice, because every cut, label and sound is keyed to a word, not to a second.

1. Read `story/script.txt` (103 words) in one continuous, dry take, word for word, in a quiet room with no music.
   Save it in `examples/where-the-needle-stops/audio/takes/`, for example as `take.wav` (WAV, M4A and MP3 all work;
   with several takes there, name one with `--take <file>`).
2. `node tools/time-voice.mjs examples/where-the-needle-stops`
   It cleans the take, checks it word for word against the script (and stops with the list if a word was dropped,
   added or changed), tidies the pauses inside measured silences only, and writes `audio/vo.wav`,
   `story/words.json` and `story/words.js`. It prints the film length your read needs.
3. `node tools/set-duration.mjs examples/where-the-needle-stops <that length>` (only if it differs from 40).
4. `node tools/sound.mjs examples/where-the-needle-stops --bespoke` (or without `--bespoke` for the generic sound).
5. Snapshot, then render, as above. `render.mjs` ends with `qc.mjs`, which transcribes the MP4 and compares it word
   for word with the script.

## What to learn from it

| File | What it shows |
| --- | --- |
| `STORYBOARD.md` | **The best single file in the kit.** The shot table (cut cue, time, shot, module) and the event-cue table that the picture and the sound share. |
| `SCRIPT.md` | The narration, the beats (line → picture → sound) and the fact sheet. |
| `ART.md` | The brief each art agent got: the look, the motion rules, the module contract, the test recipe. |
| `story/story.js` | The lead's file: the cue table `C` from `EX.cue`, the cuts, 12 shot functions, camera drift, labels, the title, the fade. The film length comes from `index.html`; the title starts 0.6 s after the last word. |
| `story/inj-pal.js` | How a film adds its own colours to `HOUSE.pal` (one cool accent: the aqua medicine). |
| `story/inj-clinic.js`, `inj-body.js`, `inj-tissue.js` | Three art modules (about 120 KB of canvas code each), one per agent, each with its API at the top. |
| `story/sound.json` | The generic route: the event cues as a word-keyed cue sheet for the kit's effect kinds. |
| `sound/` | The bespoke route: `cues_inj.py` (the event table as word-keyed cues), `sfx_inj.py` (effects and room tone), `music_inj.py` (a chord per shot, a heartbeat lift, a title resolve), `mix_inj.py` (−14 LUFS, true peak under −1 dBTP after AAC), `injsynth.py` (shared DSP) and `build.mjs`, which runs them and then `tools/audio/verify_mix.py`. |

## Files

```
index.html          the page: 1920×1080, 60 fps, 40 s on the root; script order engine → words → palettes → modules → story
story/              script.txt · words.json + words.js (word times) · sound.json · story.js · inj-pal.js · inj-*.js
sound/              the bespoke score (build.mjs runs it)
SCRIPT.md · STORYBOARD.md · ART.md
ex/                 made by sync-engine (never edit)       audio/ · snaps/ · renders/ · tests/   made by the tools
```
