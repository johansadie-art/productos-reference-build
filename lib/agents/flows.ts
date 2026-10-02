import { generateText } from "../llm";
import { UIScreen, UserFlow, UserFlowStep } from "../types";

// See docs/AGENTS.md: the Design Agent's own deliverables (distinct from
// the Design System Agent) are user-flow diagrams and UI screen specs —
// the `get_user_flows`/`set_user_flows` tool. This build makes both real
// as structured content (named flows, per-screen specs), not actual
// rendered screens — that needs live sandbox code execution (the Design
// Builder / Fullstack Builder), which remains stubbed. UI Screens are
// generated for exactly the screen names that come out of User Flows, so
// the two tabs never disagree with each other.

const FLOW_DELIM = "%%%FLOW:";
const SCREEN_DELIM = "%%%SCREEN:";

function idFor(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
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
        !l.trim().startsWith("|") &&
        !/^-{3,}$/.test(l.trim())
    );
  return line?.trim();
}

function mockFlows(idea: string, prd: string): UserFlow[] {
  const grounded = firstNonHeadingLine(prd) ?? `deliver on "${idea}"`;
  return [
    {
      id: "onboarding",
      name: "Onboarding",
      purpose: "Get a new user from signup to their first real action with no dead ends.",
      steps: [
        { screen: "Sign Up", description: "Email + OAuth, matching the locked Auth constraint." },
        { screen: "Welcome", description: `One line on what this does: ${grounded}` },
        { screen: "Home", description: "Empty state that points straight at the core action, not a blank dashboard." },
      ],
    },
    {
      id: "core-action",
      name: "Core Action",
      purpose: "The one flow the PRD's Objective & Key Results is actually measuring.",
      steps: [
        { screen: "Home", description: "Entry point — the one obvious next step." },
        { screen: "Core Action", description: "The flow the whole product exists to support." },
        { screen: "Confirmation", description: "Confirms the action landed, with a clear next step." },
      ],
    },
    {
      id: "empty-error-state",
      name: "Empty / Error State",
      purpose: "What the user sees before they've done anything, or when something fails.",
      steps: [
        { screen: "Home (empty)", description: "No data yet — explains what to do next, not just a blank screen." },
        { screen: "Error", description: "Names the problem and gives one clear recovery action, per the Brand Voice." },
      ],
    },
  ];
}

/** Writes the user flows (`get_user_flows`/`set_user_flows`), grounded in the locked PRD. */
export async function generateUserFlows(idea: string, prd: string): Promise<UserFlow[]> {
  const mock = mockFlows(idea, prd);
  const mockJoined = mock
    .map(
      (f) =>
        `${FLOW_DELIM}${f.name}%%%\nPurpose: ${f.purpose}\n${f.steps.map((s) => `- ${s.screen}: ${s.description}`).join("\n")}`
    )
    .join("\n\n");

  const raw = await generateText({
    system:
      "You are the Design Agent in a product-development pipeline called MelodyOS, writing user flows " +
      "grounded in the locked PRD — do not invent screens the PRD doesn't support. Output exactly 3 flow " +
      "blocks, in order Onboarding / Core Action / Empty or Error State, each starting with a line " +
      `"${FLOW_DELIM}<Flow Name>%%%" followed by a "Purpose: <one line>" line, then 2-3 steps as ` +
      `'- <Screen Name>: <one-line description>'.`,
    prompt: `Product idea: "${idea}"\n\nPRD (for context):\n${prd || "(none)"}\n\nWrite the user flows now.`,
    mockFallback: () => mockJoined,
  });

  const chunks = raw
    .split(new RegExp(`${FLOW_DELIM}(.+?)%%%`))
    .map((c) => c.trim())
    .filter(Boolean);
  const flows: UserFlow[] = [];
  for (let i = 0; i + 1 < chunks.length; i += 2) {
    const name = chunks[i].trim();
    const body = chunks[i + 1];
    const purpose = body.match(/Purpose:\s*(.+)/)?.[1]?.trim();
    const steps: UserFlowStep[] = body
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.startsWith("-"))
      .map((l) => {
        const m = l.match(/^-\s*(.+?):\s*(.+)$/);
        return m ? { screen: m[1].trim(), description: m[2].trim() } : null;
      })
      .filter((s): s is UserFlowStep => !!s);
    if (purpose && steps.length) flows.push({ id: idFor(name), name, purpose, steps });
  }

  return flows.length === mock.length ? flows : mock;
}

/** The deduped, order-preserving list of screen names referenced across all flows. */
export function uniqueScreenNames(flows: UserFlow[]): string[] {
  const seen = new Set<string>();
  const names: string[] = [];
  for (const f of flows) {
    for (const s of f.steps) {
      if (!seen.has(s.screen)) {
        seen.add(s.screen);
        names.push(s.screen);
      }
    }
  }
  return names;
}

function mockScreens(screenNames: string[], componentNames: string[]): UIScreen[] {
  return screenNames.map((name) => ({
    id: idFor(name),
    name,
    purpose: `Supports the "${name}" step in the user flows above.`,
    components: componentNames.length ? componentNames.slice(0, 3) : ["Card", "Button"],
    states: ["Default", "Loading", "Empty"],
  }));
}

/** Writes a UI screen spec for exactly the screens named in the user flows — never adds or renames screens. */
export async function generateUIScreens(idea: string, prd: string, screenNames: string[], componentNames: string[]): Promise<UIScreen[]> {
  if (!screenNames.length) return [];
  const mock = mockScreens(screenNames, componentNames);
  const mockJoined = mock
    .map((s) => `${SCREEN_DELIM}${s.name}%%%\nPurpose: ${s.purpose}\nComponents: ${s.components.join(", ")}\nStates: ${s.states.join(", ")}`)
    .join("\n\n");

  const raw = await generateText({
    system:
      "You are the Design Agent in a product-development pipeline called MelodyOS, writing UI screen specs " +
      "for exactly the screens named in the user flows already generated — do not add or rename screens. For " +
      "each, name its purpose, which design-system components it uses, and its states (Default plus 1-2 " +
      `others relevant to that screen). Output one block per screen, each starting with a line ` +
      `"${SCREEN_DELIM}<Screen Name>%%%" using the exact names given, followed by "Purpose: …", ` +
      `"Components: <comma-separated>", "States: <comma-separated>".`,
    prompt:
      `Product idea: "${idea}"\n\nScreens to spec (exactly these, in order): ${screenNames.join(", ")}\n\n` +
      `Design-system components available: ${componentNames.join(", ") || "(none yet)"}\n\nPRD (for context):\n${prd || "(none)"}\n\n` +
      `Write the screen specs now.`,
    mockFallback: () => mockJoined,
  });

  const chunks = raw
    .split(new RegExp(`${SCREEN_DELIM}(.+?)%%%`))
    .map((c) => c.trim())
    .filter(Boolean);
  const screens: UIScreen[] = [];
  for (let i = 0; i + 1 < chunks.length; i += 2) {
    const name = chunks[i].trim();
    const body = chunks[i + 1];
    const purpose = body.match(/Purpose:\s*(.+)/)?.[1]?.trim();
    const components = body
      .match(/Components:\s*(.+)/)?.[1]
      ?.split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const states = body
      .match(/States:\s*(.+)/)?.[1]
      ?.split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (screenNames.includes(name) && purpose && components?.length && states?.length) {
      screens.push({ id: idFor(name), name, purpose, components, states });
    }
  }

  return screens.length === screenNames.length ? screens : mock;
}

export function renderUserFlowsMarkdown(flows: UserFlow[]): string {
  return flows
    .map((f) =>
      [`# ${f.name}`, ``, `> ${f.purpose}`, ``, ...f.steps.map((s, i) => `${i + 1}. **${s.screen}** — ${s.description}`)].join("\n")
    )
    .join("\n\n---\n\n");
}

export function renderUIScreensMarkdown(screens: UIScreen[]): string {
  return screens
    .map((s) =>
      [`# ${s.name}`, ``, `> ${s.purpose}`, ``, `**Components**: ${s.components.join(", ")}`, `**States**: ${s.states.join(", ")}`].join(
        "\n"
      )
    )
    .join("\n\n---\n\n");
}
