---
name: ricks-clip
description: Moworks Studio's Ricks Clip film style - the owner's skill cartoon-audio-short and its code as shipped: vertical narrated cartoon shorts, flat bean-head characters drawn as cards with plum outlines in a colourful 3D world with black ink outlines, painted textures, depth of field and gliding cameras; one surprising true story or legend on the narrator's words, an ironic twist on the last line. three.js (0.187.0) in the source skill's own engine on HyperFrames.
version: 1.0.0
derived-from: The owner's skill cartoon-audio-short (SKILL.md) and its code cartoon-short-kit.zip (SHA-256s in config/pins.json moworksStyles ricks-clip), pinned as shipped in .moworks/library/ricks-clip/skill/ (SKILL.md, kit/), with kit/vendor/toon.ts (mromidev/claude-animated-shorts at e3b817b6, MIT), the one file its setup fetches.
---

# Ricks Clip: the film style

This pack sits on top of `.moworks/rules/general-style/SKILL.md`, whose steps, gates and files stay as they are. Where the two differ this pack wins, and
where this pack and the source skill differ on taste **the source skill wins**. The house rules (`moworks-studio`) win only on what is global there (two layers: truth,
logos, Vietnamese text, the floor of moworks-alive, a long film's shape, the mix levels, the ending, how to ask the owner); the pace, the camera, the
moves, the mood and the sound's character are the source skill's, and the app's own parts stand: voice-over, transcript, music, sound effects, levels, render.

## 1. The source skill is the style

The owner's skill is in `.moworks/library/ricks-clip/skill/`, exactly as shipped: never edit it.

| File | What it decides |
|---|---|
| `SKILL.md` | **The whole style.** Rules (original stories, no living people or brands, no captions, the voice never re-timed, reactions 0-3 frames before their word); Stage 2 (10 ideas, true or legend, checked); Stage 3 (the script formula); Stage 4.2 the shot plan, 4.3 the world, 4.4 the cast, 4.5 the motion, 4.6 the look check and its traps, 4.7 the sound; the engine gotchas and its architecture |
| `kit/README.md` | What each part of the code is |
| `kit/engine/main.js` | The renderer: toon materials, the ink and normal/depth contract, `add`/`tbox`, sky, lights, the world (between `// ---------- world ----------` and `// ---------- cards ----------`), cards, the colour, normal/depth, ink + grade and lens passes, `applyLight`, `worldState`, `drawActors`, `swapForNd`, `renderFrame` |
| `kit/engine/paint.js` | The painted textures (planks, beams, rotten wood, stone, moss and ivy, grass, dirt, plaster, roof tiles, marble, banners, carved text): flat with dark seams |
| `kit/engine/roman.js` | The worked example's cast: `OUTFITS`, `romanFront` with its 14 arm poses, the three added faces, the loose helmet card, the effect cards (Z, leaf, dust, drip, wood) |
| `kit/vendor/toon.ts` | The Pen library under the cast (mromidev, MIT): bean heads, the plum outline, 14 expressions, 10 eyes, 12 mouths, `bodyFront`, `bodySide`, hats, props, 14 effect sprites |
| `kit/engine/motion.js` | Smootherstep, easeOut, back, anticipation, spring, splines, `camFromKeys` with kicks, `idle`, `blinkAt`, `walk`, `q` |
| `kit/example/soldier/story.js`, `stills.jpg`, `audio.py` | The worked example "The Soldier Who Never Left" (19.7 s, 8 shots): every technique in working code, its look on 14 frames, its cue table. Study it; never copy its story |

The source skill's own commands are never run here (`setup.sh`, `timing.py`, `render.mjs`, `sheet.py`, `finish.sh`, `mix.py`, Playwright, npm, ffmpeg): the
app does each part (§4).

## 2. Where the film lives (`.moworks/library/ricks-clip/app/README.md`)

| File | What |
|---|---|
| `index.html` | A copy of `app/index.html`: the root `#main` with `data-skill="ricks-clip"`, **1080×1920, 30 fps** (the only frame the source skill draws), its length (the film's `TOTAL` / 30, the ending's fade included), the source skill's `<canvas id="c">` |
| `film/story.js` | The film, from the worked example's `story.js` rewritten for the new story: `SHOTS`, `TOTAL`, `shotAt`, `camAt`, `dofAt`, `LIGHTS`, `lightFor`, `worldAt`, `actorsAt(f, T)`, `fxAt(f, T)`, all pure functions of the frame. `import { WORDS } from "./words.js"` gives the voice's words `[{ word, start, end }]` (seconds) from the app's transcript |
| `film/main.js` | When the film builds its own world (always, unless it is the example's bridge): a copy of the source skill's `engine/main.js` with the world and the story parts of `worldState()` replaced, every engine section kept as shipped (SKILL.md §4.3) |
| `film/roman.js` | When the film needs new outfits, headgear, props, faces or views: a copy of the source skill's `engine/roman.js` with the additions in the same hand (§4.4, and §3 below) |
| `film/paint.js`, `film/motion.js` | Only to add painters or helpers, in the source skill's style |

`compositions/film/film.js` is the app's (the app bundles it again before every qc_sheets and film_frames, so you can look at your change in the same turn (T40-12); and finalize bundles `film/` with the source skill's engine, `toon.js` (toon.ts and the cast, as the source skill's `setup.sh` builds
it) and three.js 0.187.0); never write it. The source skill was written for three.js r160: the app makes the one change r187 needs when it bundles (§2 of the
app's README).

## 3. The look in short (SKILL.md has every rule)

Flat 2D bean-head characters as canvas cards with plum outlines (thicker away from the light), standing in a colourful 3D world built from simple
shapes with painted textures, a two-step toon gradient, black ink lines on the world (never on the cards), fog the colour of the horizon, depth of field
on close and medium shots (the eyes sharp), wides sharp. Light tells the beat: day for the normal, golden for decline or drama, night-blue for the
explanation; a time jump gets a 6-frame white flash. Props carry the jokes; every sentence is illustrated literally. Diegetic words (a sign, a carving)
read the right way round; **no captions** unless the owner asks.

**The characters' views (owner 05/11/2026, #1070, audit/102 §8c).** A card turns to the camera on yaw only, so the source skill's drawing is always seen from the
front. Learn the 2D Explainer style's views: every character has three, **front, back and profile**, in Ricks Clip's own drawing (plum outline, bean
head, ink-dot hands). Each actor in `actorsAt` names its `view`. When the camera stands behind a character (over the shoulder at what it sees, walking
away, looking up at something big), the view is `back`: the back of the head with no face, hair or hat covering the nape, hats seen from behind, the
torso without buttons or knots, arms and held things behind the body, no moustache. Profile is `bodySide` of toon.ts (mirrored to face left). A back
view the cast does not have yet is drawn in `film/roman.js` in the same hand, and shown on a character test sheet (front, back, profile) before it is
used. Change the view and the size at the cuts.

**Never:** a real living person, a named public figure, a brand mascot or logo; another creator's story shot for shot; a mirrored word; a camera inside
a house, a roof or a bush; a railing or post across a face; a foreground prop under about 2 m from the lens; the hero hidden behind a pillar.

**Faces:** "DejaVu Serif" (the painted and carved words) and "Arial Black" (the sleeping Z) have no Vietnamese letters on the render machine, so the
app draws them with Source Serif 4 and Archivo; write a new painted word in one of those two names.

**Characters from the library (owner #1076).** A character made on the Characters page in Ricks Clip's hand is one file the app puts in
`film/cast/<id>.js` (a line in `docs/CHARACTERS.json` names it); the film's bundle appends it to `toon.js`. Draw it with the app's cast layer
(`app/ricks-cast.js`): `T.castDraw(p, "<id>", { view, expr, L, R, walk, phase, tilt, headTilt, bob, blink, look, light })` in the actor's
`draw`, the view chosen per shot as above; its card key from `T.castKey("<id>", opts)`. Never redraw, edit or copy its file: a change goes
back through the Characters page (Change with Claude). The source skill's own cast (`OUTFITS`) is drawn the same way (`T.castDraw(p, "legion", …)`),
which gives it a back and a profile too. The film's character gate (`character_gate`) checks each file as the Characters page did.

**16:9** (only when a Ricks Clip film is made in 16:9, #1233; learned from 3D Cartoon, #1264, audit/111 A6): the same vfov is 3.16× wider, so start
from 3D Cartoon's STAGING §6 values; open every place on an establishing wide, then two-shot, close-up, insert; the sideways track along a row is
the 16:9 move; dress both sides of the set; keep the camera on one side of two people talking; ink stays at least 4 px on wides.

## 4. Each step

| Step | What this style adds |
|---|---|
| Prepare | SKILL.md's Stage 1-3, in the app's way: where the owner starts (their own voice-over, their script, or ideas). Ideas: SKILL.md Stage 2 (exactly 10, each with title, hook line, twist, why it animates, **true or legend**), facts checked on the web first (a film that shows no product: say so with `product_research`, then search); a legend is said as "legend says". Script: Stage 3's formula (hook, setting, escalation, pivot, twist on the last words), narration only, never describing what is on screen, sized to the film at the narrator's pace (SKILL.md: about 3.7 words a second in English; a Vietnamese script at the same brisk, steady pace). Default length 20-30 s, 45-60 s allowed; longer when the owner asks, built as moworks-studio §6c says Every real claim gets a row in `BRIEF.md`: claim · as spoken · source · checked date; a number is spoken only when a source gives it, a legend is said as "legend says" (#1264, audit/111 A5). |
| Voice | The app's Voice screen (Eleven v4 with delivery tags, moworks-studio §6d) in the source skill's voice: one steady, warm, deep narrator (stability about 45-55 %; v4 has no speed). The owner's own recording is never edited or re-timed: the picture is timed to it |
| Storyboard | SKILL.md §4.2: one row per shot (frames, words, setting, light, camera move, characters with their poses, expressions and **views**, effects, the sound cue). Usually one shot per phrase, tiny phrases merged into the next; frame 0 is already the hook image; vary the sizes (hook MCU, wide reveal, two-shot, insert close-up on the key object, reaction close-up, an environment move for the payoff). The board is the source skill's real drawing: `boards/A/index.html` from `app/board.html`, one frame per shot at its key second in `data-skill-board` The subject of a line faces the lens when it is named (front, or profile only when the shot is about where it looks); stage heads apart in depth so no head hides the face the line is about (#1264, A4). Size guide: the body about 40-60 % of the frame height in a medium shot, 70 % or more in a close shot (an idea from @Huzaifa's `animated-3d-story-video` skill, written for the app; a guide, not a rule; #1264, H3). |
| Motion Plan | Rows name the source skill's moves (`camFromKeys` glides of 18-45 frames, `easeOut` reveals, spline paths, kicks of 7 frames, 3-5° rolls on drama, `idle` and `blinkAt` on every card, head bobs on stressed words, anticipation → `back` → `spring` actions, `walk`, rack focus of about 14 frames) with their words and frames. A glide of three keys or more in one place times each key to its word with the app's `camOnWords` (`import { camOnWords } from "./camtime.js"`, keys as `camFromKeys` takes them, each with its `word`): it passes every key on its word and eases only at the first and last, where `camFromKeys`' smootherstep stops at every key; a two-key glide stays `camFromKeys`, and the kicks are added after it as `camAt` does (#1267, audit/111 H1: an idea from @Huzaifa's `animated-3d-story-video` skill, written for the app). They come first and the film goes past them: moworks-alive rules 8-10 hold here too (each shot calls `library_search` twice, and what it takes is rebuilt in this look, on a word). Only the source skill's never list and the house bans are off limits |
| Build | `film/story.js`, and `film/main.js` (its world) and `film/roman.js` (its cast) when the story needs them (SKILL.md §4.3-4.5): primitives with painted textures, `tbox` for even texel density, pivoted set pieces driven by 0..1 progress from `worldAt(f)`, card keys from `q()`-rounded values, a detached part as its own card aligned with `headCenter(seed)`. Keep the engine gotchas. Reactions 0-3 frames before their word **No coplanar faces** (learned from 3D Cartoon's source skill, STAGING §5): a decal, strip, sign plate or carved word is its own box raised 1-2 cm; a water, grass or ground plane never runs under another floor at the same height (T39-8: 332 flickering frames; #1264, A1). A held thing is drawn held by the part a person holds (a handle, an edge), stays in the same hand across cuts, and a tool touches what it acts on; check it in every arm pose the shot uses (T39-4; #1264, A3). Repeated objects (fences, crowds of props, tiles) use instancing; textures at most 2048 px (#1264, H4). Set pieces a character could walk into are boxes and cylinders (`tbox`, `CylinderGeometry`; give the ones that matter a `name`, so the check names them), and call **`collision_check`** after every change to where the actors stand or walk: the app gives each card a stand-in about its drawn body's width, 2.25 m tall, and checks it on every frame against the set pieces and the other characters (learned from 3D Cartoon, #1267, audit/111 A8); fix what it names in `film/story.js` (or the world in `film/main.js`) until it says `COLLISION none`, a warning, never a block; a piece a card stands in front of on purpose gets `userData.noCollide`. |
| Review | SKILL.md §4.6's traps on every still round (the narrow vertical frame: half-width d·tan(hfov/2) with hfov = 2·atan(tan(vfov/2)·0.5625), railings across faces, cameras inside houses, foreground props under 2 m, mirrored words, a detached part offset the wrong way, missing ink; **a camera behind a character that still shows its face**), and §4.8's: no frozen span of 0.4 s or more, no black frame. Then `moworks-qc` On every round, walk the eight defect categories of 3D Cartoon's render review (held props, clipping, characters, framing and staging, story match, render artefacts, text, look) beside §4.6's traps; write each defect as frames, shot, category, what is wrong, severity and the fix, and look again after fixing before you score (T39-11; #1264, A2). On the stills, check that held things are held as the Build row says and that the subject of each line faces the lens (#1264, A3, A4). The cards' collision check (`collision_check`) runs in every Review round and in Tech checks too (G-COLLISION, a warning): it should say `COLLISION none` (#1267). Also look for black polygons or empty openings, and a pole or post crossing the subject (an idea from @Huzaifa's `animated-3d-story-video` skill, written for the app; #1264, H2). |

**The source skill's pace (local; a long film keeps it, moworks-studio §6c):** a shot about every phrase (the example: 8 shots in 19.7 s; the owner's reference
film, about 15 in 34 s); continuous moves preferred (pull back from a close-up into the wide, rack focus, crane through the deck, push into an object),
a hard cut only on a jump in place or time, with the flash; every hold creeps, nothing static for 4 frames or more; characters never freeze. The Storyboard's stills give a pace warning when a board's shots average over 1.5 times this pace (about 2.5 s a shot): split long frames at a new phrase, a change of size or a reaction, or keep the slower pace and say why in STORYBOARD.md; a warning, never a block (#1267, audit/111 A7; Test 39 ran 4.3 s a shot).

## 5. Sound

**Where the sounds come from** (owner 05/11/2026, #1034): as for every film, the library's exact sound first, then the app's pick (by Claude) of the library's closest sounds, then a sound made with ElevenLabs from its description (owner #1096), then the online search, then a sound made by code
 (the source skill's own synths, `rc-…` in the library) only for a cue none of them has. Name each sound by the thing on screen and its action
(moworks-studio §7b).

The source skill's sound character (SKILL.md §4.7, its `audio.py` cue table): **whooshes on big camera moves**, a thunk on stamps, rumble and crash on collapses,
a scrape on metal, a ting on reveals, a sting on the twist, creaks, snaps, splashes, snores, leaves, a water bed; SFX on events, written in frames / 30.
The music is the app's (a short march-like loop fits: kick, snare, plucked bass, brass) and **stops at the twist line**, then a low drone carries to the
end (take it from the library, or code). How (T39-10): in the **Motion Plan**, set `musicStop` to the twist's second, in the pause of the voice
just before the twist sentence (between two words of transcript.json), and leave `musicStopAsked` empty: the app applies it itself when Final Mix
places the music (this style's own rule, like What If's). When the music is already on the timeline (a change after Final Mix), call the app's
`music_stop` with that second. The **Review** checks it: Final Mix shows the stop at the twist; if it does not, call `music_stop`. Lock the picture's
timing before the sound. **The levels are the house's** (moworks-studio §7, owner #1066): the source skill's own numbers (music at 50 % of the voice with no
ducking, effects at 50 %, the whole at -14 LUFS) are replaced by them; the app's Final Mix sets them.

## 6. Text over the canvas

The film has no captions. Words in the world (signs, carvings, banners, a flag's letters, the Z of a snore) are the drawing's own, painted on canvas
textures, and read the right way round: they are **this style's performed text** (moworks-studio §8a, owner #1134 step 3): they stay painted in the
world, never moved to HTML; Tech checks' G-CANVAS-TEXT counts the words drawn in `film/` as such. Plain text over the picture (a title card, a
caption the owner asks for) is an HTML element over the canvas, editable as in every style.

The source skill's camera **kicks** (a 7-frame shake on a hit, `camFromKeys`) stay as shipped; on a light flicker they can read as a judder (T39-9):
keep a kick off a flicker's frames, or say in docs/NOTES.md that the two land together on purpose.

## 7. The ending

The source skill lands its last shot's physical payoff on the final word; the house ending follows it (moworks-studio §9): the picture and the music fade together
after the film's length.
