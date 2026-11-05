---
name: cartoon-3d
description: Moworks Studio's 3D Cartoon film style - the owner's 3D Cartoon Animation Toolkit 1.0.0 as shipped: narrated 3D cartoon videos in one look, an original flat-drawn cast (Mika, Ravi, June, Otto) with painted faces and ink-stick limbs, toon-lit sets of simple shapes, thick ink outlines, glowing props with bloom, a cinematic depth of field, a warm/cool grade, word-by-word captions, calm physical camera moves. Story Shorts (9:16) and What-If Stories (16:9). three.js inside the kit's runtime on HyperFrames through the app's stand-in for Remotion.
version: 1.0.0
derived-from: The owner's 3D Cartoon Animation Toolkit 1.0.0 (3D-CARTOON-ANIMATION-TOOLKIT.md, SHA-256 in config/pins.json moworksKits), pinned as shipped in .moworks/library/cartoon-3d/kit/.
---

# 3D Cartoon: the film style

This pack sits on top of `.moworks/rules/general-style/SKILL.md`, whose steps, gates and files stay as they are. Where the two differ this pack wins, and
where this pack and the kit differ on taste **the kit wins**. The house rules (`moworks-studio`) win only on what is global there (two layers: truth, logos, Vietnamese text, the floor of moworks-alive, a long film's shape, the mix levels); the pace, the camera, the moves and the mood are the kit's, and the app's own parts stand: voice-over,
transcript, music, sound effects, levels, render.

## 1. The kit is the style

The owner's kit is in `.moworks/library/cartoon-3d/kit/`, exactly as shipped: never edit it.

| Kit file | What it decides |
|---|---|
| `.claude/skills/cartoon-video/references/STYLE.md` | **The look; every number in it is exact.** Frame, palette, the cast drawn flat, sets and light, the six looks, type, camera, the never list |
| `.claude/skills/cartoon-video/references/STAGING.md` | Camera, framing, faces, spacing, held props, sprites, 9:16 vs 16:9, the gotchas |
| `.claude/skills/cartoon-video/references/KIT.md` | The code: engine, cast, IK, looks, textures, sets, captions, collision QA, with recipes |
| `.claude/skills/cartoon-video/SKILL.md`, `references/PIPELINE.md`, `CHECKLIST.md` | The core loop, what "done" is, every still round |
| `.claude/skills/cartoon-shorts/` | **Story Shorts (9:16)**: the 5 formats F1-F5 (FORMATS.md), the one-sentence formula and the 11 rules (SCRIPT.md) |
| `.claude/skills/cartoon-whatif/` | **What-If Stories (16:9)**: the 30-50 s piece and the 8-12 min chaptered episode (FORMATS.md, EPISODES.md, SCRIPT.md) |
| `.claude/skills/idea-lab/`, `character-builder/` | Ideas, titles and facts; a new original character, costume, prop or set |
| `src/examples/what-if-no-pain/` (16:9, 13 shots), `src/examples/cheese-bank-vault/` (9:16, 29 shots) | The worked examples: every technique in working code. Study them; never copy their stories |

A 9:16 film follows `cartoon-shorts`, a 16:9 one `cartoon-whatif`, both on `cartoon-video`'s core loop (precedence: the format skill, then
`cartoon-video`). The kit's own commands are never run here (`doctor`, `new-video`, `vo-words`, `tighten-voice`, `place-voice`, `stills`, `render`,
`qc`, `review-frames`, `patch-render`, `check`, the sound builders, `npm`, `uv`): the app does each part (§4); the kit's `qa` is the app's `collision_check`. Its `kit-setup`, `style-note`,
`original-music` and `render-review` skills are not used as commands: a lasting preference goes in `docs/NOTES.md` and in your reply ("this can go into the
kit itself"); music is the app's; the fresh-eyes review is the app's Review (`moworks-qc`), with `render-review`'s REVIEW.md as its checklist.

## 2. Where the film lives (`.moworks/library/cartoon-3d/app/README.md`)

| File | What |
|---|---|
| `index.html` | A copy of `app/index.html`: the root `#main` with `data-kit="cartoon-3d"`, 1080×1920 (a short) or 1920×1080 (a What-If), **30 fps**, its length |
| `src/videos/film/Video.tsx`, `world.ts`, `shots.ts`, `vo.ts` | The video's four files from the kit's `templates/video/` filled in as `new-video.mjs` would (`__COMP__` → `Film`, `__W__`, `__H__`); their imports reach the kit's code as shipped (`../../kit/ToonVideo`, `../../kit/sets/office`…). `Video.tsx` exports `Film`, `FPS`, `FRAMES`, `WIDTH`, `HEIGHT`, `SOUND` |

`compositions/film/film.js` is the app's (finalize bundles the video with the kit's code, React and three.js 0.187.0, the latest (owner #1071; the kit asks for 0.186.0)); never write
it. `vo.ts`'s `WORDS` and `CAPTIONS` come from the voice's words: `import WORDS from "mw:words"` gives `[{ word, start, end }]` (seconds), the times the kit's
`vo-words.mjs` would measure; write `vo.ts` from them in the kit's own shape. `FRAMES` = the last word's end + at least 0.5 s of finished still.

## 3. The look in short (STYLE.md has every number)

A bright, friendly 3D cartoon that reads like a drawing: the cast flat (unlit fills, painted faces, ink-stick limbs, a soft blob shadow, no ambient
occlusion on them), toon sets of boxes, cylinders and spheres in five soft bands with a fresnel rim, painted canvas textures, a thick ink outline,
emissive props that bloom, a depth of field that melts the background in close-ups, a warm/cool grade. **One look per shot** (`propGlow`, `characterClose`,
`wideBright`, `roomHigh`, `objectClose`, `screenClose`; the cool variant for the consequences half). Text lives in the world (whiteboards, signs, screens);
one word-by-word caption carries the voice. Calm physical camera moves (dolly, truck, slight crane, slow push), hard cuts about 0.07 s before each phrase.
**Never:** a real person's likeness, a brand logo or another creator's character; lit or shaded characters; a hand inside the prop it holds; a white sign that
blows out; a floating title card; a whip pan, crash zoom or shake; two looks in one shot; a whoosh, swoosh, swish, whip, riser or vine-boom.

**Faces:** Outfit (captions, UI) and Caveat Brush (whiteboard marker) have no Vietnamese letters, so the app draws them with Lexend and Sedgwick Ave Display;
the kit's code keeps the names. Patrick Hand (sticky notes) draws Vietnamese as it is.

## 4. Each step

| Step | What this style adds |
|---|---|
| Prepare | The format first (a 9:16 short or a 16:9 What-If, from New project's size), then the format skill's script: **one continuous paragraph**, every real claim with a `verify` note and its source in `BRIEF.md` (claim · as spoken · source · checked), the format's beat table. No premise yet: `idea-lab`'s way |
| Voice | The app's Voice screen makes it from the approved paragraph; the length follows the voice (too long: cut words, never speed it up). The owner's own recording is never rewritten or re-voiced |
| Storyboard | The board is the kit's real drawing: `boards/A/index.html` from `app/board.html`, one frame per shot at its key second in `data-kit-board`, drawing the film's world and shots. The shot table (one shot per spoken beat, one look per shot, each starting on its phrase) in `STORYBOARD.md` and `shots.ts` |
| Motion Plan | Rows name the kit's moves (camera `a → b` eases, `cam(T, t)` tracking, `poseReach` and `legIK`, `walkPose` along routes, `setExpr` faces, looks, emissive glows) with their words and numbers. They come first and the film goes past them: moworks-alive rules 8-10 hold here too (each shot calls `library_search` twice, and what it takes is rebuilt as toon shapes in this look, on a word). Only STYLE.md's never list and the house bans are off limits |
| Build | `world.ts`, `shots.ts`, `vo.ts` on the kit (KIT.md, STAGING.md); anything one video needs is built in its own `world.ts`, never in the kit. Held props gripped from the outside at `userData.grip`; furniture as `box()` / `cyl()` (named, so the check names it); walks along routes in the walk lanes. Keep `FilmCheck`, the template's collision twin, exported from `Video.tsx`, and call **`collision_check`** after every change to the blocking (positions, walks, poses, props): fix what it names until it says `COLLISION none` |
| Review | CHECKLIST.md on every still round, then `moworks-qc` with `render-review/references/REVIEW.md`. The kit's collision QA runs in the app (`collision_check`, also in every Review round and in Tech checks): it must say `COLLISION none`. It sees bodies against furniture and each other, not a held prop: check on the stills that no prop goes through a table, a hand or a body, at each shot's start, middle and end |

**The kit's pace (local; a long film keeps it, moworks-studio §6c):** a hard cut on each phrase (its examples: shots of about 2-4 s), nothing static over 3 s in a short and 4 s in a video (STYLE.md); a slow, eased, physical camera, no whip pan or crash zoom; the voice planned at 2.9-3.1 words a second, cut words rather than read faster.

## 5. Sound

**Where the sounds come from** (owner 05/11/2026, #1034, in place of "code-made sounds only" of 04/11: Test 38's code-made sounds were dull
and did not match the picture): as for every film, the app's offline library first, then the online search, then a sound made by code (the kit's own
sounds, new takes from its recipes and the app's) only for a cue neither has. Name each sound by the thing on screen and its action, so the library
finds the one that matches (moworks-studio §7b).

The kit's own sounds are in the app's library, made by the kit's code: `impact`, `blip-up` / `blip-down`, `glitch`, `win`, `chip`, `tick`, `count`, `lock`,
`slice`, `vs`, `click`, `resolve` (SOUND.md's table and gains). Key moments only, about one cue per 3-4 s at most (3-5 in a short, one per 6-10 s in a long
chapter), on the visual hit, in the voice's pauses; captions, in-world text, titles, cuts and camera moves stay silent. **Never a whoosh, swoosh, swish, whip,
riser or vine-boom.** The app places them (Final Mix) and masters to -14 LUFS.

## 6. Text over the canvas

The captions are HTML over the canvas already (the kit's `ToonCaptions`: Outfit 800, white, ink stroke, one word at a time), so After Effects gets them as
text. Text in the world (whiteboards, signs, screens, sticky notes) is the drawing's own: kept on its canvas textures as shipped (moworks-studio §8).

## 7. The ending

The kit ends on the kicker, its last 0.5 s or more a finished still, with no outro: the house ending follows it (moworks-studio §9).
