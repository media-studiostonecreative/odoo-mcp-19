// dashboard/src/app/social-intelligence/page.tsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Page } from "@/components/ui/Page";
import { Panel } from "@/components/ui/Panel";
import { DataTable } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/Badge";
import { MonthCalendar, type CalendarDayEntry } from "@/components/ui/MonthCalendar";
import {
  buildCalendarEntries,
  upcomingDeadlineAlerts,
  type CalendarEntry,
  type CalendarEntryType,
  type CalendarOccasion,
  type CalendarTradeShow,
  type CalendarContentIdea,
} from "@/lib/social/calendarEntries";
import { formatNumber, formatCurrency, formatDate } from "@/lib/format";
import { scoreSocialPosts } from "@/lib/social/scoring";
import { buildUtmUrl, UTM_SOURCES, UTM_MEDIUMS, InvalidUtmUrlError, type UtmSource, type UtmMedium } from "@/lib/social/utm";
import { scoreTrendFit, hedgeForClassification, type TrendFactors } from "@/lib/social/trendScore";
import { TREND_PROVIDERS } from "@/lib/social/trendProviders";
import { evaluateLearningLoopOutcome } from "@/lib/social/learningLoopOutcome";
import type { HashtagEntry, ContentIdeaType, ContentIdeaConfidence, ContentIdeaStatus, ContentIdeaFormat } from "@/lib/social/contentIdeas";
import { POSTING_TIME_RESEARCH_NOTE } from "@/lib/social/postingTimes";

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

interface TrendRecommendation {
  id: number;
  trend_observation_id: number | null;
  term: string;
  score_at_recommendation: number;
  classification_at_recommendation: string;
  recommended_date: string;
  linked_social_post_id: number | null;
}

type InsightConfidence = "high" | "promising" | "experimental" | "insufficient";
type InsightKind = "fact" | "inference" | "recommendation";

interface Insight {
  id: string;
  kind: InsightKind;
  confidence: InsightConfidence;
  text: string;
}

const INSIGHT_KIND_LABEL: Record<InsightKind, string> = { fact: "Fact", inference: "Inference", recommendation: "Recommendation" };
const CONFIDENCE_LABEL: Record<InsightConfidence, string> = {
  high: "High confidence",
  promising: "Promising test",
  experimental: "Experimental",
  insufficient: "Insufficient data",
};

function AutoInsightsPanel() {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [postCount, setPostCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/social-intelligence/auto-insights", { cache: "no-store" });
    if (res.ok) {
      const body = await res.json();
      setInsights(body.insights);
      setPostCount(body.postCount);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <Panel
      title="Automated Feedback & Suggestions"
      headerAction={
        <button type="button" onClick={load} className="font-mono" style={{ ...inputStyle, width: "auto", cursor: "pointer", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>
          Refresh
        </button>
      }
    >
      <p style={{ fontSize: 12, color: "var(--text-soft)", marginBottom: 14 }}>
        Generated automatically from real, already-imported data (Meta Business Suite insights + Shopify UTM attribution) — no manual
        logging required. This follows the studiostone-social-conversion-analyst skill&apos;s rules: revenue/orders always lead over
        engagement, and every item is labeled fact, inference, or recommendation with a confidence level, never a bare verdict. Live trend
        providers aren&apos;t connected yet, so this reflects performance of what&apos;s already been posted, not forward-looking trend
        research — use the Trend Observation tool below for that.
      </p>
      {loading ? (
        <p style={{ color: "var(--text-soft)", fontSize: 13 }}>Loading…</p>
      ) : insights.length === 0 ? (
        <p style={{ fontSize: 13, color: "var(--text-soft)" }}>
          {postCount === 0
            ? "No posts or platform insights imported yet — upload a Meta Business Suite export on the Social Media page."
            : "No notable patterns found yet."}
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {insights.map((insight) => (
            <div key={insight.id} className="bracket-panel" style={{ padding: 14, display: "flex", gap: 12, alignItems: "flex-start" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 4, flexShrink: 0, minWidth: 130 }}>
                <Badge variant="outline">{INSIGHT_KIND_LABEL[insight.kind]}</Badge>
                <Badge variant={insight.confidence === "high" ? "neutral" : "outline"}>{CONFIDENCE_LABEL[insight.confidence]}</Badge>
              </div>
              <p style={{ fontSize: 13, margin: 0, lineHeight: 1.5 }}>{insight.text}</p>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}

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

interface ContentIdea {
  id: number;
  idea_type: ContentIdeaType;
  source_post_id: number | null;
  occasion_id: string | null;
  target_date: string | null;
  suggested_time: string | null;
  platform: string;
  format: ContentIdeaFormat;
  product: string;
  product_handle: string | null;
  pillar: string | null;
  hook: string | null;
  caption: string;
  hashtags: HashtagEntry[];
  cta: string | null;
  reasoning: string;
  confidence: ContentIdeaConfidence;
  inventory_verified: boolean;
  status: ContentIdeaStatus;
}

const IDEA_TYPE_LABEL: Record<ContentIdeaType, string> = { repost: "Repost", refresh: "Refresh", new: "New" };
const IDEA_FORMAT_LABEL: Record<ContentIdeaFormat, string> = { photo: "Photo", reel: "Reel", carousel: "Carousel", story: "Story" };
const IDEA_STATUS_ACTIONS: { status: ContentIdeaStatus; label: string }[] = [
  { status: "approved", label: "Approve" },
  { status: "used", label: "Mark Used" },
  { status: "dismissed", label: "Dismiss" },
];

const COLLAPSED_IDEA_COUNT = 4;

function ContentIdeasPanel({ ideas, loading, onChanged }: { ideas: ContentIdea[]; loading: boolean; onChanged: () => void }) {
  const [expanded, setExpanded] = useState(false);

  async function handleStatus(id: number, status: ContentIdeaStatus) {
    await fetch(`/api/social-intelligence/content-ideas/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    onChanged();
  }

  async function handleDelete(id: number) {
    await fetch(`/api/social-intelligence/content-ideas/${id}`, { method: "DELETE" });
    onChanged();
  }

  const active = ideas.filter((i) => i.status !== "dismissed" && i.status !== "used");
  const visible = expanded ? active : active.slice(0, COLLAPSED_IDEA_COUNT);

  return (
    <Panel
      title="Content Ideas"
      headerAction={
        active.length > COLLAPSED_IDEA_COUNT && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="font-mono"
            style={{ ...inputStyle, width: "auto", cursor: "pointer", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}
          >
            {expanded ? `Show Top ${COLLAPSED_IDEA_COUNT}` : `Show All (${active.length})`}
          </button>
        )
      }
    >
      <p style={{ fontSize: 12, color: "var(--text-soft)", marginBottom: 14 }}>
        Repost/refresh/new content ideas, written by asking Claude to act as a social media specialist against real post performance and
        real Shopify inventory — not a live, on-demand AI generator wired into this button. Ask for more anytime and they&apos;ll appear
        here for review. Suggested times are general industry research (Buffer/Later/Sprout Social), not measured from this account&apos;s
        own audience — see the caveat on hover.
      </p>
      {loading ? (
        <p style={{ color: "var(--text-soft)", fontSize: 13 }}>Loading…</p>
      ) : active.length === 0 ? (
        <p style={{ fontSize: 13, color: "var(--text-soft)" }}>No open content ideas — ask Claude to generate some.</p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12, alignItems: "start" }}>
          {visible.map((idea) => (
            <div key={idea.id} className="bracket-panel" style={{ padding: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, gap: 12, flexWrap: "wrap" }}>
                <div>
                  <Badge variant="outline">{IDEA_TYPE_LABEL[idea.idea_type]}</Badge>
                  <span style={{ marginLeft: 6 }}>
                    <Badge variant="neutral">{IDEA_FORMAT_LABEL[idea.format]}</Badge>
                  </span>
                  <strong style={{ fontSize: 14, marginLeft: 8 }}>{idea.product}</strong>
                  <span style={{ color: "var(--text-soft)", fontSize: 12, marginLeft: 8, textTransform: "capitalize" }}>{idea.platform}</span>
                  {!idea.inventory_verified && (
                    <span style={{ marginLeft: 8 }}>
                      <Badge variant="outline">Inventory unverified</Badge>
                    </span>
                  )}
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <Badge variant={idea.confidence === "high" ? "neutral" : "outline"}>{CONFIDENCE_LABEL[idea.confidence]}</Badge>
                  {idea.target_date && (
                    <span className="font-mono" style={{ fontSize: 11, color: "var(--text-soft)" }} title={idea.suggested_time ? POSTING_TIME_RESEARCH_NOTE : undefined}>
                      {formatDate(idea.target_date)}
                      {idea.suggested_time ? ` · ${idea.suggested_time}` : ""}
                    </span>
                  )}
                </div>
              </div>
              {idea.hook && <p style={{ fontSize: 13, fontStyle: "italic", margin: "0 0 6px" }}>&quot;{idea.hook}&quot;</p>}
              <p style={{ fontSize: 13, margin: "0 0 8px", lineHeight: 1.5 }}>{idea.caption}</p>
              {idea.hashtags.length > 0 && (
                <p style={{ fontSize: 12, color: "var(--text-soft)", margin: "0 0 8px" }}>
                  {idea.hashtags.map((h) => h.tag).join(" ")}
                </p>
              )}
              {idea.cta && (
                <p style={{ fontSize: 12, margin: "0 0 8px" }}>
                  <strong>CTA:</strong> {idea.cta}
                </p>
              )}
              <p style={{ fontSize: 12, color: "var(--text-soft)", margin: "0 0 10px", lineHeight: 1.5 }}>{idea.reasoning}</p>
              <div style={{ display: "flex", gap: 8 }}>
                {IDEA_STATUS_ACTIONS.map((a) => (
                  <button
                    key={a.status}
                    type="button"
                    onClick={() => handleStatus(idea.id, a.status)}
                    className="font-mono"
                    style={{ border: "1px solid var(--border)", background: "none", color: "var(--text)", padding: "5px 10px", borderRadius: 6, fontSize: 11, cursor: "pointer" }}
                  >
                    {a.label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => handleDelete(idea.id)}
                  className="font-mono"
                  style={{ border: "none", background: "transparent", color: "var(--negative)", fontSize: 11, cursor: "pointer" }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}

const CALENDAR_TYPE_LABEL: Record<CalendarEntryType, string> = {
  occasion: "Occasion",
  "trade-show": "Event",
  "content-idea": "Content Idea",
  "post-deadline": "Post-By Deadline",
};

const CALENDAR_TYPE_COLOR: Record<CalendarEntryType, string> = {
  occasion: "rgba(122, 162, 255, 0.28)",
  "trade-show": "rgba(255, 158, 87, 0.28)",
  "content-idea": "rgba(120, 220, 160, 0.28)",
  "post-deadline": "rgba(240, 201, 117, 0.32)",
};

const EMPTY_TRADE_SHOW_FORM = { name: "", location: "", start_date: "", end_date: "", lead_days: "10", notes: "" };

function DeadlineAlertsBanner({ entries }: { entries: CalendarEntry[] }) {
  const alerts = useMemo(() => upcomingDeadlineAlerts(entries, 2), [entries]);
  if (alerts.length === 0) return null;
  return (
    <div className="bracket-panel" style={{ padding: 16, marginBottom: 20, borderColor: "var(--warning)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <Badge variant="outline">Deadline in ≤2 days</Badge>
        <strong style={{ fontSize: 13 }}>Post-by deadlines coming up</strong>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {alerts.map((a) => (
          <p key={a.key} style={{ fontSize: 12.5, margin: 0 }}>
            <span className="font-mono" style={{ color: "var(--warning)" }}>{formatDate(a.date)}</span> — {a.detail}
          </p>
        ))}
      </div>
    </div>
  );
}

function ContentCalendarPanel({ entries, loading, onChanged }: { entries: CalendarEntry[]; loading: boolean; onChanged: () => void }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_TRADE_SHOW_FORM);
  const [saving, setSaving] = useState(false);
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  async function handleAddTradeShow(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch("/api/social-intelligence/trade-shows", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        location: form.location || null,
        start_date: form.start_date,
        end_date: form.end_date || null,
        lead_days: Number(form.lead_days) || 10,
        notes: form.notes || null,
      }),
    });
    setSaving(false);
    setForm(EMPTY_TRADE_SHOW_FORM);
    setShowForm(false);
    onChanged();
  }

  async function handleDeleteTradeShow(id: number) {
    await fetch(`/api/social-intelligence/trade-shows/${id}`, { method: "DELETE" });
    onChanged();
  }

  const entriesByDate = useMemo(() => {
    const map: Record<string, CalendarEntry[]> = {};
    for (const e of entries) {
      (map[e.date] ??= []).push(e);
    }
    return map;
  }, [entries]);

  const calendarDayEntries: Record<string, CalendarDayEntry[]> = useMemo(() => {
    const map: Record<string, CalendarDayEntry[]> = {};
    for (const [date, dayEntries] of Object.entries(entriesByDate)) {
      map[date] = dayEntries.map((e) => ({ id: e.key, label: e.label, kind: e.type }));
    }
    return map;
  }, [entriesByDate]);

  const selectedEntries = selectedDate ? (entriesByDate[selectedDate] ?? []) : [];

  return (
    <Panel
      title="Content Calendar"
      headerAction={
        <button type="button" onClick={() => setShowForm((v) => !v)} className="font-mono" style={{ ...inputStyle, width: "auto", cursor: "pointer", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>
          {showForm ? "Cancel" : "+ Add Event"}
        </button>
      }
    >
      <p style={{ fontSize: 12, color: "var(--text-soft)", marginBottom: 14 }}>
        Holidays (computed, never guessed), trade shows and other dated events (media appearances, sponsorships), content ideas, and their
        post-by deadlines. Click any day for details.
      </p>
      {showForm && (
        <form onSubmit={handleAddTradeShow} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 16, padding: 16, border: "1px dashed var(--border)", borderRadius: 10 }}>
          <div>
            <label style={labelStyle}>Event Name</label>
            <input type="text" required placeholder="e.g. Circle Craft, TV feature" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Location</label>
            <input type="text" placeholder="e.g. Vancouver, BC" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Start Date</label>
            <input type="date" required value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>End Date</label>
            <input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Post-By Lead Time (days)</label>
            <input type="number" min={0} value={form.lead_days} onChange={(e) => setForm({ ...form, lead_days: e.target.value })} style={inputStyle} />
          </div>
          <div style={{ gridColumn: "span 2" }}>
            <label style={labelStyle}>Notes</label>
            <input type="text" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} style={inputStyle} />
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
      {loading ? (
        <p style={{ color: "var(--text-soft)", fontSize: 13 }}>Loading…</p>
      ) : (
        <>
          <div style={{ display: "flex", gap: 14, marginBottom: 14, flexWrap: "wrap" }}>
            {(Object.keys(CALENDAR_TYPE_LABEL) as CalendarEntryType[]).map((k) => (
              <span key={k} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--text-soft)" }}>
                <span style={{ width: 10, height: 10, borderRadius: 3, background: CALENDAR_TYPE_COLOR[k], display: "inline-block" }} />
                {CALENDAR_TYPE_LABEL[k]}
              </span>
            ))}
          </div>
          <MonthCalendar
            year={viewYear}
            month={viewMonth}
            entriesByDate={calendarDayEntries}
            selectedDate={selectedDate}
            onPrevMonth={() => {
              const d = new Date(Date.UTC(viewYear, viewMonth - 1, 1));
              setViewYear(d.getUTCFullYear());
              setViewMonth(d.getUTCMonth());
            }}
            onNextMonth={() => {
              const d = new Date(Date.UTC(viewYear, viewMonth + 1, 1));
              setViewYear(d.getUTCFullYear());
              setViewMonth(d.getUTCMonth());
            }}
            onSelectDay={(iso) => setSelectedDate(iso === selectedDate ? null : iso)}
            kindColor={(kind) => CALENDAR_TYPE_COLOR[kind as CalendarEntryType] ?? "var(--surface-alt)"}
          />
          {selectedDate && (
            <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }} onClick={() => setSelectedDate(null)}>
              <div
                className="bracket-panel"
                style={{ maxWidth: 480, width: "90%", maxHeight: "70vh", overflowY: "auto", padding: 20, background: "var(--surface)" }}
                onClick={(e) => e.stopPropagation()}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                  <strong style={{ fontSize: 15 }}>{formatDate(selectedDate)}</strong>
                  <button type="button" onClick={() => setSelectedDate(null)} style={{ border: "none", background: "transparent", color: "var(--text-soft)", cursor: "pointer", fontSize: 18, lineHeight: 1 }}>
                    ×
                  </button>
                </div>
                {selectedEntries.length === 0 ? (
                  <p style={{ fontSize: 13, color: "var(--text-soft)" }}>Nothing on this day.</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {selectedEntries.map((e) => (
                      <div key={e.key} style={{ borderLeft: `3px solid ${CALENDAR_TYPE_COLOR[e.type]}`, paddingLeft: 10 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                          <Badge variant="outline">{CALENDAR_TYPE_LABEL[e.type]}</Badge>
                          <strong style={{ fontSize: 13 }}>{e.label}</strong>
                        </div>
                        <p style={{ fontSize: 12.5, color: "var(--text-soft)", margin: 0, lineHeight: 1.5 }}>{e.detail}</p>
                        {e.deletableTradeShowId != null && (
                          <button
                            type="button"
                            onClick={() => handleDeleteTradeShow(e.deletableTradeShowId!)}
                            className="font-mono"
                            style={{ border: "none", background: "transparent", color: "var(--negative)", cursor: "pointer", fontSize: 11, padding: 0, marginTop: 6 }}
                          >
                            Delete this trade show
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </Panel>
  );
}

type TabKey = "overview" | "content" | "performance" | "trends";
const TABS: { key: TabKey; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "content", label: "Content & Planning" },
  { key: "performance", label: "Performance" },
  { key: "trends", label: "Trend Research" },
];

export default function SocialIntelligencePage() {
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [attribution, setAttribution] = useState<AttributionResult | null>(null);
  const [attributionLoading, setAttributionLoading] = useState(true);
  const [observations, setObservations] = useState<TrendObservation[]>([]);
  const [observationsLoading, setObservationsLoading] = useState(true);
  const [recommendations, setRecommendations] = useState<TrendRecommendation[]>([]);
  const [recommendationsLoading, setRecommendationsLoading] = useState(true);
  const [contentIdeas, setContentIdeas] = useState<ContentIdea[]>([]);
  const [contentIdeasLoading, setContentIdeasLoading] = useState(true);
  const [occasions, setOccasions] = useState<CalendarOccasion[]>([]);
  const [tradeShows, setTradeShows] = useState<CalendarTradeShow[]>([]);
  const [calendarLoading, setCalendarLoading] = useState(true);
  const [tab, setTab] = useState<TabKey>("overview");

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

  const loadRecommendations = useCallback(async () => {
    const res = await fetch("/api/social-intelligence/recommendations", { cache: "no-store" });
    if (res.ok) setRecommendations((await res.json()).recommendations);
    setRecommendationsLoading(false);
  }, []);

  const loadContentIdeas = useCallback(async () => {
    const res = await fetch("/api/social-intelligence/content-ideas", { cache: "no-store" });
    if (res.ok) setContentIdeas((await res.json()).ideas);
    setContentIdeasLoading(false);
  }, []);

  const loadCalendar = useCallback(async () => {
    const [occRes, showsRes] = await Promise.all([
      fetch("/api/social-intelligence/occasions", { cache: "no-store" }),
      fetch("/api/social-intelligence/trade-shows", { cache: "no-store" }),
    ]);
    if (occRes.ok) setOccasions((await occRes.json()).occasions);
    if (showsRes.ok) setTradeShows((await showsRes.json()).tradeShows);
    setCalendarLoading(false);
  }, []);

  useEffect(() => {
    loadPosts();
    loadAttribution();
    loadObservations();
    loadRecommendations();
    loadContentIdeas();
    loadCalendar();
  }, [loadPosts, loadAttribution, loadObservations, loadRecommendations, loadContentIdeas, loadCalendar]);

  async function handleDeleteObservation(id: number) {
    await fetch(`/api/social-intelligence/trends/${id}`, { method: "DELETE" });
    loadObservations();
  }

  async function handleLogRecommendation(observation: TrendObservation, score: number, classification: string) {
    await fetch("/api/social-intelligence/recommendations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        trend_observation_id: observation.id,
        term: observation.term,
        score_at_recommendation: score,
        classification_at_recommendation: classification,
      }),
    });
    loadRecommendations();
  }

  async function handleLinkRecommendation(id: number, socialPostId: number | null) {
    await fetch(`/api/social-intelligence/recommendations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ linked_social_post_id: socialPostId }),
    });
    loadRecommendations();
  }

  async function handleDeleteRecommendation(id: number) {
    await fetch(`/api/social-intelligence/recommendations/${id}`, { method: "DELETE" });
    loadRecommendations();
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

  const contentIdeasLite: CalendarContentIdea[] = useMemo(
    () => contentIdeas.map((i) => ({ id: i.id, idea_type: i.idea_type, target_date: i.target_date, product: i.product, platform: i.platform, status: i.status })),
    [contentIdeas],
  );

  const calendarEntries = useMemo(
    () => buildCalendarEntries(occasions, tradeShows, contentIdeasLite),
    [occasions, tradeShows, contentIdeasLite],
  );

  return (
    <Page
      title="Social & Conversion Intelligence"
      description="Phase 1: real Shopify data plus manually-logged posts (UTM tracking, attribution, content performance). Phase 2: manually-researched trend fit scoring. Phase 3 (live trend providers, a learning loop comparing expected vs. actual outcomes) is not built — it depends on trend-API access this project doesn't have yet."
    >
      {!calendarLoading && <DeadlineAlertsBanner entries={calendarEntries} />}

      <div style={{ display: "flex", gap: 4, marginBottom: 20, flexWrap: "wrap" }}>
        {TABS.map((t) => {
          const active = t.key === tab;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className="font-mono"
              style={{
                border: `1px solid ${active ? "var(--border-strong)" : "var(--border)"}`,
                background: active ? "var(--surface)" : "var(--surface-alt)",
                color: active ? "var(--text)" : "var(--text-soft)",
                padding: "8px 14px",
                borderRadius: 8,
                fontSize: 11,
                textTransform: "uppercase",
                letterSpacing: 0.5,
                cursor: "pointer",
                fontWeight: active ? 600 : 400,
              }}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === "overview" && <AutoInsightsPanel />}

      {tab === "content" && (
        <>
          <ContentIdeasPanel ideas={contentIdeas} loading={contentIdeasLoading} onChanged={loadContentIdeas} />
          <ContentCalendarPanel entries={calendarEntries} loading={calendarLoading} onChanged={loadCalendar} />
          <UtmBuilder />
        </>
      )}

      {tab === "performance" && (
        <>
          <Panel title="Shopify Campaign Attribution (Live, 180d)">
            {attributionLoading ? (
              <p style={{ color: "var(--text-soft)", fontSize: 13 }}>Loading…</p>
            ) : !attribution?.configured ? (
              <p style={{ fontSize: 13, color: "var(--text-soft)" }}>
                Shopify is not connected. Set <code>SHOPIFY_STORE_DOMAIN</code>, <code>SHOPIFY_CLIENT_ID</code>, and <code>SHOPIFY_CLIENT_SECRET</code> to pull real UTM-tagged campaign traffic here.
              </p>
            ) : attributionRows.length === 0 ? (
              <p style={{ fontSize: 13, color: "var(--text-soft)" }}>
                No UTM-tagged sessions or orders in the trailing 180 days. This is a real result, not an error — Shopify only reports
                campaign attribution for traffic that arrives through a tagged link. Use the UTM Builder (Content & Planning tab) when
                sharing social links, then check back here once that traffic starts arriving.
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
                traffic ranking, not a conversion ranking, until revenue is logged (via the Social Media page) or real UTM sales data
                starts flowing through.
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
        </>
      )}

      {tab === "trends" && (
        <>
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
                    <div style={{ marginTop: 10 }}>
                      <button
                        type="button"
                        onClick={() => handleLogRecommendation(observation, result.score, result.classification)}
                        className="font-mono"
                        style={{ border: "1px solid var(--border)", background: "none", color: "var(--text)", padding: "5px 10px", borderRadius: 6, fontSize: 11, cursor: "pointer" }}
                      >
                        Log as Recommendation
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          <Panel title="Learning Loop">
            <p style={{ fontSize: 12, color: "var(--text-soft)", marginBottom: 14 }}>
              Compares what a recommendation predicted against what actually happened once real content is published and logged. Link
              each recommendation to the social post that came out of it (on the Social Media page) to see its real outcome — a single
              linked post is never enough to draw a conclusion or adjust future scoring, so every comparison here says so explicitly.
            </p>
            {recommendationsLoading ? (
              <p style={{ color: "var(--text-soft)", fontSize: 13 }}>Loading…</p>
            ) : (
              <DataTable
                emptyText='No recommendations logged yet — use "Log as Recommendation" above.'
                rows={recommendations}
                columns={[
                  { header: "Recommended", render: (r) => formatDate(r.recommended_date) },
                  { header: "Term", render: (r) => r.term },
                  { header: "Predicted", render: (r) => <Badge variant="outline">{`${r.classification_at_recommendation} (${r.score_at_recommendation})`}</Badge> },
                  {
                    header: "Linked Post",
                    render: (r) => (
                      <select
                        value={r.linked_social_post_id ?? ""}
                        onChange={(e) => handleLinkRecommendation(r.id, e.target.value ? Number(e.target.value) : null)}
                        style={{ ...inputStyle, width: "auto" }}
                      >
                        <option value="">— not linked —</option>
                        {posts.map((p) => (
                          <option key={p.id} value={p.id}>
                            {formatDate(p.posted_date)} · {p.platform} · {p.caption?.slice(0, 30) ?? `post #${p.id}`}
                          </option>
                        ))}
                      </select>
                    ),
                  },
                  {
                    header: "Outcome",
                    render: (r) => {
                      const linkedPost = posts.find((p) => p.id === r.linked_social_post_id) ?? null;
                      const outcome = evaluateLearningLoopOutcome(
                        linkedPost
                          ? { revenueAttributed: linkedPost.revenue_attributed, linkClicks: linkedPost.link_clicks, likes: linkedPost.likes, comments: linkedPost.comments, shares: linkedPost.shares }
                          : null,
                      );
                      return (
                        <span style={{ fontSize: 11.5, color: "var(--text-soft)" }} title={outcome.note}>
                          {outcome.outcome === "converted" && <Badge variant="neutral">Converted</Badge>}
                          {outcome.outcome === "engaged-no-revenue" && <Badge variant="outline">Engaged, no revenue</Badge>}
                          {outcome.outcome === "no-engagement" && <Badge variant="outline">No engagement</Badge>}
                          {outcome.outcome === "awaiting-outcome" && <Badge variant="outline">Awaiting outcome</Badge>}
                        </span>
                      );
                    },
                  },
                  {
                    header: "",
                    render: (r) => (
                      <button type="button" onClick={() => handleDeleteRecommendation(r.id)} style={{ border: "none", background: "transparent", color: "var(--negative)", cursor: "pointer", fontSize: 12 }}>
                        Delete
                      </button>
                    ),
                    align: "right",
                  },
                ]}
              />
            )}
          </Panel>
        </>
      )}
    </Page>
  );
}
