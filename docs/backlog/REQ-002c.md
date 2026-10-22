# REQ-002c: Budget status in the monthly summary (API and MCP)

**Parent:** `docs/specs/REQ-002-budget.md` (D1, D2, D6, D6a, D8, D9, R1, R10, R11, R14, R15, R16). **Layer:** `src/budget.js`, `src/server.js`, `mcp/expenses-server.js`.

## User story

As Linh, I want the monthly summary to tell me spent, left and a state (ok / warn / over) for the
overall budget and each capped category, so that the page can colour it and I can read what is
left at month end.

## Acceptance criteria

All arithmetic in integer cents; `pct = Math.floor(spentCents * 100 / budgetCents)` (R10).
Response amounts are currency (R1).

- **AC1** Given budget total 1500 and expenses summing to 1320.50 in `2026-10`, When `GET /api/summary?month=2026-10`, Then existing `total` / `byCategory` are unchanged and `budget.total` is `{ budget: 1500, spent: 1320.5, left: 179.5, pct: 88, state: "warn" }`.
- **AC2** Given a food cap of 500 and food spend 450, When summary runs, Then `budget.categories.food` is `{ budget: 500, spent: 450, left: 50, pct: 90, state: "warn" }`.
- **AC3** Given spend below 80 % (399.99 of 500), When summary runs, Then `state: "ok"`, `pct: 79`.
- **AC4** Given spend exactly 80 % (400.00 of 500), When summary runs, Then `state: "warn"`, `pct: 80`.
- **AC5** Given spend exactly 100 % (500.00 of 500), When summary runs, Then `state: "over"`, `left: 0`, `pct: 100` (D6a).
- **AC6** Given spend above 100 % (535.50 of 500), When summary runs, Then `state: "over"`, `left: -35.5`, `pct: 107`.
- **AC7** Given a fun cap of 150 and no fun expenses, When summary runs, Then `budget.categories.fun` is `{ budget: 150, spent: 0, left: 150, pct: 0, state: "ok" }`.
- **AC8** Given expenses in `coffee` (no cap) totalling 30, When summary runs, Then `byCategory.coffee` is 30, `budget.categories` has no `coffee` key, and `budget.total.spent` includes the 30.
- **AC9** Given caps saved as `{ fun: 150, food: 500 }`, When summary runs, Then `Object.keys(budget.categories)` is `["food", "fun"]` (fixed order, R11).
- **AC10** Given `2026-11` has no saved budget but `2026-10` does, When `GET /api/summary?month=2026-11`, Then `budget.source` is `"2026-10"` and status uses October's numbers with November's expenses.
- **AC11** Given a month before any saved budget, When summary runs, Then `budget: null` and the rest of the response is exactly as today.
- **AC12** Given expenses of 0.29 against a cap of 1.00, When summary runs, Then `pct: 29` (integer math, not 28); given three expenses of 0.10 against a cap of 0.30, Then `state: "over"`, `left: 0`.
- **AC13** Given any month with a budget set, When `GET /api/export?month=`, Then the CSV body is identical to the body with no budget set (D6).
- **AC14** Given a budgets file containing `{not json`, When `GET /api/summary?month=2026-10`, Then `500 {"error":"internal error"}` (R15).
- **AC15** Given the MCP server started with `EXPENSES_FILE` and `BUDGETS_FILE` temp paths holding a budget, When `monthly_summary` is called, Then its JSON deep-equals `summaryWithBudget()` over the same temp files, including `budget` (R14).

## Scope

- `budgetStatus(expenses, budgets, month)` and `summaryWithBudget(expenses, budgets, month)` in `src/budget.js`, built on `monthCents()` from `src/expenses.js` (R16).
- `src/server.js` `/api/summary` and `mcp/expenses-server.js` `monthly_summary` both call `summaryWithBudget(store.load(), store.loadBudgets(), month)`.
- Unit tests in `tests/budget.test.js`; API cases in `tests/api.test.js`; MCP case in `tests/mcp.test.js`.

## Not in scope

- UI (REQ-002d/e/f). Pace projection (D2). CSV changes (D6). Degrading to `budget: null` on a broken file (R15).

## Dependencies

REQ-002a. Independent of REQ-002b (parallel OK; both touch `src/server.js`, coordinate the merge).

## Open questions

None.
