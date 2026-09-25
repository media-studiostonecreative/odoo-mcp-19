"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/", label: "Planner" },
  { href: "/posts", label: "Post log" },
];

export function TopBar({ person }: { person: { name: string } | null }) {
  const pathname = usePathname();
  const nav = NAV;

  async function switchPerson() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.assign("/login");
  }

  return (
    <header style={{ borderBottom: "1px solid var(--border)", position: "sticky", top: 0, zIndex: 50, background: "rgba(11, 11, 12, 0.85)", backdropFilter: "blur(10px)" }}>
      <div className="topbar">
        <Link href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 10 }}>
          <span aria-hidden style={{ width: 10, height: 10, borderRadius: 3, background: "var(--accent)" }} />
          <span className="topbar-brand" style={{ fontWeight: 600, fontSize: 14, letterSpacing: "-0.01em", whiteSpace: "nowrap" }}>
            Studiostone Social
          </span>
        </Link>

        {person && (
          <nav style={{ display: "flex", gap: 4 }}>
            {nav.map((item) => {
              const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  style={{
                    textDecoration: "none",
                    fontSize: 13,
                    padding: "6px 10px",
                    whiteSpace: "nowrap",
                    borderRadius: 6,
                    color: active ? "var(--text)" : "var(--text-soft)",
                    background: active ? "var(--surface-raised)" : "transparent",
                  }}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        )}

        {person && (
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
              <span
                aria-hidden
                style={{ width: 24, height: 24, borderRadius: "50%", background: "var(--surface-raised)", display: "grid", placeItems: "center", fontSize: 11, fontWeight: 600 }}
              >
                {person.name.charAt(0).toUpperCase()}
              </span>
              <span className="topbar-name">{person.name}</span>
            </span>
            <button type="button" className="btn btn-ghost btn-sm" onClick={switchPerson} title="Forget this device and enter a different name">
              Not you?
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
