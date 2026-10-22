# REQ-002d: Set a month's budget from the summary section

**Parent:** `docs/specs/REQ-002-budget.md` (D1, D3, D3a, D7, D8, "UI sketch"). **Layer:** `public/`.

## User story

As Linh, I want to type the overall budget and the food / transport / bills / fun caps for the
month I am looking at and save them, so that I can set December differently from November and
see where a pre-filled number came from.

## Acceptance criteria

- **AC1** Given the summary month is `2026-10` with a saved budget, When the page loads, Then `budget-total` and each `budget-cap-<category>` show the saved values with two decimals, and `budget-source` is hidden.
- **AC2** Given `2026-11` has no saved budget and `2026-10` does, When the user picks `2026-11`, Then the fields are pre-filled with October's values and `budget-source` reads `copied from 2026-10, not saved`.
- **AC3** Given a month before any saved budget, When the user picks it, Then all budget fields are empty and `budget-source` is hidden.
- **AC4** Given the user edits total to `1600` and food to `550` and clicks `budget-save`, When the request succeeds, Then `PUT /api/budget?month=<picked month>` was sent with `{ total: 1600, categories: { food: 550, ... } }` (empty cap fields omitted), the summary reloads, `budget-source` is hidden and a line `Saved for 2026-11.` is shown.
- **AC5** Given the user saves while viewing an inherited month, When the save succeeds, Then only that month is saved; switching back to the source month still shows the original numbers.
- **AC6** Given total is empty or `0`, When the user clicks save, Then the browser blocks submit (`required`, `min="0.01"`, `step="0.01"`) and no request is sent.
- **AC7** Given the server answers `400`, When the user saves, Then the message is shown in `budget-error` (same pattern as `form-error`) and the fields keep the typed values.
- **AC8** Given the user clears the `fun` field and saves, When the summary reloads, Then `fun` has no cap (shown as a plain category line, as today).
- **AC9** Given the page, When rendered on a phone-width viewport, Then the budget fields wrap and nothing overflows horizontally.

## Scope

- `public/index.html`: budget form inside the Monthly summary section with the test ids from the spec; inputs are `type="number" step="0.01" min="0.01"`, total `required`.
- `public/app.js`: `loadBudget()` on month change and after save; `PUT` on submit; reuse `api()` and `money()`.
- `public/style.css`: minimal layout for the row of fields.
- e2e spec `e2e/budget.spec.js` for AC1, AC2, AC4, AC7 with temp `BUDGETS_FILE` (extend `playwright.config.js` `webServer.env`).

## Not in scope

- Status colours, Left / Over by (REQ-002e). Post-add line (REQ-002f).
- Any permission check (D7).

## Dependencies

REQ-002b.

## Open questions

None.
