# Short formats (9:16, 1080×1920, 30 fps, 40–60 s)

Five repeatable formats. Each one is the 5-beat shape from `SCRIPT.md` (Hook → Drop-in → Ladder → Turn → Kicker) with
its own hook type, shot plan and cue plan. Pick **one** per video and name it in the plan and the delivery.

Times and word counts are for a 60 s short. For 40–45 s, shrink the ladder first (fewer beats), then the drop-in;
keep the hook, the Turn and the kicker whole. The looks named below are the kit's per-shot looks (`KIT.md`); one look
per shot, never mixed inside a shot.

## Shot density (all formats)
- The hook shot is ≤ 1.5 s, and it must already show the hero object or person.
- The average shot is 1.5–2.5 s. Never hold a static shot over 3 s; a camera push counts as motion, not as a new shot.
- One shot per spoken beat; a ladder beat may be two shots (action + reaction).
- 2–4 sets per short, reused from several angles, plus one **cutaway** set for the Turn: the mechanism shown as a
  cross-section or a simple diagram built in 3D (gears, pipes, a split-open machine).
- Shot counts: 60 s ≈ 22–30 · 45 s ≈ 16–22 · 40 s ≈ 14–20.
- The last shot holds still for ≥ 0.5 s.
- Reference: `src/examples/cheese-bank-vault/` (F1, 63 s, 29 shots).

## F1 Hidden system (second person)
*A real rule is quietly bent. You live through it, then learn the trick.*

| Beat | Time (60 s) | Words | Shots → look |
|---|---|---|---|
| Hook: a paradox ("⟨X⟩ is banned / impossible, yet …") | 0–3 s | ≤ 20 | 1 wide of the impossible thing → `wideBright` |
| Drop-in: "So you …" / "Imagine you …" | 3–10 s | 20–25 | 3 shots: you arrive, the hero object, the person who knows the trick → `wideBright`, `propGlow` |
| Ladder: follow the trick / repeat the action ×3 | 10–35 s | 70–80 | 8–10 shots, one location change → mixed looks |
| Turn: "You see, …" + the mechanism | 35–50 s | 40–45 | cutaway or diagram, 3–4 shots → `objectClose`, `roomHigh` |
| Kicker: the irony in one line | 50–60 s | ≤ 15 | 1–2 shots, the last held still ≥ 0.5 s → `characterClose` |

## F2 Mini-tale (one protagonist)
*An act that looks wrong, a crowd that laughs, a payoff that proves them wrong.*

| Beat | Time | Words | Shots |
|---|---|---|---|
| Hook: the strange act + one line of dialogue | 0–4 s | ≤ 22 | a close-up of the act → `propGlow` |
| Setup: who, where, what's at stake | 4–12 s | 25 | 3 shots, including an establishing wide |
| Doubt: everyone dismisses it | 12–20 s | 25 | the crowd's reaction + the protagonist alone |
| Escalation: "Then … then … then all at once" | 20–38 s | 50 | 6–8 accelerating shots, the shortest ~1 s |
| Payoff + "You see," | 38–52 s | 40 | a cutaway of how it works |
| Kicker | 52–60 s | ≤ 15 | the protagonist's face, held |

## F3 Sci-fi "what if" (a future invention)
*Everyone loves the invention; one glitch reveals the cost; ask the viewer.*

| Beat | Time | Words | Shots |
|---|---|---|---|
| Hook: a huge consequence nobody notices | 0–3 s | ≤ 20 | the device, glowing → `propGlow` |
| Drop-in: "Imagine stepping into …" | 3–12 s | 25 | 3 shots of the first use |
| Normalisation: everyone uses it daily | 12–20 s | 25 | a quick montage, 4 shots |
| Glitch: the thing that shouldn't happen | 20–33 s | 40 | 4 shots; one character frozen, doubled or out of place |
| Turn: what was really happening all along | 33–50 s | 45 | a cutaway of the machine's inside |
| Kicker: a direct question to the viewer | 50–58 s | ≤ 12 | a character close-up, held |

## F4 Levels of X
*Each level is a bigger, nastier version; the last one is absurd.*

| Beat | Time | Words | Shots |
|---|---|---|---|
| Hook: the backwards claim (level 1 is the lucky one) | 0–3 s | ≤ 20 | the level 1 object |
| Levels 1 → 4 | 3–50 s | 30–35 each | 3 shots per level: the object, it working, the victim's reaction. Each level gets a new set or new lighting |
| Final level + kicker | 50–60 s | 25 | the absurd one, held |

A level label shown in the world (a sign, a screen) says exactly what the voice says ("Level two").

## F5 Detective / tell (everyday science paradox)
*There's a way to tell; a case that got caught; an everyday picture explains why.*

| Beat | Time | Words | Shots |
|---|---|---|---|
| Hook: "If you ever …, there's a way to tell" | 0–3 s | ≤ 18 | the suspicious thing |
| Case: someone tried it and got caught | 3–14 s | 30 | 3–4 shots |
| Analogy: an everyday object that shows the rule | 14–35 s | 60 | 6 shots in one simple set (a coin, a queue, a light switch) |
| Second clue | 35–48 s | 35 | 3 shots |
| Kicker (loop into the hook) | 48–55 s | ≤ 15 | 1 shot |

A "case" from real life is a real-world claim: source it in FACTS.md, or tell it as a made-up example ("say someone
tries…").

## Captions (every format)
- The kit's word-by-word captions: one word at a time, white heavy type with an ink stroke, top at y ≈ 1300.
- Keep faces and the key prop out of the caption band while captions run (`STAGING.md` has the zone).
- Text in the world (signs, screens, labels) carries only what the story needs; any number in it is exactly as spoken.

## Sound (every format)
3–5 cues per short, from the kit's code-made sounds (`public/sfx/kit/`, levels in `SOUND.md`). Nothing on captions,
titles, cuts or in-world text, and never a whoosh, swoosh, swish, whip, riser or vine-boom: a cut is silent, and a
moment that needs weight gets a kit cue instead. Where the cues go:

| Format | Hook's hero moment | Doubt breaks / escalation peak | Reveal | Final beat |
|---|---|---|---|---|
| F1 Hidden system | the impossible thing lands: `impact` | the trick works the third time: `tick` | the cutaway's key part: `chip` | the irony lands: `win` or none |
| F2 Mini-tale | the strange act: `impact` or `tick` | "all at once": `count` | the mechanism shown: `chip` | the face held: none, or `win` |
| F3 Sci-fi what-if | the device switches on: `lock` or `blip-up` | the glitch: `glitch` | the inside of the machine: `chip` | the question: none |
| F4 Levels of X | level 1 works: `tick` | each new level's first hit (one cue per level, at most 3): `impact` | — | the absurd level: `impact` |
| F5 Detective / tell | the suspicious thing: `tick` | the case gets caught: `blip-down` | the analogy clicks: `chip` | the loop line: none |

Place cues in the voice's pauses where you can (the word times show them), so they don't sit on top of words.
