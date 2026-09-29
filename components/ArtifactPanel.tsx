"use client";

import { useEffect, useState } from "react";
import { ProjectContext } from "@/lib/types";
import { NavStageId, STAGE_UI } from "@/lib/stageUi";
import { StatusPill } from "./StatusPill";
import { MarkdownDoc } from "./MarkdownDoc";
import { BarChart } from "./BarChart";

function wordCount(text: string): number {
  return text.trim().length ? text.trim().split(/\s+/).length : 0;
}

function bulletsFrom(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split("\n")
    .map((l) => l.replace(/^[-*]\s*/, "").trim())
    .filter(Boolean);
}

/**
 * Ideate produces three distinct artifacts, not one doc with sections
 * bolted on (see docs/AGENTS.md / the source product's own framing):
 * a concept brief, an assumptions log, and an open-questions list (the
 * research agenda handed to Discover). Rendered as three stacked cards.
 */
function IdeateArtifacts({ project }: { project: ProjectContext }) {
  const content = project.stages.Ideate.content;
  const assumptions = bulletsFrom(project.sharedContext["ideate.assumptions"]);
  const openQuestions = bulletsFrom(project.sharedContext["ideate.openQuestions"]);

  if (!content) {
    return (
      <p className="text-sm text-white/30">
        Answer the Ideation Agent&apos;s questions on the left to generate the concept brief, assumptions log, and
        research agenda.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-white/30">Concept brief</p>
        <MarkdownDoc content={content} />
      </div>

      {assumptions.length > 0 && (
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-amber-400/70">
            Assumptions log — testable, not guessed at
          </p>
          <ul className="list-disc space-y-1.5 pl-5 text-sm text-white/70">
            {assumptions.map((a, i) => (
              <li key={i}>{a}</li>
            ))}
          </ul>
        </div>
      )}

      {openQuestions.length > 0 && (
        <div className="rounded-lg border border-sky-500/20 bg-sky-500/5 p-4">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-sky-400/70">
            Open-questions list — the research agenda for Discover
          </p>
          <ul className="list-disc space-y-1.5 pl-5 text-sm text-white/70">
            {openQuestions.map((q, i) => (
              <li key={i}>{q}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/**
 * Research runs four jobs in parallel and produces separate per-topic
 * documents (write_research_run, per docs/AGENTS.md) — Market Sizing &
 * Pricing, Competitor Landscape, Customer Preferences, Positioning &
 * Wedge — shown as tabs, matching the reference screenshot.
 */
function ResearchArtifacts({ project }: { project: ProjectContext }) {
  const topics = project.researchTopics;
  const [activeTopicId, setActiveTopicId] = useState<string | null>(topics[0]?.id ?? null);

  useEffect(() => {
    if (topics.length && !topics.some((t) => t.id === activeTopicId)) {
      setActiveTopicId(topics[0].id);
    }
  }, [topics, activeTopicId]);

  if (!topics.length) {
    return <p className="text-sm text-white/30">Waiting for this stage to run…</p>;
  }

  const active = topics.find((t) => t.id === activeTopicId) ?? topics[0];

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-1 border-b border-border pb-3">
        {topics.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTopicId(t.id)}
            className={`rounded-md px-2.5 py-1.5 text-xs transition ${
              active.id === t.id ? "bg-white/10 text-white" : "text-white/40 hover:text-white/70"
            }`}
          >
            {t.tabLabel}…
          </button>
        ))}
        <button
          disabled
          title="Stubbed in this reference build — see docs/ROADMAP.md"
          className="ml-auto rounded-md px-2.5 py-1.5 text-xs text-white/25"
        >
          + Manual Research
        </button>
      </div>

      <p className="mb-3 text-xs text-white/30">{active.docTitle}</p>
      <MarkdownDoc content={active.content} />
      {active.chart && <BarChart caption={active.chart.caption} bars={active.chart.bars} />}
    </div>
  );
}

/**
 * The Constraints tab: the shared `load_constraints` surface both the PRD
 * Agent and the (optional) Architect Agent read — locked tech-stack facts
 * + structured project constraints (see lib/agents/constraints.ts). Locked
 * once, early in the pipeline, and never re-asked.
 */
function ConstraintsView({ project }: { project: ProjectContext }) {
  const constraints = project.constraints;
  if (!constraints) {
    return (
      <div className="flex-1 px-6 py-5">
        <p className="text-sm text-white/30">Waiting for constraints to lock…</p>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 overflow-auto px-6 py-5">
      <div>
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-white/30">Locked tech-stack facts</p>
        <p className="mb-3 text-xs text-white/25">
          Read by the PRD and Architect agents via <code>load_constraints</code> — decided once, not re-litigated per section.
        </p>
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-left text-xs">
            <thead className="bg-white/5 text-white/40">
              <tr>
                <th className="px-3 py-2 font-medium">Area</th>
                <th className="px-3 py-2 font-medium">Choice</th>
                <th className="px-3 py-2 font-medium">Reason</th>
              </tr>
            </thead>
            <tbody>
              {constraints.techStack.map((t, i) => (
                <tr key={i} className="border-t border-border">
                  <td className="px-3 py-2 text-white/70">{t.area}</td>
                  <td className="px-3 py-2 font-medium text-white">{t.choice}</td>
                  <td className="px-3 py-2 text-white/50">{t.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-white/30">Structured project constraints</p>
        <p className="mb-3 text-xs text-white/25">
          Illustrative for this reference build — the real product would capture these during project setup, not infer them.
        </p>
        <ul className="space-y-2">
          {constraints.constraints.map((c, i) => (
            <li key={i} className="rounded-lg border border-border px-3 py-2 text-xs">
              <span className="font-medium text-white/80">{c.label}</span>
              <span className="text-white/50"> — {c.value}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/**
 * The Architecture tab: the OPTIONAL Architect Agent deep-dive (see
 * docs/AGENTS.md) — unlike Research/PRD/Design, it does not auto-run.
 * Shows a trigger card until run; once done, a sidebar (8 sections +
 * Decision Records + Cost Estimate) + a viewer, mirroring the PRD tab's
 * outline-sidebar shape.
 */
function ArchitectureView({
  project,
  onRunArchitecture,
  runningArchitecture,
}: {
  project: ProjectContext;
  onRunArchitecture: () => void;
  runningArchitecture: boolean;
}) {
  const status = project.architectureStatus;
  const sections = project.architectureSections;
  const decisions = project.architectureDecisions;
  const cost = project.infraCostEstimate;
  const [item, setItem] = useState<string>(sections[0]?.id ?? "decisions");

  useEffect(() => {
    if (sections.length && item !== "decisions" && item !== "cost" && !sections.some((s) => s.id === item)) {
      setItem(sections[0].id);
    }
  }, [sections, item]);

  if (status !== "done") {
    return (
      <div className="flex-1 px-6 py-5">
        <div className="max-w-md rounded-lg border border-border p-5">
          <p className="mb-1 text-sm font-medium text-white/80">Architect Agent — optional technical deep-dive</p>
          <p className="mb-4 text-xs text-white/40">
            From the locked PRD and tech-stack facts, writes 8 architecture sections, records architecture decisions
            (ADRs), and estimates infrastructure cost. It designs the system; it does not write app code — that&apos;s
            the (still-stubbed) Fullstack Builder.
          </p>
          <button
            disabled={runningArchitecture || status === "running"}
            onClick={onRunArchitecture}
            className="rounded-md bg-violet-500/20 px-3 py-1.5 text-xs font-medium text-violet-300 transition disabled:opacity-40"
          >
            {runningArchitecture || status === "running" ? "Architect Agent is running…" : "Run Architecture Deep-Dive"}
          </button>
        </div>
      </div>
    );
  }

  const activeSection = sections.find((s) => s.id === item);

  return (
    <div className="flex flex-1 overflow-hidden">
      <div className="w-56 shrink-0 overflow-auto border-r border-border px-3 py-4">
        <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-wider text-white/30">Sections</p>
        <ul className="mb-3 space-y-0.5">
          {sections.map((s) => (
            <li key={s.id}>
              <button
                onClick={() => setItem(s.id)}
                className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition ${
                  item === s.id ? "bg-white/10 text-white" : "text-white/50 hover:text-white/80"
                }`}
              >
                <span className="text-emerald-400">✓</span>
                <span className="truncate">{s.title}</span>
              </button>
            </li>
          ))}
        </ul>
        <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-wider text-white/30">Extras</p>
        <ul className="space-y-0.5">
          <li>
            <button
              onClick={() => setItem("decisions")}
              className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition ${
                item === "decisions" ? "bg-white/10 text-white" : "text-white/50 hover:text-white/80"
              }`}
            >
              <span className="text-emerald-400">✓</span>
              <span className="truncate">Decision Records ({decisions.length})</span>
            </button>
          </li>
          <li>
            <button
              onClick={() => setItem("cost")}
              className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition ${
                item === "cost" ? "bg-white/10 text-white" : "text-white/50 hover:text-white/80"
              }`}
            >
              <span className="text-emerald-400">✓</span>
              <span className="truncate">Cost Estimate</span>
            </button>
          </li>
        </ul>
      </div>

      <div className="flex-1 overflow-auto px-6 py-5">
        {item === "decisions" ? (
          <div className="space-y-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-white/30">Architecture Decision Records</p>
            {decisions.map((d) => (
              <div key={d.id} className="rounded-lg border border-border p-4">
                <p className="mb-2 text-sm font-medium text-white/80">{d.title}</p>
                <p className="mb-1 text-xs text-white/50">
                  <span className="font-medium text-white/70">Context:</span> {d.context}
                </p>
                <p className="mb-1 text-xs text-white/50">
                  <span className="font-medium text-white/70">Decision:</span> {d.decision}
                </p>
                <p className="text-xs text-white/50">
                  <span className="font-medium text-white/70">Consequences:</span> {d.consequences}
                </p>
              </div>
            ))}
          </div>
        ) : item === "cost" ? (
          cost && (
            <div>
              <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-white/30">Infrastructure Cost Estimate</p>
              <div className="overflow-hidden rounded-lg border border-border">
                <table className="w-full text-left text-xs">
                  <thead className="bg-white/5 text-white/40">
                    <tr>
                      <th className="px-3 py-2 font-medium">Service</th>
                      <th className="px-3 py-2 font-medium">Estimate</th>
                      <th className="px-3 py-2 font-medium">Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cost.lineItems.map((l, i) => (
                      <tr key={i} className="border-t border-border">
                        <td className="px-3 py-2 text-white/70">{l.service}</td>
                        <td className="px-3 py-2 font-medium text-white">{l.estimate}</td>
                        <td className="px-3 py-2 text-white/50">{l.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-3 text-sm font-medium text-white/80">Total: {cost.totalRange}</p>
              <p className="text-xs text-white/40">{cost.notes}</p>
            </div>
          )
        ) : (
          activeSection && <MarkdownDoc content={activeSection.content} />
        )}
      </div>
    </div>
  );
}

/**
 * Define/PRD writes straight into the "ProductOS Standard" outline (no
 * approval gate in this reference build — see docs/AGENTS.md), then shows
 * an outline sidebar + section viewer once sections are written, mirroring
 * the reference screenshot's "PRD Outline" panel + section view.
 * Constraints (locked tech-stack facts + structured constraints) and
 * Architecture (the optional Architect Agent deep-dive) are both real —
 * see ConstraintsView/ArchitectureView above.
 */
function PRDArtifactPanel({
  project,
  onRunArchitecture,
  runningArchitecture,
}: {
  project: ProjectContext;
  onRunArchitecture: () => void;
  runningArchitecture: boolean;
}) {
  const stage = project.stages.PRD;
  const outline = project.prdOutline;
  const sections = project.prdSections;
  const [tab, setTab] = useState<"PRD" | "Architecture" | "Constraints">("PRD");
  const [activeSectionId, setActiveSectionId] = useState<string | null>(sections[0]?.id ?? null);

  useEffect(() => {
    if (sections.length && !sections.some((s) => s.id === activeSectionId)) {
      setActiveSectionId(sections[0].id);
    }
  }, [sections, activeSectionId]);

  const activeSection = sections.find((s) => s.id === activeSectionId) ?? sections[0];
  const activeIdx = activeSection ? sections.findIndex((s) => s.id === activeSection.id) : -1;
  const totalCount = outline.length || sections.length;

  return (
    <section className="flex h-full flex-col">
      <div className="flex items-center gap-1 border-b border-border px-5 py-2.5">
        {(["PRD", "Architecture", "Constraints"] as const).map((t) => {
          const enabled =
            t === "PRD" || (t === "Constraints" && !!project.constraints) || (t === "Architecture" && stage.status === "done");
          const title = enabled
            ? undefined
            : t === "Architecture"
              ? "Available once the PRD is done — the Architect Agent is an optional deep-dive"
              : "Waiting for constraints to lock";
          return (
            <button
              key={t}
              disabled={!enabled}
              title={title}
              onClick={() => enabled && setTab(t)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                tab === t && enabled ? "bg-white/10 text-white" : "text-white/30"
              }`}
            >
              {t}
            </button>
          );
        })}
        <span className="ml-auto">
          <StatusPill status={stage.status} />
        </span>
      </div>

      {tab === "Constraints" ? (
        <ConstraintsView project={project} />
      ) : tab === "Architecture" ? (
        <ArchitectureView project={project} onRunArchitecture={onRunArchitecture} runningArchitecture={runningArchitecture} />
      ) : !sections.length ? (
        <div className="flex-1 px-6 py-5">
          <p className="text-sm text-white/30">Waiting for this stage to run…</p>
        </div>
      ) : (
        <div className="flex flex-1 overflow-hidden">
          <div className="w-56 shrink-0 overflow-auto border-r border-border px-3 py-4">
            <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-wider text-white/30">PRD Outline</p>
            <p className="mb-3 px-2 text-[10px] text-white/25">
              Progress {sections.length}/{totalCount}
            </p>
            <ul className="space-y-0.5">
              {sections.map((s) => (
                <li key={s.id}>
                  <button
                    onClick={() => setActiveSectionId(s.id)}
                    className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition ${
                      activeSection?.id === s.id ? "bg-white/10 text-white" : "text-white/50 hover:text-white/80"
                    }`}
                  >
                    <span className="text-emerald-400">✓</span>
                    <span className="truncate">{s.title}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-1 flex-col overflow-hidden">
            <div className="flex items-center justify-between border-b border-border px-5 py-2.5">
              <span className="text-xs text-white/30">
                SECTION {activeIdx + 1}/{sections.length}
              </span>
              <span className="text-sm font-medium text-white/80">{activeSection?.title}</span>
              <div className="flex items-center gap-2">
                <button
                  disabled
                  title="Stubbed in this reference build — see docs/ROADMAP.md"
                  className="rounded-md px-2 py-1 text-xs text-white/30"
                >
                  ↑ Export
                </button>
                <button
                  disabled
                  title="Stubbed in this reference build — no persistence beyond this session"
                  className="rounded-md bg-emerald-500/10 px-2 py-1 text-xs text-emerald-400/60"
                >
                  Save
                </button>
                <button
                  disabled
                  title="Stubbed in this reference build — no persistence beyond this session"
                  className="rounded-md bg-white/10 px-2 py-1 text-xs text-white/50"
                >
                  Save PRD
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto px-6 py-5">
              {activeSection && <MarkdownDoc content={activeSection.content} />}
            </div>
            <div className="flex items-center justify-end gap-3 border-t border-border px-5 py-2 text-[11px] text-white/30">
              <span>
                {wordCount(activeSection?.content ?? "")} words · {(activeSection?.content ?? "").length} chars
              </span>
              <span className="flex items-center gap-1 text-amber-400/70">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400/70" /> Unsaved
              </span>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function isLightColor(hex: string): boolean {
  const c = hex.replace("#", "");
  if (c.length !== 6) return true;
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6;
}

/**
 * The Design System tab: tokens (colors extend the locked brand palette,
 * spacing/radius are fixed scales) + a component system + a small
 * live-rendered light/dark preview — a stand-in for the real spec's
 * "renders HTML previews" tool that doesn't need a sandbox to be honest.
 */
function DesignSystemView({ project }: { project: ProjectContext }) {
  const ds = project.designSystem;
  const brand = project.brandGuidelines;
  const [mode, setMode] = useState<"light" | "dark">("light");

  if (!ds || !brand) {
    return (
      <div className="flex-1 px-6 py-5">
        <p className="text-sm text-white/30">Waiting for this stage to run…</p>
      </div>
    );
  }

  const primary = brand.colors.find((c) => c.role === "Primary")?.hex ?? "#111827";
  const accent = brand.colors.find((c) => c.role === "Accent")?.hex ?? "#f59e0b";
  const bg = mode === "light" ? brand.colors.find((c) => c.role === "Background")?.hex ?? "#ffffff" : "#0b0b0f";
  const fg = mode === "light" ? "#111827" : "#f5f5f5";

  return (
    <div className="flex-1 space-y-6 overflow-auto px-6 py-5">
      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-white/30">Live Preview</p>
          <div className="flex items-center gap-1 rounded-md border border-border p-0.5">
            <button
              onClick={() => setMode("light")}
              className={`rounded px-2 py-0.5 text-[10px] transition ${mode === "light" ? "bg-white/10 text-white" : "text-white/40"}`}
            >
              Light
            </button>
            <button
              onClick={() => setMode("dark")}
              className={`rounded px-2 py-0.5 text-[10px] transition ${mode === "dark" ? "bg-white/10 text-white" : "text-white/40"}`}
            >
              Dark
            </button>
          </div>
        </div>
        <div className="rounded-lg border border-border p-5" style={{ backgroundColor: bg, color: fg }}>
          <div
            className="rounded-lg p-3"
            style={{
              backgroundColor: mode === "light" ? "#ffffff" : "#18181f",
              border: `1px solid ${mode === "light" ? "#e5e7eb" : "#27272f"}`,
            }}
          >
            <p className="mb-1 text-sm font-medium">Card</p>
            <p className="mb-3 text-xs opacity-70">Sample card rendered from the locked tokens below.</p>
            <div className="flex gap-2">
              <button className="rounded-md px-3 py-1.5 text-xs font-medium text-white" style={{ backgroundColor: primary }}>
                Primary
              </button>
              <button className="rounded-md px-3 py-1.5 text-xs font-medium text-white" style={{ backgroundColor: accent }}>
                Accent
              </button>
            </div>
          </div>
        </div>
      </div>

      <div>
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-white/30">Tokens</p>
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-left text-xs">
            <thead className="bg-white/5 text-white/40">
              <tr>
                <th className="px-3 py-2 font-medium">Category</th>
                <th className="px-3 py-2 font-medium">Name</th>
                <th className="px-3 py-2 font-medium">Value</th>
              </tr>
            </thead>
            <tbody>
              {ds.tokens.map((t, i) => (
                <tr key={i} className="border-t border-border">
                  <td className="px-3 py-2 text-white/50">{t.category}</td>
                  <td className="px-3 py-2 text-white/70">{t.name}</td>
                  <td className="px-3 py-2 font-medium text-white">{t.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-white/30">Components</p>
        <div className="grid grid-cols-2 gap-3">
          {ds.components.map((c, i) => (
            <div key={i} className="rounded-lg border border-border p-3">
              <p className="mb-1 text-sm font-medium text-white/80">{c.name}</p>
              <p className="mb-1 text-[11px] text-white/50">
                <span className="font-medium text-white/70">Variants:</span> {c.variants.join(", ")}
              </p>
              <p className="mb-1 text-[11px] text-white/50">
                <span className="font-medium text-white/70">States:</span> {c.states.join(", ")}
              </p>
              <p className="text-[11px] text-white/40">{c.notes}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** The User Flows tab — the Design Agent's own deliverable (get_user_flows/set_user_flows), not Design System's. */
function UserFlowsView({ project }: { project: ProjectContext }) {
  const flows = project.userFlows;
  if (!flows.length) {
    return (
      <div className="flex-1 px-6 py-5">
        <p className="text-sm text-white/30">Waiting for this stage to run…</p>
      </div>
    );
  }
  return (
    <div className="flex-1 space-y-4 overflow-auto px-6 py-5">
      {flows.map((f) => (
        <div key={f.id} className="rounded-lg border border-border p-4">
          <p className="mb-1 text-sm font-medium text-white/80">{f.name}</p>
          <p className="mb-3 text-xs text-white/40">{f.purpose}</p>
          <div className="space-y-2">
            {f.steps.map((s, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/10 text-[10px] text-white/70">
                  {i + 1}
                </span>
                <div>
                  <p className="text-xs font-medium text-white/80">{s.screen}</p>
                  <p className="text-xs text-white/40">{s.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/** The UI Screens tab — specs for exactly the screens named across User Flows, never a mismatched set. */
function UIScreensView({ project }: { project: ProjectContext }) {
  const screens = project.uiScreens;
  if (!screens.length) {
    return (
      <div className="flex-1 px-6 py-5">
        <p className="text-sm text-white/30">Waiting for this stage to run…</p>
      </div>
    );
  }
  return (
    <div className="flex-1 overflow-auto px-6 py-5">
      <div className="grid grid-cols-2 gap-3">
        {screens.map((s) => (
          <div key={s.id} className="rounded-lg border border-border p-4">
            <p className="mb-1 text-sm font-medium text-white/80">{s.name}</p>
            <p className="mb-2 text-xs text-white/40">{s.purpose}</p>
            <p className="mb-1 text-[11px] text-white/50">
              <span className="font-medium text-white/70">Components:</span> {s.components.join(", ")}
            </p>
            <p className="text-[11px] text-white/50">
              <span className="font-medium text-white/70">States:</span> {s.states.join(", ")}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Design's real deliverables in this reference build: Brand Guidelines,
 * Design System (tokens/components/DESIGN.md), User Flows, and UI Screens
 * — see docs/AGENTS.md. Only Design Builder (live sandbox page-building)
 * remains stubbed. Mirrors the reference screenshot's 5-tab bar.
 */
function DesignArtifactPanel({ project }: { project: ProjectContext }) {
  const stage = project.stages.Design;
  const brand = project.brandGuidelines;
  const [tab, setTab] = useState<"Brand Guidelines" | "Design System" | "User Flows" | "UI Screens" | "Design Builder">(
    "Brand Guidelines"
  );

  const stepsDone = brand ? 4 : 0;

  return (
    <section className="flex h-full flex-col">
      <div className="flex items-center gap-1 border-b border-border px-5 py-2.5">
        {(["Brand Guidelines", "Design System", "User Flows", "UI Screens", "Design Builder"] as const).map((t) => {
          const enabled =
            t === "Brand Guidelines" ||
            (t === "Design System" && !!project.designSystem) ||
            (t === "User Flows" && project.userFlows.length > 0) ||
            (t === "UI Screens" && project.uiScreens.length > 0);
          const title = enabled
            ? undefined
            : t === "Design Builder"
              ? "Not built in this reference build — needs live sandbox code execution, see docs/ROADMAP.md"
              : "Waiting for this stage to run…";
          return (
            <button
              key={t}
              disabled={!enabled}
              title={title}
              onClick={() => enabled && setTab(t)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                tab === t && enabled ? "bg-white/10 text-white" : "text-white/30"
              }`}
            >
              {t}
            </button>
          );
        })}
        <span className="ml-auto flex items-center gap-2">
          <button
            disabled
            title="Stubbed in this reference build — see docs/ROADMAP.md"
            className="rounded-md px-2 py-1 text-xs text-white/25"
          >
            Assets
          </button>
          <button
            disabled
            title="Stubbed in this reference build — no persistence beyond this session"
            className="rounded-md bg-white/10 px-2 py-1 text-xs text-white/50"
          >
            Save &amp; continue
          </button>
        </span>
      </div>

      {tab === "Design System" ? (
        <DesignSystemView project={project} />
      ) : tab === "User Flows" ? (
        <UserFlowsView project={project} />
      ) : tab === "UI Screens" ? (
        <UIScreensView project={project} />
      ) : !brand ? (
        <div className="flex-1 px-6 py-5">
          <p className="text-sm text-white/30">Waiting for this stage to run…</p>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between border-b border-border px-5 py-2.5">
            <div className="flex items-center gap-2 text-xs text-white/50">
              <span className="font-medium text-white/80">Brand Guidelines</span>
              <span className="text-emerald-400">{"✓".repeat(stepsDone)}</span>
              <span className="text-white/25">({stepsDone}/4)</span>
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
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-white/80">
                  Color Palette <span className="text-white/30">· Step 2 of 4</span>
                </p>
                <p className="text-xs text-white/30">AI suggests psychologically informed colors from your research</p>
              </div>
              <button
                disabled
                title="Stubbed in this reference build — regeneration isn't wired up yet"
                className="rounded-md border border-border px-2.5 py-1.5 text-xs text-white/40"
              >
                ✨ Regenerate with AI
              </button>
            </div>

            <div className="mb-6 grid grid-cols-2 gap-3">
              {brand.colors.map((c, i) => {
                const light = isLightColor(c.hex);
                return (
                  <div
                    key={i}
                    className="flex flex-col justify-between rounded-lg p-4"
                    style={{ backgroundColor: c.hex, color: light ? "#111827" : "#ffffff" }}
                  >
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider opacity-70">{c.role}</p>
                      <p className="text-base font-semibold">{c.name}</p>
                      <p className="mb-2 text-xs opacity-70">{c.hex}</p>
                    </div>
                    <p className="text-xs opacity-90">
                      <span className="font-semibold">Impact:</span> {c.impact}. <span className="font-semibold">Reason:</span>{" "}
                      {c.reason}.
                    </p>
                  </div>
                );
              })}
              <button
                disabled
                title="Stubbed in this reference build"
                className="flex items-center justify-center rounded-lg border border-dashed border-border p-4 text-xs text-white/25"
              >
                + Add color
              </button>
            </div>

            <div className="space-y-6">
              <MarkdownDoc content={brand.personality} />
              <MarkdownDoc content={brand.typography} />
              <MarkdownDoc content={brand.voice} />
            </div>
          </div>
        </>
      )}
    </section>
  );
}

/**
 * Right panel: the live artifact/document for the active stage — mirrors
 * the "Ideation brief — Live concept doc" panel in the reference
 * screenshots (header + rendered doc + word/char count footer).
 */
export function ArtifactPanel({
  project,
  active,
  onRunArchitecture,
  runningArchitecture,
}: {
  project: ProjectContext;
  active: NavStageId;
  onRunArchitecture: () => void;
  runningArchitecture: boolean;
}) {
  if (active === "PRD")
    return <PRDArtifactPanel project={project} onRunArchitecture={onRunArchitecture} runningArchitecture={runningArchitecture} />;
  if (active === "Design") return <DesignArtifactPanel project={project} />;

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
        {active === "Ideate" ? (
          <IdeateArtifacts project={project} />
        ) : active === "Research" ? (
          <ResearchArtifacts project={project} />
        ) : content ? (
          <MarkdownDoc content={content} />
        ) : (
          <p className="text-sm text-white/30">Waiting for this stage to run…</p>
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
