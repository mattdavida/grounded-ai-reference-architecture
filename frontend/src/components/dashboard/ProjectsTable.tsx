import { formatCurrency, formatPct } from "@/lib/format";
import { isWatchlist, type ProjectSummary } from "@/lib/api/projects";
import "./overview.css";

type Props = {
  projects: ProjectSummary[];
};

function ragClass(rag: string | null): string {
  const key = (rag || "").toLowerCase();
  if (key === "green") return "rag-pill--green";
  if (key === "amber") return "rag-pill--amber";
  if (key === "red") return "rag-pill--red";
  return "rag-pill--unknown";
}

export function ProjectsTable({ projects }: Props) {
  if (projects.length === 0) {
    return (
      <p className="text-sm text-ra-muted">
        No projects loaded. Run <code>scripts/seed_db.py</code> on the backend.
      </p>
    );
  }

  const sorted = [...projects].sort((a, b) => {
    const aw = isWatchlist(a) ? 0 : 1;
    const bw = isWatchlist(b) ? 0 : 1;
    if (aw !== bw) return aw - bw;
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-ra-line text-xs uppercase tracking-wide text-ra-muted">
            <th className="px-3 py-2.5 font-medium">Initiative</th>
            <th className="px-3 py-2.5 font-medium">Area</th>
            <th className="px-3 py-2.5 font-medium">Owner</th>
            <th className="px-3 py-2.5 font-medium">Status</th>
            <th className="px-3 py-2.5 font-medium">RAG</th>
            <th className="px-3 py-2.5 font-medium">Risk</th>
            <th className="px-3 py-2.5 font-medium">Completion</th>
            <th className="px-3 py-2.5 font-medium text-right">Variance</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((p) => (
            <tr
              key={p.portfolio_id}
              className="border-b border-ra-line/80 transition-colors hover:bg-ra-bg-soft"
            >
              <td className="px-3 py-3">
                <div className="font-medium text-ra-navy">{p.name}</div>
                <div className="text-xs text-ra-muted">{p.portfolio_id}</div>
              </td>
              <td className="px-3 py-3 text-ra-ink-mid">{p.area || "—"}</td>
              <td className="px-3 py-3 text-ra-ink-mid">{p.owner || "—"}</td>
              <td className="px-3 py-3 text-ra-ink-mid">{p.project_status || "—"}</td>
              <td className="px-3 py-3">
                <span className={`rag-pill ${ragClass(p.rag_status)}`}>
                  {p.rag_status || "n/a"}
                </span>
              </td>
              <td className="px-3 py-3 text-ra-ink-mid">{p.risk_level || "—"}</td>
              <td className="px-3 py-3 tabular-nums text-ra-ink-mid">
                {p.completion_pct != null ? formatPct(p.completion_pct) : "—"}
              </td>
              <td
                className={`px-3 py-3 text-right tabular-nums font-medium ${
                  (p.budget_variance || 0) > 0 ? "text-ra-red" : "text-ra-navy"
                }`}
              >
                {p.budget_variance != null ? formatCurrency(p.budget_variance) : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
