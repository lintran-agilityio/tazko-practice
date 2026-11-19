---
name: prototype-artifact
description: Build a clickable prototype as an Artifact before real code. Use when the user asks to prototype, mock up, or sketch a screen or flow, or asks whether to prototype with the real front end instead. Covers scenarios, latency, faults, failure wording, and when to switch to the real front end.
---

# Prototype artifact

Goal: a single-file HTML Artifact that lets the user click through a flow and feel how it behaves, including slow and broken paths. Load `artifact-design` before writing. Publish with the Artifact tool.

## 1. Scenarios
- Put a small "Scenario" switcher (top bar or side panel) in the page. One prototype, many states.
- Always include: **Happy path**, **Empty** (no data), **Loading**, **Error**, **Permission-limited** (e.g. Observer: read-only, controls hidden/disabled with a reason).
- Use the seed personas from `plan/PLAN.md` (G-8): Linh (Super admin), Minh (Owner), Hoa (Member), Khoa (Observer). A role switcher counts as a scenario.
- Each scenario sets state only; no screen forks. Keep sample data in one JS object.

## 2. Latency
- Wrap every fake request in `await delay(ms)`; never respond instantly.
- Provide a latency control: Instant / Normal (~400 ms) / Slow (~2 s) / Very slow (~8 s).
- Show real loading UI (skeleton or spinner) and disable the triggering control while pending, so double-submit is visible.
- Slow-path check: after ~5 s show a "Still working…" hint.

## 3. Faults
- A fault control injects failures on the next/every request: **Network offline**, **Timeout**, **Server error (500)**, **Validation error (422, per-field)**, **Forbidden (403)**, **Not found (404)**, **Conflict (409, stale edit)**.
- Mutations: show optimistic UI, then roll back visibly on fault.
- Every fault must leave the user a way forward (Retry, Back, Edit and resubmit). No dead ends.

## 4. Failure wording
- Say what happened, why if known, and what to do next. Plain language, no codes or stack text.
- Keep the user's input; never clear a form on error.
- Patterns (adapt to the product's tone):
  - Offline: "You're offline. Your changes are saved here and will send when you're back." / [Retry]
  - Timeout: "This is taking longer than usual. Try again." / [Retry]
  - 500: "Something went wrong on our side. Your work is safe. Try again in a moment." / [Retry]
  - 422: field-level, specific: "Project name is required." Not "Invalid input."
  - 403: "You can view this but not change it. Ask an Owner for access."
  - 404: "This card was moved or deleted." / [Back to board]
  - 409: "Someone else changed this card. Reload to see their version." / [Reload] [Keep mine]
- Destructive confirms name the object (G-5: type the project name to archive/delete).
- Put all strings in one `COPY` object so wording is reviewable in one place.

## 5. When to prototype with the real front end instead
Default to an Artifact for exploring; switch to the real React + Tailwind app (`src/`) when any of these hold:
- The flow is already decided and the Artifact would be throwaway work duplicating the build.
- It depends on real behavior: Supabase auth, RLS/permissions, real data shapes, routing, or actual latency/errors from the API.
- The UI uses existing components/design tokens, so the prototype would drift from them.
- It needs more than a few screens of state, or drag-and-drop/keyboard/accessibility fidelity.
- Stakeholders only need a screenshot of one state: build it in the app behind a mock layer.

Stay with an Artifact when: the flow or wording is still open, you want quick user feedback on options, or you need to share a link without running the repo.

If switching, port the scenario/latency/fault controls as a dev-only mock layer (e.g. a mocked API client toggled by a query param), not as production code.

## Checklist before publishing
- [ ] Scenario switcher covers happy/empty/loading/error/restricted
- [ ] Latency control works and loading UI shows
- [ ] Each fault has a recovery action
- [ ] All wording in `COPY`, no raw codes
- [ ] Works at phone width; light and dark
