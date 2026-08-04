"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { fetchAlerts } from "@/lib/api/alerts";
import { fetchOverview, type OverviewResponse } from "@/lib/api/dashboard";
import { fetchProjects, type ProjectListParams, type ProjectSummary } from "@/lib/api/projects";
import {
  applyChartFilter,
  applyKpiFilter,
  applyProjectDetail,
  type DashboardTab,
  type KpiFilter,
} from "@/lib/dashboard-navigation";

import { AlertsPane } from "./AlertsPane";
import { DashboardTabNav } from "./DashboardTabNav";
import { DetailPane } from "./DetailPane";
import { OverviewDashboard } from "./OverviewDashboard";
import { PortfolioPane } from "./PortfolioPane";

function parseTab(raw: string | null): DashboardTab {
  if (
    raw === "portfolio" ||
    raw === "watchlist" ||
    raw === "detail" ||
    raw === "alerts"
  ) {
    return raw;
  }
  return "overview";
}

export function DashboardClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const activeTab = parseTab(searchParams.get("tab"));
  const portfolioId = searchParams.get("id");

  const listParams: ProjectListParams = useMemo(() => {
    if (activeTab === "watchlist") {
      return { watchlist: true, sort: "monitor" };
    }
    return {
      area: searchParams.get("area") || undefined,
      rag: searchParams.get("rag") || undefined,
      status: searchParams.get("status") || undefined,
      risk: searchParams.get("risk") || undefined,
      filter: searchParams.get("filter") || undefined,
      sort: "monitor",
    };
  }, [activeTab, searchParams]);

  const [overview, setOverview] = useState<OverviewResponse | null>(null);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [alertCount, setAlertCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchOverview(), fetchProjects(), fetchAlerts()])
      .then(([overviewData, projectData, alertsData]) => {
        if (cancelled) return;
        setOverview(overviewData);
        setProjects(projectData.items);
        setAlertCount(alertsData.count);
        setError(null);
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

  const navigate = useCallback(
    (href: string) => {
      router.push(href);
    },
    [router],
  );

  const onTabChange = useCallback(
    (tab: DashboardTab) => {
      const q = new URLSearchParams();
      q.set("tab", tab);
      if (tab === "detail" && portfolioId) q.set("id", portfolioId);
      router.push(`${pathname}?${q.toString()}`);
    },
    [pathname, portfolioId, router],
  );

  const onKpiClick = useCallback(
    (filter: KpiFilter) => navigate(applyKpiFilter(filter)),
    [navigate],
  );

  const onRagClick = useCallback(
    (rag: string) => navigate(applyChartFilter("rag", rag)),
    [navigate],
  );

  const onAreaClick = useCallback(
    (area: string) => navigate(applyChartFilter("area", area)),
    [navigate],
  );

  const onSelectProject = useCallback(
    (id: string) => navigate(applyProjectDetail(id)),
    [navigate],
  );

  return (
    <div>
      <DashboardTabNav
        activeTab={activeTab}
        onTabChange={onTabChange}
        alertCount={alertCount}
      />

      {activeTab === "overview" && (
        <OverviewDashboard
          overview={overview}
          projects={projects}
          error={error}
          onKpiClick={onKpiClick}
          onRagClick={onRagClick}
          onAreaClick={onAreaClick}
          onSelectProject={onSelectProject}
        />
      )}

      {activeTab === "portfolio" && (
        <PortfolioPane
          params={listParams}
          title="Portfolio list"
          subtitle="All parent initiatives — filters come from Overview drill-down"
          onSelectProject={onSelectProject}
        />
      )}

      {activeTab === "watchlist" && (
        <PortfolioPane
          params={listParams}
          title="Portfolio watchlist"
          subtitle="Amber / red RAG or blocked / on hold — sorted by attention"
          onSelectProject={onSelectProject}
        />
      )}

      {activeTab === "detail" && <DetailPane portfolioId={portfolioId} />}

      {activeTab === "alerts" && <AlertsPane />}
    </div>
  );
}
