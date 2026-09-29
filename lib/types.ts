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

export interface ProjectContext {
  id: string;
  idea: string;
  projectType: ProjectType;
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
}
