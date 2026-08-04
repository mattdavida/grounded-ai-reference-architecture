"use client";

import { useEffect, useState } from "react";

import {
  fetchProjects,
  type ProjectListParams,
  type ProjectSummary,
} from "@/lib/api/projects";

import { ProjectsTable } from "./ProjectsTable";

type Props = {
  params: ProjectListParams;
  title?: string;
  subtitle?: string;
  onSelectProject?: (portfolioId: string) => void;
};

export function PortfolioPane({
  params,
  title = "Portfolio list",
  subtitle = "Filtered parent initiatives",
  onSelectProject,
}: Props) {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchProjects(params)
      .then((data) => {
        if (cancelled) return;
        setProjects(data.items);
        setTotal(data.total);
        setError(null);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load projects");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [
    params.area,
    params.rag,
    params.status,
    params.risk,
    params.watchlist,
    params.filter,
    params.sort,
  ]);

  const chips = [
    params.filter && `filter=${params.filter}`,
    params.rag && `rag=${params.rag}`,
    params.area && `area=${params.area}`,
    params.status && `status=${params.status}`,
    params.risk && `risk=${params.risk}`,
    params.watchlist && "watchlist",
  ].filter(Boolean) as string[];

  return (
    <section className="rounded-xl border border-ra-line bg-ra-card p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-ra-navy">{title}</h2>
          <p className="mt-1 text-xs text-ra-muted">{subtitle}</p>
          {chips.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {chips.map((chip) => (
                <span
                  key={chip}
                  className="rounded-md bg-ra-bg-soft px-2 py-0.5 text-[11px] font-medium text-ra-ink-mid ring-1 ring-ra-line"
                >
                  {chip}
                </span>
              ))}
            </div>
          )}
        </div>
        <span className="text-xs font-medium text-ra-muted">{total} projects</span>
      </div>

      {error && <p className="text-sm text-ra-red">{error}</p>}
      {loading && !error && <p className="text-sm text-ra-muted">Loading projects…</p>}
      {!loading && !error && (
        <ProjectsTable projects={projects} onSelectProject={onSelectProject} />
      )}
    </section>
  );
}
