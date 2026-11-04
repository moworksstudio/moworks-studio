# Story Animation Kit

> **First time?** Open this folder in Claude Code and type **`set this up`**. The AI checks that Node.js, ffmpeg, uv
> and Remotion are installed, asks you to install anything missing, then renders a 5-second demo in each style.

Animated story videos made by your AI agent with code, in **two styles**. Ask for either one by name.

**Stickman Explainer**: a narrated "what if…" explainer.
- flat vector figures and a hoodie hero with rim light
- quick cuts on every sentence
- rulers, maps and counters, and a gold title card
- crisp sound effects

**Inner Voice Short**: a dark, quiet short told in captions.
- a cream character in moonlit rooms
- a black shadow with a red glow that whispers in red words
- a `DAY N` counter and slow fades
- close, quiet sound effects

Delivered as an **MP4** (1920×1080, mastered to −14 LUFS for YouTube). Sound effects are made in code and included.
**Music is composed on request**: ask for it and the AI writes original music in Python.

## Use it
Talk to the AI in this folder:
> Make a 40-second Stickman Explainer: "What if you never needed sleep?" Write the script first.

> Here's my voice-over (drag the MP3 in). Animate it as a Stickman Explainer.

> Make a 20-second Inner Voice Short about someone who keeps skipping their morning run.

> Add some original piano music under it.

It writes the script or story first, shows you still frames, then exports to `out/`.
- **Demos**: `out/DemoStickman/DemoStickman.mp4` and `out/DemoInnerVoice/DemoInnerVoice.mp4` (made at setup).
- **Your taste**: say *"save that"* when a note should apply to every future video.
- **Problems**: say *"run the doctor"*. It lists anything missing, with the command that installs it.
- **How it works**: `HOW-IT-WORKS.md`.
