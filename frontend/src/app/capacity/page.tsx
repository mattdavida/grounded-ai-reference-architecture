"use client";

import { useEffect, useState } from "react";

import { AppShell } from "@/components/AppShell";
import { CapacityDashboard } from "@/components/capacity/CapacityDashboard";
import { fetchCapacity, type CapacityResponse } from "@/lib/api/capacity";

export default function CapacityPage() {
  const [data, setData] = useState<CapacityResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchCapacity()
      .then((res) => {
        if (!cancelled) {
          setData(res);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load capacity");
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <AppShell dataVersion={data?.data_version}>
      <header className="border-b border-ra-line bg-ra-navy-900 text-white">
        <div className="mx-auto max-w-7xl px-6 py-8">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-white/60">
            Phase 2 · Capacity
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Resource capacity
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/75">
            Owner and area load from synthetic FTE demand on active initiatives —
            deterministic rollups, not LLM estimates.
          </p>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 py-8">
        {error && (
          <div className="rounded-xl border border-ra-line bg-ra-card p-6">
            <p className="font-medium text-ra-navy">Could not load capacity</p>
            <p className="mt-2 text-sm text-ra-muted">{error}</p>
            <p className="mt-4 text-sm text-ra-muted">
              Run <code>uv run alembic upgrade head</code> and{" "}
              <code>uv run python scripts/seed_db.py</code> on the backend.
            </p>
          </div>
        )}
        {!error && !data && (
          <div className="rounded-xl border border-ra-line bg-ra-card p-6 text-ra-muted">
            Loading capacity…
          </div>
        )}
        {data && <CapacityDashboard data={data} />}
      </section>
    </AppShell>
  );
}
