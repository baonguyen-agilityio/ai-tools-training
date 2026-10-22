# REQ-002: Monthly budget with warning — spec

**Source:** `docs/backlog/REQ-002.md` (Minh, Ops) + client interview with Linh (Finance), 2026-10-22.
**Status:** accepted, not implemented. Tickets: `docs/backlog/REQ-002a.md` … `REQ-002g.md`. Tests: `docs/specs/REQ-002-test-matrix.md`.

## Problem

The team overspends every month and only finds out afterwards. Food is the main offender.
Linh wants to set a budget in the app, see a warning before it runs out, and read "how much is
left" at month end. Demo target: next week, on October 2026 data.

Today the app stores only the expense list (`data/expenses.json`) and computes a per-month total
and per-category totals (`GET /api/summary?month=`). There is no budget, no settings storage, no
notion of "remaining", no accounts.

## Decisions

Numbered to match Linh's answers (D1 = answer 1). D3a, D6a, D10a are BA interpretations needed to
make an answer implementable; they are listed so they can be challenged.

| # | Decision |
|---|----------|
| D1 | One overall budget per month, plus optional per-category caps. Categories without a cap only count toward the overall. |
| D2 | State per budget line: `ok` below 80 %, `warn` (amber) at ≥ 80 % and < 100 %, `over` (red) at ≥ 100 %. No pace / burn-rate projection. |
| D3 | Budget is set per month, not one standing number. |
| D3a | A month with no saved budget uses the nearest earlier month that has one (“inherited”). The API says where it came from (`source`), the UI pre-fills the form with it and marks it “copied from YYYY-MM, not saved”. Saving writes that month only. Rationale: “previous month” must chain across a skipped month or December would lose November's number because nobody opened November. |
| D4 | Status shows in the Monthly summary section, and one plain line appears under the add form right after an expense is added when that expense's category cap or the overall budget is in `warn` or `over` for the expense's month. No popups, no blocking. |
| D5 | Adding is never blocked by a budget. |
| D6 | Remaining is shown as `Left: 120.00` when ≥ 0 and `Over by 35.50` when < 0. Not in the CSV export. |
| D6a | At exactly 100 % the state is `over` (red) and the text is `Left: 0.00`. |
| D7 | No accounts: anyone with the page can set or change a budget. Revisit with REQ-003. |
| D8 | Caps are accepted only for `food`, `transport`, `bills`, `fun` (the datalist in `public/index.html`). Any other key is a 400. Expenses in other categories count toward the overall only. |
| D9 | A month earlier than the first month that ever had a budget saved has no budget: no numbers, no colour, no post-add line. |
| D10 | Demo on 2026-10 with food-heavy seed data; food lands around 90 % of its cap. |
| D10a | `npm run seed` also resets the budget file, so the demo is reproducible. |

Shared rules, derived from the existing code:

- Money is handled in integer cents the way `summary()` already does; thresholds compare
  `spentCents * 100 >= budgetCents * 80` (and `* 100`), never floats.
- Budget amounts are validated like `amount` in `validate()`: finite, > 0, rounded to cents.
  A cap larger than the overall total is allowed (no rule asked for).
- Displayed percentage is `floor(spent / budget * 100)` so 99.6 % never reads “100 %”.
- A category cap and the overall are independent lines; each has its own state.

## Data shape

New file `data/budgets.json`, keyed by month. Only saved months are stored; inheritance (D3a) is
computed, never written.

```json
{
  "2026-10": { "total": 1500, "categories": { "food": 500, "fun": 150 } },
  "2026-12": { "total": 2500, "categories": { "food": 900, "fun": 600 } }
}
```

- `total`: required, > 0, cents.
- `categories`: optional object, keys ⊂ {food, transport, bills, fun}, values > 0, cents. Omit a key
  to remove that cap.
- Path override: `BUDGETS_FILE` env var, same contract as `EXPENSES_FILE`. Tests and e2e must
  always point it at a temp file; `data/budgets.json` is never touched by tests.
- Seed: `data/seed-budgets.json`; `npm run seed` copies both seed files (D10a).

Effective budget for month `M`:

1. `budgets[M]` if present → `source = M`.
2. Else the entry with the greatest key `< M` → `source = that key` (inherited).
3. Else none → `budget = null, source = null` (D9).

## API sketch

All months validated with the existing `MONTH_RE`; bad month → `400 {"error":"month must be YYYY-MM"}`.

### `GET /api/budget?month=YYYY-MM`

Effective budget for the month.

```json
{ "month": "2026-11", "source": "2026-10", "budget": { "total": 1500, "categories": { "food": 500, "fun": 150 } } }
```

`"source": null, "budget": null` when none (D9). Always 200.

### `PUT /api/budget?month=YYYY-MM`

Body `{ "total": 1500, "categories": { "food": 500 } }`. Full replace of that month. Returns
`200` with the same shape as GET (`source` = the month). `400` on: invalid JSON, missing or
non-positive `total`, non-positive cap, cap key outside the four (D8), unknown top-level keys
ignored. No DELETE (edit the numbers instead; removal is out of scope).

### `GET /api/summary?month=YYYY-MM` (extended)

Existing fields unchanged. New `budget` field:

```json
{
  "month": "2026-10", "total": 1320.5, "byCategory": { "food": 450, "transport": 120.5, "coffee": 30 },
  "budget": {
    "source": "2026-10",
    "total": { "budget": 1500, "spent": 1320.5, "left": 179.5, "pct": 88, "state": "warn" },
    "categories": {
      "food": { "budget": 500, "spent": 450, "left": 50, "pct": 90, "state": "warn" },
      "fun":  { "budget": 150, "spent": 0,   "left": 150, "pct": 0, "state": "ok" }
    }
  }
}
```

- `budget` is `null` when the month has no effective budget (D9).
- `categories` lists only capped categories; a capped category with no spend shows `spent: 0`.
- `left` may be negative (`Over by` in the UI, D6). `state` ∈ `ok | warn | over` (D2, D6a).
- CSV export unchanged (D6).

Domain: new pure module `src/budget.js` (same rules as `src/expenses.js`: no I/O):
`effectiveBudget(budgets, month)`, `validateBudget(input)`, `budgetStatus(expenses, budgets, month)`.
`src/store.js` gains `loadBudgets()` / `saveBudgets()` and resets both files in `resetFromSeed()`.
`src/server.js` composes `summary()` + `budgetStatus()`.

## UI sketch

Monthly summary section (month picker already exists, `data-testid="summary-month"`):

```
Monthly summary      Month [2026-10]
Budget  total [1500.00]  food [500.00]  transport [    ]  bills [    ]  fun [150.00]  [Save]
        (copied from 2026-09, not saved)              ← only when source ≠ month
        Saved for 2026-10.                            ← after a successful save

Total: 1320.50 / 1500.00   Left: 179.50        ← amber (warn)
Export CSV
• food: 450.00 / 500.00   Left: 50.00          ← amber
• transport: 120.50                            ← no cap, as today
• fun: 0.00 / 150.00   Left: 150.00            ← green/neutral (ok); shown even with no spend
• coffee: 30.00                                ← no cap (D8)
```

- No budget (D9): form empty, no “copied from” note, total and category lines exactly as today.
- Colour comes from `data-state="ok|warn|over"` on the line; CSS maps to neutral / amber / red.
  Text carries the information too (`Left` / `Over by`), colour is not the only signal.
- Test ids: `budget-form`, `budget-total`, `budget-cap-<category>`, `budget-save`, `budget-source`,
  `budget-error`, `summary-total` (existing, gains `data-state`), `summary-category` (existing,
  gains `data-state` when capped).

Add form, after a successful add (D4):

```
[Add]
food: over budget (Over by 35.50)        ← data-testid="budget-notice", red
total: 88 % of budget (Left: 179.50)     ← second line only when the overall is warn/over
```

- Computed for the **expense's month** (from its date), not the summary picker month.
- Hidden when the month has no budget, when both lines are `ok`, and cleared on the next add.
- Category line only when that category has a cap.
- Sticky until the next add or reload; no timer, no popup.

## Out of scope

- Pace / burn-rate projection (D2).
- Deleting a month's budget (edit values instead).
- Budget figures in the CSV export (D6).
- Permissions on who may set a budget (D7, REQ-003).
- Caps on free-text categories outside the four (D8).
- Email / Slack / push notifications.
- Blocking or confirming an expense that goes over (D5).
- Currency formatting beyond the existing two decimals.
- Budget history / audit of changes.
