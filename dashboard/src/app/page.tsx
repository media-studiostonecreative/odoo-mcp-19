"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Header } from "@/components/Header";
import { KpiCard } from "@/components/KpiCard";
import { RevenueVsTargetChart } from "@/components/RevenueVsTargetChart";
import { RevenueTrendChart } from "@/components/RevenueTrendChart";
import { QuotationPipeline } from "@/components/QuotationPipeline";
import { TopCustomers } from "@/components/TopCustomers";
import { TopProducts } from "@/components/TopProducts";
import { RegionalPerformance } from "@/components/RegionalPerformance";
import { InventoryAttention } from "@/components/InventoryAttention";
import { RecentActivity } from "@/components/RecentActivity";
import { TargetsModal, type Targets } from "@/components/TargetsModal";
import { formatCurrency, formatNumber } from "@/lib/format";
import type { DashboardData } from "@/lib/server/kpi/dashboard";
import type { PeriodKey } from "@/lib/server/periods";

const AUTO_REFRESH_MS = 60_000;

export default function DashboardPage() {
  const [period, setPeriod] = useState<PeriodKey>("month");
  const [data, setData] = useState<DashboardData | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLive, setIsLive] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async (selectedPeriod: PeriodKey) => {
    setIsRefreshing(true);
    try {
      const res = await fetch(`/api/dashboard?period=${selectedPeriod}`, { cache: "no-store" });
      if (!res.ok) throw new Error("dashboard fetch failed");
      const json = (await res.json()) as DashboardData;
      setData(json);
      setIsLive(true);
    } catch {
      setIsLive(false);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load(period);
  }, [period, load]);

  useEffect(() => {
    timerRef.current = setInterval(() => load(period), AUTO_REFRESH_MS);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [period, load]);

  function handleTargetsSaved(updated: Targets) {
    if (!data) return;
    setData({ ...data, targets: updated });
    load(period);
  }

  return (
    <div style={{ minHeight: "100vh" }}>
      <Header
        period={period}
        onPeriodChange={setPeriod}
        lastRefreshed={data?.meta.lastRefreshed ?? null}
        isLive={isLive}
        isRefreshing={isRefreshing}
        onRefresh={() => load(period)}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      <main style={{ maxWidth: 1320, margin: "0 auto", padding: "28px 32px 64px", display: "flex", flexDirection: "column", gap: 24 }}>
        {!data ? (
          <div style={{ padding: 60, textAlign: "center", color: "var(--charcoal-soft)" }}>Loading Business Pulse…</div>
        ) : (
          <>
            <section
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: 16,
              }}
            >
              <KpiCard label="Revenue This Month" value={formatCurrency(data.kpis.revenueThisMonth.value)} changePct={data.kpis.revenueThisMonth.changePct} />
              <KpiCard label="Revenue YTD" value={formatCurrency(data.kpis.revenueYTD.value)} changePct={data.kpis.revenueYTD.changePct} changeLabel="vs same period last year" />
              <KpiCard label="Sales Booked This Month" value={formatCurrency(data.kpis.salesBookedThisMonth.value)} changePct={data.kpis.salesBookedThisMonth.changePct} />
              <KpiCard label="Open Quotation Value" value={formatCurrency(data.kpis.openQuotationValue.value)} changePct={null} />
              <KpiCard label="Avg. Confirmed Order Value" value={formatCurrency(data.kpis.averageConfirmedOrderValue.value)} changePct={data.kpis.averageConfirmedOrderValue.changePct} />
              <KpiCard label="New Customers This Month" value={formatNumber(data.kpis.newCustomersThisMonth.value)} changePct={data.kpis.newCustomersThisMonth.changePct} />
            </section>

            <RevenueVsTargetChart
              monthly={data.revenueVsTarget.monthly}
              monthlyTarget={data.revenueVsTarget.monthlyTarget}
              annualTarget={data.revenueVsTarget.annualTarget}
              ytdActual={data.revenueVsTarget.ytdActual}
              annualProgressPct={data.revenueVsTarget.annualProgressPct}
            />

            <RevenueTrendChart currentYear={data.revenueTrend.currentYear} previousYear={data.revenueTrend.previousYear} />

            <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))", gap: 20 }}>
              <QuotationPipeline
                openCount={data.quotationPipeline.openCount}
                openValueCompanyCurrency={data.quotationPipeline.openValueCompanyCurrency}
                aging={data.quotationPipeline.aging}
              />
              <RegionalPerformance rows={data.regionalPerformance} />
            </section>

            <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))", gap: 20 }}>
              <TopCustomers rows={data.topCustomers} />
              <TopProducts rows={data.topProducts} />
            </section>

            <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))", gap: 20 }}>
              <InventoryAttention rows={data.inventoryAttention} />
              <RecentActivity rows={data.recentActivity} />
            </section>
          </>
        )}
      </main>

      {settingsOpen && data && (
        <TargetsModal targets={data.targets} onClose={() => setSettingsOpen(false)} onSaved={handleTargetsSaved} />
      )}
    </div>
  );
}
