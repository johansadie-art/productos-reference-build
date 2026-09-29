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
 * Right panel: the live artifact/document for the active stage — mirrors
 * the "Ideation brief — Live concept doc" panel in the reference
 * screenshots (header + rendered doc + word/char count footer).
 */
export function ArtifactPanel({ project, active }: { project: ProjectContext; active: NavStageId }) {
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
