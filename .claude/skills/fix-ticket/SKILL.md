---
name: fix-ticket
description: "Fix a backlog ticket (docs/backlog/BUG-*.md) end to end: verify the report, failing test first, smallest fix in the right layer, PR, /review-checklist, verified thread resolution, squash-merge. Use when asked to fix, work on, or ship a ticket from docs/backlog/."
---

# Fix a backlog ticket

Input: `/fix-ticket BUG-NNN` (or a path under `docs/backlog/`). Branch `fix/bug-nnn` from an up-to-date `main`.

## 1. Read the ticket as a user report
- It describes a symptom and may guess the cause wrongly. Confirm each claim against the code before acting on it.
- If part of the report is wrong, say so in the PR and keep a regression test for it (BUG-006: the summary list was already safe via `textContent`).

## 2. Reproduce red first
- Write the test at the layer where the user saw the bug: unit (`tests/expenses.test.js`), API (`tests/api.test.js`), or e2e (`e2e/expense.spec.js`) for UI symptoms.
- Run it, confirm it fails for the reported reason, and commit it alone: `test: reproduce BUG-NNN <symptom>`.
- Remove anything that masked the bug (BUG-005: the old e2e called `page.reload()`).
- Tests use `EXPENSES_FILE` temp files or `page.route` stubs; never `data/expenses.json`.

## 3. Smallest fix in the right layer
- Find the root cause, then fix it where it lives: domain logic in `src/expenses.js` (stays pure), HTTP status and validation in `src/server.js`, rendering and fetch flow in `public/app.js`.
- Reuse what exists (`escapeHtml()`, the `removed: null` return, the delete handler's refresh pattern). No unrelated changes.
- Commit `fix: <behavior> (BUG-NNN)`. Run `npm test` and `npm run test:e2e`; both green.

## 4. Open the PR
Title = the fix commit subject. Body sections:
- **Reported** — link `docs/backlog/BUG-NNN.md`, the symptom, and which ticket claims did not hold.
- **Root cause** — file and mechanism, one or two sentences.
- **Fix** — what changed per file, and why that layer.
- **Verification** — test names, "failed before, passes after", `npm test` and e2e pass counts.

## 5. Review
- Run `/review-checklist <PR number>` and post findings as inline threads. Never merge without this pass.
- Fix each `blocker`/`should` in its own commit; add a test that fails without that fix.

## 6. Resolve threads only after verifying
- "Fixed in <sha>" is a claim. Before resolving, re-run the new test and check it actually guards the fix.
- When cheap, run a mutant: revert or break the fix locally, confirm the test goes red, restore. If it stays green, strengthen the test first (PR #16: the 500-path test passed with the refresh removed).
- Reply on the thread with the sha, the test name, and the mutant result, then resolve.

## 7. Merge
- All threads resolved, CI green.
- Strip `Claude-Session:` trailers and session links from commits and the PR body (`--force-with-lease` on the PR branch only).
- Squash-merge with an explicit message: `gh pr merge <n> --squash --delete-branch --subject "<PR title> (#<n>)" --body "<one-paragraph summary>"` (allowed by `.claude/settings.json`), or by hand on GitHub after editing the message. Never accept the default squash body: it concatenates every commit message, trailers included, and `main` cannot be rewritten afterwards.
