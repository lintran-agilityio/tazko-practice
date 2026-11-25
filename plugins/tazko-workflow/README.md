# tazko-workflow

Agents: `planner`, `reviewer`, `security` (read-only, Opus). Command: `/next`. Skills: `blueprint`, `prototype-artifact` (ticket flow moved to `product-flow:ticket-flow`). Hooks: `guard` blocks .env access, design/ edits, force push, --no-verify, and commits on main/dev; asks before pushing to main/dev; `format` runs prettier/ruff on edit (skips `design/`).

Install: `/plugin marketplace add .` then `/plugin install tazko-workflow@tazko-local`.

Not included (plugins cannot ship them): permission rules in `.claude/settings.json` and `CLAUDE.md`. Disable the repo-local `.claude/` copies of agents, skills and the hook once the plugin is installed, to avoid duplicates.
