// dashboard/src/components/issues/IssuesBoard.tsx
"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { DataTable } from "@/components/ui/DataTable";
import { toneVars } from "@/components/ui/tones";
import type { IssueRow, AlertAction } from "./IssueDrawer";

type ColumnKey = "open" | "acknowledged";
type SiteFilter = "all" | "retail" | "wholesale";
type SubTab = "issues" | "abandoned" | "done";

const COLUMNS: { key: ColumnKey; label: string; dropAction: AlertAction }[] = [
  { key: "open", label: "Open", dropAction: "reopen" },
  { key: "acknowledged", label: "In Progress", dropAction: "acknowledge" },
];

function isAbandonedAlert(issue: IssueRow): boolean {
  return issue.category === "business";
}

export function IssuesBoard({ issues, onAction, onSelect }: { issues: IssueRow[]; onAction: (issueId: number, action: AlertAction) => Promise<void>; onSelect: (issue: IssueRow) => void }) {
  const [siteFilter, setSiteFilter] = useState<SiteFilter>("all");
  const [subTab, setSubTab] = useState<SubTab>("issues");
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<ColumnKey | null>(null);

  const siteFiltered = siteFilter === "all" ? issues : issues.filter((i) => i.site === siteFilter);
  const activeItems = siteFiltered.filter((i) => i.status !== "resolved" && i.status !== "snoozed");
  const doneItems = siteFiltered.filter((i) => i.status === "resolved");
  const snoozedItems = siteFiltered.filter((i) => i.status === "snoozed");
  const issuesTabItems = activeItems.filter((i) => !isAbandonedAlert(i));
  const abandonedTabItems = activeItems.filter(isAbandonedAlert);
  const boardItems = subTab === "issues" ? issuesTabItems : subTab === "abandoned" ? abandonedTabItems : [];

  const byColumn: Record<ColumnKey, IssueRow[]> = {
    open: boardItems.filter((i) => i.status === "open"),
    acknowledged: boardItems.filter((i) => i.status === "acknowledged"),
  };

  async function handleDrop(column: (typeof COLUMNS)[number]) {
    setDragOverColumn(null);
    if (draggingId == null) return;
    const issue = issues.find((i) => i.id === draggingId);
    setDraggingId(null);
    if (!issue || issue.status === column.key) return;
    await onAction(issue.id, column.dropAction);
  }

  return (
    <div>
      <div className="font-mono" style={{ display: "inline-flex", gap: 3, background: "var(--surface-alt)", padding: 4, borderRadius: 8, border: "1px solid var(--border)", marginBottom: 14 }}>
        {(["all", "retail", "wholesale"] as SiteFilter[]).map((f) => (
          <button
            key={f}
            onClick={() => setSiteFilter(f)}
            style={{
              border: "none",
              background: siteFilter === f ? (f === "wholesale" ? "var(--magenta)" : "var(--accent)") : "transparent",
              color: siteFilter === f ? (f === "wholesale" ? "var(--on-magenta)" : "var(--on-accent)") : "var(--text-soft)",
              padding: "6px 13px",
              borderRadius: 6,
              fontSize: 10.5,
              textTransform: "uppercase",
              letterSpacing: 0.8,
              cursor: "pointer",
              fontWeight: siteFilter === f ? 600 : 400,
            }}
          >
            {f === "all" ? "All" : f === "retail" ? "Shopify" : "Odoo"}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", gap: 4, marginBottom: 14 }}>
        {([
          { key: "issues" as const, label: "Issues", tone: "red" as const, count: issuesTabItems.length },
          { key: "abandoned" as const, label: "Abandoned", tone: "yellow" as const, count: abandonedTabItems.length },
          { key: "done" as const, label: "Done", tone: "cyan" as const, count: doneItems.length },
        ]).map((t) => {
          const active = t.key === subTab;
          return (
            <button
              key={t.key}
              onClick={() => setSubTab(t.key)}
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
              {t.label} ({t.count})
            </button>
          );
        })}
      </div>

      {snoozedItems.length > 0 && (
        <p className="font-mono" style={{ fontSize: 11, color: "var(--text-soft)", opacity: 0.7, margin: "-8px 0 14px", letterSpacing: 0.3 }}>
          {snoozedItems.length} snoozed (hidden until {snoozedItems.length === 1 ? "it wakes" : "they wake"})
        </p>
      )}

      <div style={{ ...toneVars(subTab === "issues" ? "red" : subTab === "abandoned" ? "yellow" : "cyan"), border: "1px solid var(--border-strong)", borderRadius: "0 12px 12px 12px", background: "var(--surface)", padding: 20 } as React.CSSProperties}>
        {subTab === "done" ? (
          <DataTable
            emptyText="Nothing resolved yet for this filter."
            rows={doneItems}
            onRowClick={onSelect}
            columns={[
              { header: "Severity", render: (i) => <Badge variant="severity">{i.severity}</Badge> },
              { header: "Category", render: (i) => i.category },
              { header: "Title", render: (i) => i.title },
              { header: "Site", render: (i) => (i.site === "wholesale" ? "Odoo" : "Shopify") },
              { header: "Last Detected", render: (i) => new Date(i.last_detected).toLocaleDateString() },
            ]}
          />
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 14 }}>
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
                        <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                          <Badge variant="severity">{issue.severity}</Badge>
                          <span style={{ fontSize: 11, color: "var(--text-soft)", textTransform: "capitalize" }}>{issue.category}</span>
                        </div>
                        <div style={{ fontWeight: 500, fontSize: 13.5, lineHeight: 1.4 }}>{issue.title}</div>
                        <div style={{ fontSize: 11, color: "var(--text-soft)" }}>
                          seen {issue.frequency}× · last {new Date(issue.last_detected).toLocaleDateString()}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
