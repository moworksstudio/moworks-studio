---
name: explainer-2d
description: Moworks Studio's 2D Explainer film style - the owner's 2D Explainer Animation Toolkit 1.0.0 as shipped: narrated 2D explainers drawn in code on one canvas, flat cel-shaded shapes with rim light and no outlines on deep indigo grounds, glow only on things that emit light, the red-hoodie hero, near-square label pills, callouts and an uppercase title that pops in word by word, every cut, label and sound keyed to a word of the narration. The kit's own HyperFrames page and canvas engine.
version: 1.0.0
derived-from: The owner's 2D Explainer Animation Toolkit 1.0.0 (2D-EXPLAINER-ANIMATION-TOOLKIT.md, SHA-256 in config/pins.json moworksKits), pinned as shipped in .moworks/library/explainer-2d/kit/.
---

# 2D Explainer: the film style

This pack sits on top of `.moworks/rules/general-style/SKILL.md`, whose steps, gates and files stay as they are. Where the two differ this pack wins, and
where this pack and the kit differ on taste **the kit wins**. The house rules (`moworks-studio`) win over all three, and the app's own parts stand: voice-over,
transcript, music, sound effects, levels, render.

## 1. The kit is the style

The owner's kit is in `.moworks/library/explainer-2d/kit/`, exactly as shipped: never edit it. It was written for HyperFrames, so its page runs here as it is.

| Kit file | What it decides |
|---|---|
| `STYLE.md` | **The house look; every number in it is exact.** Palette (`HOUSE.pal`), the hero, the drawing rules, type and labels, motion, composition, 9:16 safe zones, voice and sound character |
| `SCRIPTING.md` | The scripts: continuous narration, the fact sheet |
| `engine/CONTRACT.md` | **The engine's exact API** (`EX`, `EX.fx`, `HOUSE`, `HOUSE.ui`, `HOUSE.hero`) and its hard rules |
| `.claude/skills/explainer-video/SKILL.md`, `references/BUILD.md`, `CHECKLIST.md` | The core loop, the build, every snapshot round |
| `.claude/skills/explainer-shorts/` (9:16, 30-60 s), `explainer-longform/` (16:9, 2-12 min in chapters) | The two formats |
| `.claude/skills/script-writer/`, `art-modules/`, `voice-over/`, `sound-design/`, `render-review/` | Scripts and ideas, art modules (and briefing parallel art agents), the narration, the sound, the fresh-eyes review |
| `examples/where-the-needle-stops/` (16:9, 40 s) | The worked example; its `STORYBOARD.md` is the best single file to learn from. Study it; never copy its story |

The kit's own commands are never run here (`doctor`, `check`, `new-video`, `set-duration`, `sync-engine`, `time-voice`, `words-js`, `sound`, `snapshot`,
`render`, `qc`, `new-module-test`, `py`, `npm`, `uv`): the app does each part (§4). Its `kit-setup` and `style-note` skills are not used: a lasting preference
goes in `docs/NOTES.md` and in your reply ("this can go into the kit itself").

## 2. Where the film lives (`.moworks/library/explainer-2d/app/index.html`)

| File | What |
|---|---|
| `index.html` | A copy of `app/index.html` (the kit's own page): the root `#root` with `data-kit="explainer-2d"`, its size (16:9 1920×1080 or 9:16 1080×1920: `data-width`, `data-height`, `data-resolution`, the viewport, the canvas and the CSS together), **60 fps**, its length in `data-duration`; one `<script>` per art module before `story/story.js` |
| `story/story.js`, `story/film-pal.js`, `story/<film>-<module>.js` | The film: the storyboard as code (`EX.run`), the film's one cool accent, the art modules, as the kit writes them |
| `SCRIPT.md`, `STORYBOARD.md`, `ART.md` | The kit's three plans, in the project's root (from `kit/templates/video/`) |

The engine is the kit's, as shipped: the app places it in `assets/_app/explainer-2d/ex/` with GSAP, and writes `assets/_app/explainer-2d/words.js`
(`window.STORY_WORDS`, `[{ word, start, end }]`) from the voice's transcript each time, so `EX.cue(word, n)` times the film and a new voice re-times it.
Never write those files. The music, the effects and the mix are the app's: no `audio/mix.wav`, no `<audio>` in the page.

## 3. The look in short (STYLE.md has every number)

Flat cel shapes with **no outlines** (a lit fill, one hard-edged shadow hue-shifted toward magenta, a thin rim), deep indigo and violet grounds with soft light
pools and a one-sided horizon glow, never black or grey; glow only on emitters; detail at three scales; ambient life in every shot (a frame that does not
change in 0.5 s is a bug); the red-hoodie hero breathing and blinking; one cool glowing accent per film (`film-pal.js`); near-square pills in the house
colours with white type, callouts, the uppercase title popping in word by word about 0.6 s after the last word. 60 fps, springs, hard cuts 0.05 s before their
word, a new element every 1.5-3 s, a slow camera drift. **No text inside art modules** (every label from `story.js` through `HOUSE.ui`); no film grain, global
vignette or grade filter; no image files, no AI images; every frame a pure function of time.

**Faces:** Figtree has no Vietnamese letters, so the app declares the kit's "Figtree" with Hanken Grotesk, a grotesk of the same build that has them; the
engine keeps the name and `HOUSE.ui.init()` waits for it as shipped.

## 4. Each step

| Step | What this style adds |
|---|---|
| Prepare | The kit's way: restate the brief and wait for the owner's yes, then the script (`script-writer`, SCRIPTING.md): continuous narration, every number with its source in the fact sheet (in `BRIEF.md` and `SCRIPT.md`). Ideas: about 5 topics with a recommendation. The format from New project's size: a 9:16 short (`explainer-shorts`) or a 16:9 explainer (`explainer-longform` past 2 minutes) |
| Voice | The app's Voice screen makes it from the approved script, word for word. The owner's own recording is never paraphrased or re-voiced; "no narrator" is respected (`voice-over`, without a narrator) |
| Storyboard | `STORYBOARD.md` the kit's way (shots, event cues on words, the snapshot plan). The board is the kit's real drawing: `boards/A/index.html` a copy of the film's page whose `story/` (in the board's folder) draws, for second k of the board, the film at the k-th frame's time; the app places the engine beside it |
| Motion Plan | Rows name the engine's moves (`EX.spring`, `EX.squash`, `EX.cameraAt` moves, `HOUSE.ui` pills, callouts and title, `HOUSE.hero` poses, `EX.fx.flash`, `EX.fx.ring`) with their words and numbers. They come first and the film goes past them: moworks-alive rules 8-10 hold here too (each shot calls `library_search` twice, and what it takes is redrawn as flat cel shapes in an art module, on a word). Only STYLE.md's rules, CONTRACT.md's hard rules and the house bans are off limits |
| Build | `story.js` and the art modules on the engine (CONTRACT.md, BUILD.md); a big film's modules may be briefed to parallel agents as `art-modules` says |
| Review | CHECKLIST.md on the snapshots, then `moworks-qc` with `render-review/references/REVIEW.md`. The app's transcript check stands in for the kit's word-for-word diff of the final MP4 |

## 5. Sound

The kit's own effects are in the app's library, made by the kit's code (`pop`, `pop-big`, `tick`, `counter-roll`, `impact`, `reveal`, `light-hit`, `sparkle`,
`swish`, `title`, and the camera sweeps `whoosh-pullback`, `whoosh-dive`): small, warm and soft, on their word (`sound-design`). The kit's music bed (a soft pad,
about 21 LU under the voice, swelling into the title) is the app's to choose: Final Mix, when the owner asks. The app places them and masters to -14 LUFS.

## 6. Text over the canvas

The engine draws its pills, callouts and title on the canvas with their own pops (`back.out(1.7)`, word by word): the kit's drawing, performed text kept as
shipped (moworks-studio §8). A plain caption or end card the brief adds goes in HTML over the canvas, in Figtree's twin.

## 7. The ending

The kit's own: the title pops in word by word after the last word and the last 0.6 s fade to black (STYLE §5). It is the author's ending (moworks-studio §9):
the music resolves on the title and fades within it.
