import { generateText } from "../llm";
import { PRDSection, ReasoningPair } from "../types";

// See docs/AGENTS.md: the PRD agent writes sections behind an
// outline-approval gate, grounded in the Ideation brief + Research brief
// already in shared context — it does not re-ask the user anything
// established upstream. This reference build supports one template
// ("ProductOS Standard"); PRFAQ/Lean/Enterprise are Next-phase — see
// docs/ROADMAP.md.

export const PRD_STANDARD_OUTLINE = [
  "Product Overview",
  "Problem & Opportunity",
  "Proposed Solution",
  "Scope & Non-Goals",
  "Requirements & Specifications",
  "User Stories & Acceptance Criteria",
  "Success Criteria",
  "Launch Plan",
  "Open Questions",
];

const SECTION_DELIM = "%%%SECTION:";

function idFor(title: string) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

function extractBullet(md: string, headerRegex: RegExp): string | undefined {
  if (!md) return undefined;
  const lines = md.split("\n");
  const idx = lines.findIndex((l) => headerRegex.test(l));
  if (idx === -1) return undefined;
  for (let i = idx + 1; i < lines.length; i++) {
    const m = lines[i].match(/^[-*]\s*(.+)/);
    if (m) return m[1].trim();
    if (/^#/.test(lines[i])) break;
  }
  return undefined;
}

function firstNonHeadingLine(md: string): string | undefined {
  if (!md) return undefined;
  const line = md.split("\n").find((l) => l.trim().length > 0 && !l.startsWith("#") && !l.startsWith(">"));
  return line?.trim();
}

/** The PRD agent cuts scope before writing: what ships in v1, what waits for later. */
export async function runPRDReasoning(idea: string, ideateBrief: string): Promise<ReasoningPair[]> {
  const mockShips = extractBullet(ideateBrief, /what must be true/i) ?? "the core flow needed to prove the idea";
  const mockWaits =
    extractBullet(ideateBrief, /assumptions/i) ?? "anything not required to prove the core value proposition";

  const mock: ReasoningPair[] = [
    { question: "What ships in v1?", answer: mockShips },
    { question: "What waits for later?", answer: mockWaits },
  ];

  const raw = await generateText({
    system:
      "You are the PRD agent in a product-development pipeline called ProductOS. Before writing the document, " +
      "you cut scope: ask yourself exactly two questions and answer each in one short phrase grounded in the " +
      "ideation brief — what ships in v1, and what explicitly waits for later. Output exactly this format, two " +
      "lines: 'Q: <question>\\nA: <answer>' repeated twice, nothing else.",
    prompt: `Idea: "${idea}"\n\nIdeation brief:\n${ideateBrief || "(none)"}\n\nCut scope now.`,
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

/** Scaffolds the document outline against the ProductOS Standard template and gets it approved before writing. */
export async function proposePRDOutline(idea: string, research: string): Promise<string[]> {
  const raw = await generateText({
    system:
      "You are the PRD agent in a product-development pipeline called ProductOS. Before writing anything, you " +
      "scaffold a document outline using the 'ProductOS Standard' template and get it approved. Output exactly " +
      "9 section titles, one per line, no numbering, no extra text, using conventional PRD section names.",
    prompt: `Product idea: "${idea}"\n\nResearch brief (for context):\n${research || "(none)"}\n\nPropose the outline now.`,
    mockFallback: () => PRD_STANDARD_OUTLINE.join("\n"),
  });

  const lines = raw
    .split("\n")
    .map((l) => l.replace(/^[-*\d.\s]+/, "").trim())
    .filter(Boolean);

  return lines.length >= 5 ? lines.slice(0, 9) : PRD_STANDARD_OUTLINE;
}

function buildUserStories(idea: string, shipsInV1: string): string {
  const trimmedIdea = idea.length > 70 ? `${idea.slice(0, 70)}…` : idea;
  const stories: { title: string; want: string; so: string; ac: string[] }[] = [
    {
      title: "First capture",
      want: `quickly start using "${trimmedIdea}" without setup friction`,
      so: "I get to the core value before I lose interest",
      ac: ["A first-run flow completes in under 60 seconds", "No required field beyond what's needed to produce output"],
    },
    {
      title: "Core output",
      want: `see the result of ${shipsInV1}`,
      so: "I can judge immediately whether this is worth continuing",
      ac: ["Output is visible in the same session it was requested", "Output is editable, not a dead end"],
    },
    {
      title: "Confirm before leaving",
      want: "confirm or adjust the output before I'm done",
      so: "I trust what got saved",
      ac: ["A confirmation step is shown before the session ends", "Edits at confirmation are reflected in the saved result"],
    },
    {
      title: "Return usage",
      want: "pick up where I left off on a return visit",
      so: "the product compounds instead of starting from zero",
      ac: ["Prior output is retrievable on the next visit", "State from the prior session is not lost"],
    },
    {
      title: "Trust the output",
      want: "understand why the product produced this specific output",
      so: "I can trust it enough to act on it",
      ac: ["Each output traces back to an input the user provided", "No unexplained or unlabeled generated content"],
    },
    {
      title: "Fail gracefully",
      want: "get a clear message if the product can't complete the job",
      so: "I'm not left guessing",
      ac: ["Every failure state has a user-visible explanation", "The user is offered a next step, not a dead end"],
    },
  ];

  const lines = [
    `# User Stories & Acceptance Criteria`,
    ``,
    `> Persona-linked stories with testable acceptance criteria per story — ready to hand to Design and QA.`,
    ``,
  ];
  stories.forEach((s, i) => {
    lines.push(`### Story ${i + 1}: ${s.title}`);
    lines.push(`**As a** target user, **I want** to ${s.want}, **so that** ${s.so}.`);
    lines.push(``);
    lines.push(`**Acceptance criteria:**`);
    s.ac.forEach((a) => lines.push(`- ${a}`));
    lines.push(``);
  });
  return lines.join("\n");
}

function bulletizeOpenQuestions(research: string): string {
  if (!research) return "- No unresolved questions surfaced by Research.";
  const candidates = research
    .split("\n")
    .filter((l) => /gap|assumption|risk|unresolved/i.test(l) && l.trim().length > 0 && l.trim().length < 220)
    .map((l) => l.replace(/^[#>*\-\s]+/, "").trim())
    .filter(Boolean);
  const picked = Array.from(new Set(candidates)).slice(0, 2);
  return picked.length ? picked.map((l) => `- ${l}`).join("\n") : "- No unresolved questions surfaced by Research.";
}

function mockSectionContent(
  title: string,
  idea: string,
  ideateBrief: string,
  research: string,
  reasoning: ReasoningPair[]
): string {
  const shipsInV1 = reasoning[0]?.answer ?? "the core flow needed to prove the idea";
  const waitsForLater = reasoning[1]?.answer ?? "anything not required to prove the core value proposition";

  switch (title) {
    case "Product Overview":
      return [
        `# Product Overview`,
        ``,
        `> One paragraph anyone in the company should be able to read and know what's being built, for whom, and why now.`,
        ``,
        `**Product**: a product that delivers on: "${idea}".`,
        ``,
        `**Grounded in**: the locked Ideation brief and the Research brief already in shared context — this ` +
          `section does not re-ask the user anything already established upstream.`,
      ].join("\n");
    case "Problem & Opportunity":
      return [
        `# Problem & Opportunity`,
        ``,
        `> Why this, why now — traced back to Ideate and Research, not invented here.`,
        ``,
        `## From the Ideation brief`,
        ideateBrief ? `> ${firstNonHeadingLine(ideateBrief) ?? ideateBrief.slice(0, 160)}` : `_No ideation brief in shared context._`,
        ``,
        `## From the Research brief`,
        research ? `> ${firstNonHeadingLine(research) ?? research.slice(0, 160)}` : `_No research brief in shared context._`,
      ].join("\n");
    case "Proposed Solution":
      return [
        `# Proposed Solution`,
        ``,
        `> The shape of the fix, not the whole roadmap.`,
        ``,
        `A focused v1 that ships **${shipsInV1}**, validated against the Research brief's positioning and wedge, ` +
          `before anything broader gets built.`,
      ].join("\n");
    case "Scope & Non-Goals":
      return [
        `# Scope & Non-Goals`,
        ``,
        `> Explicit boundaries — the fastest way a PRD rots is scope that was never written down.`,
        ``,
        `## In scope for v1`,
        `- ${shipsInV1}`,
        ``,
        `## Explicitly out of scope for v1`,
        `- ${waitsForLater}`,
      ].join("\n");
    case "Requirements & Specifications":
      return [
        `# Requirements & Specifications`,
        ``,
        `> Functional requirements a build team can act on without asking clarifying questions.`,
        ``,
        `1. The product must let the target user complete the core job described in Proposed Solution, end to end, in a single session.`,
        `2. The product must surface the value of the output before asking the user to do any manual cleanup.`,
        `3. The product must not require setup steps beyond what's needed for the first successful use.`,
        `4. The product must log enough usage signal to tell whether v1's core assumption (see Ideate's assumptions log) held up.`,
      ].join("\n");
    case "User Stories & Acceptance Criteria":
      return buildUserStories(idea, shipsInV1);
    case "Success Criteria":
      return [
        `# Success Criteria`,
        ``,
        `> Measurable, not aspirational.`,
        ``,
        `| Metric | Target | Why it proves the concept |`,
        `| --- | --- | --- |`,
        `| First-session completion rate | ≥ 50% | Confirms the core flow works without hand-holding |`,
        `| Return usage within 7 days | ≥ 30% | Confirms the value repeats, not just novelty |`,
        `| Qualitative fit signal | Positive in 7 of first 10 conversations | Confirms the riskiest assumption from Research held up |`,
      ].join("\n");
    case "Launch Plan":
      return [
        `# Launch Plan`,
        ``,
        `> Phased, tied to the stages still ahead in this pipeline.`,
        ``,
        `1. **Design** — flows and screens for the in-scope stories above.`,
        `2. **Code** — build against the acceptance criteria in this PRD.`,
        `3. **Deploy** — ship to a small first cohort of the target user described in Product Overview.`,
      ].join("\n");
    case "Open Questions":
      return [
        `# Open Questions`,
        ``,
        `> Carried forward, not buried — anything still unresolved heading into Design.`,
        ``,
        bulletizeOpenQuestions(research),
      ].join("\n");
    default:
      return [`# ${title}`, ``, `_No content generated for this section in mock mode._`].join("\n");
  }
}

/** Writes each approved-outline section in turn, grounded in the ideation + research briefs. */
export async function writePRDSections(
  idea: string,
  research: string,
  ideateBrief: string,
  outline: string[],
  reasoning: ReasoningPair[]
): Promise<PRDSection[]> {
  const mockJoined = outline
    .map((title) => `${SECTION_DELIM}${title}%%%\n${mockSectionContent(title, idea, ideateBrief, research, reasoning)}`)
    .join("\n\n");

  const raw = await generateText({
    system:
      "You are the PRD agent in a product-development pipeline called ProductOS, writing an approved outline " +
      "section by section. Ground every requirement in the ideation brief and research brief already in shared " +
      "context — do not invent facts the user hasn't established. Write clean markdown per section: an H1 " +
      "matching the section title, an italic one-line blockquote, then the section body (use tables/lists where " +
      "natural; for 'User Stories & Acceptance Criteria' use '### Story N: <title>' headers with an As-a/I-want/" +
      `so-that line plus an Acceptance criteria bullet list). Output exactly one block per outline title, each ` +
      `starting with a line "${SECTION_DELIM}<Section Title>%%%" using the exact titles given, in order.`,
    prompt:
      `Product idea: "${idea}"\n\nOutline (write exactly these, in order):\n${outline.join("\n")}\n\n` +
      `Ideation brief:\n${ideateBrief || "(none)"}\n\nResearch brief:\n${research || "(none)"}\n\nWrite all sections now.`,
    mockFallback: () => mockJoined,
  });

  const chunks = raw
    .split(new RegExp(`${SECTION_DELIM}(.+?)%%%`))
    .map((c) => c.trim())
    .filter(Boolean);

  const sections: PRDSection[] = [];
  for (let i = 0; i + 1 < chunks.length; i += 2) {
    const title = chunks[i].trim();
    const body = chunks[i + 1].trim();
    if (!outline.includes(title)) continue;
    sections.push({ id: idFor(title), title, content: body });
  }

  if (sections.length < outline.length) {
    // A live model didn't follow the delimiter format exactly — fall back to
    // the deterministic per-section mock content rather than lose sections.
    return outline.map((title) => ({
      id: idFor(title),
      title,
      content: mockSectionContent(title, idea, ideateBrief, research, reasoning),
    }));
  }

  return sections;
}

export function countPRDStories(sections: PRDSection[]): number {
  const storiesSection = sections.find((s) => s.title === "User Stories & Acceptance Criteria");
  if (!storiesSection) return 0;
  const matches = storiesSection.content.match(/^### Story \d+/gm);
  return matches ? matches.length : 0;
}
