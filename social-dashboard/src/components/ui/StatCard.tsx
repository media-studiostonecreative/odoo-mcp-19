function gaugeColor(value: number): string {
  if (value >= 80) return "var(--second)";
  if (value >= 50) return "var(--accent)";
  return "var(--negative)";
}

function RadialGauge({ value, size = 48, strokeWidth = 5 }: { value: number; size?: number; strokeWidth?: number }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, value));
  const center = size / 2;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink: 0 }} aria-hidden>
      <circle cx={center} cy={center} r={radius} fill="none" stroke="var(--surface-raised)" strokeWidth={strokeWidth} />
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke={gaugeColor(clamped)}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - clamped / 100)}
        transform={`rotate(-90 ${center} ${center})`}
      />
    </svg>
  );
}

const DELTA_COLORS: Record<"positive" | "negative" | "neutral", string> = {
  positive: "var(--second)",
  negative: "var(--negative)",
  neutral: "var(--text-soft)",
};

export function StatCard({ label, value, gauge, delta }: { label: string; value: string; gauge?: number; delta?: { text: string; tone: "positive" | "negative" | "neutral" } }) {
  return (
    <div className="card" style={{ padding: "18px 20px", display: "flex", alignItems: "center", gap: gauge != null ? 16 : 0 }}>
      {gauge != null && <RadialGauge value={gauge} />}
      <div style={{ minWidth: 0 }}>
        <div className="muted" style={{ fontSize: 12, marginBottom: 6 }}>
          {label}
        </div>
        <div className="font-display tabular" style={{ fontSize: 24 }}>
          {value}
        </div>
        {delta && <div style={{ fontSize: 12, color: DELTA_COLORS[delta.tone], marginTop: 4 }}>{delta.text}</div>}
      </div>
    </div>
  );
}
