import { generateText } from "../llm";
import { BrandColor, BrandGuidelines, ReasoningPair } from "../types";

// See docs/AGENTS.md: Design in the real product is three agents (Design
// Agent, Design System Agent, and the Fullstack Builder appearing as
// "Frontend Engineer"). This reference build makes Brand Guidelines real —
// personality + a psychologically-informed 4-color palette + typography +
// voice, mock+live — and honestly stubs Design System/User Flows/UI
// Screens/Design Builder, which need live sandbox code execution and are
// out of scope here. See docs/ROADMAP.md.

const BLOCK_DELIM = "%%%";

// Four preset palettes, each with the same "role, name, hex, impact, reason"
// shape as the reference screenshot's exact palette (used as preset 0).
// A given idea deterministically maps to one preset via a simple hash, so
// re-generating the same idea in mock mode is stable, not random.
const PALETTE_PRESETS: BrandColor[][] = [
  [
    { role: "Primary", name: "Midnight Teal", hex: "#086D77", impact: "calm confidence and professional depth", reason: "differentiates from the generic blues in the category" },
    { role: "Accent", name: "Vibrant Coral", hex: "#FF6F61", impact: "energy and approachability", reason: "a modern pop for CTAs without hurting readability" },
    { role: "Background", name: "Soft Cloud", hex: "#F5F5F5", impact: "spacious, low fatigue", reason: "a neutral canvas that lets primary and accent stand out" },
    { role: "Highlight", name: "Electric Lime", hex: "#C7F464", impact: "freshness and optimism", reason: "separates progress and success moments from the rest of the UI" },
  ],
  [
    { role: "Primary", name: "Deep Indigo", hex: "#3730A3", impact: "focus and trustworthiness", reason: "reads as serious without feeling corporate" },
    { role: "Accent", name: "Signal Amber", hex: "#F59E0B", impact: "urgency without alarm", reason: "draws the eye to the one action that matters" },
    { role: "Background", name: "Paper White", hex: "#FAFAF9", impact: "low visual noise", reason: "keeps long sessions from feeling heavy" },
    { role: "Highlight", name: "Mint Pulse", hex: "#34D399", impact: "confirmation and progress", reason: "signals success without borrowing the accent's urgency" },
  ],
  [
    { role: "Primary", name: "Terracotta", hex: "#C2542D", impact: "warmth and craft", reason: "feels human-made, not templated" },
    { role: "Accent", name: "Goldenrod", hex: "#E8A93B", impact: "optimism and momentum", reason: "pairs with terracotta without competing for attention" },
    { role: "Background", name: "Linen", hex: "#F7F2EA", impact: "editorial calm", reason: "reads like paper, not software" },
    { role: "Highlight", name: "Forest Signal", hex: "#2F6E51", impact: "grounded confirmation", reason: "distinct from the warm palette so success states stand out" },
  ],
  [
    { role: "Primary", name: "Graphite", hex: "#1F2937", impact: "precision and restraint", reason: "lets content and data lead, not chrome" },
    { role: "Accent", name: "Electric Blue", hex: "#2563EB", impact: "clarity and action", reason: "one unmistakable color for anything clickable" },
    { role: "Background", name: "Cool Fog", hex: "#F1F5F9", impact: "quiet, low glare", reason: "reduces fatigue in dense, data-heavy views" },
    { role: "Highlight", name: "Signal Green", hex: "#22C55E", impact: "unambiguous success", reason: "reserved only for confirmed, completed states" },
  ],
];

function pickPreset(idea: string): number {
  let hash = 0;
  for (const ch of idea) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return hash % PALETTE_PRESETS.length;
}

function firstNonHeadingLine(md: string): string | undefined {
  if (!md) return undefined;
  const line = md
    .split("\n")
    .find((l) => l.trim().length > 0 && !l.startsWith("#") && !l.startsWith(">"));
  return line?.trim();
}

function mockPersonality(idea: string, prd: string): string {
  const grounded = firstNonHeadingLine(prd);
  return [
    `# Brand Personality`,
    ``,
    `> Read from the PRD, not invented — the palette below is chosen to match this, not the other way around.`,
    ``,
    `A product that delivers on: "${idea}" reads as calm and competent, not playful — something a busy ` +
      `professional trusts on sight, not a product trying to entertain them.`,
    grounded ? `\n> ${grounded}` : ``,
  ]
    .filter(Boolean)
    .join("\n");
}

function mockTypography(): string {
  return [
    `# Typography`,
    ``,
    `> One typeface, two weights — legibility over decoration.`,
    ``,
    `**Headings**: Inter, Semibold — confident without shouting.`,
    `**Body**: Inter, Regular — matches headings for consistency without adding a second typeface to manage.`,
  ].join("\n");
}

function mockVoice(): string {
  return [
    `# Brand Voice`,
    ``,
    `> How the product talks, not just how it looks.`,
    ``,
    `- Direct, not clever.`,
    `- Confirms before it assumes.`,
    `- Never blames the user for a failure state.`,
  ].join("\n");
}

function extractBlock(raw: string, marker: string): string | undefined {
  const re = new RegExp(`${BLOCK_DELIM}${marker}${BLOCK_DELIM}\\n([\\s\\S]*?)(?=\\n${BLOCK_DELIM}|$)`);
  return raw.match(re)?.[1]?.trim();
}

function parseColors(block: string | undefined, fallback: BrandColor[]): BrandColor[] {
  if (!block) return fallback;
  const colors = block
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const [role, name, hex, impact, reason] = l.split("|").map((s) => s?.trim());
      return role && name && hex && impact && reason ? { role, name, hex, impact, reason } : null;
    })
    .filter((c): c is BrandColor => !!c);
  return colors.length === 4 ? colors : fallback;
}

/** Generates the real Brand Guidelines artifact: personality, palette, typography, voice. */
export async function generateBrandGuidelines(idea: string, prd: string): Promise<BrandGuidelines> {
  const mockColors = PALETTE_PRESETS[pickPreset(idea)];
  const mockPayload = [
    `${BLOCK_DELIM}PERSONALITY${BLOCK_DELIM}`,
    mockPersonality(idea, prd),
    `${BLOCK_DELIM}TYPOGRAPHY${BLOCK_DELIM}`,
    mockTypography(),
    `${BLOCK_DELIM}VOICE${BLOCK_DELIM}`,
    mockVoice(),
    `${BLOCK_DELIM}COLORS${BLOCK_DELIM}`,
    ...mockColors.map((c) => `${c.role}|${c.name}|${c.hex}|${c.impact}|${c.reason}`),
  ].join("\n");

  const raw = await generateText({
    system:
      "You are the Design agent in a product-development pipeline called MelodyOS, building the brand system " +
      "first — palette, typography, then voice — benchmarked against Linear, Stripe, and Vercel's restraint. " +
      "Ground the personality in the PRD already in shared context; don't invent facts. Output exactly 4 " +
      `blocks in this order, each on its own line as "${BLOCK_DELIM}<NAME>${BLOCK_DELIM}": ` +
      "PERSONALITY (markdown: H1 'Brand Personality', an italic one-line blockquote, then a short paragraph), " +
      "TYPOGRAPHY (markdown: H1 'Typography', an italic one-line blockquote, then a Headings line and a Body " +
      "line), VOICE (markdown: H1 'Brand Voice', an italic one-line blockquote, then exactly 3 bullet points), " +
      "and COLORS (exactly 4 lines, one per role in order Primary/Accent/Background/Highlight, each formatted " +
      "'Role|Name|#hex|impact phrase|reason phrase' — psychologically informed, not decorative).",
    prompt: `Product idea: "${idea}"\n\nPRD (for context):\n${prd || "(none)"}\n\nGenerate the brand guidelines now.`,
    mockFallback: () => mockPayload,
  });

  return {
    personality: extractBlock(raw, "PERSONALITY") ?? mockPersonality(idea, prd),
    typography: extractBlock(raw, "TYPOGRAPHY") ?? mockTypography(),
    voice: extractBlock(raw, "VOICE") ?? mockVoice(),
    colors: parseColors(extractBlock(raw, "COLORS"), mockColors),
  };
}

/**
 * The Design agent's self-directed Q&A (mirrors Research/PRD's pattern):
 * derived directly from the guidelines just generated, not a second LLM
 * round-trip for facts we already produced.
 */
export function buildDesignReasoning(brand: BrandGuidelines): ReasoningPair[] {
  const primary = brand.colors.find((c) => c.role === "Primary");
  return [
    {
      question: "Primary color?",
      answer: primary ? `${primary.name}, ${primary.impact}` : "Not yet generated",
    },
    {
      question: "What comes after the palette?",
      answer: "Typography, then user flows and UI screens",
    },
  ];
}

/** Flat markdown rendering for stages.Design.content (back-compat with the generic MarkdownDoc fallback). */
export function renderBrandGuidelinesMarkdown(brand: BrandGuidelines): string {
  const colorLines = brand.colors
    .map((c) => `- **${c.role}** — ${c.name} (\`${c.hex}\`): ${c.impact}. ${c.reason}`)
    .join("\n");
  return [brand.personality, ``, `## Color Palette`, ``, colorLines, ``, brand.typography, ``, brand.voice].join("\n");
}
