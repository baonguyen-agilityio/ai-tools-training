# Day 15 — Review, merge, demo, final checkpoint

## Checkpoint
Final checkpoint.

| Item | Status | Evidence |
|---|---|---|
| Capstone shipped end to end | met | release `v1.0.0` on a0bc235 (REQ-002 monthly budget), published 2026-11-03 07:35:01Z |
| Day 3: reproduce as a failing test | met | day-03: "test: reproduce BUG-001 empty second page", red before fix |
| Day 3: fix on a branch with a test | met | #9 |
| Day 3: self-contained PR description | met | #9 body (What / Why / How tested / Risk), Drive day-03 |
| Day 3: review with ≥3 actionable comments and replies | met | #9: 3 inline `/review-checklist` comments, each answered "Addressed in <sha>" |
| Day 3: merge with a conflict | met | #9 rebased over `hasMore` on the same line, CI green |
| Day 6: two parallel sessions, both merged | met | #16, #17 via `claude --worktree` |
| Day 6: plan-mode change steered via diff comment | met | #11 |
| Day 6: one artifact | met | PR #16 walkthrough artifact (day-06) |
| Day 6: one Remote Control steer | met | `/rc` on the BUG-003 session, steer from the phone (day-06) |
| Day 6: one `/loop` run | met | `/loop 2m` on PR #16 CI |
| Day 11: skill + hook | met | #19, #22 |
| Day 11: MCP end to end | met | #20 |
| Day 11: review report acted on | met | #26 |
| Day 11: role day, Claude in Chrome QA | met | 2026-10-21 session, 5/5 pass (`day11-qa-report.md`) |
| Day 11: role day, browser-pane preview loop | met | #28 |
| Day 15: Remote Control | skipped | by choice; already practised on Day 6 |

## Cross-review (BA / QA / dev roles)
- Main was reviewed against `docs/specs/REQ-002-budget.md` and `REQ-002-test-matrix.md` from BA, QA and dev roles. No spec mismatches found on main.
- Test gaps filed as issues, label `test-gap`:
  - #47 `d-AC9` phone-width test cannot fail.
  - #48 budget e2e tests leave saved months behind and fail on rerun/retry.
  - #49 stale-response e2e checks rely on a fixed 50 ms sleep.
  - #50 #44 paths untested (other-month add with failed summary, failed delete).
- One bug, #51: a failed `GET /api/budget` after a month change left the previous month's values in the form with no error; Save then overwrote the new month's saved budget and reported `Saved for <month>.` Silent data loss.
- #51 was reproduced before filing: a scratch Playwright probe against `npm start` with temp `EXPENSES_FILE` / `BUDGETS_FILE` and the GET routed to 500 captured the stale form, the PUT body and the stored result. No repo changes.

## Fix #51 (#52)
- New rule R43: when `GET /api/budget` fails, the form is cleared, the error shows in `budget-error`, `budget-source` / `budget-saved` are hidden, and `budget-save` is disabled until a later load succeeds. The `budgetSeq` guard still drops a stale failure for an older month.
- Tests in `e2e/budget.spec.js`, red before the fix:
  - `d-AC10` failed load → empty form, error, Save disabled, Enter sends no PUT, no `pageerror`.
  - `d-AC10b` later successful load re-enables Save and hides the error.
  - `d-AC10c` failed load answered after a month change is dropped.
  - `d-AC10d` failed reload after a successful save (on `2027-09`) clears the form and blocks Save.
- `/review-checklist`: approve. Acted on two items in 0422c00: added `d-AC10d` for the post-save reload path, and replaced the fixed 100 ms wait before the "no PUT" check with a `fetch` round-trip, so ordering is explicit with no fixed sleep. Left as nits: empty picker keeps Save enabled (pre-existing), a failed reload after a successful save replaces `Saved for` with the load error.
- GitHub `claude-review`: "No issues found."
- Commits ffaeba8 (fix), 0422c00 (test). PR body: `npm test` 120/120, e2e 58/58. CI unit, e2e, claude-review green. Merged 07:32:01Z as a0bc235.

## Release v1.0.0
- Tag `v1.0.0` on a0bc235, title "v1.0.0 — Monthly budget with warning", published 07:35:01Z. Body is the client release notes from #45 (`docs/release-notes/REQ-002.md`).
- The notes predate the #51 fix: "Fixed before release" lists the three #44 fixes only, not R43.

## Demo
- Walkthrough artifact: https://claude.ai/artifact/DNzcVL1paigVE4Yb2EoVr4
- Review of the artifact caught a factual error, "17 PRs"; corrected before the demo.

## Retro
- 8 issues, label `retro`, assigned to baonguyen-agilityio, covering CLAUDE.md, skills, hooks and the review checklist:
  - #53 shared e2e port 3100 — wait, never change or kill.
  - #54 a session never merges its own PR; never commit `plans/`.
  - #55 from-issue fix flow in `fix-ticket`.
  - #56 rebase-after-merge skill for parallel-wave PRs.
  - #57 close known `guard-never-rules.js` bypasses.
  - #58 review checklist — async staleness and test determinism.
  - #59 review checklist — spec traceability.
  - #60 edit files with Edit/Write, not shell redirects.
- The merge rule is worded "a session never merges its own PR", not "Claude never merges": a lead session may merge another session's PR after CI is verified, as on Day 14.

## Personal playbook
- Draft artifact: https://claude.ai/artifact/SUKZkxhH3WXCAgPUe44uSt

## Lessons
- Reproduce a bug before filing it; the probe output becomes the ticket's evidence.
- A cross-review that finds no spec mismatch can still find test gaps; file them, do not fix them in passing.
- A negative check ("no PUT") needs an ordering point, not a sleep.
- Release notes go stale as soon as a fix lands after them; re-check before tagging.
- Check every number in a demo artifact against the repo.
- Word rules by the actual risk: self-merge, not merging in general.

## Evidence
- PRs: #52
- Issues: #47, #48, #49, #50, #51; retro #53–#60
- Commits: ffaeba8, 0422c00 → a0bc235
- Release: https://github.com/baonguyen-agilityio/ai-tools-training/releases/tag/v1.0.0
- `/review-checklist` on #52: https://github.com/baonguyen-agilityio/ai-tools-training/pull/52#issuecomment-6597704564
- Demo artifact: https://claude.ai/artifact/DNzcVL1paigVE4Yb2EoVr4
- Playbook artifact: https://claude.ai/artifact/SUKZkxhH3WXCAgPUe44uSt
- Drive day-15: TODO (screenshots)
