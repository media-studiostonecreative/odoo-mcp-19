"use client";

import { useState } from "react";

interface NavItem {
  href: string;
  label: string;
  enabled: boolean;
}

const ISSUES: NavItem = { href: "/", label: "Issues", enabled: true };

const BUSINESS_AND_MARKETING: NavItem[] = [
  { href: "/business", label: "Business Data", enabled: false },
  { href: "/marketing/email", label: "Email Marketing", enabled: false },
  { href: "/marketing/journey", label: "Customer Journey", enabled: false },
  { href: "/marketing/social", label: "Social Media", enabled: false },
];

const TOOLS: NavItem[] = [
  { href: "/tools/quick-scan", label: "Quick Scan", enabled: false },
  { href: "/tools/audit-history", label: "Audit History", enabled: false },
  { href: "/tools/settings", label: "Settings", enabled: false },
];

function NavLink({ item }: { item: NavItem }) {
  const style = {
    display: "block",
    padding: "8px 14px",
    borderRadius: 8,
    fontSize: 13,
    color: item.enabled ? "var(--text)" : "var(--text-soft)",
    opacity: item.enabled ? 1 : 0.5,
    textDecoration: "none",
    cursor: item.enabled ? "pointer" : "default",
  };
  if (!item.enabled) {
    return <span style={style}>{item.label}</span>;
  }
  return (
    <a href={item.href} style={{ ...style, background: "var(--surface-alt)" }}>
      {item.label}
    </a>
  );
}

export function Sidebar() {
  const [toolsOpen, setToolsOpen] = useState(false);

  return (
    <nav
      className="font-mono"
      style={{
        width: 220,
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        gap: 20,
        padding: "28px 14px",
        borderRight: "1px solid var(--border)",
      }}
    >
      <div style={{ padding: "0 14px", fontSize: 11, textTransform: "uppercase", letterSpacing: 1, color: "var(--text-soft)" }}>
        Studiostone Creative
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <NavLink item={ISSUES} />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {BUSINESS_AND_MARKETING.map((item) => (
          <NavLink key={item.href} item={item} />
        ))}
      </div>

      <div>
        <button
          onClick={() => setToolsOpen((v) => !v)}
          style={{
            width: "100%",
            textAlign: "left",
            padding: "8px 14px",
            background: "transparent",
            border: "none",
            color: "var(--text-soft)",
            fontSize: 11,
            textTransform: "uppercase",
            letterSpacing: 0.8,
            cursor: "pointer",
          }}
        >
          {toolsOpen ? "▾" : "▸"} Tools
        </button>
        {toolsOpen && (
          <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 4 }}>
            {TOOLS.map((item) => (
              <NavLink key={item.href} item={item} />
            ))}
          </div>
        )}
      </div>
    </nav>
  );
}
