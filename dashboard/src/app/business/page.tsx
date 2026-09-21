// dashboard/src/app/business/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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
  abandonedCount: number;
}

function addOneDayISO(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
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
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (period === "custom" && (!customStart || !customEnd)) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    const params = new URLSearchParams({ period });
    if (period === "custom") {
      params.set("start", customStart);
      params.set("end", addOneDayISO(customEnd)); // customEnd is the user's INCLUSIVE last day; the API's endISO is exclusive
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
  }, [period, customStart, customEnd, reloadKey]);

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
        <div style={{ border: "1px solid var(--negative)", borderRadius: 10, padding: 16, color: "var(--negative)", fontSize: 13, marginBottom: 14, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setReloadKey((k) => k + 1)}
            className="font-mono"
            style={{
              border: "1px solid var(--border-strong)",
              background: "var(--surface)",
              color: "var(--text)",
              padding: "6px 10px",
              borderRadius: 8,
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: 0.5,
              cursor: "pointer",
              fontWeight: 600,
              flexShrink: 0,
            }}
          >
            Retry
          </button>
        </div>
      )}

      {loading && !data && !error && <p style={{ color: "var(--text-soft)", fontSize: 13 }}>Loading…</p>}

      {data && (
        <>
          <div style={{ marginBottom: 14 }}>
            <p style={{ color: "var(--text-soft)", fontSize: 12 }}>{period === "custom" ? `${customStart} to ${customEnd}` : data.label}</p>
            {data.abandonedCount > 0 && (
              <p className="font-mono" style={{ color: "var(--warning)", fontSize: 11, marginTop: 4 }}>
                ⚠ {data.abandonedCount} stale {data.abandonedCount === 1 ? "quotation" : "quotations"} may be depressing this rate —{" "}
                <Link href="/" style={{ color: "var(--warning)", textDecoration: "underline" }}>
                  view in Issues
                </Link>
              </p>
            )}
          </div>
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
            <StatCard
              label="Avg Deal Size"
              value={formatCurrency(data.current.avgDealSize)}
              delta={{
                text: deltaText(data.current.avgDealSize - data.previous.avgDealSize, (v) => formatCurrency(v)),
                tone: deltaTone(data.current.avgDealSize - data.previous.avgDealSize, true),
              }}
            />
          </div>
        </>
      )}
    </Page>
  );
}
