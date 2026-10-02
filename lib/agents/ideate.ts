import { generateText } from "../llm";

// See docs/AGENTS.md: the real Ideation Agent is a Socratic thinking partner
// that draws the concept out of the user (log_open_question, log_assumption,
// write_markdown_output), not a writer that invents a brief from one line.
// It produces THREE distinct artifacts (per the source product's own framing):
//   1. Concept brief — problem, target user, what must be true (3-5 items)
//   2. Assumptions log — every testable claim the concept depends on
//   3. Open-questions list — the research agenda handed to Discover
// These are kept as separate strings/arrays, not sections bolted onto one doc.

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

/** The clarifying questions the Ideation Agent asks before locking the concept. */
export async function generateClarifyingQuestions(idea: string): Promise<string[]> {
  const mockQuestions = ["What should we call this product?", "Who is the primary target user for v1?"];

  const raw = await generateText({
    system:
      "You are the Ideation agent in a product-development pipeline called MelodyOS — a Socratic thinking " +
      "partner. You do not invent the concept; you draw it out of the user by asking, one pointed question at " +
      "a time, probing the problem, the user, and the wedge. Given a raw one-line idea, ask exactly two short " +
      "clarifying questions you need answered before you can lock a testable concept — typically the product " +
      "name and the primary target user for v1. Output exactly two lines, no numbering, one question per line.",
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
  /** The concept brief only — problem, target user, what must be true, key decisions. */
  conceptBrief: string;
  /** Assumptions log: every testable claim the concept depends on (3-5 items). */
  assumptions: string[];
  /** Open-questions list: the research agenda handed to Discover. */
  openQuestions: string[];
}

function mockWhatMustBeTrue(idea: string): string[] {
  return [
    "The target user feels this problem often enough to act on a fix, not just nod along with it.",
    "There's a moment in their existing workflow where this can slot in without a heavy switch.",
    "The value shows up in the first session — not after weeks of setup.",
  ];
}

function mockAssumptionsAndOpenQuestions(): { assumptions: string[]; openQuestions: string[] } {
  return {
    assumptions: [
      "There's enough recurring demand for this that users come back without being reminded.",
      "The primary user has the authority (or budget) to adopt this without a lengthy approval process.",
      "The problem is acute enough that users tolerate a v1 with rough edges.",
    ],
    openQuestions: [
      "Who already solves this today, even partially, and what do they charge?",
      "What's the smallest version of this a real user would pay for or return to?",
      "What would make a user abandon this after one try?",
    ],
  };
}

function mockConceptBrief(idea: string, qa: QaPair[]): string {
  const title = qa[0]?.answer?.trim() || suggestTitle(idea);
  const targetUser = qa[1]?.answer?.trim() || "the person described in the idea above";
  const mustBeTrue = mockWhatMustBeTrue(idea);

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
    `## What must be true`,
    ...mustBeTrue.map((m) => `- ${m}`),
    ``,
    `## Key decisions (locked)`,
    `| Dimension | Decision |`,
    `| --- | --- |`,
    `| Product name | ${title} |`,
    `| Success metric | Activation rate in the first session |`,
    `| Deployment | One-command, MelodyOS-managed pattern (this reference build: local only) |`,
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

/** Removes a heading section from markdown entirely (used once its content is lifted into a separate artifact). */
function stripSection(md: string, heading: string): string {
  const re = new RegExp(`\\n?##\\s*${heading}[^\\n]*\\n[\\s\\S]*?(?=\\n##|$)`, "i");
  return md.replace(re, "").trim();
}

export async function synthesizeConceptBrief(idea: string, qa: QaPair[]): Promise<IdeateResult> {
  const qaText = qa.map((p) => `Q: ${p.question}\nA: ${p.answer}`).join("\n\n");

  const raw = await generateText({
    system:
      "You are the Ideation agent in a product-development pipeline called MelodyOS. You already asked the " +
      "user clarifying questions; now lock in the concept using their actual answers (don't contradict them). " +
      "Output clean markdown with, in this order: an H1 using the user's chosen product name, a one-line " +
      "italic blockquote describing the concept, a 'Problem' section (one short paragraph), a 'Target user' " +
      "section (using the user's stated target user, and explicitly what's NOT in scope for v1), a " +
      "'What must be true' bullet list (3 to 5 things that must be true for this product to work), a 'Key " +
      "decisions (locked)' table (Product name, Success metric, Deployment, Tech stack), an '## Assumptions' " +
      "bullet list (3 to 5 testable claims the concept depends on), and an '## Open questions for Research' " +
      "bullet list (2 to 3 items Research must answer). Be concrete, not generic.",
    prompt: `Raw idea: "${idea}"\n\nClarifying Q&A:\n${qaText}\n\nWrite the concept brief now.`,
    mockFallback: () => {
      const brief = mockConceptBrief(idea, qa);
      const { assumptions, openQuestions } = mockAssumptionsAndOpenQuestions();
      const assumptionsBlock = ["## Assumptions", ...assumptions.map((a) => `- ${a}`)].join("\n");
      const openQBlock = ["## Open questions for Research", ...openQuestions.map((q) => `- ${q}`)].join("\n");
      return `${brief}\n\n${assumptionsBlock}\n\n${openQBlock}`;
    },
  });

  const assumptions = extractSection(raw, "Assumptions");
  const openQuestions = extractSection(raw, "Open questions.*");

  // Assumptions/open-questions are separate artifacts (see module header) —
  // lift them out of the concept brief doc rather than duplicating them.
  const conceptBrief = stripSection(stripSection(raw, "Assumptions"), "Open questions.*");

  return { conceptBrief, assumptions, openQuestions };
}
