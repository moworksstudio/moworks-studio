# The pipeline: one video, step by step

Every format (a free clip, a short, a What-If piece, an episode chapter) runs this loop. Commands run in the kit
folder. `<slug>` is kebab-case (`cheese-bank`); `<CompId>` is the slug in PascalCase (`CheeseBank`).

| # | Step | How | Done when |
|---|---|---|---|
| 0 | **Tool check** | `node tools/doctor.mjs` | it says **ready** |
| 1 | **Brief** | ask only what's missing, in ONE message (SKILL.md → the loop) | you know the words, the format, the length and the voice |
| 2 | **Script + facts** | one continuous paragraph (the format skills have the writing rules); every real claim checked with a source; show it with a beat table and the facts; wait for the OK | the user approved it (or gave their own recording) |
| 3 | **Scaffold** | `node tools/new-video.mjs <slug> --format short\|long --title "<Title>"` | `<CompId>` and `<CompId>-Check` are registered; `check.mjs` passes |
| 4 | **Save the words** | the spoken words only (no notes) → `projects/<slug>/script.txt`; facts → `projects/<slug>/FACTS.md` (claim · as spoken · source · checked date) | both files exist |
| 5 | **Voice** | the user's file copied untouched, or generated (VOICE.md); → `public/videos/<slug>/voice.wav` | the file is on disk; set `VOICE = "videos/<slug>/voice.wav"` in `vo.ts` |
| 6 | **Word times** | `node tools/vo-words.mjs public/videos/<slug>/voice.wav --script projects/<slug>/script.txt` → paste `WORDS` into `vo.ts`; if it prints `ISSUE STRAY …`, run the printed trim command and point `VOICE` at the trimmed file | `ISSUES none` on the file you use |
| 7 | **Shot list** | one shot per spoken beat, one look per shot (STYLE §5); author the shots in voice seconds (shot starts ~0.07 s before their phrase, key actions on their stressed word); `FRAMES` = last word end + ≥ 0.5 s still hold | the shot table is in `shots.ts` and `PLAN.md` |
| 8 | **Build** | sets, props and the cast from the kit (KIT.md), staged by STAGING.md; text in the world as canvas textures; `node tools/check.mjs` after every edit | every sentence of the script has its picture |
| 9 | **Collision QA** | `node tools/qa.mjs <CompId>` | it prints `COLLISION none` |
| 10 | **Stills** | `node tools/stills.mjs <CompId> out/<slug>/stills-N <frames or 2.5s …> hold --sheet` (a NEW folder each round): one still per shot + every key beat; open them full size; walk CHECKLIST.md | framing, faces, legible text, the caption zone clear, nothing clipping |
| 11 | **Sound** | cues `{ n, t, g }` in `vo.ts → SFX`, key moments only (SOUND.md) | ≈ 1 cue per 3–4 s at most, none on plain text |
| 12 | **Show** | the stills sheet + a beat-by-beat summary + the cue list + the claims to double-check; a moving look on request: `node tools/render.mjs <CompId> --preview` | the user says go (or asked for the file outright) |
| 13 | **Export** | `node tools/render.mjs <CompId>` then `node tools/qc.mjs <CompId>` | −14 LUFS (±0.5) with a voice, true peak ≤ −1.5 dBTP; audio = video length; cuts where the shots change |
| 14 | **Render review** | the render-review skill (when `modules.review` is on): `node tools/review-frames.mjs …`, a fresh-eyes agent, fixes, `node tools/patch-render.mjs <CompId> <a-b> …`, a re-check of the changed shots | no must-fix left |
| 15 | **Deliver** | absolute paths (MP4, sheet), length, measured loudness ("measured, I can't listen"), the review result, the unverified claims; a row in `PLAN.md → Versions` | delivered |

## The files of one video
```
projects/<slug>/PLAN.md         script, facts summary, voice, shot table, cues, checks, versions
projects/<slug>/script.txt      the spoken words only (vo-words compares the voice with it)
projects/<slug>/FACTS.md        claim · as spoken · source · checked date
src/videos/<slug>/world.ts      sets, props, cast, lights (World: scene, lights, setSky, cast, seats)
src/videos/<slug>/shots.ts      SHOTS + applyShot(world, camera, outFrame) → { look, focus }
src/videos/<slug>/vo.ts         FPS, VOICE, CAPTIONS, WORDS, ANCHORS, FRAMES, SFX
src/videos/<slug>/Video.tsx     <CompId>, <CompId>Check, SOUND (registered by new-video.mjs)
public/videos/<slug>/voice.wav  the voice (and voice.words.json from vo-words)
out/<CompId>/                   <CompId>.mp4, the sheet, the mix, qc.json, review folders
```

## Timing: the voice decides
- Two ways to author a shot list (both work; the examples use the first):
  - **In voice seconds** (recommended once the voice exists): each shot has `from`/`to` in seconds from the word
    times, and `ANCHORS = [[0, 0], [FRAMES, FRAMES / FPS]]` (a 1:1 remap).
  - **On an authored 30-fps timeline** (when you build before the voice): author the motion at a comfortable pace,
    then set `ANCHORS = [[authoredFrame, voiceSeconds], …]` so `makeRemap` stretches each part onto the voice. Never
    retime by hand.
- The length follows the voice. If a take runs long, cut words and re-voice; never speed the voice up.

## Approval
- Show before the final export: the stills sheet and a beat summary first. Export when the user says go, or at once if
  they asked for the finished file outright.
- Ask before spending voice credits, with the cost.

## Measured times (an Apple-silicon Mac; yours may differ)
| Job | Time |
|---|---|
| Bundling (once per stills/QA/render run) | ~6–20 s |
| One still | ~1.5–2.5 s |
| Collision QA, a 60 s video | seconds |
| Render, 5 s demo | ~12 s |
| Render, 50 s 16:9 / 60 s 9:16 | ~1.5–2 min (two renders at once slow each other ~3×: render one at a time) |
| Patch-render, ~30 frames | ~5–16 s |
| A generated voice | ≈ 0.1 credit per second with the known-good settings (VOICE.md) |
| Building a new 45–60 s video | the real cost: about an hour of work, most of it staging shots; the first renders usually have 3–6 defects, which is why the review exists |

## When something fails
- **A render or still fails with a WebGL / GPU error:** set `kit.config.json → render.gl` to `"swangle"` (software,
  slower) and retry; kit-setup has the details.
- **`check.mjs` fails:** fix the file it names before anything else; one broken file breaks every composition.
- **`qa.mjs` reports collisions:** move the character or the furniture, re-route the walk, or (for a held prop) mark
  the prop `userData.noCollide`; re-run until `COLLISION none`.
- **Fonts look wrong in a still:** rendering loads the fonts from Google Fonts; check the internet connection.
