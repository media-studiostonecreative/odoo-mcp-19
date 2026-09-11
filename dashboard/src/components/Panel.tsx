import type { CSSProperties, ReactNode } from "react";

export function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div
      style={{
        background: "var(--stone-surface)",
        border: "1px solid var(--stone-border)",
        borderRadius: 18,
        padding: 24,
        boxShadow: "var(--shadow-soft)",
      }}
    >
      <h2 className="font-display" style={{ fontSize: 20, fontWeight: 500, margin: "0 0 16px" }}>
        {title}
      </h2>
      {children}
    </div>
  );
}

export const tableHeaderStyle: CSSProperties = {
  textAlign: "left",
  fontSize: 12,
  textTransform: "uppercase",
  letterSpacing: 0.5,
  color: "var(--charcoal-soft)",
  padding: "0 10px 8px",
  borderBottom: "1px solid var(--stone-border)",
};

export const tableCellStyle: CSSProperties = {
  padding: "10px 10px",
  fontSize: 14,
  borderBottom: "1px solid var(--stone-border)",
};
