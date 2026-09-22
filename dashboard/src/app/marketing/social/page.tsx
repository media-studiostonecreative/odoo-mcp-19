// dashboard/src/app/marketing/social/page.tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import { Page } from "@/components/ui/Page";
import { StatCard } from "@/components/ui/StatCard";
import { Panel } from "@/components/ui/Panel";
import { DataTable } from "@/components/ui/DataTable";
import { formatNumber, formatDate, formatCurrency } from "@/lib/format";

type Platform = "instagram" | "facebook" | "tiktok" | "pinterest";
type PlatformFilter = "all" | Platform;

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
  reach: number | null;
  utm_campaign: string | null;
  revenue_attributed: number;
}

interface PlatformInsightRow {
  platform: Platform;
  metric: string;
  period_start: string;
  period_end: string;
  value: number | null;
  unit: string | null;
  change_vs_prev_period_pct: number | null;
}

const PLATFORMS: Platform[] = ["instagram", "facebook", "tiktok", "pinterest"];

const inputStyle = { background: "var(--surface)", color: "var(--text)", border: "1px solid var(--border)", borderRadius: 8, padding: "7px 10px", fontSize: 12, width: "100%" };
const labelStyle = { fontSize: 11, color: "var(--text-soft)", textTransform: "uppercase" as const, letterSpacing: 0.5, marginBottom: 4, display: "block" };

const EMPTY_FORM = {
  posted_date: "",
  platform: "instagram" as Platform,
  post_type: "",
  caption: "",
  reach: "",
  likes: "",
  comments: "",
  shares: "",
  link_clicks: "",
  utm_source: "",
  utm_medium: "",
  utm_campaign: "",
  revenue_attributed: "",
};

export default function SocialMediaPage() {
  const [filter, setFilter] = useState<PlatformFilter>("all");
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [insights, setInsights] = useState<PlatformInsightRow[]>([]);
  const [insightsLoading, setInsightsLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [importMessage, setImportMessage] = useState<string | null>(null);

  const load = useCallback(async (platform: PlatformFilter) => {
    const qs = platform === "all" ? "" : `?platform=${platform}`;
    const res = await fetch(`/api/marketing/social${qs}`, { cache: "no-store" });
    if (res.ok) setPosts((await res.json()).posts);
    setLoading(false);
  }, []);

  const loadInsights = useCallback(async () => {
    const res = await fetch("/api/marketing/social/insights", { cache: "no-store" });
    if (res.ok) setInsights((await res.json()).insights);
    setInsightsLoading(false);
  }, []);

  useEffect(() => {
    setLoading(true);
    load(filter);
  }, [filter, load]);

  useEffect(() => {
    loadInsights();
  }, [loadInsights]);

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setImporting(true);
    setImportMessage(null);
    try {
      const csv = await file.text();
      const res = await fetch("/api/marketing/social/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv }),
      });
      if (res.ok) {
        const { result } = await res.json();
        setImportMessage(`Imported ${result.postsImported} post(s), skipped ${result.postsSkipped} already-imported post(s), updated ${result.summariesImported} summary metric(s).`);
        load(filter);
        loadInsights();
      } else {
        const body = await res.json().catch(() => ({}));
        setImportMessage(body.error ?? "Import failed.");
      }
    } finally {
      setImporting(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/marketing/social", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        posted_date: form.posted_date,
        platform: form.platform,
        post_type: form.post_type || null,
        caption: form.caption || null,
        reach: form.reach ? Number(form.reach) : null,
        likes: Number(form.likes) || 0,
        comments: Number(form.comments) || 0,
        shares: Number(form.shares) || 0,
        link_clicks: Number(form.link_clicks) || 0,
        utm_source: form.utm_source || null,
        utm_medium: form.utm_medium || null,
        utm_campaign: form.utm_campaign || null,
        revenue_attributed: Number(form.revenue_attributed) || 0,
      }),
    });
    setSaving(false);
    if (res.ok) {
      setForm(EMPTY_FORM);
      setShowForm(false);
      load(filter);
    }
  }

  async function handleDelete(id: number) {
    await fetch(`/api/marketing/social/${id}`, { method: "DELETE" });
    load(filter);
  }

  const totalEngagement = posts.reduce((sum, p) => sum + p.likes + p.comments + p.shares, 0);
  const totalClicks = posts.reduce((sum, p) => sum + p.link_clicks, 0);

  const insightsByPlatform = new Map<Platform, PlatformInsightRow[]>();
  for (const row of insights) {
    const list = insightsByPlatform.get(row.platform) ?? [];
    list.push(row);
    insightsByPlatform.set(row.platform, list);
  }

  return (
    <Page
      title="Social Media"
      description="Instagram/Facebook post and platform performance, imported from Meta Business Suite exports — plus a manual log for anything else (TikTok, Pinterest, or posts outside an export window)."
    >
      <Panel
        title="Import Insights CSV"
        headerAction={
          <label className="font-mono" style={{ ...inputStyle, width: "auto", cursor: importing ? "default" : "pointer", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, opacity: importing ? 0.6 : 1 }}>
            {importing ? "Importing…" : "Choose CSV"}
            <input type="file" accept=".csv,text/csv" onChange={handleImportFile} disabled={importing} style={{ display: "none" }} />
          </label>
        }
      >
        <p style={{ fontSize: 12, color: "var(--text-soft)", margin: 0 }}>
          Upload a Meta Business Suite insights export (Instagram or Facebook). Re-uploading the same or an overlapping export is safe —
          posts already imported are skipped, and summary metrics for a period are updated in place rather than duplicated.
        </p>
        {importMessage && <p style={{ fontSize: 12, color: "var(--text)", marginTop: 10 }}>{importMessage}</p>}
      </Panel>

      <Panel title="Platform Insights (Imported)">
        {insightsLoading ? (
          <p style={{ color: "var(--text-soft)", fontSize: 13 }}>Loading…</p>
        ) : insights.length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--text-soft)" }}>No platform insights imported yet — upload a CSV export above.</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 }}>
            {Array.from(insightsByPlatform.entries()).map(([platform, rows]) => (
              <div key={platform}>
                <p className="font-mono" style={{ fontSize: 11, color: "var(--text-soft)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>
                  {platform} — {formatDate(rows[0]!.period_start)} to {formatDate(rows[0]!.period_end)}
                </p>
                <DataTable
                  emptyText="No metrics."
                  rows={rows}
                  columns={[
                    { header: "Metric", render: (r) => r.metric },
                    {
                      header: "Value",
                      render: (r) => (r.value === null ? "—" : r.unit === "percent" ? `${r.value.toFixed(1)}%` : formatNumber(r.value)),
                      align: "right",
                    },
                    {
                      header: "vs Prev",
                      render: (r) => (r.change_vs_prev_period_pct === null ? "—" : <span style={{ color: r.change_vs_prev_period_pct >= 0 ? "var(--positive)" : "var(--negative)" }}>{r.change_vs_prev_period_pct >= 0 ? "+" : ""}{r.change_vs_prev_period_pct.toFixed(1)}%</span>),
                      align: "right",
                    },
                  ]}
                />
              </div>
            ))}
          </div>
        )}
      </Panel>

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 24 }}>
        <StatCard label="Posts" value={String(posts.length)} />
        <StatCard label="Total Engagement" value={formatNumber(totalEngagement)} />
        <StatCard label="Link Clicks" value={formatNumber(totalClicks)} />
      </section>

      <div style={{ display: "flex", gap: 4, marginBottom: 14 }}>
        {(["all", ...PLATFORMS] as PlatformFilter[]).map((p) => {
          const active = p === filter;
          return (
            <button
              key={p}
              onClick={() => setFilter(p)}
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
              {p === "all" ? "All" : p}
            </button>
          );
        })}
      </div>

      <Panel
        title="Posts"
        headerAction={
          <button type="button" onClick={() => setShowForm((v) => !v)} className="font-mono" style={{ ...inputStyle, width: "auto", cursor: "pointer", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>
            {showForm ? "Cancel" : "+ Add Post"}
          </button>
        }
      >
        {showForm && (
          <form onSubmit={handleSubmit} style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20, padding: 16, border: "1px dashed var(--border)", borderRadius: 10 }}>
            <div>
              <label style={labelStyle}>Posted Date</label>
              <input type="date" required value={form.posted_date} onChange={(e) => setForm({ ...form, posted_date: e.target.value })} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Platform</label>
              <select value={form.platform} onChange={(e) => setForm({ ...form, platform: e.target.value as Platform })} style={inputStyle}>
                {PLATFORMS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Post Type</label>
              <input type="text" placeholder="reel, carousel…" value={form.post_type} onChange={(e) => setForm({ ...form, post_type: e.target.value })} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Caption</label>
              <input type="text" value={form.caption} onChange={(e) => setForm({ ...form, caption: e.target.value })} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Reach</label>
              <input type="number" min={0} value={form.reach} onChange={(e) => setForm({ ...form, reach: e.target.value })} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Likes</label>
              <input type="number" min={0} value={form.likes} onChange={(e) => setForm({ ...form, likes: e.target.value })} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Comments</label>
              <input type="number" min={0} value={form.comments} onChange={(e) => setForm({ ...form, comments: e.target.value })} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Shares</label>
              <input type="number" min={0} value={form.shares} onChange={(e) => setForm({ ...form, shares: e.target.value })} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Link Clicks</label>
              <input type="number" min={0} value={form.link_clicks} onChange={(e) => setForm({ ...form, link_clicks: e.target.value })} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>UTM Campaign</label>
              <input type="text" placeholder="e.g. fall-launch" value={form.utm_campaign} onChange={(e) => setForm({ ...form, utm_campaign: e.target.value })} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>UTM Source</label>
              <input type="text" placeholder="e.g. instagram" value={form.utm_source} onChange={(e) => setForm({ ...form, utm_source: e.target.value })} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>UTM Medium</label>
              <input type="text" placeholder="organic-social" value={form.utm_medium} onChange={(e) => setForm({ ...form, utm_medium: e.target.value })} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Revenue Attributed</label>
              <input type="number" min={0} step="0.01" value={form.revenue_attributed} onChange={(e) => setForm({ ...form, revenue_attributed: e.target.value })} style={inputStyle} />
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
          <DataTable
            emptyText="No posts logged yet."
            rows={posts}
            columns={[
              { header: "Date", render: (p) => formatDate(p.posted_date) },
              { header: "Platform", render: (p) => <span style={{ textTransform: "capitalize" }}>{p.platform}</span> },
              { header: "Type", render: (p) => p.post_type ?? "—" },
              { header: "Reach", render: (p) => (p.reach === null ? "—" : formatNumber(p.reach)), align: "right" },
              { header: "Likes", render: (p) => formatNumber(p.likes), align: "right" },
              { header: "Comments", render: (p) => formatNumber(p.comments), align: "right" },
              { header: "Shares", render: (p) => formatNumber(p.shares), align: "right" },
              { header: "Clicks", render: (p) => formatNumber(p.link_clicks), align: "right" },
              { header: "UTM Campaign", render: (p) => p.utm_campaign ?? "—" },
              { header: "Revenue", render: (p) => (p.revenue_attributed > 0 ? formatCurrency(p.revenue_attributed) : "—"), align: "right" },
              {
                header: "",
                render: (p) => (
                  <button type="button" onClick={() => handleDelete(p.id)} style={{ border: "none", background: "transparent", color: "var(--negative)", cursor: "pointer", fontSize: 12 }}>
                    Delete
                  </button>
                ),
                align: "right",
              },
            ]}
          />
        )}
      </Panel>
    </Page>
  );
}
