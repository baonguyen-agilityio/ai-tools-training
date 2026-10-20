---
description: Draft docs/notes/day-NN.md from today's merged PRs and commits, then stop for review
argument-hint: <day number>
---

Draft the training note for day $1 at `docs/notes/day-NN.md` (`NN` = $1 zero-padded to two digits).

## Gather
1. Read the two most recent `docs/notes/day-*.md` to match their style.
2. `gh pr list --state merged --search "merged:>=$(date +%FT00:00:00%z)" --json number,title,body,url` — PRs merged since local midnight (a date-only `merged:` is UTC); for each, `gh pr view <n> --comments` and its review threads for what review found and how it was fixed. Skip PRs already cited in an earlier day's note (two training days can share a date).
3. `git fetch origin` then `git log origin/main --since=midnight --format='%h %s%n%b'` — today's commits on `main`.
4. If the file already exists, read it and extend it instead of overwriting.

## Write
Use only facts from the PRs, commits, threads and this session. Do not invent numbers, links or outcomes; mark anything you cannot source as `TODO`.

```
# Day NN — <topic>

## Checkpoint
| Item | Evidence |
|---|---|

## <one section per thing done today>

## Lessons

## Evidence
- PRs: #…
```

- Checkpoint: one row per item with its evidence (PR, artifact, link); if today has no checkpoint, write `none today`.
- What was done: one `##` section per topic, bullets of what was done and observed, citing PR numbers and shas.
- Lessons: short, general rules learned today, one line each.
- Evidence: PR numbers, artifact links; leave `TODO` for screenshots or Drive links the user must add.
- Style: impersonal, past tense, terse bullets, no "I"/"we", no praise, no filler. Tables only where comparing.

## Stop
Write the file only. Do not stage, commit, branch or open a PR. Show the draft path and list every `TODO`, then wait for my review.
