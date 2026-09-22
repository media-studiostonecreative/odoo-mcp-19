// dashboard/src/app/tools/settings/page.tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import { Page } from "@/components/ui/Page";
import { Panel } from "@/components/ui/Panel";
import { DataTable } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/Badge";

type CriticalFactStatus = "unverified" | "confirmed" | "mismatch";

interface CriticalFact {
  id: number;
  description: string;
  expected_value: string;
  source_url: string | null;
  last_verified_date: string | null;
  status: CriticalFactStatus;
  notes: string | null;
  created_at: string;
}

const STATUS_LABEL: Record<CriticalFactStatus, string> = {
  unverified: "unverified",
  confirmed: "confirmed",
  mismatch: "mismatch",
};

export default function SettingsPage() {
  const [facts, setFacts] = useState<CriticalFact[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [description, setDescription] = useState("");
  const [expectedValue, setExpectedValue] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/settings/critical-facts", { cache: "no-store" });
    if (res.ok) {
      const body = await res.json();
      setFacts(body.facts ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!description.trim() || !expectedValue.trim()) return;
    setSaving(true);
    setError(null);
    const res = await fetch("/api/settings/critical-facts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        description: description.trim(),
        expected_value: expectedValue.trim(),
        source_url: sourceUrl.trim() || null,
        notes: notes.trim() || null,
      }),
    });
    if (res.ok) {
      setDescription("");
      setExpectedValue("");
      setSourceUrl("");
      setNotes("");
      await load();
    } else {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Unable to save.");
    }
    setSaving(false);
  }

  async function handleVerify(id: number, status: "confirmed" | "mismatch") {
    const res = await fetch(`/api/settings/critical-facts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) await load();
  }

  async function handleDelete(id: number) {
    const res = await fetch(`/api/settings/critical-facts/${id}`, { method: "DELETE" });
    if (res.ok) await load();
  }

  const inputStyle: React.CSSProperties = {
    background: "var(--surface-alt)",
    border: "1px solid var(--border)",
    borderRadius: 6,
    padding: "8px 10px",
    fontSize: 13,
    color: "var(--text)",
    width: "100%",
  };

  return (
    <Page title="Settings" description="A watchlist of critical facts (prices, policies, contact details) to periodically re-verify against the live site.">
      <Panel title="Add a Critical Fact">
        <form onSubmit={handleAdd} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, alignItems: "end" }}>
          <div>
            <label className="font-mono" style={{ fontSize: 11, color: "var(--text-soft)", display: "block", marginBottom: 4 }}>
              Description
            </label>
            <input style={inputStyle} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. Free shipping threshold" />
          </div>
          <div>
            <label className="font-mono" style={{ fontSize: 11, color: "var(--text-soft)", display: "block", marginBottom: 4 }}>
              Expected Value
            </label>
            <input style={inputStyle} value={expectedValue} onChange={(e) => setExpectedValue(e.target.value)} placeholder="e.g. $75 CAD" />
          </div>
          <div>
            <label className="font-mono" style={{ fontSize: 11, color: "var(--text-soft)", display: "block", marginBottom: 4 }}>
              Source URL (optional)
            </label>
            <input style={inputStyle} value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} placeholder="https://…" />
          </div>
          <div>
            <label className="font-mono" style={{ fontSize: 11, color: "var(--text-soft)", display: "block", marginBottom: 4 }}>
              Notes (optional)
            </label>
            <input style={inputStyle} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Context for the team" />
          </div>
          <button
            type="submit"
            disabled={saving || !description.trim() || !expectedValue.trim()}
            className="font-mono"
            style={{ fontSize: 12, padding: "9px 16px", borderRadius: 6, border: "1px solid var(--border)", background: "var(--surface-alt)", color: "var(--text)", cursor: saving ? "default" : "pointer", opacity: saving ? 0.6 : 1 }}
          >
            {saving ? "Saving…" : "Add Fact"}
          </button>
        </form>
        {error && (
          <p style={{ color: "var(--negative)", fontSize: 12, marginTop: 10 }}>{error}</p>
        )}
      </Panel>

      <Panel title="Critical Facts Watchlist">
        {loading ? (
          <p style={{ color: "var(--text-soft)", fontSize: 13 }}>Loading…</p>
        ) : (
          <DataTable
            emptyText="No critical facts tracked yet — add one above."
            rows={facts}
            columns={[
              {
                header: "Status",
                render: (f) => <Badge variant={f.status === "mismatch" ? "severity" : "neutral"}>{f.status === "mismatch" ? "critical" : STATUS_LABEL[f.status]}</Badge>,
              },
              { header: "Description", render: (f) => f.description },
              { header: "Expected Value", render: (f) => f.expected_value },
              { header: "Source", render: (f) => (f.source_url ? <a href={f.source_url} target="_blank" rel="noreferrer" style={{ color: "var(--accent)" }}>link</a> : "—") },
              { header: "Last Verified", render: (f) => (f.last_verified_date ? new Date(f.last_verified_date).toLocaleDateString() : "never") },
              {
                header: "Actions",
                render: (f) => (
                  <div style={{ display: "flex", gap: 8 }}>
                    <button className="font-mono" onClick={() => handleVerify(f.id, "confirmed")} style={{ fontSize: 10.5, padding: "4px 8px", borderRadius: 4, border: "1px solid var(--border)", background: "none", color: "var(--positive)", cursor: "pointer" }}>
                      Confirm
                    </button>
                    <button className="font-mono" onClick={() => handleVerify(f.id, "mismatch")} style={{ fontSize: 10.5, padding: "4px 8px", borderRadius: 4, border: "1px solid var(--border)", background: "none", color: "var(--negative)", cursor: "pointer" }}>
                      Mismatch
                    </button>
                    <button className="font-mono" onClick={() => handleDelete(f.id)} style={{ fontSize: 10.5, padding: "4px 8px", borderRadius: 4, border: "1px solid var(--border)", background: "none", color: "var(--text-soft)", cursor: "pointer" }}>
                      Delete
                    </button>
                  </div>
                ),
              },
            ]}
          />
        )}
      </Panel>
    </Page>
  );
}
