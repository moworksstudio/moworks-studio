# The art agent's brief (fill in the ⟨⟩ parts; send it as the agent's whole prompt)

> You are drawing one scene module for a narrated 2D explainer, "⟨film title⟩", ⟨16:9 1920×1080 | 9:16 1080×1920⟩ at
> **60 fps**. The film must look **rich, vibrant and detailed, with smooth motion**. Work in the kit folder
> `⟨absolute path of the kit⟩`.
>
> **Your module:** `⟨dir⟩/story/⟨prefix-name⟩.js`, attached as `HOUSE.⟨name⟩`. Scenes it must draw (from
> `⟨dir⟩/STORYBOARD.md`, shots ⟨numbers⟩):
> - `⟨scene⟩(ctx, opts)`: ⟨what it shows; the progress values it takes, e.g. `press` 0..1; the anchors it returns⟩
> - …
>
> **Read first:** `STYLE.md` §1–§3 and §6 (the palette, the hero, the drawing rules, composition and 9:16),
> `engine/CONTRACT.md` (the API), `⟨dir⟩/STORYBOARD.md` and `⟨dir⟩/ART.md`, `.claude/skills/art-modules/SKILL.md`
> ("How a module is written" and "Test it alone"), and one example module for the drawing style:
> `examples/where-the-needle-stops/story/⟨inj-…⟩.js`. Palette: `HOUSE.pal` and `⟨dir⟩/story/film-pal.js` (this film's
> cool accent is ⟨colour and what it is⟩).
>
> **Rules:**
> - A classic script; pure draw functions of `t` and the options; `init()` returns a Promise and caches static layers;
>   no `Math.random`, `Date.now`, timers, CSS animation or state between calls; a frame well under 60 ms.
> - Every scene takes `cam = { zoom, x, y }`, paints the whole canvas with margin for zoom 1.08 and pan ±40 px, takes
>   `aspect` (`"wide"` and `"tall"`), and returns its anchors.
> - The look: flat cel shapes, **no outlines**, one hard shadow hue-shifted toward magenta, a thin rim, deep indigo
>   grounds, glow only on emitters, detail at three scales, ambient life that never stops, fast things as streaks.
> - **No text** in the module. No image files, no AI images.
> - Don't edit `engine/`, `film-pal.js`, `story.js`, `index.html` or another module. A missing colour goes in a local
>   constant at the top of your file.
>
> **Test:** `node tools/new-module-test.mjs ⟨dir⟩ ⟨module⟩`, then
> `node tools/snapshot.mjs ⟨dir⟩/tests/⟨module⟩ --at ⟨times⟩ --out snaps/round-N` (headless Chrome can't start in the
> sandbox: run snapshots with the sandbox disabled). Look at every PNG full size; iterate until it's clearly vibrant,
> detailed and readable at a glance; check motion with two frames 1/60 s apart. `node tools/check.mjs` must pass.
>
> **Report** (≤ 250 words): the API (each scene, its options, its anchors), any local colours you added, the snapshot
> folder, and the weakest scene with what you'd improve. Never play audio or video.

## The sound agent's brief (bespoke score, optional)
> You are composing the sound for "⟨film title⟩" in the kit folder `⟨absolute path⟩`. Read
> `.claude/skills/sound-design/SKILL.md` ("The bespoke route"), `⟨dir⟩/STORYBOARD.md` (the event-cue table) and
> `⟨dir⟩/story/words.json`. Copy `examples/where-the-needle-stops/sound/` into `⟨dir⟩/sound/` and rewrite it for this
> film: a new score (no drums, chords changing on the cuts, a sparse motif that resolves under the title) and effects
> on every event in the table, all synthesized and seeded. Own only `⟨dir⟩/sound/`. Run
> `node tools/sound.mjs ⟨dir⟩ --bespoke` until its verifier passes. Report the measured numbers (LUFS, true peak,
> cue landings, voice clarity) and say you can't listen. Never play audio.
