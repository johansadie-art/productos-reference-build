"use client";

import { useEffect, useState } from "react";
import { ProjectContext, ProjectType } from "@/lib/types";
import { NAV_STAGES, NavStageId, PROJECT_TYPE_LABEL, STAGE_UI } from "@/lib/stageUi";
import { getProjectProgress, PROGRESS_STAGES } from "@/lib/projectProgress";

const PROJECT_TYPES: ProjectType[] = ["website", "web_app", "mobile_app"];

// Every run in this reference build starts at Ideate (there's nothing to
// "start from" for Discover/Define/Design/Code without the upstream
// artifacts existing yet) — see docs/PRD.md scope.
const SUPPORTED_START_STAGES: NavStageId[] = ["Ideate"];

type SubmitFn = (
  idea: string,
  projectType: ProjectType,
  startStage: NavStageId,
  category?: string,
  subcategory?: string
) => void;

/**
 * The "+ New Feature" form — what used to be the entire home screen before
 * this became a portfolio dashboard (see the "land on multiple features"
 * request, 2026-09-29). Same fields, plus optional Category + Feature
 * fields so user-created features can join the dashboard's grouping (and
 * cluster under an existing feature, e.g. add another PRD under "Login")
 * too. `initial` lets a cluster's "+ Add PRD" button pre-fill the
 * category/feature it was clicked from.
 */
function NewProjectForm({
  onSubmit,
  submitting,
  initial,
}: {
  onSubmit: SubmitFn;
  submitting: boolean;
  initial?: { category?: string; subcategory?: string };
}) {
  const [idea, setIdea] = useState("");
  const [category, setCategory] = useState(initial?.category ?? "");
  const [subcategory, setSubcategory] = useState(initial?.subcategory ?? "");
  const [projectType, setProjectType] = useState<ProjectType>("web_app");
  const [startStage, setStartStage] = useState<NavStageId>("Ideate");
  const [typeOpen, setTypeOpen] = useState(false);
  const [stageOpen, setStageOpen] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!idea.trim() || submitting) return;
    onSubmit(idea.trim(), projectType, startStage, category.trim() || undefined, subcategory.trim() || undefined);
    setIdea("");
    setCategory("");
    setSubcategory("");
  }

  return (
    <form onSubmit={handleSubmit} className="w-full rounded-2xl border border-border bg-panel p-4 text-left">
      <textarea
        value={idea}
        onChange={(e) => setIdea(e.target.value)}
        placeholder="Describe your product idea or feature…"
        rows={3}
        className="w-full resize-none bg-transparent text-sm outline-none placeholder:text-white/30"
      />

      <div className="mt-2 flex gap-2">
        <input
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          placeholder="Category (optional, e.g. Accounts) — groups it on the dashboard"
          className="w-1/2 rounded-md border border-border bg-transparent px-2.5 py-1.5 text-xs outline-none placeholder:text-white/25"
        />
        <input
          value={subcategory}
          onChange={(e) => setSubcategory(e.target.value)}
          placeholder="Feature (optional, e.g. Login) — clusters multiple PRDs under one feature"
          className="w-1/2 rounded-md border border-border bg-transparent px-2.5 py-1.5 text-xs outline-none placeholder:text-white/25"
        />
      </div>

      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
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
          Research + PRD + Design run for real (mock or live) here; Code appears stubbed.
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
  );
}

function StageDots({ project }: { project: ProjectContext }) {
  const progress = getProjectProgress(project);
  return (
    <div className="flex items-center gap-1.5">
      {PROGRESS_STAGES.map((s) => {
        const isDone = progress.doneStages.includes(s);
        const isCurrent = s === progress.currentStage && !progress.isDone;
        return (
          <span
            key={s}
            title={STAGE_UI[s].label}
            className={`h-1.5 w-6 rounded-full transition ${
              isDone
                ? "bg-emerald-400"
                : isCurrent
                  ? progress.isWaiting
                    ? "bg-amber-400"
                    : "bg-white/60"
                  : "bg-white/10"
            }`}
          />
        );
      })}
    </div>
  );
}

function ProjectCard({ project, onOpen }: { project: ProjectContext; onOpen: () => void }) {
  const progress = getProjectProgress(project);
  return (
    <button
      onClick={onOpen}
      className="flex flex-col rounded-xl border border-border bg-panel p-4 text-left transition hover:border-white/20 hover:bg-white/[0.04]"
    >
      <div className="mb-1.5 flex items-start justify-between gap-2">
        <span className="text-sm font-medium leading-snug text-white/90">{project.idea}</span>
        <span className="shrink-0 rounded-full border border-border px-2 py-0.5 text-[10px] uppercase tracking-wide text-white/40">
          {PROJECT_TYPE_LABEL[project.projectType]}
        </span>
      </div>
      <p
        className={`mb-3 text-xs font-medium ${
          progress.isDone ? "text-emerald-400" : progress.isWaiting ? "text-amber-400" : "text-white/50"
        }`}
      >
        {progress.label}
      </p>
      <StageDots project={project} />
    </button>
  );
}

/**
 * A feature that decomposes into several PRDs (e.g. Login → Password
 * Login, Biometric Login, MFA, SSO, Forgot Password) renders as one
 * cluster card containing a small sub-card per sub-PRD, instead of 5
 * separate top-level cards — see the ProjectContext.subcategory doc
 * comment for why. Each sub-card is still independently clickable and
 * shows its own full (non-truncated) name, real status, and stage dots.
 */
function FeatureClusterCard({
  name,
  items,
  onOpen,
  onAddPrd,
}: {
  name: string;
  items: ProjectContext[];
  onOpen: (p: ProjectContext) => void;
  onAddPrd: () => void;
}) {
  const doneCount = items.filter((p) => getProjectProgress(p).isDone).length;
  return (
    <div className="flex flex-col rounded-xl border border-border bg-panel p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-white/90">{name}</span>
        <span className="shrink-0 rounded-full border border-border px-2 py-0.5 text-[10px] uppercase tracking-wide text-white/40">
          {doneCount}/{items.length} done · {items.length} PRDs
        </span>
      </div>
      <div className="space-y-2">
        {items.map((p) => {
          const progress = getProjectProgress(p);
          return (
            <button
              key={p.id}
              onClick={() => onOpen(p)}
              className="flex w-full flex-col rounded-lg border border-white/5 bg-black/20 px-3 py-2 text-left transition hover:border-white/15 hover:bg-white/[0.05]"
            >
              <span className="text-xs font-medium leading-snug text-white/80">{p.idea}</span>
              <p
                className={`mt-1 text-[10px] font-medium ${
                  progress.isDone ? "text-emerald-400" : progress.isWaiting ? "text-amber-400" : "text-white/40"
                }`}
              >
                {progress.label}
              </p>
              <div className="mt-1.5">
                <StageDots project={p} />
              </div>
            </button>
          );
        })}
      </div>
      <button
        onClick={onAddPrd}
        className="mt-2 self-start rounded-md px-2 py-1 text-[11px] text-white/40 transition hover:bg-white/[0.05] hover:text-white/70"
      >
        + Add a PRD under {name}
      </button>
    </div>
  );
}

function groupByCategory(projects: ProjectContext[]): [string, ProjectContext[]][] {
  const groups = new Map<string, ProjectContext[]>();
  for (const p of projects) {
    const cat = p.category?.trim() || "Other";
    if (!groups.has(cat)) groups.set(cat, []);
    groups.get(cat)!.push(p);
  }
  return Array.from(groups.entries());
}

/** Within one category's items, splits out clusters (shared subcategory) from standalone single-PRD features. */
function clusterBySubcategory(items: ProjectContext[]): {
  standalone: ProjectContext[];
  clusters: [string, ProjectContext[]][];
} {
  const bySub = new Map<string, ProjectContext[]>();
  const standalone: ProjectContext[] = [];
  for (const p of items) {
    const sub = p.subcategory?.trim();
    if (!sub) {
      standalone.push(p);
      continue;
    }
    if (!bySub.has(sub)) bySub.set(sub, []);
    bySub.get(sub)!.push(p);
  }
  return { standalone, clusters: Array.from(bySub.entries()) };
}

/**
 * The home screen: a PORTFOLIO DASHBOARD, not a single idea box (see the
 * "land on multiple features" request, 2026-09-29). Fetches every project
 * (GET /api/projects, which auto-seeds a fake-banking-app example
 * portfolio on first run — see lib/seed.ts), groups them by category the
 * way the reference banking nav does (Accounts, Payments & Transfers,
 * Cards & Loans) plus the universal Core Flows (Login, Onboarding), and
 * shows each project's real pipeline progress as a status badge + a
 * 4-stage dot strip (Ideate/Research/Define/Design).
 */
export function HomeScreen({
  onSubmit,
  submitting,
  onOpenProject,
  refreshKey,
}: {
  onSubmit: SubmitFn;
  submitting: boolean;
  onOpenProject: (project: ProjectContext) => void;
  refreshKey: number;
}) {
  const [projects, setProjects] = useState<ProjectContext[] | null>(null);
  const [showForm, setShowForm] = useState(false);
  // Set (and bumped via formKey) when a cluster's "+ Add PRD" button is
  // clicked, so the form reopens pre-filled with that feature's
  // category/subcategory instead of blank.
  const [formSeed, setFormSeed] = useState<{ category?: string; subcategory?: string }>({});
  const [formKey, setFormKey] = useState(0);

  function openFormFor(seed: { category?: string; subcategory?: string }) {
    setFormSeed(seed);
    setFormKey((k) => k + 1);
    setShowForm(true);
  }

  useEffect(() => {
    let cancelled = false;
    fetch("/api/projects")
      .then((r) => r.json())
      .then((data: ProjectContext[]) => {
        if (!cancelled) setProjects(data);
      });
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const groups = projects ? groupByCategory(projects) : [];

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Good evening.</h1>
          <p className="mt-1 max-w-lg text-sm text-white/50">
            Example portfolio — a fake credit-union banking app, seeded for this demo. Every card below is its own
            ProductOS pipeline; each is further along than the last. Click one to open it, or start a new feature.
          </p>
        </div>
        <button
          onClick={() => {
            if (showForm) {
              setShowForm(false);
            } else {
              openFormFor({});
            }
          }}
          className="shrink-0 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white transition"
        >
          {showForm ? "Cancel" : "+ New Feature"}
        </button>
      </div>

      {showForm && (
        <div className="mb-10">
          <NewProjectForm key={formKey} onSubmit={onSubmit} submitting={submitting} initial={formSeed} />
        </div>
      )}

      {projects === null ? (
        <p className="text-sm text-white/30">Loading portfolio…</p>
      ) : projects.length === 0 ? (
        <p className="text-sm text-white/30">No features yet — start one above.</p>
      ) : (
        <div className="space-y-10">
          {groups.map(([category, items]) => {
            const { standalone, clusters } = clusterBySubcategory(items);
            return (
              <div key={category}>
                <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-white/40">{category}</h2>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {clusters.map(([sub, subItems]) => (
                    <FeatureClusterCard
                      key={sub}
                      name={sub}
                      items={subItems}
                      onOpen={onOpenProject}
                      onAddPrd={() => openFormFor({ category, subcategory: sub })}
                    />
                  ))}
                  {standalone.map((p) => (
                    <ProjectCard key={p.id} project={p} onOpen={() => onOpenProject(p)} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
