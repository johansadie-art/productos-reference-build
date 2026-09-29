import { randomUUID } from "crypto";
import { ProjectContext, ProjectType, StageName, ChatMessage, ChatKind } from "./types";
import { saveProject, loadProject } from "./store";
import { getMode } from "./llm";
import { generateClarifyingQuestions, synthesizeConceptBrief, QaPair } from "./agents/ideate";
import { runResearchReasoning, runResearchTopics } from "./agents/research";
import { runPRDReasoning, proposePRDOutline, writePRDSections, countFlaggedAssumptions } from "./agents/prd";
import { generateBrandGuidelines, buildDesignReasoning, renderBrandGuidelinesMarkdown } from "./agents/design";
import { generateDesignSystem, renderDesignSystemMarkdown } from "./agents/designSystem";
import { generateUserFlows, generateUIScreens, uniqueScreenNames, renderUserFlowsMarkdown, renderUIScreensMarkdown } from "./agents/flows";
import { generateConstraints, renderTechStackMarkdown, renderProjectConstraintsMarkdown } from "./agents/constraints";
import { generateArchitecture, renderArchitectureMarkdown } from "./agents/architect";
import { stubCode, stubDeploy } from "./agents/stubs";

const STAGE_ORDER: StageName[] = ["Ideate", "Research", "PRD", "Design", "Code", "Deploy"];

export function emptyProject(id: string, idea: string, projectType: ProjectType, startStage?: string, category?: string): ProjectContext {
  const stages = STAGE_ORDER.reduce(
    (acc, s) => ({ ...acc, [s]: { status: "pending" as const, content: "" } }),
    {} as ProjectContext["stages"]
  );
  const activity = [
    { time: new Date().toISOString(), stage: "System" as const, message: `Project created for idea: "${idea}"` },
  ];
  if (startStage && startStage !== "Ideate") {
    activity.push({
      time: new Date().toISOString(),
      stage: "System",
      message: `Requested start stage "${startStage}" isn't runnable without upstream artifacts in this reference build — starting at Ideate instead.`,
    });
  }
  return {
    id,
    idea,
    projectType,
    category,
    createdAt: new Date().toISOString(),
    status: "running",
    mode: getMode(),
    activity,
    stages,
    sharedContext: {},
    ideateConversation: [],
    pendingIdeateQuestions: [],
    researchReasoning: [],
    researchTopics: [],
    prdReasoning: [],
    prdOutline: [],
    prdSections: [],
    prdApprovalSummary: "",
    designReasoning: [],
    brandGuidelines: null,
    designClosingSummary: "",
    designSystem: null,
    userFlows: [],
    uiScreens: [],
    constraints: null,
    architectureStatus: "not_started",
    architectureSections: [],
    architectureDecisions: [],
    infraCostEstimate: null,
  };
}

function log(project: ProjectContext, stage: StageName | "System", message: string) {
  project.activity.push({ time: new Date().toISOString(), stage, message });
}

function say(project: ProjectContext, role: ChatMessage["role"], kind: ChatKind, content: string) {
  project.ideateConversation.push({ role, kind, content, time: new Date().toISOString() });
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function collectQaPairs(conversation: ChatMessage[]): QaPair[] {
  const pairs: QaPair[] = [];
  for (let i = 0; i < conversation.length; i++) {
    const q = conversation[i];
    const a = conversation[i + 1];
    if (q.role === "agent" && q.kind === "question" && a && a.role === "user" && a.kind === "answer") {
      pairs.push({ question: q.content, answer: a.content });
    }
  }
  return pairs;
}

/**
 * Creates a project and starts the Ideation conversation (fire-and-forget).
 * Unlike the rest of the pipeline, Ideate does NOT auto-run to completion —
 * it's a real back-and-forth (see docs/AGENTS.md: Ideation is a QUESTIONER,
 * not a writer). The rest of the pipeline (Research → ... → Deploy) only
 * starts once the concept is locked via submitIdeateAnswer().
 */
export function startPipeline(
  idea: string,
  projectType: ProjectType = "web_app",
  startStage?: string,
  category?: string
): ProjectContext {
  const id = randomUUID();
  const project = emptyProject(id, idea, projectType, startStage, category);
  project.stages.Ideate.status = "waiting";
  saveProject(project);

  beginIdeateConversation(project).catch((err) => {
    console.error("[orchestrator] ideation start failed:", err);
    project.status = "error";
    log(project, "System", `Ideation failed to start: ${String(err)}`);
    saveProject(project);
  });

  return project;
}

async function beginIdeateConversation(project: ProjectContext) {
  log(project, "Ideate", "Reading your prompt…");
  saveProject(project);
  await sleep(300);

  const questions = await generateClarifyingQuestions(project.idea);
  const [first, ...rest] = questions;
  project.pendingIdeateQuestions = rest;
  say(project, "agent", "question", first);
  log(project, "Ideate", "Sharpening the problem — waiting on your answer to lock the concept.");
  saveProject(project);
}

/**
 * Called each time the user answers an Ideation question. Either asks the
 * next queued question, or — once all questions are answered — synthesizes
 * the concept brief and kicks off the rest of the pipeline.
 */
export async function submitIdeateAnswer(id: string, answer: string): Promise<ProjectContext> {
  const project = loadProject(id);
  if (!project) throw new Error("project not found");
  if (project.stages.Ideate.status !== "waiting") return project; // ignore stray/duplicate submits

  say(project, "user", "answer", answer);
  saveProject(project);

  if (project.pendingIdeateQuestions.length > 0) {
    const [next, ...rest] = project.pendingIdeateQuestions;
    project.pendingIdeateQuestions = rest;
    say(project, "agent", "question", next);
    saveProject(project);
    return project;
  }

  // All questions answered — lock the concept.
  log(project, "Ideate", "Writing the concept doc…");
  saveProject(project);

  const qa = collectQaPairs(project.ideateConversation);
  const { conceptBrief, assumptions, openQuestions } = await synthesizeConceptBrief(project.idea, qa);

  project.stages.Ideate = { status: "done", content: conceptBrief };
  project.sharedContext["ideate.output"] = conceptBrief;
  if (assumptions.length) project.sharedContext["ideate.assumptions"] = assumptions.map((a) => `- ${a}`).join("\n");
  if (openQuestions.length)
    project.sharedContext["ideate.openQuestions"] = openQuestions.map((q) => `- ${q}`).join("\n");

  say(
    project,
    "agent",
    "info",
    "The concept's locked in. The live doc on the right has the problem, the user, and the MVP scope."
  );
  log(project, "Ideate", "Concept locked — wrote ideation brief to shared context.");
  saveProject(project);

  runRestOfPipeline(project, conceptBrief).catch((err) => {
    console.error("[orchestrator] pipeline failed:", err);
    project.status = "error";
    log(project, "System", `Pipeline failed: ${String(err)}`);
    saveProject(project);
  });

  return project;
}

async function runRestOfPipeline(project: ProjectContext, ideateBrief: string) {
  // --- Locked Constraints (read by PRD + Architect via load_constraints) ---
  // Per docs/AGENTS.md: both agents share a "load_constraints" tool reading
  // structured project constraints + locked tech-stack facts. This
  // reference build has no project-setup intake UI, so they're generated
  // once here (mock+live), grounded in the idea + project type, and never
  // re-asked afterward — "locked" in the sense both agents read the same
  // values, not that a human filled out a form.
  log(project, "System", "Locking project constraints — tech-stack facts + structured constraints…");
  saveProject(project);
  const constraints = await generateConstraints(project.idea, ideateBrief, project.projectType);
  project.constraints = constraints;
  project.sharedContext["constraints.techStack"] = renderTechStackMarkdown(constraints);
  project.sharedContext["constraints.projectConstraints"] = renderProjectConstraintsMarkdown(constraints);
  log(project, "System", "Constraints locked — wrote tech-stack facts + project constraints to shared context.");
  saveProject(project);

  // --- Research (Discover) ---
  // Per docs/AGENTS.md: the Research Agent validates the concept against
  // the market before committing to requirements, running four research
  // jobs in parallel and grounding claims in sources — not one blob.
  project.stages.Research.status = "running";
  log(project, "Research", "Scanning the market…");
  saveProject(project);
  await sleep(300);
  log(project, "Research", "Profiling competitors…");
  saveProject(project);
  await sleep(300);
  log(project, "Research", "Testing the riskiest assumption…");
  saveProject(project);
  await sleep(300);

  project.researchReasoning = await runResearchReasoning(project.idea, ideateBrief);
  const topics = await runResearchTopics(project.idea, ideateBrief);
  project.researchTopics = topics;

  const combined = topics.map((t) => `# ${t.tabLabel}\n\n${t.content}`).join("\n\n---\n\n");
  project.stages.Research = { status: "done", content: combined };
  project.sharedContext["research.output"] = combined;
  topics.forEach((t) => {
    project.sharedContext[`research.${t.id}`] = t.content;
  });

  log(project, "Research", "Research is complete and strong. Findings and sources are in the docs on the right.");
  saveProject(project);

  // --- PRD (Define) ---
  // Per docs/AGENTS.md: the PRD agent cuts scope with a self-directed
  // reasoning trace, then writes straight into the "ProductOS Standard"
  // outline — no outline-approval gate in this reference build (only one
  // template exists, so there's nothing to approve between; see
  // docs/ROADMAP.md for a real approval/revision gate across templates).
  project.stages.PRD.status = "running";
  log(project, "PRD", "Turning research into requirements…");
  saveProject(project);
  await sleep(300);
  log(project, "PRD", "Cutting scope to an MVP…");
  saveProject(project);
  await sleep(300);
  log(project, "PRD", "Writing acceptance criteria…");
  saveProject(project);
  await sleep(300);

  const ideateAssumptions = project.sharedContext["ideate.assumptions"] ?? "";
  project.prdReasoning = await runPRDReasoning(project.idea, ideateBrief);
  project.prdOutline = await proposePRDOutline(project.idea, combined);

  const sections = await writePRDSections(
    project.idea,
    combined,
    ideateBrief,
    ideateAssumptions,
    project.prdOutline,
    project.prdReasoning
  );
  project.prdSections = sections;

  const prdDoc = sections.map((s) => `# ${s.title}\n\n${s.content}`).join("\n\n---\n\n");
  project.stages.PRD = { status: "done", content: prdDoc };
  project.sharedContext["prd.output"] = prdDoc;

  const flaggedCount = countFlaggedAssumptions(sections);
  project.prdApprovalSummary = `PRD drafted. ${flaggedCount} ${flaggedCount === 1 ? "assumption" : "assumptions"} flagged for team validation.`;
  log(project, "PRD", "PRD drafted — wrote spec to shared context.");
  saveProject(project);

  await runFinalStubs(project);
}

/**
 * The Architect Agent is the OPTIONAL technical deep-dive inside Define
 * (see docs/AGENTS.md) — triggered on demand from the Architecture tab,
 * unlike Research/PRD/Design which auto-run. Requires the PRD to be done
 * (it reads PRD sections) and reads the constraints already locked earlier
 * in the pipeline.
 */
export async function runArchitectureDeepDive(id: string): Promise<ProjectContext> {
  const project = loadProject(id);
  if (!project) throw new Error("project not found");
  if (project.stages.PRD.status !== "done") {
    throw new Error("The PRD must be done before running the Architecture deep-dive");
  }
  if (project.architectureStatus === "running" || project.architectureStatus === "done") return project;

  project.architectureStatus = "running";
  log(project, "PRD", "Architect Agent: loading locked constraints…");
  saveProject(project);
  await sleep(300);
  log(project, "PRD", "Architect Agent: writing architecture sections…");
  saveProject(project);

  const constraints =
    project.constraints ?? (await generateConstraints(project.idea, project.sharedContext["ideate.output"] ?? "", project.projectType));
  project.constraints = constraints;

  const prd = project.sharedContext["prd.output"] ?? "";
  const { sections, decisions, cost } = await generateArchitecture(project.idea, prd, constraints);

  await sleep(300);
  log(project, "PRD", "Architect Agent: recording decisions and estimating infrastructure cost…");
  saveProject(project);

  project.architectureSections = sections;
  project.architectureDecisions = decisions;
  project.infraCostEstimate = cost;
  project.architectureStatus = "done";
  project.sharedContext["architecture.output"] = renderArchitectureMarkdown(sections, decisions, cost);
  log(project, "PRD", `Architect Agent: done — ${sections.length} sections, ${decisions.length} ADRs, cost estimated.`);
  saveProject(project);

  return project;
}

async function runFinalStubs(project: ProjectContext) {
  // --- Design (Brand Guidelines, Design System, User Flows, and UI Screens
  // all real; only Design Builder — the live sandbox page-builder — stays
  // stubbed. See docs/AGENTS.md.) ---
  project.stages.Design.status = "running";
  log(project, "Design", "Analyzing brand personality from the PRD…");
  saveProject(project);
  await sleep(300);
  log(project, "Design", "Generating the color system…");
  saveProject(project);
  await sleep(300);
  log(project, "Design", "Writing the strategy notes for each color…");
  saveProject(project);
  await sleep(300);

  const prdForDesign = project.sharedContext["prd.output"] ?? "";
  const brand = await generateBrandGuidelines(project.idea, prdForDesign);
  project.brandGuidelines = brand;
  project.designReasoning = buildDesignReasoning(brand);
  project.sharedContext["design.brandGuidelines"] = renderBrandGuidelinesMarkdown(brand);

  log(project, "Design", "Building the component system…");
  saveProject(project);
  await sleep(300);
  const designSystem = await generateDesignSystem(project.idea, brand);
  project.designSystem = designSystem;
  project.sharedContext["design.designSystem"] = renderDesignSystemMarkdown(designSystem, brand);

  log(project, "Design", "Writing user flows…");
  saveProject(project);
  await sleep(300);
  const flows = await generateUserFlows(project.idea, prdForDesign);
  project.userFlows = flows;
  project.sharedContext["design.userFlows"] = renderUserFlowsMarkdown(flows);

  log(project, "Design", "Specifying UI screens…");
  saveProject(project);
  await sleep(300);
  const screenNames = uniqueScreenNames(flows);
  const componentNames = designSystem.components.map((c) => c.name);
  const screens = await generateUIScreens(project.idea, prdForDesign, screenNames, componentNames);
  project.uiScreens = screens;
  project.sharedContext["design.uiScreens"] = renderUIScreensMarkdown(screens);

  project.designClosingSummary =
    `Brand guidelines, component system, ${flows.length} user flows, and ${screens.length} UI screens are locked. ` +
    "Design Builder (live sandbox page-building) is stubbed in this reference build (see docs/ROADMAP.md).";
  project.stages.Design = { status: "done", content: renderBrandGuidelinesMarkdown(brand) };
  log(project, "Design", "Design locked — wrote brand system, tokens, flows, and screens to shared context.");
  saveProject(project);

  // --- Code (stub) ---
  project.stages.Code.status = "running";
  log(project, "Code", "Stubbed stage in this reference build (see docs/ROADMAP.md, Next phase).");
  saveProject(project);
  await sleep(300);
  project.stages.Code = { status: "stubbed", content: stubCode(project.idea) };
  saveProject(project);

  // --- Deploy (stub) ---
  project.stages.Deploy.status = "running";
  log(project, "Deploy", "Stubbed stage in this reference build (see docs/ROADMAP.md, Later phase).");
  saveProject(project);
  await sleep(300);
  project.stages.Deploy = { status: "stubbed", content: stubDeploy() };
  log(
    project,
    "System",
    "Pipeline complete. Ideate + Research + PRD + Design (Brand Guidelines, Design System, User Flows, UI Screens) are live artifacts; Design Builder plus Code/Deploy are stubbed."
  );

  project.status = "done";
  saveProject(project);
}
