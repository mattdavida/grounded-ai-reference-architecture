"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { fetchAlerts, type AlertItem, type AlertsResponse } from "@/lib/api/alerts";

function severityStyles(severity: AlertItem["severity"]) {
  if (severity === "critical") {
    return {
      bar: "border-ra-red/40 bg-ra-red/8",
      badge: "bg-ra-red text-white",
      label: "Critical",
    };
  }
  if (severity === "warning") {
    return {
      bar: "border-ra-amber/40 bg-ra-amber/10",
      badge: "bg-ra-amber text-ra-navy",
      label: "Watch",
    };
  }
  return {
    bar: "border-ra-line bg-ra-card",
    badge: "bg-ra-navy text-white",
    label: "Info",
  };
}

export function AlertsPane() {
  const [data, setData] = useState<AlertsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchAlerts()
      .then((res) => {
        if (!cancelled) {
          setData(res);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load alerts");
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <section className="rounded-xl border border-ra-line bg-ra-card p-6 shadow-sm">
        <p className="font-medium text-ra-navy">Could not load alerts</p>
        <p className="mt-2 text-sm text-ra-muted">{error}</p>
      </section>
    );
  }

  if (!data) {
    return (
      <section className="rounded-xl border border-ra-line bg-ra-card p-6 text-ra-muted shadow-sm">
        Loading grounded alerts…
      </section>
    );
  }

  if (data.alerts.length === 0) {
    return (
      <section className="rounded-xl border border-ra-line bg-ra-card p-8 text-center shadow-sm">
        <h2 className="text-base font-semibold text-ra-navy">No active alerts</h2>
        <p className="mt-2 text-sm text-ra-muted">
          Watchlist and capacity signals are clear for the current data version.
        </p>
        <p className="mt-4 text-xs text-ra-muted">{data.data_version}</p>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div className="rounded-xl border border-ra-line bg-ra-card p-5 shadow-sm">
        <p className="text-xs text-ra-muted">{data.data_version}</p>
        <h2 className="mt-1 text-base font-semibold text-ra-navy">
          {data.count} grounded alert{data.count === 1 ? "" : "s"}
        </h2>
        <p className="mt-2 text-sm text-ra-ink-mid">
          Deterministic signals from watchlist and capacity services — not model
          guesses. Click through to the filtered portfolio or capacity view.
        </p>
      </div>

      <ul className="space-y-3">
        {data.alerts.map((alert) => {
          const style = severityStyles(alert.severity);
          return (
            <li
              key={alert.id}
              className={`rounded-xl border px-4 py-4 shadow-sm ${style.bar}`}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${style.badge}`}
                >
                  {style.label}
                </span>
                <Link
                  href={alert.href}
                  className="text-sm font-semibold text-ra-navy hover:underline"
                >
                  {alert.title}
                </Link>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-ra-ink-mid">
                {alert.detail}
              </p>
              <Link
                href={alert.href}
                className="mt-3 inline-block text-xs font-medium text-ra-accent hover:underline"
              >
                Open related view →
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
