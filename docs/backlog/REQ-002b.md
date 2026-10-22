# REQ-002b: Budget API (read and set a month's budget)

**Parent:** `docs/specs/REQ-002-budget.md` (D1, D3, D3a, D7, D8, D9). **Layer:** `src/server.js`.

## User story

As Linh, I want to read and set the budget for a given month over the API, so that the page (and
later other tools) can show and change it.

## Acceptance criteria

- **AC1** Given a saved budget for `2026-10`, When `GET /api/budget?month=2026-10`, Then `200 { month: "2026-10", source: "2026-10", budget: {...} }`.
- **AC2** Given budgets saved only for `2026-10`, When `GET /api/budget?month=2026-11`, Then `200` with `source: "2026-10"` and that budget (inherited).
- **AC3** Given budgets saved only for `2026-10`, When `GET /api/budget?month=2026-09`, Then `200 { month: "2026-09", source: null, budget: null }`.
- **AC4** Given `month=2026-13` or missing, When `GET` or `PUT /api/budget`, Then `400 {"error":"month must be YYYY-MM"}`.
- **AC5** Given a valid body `{ total: 1500, categories: { food: 500, fun: 150 } }`, When `PUT /api/budget?month=2026-10`, Then `200` with `source: "2026-10"` and the normalised budget, and the file now contains it.
- **AC6** Given `2026-10` already saved, When `PUT /api/budget?month=2026-10` with `{ total: 1600 }`, Then the month is fully replaced: `categories` is `{}` (no merge), other months untouched.
- **AC7** Given `2026-11` inherits from `2026-10`, When `PUT /api/budget?month=2026-11` with new values, Then only `2026-11` is written; `GET ?month=2026-10` is unchanged.
- **AC8** Given an invalid body (bad JSON, `total` missing / ≤ 0, cap ≤ 0, cap key `coffee`), When `PUT`, Then `400` with the `validateBudget` message and nothing is written.
- **AC9** Given any method other than GET or PUT, When `/api/budget` is called, Then `405`.
- **AC10** Given `BUDGETS_FILE` points to a temp file in tests, When any test runs, Then `data/budgets.json` is never read or written (same rule as `EXPENSES_FILE`).

## Scope

- Route `/api/budget` in `src/server.js`, reusing `readMonth()` and `readJson()`.
- `tests/api.test.js` (or `tests/budget-api.test.js`) cases with temp `EXPENSES_FILE` and `BUDGETS_FILE`.
- README API table: two new rows.

## Not in scope

- Status / thresholds in the response (REQ-002c).
- DELETE, auth, audit (D7, spec "Out of scope").

## Dependencies

REQ-002a.

## Open questions

None.
