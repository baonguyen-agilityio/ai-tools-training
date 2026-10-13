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

### Lesson 2 — What we mean by AI
- Classification (sorts existing content) vs generative (produces new tokens). This course = generative.
- Classification errors are visible and measurable. Generative errors read fluently; only a human reader catches them.
- Reference card: 4 properties × continuum left (trust) / right (verify). The further right, the more you verify and compensate.
- Same mechanism produces both capability and limitation. Can't keep one without the other.
- Calibrated trust = locate the task on the continuum, not trust/distrust wholesale.
- Generative vs classification is about the mechanism, not the UI. Many products chain both (IntelliSense vs Copilot; old Siri vs LLM Siri).
- Generative errors hurt most when someone ELSE consumes the output (a bug ticket) rather than when you reject it yourself (autocomplete).

#### Exercise
- 5 features: 5/5 correct; borderline = autocomplete and Siri.
- Riskiest: bug ticket, all four properties apply.
- 6 tasks tagged: 1 WM · 2 NTP · 3 Knowledge+NTP · 4 Knowledge · 5 Steerability · 6 Steerability
- #3: missing fact + NTP picks confidently → fix = ask, not a better prompt.
- #5: "verify E2E" was loose → model chose the easiest passing path. The instruction was the bug.

#### Check questions
- Claude's errors are harder to spot than a spam filter's: no label comes with the output.
- "Why is this test flaky in CI" is right on NTP and Knowledge; add CI context (Knowledge) AND ask for hypotheses with verification steps (NTP).
- To stop "Jonh"-style invention: adjust Steerability (concrete instruction), not NTP (can't change the mechanism).
