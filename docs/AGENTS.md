# ProductOS — Real Agent Roster (reference material)

Captured from the source product's actual per-agent descriptions/system-prompt excerpts and tool lists
(provided by the user, 2026-09-29). This is the canonical spec to build against as this reference build
grows past the Now-phase scope in `docs/ROADMAP.md`. **Build status** reflects this repo, not the source product.

| # | Agent | Role (one line) | Reads | Produces | Build status |
|---|---|---|---|---|---|
| 1 | **Ideation** | QUESTIONER — draws the concept out of the user, doesn't invent it | Raw idea, prior concept brief, project wiki | Concept brief (problem, target user, assumptions) + open-questions log for Research | **Real** — conversational, mock+live (see below) |
| 2 | **Research** | INVESTIGATOR — grounds every claim in a clickable source | Ideation brief, a research task, workspace customer signals | Sourced findings, competitor registry, per-topic docs, rolling brief, survey links | **Partial** — one-shot generation, mock+live; no multi-source fan-out, no surveys |
| 3 | **PRD** | Writes PRD sections behind an outline-approval gate, grounded in prior artifacts | Ideation brief, research synthesis, an approved section spec | PRD sections, executive summary, 4 templates (Standard/PRFAQ/Lean/Enterprise) | **Partial** — one-shot single-template generation, mock+live; no outline gate, no template choice |
| 4 | **Architect** | Optional technical deep-dive in Define: system/DB/API/deploy/security architecture, ADRs, cost estimates | PRD sections, locked constraints, tech-stack facts | 8 architecture sections, ADRs, infra cost estimates | Not built (Later) |
| 5 | **Design** | Turns concept+research+PRD into user flows and UI screen specs | Concept, research, PRD, locked brand direction | User-flow diagrams, UI screen specs, design docs/reports | Stubbed (Next) |
| 6 | **Design System** | Senior visual designer; builds tokens, component system, DESIGN.md; renders HTML previews | Locked brand guidelines/assets, mood board, PRD personality notes | DESIGN.md, dark/light preview pages, token source for build agents | Not built (Later) |
| 7 | **Fullstack Builder** | Headless coding agent in a live sandbox; implements the app from tokens+PRD | Design tokens/DESIGN.md, PRD, a concrete build task | Application codebase in sandbox, live dev preview | Stubbed (Next/Later — see roadmap) |
| 8 | **Code Review** | Reviews full codebase like a senior engineer: security, performance, architecture, AI-code-specific issues | GitHub/GitLab repo, commit history/PRs, AI-generated changes | Health-scored report, severity-ranked findings, recommended fixes | Not built (Later) |
| 9 | **QA** | Drives a real headless browser against the preview URL; verifies the app works | Live preview URL, critical flows from PRD, route map | Verdict (pass/partial/fail), severity-ranked findings with screenshots, chainable fixes | Not built (Later) |
| 10 | **Deploy** | Owns publish pipeline: build, push to GitHub, create/sync Vercel deploy, poll to completion | Built project in sandbox, env vars, deployment target | Live production deployment, GitHub repo, cumulative deploy ledger | Stubbed (Later) |

## Tool surface (for future implementation reference)

- **Ideation**: `log_open_question`, `log_assumption`, `ask_agent`, `web_search`, `write_markdown_output`
- **Research**: `exa_search`/`exa_fetch`, `search_reddit`/`search_reviews`/`search_app_stores`/`search_github`, `generate_survey`/`analyze_survey_responses`, `write_research_run`, `log_finding`/`log_source`/`log_competitor`
- **PRD**: `write_prd_section`, `load_constraints`, `ask_agent`, `web_search`
- **Architect**: `write_architecture_section`, `record_architecture_decision`, `estimate_infrastructure_cost`, `load_constraints`
- **Design**: `write_design_doc`, `get_user_flows`/`set_user_flows`, `get_brand_guidelines`/`generate_mood_board`, `ask_agent`
- **Design System**: `write_design_preview`, `write_design_brief`, `grep_design_brief`/`patch_design_brief`
- **Fullstack Builder**: full sandbox toolset (read/write/edit files, run shell), `delegate_to_develop_fix`, `dispatch_to_design_builder`
- **Code Review**: full-codebase review, security analysis, quality/performance review, architecture audit, structured reports
- **QA**: `navigateTo`/`clickElement`/`typeText`/`assertVisible`, `takeScreenshot`/`observePage`, `listRoutes`/`callApi`/`assertApiResponse`, `runAxeAudit`/`getConsoleErrors`/`getNetworkErrors`, `log_finding`/`write_qa_report`
- **Deploy**: `check_recent_deploy`, `preflight_build`, `push_to_github_org`, `trigger_vercel_deploy`/`poll_vercel_deployment`, `read_vercel_build_logs`

## What changed in this build because of this spec

The Ideation Agent's real behavior (**questioner, not writer**) directly contradicted this reference build's
original one-shot Ideate agent (idea in → brief out, no interaction). That's the one piece implemented for
real here: see `lib/agents/ideate.ts` — it now asks 2 clarifying questions (mock: fixed, matching the
reference screenshot; live: LLM-generated) before synthesizing the concept brief, and logs assumptions +
open-questions into the shared context (`ideate.assumptions`, `ideate.openQuestions`) — a simplified stand-in
for the real `log_assumption`/`log_open_question` tools.

Research, PRD, and the rest remain one-shot generators (no `ask_agent` cross-consultation, no outline-approval
gate, no sandboxed code execution, no headless browser, no real deploy). That gap is intentional — see
`docs/ROADMAP.md` for phasing — not an oversight.
