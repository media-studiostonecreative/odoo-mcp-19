"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "Business Pulse" },
  { href: "/website-health", label: "Website Health" },
];

export function AppNav() {
  const pathname = usePathname();
  return (
    <div
      style={{
        display: "flex",
        gap: 4,
        padding: "10px 32px 0",
        background: "var(--stone-surface)",
        borderBottom: "1px solid var(--stone-border)",
      }}
    >
      {TABS.map((tab) => {
        const active = tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            style={{
              padding: "8px 16px",
              fontSize: 13,
              fontWeight: 500,
              borderRadius: "10px 10px 0 0",
              color: active ? "var(--charcoal)" : "var(--charcoal-soft)",
              background: active ? "var(--stone-bg)" : "transparent",
              border: active ? "1px solid var(--stone-border)" : "1px solid transparent",
              borderBottom: active ? "1px solid var(--stone-bg)" : "1px solid transparent",
              marginBottom: -1,
              textDecoration: "none",
            }}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
