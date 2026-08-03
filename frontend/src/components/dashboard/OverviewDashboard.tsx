import type { OverviewResponse } from "@/lib/api/dashboard";
import type { ProjectSummary } from "@/lib/api/projects";

import { BudgetCard } from "./BudgetCard";
import { KpiCards } from "./KpiCards";
import { ProjectsTable } from "./ProjectsTable";
import { RagDonut } from "./RagDonut";
import { WatchlistByArea } from "./WatchlistByArea";

type Props = {
  overview: OverviewResponse | null;
  projects: ProjectSummary[];
  error: string | null;
};

export function OverviewDashboard({ overview, projects, error }: Props) {
  if (error) {
    return (
      <div className="rounded-xl border border-ra-line bg-ra-card p-6">
        <p className="font-medium text-ra-navy">Could not load overview</p>
        <p className="mt-2 text-sm text-ra-muted">{error}</p>
        <p className="mt-4 text-sm text-ra-muted">
          Start the API on port 8000, run migrations, and seed synthetic data.
        </p>
      </div>
    );
  }

  if (!overview) {
    return (
      <div className="rounded-xl border border-ra-line bg-ra-card p-6 text-ra-muted">
        Loading portfolio overview…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <KpiCards overview={overview} />

      <section className="rounded-xl border border-ra-line bg-ra-card p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-ra-navy">Management summary</h2>
            <p className="mt-1 text-xs text-ra-muted">{overview.data_version}</p>
          </div>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-ra-ink-mid">
          {overview.executive_summary}
        </p>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-xl border border-ra-line bg-ra-card p-5 shadow-sm">
          <h2 className="text-base font-semibold text-ra-navy">Portfolio health</h2>
          <p className="mt-1 text-xs text-ra-muted">
            RAG distribution across parent initiatives
          </p>
          <div className="mt-5">
            <RagDonut rag={overview.rag} />
          </div>
        </article>

        <article className="rounded-xl border border-ra-line bg-ra-card p-5 shadow-sm">
          <h2 className="text-base font-semibold text-ra-navy">Watchlist by area</h2>
          <p className="mt-1 text-xs text-ra-muted">
            Amber / red RAG or blocked / on hold
          </p>
          <div className="mt-5">
            <WatchlistByArea projects={projects} />
          </div>
        </article>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <article className="rounded-xl border border-ra-line bg-ra-card p-5 shadow-sm lg:col-span-1">
          <h2 className="text-base font-semibold text-ra-navy">Budget overview</h2>
          <p className="mt-1 text-xs text-ra-muted">Roll-up across parent initiatives</p>
          <div className="mt-4">
            <BudgetCard budget={overview.budget} />
          </div>
        </article>

        <article className="rounded-xl border border-ra-line bg-ra-card p-5 shadow-sm lg:col-span-2">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-ra-navy">Portfolio initiatives</h2>
              <p className="mt-1 text-xs text-ra-muted">
                Watchlist items sort first — ask the assistant about any row by name
              </p>
            </div>
            <span className="text-xs font-medium text-ra-muted">
              {projects.length} projects
            </span>
          </div>
          <ProjectsTable projects={projects} />
        </article>
      </section>
    </div>
  );
}
