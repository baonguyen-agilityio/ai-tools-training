# Day 13 — Build: REQ-002a..g shipped in waves

## Checkpoint
| Item | Evidence |
|---|---|
| Stop hook running tests + `verify-change` skill | #34 |
| REQ-002a storage, isolation, effective budget | #35 |
| REQ-002b budget API | #37 |
| REQ-002c budget status in summary (API + MCP) | #36 |
| REQ-002d set-budget form | #39 |
| REQ-002e budget status in summary UI | #38 |
| REQ-002f post-add notice | #41 |
| REQ-002g October 2026 demo data | #40 |

## Before the build: Stop hook and `verify-change` (#34)
- `.claude/hooks/stop-run-tests.js` + `Stop` entry in `.claude/settings.json`: runs `npm test` when `src/` or `tests/` changed (`git status --porcelain` ∪ `git diff --name-only origin/main...HEAD`); exit 2 with the last 150 lines on failure; exit 0 when `stop_hook_active` is set, so one retry, then Claude may stop red.
- `.claude/skills/verify-change/SKILL.md`: runs `npm test`, quotes real counts, reads `git diff origin/main...HEAD`, flags weakened tests.
- `tests/stop-hook.test.js` drives the hook against temp git repos with their own `npm test` script, never the real suite.
- `/review-checklist` round 1: request changes. With no merge base, `git diff origin/main...HEAD` threw and the outer `catch` dropped dirty `src/` files too (reproduced: orphan branch + untracked `src/a.js` → exit 0). 1fb70c1 catches inside `branchPaths`; new test fails without the fix. Round 2: approve; redundant `rev-parse` guard, untested 150-line cap, `verify-change` missing from CLAUDE.md left as nits.
- `npm test` 55 → 56. Merged 2026-10-29T10:21:22Z as d9cf8ba.

## Plan mode and plan review
- Each ticket started in plan mode; the plan was reviewed before approval, not approved on first read. What review changed:
  - #34: plan changed so committed changes on the branch still trigger the Stop hook, not only dirty files (`git diff origin/main...HEAD` added to `git status --porcelain`).
  - REQ-002a/b: review-level ACs became tests: a-AC19 (`.gitignore`) and b-AC13 (README HTTP API table lists exactly the seven routes).
  - REQ-002e: `statusText()` returns only the `(Left: …)` / `(Over by …)` parenthetical. The session had picked the full line; the reviewer overrode it so REQ-002f could reuse the helper.
  - REQ-002f: plan gained `noticeSeq`, and f-AC13 waits for a real response instead of a 50 ms settle.
- PR bodies follow one shape: spec decisions cited (D-, R-numbers), `AC → test` table, red-first statement, verification counts.

## Tests first per AC
- Every AC got a named test (`b-AC1`, `c-AC12`, `f-AC13`, …) before the code; red counts recorded in PR bodies:
  - b: 13/13 red (`ℹ fail 13`) before any route existed.
  - c: 14/15 red; c-AC13 (CSV export unchanged) green from the start, kept as a regression guard.
  - d: 9/9 red. e: 7/8 red; e-AC6 (uncapped line unchanged) green from the start. f: 14/14 red.
  - g: g-AC5 and g-AC7 green on the placeholder files, disclosed as regression guards.
- Matrix rows in `docs/specs/REQ-002-test-matrix.md` marked `done (REQ-002x)` by the implementing PR.
- Unit/API count: 55 (#34) → 80 (a) → 94 (b) → 112 (c rebased on b) → 118 (g). E2E: 14 → 22 (e) → 23/24 (d) → 34 (g) → 48 (f).

## Waves and parallel worktrees
- Order: a → b‖c → d‖e → g‖f, one worktree and branch per ticket in a parallel wave.

| Wave | PR | Opened | Merged |
|---|---|---|---|
| a | #35 | 10-29 10:51Z | 10-30 03:04Z |
| b‖c | #37, #36 | 03:19Z, 03:15Z | 03:29Z, 03:34Z |
| d‖e | #39, #38 | 03:42Z, 03:42Z | 04:00Z, 04:07Z |
| g‖f | #40, #41 | 04:15Z, 04:20Z | 04:23Z, 04:31Z |

- File ownership was split per ticket and written into each PR body:
  - b‖c: both edit `src/server.js` imports. Both PR bodies predicted the one-line `./budget.js` import conflict. b merged first; c rebased onto dfbb7ab, one combined import, `summary` import dropped, both `tests/api.test.js` blocks kept, `--force-with-lease` (f232522 → 6cd2969).
  - d‖e: both create `e2e/budget.spec.js` and edit `public/app.js`. e touched only `loadSummary()` + new `statusText()`; d left `loadSummary()` untouched and only called it. Each kept its own `describe` and `beforeEach`; CSS rules placed apart. d merged first; e rebased keeping both sides.
  - g‖f: g touched only `data/`, `tests/demo-seed.test.js`, README and its matrix rows; f only `public/` and `e2e/`. Matrix rows a few lines apart; no conflict.
- After the c rebase both suites were re-run before merge (112 unit/API, 14 e2e, posted on #36).

## CI-only race in REQ-002d (#39)
- CI e2e failed on fb16b4c and efac961 (`1 failed`, 22/23 passed), green locally. Failing test: `d-AC7 server error shows in budget-error and clears on retry and month change`, `e2e/budget.spec.js:165`, `toBeHidden()` → `Received: visible`.
- Cause: the test switched a shared `mode` flag (`error`/`hold`) between steps; on the slower runner a PUT's route handler ran after the flag changed, so a 400 arrived after the month change. The app's submit handler showed `budget-error` before checking whether the month had changed, so a stale error appeared under the new month. A real app bug that only the CI timing exposed.
- Fix in 95362b9, app side: the PUT outcome is captured, then `if (summaryMonth.value !== month) return;` runs before both the error and the success branch.
- Test side: no assertion loosened. Each request's answer is fixed by position (`PUT: ['error','hold','error']`, `GET: ['pass','hold']`), `toBeVisible()` added before `toHaveText` (the hidden `<p>` kept the old text), and new `d-AC7b a save error answered after a month change stays hidden` holds the PUT behind a gate.
- CI green on 95362b9. Earlier round (efac961) fixed the success-side variant: `Saved for <old month>.` after a month change, test `d-AC5b`.

## Stale-response guards from review
- Pattern from `listSeq`: bump a counter per request, drop a response whose counter is no longer current.
- `summarySeq` (#38, ad3e4b8): review found a slow summary for an older month could overwrite a newer one, now with wrong colour and `Left`. Test went red first (`Received: "186.25"`).
- `budgetSeq` for `loadBudget()` (#39).
- `noticeSeq` (#41): a slow summary from an earlier add could overwrite a newer add's notice; test fails with the guard disabled. `loadSummary()` now returns its response even when stale for the picker.
- Open: the stale-response tests wait 50 ms with `setTimeout`; review flagged a possible false green, not a flake.

## Other review results
- #35: `effectiveBudget("foo")` returned the latest budget → `MONTH_RE` guard; store tests shared one `BUDGETS_FILE` and depended on order → one file per test (351183d).
- #36: MCP `monthly_summary` leaked the raw parse message as JSON-RPC `-32603` → tool result `isError: true`, `internal error`, cause to stderr.
- #37: PUT on a corrupt budgets file and ignored top-level keys pinned by tests (1ec32a4); b-AC12 renamed (72897b4).
- #40: demo rows compared to `validate()` output and category key order pinned (a85724d).
- GitHub `claude-review` on every PR: "No issues found." Every `/review-checklist` finding above came from the in-session checklist.

## Shared e2e port 3100
- `playwright.config.js`: `PORT = 3100`, `reuseExistingServer: false`, fixed `$TMPDIR/expense-tracker-e2e*.json` data files. Two worktrees cannot run e2e at the same time: the second `webServer` cannot bind 3100, and both would share the same temp files.
- Parallel sessions were told to wait for the port (`lsof -i :3100` loop) and never change it or kill the other process. Runs serialised; none failed from a port clash.

## Merges
- Merges were done by the human, per repo rules (CLAUDE.md: "the human merges").
- The Claude `!` bash mode cut off `gh pr merge` mid-run (seen on #36, #37, #39, #40, #41), so merges ran in a real terminal or the GitHub UI.

## Day 14 harden items
- MCP `search_expenses` returns the raw `SyntaxError` as JSON-RPC `-32603` on an unreadable expenses file; `monthly_summary` already returns `isError` / `internal error` (#36 review).
- Same-month add: if `loadSummary()` rejects, `Promise.all` rejects through `summary` → unhandled rejection; R29's no-`pageerror` tested only on the other-month path (#41 review).
- Order of several unspent caps (food → transport → bills → fun, R11) untested; fixture caps only food and fun (#38 review).

## Lessons
- A test that passes locally and fails only in CI is evidence; prove the cause before touching the test, and fix the app when the timing exposes a real bug.
- Route stubs answer by request position, not by a flag flipped between steps.
- Every async render needs a staleness check before both its success and its error branch.
- Parallel tickets need file ownership and merge order written down before the build; a predicted one-line conflict is cheap.
- A shared fixed port and data file serialise e2e across worktrees.
- A test green before the code change is a regression guard, not red-first; say so in the PR.
- In-session `/review-checklist` found what `claude-review` did not, on every PR today.

## Evidence
- PRs: #34, #35, #36, #37, #38, #39, #40, #41
- Commits: 0eafde2, 1fb70c1 → d9cf8ba; 05c0762, 351183d → c7ba28f; a960655, 1ec32a4, 72897b4 → dfbb7ab; 60edf1b, 6cd2969 → ee46176; fb16b4c, efac961, 95362b9 → 0942705; b40ce84, ad3e4b8 → 7743281; be1e559, a85724d → bbcfcb9; ecfdac6 → e2b24dd
- CI failure on fb16b4c: https://github.com/baonguyen-agilityio/ai-tools-training/actions/runs/40998894025
- CI failure on efac961: https://github.com/baonguyen-agilityio/ai-tools-training/actions/runs/40999155995
- CI green on 95362b9: https://github.com/baonguyen-agilityio/ai-tools-training/actions/runs/41000057509
- Drive day-13: https://drive.google.com/drive/folders/1SfhVXDBPCLk5bWn1_zuWTB2ZijIOGFdZ (req-002-prs-merged.png, req-002d-ci-fail-d-ac7.png, req-002d-ci-green-after-fix.png)
