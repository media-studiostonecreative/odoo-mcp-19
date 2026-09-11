"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const SECTIONS: { href: string; label: string; soon?: boolean }[] = [
  { href: "/website-health", label: "Attention Center" },
  { href: "/website-health/journey-health", label: "Journey Health", soon: true },
  { href: "/website-health/quick-scan", label: "Quick Scan" },
  { href: "/website-health/full-audit", label: "Full Audit", soon: true },
  { href: "/website-health/forms", label: "Forms", soon: true },
  { href: "/website-health/technical", label: "Technical", soon: true },
  { href: "/website-health/performance", label: "Performance", soon: true },
  { href: "/website-health/content", label: "Content", soon: true },
  { href: "/website-health/localization", label: "Localization", soon: true },
  { href: "/website-health/accessibility", label: "Accessibility", soon: true },
  { href: "/website-health/broken-links", label: "Broken Links" },
  { href: "/website-health/visual-regression", label: "Visual Regression", soon: true },
  { href: "/website-health/audit-history", label: "Audit History" },
  { href: "/website-health/settings", label: "Settings" },
];

export function HealthSidebar() {
  const pathname = usePathname();
  return (
    <nav style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 200 }}>
      {SECTIONS.map((s) => {
        const active = s.href === "/website-health" ? pathname === s.href : pathname.startsWith(s.href);
        return (
          <Link
            key={s.href}
            href={s.href}
            style={{
              padding: "9px 14px",
              borderRadius: 10,
              fontSize: 13.5,
              textDecoration: "none",
              color: active ? "var(--charcoal)" : "var(--charcoal-soft)",
              background: active ? "var(--stone-surface)" : "transparent",
              boxShadow: active ? "var(--shadow-soft)" : "none",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span>{s.label}</span>
            {s.soon && (
              <span style={{ fontSize: 10, color: "var(--charcoal-soft)", opacity: 0.7 }}>soon</span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
