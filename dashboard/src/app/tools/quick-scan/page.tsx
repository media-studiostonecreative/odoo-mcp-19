// dashboard/src/app/tools/quick-scan/page.tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import { Page } from "@/components/ui/Page";
import { Panel } from "@/components/ui/Panel";
import { DataTable } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/Badge";
import { RunCheckButton } from "@/components/issues/RunCheckButton";

interface ScanStatus {
  id: number;
  scan_type: string;
  status: string;
  started_at: string;
  finished_at: string | null;
  total_checks: number;
  completed_checks: number;
  passed_checks: number;
  failed_checks: number;
  warned_checks: number;
  current_label: string | null;
  error: string | null;
}

interface CheckRow {
  id: number;
  check_type: string;
  category: string;
  site: "retail" | "wholesale";
  page: string | null;
  label: string;
  status: "pass" | "fail" | "warn";
  details: string | null;
}

export default function QuickScanPage() {
  const [scan, setScan] = useState<ScanStatus | null>(null);
  const [checks, setChecks] = useState<CheckRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const res = await fetch("/api/checks/latest", { cache: "no-store" });
    if (res.ok) {
      const body = await res.json();
      setScan(body.scan);
      setChecks(body.checks ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <Page title="Quick Scan" description="On-demand Playwright checks against Shopify and Odoo, plus stale-quotation detection." actions={<RunCheckButton onFinished={load} />}>
      {loading ? (
        <p style={{ color: "var(--text-soft)", fontSize: 13 }}>Loading…</p>
      ) : !scan ? (
        <Panel title="Latest Scan">
          <p style={{ fontSize: 13, color: "var(--text-soft)" }}>No scan has been run yet — click &quot;Run Check Now&quot; above.</p>
        </Panel>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14, marginBottom: 20 }}>
            <div className="bracket-panel" style={{ padding: "14px 18px" }}>
              <div className="font-mono" style={{ fontSize: 11, color: "var(--text-soft)", textTransform: "uppercase", marginBottom: 4 }}>
                Status
              </div>
              <div style={{ fontSize: 18 }}>{scan.status}</div>
            </div>
            <div className="bracket-panel" style={{ padding: "14px 18px" }}>
              <div className="font-mono" style={{ fontSize: 11, color: "var(--text-soft)", textTransform: "uppercase", marginBottom: 4 }}>
                Checks
              </div>
              <div style={{ fontSize: 18 }}>
                {scan.completed_checks}/{scan.total_checks}
              </div>
            </div>
            <div className="bracket-panel" style={{ padding: "14px 18px" }}>
              <div className="font-mono" style={{ fontSize: 11, color: "var(--text-soft)", textTransform: "uppercase", marginBottom: 4 }}>
                Passed
              </div>
              <div style={{ fontSize: 18, color: "var(--positive)" }}>{scan.passed_checks}</div>
            </div>
            <div className="bracket-panel" style={{ padding: "14px 18px" }}>
              <div className="font-mono" style={{ fontSize: 11, color: "var(--text-soft)", textTransform: "uppercase", marginBottom: 4 }}>
                Warned
              </div>
              <div style={{ fontSize: 18, color: "var(--warning)" }}>{scan.warned_checks}</div>
            </div>
            <div className="bracket-panel" style={{ padding: "14px 18px" }}>
              <div className="font-mono" style={{ fontSize: 11, color: "var(--text-soft)", textTransform: "uppercase", marginBottom: 4 }}>
                Failed
              </div>
              <div style={{ fontSize: 18, color: "var(--negative)" }}>{scan.failed_checks}</div>
            </div>
          </div>

          <p className="font-mono" style={{ fontSize: 11, color: "var(--text-soft)", marginBottom: 14 }}>
            Started {new Date(scan.started_at).toLocaleString()}
            {scan.finished_at && ` · finished ${new Date(scan.finished_at).toLocaleString()}`}
          </p>

          {scan.error && (
            <div style={{ border: "1px solid var(--negative)", borderRadius: 10, padding: 16, color: "var(--negative)", fontSize: 13, marginBottom: 14 }}>
              {scan.error}
            </div>
          )}

          <Panel title="Checks in This Scan">
            <DataTable
              emptyText="No checks recorded."
              rows={checks}
              columns={[
                { header: "Status", render: (c) => <Badge variant={c.status === "pass" ? "neutral" : "severity"}>{c.status === "warn" ? "warning" : c.status === "fail" ? "critical" : "pass"}</Badge> },
                { header: "Site", render: (c) => (c.site === "wholesale" ? "Odoo" : "Shopify") },
                { header: "Category", render: (c) => c.category },
                { header: "Check", render: (c) => c.label },
                { header: "Page", render: (c) => c.page ?? "—" },
              ]}
            />
          </Panel>
        </>
      )}
    </Page>
  );
}
