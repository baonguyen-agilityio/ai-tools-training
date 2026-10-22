# REQ-002f: Budget notice right after adding an expense

**Parent:** `docs/specs/REQ-002-budget.md` (D2, D4, D5, D6, D9, "UI sketch"). **Layer:** `public/`.

## User story

As the person entering a lunch receipt, I want to see “food is over budget” the moment I add it,
so that nobody finds out at month end.

## Acceptance criteria

The notice is computed for the **month of the added expense's date**, from the
`/api/summary?month=<that month>` response, not from the summary picker.

- **AC1** Given food is `over` after the add, When the add succeeds, Then `budget-notice` is visible with the line `food: over budget (Over by 35.50)` and `data-state="over"`.
- **AC2** Given food is `warn` after the add, When the add succeeds, Then the line is `food: 90% of budget (Left: 50.00)` with `data-state="warn"`.
- **AC3** Given the overall budget is `warn` or `over` after the add, When the add succeeds, Then a second line `total: 88% of budget (Left: 179.50)` (or `total: over budget (Over by …)`) is shown; category line first, total line second.
- **AC4** Given the added category has no cap (`coffee`), When the add succeeds, Then no category line appears; the total line still appears when the overall is `warn` / `over`.
- **AC5** Given both the category and the overall are `ok`, When the add succeeds, Then `budget-notice` is hidden.
- **AC6** Given the expense's month has no effective budget (D9), When the add succeeds, Then `budget-notice` is hidden.
- **AC7** Given the summary picker shows `2026-10` and the added expense is dated `2026-11-02`, When the add succeeds, Then the notice reflects November's status (October's numbers through inheritance if November is unsaved).
- **AC8** Given a notice is showing, When the next add succeeds, Then the notice is replaced (or hidden) by the new result; it never stacks.
- **AC9** Given the add fails validation (`400`), When the error is shown in `form-error`, Then `budget-notice` is unchanged from before the attempt.
- **AC10** Given the expense pushes a line to `over`, When the add succeeds, Then the expense is still saved and listed (D5, never blocked).

## Scope

- `public/index.html`: `<p id="budget-notice" data-testid="budget-notice" hidden>` under the add form.
- `public/app.js`: after a successful add, fetch summary for the expense's month and render up to two lines; reuse the status-text helper from REQ-002e.
- e2e in `e2e/budget.spec.js`: AC1, AC2, AC5, AC7.

## Not in scope

- Popups, toasts, timers. Blocking (D5). Notice on delete.

## Dependencies

REQ-002c (API field), REQ-002e (shared text helper and CSS).

## Open questions

None.
