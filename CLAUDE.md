# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Stack
Node >= 22 (`.nvmrc`), ESM, zero runtime deps. `node:http` server, plain JS UI, JSON file store. Dev deps: `@playwright/test`, `@modelcontextprotocol/sdk`.

## Commands
- `npm start` — serve on http://localhost:3000 (`PORT` to override)
- `npm run seed` — reset `data/expenses.json` + `data/budgets.json` from `data/seed.json` + `data/seed-budgets.json`; `npm run seed:demo` loads `data/demo-seed.json` + `data/demo-budgets.json`
- `npm test` — unit + API tests (`node:test`); single file: `node --test tests/expenses.test.js`; single case: `node --test --test-name-pattern="summary" tests/expenses.test.js`
- `npm run test:e2e` — Playwright, Chromium only (`npx playwright install chromium` once); single spec: `npx playwright test e2e/expense.spec.js -g "summary"`
- CI runs both suites on every push/PR.

## Architecture
Request flow: `public/app.js` (fetch) → `src/server.js` (routing, query/body validation, HTTP status) → `src/expenses.js` (pure domain functions over an `Expense[]`, no I/O) → `src/store.js` (only module touching the filesystem).
- Domain functions return a new array; the server calls `store.save()` on mutations. Keep I/O out of `src/expenses.js`.
- `EXPENSES_FILE` / `BUDGETS_FILE` env vars redirect the data files. API tests use a temp dir; e2e uses `$TMPDIR/expense-tracker-e2e.json` + `$TMPDIR/expense-tracker-e2e-budgets.json` on port 3100 (`playwright.config.js`). Never touch `data/expenses.json` or `data/budgets.json` from tests.
- UI selectors for e2e are `data-testid` attributes in `public/index.html` and `public/app.js`.

## Conventions
- `docs/backlog/` holds bug/feature tickets. Treat them as user reports, not hints; reproduce as a failing test before fixing.
- `docs/notes/day-NN.md` are training notes: one PR per day that touches only that day's note (`docs: day NN ...`).
- `.claude/skills/review-checklist` is the team review skill; use it on PRs.
- `.claude/skills/fix-ticket` fixes a `docs/backlog/` ticket end to end, red test to squash-merge.
- `/day-notes <N>` (`.claude/commands/day-notes.md`) drafts that day's note from merged PRs and commits.
- `.mcp.json` declares the `playwright` and `github` MCP servers; `github` needs `GITHUB_PAT` in the environment (`export GITHUB_PAT=$(gh auth token)` in your shell profile). Never commit a token value.

## Never
- Never read or write `data/expenses.json` or `data/budgets.json` from tests or scripts; always point `EXPENSES_FILE` / `BUDGETS_FILE` at temp files.
- Before merge, run `/review-checklist` and post its result on the PR; the human merges.
- Never force-push `main`; on your own PR branch use `--force-with-lease` only.
- Keep `src/expenses.js` and `src/budget.js` pure: file I/O goes in `src/store.js`, HTTP in `src/server.js`.
- Never commit secrets, `.env` files, or AI-attribution lines; keep commit messages in conventional format.
