# REQ-002 test matrix

One row per acceptance criterion in `docs/backlog/REQ-002a.md` … `REQ-002g.md`, plus the edge cases
Linh asked to see covered. Levels: **unit** = `node:test` on `src/budget.js` / `src/store.js` /
`src/expenses.js` (`tests/budget.test.js`, `tests/demo-seed.test.js`), **API** = `node:test` against
`createServer()` with temp `EXPENSES_FILE` + `BUDGETS_FILE` (`tests/api.test.js`), **MCP** =
`tests/mcp.test.js`, **hook** = `tests/guard-hook.test.js`, **e2e** = Playwright `e2e/budget.spec.js`
on port 3100 with temp files, **review** = checked by the reviewer, not automated. Every row with an
automated level is a test the implementing ticket must write. Status column is filled in by the
implementing PR.

## REQ-002a — storage, isolation, effective budget

| ID | Criterion | Level | Status |
|----|-----------|-------|--------|
| a-AC1 | `loadBudgets()` → `{}` when file missing, file not created | unit | done (REQ-002a) |
| a-AC2 | `saveBudgets()` / `loadBudgets()` round-trip in cents, honours `BUDGETS_FILE` | unit | done (REQ-002a) |
| a-AC3 | `effectiveBudget` returns the saved month itself | unit | done (REQ-002a) |
| a-AC4 | Inherits from nearest earlier saved month across a gap | unit | done (REQ-002a) |
| a-AC5 | Month before the first saved month → `null` / `null` | unit | done (REQ-002a) |
| a-AC6 | Empty budgets object → `null` / `null` | unit | done (REQ-002a) |
| a-AC7 | Keys not matching `MONTH_RE` ignored when resolving | unit | done (REQ-002a) |
| a-AC8 | `validateBudget` returns cents, accepts numeric strings | unit | done (REQ-002a) |
| a-AC9 | `total` missing / 0 / negative / NaN / text → `total must be a positive number` | unit | done (REQ-002a) |
| a-AC10 | Cap key `coffee` → `coffee: category must be one of …` (R38) | unit | done (REQ-002a) |
| a-AC11 | Cap key ` Food ` normalised to `food` | unit | done (REQ-002a) |
| a-AC12 | Cap 0 / negative / text → `<cat> cap must be a positive number` | unit | done (REQ-002a) |
| a-AC13 | `categories` null / array / string → `categories must be an object`; omitted → `{}` | unit | done (REQ-002a) |
| a-AC14 | Input null / array / number → `body must be an object` | unit | done (REQ-002a) |
| a-AC15 | Error precedence: total before categories; keys in insertion order, message names the key | unit | done (REQ-002a) |
| a-AC16 | `loadBudgets()` throws on unparsable JSON | unit | done (REQ-002a) |
| a-AC17 | `resetFromSeed()` and `resetFromSeed({ demo: true })` reset both temp files | unit | done (REQ-002a) |
| a-AC18 | Every suite sets `BUDGETS_FILE` to a temp path; `budgetsFile()` / `dataFile()` outside `data/` during tests | unit + review | done (REQ-002a) |
| a-AC19 | `.gitignore` lists `data/budgets.json` | review | done (REQ-002a) |
| a-AC20 | Hook blocks Bash / Write / Edit on `data/budgets.json`; `npm run seed`, `seed:demo` allowed | hook | done (REQ-002a) |
| a-AC21 | `monthCents()` exported; `summary()` output unchanged | unit (existing summary tests) | done (REQ-002a) |
| a-AC22 | Rounded cents value 0 (`0.004`) → rejected | unit | done (REQ-002a) |
| a-AC23 | Duplicate keys after normalising → `food: duplicate category` | unit | done (REQ-002a) |

## REQ-002b — budget API

| ID | Criterion | Level | Status |
|----|-----------|-------|--------|
| b-AC1 | GET saved month → 200, `source` = month, currency amounts | API | done (REQ-002b) |
| b-AC2 | GET unsaved later month → 200, `source` = earlier month | API | done (REQ-002b) |
| b-AC3 | GET month before first saved → 200, `source: null, budget: null` | API | done (REQ-002b) |
| b-AC4 | GET/PUT with bad or missing `month` → 400 `month must be YYYY-MM` | API | done (REQ-002b) |
| b-AC5 | PUT valid body → 200, stored in cents | API | done (REQ-002b) |
| b-AC6 | PUT replaces the month wholesale, other months intact | API | done (REQ-002b) |
| b-AC7 | PUT on an inherited month writes only that month | API | done (REQ-002b) |
| b-AC8 | PUT `{not json` → 400 `invalid JSON body` | API | done (REQ-002b) |
| b-AC9 | PUT `null` / `[]` / `5` → 400 `body must be an object`, nothing written | API | done (REQ-002b) |
| b-AC10 | PUT no total / total ≤ 0 / `0.004` / cap ≤ 0 / `categories: []` / cap `coffee` (keyed message) / duplicate keys → 400, nothing written | API | done (REQ-002b) |
| b-AC11 | POST/DELETE `/api/budget` → 405 | API | done (REQ-002b) |
| b-AC12 | Unparsable budgets file → 500, server keeps serving | API | done (REQ-002b) |
| b-AC13 | README “HTTP API” table has the seven routes | review | done (REQ-002b) |

## REQ-002c — status in summary

| ID | Criterion | Level | Status |
|----|-----------|-------|--------|
| c-AC1 | Overall line: spent / left / pct / state, existing fields unchanged | unit + API | |
| c-AC2 | Capped category line with spend | unit | |
| c-AC3 | Below 80 % (399.99 / 500) → `ok`, `pct: 79` | unit | |
| c-AC4 | **Exactly 80 %** (400.00 / 500) → `warn`, `pct: 80` | unit | |
| c-AC5 | **Exactly 100 %** (500.00 / 500) → `over`, `left: 0`, `pct: 100` | unit | |
| c-AC6 | Above 100 % → `over`, negative `left`, `pct: 107` | unit | |
| c-AC7 | Capped category with no spend → `spent: 0`, `ok` | unit | |
| c-AC8 | **Category outside the four** counts toward overall only, absent from `budget.categories` | unit | |
| c-AC9 | `budget.categories` in fixed order regardless of save order | unit | |
| c-AC10 | **Copied from previous month**: unsaved Nov uses Oct budget with Nov expenses, `source: "2026-10"` | API | |
| c-AC11 | **No budget set** (month before first saved) → `budget: null`, rest identical to today | API | |
| c-AC12 | Integer `pct` (0.29 / 1.00 → 29) and float trap (3 × 0.10 vs 0.30 → `over`, `left: 0`) | unit | |
| c-AC13 | CSV export identical with and without a budget | API | |
| c-AC14 | Unparsable budgets file → `/api/summary` 500 | API | |
| c-AC15 | MCP `monthly_summary` deep-equals `summaryWithBudget()` over the same temp files | MCP | |

## REQ-002d — set budget UI

| ID | Criterion | Level | Status |
|----|-----------|-------|--------|
| d-AC1 | Picking `2026-10` pre-fills saved values, source note hidden | e2e | |
| d-AC2 | **Copied from previous month**: fields pre-filled, note exactly `copied from 2026-10, not saved` | e2e | |
| d-AC3 | **No budget set** (`2026-01`): fields empty, note hidden | e2e | |
| d-AC4 | Save on `2027-01` sends numeric PUT body, empty caps omitted, `budget-saved` shows `Saved for 2027-01.` | e2e | |
| d-AC5 | Saving `2027-02` leaves `2026-10` unchanged; `budget-saved` and `budget-error` hidden on month change | e2e | |
| d-AC6 | Empty / 0 total blocked by native validation, no request | e2e | |
| d-AC7 | Routed 400 (keyed category message) shown in `budget-error`, inputs keep values; hidden again on save start and month change | e2e | |
| d-AC8 | Clearing `fun` and saving omits it from the body; field empty after reload; `GET /api/budget` has no `fun` | e2e | |
| d-AC9 | `budget-form` bounding box ≤ 390 px at phone width | e2e (viewport 390 px) | |

## REQ-002e — status display

| ID | Criterion | Level | Status |
|----|-----------|-------|--------|
| e-AC1 | Total line `1320.50 / 1500.00 (Left: 179.50)`, `data-state="warn"`, warn colour | e2e | |
| e-AC2 | Category line `(Over by 35.50)`, `data-state="over"`, over colour | e2e | |
| e-AC3 | **Exactly 100 %** → `(Left: 0.00)` with `data-state="over"` | e2e | |
| e-AC4 | `ok` → `data-state="ok"`, body colour (no rule) | e2e | |
| e-AC5 | Capped category with zero spend listed after `byCategory` lines | e2e | |
| e-AC6 | **Category outside the four** rendered exactly as today, no `data-state` | e2e | |
| e-AC7 | **No budget set** (`2026-01`) → total and category lines identical to today | e2e | |
| e-AC8 | Lines refresh after add / delete without reload | e2e | |
| e-AC9 | Existing `expense.spec.js` summary assertions pass unchanged (months ≤ 2026-04) | e2e (existing) | |

## REQ-002f — post-add notice lines

| ID | Criterion | Level | Status |
|----|-----------|-------|--------|
| f-AC1 | Category `over` → line `food: over budget (Over by …)`, `data-line="food"`, `data-state="over"` | e2e | |
| f-AC2 | Category `warn` → `food: 90% of budget (Left: …)` | e2e | |
| f-AC3 | Category `over` + overall `warn` → two lines in order, each with its own `data-state` | e2e | |
| f-AC4 | **Category outside the four**: only the `total` line | e2e | |
| f-AC5 | Capped category `ok` + overall `warn` → only the `total` line | e2e | |
| f-AC6 | All `ok` → list hidden, no lines | e2e | |
| f-AC7 | **No budget set** for the expense's month → hidden | e2e | |
| f-AC8 | Lines use the **expense's month** (Nov expense while picker on Oct; Nov inherits Oct) | e2e | |
| f-AC9 | Next add replaces the lines, never stacks | e2e | |
| f-AC10 | Failed add leaves the list unchanged | e2e | |
| f-AC11 | Expense in a month ≠ picker, separate fetch aborted → hidden, no `form-error`, no `pageerror`, picker summary refreshed | e2e | |
| f-AC12 | Expense saved and listed even when it pushes a line to `over` | e2e | |
| f-AC13 | Expense month = picker month → exactly one summary request (R41) | e2e | |

## REQ-002g — demo data

| ID | Criterion | Level | Status |
|----|-----------|-------|--------|
| g-AC1 | `npm run seed:demo` loads the demo pair; `seed.json` / `seed-budgets.json` unchanged vs `main` | review (`git diff main -- data/seed.json data/seed-budgets.json` empty) | |
| g-AC2 | Demo October total 1320.50 and `byCategory` figures | unit (temp copies) | |
| g-AC3 | Demo overall 88 % `warn`, food 90 % `warn` | unit | |
| g-AC4 | Demo fun 66 % `ok`; `budget.categories` keys exactly `food`, `fun` | unit | |
| g-AC5 | **Past month** (2026-09) → `budget: null` | unit | |
| g-AC6 | ≥ 12 October rows on ≥ 8 distinct days, all pass `validate()`, unique ids | unit | |
| g-AC7 | Non-October rows equal `data/seed.json` | unit | |
| g-AC8 | No edits under `tests/` or `e2e/` except the new demo-file test; suites green | review + CI | |
| g-AC9 | README documents `seed:demo` | review | |

## Edge-case cross-reference

| Edge case | Rows |
|-----------|------|
| Exactly 80 % | c-AC4 |
| Exactly 100 % | c-AC5, e-AC3 |
| No budget set | a-AC5, a-AC6, b-AC3, c-AC11, d-AC3, e-AC7, f-AC7, g-AC5 |
| Copied from previous month | a-AC4, b-AC2, b-AC7, c-AC10, d-AC2, d-AC5, f-AC8 |
| Category outside the four | a-AC10, b-AC10, c-AC8, e-AC6, f-AC4, g-AC4 |
| Validation defaults (cents ≤ 0, duplicate keys) | a-AC22, a-AC23, b-AC10 |
| Past month (before first saved budget) | a-AC5, b-AC3, c-AC11, g-AC5 |
| Integer cents / float traps | a-AC8, c-AC12 |
| Isolation from `data/budgets.json` | a-AC18, a-AC19, a-AC20, b-AC12, g-AC8 |
