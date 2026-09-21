// dashboard/src/app/marketing/social/page.tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import { Page } from "@/components/ui/Page";
import { StatCard } from "@/components/ui/StatCard";
import { Panel } from "@/components/ui/Panel";
import { DataTable } from "@/components/ui/DataTable";
import { formatNumber, formatDate } from "@/lib/format";

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
}

const PLATFORMS: Platform[] = ["instagram", "facebook", "tiktok", "pinterest"];

const inputStyle = { background: "var(--surface)", color: "var(--text)", border: "1px solid var(--border)", borderRadius: 8, padding: "7px 10px", fontSize: 12, width: "100%" };
const labelStyle = { fontSize: 11, color: "var(--text-soft)", textTransform: "uppercase" as const, letterSpacing: 0.5, marginBottom: 4, display: "block" };

const EMPTY_FORM = { posted_date: "", platform: "instagram" as Platform, post_type: "", caption: "", likes: "", comments: "", shares: "", link_clicks: "" };

export default function SocialMediaPage() {
  const [filter, setFilter] = useState<PlatformFilter>("all");
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (platform: PlatformFilter) => {
    const qs = platform === "all" ? "" : `?platform=${platform}`;
    const res = await fetch(`/api/marketing/social${qs}`, { cache: "no-store" });
    if (res.ok) setPosts((await res.json()).posts);
    setLoading(false);
  }, []);

  useEffect(() => {
    setLoading(true);
    load(filter);
  }, [filter, load]);

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
        likes: Number(form.likes) || 0,
        comments: Number(form.comments) || 0,
        shares: Number(form.shares) || 0,
        link_clicks: Number(form.link_clicks) || 0,
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

  return (
    <Page title="Social Media" description="Manually-logged Instagram/Facebook/TikTok/Pinterest post performance.">
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
              { header: "Likes", render: (p) => formatNumber(p.likes), align: "right" },
              { header: "Comments", render: (p) => formatNumber(p.comments), align: "right" },
              { header: "Shares", render: (p) => formatNumber(p.shares), align: "right" },
              { header: "Clicks", render: (p) => formatNumber(p.link_clicks), align: "right" },
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
