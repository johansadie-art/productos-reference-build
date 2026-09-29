import { generateText } from "../llm";

function mockPRD(idea: string, research: string): string {
  return [
    `## PRD (mock mode — no LLM key configured)`,
    ``,
    `### Summary`,
    `A product that delivers on: "${idea}". Written from the Research agent's shared-context output below — this PRD does not re-ask the user anything already established upstream.`,
    ``,
    `### Press release (draft)`,
    `Today we're introducing a solution for "${idea}". Unlike existing tools, it starts from validated research, not a blank prompt.`,
    ``,
    `### Goals & metrics`,
    `- Primary goal: validate demand for "${idea}" with early users.`,
    `- Metric: activation rate of first-session users; qualitative fit signal from first 10 conversations.`,
    ``,
    `### Personas`,
    `- **Primary**: the user described in the idea statement, currently solving this manually or with a point solution.`,
    `- **Secondary**: a stakeholder who reviews/approves the output (e.g. a manager or collaborator).`,
    ``,
    `### FAQs`,
    `- *Why now?* Because the research below shows a gap competitors haven't closed.`,
    `- *What's out of scope for v1?* Anything not required to test the core value proposition.`,
    ``,
    `### Traceability to research`,
    `> ${research.split("\n").find((l) => l.startsWith("###")) ?? research.slice(0, 120)}`,
    ``,
    `_Generated in mock mode. Set OPENAI_API_KEY or ANTHROPIC_API_KEY in .env.local for live PRD generation._`,
  ].join("\n");
}

export async function runPRDAgent(idea: string, research: string): Promise<string> {
  return generateText({
    system:
      "You are the PRD agent in a product-development pipeline called ProductOS. " +
      "You read the Research agent's output from shared context (do not ask the user to repeat it) and write a real PRD: " +
      "Summary, a short press-release-style paragraph, Goals & Metrics, Personas, and FAQs. Explicitly reference at least " +
      "one specific fact from the research in the Summary or Goals section, to demonstrate context continuity. Output clean markdown.",
    prompt: `Product idea: "${idea}"\n\nShared context — Research agent output:\n${research}\n\nWrite the PRD now.`,
    mockFallback: () => mockPRD(idea, research),
  });
}
