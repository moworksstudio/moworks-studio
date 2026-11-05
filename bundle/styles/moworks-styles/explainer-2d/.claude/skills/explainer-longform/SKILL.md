---
name: explainer-longform
description: Make a narrated 2–12 minute 16:9 (1920×1080, 60 fps) 2D explainer in chapters, in the kit's house look — a cold open with the hook and the film's question, chapters ordered on one clock or dial, one small dial per chapter, one flip, a gentle button that calls back to the hook — built chapter by chapter (one video folder per chapter) with parallel art agents, a sound agent and a fresh-eyes review per chapter, then joined into one MP4. Use when the user asks for "a long video", "a 5-minute explainer", "a 10-minute video", "a YouTube explainer with chapters", "long-form", "the next chapter", or a 16:9 film longer than about 2 minutes. 9:16 shorts go to explainer-shorts; 16:9 films under 2 minutes go to explainer-video.
---

# Make a long-form explainer (16:9, 2–12 min)

**Module check.** If `kit.config.json → modules.longform` is `false`, tell the user in one line that the Explainers
(16:9) module is switched off and offer to switch it on (kit-setup → "Modules"). Don't build with this skill until they
say yes.

**Step 0, always:** the tool check (`node tools/doctor.mjs` must say ready).

## Read first, every time
- `STYLE.md` (its **Author notes** outrank everything, this skill included).
- `SCRIPTING.md` → "Structure: a long-form explainer" and the words-per-second maths.
- `.claude/skills/explainer-video/SKILL.md` and its `references/`: every chapter runs that loop.
- The `art-modules` skill (agent briefs) and the `sound-design` skill (a score across chapters).

Precedence: Author notes → this skill (the long-form parts) → explainer-video (everything shared).

## How a long film is built: in chunks
A 12-minute film at 60 fps is 43,200 frames. One giant folder is slow to snapshot, slow to render and costly to fix,
so **every chapter is its own video folder**, built, checked and rendered on its own, then joined.

| Folder | Holds |
|---|---|
| `videos/<slug>-c00/` | the cold open, ending on the film's title |
| `videos/<slug>-c01/` … `-cNN/` | one chapter each: its own voice take, `SCRIPT.md` part, `STORYBOARD.md`, `story.js`, sound |
| `videos/<slug>-c00/ART.md` | the film's shared art direction, the module list, the agent roster |

- The film's scene modules and `film-pal.js` are written once, in the chapter that first needs them, and copied into
  the `story/` folder of every chapter that uses them. After any change to a shared module, re-copy it everywhere it's
  used and re-snapshot those chapters.
- Every chapter folder is made with `node tools/new-video.mjs <slug>-cNN --format wide --title "<Chapter title>"`.

## The loop
1. **Brief.** The topic, the length (2–12 min), the voice, the sound. Restate it and wait for **"approve"**.
2. **Plan the film** in `videos/<slug>-c00/SCRIPT.md`: the cold open, the chapter table (chapter · its stop on the big
   dial · its own three-stop dial · the flip if it's here · words · minutes), and the fact sheet for the whole film.
   Plan about one chapter per 1–2 minutes.
3. **Script the whole film** (SCRIPTING.md), one section per chapter, in continuous sentences. Show it with the chapter
   table and the fact sheet; wait for **"approve"** before any voice is made. Save each chapter's spoken words to its
   own `story/script.txt`.
4. **Voice, chapter by chapter.** One take per chapter (the user records each chapter as one dry take, or the voice tool
   voices each chapter whole). `node tools/time-voice.mjs videos/<slug>-cNN`, then `set-duration`. Time the first
   chapter before the rest are recorded, and adjust the word budget if it runs long.
5. **Art direction once:** `ART.md` in `-c00` lists every module the film needs and which chapters use it. Start the art
   agents in parallel (roster below).
6. **Per chapter:** storyboard → `story.js` → snapshots (1–2 rounds) → sound → render → QC → review. Chapters can be
   approved and delivered one by one.
7. **Join** the chapter MP4s in order, then measure the whole file:
   ```bash
   # chapters.txt holds one line per chapter, in order:  file 'videos/<slug>-c00/renders/<slug>-c00.mp4'
   ffmpeg -f concat -safe 0 -i chapters.txt -c copy videos/<slug>-c00/renders/<slug>-full.mp4
   ffmpeg -i videos/<slug>-c00/renders/<slug>-full.mp4 -af ebur128=peak=true -f null -
   ```
   Every chapter is mastered to −14 LUFS, so the whole film lands close to it; report the measured value.
   Every chapter comes out of `render.mjs` with the same encode settings, so the stream copy joins them cleanly.
8. **Deliver** the full MP4, each chapter's MP4 and contact sheet, the YouTube chapter times (the running total of
   the chapter lengths: `ffprobe -v error -show_entries format=duration -of csv=p=0 <chapter.mp4>`), and the
   explainer-video delivery notes.

## Chapter rules
- **Only the last chapter fades to black.** The cold open ends on the film's title; every other chapter ends on a hard
  cut, so the joined film flows.
- Each chapter opens with a short chapter title (2–4 words, the house title) that names its stop on the big dial.
- The same hero, palette and cool accent through the whole film. One flip in the whole film, in the second half.
- A label row or a dial readout that spans chapters is redrawn at the start of each chapter from the same values.

## The agent roster (keep it in `-c00/ART.md` → "Agents")
| Agent | Job | Owns |
|---|---|---|
| You, the lead | script, chapter plan, every storyboard, every `story.js`, `film-pal.js`, `index.html`, the join | those files |
| One art agent per module family | a scene module and its test page (16:9 only, so `aspect: "wide"`) | `story/<module>.js`, `tests/<module>/` in its chapter |
| One sound agent (optional) | a bespoke score and effects, chapter by chapter, from the example's `sound/` template | each chapter's `sound/` |
| One reviewer per chapter | fresh-eyes frame review (render-review skill) | its `REVIEW.md` only |

Start agents in the background, one message, and keep building. Don't run two renders at once: they slow each other.

## Render time
Rendering 60 pictures per second of film takes minutes per chapter, not seconds. Run every render in the background,
one at a time, and keep working on the next chapter's storyboard meanwhile. If the user is in a hurry they may ask for
30 fps (half the frames); the house standard is 60 fps, so only on their word.

## Don't → do instead
| Don't | Do instead |
|---|---|
| Build a 10-minute film in one folder | One folder per chapter; join at the end |
| Voice the whole film before the first chapter is timed | Time chapter 1's voice first, then adjust the word budget |
| Fade to black at the end of every chapter | Hard cuts between chapters; only the last one fades |
| Edit a shared module in one chapter only | Re-copy it to every chapter that uses it and re-snapshot them |
| Add a second flip to keep it exciting | One flip; the clock or dial carries the momentum |
| End with a recap or "subscribe" | End on a gentle button that calls back to the cold open |
