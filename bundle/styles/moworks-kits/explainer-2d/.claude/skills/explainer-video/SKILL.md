---
name: explainer-video
description: Make any narrated 2D explainer video or clip in this kit's house look — flat cel-shaded shapes with rim light and no outlines on deep indigo grounds, glowing accents, the red-hoodie hero, label pills, callouts and a word-by-word title, every cut, label and sound keyed to a word of the narration, music and effects synthesized in Python — drawn in code on one canvas inside HyperFrames and rendered at 60 fps in 16:9 (1920×1080) or 9:16 (1080×1920). This is the core loop every format uses. Use for "make an explainer about…", "animate this script / voice-over", "a 40-second explainer", "a silent animation", "build this scene", notes on a video ("move the label", "cut earlier", "remove that sound", "make it brighter"), or any request that isn't a named format. 9:16 shorts go to explainer-shorts and 2–12 minute films to explainer-longform (they run this loop with their own rules).
---

# Make a 2D explainer video

You are the user's **scriptwriter, animator and sound designer**. Every picture is code: the scenes, the hero, the
labels, the camera and the sound. You can't watch or hear video, so you check everything as snapshots and
measurements, and the user's eyes and ears have the last word.

**Step 0, always: the tool check.** Run `node tools/doctor.mjs`. If anything is ✗, ask the user to install it
(CLAUDE.md → "First: check the tools") and continue only when it says **ready**.

## Read first, every time
1. `STYLE.md`: the look, with exact values. **Its Author notes outrank everything else in this kit.**
2. `references/BUILD.md`: the storyboard format, how `story.js` is put together, the camera, the labels and the title.
3. `engine/CONTRACT.md`: the exact engine API (`EX`, `HOUSE`). Use the names it gives; don't guess.
4. As needed: `SCRIPTING.md` and the `script-writer` skill (writing), the `voice-over` skill, the `art-modules` skill,
   the `sound-design` skill, `references/CHECKLIST.md` (walk it on every snapshot round and before delivery).
5. `kit.config.json`: the modules that are on, the sound defaults, the voice tool that works, the default format.

Look at the worked example once per session: `examples/where-the-needle-stops/` (16:9, 40 s, 12 shots). Read its
`STORYBOARD.md` first (the best single file to learn from), then `story/story.js`, `ART.md` and `sound/`.
The example ships complete and renders. Sync it, make its sound and render it:
`node tools/sync-engine.mjs examples/where-the-needle-stops`, then `node tools/sound.mjs examples/where-the-needle-stops`
(no voice: music and effects only, mastered to −14 LUFS; add `--bespoke` for its own score), then
`node tools/render.mjs examples/where-the-needle-stops`. To hear it narrated, the user records the 103-word
`story/script.txt` as `audio/takes/take.wav` and runs `node tools/time-voice.mjs examples/where-the-needle-stops`
first: the whole film re-times to their voice.

## The loop
`<dir>` is the video folder, `videos/<slug>` (kebab-case slug). Every command runs from the kit folder.

| # | Step | How | Done when |
|---|---|---|---|
| 1 | **Brief** | From the request and `kit.config.json`, ask only what's missing, in ONE message: the topic or script, the format (16:9 or 9:16), the length, the voice (their recording, the voice tool, or no narrator), the sound (full, no music, or none). Then **restate the brief** in 3–6 lines and wait for **"approve"** | the user said approve |
| 2 | **Scaffold** | `node tools/new-video.mjs <slug> --format wide\|tall --title "<Title>" --seconds <estimate>` (it runs sync-engine) | `<dir>/index.html` and `<dir>/ex/` exist |
| 3 | **Script + fact sheet** | The `script-writer` skill. Write `<dir>/SCRIPT.md` (narration, beat table, fact sheet), show it, wait for **"approve"**. Then save the spoken words only to `<dir>/story/script.txt`. A script the user wrote is used word for word | approved, and `script.txt` holds it exactly |
| 4 | **Voice** | The `voice-over` skill: their take (`audio/takes/take.wav`), or the voice tool, or none. Then `node tools/time-voice.mjs <dir>` | 0 dropped or added words; the word count matches the script |
| 5 | **Length** | `node tools/set-duration.mjs <dir> <seconds>` with the length time-voice suggests (title and fade included) | the root `data-duration` is the film's length |
| 6 | **Storyboard** | Write `<dir>/STORYBOARD.md`: the shot table and the event-cue table (`references/BUILD.md`). Every cut 0.05 s before its word, a new element every 1.5–3 s | every sentence has its shot; every event has its word |
| 7 | **Art** | Decide the scene modules (1–3 per film, each a family of scenes). Write `<dir>/ART.md` from the template. The `art-modules` skill: write a small film yourself; a film over 20 s gets one agent per module in parallel (plus one for a bespoke score) | every module passes its own test snapshots |
| 8 | **story.js** | You (the lead) write `<dir>/story/story.js` and `story/film-pal.js`, and add each module's `<script>` line to `index.html` (after `ex/house-ui.js`, before `story/story.js`). `node tools/check.mjs` after every edit | check passes |
| 9 | **Snapshots** (sandbox off) | `node tools/snapshot.mjs <dir> --at <every beat> --out snaps/round-1`, then look at every frame full size and walk `references/CHECKLIST.md`. Fix, then `snaps/round-2`. One or two rounds | nothing on the checklist fails |
| 10 | **Sound** | The `sound-design` skill: write `story/sound.json` from the event-cue table, then `node tools/sound.mjs <dir>` (or `--bespoke`) | the mix verifies (it exits non-zero on a FAIL) |
| 11 | **Render + QC** (sandbox off) | `node tools/render.mjs <dir>`: HyperFrames check → master → delivery encode → `qc.mjs`. Run it in the background; it takes minutes | QC passes (below) |
| 12 | **Review** | The `render-review` skill when `modules.review` is on | no must-fix left |
| 13 | **Deliver** | `references/CHECKLIST.md → Delivery` | delivered |
| 14 | **Notes** | Change exactly what was named; re-snapshot the changed shots; re-render. A note for every future video → `style-note` | — |

**QC passes when:** frame count = duration × 60; loudness −14 ± 0.5 LUFS (with a voice, or music and effects mastered
on their own) and true peak ≤ −1 dBTP whenever there's sound; the cut count equals the cuts `story.js` declares in
`const CUT = {…}`; and, with a voice, the transcript of the delivered MP4 matches `story/script.txt` with **0
differences**. QC lists frozen spans as warnings: each one must be a deliberate hold (the final still), or fix it.

**Approval gates:** the brief and the script. After that, build, check and render without asking again, unless the
user asked to see snapshots first. The user wants finished MP4s, not plans.

## Size and length live in one place
The root `<div id="root">` in `index.html` holds `data-width`, `data-height`, `data-duration` and `data-fps="60"`. The
engine reads the size from it (`EX.W`, `EX.H`, and `EX.U` = min(W, H) / 1080 for type and UI), `story.js` reads the
duration, `sound.mjs` and `render.mjs` use it. Change the length only with `node tools/set-duration.mjs <dir>
<seconds>`; never edit one place by hand.

## Without a narrator
"No narrator": skip steps 4–5. Time the film yourself (a new element every 1.5–3 s), put absolute seconds in the
storyboard, use constants in `story.js` instead of word cues, write `{ "t": … }` cues in `sound.json`, and run
`node tools/sound.mjs <dir>`: with no `audio/vo.wav` it masters the music and effects to −14 LUFS on their own.
"No sound" as well: skip `sound.mjs` (with no voice and both stems off there's nothing to mix); `render.mjs` then
makes a picture-only MP4.

## Parallel agents
Use them for any film over about 20 s or with more than one scene module: one agent per art module (`art-modules`
skill has the brief), plus one sound agent for a bespoke score. Start them in the background, in one message, and keep
writing `story.js` meanwhile against each module's documented API. You own `story.js`, `STORYBOARD.md`, `film-pal.js`
and `index.html`; each agent owns only its module file and its `tests/<module>/` folder. Keep the roster in `ART.md`
→ "Agents" (agent · module · files · status).

## Hard rules
- **Never play audio or video.** Snapshots, contact sheets and `qc.mjs` measurements only; "measured, I can't listen".
- **Determinism:** every frame is a pure function of time. No `Math.random`, `Date.now`, timers, CSS animation or
  state between frames.
- **Never paraphrase an approved script.** A figure on screen appears exactly as spoken and is in the fact sheet.
- **Voice edits only inside measured silences** (`time-voice.mjs`); the final MP4's transcript must match the script.
- **No AI images, no image files, no samples. No outlines. No text inside art modules.**
- **Sandbox off** for `snapshot.mjs`, `render.mjs` and HyperFrames `check`/`preview`.
- **Don't change `engine/` for one film.** Build it in the film's own modules and `film-pal.js`. Change the engine for
  a real bug, or when the user wants a new default everywhere (ask first), then re-sync with
  `node tools/sync-engine.mjs <dir>`. Never edit a video's `ex/` folder: it's overwritten on every sync.
