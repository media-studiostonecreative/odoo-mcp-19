import type { ReactNode } from "react";

export function Page({ title, description, actions, children }: { title: string; description?: string; actions?: ReactNode; children: ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 16 }}>
        <div>
          <h1 className="font-display" style={{ fontSize: 28, margin: 0 }}>
            {title}
          </h1>
          {description && (
            <p className="muted" style={{ fontSize: 14, margin: "6px 0 0", maxWidth: 620 }}>
              {description}
            </p>
          )}
        </div>
        {actions}
      </header>
      {children}
    </div>
  );
}
