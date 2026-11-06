# Ricks Clip in Moworks Studio: the film's files

The skill is in `../skill/` exactly as the owner wrote it: `SKILL.md` (the skill `cartoon-audio-short`) and `kit/` (its code: `engine/`,
`example/soldier/`, `tools/`, and `vendor/toon.ts`, the Pen library its `setup.sh` fetches from mromidev/claude-animated-shorts, MIT). Read
them there; never edit them. The app runs every command: the source skill's `setup.sh`, `timing.py`, `render.mjs`, `sheet.py`, `finish.sh` and its
`mix.py` are never run (the app's transcript, storyboard stills, render, Final Mix and Tech checks do that work).

| File | What |
|---|---|
| `index.html` | Start from `app/index.html`: the root `#main` with `data-skill="ricks-clip"`, 9:16 1080×1920, 30 fps, its length in `data-duration` (the film's `TOTAL` / 30, the ending's fade included), the source skill's `<canvas id="c">` inside it |
| `film/story.js` | The film: written from the source skill's worked example (`skill/kit/example/soldier/story.js`) as `setup.sh` copies it to `web/story.js`, rewritten for the new story. It exports what `main.js` imports: `SHOTS`, `TOTAL`, `shotAt`, `camAt`, `dofAt`, `LIGHTS`, `lightFor`, `actorsAt`, `worldAt`, `fxAt` (pure functions of the frame) |
| `film/main.js` | Only when the film builds its own world (SKILL.md §4.3): a copy of the source skill's `engine/main.js` with the world between `// ---------- world ----------` and `// ---------- cards ----------` and the story parts of `worldState()` replaced; every engine section kept as shipped |
| `film/roman.js` | Only when the film adds outfits, headgear, props or faces (SKILL.md §4.4): a copy of the source skill's `engine/roman.js` with the additions, in the same style. The app builds `toon.js` from `toon.ts` and this file, as `setup.sh` does |
| `film/paint.js`, `film/motion.js` | Only when the film adds painters or motion helpers: a copy of the source skill's file with the additions |
| `film/cast/<id>.js` | Written by the app (never write or edit one): a character from the Characters page, one `defineCast(...)`. Draw it with `T.castDraw(p, "<id>", { view: "front" \| "back" \| "profile", expr, L, R, walk, phase, … })` |
| `app/ricks-cast.js` | The app's cast layer, for reading: the three views (front is the source skill's `romanFront`; back and profile are the app's, in the source skill's hand), the pose layer, `castDraw`, `castKey`. The film's bundle takes it from the app |
| `import { camOnWords, wordTime } from "./camtime.js"` | Not a file of the film (never write one): the app's camera timed to words (`app/camtime.js`, for reading). Keys as `camFromKeys` takes them, each timed by a frame (`f`), a second (`t`) or a word of the voice (`word`, with `nth`, `at: "end"`, `lead`); `camOnWords(K, f, { fps: 30, words: WORDS })` passes every key on its word and eases only at the first and last, so a glide of three keys or more never stops on the way (the idea from @Huzaifa's skill `animated-3d-story-video`, written by the app) |
| `import { WORDS } from "./words.js"` | Not a file (never write one): the voice's words from the app's transcript, `[{ word, start, end }]` in seconds, for `story.js` to time its shots and reactions to the words (0-3 frames before each) |
| `compositions/film/film.js` | Written by the app (finalize): the film's files with the source skill's engine, `toon.js` and three.js 0.187.0 |
| `boards/<X>/index.html` | A storyboard option: `app/board.html` with its seconds in `data-skill-board`; a board with its own `boards/<X>/film/story.js` draws that one |

**three.js:** the source skill was written for r160; the app runs it on 0.187.0 (owner #1071). `./lib/three.module.js` in the engine's imports is the
app's copy. The one change r187 needs (`THREE.PCFSoftShadowMap`, removed in r186, is `THREE.PCFShadowMap`) is made by the app when it bundles
the source skill's `main.js` or a `film/main.js`: copy the source skill's file as it is.

**Fonts:** the source skill draws its words on canvases in "DejaVu Serif" and "Arial Black"; the app declares them with Source Serif 4 and Archivo
(both with every Vietnamese letter). Write any new painted word in one of those two names, and check it reads the right way round (not mirrored).

**Sound:** the source skill's `audio.py` cue table is the film's sound plan (its synths are in the app's library as code-made sounds); the app's Final
Mix sets every level (the house levels, #1066). The music stops at the twist line when the style says so (the app's `music_stop`).
