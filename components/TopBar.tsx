import { ProjectContext } from "@/lib/types";
import { NavStageId } from "@/lib/stageUi";
import { StageNav } from "./StageNav";
import { PROJECT_TYPE_LABEL } from "@/lib/stageUi";

function projectTitle(idea: string): string {
  const trimmed = idea.trim();
  if (trimmed.length <= 28) return trimmed;
  return trimmed.slice(0, 28).trimEnd() + "…";
}

/**
 * Mirrors the reference screenshots: a title/breadcrumb on the left that
 * changes per project, a stage-icon switcher centered on top, and
 * export/share affordances on the right (stubbed — no real deploy/export
 * in this reference build, see docs/ROADMAP.md).
 */
export function TopBar({
  project,
  active,
  onSelect,
  onBackHome,
}: {
  project: ProjectContext;
  active: NavStageId;
  onSelect: (id: NavStageId) => void;
  onBackHome: () => void;
}) {
  return (
    <div className="grid grid-cols-3 items-center border-b border-border px-4 py-2">
      <div className="flex items-center gap-2 justify-self-start">
        <button
          onClick={onBackHome}
          className="flex h-6 w-6 items-center justify-center rounded-md bg-accent/80 text-xs font-bold text-white"
          title="Back to dashboard"
        >
          P
        </button>
        <span className="text-sm font-medium text-white/80">{projectTitle(project.idea)}</span>
        <span className="rounded-full border border-border px-2 py-0.5 text-[10px] uppercase tracking-wide text-white/40">
          {PROJECT_TYPE_LABEL[project.projectType] ?? "Web App"}
        </span>
      </div>

      <StageNav project={project} active={active} onSelect={onSelect} />

      <div className="flex items-center gap-2 justify-self-end">
        <span className="rounded-full border border-border px-3 py-1 text-xs font-medium text-white/50">
          {project.mode === "live" ? "Live mode" : "Mock mode"}
        </span>
        <button
          disabled
          title="Stubbed in this reference build — see docs/ROADMAP.md (Later)"
          className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/40"
        >
          Export
        </button>
      </div>
    </div>
  );
}
