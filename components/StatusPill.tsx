import { StageStatus } from "@/lib/types";

const STYLES: Record<StageStatus, string> = {
  pending: "bg-white/5 text-white/40 border-white/10",
  running: "bg-accent/20 text-accent border-accent/40 animate-pulse",
  waiting: "bg-sky-500/15 text-sky-400 border-sky-500/30 animate-pulse",
  done: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  stubbed: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  error: "bg-red-500/15 text-red-400 border-red-500/30",
};

const LABELS: Record<StageStatus, string> = {
  pending: "Pending",
  running: "Running…",
  waiting: "Waiting for you",
  done: "Done",
  stubbed: "Stubbed",
  error: "Error",
};

export function StatusPill({ status }: { status: StageStatus }) {
  return (
    <span className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium ${STYLES[status]}`}>
      {LABELS[status]}
    </span>
  );
}
