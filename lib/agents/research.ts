import { generateText } from "../llm";
import { ReasoningPair, ResearchTopic } from "../types";

// See docs/AGENTS.md: the Research Agent is an INVESTIGATOR that runs
// "four research jobs in parallel" (size the market, map the competitors,
// model the users, sharpen the positioning) and grounds claims in sources.
// It also validates the concept itself before committing to requirements —
// asking and answering its OWN investigative questions, not the user's.

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

/** The Research Agent validates the concept against the market before committing to requirements. */
export async function runResearchReasoning(idea: string, ideateBrief?: string): Promise<ReasoningPair[]> {
  const mock: ReasoningPair[] = [
    {
      question: "Riskiest assumption to test first?",
      answer:
        extractFirstAssumption(ideateBrief) ?? "Users act on this problem often enough to adopt something new for it",
    },
    {
      question: "Where is the competitive gap?",
      answer: "Nothing in the market targets this exact wedge — adjacent tools solve pieces of it, not the whole job",
    },
  ];

  const raw = await generateText({
    system:
      "You are the Research agent in a product-development pipeline called MelodyOS. Before writing anything, " +
      "you validate the concept against the market: ask yourself exactly two investigative questions and answer " +
      "each in one short sentence from your own findings (not the user's words). Typically: the riskiest " +
      "assumption to test first, and where the competitive gap is. Output exactly this format, two lines: " +
      "'Q: <question>\\nA: <answer>' repeated twice, nothing else.",
    prompt: `Idea: "${idea}"\n\nIdeation brief (for context):\n${ideateBrief ?? "(none)"}\n\nRun your investigation now.`,
    mockFallback: () => mock.map((p) => `Q: ${p.question}\nA: ${p.answer}`).join("\n"),
  });

  const pairs: ReasoningPair[] = [];
  const lines = raw.split("\n").filter(Boolean);
  for (let i = 0; i < lines.length - 1; i++) {
    const qMatch = lines[i].match(/^Q:\s*(.+)/i);
    const aMatch = lines[i + 1].match(/^A:\s*(.+)/i);
    if (qMatch && aMatch) pairs.push({ question: qMatch[1].trim(), answer: aMatch[1].trim() });
  }
  return pairs.length ? pairs.slice(0, 2) : mock;
}

function extractFirstAssumption(ideateBrief?: string): string | undefined {
  if (!ideateBrief) return undefined;
  const match = ideateBrief.match(/\n-\s*(.+)/);
  return match?.[1]?.trim();
}

function mockMarketSizing(idea: string): string {
  return [
    `# How big is this, really?`,
    ``,
    `> TAM/SAM/SOM sized with the reasoning shown, so the numbers can be pressure-tested, not trusted blindly.`,
    ``,
    `## Key finding: illustrative sizing (mock mode)`,
    `| Layer | Estimate | Reasoning |`,
    `| --- | --- | --- |`,
    `| TAM | Illustrative — refine with a real sizing pass | Everyone who could plausibly face this problem |`,
    `| SAM | Illustrative, narrower | The segment matching the locked target user |`,
    `| SOM | Illustrative, narrower still | What's reachable in year one at this stage |`,
    ``,
    `## Sources`,
    `- *Category sizing note* — illustrative placeholder; wire a real sizing provider for live figures.`,
    ``,
    `_Generated in mock mode. Set OPENAI_API_KEY or ANTHROPIC_API_KEY in .env.local for live sizing reasoning (numbers remain illustrative — no live data source in this reference build)._`,
  ].join("\n");
}

function mockCompetitorLandscape(idea: string): string {
  const competitors = fakeCompetitorNames(idea);
  return [
    `# Who's already fighting for this?`,
    ``,
    `> A ranked map of direct and adjacent players, their positioning, pricing, and the gaps they leave open.`,
    ``,
    `## Key finding: crowded top, thin middle`,
    ...competitors.map(
      (c, i) =>
        `- **${c}** — positions on ${["speed", "price", "enterprise trust", "developer experience"][i % 4]}; est. mid-market pricing.`
    ),
    ``,
    `## Competitive gap`,
    `**Crowded top, thin middle.** The players above cluster around adjacent needs; none combine research + spec + build in one shared-context pipeline — that's the wedge to test.`,
    ``,
    `## Sources`,
    `- *Competitor teardown* — illustrative placeholder; wire a real search provider (Exa/SerpAPI) for live citations.`,
    ``,
    `_Generated in mock mode. Set OPENAI_API_KEY or ANTHROPIC_API_KEY in .env.local for live competitor research._`,
  ].join("\n");
}

function mockCustomerPreferences(idea: string): { content: string; chart: ResearchTopic["chart"] } {
  const content = [
    `# Do people actually want this?`,
    ``,
    `> This research evaluates the riskiest assumption behind the concept.`,
    ``,
    `## Key finding: yes, if the value shows up immediately`,
    `- *Category usage patterns* suggest people abandon tools that don't pay off in the first session.`,
    `- *Community signal* (illustrative): users describe existing options as either too heavyweight or too shallow for this exact job.`,
    ``,
    `## Sources`,
    `- *Category usage patterns* — illustrative placeholder; wire a real signal source (reviews/forums) for live citations.`,
    `- *Community signal scan* — illustrative placeholder.`,
    ``,
    `_Generated in mock mode. Set OPENAI_API_KEY or ANTHROPIC_API_KEY in .env.local for live persona research (chart stays illustrative — no live benchmark source in this reference build)._`,
  ].join("\n");

  return {
    content,
    chart: {
      caption: "Illustrative same-session completion rate by category weight (benchmark, not measured)",
      bars: [
        { label: "Heavyweight tools", value: 18 },
        { label: "Medium tools", value: 27 },
        { label: "Quick-capture tools", value: 46 },
        { label: "Your target", value: 60, highlight: true },
      ],
    },
  };
}

function mockPositioning(idea: string): string {
  return [
    `# What's the wedge?`,
    ``,
    `> A defensible entry point and a one-line positioning statement — the spine of the PRD and the landing page.`,
    ``,
    `## Recommended positioning`,
    `For the target user locked in Ideate, this is the one tool that closes the specific gap the competitor landscape leaves open — not a general-purpose alternative to everything else on the market.`,
    ``,
    `## Sources`,
    `- Synthesized from the Market Sizing, Competitor Landscape, and Customer Preferences runs above.`,
    ``,
    `_Generated in mock mode. Set OPENAI_API_KEY or ANTHROPIC_API_KEY in .env.local for live positioning synthesis._`,
  ].join("\n");
}

const TOPIC_DELIM = "%%%TOPIC:";

/** Runs the four parallel research jobs and returns them as separate per-topic documents. */
export async function runResearchTopics(idea: string, ideateBrief?: string): Promise<ResearchTopic[]> {
  const customerPrefs = mockCustomerPreferences(idea);

  const mockJoined = [
    `${TOPIC_DELIM}Market Sizing & Pricing%%%\n${mockMarketSizing(idea)}`,
    `${TOPIC_DELIM}Competitor Landscape%%%\n${mockCompetitorLandscape(idea)}`,
    `${TOPIC_DELIM}Customer Preferences%%%\n${customerPrefs.content}`,
    `${TOPIC_DELIM}Positioning & Wedge%%%\n${mockPositioning(idea)}`,
  ].join("\n\n");

  const raw = await generateText({
    system:
      "You are the Research agent in a product-development pipeline called MelodyOS, running four research " +
      "jobs in parallel: size the market (TAM/SAM/SOM with reasoning shown), map the competitors (positioning, " +
      "pricing, gaps), model the users (grounded findings, not invented archetypes), and sharpen the positioning " +
      "(a wedge and one-line statement). Ground every claim in a source, clearly marked illustrative if no live " +
      "data source is available. Build on the ideation brief — don't contradict it. Output exactly four sections, " +
      `each starting with a line "${TOPIC_DELIM}<Topic Name>%%%" using these exact topic names in order: ` +
      `"Market Sizing & Pricing", "Competitor Landscape", "Customer Preferences", "Positioning & Wedge". Within ` +
      "each section write clean markdown: an H1 research question, an italic one-line blockquote, a '## Key " +
      "finding: ...' section, and a '## Sources' bullet list.",
    prompt: `Product idea: "${idea}"\n\nShared context — Ideation brief:\n${ideateBrief ?? "(none)"}\n\nRun all four research jobs now.`,
    mockFallback: () => mockJoined,
  });

  const chunks = raw
    .split(new RegExp(`${TOPIC_DELIM}(.+?)%%%`))
    .map((c) => c.trim())
    .filter(Boolean);

  const topics: ResearchTopic[] = [];
  const labels = ["Market Sizing & Pricing", "Competitor Landscape", "Customer Preferences", "Positioning & Wedge"];
  const idFor = (label: string) => label.toLowerCase().replace(/[^a-z0-9]+/g, "-");

  // chunks alternate [label, body, label, body, ...] once split on the delimiter capture group
  for (let i = 0; i + 1 < chunks.length; i += 2) {
    const label = chunks[i].trim();
    const body = chunks[i + 1].trim();
    if (!labels.includes(label)) continue;
    topics.push({
      id: idFor(label),
      tabLabel: label,
      docTitle: `${label} — Research run`,
      content: body,
      chart: label === "Customer Preferences" ? customerPrefs.chart : undefined,
    });
  }

  // Fall back to the deterministic mock split if parsing failed (e.g. a live
  // model didn't follow the delimiter format exactly).
  if (topics.length < 4) {
    return [
      { id: "market-sizing-pricing", tabLabel: "Market Sizing & Pricing", docTitle: "Market Sizing & Pricing — Research run", content: mockMarketSizing(idea) },
      { id: "competitor-landscape", tabLabel: "Competitor Landscape", docTitle: "Competitor Landscape — Research run", content: mockCompetitorLandscape(idea) },
      { id: "customer-preferences", tabLabel: "Customer Preferences", docTitle: "Customer Preferences — Research run", content: customerPrefs.content, chart: customerPrefs.chart },
      { id: "positioning-wedge", tabLabel: "Positioning & Wedge", docTitle: "Positioning & Wedge — Research run", content: mockPositioning(idea) },
    ];
  }

  return topics;
}
