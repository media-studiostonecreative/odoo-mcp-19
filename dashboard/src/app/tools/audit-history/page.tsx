// dashboard/src/app/tools/audit-history/page.tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import { Page } from "@/components/ui/Page";
import { Panel } from "@/components/ui/Panel";
import { DataTable } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/Badge";

interface AuditImportRow {
  id: number;
  report_path: string;
  audit_date: string;
  status: string | null;
  executive_summary: string | null;
  critical_count: number;
  warning_count: number;
  health_score: number | null;
  imported_at: string;
}

interface ContentFindingRow {
  id: number;
  fingerprint: string;
  priority: string | null;
  category: string | null;
  page: string | null;
  title: string;
  body: string | null;
  recommendation: string | null;
  change_status: string | null;
}

interface AuditDetail extends AuditImportRow {
  findings: ContentFindingRow[];
}

export default function AuditHistoryPage() {
  const [audits, setAudits] = useState<AuditImportRow[]>([]);
  const [selected, setSelected] = useState<AuditDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    fetch("/api/audits", { cache: "no-store" })
      .then((res) => res.json())
      .then((body) => setAudits(body.audits ?? []))
      .finally(() => setLoading(false));
  }, []);

  const openAudit = useCallback(async (id: number) => {
    setDetailLoading(true);
    const res = await fetch(`/api/audits/${id}`, { cache: "no-store" });
    if (res.ok) {
      const body = await res.json();
      setSelected(body.audit);
    }
    setDetailLoading(false);
  }, []);

  return (
    <Page title="Audit History" description="Imported website-audit reports, their executive summaries, and per-finding detail.">
      <Panel title="Audit Reports">
        {loading ? (
          <p style={{ color: "var(--text-soft)", fontSize: 13 }}>Loading…</p>
        ) : (
          <DataTable
            emptyText="No audit reports have been imported yet."
            rows={audits}
            onRowClick={(row) => openAudit(row.id)}
            columns={[
              { header: "Date", render: (a) => new Date(a.audit_date).toLocaleDateString() },
              { header: "Status", render: (a) => a.status ?? "—" },
              { header: "Health Score", render: (a) => (a.health_score != null ? a.health_score.toFixed(0) : "—") },
              { header: "Critical", render: (a) => <span style={{ color: a.critical_count > 0 ? "var(--negative)" : undefined }}>{a.critical_count}</span> },
              { header: "Warnings", render: (a) => <span style={{ color: a.warning_count > 0 ? "var(--warning)" : undefined }}>{a.warning_count}</span> },
              { header: "Summary", render: (a) => <span style={{ color: "var(--text-soft)" }}>{a.executive_summary?.slice(0, 90) ?? "—"}</span> },
            ]}
          />
        )}
      </Panel>

      {(detailLoading || selected) && (
        <Panel title={selected ? `Findings — ${new Date(selected.audit_date).toLocaleDateString()}` : "Loading…"} headerAction={selected && <button className="font-mono" onClick={() => setSelected(null)} style={{ fontSize: 11, background: "none", border: "1px solid var(--border)", borderRadius: 6, padding: "6px 12px", color: "var(--text-soft)", cursor: "pointer" }}>Close</button>}>
          {detailLoading ? (
            <p style={{ color: "var(--text-soft)", fontSize: 13 }}>Loading…</p>
          ) : (
            <>
              {selected?.executive_summary && <p style={{ fontSize: 13, color: "var(--text-soft)", marginBottom: 16 }}>{selected.executive_summary}</p>}
              <DataTable
                emptyText="No findings recorded for this audit."
                rows={selected?.findings ?? []}
                columns={[
                  { header: "Priority", render: (f) => (f.priority ? <Badge variant="severity">{f.priority}</Badge> : "—") },
                  { header: "Category", render: (f) => f.category ?? "—" },
                  { header: "Page", render: (f) => f.page ?? "—" },
                  { header: "Finding", render: (f) => f.title },
                  { header: "Recommendation", render: (f) => <span style={{ color: "var(--text-soft)" }}>{f.recommendation ?? "—"}</span> },
                  { header: "Status", render: (f) => f.change_status ?? "—" },
                ]}
              />
            </>
          )}
        </Panel>
      )}
    </Page>
  );
}
