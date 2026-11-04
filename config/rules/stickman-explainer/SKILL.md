---
name: stickman-explainer
description: Moworks Studio's Stickman Explainer film style - the owner's Story Animation Kit 1.0.0, its narrated "What if…" style as shipped: flat vector figures with round heads and thick limbs, a hoodie hero with warm or cool rim light, a 2:1 letterbox, a cut on every spoken sentence, data scenes (rulers, bell curves, maps, counters), a gold two-line title card, crisp code-made UI sounds. The kit's Canvas 2D drawing kit on HyperFrames through the app's stand-in for Remotion.
version: 1.0.0
derived-from: The owner's Story Animation Kit 1.0.0 (STORY-ANIMATION-KIT.md, SHA-256 in config/pins.json moworksKits), its Stickman Explainer style, pinned as shipped in .moworks/library/stickman-explainer/kit/.
---

# Stickman Explainer: the film style

This pack sits on top of `.moworks/rules/general-style/SKILL.md`, whose steps, gates and files stay as they are. Where the two differ this pack wins, and
where this pack and the kit differ on taste **the kit wins**. The house rules (`moworks-studio`) win over all three, and the app's own parts stand: voice-over,
transcript, music, sound effects, levels, render.

## 1. The kit is the style

The owner's kit is in `.moworks/library/stickman-explainer/kit/`, exactly as shipped: never edit it. This style is its **Stickman Explainer** (its other
style, Inner Voice Short, is a film style of its own):

| Kit file | What it decides |
|---|---|
| `.claude/skills/stickman-explainer/references/STYLE.md` | **The look; every number in it is exact.** Frame, palette, type, characters, camera and editing, data scenes, the don'ts |
| `.claude/skills/stickman-explainer/references/SCRIPT.md` | The "what if" formula: structure, pace, line rules, facts |
| `.claude/skills/stickman-explainer/references/VOICE.md`, `SOUND.md` | The narration, the sound library and its cue rules |
| `.claude/skills/stickman-explainer/SKILL.md` | The loop, the kit cheat sheet (`src/stickman/kit.js`) and what the author learned |
| `src/examples/fly.js` | The worked example, "What If You Could Fly?": every device. Study it; never copy its story |

The kit's own commands are never run here (`doctor`, `new-video`, `stills`, `render`, `qc`, `place-voice`, `transcribe`, `check`, the sound builders, `npm`,
`uv`): the app does each part (§4). Its `kit-setup`, `style-note` and `original-music` skills are not used: a lasting preference goes in `docs/NOTES.md`
and in your reply ("this can go into the kit itself"); music is the app's.

## 2. Where the film lives (`.moworks/library/stickman-explainer/app/README.md`)

| File | What |
|---|---|
| `index.html` | A copy of `app/index.html`: the root `#main` with `data-kit="stickman-explainer"`, 1920×1080 at **24 fps**, its length |
| `src/videos/film/Video.tsx` | The composition, from the kit's `templates/stickman/Video.template.tsx` filled in as `new-video.mjs` would (`__NAME__`, `__SLUG__` → `film`): it exports the component, `FPS`, `FRAMES`, `WIDTH`, `HEIGHT` and `SOUND` |
| `src/videos/film/film.js` | The shots and the shot table `S`, from `templates/stickman/video.template.js`, drawn with `../../stickman/kit.js` (the kit's code as shipped). `draw(x, t, frame)` picks the shot |

`compositions/film/film.js` is the app's (finalize bundles the composition with the kit's code and React); never write it. The shot table comes from
the voice's words: `import WORDS from "mw:words"` gives `[{ word, start, end }]` (seconds), what the kit's `words.json` held; one spoken line is one shot,
starting on its line's first word.

## 3. The look in short (STYLE.md has every number)

1920×1080 at 24 fps with black bars of 62 px (a 2:1 picture), `finish(x, frame, 0.55, 0.035)` on every shot, the background layer blurred 7-10 px. Flat
figures in `#0a080c` with round heads, no hand or foot shapes, a hoodie hero (a new outfit per video), plum faceless crowds with one-sided rim light, robot
hands for close-ups. One light idea per location. Open Sans ExtraBold for everything on screen; the gold title card ("WHAT IF YOU COULD" / the payoff
word ~230 px, gold gradient, brown outline, orange bloom). A **cut on every spoken sentence**, slow pushes, one big move per act (snap zoom-out, pull-back,
whip-up with streaks); hard cuts, dips to black only for the title card. **Don't:** outlines on figures, gradients on bodies, busy textures, stock photos, a
number on screen that differs from the voice, an unsourced statistic, a whoosh nobody asked for.

**Faces:** Open Sans draws Vietnamese as it is.

## 4. Each step

| Step | What this style adds |
|---|---|
| Prepare | The script with SCRIPT.md's formula: second person, present tense, fragments; one continuous paragraph per act, dialogue as `[NAME: "…"]`, the title as `[TITLE]`; every number researched with its source (the facts table in `BRIEF.md`: claim · as spoken · source · checked); a line → picture table. 35-60 s short form by default |
| Voice | The app's Voice screen makes it from the approved script, with a silent gap for the title card. The owner's own voice-over is never rewritten or re-voiced |
| Storyboard | The board is the kit's real drawing: `boards/A/index.html` from `app/board.html`, the seconds of its frames in `data-kit-board`, drawing the film's shots. The shot table `S` in `STORYBOARD.md` too. Check every shot at its start and middle; crop faces and labels; every number exactly as spoken |
| Motion Plan | Rows name the kit's devices (`figure` poses and faces, `walk`, `armIK`, `layer` cameras and blur, `track` keys, `pill`, `speedLines`, the title card, `peopleBell`, `ruler`, the altitude climb) with their words and numbers. They come first and the film goes past them: moworks-alive rules 8-10 hold here too (each shot calls `library_search` twice, and what it takes is redrawn in this flat style, on a word). Only STYLE.md's don'ts and the house bans are off limits. A held shot of 0.6 s or more gets a little life (sway, drift, streaks) |
| Build | `film.js` with `kit.js`; new props and sets as flat shapes with one light idea each, in the film's own file, never in the kit |
| Review | The author's "what we learned" (SKILL.md) and the stills, then `moworks-qc` |

## 5. Sound

The kit's own sounds are in the app's library, made by the kit's code (`tag-d`, `tag-fs`, `tag-a` marimba tags for a label pill landing, `ui`, `boom` for the
title with `swell` before it, `shimmer`, `reveal`, foley, beds: SOUND.md's table and gains). One or two sounds per shot, a power moment alone; hits in the
narration's pauses, a hit on a word 3-6 dB lower. **Never a whoosh or a cartoon pop** unless the owner asks (the whip-ups use streaks and wind). The app places
them (Final Mix) and masters to -14 LUFS; the voice stays clear over the effects (the app's voice check).

## 6. Text over the canvas

The kit draws everything on one canvas. Its title card (letters rising one by one, gold, outlined, blooming) and its label pills are its drawing: performed
text, kept on the canvas as shipped (moworks-studio §8). A plain caption or end card the brief adds goes in HTML over the canvas.

## 7. The ending

The kit ends on its hook (a typed message, the twist line), not on a fade of its own: the house ending follows it (moworks-studio §9).
