# Day 10 — Three review tools on one PR

## Checkpoint
none today

## Feature branch under review (#26)
- `feat/search-export`, one commit bfc112a: `GET /api/expenses?q=` note search with `<mark>` highlighting in the list, and `GET /api/export?month=` CSV download linked from the summary panel. Branch pushed with `npm test` 41/41 and no e2e for the new UI.
- Three review passes ran on bfc112a before any fix: `/code-review high` (local), `/security-review` (local), `/code-review ultra 26` (cloud; the launch dialog calls it ultrareview, used as the short name below). The GitHub `claude-review` workflow ran on the same push.

## /code-review high
- One forked agent, 5 tool calls, 147 s. 10 findings, ranked most severe first; 8 distinct, 2 restatements of others (sort-then-filter as the root of the paging bug, the copy-pasted month regex as the root of the 500).
- Found: stored XSS in `highlight()`, `new RegExp(q)` on raw input, `total`/`hasMore` from the unfiltered set, export month error without `status: 400`, unquoted CSV with formula prefixes, per-keystroke fetch race, `e.note.toLowerCase()` on a missing note, REQ-001 totals missing from the export.
- Every finding came with a concrete failure scenario (input → wrong output) and a fix. Two were later judged false positive or out of scope (see table).

## /security-review
- Three sub-tasks: one identification pass, then one false-positive filter per candidate in parallel. The filters re-read the code against a hard-exclusion list (DoS, regex injection, hardening gaps, …) and scored 1–10; anything under 8 is dropped.
- Two findings survived: stored XSS (High, 9/10) and CSV formula injection (8/10). The filter kept the CSV finding but argued it down to Low: DDE is off by default in current Excel, `HYPERLINK` needs a click, the sheet holds only this export.
- Three candidates checked and dropped on evidence: `content-disposition` header injection (the month regex blocks CR/LF), reflected XSS via `q` (client-only input, JSON response), new data exposure on `/api/export` (same data as `/api/expenses`). Regex injection was excluded by rule.
- One filter agent ran `ls docs/backlog/` despite the no-commands instruction and said so in its report.

## ultrareview
- Launched from the terminal (`Free ultrareview 1 of 3`), announced as 15–25 min, findings arrived in under 7 min. 10 findings: 6 normal, 4 nit, each with a trigger, mechanism and a "Verification" paragraph quoting the code.
- Two findings no local pass had: `res.writeHead(200)` before `store.load()`, so a load failure throws `ERR_HTTP_HEADERS_SENT` inside the catch and the request hangs; and no UTF-8 BOM, so Excel reads non-ASCII notes as ANSI. Plus a nit to share `inMonth()` between `summary()` and `toCsv()`.
- The other seven overlapped `/code-review`.

## GitHub claude-review on #26
- On bfc112a it posted three inline comments: `highlight()` XSS plus unescaped regex, `total`/`hasMore` from `sorted`, CSV fields unquoted. Its suggested XSS fix was "escape the text first, then wrap matches of a regex-escaped `q`", the approach that later produced the regression below.
- Its three review comments fired six `claude.yml` runs (`pull_request_review_comment` events), all skipped: no `@claude` mention.
- On 744bd9f, which still contained the entity-highlighting regression, it posted "No issues found. Checked for bugs and CLAUDE.md compliance." On 184194c the job ran green and posted nothing.

## Fixes, red test first (#26)
- Six confirmed findings, one commit each, test committed with its fix. Chosen in the fix request; the missing-note crash (false positive: `validate()` always sets `note`), REQ-001 totals (scope) and the `inMonth()` nit were skipped.

| # | Finding | Red test | Fix |
|---|---|---|---|
| 1 | XSS + regex metachars in `highlight()` | e2e: stored `<img onerror>` note renders literally, `(team` highlights, no dialog, no page error | 52d249c |
| 2 | `total`/`hasMore` from unfiltered set | unit + API: `q=coffee` → total 1, hasMore false | 8216eac |
| 3 | CSV quoting, `=+-@` prefix, BOM | unit: comma/quote/newline/formula notes; `﻿` prefix | 88bd127 |
| 4 | Export bad month → 500 | API: `month=2026-13` and missing → 400 on export and summary | 9bbb05c |
| 5 | `writeHead` before `store.load()` | API: corrupt data file → 500, next request 200 | 64e09b6 |
| 6 | Stale search response | e2e: `q=c` response held until `q=co` rendered, then released | 744bd9f |

- The first XSS e2e asserted `(1 total)` and failed after the fix: that line was finding 2's bug leaking in. The assertion was moved out so each test proves one finding.
- The red run for finding 5 hung instead of failing: headers were already sent, the catch threw, the response never completed. The runner was killed and the hang recorded as the red.
- Fix 4 replaced the two copies of the month regex with one `readMonth(searchParams)`.
- Fix 6 used a request sequence counter rather than the suggested `q !== state.q`; same size, also covers page and category changes.
- `npm test` 44/44, e2e 12/12 after the six fixes. PR body got a "Review comparison" table: which tool found what, and the three skipped items with reasons.

## Regression from the XSS fix (184194c)
- Fix 1 escaped the note, then matched a regex-escaped `escapeHtml(q)` against it. `highlight("Tom's 39 tea", "39")` marked the `39` inside `&#39;` as well as the real one: the cell showed `Tom&#39;s 39 tea` with two `<mark>`s.
- Found by hand. None of the three tools nor the GitHub bot flagged it; the bot reviewed the regressed commit and said "No issues found".
- Red test: e2e `highlight never matches inside an escaped character` (exactly one `<mark>` with text `39`, cell text equals the note). `highlight()` now splits the raw note on the lowercase literal term and escapes each piece; the regex is gone. e2e 13/13.
- `highlight` could not get a unit test without extracting it: `public/app.js` runs DOM code at import.

## Merge
- CI on 184194c: unit, e2e, claude-review all green. Squash-merged as 523acfa with an explicit subject and body, no trailers; branch deleted.
- `/review-checklist` was not run on #26; the review pass came from the three tools above.

## Lessons
- Run more than one reviewer on a non-trivial PR: of 9 real issues (8 in the comparison table plus the XSS-fix regression), the best single tool, ultrareview, found 8; none found the regression.
- Rank review output by exploit path, not by count: the security pass returned 2 findings and both were real; the general passes returned 10 each with 2–3 to discard.
- A fix suggested by a reviewer is still code to review; the bot's recommended XSS fix carried the entity-matching bug.
- Keep one finding per red test; an assertion for a neighbouring bug makes the test red for the wrong reason.
- A hang is a valid red: when the failure mode is "the response never completes", the test runner timing out is the evidence.
- Match on raw data, escape on output; escaping first and then matching lets the term match inside the escaping.
- "No issues found" on a commit says nothing about what the previous run flagged; re-check the fixes by hand.

## Evidence
- Drive day-10: https://drive.google.com/drive/folders/159Tqq1o2sVYnrMhk-ok2ZHZ0ohGtkQiu (pr26-review-comparison.png, pr26-bot-no-issues-and-merge.png)
- PRs: #26
- Commits: bfc112a, 52d249c, 8216eac, 88bd127, 9bbb05c, 64e09b6, 744bd9f, 184194c (branch); 523acfa (squash)
- claude-review on bfc112a: https://github.com/baonguyen-agilityio/ai-tools-training/pull/26#pullrequestreview-5596355669
- claude-review "No issues found" on 744bd9f: https://github.com/baonguyen-agilityio/ai-tools-training/pull/26#issuecomment-6311395747
- CI on 184194c: https://github.com/baonguyen-agilityio/ai-tools-training/actions/runs/39568912517
- Ultrareview report: returned only into the terminal session as a task notification; no URL
