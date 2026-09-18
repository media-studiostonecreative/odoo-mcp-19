// dashboard/src/app/business/page.tsx
"use client";

import { useEffect, useState } from "react";
import { Page } from "@/components/ui/Page";
import { StatCard } from "@/components/ui/StatCard";
import { formatCurrency } from "@/lib/format";

type PeriodKey = "month" | "quarter" | "ytd" | "12months" | "custom";

interface ConversionSummary {
  wonCount: number;
  lostCount: number;
  winRate: number;
  dropRate: number;
  revenue: number;
  avgDealSize: number;
}

interface OverviewResponse {
  label: string;
  current: ConversionSummary;
  previous: ConversionSummary;
  winRateDelta: number;
  dropRateDelta: number;
  revenueDelta: number;
}

function deltaTone(value: number, higherIsBetter: boolean): "positive" | "negative" | "neutral" {
  if (value === 0) return "neutral";
  const isUp = value > 0;
  return isUp === higherIsBetter ? "positive" : "negative";
}

function deltaText(value: number, formatValue: (v: number) => string): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${formatValue(value)} vs prior period`;
}

export default function BusinessDataPage() {
  const [period, setPeriod] = useState<PeriodKey>("month");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [data, setData] = useState<OverviewResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (period === "custom" && (!customStart || !customEnd)) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    const params = new URLSearchParams({ period });
    if (period === "custom") {
      params.set("start", customStart);
      params.set("end", customEnd);
    }

    fetch(`/api/business/overview?${params.toString()}`)
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error ?? "Failed to load business data");
        return body as OverviewResponse;
      })
      .then((body) => {
        if (!cancelled) setData(body);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load business data");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [period, customStart, customEnd]);

  return (
    <Page title="Business Data" description="Odoo quotation conversion — win rate, drop rate, and revenue.">
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 14 }}>
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value as PeriodKey)}
          className="font-mono"
          style={{
            border: "1px solid var(--border-strong)",
            background: "var(--surface)",
            color: "var(--text)",
            padding: "8px 12px",
            borderRadius: 8,
            fontSize: 11,
            textTransform: "uppercase",
            letterSpacing: 0.5,
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          <option value="month">Month</option>
          <option value="quarter">Quarter</option>
          <option value="ytd">YTD</option>
          <option value="12months">12 Months</option>
          <option value="custom">Custom</option>
        </select>
        {period === "custom" && (
          <>
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              style={{ background: "var(--surface)", color: "var(--text)", border: "1px solid var(--border)", borderRadius: 8, padding: "7px 10px", fontSize: 12 }}
            />
            <span style={{ color: "var(--text-soft)" }}>to</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              style={{ background: "var(--surface)", color: "var(--text)", border: "1px solid var(--border)", borderRadius: 8, padding: "7px 10px", fontSize: 12 }}
            />
          </>
        )}
      </div>

      {error && (
        <div style={{ border: "1px solid var(--negative)", borderRadius: 10, padding: 16, color: "var(--negative)", fontSize: 13, marginBottom: 14 }}>
          {error}
        </div>
      )}

      {loading && !data && !error && <p style={{ color: "var(--text-soft)", fontSize: 13 }}>Loading…</p>}

      {data && (
        <>
          <p style={{ color: "var(--text-soft)", fontSize: 12, marginBottom: 14 }}>{data.label}</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 14 }}>
            <StatCard
              label="Win Rate"
              value={`${data.current.winRate.toFixed(0)}%`}
              gauge={data.current.winRate}
              delta={{ text: deltaText(data.winRateDelta, (v) => `${v.toFixed(1)}pts`), tone: deltaTone(data.winRateDelta, true) }}
            />
            <StatCard
              label="Drop Rate"
              value={`${data.current.dropRate.toFixed(0)}%`}
              delta={{ text: deltaText(data.dropRateDelta, (v) => `${v.toFixed(1)}pts`), tone: deltaTone(data.dropRateDelta, false) }}
            />
            <StatCard
              label="Revenue"
              value={formatCurrency(data.current.revenue)}
              delta={{ text: deltaText(data.revenueDelta, (v) => formatCurrency(v)), tone: deltaTone(data.revenueDelta, true) }}
            />
            <StatCard label="Avg Deal Size" value={formatCurrency(data.current.avgDealSize)} />
          </div>
        </>
      )}
    </Page>
  );
}
