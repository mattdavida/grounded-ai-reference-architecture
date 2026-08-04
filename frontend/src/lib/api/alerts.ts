import { apiGet } from "./client";

export type AlertSeverity = "critical" | "warning" | "info";
export type AlertKind =
  | "watchlist"
  | "overloaded_owners"
  | "blocked"
  | "red_rag";

export type AlertItem = {
  id: string;
  kind: AlertKind;
  severity: AlertSeverity;
  title: string;
  detail: string;
  count: number;
  href: string;
};

export type AlertsResponse = {
  data_version: string;
  count: number;
  alerts: AlertItem[];
};

export function fetchAlerts(): Promise<AlertsResponse> {
  return apiGet<AlertsResponse>("/api/alerts");
}
