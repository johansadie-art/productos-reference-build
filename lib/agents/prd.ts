import { generateText } from "../llm";
import { PRDSection, ReasoningPair } from "../types";

// See docs/AGENTS.md: the PRD agent writes sections behind an
// outline-approval gate, grounded in the Ideation brief + Research brief
// already in shared context — it does not re-ask the user anything
// established upstream. This reference build supports one template
// ("ProductOS Standard"); PRFAQ/Lean/Enterprise are Next-phase — see
// docs/ROADMAP.md.
//
// The 8-section outline below is the real ProductOS Standard structure
// (per user-supplied reference copy, 2026-09-29): "Summary, Background,
// Objective with SMART key results, Market Segments, Value Propositions,
// Solution, and Release plan" + "Assumptions flagged for team validation" —
// structured the way engineering and leadership expect, not a generic
// user-story spec.

export const PRD_STANDARD_OUTLINE = [
  "Summary",
  "Background",
  "Objective & Key Results",
  "Market Segments",
  "Value Propositions",
  "Solution",
  "Release Plan",
  "Assumptions",
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
  const line = md
    .split("\n")
    .find(
      (l) =>
        l.trim().length > 0 &&
        !l.startsWith("#") &&
        !l.startsWith(">") &&
        !l.trim().startsWith("|") && // skip markdown table rows/headers
        !/^-{3,}$/.test(l.trim())
    );
  return line?.trim();
}

/**
 * Research is stored as one combined string, `# <Topic>` blocks joined by
 * `\n\n---\n\n` (see orchestrator.ts). Pull a single topic's block back out
 * so PRD sections can ground specific claims in the specific research run
 * that produced them, not just "research" generically.
 */
function extractResearchTopic(research: string, tabLabel: string): string | undefined {
  if (!research) return undefined;
  const re = new RegExp(`# ${tabLabel}\\n\\n([\\s\\S]*?)(?:\\n---\\n|$)`);
  return research.match(re)?.[1]?.trim();
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
      "scaffold a document outline using the 'ProductOS Standard' template — a leadership-and-engineering-ready " +
      "PRD, not a user-story spec — and get it approved. Output exactly these 8 section titles verbatim, one per " +
      `line, no numbering, no extra text: ${PRD_STANDARD_OUTLINE.join(", ")}.`,
    prompt: `Product idea: "${idea}"\n\nResearch brief (for context):\n${research || "(none)"}\n\nPropose the outline now.`,
    mockFallback: () => PRD_STANDARD_OUTLINE.join("\n"),
  });

  const lines = raw
    .split("\n")
    .map((l) => l.replace(/^[-*\d.\s]+/, "").trim())
    .filter(Boolean);

  return lines.length === PRD_STANDARD_OUTLINE.length ? lines : PRD_STANDARD_OUTLINE;
}

function mockSectionContent(
  title: string,
  idea: string,
  ideateBrief: string,
  research: string,
  ideateAssumptions: string,
  reasoning: ReasoningPair[]
): string {
  const shipsInV1 = reasoning[0]?.answer ?? "the core flow needed to prove the idea";

  switch (title) {
    case "Summary":
      return [
        `# Summary`,
        ``,
        `> One paragraph anyone in the company — engineering or leadership — should be able to read and know ` +
          `what's being built, for whom, and why now.`,
        ``,
        `A product that delivers on: "${idea}". Grounded in the locked Ideation brief and the Research brief ` +
          `already in shared context — this section does not re-ask the user anything already established upstream.`,
      ].join("\n");
    case "Background":
      return [
        `# Background`,
        ``,
        `> Why this, why now — traced back to Ideate and Research, not invented here.`,
        ``,
        `## From the Ideation brief`,
        ideateBrief ? `> ${firstNonHeadingLine(ideateBrief) ?? ideateBrief.slice(0, 160)}` : `_No ideation brief in shared context._`,
        ``,
        `## From the Research brief`,
        research ? `> ${firstNonHeadingLine(research) ?? research.slice(0, 160)}` : `_No research brief in shared context._`,
      ].join("\n");
    case "Objective & Key Results":
      return [
        `# Objective & Key Results`,
        ``,
        `> One objective, SMART key results underneath it — measurable, not aspirational.`,
        ``,
        `## Objective`,
        `Prove that "${idea}" is worth building past v1.`,
        ``,
        `## Key Results (SMART)`,
        `| Key result | Target | Timeframe | Why it's SMART |`,
        `| --- | --- | --- | --- |`,
        `| First-session completion rate | ≥ 50% | First 30 days post-launch | Specific & measurable — confirms the core flow works without hand-holding |`,
        `| Return usage within 7 days | ≥ 30% | Rolling, measured weekly | Time-bound — confirms the value repeats, not just novelty |`,
        `| Qualitative fit signal | Positive in 7 of first 10 conversations | First 10 user conversations | Achievable & relevant — confirms the riskiest assumption from Research held up |`,
      ].join("\n");
    case "Market Segments": {
      const customerPrefs = extractResearchTopic(research, "Customer Preferences");
      const marketSizing = extractResearchTopic(research, "Market Sizing & Pricing");
      return [
        `# Market Segments`,
        ``,
        `> Who this is for, sized against the Research brief already in shared context.`,
        ``,
        `## Primary segment`,
        customerPrefs ? `> ${firstNonHeadingLine(customerPrefs) ?? customerPrefs.slice(0, 160)}` : `_No customer research in shared context._`,
        ``,
        `## Sizing`,
        marketSizing ? `> ${firstNonHeadingLine(marketSizing) ?? marketSizing.slice(0, 160)}` : `_No market sizing in shared context._`,
      ].join("\n");
    }
    case "Value Propositions": {
      const positioning = extractResearchTopic(research, "Positioning & Wedge");
      return [
        `# Value Propositions`,
        ``,
        `> The one-line reason this wins the segment above — traced to Research's positioning brief, not invented here.`,
        ``,
        positioning ? `> ${firstNonHeadingLine(positioning) ?? positioning.slice(0, 200)}` : `_No positioning brief in shared context._`,
        ``,
        `**Ships in v1**: ${shipsInV1}`,
      ].join("\n");
    }
    case "Solution":
      return [
        `# Solution`,
        ``,
        `> The shape of the fix, not the whole roadmap.`,
        ``,
        `A focused v1 that delivers **${shipsInV1}**, validated against the Research brief's positioning and ` +
          `wedge, before anything broader gets built.`,
      ].join("\n");
    case "Release Plan":
      return [
        `# Release Plan`,
        ``,
        `> Phased, tied to the stages still ahead in this pipeline.`,
        ``,
        `1. **Design** — flows and screens for the solution above.`,
        `2. **Code** — build against the objective and key results in this PRD.`,
        `3. **Deploy** — ship to a small first cohort of the market segment described above.`,
      ].join("\n");
    case "Assumptions": {
      const bullets = ideateAssumptions
        ? ideateAssumptions
            .split("\n")
            .map((l) => l.replace(/^[-*]\s*/, "").trim())
            .filter(Boolean)
        : [];
      const lines = [`# Assumptions`, ``, `> Flagged for team validation — nothing here has been proven yet.`, ``];
      if (bullets.length) {
        bullets.forEach((b) => lines.push(`- [ ] **Needs validation:** ${b}`));
      } else {
        lines.push(`- [ ] **Needs validation:** no assumptions were logged in Ideate's shared context.`);
      }
      return lines.join("\n");
    }
    default:
      return [`# ${title}`, ``, `_No content generated for this section in mock mode._`].join("\n");
  }
}

/** Writes each approved-outline section in turn, grounded in the ideation + research briefs. */
export async function writePRDSections(
  idea: string,
  research: string,
  ideateBrief: string,
  ideateAssumptions: string,
  outline: string[],
  reasoning: ReasoningPair[]
): Promise<PRDSection[]> {
  const mockJoined = outline
    .map(
      (title) => `${SECTION_DELIM}${title}%%%\n${mockSectionContent(title, idea, ideateBrief, research, ideateAssumptions, reasoning)}`
    )
    .join("\n\n");

  const raw = await generateText({
    system:
      "You are the PRD agent in a product-development pipeline called ProductOS, writing an approved outline " +
      "section by section, structured the way engineering and leadership expect (not a generic user-story spec). " +
      "Ground every claim in the ideation brief and research brief already in shared context — do not invent " +
      "facts the user hasn't established. Write clean markdown per section: an H1 matching the section title, " +
      "an italic one-line blockquote, then the section body (use tables/lists where natural; for 'Objective & " +
      "Key Results' write one objective plus a SMART key-results table with Target/Timeframe columns; for " +
      "'Assumptions' write each item as '- [ ] **Needs validation:** <assumption>', explicitly flagged for team " +
      `validation, not stated as fact). Output exactly one block per outline title, each starting with a line ` +
      `"${SECTION_DELIM}<Section Title>%%%" using the exact titles given, in order.`,
    prompt:
      `Product idea: "${idea}"\n\nOutline (write exactly these, in order):\n${outline.join("\n")}\n\n` +
      `Ideation brief:\n${ideateBrief || "(none)"}\n\nIdeation assumptions log:\n${ideateAssumptions || "(none)"}\n\n` +
      `Research brief:\n${research || "(none)"}\n\nWrite all sections now.`,
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
      content: mockSectionContent(title, idea, ideateBrief, research, ideateAssumptions, reasoning),
    }));
  }

  return sections;
}

/** Counts flagged assumptions in the written Assumptions section — an honest, computed number for the closing message. */
export function countFlaggedAssumptions(sections: PRDSection[]): number {
  const assumptionsSection = sections.find((s) => s.title === "Assumptions");
  if (!assumptionsSection) return 0;
  const matches = assumptionsSection.content.match(/^- \[ \]/gm);
  return matches ? matches.length : 0;
}
