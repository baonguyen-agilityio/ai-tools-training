# REQ-002: Monthly budget with warning — spec

**Source:** `docs/backlog/REQ-002.md` (Minh, Ops) + client interview with Linh (Finance), 2026-10-22,
+ developer pre-implementation review (36 questions, answered in “Review decisions” below).
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
make an answer implementable. Review decisions R1–R36 refine these and win on conflict.

| # | Decision |
|---|----------|
| D1 | One overall budget per month, plus optional per-category caps. Categories without a cap only count toward the overall. |
| D2 | State per budget line: `ok` below 80 %, `warn` (amber) at ≥ 80 % and < 100 %, `over` (red) at ≥ 100 %. No pace / burn-rate projection. |
| D3 | Budget is set per month, not one standing number. |
| D3a | A month with no saved budget uses the nearest earlier month that has one (“inherited”). The API says where it came from (`source`), the UI pre-fills the form with it and marks it “copied from YYYY-MM, not saved”. Saving writes that month only. Rationale: “previous month” must chain across a skipped month or December would lose November's number because nobody opened November. |
| D4 | Status shows in the Monthly summary section. Right after an expense is added, one plain line appears under the add form **per budget line** (the expense's category cap, then the overall) that is `warn` or `over` for the expense's month; nothing when both are `ok`. No popups, no blocking. |
| D5 | Adding is never blocked by a budget. |
| D6 | Remaining is shown as `Left: 120.00` when ≥ 0 and `Over by 35.50` when < 0. Not in the CSV export. |
| D6a | At exactly 100 % the state is `over` (red) and the text is `Left: 0.00`. |
| D7 | No accounts: anyone with the page can set or change a budget. Revisit with REQ-003. |
| D8 | Caps are accepted only for `food`, `transport`, `bills`, `fun` (the datalist in `public/index.html`). Any other key is a 400. Expenses in other categories count toward the overall only. |
| D9 | A month earlier than the first month that ever had a budget saved has no budget: no numbers, no colour, no post-add line. |
| D10 | Demo on 2026-10 with food-heavy demo data; food at 90 % of its cap, overall at 88 %. |
| D10a | Demo data lives in separate files (`data/demo-seed.json`, `data/demo-budgets.json`) loaded by `npm run seed:demo`. `data/seed.json` and every existing test stay untouched. |

Shared rules:

- **Money (R1).** On the wire (API request and response bodies) amounts are currency numbers with
  at most two decimals, exactly like `amount` today (`1500`, `179.5`). Everywhere else — validation
  output, the budgets file, `src/budget.js`, thresholds, `pct`, `left` — money is **integer cents**.
  Conversion happens once on the way in (`validateBudget`) and once on the way out (`toWire`).
- Thresholds: `spentCents * 100 >= budgetCents * 80` → `warn`, `spentCents >= budgetCents` → `over`.
- `pct = Math.floor(spentCents * 100 / budgetCents)` (integer math, R10). No upper bound.
- Budget amounts are validated like `amount` in `validate()`: finite, rounded to cents, and the
  **rounded cents value must be > 0** (`0.004` → 0 cents → rejected). A cap larger than the overall
  total is allowed (no rule asked for).
- A category cap and the overall are independent lines; each has its own state.

## Data shape

New file `data/budgets.json`, keyed by month, **values in integer cents** (R1). Only saved months
are stored; inheritance (D3a) is computed, never written.

```json
{
  "2026-10": { "total": 150000, "categories": { "food": 50000, "fun": 15000 } },
  "2026-12": { "total": 250000, "categories": { "food": 90000, "fun": 60000 } }
}
```

- `total`: required, integer > 0 (cents).
- `categories`: optional object, keys ⊂ {food, transport, bills, fun}, integer values > 0. Omit a
  key to remove that cap.
- Keys that do not match `MONTH_RE` are ignored when resolving (R6). A file that is not valid JSON
  makes `loadBudgets()` throw, like `load()` (R5).
- Path override: `BUDGETS_FILE` env var, same contract as `EXPENSES_FILE`. Every test file, the
  Playwright web server and the MCP test pass a temp path (R2, R3); the guard hook blocks
  `data/budgets.json` the same way it blocks `data/expenses.json` (R4); the file is git-ignored (R3).
- Seeds: `data/seed-budgets.json` (committed, `{}`) for tests and `npm run seed`;
  `data/demo-seed.json` + `data/demo-budgets.json` for `npm run seed:demo` (R33). Ticket a commits
  placeholders (copy of `seed.json`, `{}`); ticket g overwrites them (R37).

Effective budget for month `M`:

1. `budgets[M]` if present → `source = M`.
2. Else the entry with the greatest valid key `< M` → `source = that key` (inherited).
3. Else none → `budget = null, source = null` (D9).

## API sketch

All months validated with the existing `MONTH_RE`; bad month → `400 {"error":"month must be YYYY-MM"}`.
Response amounts are currency (R1).

### `GET /api/budget?month=YYYY-MM`

Effective budget for the month. `200` for every valid month; `400` only for a bad month (R12).

```json
{ "month": "2026-11", "source": "2026-10", "budget": { "total": 1500, "categories": { "food": 500, "fun": 150 } } }
```

`"source": null, "budget": null` when none (D9).

### `PUT /api/budget?month=YYYY-MM`

Body `{ "total": 1500, "categories": { "food": 500 } }`. Full replace of that month. Returns
`200` with the same shape as GET (`source` = the month). `400` on: invalid JSON
(`invalid JSON body`, existing text), body not a plain object (`body must be an object`), missing
or non-positive `total`, `categories` not a plain object, cap key outside the four after
trim + lowercase (D8, R7; message `coffee: category must be one of food, transport, bills, fun`,
R38), two keys that normalise to the same category (`food: duplicate category`), non-positive cap.
Unknown top-level keys are ignored. Error precedence in R8. No DELETE (edit the numbers instead; removal is out of scope).

### `GET /api/summary?month=YYYY-MM` (extended)

Existing fields unchanged. New `budget` field, composed by `summaryWithBudget()` in `src/budget.js`
and used by both the HTTP route and the MCP `monthly_summary` tool (R14, R16):

```json
{
  "month": "2026-10", "total": 1320.5,
  "byCategory": { "food": 450, "transport": 120.5, "bills": 620, "fun": 100, "coffee": 30 },
  "budget": {
    "source": "2026-10",
    "total": { "budget": 1500, "spent": 1320.5, "left": 179.5, "pct": 88, "state": "warn" },
    "categories": {
      "food": { "budget": 500, "spent": 450, "left": 50, "pct": 90, "state": "warn" },
      "fun":  { "budget": 150, "spent": 100, "left": 50, "pct": 66, "state": "ok" }
    }
  }
}
```

- `budget` is `null` when the month has no effective budget (D9).
- `categories` lists only capped categories, in the fixed order food, transport, bills, fun (R11);
  a capped category with no spend shows `spent: 0`.
- `left` may be negative (`Over by` in the UI, D6). `state` ∈ `ok | warn | over` (D2, D6a).
- CSV export unchanged (D6). An unreadable budgets file makes this route a 500 (R15).

Domain: new pure module `src/budget.js` (same rules as `src/expenses.js`: no I/O). It imports
`monthCents()` from `src/expenses.js`, never the reverse (R16). Exports: `BUDGET_CATEGORIES`,
`validateBudget(input) → cents`, `effectiveBudget(budgets, month) → { source, budget(cents) }`,
`toWire(budgetCents)`, `budgetStatus(expenses, budgets, month)`, `summaryWithBudget(expenses, budgets, month)`.
`src/store.js` gains `loadBudgets()` / `saveBudgets()` / `budgetsFile()` and resets both files in
`resetFromSeed({ demo })`.

## UI sketch

Monthly summary section (month picker already exists, `data-testid="summary-month"`):

```
Monthly summary      Month [2026-10]
Budget  total [1500.00]  food [500.00]  transport [    ]  bills [    ]  fun [150.00]  [Save]
        copied from 2026-09, not saved                ← budget-source, only when source ≠ month
        Saved for 2026-10.                            ← budget-saved, after a successful save

Total: 1320.50 / 1500.00 (Left: 179.50)        ← amber (warn)
Export CSV
• food: 450.00 / 500.00 (Left: 50.00)          ← amber
• transport: 120.50                            ← no cap, as today
• bills: 620.00
• fun: 100.00 / 150.00 (Left: 50.00)           ← ok: no colour
• coffee: 30.00                                ← no cap (D8)
```

- Category lines: `byCategory` in its existing order, then capped categories with no spend appended
  in the fixed order food, transport, bills, fun (R11, R24).
- No budget (D9): form empty, `budget-source` hidden, total and category lines exactly as today.
- `data-state="ok|warn|over"` sits on the `summary-total` `<strong>` and on each capped
  `summary-category` `<li>` (R23). CSS colours only `warn` (`#8a5a00`) and `over` (`#b00020`,
  the existing `.error` red); `ok` has no rule (R25). Text carries the information too.
- `budget-error` and `budget-saved` are hidden on month change and when a save starts.
- Test ids: `budget-form`, `budget-total`, `budget-cap-<category>`, `budget-save`, `budget-source`,
  `budget-saved`, `budget-error`, `summary-total` (existing, gains `data-state`),
  `summary-category` (existing, gains `data-state` when capped).

Add form, after a successful add (D4, R27, R28):

```
[Add]
• food: over budget (Over by 35.50)       ← budget-notice-line, data-line="food", data-state="over"
• total: 88% of budget (Left: 179.50)     ← budget-notice-line, data-line="total", data-state="warn"
```

- `budget-notice` is a `<ul hidden>`; each line is an `<li data-testid="budget-notice-line">` with
  its own `data-line` and `data-state`. Category line first, total line second. The list is hidden
  when it has no lines.
- Computed for the **expense's month** (from its date), not the summary picker month. When that
  month equals the picker month the lines come from the `loadSummary()` response already fetched
  (one request); only a different month triggers a separate `GET /api/summary` (R41).
- Hidden when the month has no budget, when every line is `ok`, and when the status fetch fails
  (R29). Replaced on the next successful add; untouched by a failed add; hidden by any delete (R42).
  No timer, no popup.
- Category line only when that category has a cap. Percent is written `88%` (no space, R26).

## Demo (R33)

`npm run seed:demo` copies `data/demo-seed.json` → expenses file and `data/demo-budgets.json` →
budgets file. Demo October 2026 reproduces the summary example above exactly: total 1320.50
(food 450.00, transport 120.50, bills 620.00, fun 100.00, coffee 30.00), budget total 1500 with
caps food 500 and fun 150. `data/seed.json`, `data/seed-budgets.json` and all tests are untouched.

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
- Validating the shape of a hand-edited budgets file beyond JSON parsing (R5).

## Review decisions

Tech-lead answers to the developer review of 2026-10-22, one per question id. Guiding constraints:
no test, e2e run or hook may touch `data/budgets.json`; money is integer cents except on the wire.

| # | Q | Decision |
|---|---|----------|
| R1 | a-1 | Wire = currency numbers ≤ 2 decimals (as `amount`). File, `src/budget.js`, all arithmetic = integer cents. `validateBudget` converts in, `toWire` converts out. Spec examples fixed accordingly. |
| R2 | a-2 | Ticket a sets `process.env.BUDGETS_FILE` to a temp path in `tests/api.test.js`, `tests/store.test.js` and the spawned `env` in `tests/mcp.test.js`, in the same commit that makes `resetFromSeed` copy both seeds. |
| R3 | a-3 | Ticket a also adds `BUDGETS_FILE` (temp) to `playwright.config.js` `webServer.env` and `data/budgets.json` to `.gitignore`. Nothing waits for d. |
| R4 | a-4 | Ticket a extends `.claude/hooks/guard-never-rules.js` (regex `data/(expenses\|budgets)\.json`, message names both env vars) and `tests/guard-hook.test.js`; CLAUDE.md “Never” list and README mention both files. |
| R5 | a-5 | `loadBudgets()` throws on unparsable JSON (same as `load()`) → 500 at the API. Shape of a parsed file is trusted, not validated (only `saveBudgets` writes it). |
| R6 | a-6 | `effectiveBudget` ignores keys that do not match `MONTH_RE`; valid keys compare as strings. |
| R7 | a-7 | Cap keys are trimmed and lowercased, then must be one of the four. `categories` present but not a plain object → `categories must be an object`. Body not a plain object → `body must be an object`. |
| R8 | a-8 | Validation order: body type → `total` → `categories` type → keys in insertion order, per key name then value. `{ coffee: 0 }` → category message; `{ coffee: 10, food: 0 }` → category message for `coffee`. |
| R9 | a-9 | `resetFromSeed` byte-copies both seeds (`copyFileSync`); a-AC17 checks deep equality via `loadBudgets()`. Pattern reference fixed to `tests/store.test.js`. |
| R10 | c-1 | `pct = Math.floor(spentCents * 100 / budgetCents)`. No bound; a tiny budget may yield a huge `pct`, displayed as is. |
| R11 | c-2 | `budget.categories` ordered by the fixed four (food, transport, bills, fun), capped only. UI appends unspent capped categories after the `byCategory` lines in that order. |
| R12 | b-3 | `GET /api/budget` is 200 for every valid month (budget may be `null`), 400 only for a bad month. Spec wording fixed. |
| R13 | b-1 | Bad JSON keeps the existing `invalid JSON body`. `null` / array / number bodies → 400 `body must be an object` (from `validateBudget`). The same hole in `POST /api/expenses` is out of scope. |
| R14 | c-3 | MCP `monthly_summary` gains `budget` so README stays true. Ticket c changes `mcp/expenses-server.js` to call `summaryWithBudget()`, passes `BUDGETS_FILE` in `tests/mcp.test.js`; `.mcp.json` stays `env: {}` (inherits the shell). |
| R15 | c-4 | Unreadable budgets file → `/api/summary` 500, consistent with R5 and the existing expenses behaviour. No degrade. |
| R16 | c-5 | `src/expenses.js` exports `monthCents(expenses, month) → { cents, byCategory }` (cents) and `summary()` uses it. `src/budget.js` imports from `src/expenses.js`; the reverse never happens. Both stay pure. |
| R17 | b-2 | Ticket b adds an “HTTP API” table to README (all routes, one row each) and the MCP table keeps “same as `GET /api/summary`”. |
| R18 | d-1 | Client sends numbers (`Number(value)`) for filled fields, omits empty caps. e2e asserts numeric body. |
| R19 | d-2 | New `<p data-testid="budget-saved" hidden>`; shown after a successful save, hidden on month change and when a save starts. |
| R20 | d-3 | `budget-source` text is exactly `copied from 2026-10, not saved` (no parentheses). Sketch fixed. |
| R21 | d-4 | e2e budget tests save only months ≥ `2026-10`; existing specs use ≤ `2026-04` and stay untouched by D9. `e2e/budget.spec.js` `beforeEach` PUTs the spec example budget for `2026-10` as baseline and `afterEach` deletes every expense it created. “No budget” cases use `2026-01`. |
| R22 | d-5 | d-AC1 reworded: the test fills `summary-month` with `2026-10`; nothing depends on the wall clock. |
| R23 | e-1 | `data-state` on the `summary-total` `<strong>` and on each capped `summary-category` `<li>`; CSS targets `[data-state]`. Format `1320.50 / 1500.00 (Left: 179.50)`, single spaces, parentheses, matching the notice. |
| R24 | e-2 | See R11: `byCategory` order first, then unspent capped categories appended in fixed order. |
| R25 | e-3 | Linh: `ok` = no colour. CSS only `[data-state="warn"] { color: #8a5a00 }` and `[data-state="over"] { color: #b00020 }`. e2e asserts `toHaveCSS('color', …)`: warn `rgb(138, 90, 0)`, over `rgb(176, 0, 32)`, ok = body colour `rgb(34, 34, 34)`. Attribute `data-state="ok"` still set. |
| R26 | f-1 | `88%` without a space, everywhere. Spec fixed. |
| R27 | f-2 | Linh: `budget-notice` is a `<ul>`; one `<li data-testid="budget-notice-line" data-line data-state>` per `warn`/`over` line, category first then total. |
| R28 | f-3 | D4 reworded: one line **per** budget line that is `warn` or `over`; nothing when all `ok`. |
| R29 | f-4 | A failed status fetch after a successful add hides the notice silently: no `form-error`, no `pageerror`. |
| R30 | d-6 | d's e2e fixtures come from a `PUT` in `beforeEach` (R21), never from a seed. `data/seed-budgets.json` stays `{}`. |
| R31 | d-7 | d-AC9 asserts on `budget-form` only: its bounding-box width ≤ viewport width at 390 px. |
| R32 | e-4 | e-AC9 reworded: existing assertions pass because the months they use (≤ `2026-04`) have no effective budget. |
| R33 | g-1, g-2, g-3 | Linh: demo in `data/demo-seed.json` + `data/demo-budgets.json`, loaded by `npm run seed:demo` (`store.resetFromSeed({ demo: true })`). `data/seed.json` and every existing test untouched. Demo figures = spec example (food 90 %, overall 88 %). |
| R34 | g-4 | g-AC6 measurable: ≥ 12 October rows on ≥ 8 distinct days, checked by a unit test over the demo file. “Realistic” dropped. |
| R35 | g follow-up | Demo files are verified by tests that copy them to temp paths; `npm run seed:demo` itself is never run by tests. |
| R36 | f-2 follow-up | A capped category that is `ok` while the total is `warn` shows only the total line; `data-line` values are the category slug or `total`. |
| R37 | a-1 (round 2) | Ticket a commits placeholder `data/demo-seed.json` (copy of `seed.json`) and `data/demo-budgets.json` (`{}`); ticket g overwrites them with the demo data. |
| R38 | a-2 (round 2) | Unknown-category message includes the key: `coffee: category must be one of food, transport, bills, fun`. Applied to a-AC10, a-AC15, b-AC10 and d-AC7. |
| R39 | d-1 (round 2) | d-AC4 saves `2027-01`, d-AC5 saves `2027-02`; d-AC5 is self-contained. Spec-file invariant: saving tests use months ≥ `2027-01`, inherited-state reads use `2026-11` / `2026-12` only, except `2027-04`…`2027-08`, reserved for tests that save their own source month and read inheritance from it (d-AC5c: `2027-04`…`2027-06`; e-AC11: `2027-07`, `2027-08`). |
| R40 | d-2 (round 2) | d-AC8 asserts `budget-cap-fun` is empty after reload and `GET /api/budget?month=2026-10` has no `fun` cap. |
| R41 | f-1 (round 2) | Post-add lines reuse the `loadSummary()` response when the expense month equals the picker month; a separate fetch only otherwise. f-AC11 dates the expense in a different month and aborts that separate fetch. |
| R42 | QA#2 | The notice describes the last add only; any delete hides it. |

Defaults applied without a number: a budget whose rounded cents value is ≤ 0 is rejected; two cap
keys that normalise to the same category are a 400 (`food: duplicate category`); every test the
matrix lists is written by the implementing ticket; `budget-error` is hidden on month change and
when a save starts.
