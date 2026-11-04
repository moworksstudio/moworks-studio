---
name: cartoon-whatif
description: Make a narrated 16:9 (1920×1080) "What If…?" 3D cartoon story — one power or one dial turned up, told in second person to our on-screen "you" (Mika by default) up the ladder cool → useful → inconvenient → dangerous → twist, with real-science beats marked verify — as a 30–50 s piece (one composition) or an 8–12 min chaptered episode (one composition per chapter), built with the cartoon-video loop (original cast Mika/Ravi/June/Otto, ink outlines, bloom, depth of field, word-timed captions, code-made sound). Use when the user says "what if…", "a what-if video", "16:9 what-if", "a what-if episode", "what if you were 100× stronger", "what if you could ⟨verb⟩", "a 45-second what-if", "a 10-minute what-if", "the next chapter of the episode", or approves a what-if idea from projects/IDEAS.md. 9:16 shorts go to cartoon-shorts; ideas, titles, descriptions, tags and chapters go to idea-lab.
---

# Make a 16:9 "What If…?" story

**Module check.** If `kit.config.json → modules.whatif` is `false`, tell the user in one line that the What If module
is switched off and offer to switch it on (kit-setup skill → "Modules"). Don't build with this skill until they say
yes.

**Step 0, always:** cartoon-video's Step 0 (the tool check). Continue only when it says ready.

## Read first, every time
- `references/SCRIPT.md`: the 13 principles, what we deliberately do, the fact rules, the checklist, the worked
  script.
- `references/FORMATS.md`: A (the 30–50 s piece: 30 s and 45 s beat tables, 40/50 s scaling) and B (the 8–12 min
  chaptered episode, plus packaging).
- `references/EPISODES.md`: what changes from 9:16 to 16:9 (read §1 for every piece), then, for episodes, chapters as
  compositions, dialogue voices, continuity, set reuse, time budgets, per-chapter QA and sound.
- `.claude/skills/cartoon-video/SKILL.md` and its references: `PIPELINE.md` (the loop with every command),
  `STAGING.md`, `STYLE.md`, `KIT.md`, `VOICE.md`, `SOUND.md`, `CHECKLIST.md`.
  **`STYLE.md → The user's notes` outranks everything, this skill included.**
- The worked example: `src/examples/what-if-no-pain/` — "What if you stopped feeling pain?", 16:9, 49.7 s, 13 shots,
  the 45 s table (FORMATS.md A2) in practice. Its script and facts are `script.txt` and `FACTS.md` in that folder. Use
  it as the reference for shot density and 16:9 staging. It ships without its voice file; its timings are kept.

Precedence: the user's notes → this skill and its references (format-specific parts) → cartoon-video (everything
shared). If EPISODES.md §1 and `STAGING.md` ever disagree on a shared staging rule, `STAGING.md` wins.

## Which format
| The user asks for | Format |
|---|---|
| "a what-if", a premise, 30–50 s, or no length given | A, the piece. Default 45 s (A2); 30 s if they say short or quick |
| "an episode", "8–12 minutes", "long-form", "chapters" | B, the episode |
| A length in between (1–7 min) | Ask in one line: "A 45 s piece, or a full episode (8–12 min)?" |

## The loop: a piece (format A)
1. **Brief.** No premise yet → idea-lab (what-if ideas), then come back with the pick. The user's own script or voice
   recording is never rewritten or re-voiced: check a script against the checklist, list what fails, and ask whether
   to tighten it.
2. **Script** to the A1 or A2 beat table and SCRIPT.md:
   - **One continuous paragraph**; present it that way too.
   - Every real-world claim gets a `verify:` note (what to check, where); research it (web search if you have it).
   - Run the SCRIPT.md checklist and fix every miss.
3. **Show it and get an OK** before spending voice credits: the title question, the script as one paragraph, a beat
   table (beat · time · words · shot ideas), the facts (claim · as spoken · source) and anything unverified.
4. **Scaffold, save, voice** (cartoon-video `PIPELINE.md` has the commands):
   - `node tools/new-video.mjs <slug> --format long --title "<Title>"` (1920×1080, 30 fps; `<CompId>` = the slug in
     PascalCase, plus `<CompId>-Check`).
   - The spoken words only → `projects/<slug>/script.txt`; the facts → `projects/<slug>/FACTS.md` (claim · as spoken
     · source · checked date).
   - Voice (the user's recording, or a text-to-speech MCP per `VOICE.md`, cost preflighted and OK'd) →
     `public/videos/<slug>/voice.wav`; then `node tools/vo-words.mjs public/videos/<slug>/voice.wav --script
     projects/<slug>/script.txt`, used only when it reports no issues.
   - **The length follows the voice.** Too long → cut words and re-voice. Never speed the voice up.
5. **Shot table** from the beat table's shot column: one shot per spoken beat, one look per shot, 16:9 staging
   (EPISODES.md §1). Write it in `shots.ts` and `projects/<slug>/PLAN.md`.
6. **Build, check, sound, show, export, review, deliver** with cartoon-video's PIPELINE, using the numbers below:
   `node tools/qa.mjs <CompId>` → `COLLISION none`; stills sheet + beat summary shown before
   `node tools/render.mjs <CompId>` (on "go", or at once if they asked for the file outright); `node tools/qc.mjs
   <CompId>`; the render-review skill; then deliver with absolute paths, length, measured loudness ("measured, I can't
   listen"), the review result and the unverified claims.

## The loop: an episode (format B)
1. **Series spine first (once per channel).** Episodes link through one recurring device that is **ours**: invent it
   with the user before the first episode (an object, a place, or a side character from our cast or a new original,
   never one borrowed from another show). Write it under "Series" in `projects/IDEAS.md` and reuse it in every C08.
2. **Plan the episode** in `projects/<ep>/PLAN.md`: the chapter table (FORMATS.md B, scaled to the length), the cast
   and voice table, the set list, the `verify` list and the continuity table (EPISODES.md).
3. **Script the whole episode**, one paragraph per chapter (each chapter is its own voice file), and get an OK on the
   whole script before any voice is made.
4. **Per chapter**, run the piece loop from step 4: scaffold `node tools/new-video.mjs <ep>-c00 --format long --title
   "<Title> · Cold open"` (composition `<Ep>C00`, then C01…), voice, word times, shots, build, QA, show, export,
   review. Chapters can be approved and exported one by one.
5. **Assemble** in the user's video editor (chapter MP4s in order), then re-measure the whole episode's loudness
   (EPISODES.md §7). idea-lab writes the title, description, tags and YouTube chapters.

## 16:9 numbers
| Item | Piece (30–50 s) | Episode chapter |
|---|---|---|
| Canvas | 1920×1080, 30 fps | same |
| Words | 30 s ≈ 80–85 · 40 s ≈ 105–115 · 45 s ≈ 120–135 · 50 s ≈ 135–145 (≈ 2.8–3.0 words/s) | 10 min ≈ 1,600–1,750 (≈ 165 words/min) |
| Average shot | 3–3.5 s | 3–6 s |
| Never static over | 4 s | 8 s |
| Shot count | 30 s ≈ 9–12 · 40 s ≈ 12–14 · 45 s ≈ 13–16 · 50 s ≈ 15–17 | ≈ 10–20 per minute |
| Title question | spoken in the format table's slot, and written in the world (whiteboard, screen, sign) | spoken by ≈ 5 % of the runtime |
| Captions | kit word-by-word captions, y ≈ 820; nothing important below y 760 while they run | EPISODES.md §1 |
| Sound | ≈ 1 cue per 3–4 s at most | ≈ 1 cue per 6–10 s |
| Ending | the kicker, last ≥ 0.5 s still | C09 sign-off, last ≥ 0.5 s still |

A generated voice reads slower than these budgets: the worked example's 131 words came out at 49.7 s against a 45 s
target. Write to the low end, and cut after the first take if it runs long.

## Don't → do instead
| Don't | Do instead |
|---|---|
| Write the title as "What IF" or in all caps | Normal title case: "What If You Could ⟨Verb⟩?" / "What If You Were ⟨State⟩?" |
| Reuse another creator's premise beats, lines, gags, characters, organisation, tagline or universe | Our cast, our story; a reference teaches the ladder only. The series spine is invented with the user |
| Make "you" a faceless figure | "You" is a cast member on screen, Mika by default; side lines go to Ravi, June, Otto or new originals |
| Joke with other people's IP (films, games, anime, brands) | Jokes from the story's own world: the office, the team, the power's side effects |
| Name or draw real people | Describe records and experiments without faces or names ("a record holder", "researchers") |
| Invent a statistic to make a beat land | Use a comparison picture ("faster than the bus"); numbers only from a source, said with "about" |
| Explain everything up front | Rules and the real anchors early, then story; the planted rule pays off later |
| Speed up the voice to fit | Cut words and re-voice |
| Hold a static shot over 4 s (pieces) or 8 s (episodes) | Add a truck, a slow push, a reaction or a new angle |
| Whoosh, swoosh, swish, whip, riser or vine-boom | Silent cuts; a kit cue on the key moment only (EPISODES.md §6) |
| Play audio or video | Stills, the `vo-words.mjs` transcript, `qc.mjs` measurements; say "measured, I can't listen" |
| Export before the user has seen the stills | Stills sheet + beat summary first; export on "go" |
| Change `src/kit/` for one video (dialogue clips, punch captions) | Ask first; until then use the workarounds in EPISODES.md |
