import { isWatchlist, type ProjectSummary } from "@/lib/api/projects";
import "./overview.css";

type Props = {
  projects: ProjectSummary[];
};

export function WatchlistByArea({ projects }: Props) {
  const counts = new Map<string, number>();
  for (const p of projects) {
    if (!isWatchlist(p)) continue;
    const area = p.area || "Unassigned";
    counts.set(area, (counts.get(area) || 0) + 1);
  }

  const rows = [...counts.entries()]
    .map(([area, count]) => ({ area, count }))
    .sort((a, b) => b.count - a.count);

  if (rows.length === 0) {
    return (
      <p className="text-sm text-ra-muted">No watchlist signals in the current portfolio.</p>
    );
  }

  const max = Math.max(...rows.map((r) => r.count));

  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <div key={row.area}>
          <div className="mb-1 flex items-center justify-between text-sm">
            <span className="text-ra-ink-mid">{row.area}</span>
            <span className="font-semibold text-ra-navy">{row.count}</span>
          </div>
          <div className="overview-bar-track">
            <div
              className="overview-bar-fill"
              style={{
                width: `${(row.count / max) * 100}%`,
                background: "var(--ra-accent)",
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
