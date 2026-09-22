// dashboard/src/app/marketing/journey/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Page } from "@/components/ui/Page";
import { Panel } from "@/components/ui/Panel";
import { DataTable } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/Badge";
import { formatNumber } from "@/lib/format";

interface RelatedIssue {
  id: number;
  title: string;
  severity: "critical" | "warning" | "info";
  frequency: number;
}

interface JourneyFunnelRow {
  landingPage: string;
  sessions: number;
  sessionsWithCartAdditions: number;
  sessionsThatCompletedCheckout: number;
  conversionRate: number; // 0-1 fraction
  notable: boolean;
  relatedIssues: RelatedIssue[];
}

interface FunnelResponse {
  configured: boolean;
  rows: JourneyFunnelRow[];
}

const COLLAPSED_ROW_COUNT = 10;

export default function CustomerJourneyPage() {
  const [data, setData] = useState<FunnelResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    fetch("/api/marketing/journey", { cache: "no-store" })
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error ?? "Failed to load funnel data");
        return body as FunnelResponse;
      })
      .then(setData)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Failed to load funnel data"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Page title="Customer Journey" description="Shopify session → cart → checkout funnel, by landing page (trailing 30 days).">
      {loading && <p style={{ color: "var(--text-soft)", fontSize: 13 }}>Loading…</p>}

      {error && (
        <div style={{ border: "1px solid var(--negative)", borderRadius: 10, padding: 16, color: "var(--negative)", fontSize: 13 }}>{error}</div>
      )}

      {data && !data.configured && (
        <Panel title="Shopify not connected">
          <p style={{ fontSize: 13.5, lineHeight: 1.6, color: "var(--text-soft)" }}>
            This page needs Shopify Admin API credentials to pull real session/cart/checkout data — none are configured yet, so no numbers are
            shown here rather than guessing at them.
          </p>
          <p style={{ fontSize: 13.5, lineHeight: 1.6, color: "var(--text-soft)", marginTop: 10 }}>
            To connect it: create a custom app in your Shopify store (Settings → Apps and sales channels → Develop apps), give it at least{" "}
            <code style={{ background: "var(--surface-alt)", padding: "2px 6px", borderRadius: 4 }}>read_reports</code> access under Admin API
            integration, install it, then copy its <strong>Client ID</strong> and <strong>Client Secret</strong> from the API credentials tab into{" "}
            <code style={{ background: "var(--surface-alt)", padding: "2px 6px", borderRadius: 4 }}>SHOPIFY_CLIENT_ID</code> /{" "}
            <code style={{ background: "var(--surface-alt)", padding: "2px 6px", borderRadius: 4 }}>SHOPIFY_CLIENT_SECRET</code> in the
            project&apos;s root <code style={{ background: "var(--surface-alt)", padding: "2px 6px", borderRadius: 4 }}>.env</code> file. (Shopify
            no longer shows a static access token directly — the dashboard exchanges these for one automatically, refreshed every 24 hours.)
          </p>
        </Panel>
      )}

      {data && data.configured && (
        <Panel
          title="Funnel by Landing Page"
          headerAction={
            data.rows.length > COLLAPSED_ROW_COUNT && (
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                className="font-mono"
                style={{
                  border: "1px solid var(--border-strong)",
                  background: "var(--surface)",
                  color: "var(--text)",
                  padding: "6px 12px",
                  borderRadius: 8,
                  fontSize: 11,
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                {expanded ? `Show Top ${COLLAPSED_ROW_COUNT}` : `Show All (${data.rows.length})`}
              </button>
            )
          }
        >
          <DataTable
            emptyText="No session data in the last 30 days."
            rows={expanded ? data.rows : data.rows.slice(0, COLLAPSED_ROW_COUNT)}
            columns={[
              { header: "Landing Page", render: (r) => r.landingPage },
              { header: "Sessions", render: (r) => formatNumber(r.sessions), align: "right" },
              { header: "Add to Cart", render: (r) => formatNumber(r.sessionsWithCartAdditions), align: "right" },
              { header: "Reached Checkout", render: (r) => formatNumber(r.sessionsThatCompletedCheckout), align: "right" },
              { header: "Conv. Rate", render: (r) => `${(r.conversionRate * 100).toFixed(1)}%`, align: "right" },
            ]}
          />
        </Panel>
      )}

      {data && data.configured && data.rows.some((r) => r.notable && r.relatedIssues.length > 0) && (
        <div style={{ marginTop: 24 }}>
          <Panel title="Pages That May Need Attention" tone="yellow">
            <p style={{ fontSize: 12.5, color: "var(--text-soft)", marginBottom: 16 }}>
              These landing pages get real traffic but essentially never convert, and have open issues logged against them — the drop-off is likely
              explained, not a mystery.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {data.rows
                .filter((r) => r.notable && r.relatedIssues.length > 0)
                .map((r) => (
                  <div key={r.landingPage} style={{ border: "1px solid var(--border)", borderRadius: 10, padding: 14 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8 }}>
                      <span style={{ fontWeight: 500, fontSize: 13.5 }}>{r.landingPage}</span>
                      <span style={{ fontSize: 11.5, color: "var(--text-soft)" }} className="font-mono">
                        {formatNumber(r.sessions)} sessions · {(r.conversionRate * 100).toFixed(1)}% conversion
                      </span>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 10 }}>
                      {r.relatedIssues.map((issue) => (
                        <div key={issue.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5 }}>
                          <Badge variant="severity">{issue.severity}</Badge>
                          <span>{issue.title}</span>
                          <span style={{ color: "var(--text-soft)" }}>(seen {issue.frequency}×)</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
            </div>
            <Link href="/" style={{ display: "inline-block", marginTop: 14, fontSize: 12, color: "var(--warning)", textDecoration: "underline" }}>
              View and resolve in Issues
            </Link>
          </Panel>
        </div>
      )}
    </Page>
  );
}
