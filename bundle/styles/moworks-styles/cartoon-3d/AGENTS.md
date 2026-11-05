# Instructions for AI coding agents (Codex, Cursor, Gemini CLI, Windsurf, …)

This kit is built for Claude Code, but any agent that can read files and run terminal commands can use it.
1. Read **`CLAUDE.md`**: your role, the look, the tool check, the skills, the rules and the folder map. Everything in it
   applies to you.
2. At the start of every project, run `node tools/doctor.mjs`. If anything is missing, ask the user to install it
   (CLAUDE.md → "First: check the tools"), and continue only when it says ready.
3. The "skills" are Markdown playbooks. Open the one that matches the task and follow it (check
   `kit.config.json → modules` first):
   - any 3D cartoon video or clip, or notes on one → `.claude/skills/cartoon-video/SKILL.md` (and its `references/`)
   - a 9:16 story short → `.claude/skills/cartoon-shorts/SKILL.md`
   - a 16:9 What-If piece or episode → `.claude/skills/cartoon-whatif/SKILL.md`
   - ideas, titles, descriptions, tags → `.claude/skills/idea-lab/SKILL.md`
   - a new character, prop or set → `.claude/skills/character-builder/SKILL.md`
   - before delivering a finished video → `.claude/skills/render-review/SKILL.md`
   - music (only when asked) → `.claude/skills/original-music/SKILL.md`
   - missing tools, modules, a voice MCP, WebGL errors, updating → `.claude/skills/kit-setup/SKILL.md`
   - a lasting preference → `.claude/skills/style-note/SKILL.md`
4. Before every video, read `.claude/skills/cartoon-video/references/STYLE.md`.
5. The render review needs a second agent with a fresh context. If you can't start one, do the review yourself from
   the frame sheets, and tell the user it wasn't independent.
