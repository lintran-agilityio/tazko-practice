# Tazko

A kanban work tracker that one group runs for several of its companies. Each company sees only its own boards.

This is a practice project built with Claude from a prototype. It contains no real project or client data.

## Where things are

| Path | What it is |
|---|---|
| `plan/PLAN.md` | The build plan: decisions, data model, 20 small milestones, release rules |
| `design/` | Prototype source (`prototype/`), `tokens.css` and a screen index: the visual reference |
| `src/` | The React app |

Prototype: https://claude.ai/artifact/UNoNKZwkCss9hrxUqEKrk5

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

## Sign in (local setup)

Sign in shows a hint, "Use your company account", when the email is outside your company domains. Set them in `.env`:

```bash
VITE_ALLOWED_EMAIL_DOMAINS=yourcompany.com   # comma separated; also VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
```

Vite reads `.env` only when the dev server starts, so restart `npm run dev` after editing it. If the variable is missing or empty the hint is off and the dev console warns once. The hint is only a convenience: the database refuses other domains at sign in and on every request (G-20).

## Database tests

The database tests run against a local Supabase. From a clean clone:

```bash
cp .env.example .env
npm run db:start
npx supabase status -o env   # copy the keys into .env
# set SEED_USER_PASSWORD in .env (upper, lower, digit and symbol)
npm run db:seed
npm run test:db
```

`npm run db:reset` re-applies the migrations and empties the data; run `npm run db:seed` afterwards.

## Working on a milestone

`main` is the release branch. One milestone is one branch cut from `main`, one pull request back into it and one release tag. Read the milestone in `plan/PLAN.md`, build it, run `typecheck`, `lint` and `test`, then open the pull request.
