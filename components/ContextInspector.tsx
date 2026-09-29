"use client";

import { useState } from "react";
import { ProjectContext } from "@/lib/types";

/**
 * FR5: the user can view the full Project Context (raw shared state) at any
 * point — this is the feature under test (shared context across agents),
 * so it's surfaced directly rather than buried in a debug panel.
 */
export function ContextInspector({ project }: { project: ProjectContext }) {
  const [open, setOpen] = useState(false);
  const keys = Object.keys(project.sharedContext);

  return (
    <div className="rounded-xl border border-border bg-panel p-4">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between text-left"
      >
        <span className="text-sm font-semibold text-white/80">
          Shared Project Context ({keys.length} {keys.length === 1 ? "entry" : "entries"})
        </span>
        <span className="text-white/40">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="mt-3 space-y-3">
          {keys.length === 0 && <p className="text-sm text-white/40">Nothing written yet.</p>}
          {keys.map((k) => (
            <div key={k}>
              <div className="mb-1 text-xs font-mono text-accent">{k}</div>
              <pre className="max-h-40 overflow-auto whitespace-pre-wrap rounded-lg bg-black/30 p-3 text-xs text-white/60">
                {project.sharedContext[k]}
              </pre>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
