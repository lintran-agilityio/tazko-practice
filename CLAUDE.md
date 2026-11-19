# Tazko

Kanban work tracker for one group running several companies. Source of truth: [plan/PLAN.md](plan/PLAN.md) (20 milestones, decisions G-1..G-13, UX-1..UX-6, open questions Q1..Q4). Visual reference: `design/`.

## Stack
React 19 + TypeScript + Tailwind 4 (Vite); Supabase (Postgres, Auth, Row Level Security). Look: Tazko Indigo, Hanken Grotesk, DM Mono.

## Commands
- `npm run dev` - dev server
- `npm run typecheck` - `tsc -b`
- `npm run lint` - oxlint
- `npm test` - vitest (includes DB isolation tests from M2 on)

## Workflow rules
1. Work only in this repo. Never touch client code.
2. One milestone = one branch (`m7-create-and-move-cards`, from main) = one PR = one release tag (named in the milestone).
3. Before starting, re-read the milestone and G-1..G-13, UX-1..UX-6. Keep milestones small (about 5 tasks max); split if larger.
4. Before saying done: run typecheck, lint, all tests; for screen changes open the app in a browser and use it (menus, forms, keyboard, error cases). Record what was checked in the PR. Never end with "not tested".
5. PR lists what was built, assumptions, anything unfinished. Then stop and wait for review. After merge: tag release, add a line to CHANGELOG.md. Do not start the next milestone until told.
6. If the plan is silent or rules conflict, add to the open questions and ask. Do not guess.
7. Code, comments, docs and commit messages in English.
8. Never commit secrets. Only `.env.example`.
9. main must always work: merge only when typecheck, lint, tests pass.

## Product invariants
- Company isolation is enforced by RLS in the database, not by screens (T-1).
- Roles: Owner (manage everything in company), Member (create/edit/move cards, comment), Observer (read-only; can be assigned, G-3). Super admin reads all, manages companies/usage; Open as Owner via banner, logged with `acting_as_super_admin` (G-6).
- Moving a card changes `column_id` only (BR-1). Archived project is read-only, restorable 30 days (BR-2). Archive/delete needs typing the project name (G-5).
- Activity is written by DB triggers (G-4).
- Observers: hide write controls AND block writes in the database (BR-3).

## Models
Opus advises/reviews (never writes code), Sonnet builds, Haiku does mechanical work (seed data, renames, docs, tests). Minimize tokens.

## Agents
Read-only subagents in `.claude/agents/`: `planner`, `reviewer`, `security`.

## Hooks
`.claude/hooks/format.mjs` formats on edit (ruff for `.py`, prettier for web files); skips `design/`.
