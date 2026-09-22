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
  sessionsWithCartAdditions: number;
  sessionsThatCompletedCheckout: number;
  conversionRate: number; // 0-1 fraction
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
        <Panel title="Funnel by Landing Page">
          <DataTable
            emptyText="No session data in the last 30 days."
            rows={data.rows}
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
    </Page>
  );
}
