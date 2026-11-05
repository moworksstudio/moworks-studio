---
name: style-note
description: Teach the kit the user's taste — record a preference about the explainer videos (liked or disliked) as a dated rule in STYLE.md → Author notes (or SCRIPTING.md for writing), and rewrite the rule itself so every future video follows it. Use when the user gives feedback that should hold beyond this one video — "save that", "remember this", "add it to the style", "always…", "never…", "from now on…", "I don't like…", "I loved that title pop".
---

# Save a style note

`STYLE.md` is the source of truth for taste, and its **Author notes** table (the user's notes) outranks everything else
in the kit, including the skills and the kit's default values. Writing rules live in `SCRIPTING.md`; a writing note
still gets its row in STYLE.md → Author notes, and the rule changes in SCRIPTING.md.

## What kind of note is it?
| The note | What to do |
|---|---|
| A fix for **this** video ("move that label left", "remove that sound") | Just do it. Don't save it |
| A **one-off** request ("a whoosh on this cut", "no title this time") | Apply it to this video only, and leave the defaults alone |
| **Taste** for future videos ("bigger pills", "less purple", "always use the hero", "shorter shots", "never use counter rolls") | Save it (steps below) |
| Praise for a specific choice ("the title landing on the bell was perfect") | Save it too, as "keep doing X" |

If you're unsure whether a note is one-off or taste, ask in one line: "Should I make that the default for future
videos too?"

## Steps
1. Add a row at the top of `STYLE.md → Author notes` (newest first; replace the "(none yet)" row the first time):
   `| <YYYY-MM-DD> | "<the user's words, short>" | <the rule it became> (<file> §<n>) |`
2. **Change the rule itself** where it lives, so the files never contradict each other: `STYLE.md` (palette, hero,
   drawing, type, motion, composition, voice and sound character), `SCRIPTING.md` (writing), or a skill (process,
   sound kinds and levels). If it overrides a default value, rewrite that value and add "(user, <date>)".
3. If it changes shared code (a colour in `engine/house-pal.js`, a timing in `engine/house-ui.js`, a sound in
   `tools/audio/`), change it only if the user wants it everywhere, then run `node tools/check.mjs`, re-sync the video
   you're working on (`node tools/sync-engine.mjs <dir>`) and snapshot one moment to confirm.
4. Tell the user in one line what you saved: "Saved: pills one size bigger by default (STYLE §4)."

## Rules
- Do exactly what was named. Never loosen a rule without a dated row.
- Removing a saved preference: delete the rule, and add a dated row saying it was removed and why.
- Finished videos keep their own copy of the engine in `ex/`; a new default reaches an old video only if it's re-synced
  and re-rendered, and only when the user asks.
