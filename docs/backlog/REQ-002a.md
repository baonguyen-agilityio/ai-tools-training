# REQ-002a: Budget storage, isolation and effective-budget resolution

**Parent:** `docs/specs/REQ-002-budget.md` (D3, D3a, D8, D9, R1–R9, R16, R37, R38). **Layer:** `src/store.js`, new `src/budget.js`, `src/expenses.js` (helper only), test/e2e config, guard hook.

## User story

As Linh, I want each month's budget saved on its own, and a month I have not set yet to start
from the latest month I did set, so that December can differ from November without me retyping
every month.

## Acceptance criteria

Money inside the domain and the file is integer cents (R1).

- **AC1** Given no file at `BUDGETS_FILE`, When `loadBudgets()` runs, Then it returns `{}` and does not create the file.
- **AC2** Given a budgets object in cents, When `saveBudgets()` then `loadBudgets()` run, Then the round-trip is deep-equal and the file lives at `BUDGETS_FILE` (default `data/budgets.json`, resolved from the repo root like `EXPENSES_FILE`).
- **AC3** Given budgets `{ "2026-10": B }`, When `effectiveBudget(budgets, "2026-10")`, Then `{ source: "2026-10", budget: B }`.
- **AC4** Given budgets `{ "2026-09": B9, "2026-10": B10 }`, When `effectiveBudget(budgets, "2026-12")`, Then `{ source: "2026-10", budget: B10 }` (nearest earlier saved month, skipping November).
- **AC5** Given budgets `{ "2026-10": B }`, When `effectiveBudget(budgets, "2026-09")`, Then `{ source: null, budget: null }`.
- **AC6** Given `{}`, When `effectiveBudget({}, "2026-10")`, Then `{ source: null, budget: null }`.
- **AC7** Given `{ "foo": B1, "2026-1": B2, "2026-09": B9 }`, When `effectiveBudget(budgets, "2026-10")`, Then `{ source: "2026-09", budget: B9 }` (keys not matching `MONTH_RE` ignored, R6).
- **AC8** Given `validateBudget({ total: "1500.004", categories: { food: 500 } })`, When called, Then it returns `{ total: 150000, categories: { food: 50000 } }` (cents, numeric strings accepted like `amount`).
- **AC9** Given `total` missing, `0`, negative, `NaN` or non-numeric, When `validateBudget` runs, Then it throws `total must be a positive number`.
- **AC10** Given `categories: { coffee: 10 }`, When `validateBudget` runs, Then it throws `coffee: category must be one of food, transport, bills, fun` (R38).
- **AC11** Given `categories: { " Food ": 500 }`, When `validateBudget` runs, Then the result has `categories: { food: 50000 }` (trim + lowercase, R7).
- **AC12** Given `categories: { food: 0 }` (or negative / non-numeric), When `validateBudget` runs, Then it throws `food cap must be a positive number`.
- **AC13** Given `categories` is `null`, an array or a string, When `validateBudget` runs, Then it throws `categories must be an object`; given `categories` omitted or `{}`, Then the result has `categories: {}`.
- **AC14** Given the input itself is `null`, an array or a number, When `validateBudget` runs, Then it throws `body must be an object`.
- **AC15** Given `{ total: 0, categories: { coffee: 0 } }`, When `validateBudget` runs, Then the error is the `total` one; given `{ total: 1, categories: { coffee: 10, food: 0 } }`, Then the error is `coffee: category must be one of food, transport, bills, fun` (R8 precedence).
- **AC16** Given a budgets file containing `{not json`, When `loadBudgets()` runs, Then it throws (same as `load()`, R5).
- **AC17** Given `EXPENSES_FILE` and `BUDGETS_FILE` set to temp paths, When `resetFromSeed()` runs, Then `load()` deep-equals `data/seed.json` and `loadBudgets()` deep-equals `data/seed-budgets.json` (`{}`); When `resetFromSeed({ demo: true })` runs, Then they deep-equal `data/demo-seed.json` and `data/demo-budgets.json` (placeholders committed here, R37).
- **AC18** Given the existing suites, When `npm test` and `npm run test:e2e` run, Then `data/budgets.json` is never created or modified: `tests/api.test.js`, `tests/store.test.js`, the spawned `env` in `tests/mcp.test.js` and `playwright.config.js` `webServer.env` all set `BUDGETS_FILE` to a temp path (R2, R3).
- **AC19** Given `.gitignore`, When read, Then it lists `data/budgets.json` (R3).
- **AC20** Given the guard hook, When a Bash / Write / Edit payload targets `data/budgets.json` (same shapes `tests/guard-hook.test.js` uses for expenses), Then it is blocked with a message naming `BUDGETS_FILE`; `npm run seed` and `npm run seed:demo` stay allowed (R4).
- **AC21** Given `src/expenses.js`, When `monthCents(expenses, month)` is called, Then it returns `{ cents, byCategory }` in integer cents and `summary()` is built on it with unchanged output (R16).
- **AC22** Given `total: 0.004` or `categories: { food: 0.004 }`, When `validateBudget` runs, Then it throws the positive-number message (rounded cents value is 0).
- **AC23** Given `categories: { food: 1, " Food ": 2 }`, When `validateBudget` runs, Then it throws `food: duplicate category`.

## Scope

- `src/budget.js`: pure; `BUDGET_CATEGORIES`, `effectiveBudget`, `validateBudget`, `toWire`. Imports from `src/expenses.js` only.
- `src/expenses.js`: extract and export `monthCents`.
- `src/store.js`: `budgetsFile`, `loadBudgets`, `saveBudgets`; `resetFromSeed({ demo = false } = {})` copies both files of the chosen pair.
- `data/seed-budgets.json` = `{}`; placeholders `data/demo-seed.json` (copy of `seed.json`) and `data/demo-budgets.json` (`{}`) (R37).
- `package.json`: `seed:demo` script (`resetFromSeed({ demo: true })`).
- `tests/budget.test.js` unit tests; existing test files and `playwright.config.js` gain `BUDGETS_FILE` (R2, R3).
- `.gitignore`, `.claude/hooks/guard-never-rules.js`, `tests/guard-hook.test.js`, CLAUDE.md “Never” list, README layout/workflow lines.

## Not in scope

- HTTP endpoints (REQ-002b), status / thresholds (REQ-002c), any UI, demo data contents (REQ-002g).
- Deleting a saved month. Validating the shape of a hand-edited file (R5).

## Dependencies

None. First slice.

## Open questions

None.
