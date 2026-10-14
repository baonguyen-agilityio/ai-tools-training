# Day 03 — Fix, review, merge — Checkpoint 1

## Checkpoint 1 — passed 2026-10-14
| Item | Evidence |
|------|----------|
| Reproduce as a failing test | commit "test: reproduce BUG-001 empty second page" (red before fix) |
| Fix on a branch with a test | PR #9: one-line change `slice(offset, limit)` → `slice(offset, offset + limit)`; unit + API + e2e added after review |
| Self-contained PR description | What / Why + root cause / How tested with results / Risk |
| Review with ≥3 actionable comments and replies | `/review-checklist` posted 3 inline comments (tests), each answered "Addressed in <sha>" |
| Merge with a conflict | main had `hasMore` on the same line; rebased, kept both; CI green; #9 and #8 merged |

## The loop as run
1. Branch `fix/bug-001` → failing unit test → red → commit.
2. Smallest fix → unit + e2e green → commit.
3. PR body drafted by Claude, edited, opened with `gh pr create`.
4. `/review-checklist 9` → 3 findings posted as a GitHub review with inline comments.
5. Findings addressed in one commit; each thread answered.
6. Rebase onto main hit a seeded conflict; Claude proposed the resolution, approved after checking both changes survived; tests green; force-push; squash merge.

## Lessons
- A test that passes with `slice(offset)` as well as with the fix cannot prove the fix. A page-2 test needs a full middle page (limit 5) to discriminate.
- The review skill ran from the claude.ai copy, not the repo copy; the two copies drifted because the claude.ai text was never pasted into the Code session. A Code session cannot see claude.ai chats.
- Rebase rewrites hashes; review replies pointing at pre-rebase commits are normal.
- Reviewer and author were the same account: acceptable for solo training, a flag in a team.
- Conflict resolution by Claude is safe when the prompt states what both sides must keep and asks for the hunk before writing.

## Evidence
- PR #9 description (merged): https://drive.google.com/file/d/1UaRJ6mnh3U3WoMl0c4S_Ag9fYZt1xnaS/view
- PR #9 review comments: https://drive.google.com/file/d/16-5Wh1LJIV7k4Ip8Co1pu54sQtyMihS4/view
- PR #9 CI green: https://drive.google.com/file/d/12R-V1zgHOYnhEgDGpGeRqRnZirYiURp5/view
