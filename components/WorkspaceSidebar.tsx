import { ProjectContext } from "@/lib/types";
import { NAV_STAGES, NavStageId, STAGE_UI } from "@/lib/stageUi";
import { StatusPill } from "./StatusPill";

function statusFor(project: ProjectContext, id: NavStageId) {
  if (id === "Ideate") return "done" as const;
  return project.stages[id as Exclude<NavStageId, "Ideate">].status;
}

function nextIncompleteStage(project: ProjectContext, active: NavStageId): NavStageId | null {
  const idx = NAV_STAGES.indexOf(active);
  return NAV_STAGES[idx + 1] ?? null;
}

/**
 * Mirrors the reference screenshots' left sidebar: an outline of the
 * pipeline with per-stage status, a chat-style input (stubbed — no
 * conversational refinement in this build), and a "Continue to X" primary
 * action.
 */
export function WorkspaceSidebar({
  project,
  active,
  onSelect,
}: {
  project: ProjectContext;
  active: NavStageId;
  onSelect: (id: NavStageId) => void;
}) {
  const next = nextIncompleteStage(project, active);

  return (
    <aside className="flex h-full w-64 flex-col border-r border-border bg-panel/60 p-4">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-white/40">Pipeline</h2>
      <div className="flex-1 space-y-1 overflow-auto">
        {NAV_STAGES.map((id) => {
          const ui = STAGE_UI[id];
          const status = statusFor(project, id);
          const isActive = active === id;
          return (
            <button
              key={id}
              onClick={() => onSelect(id)}
              className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-sm transition ${
                isActive ? "bg-white/10 text-white" : "text-white/60 hover:bg-white/5"
              }`}
            >
              <span className="flex items-center gap-2">
                <span aria-hidden>{ui.icon}</span>
                {ui.label}
              </span>
              <StatusPill status={status} />
            </button>
          );
        })}
      </div>

      <div className="mt-4 space-y-3 border-t border-border pt-4">
        <input
          disabled
          placeholder="Ask the agent to refine this stage… (Next phase)"
          title="Conversational refinement is a Next-phase feature — see docs/ROADMAP.md"
          className="w-full rounded-lg border border-border bg-black/20 px-3 py-2 text-xs text-white/40 placeholder:text-white/30"
        />
        <button
          disabled={!next}
          className="w-full rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-white transition disabled:opacity-30"
          onClick={() => next && onSelect(next)}
        >
          {next ? `Continue to ${STAGE_UI[next].label}` : "Pipeline complete"}
        </button>
      </div>
    </aside>
  );
}
