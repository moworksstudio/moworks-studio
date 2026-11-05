# Review: the defect checklist, the brief and the fix toolkit

## Defect checklist (the reviewer checks every sheet against all of these)
| # | Category | Look for |
|---|---|---|
| 1 | **Held props** | the hand sphere sitting *inside* a prop (mug, pot, phone, syringe, sandwich); a prop held by the wrong part (a hot pot by its body when it has a handle, a mug by its middle); props floating off the hand, upside down or tilted wrong; liquid streams missing or pointing at nothing; a tool far from what it acts on (pen nib vs writing, needle vs arm, hammer vs wheel) |
| 2 | **Clipping** | limbs through bodies, furniture, walls, tables; characters overlapping each other; feet sinking into the floor or floating above it; props intersecting furniture |
| 3 | **Characters** | faces cut by the frame edge; a face hidden behind another character when it's the subject; the wrong expression for the line; stiff or broken poses (elbows bending backwards, arms through the torso); eyes looking at nothing |
| 4 | **Framing & staging** | the subject of the line not visible or too small; a foreground object or character blocking the action; heads cropped; the action happening off-screen; the camera inside an object |
| 5 | **Story match** | the picture doesn't show what the voice says at that moment; an action lands on the wrong word; continuity breaks between shots (a mug switches hands, a prop appears or disappears) |
| 6 | **Render artefacts** | blown-out white areas, bloom halos over text or faces, z-fighting / flicker between frames, missing or broken ink outlines, black or empty frames, aliasing shimmer, depth-of-field halos around edges, sprites drawn behind objects |
| 7 | **Text** | in-scene text illegible, misspelled, mirrored, or not matching the voice; captions over key action or unreadable |
| 8 | **Look & polish** | anything that looks cheap, confusing or unintentionally funny; lighting jumps inside a shot; colour that breaks the style |

Severity: **must-fix** (a viewer would notice and it hurts the video), **should-fix** (noticeable on a second look),
**nit** (only in full mode).

## The reviewer's brief (fill in the ⟨⟩ parts; send it as the agent's whole prompt)
> You are reviewing the frames of a finished animated video for render problems and anything that looks wrong. You did
> not make it, so look with fresh eyes and be blunt. Read-only: do not edit any project file.
> - Material: `out/⟨CompId⟩/review-⟨n⟩/INDEX.md`, then `sheets/` (start here, every sheet), then `frames/`
>   (full-size frames: open any you need, at least 2 per shot).
> - Script: `projects/⟨slug⟩/script.txt`. Shot list: `projects/⟨slug⟩/PLAN.md` → Shots. Word times:
>   `src/videos/⟨slug⟩/vo.ts` → WORDS.
> - Checklist: `.claude/skills/render-review/references/REVIEW.md`, categories 1–8.
> - Mode: ⟨fast: report must-fix and should-fix only, ~8 minutes | full: everything, nits included⟩.
> - The user reported: "⟨their exact words, or: nothing⟩". Confirm it, locate it and describe it precisely.
> - ⟨Follow-up only: the previous review is `out/⟨CompId⟩/review-⟨n−1⟩/REVIEW.md`; mark each item fixed / still
>   there, and look only at the frames in this folder.⟩
> - Report every defect as: frame range, shot, category, what is wrong (concrete), severity, and a suggested fix in
>   plain words. Write the full report to `out/⟨CompId⟩/review-⟨n⟩/REVIEW.md` and reply with a ≤ 300-word summary. If
>   a shot has nothing wrong, say so.

## Fix toolkit (what fixed earlier reviews)
| Defect | Fix |
|---|---|
| A hand inside a prop, or the wrong grip | a world-space prop with `userData.grip` at its handle/edge + `poseReach` (cartoon-video STAGING §4, KIT.md recipe) |
| A face turned away or a blank back of a head | cheat the body three-quarter to the lens; re-aim the camera; separate heads ≥ 0.7 m |
| A sprite cut by geometry or the frame | overlay layer + `depthTest: false` + billboard; place it beside (not above) the head |
| Z-fighting / flicker | no coplanar faces: raise decals and strips 1–2 cm as separate boxes; offset sign planes from their plates |
| A blown-out white sign or prop | unlit `flat()` / `fill()` (≤ 1.0, under the bloom threshold) |
| Action off-screen | a tracking camera (`cam(T, t)`) that keeps the subject in frame from the first frame |
| Scribbly outline on thin rings | `userData.noGbuffer = true` on the ring |
| Feet in the floor on stairs | `legIK` to plant each foot on its tread |
| Something odd in the post look | find the pass: `--props '{"dbg":"noOutline,noDof,noMask,gNormal,gDepth"}'` on a still |
