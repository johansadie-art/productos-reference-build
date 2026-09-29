"use client";

import { useState } from "react";
import { ProjectContext, StageName } from "@/lib/types";
import { StatusPill } from "./StatusPill";

const STAGES: StageName[] = ["Research", "PRD", "Design", "Code", "Deploy"];

export function ArtifactTabs({ project }: { project: ProjectContext }) {
  const [active, setActive] = useState<StageName>("Research");
  const stage = project.stages[active];

  return (
    <div>
      <div className="flex flex-wrap gap-2 border-b border-border pb-3">
        {STAGES.map((s) => (
          <button
            key={s}
            onClick={() => setActive(s)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
              active === s ? "bg-white/10 text-white" : "text-white/50 hover:text-white/80"
            }`}
          >
            {s}
          </button>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white/80">{active}</h3>
        <StatusPill status={stage.status} />
      </div>
      <pre className="mt-3 max-h-[420px] overflow-auto whitespace-pre-wrap rounded-lg bg-black/30 p-4 text-sm leading-relaxed text-white/80">
        {stage.content || "Waiting for this stage to run…"}
      </pre>
    </div>
  );
}
