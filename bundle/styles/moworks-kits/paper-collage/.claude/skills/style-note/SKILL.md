---
name: style-note
description: Teach the kit the user's taste — record a preference about the motion graphics (liked or disliked) as a dated rule in STYLE.md so every future graphic follows it. Use when the user gives feedback that should hold beyond this one graphic — "I don't like…", "always…", "never…", "make the headlines bigger from now on", "I loved the slam", "remember this", "save that", "add it to the style".
---

# Save a style note

`motion-graphic/references/STYLE.md` is the source of truth for taste, and its §1 "The user's notes" table outranks
everything else.

## What kind of note is it?
| The note | What to do |
|---|---|
| A fix for **this** graphic ("move the globe left", "remove that sound") | Just do it, and log it in `projects/<slug>/PLAN.md`. Don't save it here |
| A **one-off** request ("use a whoosh in this one", "zoom in hard here") | Apply it to this graphic only, log it in PLAN.md, and leave the defaults alone |
| **Taste** for future graphics ("bigger headlines", "no dark page", "money should be green", "never arrows") | Save it (steps below) |
| Praise for a specific choice ("the REALLY? slam was great") | Save it too, as "keep doing X" |

If you're unsure whether a note is one-off or taste, ask in one line: "Should I make that the default for future
graphics too?"

## Steps
1. Add a row at the top of STYLE.md §1 "The user's notes":
   `| <YYYY-MM-DD> | "<the user's words, short>" | <the rule it became> (§n) |`
2. **Change the rule itself** in its section (§2 pacing, §4 colour, §5 type, §6 layout, §7 motion, §8 power moments,
   §9 marks…), so the file never contradicts itself. If it overrides an author rule, rewrite that rule and add
   "(user, <date>)".
3. If it changes a number in a recipe, a sound gain or a kit default, update `RECIPES.md`, `SOUND.md` or
   `kit.config.json` too. Only change `src/kit/*` if the user wants it everywhere.
4. Tell the user in one line what you saved: "Saved: headlines one size bigger by default (STYLE §5)."

## Rules
- Do exactly what was named. Never loosen a rule without a dated row.
- Removing a saved preference: delete the rule, and add a dated row saying it was removed and why.
