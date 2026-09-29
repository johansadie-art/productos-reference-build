import { ActivityEntry } from "@/lib/types";

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

const STAGE_COLORS: Record<string, string> = {
  Research: "text-sky-400",
  PRD: "text-violet-400",
  Design: "text-pink-400",
  Code: "text-emerald-400",
  Deploy: "text-amber-400",
  System: "text-white/40",
};

export function ActivityFeed({ activity }: { activity: ActivityEntry[] }) {
  return (
    <div className="space-y-2 text-sm">
      {activity.map((a, i) => (
        <div key={i} className="flex gap-3">
          <span className="w-20 shrink-0 text-white/30 tabular-nums">{formatTime(a.time)}</span>
          <span className={`w-16 shrink-0 font-medium ${STAGE_COLORS[a.stage] ?? "text-white/60"}`}>{a.stage}</span>
          <span className="text-white/70">{a.message}</span>
        </div>
      ))}
    </div>
  );
}
