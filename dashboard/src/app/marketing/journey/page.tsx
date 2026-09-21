// dashboard/src/app/marketing/journey/page.tsx
"use client";

import { useEffect, useState } from "react";
import { Page } from "@/components/ui/Page";
import { Panel } from "@/components/ui/Panel";
import { DataTable } from "@/components/ui/DataTable";
import { formatNumber } from "@/lib/format";

interface LandingPageFunnelRow {
  landingPage: string;
  sessions: number;
  addToCarts: number;
  checkouts: number;
  conversions: number;
}

interface FunnelResponse {
  configured: boolean;
  rows: LandingPageFunnelRow[];
}

export default function CustomerJourneyPage() {
  const [data, setData] = useState<FunnelResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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
            This page needs a Shopify Admin API access token to pull real session/cart/checkout data — none is configured yet, so no numbers are
            shown here rather than guessing at them.
          </p>
          <p style={{ fontSize: 13.5, lineHeight: 1.6, color: "var(--text-soft)", marginTop: 10 }}>
            To connect it: generate an Admin API access token in your Shopify store (Settings → Apps → Develop apps), with at least{" "}
            <code style={{ background: "var(--surface-alt)", padding: "2px 6px", borderRadius: 4 }}>read_reports</code> access, then set{" "}
            <code style={{ background: "var(--surface-alt)", padding: "2px 6px", borderRadius: 4 }}>SHOPIFY_ADMIN_ACCESS_TOKEN</code> in the
            project&apos;s root <code style={{ background: "var(--surface-alt)", padding: "2px 6px", borderRadius: 4 }}>.env</code> file.
          </p>
        </Panel>
      )}

      {data && data.configured && (
        <Panel title="Funnel by Landing Page">
          <DataTable
            emptyText="No session data in the last 30 days."
            rows={data.rows}
            columns={[
              { header: "Landing Page", render: (r) => r.landingPage },
              { header: "Sessions", render: (r) => formatNumber(r.sessions), align: "right" },
              { header: "Add to Cart", render: (r) => formatNumber(r.addToCarts), align: "right" },
              { header: "Checkouts", render: (r) => formatNumber(r.checkouts), align: "right" },
              { header: "Conversions", render: (r) => formatNumber(r.conversions), align: "right" },
              {
                header: "Conv. Rate",
                render: (r) => `${r.sessions ? ((r.conversions / r.sessions) * 100).toFixed(1) : "0.0"}%`,
                align: "right",
              },
            ]}
          />
        </Panel>
      )}
    </Page>
  );
}
