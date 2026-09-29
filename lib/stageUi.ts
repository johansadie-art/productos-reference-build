import { StageName } from "./types";

/**
 * UI-only metadata mapping our backend stage names to the source product's
 * 5-stage IA (Ideate → Discover → Define → Design → Code), based on the
 * reference screenshots: a top-center row of colored stage icons plus a
 * left-sidebar outline. "Ideate" has no backend agent in this reference
 * build (see docs/PRD.md) — it's the idea-capture step itself, always
 * "done" once a pipeline has started.
 */
export type NavStageId = "Ideate" | StageName;

export const NAV_STAGES: NavStageId[] = ["Ideate", "Research", "PRD", "Design", "Code"];
// Deploy is intentionally excluded from the top nav to mirror the source
// app's 5-icon switcher; its status is surfaced separately (publish action).

export const STAGE_UI: Record<
  NavStageId,
  { label: string; sublabel: string; icon: string; color: string; ring: string }
> = {
  Ideate: {
    label: "Ideate",
    sublabel: "Shape a raw idea into a testable concept",
    icon: "\u{1F4A1}",
    color: "bg-amber-500/20 text-amber-400 border-amber-500/40",
    ring: "ring-amber-400",
  },
  Research: {
    label: "Discover",
    sublabel: "Research the market, users, and feasibility",
    icon: "\u{1F4E1}",
    color: "bg-sky-500/20 text-sky-400 border-sky-500/40",
    ring: "ring-sky-400",
  },
  PRD: {
    label: "Define",
    sublabel: "Turn research into an approved PRD",
    icon: "\u{1F4C4}",
    color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/40",
    ring: "ring-emerald-400",
  },
  Design: {
    label: "Design",
    sublabel: "Create flows, screens, and the UI system",
    icon: "\u{1F3A8}",
    color: "bg-violet-500/20 text-violet-400 border-violet-500/40",
    ring: "ring-violet-400",
  },
  Code: {
    label: "Code",
    sublabel: "Build, test, and ship the product",
    icon: "\u{1F4BB}",
    color: "bg-rose-500/20 text-rose-400 border-rose-500/40",
    ring: "ring-rose-400",
  },
  // Not in NAV_STAGES (excluded from the top switcher, see note above) but
  // included here for type completeness and any future direct references.
  Deploy: {
    label: "Deploy",
    sublabel: "Publish and sync to your own infrastructure",
    icon: "\u{1F680}",
    color: "bg-orange-500/20 text-orange-400 border-orange-500/40",
    ring: "ring-orange-400",
  },
};

export const PROJECT_TYPE_LABEL: Record<string, string> = {
  website: "Website",
  web_app: "Web App",
  mobile_app: "Mobile App",
};
