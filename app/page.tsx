"use client";

import { useEffect, useRef, useState } from "react";
import { ProjectContext, ProjectType } from "@/lib/types";
import { NavStageId } from "@/lib/stageUi";
import { HomeScreen } from "@/components/HomeScreen";
import { TopBar } from "@/components/TopBar";
import { WorkspaceSidebar } from "@/components/WorkspaceSidebar";
import { StageContent } from "@/components/StageContent";
import { ContextInspector } from "@/components/ContextInspector";
import { ActivityFeed } from "@/components/ActivityFeed";

export default function Home() {
  const [project, setProject] = useState<ProjectContext | null>(null);
  const [active, setActive] = useState<NavStageId>("Ideate");
  const [submitting, setSubmitting] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  function pollProject(id: string) {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      const res = await fetch(`/api/projects/${id}`);
      if (!res.ok) return;
      const data: ProjectContext = await res.json();
      setProject(data);
      if (data.status !== "running" && pollRef.current) {
        clearInterval(pollRef.current);
      }
    }, 900);
  }

  async function handleSubmit(idea: string, projectType: ProjectType, startStage: NavStageId) {
    setSubmitting(true);
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idea, projectType, startStage }),
    });
    const data: ProjectContext = await res.json();
    setProject(data);
    setActive("Ideate");
    setSubmitting(false);
    pollProject(data.id);
  }

  function handleBackHome() {
    if (pollRef.current) clearInterval(pollRef.current);
    setProject(null);
  }

  if (!project) {
    return <HomeScreen onSubmit={handleSubmit} submitting={submitting} />;
  }

  return (
    <div className="flex h-screen flex-col">
      <TopBar project={project} active={active} onSelect={setActive} onBackHome={handleBackHome} />
      <div className="flex flex-1 overflow-hidden">
        <WorkspaceSidebar project={project} active={active} onSelect={setActive} />
        <main className="flex-1 overflow-auto p-6">
          <div className="mx-auto max-w-3xl space-y-6">
            <section className="rounded-xl border border-border bg-panel p-5">
              <StageContent project={project} active={active} />
            </section>

            <details className="rounded-xl border border-border bg-panel p-5">
              <summary className="cursor-pointer text-sm font-semibold text-white/80">
                Activity (shared context in motion)
              </summary>
              <div className="mt-4">
                <ActivityFeed activity={project.activity} />
              </div>
            </details>

            <ContextInspector project={project} />
          </div>
        </main>
      </div>
    </div>
  );
}
