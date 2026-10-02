import { generateText } from "../llm";
import {
  ArchitectureDecision,
  ArchitectureSection,
  CostLineItem,
  InfrastructureCostEstimate,
  ProjectConstraints,
} from "../types";

// See docs/AGENTS.md: the Architect Agent is the OPTIONAL technical
// deep-dive inside Define — triggered on demand from the Architecture tab,
// not auto-run in the pipeline like Research/PRD/Design. From the locked
// PRD + constraints it writes 8 architecture sections, records ADRs, and
// estimates infrastructure cost. It designs the system; it does not write
// app code — that's the (still-stubbed) Fullstack Builder.

export const ARCHITECTURE_SECTIONS = [
  "System Overview",
  "Container Architecture",
  "Database Design",
  "API Design",
  "Deployment Architecture",
  "Security Architecture",
  "Design Patterns",
  "Technical Risks",
];

const ARCH_SECTION_DELIM = "%%%ARCHSECTION:";
const ADR_DELIM = "%%%ADR:";
const BLOCK_DELIM = "%%%";

function idFor(title: string) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

function firstNonHeadingLine(md: string): string | undefined {
  if (!md) return undefined;
  const line = md
    .split("\n")
    .find(
      (l) =>
        l.trim().length > 0 &&
        !l.startsWith("#") &&
        !l.startsWith(">") &&
        !l.trim().startsWith("|") &&
        !/^-{3,}$/.test(l.trim())
    );
  return line?.trim();
}

function stackChoice(constraints: ProjectConstraints, area: string): string {
  return constraints.techStack.find((t) => t.area === area)?.choice ?? "not yet locked";
}

function mockSectionContent(title: string, idea: string, prd: string, constraints: ProjectConstraints): string {
  const frontend = stackChoice(constraints, "Frontend");
  const backend = stackChoice(constraints, "Backend / API");
  const db = stackChoice(constraints, "Database");
  const hosting = stackChoice(constraints, "Hosting");
  const auth = stackChoice(constraints, "Auth");

  switch (title) {
    case "System Overview":
      return [
        `# System Overview`,
        ``,
        `> The system in one paragraph, grounded in the locked PRD and tech-stack facts — not invented here.`,
        ``,
        `A ${frontend} client talking to ${backend}, backed by ${db}, deployed on ${hosting}. Built to prove: "${idea}".`,
        prd ? `\n> ${firstNonHeadingLine(prd) ?? prd.slice(0, 160)}` : ``,
      ]
        .filter(Boolean)
        .join("\n");
    case "Container Architecture":
      return [
        `# Container Architecture`,
        ``,
        `> How the pieces are packaged and talk to each other.`,
        ``,
        `- **Client** — ${frontend}, statically rendered where possible.`,
        `- **API layer** — ${backend}, colocated with the client in one deploy.`,
        `- **Database** — ${db}, one managed instance for v1 (no sharding yet).`,
        `- **Auth** — ${auth}, sitting in front of the API layer.`,
      ].join("\n");
    case "Database Design":
      return [
        `# Database Design`,
        ``,
        `> Schema shape, not a full ERD — enough to unblock Code.`,
        ``,
        `Built on ${db}. Core entities are inferred from the PRD's Solution and Release Plan sections: a ` +
          `primary record for the thing being managed, a user/account table, and an activity/event log for the ` +
          `metrics in the PRD's Objective & Key Results. Exact columns are a Code-stage decision, not locked here.`,
      ].join("\n");
    case "API Design":
      return [
        `# API Design`,
        ``,
        `> REST over GraphQL for v1 — fewer moving parts for a small team.`,
        ``,
        `${backend} exposes a small REST surface: create/read the core record, plus whatever the PRD's Release ` +
          `Plan calls the "core flow." No public API versioning yet — v1 has exactly one consumer, this app's own client.`,
      ].join("\n");
    case "Deployment Architecture":
      return [
        `# Deployment Architecture`,
        ``,
        `> One environment first, staging once there are real users to protect.`,
        ``,
        `${hosting} builds and serves the client + API layer together. ${db} runs as a managed instance outside ` +
          `${hosting}. No blue/green or multi-region setup for v1 — see Technical Risks for what that defers.`,
      ].join("\n");
    case "Security Architecture":
      return [
        `# Security Architecture`,
        ``,
        `> The minimum a v1 needs, not the maximum a mature product would have.`,
        ``,
        `- Auth via ${auth} — no self-managed passwords.`,
        `- ${db} reachable only from ${hosting}'s network, not the public internet.`,
        `- Secrets held in ${hosting}'s environment-variable store, never in the repo.`,
      ].join("\n");
    case "Design Patterns":
      return [
        `# Design Patterns`,
        ``,
        `> Named so Code doesn't have to guess.`,
        ``,
        `- **Server-first rendering** — data fetched on the server, not re-fetched client-side by default.`,
        `- **Thin API routes** — ${backend} routes stay thin; business logic lives in a shared lib layer Code can unit test without a server running.`,
      ].join("\n");
    case "Technical Risks":
      return [
        `# Technical Risks`,
        ``,
        `> Named now, so Code doesn't discover them for the first time mid-build.`,
        ``,
        `- **Single-instance ${db}** — no read replica yet; fine for v1's expected load, revisit past the PRD's ` +
          `Objective & Key Results' target usage.`,
        `- **No staging environment** — deploys go straight to ${hosting} production; acceptable while the ` +
          `cohort is small (see the PRD's Release Plan).`,
      ].join("\n");
    default:
      return [`# ${title}`, ``, `_No content generated for this section in mock mode._`].join("\n");
  }
}

/** Writes the 8 architecture sections (`write_architecture_section`), grounded in the locked PRD + tech-stack facts. */
export async function writeArchitectureSections(
  idea: string,
  prd: string,
  constraints: ProjectConstraints
): Promise<ArchitectureSection[]> {
  const mockJoined = ARCHITECTURE_SECTIONS.map(
    (title) => `${ARCH_SECTION_DELIM}${title}%%%\n${mockSectionContent(title, idea, prd, constraints)}`
  ).join("\n\n");

  const techLines = constraints.techStack.map((t) => `- ${t.area}: ${t.choice} (${t.reason})`).join("\n");

  const raw = await generateText({
    system:
      "You are the Architect Agent in a product-development pipeline called MelodyOS — the optional technical " +
      "deep-dive inside Define. From the locked PRD and tech-stack facts, write 8 architecture sections. You " +
      "design the system; you do not write application code. Ground every claim in the PRD and tech-stack facts " +
      "given — do not invent new technology choices. Write clean markdown per section: an H1 matching the " +
      `section title, an italic one-line blockquote, then the body. Output exactly one block per title, each ` +
      `starting with a line "${ARCH_SECTION_DELIM}<Section Title>%%%" using the exact titles given, in order: ` +
      `${ARCHITECTURE_SECTIONS.join(", ")}.`,
    prompt:
      `Product idea: "${idea}"\n\nLocked tech-stack facts:\n${techLines}\n\nPRD (for context):\n${prd || "(none)"}\n\n` +
      `Write all 8 sections now.`,
    mockFallback: () => mockJoined,
  });

  const chunks = raw
    .split(new RegExp(`${ARCH_SECTION_DELIM}(.+?)%%%`))
    .map((c) => c.trim())
    .filter(Boolean);
  const sections: ArchitectureSection[] = [];
  for (let i = 0; i + 1 < chunks.length; i += 2) {
    const title = chunks[i].trim();
    const body = chunks[i + 1].trim();
    if (!ARCHITECTURE_SECTIONS.includes(title)) continue;
    sections.push({ id: idFor(title), title, content: body });
  }

  if (sections.length < ARCHITECTURE_SECTIONS.length) {
    return ARCHITECTURE_SECTIONS.map((title) => ({
      id: idFor(title),
      title,
      content: mockSectionContent(title, idea, prd, constraints),
    }));
  }
  return sections;
}

function mockDecisions(constraints: ProjectConstraints): ArchitectureDecision[] {
  const frontend = stackChoice(constraints, "Frontend");
  const db = stackChoice(constraints, "Database");
  const hosting = stackChoice(constraints, "Hosting");
  return [
    {
      id: "framework",
      title: `Use ${frontend} for the client`,
      context: "Needed a framework a small team could ship v1 in without standing up a separate backend service.",
      decision: `Standardize on ${frontend}.`,
      consequences: "Fast to ship; couples client and API deploys together, which is fine at this scale.",
    },
    {
      id: "database",
      title: `Use ${db} over a document store`,
      context: "The PRD's core entities have real relationships (users, records, events) worth enforcing.",
      decision: `Standardize on ${db}.`,
      consequences: "Slightly more upfront schema work; fewer data-integrity bugs later.",
    },
    {
      id: "hosting",
      title: `Deploy on ${hosting}`,
      context: "Matches the frontend framework choice and needs zero infra setup for v1.",
      decision: `Standardize on ${hosting}.`,
      consequences: "Fastest path to a live URL; revisit only if usage outgrows a single-region managed platform.",
    },
  ];
}

function mockCostEstimate(constraints: ProjectConstraints): InfrastructureCostEstimate {
  const hosting = stackChoice(constraints, "Hosting");
  const db = stackChoice(constraints, "Database");
  return {
    lineItems: [
      { service: hosting, estimate: "$0–20/mo", reason: "free tier covers v1 traffic; paid tier only if usage grows" },
      { service: db, estimate: "$0–25/mo", reason: "managed free tier fits a small v1 dataset" },
      { service: "Auth provider", estimate: "$0/mo", reason: "free tier covers a small first cohort" },
      { service: "Monitoring/logs", estimate: "$0–10/mo", reason: "basic tier is enough before there's real traffic to watch" },
    ],
    totalRange: "$0–55/mo at launch",
    notes: "Illustrative, not a vendor quote — re-estimate once real usage numbers exist post-launch.",
  };
}

/** Records ADRs (`record_architecture_decision`) and projects infra cost (`estimate_infrastructure_cost`) in one call. */
export async function recordArchitectureDecisions(
  idea: string,
  constraints: ProjectConstraints
): Promise<{ decisions: ArchitectureDecision[]; cost: InfrastructureCostEstimate }> {
  const mockDec = mockDecisions(constraints);
  const mockCost = mockCostEstimate(constraints);
  const mockPayload = [
    ...mockDec.map((d) => `${ADR_DELIM}${d.title}%%%\nContext: ${d.context}\nDecision: ${d.decision}\nConsequences: ${d.consequences}`),
    `${BLOCK_DELIM}COST${BLOCK_DELIM}`,
    ...mockCost.lineItems.map((l) => `${l.service}|${l.estimate}|${l.reason}`),
    `TOTAL|${mockCost.totalRange}|${mockCost.notes}`,
  ].join("\n\n");

  const techLines = constraints.techStack.map((t) => `- ${t.area}: ${t.choice} (${t.reason})`).join("\n");

  const raw = await generateText({
    system:
      "You are the Architect Agent in a product-development pipeline called MelodyOS, recording architecture " +
      "decisions and an infrastructure cost estimate from the locked tech-stack facts. Output exactly 3 ADR " +
      `blocks, each starting with a line "${ADR_DELIM}<Decision Title>%%%" followed by 3 lines "Context: …", ` +
      `"Decision: …", "Consequences: …" — then one COST block starting with "${BLOCK_DELIM}COST${BLOCK_DELIM}" ` +
      "with 4 line-item rows 'Service|Estimate|Reason' followed by one 'TOTAL|<range>|<note>' row. Keep every " +
      "estimate small-team/v1-appropriate, not enterprise-scale.",
    prompt: `Product idea: "${idea}"\n\nLocked tech-stack facts:\n${techLines}\n\nRecord decisions and estimate cost now.`,
    mockFallback: () => mockPayload,
  });

  const decisions: ArchitectureDecision[] = [];
  const adrChunks = raw
    .split(new RegExp(`${ADR_DELIM}(.+?)%%%`))
    .map((c) => c.trim())
    .filter(Boolean);
  for (let i = 0; i + 1 < adrChunks.length; i += 2) {
    const title = adrChunks[i].trim();
    const body = adrChunks[i + 1];
    const context = body.match(/Context:\s*(.+)/)?.[1]?.trim();
    const decision = body.match(/Decision:\s*(.+)/)?.[1]?.trim();
    const consequences = body.match(/Consequences:\s*(.+)/)?.[1]?.trim();
    if (context && decision && consequences) {
      decisions.push({ id: idFor(title), title, context, decision, consequences });
    }
  }

  const costBlockMatch = raw.match(new RegExp(`${BLOCK_DELIM}COST${BLOCK_DELIM}\\n([\\s\\S]*)$`));
  let cost = mockCost;
  if (costBlockMatch) {
    const rows = costBlockMatch[1]
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    const lineItems: CostLineItem[] = [];
    let totalRange = mockCost.totalRange;
    let notes = mockCost.notes;
    for (const row of rows) {
      const [a, b, c] = row.split("|").map((s) => s?.trim());
      if (!a || !b || !c) continue;
      if (a === "TOTAL") {
        totalRange = b;
        notes = c;
      } else {
        lineItems.push({ service: a, estimate: b, reason: c });
      }
    }
    if (lineItems.length) cost = { lineItems, totalRange, notes };
  }

  return {
    decisions: decisions.length === mockDec.length ? decisions : mockDec,
    cost,
  };
}

/** Runs the full optional deep-dive: 8 sections, then ADRs + cost estimate. */
export async function generateArchitecture(idea: string, prd: string, constraints: ProjectConstraints) {
  const sections = await writeArchitectureSections(idea, prd, constraints);
  const { decisions, cost } = await recordArchitectureDecisions(idea, constraints);
  return { sections, decisions, cost };
}

/** Flat markdown rendering for shared context / stages fallback. */
export function renderArchitectureMarkdown(
  sections: ArchitectureSection[],
  decisions: ArchitectureDecision[],
  cost: InfrastructureCostEstimate
): string {
  const sectionsMd = sections.map((s) => s.content).join("\n\n---\n\n");
  const decisionsMd = decisions
    .map((d) => `### ${d.title}\n- **Context**: ${d.context}\n- **Decision**: ${d.decision}\n- **Consequences**: ${d.consequences}`)
    .join("\n\n");
  const costMd = [
    `| Service | Estimate | Reason |`,
    `| --- | --- | --- |`,
    ...cost.lineItems.map((l) => `| ${l.service} | ${l.estimate} | ${l.reason} |`),
    ``,
    `**Total: ${cost.totalRange}** — ${cost.notes}`,
  ].join("\n");
  return [sectionsMd, `\n---\n`, `# Architecture Decision Records`, decisionsMd, `\n---\n`, `# Infrastructure Cost Estimate`, costMd].join(
    "\n\n"
  );
}
