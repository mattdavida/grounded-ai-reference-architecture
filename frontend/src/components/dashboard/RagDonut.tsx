"use client";

import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";

import type { OverviewResponse } from "@/lib/api/dashboard";
import "./overview.css";

type Props = {
  rag: OverviewResponse["rag"];
};

const COLORS = {
  Green: "var(--ra-green)",
  Amber: "var(--ra-amber)",
  Red: "var(--ra-red)",
} as const;

export function RagDonut({ rag }: Props) {
  const data = [
    { status: "Green", count: rag.green, color: COLORS.Green },
    { status: "Amber", count: rag.amber, color: COLORS.Amber },
    { status: "Red", count: rag.red, color: COLORS.Red },
  ];
  const total = data.reduce((s, d) => s + d.count, 0) || 1;
  const max = Math.max(1, ...data.map((d) => d.count));

  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
      <div className="overview-donut-wrap">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="count"
              nameKey="status"
              cx="50%"
              cy="50%"
              outerRadius="94%"
              innerRadius="58%"
              stroke="none"
              startAngle={90}
              endAngle={-270}
            >
              {data.map((entry) => (
                <Cell key={entry.status} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="overview-donut-center">
          <div className="n">{total}</div>
          <div className="t">Initiatives</div>
        </div>
      </div>

      <div className="w-full min-w-0 flex-1 space-y-3">
        {data.map((item) => (
          <div key={item.status}>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-ra-ink-mid">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ background: item.color }}
                />
                {item.status}
              </span>
              <span className="font-semibold text-ra-navy">
                {item.count}
                <span className="ml-1.5 text-xs font-normal text-ra-muted">
                  ({Math.round((item.count / total) * 100)}%)
                </span>
              </span>
            </div>
            <div className="overview-bar-track">
              <div
                className="overview-bar-fill"
                style={{
                  width: `${(item.count / max) * 100}%`,
                  background: item.color,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
