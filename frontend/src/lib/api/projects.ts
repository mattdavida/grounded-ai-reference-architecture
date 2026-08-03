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

export function fetchProjects(): Promise<ProjectSummary[]> {
  return apiGet<ProjectSummary[]>("/api/projects");
}

export function isWatchlist(p: ProjectSummary): boolean {
  const rag = (p.rag_status || "").toLowerCase();
  const status = (p.project_status || "").toLowerCase();
  return rag === "amber" || rag === "red" || status === "blocked" || status === "on hold";
}
