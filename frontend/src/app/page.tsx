"use client";

import { useEffect, useState } from "react";

import { OverviewDashboard } from "@/components/dashboard/OverviewDashboard";
import { fetchOverview, type OverviewResponse } from "@/lib/api/dashboard";
import { fetchProjects, type ProjectSummary } from "@/lib/api/projects";

export default function HomePage() {
  const [overview, setOverview] = useState<OverviewResponse | null>(null);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    Promise.all([fetchOverview(), fetchProjects()])
      .then(([overviewData, projectData]) => {
        if (cancelled) return;
        setOverview(overviewData);
        setProjects(projectData);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Unknown error");
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="min-h-screen bg-ra-bg">
      <header className="relative overflow-hidden border-b border-ra-line bg-ra-navy-900 text-white">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            background:
              "radial-gradient(700px 280px at 18% -10%, color-mix(in srgb, var(--ra-accent) 35%, transparent), transparent 70%), radial-gradient(520px 260px at 95% 20%, color-mix(in srgb, var(--ra-accent-light) 18%, transparent), transparent 65%)",
          }}
        />
        <div className="relative mx-auto flex max-w-7xl flex-col gap-4 px-6 py-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-white/60">
              Reference Architecture
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
              Enterprise AI Modernization
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/75">
              Grounded conversational AI over precomputed portfolio metrics — the
              LLM never touches raw data.
            </p>
          </div>
          {overview && (
            <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-sm">
              <p className="text-[11px] uppercase tracking-wide text-white/55">
                Data version
              </p>
              <p className="mt-1 text-sm font-medium text-ra-hero-data-color">
                {overview.data_version}
              </p>
            </div>
          )}
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-5 flex items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-ra-navy">Portfolio overview</h2>
            <p className="mt-1 text-sm text-ra-muted">
              Key indicators, health, and initiatives in one view.
            </p>
          </div>
        </div>
        <OverviewDashboard overview={overview} projects={projects} error={error} />
      </section>
    </main>
  );
}
