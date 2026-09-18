// dashboard/src/components/ui/Panel.tsx
import type { CSSProperties, ReactNode } from "react";
import { toneVars, type PanelTone } from "./tones";

export function Panel({ title, children, tone, headerAction }: { title: string; children: ReactNode; tone?: PanelTone; headerAction?: ReactNode }) {
  return (
    <div className="bracket-panel" style={{ padding: 24, ...toneVars(tone) } as CSSProperties}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, gap: 12 }}>
        <h2 className="font-display" style={{ fontSize: 19, fontWeight: 500, margin: 0, color: "var(--text)" }}>
          {title}
        </h2>
        {headerAction}
      </div>
      {children}
    </div>
  );
}

export const tableHeaderStyle: CSSProperties = {
  textAlign: "left",
  fontSize: 12,
  textTransform: "uppercase",
  letterSpacing: 0.5,
  color: "var(--text-soft)",
  padding: "0 10px 8px",
  borderBottom: "1px solid var(--border)",
};

export const tableCellStyle: CSSProperties = {
  padding: "10px 10px",
  fontSize: 14,
  borderBottom: "1px solid var(--border)",
  color: "var(--text)",
};
