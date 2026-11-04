---
name: render-review
description: The fresh-eyes review every finished 2D explainer gets before delivery — contact sheets of the film beat by beat for a separate reviewer agent (fresh context, read-only) that checks the story match, labels, look, composition, motion and artefacts against the storyboard and the house style, then the final-file checks of qc.mjs (frames, loudness, true peak, freezes, cut count, transcript diff); the reviewer writes REVIEW.md with calls made, measured vs looked at, every defect with its severity, and the weakest moment; you fix every must-fix and should-fix and re-check. Use after every render, or when the user says "review it", "check the frames", "have another agent look at it", "something looks off at 0:12".
---

# Render review: fresh eyes before delivery

**Module check.** If `kit.config.json → modules.review` is `false`, do a lighter self-check instead (step 2's material,
then walk `references/REVIEW.md` → checklist yourself) and say in the delivery that the fresh-eyes review is switched
off (kit-setup → "Modules" turns it on).

**Why a separate agent:** you built the film, so you see what you meant, not what's there. Snapshot rounds sample a few
moments; the review reads the whole film beat by beat.

## Steps
1. **Render first:** `node tools/render.mjs <dir>` (sandbox off). It ends with `qc.mjs`; keep its output.
2. **Make the material** (sandbox off):
   ```bash
   node tools/snapshot.mjs <dir> --every 1.5 --out snaps/review-1
   ```
   For films under 20 s use `--every 0.5`. Add `--at` times for every cut + 0.05 s and every event in the storyboard
   if they fall between samples. Optionally pull a few frames from the delivered MP4 itself to confirm the render
   matches (from the video folder; quote paths with spaces):
   ```bash
   ffmpeg -ss 12.5 -i "renders/<slug>.mp4" -frames:v 1 "snaps/review-1/mp4_12.5.png"
   ```
3. **Start the reviewer**: a new agent (your most capable model), fresh context, read-only, with the brief in
   `references/REVIEW.md` filled in. Give it the material, the script, the storyboard, the QC output and any problem the
   user reported **in their exact words**, but not your own opinion of the film. Run it in the background and keep
   working meanwhile.
4. **Fix** every must-fix and should-fix it reports. Re-snapshot the changed moments into a new folder and look at them
   yourself.
5. **Re-render** (`node tools/render.mjs <dir>`) once the fixes are in. A follow-up reviewer gets the previous
   `REVIEW.md` and the new material, marks each item fixed or still there, and looks only at the changed moments.
6. **Cap the loop.** Reviewers always find more. Once no must-fix is left, deliver with any leftovers listed. Two review
   rounds is the norm; a third only for a must-fix.
7. **Record** the result in the delivery: defects found, fixed, left; the weakest moment.

## Don't → do instead
| Don't | Do instead |
|---|---|
| Tell the reviewer what you think is wrong (or right) | Give it the material, the script, the storyboard, QC and the user's exact words only |
| Let the reviewer edit files | It writes only `snaps/review-N/REVIEW.md` |
| Skip the review because the snapshots looked fine | Snapshots sample a few moments; the review reads the whole film |
| Review forever | Stop when no must-fix is left; list the leftovers |
| Report the film as checked when it wasn't watched | Say what was measured and looked at, and that nobody watched it in real time |
