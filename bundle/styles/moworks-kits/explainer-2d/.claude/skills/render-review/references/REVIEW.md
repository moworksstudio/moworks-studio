# Review: the checklist, the brief and the REVIEW.md format

## Defect checklist (the reviewer checks every sheet against all of these)
| # | Category | Look for |
|---|---|---|
| 1 | **Story match** | the picture doesn't show what the voice says at that moment (compare `STORYBOARD.md` times); an event on the wrong word; a sentence with no shot; continuity breaks across a cut (an object changes side, colour or state) |
| 2 | **Labels** | misspelled; not matching the spoken words; a number on screen that isn't spoken exactly that way; a label starting in the last 0.3 s of a shot; a callout still there at the cut; a label on a path something crosses; full stops; a fallback font instead of Figtree |
| 3 | **9:16 safe zone** (tall films) | any text outside x 60–960, y 250–1450; the title outside y ≈ 500–700; the subject under the bottom UI band |
| 4 | **Look** | outlines on shapes; black, grey or flat grounds; glow on things that don't emit light; a second cool accent; detail competing with the subject; text drawn inside a scene; anything that looks cheap or confusing |
| 5 | **Composition** | the subject not on a third or too small; two ideas in one beat; an empty or cluttered frame; the canvas edge showing during the camera drift |
| 6 | **Motion** | a shot with no ambient life (two frames 0.5 s apart identical); more than 3 s with no new element; a dissolve instead of a hard cut; fast things that jump instead of streaking; the title not popping word by word; no fade in the last 0.6 s |
| 7 | **Render artefacts** | blank or black frames; banding in big gradients; a scene drawn at the wrong size (16:9 art in a tall film); clipped art; flicker between neighbouring frames |
| 8 | **Final file** (from the QC output) | frames ≠ duration × 60; loudness outside −14 ± 0.5 LUFS or true peak above −1 dBTP; frozen frames; a cut count different from the storyboard's; any transcript difference |

Severity: **must-fix** (a viewer would notice and it hurts the film), **should-fix** (noticeable on a second look),
**nit** (only if asked for a thorough check).

## The reviewer's brief (fill in the ⟨⟩ parts; send it as the agent's whole prompt)
> You are reviewing a finished animated explainer for problems. You did not make it, so look with fresh eyes and be
> blunt. Read-only: do not edit any file except your report. Never play audio or video.
> - Material: the contact sheets and frames in `⟨dir⟩/snaps/review-⟨n⟩/` (start with every `sheet*.jpg`, then open the
>   full-size PNGs you need, at least two per shot).
> - Script: `⟨dir⟩/story/script.txt`. Storyboard (shots, times, event cues): `⟨dir⟩/STORYBOARD.md`. The house look:
>   `STYLE.md`. The final-file checks: ⟨paste the qc.mjs output⟩.
> - Checklist: `.claude/skills/render-review/references/REVIEW.md`, categories 1–8. Format: ⟨16:9 | 9:16⟩.
> - The user reported: "⟨their exact words, or: nothing⟩". Confirm it, locate it and describe it precisely.
> - ⟨Follow-up only: the previous review is `⟨dir⟩/snaps/review-⟨n−1⟩/REVIEW.md`; mark each item fixed / still there,
>   and look only at the moments in this folder.⟩
> - Go beat by beat through the storyboard. For each defect give: the time range, the shot, the category, what is wrong
>   (concrete), the severity, and a suggested fix in plain words. If a shot has nothing wrong, say so.
> - Write the report to `⟨dir⟩/snaps/review-⟨n⟩/REVIEW.md` in the format below, and reply with a summary of 300 words
>   or fewer.

## REVIEW.md format
```markdown
# REVIEW: <title> (<length> s, <16:9 | 9:16>)

Delivered: `renders/<slug>.mp4`, <W>×<H>, 60 fps, <frames> frames, <length> s, <audio: yes/no>.

## Calls made
- <the main creative choices visible in the film, one line each: the look, the hero, the dial, the title>

## Measured vs looked at
- Measured (qc.mjs): frames, loudness, true peak, frozen frames, cuts (n of n planned), transcript differences.
- Looked at: <which sheets and times>, <frames pulled from the MP4, if any>.
- Not checked: <e.g. nobody has watched it at full speed; the sound was measured, not heard>.

## Defects
| Time | Shot | Category | What is wrong | Severity | Suggested fix |
|---|---|---|---|---|---|

## Weakest moment
<time range>: <why it is the weakest>, and what would fix it with more time.

## Warnings kept
- <any expected warning, e.g. HyperFrames `check` flags canvas content at the frame edge: full-bleed art, intended>
```
