/**
 * Dashboard drill-down navigation — Overview KPIs/charts → Portfolio filters.
 *
 * URL convention (home dashboard):
 *   /?tab=portfolio&filter=<kpi>
 *   /?tab=portfolio&rag=<Green|Amber|Red>
 *   /?tab=portfolio&area=<owner area>
 *   /?tab=watchlist
 *   /?tab=detail&id=<portfolio_id>
 *   /?tab=alerts
 */

export type DashboardTab =
  | "overview"
  | "portfolio"
  | "watchlist"
  | "detail"
  | "alerts";

export type KpiFilter =
  | "totalAll"
  | "active"
  | "completed"
  | "nearCompletion"
  | "avgCompletion"
  | "blockedOnHold"
  | "attention";

export type ChartFilterKind = "rag" | "area" | "status" | "risk";

const KPI_BY_LABEL: Record<string, KpiFilter> = {
  "Total initiatives": "totalAll",
  Active: "active",
  Completed: "completed",
  Blocked: "blockedOnHold",
  Watchlist: "attention",
  "Avg completion": "avgCompletion",
  "Budget variance": "totalAll",
};

export function kpiFilterForLabel(label: string): KpiFilter | null {
  return KPI_BY_LABEL[label] ?? null;
}

export function buildDashboardHref(opts: {
  tab: DashboardTab;
  filter?: string;
  rag?: string;
  area?: string;
  status?: string;
  risk?: string;
  id?: string;
}): string {
  const q = new URLSearchParams();
  q.set("tab", opts.tab);
  if (opts.filter) q.set("filter", opts.filter);
  if (opts.rag) q.set("rag", opts.rag);
  if (opts.area) q.set("area", opts.area);
  if (opts.status) q.set("status", opts.status);
  if (opts.risk) q.set("risk", opts.risk);
  if (opts.id) q.set("id", opts.id);
  return `/?${q.toString()}`;
}

export function applyKpiFilter(filter: KpiFilter): string {
  if (filter === "attention") {
    return buildDashboardHref({ tab: "watchlist" });
  }
  return buildDashboardHref({ tab: "portfolio", filter });
}

export function applyChartFilter(kind: ChartFilterKind, value: string): string {
  if (kind === "rag") return buildDashboardHref({ tab: "portfolio", rag: value });
  if (kind === "area") return buildDashboardHref({ tab: "portfolio", area: value });
  if (kind === "status") return buildDashboardHref({ tab: "portfolio", status: value });
  return buildDashboardHref({ tab: "portfolio", risk: value });
}

export function applyProjectDetail(portfolioId: string): string {
  return buildDashboardHref({ tab: "detail", id: portfolioId });
}
