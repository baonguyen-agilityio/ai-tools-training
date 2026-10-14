# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Stack
Node >= 22 (`.nvmrc`), ESM, zero runtime deps. `node:http` server, plain JS UI, JSON file store. Only dev dep: `@playwright/test`.

## Commands
- `npm start` — serve on http://localhost:3000 (`PORT` to override)
- `npm run seed` — reset `data/expenses.json` from `data/seed.json`
- `npm test` — unit + API tests (`node:test`); single file: `node --test tests/expenses.test.js`; single case: `node --test --test-name-pattern="summary" tests/expenses.test.js`
- `npm run test:e2e` — Playwright, Chromium only (`npx playwright install chromium` once); single spec: `npx playwright test e2e/expense.spec.js -g "summary"`
- CI runs both suites on every push/PR.

## Architecture
Request flow: `public/app.js` (fetch) → `src/server.js` (routing, query/body validation, HTTP status) → `src/expenses.js` (pure domain functions over an `Expense[]`, no I/O) → `src/store.js` (only module touching the filesystem).
- Domain functions return a new array; the server calls `store.save()` on mutations. Keep I/O out of `src/expenses.js`.
- `EXPENSES_FILE` env var redirects the data file. API tests use a temp dir; e2e uses `$TMPDIR/expense-tracker-e2e.json` on port 3100 (`playwright.config.js`). Never touch `data/expenses.json` from tests.
- UI selectors for e2e are `data-testid` attributes in `public/index.html` and `public/app.js`.

## Conventions
- `docs/backlog/` holds bug/feature tickets. Treat them as user reports, not hints; reproduce as a failing test before fixing.
- `docs/notes/day-NN.md` are training notes: one PR per day that touches only that day's note (`docs: day NN ...`).
- `.claude/skills/review-checklist` is the team review skill; use it on PRs.
