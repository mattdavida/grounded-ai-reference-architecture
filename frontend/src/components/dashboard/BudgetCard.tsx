import type { OverviewResponse } from "@/lib/api/dashboard";
import { formatCurrency } from "@/lib/format";

type Props = {
  budget: OverviewResponse["budget"];
};

export function BudgetCard({ budget }: Props) {
  const rows = [
    { label: "Approved", value: budget.approved },
    { label: "Projected final", value: budget.projected },
    { label: "Spent", value: budget.spent },
    { label: "Variance", value: budget.variance, emphasize: true },
  ];

  const adverse = budget.variance > 0;

  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <div
          key={row.label}
          className="flex items-center justify-between rounded-lg bg-ra-bg-soft px-3 py-2.5"
        >
          <span className="text-sm text-ra-ink-mid">{row.label}</span>
          <span
            className={`text-sm font-semibold tabular-nums ${
              row.emphasize
                ? adverse
                  ? "text-ra-red"
                  : "text-ra-green"
                : "text-ra-navy"
            }`}
          >
            {formatCurrency(row.value)}
          </span>
        </div>
      ))}
      <p className="text-xs text-ra-muted">
        Variance = projected final − approved. Positive is unfavorable.
      </p>
    </div>
  );
}
