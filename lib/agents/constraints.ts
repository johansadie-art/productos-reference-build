import { generateText } from "../llm";
import { ProjectConstraint, ProjectConstraints, ProjectType, TechStackFact } from "../types";

// See docs/AGENTS.md: the PRD Agent and the Architect Agent share a single
// `load_constraints` tool, reading structured project constraints + locked
// tech-stack facts. In the real product these are presumably captured
// during a project-setup intake; this reference build has no such intake
// UI, so they're generated once, early in the pipeline (mock+live),
// grounded in the idea + project type — and then never re-asked. "Locked"
// here means both agents read the same values, not that a human filled out
// a form.

const BLOCK_DELIM = "%%%";

function mockTechStack(projectType: ProjectType): TechStackFact[] {
  const frontend: TechStackFact =
    projectType === "mobile_app"
      ? { area: "Frontend", choice: "React Native + Expo", reason: "one codebase for iOS and Android without native build tooling" }
      : { area: "Frontend", choice: "Next.js (App Router) + React", reason: "server rendering plus a large ecosystem for a small team to move fast in" };

  return [
    frontend,
    { area: "Backend / API", choice: "Next.js API routes", reason: "no separate backend service to deploy or version for v1" },
    { area: "Database", choice: "PostgreSQL (managed — e.g. Supabase/Neon)", reason: "relational data with real constraints beats a document store while the schema is still settling" },
    { area: "Hosting", choice: "Vercel", reason: "matches the framework choice; zero-config previews per branch" },
    { area: "Auth", choice: "Email + OAuth (e.g. Auth.js)", reason: "avoids building session/password handling from scratch for v1" },
  ];
}

function mockConstraints(): ProjectConstraint[] {
  return [
    { label: "Team size", value: "Small (1–3 engineers) — illustrative, no real intake form in this build" },
    { label: "Timeline", value: "Ship a testable v1 within weeks, not months" },
    { label: "Budget sensitivity", value: "Cost-conscious — prefer managed services with generous free tiers over self-hosting" },
    { label: "Compliance", value: "None flagged yet — revisit if the idea touches regulated data" },
  ];
}

function extractBlock(raw: string, marker: string): string | undefined {
  const re = new RegExp(`${BLOCK_DELIM}${marker}${BLOCK_DELIM}\\n([\\s\\S]*?)(?=\\n${BLOCK_DELIM}|$)`);
  return raw.match(re)?.[1]?.trim();
}

function parsePipeRows<T>(block: string | undefined, fallback: T[], build: (parts: string[]) => T | null): T[] {
  if (!block) return fallback;
  const rows = block
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => build(l.split("|").map((s) => s?.trim() ?? "")))
    .filter((r): r is T => r !== null);
  return rows.length === fallback.length ? rows : fallback;
}

/** Generates the locked constraints once, early in the pipeline — read by both PRD and the Architect via `load_constraints`. */
export async function generateConstraints(idea: string, ideateBrief: string, projectType: ProjectType): Promise<ProjectConstraints> {
  const mockStack = mockTechStack(projectType);
  const mockCons = mockConstraints();
  const mockPayload = [
    `${BLOCK_DELIM}TECHSTACK${BLOCK_DELIM}`,
    ...mockStack.map((t) => `${t.area}|${t.choice}|${t.reason}`),
    `${BLOCK_DELIM}CONSTRAINTS${BLOCK_DELIM}`,
    ...mockCons.map((c) => `${c.label}|${c.value}`),
  ].join("\n");

  const raw = await generateText({
    system:
      "You are locking a project's technical constraints for a product-development pipeline called ProductOS, " +
      "read later by the PRD and Architect agents via their shared load_constraints tool. Ground choices in the " +
      "idea and project type; keep every choice small-team/v1-appropriate, not enterprise-scale. Output exactly " +
      `2 blocks, each on its own line as "${BLOCK_DELIM}<NAME>${BLOCK_DELIM}": TECHSTACK (exactly 5 lines, in ` +
      "order Frontend/Backend / API/Database/Hosting/Auth, each 'Area|Choice|One-line reason') and CONSTRAINTS " +
      "(exactly 4 lines, in order Team size/Timeline/Budget sensitivity/Compliance, each 'Label|Value').",
    prompt: `Product idea: "${idea}"\nProject type: ${projectType}\n\nIdeation brief:\n${ideateBrief || "(none)"}\n\nLock the constraints now.`,
    mockFallback: () => mockPayload,
  });

  const techStack = parsePipeRows(extractBlock(raw, "TECHSTACK"), mockStack, (p) =>
    p[0] && p[1] && p[2] ? { area: p[0], choice: p[1], reason: p[2] } : null
  );
  const constraints = parsePipeRows(extractBlock(raw, "CONSTRAINTS"), mockCons, (p) =>
    p[0] && p[1] ? { label: p[0], value: p[1] } : null
  );

  return { techStack, constraints };
}

export function renderTechStackMarkdown(c: ProjectConstraints): string {
  const rows = c.techStack.map((t) => `| ${t.area} | ${t.choice} | ${t.reason} |`).join("\n");
  return [
    `# Locked Tech-Stack Facts`,
    ``,
    "> Read by the PRD and Architect agents via `load_constraints` — decided once, not re-litigated per section.",
    ``,
    `| Area | Choice | Reason |`,
    `| --- | --- | --- |`,
    rows,
  ].join("\n");
}

export function renderProjectConstraintsMarkdown(c: ProjectConstraints): string {
  const rows = c.constraints.map((x) => `- **${x.label}**: ${x.value}`).join("\n");
  return [
    `# Structured Project Constraints`,
    ``,
    `> Illustrative for this reference build — the real product would capture these during project setup, not infer them.`,
    ``,
    rows,
  ].join("\n");
}
