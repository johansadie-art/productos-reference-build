import { ProjectContext } from "@/lib/types";
import { NavStageId, STAGE_UI } from "@/lib/stageUi";
import { StatusPill } from "./StatusPill";
import { MarkdownDoc } from "./MarkdownDoc";

function wordCount(text: string): number {
  return text.trim().length ? text.trim().split(/\s+/).length : 0;
}

/**
 * Right panel: the live artifact/document for the active stage — mirrors
 * the "Ideation brief — Live concept doc" panel in the reference
 * screenshots (header + rendered doc + word/char count footer).
 */
export function ArtifactPanel({ project, active }: { project: ProjectContext; active: NavStageId }) {
  const ui = STAGE_UI[active];
  const stage = project.stages[active];
  const content = stage.content;

  return (
    <section className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border px-5 py-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-white/40">{ui.docTitle}</span>
          <StatusPill status={stage.status} />
        </div>
        <button
          disabled
          title="Stubbed in this reference build — no persistence beyond this session"
          className="rounded-md px-2 py-1 text-xs font-medium text-amber-400/60"
        >
          ↓ Save
        </button>
      </div>

      <div className="flex-1 overflow-auto px-6 py-5">
        {content ? (
          <MarkdownDoc content={content} />
        ) : (
          <p className="text-sm text-white/30">
            {stage.status === "waiting"
              ? "Answer the Ideation Agent's questions on the left to generate this doc."
              : "Waiting for this stage to run…"}
          </p>
        )}
      </div>

      <div className="flex items-center justify-end gap-3 border-t border-border px-5 py-2 text-[11px] text-white/30">
        <span>
          {wordCount(content)} words · {content.length} chars
        </span>
        <span className="flex items-center gap-1 text-amber-400/70">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-400/70" /> Unsaved
        </span>
      </div>
    </section>
  );
}
