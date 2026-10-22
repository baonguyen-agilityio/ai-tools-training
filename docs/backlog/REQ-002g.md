# REQ-002g: Demo seed for October 2026

**Parent:** `docs/specs/REQ-002-budget.md` (D10, D10a). **Layer:** `data/`, `package.json`.

## User story

As Linh, I want `npm run seed` to produce an October 2026 that looks like a real month with food
close to its cap, so that the demo shows the amber warning without anyone typing data live.

## Acceptance criteria

- **AC1** Given a fresh checkout, When `npm run seed` runs, Then `data/expenses.json` contains the existing Jan–Mar 2026 rows plus October 2026 rows, and `data/budgets.json` equals `data/seed-budgets.json`.
- **AC2** Given the seeded data, When `GET /api/summary?month=2026-10`, Then `budget.categories.food.pct` is between 88 and 92 and `state` is `warn`.
- **AC3** Given the seeded data, When the same request runs, Then `budget.total.state` is `warn` (overall also close, so both lines show amber in the demo) and no line is `over`.
- **AC4** Given the seeded data, When the same request runs, Then `fun` has a cap and some spend with `state: "ok"`, `transport` and `bills` have spend and no cap, and at least one expense is in a category outside the four (e.g. `coffee`) so D8 is visible.
- **AC5** Given the seeded data, When `GET /api/summary?month=2026-09`, Then `budget` is `null` (first saved month is `2026-10`, D9).
- **AC6** Given the seeded October, When listed in the UI, Then it spans at least two pages (> 10 rows) with realistic notes (`Lunch`, `Team dinner`, `Grab`, …) and dates spread across the month.
- **AC7** Given the existing unit, API and e2e tests, When they run against the new seed, Then they pass; any assertion on seed totals for Jan–Mar is unaffected because those rows are unchanged.
- **AC8** Given tests, When any test copies seed data, Then it copies into a temp `EXPENSES_FILE` / `BUDGETS_FILE`; `data/*.json` is never written by tests.

## Scope

- `data/seed.json`: append ~15 October 2026 rows, ids `o1…`, food heavy.
- `data/seed-budgets.json`: `{ "2026-10": { "total": …, "categories": { "food": …, "fun": … } } }` with numbers chosen so AC2–AC4 hold.
- `npm run seed` already calls `resetFromSeed()`; it must now reset both files (done in REQ-002a, verify here).
- README: one line that the seed includes an October 2026 demo month with a budget.

## Not in scope

- Any code change beyond data and docs. Seeds for other months' budgets.

## Dependencies

REQ-002a (file + reset). Best merged after REQ-002c so AC2–AC5 can be checked by API.

## Open questions

None.
