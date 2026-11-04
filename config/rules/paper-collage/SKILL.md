---
name: paper-collage
description: Moworks Studio's Paper Collage film style - the owner's Paper Collage Motion Kit 1.0.0 as shipped: an editorial paper-collage explainer on off-white grid paper, black-and-white halftone cut-outs with a white paper edge, one red accent and a yellow highlighter, condensed caps, a serif italic and typewriter type, red marker marks, torn-paper transitions, springy hand-made motion, every move on a beat of the voice. On HyperFrames through the app's stand-in for Remotion.
version: 1.0.0
derived-from: The owner's Paper Collage Motion Kit 1.0.0 (PAPER-COLLAGE-MOTION-KIT.md, SHA-256 in config/pins.json moworksKits), pinned as shipped in .moworks/library/paper-collage/kit/.
---

# Paper Collage: the film style

This pack sits on top of `.moworks/rules/general-style/SKILL.md`, whose steps, gates and files stay as they are. Where the two differ this pack wins, and
where this pack and the kit differ on taste **the kit wins**. The house rules (`moworks-studio`) win over all three, and the app's own parts stand: voice-over,
transcript, music, sound effects, levels, render.

## 1. The kit is the style

The owner's kit is in `.moworks/library/paper-collage/kit/`, exactly as shipped: never edit it. Its taste and method are this style:

| Kit file | What it decides |
|---|---|
| `.claude/skills/motion-graphic/references/STYLE.md` | **The taste. It wins over everything below it.** The look, colour roles, type sizes, layout bands, motion, power moments, marks, honesty, the never list |
| `.claude/skills/motion-graphic/references/RECIPES.md` | The building blocks (`src/kit/scenes.tsx`, `src/kit/collage.tsx`) and when to use each |
| `.claude/skills/motion-graphic/references/CHECKLIST.md` | Every still round, before anything is shown |
| `.claude/skills/motion-graphic/references/VOICE.md`, `IMAGES.md`, `SOUND.md`, `OUTPUT.md` | The voice, the cut-outs, the sound cues, the formats |
| `src/demo/Demo.tsx` | The live reference: read it once per session |

The kit's own commands are never run here (`doctor`, `new-graphic`, `stills`, `render`, `check`, `transcribe`, `tighten-voice`, `textures.py`,
`build_kit.py`, `npm`, `uv`): the app does each part (§4); the kit's `cutout.py` and `halftone.py` run in the app through `paper_cutout` (§5). Its `kit-setup` and `style-note` skills are not used: a lasting
preference of the owner goes in `docs/NOTES.md` and in your reply ("this can go into the kit itself"); the owner updates the kit.

## 2. Where the film lives (`.moworks/library/paper-collage/app/README.md`)

| File | What |
|---|---|
| `index.html` | A copy of `.moworks/library/paper-collage/app/index.html`: the root `#main` with `data-kit="paper-collage"`, its size (16:9 1920×1080, 9:16 1080×1920 or 1:1 1080×1080), 60 fps and its length |
| `src/videos/film/Video.tsx` | The composition, written from the kit's `templates/Graphic.template.tsx` as `new-graphic.mjs` would fill it in (`FPS`, `WIDTH`, `HEIGHT`, `SECONDS`, `FRAMES`, the beat object `B`, the `SFX` cues, the component). Its imports reach the kit's code as shipped (`../../kit/scenes`, `../../kit/collage`) |
| `src/videos/film/*.json` | A chart's real, sourced data, beside the composition (STYLE §7) |
| `assets/…` | The user's images and the cut-outs: `staticFile("graphics/…")` or `staticFile("library/…")` is `assets/graphics/…`, `assets/library/…` |

`compositions/film/film.js` is the app's (finalize bundles the composition with the kit's code and React); never write it. `staticFile("textures/…")` is
the kit's own paper and grain, made by its own code and placed by the app. The beats `B` come from the voice's words: `import WORDS from "mw:words"`
gives `[{ word, start, end }]` (seconds), the transcript the kit's `transcript.md` would hold.

## 3. The look in short (STYLE.md has every number)

Off-white grid paper with print grain; black-and-white halftone cut-outs with a thin white paper edge that jitter a hair at 12 fps; one red `#D3271F` for the point,
a yellow `#F3D21C` highlighter behind one word, money green `#2F7A4D` for money only; Anton caps, Playfair Display italic, Special Elite typewriter; red marker
circles, strikes and dotted paths; torn-sheet transitions that alternate (never the same twice running); springs with a little overshoot; at most two power
moments. **Never:** an empty frame 0, a still stretch over about 1.5 s inside a scene, tilted ransom letters, a highlight that does not fit its word, an arrow
without a reason, grey money, a label outside its paper, a whoosh nobody asked for, an invented figure, quote, logo or a generated real face.

**Faces:** Special Elite has no Vietnamese letters, so the app draws it with Special Elite VN (the same face with the marks added); the kit's code keeps the
name. Anton and Playfair Display draw Vietnamese as they are.

## 4. Each step

| Step | What this style adds |
|---|---|
| Prepare | The kit's brief (SKILL.md, the loop step 1): what it says and how long, the format, the voice (the owner's file, a script for the app's Voice screen, or none), the images. A script you write is **one continuous paragraph** (VOICE.md §3): the hook about the viewer, one idea per sentence, a kicker people repeat, real facts with their sources in `BRIEF.md` |
| Voice | The app's Voice screen makes it from the approved paragraph. The owner's own voice-over is never rewritten or re-voiced |
| Storyboard | The board is the kit's real drawing: `boards/A/index.html` from `app/board.html`, its seconds in `data-kit-board` (one beat per second of the board), drawing the project's `src/videos/film/Video.tsx` or the board's own `boards/A/src/videos/film/Video.tsx`. Write the **beat map** first (STYLE §2: every scene with its seconds, every hit on its word) in `STORYBOARD.md` and in the composition's header. Walk CHECKLIST.md on the stills |
| Motion Plan | Rows name the kit's blocks and moves (`RiseWord`, `SerifWords`, `TypeOn`, `DropObject`, `PanelStack`, `PowerWordScene`, `FocusRow`, `LineChart`, `Stamp`, `Strike`, `SceneStack` sheets…) with their beats and numbers (STYLE §5, §7). They come first and the film goes past them: moworks-alive rules 8-10 hold here too (each shot calls `library_search` twice, and what it takes is redrawn in this look, on a beat). Only STYLE.md's never list and the house bans are off limits |
| Build | On the kit (RECIPES.md); a block nothing fits is a local component in the film's own folder (RECIPES "Making a new block"), never a change to the kit |
| Review | CHECKLIST.md on every still round, then `moworks-qc`. Cut-outs clean, labels inside their paper, one red group and one highlight per line |

## 5. Images (IMAGES.md)

In the kit's order: code first (`PersonIcon`, `Bulb`, `Gear`, `Stamp`, `LineChart`…), then cut-outs already made, then the owner's images (`PhotoPrint` for a photo,
`mono={false}` for a screenshot shown untouched, a logo only as the owner's official file), then generation when an image tool is connected: the kit's
prompt as written, cost shown and asked first. **A cut-out is made by the kit's own tools in the app: call `paper_cutout`** with the picture's path. It takes a flat green or white
background out (a transparent PNG keeps its own) and makes the halftone print with its white paper edge (`mode: "clean"` keeps the colours), into a
**new** file in `assets/graphics/cutouts/` (`staticFile("graphics/cutouts/…")`) with a row in its `INDEX.md`; the owner's picture is never changed. Never on
a real person's face, a logo or a screenshot. A picture with a busy background cannot be keyed: a photo goes in `PhotoPrint` as it is; an object needs a
transparent PNG from the owner (or one generated on flat green, IMAGES.md §2).

## 6. Sound

**Code-made sounds only** (owner 04/11/2026): every sound of this style is made by code: the kit's own sounds first, then new takes and new
sounds from its recipes and the app's, made with the owner's sfxlib. While the computer can run the code the app never takes a library or a downloaded
sound for it, because the kit's own sound rules forbid them; a sound no recipe makes is left out, so write one the kit's way (moworks-studio §7b).

The kit's own sounds are in the app's library, made by the kit's code: the cues of `SFX` use the kit's names (`tear` on each sheet, `paper-land`,
`stamp` with `impact` under it on the power word, `strike`, `circle`, `count`, `pop`, `click`, `ding`…: SOUND.md's table and gains). Cues on key moments only,
**never a whoosh, a swoosh or a riser** unless the owner asks; plain text, rising words and typed labels stay silent. The app places them (Final Mix) and
masters to -14 LUFS; the kit's `mix.py` is not run.

## 7. Text over the picture

Paper Collage draws its words as HTML (React), not on a canvas: they reach After Effects as text. Its marks (circles, strikes, highlights) are the drawing's own.

## 8. The ending

The kit ends on a finished still (the last ~0.5 s, STYLE §2), not on a fade of its own: the house ending follows it (moworks-studio §9), the picture and
the music fading together after the length the owner set.
