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
 * Define/PRD writes straight into the "ProductOS Standard" outline (no
 * approval gate in this reference build — see docs/AGENTS.md), then shows
 * an outline sidebar + section viewer once sections are written, mirroring
 * the reference screenshot's "PRD Outline" panel + section view.
 * Architecture/Constraints tabs are Later-phase (Architect Agent) — stubbed.
 */
function PRDArtifactPanel({ project }: { project: ProjectContext }) {
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
          const enabled = t === "PRD";
          return (
            <button
              key={t}
              disabled={!enabled}
              title={enabled ? undefined : "Not built in this reference build — see docs/ROADMAP.md (Later phase: Architect Agent)"}
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

      {!sections.length ? (
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
 * Design's real deliverable in this reference build is Brand Guidelines —
 * personality, a 4-color palette, typography, voice (see docs/AGENTS.md).
 * Design System/User Flows/UI Screens/Design Builder are stubbed: they need
 * live sandbox code execution, out of scope here. Mirrors the reference
 * screenshot's 5-tab bar + colored swatch-card palette grid.
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
          const enabled = t === "Brand Guidelines";
          return (
            <button
              key={t}
              disabled={!enabled}
              title={
                enabled
                  ? undefined
                  : "Not built in this reference build — needs live sandbox code execution, see docs/ROADMAP.md"
              }
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

      {!brand ? (
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
export function ArtifactPanel({ project, active }: { project: ProjectContext; active: NavStageId }) {
  if (active === "PRD") return <PRDArtifactPanel project={project} />;
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
