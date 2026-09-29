import { ProjectContext, StageName } from "@/lib/types";
import { NavStageId, STAGE_UI } from "@/lib/stageUi";
import { StatusPill } from "./StatusPill";

export function StageContent({ project, active }: { project: ProjectContext; active: NavStageId }) {
  const ui = STAGE_UI[active];

  if (active === "Ideate") {
    return (
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white/80">{ui.label}</h3>
          <StatusPill status="done" />
        </div>
        <pre className="max-h-[420px] overflow-auto whitespace-pre-wrap rounded-lg bg-black/30 p-4 text-sm leading-relaxed text-white/80">
          {`Original idea, captured before any agent ran:\n\n"${project.idea}"`}
        </pre>
      </div>
    );
  }

  const stage = project.stages[active as StageName];
  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white/80">{ui.label}</h3>
        <StatusPill status={stage.status} />
      </div>
      <pre className="max-h-[420px] overflow-auto whitespace-pre-wrap rounded-lg bg-black/30 p-4 text-sm leading-relaxed text-white/80">
        {stage.content || "Waiting for this stage to run…"}
      </pre>
    </div>
  );
}
