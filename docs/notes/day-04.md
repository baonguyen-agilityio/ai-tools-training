# Day 04 — Claude Code core: sessions, permission modes, plan mode, diff pane

## Session hygiene
- One session per task from today: `day-04-explore`, `day-04-bug-002`, `day-04-bug-004`, `day-04-notes`.
- The Day 0–3 session (360+ messages, four unrelated tasks) was renamed `day-0-3-setup` and retired; it reopens from the sidebar with full history.

## Permission modes (Desktop names)
| Mode | Behaviour |
|------|-----------|
| Manual | Asks before every edit and command. |
| Accept edits | File edits auto-approved; shell commands (`npm test`, `git`) still prompt. |
| Plan | Read-only; produces a plan and waits for approval before any edit. |
| Auto | A classifier approves routine calls and blocks risky ones without asking. |

- Observed in Auto: `gh pr merge` was blocked in two sessions, once on a reviewed PR, once on an unreviewed one. The session's stated reason ("no review") was a guess; the classifier gives none. Merge was done by hand on GitHub.

## CLAUDE.md vs Project instructions
- `CLAUDE.md` lives in the repo, is versioned, and is loaded into every Code session on that repo (read at session start). Project instructions live in the claude.ai account, apply only to Chat in that Project, and are not versioned.
- Codebase facts (stack, test commands, conventions) belong in `CLAUDE.md`; chat style belongs in Project instructions. Written via `/init`, trimmed to 24 lines.

## Exercise A — explore and verify
- Prompt: explain the monthly summary end to end (UI → API → domain → store). Two claims checked by demanding command output instead of explanation:
  - Claim: `loadSummary()` runs at init, on month change, after delete, not after add → verified by grep (`app.js` lines 90, 101, 106). True.
  - Claim: `GET /api/summary?month=2026-13` returns 200 with an empty summary → verified by curl. True.
- The explore session also diagnosed BUG-002 and BUG-004 unprompted, and ran its verification server on a separate port with a scratch `EXPENSES_FILE`, as `CLAUDE.md` asks.

## Exercise B — two tickets through the full loop
- BUG-002 (float sums), PR #11: Plan mode → plan approved → failing test → first fix rounded the drifted float at the end → diff-pane comment on the hunk asked for integer-cent accumulation → second commit → `/review-checklist 11` posted two [should] threads (stale round2 comment, missing API assertion for 2026-02) → fixed, each thread answered → squash-merged.
- BUG-004 (local-time month parsing), PR #12: same loop unaided. Filter now compares the `YYYY-MM` prefix; test pins `TZ=America/New_York` and failed on main (216.35 vs 186.25). After #11 merged, #12 conflicted in `summary()` and in the test file; rebase with both sides shown and approved before resolution; 25 tests green; `--force-with-lease`. Review posted one [should] (assert the expense lands in February), fixed, merged.

## Lessons
- Ask for evidence, not explanation: "show the grep / curl output" costs one minute and removes the trust question.
- A diff-pane comment is the cheapest steering: it attaches the exact hunk to the message.
- Plan mode is for unfamiliar tickets; Accept edits still prompts on shell, so a full loop needs Auto or Manual.
- Auto mode blocks are silent decisions, not prompts; merge by hand or switch to Manual for that one command.
- The review skill ran from the repo copy this time (format matched `.claude/skills/review-checklist/SKILL.md`). Repo copy is canonical; the claude.ai copy is to be deleted.
- Two PRs on the same function: branch both from main, merge one, rebase the other; state what both sides must keep before resolving.

## Evidence
- Sessions sidebar: https://drive.google.com/file/d/1-aMM1faXr139QawUrYwm_mwT7fHzXz8H/view
- Diff-pane comment on BUG-002 hunk: https://drive.google.com/file/d/1nZX_0SY1LZgAviP8TOPzskvvlER1EYnO/view
- PR #11 review threads, merged: https://drive.google.com/file/d/1HEgjrSfNsXAV11ZTKRtx29aafFHT19UY/view
- PR #12 review thread, merged: https://drive.google.com/file/d/1cxALjmA-RLxIw6GdgYKmpunt3suZqQua/view
- PRs: #11, #12.
