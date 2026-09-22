// dashboard/src/app/social-intelligence/page.tsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Page } from "@/components/ui/Page";
import { Panel } from "@/components/ui/Panel";
import { DataTable } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/Badge";
import { formatNumber, formatCurrency, formatDate } from "@/lib/format";
import { scoreSocialPosts } from "@/lib/social/scoring";
import { buildUtmUrl, UTM_SOURCES, UTM_MEDIUMS, InvalidUtmUrlError, type UtmSource, type UtmMedium } from "@/lib/social/utm";

type Platform = "instagram" | "facebook" | "tiktok" | "pinterest";

interface SocialPost {
  id: number;
  posted_date: string;
  platform: Platform;
  post_type: string | null;
  caption: string | null;
  likes: number;
  comments: number;
  shares: number;
  link_clicks: number;
  utm_campaign: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  revenue_attributed: number;
}

interface CampaignAttributionRow {
  utmCampaign: string;
  utmSource: string;
  utmMedium: string;
  sessions: number;
  conversionRate: number;
  orders: number;
  sales: number;
  averageOrderValue: number;
}

interface AttributionResult {
  configured: boolean;
  rows: CampaignAttributionRow[];
}

const inputStyle = { background: "var(--surface)", color: "var(--text)", border: "1px solid var(--border)", borderRadius: 8, padding: "7px 10px", fontSize: 12, width: "100%" };
const labelStyle = { fontSize: 11, color: "var(--text-soft)", textTransform: "uppercase" as const, letterSpacing: 0.5, marginBottom: 4, display: "block" };

function UtmBuilder() {
  const [baseUrl, setBaseUrl] = useState("https://studiostonecreative.com/");
  const [source, setSource] = useState<UtmSource>("instagram");
  const [medium, setMedium] = useState<UtmMedium>("organic-social");
  const [campaign, setCampaign] = useState("");
  const [content, setContent] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function handleBuild(e: React.FormEvent) {
    e.preventDefault();
    setCopied(false);
    try {
      setResult(buildUtmUrl(baseUrl, { source, medium, campaign, content: content || undefined }));
      setError(null);
    } catch (err) {
      setResult(null);
      setError(err instanceof InvalidUtmUrlError ? err.message : "Unable to build that URL.");
    }
  }

  async function handleCopy() {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <Panel title="UTM Builder">
      <p style={{ fontSize: 12, color: "var(--text-soft)", marginBottom: 14 }}>
        Every social link should use one of these canonical source/medium values so Shopify&apos;s campaign reports can group them —
        <code style={{ marginLeft: 4 }}>instagram</code>/<code>facebook</code>/<code>tiktok</code>/<code>pinterest</code> as source, never &quot;IG&quot; or &quot;Instagram&quot; variants.
      </p>
      <form onSubmit={handleBuild} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, alignItems: "end" }}>
        <div style={{ gridColumn: "span 2" }}>
          <label style={labelStyle}>Destination URL</label>
          <input type="text" required value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Source</label>
          <select value={source} onChange={(e) => setSource(e.target.value as UtmSource)} style={inputStyle}>
            {UTM_SOURCES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Medium</label>
          <select value={medium} onChange={(e) => setMedium(e.target.value as UtmMedium)} style={inputStyle}>
            {UTM_MEDIUMS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Campaign</label>
          <input type="text" required placeholder="fall-launch" value={campaign} onChange={(e) => setCampaign(e.target.value)} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Content (optional)</label>
          <input type="text" placeholder="video-a" value={content} onChange={(e) => setContent(e.target.value)} style={inputStyle} />
        </div>
        <button
          type="submit"
          className="font-mono"
          style={{ border: "1px solid var(--accent)", background: "var(--accent)", color: "var(--on-accent)", padding: "9px 16px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer" }}
        >
          Build Link
        </button>
      </form>

      {error && <p style={{ color: "var(--negative)", fontSize: 12, marginTop: 12 }}>{error}</p>}

      {result && (
        <div style={{ marginTop: 16, padding: 12, background: "var(--surface-alt)", borderRadius: 8, display: "flex", alignItems: "center", gap: 12 }}>
          <code style={{ fontSize: 12, wordBreak: "break-all", flex: 1 }}>{result}</code>
          <button
            type="button"
            onClick={handleCopy}
            className="font-mono"
            style={{ border: "1px solid var(--border)", background: "none", color: "var(--text)", padding: "6px 12px", borderRadius: 6, fontSize: 11, cursor: "pointer", whiteSpace: "nowrap" }}
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
      )}
    </Panel>
  );
}

export default function SocialIntelligencePage() {
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [attribution, setAttribution] = useState<AttributionResult | null>(null);
  const [attributionLoading, setAttributionLoading] = useState(true);

  const loadPosts = useCallback(async () => {
    const res = await fetch("/api/marketing/social", { cache: "no-store" });
    if (res.ok) setPosts((await res.json()).posts);
    setPostsLoading(false);
  }, []);

  const loadAttribution = useCallback(async () => {
    const res = await fetch("/api/social-intelligence/attribution", { cache: "no-store" });
    if (res.ok) setAttribution(await res.json());
    setAttributionLoading(false);
  }, []);

  useEffect(() => {
    loadPosts();
    loadAttribution();
  }, [loadPosts, loadAttribution]);

  const scores = useMemo(() => {
    const map = new Map<number, { score: number | null; hasRevenueSignal: boolean }>();
    for (const s of scoreSocialPosts(posts.map((p) => ({ id: p.id, revenueAttributed: p.revenue_attributed, linkClicks: p.link_clicks, likes: p.likes, comments: p.comments, shares: p.shares })))) {
      map.set(s.id, s);
    }
    return map;
  }, [posts]);

  const hasAnyRevenueSignal = posts.some((p) => p.revenue_attributed > 0);
  const attributionRows = attribution?.rows ?? [];

  return (
    <Page
      title="Social & Conversion Intelligence"
      description="Phase 1 — real Shopify data plus manually-logged posts. Trend intelligence and AI recommendations are not built yet; this covers UTM tracking, Shopify attribution, and a content-performance score based only on real numbers."
    >
      <UtmBuilder />

      <Panel title="Shopify Campaign Attribution (Live, 180d)">
        {attributionLoading ? (
          <p style={{ color: "var(--text-soft)", fontSize: 13 }}>Loading…</p>
        ) : !attribution?.configured ? (
          <p style={{ fontSize: 13, color: "var(--text-soft)" }}>
            Shopify is not connected. Set <code>SHOPIFY_STORE_DOMAIN</code>, <code>SHOPIFY_CLIENT_ID</code>, and <code>SHOPIFY_CLIENT_SECRET</code> to pull real UTM-tagged campaign traffic here.
          </p>
        ) : attributionRows.length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--text-soft)" }}>
            No UTM-tagged sessions or orders in the trailing 180 days. This is a real result, not an error — Shopify only reports campaign
            attribution for traffic that arrives through a tagged link. Use the UTM Builder above when sharing social links, then check
            back here once that traffic starts arriving.
          </p>
        ) : (
          <DataTable
            emptyText="No campaign attribution data."
            rows={attributionRows}
            columns={[
              { header: "Campaign", render: (r) => r.utmCampaign },
              { header: "Source", render: (r) => r.utmSource },
              { header: "Medium", render: (r) => r.utmMedium },
              { header: "Sessions", render: (r) => formatNumber(r.sessions), align: "right" },
              { header: "Conv. Rate", render: (r) => `${(r.conversionRate * 100).toFixed(1)}%`, align: "right" },
              { header: "Orders", render: (r) => formatNumber(r.orders), align: "right" },
              { header: "Sales", render: (r) => formatCurrency(r.sales), align: "right" },
              { header: "AOV", render: (r) => formatCurrency(r.averageOrderValue), align: "right" },
            ]}
          />
        )}
      </Panel>

      <Panel title="Content Performance Analysis">
        {!hasAnyRevenueSignal && posts.length > 0 && (
          <p style={{ fontSize: 12, color: "var(--warning)", marginBottom: 14 }}>
            No post in this list has attributed revenue yet, so scores below are based on clicks and engagement only — treat them as a
            traffic ranking, not a conversion ranking, until revenue is logged (via the Social Media page) or real UTM sales data starts
            flowing through.
          </p>
        )}
        {postsLoading ? (
          <p style={{ color: "var(--text-soft)", fontSize: 13 }}>Loading…</p>
        ) : (
          <DataTable
            emptyText="No posts logged yet — add one on the Social Media page."
            rows={posts}
            columns={[
              { header: "Date", render: (p) => formatDate(p.posted_date) },
              { header: "Platform", render: (p) => <span style={{ textTransform: "capitalize" }}>{p.platform}</span> },
              { header: "Caption", render: (p) => <span style={{ color: "var(--text-soft)" }}>{p.caption?.slice(0, 60) ?? "—"}</span> },
              { header: "UTM Campaign", render: (p) => p.utm_campaign ?? "—" },
              { header: "Engagement", render: (p) => formatNumber(p.likes + p.comments + p.shares), align: "right" },
              { header: "Clicks", render: (p) => formatNumber(p.link_clicks), align: "right" },
              { header: "Revenue", render: (p) => (p.revenue_attributed > 0 ? formatCurrency(p.revenue_attributed) : "—"), align: "right" },
              {
                header: "Conversion Score",
                render: (p) => {
                  const s = scores.get(p.id);
                  if (!s || s.score === null) return <Badge variant="outline">Insufficient data</Badge>;
                  const label = `${s.score}${!s.hasRevenueSignal ? " (traffic only)" : ""}`;
                  return <Badge variant={s.hasRevenueSignal ? "neutral" : "outline"}>{label}</Badge>;
                },
                align: "right",
              },
            ]}
          />
        )}
      </Panel>
    </Page>
  );
}
