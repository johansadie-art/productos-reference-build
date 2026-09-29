import { STAGE_UI } from "./stageUi";
import { ProjectContext, StageName } from "./types";

// Dashboard progress signal. Capped at Design deliberately: Code/Deploy are
// always-instant stubs the moment Design finishes (see docs/AGENTS.md), so
// they're not a meaningful "how far along is this" signal — Design done is
// this reference build's real finish line.
export const PROGRESS_STAGES: StageName[] = ["Ideate", "Research", "PRD", "Design"];

export interface ProjectProgress {
  currentStage: StageName;
  label: string;
  fraction: number; // 0..1 across PROGRESS_STAGES
  isWaiting: boolean;
  isDone: boolean;
  doneStages: StageName[];
}

export function getProjectProgress(project: ProjectContext): ProjectProgress {
  if (project.stages.Ideate.status === "waiting") {
    return { currentStage: "Ideate", label: "Waiting on your answer", fraction: 0.08, isWaiting: true, isDone: false, doneStages: [] };
  }

  let lastDoneIdx = -1;
  const doneStages: StageName[] = [];
  for (let i = 0; i < PROGRESS_STAGES.length; i++) {
    const s = project.stages[PROGRESS_STAGES[i]];
    if (s.status === "done" || s.status === "stubbed") {
      lastDoneIdx = i;
      doneStages.push(PROGRESS_STAGES[i]);
    }
  }

  if (lastDoneIdx === PROGRESS_STAGES.length - 1) {
    return { currentStage: "Design", label: "Complete", fraction: 1, isWaiting: false, isDone: true, doneStages };
  }

  const currentIdx = lastDoneIdx + 1;
  const currentStage = PROGRESS_STAGES[currentIdx];
  const currentStatus = project.stages[currentStage].status;
  const label =
    lastDoneIdx === -1
      ? `${STAGE_UI.Ideate.label} · in progress`
      : `${STAGE_UI[currentStage].label} · ${currentStatus === "running" ? "in progress" : "up next"}`;

  return {
    currentStage,
    label,
    fraction: Math.max(0.08, (lastDoneIdx + 1) / PROGRESS_STAGES.length),
    isWaiting: false,
    isDone: false,
    doneStages,
  };
}
