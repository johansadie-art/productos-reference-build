# MelodyOS by Symphony (Reference Build) — Extended PRD

## 0. Executive Summary
MelodyOS is an "AI-native product development platform": one prompt goes in, and a pipeline of specialized AI agents (sharing one context layer) produces market research, a real PRD, UX designs, production web + mobile code, and a deploy, without the user re-explaining themselves at each handoff. This doc specs a **reference build**: a working prototype that demonstrates the core mechanic (shared context + multi-agent pipeline) end-to-end, so the team can evaluate the concept before committing to the full commercial platform (mobile codegen, GitHub sync, billing, 58-tool MCP server, etc.).

**This build is a reference/prototype, not the commercial product.** It is optimized to prove the orchestration model and UX, not to be production-hardened or monetizable on day one.

## 1. Overview
- **Summary**: A web app where a user describes a product idea once; an orchestrator routes work to specialist agents (Research → PRD → Design → Code → Deploy) that read/write a single shared "project context" so nothing is re-explained between stages.
- **Problem statement**: Existing AI builders (Lovable, Bolt.new, v0) start at code, skipping research and spec — so the AI ships plausible-looking product for the wrong problem. Product teams want the *product* validated before the *code* is written, without manually re-typing context into five different tools.
- **Goal**: Prove that a shared-context, multi-agent pipeline produces a materially better artifact chain (idea → research → PRD → design → code) than prompting a single code-gen tool directly, and that the "shared context" mechanic is the differentiator worth building on.
- **Stage**: Discovery → reference prototype (pre-MVP for a commercial product).

## 2. Background & Context
- **Current state (as of this build)**: Nothing exists yet; this repo starts from zero (`PDLC App`).
- **Source of truth**: Content and structure scraped from [productos.dev](https://productos.dev/) (see summary captured during this session). Key claims/features from the source site:
  - 5 stages: Ideate → Discover (research) → Define (PRD) → Design → Code → Deploy (7 labeled, but marketing groups as 5 "specialist agents").
  - Shared context ("project wiki") every agent reads before acting and writes back to.
  - Research uses multiple providers (SerpAPI, Exa, Perplexity) for market/competitor scans.
  - PRD is section-by-section (press release, FAQs, goals & metrics, personas).
  - Design generates brand tokens, user flows, and UI screens from the PRD.
  - Code = production Next.js web + native iOS/Android via Expo.
  - Deploy = GitHub sync, full code export, SSL/custom domains.
  - Also ships an MCP server (58 tools) for Cursor/Claude Code integration.
  - Pricing: Free / $79/mo (1 product, 2,000 credits) / higher tiers (10–40 products) / Enterprise.
- **Related work**: None internally yet — this is the first artifact in `PDLC App`.

## 3. Users, Segments, JTBD
- **Primary user**: Solo founders, PMs, and small product teams who want to go from idea to a defensible, spec'd product quickly, without hiring a full research/design/eng team.
- **Secondary stakeholders**: Engineers who inherit the generated code; designers who review generated UX before build.
- **JTBD**:
  > When I have a raw product idea and no time/team to research, spec, design, and build it separately, I want one system to carry that idea through every stage without me re-explaining it, so I can get a validated, spec'd, working product fast instead of a prompt history.

## 4. Objectives & Metrics
- **Business objectives**: Decide, with evidence, whether to invest further engineering time in building this as a real product.
- **User objectives**: Go from a one-sentence idea to a coherent PRD + design + working code scaffold in one sitting, with visible continuity of context across stages.
- **Success metrics (for the reference build itself)**:
  - Time from idea input to a usable PRD artifact (target: < 3 minutes in prototype).
  - % of PRD content that traces back to a research fact (context continuity, shown via citations/links).
  - Qualitative: internal reviewers can look at the pipeline output and say "yes, build the real thing" or "no, pivot."
- **Guardrail metrics**: None yet (pre-launch prototype, no real users).

## 5. User Experience
- **Key use cases**:
  0. User lands on a portfolio dashboard showing multiple features already in progress (grouped by category, each with a real status badge for how far it's gotten) — not a single empty idea box — then opens one or starts a new one.
  1. User types one idea prompt → sees Research → PRD → Design → Code → Deploy stages execute in sequence with live status (mirrors the "night shift" timeline on the source site).
  2. User opens the shared "Project Context" panel and sees exactly what each agent read and wrote — this is the feature being validated.
  3. User inspects/downloads generated artifacts per stage (research brief, PRD doc, screen list, code file tree, deploy status).
- **User flow**: Idea input → Orchestrator kicks off Research agent → Research output written to context → PRD agent reads context, writes PRD → Design agent reads PRD, writes screens/flows → Code agent reads PRD+Design, writes scaffold → Deploy agent reads Code output, returns preview link/status.
- **UX principles**: Make the *shared context* visible and inspectable at every step — that's the core hypothesis, not just "AI writes stuff."

## 6. Scope

### In scope — Now (this build)
- Orchestrator + shared "Project Context" store (multi-project, file/SQLite-backed — see below).
- Portfolio dashboard home screen: many features in progress at once, grouped by category, each with a real
  pipeline-progress status — not a single idea box. Auto-seeded with an example fake-banking-app portfolio
  (Accounts, Payments & Transfers, Cards & Loans, Core Flows/Login+Onboarding) so it's never empty on first run.
- **Research agent**: real or mocked market-scan output (competitors, positioning, sourced bullet points).
- **PRD agent**: generates a structured PRD (press release, goals/metrics, personas, FAQs) from idea + research context.
- Pipeline UI: idea input, live stage timeline/activity feed, per-stage artifact viewer, shared context inspector.
- Pluggable LLM layer: works with **no API key** via deterministic mock generators (so it runs out of the box), and upgrades to real generation when `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` is set.

### In scope — Next
- **Design agent**: real UX flow + screen list generation (text/structured, then simple wireframe rendering).
- **Code agent**: generate an actual runnable Next.js scaffold from the PRD + design (not just a file-tree plan).
- Basic auth (single-user is fine for internal reference; real accounts later).

### In scope — Later (explicitly out of scope for this build)
- Native mobile codegen (Expo/iOS/Android).
- Real GitHub sync, real deploy pipeline with SSL/custom domains.
- MCP server with tool surface for Cursor/Claude Code.
- Billing, credits, multi-tenant accounts, BYOK key management.
- Multi-provider research fan-out (SerpAPI + Exa + Perplexity) — Now phase uses a single pluggable provider or mock.
- Validation survey builder, brand-guideline generation.

### Out of scope (not planned)
- Pixel-for-pixel clone of productos.dev's marketing site/visual brand (we are cloning the *product mechanic*, not their brand assets/trademark).

## 7. Requirements
- **FR1**: User can submit a one-sentence+ product idea via a text input.
- **FR2**: Orchestrator runs stages in order (Research → PRD → Design(stub) → Code(stub) → Deploy(stub)) and updates a live activity feed with timestamps, matching the "21:04 Research…07:00 You" pattern from the source.
- **FR3**: Research agent output (bullets + sources) is persisted to the shared Project Context.
- **FR4**: PRD agent reads Project Context and produces a PRD with at least: summary, goals & metrics, personas, FAQs — each traceable to a research bullet where applicable.
- **FR5**: User can view the full Project Context (raw shared state) at any point, showing what each agent read/wrote — this is the key feature under test.
- **FR6**: System works with zero configuration (mock mode) and upgrades automatically when an LLM API key is present in `.env.local`.
- **FR7 (Next)**: Design/Code stages produce real (not stubbed) artifacts.
- **NFR1**: Single-user, local-first prototype — no auth wall required for Now phase.
- **NFR2**: All agent I/O logged so a reviewer can audit exactly what was sent/received from the LLM.

## 8. Risks, Assumptions, Open Questions
- **Risks**:
  - Scope creep toward the full commercial platform before the core "shared context" hypothesis is validated → mitigate by hard-scoping Now to 2 real agents + 3 stubs.
  - Mock-mode output may look convincing enough that reviewers can't tell it's not "real" AI reasoning → mitigate by clearly labeling mock vs. live mode in the UI.
- **Assumptions** (stated per lean-MVP guidance, to be revisited):
  - A1: A single LLM provider (OpenAI or Anthropic, user's choice) is sufficient for Now phase; no need for SerpAPI/Exa/Perplexity fan-out yet.
  - A2: File/SQLite persistence is sufficient for a reference build; no need for hosted Postgres yet.
  - A3: "Reference/prototype" purpose means this does not need auth, billing, or multi-tenancy.
  - A4: Next.js + TypeScript + Tailwind is an acceptable default stack (matches the source product's own stated stack and is easy for the user's team to extend).
- **Open questions**:
  - Which LLM provider/key should Now-phase generation use, if any (OK to stay mock-only for now)?
  - Should the Now-phase UI adopt MelodyOS's visual language/copy, or be neutrally branded since this is an internal reference build?
  - Who reviews this prototype, and what's the decision this is meant to inform (build the real thing? pivot? shelve?).

## 9. Dependencies & Rollout
- **Dependencies**: An LLM API key to move from mock → live generation (optional for Now).
- **Rollout plan**: Ship Now-phase locally-run prototype → internal review/demo → decide Next-phase investment based on roadmap in `docs/ROADMAP.md`.
- **Analytics & instrumentation**: Console/log-based agent I/O trace for Now phase; no product analytics needed pre-launch.
