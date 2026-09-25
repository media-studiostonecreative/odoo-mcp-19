/** A small label pill. "outline" is the quiet default; "neutral" is the one to notice. */
export function Badge({ children, variant = "outline" }: { children: string; variant?: "severity" | "outline" | "neutral" | "accent" | "second" }) {
  const cls = variant === "accent" || variant === "neutral" ? "pill pill-accent" : variant === "second" ? "pill pill-second" : "pill";
  return <span className={cls}>{children}</span>;
}
