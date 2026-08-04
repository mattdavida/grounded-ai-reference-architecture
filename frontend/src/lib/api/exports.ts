export type ExportKind = "projects" | "capacity" | "overview";
export type ExportFormat = "json" | "csv";

export type ExportCatalog = {
  kinds: ExportKind[];
  formats: ExportFormat[];
  endpoints: string[];
};

export async function fetchExportCatalog(): Promise<ExportCatalog> {
  const res = await fetch("/api/exports", { cache: "no-store" });
  if (!res.ok) throw new Error(`API /api/exports failed: ${res.status}`);
  return res.json() as Promise<ExportCatalog>;
}

export function exportDownloadHref(kind: ExportKind, format: ExportFormat): string {
  return `/api/exports/${kind}?format=${format}`;
}

export const EXPORT_LABELS: Record<ExportKind, { title: string; blurb: string }> = {
  projects: {
    title: "Portfolio initiatives",
    blurb: "Parent project list with RAG, budget, and FTE fields.",
  },
  capacity: {
    title: "Capacity load",
    blurb: "Active initiatives with owner/area FTE demand (CSV = project rows).",
  },
  overview: {
    title: "Overview KPIs",
    blurb: "Deterministic portfolio rollups and executive summary.",
  },
};
