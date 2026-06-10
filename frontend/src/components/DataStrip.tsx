"use client";

import { useStats } from "@/hooks/useStories";
import { fdiBadgeClass } from "@/components/ui";

export function DataStrip() {
  const { data: stats, dataUpdatedAt } = useStats();

  const avgFdi = stats?.avgDivergence ?? null;
  const fdiDisplay = avgFdi !== null ? avgFdi.toFixed(1) : "—";
  const fdiClass = avgFdi !== null ? fdiBadgeClass(avgFdi) : "";
  const updatedAgo = dataUpdatedAt ? "Live" : "—";

  return (
    <div className="ns-data-strip">
      <div
        className="flex items-center justify-between overflow-x-auto whitespace-nowrap"
        style={{ maxWidth: 'var(--max-width)', margin: '0 auto', padding: '0 24px', height: 36 }}
      >
        {/* Left — FRACTURE LIVE */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="ns-live-dot" />
          <span
            className="text-[var(--color-accent)] uppercase"
            style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600, letterSpacing: '0.1em' }}
          >
            Fracture Live
          </span>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 shrink-0" style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>
          <span>
            <span className="stat-label">Stories </span>
            <span className="stat-value">{stats?.activeStories?.toLocaleString() ?? "—"}</span>
          </span>
          <span className="text-[var(--color-border)]">·</span>
          <span>
            <span className="stat-label">Avg FDI </span>
             <span className={`stat-value ${fdiClass}`} style={{ padding: '1px 5px' }}>{fdiDisplay}</span>
          </span>
          <span className="text-[var(--color-border)]">·</span>
          <span>
            <span className="stat-label">Sources </span>
            <span className="stat-value">{stats?.sourcesTracked?.toLocaleString() ?? "—"}</span>
          </span>
          <span className="text-[var(--color-border)]">·</span>
          <span>
            <span className="stat-label">Updated </span>
            <span className="stat-value">{updatedAgo}</span>
          </span>
        </div>
      </div>
    </div>
  );
}
