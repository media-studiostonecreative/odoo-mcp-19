"use client";

import type { PeriodKey } from "@/lib/server/periods";

const PERIOD_OPTIONS: { key: PeriodKey; label: string }[] = [
  { key: "month", label: "Month" },
  { key: "quarter", label: "Quarter" },
  { key: "ytd", label: "YTD" },
  { key: "12months", label: "12 Months" },
];

interface HeaderProps {
  period: PeriodKey;
  onPeriodChange: (period: PeriodKey) => void;
  lastRefreshed: string | null;
  isLive: boolean;
  isRefreshing: boolean;
  onRefresh: () => void;
  onOpenSettings: () => void;
}

export function Header({
  period,
  onPeriodChange,
  lastRefreshed,
  isLive,
  isRefreshing,
  onRefresh,
  onOpenSettings,
}: HeaderProps) {
  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: 16,
        padding: "22px 32px",
        borderBottom: "1px solid var(--stone-border)",
        background: "var(--stone-surface)",
      }}
    >
      <div>
        <div style={{ fontSize: 12, letterSpacing: 1.5, textTransform: "uppercase", color: "var(--charcoal-soft)" }}>
          Studiostone Creative
        </div>
        <h1 className="font-display" style={{ fontSize: 26, margin: "2px 0 0", fontStyle: "italic", fontWeight: 500 }}>
          Business Pulse
        </h1>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--charcoal-soft)" }}>
          <span
            aria-hidden
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: isLive ? "var(--positive)" : "var(--negative)",
              display: "inline-block",
            }}
          />
          {isLive ? "Live" : "Offline"}
          {lastRefreshed && (
            <span style={{ color: "var(--charcoal-soft)" }}>
              · Last updated: {new Date(lastRefreshed).toLocaleTimeString("en-CA", { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
        </div>

        <div style={{ display: "flex", background: "var(--stone-surface-alt)", borderRadius: 10, padding: 4 }}>
          {PERIOD_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              onClick={() => onPeriodChange(opt.key)}
              style={{
                border: "none",
                background: period === opt.key ? "var(--stone-surface)" : "transparent",
                color: "var(--charcoal)",
                padding: "6px 12px",
                borderRadius: 8,
                fontSize: 13,
                cursor: "pointer",
                boxShadow: period === opt.key ? "var(--shadow-soft)" : "none",
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          style={{
            border: "1px solid var(--stone-border)",
            background: "var(--stone-surface)",
            color: "var(--charcoal)",
            padding: "8px 14px",
            borderRadius: 10,
            fontSize: 13,
            cursor: isRefreshing ? "default" : "pointer",
            opacity: isRefreshing ? 0.6 : 1,
          }}
        >
          {isRefreshing ? "Refreshing…" : "Refresh"}
        </button>

        <button
          onClick={onOpenSettings}
          style={{
            border: "1px solid var(--beige-accent)",
            background: "var(--beige-accent-soft)",
            color: "var(--charcoal)",
            padding: "8px 14px",
            borderRadius: 10,
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          Edit Targets
        </button>
      </div>
    </header>
  );
}
