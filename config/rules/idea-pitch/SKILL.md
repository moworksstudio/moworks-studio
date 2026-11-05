---
name: idea-pitch
description: Moworks Studio's Idea Library pitch (owner #1101) - ten film ideas for one film style, and then a script for the idea the owner kept. The house layer only; what an idea looks like, its length, its voice and its script formula are the film style's own.
---

# Pitch ten ideas, then write the script (Moworks Studio)

The owner pressed **Pitch 10 ideas** in the Idea Library, or **Write the script** on an idea they kept. No film exists yet: this is the
idea and the script only. Two layers (audit/101):

| Layer | Whose | What |
|---|---|---|
| House (this file) | Moworks Studio | ten cards a round; every story told as true has its sources, checked on the web; nothing is saved for the owner (they keep the cards they want); original stories; no living person as the butt of a joke, nothing political, nothing graphic; no client material, no brands the owner did not name |
| The style's own | the film style's author | what an idea is (its kind of story, its hook, its twist, what each card says), the film's length, the voice, the script's formula and pace |

## 1. Read the style first

The files listed in the request are the film style's own rules and source skill, as its Prepare step reads them. Find what they say about
**ideas, topics, formats and the script**: a stage of ideas, a list of formats or episode kinds, an idea lab, a script formula, a pace in
words a second, a default length. That is the style's way: follow it exactly, card by card (its number of fields, its words for them).

- Ricks Clip, for example: SKILL.md Stage 2 (title, hook line, the twist, why it animates well, true or legend; mixed across eras and
  themes) and Stage 3 (hook, setting, escalation, pivot, twist on the last words; about 3.7 words a second in English).
- A style that says nothing about ideas: pitch in the general way (one clear idea a film, a hook in the first line, a reason to watch to
  the end), in that style's voice, look and length (its description and intended use in the request).

The style's way decides what an idea looks like; this file decides only the house rules above and the file the app reads (§3). Where they
meet, the style asks for fewer than ten, or for no sources: ten cards all the same, and sources on every card told as true.

## 2. Facts

- Anything told as true (history, science, a record, a law) is checked on the web before it is offered: search, open the page, keep the
  link. Two independent sources where you can. Never present a viral legend as fact: call it a legend ("legend says"), a disputed account,
  or fiction.
- When the request says the web is off, check nothing on the web: mark each true story `unchecked` and give no link you have not opened.
- Ten different ideas: different stories, places and times (unless the owner's topic narrows them), none from the list of earlier titles
  in the request.

## 3. ideas.json (the round's ten cards)

Write `ideas.json` in the lab folder, UTF-8, in the language of the request (the field names stay in English):

```json
{
  "rules": ["<each file of the style you followed for the ideas>"] ,
  "ideas": [
    {
      "title": "5-12 words, curiosity-driven",
      "hook": "the first spoken line, or the premise",
      "fields": [ { "label": "The twist", "text": "..." }, { "label": "Why it animates well", "text": "..." } ],
      "truth": "true | disputed | legend | fiction | unchecked",
      "sources": [ { "title": "page title", "url": "https://..." } ],
      "lengthSec": 30
    }
  ]
}
```

- `fields`: the style's own items for a card, in its order and with its names (translated into the request's language when it is not
  English). At least one.
- `truth`: `true` (documented), `disputed`, `legend`, `fiction` (made up for the film), `unchecked` (the web was off).
- `sources`: required for `true` and `disputed` (https links you opened); for a legend, where the legend is told; may be empty for fiction.
- `rules`: `[]` when the style says nothing about ideas (the general way).

Then check it: `node tools/check-ideas.mjs` reads ideas.json and lists every problem; fix them and run it again until it says OK. Reply
with one short line: how many ideas, and which of the style's files you followed (or "the general pitch").

## 4. The script (Write the script)

The request gives the idea the owner kept, its film style, the language and the length. Write the narration with the style's script
formula and pace (its files, as in §1); with none, a hook in the first line, one clear line of thought, an ending that lands. Narration
only: what the voice says, never what the viewer sees. Keep every fact to what the idea's sources say. Size it to the length:

- English: the style's pace, or about 2.6 words a second.
- Vietnamese: the style's pace when it gives one for Vietnamese; else about 3.5-4 syllables a second (one syllable is one written word).

Write `script.md` in the lab folder: the narration alone, one sentence or short phrase a line, no headings, no stage directions, no notes.
Then `node tools/check-script.mjs` (it counts the words against the length); fix and run it again until it says OK. Reply with one line:
the word count and the length it reads in.
