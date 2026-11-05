---
name: idea-lab
description: Turn a topic or niche into video ideas for this kit, then package the finished video. Generates 8–12 ideas per request in the formats' buckets (shorts — hidden systems, history with a mechanism, everyday science paradox, sci-fi what-if, parables; What If…? — one dial turned up or one new verb, sequels via multipliers), each with a hook, its format, the mechanism or ladder, the facts to verify and the sets; keeps the list in projects/IDEAS.md (proposed / approved / made); hands the picked idea to cartoon-shorts or cartoon-whatif for the script; and writes titles, descriptions, tags and YouTube chapters. Use when the user says "give me ideas", "what should I make", "video ideas about ⟨topic⟩", "ideas for a short", "ideas for a what-if", "what's next", "titles for this video", "a description", "tags", "YouTube chapters", "package this video", or "what should I call it".
---

# Idea lab: ideas and packaging

**Module check.** If `kit.config.json → modules.ideas` is `false`, tell the user in one line that the Ideas module is
switched off and offer to switch it on (kit-setup skill → "Modules"). Don't use this skill until they say yes.

Read before generating: `projects/IDEAS.md` (what exists), and the SCRIPT.md + FORMATS.md of the format you're
generating for (`.claude/skills/cartoon-shorts/references/`, `.claude/skills/cartoon-whatif/references/`). They define
the buckets, the formats and the title patterns used below.

## 1. The channel profile (ask once, ever)
Look at `kit.config.json → channel` first. If `niche`, `audience`, `tone` and `tagline` are filled, use them without
asking. If any is empty, ask in ONE message and propose answers from what the user has already said, so they can just
say yes:

> Before I suggest ideas, four quick questions about your channel. I'll save the answers so I don't ask again.
> 1. **Niche:** what topics? (e.g. hidden systems and odd history, everyday science, sci-fi what-ifs)
> 2. **Audience:** who's watching? (e.g. curious adults, teens, students)
> 3. **Tone:** how should it sound? (e.g. friendly and dry, playful, calm and serious)
> 4. **Tagline:** one line for the end of your descriptions. I can propose three if you like.

Save the answers into that block only, keeping the rest of the file as it is:

```json
"channel": { "niche": "…", "audience": "…", "tone": "…", "tagline": "…" }
```

"Change my niche / tone / tagline" → update the block and say so in one line.

## 2. Generate ideas (8–12 per request)
**Which format.** Use the request. If it doesn't say and both the shorts and whatif modules are on, ask in one line:
"Shorts (9:16), What If…? (16:9), or a mix?" If only one is on, use it.

**Buckets.**

| Format | Buckets | A good idea has |
|---|---|---|
| Shorts (cartoon-shorts F1–F5) | hidden systems / loopholes · history with a mechanism · everyday science paradox · sci-fi "what if" · parables / logic puzzles | a hook that sounds wrong on its own; **one** true mechanism you can source; a doubt beat; fits 2–4 sets + one cutaway |
| What If…? (cartoon-whatif A or B) | one dial turned up ("What if you were 100× ⟨quality⟩?") · one new verb ("What if you could ⟨verb⟩?") · a sequel via a bigger multiplier (10× → 100× → 1,000×) of an idea already made | a power that collides with ordinary days (school, work, food, transport); 1–3 rules with one that can bite later; a real anchor (an experiment, a record, an animal); a ladder cool → useful → inconvenient → dangerous |

Spread a batch across the buckets (no more than 3 from one bucket unless the user asks). Check `projects/IDEAS.md`
first and don't propose an idea that is already listed.

**Show each idea as one row:**

| # | Working title | Hook (as it would be spoken) | Format | Mechanism (shorts) / ladder rungs (what-if) | Facts to verify (what · where) | Sets | Cast |
|---|---|---|---|---|---|---|---|

- **Sets:** reuse the office where possible (`src/kit/sets/office.ts`: desks, chairs, coffee corner, meeting room,
  whiteboard, clock, windows). Name any new set the idea needs; the character-builder skill builds it.
- **Cast:** Mika is the default "you"; Ravi, June and Otto take the side roles; a new original only when the story
  needs one (character-builder). Never a real person.
- **Facts:** if you have web search, check each idea's core fact now and give one good source (an official body, a
  medical reference, a paper, a reputable news report). Still mark it `verify`: the script step checks every line.
  Without web search, mark every fact `verify: unchecked` and say so under the table.
- End with one line: "Pick one (or several), and I'll write the script."

**Originality.** Never copy another creator's premise, title or script. A real phenomenon is free to explain; the
angle, the story, the title and the lines must be ours. If the user points at a video they like, take its shape only
(the format, the kind of hook), never its topic angle, title, lines or characters. No other people's IP (films, games,
brands) in the premise or the jokes.

## 3. The ideas list: `projects/IDEAS.md`
Create it on first use with this shape, and keep it current:

```markdown
# Ideas

## Series
(What If…? episodes only: the recurring device that links episodes, invented with the user. Empty until then.)

## List
| # | Title | Format | Status | Slug | Hook | Facts to verify | Notes |
|---|---|---|---|---|---|---|---|
```

| Event | Do |
|---|---|
| A new batch is shown | Add every idea as `proposed` |
| The user picks one | Set it to `approved` |
| Its video is delivered | Set it to `made` and fill in the slug |
| The user rejects one | Delete its row |

## 4. Pick → script
When the user picks an idea: mark it `approved`, then continue in cartoon-shorts or cartoon-whatif from its script
step. That skill's SCRIPT.md is the rulebook (one continuous paragraph, `verify:` notes, the checklist), and the
idea's facts-to-verify list carries into `projects/<slug>/FACTS.md`.

## 5. Packaging: titles, description, tags, chapters
Asked for directly, or offered in one line when a video is delivered. Read the video's `projects/<slug>/script.txt`
and `FACTS.md` first. The packaging promises only what the video delivers, and it carries no figure that isn't in the
video and verified.

**Titles: give 5, mark one as recommended.**
- 3–9 words: shorts 3–7, What If…? 4–9 (the question form).
- One case style per channel: match the user's earlier titles in IDEAS.md; with none yet, use title case.
- Never all caps, no emoji, no promise the video doesn't pay off.
- Shorts patterns: "The ⟨Object⟩ That ⟨Did Something Odd⟩" · "Why ⟨Group⟩ Keep ⟨Doing X⟩" · "The ⟨Rule / Place⟩
  Nobody ⟨Notices⟩" · "What If We Invented ⟨X⟩?" · "Levels of ⟨X⟩".
- What If…? patterns: "What If You Could ⟨Verb⟩?" · "What If You Were ⟨N×⟩ ⟨Quality⟩?" (a multiplier when there is
  one) · always "What If", never "What IF".

**Description**

| Line | Shorts | What If…? pieces and episodes |
|---|---|---|
| 1 | One hook line: the paradox, not the answer | One hook line about the cost of the power |
| 2 | A question for the comments | The story question, for the comments |
| 3 | The tagline (`channel.tagline`) | "Watch next:" one other video of the user's, with its link |
| 4 | 3 hashtags | The tagline (`channel.tagline`) |
| 5 | — | 3 hashtags |

Episodes add the YouTube chapters below the description. If the video makes real claims, offer a short "Sources"
block with the links from its FACTS.md.

**Tags: 15–20**, as one comma-separated line ready to paste (YouTube allows about 500 characters in total), in four
groups:
1. the exact title in 2–3 spellings ("100x stronger", "100 times stronger", "a hundred times stronger");
2. synonyms for the topic or the power;
3. the broad genre ("what if", "what if animation", "animated story", "3d cartoon", "cartoon explainer");
4. 4–6 of the user's other titles (the `made` rows in IDEAS.md; fewer if they have fewer).

**YouTube chapters (episodes)**
- One line per chapter, `m:ss Name`, using the chapter names from cartoon-whatif FORMATS.md B (Cold open, How it
  works, Is it real?, …).
- Times are the running total of the chapter MP4 lengths, in order:
  `ffprobe -v error -show_entries format=duration -of csv=p=0 <chapter.mp4>` for each one.
- If the user changed timing in their editor (gaps, an intro), take the times from their timeline instead.
- YouTube needs the first at 0:00, at least three chapters, and each at least 10 s long.

## 6. Optional: a YouTube research tool
If a YouTube research MCP is connected (look at your own tools), it can show what performs in the user's niche, to
find patterns: title forms and lengths, video lengths, kinds of hooks, which buckets do well. Read its schema,
preflight any cost and ask before spending credits, and record the tool that worked in `kit.config.json` the way
kit-setup records MCPs. Write what you learn as patterns ("5–7-word question titles do well here"), never as a list
of other people's videos to remake. Without such a tool, plain web search is enough.

## Don't → do instead
| Don't | Do instead |
|---|---|
| Ask the channel questions every time | Read `kit.config.json → channel`; ask only for empty fields, once |
| Quiz the user with open questions | Propose answers they can accept with a yes |
| Copy a premise, title, script or story beat from another creator | Keep the shape; write an original angle, story, title and lines |
| Pitch an idea whose core fact you haven't checked as if it were true | Mark it `verify` (or `verify: unchecked` without web search) and name where to check |
| Put a number in a title or description that the video doesn't say | Use only figures spoken in the video and sourced in its FACTS.md |
| Pitch ideas that need a real person on screen, a brand or someone's IP | Tell it with our cast, generic places and generic objects |
| Write a title in all caps or with emoji | Normal title case: "What If You Stopped Feeling Pain?" |
| Start building the video from this skill | Hand the picked idea to cartoon-shorts or cartoon-whatif |
