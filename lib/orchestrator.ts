import { randomUUID } from "crypto";
import { ProjectContext, ProjectType, StageName, ChatMessage, ChatKind } from "./types";
import { saveProject, loadProject } from "./store";
import { getMode } from "./llm";
import { generateClarifyingQuestions, synthesizeConceptBrief, QaPair } from "./agents/ideate";
import { runResearchReasoning, runResearchTopics } from "./agents/research";
import { runPRDReasoning, proposePRDOutline, writePRDSections, countFlaggedAssumptions } from "./agents/prd";
import { stubCode, stubDeploy, stubDesign } from "./agents/stubs";

const STAGE_ORDER: StageName[] = ["Ideate", "Research", "PRD", "Design", "Code", "Deploy"];

function emptyProject(id: string, idea: string, projectType: ProjectType, startStage?: string): ProjectContext {
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
export function startPipeline(idea: string, projectType: ProjectType = "web_app", startStage?: string): ProjectContext {
  const id = randomUUID();
  const project = emptyProject(id, idea, projectType, startStage);
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
  // Per docs/AGENTS.md: the PRD agent writes sections behind an
  // outline-approval gate — it scaffolds the outline first and pauses
  // (mirrors Ideate's "waiting" pattern) until the user approves it via
  // submitPRDOutlineApproval(), instead of writing the whole doc at once.
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

  project.prdReasoning = await runPRDReasoning(project.idea, ideateBrief);
  project.prdOutline = await proposePRDOutline(project.idea, combined);
  project.stages.PRD.status = "waiting";
  log(project, "PRD", "Outline proposed — waiting on your approval to start writing sections.");
  saveProject(project);
}

/**
 * Called once the user approves the PRD outline. Writes each section in
 * turn against the approved outline, then continues the rest of the
 * pipeline (Design/Code/Deploy stubs), mirroring the submitIdeateAnswer /
 * runRestOfPipeline split used for the Ideate gate.
 */
export async function submitPRDOutlineApproval(id: string): Promise<ProjectContext> {
  const project = loadProject(id);
  if (!project) throw new Error("project not found");
  if (project.stages.PRD.status !== "waiting") return project; // ignore stray/duplicate submits

  project.stages.PRD.status = "running";
  log(project, "PRD", "Outline approved — writing sections one at a time…");
  saveProject(project);

  writePRDAndContinue(project).catch((err) => {
    console.error("[orchestrator] PRD section writing failed:", err);
    project.status = "error";
    log(project, "System", `PRD failed: ${String(err)}`);
    saveProject(project);
  });

  return project;
}

async function writePRDAndContinue(project: ProjectContext) {
  const ideateBrief = project.sharedContext["ideate.output"] ?? "";
  const ideateAssumptions = project.sharedContext["ideate.assumptions"] ?? "";
  const research = project.sharedContext["research.output"] ?? "";

  const sections = await writePRDSections(
    project.idea,
    research,
    ideateBrief,
    ideateAssumptions,
    project.prdOutline,
    project.prdReasoning
  );
  project.prdSections = sections;

  const combined = sections.map((s) => `# ${s.title}\n\n${s.content}`).join("\n\n---\n\n");
  project.stages.PRD = { status: "done", content: combined };
  project.sharedContext["prd.output"] = combined;

  const flaggedCount = countFlaggedAssumptions(sections);
  project.prdApprovalSummary = `PRD approved. ${flaggedCount} ${flaggedCount === 1 ? "assumption" : "assumptions"} flagged for team validation.`;
  log(project, "PRD", "PRD drafted — wrote spec to shared context.");
  saveProject(project);

  await runFinalStubs(project);
}

async function runFinalStubs(project: ProjectContext) {
  // --- Design (stub) ---
  project.stages.Design.status = "running";
  log(project, "Design", "Stubbed stage in this reference build (see docs/ROADMAP.md, Next phase).");
  saveProject(project);
  await sleep(300);
  project.stages.Design = { status: "stubbed", content: stubDesign(project.idea) };
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
  log(project, "System", "Pipeline complete. Ideate + Research + PRD are live artifacts; Design/Code/Deploy are stubbed.");

  project.status = "done";
  saveProject(project);
}
