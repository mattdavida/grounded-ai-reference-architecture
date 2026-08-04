"use client";

import { Suspense, useEffect, useState } from "react";

import { AppShell } from "@/components/AppShell";
import { DashboardClient } from "@/components/dashboard/DashboardClient";
import { fetchOverview } from "@/lib/api/dashboard";

export default function HomePage() {
  const [dataVersion, setDataVersion] = useState<string | null>(null);

  useEffect(() => {
    fetchOverview()
      .then((o) => setDataVersion(o.data_version))
      .catch(() => setDataVersion(null));
  }, []);

  return (
    <AppShell dataVersion={dataVersion}>
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
              Grounded AI Reference
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
              Enterprise AI Modernization
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/75">
              Grounded conversational AI over precomputed portfolio metrics — the
              LLM never touches raw data.
            </p>
          </div>
          {dataVersion && (
            <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-sm lg:hidden">
              <p className="text-[11px] uppercase tracking-wide text-white/55">
                Data version
              </p>
              <p className="mt-1 text-sm font-medium text-ra-hero-data-color">
                {dataVersion}
              </p>
            </div>
          )}
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 py-8">
        <Suspense
          fallback={
            <div className="rounded-xl border border-ra-line bg-ra-card p-6 text-ra-muted">
              Loading dashboard…
            </div>
          }
        >
          <DashboardClient />
        </Suspense>
      </section>
    </AppShell>
  );
}
