# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

A local web app on one Windows PC: a Node service on 127.0.0.1 serves the UI, opened in a Chrome or Edge app window (no browser chrome).

## Users

- **Primary:** motion designers and producers at Moworks, a production studio in Vietnam that makes ad and explainer films for clients.
  They read and write Vietnamese first and work fluently with English tool vocabulary.
- **Also:** invited users who run the app on their own Windows PC with their own Claude account.

## Product Purpose

Moworks Studio is one place to make a film from start to finish with HyperFrames: brief → storyboard → Motion Plan → build and preview →
review and fix → export (MP4, or After Effects for keyframe work). Claude, through Claude Code on the user's own account, plans and edits
the HyperFrames project files; rendering runs on the user's PC. Success: a film goes from brief to export inside one app, every change is
a revision that can be undone, and every style, motion, block, Brand Kit and sound can be traced to its source.

## Positioning

Not sold. Shared privately with invited users under a personal-use licence. HyperFrames runs as it ships (engine, CLI, player, skills
and registry, pinned at one release); the app adds what HyperFrames does not have: a production workflow with approval steps, Claude as
the Editor's right-hand column, checks before export (including Vietnamese glyph coverage), credited libraries of styles, motions,
blocks and sounds, voice-over with local speech-to-text, and the After Effects export. Where the app and HyperFrames overlap,
HyperFrames' way wins.

## Operating Context

- Designed on a 4K monitor at 150 % (a 2560 x 1392 CSS px work area), and equally at home on 1366 x 768 and 1920 x 1080 at 100 % and in
  narrow windows (under 900 px): type, controls and spacing scale with the window, so nothing is oversized on a small screen or
  undersized on a large one.
- Screens: Projects; New project (one wide dialog: set-up on the left, the Brief and Assets on the right); Brand Kits; Film Styles;
  Motion Library (Motions, Blocks, Vocabulary); Characters; Settings (General, Director, System, Update); the Editor. The Editor holds
  the stages as sheets over it: Brief, Assets analysis, Characters, Voice-over, Lyrics, Storyboard, Motion Plan, Review, Final Mix,
  Tech checks, Render, Port to After Effects. There is no separate Overview, Export or sign-in screen: Claude's sign-in is a chip in the
  top bar.
- The Editor: the centre is HyperFrames' own player with the app's controls and timeline; the left column holds the Shots and Assets
  tabs above the Pipeline; a project strip sits above; the right column is Claude. A click on the film picks an element, which becomes
  Claude's target; its words can also be edited by hand.
- The Claude column is a chat: the request as a bubble, Claude's words and steps as one stream, a result card (Applied / Accepted / Undone,
  time, files with lines added and removed), a "selected" chip above the input, suggestions, Motion Library and Sounds, Send; while Claude
  works: time, model, Stop, and a queue. Every line wraps; nothing scrolls sideways.
- Long working sessions at the desk; progress is sometimes followed from a phone.

## Capabilities and Constraints

- Stack: React 18, Vite, lucide-react icons, and no other UI libraries. Everything works offline at run time: fonts and images ship with
  the app, nothing is fetched from a CDN.
- **The interface is in English.** Films can be in any language; Vietnamese text (with tone marks) in briefs, scripts and film content
  must render in every UI font and never break a layout.
- Copy is short: labels of two or three words, one or two short lines of description, almost no page intros.
- Credit every item: author, source link at the commit, commit or date read, licence, and how it was made, shown in the app.
- The library keeps two kinds apart: film styles (the look of a whole film) and the Motion Library (how objects move).
- Two themes, chosen at the first start and switchable in Settings › General › Appearance: **The Desk** (the default, dark) and
  **The Studio** (a light-table workshop); a theme already chosen is kept.
- Text size follows the window (smaller on 1366 x 768, larger on a 4K screen), with a Small / Medium / Large setting on top.
- The Desk keeps its left navigation rail, which can be collapsed; The Studio hangs its pages from a peg bar.
- The app's design follows Impeccable; motion follows Emil Kowalski's animation rules.

## Brand Commitments

- Name: Moworks Studio; the studio's lockup "MOWORKS production studio" (Bebas Neue Bold + Maven Pro).
- The logo is black on white or white on black (a shield badge with an M). It may be adapted for the app; no brand colour is fixed.

## Evidence on Hand

- Test projects made for testing, named `demo-…`, with original stories; never client material.
- Library: 126 film styles from seven authors; 448 HyperFrames Blocks; motions from Magic UI (79), Codrops (34) and Motion Reference (782);
  168 Motion Prompt terms; HyperFrames' 13 frame presets as Brand Kits; HyperFrames' bundled sound effects.
- Brand files: `ui/public/brand/` (badge, wordmark, favicon).
- No testimonials, client names or metrics; none may be invented.

## Product Principles

1. The work leads. The film, the timeline and Claude's answers get the room; the app's chrome stays quiet and exact.
2. Every change is visible and reversible: revisions, result cards, Undo.
3. Short, plain words.
4. HyperFrames as it ships; the app frames it and never fights it.
5. Everything traceable: every item credited, every download named.

## Accessibility & Inclusion

- Vietnamese tone marks render correctly at every size (no clipped diacritics in tight line heights).
- Keyboard: dialogs trap focus and close on Escape; splitters move with the arrow keys; every control has a visible focus ring.
- `prefers-reduced-motion` is honoured.
- Text contrast at least 4.5:1 (3:1 for large text).
