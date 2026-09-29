import { generateText } from "../llm";

function titleCaseWord(w: string) {
  return w.charAt(0).toUpperCase() + w.slice(1);
}

function fakeCompetitorNames(idea: string): string[] {
  const words = idea
    .replace(/[^a-zA-Z0-9\s]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 2);
  const roots = words.length ? words : ["Product"];
  const suffixes = ["Hub", "ly", "Base", "Flow", "Stack", "Kit"];
  const names = new Set<string>();
  let i = 0;
  while (names.size < 4 && i < 20) {
    const root = titleCaseWord(roots[i % roots.length]);
    const suffix = suffixes[i % suffixes.length];
    names.add(`${root}${suffix}`);
    i++;
  }
  return Array.from(names);
}

function mockResearch(idea: string): string {
  const competitors = fakeCompetitorNames(idea);
  const lines = [
    `## Market scan (mock mode — no LLM key configured)`,
    ``,
    `**Idea analyzed:** "${idea}"`,
    ``,
    `### Competitors identified (4)`,
    ...competitors.map(
      (c, i) =>
        `${i + 1}. **${c}** — positions on ${
          ["speed", "price", "enterprise trust", "developer experience"][i % 4]
        }; est. mid-market pricing.`
    ),
    ``,
    `### Market sizing (illustrative)`,
    `- TAM: illustrative placeholder — refine with real data once a research provider (SerpAPI/Exa/Perplexity) is wired in (see docs/ROADMAP.md, Next phase).`,
    `- SAM: narrower segment matching the primary user described in the idea.`,
    ``,
    `### Notable gap / opportunity`,
    `- Existing tools above address adjacent needs but none combine research + spec + build in one shared-context pipeline — this is the wedge to test.`,
    ``,
    `_Generated in mock mode. Set OPENAI_API_KEY or ANTHROPIC_API_KEY in .env.local for live research generation._`,
  ];
  return lines.join("\n");
}

export async function runResearchAgent(idea: string): Promise<string> {
  return generateText({
    system:
      "You are the Research agent in a product-development pipeline called ProductOS. " +
      "Given a raw product idea, produce a concise market scan: 4 named (plausible, illustrative) competitors " +
      "with a one-line positioning each, a short TAM/SAM sizing paragraph (clearly marked illustrative if no real " +
      "data source is available), and one notable market gap/opportunity. Output clean markdown with headings.",
    prompt: `Product idea: "${idea}"\n\nProduce the market scan now.`,
    mockFallback: () => mockResearch(idea),
  });
}
