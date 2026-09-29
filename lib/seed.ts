import { randomUUID } from "crypto";
import { emptyProject } from "./orchestrator";
import { saveProject, listProjects } from "./store";
import { ProjectContext, ProjectType } from "./types";
import { generateClarifyingQuestions, synthesizeConceptBrief, QaPair } from "./agents/ideate";
import { runResearchReasoning, runResearchTopics } from "./agents/research";
import { runPRDReasoning, proposePRDOutline, writePRDSections, countFlaggedAssumptions } from "./agents/prd";
import { generateConstraints, renderTechStackMarkdown, renderProjectConstraintsMarkdown } from "./agents/constraints";
import { generateBrandGuidelines, buildDesignReasoning, renderBrandGuidelinesMarkdown } from "./agents/design";
import { generateDesignSystem, renderDesignSystemMarkdown } from "./agents/designSystem";
import { generateUserFlows, generateUIScreens, uniqueScreenNames, renderUserFlowsMarkdown, renderUIScreensMarkdown } from "./agents/flows";
import { stubCode, stubDeploy } from "./agents/stubs";

// The home screen is a portfolio dashboard (see docs/PRD.md / the user's
// "land on multiple features" request, 2026-09-29), not a single idea box.
// This seeds an EXAMPLE portfolio — a fake credit-union banking app,
// modeled on real nav structures the user shared (Accounts, Transfer
// Funds, Pay a Person, Bill Pay, Manage My Cards, Loan Center, plus the
// universal Login/Onboarding flows every app needs) — so the dashboard
// demonstrates "many features, each further along than the last" instead
// of being empty on first run.
//
// IMPORTANT: this calls the SAME real agent functions the live orchestrator
// uses (no hand-written fake JSON), just without the orchestrator's
// artificial `sleep()` pacing — so seed content is authentic mock (or live,
// if API keys are configured) output, not a fabricated stand-in.

function log(project: ProjectContext, stage: ProjectContext["activity"][number]["stage"], message: string) {
  project.activity.push({ time: new Date().toISOString(), stage, message });
}

function sayAgent(project: ProjectContext, content: string, kind: "question" | "info" = "question") {
  project.ideateConversation.push({ role: "agent", kind, content, time: new Date().toISOString() });
}

function sayUser(project: ProjectContext, content: string) {
  project.ideateConversation.push({ role: "user", kind: "answer", content, time: new Date().toISOString() });
}

type StopAt = "waiting" | "ideate" | "research" | "prd" | "design" | "done";

interface DemoSpec {
  idea: string;
  category: string;
  // A feature that decomposes into several independent PRDs (e.g. Login)
  // sets the same subcategory on each of its sub-PRDs; leave unset for the
  // common one-PRD-per-feature case. See lib/types.ts's ProjectContext.
  subcategory?: string;
  projectType: ProjectType;
  /** Answers to the Ideation Agent's 2 clarifying questions — [product name, target user]. */
  answers: [string, string];
  stopAt: StopAt;
}

const DEMO_SPECS: DemoSpec[] = [
  {
    idea: "Checking Account",
    category: "Accounts",
    projectType: "mobile_app",
    answers: ["Checking Account", "Everyday members who need a primary spending account"],
    stopAt: "design",
  },
  {
    idea: "Savings Account",
    category: "Accounts",
    projectType: "mobile_app",
    answers: ["Savings Account", "Members building an emergency fund"],
    stopAt: "prd",
  },
  {
    idea: "High-Yield Account",
    category: "Accounts",
    projectType: "mobile_app",
    answers: ["High-Yield Account", "Rate-sensitive members comparing where to park savings"],
    stopAt: "research",
  },
  {
    idea: "Money Market Account",
    category: "Accounts",
    projectType: "mobile_app",
    answers: ["Money Market Account", "Members who want savings yield plus limited check-writing"],
    stopAt: "ideate",
  },
  {
    idea: "Transfer Funds",
    category: "Payments & Transfers",
    projectType: "mobile_app",
    answers: ["Transfer Funds", "Members moving money between their own accounts"],
    stopAt: "prd",
  },
  {
    idea: "Pay a Person",
    category: "Payments & Transfers",
    projectType: "mobile_app",
    answers: ["Pay a Person", "Members sending money to friends and family, P2P"],
    stopAt: "research",
  },
  {
    idea: "Bill Pay",
    category: "Payments & Transfers",
    projectType: "mobile_app",
    answers: ["Bill Pay", "Members paying recurring bills from one place"],
    stopAt: "ideate",
  },
  {
    idea: "Manage My Cards",
    category: "Cards & Loans",
    projectType: "mobile_app",
    answers: ["Manage My Cards", ""],
    stopAt: "waiting",
  },
  {
    idea: "Loan Center",
    category: "Cards & Loans",
    projectType: "mobile_app",
    answers: ["Loan Center", "Members exploring auto, personal, and home loans"],
    stopAt: "done",
  },
  // Login is the example the dashboard needs to handle well: it's not one
  // PRD, it's a cluster of several — each independently scoped, each at a
  // different point in the pipeline. Sharing `subcategory: "Login"` groups
  // them into one card instead of 5 separate top-level ones.
  {
    idea: "Password Login",
    category: "Core Flows",
    subcategory: "Login",
    projectType: "mobile_app",
    answers: ["Password Login", "Any returning member authenticating with username + password"],
    stopAt: "done",
  },
  {
    idea: "Biometric Login",
    category: "Core Flows",
    subcategory: "Login",
    projectType: "mobile_app",
    answers: ["Biometric Login", "Returning members who want Face ID / fingerprint sign-in"],
    stopAt: "design",
  },
  {
    idea: "Multi-Factor Authentication",
    category: "Core Flows",
    subcategory: "Login",
    projectType: "mobile_app",
    answers: ["Multi-Factor Authentication", "Members opting into a second factor for higher-value accounts"],
    stopAt: "prd",
  },
  {
    idea: "Single Sign-On (SSO)",
    category: "Core Flows",
    subcategory: "Login",
    projectType: "mobile_app",
    answers: ["Single Sign-On", "Members who also use partner sites and want one login"],
    stopAt: "research",
  },
  {
    idea: "Forgot Password",
    category: "Core Flows",
    subcategory: "Login",
    projectType: "mobile_app",
    answers: ["Forgot Password", ""],
    stopAt: "waiting",
  },
  {
    idea: "Onboarding",
    category: "Core Flows",
    projectType: "mobile_app",
    answers: ["Onboarding", "New members setting up the app for the first time"],
    stopAt: "prd",
  },
];

async function buildDemoProject(spec: DemoSpec): Promise<ProjectContext> {
  const project = emptyProject(randomUUID(), spec.idea, spec.projectType, undefined, spec.category, spec.subcategory);

  // --- Ideate ---
  project.stages.Ideate.status = "waiting";
  log(project, "Ideate", "Reading your prompt…");
  const [q1, q2] = await generateClarifyingQuestions(project.idea);
  sayAgent(project, q1);
  sayUser(project, spec.answers[0]);

  if (spec.stopAt === "waiting") {
    // Leave mid-conversation — second question asked, not yet answered —
    // to demonstrate the dashboard's "waiting on you" status for real.
    sayAgent(project, q2);
    project.pendingIdeateQuestions = [];
    return project;
  }

  sayAgent(project, q2);
  sayUser(project, spec.answers[1]);

  const qa: QaPair[] = [
    { question: q1, answer: spec.answers[0] },
    { question: q2, answer: spec.answers[1] },
  ];
  const { conceptBrief, assumptions, openQuestions } = await synthesizeConceptBrief(project.idea, qa);
  project.stages.Ideate = { status: "done", content: conceptBrief };
  project.sharedContext["ideate.output"] = conceptBrief;
  if (assumptions.length) project.sharedContext["ideate.assumptions"] = assumptions.map((a) => `- ${a}`).join("\n");
  if (openQuestions.length) project.sharedContext["ideate.openQuestions"] = openQuestions.map((q) => `- ${q}`).join("\n");
  sayAgent(project, "The concept's locked in. The live doc on the right has the problem, the user, and the MVP scope.", "info");
  log(project, "Ideate", "Concept locked — wrote ideation brief to shared context.");

  if (spec.stopAt === "ideate") {
    project.status = "running";
    return project;
  }

  // --- Locked Constraints (read by PRD + Architect) ---
  log(project, "System", "Locking project constraints — tech-stack facts + structured constraints…");
  const constraints = await generateConstraints(project.idea, conceptBrief, project.projectType);
  project.constraints = constraints;
  project.sharedContext["constraints.techStack"] = renderTechStackMarkdown(constraints);
  project.sharedContext["constraints.projectConstraints"] = renderProjectConstraintsMarkdown(constraints);

  // --- Research ---
  project.stages.Research.status = "running";
  log(project, "Research", "Scanning the market…");
  project.researchReasoning = await runResearchReasoning(project.idea, conceptBrief);
  const topics = await runResearchTopics(project.idea, conceptBrief);
  project.researchTopics = topics;
  const combinedResearch = topics.map((t) => `# ${t.tabLabel}\n\n${t.content}`).join("\n\n---\n\n");
  project.stages.Research = { status: "done", content: combinedResearch };
  project.sharedContext["research.output"] = combinedResearch;
  topics.forEach((t) => (project.sharedContext[`research.${t.id}`] = t.content));
  log(project, "Research", "Research is complete and strong. Findings and sources are in the docs on the right.");

  if (spec.stopAt === "research") {
    project.status = "running";
    return project;
  }

  // --- PRD ---
  project.stages.PRD.status = "running";
  log(project, "PRD", "Turning research into requirements…");
  const ideateAssumptions = project.sharedContext["ideate.assumptions"] ?? "";
  project.prdReasoning = await runPRDReasoning(project.idea, conceptBrief);
  project.prdOutline = await proposePRDOutline(project.idea, combinedResearch);
  const sections = await writePRDSections(project.idea, combinedResearch, conceptBrief, ideateAssumptions, project.prdOutline, project.prdReasoning);
  project.prdSections = sections;
  const prdDoc = sections.map((s) => `# ${s.title}\n\n${s.content}`).join("\n\n---\n\n");
  project.stages.PRD = { status: "done", content: prdDoc };
  project.sharedContext["prd.output"] = prdDoc;
  const flaggedCount = countFlaggedAssumptions(sections);
  project.prdApprovalSummary = `PRD drafted. ${flaggedCount} ${flaggedCount === 1 ? "assumption" : "assumptions"} flagged for team validation.`;
  log(project, "PRD", "PRD drafted — wrote spec to shared context.");

  if (spec.stopAt === "prd") {
    project.status = "running";
    return project;
  }

  // --- Design (Brand Guidelines, Design System, User Flows, UI Screens) ---
  project.stages.Design.status = "running";
  log(project, "Design", "Analyzing brand personality from the PRD…");
  const brand = await generateBrandGuidelines(project.idea, prdDoc);
  project.brandGuidelines = brand;
  project.designReasoning = buildDesignReasoning(brand);
  project.sharedContext["design.brandGuidelines"] = renderBrandGuidelinesMarkdown(brand);

  const designSystem = await generateDesignSystem(project.idea, brand);
  project.designSystem = designSystem;
  project.sharedContext["design.designSystem"] = renderDesignSystemMarkdown(designSystem, brand);

  const flows = await generateUserFlows(project.idea, prdDoc);
  project.userFlows = flows;
  project.sharedContext["design.userFlows"] = renderUserFlowsMarkdown(flows);

  const screenNames = uniqueScreenNames(flows);
  const componentNames = designSystem.components.map((c) => c.name);
  const screens = await generateUIScreens(project.idea, prdDoc, screenNames, componentNames);
  project.uiScreens = screens;
  project.sharedContext["design.uiScreens"] = renderUIScreensMarkdown(screens);

  project.designClosingSummary =
    `Brand guidelines, component system, ${flows.length} user flows, and ${screens.length} UI screens are locked. ` +
    "Design Builder (live sandbox page-building) is stubbed in this reference build (see docs/ROADMAP.md).";
  project.stages.Design = { status: "done", content: renderBrandGuidelinesMarkdown(brand) };
  log(project, "Design", "Design locked — wrote brand system, tokens, flows, and screens to shared context.");

  if (spec.stopAt === "design") {
    // Deliberately leave Code/Deploy pending — "actively being worked on
    // right now" is a more interesting dashboard status than instantly
    // stubbing the rest.
    project.status = "running";
    return project;
  }

  // --- Code / Deploy (stubbed, same as the live pipeline) ---
  project.stages.Code = { status: "stubbed", content: stubCode(project.idea) };
  project.stages.Deploy = { status: "stubbed", content: stubDeploy() };
  log(project, "System", "Pipeline complete.");
  project.status = "done";
  return project;
}

/** Seeds the example banking-app portfolio the first time there are no projects at all. */
export async function ensureDemoSeed(): Promise<void> {
  if (listProjects().length > 0) return;
  for (const spec of DEMO_SPECS) {
    const project = await buildDemoProject(spec);
    saveProject(project);
  }
}
