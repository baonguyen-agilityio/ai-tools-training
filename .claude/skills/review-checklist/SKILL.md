---
name: review-checklist
description: "Review a diff or PR with the team checklist: correctness → tests → readability → security → scope; ≥3 actionable comments, no praise"
---

# Review checklist

Review the given diff, PR number, or branch. Input forms:
- `/review-checklist` → `git diff` of the working tree, falling back to `git diff main...HEAD`
- `/review-checklist <PR number>` → `gh pr diff <n>`
- `/review-checklist <path or ref>` → `git diff <ref>` or the file content

Read the whole diff before writing anything. Read surrounding code when a hunk is not self-explanatory.

## Order of review

Go through the checklist in this order. Do not skip a step; write "none found" if a step yields nothing.

1. **Correctness** — logic errors, off-by-one, wrong edge cases, unhandled failure paths, behavior that differs from the stated intent (PR title, commit message, ticket).
2. **Tests** — is the changed behavior covered? Are the tests asserting the actual outcome or just that the code ran? Which case is tested only on the happy path? Which case was never mentioned?
3. **Readability** — naming, misleading comments, dead code, duplication a maintainer would trip on. Not style nits a formatter would catch.
4. **Security** — input validation at trust boundaries, injection, path traversal, secrets in the diff, unsafe defaults, data exposure in logs or responses.
5. **Scope** — changes unrelated to the stated goal, hidden behavior changes, public contract changes not called out, missing docs when user-facing behavior changed.

## Output rules

- At least 3 comments. If the diff genuinely has fewer issues, pad with test gaps or scope questions, never with praise.
- No praise, no "looks good", no summary of what the diff does.
- Each comment: `file:line` (or hunk reference), the problem in one sentence, the concrete fix or question in one sentence.
- Tag each comment with its checklist step and a severity: `blocker` (must fix before merge), `should` (fix now or file a ticket), `nit` (optional).
- Order comments by severity, not by file.
- End with one line: `Verdict: approve | request changes | needs discussion` and the single reason.

## Format

```
### Correctness
- [blocker] path/file.js:42 — Problem. Fix.

### Tests
- [should] tests/x.test.js — Problem. Fix.

### Readability
none found

### Security
...

### Scope
...

Verdict: request changes — <reason>
```
