---
name: ticket-to-pr
description: Take one ticket (milestone, issue or task) to one pull request with two human gates and at most two test-fix rounds. Use when asked to implement, ship or work a ticket/milestone end to end.
---

# Ticket to PR

One ticket -> one branch -> one pull request. Keep it small; do not widen scope.

## Steps

1. **Read** the ticket (issue number, or milestone in `plan/PLAN.md`). List acceptance criteria and files likely touched. Do not start on more than one ticket.
2. **Plan** in <=10 lines: approach, files, tests.
3. **GATE 1 - human approves the plan.** Stop and ask. No code before approval. Apply requested changes to the plan and re-ask only if it changed materially.
4. **Branch** from up-to-date `dev`: `<ticket-id>-<slug>` (e.g. `m7-create-and-move-cards`).
5. **Implement** only what the plan says. Commit in small steps.
6. **Test-fix loop (max 2 rounds):**
   - Round 1: run lint, typecheck and tests. If they fail, fix the cause.
   - Round 2: re-run. If they still fail, fix once more and re-run.
   - After round 2, if still red: STOP. Do not try a third time. Report failing output, suspected cause and options to the human.
7. **Open PR** (one only) into `dev`: summary, link to ticket, test results, known gaps. Do not merge.
8. **GATE 2 - human reviews the PR.** Stop and wait. Address review comments as new commits on the same PR; do not open another PR. Merge into `dev` only when the human says so. Merging `dev` into `main` and tagging the release happen later, on the human's say-so.

## Rules

- Exactly two human gates: plan approval (before code) and PR review (before merge). Never skip or self-approve.
- Test-fix rounds are capped at 2 in total, not per failure. Never weaken or delete tests to get green.
- One ticket = one PR. Out-of-scope findings go in the PR description as follow-ups.
- Be terse in updates; no recaps of what the diff shows.
