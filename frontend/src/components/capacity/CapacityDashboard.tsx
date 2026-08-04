"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

import type { CapacityResponse } from "@/lib/api/capacity";
import { applyProjectDetail } from "@/lib/dashboard-navigation";
import { formatPct } from "@/lib/format";
import "@/components/dashboard/overview.css";

type Props = {
  data: CapacityResponse;
};

function ragClass(rag: string | null): string {
  const key = (rag || "").toLowerCase();
  if (key === "green") return "rag-pill--green";
  if (key === "amber") return "rag-pill--amber";
  if (key === "red") return "rag-pill--red";
  return "rag-pill--unknown";
}

export function CapacityDashboard({ data }: Props) {
  const [ownerFilter, setOwnerFilter] = useState<string | null>(null);
  const [areaFilter, setAreaFilter] = useState<string | null>(null);

  const projects = useMemo(() => {
    return data.projects.filter((p) => {
      if (ownerFilter && (p.owner || "Unassigned") !== ownerFilter) return false;
      if (areaFilter && (p.area || "Unassigned") !== areaFilter) return false;
      return true;
    });
  }, [data.projects, ownerFilter, areaFilter]);

  const maxOwnerFte = Math.max(0.1, ...data.by_owner.map((o) => o.fte_demand));
  const maxAreaFte = Math.max(0.1, ...data.by_area.map((a) => a.fte_demand));
  const { kpis } = data;

  const kpiCards = [
    { label: "Active initiatives", value: String(kpis.active_projects), sub: "Non-completed" },
    { label: "Owners", value: String(kpis.owners), sub: "Unique accountable leads" },
    {
      label: "Overloaded owners",
      value: String(kpis.overloaded_owners),
      sub: `Demand > ${kpis.owner_capacity_fte} FTE or flagged`,
    },
    {
      label: "Overallocated projects",
      value: String(kpis.overallocated_projects),
      sub: "Explicit overallocation flag",
    },
    {
      label: "Total FTE demand",
      value: kpis.total_fte_demand.toFixed(1),
      sub: "Across active parents",
    },
  ];

  return (
    <div className="space-y-6">
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {kpiCards.map((card) => (
          <article
            key={card.label}
            className="rounded-xl border border-ra-line border-t-[3px] border-t-ra-accent bg-ra-card px-4 py-4 shadow-sm"
          >
            <p className="text-xs font-medium uppercase tracking-wide text-ra-muted">
              {card.label}
            </p>
            <p className="mt-2 text-2xl font-semibold tracking-tight text-ra-navy">
              {card.value}
            </p>
            <p className="mt-1 text-xs text-ra-muted">{card.sub}</p>
          </article>
        ))}
      </section>

      <section className="rounded-xl border border-ra-line bg-ra-card p-5 shadow-sm">
        <p className="text-xs text-ra-muted">{data.data_version}</p>
        <p className="mt-2 text-sm leading-relaxed text-ra-ink-mid">
          Capacity is rolled up from parent initiatives using synthetic FTE demand per
          project. Each owner has a demo supply of {kpis.owner_capacity_fte} FTE.
          Numbers come from deterministic Python — the assistant never invents load.
        </p>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-xl border border-ra-line bg-ra-card p-5 shadow-sm">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-ra-navy">Load by owner</h2>
              <p className="mt-1 text-xs text-ra-muted">
                Click an owner to filter the initiatives table
              </p>
            </div>
            {ownerFilter && (
              <button
                type="button"
                className="text-xs font-medium text-ra-accent hover:underline"
                onClick={() => setOwnerFilter(null)}
              >
                Clear
              </button>
            )}
          </div>
          <div className="space-y-3">
            {data.by_owner.map((row) => (
              <button
                key={row.owner}
                type="button"
                className={`w-full rounded-md text-left transition-colors hover:bg-ra-bg-soft ${
                  ownerFilter === row.owner ? "bg-ra-bg-soft ring-1 ring-ra-line" : ""
                }`}
                onClick={() =>
                  setOwnerFilter((prev) => (prev === row.owner ? null : row.owner))
                }
              >
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="font-medium text-ra-navy">
                    {row.owner}
                    {row.overloaded && (
                      <span className="ml-2 text-[10px] font-semibold uppercase tracking-wide text-ra-red">
                        Overloaded
                      </span>
                    )}
                  </span>
                  <span className="tabular-nums text-ra-ink-mid">
                    {row.fte_demand.toFixed(1)} / {row.capacity_fte.toFixed(1)} FTE
                    <span className="ml-1.5 text-xs text-ra-muted">
                      ({formatPct(row.utilization_pct)})
                    </span>
                  </span>
                </div>
                <div className="overview-bar-track">
                  <div
                    className="overview-bar-fill"
                    style={{
                      width: `${Math.min(100, (row.fte_demand / maxOwnerFte) * 100)}%`,
                      background: row.overloaded
                        ? "var(--ra-red)"
                        : "var(--ra-accent)",
                    }}
                  />
                </div>
                <p className="mt-1 text-[11px] text-ra-muted">
                  {row.project_count} initiative{row.project_count === 1 ? "" : "s"} ·{" "}
                  {row.areas.join(", ")}
                </p>
              </button>
            ))}
          </div>
        </article>

        <article className="rounded-xl border border-ra-line bg-ra-card p-5 shadow-sm">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-ra-navy">Load by area</h2>
              <p className="mt-1 text-xs text-ra-muted">Demand rolled up by owner area</p>
            </div>
            {areaFilter && (
              <button
                type="button"
                className="text-xs font-medium text-ra-accent hover:underline"
                onClick={() => setAreaFilter(null)}
              >
                Clear
              </button>
            )}
          </div>
          <div className="space-y-3">
            {data.by_area.map((row) => (
              <button
                key={row.area}
                type="button"
                className={`w-full rounded-md text-left transition-colors hover:bg-ra-bg-soft ${
                  areaFilter === row.area ? "bg-ra-bg-soft ring-1 ring-ra-line" : ""
                }`}
                onClick={() =>
                  setAreaFilter((prev) => (prev === row.area ? null : row.area))
                }
              >
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="font-medium text-ra-navy">{row.area}</span>
                  <span className="tabular-nums text-ra-ink-mid">
                    {row.fte_demand.toFixed(1)} FTE
                  </span>
                </div>
                <div className="overview-bar-track">
                  <div
                    className="overview-bar-fill"
                    style={{
                      width: `${(row.fte_demand / maxAreaFte) * 100}%`,
                      background: "var(--ra-accent)",
                    }}
                  />
                </div>
                <p className="mt-1 text-[11px] text-ra-muted">
                  {row.project_count} initiative{row.project_count === 1 ? "" : "s"} ·{" "}
                  {row.owners.join(", ")}
                  {row.overallocated_count > 0
                    ? ` · ${row.overallocated_count} overallocated`
                    : ""}
                </p>
              </button>
            ))}
          </div>
        </article>
      </section>

      <section className="rounded-xl border border-ra-line bg-ra-card p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-ra-navy">Active initiatives</h2>
            <p className="mt-1 text-xs text-ra-muted">
              Click a row for the portfolio detail fact sheet
            </p>
          </div>
          <span className="text-xs font-medium text-ra-muted">
            {projects.length} shown
          </span>
        </div>

        {projects.length === 0 ? (
          <p className="text-sm text-ra-muted">No initiatives match the current filter.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[780px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-ra-line text-xs uppercase tracking-wide text-ra-muted">
                  <th className="px-3 py-2.5 font-medium">Initiative</th>
                  <th className="px-3 py-2.5 font-medium">Owner</th>
                  <th className="px-3 py-2.5 font-medium">Area</th>
                  <th className="px-3 py-2.5 font-medium">FTE</th>
                  <th className="px-3 py-2.5 font-medium">Flag</th>
                  <th className="px-3 py-2.5 font-medium">RAG</th>
                  <th className="px-3 py-2.5 font-medium">Completion</th>
                  <th className="px-3 py-2.5 font-medium">Finish</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((p) => (
                  <tr
                    key={p.portfolio_id}
                    className="border-b border-ra-line/80 transition-colors hover:bg-ra-bg-soft"
                  >
                    <td className="px-3 py-3">
                      <Link
                        href={applyProjectDetail(p.portfolio_id)}
                        className="font-medium text-ra-navy hover:underline"
                      >
                        {p.name}
                      </Link>
                      <div className="text-xs text-ra-muted">{p.portfolio_id}</div>
                    </td>
                    <td className="px-3 py-3 text-ra-ink-mid">{p.owner || "—"}</td>
                    <td className="px-3 py-3 text-ra-ink-mid">{p.area || "—"}</td>
                    <td className="px-3 py-3 tabular-nums text-ra-ink-mid">
                      {p.fte_demand.toFixed(1)}
                    </td>
                    <td className="px-3 py-3">
                      {p.overallocation ? (
                        <span className="text-xs font-semibold text-ra-red">
                          Overallocated
                        </span>
                      ) : (
                        <span className="text-xs text-ra-muted">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <span className={`rag-pill ${ragClass(p.rag_status)}`}>
                        {p.rag_status || "n/a"}
                      </span>
                    </td>
                    <td className="px-3 py-3 tabular-nums text-ra-ink-mid">
                      {p.completion_pct != null ? formatPct(p.completion_pct) : "—"}
                    </td>
                    <td className="px-3 py-3 text-ra-ink-mid">
                      {p.planned_finish || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
