# MelodyOS by Symphony — Real Agent Roster (reference material)

Captured from the source product's actual per-agent descriptions/system-prompt excerpts and tool lists
(provided by the user, 2026-09-29). This is the canonical spec to build against as this reference build
grows past the Now-phase scope in `docs/ROADMAP.md`. **Build status** reflects this repo, not the source product.

| # | Agent | Role (one line) | Reads | Produces | Build status |
|---|---|---|---|---|---|
| 1 | **Ideation** | QUESTIONER — draws the concept out of the user, doesn't invent it | Raw idea, prior concept brief, project wiki | Concept brief (problem, target user, assumptions) + open-questions log for Research | **Real** — conversational, mock+live (see below) |
| 2 | **Research** | INVESTIGATOR — grounds every claim in a clickable source | Ideation brief, a research task, workspace customer signals | Sourced findings, competitor registry, per-topic docs, rolling brief, survey links | **Partial** — 4 parallel per-topic docs (`write_research_run` shape) + self-directed reasoning trace, mock+live; no real multi-source fan-out (Exa/Reddit/app-store search), no surveys |
| 3 | **PRD** | Writes PRD sections behind an outline-approval gate, grounded in prior artifacts | Ideation brief, research synthesis, an approved section spec | 8-section PRD (Summary, Background, Objective & Key Results, Market Segments, Value Propositions, Solution, Release Plan, Assumptions), 4 templates (Standard/PRFAQ/Lean/Enterprise) | **Partial** — scope-cutting reasoning + section-by-section writing against the MelodyOS Standard outline (mock+live); no outline-approval gate (only one template exists in this build, so nothing to choose between — see below), no PRFAQ/Lean/Enterprise templates, no revision-mode targeted edits |
| 4 | **Architect** | Optional technical deep-dive in Define: system/DB/API/deploy/security architecture, ADRs, cost estimates | PRD sections, locked constraints, tech-stack facts | 8 architecture sections, ADRs, infra cost estimates | **Partial** — all 8 sections + 3 ADRs + an infra cost estimate, mock+live, triggered on demand from the Architecture tab (not auto-run — see below); reads locked constraints, also newly real in this build |
| 5 | **Design** | Turns concept+research+PRD into user flows and UI screen specs | Concept, research, PRD, locked brand direction | User-flow diagrams, UI screen specs, design docs/reports | **Partial** — Brand Guidelines (personality + 4-color palette + typography + voice) + self-directed reasoning trace + 3 User Flows + UI Screen specs for every screen named across them, all mock+live |
| 6 | **Design System** | Senior visual designer; builds tokens, component system, DESIGN.md; renders HTML previews | Locked brand guidelines/assets, mood board, PRD personality notes | DESIGN.md, dark/light preview pages, token source for build agents | **Partial** — tokens (colors extend the locked palette + fixed spacing/radius scales) + a 4-component system + DESIGN.md, mock+live; dark/light preview is a small live-rendered card in this app's own UI, not a sandboxed build; no mood board |
| 7 | **Fullstack Builder** | Headless coding agent in a live sandbox; implements the app from tokens+PRD | Design tokens/DESIGN.md, PRD, a concrete build task | Application codebase in sandbox, live dev preview | Stubbed (Next/Later — see roadmap); its Design Builder tool (`dispatch_to_design_builder`) is the one remaining stubbed piece of the Design stage |
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

Research now runs as four parallel per-topic jobs (Market Sizing & Pricing, Competitor Landscape, Customer
Preferences, Positioning & Wedge) plus a two-question self-directed reasoning trace (the agent asking and
answering its own investigative questions before writing anything — distinct from the user-facing Q&A in
Ideate), matching the `write_research_run` shape in the row above. It's still **Partial**: findings are
illustrative/mock or single-pass live-LLM reasoning, not real multi-source search (Exa/Reddit/app-store/GitHub),
and there's no survey generation.

PRD/Define cuts scope with a two-question self-directed reasoning trace (what ships in v1 / what waits for
later, mirroring Research's pattern), then writes straight into the real 8-section "MelodyOS Standard"
outline — Summary, Background, Objective & Key Results (SMART), Market Segments, Value Propositions,
Solution, Release Plan, Assumptions — pulling Assumptions straight from Ideate's assumptions log and flagging
each one `- [ ] **Needs validation:**` rather than stating it as fact. See `lib/agents/prd.ts`. There is
deliberately **no outline-approval gate** in this reference build (per explicit user decision, 2026-09-29):
with only the Standard template implemented, there's nothing to choose between before writing — an approval
step would just be a no-op click. A real gate (with template choice + a genuine "approve this outline vs. a
different one" decision) is Next-phase once PRFAQ/Lean/Enterprise exist — see `docs/ROADMAP.md`. It's still
**Partial** otherwise: only the Standard template exists, and there's no revision mode for targeted
per-section edits.

Design now produces a real Brand Guidelines artifact — personality (grounded in the PRD), a 4-color palette
(Primary/Accent/Background/Highlight, each with a psychologically-informed impact + reason, benchmarked in
spirit against Linear/Stripe/Vercel restraint), typography, and voice — plus a two-question self-directed
reasoning trace ("Primary color?" / "What comes after the palette?"), mock+live. See `lib/agents/design.ts`.
The reference screenshot's user-facing pill for this stage reads **"Frontend Engineer"** (the Fullstack
Builder's alias during Design per its own system-prompt excerpt above), which this build's `STAGE_UI.Design`
matches literally, even though Brand Guidelines itself is generated by what row 5 above calls the Design
Agent — a minor naming tension in the source material, not a bug here.

The rest of Design is real too now. User Flows and UI Screens (the Design Agent's own deliverables, distinct
from Design System — `get_user_flows`/`set_user_flows`) are 3 named flows (Onboarding, Core Action, Empty/
Error State) as ordered screen-by-screen steps, then a spec (purpose, design-system components used, states)
for exactly the screen names that come out of those flows — Screens is generated *from* Flows' screen list,
so the two tabs never disagree with each other. See `lib/agents/flows.ts`. The Design System Agent (a
distinct real agent per row 6) produces tokens (colors extend the locked Brand Guidelines palette; spacing/
radius are fixed small-scale constants, not an LLM decision worth making per idea), a 4-component system
(Button/Input/Card/Badge, each with variants/states/a usage note grounded in the locked color roles), and
`DESIGN.md` as the token source — see `lib/agents/designSystem.ts`. Its "renders HTML previews" tool is
stood in for by a small live light/dark toggle in the Design System tab's own UI (a Card + two buttons
re-rendered with the locked tokens as inline styles), not a sandboxed build. Only **Design Builder** — the
Fullstack Builder's live-sandbox page-building tool (`dispatch_to_design_builder`) — remains stubbed: it
needs real sandboxed code execution + a live preview server, out of scope for this reference build (see
`docs/ROADMAP.md`).

Define's Constraints and Architecture tabs are both real now. Locked constraints — 5 tech-stack facts
(Frontend/Backend/Database/Hosting/Auth) + 4 structured project constraints (team size/timeline/budget
sensitivity/compliance) — are generated once, early in the pipeline (mock+live; see
`lib/agents/constraints.ts`), matching the `load_constraints` tool both the PRD and Architect agents share.
There is no real project-setup intake in this build, so these are honestly labeled illustrative rather than
user-captured. The Architect Agent then runs as the genuinely **optional** deep-dive its own spec describes:
unlike Research/PRD/Design it does not auto-run — a "Run Architecture Deep-Dive" button in the Architecture
tab (enabled once the PRD is done) triggers it via a dedicated endpoint (`POST /api/projects/[id]/architecture`,
`lib/orchestrator.ts`'s `runArchitectureDeepDive`). It then writes all 8 architecture sections (System
Overview → Technical Risks), records 3 ADRs, and estimates infrastructure cost, all mock+live and grounded in
the locked PRD + tech-stack facts — see `lib/agents/architect.ts`. It designs the system; it does not write
app code (that remains the stubbed Fullstack Builder).

Code and Deploy remain fully stubbed (no sandboxed code execution, no headless browser, no real deploy). That
gap is intentional — see `docs/ROADMAP.md` for phasing — not an oversight.

Separately (an app-level UX change, not tied to one of the agents above): the home screen is now a portfolio
dashboard rather than a single idea box, per the user's explicit request (2026-09-29) to land on multiple
features in progress, using a fake banking app as the example. `lib/store.ts` already supported many projects
by id — what was missing was a place to see them. `lib/seed.ts` auto-seeds an example portfolio (Accounts,
Payments & Transfers, Cards & Loans, and the universal Core Flows — Login, Onboarding) the first time there
are no projects, by calling the same real agent functions above (no hand-written fake JSON), each stopped at a
different real pipeline stage so the dashboard shows genuinely varied statuses (waiting on an answer, Ideate-
only, Research-only, PRD-only, Design-only, fully complete) — see `lib/projectProgress.ts` for how a project's
status badge is derived.

Follow-up (same day): a feature like Login usually isn't one PRD — it decomposes into several independent
ones (Password Login, Biometric Login, MFA, SSO, Forgot Password), each with its own pipeline progress.
`ProjectContext.subcategory` is a second, optional grouping level within a category for exactly this case;
projects sharing a (category, subcategory) render as one clustered card with a compact status row per sub-PRD
instead of separate top-level cards — see `FeatureClusterCard` in `components/HomeScreen.tsx` and the 5 Login
sub-PRDs in `lib/seed.ts`. A feature with only one PRD just omits `subcategory` and renders as before.

Second follow-up (same day): "a new loan type has a dependency on new login information — how do we
illustrate that?" `ProjectContext.dependsOn` is a list of other projects' ids a feature needs first. It's
purely a dashboard annotation, not a pipeline gate — it doesn't stop the feature's own Ideate→Design run — but
it's illustrated visually as a small chip on the card, coloured by whether the dependency is actually done:
amber "🔗 Blocked by X" if not, emerald "🔗 Depends on X" if it already is. See `DependencyChips` in
`components/HomeScreen.tsx`, the "Depends on" picker in the new-feature form, and the concrete example in
`lib/seed.ts` — "Instant Personal Loan Approval" depends on both Multi-Factor Authentication (not done yet →
renders as blocking) and Password Login (already done → renders as clear).

Static demo (2026-10-02): "is there a way to make this website work on GitHub Pages?" GitHub Pages only
serves static files — no server, so the real app's `app/api/*` routes and `lib/fsStore.ts`'s filesystem
persistence can't run there. Rather than faking it, this adds a genuinely separate, browser-only build of the
SAME pipeline logic. `lib/storeProvider.ts` makes the persistence backend pluggable (a `Store` interface with
`setStore`/`getStore`) so `lib/orchestrator.ts` and `lib/seed.ts` don't know or care which backend is active:
`lib/fsStore.ts` (the original filesystem logic, now behind the interface) for the real app, wired up by
`lib/serverStoreBootstrap.ts` — imported only by the server-only `app/api/*` route files, never by anything
that could end up in a client bundle — or `lib/localStore.ts` (browser `localStorage`) for the demo, wired up
directly in `components/StaticDemoApp.tsx`. `app/page.tsx` branches between `components/LocalApp.tsx` (the
original app, moved verbatim, fetch()-ing the API routes) and `components/StaticDemoApp.tsx` (same UI, calls
`lib/orchestrator.ts` directly instead of fetching anything) based on the build-time
`NEXT_PUBLIC_STATIC_DEMO` env var, so one `next build` only ever ships one of the two branches. Building the
static export also has to physically move `app/api` out of the tree first (Next can't statically export a
Route Handler that reads the request body) — see `scripts/build-static-demo.sh`, run via `npm run build:demo`,
and `.github/workflows/deploy-demo.yml` for the auto-deploy-on-push-to-main. The demo always runs in mock mode
(no server exists to hold an API key safely — see `lib/llm.ts`) and its data is per-browser/local-only, same
single-user caveat as the real app's `.data/` files, just backed by `localStorage` instead.
