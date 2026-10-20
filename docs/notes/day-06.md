# Day 06 — Flagship & parallel — Checkpoint 2

## Checkpoint 2 — passed 2026-10-20
| Item | Evidence |
|---|---|
| Two parallel sessions, both merged | #16 (BUG-003), #17 (BUG-006) via `claude --worktree` |
| Plan-mode change steered via diff comment | #11 (Day 4) |
| One artifact | PR #16 walkthrough: https://claude.ai/artifact/TVDpMmxe3KaDzWjGGs8ghy |
| One Remote Control steer | `/rc` on the BUG-003 session, steer sent from the phone |
| One `/loop` run | `/loop 2m` on PR #16 CI |

## Parallel sessions (git worktrees)
- `claude --worktree <name>` creates `.claude/worktrees/<name>` on branch `worktree-<name>`; each gets its own session history. Two tickets ran at the same time with no crosstalk.
- The BUG-006 tab ran in auto mode, not plan mode; "do not implement until I approve" in the prompt still held. The prompt, not the mode, kept the discipline.
- The BUG-006 session disagreed with the ticket: the summary list was already safe (`textContent`). Tickets are user reports and can be wrong.
- The BUG-003 plan flagged a side effect (double delete would break the UI refresh); fixed in the same PR because the PR caused it.
- Both PRs touched `app.js` and `e2e/expense.spec.js` on different hunks: #17 merged first, #16 rebased with no conflict so CI ran on the combined code.

## Remote Control
- `/rc`, then the session was steered from the phone ("assert the 404 body has an error field"). The session checked and replied that the assertion already existed instead of adding a duplicate.

## /loop
- In the CLI, `/loop` schedules a cron job (job id, every 2 minutes, expires after 7 days). Esc does not stop it; `CronDelete <id>` or "cancel the loop" does.
- It ran once and cancelled itself when CI went green.

## Review
- #17: `/review-checklist` found only nits; Claude declined to inflate them to `[should]`. The PR was retitled because the squash title becomes the commit on `main`.
- #16: review caught an over-broad `catch` (every failure looked like success) and a missing 5xx test; fixed.
- Resolving threads: before resolving, each fix was re-checked. A mutation test (removing the refresh) still passed, so the e2e fix did not hold; a test was added, then the thread was resolved. "Fixed in <sha>" is a claim; resolving is the verification.

## Lessons
- Parallel work needs tickets that touch different code, or a merge order planned up front.
- The prompt carries the guardrail; the mode is a second line.
- Error-handling code (`try`/`catch`) is where review keeps finding bugs: #14 and #16.
- Resolve a thread only after checking the fix; a mutant is the cheapest proof.

## Evidence
- Drive day-06: https://drive.google.com/drive/folders/1LI8o6bIYwa0toCf9_VUB2mDFSwAOPMpI
- PRs: #16, #17. Artifact above.
