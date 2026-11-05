# 2D Explainer in Moworks Studio: the film's files

The source skill is in `../skill/` exactly as the owner wrote it (read `STYLE.md`, `engine/CONTRACT.md`, its skills and the worked example there; never edit
them). The app runs every command; the source skill's own tools (doctor, check, new-video, sync-engine, time-voice, sound, snapshot, render, qc, npm, uv) are
never run.

| File | What |
|---|---|
| `index.html` | Start from `app/index.html`, the source skill's own page: `data-skill="explainer-2d"` on the root, 1920×1080 or 1080×1920 at 60 fps, the length in `data-duration`; one script line per art module before `story/story.js` |
| `story/story.js`, `story/film-pal.js`, `story/<film>-<module>.js` | The film, written from `skill/templates/video/story/` and the worked example |
| `SCRIPT.md`, `STORYBOARD.md`, `ART.md` | The plans, from `skill/templates/video/` |
| `assets/_app/explainer-2d/ex/` | The engine (ex-core, ex-fx, house-pal, house-ui, house-hero) and GSAP, placed by the app (never write them) |
| `assets/_app/explainer-2d/words.js` | `window.STORY_WORDS` from the voice's transcript, written by the app each time (never write it) |
| `boards/<X>/index.html` | A storyboard option: the same page, its own `story/` in the board's folder drawing the frame's moment for each second of the board |

No `audio/` and no `<audio>` element: the voice, the music and the effects are the app's (Final Mix). Figtree is declared by the app with its
Vietnamese twin (Hanken Grotesk); the engine keeps the name.
