import type { CSSProperties, ReactNode } from "react";

/**
 * A section card. `about` holds the longer explanation of where the data comes
 * from — collapsed behind an "About this" toggle so the section itself stays
 * uncluttered. `tone` is accepted for older call sites and ignored: this board
 * deliberately uses one border colour.
 */
export function Panel({
  title,
  subtitle,
  about,
  children,
  headerAction,
}: {
  title: string;
  subtitle?: ReactNode;
  about?: ReactNode;
  children: ReactNode;
  tone?: string;
  headerAction?: ReactNode;
}) {
  return (
    <section className="card" style={{ padding: "22px 24px 24px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18, gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
          <h2 className="font-display" style={{ fontSize: 16, margin: 0 }}>
            {title}
          </h2>
          {subtitle && (
            <p className="muted" style={{ fontSize: 13, margin: 0 }}>
              {subtitle}
            </p>
          )}
          {about && (
            <details className="about" style={{ marginTop: 4 }}>
              <summary>About this</summary>
              {about}
            </details>
          )}
        </div>
        {headerAction}
      </div>
      {children}
    </section>
  );
}

export const tableHeaderStyle: CSSProperties = {
  textAlign: "left",
  fontSize: 11.5,
  fontWeight: 500,
  color: "var(--text-faint)",
  padding: "0 12px 10px",
  borderBottom: "1px solid var(--border)",
  whiteSpace: "nowrap",
};

export const tableCellStyle: CSSProperties = {
  padding: "12px 12px",
  fontSize: 13,
  borderBottom: "1px solid var(--border)",
  color: "var(--text)",
  fontVariantNumeric: "tabular-nums",
};
