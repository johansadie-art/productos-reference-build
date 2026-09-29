"use client";

import { useState } from "react";
import { ProjectType } from "@/lib/types";
import { NAV_STAGES, NavStageId, PROJECT_TYPE_LABEL, STAGE_UI } from "@/lib/stageUi";

const PROJECT_TYPES: ProjectType[] = ["website", "web_app", "mobile_app"];

// Only Ideate/Discover are meaningful starting points in this reference
// build (there's nothing to "start from" for Define/Design/Code without the
// upstream artifacts existing yet) — see docs/PRD.md scope.
const SUPPORTED_START_STAGES: NavStageId[] = ["Ideate", "Research"];

export function HomeScreen({
  onSubmit,
  submitting,
}: {
  onSubmit: (idea: string, projectType: ProjectType, startStage: NavStageId) => void;
  submitting: boolean;
}) {
  const [idea, setIdea] = useState("");
  const [projectType, setProjectType] = useState<ProjectType>("web_app");
  const [startStage, setStartStage] = useState<NavStageId>("Ideate");
  const [typeOpen, setTypeOpen] = useState(false);
  const [stageOpen, setStageOpen] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!idea.trim() || submitting) return;
    onSubmit(idea.trim(), projectType, startStage);
  }

  return (
    <main className="mx-auto flex max-w-2xl flex-col items-center px-6 py-24 text-center">
      <h1 className="text-3xl font-semibold tracking-tight">Good evening.</h1>
      <p className="mt-2 text-sm text-white/50">AI-native product development from idea to launch — reference build</p>

      <form onSubmit={handleSubmit} className="mt-8 w-full rounded-2xl border border-border bg-panel p-4 text-left">
        <textarea
          value={idea}
          onChange={(e) => setIdea(e.target.value)}
          placeholder="Describe your product idea…"
          rows={3}
          className="w-full resize-none bg-transparent text-sm outline-none placeholder:text-white/30"
        />

        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* Project type selector */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setTypeOpen((o) => !o)}
                className="rounded-full border border-border px-3 py-1.5 text-xs text-white/70 hover:bg-white/5"
              >
                {PROJECT_TYPE_LABEL[projectType]} ▾
              </button>
              {typeOpen && (
                <div className="absolute left-0 top-full z-10 mt-1 w-36 rounded-lg border border-border bg-panel py-1 shadow-xl">
                  {PROJECT_TYPES.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => {
                        setProjectType(t);
                        setTypeOpen(false);
                      }}
                      className="flex w-full items-center justify-between px-3 py-1.5 text-xs text-white/70 hover:bg-white/10"
                    >
                      {PROJECT_TYPE_LABEL[t]}
                      {projectType === t && <span>✓</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              type="button"
              disabled
              title="Stubbed in this reference build"
              className="rounded-full border border-border px-3 py-1.5 text-xs text-white/30"
            >
              Import
            </button>
            <button
              type="button"
              disabled
              title="Stubbed in this reference build — see the MCP server in docs/ROADMAP.md (Later)"
              className="rounded-full border border-border px-3 py-1.5 text-xs text-white/30"
            >
              MCP
            </button>
          </div>

          {/* Start-stage selector */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setStageOpen((o) => !o)}
              className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs text-white/70 hover:bg-white/5"
            >
              Start in <span className="font-semibold text-white">{STAGE_UI[startStage].label}</span> ▾
            </button>
            {stageOpen && (
              <div className="absolute right-0 top-full z-10 mt-1 w-64 rounded-lg border border-border bg-panel py-1 shadow-xl">
                <p className="px-3 py-1 text-[10px] uppercase tracking-wide text-white/30">Start new project in</p>
                {NAV_STAGES.map((s) => {
                  const supported = SUPPORTED_START_STAGES.includes(s);
                  const ui = STAGE_UI[s];
                  return (
                    <button
                      key={s}
                      type="button"
                      disabled={!supported}
                      title={supported ? undefined : "Only Ideate/Discover are runnable in this reference build"}
                      onClick={() => {
                        setStartStage(s);
                        setStageOpen(false);
                      }}
                      className={`flex w-full items-start gap-2 px-3 py-2 text-left text-xs hover:bg-white/10 ${
                        supported ? "text-white/80" : "text-white/25"
                      }`}
                    >
                      <span aria-hidden>{ui.icon}</span>
                      <span>
                        <span className="block font-medium">{ui.label}</span>
                        <span className="block text-white/40">{ui.sublabel}</span>
                      </span>
                      {startStage === s && <span className="ml-auto">✓</span>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between">
          <span className="text-[11px] text-white/30">
            Research + PRD run for real (mock or live) here; Design/Code appear stubbed.
          </span>
          <button
            type="submit"
            disabled={submitting || !idea.trim()}
            className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white transition disabled:opacity-40"
          >
            {submitting ? "Starting…" : "Run pipeline →"}
          </button>
        </div>
      </form>
    </main>
  );
}
