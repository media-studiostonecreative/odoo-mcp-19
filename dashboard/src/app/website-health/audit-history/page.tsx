"use client";

import { useEffect, useState } from "react";
import { Panel } from "@/components/Panel";

interface AuditListItem {
  id: number;
  audit_date: string;
  status: string | null;
  health_score: number | null;
  critical_count: number;
  warning_count: number;
  resolved_since_previous: number;
}

interface Finding {
  id: number;
  priority: string | null;
  category: string | null;
  page: string | null;
  title: string;
  body: string | null;
  recommendation: string | null;
  change_status: string | null;
}

interface AuditDetail {
  audit: { id: number; audit_date: string; status: string; executive_summary: string | null; report_path: string };
  findings: Finding[];
  rawMarkdown: string | null;
}

const CHANGE_COLORS: Record<string, string> = {
  new: "var(--negative)",
  ongoing: "#8a6a2f",
  resolved: "var(--positive)",
  regression: "var(--negative)",
};

export default function AuditHistoryPage() {
  const [audits, setAudits] = useState<AuditListItem[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<AuditDetail | null>(null);
  const [showRaw, setShowRaw] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/health/audits", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        const list: AuditListItem[] = data.audits ?? [];
        setAudits(list);
        if (list[0]) setSelectedId(list[0].id);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (selectedId == null) return;
    setDetail(null);
    setShowRaw(false);
    fetch(`/api/health/audits/${selectedId}`, { cache: "no-store" })
      .then((r) => r.json())
      .then(setDetail);
  }, [selectedId]);

  return (
    <>
      <div>
        <div style={{ fontSize: 12, letterSpacing: 1.5, textTransform: "uppercase", color: "var(--charcoal-soft)" }}>
          Website Health
        </div>
        <h1 className="font-display" style={{ fontSize: 24, margin: "2px 0 0", fontStyle: "italic", fontWeight: 500 }}>
          Audit History
        </h1>
        <p style={{ color: "var(--charcoal-soft)", fontSize: 13.5, marginTop: 6, maxWidth: 640 }}>
          Indexed read-only from the existing monthly Markdown reports in{" "}
          <code>~/studiostone-website-audit/reports/</code> — nothing here modifies those files.
        </p>
      </div>

      <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
        <div style={{ width: 260, display: "flex", flexDirection: "column", gap: 10 }}>
          {loading ? (
            <p style={{ color: "var(--charcoal-soft)" }}>Loading…</p>
          ) : audits.length === 0 ? (
            <p style={{ color: "var(--charcoal-soft)", fontSize: 13.5 }}>
              No monthly audit reports found yet in the reports directory.
            </p>
          ) : (
            audits.map((a) => (
              <button
                key={a.id}
                onClick={() => setSelectedId(a.id)}
                style={{
                  textAlign: "left",
                  border: "1px solid var(--stone-border)",
                  borderRadius: 12,
                  padding: "12px 14px",
                  background: selectedId === a.id ? "var(--stone-surface-alt)" : "var(--stone-surface)",
                  cursor: "pointer",
                }}
              >
                <div style={{ fontWeight: 600, marginBottom: 4 }}>
                  {new Date(a.audit_date + "T00:00:00").toLocaleDateString(undefined, { year: "numeric", month: "long" })}
                </div>
                <div style={{ fontSize: 12.5, color: "var(--charcoal-soft)" }}>Health: {a.health_score ?? "—"}</div>
                <div style={{ fontSize: 12.5, color: "var(--charcoal-soft)" }}>Critical: {a.critical_count}</div>
                <div style={{ fontSize: 12.5, color: "var(--charcoal-soft)" }}>Warnings: {a.warning_count}</div>
                {a.resolved_since_previous > 0 && (
                  <div style={{ fontSize: 12.5, color: "var(--positive)" }}>
                    Resolved since last: {a.resolved_since_previous}
                  </div>
                )}
              </button>
            ))
          )}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          {detail && (
            <Panel title={`Audit — ${detail.audit.audit_date}`}>
              <div style={{ fontSize: 12.5, color: "var(--charcoal-soft)", marginBottom: 12 }}>
                Status: {detail.audit.status}
              </div>

              {detail.audit.executive_summary && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 12, color: "var(--charcoal-soft)", marginBottom: 6 }}>Executive Summary</div>
                  <p style={{ fontSize: 13.5, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{detail.audit.executive_summary}</p>
                </div>
              )}

              <div style={{ fontSize: 12, color: "var(--charcoal-soft)", marginBottom: 8 }}>
                Findings ({detail.findings.length})
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
                {detail.findings.map((f) => (
                  <div key={f.id} style={{ border: "1px solid var(--stone-border)", borderRadius: 10, padding: 12 }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6, flexWrap: "wrap" }}>
                      {f.priority && (
                        <span style={{ fontSize: 11, fontWeight: 700, color: "var(--negative)" }}>{f.priority}</span>
                      )}
                      {f.category && (
                        <span style={{ fontSize: 11, color: "var(--charcoal-soft)", textTransform: "capitalize" }}>
                          {f.category}
                        </span>
                      )}
                      {f.change_status && (
                        <span style={{ fontSize: 11, fontWeight: 600, color: CHANGE_COLORS[f.change_status] ?? "var(--charcoal-soft)", textTransform: "uppercase" }}>
                          {f.change_status}
                        </span>
                      )}
                    </div>
                    <div style={{ fontWeight: 500, marginBottom: 4 }}>{f.title}</div>
                    {f.recommendation && (
                      <div style={{ fontSize: 13, color: "var(--charcoal-soft)" }}>
                        Recommendation: {f.recommendation}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                <button
                  onClick={() => setShowRaw((v) => !v)}
                  style={{
                    border: "1px solid var(--stone-border)",
                    background: "transparent",
                    padding: "7px 13px",
                    borderRadius: 10,
                    fontSize: 12.5,
                    cursor: "pointer",
                  }}
                >
                  {showRaw ? "Hide Original Report" : "Open Original Report"}
                </button>
              </div>

              {showRaw && detail.rawMarkdown && (
                <pre
                  style={{
                    marginTop: 14,
                    fontSize: 12,
                    background: "var(--stone-surface-alt)",
                    padding: 16,
                    borderRadius: 10,
                    overflowX: "auto",
                    whiteSpace: "pre-wrap",
                    maxHeight: 500,
                    overflowY: "auto",
                  }}
                >
                  {detail.rawMarkdown}
                </pre>
              )}
            </Panel>
          )}
        </div>
      </div>
    </>
  );
}
