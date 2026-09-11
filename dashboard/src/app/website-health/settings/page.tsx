"use client";

import { useEffect, useState } from "react";
import { Panel } from "@/components/Panel";

interface CriticalFact {
  id: number;
  key: string;
  label: string;
  expected_value: string;
  unit: string | null;
  notes: string | null;
  updated_at: string;
}

export default function SettingsPage() {
  const [facts, setFacts] = useState<CriticalFact[]>([]);
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState<number | null>(null);

  function load() {
    fetch("/api/health/settings", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => setFacts(data.criticalFacts ?? []));
  }

  useEffect(load, []);

  async function save(fact: CriticalFact) {
    setSaving(fact.id);
    try {
      await fetch("/api/health/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          criticalFact: { id: fact.id, expectedValue: drafts[fact.id] ?? fact.expected_value },
        }),
      });
      load();
    } finally {
      setSaving(null);
    }
  }

  return (
    <>
      <div>
        <div style={{ fontSize: 12, letterSpacing: 1.5, textTransform: "uppercase", color: "var(--charcoal-soft)" }}>
          Website Health
        </div>
        <h1 className="font-display" style={{ fontSize: 24, margin: "2px 0 0", fontStyle: "italic", fontWeight: 500 }}>
          Settings
        </h1>
      </div>

      <Panel title="Critical Information Watchlist">
        <p style={{ color: "var(--charcoal-soft)", fontSize: 13.5, marginBottom: 16 }}>
          Source-of-truth business facts. Stored locally only — never written to Odoo or the live
          site. Comparing these against live page text is a follow-up build; for now this is the
          editable reference list.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {facts.map((fact) => (
            <div key={fact.id} style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <div style={{ minWidth: 260, fontSize: 13.5 }}>{fact.label}</div>
              <input
                value={drafts[fact.id] ?? fact.expected_value}
                onChange={(e) => setDrafts((d) => ({ ...d, [fact.id]: e.target.value }))}
                style={{
                  padding: "6px 10px",
                  borderRadius: 8,
                  border: "1px solid var(--stone-border)",
                  background: "var(--stone-surface)",
                  fontSize: 13,
                  width: 140,
                }}
              />
              <span style={{ fontSize: 12.5, color: "var(--charcoal-soft)" }}>{fact.unit}</span>
              <button
                onClick={() => save(fact)}
                disabled={saving === fact.id}
                style={{
                  border: "1px solid var(--beige-accent)",
                  background: "var(--beige-accent)",
                  padding: "6px 12px",
                  borderRadius: 8,
                  fontSize: 12.5,
                  cursor: saving === fact.id ? "default" : "pointer",
                  opacity: saving === fact.id ? 0.6 : 1,
                }}
              >
                {saving === fact.id ? "Saving…" : "Save"}
              </button>
              {fact.notes && (
                <div style={{ fontSize: 11.5, color: "var(--charcoal-soft)", flexBasis: "100%" }}>{fact.notes}</div>
              )}
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="Scan Configuration">
        <p style={{ color: "var(--charcoal-soft)", fontSize: 13.5 }}>
          Important pages, mobile viewport (currently 390×844), and scan schedules are defined in{" "}
          <code>src/lib/server/health/config.ts</code> for now. Moving them into editable local
          settings here is a follow-up — the brief asks that nothing here ever gets written to Odoo,
          and that stays true either way.
        </p>
      </Panel>
    </>
  );
}
