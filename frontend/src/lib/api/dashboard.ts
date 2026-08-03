import { apiGet } from "./client";

export type OverviewResponse = {
  total_projects: number;
  active: number;
  completed: number;
  blocked: number;
  on_watchlist: number;
  avg_completion: number;
  rag: { green: number; amber: number; red: number };
  budget: {
    approved: number;
    projected: number;
    spent: number;
    variance: number;
  };
  data_version: string;
  executive_summary: string;
};

export function fetchOverview(): Promise<OverviewResponse> {
  return apiGet<OverviewResponse>("/api/dashboard/overview");
}
