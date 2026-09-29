// Code and Deploy are intentionally stubbed in this reference build (Design's
// Brand Guidelines is real now — see lib/agents/design.ts). See docs/PRD.md
// (Scope) and docs/ROADMAP.md (Next/Later) for why: proving the
// shared-context mechanic with Research + PRD + Design's Brand Guidelines is
// the Now-phase goal; real Code/Deploy generation is materially higher
// effort and is sequenced for the Next/Later phases.

export function stubCode(idea: string): string {
  return [
    `## Code — stubbed in this reference build`,
    ``,
    `In the Next phase, this stage would read the PRD + Design output and generate a real runnable`,
    `Next.js scaffold for "${idea}" (routes, components, basic API stubs) instead of just this plan.`,
    ``,
    `Planned file tree (illustrative):`,
    "```",
    "app/",
    "  page.tsx",
    "  api/",
    "components/",
    "lib/",
    "```",
  ].join("\n");
}

export function stubDeploy(): string {
  return [
    `## Deploy — stubbed in this reference build`,
    ``,
    `In the Later phase, this stage would push to the user's own GitHub repo and return a real`,
    `preview URL with SSL. For now: no real deploy happens.`,
    ``,
    `Status: not deployed (reference build only).`,
  ].join("\n");
}
