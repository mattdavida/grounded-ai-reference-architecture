import { apiGet } from "./client";

export type CapacityKpis = {
  active_projects: number;
  owners: number;
  overallocated_projects: number;
  overloaded_owners: number;
  total_fte_demand: number;
  owner_capacity_fte: number;
};

export type OwnerLoad = {
  owner: string;
  project_count: number;
  fte_demand: number;
  capacity_fte: number;
  utilization_pct: number;
  overloaded: boolean;
  worst_rag: string | null;
  areas: string[];
  project_ids: string[];
};

export type AreaLoad = {
  area: string;
  project_count: number;
  fte_demand: number;
  overallocated_count: number;
  owners: string[];
};

export type CapacityProjectRow = {
  portfolio_id: string;
  name: string;
  area: string | null;
  owner: string | null;
  rag_status: string | null;
  project_status: string | null;
  completion_pct: number | null;
  fte_demand: number;
  overallocation: boolean;
  planned_start: string | null;
  planned_finish: string | null;
};

export type CapacityResponse = {
  data_version: string;
  kpis: CapacityKpis;
  by_owner: OwnerLoad[];
  by_area: AreaLoad[];
  projects: CapacityProjectRow[];
};

export function fetchCapacity(): Promise<CapacityResponse> {
  return apiGet<CapacityResponse>("/api/capacity");
}
