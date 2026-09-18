// dashboard/src/app/page.tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import { Page } from "@/components/ui/Page";
import { StatCard } from "@/components/ui/StatCard";
import { IssuesBoard } from "@/components/issues/IssuesBoard";
import { IssueDrawer, type IssueRow, type AlertAction } from "@/components/issues/IssueDrawer";
import { RunCheckButton } from "@/components/issues/RunCheckButton";

interface Summary {
  healthScore: number;
  openCritical: number;
  openWarning: number;
  openContentIssues: number;
}

interface OverviewResponse {
  lastAudit: { audit_date: string; health_score: number | null } | null;
  lastQuickScan: { status: string; started_at: string } | null;
}

// "business" issues (Odoo not-sent/abandoned quotation alerts) are a
// sales-process signal, not a website-health signal — excluded from the
// score and the Critical/Warning counts, same rule as the pre-rebuild app.
function summarize(issues: IssueRow[]): Summary {
  const active = issues.filter((i) => i.status !== "resolved" && i.category !== "business");
  const points = active.reduce((sum, i) => sum + (i.severity === "critical" ? 8 : i.severity === "warning" ? 4 : 1), 0);
  return {
    healthScore: Math.max(0, Math.min(100, 100 - points)),
    openCritical: active.filter((i) => i.severity === "critical").length,
    openWarning: active.filter((i) => i.severity === "warning").length,
    openContentIssues: active.filter((i) => i.category === "content" || i.category === "localization").length,
  };
}

export default function IssuesPage() {
  const [issues, setIssues] = useState<IssueRow[]>([]);
  const [overview, setOverview] = useState<OverviewResponse | null>(null);
  const [selected, setSelected] = useState<IssueRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  const load = useCallback(async () => {
    const [issuesRes, overviewRes] = await Promise.all([
      fetch("/api/issues", { cache: "no-store" }),
      fetch("/api/overview", { cache: "no-store" }),
    ]);
    if (issuesRes.ok) setIssues((await issuesRes.json()).issues);
    if (overviewRes.ok) setOverview(await overviewRes.json());
    setLastRefreshed(new Date());
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleAction(issueId: number, action: AlertAction) {
    const res = await fetch(`/api/issues/${issueId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    if (res.ok) {
      const { issue } = await res.json();
      setIssues((prev) => prev.map((i) => (i.id === issue.id ? issue : i)));
      setSelected(null);
    }
  }

  const summary = summarize(issues);

  return (
    <Page
      title="Issues"
      description="Technical errors and warnings from Shopify and Odoo, in one place."
      actions={<RunCheckButton onFinished={load} />}
    >
      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 }}>
        <StatCard label="Health Score" value={String(summary.healthScore)} gauge={summary.healthScore} />
        <StatCard label="Critical Issues" value={String(summary.openCritical)} />
        <StatCard label="Warnings" value={String(summary.openWarning)} />
        <StatCard label="Content Issues" value={String(summary.openContentIssues)} />
      </section>

      {lastRefreshed && (
        <p className="font-mono" style={{ fontSize: 11, color: "var(--text-soft)" }}>
          Last checked {lastRefreshed.toLocaleTimeString()}
          {overview?.lastAudit && ` · Last monthly audit ${overview.lastAudit.audit_date} (score ${overview.lastAudit.health_score ?? "—"})`}
        </p>
      )}

      {loading ? <p style={{ color: "var(--text-soft)" }}>Loading…</p> : <IssuesBoard issues={issues} onAction={handleAction} onSelect={setSelected} />}

      {selected && <IssueDrawer issue={selected} onClose={() => setSelected(null)} onAction={handleAction} />}
    </Page>
  );
}
