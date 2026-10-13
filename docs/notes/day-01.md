# Day 01 — Notes

## Rule of the day
Before accepting any output: which case was never mentioned in the prompt?

## Course: AI capabilities and limitations

### Lesson 1 — Intro
- 4D = human skills. 4 properties = machine properties. One system.
- NTP (where answers come from) / Knowledge (what it knows) / Working Memory (what it attends to) / Steerability (how much control I have)
- Each property is a continuum capability → limitation. Locate the task on the continuum; don't trust or distrust wholesale.
- Properties are stable; boundaries shift with each model.

### Exercise: 6 tasks from the last two weeks
| # | Task | Result | Case never mentioned |
|---|------|--------|----------------------|
| 1 | Design multi-agent context filtering | needed rework | parent had already summarized |
| 2 | Debug suggestion chips + lookup with typo | needed rework | input containing an apostrophe |
| 3 | Duplicate-name lookup returns wrong person | needed rework | two people with the same name → must ask, not patch the prompt |
| 4 | useInterrupt with LangGraph | needed rework | API differs by version/package, must verify |
| 5 | Verify E2E "view X's timeoff" locally | right first try, 1 of 2 paths | normal-user path never tested |
| 6 | Filter issues doable this morning | needed rework | scope: mine vs all |

6 failures, 1 cause: correct for the cases mentioned, wrong for the cases nobody mentioned.

### Fingerprints observed
- NTP invents detail: I said `bob'a`, it made up "Jonh→John". Pushed back → real fix, no sycophancy.
- I fell for "PASS = done" myself on task 5.

### Check questions
- Reading the diff before commit = Discernment, compensates NTP. Forcing small steps = Delegation, compensates Steerability.
- `node --test tests/` was wrong = Knowledge (version-specific) + NTP (old common pattern). Fix = run it.
