# Stickman Explainer in Moworks Studio: the film's files

The source skill is in `../skill/` exactly as the owner wrote it (read its skills, references, code and examples there; never edit them). The app runs
every command; the source skill's own tools (doctor, new-video, stills, render, qc, check, transcribe, npm, uv) are never run.

| File | What |
|---|---|
| `index.html` | Start from `app/index.html`: the root `#main` with `data-skill="stickman-explainer"`, its size, rate (1920×1080 at 24 fps with the 2:1 letterbox (the source skill's frame)) and length (the composition's FRAMES / FPS, the ending's fade included) |
| `src/videos/film/Video.tsx` | The composition, written from the source skill's own template (`skill/templates/`) as the source skill's new-video tool would write it, with the names filled in: it exports the component, `FPS`, `FRAMES`, `WIDTH`, `HEIGHT` (and `SOUND`, kept as the source skill writes it: its cues are the film's sound plan) |
| `src/videos/film/*` | The video's other files, as the source skill lays out `src/videos/<slug>/`; their relative imports reach the source skill's code (`../../kit/…`, `../../stickman/kit.js`…) as shipped. A file of the source skill's `src/` that the film needs changed for itself is copied to the same path under the project's `src/` (the project's copy wins); never change the source skill |
| `import WORDS from "mw:words"` | The voice's words with their times, `[{ word, start, end }]` seconds, from the app's transcript |
| `compositions/film/film.js` | Written by the app (finalize): the composition with the source skill's code, React, the app's stand-in for Remotion |
| `boards/<X>/index.html` | A storyboard option: `app/board.html` with its seconds in `data-skill-board` |

Remotion itself is not here: the stand-in has `useCurrentFrame`, `useVideoConfig`, `Sequence`, `Series`, `Loop`, `Freeze`, `interpolate`,
`interpolateColors`, `spring`, `Easing`, `random`, `AbsoluteFill`, `Img`, `staticFile`, `delayRender`, `continueRender`, `getInputProps`.
`staticFile("textures/…")` is the source skill's own file; any other `staticFile(p)` is the project's `assets/p`. `<Audio>` draws nothing: the voice,
the music and the sound effects are the app's (Final Mix).
