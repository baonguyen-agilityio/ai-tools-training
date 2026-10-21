# Day 11 — Role day: Claude in Chrome QA and the browser-pane preview loop

## Checkpoint
Checkpoint 3: passed.

| Item | Evidence |
|---|---|
| Skill + hook | #19 (skill), #22 (PreToolUse hook) |
| MCP end to end | #20 |
| Review report acted on | #26 |
| Role day: Claude in Chrome QA | 2026-10-21 session, 5/5 pass, 0 console errors, 21 requests all 200 (`day11-qa-report.md`) |
| Role day: browser-pane preview loop | #28 |

## Claude in Chrome QA
- App served on `PORT=3100` with `EXPENSES_FILE=/tmp/day11-expenses.json`; the session drove it through the Claude in Chrome extension.
- Four flows, all passed: add an expense, search `coffee`, export the October CSV, delete every expense. 5/5 checks green, 0 console errors, 21 requests, all 200.
- Network tracking was started after the first click, so the add `POST` was not captured; the page was reloaded and the flows re-run with capture on.
- Observations, none a failure:
  - The list and summary showed `7.5` while the exported CSV showed `7.50`. Became #28.
  - The search box fires one request per keystroke.
  - `HEAD /api/export` returns 405.

## Two-decimal amounts in the UI (#28)
- Branch `fix/amount-format`, one commit 2062503. The list `amount` cell, the monthly total and the per-category lines rendered raw numbers (`7.5`, `115.3`) while the CSV export from #26 already wrote `toFixed(2)`.
- Fix in `public/app.js`: one `money()` helper, `typeof n === 'number' ? n.toFixed(2) : n`, used at the three call sites. Non-numeric values pass through so a forged value still renders literally through `escapeHtml`. 6 lines added, 3 removed.
- New e2e `shows every amount with exactly two decimals, like the CSV export`: fixed cells (`Dinner` → `22.30`, `Taxi` → `18.00`), every list cell matches `/^\d+\.\d{2}$/`, `2026-01` total `186.25`, `transport: 45.00`, `bills: 120.00`, every category line ends in two decimals. Written red first; the red run is recorded in the session, not in git (single commit on the branch).
- Five existing e2e assertions updated to the padded format (`115.30`, `120.80`, `food: 27.80`, `${category}: 1.00`, `7.00`, `0.00`).
- Not a backlog ticket: BUG-002 (long float tails in the total) was a domain-rounding bug and is already fixed; this one is presentation only. No ticket was filed.
- `npm test` 44/44, e2e 14/14. CI on 2062503: unit, e2e, claude-review all green.
- GitHub `claude-review` posted "No issues found. Checked for bugs and CLAUDE.md compliance." No review threads, no `/review-checklist` pass on the PR. Opened 18:15:06Z, squash-merged 18:16:50Z as 7eb7874, branch deleted.

## Browser-pane preview loop — `.claude/launch.json` (#28)
- Same PR added `.claude/launch.json`: one configuration `expense-tracker`, `npm start`, port 3200, `env` sets `PORT=3200` and `EXPENSES_FILE=/tmp/day11-preview.json`. Ports now in use: 3000 dev, 3100 e2e, 3200 preview.
- Run from the Desktop Code tab: `preview_start "expense-tracker"` picked up the configuration from `.claude/launch.json`.
- Loop: screenshot of the broken state first (`7.5` in the pane), then the red e2e, which failed at `expense.spec.js:226` expecting `75.00`, then the fix. After the fix the pane was set to month `2026-03` and the list, total and category lines read back at two decimals. One iteration was enough. `preview_stop` at the end.
- `EXPENSES_FILE` is a fixed `/tmp` path, not `$TMPDIR`; the file is shared across sessions. The data-file guard hook from #22 is not triggered: the path is not `data/expenses.json`.

## Lessons
- Start console/network capture before the first browser action.
- Formatting belongs at the output layer: the domain kept numbers, the CSV and the UI each call `toFixed(2)`; one helper per renderer, not a formatted field in the API.
- A formatting fix touches every assertion that hard-coded the old format; count the updated assertions as part of the diff review.
- A preview configuration is code: isolate its port and data file like the test suites do.
- A one-commit PR cannot show "red first"; keep the red output if it matters later.

## Evidence
- Drive day-11: https://drive.google.com/drive/folders/18kWO4CnxJFC5hXADE-kUT49uo7SDaScm (pr28-preview-loop-summary.png, pr28-merged.png, day11-qa-report.md)
- PRs: #28
- Commits: 2062503 (branch), 7eb7874 (squash)
- CI on 2062503: https://github.com/baonguyen-agilityio/ai-tools-training/actions/runs/39651029090
- claude-review "No issues found": https://github.com/baonguyen-agilityio/ai-tools-training/pull/28#issuecomment-6323235697
