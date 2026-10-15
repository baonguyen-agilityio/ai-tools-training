# Day 05 — Memory, context, sessions

## Where things live
- CLI used for today (Zed terminal); Desktop lacks `/memory`, Esc Esc rewind and `/context`.
- Auto memory is on by default. Files live in `~/.claude/projects/<repo>/memory/`: a `MEMORY.md` index plus one file per fact. A one-line "Remember: …" produced `e2e-port-isolation.md` with Why / How to apply sections. A fresh session answered the e2e-port question with zero tool calls.
- `CLAUDE.md` is memory the team controls (versioned); auto memory is what Claude writes for itself. Both load at session start.
- `/context` on a fresh session: 75.8k tokens before any work. Of that, ~6k memory files, ~10k skills, ~5.5k custom agents, ~15k system tools. Global `~/.claude/rules/*.md` are loaded into every session on every repo.

## CLAUDE.md as a team file
- Added `## Never` with 5 rules: data-file isolation, review before merge, no force-push on `main` / `--force-with-lease` on own PR branch only, no I/O in `src/expenses.js`, no secrets or AI attribution. File is 31 lines.

## Compaction
- `/compact` on the Day 0–3 session; afterwards "Which bug did PR #9 fix and what was the one-line change?" was answered correctly (BUG-001, `slice(offset, offset + limit)`, merge sha, `hasMore` kept on rebase) with no tool calls. Decisions and outcomes survive; intermediate steps do not.

## Rewind
- First attempt: the session deleted `validate()` with `sed -i` through Bash. Esc Esc offered only "Restore conversation" with "The code will be unchanged". Rewind checkpoints only Edit/Write tool changes; shell edits are invisible to it. Recovered with `git checkout`.
- Second attempt with "Use the Edit tool": transcript shows `file-history-delta`, the menu offered code restore, `git status` clean afterwards.
- Lesson: rewind is not git. Shell edits, scripts and manual edits need git.

## Exercise — context matters (BUG-005, plan mode, same prompt)
| | Fresh session | `day-04-explore` (had read the codebase) |
|---|---|---|
| Tool calls before plan | 5 reads | 0 |
| Context after plan | 75.8k (8%) | 137k (14%), 95k of it history |
| Root cause / fix | correct, identical one-liner | correct, identical |
| Test plan | e2e without `page.reload`, extra category assertion | same, computed March total from memory (checked: correct) |

- Plan quality equal for a simple bug; the difference is tokens. Warm session: no re-reading, but every turn resends 137k. Fresh: ~30k to re-read, then 76k per turn. One-off task → fresh; continuing in the same area → warm.
- Implemented in the fresh session → PR #14. Review found the refetch inside `try` reported refresh failures as add failures; fixed with a test. The plan had chosen that deliberately; the review was right.

## Lessons
- Memory that matters goes in `CLAUDE.md`; auto memory is a convenience, inspect it.
- Context cost is per turn, not per task; pick fresh vs warm by how long the work continues.
- Rewind covers tool edits only; keep git as the real safety net.
- Prefer the Edit tool for changes you may want to undo; Bash edits bypass checkpoints.
- Remote Control sessions add a `Claude-Session:` trailer to commits and a link to PR bodies; disabled with `attribution.sessionUrl: false` in `~/.claude/settings.json`. Existing commits were stripped before merge.

## Evidence
- `/memory` menu (auto-memory true): https://drive.google.com/file/d/1RC7ZtaB5kLwmdZAWktoRMiP8qFR4HOHx/view
- Rewind menu after a `sed` edit: https://drive.google.com/file/d/1V-cGSxqS1VYCvoLWcJIRACMPowOOZuW4/view
- Drive day-05: https://drive.google.com/drive/folders/1J_TBFwMCwZRPszwAOI2VhqTMA7UaYuEV
- PRs: #14 (BUG-005), this PR.
