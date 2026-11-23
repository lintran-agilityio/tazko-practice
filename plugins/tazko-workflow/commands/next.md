---
description: Find the next milestone in plan/PLAN.md and produce its blueprint. Plans only; stops for approval.
argument-hint: "[milestone id, e.g. M7]"
---

Next milestone: $ARGUMENTS

1. If no id is given, pick the first milestone in `plan/PLAN.md` that has unchecked tasks and whose "Depends on" milestones are done (release tag exists in `git tag`, line in `CHANGELOG.md`). If the previous milestone's PR is not merged and tagged, say so and stop.
2. Run `git status` and `git branch --show-current`. If the tree is dirty or `dev` is behind, report it and stop.
3. Find the GitHub issue for the milestone (`#n`). If none exists, say so and ask before creating one.
4. Use the `blueprint` skill on that milestone.
5. Stop after the blueprint. Do not create a branch or write code until the human approves, then continue with `product-flow:ticket-flow`.
