import { generateText } from "../llm";

const STOPWORDS = new Set([
  "for", "the", "and", "app", "with", "that", "helps", "help", "helping", "auto", "automatically",
  "generate", "generates", "generating", "tool", "platform", "product", "service", "into", "from",
  "using", "based", "which", "their", "your", "you", "can", "will", "lets", "let", "allows", "allow",
]);

function suggestTitle(idea: string): string {
  const words = idea
    .replace(/[^a-zA-Z0-9\s]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w.toLowerCase()));
  const pick = words.slice(0, 2).map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
  return pick.length ? pick.join(" ") : "New Product";
}

function mockIdeate(idea: string): string {
  const title = suggestTitle(idea);
  return [
    `# ${title}`,
    ``,
    `> The one-line concept, locked with you in chat and kept live as the project moves.`,
    ``,
    `## Problem`,
    `${idea}. Today this is handled manually or with generic tools that weren't built for this exact workflow — people patch it together and the gap stays unsolved.`,
    ``,
    `## Target user`,
    `**Primary:** the person described in the idea above, who needs this solved this week — not a power user with broader, unrelated needs. Explicitly not v1: anyone needing a general-purpose version of this.`,
    ``,
    `## Key decisions (locked)`,
    `| Dimension | Decision |`,
    `| --- | --- |`,
    `| Product name | ${title} |`,
    `| Success metric | Activation rate in the first session |`,
    `| Deployment | One-command, ProductOS-managed pattern (this reference build: local only) |`,
    `| Tech stack | Next.js (web app, default) |`,
    ``,
    `_Generated in mock mode. Set OPENAI_API_KEY or ANTHROPIC_API_KEY in .env.local for live ideation._`,
  ].join("\n");
}

export async function runIdeateAgent(idea: string): Promise<string> {
  return generateText({
    system:
      "You are the Ideation agent in a product-development pipeline called ProductOS. Given a raw one-line " +
      "product idea, lock in a testable concept before anything else gets built. Output clean markdown with: " +
      "an H1 with a short proposed product name, a one-line italic blockquote describing the concept, " +
      "a 'Problem' section (one short paragraph), a 'Target user' section (state the primary user and explicitly " +
      "what's NOT in scope for v1), and a 'Key decisions (locked)' markdown table with rows: Product name, " +
      "Success metric, Deployment, Tech stack. Be concise and concrete, not generic.",
    prompt: `Raw idea: "${idea}"\n\nWrite the ideation brief now.`,
    mockFallback: () => mockIdeate(idea),
  });
}
