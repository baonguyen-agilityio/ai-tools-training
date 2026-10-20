# Day 09 — Hooks, Claude GitHub Actions, /goal

## Checkpoint
none today

## PreToolUse hook — CLAUDE.md "Never" list (#22)
- `.claude/hooks/guard-never-rules.js` is a zero-dependency Node script wired in `.claude/settings.json` as `PreToolUse` on `Bash|Edit|Write|MultiEdit|NotebookEdit`. To block a call it exits 2 with a reason on stderr.
- It blocks three things:
  - Writes to `data/expenses.json`: the edit tools, redirects, `tee`, `cp`/`mv` into it, `sed -i`, `EXPENSES_FILE=` pointing at it, and the same commands inside `bash -c`/`eval`.
  - Force-pushes to `main`/`master`: `--force`, `-f`, `--force-with-lease`, `+refspec`, `HEAD:main`, `--mirror`, and a bare push while on `main`.
  - `git commit --no-verify`: `-n`, clustered short flags (`-anm`), and shortened forms (`--no-veri`).
- Proven live in the session, one rule at a time:
  - Blocked: `touch data/expenses.json`, an Edit of the file, `git push --force --dry-run origin main`, `git commit --no-verify`.
  - Allowed: `git push --force-with-lease --dry-run origin feat/day-09-hooks`, and `head` on the data file.
  - The data file's checksum was unchanged afterwards.
- The hook took effect in the running session as soon as `settings.json` changed; no restart was needed.
- An Edit whose `old_string` did not match failed with "String to replace not found" before the hook ran, because tool input is validated first. The live proof of the Edit path used a real edit, with the file backed up first.
- Auto mode denied the shell edit of `.claude/settings.json` ("Self-Modification"). The same change went through the Edit tool.
- Known limit: the hook reads the command text, so indirect paths get through (`cd data && echo > expenses.json`, or a path built from a variable). It fails open (exit 0) on a malformed payload. It errs toward blocking: `cp data/expenses.json /tmp/x` is blocked although it only reads.
- `tests/guard-hook.test.js` runs the script through stdin, using temp git repos on `main` and on a feature branch. `npm test` went from 33/33 to 35/35 after review.

### Review (#22)
- `/review-checklist` raised four `[should]` items, all fixed in 406fc0d:
  - **Heredoc:** heredoc bodies were tokenized as commands. The hook blocked its own author: a PR body written with `cat > body.md <<'EOF'` was stopped because it mentioned the data file. Bodies are now text, checked only when fed to `sh`/`bash`/`zsh`.
  - **`bash -lc`:** `bash -lc "git push -f origin main"` was allowed, because only an exact `-c` triggered the nested check. Now any short-flag cluster containing `c` counts.
  - **`git --git-dir`:** `git --git-dir .git push -f origin main` and `git --work-tree . commit -n` were allowed, because the option's value was read as the subcommand. Those values are now skipped.
  - **Tests:** there were no tests for fail-open or MultiEdit/NotebookEdit. Both were added.
- Each bypass was confirmed with a probe script before it was posted, and re-checked after the fix. Live `bash -lc "git push --force --dry-run origin main"` was blocked. Threads were resolved after CI went green on 406fc0d.
- The script grew from 179 to 204 lines.
- Side effect: any `gh` command whose arguments contain the data-file path is blocked, so PR bodies and merge messages went through files or were reworded.

## Claude GitHub Actions (#23)
- `/install-github-app` created the branch with two workflows, both on `anthropics/claude-code-action@v1` and both authenticated with the `CLAUDE_CODE_OAUTH_TOKEN` repo secret:
  - `claude.yml` runs on `issue_comment`, `pull_request_review_comment`, `pull_request_review` and `issues` (opened, assigned), only when the text contains `@claude`.
  - `claude-code-review.yml` runs on every `pull_request` (opened, synchronize, ready_for_review, reopened).
- The repo is private, so only collaborators can trigger `@claude`.
- On its own PR, the `claude-review` job showed green (12s) but its action steps were `skipped` and it posted nothing; the log does not say why.
- Once the workflow was on `main`, `claude-review` ran on #24 and posted a comment. `claude.yml` (`@claude` mentions) has not been triggered yet.
- `/review-checklist`: no blockers. Two `[should]` follow-ups were neither fixed nor filed: each push to any PR triggers a full review, including docs-only notes (`paths-ignore: ['docs/**']` would stop that), and the first live run of each workflow still needed checking.

## fix-ticket end to end — BUG-007 (#21)
- Red test e15543e, fix fe15066: the `month` regex in `src/server.js` became `/^\d{4}-(0[1-9]|1[0-2])$/`, so `2026-13` and `2026-00` return 400.
- `/review-checklist` raised one `[should]`: expense dates had the same shape-only validation. It was deferred and filed as BUG-008 (d0cafed). Two nits were answered "won't fix", one of them backed by a mutant check.

## /goal — BUG-008 (#24)
- `/goal` set a session Stop hook with the condition "BUG-008 is fixed via /fix-ticket: red test committed first, fix merged-ready in a PR, CI green, /review-checklist threads verified and resolved. Stop when the PR is open and green; do not merge." The session ran `fix-ticket` to an open green PR and stopped there.
- Ticket: all claims held, including the reporter's guess that `Date.parse` rolls `2026-02-31` over to March 3. An unreported sibling, `2026-02-29` in a non-leap year, was accepted the same way.
- Red test 8b496da (`2026-02-31`: 201 ≠ 400). Fix b664f0b: `validate()` in `src/expenses.js` now checks that the parsed date formats back to the same `YYYY-MM-DD`.
- `/review-checklist` on b664f0b raised one `[should]`: no test accepted a real month-end day. A mutant that rejects every 31st passed all 36 tests.
  - The fix, 7d5fa41, added unit test `validate: accepts the last real day of a month and rejects the day after`.
  - Two mutants (reject every 31st; revert to `Date.parse` only) both turned it red.
  - The thread was resolved with the sha, the test name and the mutant results. `npm test` 37/37, e2e 10/10.
- On the same commit, b664f0b, the GitHub `@claude` review posted "No issues found. Checked for bugs and CLAUDE.md compliance." The run on 7d5fa41 posted nothing.
- Merged as a38f603, after the goal was reached and on a separate instruction.

## Lessons
- Prove a hook live with harmless probes (`touch`, `--dry-run`, nothing staged), so a hook that never loaded cannot do damage.
- A guard that parses command text needs tests for wrappers (`bash -lc`, `eval`, git global options) and for text that only mentions a command (heredocs, commit messages).
- A guard's false positive can show up first on its author's own commands; treat it as a review finding.
- A green check is not a run: open the job log and check that the steps actually executed.
- A clean automated review does not prove coverage; a mutant that survives the suite disproves it.
- Test both sides of a validation boundary; a reject-only test lets an over-strict fix through.
- Write `/goal` conditions with an explicit stop ("do not merge") so the session ends where review takes over.

## Evidence
- Drive day-09: https://drive.google.com/drive/folders/13xIrP4OilxL5TpbjPwCqh-KIwBYHe6TN (screenshot of #24: bot "No issues found" next to the local `/review-checklist`)
- PRs: #21, #22, #23, #24
- Commits: a48c36a (BUG-007 ticket), e075901 (#21), 43bc6ea (#22), 47a498e (#23), d0cafed (BUG-008 ticket), a38f603 (#24)
- #22 review: https://github.com/baonguyen-agilityio/ai-tools-training/pull/22#pullrequestreview-5582988286
- #24 review: https://github.com/baonguyen-agilityio/ai-tools-training/pull/24#pullrequestreview-5583665960
