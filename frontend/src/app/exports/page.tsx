"use client";

import { useEffect, useState } from "react";

import { AppShell } from "@/components/AppShell";
import {
  EXPORT_LABELS,
  exportDownloadHref,
  fetchExportCatalog,
  type ExportCatalog,
  type ExportKind,
} from "@/lib/api/exports";

export default function ExportsPage() {
  const [catalog, setCatalog] = useState<ExportCatalog | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchExportCatalog()
      .then(setCatalog)
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : "Failed to load exports"),
      );
  }, []);

  const kinds = (catalog?.kinds || Object.keys(EXPORT_LABELS)) as ExportKind[];

  return (
    <AppShell>
      <header className="border-b border-ra-line bg-ra-navy-900 text-white">
        <div className="mx-auto max-w-7xl px-6 py-8">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-white/60">
            Phase 2 · Exports
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Portfolio exports
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/75">
            Download grounded packs as JSON or CSV. Files are built from the same
            deterministic services as the dashboard — never from the LLM.
          </p>
        </div>
      </header>

      <section className="mx-auto max-w-7xl space-y-4 px-6 py-8">
        {error && (
          <div className="rounded-xl border border-ra-line bg-ra-card p-5 text-sm text-ra-muted">
            {error}
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          {kinds.map((kind) => {
            const meta = EXPORT_LABELS[kind] || {
              title: kind,
              blurb: "Grounded export pack.",
            };
            return (
              <article
                key={kind}
                className="rounded-xl border border-ra-line bg-ra-card p-5 shadow-sm"
              >
                <h2 className="text-base font-semibold text-ra-navy">{meta.title}</h2>
                <p className="mt-2 text-sm text-ra-ink-mid">{meta.blurb}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <a
                    href={exportDownloadHref(kind, "json")}
                    className="rounded-lg bg-ra-navy px-3.5 py-2 text-sm font-medium text-white hover:opacity-90"
                  >
                    Download JSON
                  </a>
                  <a
                    href={exportDownloadHref(kind, "csv")}
                    className="rounded-lg bg-ra-bg-soft px-3.5 py-2 text-sm font-medium text-ra-navy ring-1 ring-ra-line hover:bg-white"
                  >
                    Download CSV
                  </a>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </AppShell>
  );
}
