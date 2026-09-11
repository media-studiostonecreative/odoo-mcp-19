"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Panel } from "@/components/Panel";

// Presentational copy of config.ts's DEFAULT_QUICK_SCAN_PAGES — client components
// can't import server-only modules, so this list is display-only, never logic-bearing.
const PAGES: { url: string; label: string }[] = [
  { url: "https://studiostonecreative.com", label: "Homepage" },
  { url: "https://studiostonecreative.com/collections/all", label: "Shop / Collections" },
  { url: "https://studiostonecreative.com/pages/classroom", label: "Education (Classroom)" },
  { url: "https://studiostonecreative.com/policies/contact-information", label: "Contact information" },
  { url: "https://studiostonecreative.com/cart", label: "Cart" },
  { url: "https://studiostone.odoo.com", label: "Wholesale Homepage" },
];

interface CheckRow {
  id: number;
  check_type: string;
  category: string;
  page: string | null;
  label: string;
  status: "pass" | "fail" | "warn";
  details: string;
}

interface ScanStatus {
  id: number;
  status: "running" | "completed" | "failed";
  total_checks: number;
  completed_checks: number;
  passed_checks: number;
  failed_checks: number;
  warned_checks: number;
  current_label: string | null;
  started_at: string;
  finished_at: string | null;
  error: string | null;
}

function pageStatus(checks: CheckRow[], pageUrl: string): "pass" | "fail" | "warn" | "pending" {
  const relevant = checks.filter((c) => c.page === pageUrl && c.check_type !== "link");
  if (relevant.length === 0) return "pending";
  if (relevant.some((c) => c.status === "fail")) return "fail";
  if (relevant.some((c) => c.status === "warn")) return "warn";
  return "pass";
}

function icon(status: "pass" | "fail" | "warn" | "pending"): string {
  if (status === "pass") return "✓";
  if (status === "fail") return "✗";
  if (status === "warn") return "⚠";
  return "○";
}

export default function QuickScanPage() {
  const [scan, setScan] = useState<ScanStatus | null>(null);
  const [checks, setChecks] = useState<CheckRow[]>([]);
  const [starting, setStarting] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const pollScan = useCallback((id: number) => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      const res = await fetch(`/api/health/scan/${id}`, { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setScan(data.scan);
      setChecks(data.checks);
      if (data.scan.status !== "running" && pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    }, 1500);
  }, []);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  async function handleStart() {
    setStarting(true);
    try {
      const res = await fetch("/api/health/scan/start", { method: "POST" });
      if (res.ok) {
        const { scanId } = await res.json();
        pollScan(scanId);
      }
    } finally {
      setStarting(false);
    }
  }

  const running = scan?.status === "running";
  const linkChecks = checks.filter((c) => c.check_type === "link");

  return (
    <>
      <div>
        <div style={{ fontSize: 12, letterSpacing: 1.5, textTransform: "uppercase", color: "var(--charcoal-soft)" }}>
          Website Health
        </div>
        <h1 className="font-display" style={{ fontSize: 24, margin: "2px 0 0", fontStyle: "italic", fontWeight: 500 }}>
          Quick Scan
        </h1>
        <p style={{ color: "var(--charcoal-soft)", fontSize: 13.5, marginTop: 6, maxWidth: 640 }}>
          Live Playwright checks against the public site only — reachability, navigation, console
          errors, failed network requests, mobile (390px) layout, and an internal link sweep. Never
          submits forms, adds to cart for real, or touches Odoo admin.
        </p>
      </div>

      <Panel title="Run">
        <button
          onClick={handleStart}
          disabled={starting || running}
          style={{
            border: "1px solid var(--beige-accent)",
            background: "var(--beige-accent)",
            color: "var(--charcoal)",
            padding: "10px 18px",
            borderRadius: 10,
            fontSize: 13.5,
            cursor: starting || running ? "default" : "pointer",
            opacity: starting || running ? 0.6 : 1,
          }}
        >
          {running ? "Scanning…" : "Run Quick Scan"}
        </button>

        {scan && (
          <div style={{ marginTop: 20 }}>
            <div style={{ fontSize: 13.5, marginBottom: 10 }}>
              {scan.status === "running" && `Scanning website... ${scan.completed_checks} / ${scan.total_checks} checks completed`}
              {scan.status === "completed" &&
                `Completed — ${scan.passed_checks} passed, ${scan.warned_checks} warned, ${scan.failed_checks} failed`}
              {scan.status === "failed" && `Scan failed: ${scan.error ?? "unknown error"}`}
            </div>

            <div style={{ height: 6, background: "var(--stone-surface-alt)", borderRadius: 999, overflow: "hidden", marginBottom: 16 }}>
              <div
                style={{
                  height: "100%",
                  width: `${scan.total_checks ? Math.min(100, (scan.completed_checks / scan.total_checks) * 100) : 0}%`,
                  background: scan.failed_checks > 0 ? "var(--negative)" : "var(--positive)",
                  transition: "width 0.3s ease",
                }}
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 14 }}>
              {PAGES.map((p) => {
                const status = pageStatus(checks, p.url);
                return (
                  <div key={p.url} style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <span
                      style={{
                        width: 18,
                        color:
                          status === "fail"
                            ? "var(--negative)"
                            : status === "warn"
                              ? "#8a6a2f"
                              : status === "pass"
                                ? "var(--positive)"
                                : "var(--charcoal-soft)",
                      }}
                    >
                      {icon(status)}
                    </span>
                    <span>{p.label}</span>
                  </div>
                );
              })}
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <span style={{ width: 18, color: linkChecks.length ? "var(--positive)" : "var(--charcoal-soft)" }}>
                  {linkChecks.length ? "✓" : "○"}
                </span>
                <span>
                  Broken link scan
                  {linkChecks.length > 0 &&
                    ` — ${linkChecks.filter((c) => c.status === "pass").length} healthy, ${linkChecks.filter((c) => c.status === "warn").length} redirect, ${linkChecks.filter((c) => c.status === "fail").length} broken`}
                </span>
              </div>
            </div>
          </div>
        )}
      </Panel>
    </>
  );
}
