import { StageName } from "./types";

/**
 * UI-only metadata mapping our backend stage names to the source product's
 * 5-stage IA (Ideate → Discover → Define → Design → Code), based on the
 * reference screenshots: a top-center row of colored stage icons, a
 * chat-style left panel (system trace + agent intro + sub-steps), and a
 * live-document right panel.
 */
export type NavStageId = StageName;

export const NAV_STAGES: NavStageId[] = ["Ideate", "Research", "PRD", "Design", "Code"];
// Deploy is intentionally excluded from the top nav to mirror the source
// app's 5-icon switcher; its status is surfaced separately (publish action).

export const STAGE_UI: Record<
  NavStageId,
  {
    label: string;
    sublabel: string;
    icon: string;
    color: string;
    ring: string;
    agentName: string;
    agentBlurb: string;
    docTitle: string;
    /** The "get project context"-style system step line shown before the agent intro. */
    systemStepLabel: string;
    /** How many upstream artifacts this agent reads from shared context — drives the "N steps ✓" badge. */
    contextStepCount: number;
  }
> = {
  Ideate: {
    label: "Ideate",
    sublabel: "Shape a raw idea into a testable concept",
    icon: "\u{1F4A1}",
    color: "bg-amber-500/20 text-amber-400 border-amber-500/40",
    ring: "ring-amber-400",
    agentName: "Ideation Agent",
    agentBlurb: "The user wants to build this product. Locking the concept before anything gets built.",
    docTitle: "Ideation brief — Live concept doc",
    systemStepLabel: "get project context · Checking stage",
    contextStepCount: 0,
  },
  Research: {
    label: "Discover",
    sublabel: "Research the market, users, and feasibility",
    icon: "\u{1F4E1}",
    color: "bg-sky-500/20 text-sky-400 border-sky-500/40",
    ring: "ring-sky-400",
    agentName: "Research Agent",
    agentBlurb: "Validating the concept against the market before we commit to requirements.",
    docTitle: "Research brief — Live market scan",
    systemStepLabel: "plan research · load-bearing questions",
    contextStepCount: 1,
  },
  PRD: {
    label: "Define",
    sublabel: "Turn research into an approved PRD",
    icon: "\u{1F4C4}",
    color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/40",
    ring: "ring-emerald-400",
    agentName: "PRD Agent",
    agentBlurb: "Turning validated research into an approved, testable first release.",
    docTitle: "PRD — Live spec doc",
    systemStepLabel: "read research · Drafting requirements",
    contextStepCount: 2,
  },
  Design: {
    label: "Design",
    sublabel: "Create flows, screens, and the UI system",
    icon: "\u{1F3A8}",
    color: "bg-violet-500/20 text-violet-400 border-violet-500/40",
    ring: "ring-violet-400",
    agentName: "Design Agent",
    agentBlurb: "Stubbed in this reference build — see docs/ROADMAP.md (Next phase).",
    docTitle: "Design — Stubbed",
    systemStepLabel: "get project context · Checking stage",
    contextStepCount: 3,
  },
  Code: {
    label: "Code",
    sublabel: "Build, test, and ship the product",
    icon: "\u{1F4BB}",
    color: "bg-rose-500/20 text-rose-400 border-rose-500/40",
    ring: "ring-rose-400",
    agentName: "Code Agent",
    agentBlurb: "Stubbed in this reference build — see docs/ROADMAP.md (Next phase).",
    docTitle: "Code — Stubbed",
    systemStepLabel: "get project context · Checking stage",
    contextStepCount: 4,
  },
  Deploy: {
    label: "Deploy",
    sublabel: "Publish and sync to your own infrastructure",
    icon: "\u{1F680}",
    color: "bg-orange-500/20 text-orange-400 border-orange-500/40",
    ring: "ring-orange-400",
    agentName: "Deploy Agent",
    agentBlurb: "Stubbed in this reference build — see docs/ROADMAP.md (Later phase).",
    docTitle: "Deploy — Stubbed",
    systemStepLabel: "get project context · Checking stage",
    contextStepCount: 5,
  },
};

export const PROJECT_TYPE_LABEL: Record<string, string> = {
  website: "Website",
  web_app: "Web App",
  mobile_app: "Mobile App",
};
