"use client";

import { useState } from "react";
import type { IssueRow, AlertAction } from "@/lib/server/health/issues";
import { SeverityBadge, StatusBadge } from "./SeverityBadge";

function formatDetails(raw: string | null): string {
  if (!raw) return "—";
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed === "string") return parsed;
    return JSON.stringify(parsed, null, 2);
  } catch {
    return raw;
  }
}

export function IssueDrawer({
  issue,
  onClose,
  onAction,
}: {
  issue: IssueRow;
  onClose: () => void;
  onAction: (issueId: number, action: AlertAction) => Promise<void>;
}) {
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
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(44,41,36,0.35)", zIndex: 60 }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "absolute",
          right: 0,
          top: 0,
          bottom: 0,
          width: 480,
          maxWidth: "92vw",
          background: "var(--stone-surface)",
          borderLeft: "1px solid var(--stone-border)",
          boxShadow: "-8px 0 32px rgba(44,41,36,0.18)",
          padding: 28,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <SeverityBadge severity={issue.severity} />
            <StatusBadge status={issue.status} />
          </div>
          <button
            onClick={onClose}
            style={{ border: "none", background: "transparent", fontSize: 18, cursor: "pointer", color: "var(--charcoal-soft)" }}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <h2 className="font-display" style={{ fontSize: 20, margin: 0, fontWeight: 500 }}>
          {issue.title}
        </h2>

        <dl style={{ display: "grid", gridTemplateColumns: "120px 1fr", rowGap: 8, fontSize: 13 }}>
          <dt style={{ color: "var(--charcoal-soft)" }}>Category</dt>
          <dd style={{ margin: 0, textTransform: "capitalize" }}>{issue.category}</dd>
          <dt style={{ color: "var(--charcoal-soft)" }}>Page</dt>
          <dd style={{ margin: 0, wordBreak: "break-all" }}>{issue.page ?? "—"}</dd>
          <dt style={{ color: "var(--charcoal-soft)" }}>Journey</dt>
          <dd style={{ margin: 0 }}>{issue.journey ?? "—"}</dd>
          <dt style={{ color: "var(--charcoal-soft)" }}>First detected</dt>
          <dd style={{ margin: 0 }}>{new Date(issue.first_detected).toLocaleString()}</dd>
          <dt style={{ color: "var(--charcoal-soft)" }}>Latest occurrence</dt>
          <dd style={{ margin: 0 }}>{new Date(issue.last_detected).toLocaleString()}</dd>
          <dt style={{ color: "var(--charcoal-soft)" }}>Frequency</dt>
          <dd style={{ margin: 0 }}>{issue.frequency}×</dd>
          <dt style={{ color: "var(--charcoal-soft)" }}>Source</dt>
          <dd style={{ margin: 0, textTransform: "capitalize" }}>{issue.source.replace("_", " ")}</dd>
          {issue.baseline_value && (
            <>
              <dt style={{ color: "var(--charcoal-soft)" }}>Baseline</dt>
              <dd style={{ margin: 0 }}>{issue.baseline_value}</dd>
            </>
          )}
          {issue.current_value && (
            <>
              <dt style={{ color: "var(--charcoal-soft)" }}>Current</dt>
              <dd style={{ margin: 0 }}>{issue.current_value}</dd>
            </>
          )}
        </dl>

        {issue.description && (
          <div>
            <div style={{ fontSize: 12, color: "var(--charcoal-soft)", marginBottom: 4 }}>Description</div>
            <p style={{ fontSize: 13.5, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{issue.description.slice(0, 2000)}</p>
          </div>
        )}

        {issue.evidence && (
          <div>
            <div style={{ fontSize: 12, color: "var(--charcoal-soft)", marginBottom: 4 }}>Evidence</div>
            <pre
              style={{
                fontSize: 12,
                background: "var(--stone-surface-alt)",
                padding: 12,
                borderRadius: 10,
                overflowX: "auto",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              }}
            >
              {formatDetails(issue.evidence)}
            </pre>
          </div>
        )}

        {issue.suggested_investigation && (
          <div>
            <div style={{ fontSize: 12, color: "var(--charcoal-soft)", marginBottom: 4 }}>Suggested investigation</div>
            <p style={{ fontSize: 13.5 }}>{issue.suggested_investigation}</p>
          </div>
        )}

        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: "auto", paddingTop: 12, borderTop: "1px solid var(--stone-border)" }}>
          {issue.status !== "acknowledged" && (
            <ActionButton label="Acknowledge" busy={busy === "acknowledge"} onClick={() => run("acknowledge")} />
          )}
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

function ActionButton({
  label,
  onClick,
  busy,
  primary,
}: {
  label: string;
  onClick: () => void;
  busy: boolean;
  primary?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={busy}
      style={{
        border: primary ? "1px solid var(--beige-accent)" : "1px solid var(--stone-border)",
        background: primary ? "var(--beige-accent)" : "transparent",
        color: "var(--charcoal)",
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
