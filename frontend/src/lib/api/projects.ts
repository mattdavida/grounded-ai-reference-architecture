import { apiGet } from "./client";

export type ProjectSummary = {
  portfolio_id: string;
  name: string;
  area: string | null;
  owner: string | null;
  rag_status: string | null;
  project_status: string | null;
  risk_level: string | null;
  completion_pct: number | null;
  approved_budget: number | null;
  budget_variance: number | null;
};

export type ProjectDetail = ProjectSummary & {
  parent_id: string | null;
  row_type: string | null;
  ordinal: number | null;
  priority: string | null;
  executive_comment: string | null;
  projected_final_cost: number | null;
  budget_spent: number | null;
  planned_start: string | null;
  planned_finish: string | null;
  last_update: string | null;
  fte_demand: number | null;
  overallocation: boolean | null;
  is_archived: boolean | null;
};

export type ProjectListResponse = {
  items: ProjectSummary[];
  total: number;
};

export type ProjectListParams = {
  area?: string;
  rag?: string;
  status?: string;
  risk?: string;
  watchlist?: boolean;
  filter?: string;
  sort?: string;
};

function toQuery(params?: ProjectListParams): string {
  if (!params) return "";
  const q = new URLSearchParams();
  if (params.area) q.set("area", params.area);
  if (params.rag) q.set("rag", params.rag);
  if (params.status) q.set("status", params.status);
  if (params.risk) q.set("risk", params.risk);
  if (params.watchlist != null) q.set("watchlist", String(params.watchlist));
  if (params.filter) q.set("filter", params.filter);
  if (params.sort) q.set("sort", params.sort);
  const s = q.toString();
  return s ? `?${s}` : "";
}

export function fetchProjects(params?: ProjectListParams): Promise<ProjectListResponse> {
  return apiGet<ProjectListResponse>(`/api/projects${toQuery(params)}`);
}

export function fetchProject(portfolioId: string): Promise<ProjectDetail> {
  return apiGet<ProjectDetail>(`/api/projects/${encodeURIComponent(portfolioId)}`);
}

export function isWatchlist(p: ProjectSummary): boolean {
  const rag = (p.rag_status || "").toLowerCase();
  const status = (p.project_status || "").toLowerCase();
  return rag === "amber" || rag === "red" || status === "blocked" || status === "on hold";
}
