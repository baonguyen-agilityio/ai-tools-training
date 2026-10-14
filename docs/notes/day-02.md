# Day 02 — Ticket analysis, reproduce and understand

## Done
- Five backlog tickets analyzed in a Code-tab session restricted to docs/ and README (no src/): asks / ambiguous or missing / first step / questions for the reporter / suspected layer.
- Suspected layers from ticket text alone: BUG-001 API/domain, BUG-002 domain, BUG-003 API, BUG-004 domain, BUG-005 UI. Confirmed later by the fixes.
- BUG-002 and BUG-004 share a code path (monthly summary) but not a cause.
- Reproduce step skipped: already a daily habit (verified E2E cases locally before). Kept the new part: express the bug as a failing test first (done on Day 03).

## Claude 101 labs (pulled forward from Days 4–8, done this day)
| Concept | Lab | Evidence |
|---------|-----|----------|
| Projects | Desktop "Expense Tracker training": instructions + README + 8 backlog files | knowledge used without pasting; "unverified" phrasing came from instructions |
| Artifacts | Backlog dashboard built from project knowledge | https://claude.ai/artifact/Rp22jSoZzwC3YLYUV6T1i7 |
| Skills | `review-checklist` created by conversation on claude.ai and as `.claude/skills/review-checklist/SKILL.md` | PR #8; used on PR #9 |
| Connectors | GitHub connector listed 9 PRs and read PR #9 | correct list; flagged the GitHub list API `merged:false` quirk and post-rebase hashes as unverified |
| Research | `/deep-research`: Playwright MCP vs Claude in Chrome vs plain Playwright in CI | Recommends plain Playwright in CI, MCP for exploring/drafting, Chrome for exploratory only; 12 sources; saved as a project file (research/e2e-driver-comparison.md). Noted: agent-generated tests tend to break near the end of a flow → QA tightens final assertions on Day 8 |
| Quiz | Claude 101 course quiz | 10/10 |

### Project instructions used
```
This project is the training sandbox "Expense Tracker" (Node 22, zero deps, node:http API, plain JS UI, JSON file store). Repo: github.com/baonguyen-agilityio/ai-tools-training.
I am a developer. When I ask about a ticket, answer as a senior reviewer: ask what case I have not mentioned, point at the layer (UI / API / domain / data / environment) before suggesting a fix, prefer a curl or a test over prose.
Never invent version numbers, flags or URLs; say "unverified" instead.
English, concise, tables over paragraphs.
```

### Things the courses do not say
- Projects pin the base (instructions + knowledge, reloaded every turn, RAG when large) but not the conversation. A long chat in a project still truncates silently. The Code tab has `/compact`; Chat does not. Habit: one chat per topic; before the cliff, ask for a 10-line decided/open summary and start a new chat; what every chat needs goes into Knowledge.
- RAG retrieves nearest chunks, not the whole corpus: count/aggregate questions can miss; name the file in the question.
- Desktop "Projects (Beta)" and claude.ai Projects are separate and do not sync.
- Web search is a tool the account enables; the model decides when to call it; the prompt can force or forbid it. Research / `/deep-research` is the multi-search mode on top of it and can save its report as a project file.
- Projects store knowledge (what); Skills perform tasks (how). A skill saved on claude.ai is visible in every surface, including Claude Code sessions.
