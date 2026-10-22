# Expense Tracker — AI Tools Training Sandbox

Minimal expense tracker used as the sandbox for the 15-day AI Tools training.
Zero runtime dependencies. Plain Node, plain JS, plain HTML.

## Pre-flight

Check these before Day 1:

```bash
node -v        # >= 22 (see .nvmrc)
npm -v
git --version
gh --version   # GitHub CLI, used for PRs
```

Install and run:

```bash
npm install                      # only dev dep: @playwright/test
npx playwright install chromium  # browser for e2e, once
npm run seed                     # resets data/expenses.json from data/seed.json
npm start                        # http://localhost:3000
```

Verify:

```bash
npm test          # unit + API tests (node:test)
npm run test:e2e  # browser tests (Playwright)
```

All of the above must be green on a fresh clone. If not, fix your environment first.

## Layout

```
src/        server, store, domain logic
public/     static web page calling the API
data/       seed.json (committed), expenses.json (generated, ignored)
tests/      node:test suites
e2e/        Playwright specs
docs/       backlog tickets and project docs
```

## Workflow

- `data/expenses.json` is local state. Reset with `npm run seed`.
- Bug tickets live in `docs/backlog/`. Treat them as reports from a user, not as hints.
- CI runs `npm test` and `npm run test:e2e` on every push.

## MCP server

`mcp/expenses-server.js` exposes the expense data to Claude Code over stdio (read-only, honours `EXPENSES_FILE`). It is registered in `.mcp.json` as `expenses`.

| Tool | Input | Returns |
|------|-------|---------|
| `monthly_summary` | `month: "YYYY-MM"` | total and per-category totals, same as `GET /api/summary` |
| `search_expenses` | `q`, optional `category`, `page` | matching expenses newest first, same as `GET /api/expenses` |

A malformed month is rejected with an MCP `InvalidParams` error, like the API's 400.

Approve it once per clone: start `claude` in the repo, accept the prompt for the project `.mcp.json` servers (or run `/mcp` and enable `expenses`). Then ask e.g. "what did I spend in 2026-02?". Tested in `tests/mcp.test.js`, which runs under `npm test`.
