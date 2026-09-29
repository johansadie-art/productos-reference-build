import { randomUUID } from "crypto";
import { ProjectContext, ProjectType, StageName } from "./types";
import { saveProject } from "./store";
import { getMode } from "./llm";
import { runIdeateAgent } from "./agents/ideate";
import { runResearchAgent } from "./agents/research";
import { runPRDAgent } from "./agents/prd";
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
 * live. Each stage logs 3 sub-steps (start / mid / done) so the chat-style
 * left panel in the UI has a real (not fabricated) step-by-step trace to
 * render, mirroring the reference product's transcript.
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
  // --- Ideate ---
  project.stages.Ideate.status = "running";
  log(project, "Ideate", "Reading your prompt…");
  saveProject(project);
  await sleep(300);
  log(project, "Ideate", "Sharpening the problem and target user…");
  saveProject(project);
  await sleep(300);

  const ideateBrief = await runIdeateAgent(project.idea);
  project.stages.Ideate = { status: "done", content: ideateBrief };
  project.sharedContext["ideate.output"] = ideateBrief;
  log(project, "Ideate", "Concept locked — wrote ideation brief to shared context.");
  saveProject(project);

  // --- Research (Discover) ---
  project.stages.Research.status = "running";
  log(project, "Research", "Reading ideation brief from shared context — scanning the market…");
  saveProject(project);
  await sleep(300);
  log(project, "Research", "Profiling competitors and sizing the opportunity…");
  saveProject(project);
  await sleep(300);

  const research = await runResearchAgent(project.idea, ideateBrief);
  project.stages.Research = { status: "done", content: research };
  project.sharedContext["research.output"] = research;
  log(project, "Research", "Market scan complete — wrote findings to shared context.");
  saveProject(project);

  // --- PRD (Define) ---
  project.stages.PRD.status = "running";
  log(project, "PRD", "Reading ideation brief + research from shared context…");
  saveProject(project);
  await sleep(300);
  log(project, "PRD", "Drafting PRD sections…");
  saveProject(project);
  await sleep(300);

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
  log(project, "System", "Pipeline complete. Ideate + Research + PRD are live artifacts; Design/Code/Deploy are stubbed.");

  project.status = "done";
  saveProject(project);
}
