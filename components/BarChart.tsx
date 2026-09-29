import { ChartBar } from "@/lib/types";

/**
 * Small illustrative bar chart — mirrors the reference screenshot's figure
 * inside the Customer Preferences research run. No charting library: this
 * reference build's data is always illustrative (no live benchmark source),
 * so a handful of styled divs is honest and sufficient.
 */
export function BarChart({ caption, bars }: { caption: string; bars: ChartBar[] }) {
  const max = Math.max(...bars.map((b) => b.value), 1);

  return (
    <div className="my-4 rounded-lg border border-border bg-black/20 p-4">
      <div className="flex items-end justify-around gap-4" style={{ height: 120 }}>
        {bars.map((b, i) => (
          <div key={i} className="flex flex-1 flex-col items-center justify-end gap-2">
            <span className="text-xs font-semibold text-white/60">{b.value}%</span>
            <div
              className={`w-full rounded-t ${b.highlight ? "bg-accent" : "bg-white/15"}`}
              style={{ height: `${(b.value / max) * 80}px` }}
            />
            <span className="text-center text-[10px] leading-tight text-white/40">{b.label}</span>
          </div>
        ))}
      </div>
      <p className="mt-3 text-center text-[10px] text-white/30">Figure — {caption}</p>
    </div>
  );
}
