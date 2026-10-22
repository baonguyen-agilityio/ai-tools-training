# REQ-002f: Budget notice lines right after adding an expense

**Parent:** `docs/specs/REQ-002-budget.md` (D2, D4, D5, D6, D9, R26–R29, R36, R41, "UI sketch"). **Layer:** `public/`.

## User story

As the person entering a lunch receipt, I want to see “food: over budget” the moment I add it,
so that nobody finds out at month end.

## Acceptance criteria

Lines are computed for the **month of the added expense's date**, not the summary picker. When
that month equals the picker month they come from the `loadSummary()` response (one request);
otherwise from a separate `GET /api/summary?month=<that month>` (R41). `budget-notice` is a `<ul>`,
each line an `<li data-testid="budget-notice-line" data-line="<category|total>" data-state>` (R27).
Fixture as in REQ-002d; October budget 1500 / food 500 / fun 150.

- **AC1** Given food is `over` after the add, When the add succeeds, Then a line with `data-line="food"`, `data-state="over"` and text `food: over budget (Over by 35.50)` is visible.
- **AC2** Given food is `warn` after the add, When the add succeeds, Then the line is `food: 90% of budget (Left: 50.00)` with `data-state="warn"` (R26: no space before `%`).
- **AC3** Given food is `over` and the overall is `warn`, When the add succeeds, Then exactly two lines in order: `data-line="food"` (`data-state="over"`), then `data-line="total"` with text `total: 88% of budget (Left: 179.50)` and `data-state="warn"`.
- **AC4** Given the added category has no cap (`coffee`) and the overall is `warn`, When the add succeeds, Then exactly one line, `data-line="total"`.
- **AC5** Given the added category is capped and `ok` while the overall is `warn`, When the add succeeds, Then exactly one line, `data-line="total"` (R36).
- **AC6** Given both the category and the overall are `ok`, When the add succeeds, Then `budget-notice` is hidden and has no lines.
- **AC7** Given the expense is dated `2026-01-15` (no effective budget), When the add succeeds, Then `budget-notice` is hidden.
- **AC8** Given the picker shows `2026-10` and the expense is dated `2026-11-02`, When the add succeeds, Then the lines reflect November (inheriting October's budget) and the picker still shows October.
- **AC9** Given lines are showing, When the next add succeeds, Then the list is replaced by the new result; it never stacks.
- **AC10** Given the add fails validation (`400`), When `form-error` shows, Then `budget-notice` is unchanged from before the attempt.
- **AC11** Given the picker shows `2026-10`, the expense is dated `2026-11-02` and `GET /api/summary?month=2026-11` is routed to abort, When the add completes, Then `budget-notice` is hidden, `form-error` stays hidden, no `pageerror` fires, and the October summary still refreshed (R29, R41).
- **AC13** Given the picker shows `2026-10` and the expense is dated `2026-10-20`, When the add completes, Then exactly one `GET /api/summary?month=2026-10` request was made (R41).
- **AC12** Given the expense pushes a line to `over`, When the add succeeds, Then the expense is still saved and listed (D5).

## Scope

- `public/index.html`: `<ul id="budget-notice" data-testid="budget-notice" hidden></ul>` under the add form.
- `public/app.js`: after a successful add, take the expense month's summary from `loadSummary()` when months match, else fetch it; render `<li>` lines for `warn`/`over`, swallow fetch errors (hide the list); reuse `statusText()` from REQ-002e.
- `public/style.css`: nothing new; `[data-state]` rules from REQ-002e apply to the `<li>`.
- e2e in `e2e/budget.spec.js`: every AC above.

## Not in scope

- Popups, toasts, timers. Blocking (D5). Notice on delete.

## Dependencies

REQ-002c (API field), REQ-002e (shared helper and CSS).

## Open questions

None.
