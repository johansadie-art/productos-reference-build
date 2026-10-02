# MelodyOS by Symphony — Reference Build

A working prototype of the core mechanic behind [productos.dev](https://productos.dev/): a shared-context,
multi-agent pipeline that takes a product idea from Research → PRD → Design → Code → Deploy.

**This is a reference/prototype build**, scoped to prove the "shared context across agents" mechanic —
not a production clone of the commercial platform. See:
- [`docs/PRD.md`](./docs/PRD.md) — full spec, scope, assumptions, open questions
- [`docs/ROADMAP.md`](./docs/ROADMAP.md) — Now / Next / Later phasing and ICE prioritization

## What's real vs. stubbed

| Stage | This build |
|---|---|
| Research | **Real** — mock mode by default, live LLM generation if you set an API key |
| PRD | **Real** — reads Research output from shared context, mock or live |
| Design | Stubbed — visible in the pipeline, placeholder content (Next phase) |
| Code | Stubbed — visible in the pipeline, placeholder content (Next phase) |
| Deploy | Stubbed — visible in the pipeline, placeholder content (Later phase) |

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:3000, type an idea, click **Run pipeline**. Works with zero configuration
(mock mode). To use a real model for Research/PRD generation:

```bash
cp .env.local.example .env.local
# then set OPENAI_API_KEY (preferred) or ANTHROPIC_API_KEY
```

## How it's structured

- `lib/orchestrator.ts` — runs the 5 stages in order, updates the activity feed and shared context
- `lib/agents/` — one module per stage (`research.ts`, `prd.ts` are real; `stubs.ts` covers Design/Code/Deploy)
- `lib/llm.ts` — pluggable LLM call with automatic mock fallback
- `lib/store.ts` — file-backed persistence for project state (`.data/projects/*.json`, gitignored)
- `app/page.tsx` — UI: idea input, live activity timeline, per-stage artifact viewer, shared-context inspector
- `app/api/projects/` — REST endpoints the UI polls

## Next steps

See `docs/ROADMAP.md`. In short: once the shared-context mechanic is validated here, invest in
real Design/Code generation (Next), then mobile, GitHub sync/deploy, MCP server, and billing (Later).
