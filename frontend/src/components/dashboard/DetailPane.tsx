"use client";

import { useEffect, useState } from "react";

import { fetchProject, type ProjectDetail } from "@/lib/api/projects";
import { formatCurrency, formatPct } from "@/lib/format";

type Props = {
  portfolioId: string | null;
};

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] font-medium uppercase tracking-wide text-ra-muted">
        {label}
      </dt>
      <dd className="mt-1 text-sm text-ra-navy">{value}</dd>
    </div>
  );
}

export function DetailPane({ portfolioId }: Props) {
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!portfolioId) {
      setProject(null);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetchProject(portfolioId)
      .then((data) => {
        if (!cancelled) {
          setProject(data);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setProject(null);
          setError(err instanceof Error ? err.message : "Failed to load project");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [portfolioId]);

  if (!portfolioId) {
    return (
      <section className="rounded-xl border border-ra-line bg-ra-card p-8 text-center shadow-sm">
        <h2 className="text-base font-semibold text-ra-navy">Project detail</h2>
        <p className="mt-2 text-sm text-ra-muted">
          Select an initiative from Portfolio or Watchlist to open its fact sheet.
        </p>
      </section>
    );
  }

  if (loading) {
    return (
      <section className="rounded-xl border border-ra-line bg-ra-card p-6 text-ra-muted shadow-sm">
        Loading project…
      </section>
    );
  }

  if (error || !project) {
    return (
      <section className="rounded-xl border border-ra-line bg-ra-card p-6 shadow-sm">
        <p className="font-medium text-ra-navy">Could not load project</p>
        <p className="mt-2 text-sm text-ra-muted">{error || "Not found"}</p>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <header className="rounded-xl border border-ra-line bg-ra-card p-5 shadow-sm">
        <p className="text-xs font-medium uppercase tracking-wide text-ra-muted">
          {project.portfolio_id}
        </p>
        <h2 className="mt-1 text-xl font-semibold text-ra-navy">{project.name}</h2>
        <p className="mt-2 text-sm text-ra-ink-mid">
          {project.executive_comment || "No executive comment on file."}
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <dl className="space-y-4 rounded-xl border border-ra-line bg-ra-card p-5 shadow-sm">
          <Field label="Area" value={project.area || "—"} />
          <Field label="Owner" value={project.owner || "—"} />
          <Field label="Priority" value={project.priority || "—"} />
          <Field label="Status" value={project.project_status || "—"} />
          <Field label="RAG" value={project.rag_status || "—"} />
          <Field label="Risk" value={project.risk_level || "—"} />
          <Field
            label="Completion"
            value={
              project.completion_pct != null ? formatPct(project.completion_pct) : "—"
            }
          />
          <Field
            label="FTE demand"
            value={
              project.fte_demand != null ? project.fte_demand.toFixed(1) : "—"
            }
          />
          <Field
            label="Overallocation"
            value={project.overallocation ? "Yes" : "No"}
          />
        </dl>

        <dl className="space-y-4 rounded-xl border border-ra-line bg-ra-card p-5 shadow-sm">
          <Field
            label="Approved budget"
            value={
              project.approved_budget != null
                ? formatCurrency(project.approved_budget)
                : "—"
            }
          />
          <Field
            label="Projected final"
            value={
              project.projected_final_cost != null
                ? formatCurrency(project.projected_final_cost)
                : "—"
            }
          />
          <Field
            label="Spent"
            value={
              project.budget_spent != null ? formatCurrency(project.budget_spent) : "—"
            }
          />
          <Field
            label="Variance"
            value={
              project.budget_variance != null
                ? formatCurrency(project.budget_variance)
                : "—"
            }
          />
          <Field label="Planned start" value={project.planned_start || "—"} />
          <Field label="Planned finish" value={project.planned_finish || "—"} />
          <Field label="Last update" value={project.last_update || "—"} />
        </dl>
      </div>
    </section>
  );
}
