# Instructions for AI coding agents (Codex, Cursor, Gemini CLI, Windsurf, …)

This kit is built for Claude Code, but any agent that can read files and run terminal commands can use it.
1. Read **`CLAUDE.md`**: your role, the two styles, the tool check, the rules and the folder map. Everything in it
   applies to you.
2. At the start of every project, run `node tools/doctor.mjs`. If anything is missing, ask the user to install it
   (CLAUDE.md → "First: check the tools"), and continue only when it says ready.
3. The "skills" are Markdown playbooks. Open the one that matches the task and follow it:
   - a Stickman Explainer video, or notes on one → `.claude/skills/stickman-explainer/SKILL.md` (and its `references/`)
   - an Inner Voice Short, or notes on one → `.claude/skills/inner-voice-short/SKILL.md` (and its `references/`)
   - music (only when asked) → `.claude/skills/original-music/SKILL.md`
   - missing tools, something broken, finishing the setup, updating → `.claude/skills/kit-setup/SKILL.md`
   - a lasting preference → `.claude/skills/style-note/SKILL.md`
4. Before every video, read that style's `references/` (STYLE first).
