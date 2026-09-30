"use client";

import { useEffect, useMemo, useState } from "react";
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
  subcategory?: string,
  dependsOn?: string[]
) => void;

/**
 * A text input with a dropdown of existing values underneath (e.g. every
 * category/feature name already used on the dashboard) — pick one to
 * avoid near-duplicate names ("Accounts" vs "Account"), or just keep
 * typing to create a genuinely new one. Options narrow as you type.
 */
function ComboField({
  value,
  onChange,
  options,
  placeholder,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const matches = options.filter((o) => o.toLowerCase().includes(value.trim().toLowerCase()));

  return (
    <div className={`relative ${className ?? ""}`}>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 100)}
        placeholder={placeholder}
        className="w-full rounded-md border border-border bg-transparent px-2.5 py-1.5 text-xs outline-none placeholder:text-white/25"
      />
      {open && matches.length > 0 && (
        <div className="absolute left-0 top-full z-10 mt-1 max-h-40 w-full overflow-auto rounded-lg border border-border bg-panel py-1 shadow-xl">
          {matches.map((o) => (
            <button
              key={o}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onChange(o);
                setOpen(false);
              }}
              className="flex w-full items-center justify-between px-3 py-1.5 text-left text-xs text-white/70 hover:bg-white/10"
            >
              <span className="truncate">{o}</span>
              {value === o && <span className="shrink-0">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Picks other existing features this one depends on (e.g. a new loan
 * product that needs a new login/verification capability first) — a
 * multi-select combo: type to filter, click to add, shown as removable
 * chips. Purely a dashboard annotation, see ProjectContext.dependsOn.
 */
function DependsOnField({
  value,
  onChange,
  allProjects,
}: {
  value: string[];
  onChange: (ids: string[]) => void;
  allProjects: ProjectContext[];
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const selected = allProjects.filter((p) => value.includes(p.id));
  const options = allProjects.filter(
    (p) => !value.includes(p.id) && p.idea.toLowerCase().includes(query.trim().toLowerCase())
  );

  function toggle(id: string) {
    onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);
  }

  return (
    <div className="relative mt-2">
      <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-border bg-transparent px-2.5 py-1.5">
        {selected.map((p) => (
          <span
            key={p.id}
            className="flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-[11px] text-white/80"
          >
            {p.idea}
            <button
              type="button"
              onClick={() => toggle(p.id)}
              className="text-white/40 hover:text-white"
              aria-label={`Remove dependency on ${p.idea}`}
            >
              ×
            </button>
          </span>
        ))}
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 100)}
          placeholder={
            selected.length ? "Add another…" : "Depends on (optional) — e.g. a login/auth PRD this needs first"
          }
          className="min-w-[140px] flex-1 bg-transparent text-xs outline-none placeholder:text-white/25"
        />
      </div>
      {open && options.length > 0 && (
        <div className="absolute left-0 top-full z-10 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-border bg-panel py-1 shadow-xl">
          {options.map((p) => (
            <button
              key={p.id}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                toggle(p.id);
                setQuery("");
              }}
              className="flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-xs text-white/70 hover:bg-white/10"
            >
              <span className="truncate">{p.idea}</span>
              <span className="shrink-0 text-white/30">
                {[p.category, p.subcategory].filter(Boolean).join(" · ")}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * The "new feature" form — what used to be the entire home screen before
 * this became a portfolio dashboard (see the "land on multiple features"
 * request, 2026-09-29). Always visible at the top of the dashboard (not
 * behind a toggle), so starting something new never requires an extra
 * click. Same fields as before, plus optional Category + Feature fields
 * so user-created features can join the dashboard's grouping (and cluster
 * under an existing feature, e.g. add another PRD under "Login") too.
 * `initial` lets a cluster's "+ Add PRD" button reset the form pre-filled
 * with the category/feature it was clicked from.
 */
function NewProjectForm({
  onSubmit,
  submitting,
  initial,
  categories,
  subcategoriesByCategory,
  allProjects,
}: {
  onSubmit: SubmitFn;
  submitting: boolean;
  initial?: { category?: string; subcategory?: string };
  /** Every distinct category already used on the dashboard, for the Category dropdown. */
  categories: string[];
  /** Every distinct feature already used, grouped by its category, for the Feature dropdown. */
  subcategoriesByCategory: Record<string, string[]>;
  /** Every existing project, for the "Depends on" picker. */
  allProjects: ProjectContext[];
}) {
  const [idea, setIdea] = useState("");
  const [category, setCategory] = useState(initial?.category ?? "");
  const [subcategory, setSubcategory] = useState(initial?.subcategory ?? "");
  const [dependsOn, setDependsOn] = useState<string[]>([]);
  const [projectType, setProjectType] = useState<ProjectType>("web_app");
  const [startStage, setStartStage] = useState<NavStageId>("Ideate");
  const [typeOpen, setTypeOpen] = useState(false);
  const [stageOpen, setStageOpen] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!idea.trim() || submitting) return;
    onSubmit(
      idea.trim(),
      projectType,
      startStage,
      category.trim() || undefined,
      subcategory.trim() || undefined,
      dependsOn.length ? dependsOn : undefined
    );
    setIdea("");
    setCategory("");
    setSubcategory("");
    setDependsOn([]);
  }

  // Feature options narrow to the selected category once one's picked
  // (e.g. picking "Core Flows" only offers "Login"); with no category
  // chosen yet, offer every feature name that exists anywhere, since
  // typing the category after the feature is a perfectly normal order too.
  const trimmedCategory = category.trim();
  const subcategoryOptions = trimmedCategory
    ? subcategoriesByCategory[trimmedCategory] ?? []
    : Array.from(new Set(Object.values(subcategoriesByCategory).flat())).sort();

  return (
    <form onSubmit={handleSubmit} className="w-full rounded-2xl border border-border bg-panel p-4 text-left">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/40">New feature</p>
      <textarea
        value={idea}
        onChange={(e) => setIdea(e.target.value)}
        placeholder="Describe your product idea or feature…"
        rows={3}
        className="w-full resize-none bg-transparent text-sm outline-none placeholder:text-white/30"
      />

      <div className="mt-2 flex gap-2">
        <ComboField
          className="w-1/2"
          value={category}
          onChange={setCategory}
          options={categories}
          placeholder="Category (optional, e.g. Accounts) — groups it on the dashboard"
        />
        <ComboField
          className="w-1/2"
          value={subcategory}
          onChange={setSubcategory}
          options={subcategoryOptions}
          placeholder="Feature (optional, e.g. Login) — clusters multiple PRDs under one feature"
        />
      </div>

      <DependsOnField value={dependsOn} onChange={setDependsOn} allProjects={allProjects} />

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

/**
 * Illustrates a cross-feature dependency (e.g. a new loan product that
 * needs a new login/verification capability first): resolves
 * `project.dependsOn`'s ids to the other project(s) and shows a small
 * chip per one, coloured by whether that dependency is actually done yet.
 * Purely a visual signal in this reference build — see
 * ProjectContext.dependsOn's doc comment for why it doesn't gate the
 * pipeline itself.
 */
function DependencyChips({
  project,
  allProjectsById,
}: {
  project: ProjectContext;
  allProjectsById: Map<string, ProjectContext>;
}) {
  if (!project.dependsOn?.length) return null;
  const deps = project.dependsOn.map((id) => allProjectsById.get(id)).filter((p): p is ProjectContext => !!p);
  if (deps.length === 0) return null;
  return (
    <div className="mb-2 flex flex-wrap gap-1">
      {deps.map((dep) => {
        const blocked = !getProjectProgress(dep).isDone;
        return (
          <span
            key={dep.id}
            title={
              blocked
                ? `Blocked until "${dep.idea}" is done`
                : `Depends on "${dep.idea}" — already done, so this is clear to proceed`
            }
            className={`inline-flex max-w-full items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${
              blocked
                ? "border-amber-500/40 bg-amber-500/10 text-amber-400"
                : "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
            }`}
          >
            <span className="shrink-0">{blocked ? "🔗 Blocked by" : "🔗 Depends on"}</span>
            <span className="truncate">{dep.idea}</span>
          </span>
        );
      })}
    </div>
  );
}

function ProjectCard({
  project,
  onOpen,
  allProjectsById,
}: {
  project: ProjectContext;
  onOpen: () => void;
  allProjectsById: Map<string, ProjectContext>;
}) {
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
      <DependencyChips project={project} allProjectsById={allProjectsById} />
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
  allProjectsById,
}: {
  name: string;
  items: ProjectContext[];
  onOpen: (p: ProjectContext) => void;
  onAddPrd: () => void;
  allProjectsById: Map<string, ProjectContext>;
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
              <DependencyChips project={p} allProjectsById={allProjectsById} />
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

/** Uncategorized projects use an empty-string key and render without a section heading (no "Other" label). */
function groupByCategory(projects: ProjectContext[]): [string, ProjectContext[]][] {
  const groups = new Map<string, ProjectContext[]>();
  for (const p of projects) {
    const cat = p.category?.trim() ?? "";
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
  // The "+ New Feature" box is always visible on the dashboard (not
  // toggled) — set (and bumped via formKey) when a cluster's "+ Add PRD"
  // button is clicked, so the form resets pre-filled with that feature's
  // category/subcategory instead of blank.
  const [formSeed, setFormSeed] = useState<{ category?: string; subcategory?: string }>({});
  const [formKey, setFormKey] = useState(0);

  function openFormFor(seed: { category?: string; subcategory?: string }) {
    setFormSeed(seed);
    setFormKey((k) => k + 1);
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

  // Existing category/feature names, for the form's dropdowns — see
  // ComboField. Recomputed whenever the project list changes.
  const categories = useMemo(() => {
    const set = new Set<string>();
    (projects ?? []).forEach((p) => {
      if (p.category?.trim()) set.add(p.category.trim());
    });
    return Array.from(set).sort();
  }, [projects]);

  const subcategoriesByCategory = useMemo(() => {
    const map: Record<string, string[]> = {};
    (projects ?? []).forEach((p) => {
      const cat = p.category?.trim();
      const sub = p.subcategory?.trim();
      if (!cat || !sub) return;
      if (!map[cat]) map[cat] = [];
      if (!map[cat].includes(sub)) map[cat].push(sub);
    });
    Object.values(map).forEach((arr) => arr.sort());
    return map;
  }, [projects]);

  // Looks up any project by id, for resolving `dependsOn` into a name +
  // real status — see DependencyChips.
  const allProjectsById = useMemo(() => {
    const map = new Map<string, ProjectContext>();
    (projects ?? []).forEach((p) => map.set(p.id, p));
    return map;
  }, [projects]);

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <div className="mb-8">
        <p className="max-w-lg text-sm text-white/50">
          Example portfolio — a fake credit-union banking app, seeded for this demo. Every card below is its own
          ProductOS pipeline; each is further along than the last. Click one to open it, or start a new one below.
        </p>
      </div>

      <div className="mb-10">
        <NewProjectForm
          key={formKey}
          onSubmit={onSubmit}
          submitting={submitting}
          initial={formSeed}
          categories={categories}
          subcategoriesByCategory={subcategoriesByCategory}
          allProjects={projects ?? []}
        />
      </div>

      {projects === null ? (
        <p className="text-sm text-white/30">Loading portfolio…</p>
      ) : projects.length === 0 ? (
        <p className="text-sm text-white/30">No features yet — start one above.</p>
      ) : (
        <div className="space-y-10">
          {groups.map(([category, items]) => {
            const { standalone, clusters } = clusterBySubcategory(items);
            return (
              <div key={category || "__uncategorized__"}>
                {category && (
                  <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-white/40">{category}</h2>
                )}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {clusters.map(([sub, subItems]) => (
                    <FeatureClusterCard
                      key={sub}
                      name={sub}
                      items={subItems}
                      onOpen={onOpenProject}
                      onAddPrd={() => openFormFor({ category, subcategory: sub })}
                      allProjectsById={allProjectsById}
                    />
                  ))}
                  {standalone.map((p) => (
                    <ProjectCard
                      key={p.id}
                      project={p}
                      onOpen={() => onOpenProject(p)}
                      allProjectsById={allProjectsById}
                    />
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
