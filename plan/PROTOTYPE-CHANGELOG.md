# Prototype change log

What changed in the prototype after the first build plan. Visual reference: `design/` (read-only). Live prototype: https://claude.ai/artifact/Np7KMP6A6CyZXwkT5o23Vc

## v22: grill round 2 decisions

The prototype was updated to match G-14 to G-18 in `plan/PLAN.md`.

| Screen | Change | Decision |
|---|---|---|
| Company detail | Text now says Super admin sees company-level figures only; boards and cards only via Open as Owner | G-14 |
| Project settings | Removed the Delete project button; archived projects are purged automatically after 30 days | G-15 |
| Board, Finance ops, People and onboarding, Website | Added a "+ New project" link on the Boards tab bar (Owner only) | G-16 |
| Usage | Removed the Export CSV button | G-18 |
| Canvas notes | Added G-14 to G-18 to the decisions note | all |

G-17 (description edits log who and when, not the text) affects the Activity log only and has no visible screen change.

## v24: prototype panel

The `Prototype panel` artboard simulates the backend with one fake API: 6 scenarios, 4 latency levels and 5 faults, plus a request log. See the "Prototype panel" section in `plan/PLAN.md`.

## v26: optimistic updates and faults

Changes are now optimistic with undo on failure, and the panel has 6 faults: Offline, Server error, Session expired, Forbidden, Not found and Conflict. Loading the board shows clear offline and session-expired screens.

## v36 (source only): plan alignment

Source in `design/` updated to match `plan/PLAN.md` (Q22 to Q28). The live canvas still needs the same edits and the new screens (see "Prototype to-do" in the plan).

| Screen | Change | Decision |
|---|---|---|
| Board | Removed Delete list; Archive list asks first and says a list with active cards cannot be archived; added Extend 2 hours next to Exit | UX-1, G-19, Q18 |
| Board, Board as list, sample boards | Removed the Filter button | Q23 |
| Home | Removed Add card | Q24 |
| Search | Removed the Type and Column chips | Q25 |
| Notifications | Removed the description edit and move rows; Unread is 2 | Q26 |
| Labels, Card detail | Delete became Archive | G-19 |
| Project settings | "Purged automatically" became "locked and kept" | G-15, G-19 |

Not drawn yet: Boards page with Archived tab, Members Archive, Restore and Revoke, column editing in Project settings, New company form, Sign in offline, expired and rate-limit states.
