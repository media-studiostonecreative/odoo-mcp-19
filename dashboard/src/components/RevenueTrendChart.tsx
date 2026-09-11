"use client";

import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, Legend } from "recharts";
import { formatCompactCurrency, formatCurrency } from "@/lib/format";

interface MonthlyPoint {
  month: string;
  label: string;
  total: number;
}

interface RevenueTrendChartProps {
  currentYear: MonthlyPoint[];
  previousYear: MonthlyPoint[];
}

export function RevenueTrendChart({ currentYear, previousYear }: RevenueTrendChartProps) {
  const data = currentYear.map((m, idx) => ({
    label: m.label,
    current: m.total,
    previous: previousYear[idx]?.total ?? 0,
  }));

  return (
    <div
      style={{
        background: "var(--stone-surface)",
        border: "1px solid var(--stone-border)",
        borderRadius: 18,
        padding: 24,
        boxShadow: "var(--shadow-soft)",
      }}
    >
      <h2 className="font-display" style={{ fontSize: 20, fontWeight: 500, margin: "0 0 16px" }}>
        Revenue Trend
      </h2>
      <div style={{ width: "100%", height: 260 }}>
        <ResponsiveContainer>
          <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="var(--stone-border)" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 12, fill: "var(--charcoal-soft)" }} axisLine={{ stroke: "var(--stone-border)" }} tickLine={false} />
            <YAxis
              tickFormatter={(v: number) => formatCompactCurrency(v)}
              tick={{ fontSize: 12, fill: "var(--charcoal-soft)" }}
              axisLine={false}
              tickLine={false}
              width={64}
            />
            <Tooltip
              formatter={(value: number) => formatCurrency(value)}
              contentStyle={{ background: "var(--stone-surface)", border: "1px solid var(--stone-border)", borderRadius: 10 }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Line type="monotone" dataKey="current" stroke="var(--beige-accent)" strokeWidth={2.5} dot={false} name="This year" />
            <Line type="monotone" dataKey="previous" stroke="var(--charcoal-soft)" strokeWidth={1.5} strokeDasharray="4 4" dot={false} name="Previous year" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
