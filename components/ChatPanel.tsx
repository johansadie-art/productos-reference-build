import { ProjectContext } from "@/lib/types";
import { NAV_STAGES, NavStageId, STAGE_UI } from "@/lib/stageUi";

function messagesFor(project: ProjectContext, active: NavStageId): string[] {
  return project.activity.filter((a) => a.stage === active).map((a) => a.message);
}

/**
 * Left panel: chat-style trace for the active stage — mirrors the
 * reference screenshot's transcript (system step → agent intro → sub-step
 * checklist → closing summary → stage status), plus a progress footer and
 * a stubbed chat input. Content here is real (drawn from the pipeline's own
 * activity log), not fabricated copy.
 */
export function ChatPanel({
  project,
  active,
  onSelect,
}: {
  project: ProjectContext;
  active: NavStageId;
  onSelect: (id: NavStageId) => void;
}) {
  const ui = STAGE_UI[active];
  const stage = project.stages[active];
  const messages = messagesFor(project, active);
  const finished = stage.status === "done" || stage.status === "stubbed";
  const substeps = finished ? messages.slice(0, -1) : messages;
  const closing = finished ? messages[messages.length - 1] : null;

  const idx = NAV_STAGES.indexOf(active);
  const next = NAV_STAGES[idx + 1];
  const isFirstStage = idx === 0;

  return (
    <aside className="flex h-full w-[380px] flex-col border-r border-border bg-panel/60">
      <div className="border-b border-border px-4 py-3">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-white/40">{ui.label}</p>
        <div className="flex gap-2">
          <span className="rounded-full border border-border px-2.5 py-1 text-xs text-white/40">ProductOS Agent</span>
          <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${ui.color}`}>{ui.agentName}</span>
        </div>
      </div>

      <div className="flex-1 space-y-4 overflow-auto px-4 py-4 text-sm">
        {!isFirstStage && (
          <div className="flex items-center justify-between text-xs text-white/30">
            <span>↳ get project context · Checking stage</span>
            <span>1 step ✓</span>
          </div>
        )}

        <div className="flex items-start gap-2">
          <span className="mt-0.5" aria-hidden>
            {ui.icon}
          </span>
          <div>
            <span className="font-semibold text-white/90">{ui.agentName}</span>{" "}
            <span className="text-white/50">{ui.agentBlurb}</span>
          </div>
        </div>

        {substeps.length > 0 && (
          <ul className="ml-6 space-y-1.5 text-xs text-white/40">
            {substeps.map((m, i) => (
              <li key={i} className="flex items-center gap-2">
                <span className="h-1 w-1 rounded-full bg-white/30" />
                {m}
                {stage.status === "running" && i === substeps.length - 1 && (
                  <span className="animate-pulse text-accent">…</span>
                )}
              </li>
            ))}
          </ul>
        )}

        {closing && <p className="text-white/60">{closing}</p>}

        {finished && (
          <div className="flex items-center justify-between text-xs text-white/40">
            <span>{next ? "Proposing next stage" : "Pipeline complete"}</span>
            <span className="text-emerald-400">✓</span>
          </div>
        )}
      </div>

      <div className="border-t border-border p-3">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-xs text-white/30">
            {idx + 1} / {NAV_STAGES.length}
          </span>
          <button
            disabled={!next || !finished}
            onClick={() => next && onSelect(next)}
            className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-black transition disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/30"
          >
            {next ? `Continue to ${STAGE_UI[next].label} →` : "Done"}
          </button>
        </div>

        <div className="rounded-xl border border-border bg-black/20 p-2.5">
          <input
            disabled
            placeholder="Tell ProductOS what you want to build…"
            title="Conversational refinement is a Next-phase feature — see docs/ROADMAP.md"
            className="mb-2 w-full bg-transparent text-xs text-white/40 outline-none placeholder:text-white/30"
          />
          <div className="flex items-center justify-between text-xs text-white/25">
            <span className="flex items-center gap-2">
              <span>📎</span>
              <span className="rounded-full border border-border px-2 py-0.5">MCP</span>
            </span>
            <span className="flex items-center gap-2">
              <span>🎙️</span>
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/10">↑</span>
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}
