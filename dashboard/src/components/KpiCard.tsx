import { formatPercent } from "@/lib/format";

interface KpiCardProps {
  label: string;
  value: string;
  changePct: number | null;
  changeLabel?: string;
}

export function KpiCard({ label, value, changePct, changeLabel = "vs previous period" }: KpiCardProps) {
  const isPositive = (changePct ?? 0) >= 0;
  return (
    <div
      style={{
        background: "var(--stone-surface)",
        border: "1px solid var(--stone-border)",
        borderRadius: 16,
        padding: "20px 22px",
        boxShadow: "var(--shadow-soft)",
      }}
    >
      <div style={{ fontSize: 13, color: "var(--charcoal-soft)", marginBottom: 8 }}>{label}</div>
      <div className="font-display" style={{ fontSize: 28, fontWeight: 500, letterSpacing: -0.5 }}>
        {value}
      </div>
      {changePct !== null && (
        <div
          style={{
            marginTop: 8,
            fontSize: 13,
            color: isPositive ? "var(--positive)" : "var(--negative)",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <span>{isPositive ? "▲" : "▼"}</span>
          <span>{formatPercent(changePct)}</span>
          <span style={{ color: "var(--charcoal-soft)" }}>{changeLabel}</span>
        </div>
      )}
    </div>
  );
}
