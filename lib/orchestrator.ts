import { randomUUID } from "crypto";
import { ProjectContext, ProjectType, StageName } from "./types";
import { saveProject } from "./store";
import { getMode } from "./llm";
import { runResearchAgent } from "./agents/research";
import { runPRDAgent } from "./agents/prd";
import { stubCode, stubDeploy, stubDesign } from "./agents/stubs";

const STAGE_ORDER: StageName[] = ["Research", "PRD", "Design", "Code", "Deploy"];

function emptyProject(id: string, idea: string, projectType: ProjectType, startStage?: string): ProjectContext {
  const stages = STAGE_ORDER.reduce(
    (acc, s) => ({ ...acc, [s]: { status: "pending" as const, content: "" } }),
    {} as ProjectContext["stages"]
  );
  const activity = [
    { time: new Date().toISOString(), stage: "System" as const, message: `Project created for idea: "${idea}"` },
  ];
  if (startStage && startStage !== "Ideate" && startStage !== "Research") {
    activity.push({
      time: new Date().toISOString(),
      stage: "System",
      message: `Requested start stage "${startStage}" isn't runnable without upstream artifacts in this reference build — starting at Discover (Research) instead.`,
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
  };
}

function log(project: ProjectContext, stage: StageName | "System", message: string) {
  project.activity.push({ time: new Date().toISOString(), stage, message });
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Creates a project and kicks off the pipeline asynchronously (fire-and-forget).
 * The caller (API route) returns the project id immediately; the client polls
 * GET /api/projects/[id] to watch the shared context and activity feed update
 * live, mirroring the "night shift" timeline on the source product.
 */
export function startPipeline(idea: string, projectType: ProjectType = "web_app", startStage?: string): ProjectContext {
  const id = randomUUID();
  const project = emptyProject(id, idea, projectType, startStage);
  saveProject(project);

  // Fire and forget — this is a local reference build, not a job queue.
  runPipeline(project).catch((err) => {
    console.error("[orchestrator] pipeline failed:", err);
    project.status = "error";
    log(project, "System", `Pipeline failed: ${String(err)}`);
    saveProject(project);
  });

  return project;
}

async function runPipeline(project: ProjectContext) {
  // --- Research ---
  project.stages.Research.status = "running";
  log(project, "Research", "Reading shared context (idea only, first stage) — starting market scan.");
  saveProject(project);
  await sleep(400);

  const research = await runResearchAgent(project.idea);
  project.stages.Research = { status: "done", content: research };
  project.sharedContext["research.output"] = research;
  log(project, "Research", "Market scan complete — wrote findings to shared context.");
  saveProject(project);

  // --- PRD ---
  project.stages.PRD.status = "running";
  log(project, "PRD", "Reading Research output from shared context — drafting PRD.");
  saveProject(project);
  await sleep(400);

  const prd = await runPRDAgent(project.idea, research);
  project.stages.PRD = { status: "done", content: prd };
  project.sharedContext["prd.output"] = prd;
  log(project, "PRD", "PRD drafted — wrote spec to shared context.");
  saveProject(project);

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
  log(project, "System", "Pipeline complete. Research + PRD are live artifacts; Design/Code/Deploy are stubbed.");

  project.status = "done";
  saveProject(project);
}
