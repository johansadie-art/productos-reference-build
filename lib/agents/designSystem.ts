import { generateText } from "../llm";
import { BrandGuidelines, ComponentSpec, DesignSystem, DesignToken } from "../types";

// See docs/AGENTS.md: the Design System Agent is a "senior visual
// designer" building tokens + a component system + DESIGN.md + dark/light
// preview pages. This build makes tokens + the component list + DESIGN.md
// real (mock+live). Colors extend the already-locked brand palette;
// spacing/radius are fixed small-scale constants, not LLM-generated — a
// design system's spacing scale isn't a creative decision worth an LLM
// call. The "dark/light preview pages" tool is stood in for by a small
// live-rendered preview in this app's own UI (DesignArtifactPanel), not a
// sandboxed build — that remains the (still-stubbed) Fullstack Builder's job.

function spacingTokens(): DesignToken[] {
  return [4, 8, 12, 16, 24, 32, 48, 64].map((px) => ({ category: "Spacing", name: `space-${px}`, value: `${px}px` }));
}

function radiusTokens(): DesignToken[] {
  return [
    { category: "Radius", name: "radius-sm", value: "4px" },
    { category: "Radius", name: "radius-md", value: "8px" },
    { category: "Radius", name: "radius-lg", value: "16px" },
    { category: "Radius", name: "radius-full", value: "9999px" },
  ];
}

function colorTokens(brand: BrandGuidelines): DesignToken[] {
  return brand.colors.map((c) => ({ category: "Color", name: c.role.toLowerCase(), value: c.hex }));
}

function mockComponents(): ComponentSpec[] {
  return [
    {
      name: "Button",
      variants: ["Primary", "Secondary", "Ghost"],
      states: ["Default", "Hover", "Disabled"],
      notes: "Primary uses the palette's Primary color; never more than one Primary button per view.",
    },
    {
      name: "Input",
      variants: ["Text", "Textarea"],
      states: ["Default", "Focus", "Error"],
      notes: "Error state border uses a status color, not the Accent color.",
    },
    {
      name: "Card",
      variants: ["Default", "Elevated"],
      states: ["Default"],
      notes: "Background token, radius-lg, no more than one accent-colored element per card.",
    },
    {
      name: "Badge",
      variants: ["Status", "Count"],
      states: ["Default"],
      notes: "Reserved for the Highlight color — success/progress moments only.",
    },
  ];
}

/** Generates the component system; tokens are deterministic from the locked brand palette + fixed scales. */
export async function generateDesignSystem(idea: string, brand: BrandGuidelines): Promise<DesignSystem> {
  const tokens = [...colorTokens(brand), ...spacingTokens(), ...radiusTokens()];
  const mockComp = mockComponents();
  const mockPayload = mockComp.map((c) => `${c.name}|${c.variants.join(",")}|${c.states.join(",")}|${c.notes}`).join("\n");

  const raw = await generateText({
    system:
      "You are the Design System Agent in a product-development pipeline called MelodyOS — a senior visual " +
      "designer building the component system from the already-locked brand guidelines. Output exactly 4 " +
      "component rows, one per line, 'Name|Variant,Variant|State,State|One-line usage note', for Button/Input/" +
      "Card/Badge in that order. Ground the usage notes in the locked color roles (Primary/Accent/Background/Highlight).",
    prompt: `Product idea: "${idea}"\n\nLocked brand colors: ${brand.colors.map((c) => `${c.role}=${c.name}(${c.hex})`).join(", ")}\n\nWrite the component system now.`,
    mockFallback: () => mockPayload,
  });

  const components = raw
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const [name, variants, states, notes] = l.split("|").map((s) => s?.trim());
      return name && variants && states && notes
        ? { name, variants: variants.split(",").map((s) => s.trim()), states: states.split(",").map((s) => s.trim()), notes }
        : null;
    })
    .filter((c): c is ComponentSpec => !!c);

  return { tokens, components: components.length === mockComp.length ? components : mockComp };
}

/** DESIGN.md — the token source for build agents, per docs/AGENTS.md. */
export function renderDesignSystemMarkdown(ds: DesignSystem, brand: BrandGuidelines): string {
  const tokenLines = ds.tokens.map((t) => `| ${t.category} | ${t.name} | ${t.value} |`).join("\n");
  const compLines = ds.components
    .map((c) => `### ${c.name}\n- Variants: ${c.variants.join(", ")}\n- States: ${c.states.join(", ")}\n- ${c.notes}`)
    .join("\n\n");
  return [
    `# DESIGN.md`,
    ``,
    `> Token source for build agents — see docs/AGENTS.md: Design System Agent.`,
    ``,
    `## Tokens`,
    ``,
    `| Category | Name | Value |`,
    `| --- | --- | --- |`,
    tokenLines,
    ``,
    `## Components`,
    ``,
    compLines,
    ``,
    brand.typography,
    ``,
    brand.voice,
  ].join("\n");
}
