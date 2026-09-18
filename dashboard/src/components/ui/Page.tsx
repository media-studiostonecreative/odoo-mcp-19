// dashboard/src/components/ui/Page.tsx
import type { ReactNode } from "react";

export function Page({ title, description, actions, children }: { title: string; description?: string; actions?: ReactNode; children: ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
        <div>
          <h1 className="font-display" style={{ fontSize: 26, margin: 0, fontStyle: "italic", fontWeight: 500 }}>
            {title}
          </h1>
          {description && <p style={{ fontSize: 13, color: "var(--text-soft)", marginTop: 6, maxWidth: 640 }}>{description}</p>}
        </div>
        {actions}
      </header>
      {children}
    </div>
  );
}
