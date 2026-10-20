# Day 07 — Skills, commands, plugins

## Checkpoint
none today

## Team skill — fix-ticket
- `.claude/skills/fix-ticket/SKILL.md` (44 lines) distilled from PRs #9, #14, #16, #17: ticket as user report, red test first, smallest fix in the right layer, PR, `/review-checklist`, verified thread resolution, squash-merge.
- Fresh session, prompt "what skill would you use to fix BUG-003" without naming the skill: Claude picked `fix-ticket` and listed its steps. It read the file with Bash `cat`, not the Skill tool.

## Slash command — day-notes
- `.claude/commands/day-notes.md` drafts `docs/notes/day-NN.md` from merged PRs and commits. Rules: no invented numbers or links, unknowns marked `TODO`, stop before commit.
- First run (this note): every PR merged today (#16, #17, #18) was already cited in day 06 and was skipped; no Day 07 PRs or commits on `main` yet.

## Permissions
- `.claude/settings.json` allows `Bash(gh pr merge:*)`, so auto mode no longer blocks the merge step (blocked twice on Day 4).

## Where skills and commands load from
- Skills and commands load from the directory where `claude` starts. A session started at `/` (Zed window with loose files, no folder) did not see them; fixed by opening the folder as a Zed project and starting `claude` there.
- A Zed launched from inside another Claude session inherited `CLAUDE_CODE_CHILD_SESSION`, which disabled transcript saving; fixed by quitting and relaunching Zed.

## Plugin — typescript-lsp
- Installed from the official marketplace. Cost ~0.6k tokens (the LSP tool loads on demand); skills went from 152 to 154.
- LSP failed twice: first the `typescript-language-server` binary was missing, then "Could not find a valid TypeScript installation" (needs `typescript` in the repo). Each time Claude said so and fell back to grep.
- Grep result for the same query: 5 `escapeHtml()` calls, all in `loadList()` (`public/app.js:30-34`); 3 `store.save()` calls (`src/server.js:73` POST, `src/server.js:85` DELETE, `tests/store.test.js:22`).
- Verdict: worth it for TypeScript repos; not worth adding a dependency to this zero-dependency JS repo.

## Lessons
- A skill written from merged PRs captures the team's real workflow; Claude finds it without being told the name.
- Skills, commands and settings are per directory; start `claude` in the repo root.
- Allowlist the specific command auto mode keeps blocking instead of switching modes.
- A plugin is only as good as its runtime dependencies; check them before installing.
- When a tool fails, the fallback must be stated, not silent.

## Evidence
- Drive day-07: https://drive.google.com/drive/folders/1y8Cnt0V36Kycs--vckmJVigNa76tUzHj
- PRs: this PR (`fix-ticket` skill, `day-notes` command, `settings.json`, this note).
