# REQ-002d: Set a month's budget from the summary section

**Parent:** `docs/specs/REQ-002-budget.md` (D1, D3, D3a, D7, D8, R18–R22, R30, R31, R38–R40, "UI sketch"). **Layer:** `public/`.

## User story

As Linh, I want to type the overall budget and the food / transport / bills / fun caps for the
month I am looking at and save them, so that I can set December differently from November and
see where a pre-filled number came from.

## Acceptance criteria

e2e fixture (R21, R30): `e2e/budget.spec.js` `beforeEach` PUTs `{ total: 1500, categories: { food: 500, fun: 150 } }`
for `2026-10` via `page.request`, then opens the page and fills `summary-month`. Tests save only
months ≥ `2026-10`; AC4 saves `2027-01`, a month no other test reads (R39); “no budget” cases use `2026-01`. `afterEach` deletes expenses the test created.

- **AC1** Given the fixture, When the user fills `summary-month` with `2026-10`, Then `budget-total` has value `1500.00`, `budget-cap-food` `500.00`, `budget-cap-fun` `150.00`, `budget-cap-transport` and `budget-cap-bills` are empty, and `budget-source` is hidden.
- **AC2** Given the fixture, When the user fills `summary-month` with `2026-11`, Then the fields are pre-filled with October's values and `budget-source` reads exactly `copied from 2026-10, not saved` (R20).
- **AC3** Given the fixture, When the user fills `summary-month` with `2026-01`, Then all budget fields are empty and `budget-source` is hidden.
- **AC4** Given `2027-01` is picked (inherits October), When the user edits total to `1600`, food to `550` and clicks `budget-save`, Then the request is `PUT /api/budget?month=2027-01` with JSON body `{ total: 1600, categories: { food: 550, fun: 150 } }` (numbers, empty caps omitted, R18), the summary reloads, `budget-source` is hidden and `budget-saved` reads `Saved for 2027-01.` (R19).
- **AC5** Given `2026-11` is picked and the user saves `{ total: 1700, categories: { food: 600 } }`, When the user picks `2026-10`, Then the fields show `1500.00` / `500.00` / `150.00` (source month untouched), and `budget-saved` and `budget-error` are hidden (R19, R39).
- **AC6** Given total is empty or `0`, When the user clicks save, Then the browser blocks submit (`required`, `min="0.01"`, `step="0.01"`) and no request is sent.
- **AC7** Given the server answers `400 {"error":"coffee: category must be one of food, transport, bills, fun"}` (routed), When the user saves, Then `budget-error` shows exactly that text, the fields keep the typed values, `budget-saved` stays hidden; When the user clicks save again or changes the month, Then `budget-error` is hidden before any response arrives (R38).
- **AC8** Given `2026-10` is picked, When the user clears `budget-cap-fun` and saves, Then the PUT body has no `fun` key, after reload `budget-cap-fun` is empty, and `GET /api/budget?month=2026-10` returns `categories` without `fun` (R40).
- **AC9** Given a 390 px wide viewport, When the page renders, Then the `budget-form` bounding box width is ≤ 390 (R31).

## Scope

- `public/index.html`: budget form inside the Monthly summary section with test ids `budget-form`, `budget-total`, `budget-cap-<category>`, `budget-save`, `budget-source`, `budget-saved`, `budget-error`; inputs `type="number" step="0.01" min="0.01"`, total `required`.
- `public/app.js`: `loadBudget()` on month change and after save (`GET /api/budget`), `PUT` on submit with numeric body; hide `budget-error` and `budget-saved` on month change and on save start; reuse `api()` and `money()`.
- `public/style.css`: minimal layout for the row of fields.
- `e2e/budget.spec.js` with the fixture above (`BUDGETS_FILE` already in `playwright.config.js` from REQ-002a).

## Not in scope

- Status colours, Left / Over by (REQ-002e). Post-add line (REQ-002f). Any permission check (D7).

## Dependencies

REQ-002b.

## Open questions

None.
