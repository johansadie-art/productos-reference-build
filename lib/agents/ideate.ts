import { generateText } from "../llm";

// See docs/AGENTS.md: the real Ideation Agent is a QUESTIONER that draws the
// concept out of the user (log_open_question, log_assumption, write_markdown_output),
// not a writer that invents a brief from one line. This module mirrors that
// shape in simplified form: ask a couple of clarifying questions, then
// synthesize the concept brief from the idea + the answers.

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

/** The two clarifying questions the Ideation Agent asks before locking the concept. */
export async function generateClarifyingQuestions(idea: string): Promise<string[]> {
  const mockQuestions = ["What should we call this product?", "Who is the primary target user for v1?"];

  const raw = await generateText({
    system:
      "You are the Ideation agent in a product-development pipeline called ProductOS. You are a QUESTIONER, " +
      "not a writer: you draw the concept out of the user instead of inventing it. Given a raw one-line idea, " +
      "ask exactly two short clarifying questions you need answered before you can lock a testable concept — " +
      "typically the product name and the primary target user for v1. Output exactly two lines, no numbering, " +
      "no extra commentary, one question per line.",
    prompt: `Raw idea: "${idea}"\n\nAsk your two clarifying questions now.`,
    mockFallback: () => mockQuestions.join("\n"),
  });

  const lines = raw
    .split("\n")
    .map((l) => l.replace(/^[-*\d.)\s]+/, "").trim())
    .filter(Boolean);

  return lines.length >= 2 ? lines.slice(0, 2) : mockQuestions;
}

export interface QaPair {
  question: string;
  answer: string;
}

export interface IdeateResult {
  content: string;
  assumptions: string[];
  openQuestions: string[];
}

function mockAssumptionsAndOpenQuestions(idea: string): { assumptions: string[]; openQuestions: string[] } {
  return {
    assumptions: [
      "There's enough recurring demand for this that users will come back without being reminded.",
      "The primary user has the authority (or budget) to adopt this without a lengthy approval process.",
    ],
    openQuestions: [
      "Who already solves this today, even partially, and what do they charge?",
      "What's the smallest version of this that a real user would pay for or return to?",
    ],
  };
}

function mockConceptBrief(idea: string, qa: QaPair[]): string {
  const title = qa[0]?.answer?.trim() || suggestTitle(idea);
  const targetUser = qa[1]?.answer?.trim() || "the person described in the idea above";

  return [
    `# ${title}`,
    ``,
    `> The one-line concept, locked with you in chat and kept live as the project moves.`,
    ``,
    `## Problem`,
    `${idea}. Today this is handled manually or with generic tools that weren't built for this exact workflow — people patch it together and the gap stays unsolved.`,
    ``,
    `## Target user`,
    `**Primary:** ${targetUser}. Explicitly not v1: anyone needing a general-purpose version of this.`,
    ``,
    `## Key decisions (locked)`,
    `| Dimension | Decision |`,
    `| --- | --- |`,
    `| Product name | ${title} |`,
    `| Success metric | Activation rate in the first session |`,
    `| Deployment | One-command, ProductOS-managed pattern (this reference build: local only) |`,
    `| Tech stack | Next.js (web app, default) |`,
    ``,
    `_Generated in mock mode from your answers. Set OPENAI_API_KEY or ANTHROPIC_API_KEY in .env.local for live ideation._`,
  ].join("\n");
}

/** Extracts a bullet list under a given markdown heading, if present. */
function extractSection(md: string, heading: string): string[] {
  const re = new RegExp(`##\\s*${heading}[^\\n]*\\n([\\s\\S]*?)(\\n##|$)`, "i");
  const match = md.match(re);
  if (!match) return [];
  return match[1]
    .split("\n")
    .map((l) => l.replace(/^[-*]\s*/, "").trim())
    .filter(Boolean);
}

export async function synthesizeConceptBrief(idea: string, qa: QaPair[]): Promise<IdeateResult> {
  const qaText = qa.map((p) => `Q: ${p.question}\nA: ${p.answer}`).join("\n\n");

  const raw = await generateText({
    system:
      "You are the Ideation agent in a product-development pipeline called ProductOS. You already asked the " +
      "user clarifying questions; now lock in the concept using their actual answers (don't contradict them). " +
      "Output clean markdown with: an H1 using the user's chosen product name, a one-line italic blockquote " +
      "describing the concept, a 'Problem' section (one short paragraph), a 'Target user' section (using the " +
      "user's stated target user, and explicitly what's NOT in scope for v1), a 'Key decisions (locked)' table " +
      "(Product name, Success metric, Deployment, Tech stack), an '## Assumptions' bullet list (2 items this " +
      "concept depends on), and an '## Open questions for Research' bullet list (2 items Research must answer).",
    prompt: `Raw idea: "${idea}"\n\nClarifying Q&A:\n${qaText}\n\nWrite the concept brief now.`,
    mockFallback: () => {
      const brief = mockConceptBrief(idea, qa);
      const { assumptions, openQuestions } = mockAssumptionsAndOpenQuestions(idea);
      const assumptionsBlock = ["## Assumptions", ...assumptions.map((a) => `- ${a}`)].join("\n");
      const openQBlock = ["## Open questions for Research", ...openQuestions.map((q) => `- ${q}`)].join("\n");
      return `${brief}\n\n${assumptionsBlock}\n\n${openQBlock}`;
    },
  });

  const assumptions = extractSection(raw, "Assumptions");
  const openQuestions = extractSection(raw, "Open questions.*");

  return { content: raw, assumptions, openQuestions };
}
