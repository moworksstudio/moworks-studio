---
name: what-if-style
description: How Moworks Studio makes a film in the What If animation style - the author's dusk-lit stick-figure world drawn in code on the pinned engine (one rig, rooms in perspective, light from lamps and windows), the episode written the author's way (episode.json, shots.tsx, the timeline on the voice), bundled and driven inside HyperFrames; the voice from the app's Voice-over or no narration, the sound from the app. Read in every step of a What If film.
version: 1.0.0
derived-from: What If animation by FreshStack (kelano86), MIT, commit 8092fb5e825e55456d1d47fec0ebf595cb93cc0d - SKILL.md (the rules, the eight steps, where an episode lives), references/formula.md, look.md, kit.md, traps.md, sound.md, scripts/plan.py (the cue forms), studio/src/engine (defineEpisode, the timeline the engine reads); rewritten for Moworks Studio. https://github.com/kelano86/what-if-animation/tree/8092fb5e825e55456d1d47fec0ebf595cb93cc0d
---

# What If animation: the rules of this project

The project's style is the author's What If animation. Its own rule file is `.moworks/rules/what-if-animation/SKILL.md` (the author's
skill as shipped) with its `references/` beside it (formula, look, kit, traps, sound): read them as each step says. The author's engine
is staged in `.moworks/library/what-if/` (engine/, the studio settings, two worked episodes to study, never to copy, and the cast sheet);
import it as `what-if` and never edit it. This file says how the author's eight steps run in the app; where it and the author's skill
differ, this file wins (the app has no Remotion, no Python and no ElevenLabs).

## 1. What stays the author's

- The look, the cast on one rig, the rooms in perspective, the light, the pace and the shot vocabulary (`references/look.md`), the
  building blocks (`references/kit.md`), the seven-beat formula and the 15-25 s shape (`references/formula.md`), the traps
  (`references/traps.md`). The author's rules hold: original characters only (Pip, Mo and the rig's cast are the author's and ours to
  use; never a channel's hero, nothing like a famous cartoon), original stories, never a claim that any channel is made with Claude or
  another tool, every fact real and sourced in `science` first, the storyboard checked before any animation.
- **Characters from the library** (owner #1287-#1293): a What If character from the Characters page is one module the app puts in
  `whatif/cast/<id>.ts` (a line in `docs/CHARACTERS.json` names it): `CHARACTER = { id, name, about, heightM, scale, look }`, a costume on the
  rig. The engine's own cast (Pip, Mo, Sis, Mum, The Suit) is in the library too, as `moworks-pip` …, taken the same way. Draw one with
  `import { CHARACTER as rosa } from "./cast/rosa"` and `<AppHero look={rosa.look} pose={{ ...pose, scale: rosa.scale }} />`, or the rig's own
  `<Hero look={rosa.look} …>`; never redraw, edit or copy its file (a change goes back through the Characters page). The app's cast layer
  (`import { AppHero, STANDARD_FACES, POSES, posed, talkFace } from "mw:wi-cast"`, MW Character Sheet v1) adds what the rig does not draw:
  `view: "back"` (from behind, no face), the faces `laugh`, `angry` and `talk` (`face=…`), the standard's poses (stand, point, wave, reach, sit)
  and a talking flap (`talkFace(t)`, no lip sync). A character's `can` list (its record) says what its rig drives.
- The film is 1920 × 1080 (the engine draws that world), at the episode's rate (30 fps unless New project says another of 24, 25, 30, 60).

## 2. Where the episode lives in the project

| Path | What |
|---|---|
| `whatif/episode.json` | Everything you write, as the author's `episode.json`: `id`, `slug`, `topic`, `title` (two lines), `script` (one entry per beat), `science` (each fact: the claim, the working, the source), `shots`, `edit`, `fx`; no `voice`, no `sound` (the app's) |
| `whatif/words.json` | The words with their times (`[{ "w", "s", "e" }]`, seconds): written by the app from the voice-over's checked transcript; none in a film with no narration |
| `whatif/timeline.json` | The timeline the engine reads (`fps`, `total`, `segments`, `shots`, `fx`), written by the app's **whatif_plan** tool (the author's `plan.py` in the app: the same numbers) from `edit` and `fx` against `words.json`; its cue forms: a word, `word#2`, `+N` frames, `s:4.2`, `f:126`; `reverse`, `from`, `to`, `look`; a word cut lands `lead` frames, 2 by default, before the word; a film with no narration ends at `end` (e.g. `"s:20"`) or the New project length. Never write it by hand; `whatif/shotlist.md` beside it |
| `whatif/shots.tsx` | One component per shot, each a pure function of its clock, as the author's examples' `shots.tsx` |
| `whatif/episode.tsx` | `export default defineEpisode("<Id>", { timeline, shots, looks })`, importing from `what-if`, its `timeline.json` and `shots.tsx` |
| `index.html` | The HyperFrames root `<div id="main" data-composition-id="main" data-start="0" data-duration="<total / fps>" data-width="1920" data-height="1080" data-fps="<fps>">` holding `<div id="stage">`, and after the root `<script src="compositions/whatif/film.js"></script>`. The app's finalize bundles the episode with the engine, the author's React and the app's stand-in for Remotion into that file and drives it by HyperFrames' time; never write film.js |

A board (the storyboard, `boards/<X>/`): `STORYBOARD.md` (one `## Frame N` per shot, in the edit's order) and `index.html`, the same
page shape with the board's root `<div id="main" data-composition-id="board-<X>" data-start="0" data-duration="<shot count>"
data-width="1920" data-height="1080" data-fps="<fps>" data-whatif="board">` holding `<div id="stage" class="clip" data-start="0"
data-duration="<shot count>" data-track-index="1">`, and after the root `<script src="film.js"></script>` (beside the page, never a path
out of its folder: the app builds the episode into `boards/<X>/film.js` when it takes the stills). The engine's Board draws each shot at
its key frame for one second (R&D, c8cdf3c3).

Remotion itself is not here: the stand-in has `useCurrentFrame`, `useVideoConfig`, `Sequence`, `Series`, `Loop`, `Freeze`, `interpolate`,
`interpolateColors`, `spring`, `Easing`, `random`, `AbsoluteFill`, `Img`, `staticFile` (the project's `assets/`), `delayRender`; an
`@remotion/google-fonts/<Family>` import gives the family and the app installs it offline. `Audio` and `Video` draw nothing: sound and
footage go on HyperFrames' timeline. Any other `@remotion/...` package is refused.

## 3. The steps in the app

| Author's step | In the app |
|---|---|
| 1 Script | Prepare: `whatif/episode.json` (`topic`, `title`, `script`, `science`), 45-65 words for 15-25 s (the New project length wins), every line a picture; BRIEF.md and docs/ASSETS.md as every style |
| 2 Voice | No ElevenLabs. The narration is the app's Voice-over (the owner uploads one, or the app reads the script with a voice service when one is set up). With no voice-over yet and no voice service, it is a missing thing (moworks-studio §2b): stop in Prepare and offer the two ways on, a voice-over the owner uploads (then the app transcribes it and writes `words.json`) or a film with no narration (§4) |
| 3 Shot list | Storyboard: `shots` (one per picture, 9-14, the size and angle varied every cut, each with its `key` frame), `edit` and `fx` in `episode.json`, then `timeline.json` as §2 says. Aim for 27+ cuts a minute in the opening and no static shot over about 3 s |
| 4-5 Storyboard and self-check | Storyboard: `shots.tsx` right at each shot's `key` frame and `episode.tsx`; the boards are the episode's own Board (each shot at its key frame), whose stills the app takes; run the author's storyboard checklist (`references/look.md`) on them, fix and look again |
| 6 Animate | Motion Plan, then Build: each shot brought to life from its key pose (`poseAt` keys with anticipation, holds and overshoot, `faceAt`, camera moves with `kf`, the power's look, the `fx`); the author's motion checklist; moworks-alive holds (nothing still over 2 s but the end card) |
| 7 Sound | No ElevenLabs and none of the author's sounds. The app's music and sound effects, one event per visible action cued to its shot, a hit that illustrates a word in the pause after it, never on it; the app's voice check (G-VOICE) replaces `mixcheck.py` |
| 8 Master | The app's render: -14 LUFS, peaks under -1 dBTP |

## 4. A film with no narration

When the owner chose no narration (write `"narration": "none"` in `whatif/episode.json` so every later step knows), the script is read on screen: each line of `script` a caption in the author's UI faces (`references/kit.md`,
the `ui` pieces), held as moworks-studio rule 2 says (0.5 s + 0.3 s a word, riding the camera past 2 s); `edit` cues use `s:`, `f:` and `+N`
only (there are no word times); the pace stays the genre's; the title card and the cliffhanger are on screen too. The music carries the
rhythm; the sound effects still follow each visible action.
