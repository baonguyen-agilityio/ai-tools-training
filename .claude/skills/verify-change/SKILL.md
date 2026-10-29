---
name: verify-change
description: "Verify a change is actually done: runs npm test, reads git diff origin/main...HEAD, flags weakened tests, reports with evidence. Use before opening a PR, or when asked to 'verify', 'check it works', or 'is it done'."
allowed-tools: Bash(npm test *), Bash(git diff *), Bash(git status *)
---

# Verify change

Prove the change is done from command output, not from memory of what was written. Every claim in the report cites a command and its output, or a file:line.

## 1. Tests

Run `npm test`. Quote the real summary lines (`ℹ tests`, `ℹ pass`, `ℹ fail`, `ℹ skipped`, `ℹ todo`). Any `fail` > 0 → NOT DONE; quote the first failing test name and its assertion message.

## 2. Diff

Run `git status` (uncommitted work counts too), then `git diff origin/main...HEAD` and `git diff` for anything uncommitted. Read the hunks themselves. Do not rely on a summary, commit message, or PR description.

## 3. Weakened tests

In every hunk under `tests/` or `e2e/`, flag:
- removed `assert.*` / `expect(` lines, or deleted `test(` / `it(` / `describe(` blocks;
- deleted test files (`deleted file mode` in the diff);
- relaxed assertions: `strictEqual`/`deepEqual` → `ok`/`equal`, `toBe`/`toEqual` → `toBeTruthy`/`toContain`, exact regex → looser one, tighter count → `>=`;
- changed expected values (a literal on the expected side of an assertion);
- added `.skip`, `.only`, `.todo`, `{ skip: ... }`, `{ todo: ... }`, or `test.fixme`.

Each hit is a finding unless the same diff changes the behaviour under test in a way that requires it. Say which `src/` hunk justifies it, or flag it.

## 4. Report

| Check | Command | Evidence (output excerpt or file:line) | Verdict |
|---|---|---|---|
| Tests | `npm test` | `ℹ tests 61` / `ℹ pass 61` / `ℹ fail 0` | pass |
| Weakened test | `git diff origin/main...HEAD` | `tests/api.test.js:42` expected `201` → `200` | flag |

End with one line: **DONE** or **NOT DONE**, plus what blocks it. Never write "tests pass" without the quoted counts from this run.
