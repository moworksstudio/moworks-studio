# 2D Explainer Animation Toolkit

> **First time?** Open this folder in Claude Code and type **`set this up`**. The AI checks that Node.js, ffmpeg and
> uv are installed, asks you to install anything missing, then renders a 5-second demo in each format.

Narrated **2D explainer videos**, made by your AI agent with code:
- flat, glowing, cel-shaded scenes on deep indigo backgrounds, drawn entirely in code (no image files)
- a red-hoodie hero, label pills, callouts and a title that pops in word by word
- every cut, label and sound effect lands on a word of your narration
- music and sound effects composed in code, mastered for YouTube (−14 LUFS)

Delivered as an **MP4** at 60 fps: 16:9 (1920×1080) for YouTube, or 9:16 (1080×1920) for Shorts, Reels and TikTok.

## What you can make (switch modules on or off any time: *"switch the review module off"*)
| Module | You get |
|---|---|
| **Any explainer** (always on) | a short explainer in either format, your own voice-over animated, a silent animation |
| **Shorts (9:16)** | 30–60 s vertical explainers, hook first, safe for platform buttons |
| **Explainers (16:9)** | 2–12 minute explainers in chapters |
| **Idea help** | about 5 topic ideas with a recommendation, titles and descriptions |
| **Fresh-eyes Review** | a second AI checks every finished video frame by frame before you see it |
| **Voice** | record the script yourself, or connect a text-to-speech tool and the AI voices it |

## Use it
Talk to the AI in this folder:
> Give me 5 ideas for a 40-second explainer about the human body.

> Make a 45-second 9:16 short about why your ears pop on a plane. Write the script first.

> Make a 6-minute explainer about what happens in the first hour after you cut your finger.

> Here's my recording of the approved script (drag the WAV in). Animate it.

It restates your brief and waits for **approve**, writes the script (wait for approve again), then builds, checks and
renders. Your videos are in `videos/<name>/renders/`.
- **Recording yourself**: read the script word for word in one take, in a quiet room, with no music.
- **Demos**: `demos/demo-wide/` and `demos/demo-tall/` (rendered at setup).
- **Your taste**: say *"save that"* when a note should apply to every future video.
- **Problems**: say *"run the doctor"*. It lists anything missing, with the command that installs it.
- **How it works**: `HOW-IT-WORKS.md`.
