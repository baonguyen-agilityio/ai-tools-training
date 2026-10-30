# Day 14 — Test and harden

## Checkpoint
| Item | Evidence |
|---|---|
| Exploratory QA regression on demo data (playwright MCP) | Drive day-14 (QA screenshots) |
| MCP `search_expenses` error handling | #43 |
| Budget UI fixes + Day 13 carry-overs | #44 |
| Client release notes for Linh | #45, artifact |

## QA: exploratory regression
- Ran with the `playwright` MCP against the October 2026 demo data (`npm run seed:demo`).
- Three findings:
  - Major: a save answered after a month change left the new month's form and summary stale; the new month still showed the old inherited budget.
  - Spec gap: the post-add notice stayed visible after a delete. No rule covered it → R42 ("any delete hides the notice").
  - An empty Month field kept the previous month's summary, budget form and export link.
- Passed: 80 % / 100 % thresholds, notice line order, R11 order of capped categories, 390 px layout, MCP parity with the API.

## Harden: MCP `search_expenses` (#43)
- With an unparsable `EXPENSES_FILE`, `search_expenses` threw → JSON-RPC `-32603` carrying the raw `SyntaxError`. `monthly_summary` already returned `isError: true` / `internal error` with the cause on stderr.
- 7fd8b29: one `toolResult(read)` helper in `mcp/expenses-server.js` used by both tools; parameter validation stays outside it, so `InvalidParams` is still a JSON-RPC error.
- Test red first (`-32603`). Added a `monthly_summary` case for a corrupt `EXPENSES_FILE` that passed before the fix, disclosed as a coverage gap, not a bug.
- `/review-checklist`: approve. Follow-ups left open: no assertion that the cause reaches stderr, no `EISDIR` case, three near-identical corrupt/restore blocks, `read` parameter name.
- `npm test` 120 pass. Opened 07:36:30Z, merged 07:38:54Z as 1425525.

## Harden: budget UI (#44)
- All fixes in `public/app.js`, tests in `e2e/budget.spec.js`; R42 added and R39 extended in `docs/specs/REQ-002-budget.md`.

| Finding | Test | Fix |
|---|---|---|
| Save after month change (QA#1) | `d-AC5c` | on success reload budget + summary for the current picker month; only "Saved for" / error suppressed |
| Notice after delete (QA#2) | `f-AC14`, `f-AC14b` | delete bumps `noticeSeq` and hides the notice (R42) |
| Empty Month field (QA#3) | `e-AC10`, `e-AC10b` | `loadSummary()` / `loadBudget()` clear on empty month and bump their seqs; export link `href` removed |
| Unhandled rejection on same-month add (Day 13, R29) | `f-AC15` | `summary.catch(() => {})` in `Promise.all` |
| R11 order of unspent caps (Day 13) | `e-AC11` | pin only, green before and after |

- Red before fix on origin/main: `d-AC5c` (`copied from 2027-04` vs `2027-05`), `e-AC10` (total not cleared), `f-AC14` (notice visible), `f-AC15` (`TypeError: Failed to fetch` pageerror).
- Guard-bump tests `f-AC14b` / `e-AC10b` proven by removing each `noticeSeq` / `summarySeq` / `budgetSeq` bump separately; each failed.
- QA#1 test uses 2027-04/05/06: saving 2026-11 cannot be undone and would break the inherit tests. R39 now reserves 2027-04…08.
- Commits: 2153748 fix, d18e865 test ids + matrix, a49f41a seq-bump tests, d75935b export link + R39. `npm test` 118/118, e2e 55 passed. Opened 07:37:40Z, merged 07:55:48Z as 20e2b72.

## Review
- `/review-checklist` on #44 round 1: request changes. New ids `e-AC9` / `e-AC10` collided with ids already in `docs/specs/REQ-002-test-matrix.md`, the matrix lacked the new rows, and the `noticeSeq` / `summarySeq` / `budgetSeq` bumps had no tests. Fixed in d18e865 and a49f41a.
- Round 2 on a49f41a: approve. A failed delete also hides the notice, kept (R42 says any delete). Left as nits: empty-month budget form still PUTs `?month=`, 50 ms macrotask waits, repeated `$('#summary-total')`.
- `/code-review ultra` on #44 (2nd of 3 free runs), 3 issues:
  - Export link with `download` + `href="#"` on an empty month saved the page itself. Fixed in d75935b by removing `href`. Came from the prompt asking for `href="#"`.
  - A save that finishes after a month change reloads over values typed in the new month's form. Accepted, listed under Known issues in #44.
  - Months 2027-04…08 used by the new tests were not recorded in R39. Fixed in d75935b.
- Pre-existing, listed in #44: the e2e suite is not safe to rerun on the same temp files (`--repeat-each`, retries); `d-AC4` and `d-AC5c` persist saved months.
- GitHub `claude-review` on #43, #44, #45: "No issues found."

## BA: client release notes (#45)
- `docs/release-notes/REQ-002.md` for Linh, plus an artifact copy. 680a36f added the #44 UI fixes once merged.
- Review before merge caught a factual error: the empty-month fix was described as "a month with no expenses" instead of clearing the Month field. Corrected in d21d50a.
- Opened 07:54:55Z, merged 08:14:49Z as 1f61489.

## Merges
- Merges were done by the lead session after verifying CI; trainee sessions did not merge.

## Lessons
- Exploratory QA on demo data found three bugs that the AC-driven suites missed; run it before release, not after.
- A guard test counts only once it fails with the guard removed.
- Check new test ids against the matrix before naming them.
- A prompt that dictates markup (`href="#"`) can ship a bug; state the behaviour, not the implementation.
- Release notes are a spec reader: check each claim against the fix, not the ticket title.
- Tests that persist state need unique data per run, or retries and `--repeat-each` break.

## Evidence
- PRs: #43, #44, #45
- Commits: 7fd8b29 → 1425525; 2153748, d18e865, a49f41a, d75935b → 20e2b72; f3b192a, 680a36f, d21d50a → 1f61489
- Review checklist on #43 and #44 (rounds 1, 2): PR comments
- Release notes artifact: https://claude.ai/artifact/SxQmi9cJMzxACLEZVD3f9g
- Drive day-14: https://drive.google.com/drive/folders/1vbe7ttZNddBI3utd2NO-LmqES7sgxYpq (QA screenshots)
