// dashboard/src/components/ui/Badge.tsx
const SEVERITY_COLORS: Record<string, { bg: string; fg: string }> = {
  critical: { bg: "rgba(255, 138, 128, 0.14)", fg: "var(--negative)" },
  warning: { bg: "rgba(240, 201, 117, 0.16)", fg: "var(--warning)" },
};
const DEFAULT_COLOR = { bg: "var(--surface-alt)", fg: "var(--text-soft)" };

/** One pill for severity, status, or a plain label — `variant` picks the color rule. */
export function Badge({ children, variant = "neutral" }: { children: string; variant?: "severity" | "outline" | "neutral" }) {
  const c = variant === "severity" ? (SEVERITY_COLORS[children.toLowerCase()] ?? DEFAULT_COLOR) : DEFAULT_COLOR;
  return (
    <span
      className="font-mono"
      style={{
        background: variant === "outline" ? "transparent" : c.bg,
        color: c.fg,
        border: variant === "outline" ? "1px solid var(--border)" : "none",
        fontSize: 10.5,
        fontWeight: 600,
        textTransform: "uppercase",
        letterSpacing: 1,
        padding: "3px 9px",
        borderRadius: 4,
        display: "inline-block",
      }}
    >
      {children}
    </span>
  );
}
