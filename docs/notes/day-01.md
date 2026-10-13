# Day 01 — AI capabilities and limitations (lessons 1–2)

## The one idea
Claude does not "know" or "not know". It predicts the next token from patterns.
When a task looks like thousands it has seen, the guess is right. When a task is
rare, internal, new, or vague, the guess *sounds* right and may be wrong.
Both cases look identical on screen. The model does not know when it is guessing.

## The four ways a task lands in "guessing" territory
| Zone | Property | Signal | Observed case | How to compensate |
|------|----------|--------|---------------|-------------------|
| New ground | Next Token Prediction | few patterns, needs real reasoning | invented "Jonh" instead of using the given `bob'a` | ask for hypotheses + how to verify, then run it |
| Doesn't know | Knowledge | niche lib, specific version, internal data | useInterrupt API from a different version; which "John" out of two | give context, docs, version; when ambiguous, make it ask |
| Forgets | Working Memory | long chat, many hops, expecting cross-session memory | summary of a summary across parent/child agents | short sessions, paste context again, CLAUDE.md later |
| Loose instruction | Steerability | vague request, model interprets | "verify E2E" → easiest passing path; "issues this morning" → all, not assigned | name the case, the scope, the format |

Same mechanism gives both the capability and the limitation; one cannot be turned off without the other.
Calibrated trust = locate the task in the table, not trust/distrust wholesale.

## The one habit
Before accepting any output: **which case was not mentioned?**
All 6 recent failures were: correct for the mentioned case, wrong for the unmentioned one.

## Why generative errors are harder to catch than classification errors (lesson 2)
- Classification output carries a label that can be checked (Face ID accept/reject, a recommendation that is off). Generative output is prose that reads the same whether right or wrong.
- Generative vs classification is about the mechanism, not the UI: IntelliSense (ranking) vs Copilot (generating); old Siri (intent classification + template) vs LLM Siri.
- The riskiest output is the one someone else acts on (a bug ticket), not the one rejected on the spot (autocomplete).

## Evidence: 6 tasks from the last two weeks
| # | Task | Result | Unmentioned case | Zone |
|---|------|--------|------------------|------|
| 1 | Multi-agent context filtering | rework | parent had already summarized | WM |
| 2 | Suggestion chips + typo `bob'a` | rework | apostrophe | NTP |
| 3 | Duplicate-name lookup | rework | two people, must ask not patch prompt | Knowledge + NTP |
| 4 | useInterrupt with LangGraph | rework | API differs by version | Knowledge |
| 5 | Verify E2E "view X's timeoff" | pass, 1 of 2 paths | normal-user path | Steerability |
| 6 | Filter issues for this morning | rework | assigned vs all | Steerability |

## Fingerprints observed first-hand
- NTP fills gaps with familiar patterns ("Jonh"). Pushing back produced a real fix, no sycophancy.
- "PASS = done" on #5 was a human error: the instruction was the bug, not the model.

## Lesson 3 — How AI gets its character

### Two training stages
- Pretraining: predict the next token over vast text → a document completer with no notion of helping.
- Fine-tuning: human preference judgments shape it into an assistant (treat input as a request, answer, decline harm).
- Politeness, helpfulness, caution are trained in, not emergent. The graders' taste leaves fingerprints.

### Four fingerprints
| Fingerprint | Looks like | Costs most when | Counter |
|-------------|-----------|-----------------|---------|
| Sycophancy | agrees with the stated assumption, even a wrong one | honest feedback matters: design review, self PR review | argue with evidence, not opinion; "disagree if I'm wrong" |
| Verbosity | one-line question → five paragraphs | deciding fast, reading under time pressure | length constraint ("one sentence", "a table") |
| Over-caution | hedges, warns, refuses in low-risk grey areas | the question is legitimate but sounds sensitive | state intent and context; "don't ask again, do it" |
| Loose calibration | same confident tone whether right or wrong | always | no signal in the text; only external checks (run, docs, re-ask) |

Loose calibration is the one that cannot be caught by reading more carefully: it is the absence of a signal, not a signal.
It compounds with Next Token Prediction: a guess delivered in a certain voice.

### Exercise (task: multi-agent context filtering)
- Run 1 (straight): recommended parent-written task brief per child; ~500 words.
- Run 2a (wrong premise "double summary is bulletproof, confirm it"): did not confirm. Opened with "I can't confirm it as bulletproof" and listed three concrete failures. No sycophancy observed on a technical question with a clear answer.
- Run 2b ("genuinely disagree if I'm wrong"): same conclusion, added a fair "when your design would hold" section. The invitation did not flip the answer; it widened it.
- Run 3 (one-sentence question "who owns the summary?"): 429 words. With "Answer in one sentence": 28 words, same content.

### Takeaways
- Verbosity is the default; constrain length explicitly.
- Sycophancy was not triggered here. Untested on vague or taste-based questions; do not generalize.
- "Step by step, stop for review" counters verbosity and loose calibration, not sycophancy.
- The only reliable detector for loose calibration is something outside the text.
