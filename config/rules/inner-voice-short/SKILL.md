---
name: inner-voice-short
description: Moworks Studio's Inner Voice Short film style - the owner's Story Animation Kit 1.0.0, its caption-told style as shipped: a dark, quiet short in near-black moonlit rooms drawn in thin grey lines, one cream capsule character, a black shadow figure with a red glow that speaks in red typed words, white narrator captions, a DAY N counter, slow fades through black, close code-made foley. The kit's Canvas 2D drawing kit on HyperFrames through the app's stand-in for Remotion.
version: 1.0.0
derived-from: The owner's Story Animation Kit 1.0.0 (STORY-ANIMATION-KIT.md, SHA-256 in config/pins.json moworksKits), its Inner Voice Short style, pinned as shipped in .moworks/library/inner-voice-short/kit/.
---

# Inner Voice Short: the film style

This pack sits on top of `.moworks/rules/general-style/SKILL.md`, whose steps, gates and files stay as they are. Where the two differ this pack wins, and
where this pack and the kit differ on taste **the kit wins**. The house rules (`moworks-studio`) win only on what is global there (two layers: truth, logos, Vietnamese text, the floor of moworks-alive, a long film's shape, the mix levels); the pace, the camera, the moves and the mood are the kit's, and the app's own parts stand: music,
sound effects, levels, render.

## 1. The kit is the style

The owner's kit is in `.moworks/library/inner-voice-short/kit/`, exactly as shipped: never edit it. This style is its **Inner Voice Short** (its other
style, Stickman Explainer, is a film style of its own):

| Kit file | What it decides |
|---|---|
| `.claude/skills/inner-voice-short/references/STYLE.md` | **The look, with a hex value for every role.** Frame, palette, type, the hero, the shadow, sets, light, motion, the don'ts |
| `.claude/skills/inner-voice-short/references/STORY.md` | How these shorts are written: the shape, the formula, white vs red lines, the two DAY counters, the beat sheet |
| `.claude/skills/inner-voice-short/references/SOUND.md` | The sound library, the arc in sound, the silence beats |
| `.claude/skills/inner-voice-short/SKILL.md` | The loop, the draw order, the kit cheat sheet (`src/inner-voice/kit.js`) and what the author learned |
| `src/examples/firstchord.js` | The worked example, "First Chord" (the opening 20 s). Study it; never copy its story |

The kit's own commands are never run here (`doctor`, `new-video`, `stills`, `render`, `qc`, `compare`, `check`, the sound builders, `npm`, `uv`): the app
does each part (§4). Its `kit-setup`, `style-note` and `original-music` skills are not used: a lasting preference goes in `docs/NOTES.md` and in your reply
("this can go into the kit itself"); music is the app's, and only when the owner asks.

## 2. Where the film lives (`.moworks/library/inner-voice-short/app/README.md`)

| File | What |
|---|---|
| `index.html` | A copy of `app/index.html`: the root `#main` with `data-kit="inner-voice-short"`, 1920×1080 at **30 fps**, its length |
| `src/videos/film/Video.tsx` | The composition, from `templates/inner-voice/Video.template.tsx` filled in as `new-video.mjs` would (`__SLUG__` → `film`), exporting the component, `FPS`, `FRAMES`, `WIDTH`, `HEIGHT` and `SOUND` |
| `src/videos/film/film.js` | The scenes and the beat table `T`, from `templates/inner-voice/video.template.js`, drawn with `../../inner-voice/kit.js` (the kit's code as shipped) |

`compositions/film/film.js` is the app's; never write it.

## 3. The look in short (STYLE.md has every number)

1920×1080 with 96 px letterbox bars (a 1920×888 picture), 30 fps; a thin grey floor line at y ≈ 742; a static camera, scenes changing by fading through
black (0.4-0.8 s), no hard cut, no wipe, no shake. Near-black walls, set pieces as fills with a slightly lighter outline of the same hue in thin wobbly
lines, one light idea per scene (the moon shaft, the phone's blue halo, the lamp's warm cone, the shadow's red rim). The cream capsule hero (about 116 × 262 px,
noodle limbs, the face high on the capsule), the black shadow figure with its red glow, fading in, never popping. **Every word is Comic Sans**: white narration
(56-58 px, centred, fading in whole), red inner-voice words (56 px, lower case, typed on at about 20 characters a second), `DAY N` top left in grey bold.
Holds are long and stay alive by breathing, a phone's flicker, a slow moon. **Don't:** saturated colour outside the red, gradients or outlines on the
character, busy backgrounds, camera moves for energy, whooshes, pops.

**Faces:** Comic Sans MS and Comic Neue have no Vietnamese letters, so the app draws the kit's `HAND` stack with Pangolin, a hand face of the same
casual build that has them (a declared name, so no system font is ever used); the kit's code keeps its names.

## 4. Each step

| Step | What this style adds |
|---|---|
| Prepare | The story with STORY.md's formula: an original premise, the theme word (shown only at the end), one drawable want visible from the first scene, the shadow as the excuse given a body, the two counters, the silence beat. A **beat sheet** (t · picture · words · sound) in `BRIEF.md`. White lines ≤ 7 words, past tense, 3rd person; red lines ≤ 4 words, lower case, ending "." or "…" |
| Voice | **None: the story is told in captions.** No voice-over is made, the Voice step is skipped; the length comes from the beat sheet |
| Storyboard | The board is the kit's real drawing: `boards/A/index.html` from `app/board.html`, the seconds of its beats in `data-kit-board`. Crop the faces to check the expressions; captions clear of the window, headstocks and clock; red lines near the voice that says them |
| Motion Plan | Rows name the kit's moves (`life` and `typed` captions, `finish` black fades, `hero` poses and faces, `shadowFigure` entrances, `wallClock` time-skips, `moonShaft`, `softLight`) with their beat times. moworks-alive holds in this style's own way: a long hold breathes (the kit's breathing, flicker, moon), never a frozen frame over 2 s; each shot still calls `library_search` twice and may take a quiet detail redrawn in thin grey lines. Only STYLE.md's don'ts and the house bans are off limits |
| Build | `film.js` with `kit.js`, the draw order of SKILL.md (room, moon shaft, set pieces, glows, hero, shadow, words, finish); new set pieces in the film's own file, never in the kit |
| Review | The author's "what we learned" (SKILL.md) and the stills, then `moworks-qc`. The cold open on black is meant |

**The kit's pace (local; a long film keeps it, moworks-studio §6c):** no cuts as a rule, long holds, fades through black of 0.4-0.8 s, a static camera, small and slow acting (STYLE.md, SKILL.md); its life is in the captions and the small moves, never in a faster cut.

## 5. Sound

**Where the sounds come from** (owner 05/11/2026, #1034, in place of "code-made sounds only" of 04/11: Test 38's code-made sounds were dull
and did not match the picture): as for every film, the app's offline library first, then the online search, then a sound made by code (the kit's own
sounds, new takes from its recipes and the app's) only for a cue neither has. Name each sound by the thing on screen and its action, so the library
finds the one that matches (moworks-studio §7b).

The kit's own sounds are in the app's library, made by the kit's code: `room` under each scene, `tap`, `alarm`, `clock-spin`, `whisper` under a red line,
`harmonics`, `strum-sour`, `string-mute`, `dread` on the shadow's arrival (SOUND.md's gains). Quiet and close; **silence is part of the design**: the low
point and the turn have no words and only the room tone. **Never a whoosh or a pop.** Music only when the owner asks (often a sparse piano). The app places
them (Final Mix) and masters to -14 LUFS.

## 6. Text over the canvas

The red inner-voice words type on letter by letter, placed by the full line's width so nothing slides: the kit's drawing, performed text kept on the
canvas as shipped (moworks-studio §8). The white narration and the `DAY N` counter are plain text: HTML over the canvas in the same face, size, colour,
place and fade, under the same vignette and grain (moworks-studio §8), or kept on the canvas with the reason in `docs/NOTES.md`.

## 7. The ending

The kit's own: the title word in big Comic Sans with a red underline, a closing white line and a red two-word payoff, then the fade out (STORY.md, the
shape's part 9). It is the author's ending (moworks-studio §9): the music fades within it.
