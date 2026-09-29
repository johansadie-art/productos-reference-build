import { ProjectContext, StageStatus } from "@/lib/types";
import { NAV_STAGES, NavStageId, STAGE_UI } from "@/lib/stageUi";
import { StageIcon } from "./StageIcon";

function isDoneOrRunning(project: ProjectContext, id: NavStageId): boolean {
  const s = project.stages[id];
  return s.status === "done" || s.status === "stubbed" || s.status === "running" || s.status === "waiting";
}

/** A small corner badge showing whether this stage is actually finished, running, or blocked on you. */
function StageBadge({ status }: { status: StageStatus }) {
  if (status === "done" || status === "stubbed") {
    return (
      <span
        title={status === "stubbed" ? "Stubbed — see docs/ROADMAP.md" : "Done"}
        className="absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full border border-bg bg-emerald-500 text-[8px] font-bold leading-none text-black"
      >
        ✓
      </span>
    );
  }
  if (status === "running") {
    return (
      <span
        title="Running…"
        className="absolute -right-1 -top-1 h-3 w-3 animate-pulse rounded-full border border-bg bg-accent"
      />
    );
  }
  if (status === "waiting") {
    return (
      <span
        title="Waiting for you"
        className="absolute -right-1 -top-1 h-3 w-3 animate-pulse rounded-full border border-bg bg-sky-400"
      />
    );
  }
  if (status === "error") {
    return (
      <span
        title="Error"
        className="absolute -right-1 -top-1 h-3 w-3 rounded-full border border-bg bg-red-500"
      />
    );
  }
  return null;
}

/**
 * One simple, single-colour square (rounded corners) per stage — a
 * consistent "logo mark" set rather than multi-coloured emoji. Reached
 * stages are lit up; anything not reached yet stays greyed out as a gate
 * (you can still click ahead, but the dimness signals "not really there
 * yet"). A small corner badge shows the real status (done/running/waiting)
 * pulled straight from the stage's actual data, not just this being active.
 */
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
    <div className="flex items-center justify-center gap-3 py-2.5">
      {NAV_STAGES.map((id) => {
        const ui = STAGE_UI[id];
        const status = project.stages[id].status;
        const reached = isDoneOrRunning(project, id);
        const isActive = active === id;
        return (
          <button
            key={id}
            onClick={() => onSelect(id)}
            title={`${ui.label} — ${ui.sublabel}`}
            className={`group flex flex-col items-center gap-1 ${reached ? "" : "opacity-30"}`}
          >
            <span
              className={`relative flex h-9 w-9 items-center justify-center rounded-lg border transition ${
                isActive
                  ? "border-accent/60 bg-accent/15 text-accent"
                  : "border-white/10 bg-white/[0.04] text-white/70 group-hover:bg-white/[0.08]"
              }`}
            >
              <StageIcon id={id} />
              <StageBadge status={status} />
            </span>
            <span
              className={`text-[10px] font-medium leading-none tracking-wide ${
                isActive ? "text-accent" : "text-white/50"
              }`}
            >
              {ui.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
