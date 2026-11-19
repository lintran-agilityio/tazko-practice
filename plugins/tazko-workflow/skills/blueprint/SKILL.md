---
name: blueprint
description: Turn one milestone from plan/PLAN.md into an implementation blueprint (scope, files, steps, tests, risks, open questions) before any code. Use when asked to blueprint, plan or scope a milestone, or as the plan step before ticket-to-pr.
---

# Blueprint

Read-only. Produces a plan; writes no code and edits no files.

## Steps

1. **Pick one milestone.** If none is named, ask. Never blueprint more than one.
2. **Delegate** to the `planner` agent with the milestone id. It reads the milestone, its dependencies, G-1..G-18, UX-1..UX-6, relevant open questions, and the current code.
3. **Size check.** More than about 5 tasks: propose a split into smaller milestones instead of one big blueprint.
4. **Return the blueprint** in this shape:
   - **Goal**: one line, plus acceptance criteria from the milestone.
   - **Branch / tag**: `mN-slug` from `dev`, and the release tag the milestone names.
   - **Steps**: ordered, <=5, each with the files it touches.
   - **Tests**: unit and UI checks; RLS isolation tests wherever data is touched; Observer write-block (BR-3) when writes exist.
   - **Invariants touched**: which G/UX/BR decisions apply and how they are respected.
   - **Risks**.
   - **Open questions**: anything the plan is silent on or conflicting. List it; do not guess (add to PLAN.md open questions after the human answers).
5. **Stop.** Wait for the human to approve. Hand off to `ticket-to-pr` only when told.

## Rules

- No code, no commits, no branch creation.
- Be terse: bullets, no recap of the plan text.
