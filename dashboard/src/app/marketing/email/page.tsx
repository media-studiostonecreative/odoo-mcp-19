// dashboard/src/app/marketing/email/page.tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import { Page } from "@/components/ui/Page";
import { StatCard } from "@/components/ui/StatCard";
import { Panel } from "@/components/ui/Panel";
import { DataTable } from "@/components/ui/DataTable";
import { formatCurrency, formatNumber, formatDate } from "@/lib/format";

interface EmailCampaign {
  id: number;
  sent_date: string;
  subject: string;
  recipients: number;
  opens: number;
  clicks: number;
  revenue: number;
  notes: string | null;
}

const inputStyle = { background: "var(--surface)", color: "var(--text)", border: "1px solid var(--border)", borderRadius: 8, padding: "7px 10px", fontSize: 12, width: "100%" };
const labelStyle = { fontSize: 11, color: "var(--text-soft)", textTransform: "uppercase" as const, letterSpacing: 0.5, marginBottom: 4, display: "block" };

const EMPTY_FORM = { sent_date: "", subject: "", recipients: "", opens: "", clicks: "", revenue: "", notes: "" };

export default function EmailMarketingPage() {
  const [campaigns, setCampaigns] = useState<EmailCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/marketing/email", { cache: "no-store" });
    if (res.ok) setCampaigns((await res.json()).campaigns);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/marketing/email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sent_date: form.sent_date,
        subject: form.subject,
        recipients: Number(form.recipients) || 0,
        opens: Number(form.opens) || 0,
        clicks: Number(form.clicks) || 0,
        revenue: Number(form.revenue) || 0,
        notes: form.notes || null,
      }),
    });
    setSaving(false);
    if (res.ok) {
      setForm(EMPTY_FORM);
      setShowForm(false);
      load();
    }
  }

  async function handleDelete(id: number) {
    await fetch(`/api/marketing/email/${id}`, { method: "DELETE" });
    load();
  }

  const totalRecipients = campaigns.reduce((sum, c) => sum + c.recipients, 0);
  const totalOpens = campaigns.reduce((sum, c) => sum + c.opens, 0);
  const totalClicks = campaigns.reduce((sum, c) => sum + c.clicks, 0);
  const totalRevenue = campaigns.reduce((sum, c) => sum + c.revenue, 0);
  const openRate = totalRecipients ? (totalOpens / totalRecipients) * 100 : 0;

  return (
    <Page title="Email Marketing" description="Manually-logged Shopify Email campaign performance.">
      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 24 }}>
        <StatCard label="Campaigns" value={String(campaigns.length)} />
        <StatCard label="Avg Open Rate" value={`${openRate.toFixed(0)}%`} gauge={openRate} />
        <StatCard label="Total Clicks" value={formatNumber(totalClicks)} />
        <StatCard label="Total Revenue" value={formatCurrency(totalRevenue)} />
      </section>

      <Panel
        title="Campaigns"
        headerAction={
          <button type="button" onClick={() => setShowForm((v) => !v)} className="font-mono" style={{ ...inputStyle, width: "auto", cursor: "pointer", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>
            {showForm ? "Cancel" : "+ Add Campaign"}
          </button>
        }
      >
        {showForm && (
          <form onSubmit={handleSubmit} style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 20, padding: 16, border: "1px dashed var(--border)", borderRadius: 10 }}>
            <div>
              <label style={labelStyle}>Sent Date</label>
              <input type="date" required value={form.sent_date} onChange={(e) => setForm({ ...form, sent_date: e.target.value })} style={inputStyle} />
            </div>
            <div style={{ gridColumn: "span 2" }}>
              <label style={labelStyle}>Subject</label>
              <input type="text" required value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Recipients</label>
              <input type="number" min={0} value={form.recipients} onChange={(e) => setForm({ ...form, recipients: e.target.value })} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Opens</label>
              <input type="number" min={0} value={form.opens} onChange={(e) => setForm({ ...form, opens: e.target.value })} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Clicks</label>
              <input type="number" min={0} value={form.clicks} onChange={(e) => setForm({ ...form, clicks: e.target.value })} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Revenue</label>
              <input type="number" min={0} step="0.01" value={form.revenue} onChange={(e) => setForm({ ...form, revenue: e.target.value })} style={inputStyle} />
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
          <DataTable
            emptyText="No campaigns logged yet."
            rows={campaigns}
            columns={[
              { header: "Date", render: (c) => formatDate(c.sent_date) },
              { header: "Subject", render: (c) => c.subject },
              { header: "Recipients", render: (c) => formatNumber(c.recipients), align: "right" },
              { header: "Opens", render: (c) => formatNumber(c.opens), align: "right" },
              { header: "Clicks", render: (c) => formatNumber(c.clicks), align: "right" },
              { header: "Revenue", render: (c) => formatCurrency(c.revenue), align: "right" },
              {
                header: "",
                render: (c) => (
                  <button
                    type="button"
                    onClick={() => handleDelete(c.id)}
                    style={{ border: "none", background: "transparent", color: "var(--negative)", cursor: "pointer", fontSize: 12 }}
                  >
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
