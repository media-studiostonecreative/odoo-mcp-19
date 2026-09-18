// dashboard/src/components/ui/StatCard.tsx
function gaugeColor(value: number): string {
  if (value >= 80) return "var(--positive)";
  if (value >= 50) return "var(--warning)";
  return "var(--negative)";
}

function RadialGauge({ value, size = 56, strokeWidth = 6 }: { value: number; size?: number; strokeWidth?: number }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, value));
  const offset = circumference * (1 - clamped / 100);
  const color = gaugeColor(clamped);
  const center = size / 2;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ overflow: "visible", flexShrink: 0 }}>
      <circle cx={center} cy={center} r={radius} fill="none" stroke="var(--border)" strokeWidth={strokeWidth} />
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${center} ${center})`}
        style={{ transition: "stroke-dashoffset 0.6s ease", filter: `drop-shadow(0 0 5px ${color})` }}
      />
    </svg>
  );
}

const DELTA_COLORS: Record<"positive" | "negative" | "neutral", string> = {
  positive: "var(--positive)",
  negative: "var(--negative)",
  neutral: "var(--text-soft)",
};

export function StatCard({
  label,
  value,
  gauge,
  delta,
}: {
  label: string;
  value: string;
  gauge?: number;
  delta?: { text: string; tone: "positive" | "negative" | "neutral" };
}) {
  return (
    <div className="bracket-panel" style={{ padding: "18px 20px", display: "flex", alignItems: "center", gap: gauge != null ? 16 : 0 }}>
      {gauge != null && <RadialGauge value={gauge} />}
      <div>
        <div className="font-mono" style={{ fontSize: 11, color: "var(--text-soft)", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 6 }}>
          {label}
        </div>
        <div className="font-display" style={{ fontSize: 26, fontWeight: 500, color: "var(--text)" }}>
          {value}
        </div>
        {delta && (
          <div className="font-mono" style={{ fontSize: 11, color: DELTA_COLORS[delta.tone], marginTop: 4 }}>
            {delta.text}
          </div>
        )}
      </div>
    </div>
  );
}
