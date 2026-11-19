# Tazko

Kanban work tracker for one group running several companies. Source of truth: [plan/PLAN.md](plan/PLAN.md) (29 milestones, decisions G-1..G-20, UX-1..UX-6, questions Q1..Q20). Visual reference: `design/`.

## Stack

React 19 + TypeScript + Tailwind 4 (Vite); Supabase (Postgres, Auth, Row Level Security). Look: Tazko Indigo, Hanken Grotesk, DM Mono.

## Commands

- `npm run dev` - dev server
- `npm run typecheck` - `tsc -b`
- `npm run lint` - oxlint
- `npm test` - vitest (includes DB isolation tests from M2 on)

## Workflow rules

1. Work only in this repo. Never touch client code.
2. One milestone = one branch (`m7-create-cards`, from `dev`) = one PR into `dev` = one release tag (named in the milestone). `dev` is the integration branch; merge `dev` into `main` and tag on `main` for each release.
3. Before starting, re-read the milestone and G-1..G-20, UX-1..UX-6. Keep milestones small (about 5 tasks max); split if larger.
4. Before saying done: run typecheck, lint, all tests; for screen changes open the app in a browser and use it (menus, forms, keyboard, error cases). Record what was checked in the PR. Never end with "not tested".
5. PR lists what was built, assumptions, anything unfinished. Then stop and wait for review. After merge: tag release, add a line to CHANGELOG.md. Do not start the next milestone until told.
6. If the plan is silent or rules conflict, add to the open questions and ask. Do not guess.
7. Code, comments, docs and commit messages in English.
8. Never commit secrets. Only `.env.example`.
9. `dev` and `main` must always work: merge only when typecheck, lint, tests pass.

## Product invariants

- Company isolation is enforced by RLS in the database, not by screens (T-1).
- Roles: Owner (manage everything in company), Member (create/edit/move cards, comment), Observer (read-only; can be assigned, G-3). Super admin reads company-level data only (G-14) and manages companies/usage; Open as Owner via banner, logged with `acting_as_super_admin` (G-6).
- Moving a card changes its column and position on the same row, never a copy (BR-1). An archived project leaves the boards, is restorable 30 days, then locked and kept (BR-2). Archiving needs typing the project name (G-5).
- Nothing is permanently deleted in the database: `archived_at` everywhere, DELETE revoked, reads return active rows only (G-19).
- Activity is written by DB triggers (G-4).
- Observers: hide write controls AND block writes in the database (BR-3).
- Only company email addresses can sign in or be invited. The database refuses other addresses at creation, at every sign-in and token refresh, and on every read and write, so removing a domain locks its people out at once. The real domain stays in the local environment, not in the repo (G-20).

## Models

Opus advises/reviews (never writes code), Sonnet builds, Haiku does mechanical work (seed data, renames, docs, tests). Minimize tokens.

## Agents

Provided by the `tazko-workflow` plugin (`plugins/tazko-workflow/`, install via `.claude-plugin/marketplace.json`). Read-only subagents: `planner`, `reviewer`, `security`.

## Hooks

Plugin hooks: `format.mjs` formats on edit (ruff for `.py`, prettier for web files); skips `design/`.
