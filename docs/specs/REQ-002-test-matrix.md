# REQ-002 test matrix

One row per acceptance criterion in `docs/backlog/REQ-002a.md` … `REQ-002g.md`, plus the edge cases
Linh asked to see covered. Levels: **unit** = `node:test` on `src/budget.js` / `src/store.js`
(`tests/budget.test.js`), **API** = `node:test` against `createServer()` with temp
`EXPENSES_FILE` + `BUDGETS_FILE`, **e2e** = Playwright `e2e/budget.spec.js` on port 3100 with temp
files. Status column is filled in by the implementing PR.

## REQ-002a — storage and effective budget

| ID | Criterion | Level | Status |
|----|-----------|-------|--------|
| a-AC1 | `loadBudgets()` → `{}` when file missing, file not created | unit | |
| a-AC2 | `saveBudgets()` then `loadBudgets()` round-trips, honours `BUDGETS_FILE` | unit | |
| a-AC3 | `effectiveBudget` returns the saved month itself | unit | |
| a-AC4 | Inherits from nearest earlier saved month across a gap (Sep, Oct saved → Dec uses Oct) | unit | |
| a-AC5 | Month before the first saved month → `null` / `null` | unit | |
| a-AC6 | Empty budgets object → `null` / `null` | unit | |
| a-AC7 | `validateBudget` rounds to cents, accepts numeric strings | unit | |
| a-AC8 | `total` missing / 0 / negative / NaN / text → throws | unit | |
| a-AC9 | Cap key outside the four (`coffee`) → throws | unit | |
| a-AC10 | Cap 0 / negative / text → throws naming the category | unit | |
| a-AC11 | `categories` omitted or `{}` → `categories: {}` | unit | |
| a-AC12 | `resetFromSeed()` resets both temp files from both seeds | unit | |

## REQ-002b — budget API

| ID | Criterion | Level | Status |
|----|-----------|-------|--------|
| b-AC1 | GET saved month → 200, `source` = month | API | |
| b-AC2 | GET unsaved later month → 200, `source` = earlier month | API | |
| b-AC3 | GET month before first saved → 200, `source: null, budget: null` | API | |
| b-AC4 | GET/PUT with bad or missing `month` → 400 `month must be YYYY-MM` | API | |
| b-AC5 | PUT valid body → 200, normalised, file written | API | |
| b-AC6 | PUT replaces the month wholesale (caps not merged), other months intact | API | |
| b-AC7 | PUT on an inherited month writes only that month | API | |
| b-AC8 | PUT bad JSON / no total / total ≤ 0 / cap ≤ 0 / cap `coffee` → 400, nothing written | API | |
| b-AC9 | POST/DELETE `/api/budget` → 405 | API | |
| b-AC10 | Tests never touch `data/budgets.json` (temp `BUDGETS_FILE` in every test file) | review | |

## REQ-002c — status in summary

| ID | Criterion | Level | Status |
|----|-----------|-------|--------|
| c-AC1 | Overall line: spent / left / pct / state, existing fields unchanged | unit + API | |
| c-AC2 | Capped category line with spend | unit | |
| c-AC3 | Below 80 % (399.99 / 500) → `ok` | unit | |
| c-AC4 | **Exactly 80 %** (400.00 / 500) → `warn` | unit | |
| c-AC5 | **Exactly 100 %** (500.00 / 500) → `over`, `left: 0`, `pct: 100` | unit | |
| c-AC6 | Above 100 % → `over`, negative `left`, `pct` > 100 | unit | |
| c-AC7 | Capped category with no spend → `spent: 0`, `ok` | unit | |
| c-AC8 | **Category outside the four** counts toward overall only, absent from `budget.categories` | unit | |
| c-AC9 | **Copied from previous month**: unsaved Nov uses Oct budget with Nov expenses, `source: "2026-10"` | API | |
| c-AC10 | **No budget set** (month before first saved) → `budget: null`, rest identical to today | API | |
| c-AC11 | Float trap (3 × 0.1 vs 0.3) → `over`, `left: 0` | unit | |
| c-AC12 | CSV export byte-identical with a budget set | API | |

## REQ-002d — set budget UI

| ID | Criterion | Level | Status |
|----|-----------|-------|--------|
| d-AC1 | Fields pre-filled from saved month, source note hidden | e2e | |
| d-AC2 | **Copied from previous month**: fields pre-filled, note `copied from 2026-10, not saved` | e2e | |
| d-AC3 | **No budget set**: fields empty, note hidden | e2e | |
| d-AC4 | Save sends PUT with typed values, empty caps omitted, shows `Saved for …` | e2e | |
| d-AC5 | Saving an inherited month leaves the source month unchanged | e2e | |
| d-AC6 | Empty / 0 total blocked by native validation, no request | e2e | |
| d-AC7 | 400 from server shown in `budget-error`, inputs keep values | e2e | |
| d-AC8 | Clearing a cap and saving removes it | e2e | |
| d-AC9 | Phone-width layout wraps, no horizontal scroll | e2e (viewport 390 px) | |

## REQ-002e — status display

| ID | Criterion | Level | Status |
|----|-----------|-------|--------|
| e-AC1 | Total line `spent / budget   Left: x`, `data-state="warn"` | e2e | |
| e-AC2 | Category line `Over by x`, `data-state="over"` | e2e | |
| e-AC3 | **Exactly 100 %** → `Left: 0.00` with `data-state="over"` | e2e | |
| e-AC4 | `ok` → `data-state="ok"`, neutral colour | e2e | |
| e-AC5 | Capped category with zero spend still listed | e2e | |
| e-AC6 | **Category outside the four** rendered exactly as today | e2e | |
| e-AC7 | **No budget set** → total and category lines identical to today | e2e | |
| e-AC8 | Amber / red CSS applied and text carries the same info | e2e + review | |
| e-AC9 | Lines refresh after add / delete without reload | e2e | |
| e-AC10 | Existing summary e2e assertions still pass with no budget in fixture | e2e (existing) | |

## REQ-002f — post-add notice

| ID | Criterion | Level | Status |
|----|-----------|-------|--------|
| f-AC1 | Category `over` → `food: over budget (Over by …)` | e2e | |
| f-AC2 | Category `warn` → `food: 90% of budget (Left: …)` | e2e | |
| f-AC3 | Overall `warn`/`over` → second `total:` line, category first | e2e | |
| f-AC4 | **Category outside the four**: no category line, total line still shown when due | e2e | |
| f-AC5 | Both `ok` → notice hidden | e2e | |
| f-AC6 | **No budget set** for the expense's month → notice hidden | e2e | |
| f-AC7 | Notice uses the **expense's month** (Nov expense while picker on Oct; Nov inherits Oct) | e2e | |
| f-AC8 | Next add replaces the notice, never stacks | e2e | |
| f-AC9 | Failed add leaves the notice unchanged | e2e | |
| f-AC10 | Expense saved and listed even when it pushes a line to `over` | e2e | |

## REQ-002g — demo seed

| ID | Criterion | Level | Status |
|----|-----------|-------|--------|
| g-AC1 | `npm run seed` writes both files from both seeds | unit (`resetFromSeed` on temp paths) | |
| g-AC2 | October food pct in 88–92, `warn` | API (temp copy of seeds) | |
| g-AC3 | October overall `warn`, nothing `over` | API | |
| g-AC4 | `fun` capped and `ok`; transport, bills uncapped; one outside-four category present | API | |
| g-AC5 | **Past month** (2026-09) → `budget: null` | API | |
| g-AC6 | October has > 10 rows with spread dates (pager shows page 2) | e2e | |
| g-AC7 | Full existing suites green against the new seed | unit + API + e2e (existing) | |
| g-AC8 | No test writes `data/*.json` | review | |

## Edge-case cross-reference

| Edge case | Rows |
|-----------|------|
| Exactly 80 % | c-AC4 |
| Exactly 100 % | c-AC5, e-AC3 |
| No budget set | a-AC5, a-AC6, b-AC3, c-AC10, d-AC3, e-AC7, f-AC6, g-AC5 |
| Copied from previous month | a-AC4, b-AC2, b-AC7, c-AC9, d-AC2, d-AC5, f-AC7 |
| Category outside the four | a-AC9, b-AC8, c-AC8, e-AC6, f-AC4, g-AC4 |
| Past month (before first saved budget) | a-AC5, b-AC3, c-AC10, g-AC5 |
| Float / cents arithmetic | a-AC7, c-AC11 |
