const DEFAULT_COLOR = { bg: "var(--stone-surface-alt)", fg: "var(--charcoal-soft)" };
const COLORS: Record<string, { bg: string; fg: string }> = {
  critical: { bg: "rgba(161, 92, 74, 0.12)", fg: "var(--negative)" },
  warning: { bg: "rgba(185, 155, 107, 0.18)", fg: "#8a6a2f" },
  info: DEFAULT_COLOR,
};

export function SeverityBadge({ severity }: { severity: string }) {
  const c = COLORS[severity] ?? DEFAULT_COLOR;
  return (
    <span
      style={{
        background: c.bg,
        color: c.fg,
        fontSize: 11,
        fontWeight: 600,
        textTransform: "uppercase",
        letterSpacing: 0.5,
        padding: "3px 9px",
        borderRadius: 999,
      }}
    >
      {severity}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      style={{
        fontSize: 11,
        color: "var(--charcoal-soft)",
        border: "1px solid var(--stone-border)",
        padding: "3px 9px",
        borderRadius: 999,
        textTransform: "capitalize",
      }}
    >
      {status}
    </span>
  );
}
