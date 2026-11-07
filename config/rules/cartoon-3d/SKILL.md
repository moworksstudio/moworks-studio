---
name: cartoon-3d
description: Moworks Studio's 3D Cartoon film style - the owner's source skill 3D Cartoon Animation 1.0.0 as shipped: narrated 3D cartoon videos in one look, an original flat-drawn cast (Mika, Ravi, June, Otto) with painted faces and ink-stick limbs, toon-lit sets of simple shapes, thick ink outlines, glowing props with bloom, a cinematic depth of field, a warm/cool grade, word-by-word captions, calm physical camera moves. Story Shorts (9:16) and What-If Stories (16:9). three.js inside the source skill's runtime on HyperFrames through the app's stand-in for Remotion.
version: 1.0.0
derived-from: The owner's source skill 3D Cartoon Animation 1.0.0 (3D-CARTOON-ANIMATION-TOOLKIT.md, SHA-256 in config/pins.json moworksStyles), pinned as shipped in .moworks/library/cartoon-3d/skill/.
---

# 3D Cartoon: the film style

This pack sits on top of `.moworks/rules/general-style/SKILL.md`, whose steps, gates and files stay as they are. Where the two differ this pack wins, and
where this pack and the source skill differ on taste **the source skill wins**. The house rules (`moworks-studio`) win only on what is global there (two layers: truth, logos, Vietnamese text, the floor of moworks-alive, a long film's shape, the mix levels); the pace, the camera, the moves and the mood are the source skill's, and the app's own parts stand: voice-over,
transcript, music, sound effects, levels, render.

## 1. The source skill is the style

The owner's source skill is in `.moworks/library/cartoon-3d/skill/`, exactly as shipped: never edit it.

| Source skill file | What it decides |
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
`cartoon-video`). The source skill's own commands are never run here (`doctor`, `new-video`, `vo-words`, `tighten-voice`, `place-voice`, `stills`, `render`,
`qc`, `review-frames`, `patch-render`, `check`, the sound builders, `npm`, `uv`): the app does each part (§4); the source skill's `qa` is the app's `collision_check`. Its `kit-setup`, `style-note`,
`original-music` and `render-review` skills are not used as commands: a lasting preference goes in `docs/NOTES.md` and in your reply ("this can go into the
source skill itself"); music is the app's; the fresh-eyes review is the app's Review (`moworks-qc`), with `render-review`'s REVIEW.md as its checklist.

## 2. Where the film lives (`.moworks/library/cartoon-3d/app/README.md`)

| File | What |
|---|---|
| `index.html` | A copy of `app/index.html`: the root `#main` with `data-skill="cartoon-3d"`, 1080×1920 (a short) or 1920×1080 (a What-If), **30 fps**, its length |
| `src/videos/film/Video.tsx`, `world.ts`, `shots.ts`, `vo.ts` | The video's four files from the source skill's `templates/video/` filled in as `new-video.mjs` would (`__COMP__` → `Film`, `__W__`, `__H__`); their imports reach the source skill's code as shipped (`../../skill/ToonVideo`, `../../skill/sets/office`…). `Video.tsx` exports `Film`, `FPS`, `FRAMES`, `WIDTH`, `HEIGHT`, `SOUND` |

`compositions/film/film.js` is the app's (the app bundles it again before every qc_sheets and film_frames, so you can look at your change in the same turn (T40-12); and finalize bundles the video with the source skill's code, React and three.js 0.187.0, the latest (owner #1071; the source skill asks for 0.186.0)); never write
it. `vo.ts`'s `WORDS` and `CAPTIONS` come from the voice's words: `import WORDS from "mw:words"` gives `[{ word, start, end }]` (seconds), the times the source skill's
`vo-words.mjs` would measure; write `vo.ts` from them in the source skill's own shape. `FRAMES` = the last word's end + at least 0.5 s of finished still.

## 3. The look in short (STYLE.md has every number)

A bright, friendly 3D cartoon that reads like a drawing: the cast flat (unlit fills, painted faces, ink-stick limbs, a soft blob shadow, no ambient
occlusion on them), toon sets of boxes, cylinders and spheres in five soft bands with a fresnel rim, painted canvas textures, a thick ink outline,
emissive props that bloom, a depth of field that melts the background in close-ups, a warm/cool grade. **One look per shot** (`propGlow`, `characterClose`,
`wideBright`, `roomHigh`, `objectClose`, `screenClose`; the cool variant for the consequences half). Text lives in the world (whiteboards, signs, screens);
one word-by-word caption carries the voice. Calm physical camera moves (dolly, truck, slight crane, slow push), hard cuts about 0.07 s before each phrase.
**Never:** a real person's likeness, a brand logo or another creator's character; lit or shaded characters; a hand inside the prop it holds; a white sign that
blows out; a floating title card; a whip pan, crash zoom or shake; two looks in one shot; a whoosh, swoosh, swish, whip, riser or vine-boom.

**Faces:** Outfit (captions, UI) and Caveat Brush (whiteboard marker) have no Vietnamese letters, so the app draws them with Lexend and Sedgwick Ave Display;
the source skill's code keeps the names. Patrick Hand (sticky notes) draws Vietnamese as it is.

**Characters from the library (owner #1267, audit/111 B6, as Ricks Clip's #1076).** A character made on the Characters page in 3D Cartoon's way is
one module the app puts in `src/videos/film/cast/<id>.ts` (a line in `docs/CHARACTERS.json` names it): `CHARACTER = { id, name, about, heightM,
def, build }`, made on the source skill's own `buildCharacter` with its costume and accessories. Build it in `world.ts` with
`import { CHARACTER as lena } from "./cast/lena"` and `const c = lena.build()`, add `c.root` to the scene and put `c` in the world's `cast`, so
`FilmCheck`, the collision check and the held-prop check see it; then place, pose and give it faces with the source skill's rig as any cast member
(`setPose`, `walkPose`, `poseReach`, `legIK`, `setExpr`). Never redraw, edit or copy its file: a change goes back through the Characters page
(Change with Claude). The film's character gate (`character_gate`) checks each file as the Characters page did. The source skill's own cast (Mika, Ravi, June, Otto)
and its examples' Bea, Leo and Noor are in the library too, as the app's (`moworks-mika` …), taken the same way.

**The app's cast layer** (`app/c3d-cast.ts`, `import { setFace, POINT, WAVE, WAVE_AT, talkFace } from "mw:c3d-cast"`; MW Character Sheet v1, owner
#1287-#1293): what the sheet standard asks for that the source skill's rig does not draw, in its own hand. `setFace(c, face)` gives any character
the standard's faces: neutral, happy, laugh, surprised, worried, angry, talk, blink (laugh and angry are the app's, the rest the source skill's own
`setExpr`); `POINT` and `WAVE` are arm poses on `STAND`; `talkFace(t)` flaps the mouth while a character speaks (no lip sync, as the source skill).
A character's `can` list (its record) says what its rig drives.

## 4. Each step

| Step | What this style adds |
|---|---|
| Prepare | The format first (a 9:16 short or a 16:9 What-If, from New project's size), then the format skill's script: **one continuous paragraph**, every real claim with a `verify` note and its source in `BRIEF.md` (claim · as spoken · source · checked), the format's beat table. No premise yet: `idea-lab`'s way |
| Voice | The app's Voice screen makes it from the approved paragraph; the length follows the voice (too long: cut words, never speed it up). The owner's own recording is never rewritten or re-voiced |
| Storyboard | The board is the source skill's real drawing: `boards/A/index.html` from `app/board.html`, one frame per shot at its key second in `data-skill-board`, drawing the film's world and shots. The shot table (one shot per spoken beat, one look per shot, each starting on its phrase) in `STORYBOARD.md` and `shots.ts` Props with words carry the story (a ledger, a poster, a stamp, a label: learned from Ricks Clip's source skill): draw every sentence literally and put the joke in an object, in STYLE.md's in-world text (#1264, audit/111 B1). Change the size at every cut (Ricks Clip's ladder: hook medium close-up, wide reveal, two-shot, insert close-up on the key object, reaction close-up, a camera move through the set for the payoff); never two shots of one set from nearly the same place (T41: frames 1 and 7; #1264, B2). Size guide: the body about 40-60 % of the frame height in a medium shot, 70 % or more in a close shot (an idea from @Huzaifa's `animated-3d-story-video` skill, written for the app; a guide, not a rule; #1264, H3). |
| Motion Plan | Rows name the source skill's moves (camera `a → b` eases, `cam(T, t)` tracking, `poseReach` and `legIK`, `walkPose` along routes, `setExpr` faces, looks, emissive glows) with their words and numbers. They come first and the film goes past them: moworks-alive rules 8-10 hold here too (each shot calls `library_search` twice, and what it takes is rebuilt as toon shapes in this look, on a word). Only STYLE.md's never list and the house bans are off limits A rack focus of about 14 frames moves the focus point from one subject to the next on its word, inside one shot (a calm move, as STYLE.md asks; #1264, B3). Every character breathes and blinks; a small head nod on stressed words; an action winds up, overshoots and settles; a landing gets a dust puff. No camera shake with it: STYLE.md forbids shake (#1264, B4). A tracking camera that must reach several places on their words (a `cam(T, t)` past three points or more) uses the app's `camOnWords` (`import { camOnWords } from "mw:camtime"`, keys with their `word`): it passes every key on its word and eases only at the first and last, still the slow physical move STYLE.md asks for (#1267, audit/111 H1: an idea from @Huzaifa's `animated-3d-story-video` skill, written for the app). |
| Build | `world.ts`, `shots.ts`, `vo.ts` on the source skill (KIT.md, STAGING.md); anything one video needs is built in its own `world.ts`, never in the source skill. Held props gripped from the outside at `userData.grip`; furniture as `box()` / `cyl()` (named, so the check names it); walks along routes in the walk lanes. Keep `FilmCheck`, the template's collision twin, exported from `Video.tsx`, and call **`collision_check`** after every change to the blocking (positions, walks, poses, props): fix what it names until it says `COLLISION none` Repeated objects use instancing; textures at most 2048 px (#1264, H4). |
| Review | CHECKLIST.md on every still round, then `moworks-qc` with `render-review/references/REVIEW.md`. The source skill's collision QA runs in the app (`collision_check`, also in every Review round and in Tech checks): it must say `COLLISION none`. It sees bodies against furniture and each other, not a held prop: beside it, on the same frames, the app's held-prop check (#1267) looks at every prop a hand holds (`userData.grip`): the hand-sphere centre more than about 2 cm off the grip, the held prop inside a table, a body inside the held prop; its `HELD …` lines are a warning (fix them as STAGING.md §4 says: `poseReach` to `grip(prop)`, the prop lifted clear and kept off the body), `HELD none` when every held prop is right. Still check on the stills at each shot's start, middle and end that a prop stays in the same hand across cuts and a tool touches what it acts on. Also look for black polygons or empty openings, and a pole or post crossing the subject (an idea from @Huzaifa's `animated-3d-story-video` skill, written for the app; #1264, H2). |

**The source skill's pace (local; a long film keeps it, moworks-studio §6c):** a hard cut on each phrase (its examples: shots of about 2-4 s), nothing static over 3 s in a short and 4 s in a video (STYLE.md); a slow, eased, physical camera, no whip pan or crash zoom; the voice planned at 2.9-3.1 words a second, cut words rather than read faster. The Storyboard's stills give a pace warning when a board's shots average over 1.5 times this pace (a short 1.5-2.5 s a shot, `cartoon-shorts`' numbers; a What-If about 3-4 s, its example): split long frames, or keep the slower pace and say why in STORYBOARD.md; a warning, never a block (#1267, audit/111 A7).

## 5. Sound

**Where the sounds come from:** as for every film, in the house rules' order (moworks-studio §7b, owner #1034, #1096). Name each sound by
the thing on screen and its action, so the library finds the one that matches.

The source skill's own sounds are in the app's library, made by the source skill's code: `impact`, `blip-up` / `blip-down`, `glitch`, `win`, `chip`, `tick`, `count`, `lock`,
`slice`, `vs`, `click`, `resolve` (SOUND.md's table and gains). Key moments only, about one cue per 3-4 s at most (3-5 in a short, one per 6-10 s in a long
chapter), on the visual hit, in the voice's pauses; captions, in-world text, titles, cuts and camera moves stay silent. **Never a whoosh, swoosh, swish, whip,
riser or vine-boom.** The app places them (Final Mix) and masters to -14 LUFS.

**The music at the turn** (learned from Ricks Clip, owner #1267, audit/111 B5; the music is the app's, so no rule of the source skill is crossed): a film may cut its music at the turn, then a low drone carries to the end (from the library, or code). It is the film's choice in the **Motion Plan**: set `musicStop` to a second in the pause of the voice just before "You see," (or just before the kicker), between two words of transcript.json, and leave `musicStopAsked` empty; leave `musicStop` null and the music plays to the end with its fade. The app applies it when Final Mix places the music; when the music is already on the timeline, call `music_stop` with that second. The **Review** checks that Final Mix shows the stop where the plan put it.

## 6. Text over the canvas

The captions are HTML over the canvas already (the source skill's `ToonCaptions`: Outfit 800, white, ink stroke, one word at a time), so After Effects gets them as
text. Text in the world (whiteboards, signs, screens, sticky notes) is the drawing's own: kept on its canvas textures as shipped (moworks-studio §8).

## 7. The ending

The source skill ends on the kicker, its last 0.5 s or more a finished still, with no outro: the house ending follows it (moworks-studio §9).
