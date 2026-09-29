"use client";

import { useState } from "react";
import { ProjectContext } from "@/lib/types";
import { NAV_STAGES, NavStageId, STAGE_UI } from "@/lib/stageUi";

function activityFor(project: ProjectContext, active: NavStageId): string[] {
  return project.activity.filter((a) => a.stage === active).map((a) => a.message);
}

type Row = { type: "qa"; question: string; answer?: string } | { type: "info"; text: string };

function buildIdeateRows(project: ProjectContext): Row[] {
  const conv = project.ideateConversation;
  const rows: Row[] = [];
  for (let i = 0; i < conv.length; i++) {
    const m = conv[i];
    if (m.role === "agent" && m.kind === "question") {
      const next = conv[i + 1];
      if (next && next.role === "user" && next.kind === "answer") {
        rows.push({ type: "qa", question: m.content, answer: next.content });
      } else {
        rows.push({ type: "qa", question: m.content });
      }
    } else if (m.role === "agent" && m.kind === "info") {
      rows.push({ type: "info", text: m.content });
    }
  }
  return rows;
}

/**
 * Left panel: mirrors the reference screenshot's transcript. For Ideate
 * specifically, the Ideation Agent is a QUESTIONER (see docs/AGENTS.md) —
 * this renders a real back-and-forth (checkmarked once answered, pulsing
 * while pending) instead of a one-shot summary. Other stages remain
 * one-shot generators in this reference build, shown as a simple trace.
 */
export function ChatPanel({
  project,
  active,
  onSelect,
  onAnswer,
  answering,
}: {
  project: ProjectContext;
  active: NavStageId;
  onSelect: (id: NavStageId) => void;
  onAnswer: (answer: string) => void;
  answering: boolean;
}) {
  const ui = STAGE_UI[active];
  const stage = project.stages[active];
  const idx = NAV_STAGES.indexOf(active);
  const next = NAV_STAGES[idx + 1];
  const isFirstStage = idx === 0;
  const finished = stage.status === "done" || stage.status === "stubbed";

  const isIdeate = active === "Ideate";
  const isResearch = active === "Research";
  const isPRD = active === "PRD";
  const substeps = activityFor(project, active);
  const ideateRows = isIdeate ? buildIdeateRows(project) : [];
  const canAnswer = isIdeate && stage.status === "waiting" && !answering;

  const [inputValue, setInputValue] = useState("");

  function handleSend() {
    const value = inputValue.trim();
    if (!value || !canAnswer) return;
    onAnswer(value);
    setInputValue("");
  }

  return (
    <aside className="flex h-full w-[380px] flex-col border-r border-border bg-panel/60">
      <div className="border-b border-border px-4 py-3">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-white/40">{ui.label}</p>
        <div className="flex gap-2">
          <span className="rounded-full border border-border px-2.5 py-1 text-xs text-white/40">ProductOS Agent</span>
          <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${ui.color}`}>{ui.agentName}</span>
        </div>
      </div>

      <div className="flex-1 space-y-4 overflow-auto px-4 py-4 text-sm">
        {!isFirstStage && (
          <div className="space-y-1.5 text-xs text-white/30">
            <div className="flex items-center justify-between">
              <span>
                ↳ {STAGE_UI[NAV_STAGES[idx - 1]].label} approved · Handed to {ui.agentName}
              </span>
              <span className="text-emerald-400">✓</span>
            </div>
            <div className="flex items-center justify-between">
              <span>↳ {ui.systemStepLabel}</span>
              <span>
                {ui.contextStepCount} {ui.contextStepCount === 1 ? "step" : "steps"} ✓
              </span>
            </div>
          </div>
        )}

        <div className="flex items-start gap-2">
          <span className="mt-0.5" aria-hidden>
            {ui.icon}
          </span>
          <div>
            <span className="font-semibold text-white/90">{ui.agentName}</span>{" "}
            <span className="text-white/50">{ui.agentBlurb}</span>
          </div>
        </div>

        {substeps.length > 0 && (
          <ul className="ml-6 space-y-1.5 text-xs text-white/40">
            {substeps.map((m, i) => (
              <li key={i} className="flex items-center gap-2">
                <span className="h-1 w-1 rounded-full bg-white/30" />
                {m}
              </li>
            ))}
          </ul>
        )}

        {isIdeate ? (
          <div className="ml-1 space-y-3">
            {ideateRows.map((r, i) =>
              r.type === "qa" ? (
                <div key={i} className="space-y-1">
                  <div className="flex items-center gap-2 text-white/70">
                    {r.answer ? (
                      <span className="text-emerald-400">✓</span>
                    ) : (
                      <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
                    )}
                    <span>{r.question}</span>
                  </div>
                  {r.answer && <p className="ml-5 font-semibold text-white">{r.answer}</p>}
                </div>
              ) : (
                <p key={i} className="text-white/60">
                  {r.text}
                </p>
              )
            )}
            {answering && <p className="text-xs text-accent">Ideation Agent is thinking…</p>}
          </div>
        ) : isResearch ? (
          <div className="ml-1 space-y-3">
            {/* The Research Agent investigates itself — self-asked, self-answered
                from its own findings, never waiting on the user (see docs/AGENTS.md). */}
            {project.researchReasoning.map((r, i) => (
              <div key={i} className="space-y-1">
                <div className="flex items-center gap-2 text-white/70">
                  <span className="text-emerald-400">✓</span>
                  <span>{r.question}</span>
                </div>
                <p className="ml-5 font-semibold text-white">{r.answer}</p>
              </div>
            ))}
            <button
              disabled
              title="Stubbed in this reference build — see docs/ROADMAP.md"
              className="mt-1 flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs text-white/40"
            >
              📎 Upload Interviews
            </button>
          </div>
        ) : isPRD ? (
          <div className="ml-1 space-y-3">
            {/* The PRD agent cuts scope before writing — self-asked, self-answered
                from the ideation brief (see docs/AGENTS.md) — then writes straight
                into the standard outline, no approval gate in this reference build. */}
            {project.prdReasoning.map((r, i) => (
              <div key={i} className="space-y-1">
                <div className="flex items-center gap-2 text-white/70">
                  <span className="text-emerald-400">✓</span>
                  <span>{r.question}</span>
                </div>
                <p className="ml-5 font-semibold text-white">{r.answer}</p>
              </div>
            ))}

            {stage.status === "done" && project.prdApprovalSummary && (
              <p className="text-white/60">{project.prdApprovalSummary}</p>
            )}
          </div>
        ) : (
          (() => {
            const closing = finished ? substeps[substeps.length - 1] : null;
            return closing ? <p className="text-white/60">{closing}</p> : null;
          })()
        )}

        {finished && (
          <div className="flex items-center justify-between text-xs text-white/40">
            <span>{next ? "Proposing next stage" : "Pipeline complete"}</span>
            <span className="text-emerald-400">✓</span>
          </div>
        )}
      </div>

      <div className="border-t border-border p-3">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-xs text-white/30">
            {idx + 1} / {NAV_STAGES.length}
          </span>
          <button
            disabled={!next || !finished}
            onClick={() => next && onSelect(next)}
            className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-black transition disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/30"
          >
            {next ? `Continue to ${STAGE_UI[next].label} →` : "Done"}
          </button>
        </div>

        <div className={`rounded-xl border p-2.5 ${canAnswer ? "border-accent/50 bg-black/30" : "border-border bg-black/20"}`}>
          <input
            value={canAnswer ? inputValue : ""}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSend();
            }}
            disabled={!canAnswer}
            placeholder={
              canAnswer ? "Type your answer…" : answering ? "Waiting on the agent…" : "Tell ProductOS what you want to build…"
            }
            title={canAnswer ? undefined : "Conversational input outside Ideation is a Next-phase feature — see docs/ROADMAP.md"}
            className="mb-2 w-full bg-transparent text-xs text-white outline-none placeholder:text-white/30"
          />
          <div className="flex items-center justify-between text-xs text-white/25">
            <span className="flex items-center gap-2">
              <span>📎</span>
              <span className="rounded-full border border-border px-2 py-0.5">MCP</span>
            </span>
            <span className="flex items-center gap-2">
              <span>🎙️</span>
              <button
                onClick={handleSend}
                disabled={!canAnswer || !inputValue.trim()}
                className="flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-white/70 transition disabled:opacity-30"
              >
                ↑
              </button>
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}
