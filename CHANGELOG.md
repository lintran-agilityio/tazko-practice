# Changelog

## v0.3.0 - 2026-11-27

- M3: sign in with email. Sign in screen (email and password, domain hint "Use your company account", sign out); route guard that returns to the requested page (`/accept-invite` stays open); navigation footer with the person and role chip; access token hook that refuses sign-in and token refresh when the email domain is not allowed (G-20, TP-13); profile row for new users; `restore_membership` re-checks the Owner role under a lock; plan notes for M7b and M9; 172 tests pass (#27, #28, #29, #30, #31, #148, #183, #184, PR #182, PR #185, PR #186).

## v0.2.1 - 2026-11-27

- M2b: seed and isolation tests. `npm run db:seed` loads allowed domains, 2 companies and 4 users (local Supabase only); 14 isolation tests through supabase-js with real signed-in users; CI starts Supabase and runs the database tests in their own Vitest project; 104 tests pass (#23, #24, #25, #26, PR #180).

## v0.2.0 - 2026-11-26

- M2: database, roles and isolation. Local Supabase stack; companies, profiles, memberships, allowed domains and admin sessions with RLS on every table; company email guard (G-20); archive and restore membership RPCs, last-Owner guard and no DELETE grants (G-19); safe default grants for later tables; password rules and signup off; 82 database tests run in CI (#177, PR #178).

## v0.1.0 - 2026-11-25

- M1: scaffold and app shell. Vite, React, TypeScript and Tailwind project; CI for lint, typecheck and tests; side navigation with 14 placeholder routes, `/accept-invite` outside the shell and a phone drawer; Tazko Indigo tokens with self-hosted Hanken Grotesk and DM Mono (#12, #13, #14, #15, #16, PR #173).
