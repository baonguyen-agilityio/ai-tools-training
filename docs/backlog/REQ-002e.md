# REQ-002e: Show budget status in the monthly summary

**Parent:** `docs/specs/REQ-002-budget.md` (D2, D6, D6a, D8, D9, R11, R23–R25, R32, "UI sketch"). **Layer:** `public/`.

## User story

As Linh, I want the summary total and each capped category to show spent against budget, how much
is left, and turn amber or red, so that I can see at a glance where we stand and read what is left
at month end.

## Acceptance criteria

Fixture as in REQ-002d (October budget 1500 / food 500 / fun 150, created by PUT in `beforeEach`;
expenses created by the test are deleted in `afterEach`). Colours (R25): warn `rgb(138, 90, 0)`,
over `rgb(176, 0, 32)`, ok = body colour `rgb(34, 34, 34)`.

- **AC1** Given October spend 1320.50 (food 450), When `2026-10` is picked, Then `summary-total` has text `1320.50 / 1500.00 (Left: 179.50)`, `data-state="warn"` and CSS `color` of warn.
- **AC2** Given food spend 535.50, When rendered, Then the food `summary-category` line has text `food: 535.50 / 500.00 (Over by 35.50)`, `data-state="over"` and CSS `color` of over.
- **AC3** Given food spend exactly 500.00, When rendered, Then the text ends `(Left: 0.00)` and `data-state="over"` (D6a).
- **AC4** Given fun spend 100 (66 %), When rendered, Then the fun line reads `fun: 100.00 / 150.00 (Left: 50.00)`, `data-state="ok"` and CSS `color` equals the body colour (R25).
- **AC5** Given no fun expenses, When rendered, Then a `summary-category` line `fun: 0.00 / 150.00 (Left: 150.00)` still appears, after every `byCategory` line (R24).
- **AC6** Given a `coffee` expense (no cap), When rendered, Then its line is exactly `coffee: 30.00` with no `data-state` attribute.
- **AC7** Given `2026-01` is picked (no effective budget), When rendered, Then `summary-total` is the plain total and every `summary-category` line is `name: amount` with no `data-state` (today's output).
- **AC8** Given an expense is added or deleted, When the summary reloads (existing behaviour), Then the status lines update without a page refresh.
- **AC9** Given the existing `e2e/expense.spec.js` assertions on `summary-total` and `summary-category`, When they run, Then they pass unchanged because the months they use (≤ `2026-04`) have no effective budget (R32).

## Scope

- `public/app.js` `loadSummary()`: render the extra text and `data-state`; one `statusText({ spent, budget, left })` helper shared with REQ-002f; append unspent capped categories in fixed order.
- `public/style.css`: `[data-state="warn"] { color: #8a5a00 }`, `[data-state="over"] { color: #b00020 }`. No rule for `ok`.
- e2e in `e2e/budget.spec.js`: AC1–AC7.

## Not in scope

- Setting the budget (REQ-002d). Post-add lines (REQ-002f). Export (D6).

## Dependencies

REQ-002c (API field). Shares `e2e/budget.spec.js` with REQ-002d; merge d first.

## Open questions

None.
