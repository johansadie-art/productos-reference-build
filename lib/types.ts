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
}
