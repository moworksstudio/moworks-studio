---
name: render-review
description: The fresh-eyes render review every finished 3D cartoon video gets before delivery — turn the MP4 into labelled frame sheets, have a separate reviewer agent (fresh context, read-only) find render problems and anything that looks wrong or "stupid" (held props, clipping, faces, framing, story match, artefacts, text, polish), fix every must-fix and should-fix, re-render only the changed shots (patch-render) and re-check them. Use after every export of a video, when the user says "review it", "check the frames", "have another agent look at it", "something looks off in shot 5", or reports a defect ("she's holding the hot part", "the mug goes through the table").
---

# Render review: fresh eyes before delivery

**Module check.** If `kit.config.json → modules.review` is `false`, do the lighter self-check instead (step 2's
material, then walk `references/REVIEW.md` yourself) and say in the delivery that the fresh-eyes review is switched
off (kit-setup → "Modules" turns it on).

**Why a separate agent:** you built the video, so you see what you meant, not what's there. The automatic collision QA
only checks bodies against furniture. First renders usually have 3–6 defects; this catches them before the user does.

## Modes (`kit.config.json → defaults.review`)
| Mode | Sampling | The reviewer reports | Time box | When |
|---|---|---|---|---|
| `fast` (default) | a frame every 0.5 s | must-fix + should-fix only | ~8 min | every video |
| `full` | a frame every 0.25 s | everything, nits included | ~15 min | a flagship video, or when the user asks for "a thorough check" |

A fast review costs roughly 110–190 k tokens; a full one about twice that. Say so if the user asks why it's slow.

## Steps
1. **Export first** (`node tools/render.mjs <CompId>`) and run `node tools/qc.mjs <CompId>`.
2. **Make the material** (5–10 s):
   ```bash
   node tools/review-frames.mjs out/<CompId>/<CompId>.mp4 out/<CompId>/review-1 --every 0.5
   ```
   → `frames/f_<frame>.png` (full size), `sheets/sheet_NN.jpg` (6 labelled frames each), `INDEX.md`.
3. **Start the reviewer**: a new agent (your most capable model), fresh context, read-only, with the brief in
   `references/REVIEW.md` filled in. Give it the material, the script, the shot list and any problem the user reported
   **in their exact words**, but not your own opinion of the video. Run it in the background and keep working on
   anything else meanwhile.
4. **Fix** every must-fix and should-fix it reports, with the fix toolkit in `references/REVIEW.md`. Re-run
   `node tools/qa.mjs <CompId>` after every blocking change (it covers neighbouring shots a narrow review skips).
5. **Re-render only the changed shots** (picture-only fixes; if the voice, the cues or the length changed, do a full
   render):
   ```bash
   node tools/patch-render.mjs <CompId> 730-851 1021-1165
   node tools/review-frames.mjs out/<CompId>/<CompId>.mp4 out/<CompId>/review-2 --every 0.5 --ranges 730-851,1021-1165
   ```
   A follow-up reviewer gets the previous `REVIEW.md` and marks each item fixed / still there; it looks only at the
   changed ranges.
6. **Cap the loop.** Reviewers always find more should-fixes. Once no must-fix is left, do one last quick pass, then
   deliver with any leftovers listed. After 1–2 patches, do a full render rather than patching again.
7. **Record** the result in the delivery and in `PLAN.md` (defects found / fixed / left).

## Don't → do instead
| Don't | Do instead |
|---|---|
| Tell the reviewer what you think is wrong (or right) | Give it the material, the script, the shot list and the user's exact words only |
| Let the reviewer edit files | It writes only its `REVIEW.md` in the review folder |
| Re-render the whole video for a two-shot fix | `patch-render.mjs` the changed frame ranges |
| Review forever | One last quick pass after the must-fixes are gone; list the leftovers |
| Skip the review because the stills looked fine | Stills sample a few frames; the review samples every 0.5 s of the real render |
