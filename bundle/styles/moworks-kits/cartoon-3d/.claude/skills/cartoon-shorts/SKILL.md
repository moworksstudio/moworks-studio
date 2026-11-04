---
name: cartoon-shorts
description: Make a narrated 40–60 s vertical (9:16, 1080×1920) 3D cartoon short — a concrete little story that seems to make no sense, with the "why" held back until one true mechanism snaps it into place — written to one of five formats (F1 hidden system, F2 mini-tale, F3 sci-fi what-if, F4 levels of X, F5 detective/tell) and built with the cartoon-video loop (the original cast Mika/Ravi/June/Otto, ink outlines, bloom, depth of field, word-timed captions, code-made sound). Use when the user asks for "a short", "a 9:16 cartoon short", "a vertical 3D cartoon story", "a Shorts/Reels/TikTok story", "a hidden-system short", "a levels-of short", "a 60-second cartoon explainer", "make it like the shorts format", gives a short-form idea or script for this kit, or approves a short from projects/IDEAS.md. 16:9 "What If…?" pieces and episodes go to cartoon-whatif; ideas, titles, descriptions and tags go to idea-lab.
---

# Make a 9:16 cartoon short

**Module check.** If `kit.config.json → modules.shorts` is `false`, tell the user in one line that the Shorts module is
switched off and offer to switch it on (kit-setup skill → "Modules"). Don't build with this skill until they say yes.

**Step 0, always:** cartoon-video's Step 0 (the tool check). Continue only when it says ready.

## Read first, every time
- `references/SCRIPT.md`: the one-sentence formula, the 5-beat shape, the 11 rules, the checklist.
- `references/FORMATS.md`: shot density and the five formats F1–F5, each with its beat table, shot plan and cue plan.
- `.claude/skills/cartoon-video/SKILL.md` and its references: `PIPELINE.md` (the loop with every command),
  `STAGING.md` (read its 9:16 parts), `STYLE.md`, `KIT.md`, `VOICE.md`, `SOUND.md`, `CHECKLIST.md`.
  **`STYLE.md → The user's notes` outranks everything, this skill included.**
- The worked example: `src/examples/cheese-bank-vault/`. It is a 9:16, 63 s, 29-shot F1 hidden-system short ("one
  bank will lend you money if you bring it a giant wheel of cheese"). Use it as the reference for shot density, 9:16
  staging and the "You see," turn. It ships without its voice file; its timings are kept.

Precedence: the user's notes → this skill and its references (the format-specific parts) → cartoon-video (everything
shared). This skill adds format rules on top of the core loop; it never replaces a core step.

## The loop
1. **Brief.** Sort what the user gave:

   | They gave | Do |
   |---|---|
   | Nothing, or only a topic or niche | Run idea-lab first (ideas in the shorts buckets), let them pick, then come back here |
   | An idea or a premise | Pick the format (step 2) and write the script |
   | Their own script | Don't rewrite it. Check it against the SCRIPT.md checklist, list what fails, and ask whether to tighten it |
   | Their own voice recording | Never rewrite or re-voice it. Transcribe it (step 5) and build the shots on it |

2. **Pick ONE format** from FORMATS.md. Match the idea's mechanism: a real rule quietly bent → F1; one person's odd
   act proved right → F2; a future invention with a hidden cost → F3; a thing that gets worse in steps → F4; a way to
   tell a hidden truth → F5. If two fit, choose the one whose hook sounds most wrong on its own, and say which you
   chose.
3. **Script** to the format's beat table and SCRIPT.md:
   - **One continuous paragraph.** Present it to the user that way too.
   - Every real-world claim gets a `verify:` note (what to check, where). Numbers only when a source gives them, said
     with "about". Research them (web search if you have it), and put each one in the facts table.
   - Run the SCRIPT.md checklist and fix every miss before showing it.
4. **Show it and get an OK** before spending any voice credits. Show in one message:
   - the title and the format (F1–F5);
   - the script as one paragraph;
   - a beat table: beat · time · words · shot ideas;
   - the facts: claim · as spoken · source, plus anything still unverified.

   If the user asked for the finished file outright, keep this to one short message, but still wait for the OK before
   spending credits. With their own recording there is nothing to spend: go straight on.
5. **Scaffold, save, voice.** Follow cartoon-video `PIPELINE.md` for each command. In short:
   - `node tools/new-video.mjs <slug> --format short --title "<Title>"` (1080×1920, 30 fps; composition `<CompId>` =
     the slug in PascalCase, plus `<CompId>-Check`).
   - Save the spoken words only to `projects/<slug>/script.txt` (no `verify:` notes in it; the word check compares
     against this file). Save the facts to `projects/<slug>/FACTS.md` (claim · as spoken · source · checked date).
   - Voice: the user's recording, or a connected text-to-speech MCP per `VOICE.md` (preflight the cost, ask first) →
     `public/videos/<slug>/voice.wav`.
   - Word times: `node tools/vo-words.mjs public/videos/<slug>/voice.wav --script projects/<slug>/script.txt`. Use it
     only when it reports no issues; it prints a trim command for a stray word.
   - **The length follows the voice.** If the take runs long, cut words and re-voice. Never speed the voice up.
6. **Shot table** from the format's shot plan in FORMATS.md: one shot per spoken beat (a ladder beat may be two:
   action + reaction), one look per shot, each shot starting on its phrase's first word. Write it in `shots.ts` and
   `projects/<slug>/PLAN.md`.
7. **Build, check, sound, show, export, review, deliver** with cartoon-video's PIPELINE, using the numbers below.
   - Collision QA: `node tools/qa.mjs <CompId>` must print `COLLISION none`.
   - Stills: `node tools/stills.mjs <CompId> out/<slug>/stills-N auto --sheet` (a fresh folder each round), plus
     `hold` for the final still. Look at every shot at full size.
   - Show the stills sheet and the beat summary; export with `node tools/render.mjs <CompId>` on "go" (or at once if
     they asked for the file outright), then `node tools/qc.mjs <CompId>`.
   - The render-review skill runs before delivery.
   - Deliver: the format used, length, measured loudness ("measured, I can't listen"), the review result, the
     unverified claims, and absolute paths to everything.

## Short-specific numbers
| Item | Value |
|---|---|
| Canvas | 1080×1920, 30 fps |
| Length | 40–60 s; the final length follows the voice |
| Words | 55–60 s: 150–185 words (≈ 2.9–3.1 words/s). A generated voice reads slower (SCRIPT.md): write to the low end |
| Hook shot | ≤ 1.5 s, and it already shows the hero object or person. Frame 0 is never empty |
| Shot length | average 1.5–2.5 s; never a static shot over 3 s (a camera push counts as motion, not as a new shot) |
| Shot count | 60 s ≈ 22–30 · 45 s ≈ 16–22 · 40 s ≈ 14–20 |
| Sets | 2–4 per short, reused from several angles, plus one cutaway set for the Turn (the mechanism as a cross-section or a simple 3D diagram: gears, pipes, a split-open machine) |
| Turn | "You see," starts at 60–80 % of the runtime (the example: 43.3 s of 63 s, 69 %) |
| Ending | the last shot holds still ≥ 0.5 s; no outro |
| Captions | the kit's word-by-word captions, top at y ≈ 1300. Keep faces and key props out of the caption band (STAGING.md) |
| Sound | 3–5 cues per short: the hook's hero moment, the doubt-breaking event, the reveal, the final beat (FORMATS.md per format) |

## Don't → do instead
| Don't | Do instead |
|---|---|
| Copy another creator's topic, title, lines, characters, story beats or frames | Write an original story in the 5-beat grammar. A reference video teaches the shape only |
| Explain the mechanism early | Story first; the "You see," Turn starts at 60–80 % of the runtime |
| Invent a fact, number or quote to make a beat land | Research it and source it, attribute it ("researchers think…"), or cut it. Use a comparison picture instead of a made-up figure |
| Put a number on screen that differs from the voice | On-screen numbers are exactly as spoken, and flagged `verify` until checked |
| Speed up the voice to hit 60 s | Cut words and re-voice |
| Hold a static shot over 3 s | Add a slow push, a reaction shot or a new angle |
| End with an outro, "subscribe" or a recap | End on the kicker; loop it into the hook if you can |
| Put a sound on captions, titles, cuts or in-world text | Leave them silent; cues go on key moments only (≈ 1 per 3–4 s at most) |
| Use a whoosh, swoosh, swish, whip, riser or vine-boom | Cut clean with no sound; land the moment with a kit cue (`impact`, `tick`, `chip`, `lock`…) |
| Draw a real person, or use another channel's character or someone's IP in a joke | Use the cast (Mika is the default "you") or a new original from the character-builder skill; jokes come from the story's own world |
| Play audio or video to check it | Check stills, the `vo-words.mjs` transcript and `qc.mjs` measurements; say "measured, I can't listen" |
| Export the final video before the user has seen the stills | Show the stills sheet + beat summary; export on "go" |
| Skip the collision QA or the render review | `COLLISION none` before export; the render-review skill before delivery |
| Change `src/kit/` for one video | Build in the video's own `world.ts`; ask before changing the shared kit |
