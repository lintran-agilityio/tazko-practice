# Taskboard Prototype Review: M1 to M3

Written for: the project owner, who reviews each milestone PR.

Sources: `plan/PLAN.md` as it stands on `origin/dev` (includes grill round 2, safety lessons, prototype panel and optimistic updates), the UX-1 to UX-6 update on the current branch, `design/prototype/*.dc.html`, `design/prototype/canvas.json`, current `src/`. PLAN.md wins on conflict (design/README.md).

Verified against the repo on 2026-11-18: typecheck passes, lint is clean, `npm test` fails (see I15). Every claim in section 2 was checked in the files or with git, as noted per row.

> **Update 2026-11-19.** The planning review changed M2 and M3. M2 is split into M2 and M2b, signup is off (Q13), and G-19 (no permanent delete) applies from M2. PLAN.md has the current tasks, API surface and Q13 to Q19; the M2 and M3 tickets below are kept as history, with the changes noted per ticket.

> **Source warning.** The link first given for this review (claude.ai/artifact/Cg4aNRWh4s3pfaZjFWGo15) is an empty public artifact titled "Mokio Prototype". It is not Tazko. The real prototype is Np7KMP6A6CyZXwkT5o23Vc. It was not fetched. This review reads its saved source in `design/`.

## 1. Requirements (M1 to M3)

| ID | Requirement | Source |
|---|---|---|
| R1 | App shell: left nav plus one placeholder route for each of the 14 screens. Sign in has no shell (split layout). | M1, Main.dc.html |
| R2 | Tazko Indigo tokens: colours, Hanken Grotesk, DM Mono, radii. | M1, tokens.css |
| R3 | CI runs lint, typecheck and tests on every PR. | M1 |
| R4 | Local Supabase with migrations, `.env.example`, one-command seed (2 companies, 4 users). | M2, G-8 |
| R5 | Tables: companies, profiles, memberships. Role enum owner, member, observer. `is_super_admin` flag. | M2 |
| R6 | RLS helpers: is_member, role_of, is_super_admin. Company isolation enforced in the database (T-1). | M2 |
| R7 | A Super admin reads company-level tables only (companies, memberships). Later tables stay closed outside Open as Owner. | M2, G-14 |
| R8 | DB tests prove cross-company reads fail and an Observer cannot write (BR-3). | M2 |
| R9 | Email and password sign in and sign out. Profile row created on sign up. | M3, G-11 |
| R10 | Signed-out visitors are redirected to Sign in from every route. | M3 |
| R11 | The signed-in person and their role chip sit at the bottom of the left nav. | M3 |
| R12 | Prototype look: 44px inputs, labelled fields, real buttons (the prototype uses `<a>` for its buttons, which is wrong for a form). | Main.dc.html, M20 a11y |

Seed (G-8): Linh is Super admin. Minh is Owner of Harbor Logistics and Northwind Foods. Hoa is a Member and Khoa an Observer, both in Harbor Logistics.

## 2. Issues

### Resolved by grill round 2

| # | Issue | Resolution |
|---|---|---|
| I1 | G-14 to G-18 existed only in `canvas.json`. | Now in PLAN.md. |
| I2 | Super admin scope conflicted (read everything vs company-level only). | G-14: company-level figures only. Boards and cards only via Open as Owner. |
| I3 | No-delete (G-15) conflicted with M16 delete. | G-15 wins. M15 is "Create and edit projects", M16 is "Archive project". |

### Still open

| # | Severity | Issue | Impact | Proposal |
|---|---|---|---|---|
| I4 | Med | The M2 Observer-write test has no card or board tables until M6. | It can only cover companies, profiles and memberships. | Test those now. Add card-write tests in M6 and M7 (BR-3). |
| I5 | High | Users could change their own `is_super_admin` or `role`. Not in PLAN.md. | Privilege escalation. | Added to M2 in PLAN.md (task and test). Run the `security` agent on M2. |
| I6 | Med | Prototype Sign in has Google first and email second. M3 ships email only. | M3 differs from the prototype. | Email is the primary button in M3, no Google button. M5 restores the layout. Note it in the PR. |
| I7 | Med | The prototype has no sign-up, forgot-password or error states. | M3 needs wording for wrong password, offline and expired session. | Use the M20 fault-matrix wording. Record it in the PR. |
| I8 | Med | The app has no router and no CI. Fonts and DM Mono are not loaded. | M1 has real work left. | See the M1 tickets. |
| I9 | Resolved locally | Resolved on local `dev` (not pushed): `dev` now contains `origin/main`, `chore/claude-permissions`, grill round 2, safety, panel and optimistic updates, with `plan/PLAN.md` reconciled (G-1 to G-18, UX-1 to UX-6, Q1 to Q11, rules 1 to 10). CLAUDE.md rule 2 and rule 9, and PLAN.md rules and "How to release and manage", now say milestone branches start from dev and merge into dev, and dev is merged into main for each release (Q11 decided). The prototype change log moved to `plan/PROTOTYPE-CHANGELOG.md` because `design/` is write-protected. The original finding follows. The plan history had forked. `origin/dev` holds grill round 2 (G-14 to G-18), safety lessons, prototype panel and optimistic updates. The current branch holds UX-1 to UX-6, the design handoff, the prettier hook and permission rules. Neither has the other's commits. Since the first check, `origin/main` (f5b3260) gained UX-1 to UX-6 through PR #6, but it still lacks everything on dev; local `main` (396d1ef) is behind origin. Verified: `git merge-tree` reports a `plan/PLAN.md` conflict both ways, and `git merge-base --is-ancestor` shows UX-1 to UX-6 is not in dev. | Starting M1 from main gives a plan without G-14 and without UX-1 to UX-6. Rule 2 says branch from main, but dev is where the plan lives. | None; done on dev. |
| I10 | Low | Doc wording: PLAN.md line 6 says "7 UX fixes (decisions UX-1 to UX-5)". The count and the range do not match. | Minor confusion. The other two counts I first flagged are correct: UX-6 is a quality gate, so "UX-1 to UX-5" on line 405 is right, and `canvas.json` has 18 boards. | Haiku fixes line 6 only. |
| I11 | Med | A role chip is per company, but the switcher arrives in M4. | M3 must pick a company. | Use `profiles.last_company_id`, else the first membership. A Super admin with no membership shows "Super admin". |
| I12 | Low | Seed users need passwords. | Conflicts with "never commit secrets". | Use a dev-only password from the local env. Document it in the README. |
| I13 | Med | G-14 says a Super admin sees "people", but the M2 task names only companies and memberships. | Company detail shows names, which live in profiles. | Decide in Q10. |
| I14 | Low | M2 now has 6 tasks in PLAN.md, over the "about 5" rule. | Milestone size. | Merge the G-14 policy task into the RLS task, as in the tickets below. |
| I15 | High | `npm test` fails on the current code. Vitest 5.1.0 reports `TypeError: Cannot read properties of undefined (reading 'config')` and runs no tests. A trivial test with no plugins and no setup file fails the same way, so the cause is the runner, not the app or its config. `--pool=forks` and `--pool=threads` fail. `--pool=vmThreads` passes (1 test). Node 22.20.0, vite 8.3.8; npm lists vitest 5.1.1 as latest. | The CI in M1-1 would be red on day one. CLAUDE.md rule 9 says main must always work. | Fix first in M1-1: try vitest 5.1.1, else set `pool: 'vmThreads'` in `vite.config.ts`. Confirm in the PR. |
| I16 | Med | `src/index.css` has 8 of the tokens in `design/tokens.css`. Missing: amber, blue, green, neutral soft and strong pairs, column, field-border, both font families, four radii and `--tap-min`. No font is loaded in `index.css` or `index.html`. | M1-2 is bigger than "add radii and fonts". | Copy the full token set (M1-2). |
| I17 | Low | Dev's Safety section adds a trust ladder and stop conditions for the autonomous build. | They govern how unattended M1 to M3 may run. | Read them before M1. They are not in the tickets. |

## 3. Open questions

Q1 to Q4 are unchanged. PLAN.md Q5 now means "can cards be removed, and what about a non-empty column" (before M7 and M15). The questions below start at Q6 so they do not clash.

| Q | Question | Recommendation | Needed before |
|---|---|---|---|
| Q6 | Which router? | Decided: React Router 7 (new dependency; installing it still asks permission). | Decided |
| Q7 | Self-signup or invite-only? | Decided: invite-only, by turning public signup off (Q13 in PLAN.md). | Decided |
| Q8 | How do DB tests run locally and in CI? | Vitest through supabase-js with real signed-in users against `supabase start`; a refused UPDATE changes 0 rows, not 403. CI starts Supabase. | M2 |
| Q9 | Self-host fonts with `@fontsource` or use the Google Fonts link? | Decided: self-host with `@fontsource`. | Decided |
| Q10 | May a Super admin read `profiles` (display name only) of a company's members? | Yes, through a view with display name only, not the full table. | M2 |
| Q11 | Which branch is the base for M1: `main`, or `dev`? Dev has the newest plan, but CLAUDE.md says branch from main. | Decided: work from `dev`; merge dev into main per release. CLAUDE.md and PLAN.md updated. | Decided |
| Q12 | What are the URLs of the 14 screens? PLAN.md is silent. | Decided: boards and cards use their database id (UUID), never a name. `/boards/:boardId`, `/boards/:boardId/list`, `/cards/:cardId`, `/settings/project`, `/companies/:companyId`, plus `/sign-in`, `/`, `/search`, `/notifications`, `/members`, `/labels`, `/profile`, `/companies`, `/usage`. | Decided |

## 4. Tickets

Sizes are S, M or L. One milestone is one branch, one PR and one tag.

### M1 Scaffold and app shell (`m1-scaffold-and-shell`, v0.1.0)

Prerequisite: the plan is reconciled on `dev` (I9). Q6, Q9 and Q11 are decided.

| ID | Ticket | Model | Size | Acceptance |
|---|---|---|---|---|
| M1-1 | Fix the test runner (I15) by trying `vitest@5.1.1` first (install asks permission); set `pool: 'vmThreads'` only if that still fails. Then add a GitHub Actions workflow running `npm ci`, lint, typecheck and test. | Sonnet | S | `npm test` passes locally and CI is green on the PR. |
| M1-2 | Tokens and fonts: copy the full token set from `design/tokens.css` (colours, radii, `--tap-min`, font families) and load DM Mono and Hanken Grotesk (I16). | Sonnet | S | Every token in tokens.css exists in `src/index.css`. Both fonts render. |
| M1-3 | Router and 14 placeholder routes: sign-in, profile, home, board, card detail, board list, search, notifications, members, labels, project settings, companies, company detail, usage. | Sonnet | M | Each route loads and has an H1. An unknown route shows a 404. |
| M1-4 | App shell: left nav with the prototype items, a reserved slot for the company switcher and the user footer. At phone width the nav becomes a drawer (button with `aria-expanded`, Esc and route change close it, focus returns to the button). Sign in renders without the shell. | Sonnet | L | The nav is keyboard-usable, the current page has `aria-current`, and the drawer works at phone width. |
| M1-5 | Route-table and shell tests. Open the app, visit every route and resize to phone width. Add CHANGELOG.md. | Haiku | S | The PR lists what was checked. |

### M2 Database, roles and isolation (`m2-database-roles-isolation`, v0.2.0)

Gate: Opus reviews the schema and policies first. Run the `security` agent on the diff. Settle Q8 and Q10.

Update 2026-11-19: M2-4 (seed) and M2-5 (isolation tests) move to M2b (`m2b-seed-and-isolation-tests`, v0.2.1). M2 gains `archived_at` on memberships, the `has_company_access` helper, the no-DELETE guard and TP-9 (see PLAN.md). This resolves I14.

| ID | Ticket | Model | Size | Acceptance |
|---|---|---|---|---|
| M2-1 | `supabase init` and `supabase start`. Migrations folder, `.env.example`, npm scripts `db:start`, `db:reset`, `db:seed`. Docker and Node 20 documented. CI starts Supabase. | Sonnet | M | A clean clone reaches a running DB with documented commands. |
| M2-2 | Migrations: `role` enum, companies, profiles (with `is_super_admin` and `last_company_id`), memberships (unique per company and user). Self-update of `is_super_admin` and `role` is blocked (I5). | Sonnet | M | A user cannot promote themselves. |
| M2-3 | RLS helpers `is_member`, `role_of`, `is_super_admin`, plus policies for the three tables. A Super admin reads companies and memberships only, and profiles per Q10 (G-14). | Sonnet | L | A member reads only their own companies' rows. A Super admin reads no table beyond those. |
| M2-4 | Seed for 2 companies and 4 users from G-8 with one command. Passwords come from the local env (I12). | Haiku | S | `npm run db:seed` is repeatable. |
| M2-5 | Isolation tests: Minh sees both companies, Hoa and Khoa see only Harbor, Linh sees company-level tables only, an Observer write is refused, and nobody can self-promote. | Sonnet | M | All pass locally and in CI. |

### M3 Sign in with email (`m3-sign-in-email`, v0.3.0)

Q7 is decided. M3 now depends on M2b. Public signup is off, so M3-2 covers users created by the seed or an invite, and its test creates users through the Auth admin API.

| ID | Ticket | Model | Size | Acceptance |
|---|---|---|---|---|
| M3-1 | Supabase client plus an auth provider that holds the session and handles an expired session. `@supabase/supabase-js` is a new dependency. | Sonnet | M | The session survives a reload. |
| M3-2 | Migration: a trigger creates a `profiles` row for each new `auth.users` row, with a test. | Sonnet | S | A new user gets a profile row. |
| M3-3 | Sign in screen per Main.dc.html: email and password in a real `<form>`, Enter submits, 44px fields, visible errors for wrong password, offline and server error (I6, I7). | Sonnet | M | A wrong password shows an inline message and keeps the focus. |
| M3-4 | Route guard and sign out: signed-out visitors go to Sign in and return to the page they asked for afterwards. | Sonnet | M | Deep links work after sign in. |
| M3-5 | Nav footer with the person's name and role chip (I11). | Sonnet | S | All four seed users show the right chip. |

Done check for M3: sign in and out as Linh, Minh, Hoa and Khoa in a browser, plus the error cases.
