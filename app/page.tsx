"use client";

import { useEffect, useRef, useState } from "react";
import { ProjectContext } from "@/lib/types";
import { ActivityFeed } from "@/components/ActivityFeed";
import { ArtifactTabs } from "@/components/ArtifactTabs";
import { ContextInspector } from "@/components/ContextInspector";

export default function Home() {
  const [idea, setIdea] = useState("");
  const [project, setProject] = useState<ProjectContext | null>(null);
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!idea.trim() || submitting) return;
    setSubmitting(true);
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idea }),
    });
    const data: ProjectContext = await res.json();
    setProject(data);
    setSubmitting(false);
    pollProject(data.id);
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <header className="mb-10">
        <p className="mb-2 text-xs font-medium uppercase tracking-wider text-accent">Reference build</p>
        <h1 className="text-3xl font-semibold tracking-tight">Idea in. Product out.</h1>
        <p className="mt-2 max-w-2xl text-sm text-white/50">
          A shared-context, multi-agent pipeline: Research and PRD run live (or in mock mode with no API key).
          Design, Code, and Deploy are visible in the pipeline but intentionally stubbed for this reference build
          — see <code className="text-white/70">docs/ROADMAP.md</code>.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="mb-8 flex gap-3">
        <input
          value={idea}
          onChange={(e) => setIdea(e.target.value)}
          placeholder="Describe your product idea…"
          className="flex-1 rounded-xl border border-border bg-panel px-4 py-3 text-sm outline-none placeholder:text-white/30 focus:border-accent"
        />
        <button
          type="submit"
          disabled={submitting || !idea.trim()}
          className="rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-white transition disabled:opacity-40"
        >
          {submitting ? "Starting…" : "Run pipeline"}
        </button>
      </form>

      {project && (
        <div className="space-y-6">
          <div className="flex items-center justify-between rounded-xl border border-border bg-panel px-4 py-3">
            <div className="text-sm text-white/60">
              Project <span className="font-mono text-white/80">{project.id.slice(0, 8)}</span> ·{" "}
              <span className="text-white/80">&ldquo;{project.idea}&rdquo;</span>
            </div>
            <span className="rounded-full border border-border px-3 py-1 text-xs font-medium text-white/60">
              {project.mode === "live" ? "Live mode" : "Mock mode"} · {project.status}
            </span>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <section className="rounded-xl border border-border bg-panel p-5">
              <h2 className="mb-4 text-sm font-semibold text-white/80">Activity (shared context in motion)</h2>
              <ActivityFeed activity={project.activity} />
            </section>

            <section className="rounded-xl border border-border bg-panel p-5">
              <ArtifactTabs project={project} />
            </section>
          </div>

          <ContextInspector project={project} />
        </div>
      )}
    </main>
  );
}
