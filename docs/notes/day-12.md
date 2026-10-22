# Day 12 — Custom MCP server and the REQ-002 capstone kickoff

## Checkpoint
none today

## Custom MCP server (#30)
- Branch `feat/mcp-expenses`, two commits a5d2508 and d3f969b. `mcp/expenses-server.js`: stdio server over `src/store.js` + `src/expenses.js`, honours `EXPENSES_FILE`, no write tools.
- Tools: `monthly_summary(month)` → `summary()`; `search_expenses(q, category?, page?)` → `list()`. A bad month returns MCP `InvalidParams`, like the API's 400.
- The month regex moved out of `src/server.js` into an exported `MONTH_RE` in `src/expenses.js` so the API and the MCP server validate with one pattern.
- `@modelcontextprotocol/sdk` pinned exact (`1.32.1`) as a devDependency; `package-lock.json` grew by 1296 lines. Registered in `.mcp.json` as `expenses` (`node mcp/expenses-server.js`); `playwright` and `github` entries untouched.
- `tests/mcp.test.js` spawns the server over stdio with the SDK `Client` against a temp copy of `data/seed.json` (`mkdtempSync` + `EXPENSES_FILE` in the child `env`). Lists tools, summarises a month, rejects a bad month.
- README gained an "MCP server" section: tool table, approval once per clone (`/mcp`, enable `expenses`), example prompt.
- `/review-checklist` pass on a5d2508, verdict approve, five items:
  - [should] empty `q` listed every expense → d3f969b trims and rejects with `q must not be empty`.
  - [should] no `search_expenses` test → d3f969b adds hit (`coffee` → `a3`) and empty-`q` rejection; miss, category and bad-page cases not added.
  - [should] CLAUDE.md Stack line still said "Only dev dep: `@playwright/test`" → d3f969b lists both dev deps.
  - [nit] string `page` accepted via `Number()` → left as is.
  - [nit] `"env": {}` in `.mcp.json` is dead config → left as is (later kept on purpose, R14 in #31: inherits the shell).
- GitHub `claude-review` on a5d2508: "No issues found. Checked for bugs and CLAUDE.md compliance." The CLAUDE.md gap was in that diff. The review comment fired one `claude.yml` run, skipped (no `@claude` mention).
- `npm test` 45 after a5d2508, 46 after d3f969b. CI on d3f969b: unit, e2e, claude-review green.
- Used end to end from a fresh session: 3 calls, including `monthly_summary` with `2026-13`, which came back as the `InvalidParams` error.
- Merge blocked by the auto-mode classifier as self-review + self-merge; finished by the user with a `!` command. Opened 07:21:48Z, merged 08:43:24Z as ec9788e.

## Capstone kickoff: REQ-002 budget (#31)
- Branch `docs/req-002-pack`, four commits, docs only, 743 lines added, no code. Source: `docs/backlog/REQ-002.md` (Minh, Ops) plus a client interview with Linh (Finance) on 2026-10-22.
- Flow: vague client brief → BA intake (10 questions with defaults) → client answers → spec D1–D10 + tickets REQ-002a..g + test matrix → zero-question test by a reader without the authoring context.
- `docs/specs/REQ-002-budget.md`: problem, decisions D1–D10 numbered to Linh's answers plus D3a/D6a/D10a interpretations, data shape (`data/budgets.json`, `BUDGETS_FILE`), API sketch (`GET`/`PUT /api/budget?month=`, `budget` block on `/api/summary`), UI sketch, demo, out of scope.
- `docs/backlog/REQ-002a..g.md`: seven slices in dependency order: storage + effective budget → budget API → status in summary → set-budget UI → status display → post-add notice → October 2026 demo seed. Each: user story, Given/When/Then ACs, scope, dependencies, open questions.
- `docs/specs/REQ-002-test-matrix.md`: one row per AC with level (unit, API, MCP, hook, e2e, review), status column left for the implementing PR, plus a cross-reference for the edge cases Linh asked for: exactly 80 %, exactly 100 %, no budget, copied from previous month, category outside the four, past month.
- First commit 49a7609 was pushed with "Do not merge yet; BA/QA review pass first" in the PR body.
- Zero-question test, round 1: 36 questions, answered as R1–R36 in 7b0eb7c (364 added, 232 removed across all nine files). Linh answered f-2/f-3, e-3, g-1..3; the rest are tech-lead calls. Review decisions win over D-decisions on conflict.
- Round 2: 5 questions, settled as R37–R41 with validation defaults in 5df6a20; a4b1559 fixed the e2e month invariant (saving tests use months ≥ `2027-01`, inherited reads `2026-11`/`2026-12`) and review nits.
- Choices fixed by review, not by the interview:
  - Money is integer cents everywhere except the wire (R1); `pct = Math.floor(spentCents * 100 / budgetCents)`, unbounded (R10).
  - Ticket a isolates every suite, Playwright and the data-file guard hook from `data/budgets.json` (R2–R4); CLAUDE.md "Never" list and README name both files.
  - MCP `monthly_summary` gains `budget` so the README stays true (R14).
  - Demo moves to `data/demo-seed.json` + `data/demo-budgets.json` via `npm run seed:demo`; `data/seed.json` and existing tests untouched (R33); demo file checked by a unit test, ≥ 12 October rows on ≥ 8 days (R34).
  - Wrong references found in review: store test pattern, README API table, "Always 200" on `GET /api/budget`, one-vs-many notice lines, `88 %` spacing.
- Round 3 not run; the Day 13 build is the real measure.
- No review threads on the PR; the review ran in the session and landed as commits. GitHub `claude-review` on 49a7609 and a4b1559: "No issues found". CI on a4b1559 green. Opened 09:43:01Z, merged 10:27:31Z as de99479.

## Lessons
- "Open questions: None" written by the author is not evidence; run the zero-question test with a reader that has no authoring context. Running it in the authoring session biases it.
- One validation source per concept: the month regex copied into the MCP server became a shared export instead.
- A "required" string parameter still needs an emptiness check; the schema only guarantees presence.
- A review that approves with follow-ups needs the follow-ups done before merge or written down; two of five items here were left silently.
- A spec is not done at the interview; the developer question round changed 364 lines and settled money units, test isolation and the demo path.
- Each review decision carries the question id it answers, so a ticket can cite `R14` instead of restating the argument.
- Date-sensitive e2e fixtures need an invariant written in the spec (which months may be saved, which read), not left to the first implementer.

## Evidence
- PRs: #30, #31
- Commits: a5d2508, d3f969b (branch) → ec9788e (squash); 49a7609, 7b0eb7c, 5df6a20, a4b1559 (branch) → de99479 (squash)
- Review checklist on #30: https://github.com/baonguyen-agilityio/ai-tools-training/pull/30#pullrequestreview-5610660904
- claude-review "No issues found" on #30: https://github.com/baonguyen-agilityio/ai-tools-training/pull/30#issuecomment-6335180319
- Review-decisions comment on #31: https://github.com/baonguyen-agilityio/ai-tools-training/pull/31#issuecomment-6338164260
- CI on d3f969b: https://github.com/baonguyen-agilityio/ai-tools-training/actions/runs/39748489072
- CI on a4b1559: https://github.com/baonguyen-agilityio/ai-tools-training/actions/runs/39763089558
- Drive day-12: https://drive.google.com/drive/folders/1C3hsBi69_kwPIJdhbb8jZin8GHNn8x3E (day12-zero-question-test.md)
