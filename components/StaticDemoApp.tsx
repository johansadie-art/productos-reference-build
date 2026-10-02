"use client";

import { useEffect, useRef, useState } from "react";
import { ProjectContext, ProjectType } from "@/lib/types";
import { NavStageId } from "@/lib/stageUi";
import { getProjectProgress } from "@/lib/projectProgress";
import { setStore } from "@/lib/storeProvider";
import { localStore } from "@/lib/localStore";
import { startPipeline, submitIdeateAnswer, runArchitectureDeepDive } from "@/lib/orchestrator";
import { loadProject, listProjects } from "@/lib/store";
import { HomeScreen } from "@/components/HomeScreen";
import { TopBar } from "@/components/TopBar";
import { ChatPanel } from "@/components/ChatPanel";
import { ArtifactPanel } from "@/components/ArtifactPanel";
import { ContextInspector } from "@/components/ContextInspector";

// The static GitHub Pages demo: same UI, same lib/orchestrator.ts pipeline
// logic as the full local app (components/LocalApp.tsx) — but with NO
// server at all. Instead of fetch()-ing app/api/* routes, it calls the
// orchestrator functions directly in the browser, backed by localStorage
// (lib/localStore.ts) instead of the filesystem. Always runs in mock mode
// (there's nowhere safe to hold an API key client-side — see lib/llm.ts).
//
// See lib/storeProvider.ts for how the SAME orchestrator code works
// against either backend, and docs/AGENTS.md for the full "static demo"
// writeup.

// Must happen before any orchestrator call. Module-scope (not inside the
// component) guarantees it runs once, the moment this file is imported —
// i.e. before any user interaction can reach handleSubmit/handleAnswer/etc.
setStore(localStore);

export default function StaticDemoApp() {
  const [project, setProject] = useState<ProjectContext | null>(null);
  const [active, setActive] = useState<NavStageId>("Ideate");
  const [submitting, setSubmitting] = useState(false);
  const [answering, setAnswering] = useState(false);
  const [runningArchitecture, setRunningArchitecture] = useState(false);
  const [dashboardRefreshKey, setDashboardRefreshKey] = useState(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  // Mirrors LocalApp's HTTP polling, just reading localStorage instead of
  // fetching an API — the orchestrator mutates + saves the project object
  // in the background (sleep()-paced, see lib/orchestrator.ts), so polling
  // picks up each stage as it completes.
  function pollProject(id: string) {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(() => {
      const data = loadProject(id);
      if (!data) return;
      setProject(data);
      if (data.status !== "running" && pollRef.current) {
        clearInterval(pollRef.current);
      }
    }, 900);
  }

  async function handleSubmit(
    idea: string,
    projectType: ProjectType,
    startStage: NavStageId,
    category?: string,
    subcategory?: string,
    dependsOn?: string[]
  ) {
    setSubmitting(true);
    const data = startPipeline(idea, projectType, startStage, category, subcategory, dependsOn);
    setProject(data);
    setActive("Ideate");
    setSubmitting(false);
    pollProject(data.id);
  }

  function handleOpenProject(p: ProjectContext) {
    setProject(p);
    setActive(getProjectProgress(p).currentStage);
    if (p.status === "running") pollProject(p.id);
  }

  function handleBackHome() {
    if (pollRef.current) clearInterval(pollRef.current);
    setProject(null);
    setDashboardRefreshKey((k) => k + 1);
  }

  async function handleAnswer(answer: string) {
    if (!project || answering) return;
    setAnswering(true);
    try {
      const data = await submitIdeateAnswer(project.id, answer);
      setProject(data);
      if (data.status === "running" && !pollRef.current) pollProject(data.id);
    } finally {
      setAnswering(false);
    }
  }

  async function handleRunArchitecture() {
    if (!project || runningArchitecture) return;
    setRunningArchitecture(true);
    try {
      const data = await runArchitectureDeepDive(project.id);
      setProject(data);
    } finally {
      setRunningArchitecture(false);
    }
  }

  if (!project) {
    return (
      <HomeScreen
        onSubmit={handleSubmit}
        submitting={submitting}
        onOpenProject={handleOpenProject}
        refreshKey={dashboardRefreshKey}
        fetchProjects={() => Promise.resolve(listProjects())}
      />
    );
  }

  return (
    <div className="flex h-screen flex-col">
      <TopBar project={project} active={active} onSelect={setActive} onBackHome={handleBackHome} />
      <div className="flex flex-1 overflow-hidden">
        <ChatPanel project={project} active={active} onSelect={setActive} onAnswer={handleAnswer} answering={answering} />
        <div className="flex flex-1 flex-col overflow-hidden">
          <ArtifactPanel
            project={project}
            active={active}
            onRunArchitecture={handleRunArchitecture}
            runningArchitecture={runningArchitecture}
          />
          <div className="max-h-64 overflow-auto border-t border-border p-3">
            <ContextInspector project={project} />
          </div>
        </div>
      </div>
    </div>
  );
}
