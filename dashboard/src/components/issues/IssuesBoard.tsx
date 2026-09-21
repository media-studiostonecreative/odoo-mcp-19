// dashboard/src/components/issues/IssuesBoard.tsx
"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { toneVars } from "@/components/ui/tones";
import type { IssueRow, AlertAction } from "./IssueDrawer";

type ColumnKey = "open" | "acknowledged" | "done";
type Site = "retail" | "wholesale";

const COLUMNS: { key: ColumnKey; label: string; status: IssueRow["status"]; dropAction: AlertAction }[] = [
  { key: "open", label: "Open", status: "open", dropAction: "reopen" },
  { key: "acknowledged", label: "In Progress", status: "acknowledged", dropAction: "acknowledge" },
  { key: "done", label: "Done", status: "resolved", dropAction: "resolve" },
];

// "business"-category issues (stale/abandoned Odoo quotations) live on the Business Data
// page now, not here — this board is technical/UX site issues only.
function isBusinessAlert(issue: IssueRow): boolean {
  return issue.category === "business";
}

export function IssuesBoard({ issues, onAction, onSelect }: { issues: IssueRow[]; onAction: (issueId: number, action: AlertAction) => Promise<void>; onSelect: (issue: IssueRow) => void }) {
  const [site, setSite] = useState<Site>("retail");
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<ColumnKey | null>(null);

  const siteItems = issues.filter((i) => i.site === site && !isBusinessAlert(i));
  const snoozedItems = siteItems.filter((i) => i.status === "snoozed");

  const scoped = siteItems.filter((i) => i.status !== "snoozed");

  const byColumn: Record<ColumnKey, IssueRow[]> = {
    open: scoped.filter((i) => i.status === "open"),
    acknowledged: scoped.filter((i) => i.status === "acknowledged"),
    done: scoped.filter((i) => i.status === "resolved"),
  };

  async function handleDrop(column: (typeof COLUMNS)[number]) {
    setDragOverColumn(null);
    if (draggingId == null) return;
    const issue = issues.find((i) => i.id === draggingId);
    setDraggingId(null);
    if (!issue || issue.status === column.status) return;
    await onAction(issue.id, column.dropAction);
  }

  return (
    <div>
      <div style={{ display: "flex", gap: 4, marginBottom: 14, alignItems: "flex-end" }}>
        {([
          { key: "retail" as const, label: "Shopify", tone: "cyan" as const },
          { key: "wholesale" as const, label: "Odoo", tone: "magenta" as const },
        ]).map((t) => {
          const active = t.key === site;
          return (
            <button
              key={t.key}
              onClick={() => setSite(t.key)}
              className="font-mono"
              style={{
                ...toneVars(t.tone),
                border: `1px solid ${active ? "var(--border-strong)" : "var(--border)"}`,
                background: active ? "var(--surface)" : "var(--surface-alt)",
                color: active ? "var(--text)" : "var(--text-soft)",
                padding: "8px 16px",
                borderRadius: "10px 10px 0 0",
                fontSize: 11,
                textTransform: "uppercase",
                letterSpacing: 0.5,
                cursor: "pointer",
                fontWeight: active ? 600 : 400,
              } as React.CSSProperties}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {snoozedItems.length > 0 && (
        <p className="font-mono" style={{ fontSize: 11, color: "var(--text-soft)", opacity: 0.7, margin: "-8px 0 14px", letterSpacing: 0.3 }}>
          {snoozedItems.length} snoozed (hidden until {snoozedItems.length === 1 ? "it wakes" : "they wake"})
        </p>
      )}

      <div style={{ ...toneVars("red"), border: "1px solid var(--border-strong)", borderRadius: 12, background: "var(--surface)", padding: 20 } as React.CSSProperties}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 14 }}>
            {COLUMNS.map((col) => (
              <div
                key={col.key}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOverColumn(col.key);
                }}
                onDragLeave={() => setDragOverColumn((c) => (c === col.key ? null : c))}
                onDrop={(e) => {
                  e.preventDefault();
                  handleDrop(col);
                }}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                  minHeight: 120,
                  padding: 10,
                  borderRadius: 12,
                  border: `1px dashed ${dragOverColumn === col.key ? "var(--accent)" : "var(--border)"}`,
                  background: dragOverColumn === col.key ? "var(--accent-soft)" : "transparent",
                }}
              >
                <div className="font-mono" style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: 0.8, color: "var(--text-soft)", display: "flex", justifyContent: "space-between" }}>
                  <span>{col.label}</span>
                  <span>{byColumn[col.key].length}</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 420, overflowY: "auto" }}>
                  {byColumn[col.key].length === 0 ? (
                    <p style={{ fontSize: 12, color: "var(--text-soft)", opacity: 0.7 }}>Nothing here.</p>
                  ) : (
                    byColumn[col.key].map((issue) => (
                      <div
                        key={issue.id}
                        role="button"
                        tabIndex={0}
                        draggable
                        onDragStart={(e) => {
                          setDraggingId(issue.id);
                          e.dataTransfer.effectAllowed = "move";
                        }}
                        onDragEnd={() => setDraggingId(null)}
                        onClick={() => onSelect(issue)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") onSelect(issue);
                        }}
                        style={{
                          textAlign: "left",
                          border: "1px solid var(--border)",
                          borderRadius: 10,
                          padding: "11px 12px",
                          background: "var(--surface-alt)",
                          cursor: "grab",
                          display: "flex",
                          flexDirection: "column",
                          gap: 6,
                          opacity: draggingId === issue.id ? 0.4 : 1,
                        }}
                      >
                        <Badge variant="severity">{issue.severity}</Badge>
                        <div style={{ fontWeight: 500, fontSize: 13.5, lineHeight: 1.4 }}>{issue.title}</div>
                        <div style={{ fontSize: 11, color: "var(--text-soft)" }}>
                          <span style={{ textTransform: "capitalize" }}>{issue.category}</span> · seen {issue.frequency}× · last{" "}
                          {new Date(issue.last_detected).toLocaleDateString()}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
