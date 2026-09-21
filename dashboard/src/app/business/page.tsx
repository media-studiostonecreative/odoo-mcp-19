// dashboard/src/app/business/page.tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import { Page } from "@/components/ui/Page";
import { StatCard } from "@/components/ui/StatCard";
import { formatCurrency } from "@/lib/format";
import { StaleQuotationsBoard } from "@/components/business/StaleQuotationsBoard";
import { IssueDrawer, type IssueRow, type AlertAction } from "@/components/issues/IssueDrawer";

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
  const [staleQuotations, setStaleQuotations] = useState<IssueRow[]>([]);
  const [selected, setSelected] = useState<IssueRow | null>(null);

  const loadStaleQuotations = useCallback(async () => {
    const res = await fetch("/api/issues?category=business&site=wholesale", { cache: "no-store" });
    if (res.ok) setStaleQuotations((await res.json()).issues);
  }, []);

  useEffect(() => {
    loadStaleQuotations();
  }, [loadStaleQuotations]);

  async function handleQuotationAction(issueId: number, action: AlertAction) {
    const res = await fetch(`/api/issues/${issueId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    if (res.ok) {
      const { issue } = await res.json();
      setStaleQuotations((prev) => prev.map((i) => (i.id === issue.id ? issue : i)));
      setSelected(null);
    }
  }

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
          <p style={{ color: "var(--text-soft)", fontSize: 12, marginBottom: 14 }}>{period === "custom" ? `${customStart} to ${customEnd}` : data.label}</p>
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

      <div style={{ marginTop: 28 }}>
        <h2 className="font-display" style={{ fontSize: 16, fontWeight: 500, marginBottom: 12 }}>
          Stale Quotations
        </h2>
        <StaleQuotationsBoard issues={staleQuotations} onAction={handleQuotationAction} onSelect={setSelected} />
      </div>

      {selected && <IssueDrawer issue={selected} onClose={() => setSelected(null)} onAction={handleQuotationAction} />}
    </Page>
  );
}
