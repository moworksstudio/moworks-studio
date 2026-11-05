---
name: script-writer
description: Write or check the narration for a 2D explainer in the kit's scripting style — second-person hook about to happen to "you", continuous 12–18-word sentences with no fragment chains, one mechanism through one everyday image, facts ordered along one dial, numbers with a yardstick, a gentle button that calls back to the hook — with a fact sheet that sources every number; offer about 5 topic ideas with a recommendation; write titles and descriptions. Use when the user says "write the script", "check my script", "what should I make?", "give me ideas", "topics about…", "a title for this", "a description", "package this video", or a video needs its script before the voice. The approved script is never paraphrased afterwards.
---

# Write the script (and the ideas, titles and descriptions)

**Read first, every time:** `SCRIPTING.md` (the 9 rules, the worked example, the structures, the fact sheet, the
words-per-second maths, the checklist). The Author notes in `STYLE.md` outrank it.

**Module check.** Writing and checking scripts is core and always on. The **ideas** (§3) and the **titles and
descriptions** (§4) belong to the Idea help module: if `kit.config.json → modules.ideas` is `false`, say so in one line
and offer to switch it on (kit-setup → "Modules").

## 1 · Write a script
1. Know the format and length (16:9 or 9:16; seconds or minutes). The word budget comes from SCRIPTING.md's table.
2. Pick the film's **one everyday image** and its **one dial** (three stops, in order) before writing a sentence.
3. Research every number and every claim that isn't common knowledge (web search if you have it). One good source per
   line. If you can't source a number, design the sentence around a comparison instead.
4. Write it in continuous sentences, then run the SCRIPTING.md checklist and fix every miss before showing it.
5. Write `<dir>/SCRIPT.md`:
   ```markdown
   # <Working title>
   > Format: 16:9 | 9:16 · ~<n> s · hook: <one line> · dial: <stop → stop → stop> · image: <the everyday image>
   > · on-screen title: <2–4 WORDS> · status: draft, waiting for approval

   ## Narration
   <the script, one paragraph>

   <n> words, <n> sentences, median sentence <n> words. Estimate: about <n> s of speech, a <n> s film.

   ## Beats
   | Line | Picture | Sound |
   |---|---|---|

   ## Fact sheet
   | # | Claim | As spoken | Source (title, publisher, link) | Checked |
   |---|---|---|---|---|
   ```
6. **Show it in ONE message:** the working title, the script as one paragraph, the beat table, the fact sheet, the
   word count and estimated length, and anything still unverified. Wait for **"approve"**.
7. After approval, set the status to `approved` and save the **spoken words only** to `<dir>/story/script.txt`: no
   notes, no headings. Write numbers the way they're spoken ("ten drops", not "10 drops"), because the voice checks
   compare words. From here on, never change a word without the user asking.

## 2 · Check the user's own script
Never rewrite it on your own. Run the SCRIPTING.md checklist, then show in one message: what passes, what fails (with
the sentence), and a suggested fix for each failure. Ask whether to apply them. Whatever they choose, the words they
approve go into `script.txt` exactly. Their numbers still need fact-sheet lines; list any you can't source.

## 3 · Ideas (Idea help module)
When the user asks what to make, or gives only a topic area:
1. If you don't know their area, ask in one line and propose three areas from what they've said.
2. Offer **about 5 ideas**, one row each:

   | # | Working title | Hook (as it would be spoken) | Everyday image | Dial (3 stops) | Format and length | Fact to verify |
   |---|---|---|---|---|---|---|

3. Mark **one as your pick** and say why in one line (the clearest dial, the most drawable mechanism, the strongest
   hook).
4. A good idea has a hook that happens to "you", one true mechanism you can source, a dial with three drawable stops,
   and scenes that suit the house look (bodies, nature, machines, the sky at night).
5. Check the core fact of each idea before you pitch it, or mark it `unverified` and say so under the table.
6. End with one line: "Pick one, and I'll write the script." Then go to §1.

## 4 · Titles and descriptions (Idea help module)
Read the video's `SCRIPT.md` first. The packaging promises only what the video shows, and carries no figure that isn't
spoken in the video and sourced in its fact sheet.
- **On-screen title:** uppercase, 2–4 words, pops at the end of the film ("WHERE THE NEEDLE STOPS").
- **Video titles:** give 5, mark one as recommended. 3–9 words, title case, no all caps, no emoji, no promise the video
  doesn't keep.
- **Description:** plain language, about 150–200 words at most, no specs. One hook line, two or three lines on what
  the viewer learns, a question for the comments, then a short "Sources" block with the links from the fact sheet.
- **Long-form chapters:** `m:ss Chapter name` per chapter, from the running total of the chapter lengths
  (explainer-longform → step 8). The first chapter starts at 0:00.

## Don't → do instead
| Don't | Do instead |
|---|---|
| Paraphrase an approved script, or "improve" the user's own | Use it word for word; suggest fixes and ask |
| Write fragment chains | Continuous sentences joined with "and", "so", "because", "then" |
| Pitch an idea whose core fact you haven't checked as if it were true | Mark it `unverified` and say where to check |
| Put a number in a title or description that the video doesn't say | Only figures spoken in the video and sourced |
| Copy another creator's topic angle, title or lines | A real phenomenon is free to explain; the angle, the images and the words are yours |
| Put notes or headings in `script.txt` | Spoken words only; everything else lives in `SCRIPT.md` |
| Show ideas as a wall of text | One row per idea, one pick, one line on why |
