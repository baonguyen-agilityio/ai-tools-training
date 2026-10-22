# REQ-002b: Budget API (read and set a month's budget)

**Parent:** `docs/specs/REQ-002-budget.md` (D1, D3, D3a, D7, D8, D9, R1, R12, R13, R17). **Layer:** `src/server.js`.

## User story

As Linh, I want to read and set the budget for a given month over the API, so that the page (and
later other tools) can show and change it.

## Acceptance criteria

Request and response amounts are currency numbers (`1500`, `179.5`); storage is cents (R1).

- **AC1** Given a saved budget for `2026-10`, When `GET /api/budget?month=2026-10`, Then `200 { month: "2026-10", source: "2026-10", budget: { total: 1500, categories: { food: 500, fun: 150 } } }`.
- **AC2** Given budgets saved only for `2026-10`, When `GET /api/budget?month=2026-11`, Then `200` with `source: "2026-10"` and that budget (inherited).
- **AC3** Given budgets saved only for `2026-10`, When `GET /api/budget?month=2026-09`, Then `200 { month: "2026-09", source: null, budget: null }` (R12).
- **AC4** Given `month=2026-13` or missing, When `GET` or `PUT /api/budget`, Then `400 {"error":"month must be YYYY-MM"}`.
- **AC5** Given body `{ total: 1500, categories: { food: 500, fun: 150 } }`, When `PUT /api/budget?month=2026-10`, Then `200` with `source: "2026-10"` and the same budget, and `loadBudgets()` holds it in cents.
- **AC6** Given `2026-10` already saved with caps, When `PUT /api/budget?month=2026-10` with `{ total: 1600 }`, Then the month is fully replaced: `categories` is `{}` (no merge), other months untouched.
- **AC7** Given `2026-11` inherits from `2026-10`, When `PUT /api/budget?month=2026-11` with new values, Then only `2026-11` is written; `GET ?month=2026-10` is unchanged.
- **AC8** Given a body of `{not json`, When `PUT`, Then `400 {"error":"invalid JSON body"}` (existing text, R13).
- **AC9** Given a body of `null`, `[]` or `5`, When `PUT`, Then `400 {"error":"body must be an object"}` and nothing is written (R13).
- **AC10** Given `total` missing / ≤ 0 / `0.004`, a cap ≤ 0, `categories: []`, cap key `coffee` (→ `coffee: category must be one of food, transport, bills, fun`, R38) or duplicate keys `{ food: 1, " Food ": 2 }` (→ `food: duplicate category`), When `PUT`, Then `400` with that message and nothing is written.
- **AC11** Given any method other than GET or PUT, When `/api/budget` is called, Then `405`.
- **AC12** Given a budgets file containing `{not json`, When `GET /api/budget?month=2026-10`, Then `500 {"error":"internal error"}` and the server keeps serving after the file is reset (R5, mirrors the existing export test).
- **AC13** Given README, When read, Then it has an “HTTP API” table with one row per route including `GET /api/budget` and `PUT /api/budget` (R17).

## Scope

- Route `/api/budget` in `src/server.js`, reusing `readMonth()`, `readJson()`, `validateBudget`, `effectiveBudget`, `toWire`.
- `tests/api.test.js` cases (temp `EXPENSES_FILE` + `BUDGETS_FILE` already set by REQ-002a).
- README “HTTP API” table.

## Not in scope

- Status / thresholds in the response (REQ-002c).
- DELETE, auth, audit (D7, spec "Out of scope"). Hardening `POST /api/expenses` against non-object bodies (R13).

## Dependencies

REQ-002a.

## Open questions

None.
