# REQ-002a: Budget storage and effective-budget resolution

**Parent:** `docs/specs/REQ-002-budget.md` (D3, D3a, D8, D9, D10a). **Layer:** `src/store.js`, new `src/budget.js`.

## User story

As Linh, I want each month's budget saved on its own, and a month I have not set yet to start
from the latest month I did set, so that December can differ from November without me retyping
every month.

## Acceptance criteria

- **AC1** Given no `data/budgets.json` (or `BUDGETS_FILE`) exists, When `loadBudgets()` runs, Then it returns `{}` and does not create the file.
- **AC2** Given a budgets object, When `saveBudgets()` runs, Then the file at `BUDGETS_FILE` (default `data/budgets.json`) holds it as pretty JSON, and a following `loadBudgets()` returns an equal object.
- **AC3** Given budgets `{ "2026-10": B }`, When `effectiveBudget(budgets, "2026-10")`, Then `{ source: "2026-10", budget: B }`.
- **AC4** Given budgets `{ "2026-09": B9, "2026-10": B10 }`, When `effectiveBudget(budgets, "2026-12")`, Then `{ source: "2026-10", budget: B10 }` (nearest earlier saved month, skipping November).
- **AC5** Given budgets `{ "2026-10": B }`, When `effectiveBudget(budgets, "2026-09")`, Then `{ source: null, budget: null }`.
- **AC6** Given `{}`, When `effectiveBudget({}, "2026-10")`, Then `{ source: null, budget: null }`.
- **AC7** Given `validateBudget({ total: "1500.004", categories: { food: 500 } })`, When called, Then it returns `{ total: 1500, categories: { food: 500 } }` (rounded to cents, numeric strings accepted like `amount`).
- **AC8** Given `total` missing, `0`, negative, `NaN` or non-numeric, When `validateBudget` runs, Then it throws `total must be a positive number`.
- **AC9** Given `categories: { coffee: 10 }`, When `validateBudget` runs, Then it throws `category must be one of food, transport, bills, fun`.
- **AC10** Given `categories: { food: 0 }` (or negative / non-numeric), When `validateBudget` runs, Then it throws `food cap must be a positive number`.
- **AC11** Given `categories` omitted or `{}`, When `validateBudget` runs, Then the result has `categories: {}`.
- **AC12** Given `EXPENSES_FILE` and `BUDGETS_FILE` both set to temp paths, When `resetFromSeed()` runs, Then both files equal `data/seed.json` and `data/seed-budgets.json` respectively.

## Scope

- `src/budget.js`: pure, `effectiveBudget`, `validateBudget`, a `BUDGET_CATEGORIES` constant (the four datalist values). No I/O.
- `src/store.js`: `loadBudgets`, `saveBudgets`, `budgetsFile()` honouring `BUDGETS_FILE`; `resetFromSeed` copies both seeds.
- `data/seed-budgets.json` placeholder (`{}`); real demo numbers come in REQ-002g.
- `tests/budget.test.js` unit tests; store tests use a temp dir like `tests/expenses.test.js`.
- CLAUDE.md and README: `BUDGETS_FILE` next to `EXPENSES_FILE`, same "never touch from tests" rule.

## Not in scope

- HTTP endpoints (REQ-002b), status / thresholds (REQ-002c), any UI.
- Deleting a saved month.

## Dependencies

None. First slice.

## Open questions

None.
