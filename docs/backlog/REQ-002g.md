# REQ-002g: Demo data for October 2026

**Parent:** `docs/specs/REQ-002-budget.md` (D10, D10a, R33–R35, "Demo"). **Layer:** `data/`, README.

## User story

As Linh, I want `npm run seed:demo` to load an October 2026 that looks like a real month with food
close to its cap, so that the demo shows the amber warning without anyone typing data live, and
without touching the data the tests rely on.

## Acceptance criteria

Tests copy `data/demo-seed.json` / `data/demo-budgets.json` to temp paths and read them through
`store` (R35); `npm run seed:demo` itself is never run by tests.

- **AC1** Given a fresh checkout, When `npm run seed:demo` runs, Then the expenses file equals `data/demo-seed.json` and the budgets file equals `data/demo-budgets.json`; `data/seed.json` and `data/seed-budgets.json` are byte-identical to `main`.
- **AC2** Given the demo files, When `summaryWithBudget(demoExpenses, demoBudgets, "2026-10")` runs, Then `total` is `1320.5` and `byCategory` is `{ food: 450, transport: 120.5, bills: 620, fun: 100, coffee: 30 }` (any key order).
- **AC3** Given the demo files, When the same call runs, Then `budget.total` is `{ budget: 1500, spent: 1320.5, left: 179.5, pct: 88, state: "warn" }` and `budget.categories.food` is `{ budget: 500, spent: 450, left: 50, pct: 90, state: "warn" }`.
- **AC4** Given the demo files, When the same call runs, Then `budget.categories.fun` is `{ budget: 150, spent: 100, left: 50, pct: 66, state: "ok" }` and `budget.categories` has exactly the keys `food`, `fun`.
- **AC5** Given the demo files, When `summaryWithBudget(…, "2026-09")` runs, Then `budget` is `null` (first saved month is `2026-10`, D9).
- **AC6** Given `data/demo-seed.json`, When its October rows are counted, Then there are ≥ 12 rows dated `2026-10-*` on ≥ 8 distinct days, every row passes `validate()`, ids are unique (R34).
- **AC7** Given the demo expense file, When rows outside October are inspected, Then they are exactly the rows of `data/seed.json` (history looks real, nothing invented for other months).
- **AC8** Given `npm test` and `npm run test:e2e`, When run on this branch, Then every existing assertion is untouched (no edits under `tests/` or `e2e/` other than the new demo-file test) and `data/*.json` is never written.
- **AC9** Given README, When read, Then it documents `npm run seed:demo` next to `npm run seed` and the demo month.

## Scope

- `data/demo-seed.json`: `data/seed.json` rows + October 2026 rows (ids `o1…`) summing exactly to AC2.
- `data/demo-budgets.json`: `{ "2026-10": { "total": 150000, "categories": { "food": 50000, "fun": 15000 } } }` (cents, R1).
- `tests/demo-seed.test.js`: AC2–AC7 over temp copies.
- README: `seed:demo` line and the demo month.

## Not in scope

- Any change to `data/seed.json`, `data/seed-budgets.json`, existing tests or e2e specs (R33). Seeds for other months' budgets.

## Dependencies

REQ-002a (`seed:demo` script, `resetFromSeed({ demo: true })`), REQ-002c (`summaryWithBudget` for AC2–AC5).

## Open questions

None.
