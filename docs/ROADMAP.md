# ProductOS (Reference Build) — Roadmap

**Planning horizon**: Now = this session's build. Next/Later = future work, not started.
**Primary outcomes**:
- Validate the "shared context, multi-agent pipeline" mechanic is meaningfully better than a single-shot prompt.
- Produce a demoable artifact to decide whether to invest in the full commercial platform.

## Prioritization (ICE)

| Initiative | Theme | Impact (1–5) | Confidence (1–5) | Ease (1–5) | ICE | Notes |
|---|---|---|---|---|---|---|
| Shared Project Context (read/write across agents) | Core mechanic | 5 | 4 | 4 | 80 | The actual hypothesis under test |
| Research agent (mock + pluggable live) | Pipeline | 4 | 4 | 5 | 80 | Cheap to fake convincingly, high demo value |
| PRD agent (mock + pluggable live) | Pipeline | 5 | 4 | 4 | 80 | Highest-value single artifact for reviewers |
| Pipeline UI + activity timeline | UX | 4 | 4 | 4 | 64 | Makes the mechanic visible/legible |
| Design agent (real screens/flows) | Pipeline | 4 | 2 | 2 | 16 | High effort, needs image/UI-gen; defer |
| Code agent (real runnable scaffold) | Pipeline | 4 | 2 | 2 | 16 | High effort; defer past Design |
| Deploy stub → real GitHub/deploy | Pipeline | 3 | 2 | 2 | 12 | Not needed to test core hypothesis |
| Mobile codegen (Expo) | Expansion | 2 | 1 | 1 | 2 | Only after web pipeline proven |
| MCP server (58 tools) | Integration | 2 | 2 | 2 | 8 | Distribution channel, not core value |
| Billing/credits/multi-tenant | Monetization | 1 | 2 | 2 | 4 | Irrelevant pre-validation |

**Top candidates (by ICE score)**: Shared Context, Research agent, PRD agent, Pipeline UI — these are exactly the Now-phase scope.

## Now (this build)
- **Theme**: Prove the shared-context pipeline mechanic
  - Orchestrator + Project Context store (file/SQLite-backed, single project)
  - Research agent — mock-mode by default, pluggable to a real LLM call
  - PRD agent — mock-mode by default, pluggable to a real LLM call, reads Research output from context
  - Design/Code/Deploy stages — visible in the pipeline UI as **stubbed stages** (clearly labeled "coming in Next"), so the full pipeline shape is visible even though only 2 stages are real
  - Pipeline UI: idea input, live activity timeline (matches source site's "night shift" log), per-stage artifact viewer, raw Project Context inspector

## Next
- **Theme**: Real design + code generation
  - Design agent: generate real UX flows + a screen list, then simple wireframe rendering
  - Code agent: generate an actual runnable Next.js scaffold from PRD + Design (not just a plan)
  - Multi-project support + minimal auth (single workspace, real accounts optional)
  - Multi-provider research fan-out (SerpAPI/Exa/Perplexity) if single-provider research proves the concept

## Later (backlog / parked)

See `docs/AGENTS.md` for the full real-agent roster (roles, reads/produces, tool surface) this backlog is
scoped against.

- **Architect Agent** — 8 architecture sections (system overview, containers, DB/API, deploy, security, patterns, risks), ADRs, infra cost estimates
- **Design System Agent** — production-ready tokens/component system, DESIGN.md, live dark/light HTML previews
- **Fullstack Builder** — real sandboxed coding agent (not a stub) implementing from design tokens + PRD
- **Code Review Agent** — full-codebase security/performance/architecture review with health scores
- **QA Agent** — real headless-browser verification against a live preview (critical flows, API checks, a11y)
- **Deploy Agent** — real GitHub push + Vercel deploy + build-log-driven auto-fix loop
- Native mobile codegen (Expo, iOS/Android + store deploy)
- MCP server (58-tool surface) for Cursor/Claude Code
- Billing, credit pool, multi-tenant accounts, BYOK key management
- Multi-source Research fan-out (Exa, Reddit, reviews, app stores, GitHub) + validation surveys
- PRD outline-approval gate + 4 template formats (Standard/PRFAQ/Lean/Enterprise)
- Cross-agent `ask_agent` consultation (e.g. Design asking Research a quick fact-check)

## Risks & Assumptions
- Risk: building Design/Code agents well enough to be convincing is a multi-week effort on its own — Now phase deliberately stubs these to avoid burning the whole budget before the core hypothesis (shared context) is tested.
- Assumption: a single reviewer/demo session is enough to decide "build the real thing" vs. not; revisit if more structured validation is needed (see `pm-experiments` skill for a formal test if desired).

## Checkpoints
- **Checkpoint 1 (after Now ships)**: Working local prototype: idea → real Research output → real PRD output → visible shared context → stubbed Design/Code/Deploy in the timeline. Decision: is the shared-context mechanic visibly valuable? Proceed to Next or stop.
- **Checkpoint 2 (after Next)**: Design + Code stages produce real artifacts end-to-end. Decision: invest in Later (mobile, deploy, MCP, billing) as a commercial build, or keep as internal tool.
