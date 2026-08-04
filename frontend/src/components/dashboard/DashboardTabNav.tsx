"use client";

import type { DashboardTab } from "@/lib/dashboard-navigation";

const TABS: { id: DashboardTab; label: string; subtitle: string }[] = [
  { id: "overview", label: "Overview", subtitle: "Executive overview" },
  { id: "portfolio", label: "Portfolio", subtitle: "Full initiative list" },
  { id: "watchlist", label: "Watchlist", subtitle: "Attention signals" },
  { id: "detail", label: "Detail", subtitle: "Project fact sheet" },
  { id: "alerts", label: "Alerts", subtitle: "Grounded proactive signals" },
];

type Props = {
  activeTab: DashboardTab;
  onTabChange: (tab: DashboardTab) => void;
  alertCount?: number;
};

export function DashboardTabNav({
  activeTab,
  onTabChange,
  alertCount = 0,
}: Props) {
  const active = TABS.find((t) => t.id === activeTab) ?? TABS[0];

  return (
    <div className="mb-6 border-b border-ra-line pb-4">
      <div className="mb-3">
        <p className="text-xs font-medium uppercase tracking-[0.12em] text-ra-muted">
          Portfolio dashboard
        </p>
        <p className="mt-1 text-sm text-ra-ink-mid">{active.subtitle}</p>
      </div>
      <nav className="flex flex-wrap gap-2" aria-label="Dashboard sections">
        {TABS.map((tab) => {
          const isActive = tab.id === activeTab;
          const showBadge = tab.id === "alerts" && alertCount > 0;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-ra-navy text-white"
                  : "bg-ra-card text-ra-ink-mid ring-1 ring-ra-line hover:bg-ra-bg-soft hover:text-ra-navy"
              }`}
            >
              {tab.label}
              {showBadge && (
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums ${
                    isActive ? "bg-white/20 text-white" : "bg-ra-red text-white"
                  }`}
                >
                  {alertCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
