# Instructions for AI coding agents (Codex, Cursor, Gemini CLI, Windsurf, …)

This kit is built for Claude Code, but any agent that can read files and run terminal commands can use it.
1. Read **`CLAUDE.md`**: your role, the look, the tool check, the skills, the rules and the folder map. Everything in it
   applies to you.
2. At the start of every project, run `node tools/doctor.mjs`. If anything is missing, ask the user to install it
   (CLAUDE.md → "First: check the tools"), and continue only when it says ready.
3. The "skills" are Markdown playbooks. Open the one that matches the task and follow it (check
   `kit.config.json → modules` first):
   - any explainer video or clip, or notes on one → `.claude/skills/explainer-video/SKILL.md` (and its `references/`)
   - a 9:16 short (30–60 s) → `.claude/skills/explainer-shorts/SKILL.md`
   - a 16:9 explainer of 2–12 minutes → `.claude/skills/explainer-longform/SKILL.md`
   - a script, the fact sheet, topic ideas, titles, descriptions → `.claude/skills/script-writer/SKILL.md`
   - the narration (own recording, a text-to-speech tool, or none) → `.claude/skills/voice-over/SKILL.md`
   - music and effects → `.claude/skills/sound-design/SKILL.md`
   - drawing a film's scenes in code, or briefing helper agents → `.claude/skills/art-modules/SKILL.md`
   - before delivering a finished video → `.claude/skills/render-review/SKILL.md`
   - a lasting preference → `.claude/skills/style-note/SKILL.md`
   - missing tools, modules, a voice tool, render problems, updating → `.claude/skills/kit-setup/SKILL.md`
4. Before every video, read `STYLE.md` (its Author notes outrank everything) and, when writing, `SCRIPTING.md`. The
   engine's API is in `engine/CONTRACT.md`.
5. Snapshots and renders start a headless Chrome. If your sandbox blocks it, run them outside the sandbox or ask the
   user to run the command in a normal terminal.
6. The render review needs a second agent with a fresh context. If you can't start one, do the review yourself from
   the contact sheets, and tell the user it wasn't independent.
