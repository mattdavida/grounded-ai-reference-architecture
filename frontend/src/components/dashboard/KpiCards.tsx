import type { OverviewResponse } from "@/lib/api/dashboard";
import { formatCurrency, formatPct } from "@/lib/format";

type Props = {
  overview: OverviewResponse;
};

export function KpiCards({ overview }: Props) {
  const cards = [
    {
      label: "Total initiatives",
      value: String(overview.total_projects),
      sub: "Visible portfolio",
    },
    {
      label: "Active",
      value: String(overview.active),
      sub: "Non-completed",
    },
    {
      label: "Completed",
      value: String(overview.completed),
      sub: "Closed initiatives",
    },
    {
      label: "Blocked",
      value: String(overview.blocked),
      sub: "Needs unblock",
    },
    {
      label: "Watchlist",
      value: String(overview.on_watchlist),
      sub: "Attention signals",
    },
    {
      label: "Avg completion",
      value: formatPct(overview.avg_completion),
      sub: "Across parents",
    },
    {
      label: "Budget variance",
      value: formatCurrency(overview.budget.variance),
      sub: "Projected − approved",
    },
  ];

  return (
    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
      {cards.map((card) => (
        <article
          key={card.label}
          className="rounded-xl border border-ra-line border-t-[3px] border-t-ra-accent bg-ra-card px-4 py-4 shadow-sm"
        >
          <p className="text-xs font-medium uppercase tracking-wide text-ra-muted">
            {card.label}
          </p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-ra-navy">
            {card.value}
          </p>
          <p className="mt-1 text-xs text-ra-muted">{card.sub}</p>
        </article>
      ))}
    </section>
  );
}
