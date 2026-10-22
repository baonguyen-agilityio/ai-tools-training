# REQ-002e: Show budget status in the monthly summary

**Parent:** `docs/specs/REQ-002-budget.md` (D2, D6, D6a, D8, D9, "UI sketch"). **Layer:** `public/`.

## User story

As Linh, I want the summary total and each capped category to show spent against budget, how much
is left, and turn amber or red, so that I can see at a glance where we stand and read what is left
at month end.

## Acceptance criteria

- **AC1** Given `budget.total` is `{ budget: 1500, spent: 1320.5, left: 179.5, state: "warn" }`, When the summary renders, Then `summary-total` reads `1320.50 / 1500.00   Left: 179.50` and has `data-state="warn"`.
- **AC2** Given a capped category with `left: -35.5, state: "over"`, When rendered, Then its `summary-category` line reads `food: 535.50 / 500.00   Over by 35.50` with `data-state="over"`.
- **AC3** Given `left: 0, state: "over"` (exactly 100 %), When rendered, Then the text is `Left: 0.00` and `data-state="over"` (D6a).
- **AC4** Given `state: "ok"`, When rendered, Then `data-state="ok"` and no amber / red colour.
- **AC5** Given a capped category with no expenses (`spent: 0`), When rendered, Then a `summary-category` line still appears (`fun: 0.00 / 150.00   Left: 150.00`).
- **AC6** Given a category with spend but no cap (`coffee`), When rendered, Then the line is exactly as today (`coffee: 30.00`) with no `data-state`.
- **AC7** Given `budget: null`, When rendered, Then `summary-total` and every `summary-category` look exactly as today (no slash, no state attribute).
- **AC8** Given the CSS, When `data-state` is `warn` / `over`, Then the line gets a visible amber / red treatment, and the information is also present in the text (no colour-only signal).
- **AC9** Given an expense is added or deleted, When the summary reloads (existing behaviour), Then the status lines update without a page refresh.
- **AC10** Given the existing e2e assertions on `summary-total` and `summary-category` text, When no budget is set in the e2e fixture, Then they still pass unchanged.

## Scope

- `public/app.js` `loadSummary()`: render the extra text and `data-state`; one small `statusText({ spent, budget, left })` helper.
- `public/style.css`: `[data-state="warn"]`, `[data-state="over"]` rules.
- e2e in `e2e/budget.spec.js`: AC1, AC2, AC3, AC7.

## Not in scope

- Setting the budget (REQ-002d). Post-add line (REQ-002f). Export (D6).

## Dependencies

REQ-002c (API field). Can be built on the same branch as REQ-002d but ships separately.

## Open questions

None.
