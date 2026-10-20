# Day 08 — MCP servers: GitHub and Playwright

## Checkpoint
none today

## Project MCP config
- `.mcp.json` declares two servers: `playwright` (stdio, `npx -y @playwright/mcp@0.0.83`) and `github` (http, `https://api.githubcopilot.com/mcp/`).
- GitHub OAuth failed with "does not support dynamic client registration". The server instead sends `Authorization: Bearer ${GITHUB_PAT}`; `GITHUB_PAT` is exported in `~/.zshrc` from `gh auth token`. No token is stored in the repo.
- Before committing, `.mcp.json` was scanned for token-like strings (`ghp_…`, `github_pat_…`, literal `Bearer …`): 0 matches, one `${GITHUB_PAT}` reference.
- MCP tools are deferred: each tool's schema was loaded through ToolSearch just before its first call.
- Shipped in #20, with `.playwright-mcp/` added to `.gitignore`.

## GitHub MCP — review thread on #19
- `pull_request_read` (`get_review_comments`) listed 5 review threads on #19: 4 resolved, 1 open. The open one was the `[should] Tests` thread on `.claude/skills/fix-ticket/SKILL.md:6`: steps 2–7 of `fix-ticket` have never run end to end.
- `add_reply_to_pull_request_comment` posted a reply on that thread: "Kept open on purpose: steps 2–7 of fix-ticket will be exercised end to end on the next backlog ticket; resolve then." The thread stays open.
- The reply tool takes the numeric comment id (`4322724525`), not the thread node id (`PRRT_…`).
- Only MCP tools were used for this step, not the `gh` CLI.

## Playwright MCP — BUG-006 re-check
- The app ran on port 3200 with `EXPENSES_FILE` pointed at a scratch file, not `data/expenses.json`.
- An expense was added through the UI: 2026-03-21, amount 1, category `<b>food</b>`, note `probe`.
- In the category cell, `textContent` was `<b>food</b>`, `innerHTML` was `&lt;b&gt;food&lt;/b&gt;`, and there was no `<b>` element. The BUG-006 fix (#17) still holds.
- `browser_fill_form` with field type `combobox` failed on the `<input list>` category field ("Element is not a <select> element"); type `textbox` worked.
- Saving the screenshot to a directory outside the repo was denied, because the Playwright MCP may only write inside the repo and `.playwright-mcp/`. The screenshot went to `.playwright-mcp/bug-006-probe.png`.
- The only console error was a `favicon.ico` 404. The browser was closed, the server stopped and port 3200 freed.

## Review (#20)
- `/review-checklist` raised three `[should]` items, all fixed:
  - `npx -y @playwright/mcp@latest` in a team-shared config: pinned to `0.0.83`.
  - The `GITHUB_PAT` setup was documented only in this note: added a line to CLAUDE.md.
  - This note had `TODO`s and a branch sha that does not survive the squash: now cites #20.

## Lessons
- Pin `npx -y` packages in shared config; `@latest` runs new code in every teammate's session.
- When a remote MCP server does not support OAuth dynamic client registration, use a header token read from an env var.
- Commit `${VAR}` references, never values, and scan the config for token patterns before committing.
- MCP tools write output into the repo; gitignore their output directory.
- To prove HTML escaping, check `innerHTML` and the child elements, not only the visible text.
- An open review thread gets a reply that says why it is open and when it will be resolved.

## Evidence
- Drive day-08: https://drive.google.com/drive/folders/1BayYHoA3bB7vo8x03sy35oGi7sPNbChl
- PRs: #20
- #19 thread reply: https://github.com/baonguyen-agilityio/ai-tools-training/pull/19#discussion_r4322854270
- Screenshot: TODO (local `.playwright-mcp/bug-006-probe.png`, gitignored; upload to Drive)
