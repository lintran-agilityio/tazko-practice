# Tazko

A kanban work tracker that one group runs for several of its companies. Each company sees only its own boards.

This is a practice project built with Claude from a prototype. It contains no real project or client data.

## Where things are

| Path | What it is |
|---|---|
| `plan/PLAN.md` | The build plan: decisions, data model, 20 small milestones, release rules |
| `design/` | Prototype source (`prototype/`), `tokens.css` and a screen index: the visual reference |
| `src/` | The React app |

Prototype: https://claude.ai/artifact/Np7KMP6A6CyZXwkT5o23Vc

## Stack

React, TypeScript and Tailwind, built with Vite. Vitest for tests and oxlint for linting. Supabase (Postgres and Auth) is added in milestone M2.

## Getting started

Requires Node.js 20 or newer.

```bash
npm install
npm run dev
```

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Typecheck and build for production |
| `npm run typecheck` | Check types only |
| `npm run lint` | Run oxlint |
| `npm test` | Run the tests once |
| `npm run test:watch` | Run the tests in watch mode |

## Working on a milestone

`main` is the release branch. One milestone is one branch cut from `main`, one pull request back into it and one release tag. Read the milestone in `plan/PLAN.md`, build it, run `typecheck`, `lint` and `test`, then open the pull request.
