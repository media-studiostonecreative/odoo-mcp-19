// dashboard/src/components/issues/IssueDrawer.tsx
"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/Badge";

export interface IssueRow {
  id: number;
  fingerprint: string;
  severity: "critical" | "warning" | "info";
  category: string;
  site: "retail" | "wholesale";
  page: string | null;
  title: string;
  description: string | null;
  evidence: string | null;
  frequency: number;
  first_detected: string;
  last_detected: string;
  source: string;
  status: "open" | "acknowledged" | "snoozed" | "resolved";
}

export type AlertAction = "acknowledge" | "snooze_1d" | "snooze_7d" | "resolve" | "reopen";

export function IssueDrawer({ issue, onClose, onAction }: { issue: IssueRow; onClose: () => void; onAction: (issueId: number, action: AlertAction) => Promise<void> }) {
  const [busy, setBusy] = useState<AlertAction | null>(null);

  async function run(action: AlertAction) {
    setBusy(action);
    try {
      await onAction(issue.id, action);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0, 0, 0, 0.6)", zIndex: 60 }} onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "absolute",
          right: 0,
          top: 0,
          bottom: 0,
          width: 480,
          maxWidth: "92vw",
          background: "var(--surface)",
          borderLeft: "1px solid var(--border)",
          boxShadow: "-8px 0 32px rgba(0, 0, 0, 0.5)",
          padding: 28,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <Badge variant="severity">{issue.severity}</Badge>
            <Badge variant="outline">{issue.status}</Badge>
          </div>
          <button onClick={onClose} aria-label="Close" style={{ border: "none", background: "transparent", fontSize: 18, cursor: "pointer", color: "var(--text-soft)" }}>
            ✕
          </button>
        </div>

        <h2 className="font-display" style={{ fontSize: 20, margin: 0, fontWeight: 500 }}>
          {issue.title}
        </h2>

        <dl style={{ display: "grid", gridTemplateColumns: "120px 1fr", rowGap: 8, fontSize: 13 }}>
          <dt style={{ color: "var(--text-soft)" }}>Site</dt>
          <dd style={{ margin: 0, textTransform: "capitalize" }}>{issue.site === "wholesale" ? "Odoo" : "Shopify"}</dd>
          <dt style={{ color: "var(--text-soft)" }}>Category</dt>
          <dd style={{ margin: 0, textTransform: "capitalize" }}>{issue.category}</dd>
          <dt style={{ color: "var(--text-soft)" }}>Page</dt>
          <dd style={{ margin: 0, wordBreak: "break-all" }}>{issue.page ?? "—"}</dd>
          <dt style={{ color: "var(--text-soft)" }}>First detected</dt>
          <dd style={{ margin: 0 }}>{new Date(issue.first_detected).toLocaleString()}</dd>
          <dt style={{ color: "var(--text-soft)" }}>Latest occurrence</dt>
          <dd style={{ margin: 0 }}>{new Date(issue.last_detected).toLocaleString()}</dd>
          <dt style={{ color: "var(--text-soft)" }}>Frequency</dt>
          <dd style={{ margin: 0 }}>{issue.frequency}×</dd>
          <dt style={{ color: "var(--text-soft)" }}>Source</dt>
          <dd style={{ margin: 0, textTransform: "capitalize" }}>{issue.source.replace("_", " ")}</dd>
        </dl>

        {issue.description && (
          <div>
            <div style={{ fontSize: 12, color: "var(--text-soft)", marginBottom: 4 }}>Description</div>
            <p style={{ fontSize: 13.5, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{issue.description.slice(0, 2000)}</p>
          </div>
        )}

        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: "auto", paddingTop: 12, borderTop: "1px solid var(--border)" }}>
          {issue.status !== "acknowledged" && <ActionButton label="Acknowledge" busy={busy === "acknowledge"} onClick={() => run("acknowledge")} />}
          <ActionButton label="Snooze 1 day" busy={busy === "snooze_1d"} onClick={() => run("snooze_1d")} />
          <ActionButton label="Snooze 7 days" busy={busy === "snooze_7d"} onClick={() => run("snooze_7d")} />
          {issue.status !== "resolved" ? (
            <ActionButton label="Resolve" primary busy={busy === "resolve"} onClick={() => run("resolve")} />
          ) : (
            <ActionButton label="Reopen" busy={busy === "reopen"} onClick={() => run("reopen")} />
          )}
        </div>
      </div>
    </div>
  );
}

function ActionButton({ label, onClick, busy, primary }: { label: string; onClick: () => void; busy: boolean; primary?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={busy}
      style={{
        border: primary ? "1px solid var(--accent)" : "1px solid var(--border)",
        background: primary ? "var(--accent)" : "transparent",
        color: primary ? "var(--on-accent)" : "var(--text)",
        fontWeight: primary ? 600 : 400,
        padding: "7px 13px",
        borderRadius: 10,
        fontSize: 12.5,
        cursor: busy ? "default" : "pointer",
        opacity: busy ? 0.6 : 1,
      }}
    >
      {busy ? "…" : label}
    </button>
  );
}
