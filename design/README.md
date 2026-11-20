# Design

Visual reference for Tazko. Not part of the app build (the format hook skips `design/`).

## Precedence rule
**`plan/PLAN.md` wins over the prototype.** The prototype shows look and layout; the plan and decisions G-1..G-21, UX-1..UX-6 define behavior. If they differ, follow the plan and note the difference in the PR. If the plan is silent, add an open question and ask (rule 6 in CLAUDE.md).

## Contents
- `tokens.css`: colors, fonts, radii (mirrors `src/index.css`).
- `prototype/`: source of the 19-board Design canvas, one `.dc.html` per screen, plus `canvas.json` (layout and notes).
  Live version: https://claude.ai/artifact/Ha2bdKWHPDVHFZVPLcqXxF#page-dcb81aee8d83
  The files use a runtime (`support.js`) that is not stored here, so open the live link to see them rendered. Read the HTML for exact styles and copy.

## Screen index
| Screen | File |
|---|---|
| Sign in (company address only, G-20) | prototype/Main.dc.html |
| Accept invite | prototype/AcceptInvite.dc.html |
| Profile | prototype/Profile.dc.html |
| Home | prototype/Home.dc.html |
| Board | prototype/Board.dc.html |
| Card detail | prototype/CardDetail.dc.html |
| Board as list | prototype/BoardList.dc.html |
| Search | prototype/Search.dc.html |
| Notifications | prototype/Notifications.dc.html |
| Members | prototype/Members.dc.html |
| Labels | prototype/Labels.dc.html |
| Project settings | prototype/ProjectSettings.dc.html |
| Companies (Super admin) | prototype/Companies.dc.html |
| Company detail (Super admin) | prototype/CompanyDetail.dc.html |
| Usage (Super admin) | prototype/Usage.dc.html |

Extra sample boards (seed data, not screens): `BoardFinance`, `BoardPeople`, `BoardWebsite`.
Prototype tools (not an app screen): `PrototypePanel`, with the scenario, latency and fault matrix used in M20 (6 scenarios, 4 latencies, 7 faults including 400 Bad request). In the panel, the Archived project scenario stands in for the Owner's Archived list (G-19).
