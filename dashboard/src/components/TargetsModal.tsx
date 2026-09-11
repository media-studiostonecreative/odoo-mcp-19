"use client";

import { useState } from "react";
import { formatCurrency } from "@/lib/format";

export interface Targets {
  monthly_revenue_target: number;
  annual_revenue_target: number;
  monthly_sales_order_target: number;
  new_wholesale_account_target: number;
}

interface TargetsModalProps {
  targets: Targets;
  onClose: () => void;
  onSaved: (targets: Targets) => void;
}

const FIELDS: { key: keyof Targets; label: string; max: number; step: number; isCurrency: boolean }[] = [
  { key: "monthly_revenue_target", label: "Monthly Revenue Target", max: 200_000, step: 500, isCurrency: true },
  { key: "annual_revenue_target", label: "Annual Revenue Target", max: 2_000_000, step: 5_000, isCurrency: true },
  { key: "monthly_sales_order_target", label: "Monthly Sales-Order Target", max: 200_000, step: 500, isCurrency: true },
  { key: "new_wholesale_account_target", label: "New Wholesale Account Target", max: 50, step: 1, isCurrency: false },
];

export function TargetsModal({ targets, onClose, onSaved }: TargetsModalProps) {
  const [draft, setDraft] = useState<Targets>(targets);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/targets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      if (!res.ok) throw new Error("Failed to save targets");
      const updated = (await res.json()) as Targets;
      onSaved(updated);
      onClose();
    } catch {
      setError("Could not save targets. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(44, 41, 36, 0.35)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 50,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--stone-surface)",
          borderRadius: 18,
          padding: 28,
          width: 440,
          maxWidth: "90vw",
          boxShadow: "0 8px 32px rgba(44,41,36,0.18)",
          border: "1px solid var(--stone-border)",
        }}
      >
        <h2 className="font-display" style={{ fontSize: 22, margin: "0 0 4px" }}>
          Edit Targets
        </h2>
        <p style={{ fontSize: 13, color: "var(--charcoal-soft)", marginTop: 0 }}>
          Stored locally for this dashboard only — never written back to Odoo.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 20, marginTop: 16 }}>
          {FIELDS.map((field) => (
            <div key={field.key}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6 }}>
                <label htmlFor={field.key}>{field.label}</label>
                <span style={{ fontWeight: 500 }}>
                  {field.isCurrency ? formatCurrency(draft[field.key]) : draft[field.key]}
                </span>
              </div>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <input
                  type="range"
                  min={0}
                  max={field.max}
                  step={field.step}
                  value={draft[field.key]}
                  onChange={(e) => setDraft({ ...draft, [field.key]: Number(e.target.value) })}
                  style={{ flex: 1, accentColor: "var(--beige-accent)" }}
                />
                <input
                  id={field.key}
                  type="number"
                  min={0}
                  value={draft[field.key]}
                  onChange={(e) => setDraft({ ...draft, [field.key]: Number(e.target.value) })}
                  style={{
                    width: 90,
                    padding: "6px 8px",
                    borderRadius: 8,
                    border: "1px solid var(--stone-border)",
                    background: "var(--stone-surface)",
                    color: "var(--charcoal)",
                    fontSize: 13,
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        {error && <p style={{ color: "var(--negative)", fontSize: 13 }}>{error}</p>}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 24 }}>
          <button
            onClick={onClose}
            style={{
              border: "1px solid var(--stone-border)",
              background: "transparent",
              padding: "8px 16px",
              borderRadius: 10,
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              border: "1px solid var(--beige-accent)",
              background: "var(--beige-accent)",
              color: "var(--charcoal)",
              padding: "8px 16px",
              borderRadius: 10,
              cursor: saving ? "default" : "pointer",
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? "Saving…" : "Save Targets"}
          </button>
        </div>
      </div>
    </div>
  );
}
