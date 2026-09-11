"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Panel } from "@/components/Panel";
import { KpiCard } from "@/components/KpiCard";
import { SeverityBadge, StatusBadge } from "@/components/health/SeverityBadge";
import { IssueDrawer } from "@/components/health/IssueDrawer";
import type { IssueRow, AlertAction } from "@/lib/server/health/issues";
import type { HealthOverview } from "@/lib/server/health/overview";

type SeverityFilter = "all" | "critical" | "warning" | "info";

export default function AttentionCenterPage() {
  const [overview, setOverview] = useState<HealthOverview | null>(null);
  const [issues, setIssues] = useState<IssueRow[]>([]);
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>("all");
  const [selected, setSelected] = useState<IssueRow | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [overviewRes, issuesRes] = await Promise.all([
        fetch("/api/health/overview", { cache: "no-store" }),
        fetch("/api/health/issues?status=active", { cache: "no-store" }),
      ]);
      if (overviewRes.ok) setOverview(await overviewRes.json());
      if (issuesRes.ok) setIssues((await issuesRes.json()).issues);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleAction(issueId: number, action: AlertAction) {
    const res = await fetch(`/api/health/issues/${issueId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    if (res.ok) {
      const { issue } = await res.json();
      const stillActive = issue.status === "open" || issue.status === "acknowledged";
      setIssues((prev) => (stillActive ? prev.map((i) => (i.id === issue.id ? issue : i)) : prev.filter((i) => i.id !== issue.id)));
      setSelected(null);
      load();
    }
  }

  const visibleIssues = severityFilter === "all" ? issues : issues.filter((i) => i.severity === severityFilter);

  return (
    <>
      <div>
        <div style={{ fontSize: 12, letterSpacing: 1.5, textTransform: "uppercase", color: "var(--charcoal-soft)" }}>
          Website Health
        </div>
        <h1 className="font-display" style={{ fontSize: 26, margin: "2px 0 0", fontStyle: "italic", fontWeight: 500 }}>
          Website Health &amp; Customer Journey
        </h1>
      </div>

      {overview && (
        <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 }}>
          <KpiCard label="Overall Health Score" value={`${overview.score.overall}`} changePct={null} />
          <KpiCard label="Critical Issues" value={`${overview.openCritical}`} changePct={null} />
          <KpiCard label="Warnings" value={`${overview.openWarning}`} changePct={null} />
          <KpiCard label="Open Content Issues" value={`${overview.openContentIssues}`} changePct={null} />
        </section>
      )}

      {overview && (
        <Panel title="Status">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, fontSize: 13.5 }}>
            <Field
              label="Last Quick Scan"
              value={
                overview.lastQuickScan
                  ? `${overview.lastQuickScan.status} — ${new Date(overview.lastQuickScan.started_at).toLocaleString()}`
                  : "Never run"
              }
            />
            <Field
              label="Last Full Audit"
              value={
                overview.lastFullAudit
                  ? `${overview.lastFullAudit.audit_date} — score ${overview.lastFullAudit.health_score ?? "—"}`
                  : "None imported yet"
              }
            />
            <Field
              label="Next Scheduled Audit"
              value={overview.nextScheduledAudit ? new Date(overview.nextScheduledAudit).toLocaleDateString() : "—"}
            />
            <Field
              label="Analytics Connection"
              value={overview.analyticsConnected ? "Connected" : "Analytics connection required for behavioral funnel data."}
            />
          </div>

          {overview.score.deductions.length > 0 && (
            <div style={{ marginTop: 18, paddingTop: 14, borderTop: "1px solid var(--stone-border)" }}>
              <div style={{ fontSize: 12, color: "var(--charcoal-soft)", marginBottom: 8 }}>
                Why points were lost ({overview.score.overall} / 100)
              </div>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.9 }}>
                {overview.score.deductions.slice(0, 8).map((d, idx) => (
                  <li key={idx}>
                    <span style={{ color: "var(--negative)", fontWeight: 600 }}>-{d.points}</span> {d.label}{" "}
                    <span style={{ color: "var(--charcoal-soft)" }}>({d.category})</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 18 }}>
            <ActionLink href="/website-health/quick-scan" label="Run Quick Scan" primary />
            <ActionLink href="/website-health/full-audit" label="Run Full Audit" />
            <ActionLink href="/website-health/audit-history" label="View Monthly Audit" />
            <ActionLink href="/website-health/audit-history" label="Compare Periods" />
            <ActionLink href="/website-health/journey-health" label="View Journey Health" />
          </div>
        </Panel>
      )}

      <Panel title="What Needs Attention">
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          {(["all", "critical", "warning", "info"] as SeverityFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setSeverityFilter(f)}
              style={{
                border: "1px solid var(--stone-border)",
                background: severityFilter === f ? "var(--stone-surface-alt)" : "transparent",
                borderRadius: 999,
                padding: "5px 12px",
                fontSize: 12.5,
                textTransform: "capitalize",
                cursor: "pointer",
              }}
            >
              {f}
            </button>
          ))}
        </div>

        {loading ? (
          <p style={{ color: "var(--charcoal-soft)" }}>Loading…</p>
        ) : visibleIssues.length === 0 ? (
          <p style={{ color: "var(--charcoal-soft)" }}>Nothing open in this filter — good news.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {visibleIssues.map((issue) => (
              <button
                key={issue.id}
                onClick={() => setSelected(issue)}
                style={{
                  textAlign: "left",
                  border: "1px solid var(--stone-border)",
                  borderRadius: 12,
                  padding: "14px 16px",
                  background: "var(--stone-surface)",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <SeverityBadge severity={issue.severity} />
                    <StatusBadge status={issue.status} />
                    <span style={{ fontSize: 12, color: "var(--charcoal-soft)", textTransform: "capitalize" }}>
                      {issue.category}
                    </span>
                  </div>
                  <span style={{ fontSize: 12, color: "var(--charcoal-soft)" }}>
                    seen {issue.frequency}× · last {new Date(issue.last_detected).toLocaleDateString()}
                  </span>
                </div>
                <div style={{ fontWeight: 500 }}>{issue.title}</div>
                {issue.page && (
                  <div style={{ fontSize: 12, color: "var(--charcoal-soft)", wordBreak: "break-all" }}>{issue.page}</div>
                )}
              </button>
            ))}
          </div>
        )}
      </Panel>

      {selected && <IssueDrawer issue={selected} onClose={() => setSelected(null)} onAction={handleAction} />}
    </>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ color: "var(--charcoal-soft)", fontSize: 12, marginBottom: 3 }}>{label}</div>
      <div>{value}</div>
    </div>
  );
}

function ActionLink({ href, label, primary }: { href: string; label: string; primary?: boolean }) {
  return (
    <Link
      href={href}
      style={{
        border: primary ? "1px solid var(--beige-accent)" : "1px solid var(--stone-border)",
        background: primary ? "var(--beige-accent)" : "transparent",
        color: "var(--charcoal)",
        padding: "8px 14px",
        borderRadius: 10,
        fontSize: 13,
        textDecoration: "none",
      }}
    >
      {label}
    </Link>
  );
}
