"use client";

import { useEffect, useRef, useState } from "react";
import { ProjectContext, ProjectType } from "@/lib/types";
import { NavStageId } from "@/lib/stageUi";
import { HomeScreen } from "@/components/HomeScreen";
import { TopBar } from "@/components/TopBar";
import { ChatPanel } from "@/components/ChatPanel";
import { ArtifactPanel } from "@/components/ArtifactPanel";
import { ContextInspector } from "@/components/ContextInspector";

export default function Home() {
  const [project, setProject] = useState<ProjectContext | null>(null);
  const [active, setActive] = useState<NavStageId>("Ideate");
  const [submitting, setSubmitting] = useState(false);
  const [answering, setAnswering] = useState(false);
  const [approvingOutline, setApprovingOutline] = useState(false);
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

  async function handleAnswer(answer: string) {
    if (!project || answering) return;
    setAnswering(true);
    try {
      const res = await fetch(`/api/projects/${project.id}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answer }),
      });
      if (res.ok) {
        const data: ProjectContext = await res.json();
        setProject(data);
        if (data.status === "running" && !pollRef.current) pollProject(data.id);
      }
    } finally {
      setAnswering(false);
    }
  }

  async function handleApproveOutline() {
    if (!project || approvingOutline) return;
    setApprovingOutline(true);
    try {
      const res = await fetch(`/api/projects/${project.id}/approve-outline`, { method: "POST" });
      if (res.ok) {
        const data: ProjectContext = await res.json();
        setProject(data);
        if (data.status === "running" && !pollRef.current) pollProject(data.id);
      }
    } finally {
      setApprovingOutline(false);
    }
  }

  if (!project) {
    return <HomeScreen onSubmit={handleSubmit} submitting={submitting} />;
  }

  return (
    <div className="flex h-screen flex-col">
      <TopBar project={project} active={active} onSelect={setActive} onBackHome={handleBackHome} />
      <div className="flex flex-1 overflow-hidden">
        <ChatPanel
          project={project}
          active={active}
          onSelect={setActive}
          onAnswer={handleAnswer}
          answering={answering}
          onApproveOutline={handleApproveOutline}
          approvingOutline={approvingOutline}
        />
        <div className="flex flex-1 flex-col overflow-hidden">
          <ArtifactPanel project={project} active={active} />
          <div className="max-h-64 overflow-auto border-t border-border p-3">
            <ContextInspector project={project} />
          </div>
        </div>
      </div>
    </div>
  );
}
