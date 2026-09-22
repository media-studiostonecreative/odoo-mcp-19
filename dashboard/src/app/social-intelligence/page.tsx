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
import { scoreTrendFit, hedgeForClassification, type TrendFactors } from "@/lib/social/trendScore";
import { TREND_PROVIDERS } from "@/lib/social/trendProviders";

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

interface TrendObservation {
  id: number;
  term: string;
  platform: string | null;
  observed_date: string;
  product_relevance: number;
  commercial_intent: number;
  regional_momentum: number;
  historical_performance: number;
  seasonality_timing: number;
  content_suitability: number;
  inventory_availability: number;
  note: string | null;
  source_url: string | null;
}

const FACTOR_FIELDS: { key: keyof TrendFactors; label: string; bodyKey: string }[] = [
  { key: "productRelevance", label: "Product Relevance", bodyKey: "product_relevance" },
  { key: "commercialIntent", label: "Commercial Intent", bodyKey: "commercial_intent" },
  { key: "regionalMomentum", label: "Regional Momentum", bodyKey: "regional_momentum" },
  { key: "historicalPerformance", label: "Historical Performance", bodyKey: "historical_performance" },
  { key: "seasonalityTiming", label: "Seasonality/Timing", bodyKey: "seasonality_timing" },
  { key: "contentSuitability", label: "Content Suitability", bodyKey: "content_suitability" },
  { key: "inventoryAvailability", label: "Inventory Availability", bodyKey: "inventory_availability" },
];

function factorsFromObservation(o: TrendObservation): TrendFactors {
  return {
    productRelevance: o.product_relevance,
    commercialIntent: o.commercial_intent,
    regionalMomentum: o.regional_momentum,
    historicalPerformance: o.historical_performance,
    seasonalityTiming: o.seasonality_timing,
    contentSuitability: o.content_suitability,
    inventoryAvailability: o.inventory_availability,
  };
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

function TrendDataSources() {
  return (
    <Panel title="Trend Intelligence — Data Sources">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
        {TREND_PROVIDERS.map((p) => (
          <div key={p.id} className="bracket-panel" style={{ padding: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <span style={{ fontSize: 13 }}>{p.label}</span>
              <Badge variant={p.status === "connected" ? "neutral" : "outline"}>{p.status === "connected" ? "Connected" : "Not Configured"}</Badge>
            </div>
            <p style={{ fontSize: 11.5, color: "var(--text-soft)", margin: 0 }}>{p.note}</p>
          </div>
        ))}
      </div>
    </Panel>
  );
}

const EMPTY_TREND_FORM = {
  term: "",
  platform: "",
  observed_date: "",
  product_relevance: "50",
  commercial_intent: "50",
  regional_momentum: "50",
  historical_performance: "50",
  seasonality_timing: "50",
  content_suitability: "50",
  inventory_availability: "50",
  note: "",
  source_url: "",
};

function TrendObservationForm({ onSaved }: { onSaved: () => void }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_TREND_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const res = await fetch("/api/social-intelligence/trends", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        term: form.term,
        platform: form.platform || null,
        observed_date: form.observed_date,
        product_relevance: Number(form.product_relevance),
        commercial_intent: Number(form.commercial_intent),
        regional_momentum: Number(form.regional_momentum),
        historical_performance: Number(form.historical_performance),
        seasonality_timing: Number(form.seasonality_timing),
        content_suitability: Number(form.content_suitability),
        inventory_availability: Number(form.inventory_availability),
        note: form.note || null,
        source_url: form.source_url || null,
      }),
    });
    setSaving(false);
    if (res.ok) {
      setForm(EMPTY_TREND_FORM);
      setShowForm(false);
      onSaved();
    } else {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Unable to save observation.");
    }
  }

  return (
    <Panel
      title="Log a Trend Observation"
      headerAction={
        <button type="button" onClick={() => setShowForm((v) => !v)} className="font-mono" style={{ ...inputStyle, width: "auto", cursor: "pointer", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>
          {showForm ? "Cancel" : "+ Log Observation"}
        </button>
      }
    >
      <p style={{ fontSize: 12, color: "var(--text-soft)", marginBottom: showForm ? 14 : 0 }}>
        Each factor below is your own 0-100 judgment call, not a live metric — there is no connected trend provider yet (see Data Sources
        below). Product relevance matters most: a trend with weak product relevance can never score above &quot;Low Relevance&quot;, no
        matter how strong the other factors are.
      </p>
      {showForm && (
        <form onSubmit={handleSubmit} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginTop: 14, padding: 16, border: "1px dashed var(--border)", borderRadius: 10 }}>
          <div>
            <label style={labelStyle}>Term</label>
            <input type="text" required placeholder="e.g. dragon carving" value={form.term} onChange={(e) => setForm({ ...form, term: e.target.value })} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Platform (optional)</label>
            <input type="text" placeholder="e.g. pinterest" value={form.platform} onChange={(e) => setForm({ ...form, platform: e.target.value })} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Observed Date</label>
            <input type="date" required value={form.observed_date} onChange={(e) => setForm({ ...form, observed_date: e.target.value })} style={inputStyle} />
          </div>
          {FACTOR_FIELDS.map((f) => (
            <div key={f.bodyKey}>
              <label style={labelStyle}>{f.label} (0-100)</label>
              <input
                type="number"
                min={0}
                max={100}
                required
                value={form[f.bodyKey as keyof typeof form]}
                onChange={(e) => setForm({ ...form, [f.bodyKey]: e.target.value })}
                style={inputStyle}
              />
            </div>
          ))}
          <div style={{ gridColumn: "span 2" }}>
            <label style={labelStyle}>Note</label>
            <input type="text" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Source URL</label>
            <input type="text" value={form.source_url} onChange={(e) => setForm({ ...form, source_url: e.target.value })} style={inputStyle} />
          </div>
          <div style={{ display: "flex", alignItems: "flex-end" }}>
            <button
              type="submit"
              disabled={saving}
              className="font-mono"
              style={{ border: "1px solid var(--accent)", background: "var(--accent)", color: "var(--on-accent)", padding: "7px 13px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: saving ? "default" : "pointer", width: "100%" }}
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      )}
      {error && <p style={{ color: "var(--negative)", fontSize: 12, marginTop: 12 }}>{error}</p>}
    </Panel>
  );
}

export default function SocialIntelligencePage() {
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [attribution, setAttribution] = useState<AttributionResult | null>(null);
  const [attributionLoading, setAttributionLoading] = useState(true);
  const [observations, setObservations] = useState<TrendObservation[]>([]);
  const [observationsLoading, setObservationsLoading] = useState(true);

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

  const loadObservations = useCallback(async () => {
    const res = await fetch("/api/social-intelligence/trends", { cache: "no-store" });
    if (res.ok) setObservations((await res.json()).observations);
    setObservationsLoading(false);
  }, []);

  useEffect(() => {
    loadPosts();
    loadAttribution();
    loadObservations();
  }, [loadPosts, loadAttribution, loadObservations]);

  async function handleDeleteObservation(id: number) {
    await fetch(`/api/social-intelligence/trends/${id}`, { method: "DELETE" });
    loadObservations();
  }

  const scoredObservations = useMemo(
    () =>
      observations
        .map((o) => ({ observation: o, result: scoreTrendFit(factorsFromObservation(o)) }))
        .sort((a, b) => b.result.score - a.result.score),
    [observations],
  );

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
      description="Phase 1: real Shopify data plus manually-logged posts (UTM tracking, attribution, content performance). Phase 2: manually-researched trend fit scoring. Phase 3 (live trend providers, a learning loop comparing expected vs. actual outcomes) is not built — it depends on trend-API access this project doesn't have yet."
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

      <TrendDataSources />

      <TrendObservationForm onSaved={loadObservations} />

      <Panel title="Trend Observations">
        {observationsLoading ? (
          <p style={{ color: "var(--text-soft)", fontSize: 13 }}>Loading…</p>
        ) : (
          <DataTable
            emptyText="No trend observations logged yet."
            rows={scoredObservations}
            columns={[
              { header: "Date", render: (row) => formatDate(row.observation.observed_date) },
              { header: "Term", render: (row) => row.observation.term },
              { header: "Platform", render: (row) => row.observation.platform ?? "—" },
              { header: "Trend Fit Score", render: (row) => <Badge variant="neutral">{String(row.result.score)}</Badge>, align: "right" },
              { header: "Classification", render: (row) => <Badge variant={row.result.classification === "Ignore" || row.result.classification === "Low Relevance" ? "outline" : "neutral"}>{row.result.classification}</Badge> },
              {
                header: "",
                render: (row) => (
                  <button type="button" onClick={() => handleDeleteObservation(row.observation.id)} style={{ border: "none", background: "transparent", color: "var(--negative)", cursor: "pointer", fontSize: 12 }}>
                    Delete
                  </button>
                ),
                align: "right",
              },
            ]}
          />
        )}
      </Panel>

      <Panel title="What Should We Post Next?">
        <p style={{ fontSize: 12, color: "var(--text-soft)", marginBottom: 14 }}>
          Based only on manually-logged research below — no live trend provider is connected (see Data Sources above), so treat every
          entry here as a starting hypothesis to validate, not a confirmed opportunity.
        </p>
        {scoredObservations.length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--text-soft)" }}>Log a trend observation above to see recommendations here.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {scoredObservations.slice(0, 3).map(({ observation, result }) => (
              <div key={observation.id} className="bracket-panel" style={{ padding: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, gap: 12, flexWrap: "wrap" }}>
                  <div>
                    <strong style={{ fontSize: 14 }}>{observation.term}</strong>
                    {observation.platform && <span style={{ color: "var(--text-soft)", fontSize: 12, marginLeft: 8 }}>({observation.platform})</span>}
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <Badge variant="outline">{hedgeForClassification(result.classification)}</Badge>
                    <Badge variant="neutral">{result.classification}</Badge>
                    <span className="font-mono" style={{ fontSize: 12, color: "var(--text-soft)" }}>{result.score}/100</span>
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 6, marginBottom: observation.note ? 10 : 0 }}>
                  {FACTOR_FIELDS.map((f) => (
                    <span key={f.bodyKey} style={{ fontSize: 11, color: "var(--text-soft)" }}>
                      {f.label}: <span style={{ color: "var(--text)" }}>{observation[f.bodyKey as keyof TrendObservation]}</span>
                    </span>
                  ))}
                </div>
                {observation.note && <p style={{ fontSize: 12, color: "var(--text-soft)", margin: 0 }}>{observation.note}</p>}
              </div>
            ))}
          </div>
        )}
      </Panel>
    </Page>
  );
}
