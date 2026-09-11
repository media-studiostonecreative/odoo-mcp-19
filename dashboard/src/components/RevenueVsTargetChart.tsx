"use client";

import {
  Bar,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { formatCompactCurrency, formatCurrency, formatPercent } from "@/lib/format";

interface MonthlyPoint {
  month: string;
  label: string;
  total: number;
}

interface RevenueVsTargetChartProps {
  monthly: MonthlyPoint[];
  monthlyTarget: number;
  annualTarget: number;
  ytdActual: number;
  annualProgressPct: number | null;
}

export function RevenueVsTargetChart({
  monthly,
  monthlyTarget,
  annualTarget,
  ytdActual,
  annualProgressPct,
}: RevenueVsTargetChartProps) {
  const data = monthly.map((m) => ({ ...m, target: monthlyTarget }));
  const progress = Math.max(0, Math.min(100, annualProgressPct ?? 0));

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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 12 }}>
        <h2 className="font-display" style={{ fontSize: 20, fontWeight: 500, margin: 0 }}>
          Revenue vs. Target
        </h2>
        <div style={{ fontSize: 13, color: "var(--charcoal-soft)" }}>
          Annual target: {formatCurrency(annualTarget)} · YTD: {formatCurrency(ytdActual)}
          {annualProgressPct !== null && <> · {formatPercent(annualProgressPct)}</>}
        </div>
      </div>

      <div
        style={{
          marginTop: 12,
          marginBottom: 20,
          height: 8,
          borderRadius: 4,
          background: "var(--stone-surface-alt)",
          overflow: "hidden",
        }}
        aria-label="Annual target progress"
      >
        <div
          style={{
            width: `${progress}%`,
            height: "100%",
            background: "var(--beige-accent)",
            transition: "width 400ms ease",
          }}
        />
      </div>

      <div style={{ width: "100%", height: 320 }}>
        <ResponsiveContainer>
          <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
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
              formatter={(value: number, name: string) => [formatCurrency(value), name === "total" ? "Revenue" : "Target"]}
              contentStyle={{
                background: "var(--stone-surface)",
                border: "1px solid var(--stone-border)",
                borderRadius: 10,
              }}
            />
            <Bar dataKey="total" fill="var(--beige-accent)" radius={[6, 6, 0, 0]} name="Revenue" />
            <Line
              type="monotone"
              dataKey="target"
              stroke="var(--charcoal)"
              strokeWidth={1.5}
              strokeDasharray="4 4"
              dot={false}
              name="Target"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
