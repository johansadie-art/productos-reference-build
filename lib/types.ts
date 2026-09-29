export type StageName = "Ideate" | "Research" | "PRD" | "Design" | "Code" | "Deploy";

export type StageStatus = "pending" | "running" | "waiting" | "done" | "stubbed" | "error";

export type ProjectType = "website" | "web_app" | "mobile_app";

export interface ActivityEntry {
  time: string; // ISO timestamp
  stage: StageName | "System";
  message: string;
}

export interface StageResult {
  status: StageStatus;
  content: string; // markdown/plain text artifact
}

export type ChatRole = "agent" | "user";
export type ChatKind = "question" | "answer" | "info";

export interface ChatMessage {
  role: ChatRole;
  content: string;
  time: string;
  kind: ChatKind;
}

/** A single agent-asked, agent-answered investigative question (not a user prompt). */
export interface ReasoningPair {
  question: string;
  answer: string;
}

export interface ChartBar {
  label: string;
  value: number; // 0-100
  highlight?: boolean;
}

/**
 * Research runs multiple per-topic investigations in parallel (see
 * docs/AGENTS.md: write_research_run), not one blob — Market Sizing &
 * Pricing, Competitor Landscape, Customer Preferences, Positioning & Wedge.
 */
export interface ResearchTopic {
  id: string;
  tabLabel: string;
  docTitle: string;
  content: string;
  chart?: { caption: string; bars: ChartBar[] };
}

/** A single written PRD section, once the outline has been approved. */
export interface PRDSection {
  id: string;
  title: string;
  content: string;
}

/** One swatch in the brand color palette — role + a psychologically-informed rationale, not just a hex code. */
export interface BrandColor {
  role: string; // "Primary" | "Accent" | "Background" | "Highlight"
  name: string;
  hex: string;
  impact: string;
  reason: string;
}

/**
 * Design's real deliverable in this reference build (see docs/AGENTS.md):
 * the Brand Guidelines doc — personality, a 4-color palette, typography,
 * and voice. Design System/User Flows/UI Screens/Design Builder remain
 * stubbed (they need live sandbox code execution — out of scope here).
 */
export interface BrandGuidelines {
  personality: string;
  colors: BrandColor[];
  typography: string;
  voice: string;
}

/** One locked tech-stack fact — read by PRD's and Architect's shared `load_constraints` tool. */
export interface TechStackFact {
  area: string; // "Frontend" | "Backend / API" | "Database" | "Hosting" | "Auth"
  choice: string;
  reason: string;
}

/** One structured project constraint — same `load_constraints` surface as tech-stack facts. */
export interface ProjectConstraint {
  label: string; // "Team size" | "Timeline" | "Budget sensitivity" | "Compliance"
  value: string;
}

/**
 * "Locked constraints" per docs/AGENTS.md: structured project constraints +
 * locked tech-stack facts, read by both the PRD Agent and the Architect
 * Agent via their shared `load_constraints` tool. In the real product these
 * would come from a project-setup intake; this reference build has none, so
 * they're generated once, early in the pipeline (mock+live) — see
 * lib/agents/constraints.ts — and never re-asked afterward.
 */
export interface ProjectConstraints {
  techStack: TechStackFact[];
  constraints: ProjectConstraint[];
}

/** One of the Architect Agent's 8 architecture sections (`write_architecture_section`). */
export interface ArchitectureSection {
  id: string;
  title: string;
  content: string;
}

/** One architecture decision record (`record_architecture_decision`). */
export interface ArchitectureDecision {
  id: string;
  title: string;
  context: string;
  decision: string;
  consequences: string;
}

/** One line item in the Architect Agent's infra cost projection (`estimate_infrastructure_cost`). */
export interface CostLineItem {
  service: string;
  estimate: string;
  reason: string;
}

export interface InfrastructureCostEstimate {
  lineItems: CostLineItem[];
  totalRange: string;
  notes: string;
}

/** One design token — colors extend the locked brand palette; spacing/radius are fixed small-scale constants. */
export interface DesignToken {
  category: string; // "Color" | "Spacing" | "Radius"
  name: string;
  value: string;
}

/** One component in the Design System's component system (`write_design_preview`/`write_design_brief`). */
export interface ComponentSpec {
  name: string; // "Button" | "Input" | "Card" | "Badge"
  variants: string[];
  states: string[];
  notes: string;
}

/**
 * The Design System Agent's real deliverable in this build: tokens +
 * a component system + DESIGN.md (see docs/AGENTS.md). The "dark/light
 * preview pages" tool is stood in for by a small live-rendered preview in
 * this app's own UI, not a sandboxed build.
 */
export interface DesignSystem {
  tokens: DesignToken[];
  components: ComponentSpec[];
}

/** One step in a user flow — a screen name + what happens there. */
export interface UserFlowStep {
  screen: string;
  description: string;
}

/** One named user flow (`get_user_flows`/`set_user_flows`) — the Design Agent's own deliverable, not Design System's. */
export interface UserFlow {
  id: string;
  name: string;
  purpose: string;
  steps: UserFlowStep[];
}

/** One UI screen spec, for exactly the screens named across the user flows. */
export interface UIScreen {
  id: string;
  name: string;
  purpose: string;
  components: string[];
  states: string[];
}

export interface ProjectContext {
  id: string;
  idea: string;
  projectType: ProjectType;
  // Dashboard grouping only (e.g. "Accounts", "Payments & Transfers", "Core
  // Flows") — lets the home screen show a portfolio of many features in
  // progress, not just one idea at a time. Optional; ungrouped projects
  // fall under "Other" in the UI. See lib/seed.ts for example data.
  category?: string;
  createdAt: string;
  status: "running" | "done" | "error";
  mode: "mock" | "live";
  activity: ActivityEntry[];
  stages: Record<StageName, StageResult>;
  // The literal "shared context" every agent reads/writes — kept as a flat,
  // append-only key/value map so the UI can show exactly what was read/written.
  sharedContext: Record<string, string>;
  // The Ideation Agent is a QUESTIONER (see docs/AGENTS.md), not a one-shot
  // writer — it holds a real back-and-forth before locking the concept brief.
  ideateConversation: ChatMessage[];
  pendingIdeateQuestions: string[];
  // The Research Agent investigates itself rather than asking the user —
  // these are its own questions-to-itself, answered from its findings.
  researchReasoning: ReasoningPair[];
  researchTopics: ResearchTopic[];
  // PRD/Define runs behind an outline-approval gate (see docs/AGENTS.md):
  // propose an outline -> user approves it -> sections get written one at a
  // time against the approved outline, not all at once from a blank prompt.
  prdReasoning: ReasoningPair[];
  prdOutline: string[];
  prdSections: PRDSection[];
  prdApprovalSummary: string;
  // Design's self-directed Q&A (mirrors Research/PRD's pattern) + the real
  // Brand Guidelines artifact — see docs/AGENTS.md.
  designReasoning: ReasoningPair[];
  brandGuidelines: BrandGuidelines | null;
  designClosingSummary: string;
  // Design System (tokens/component system/DESIGN.md) + the Design Agent's
  // own User Flows and UI Screens deliverables — all real now, see
  // lib/agents/designSystem.ts and lib/agents/flows.ts. Design Builder
  // (live sandbox page-building) remains stubbed.
  designSystem: DesignSystem | null;
  userFlows: UserFlow[];
  uiScreens: UIScreen[];
  // Locked constraints (see ProjectConstraints) — read by PRD's and the
  // Architect's shared load_constraints tool. Generated once, early.
  constraints: ProjectConstraints | null;
  // The Architect Agent is OPTIONAL (see docs/AGENTS.md) — triggered on
  // demand from the Architecture tab, unlike Research/PRD/Design which
  // auto-run. "not_started" until the user clicks "Run Architecture
  // Deep-Dive"; requires PRD to be done first.
  architectureStatus: "not_started" | "running" | "done";
  architectureSections: ArchitectureSection[];
  architectureDecisions: ArchitectureDecision[];
  infraCostEstimate: InfrastructureCostEstimate | null;
}
