# Story: what the film says, in what order (the Brief step, before any storyboard)

From the Moworks Motion kit 2.0.4 (`workflow/story.md`), which was itself rewritten from HyperFrames' story method (Apache-2.0; today
`hyperframes/references/story.md`, 0.8.214 at 4719543). Of that file, §1 ("The one thing": the one idea, facts apart from creative
choices, every claim traced to the source) applies in this style; its three storylines (§2) do not: the Storyboard step's options take
their place (`SKILL.md` §1). For a film made from text, an idea, a product or an explainer. Not for a song film (the track drives the arc) or kept artwork (`inputs.md`).

## 1. The truth, in six lines (in `BRIEF.md`)

| A product / service / launch | An explainer (an article, a topic, a how-to) |
|---|---|
| Audience: who it speaks to | Audience: who, and what they already (do not) know |
| Pain or desire they already have | Gap: the confusion or the "why care" it resolves |
| **Promise**: the one-line thesis of the film | **Thesis**: the one idea they walk away with |
| Product role: what it does in the story | Spine: the 3-6 ideas (steps, mechanisms, items) that build to it |
| Proof: features, UI moments, numbers, logos, demos | Evidence: numbers, examples, comparisons, worked cases |
| Call to action | Landing: the takeaway, or what to try |

Build around the promise / thesis, never around the source's order. A website or an article is an information layout; a film is a
sequence of feelings. Reorder, merge and drop freely; paraphrasing the source in order is the most common failure.

## 2. One arc (it fixes the beat order)

| Arc | Use when | Beats |
|---|---|---|
| Pain, agitate, solve | the pain is known and urgent | hook → pain → agitation → solution tease → product → proof / demo → CTA |
| Future pacing | a new future or category | imagine → name it → remove the pain → mechanism → outcome → CTA |
| Demo loop | the UI explains itself | question → product → demo 1 → demo 2 → trust → CTA |
| Before, after, bridge | an old way vs a better one | before → after tease → bridge (product) → step 1 → step 2 → wow → CTA |
| Feature, benefit cascade | many features, desire / status | category hook → feature → benefit → feature → benefit → climax → CTA |
| Concept explainer | one idea people half-know | name it → the mechanism layer by layer → the implication |
| How-to / process | an ordered procedure | 3-6 steps on one stage, one move each |
| Listicle | parallel items (tips, mistakes) | hook → N co-equal items (three is strongest) → wrap |
| Story explainer | a case, a history | setup → tension → turn → resolution → lesson |

Many features: always feature → what the viewer gains, never a stack of features. The brand's register tunes the VOICE, not the arc
(restrained: plain, low-hype; bold launch: short and punchy; warm: direct address; premium: fewer words).

## 3. Beats, each with ONE job

Roles: hook · pain · product (or the named idea) · feature / step · benefit / implication · proof / example · brand line · CTA.
Never a beat whose job is "more benefits". A UI demo is usually 3+ beats on the same surface (input → response → result → benefit).
- **The hook (first 3-5 s)** creates tension, curiosity or desire in the viewer's language (what they gain, avoid or finally understand):
  a shocking number, a rhetorical question, a counter-intuitive claim, pain validation, a vivid metaphor, the concept's name, direct
  address ("if you have ever..."), an imagine / scenario, the stakes. Never a company description or a definition.
- **Value before evidence:** the promise lands by beat 2; everything after it proves it. Self-check: delete the evidence beats, the rest
  still states the value; delete the value beats, and if the film still "works" it was a feature tour.
- **Name the technique** that makes each beat land (in the Motion Plan's notes, not "explain it"): analogy, worked example with real
  numbers, progressive disclosure, before / after, common belief vs reality, rule of three, question → answer, demonstration, cause →
  effect chain, callback to the hook, one-line distillation.
- **Visuals come from the source:** its words, objects, verbs and motifs are the props. If a prop could sit unchanged in another
  product's film, swap it for something only this subject has.
- Body beats share one stage (the same diagram growing, the same desk) and one or two kinds of transition, so they read as one flow.

## 4. The voice-over, as cues (when the film is narrated)

There is no separate script step: the narration lives in the storyboard, one line per spoken beat (the `voiceover` field of each frame in
HyperFrames' storyboard format). 1-2 sentences per spoken beat (6-20 words), concrete and human. Write each line as **separate cues**
("Content, sentiment, reach, in one place"): each cue is a moment something new appears on screen. Silent beats are fine.
A brief that already holds the narration: keep its words when the owner wants it verbatim (cut only at sentence / clause boundaries),
else restructure it. A recorded voice-over (its saved transcript is `transcript.json`) is the narration: time the film to it, never edit it, within the
film's length set in New project; a voice longer than that length is the owner's choice (moworks-studio §2b), never a longer film, and
so is a voice well short of it, never a wordless stretch you add on your own.
Shapes that work, by role:
- Hook: a punchy claim whose key word swaps or escalates; a relatable line typed and corrected live; "could be X, or Y, or Z? No: it is
  all of them"; one number counting up, no context yet; one small widget turning into the big claim.
- Pain: 3-5 short pains, each alone on screen; tools piling in until they bury the viewer.
- Product: hard cuts through "Introducing..." to the name; the product doing its core loop once, plainly, ending on "that's it".
- Feature: one workflow end to end in 2-4 real edits; the clip proves it, then a number lands it; cause → effect couplets.
- Benefit: a fast run of 8-12 short value phrases; a list filling about one line a second; one clean two-line title, held still.
- Proof: logos orbiting the mark; metrics counting up, the biggest last.
- CTA / outro: the closing line snapping in word by word onto the logo or URL; the mark holding still while its sub-line swaps.

## 5. How it is shown

- Each option's `STORYBOARD.md` opens with one line, "This film tells [audience] that [promise].", and holds per scene: beat (role,
  seconds) · on screen · **why** (its job, traced to the promise; a scene with no why is cut, not decorated). The owner reads it in the
  Storyboard dialog; the chat message stays short (`storyboard.md` §3).
- In the Motion Plan, reveals are paced to the voice: at a beat's start only what the voice is saying then is on screen; each further
  piece enters when the voice names it, spread over the beat and mostly its back half. Front-loading (everything on screen in the first
  quarter, then frozen) is what makes a film look like slides. A held, finished frame is fine; the fault is front-loaded-then-frozen.
