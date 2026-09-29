import { ProjectContext } from "@/lib/types";
import { NAV_STAGES, NavStageId, STAGE_UI } from "@/lib/stageUi";

function isDoneOrRunning(project: ProjectContext, id: NavStageId): boolean {
  const s = project.stages[id];
  return s.status === "done" || s.status === "stubbed" || s.status === "running" || s.status === "waiting";
}

export function StageNav({
  project,
  active,
  onSelect,
}: {
  project: ProjectContext;
  active: NavStageId;
  onSelect: (id: NavStageId) => void;
}) {
  return (
    <div className="flex items-center justify-center gap-2 py-3">
      {NAV_STAGES.map((id) => {
        const ui = STAGE_UI[id];
        const reached = isDoneOrRunning(project, id);
        const isActive = active === id;
        return (
          <button
            key={id}
            onClick={() => onSelect(id)}
            title={`${ui.label} — ${ui.sublabel}`}
            className={`flex h-9 w-9 items-center justify-center rounded-full border text-base transition ${ui.color} ${
              isActive ? `ring-2 ring-offset-2 ring-offset-bg ${ui.ring}` : ""
            } ${reached ? "" : "opacity-30"}`}
          >
            <span aria-hidden>{ui.icon}</span>
          </button>
        );
      })}
    </div>
  );
}
