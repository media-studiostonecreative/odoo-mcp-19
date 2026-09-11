"use client";

import { useEffect, useState } from "react";
import { Panel, tableHeaderStyle, tableCellStyle } from "@/components/Panel";

interface LinkRow {
  page: string | null;
  label: string;
  status: "pass" | "fail" | "warn";
  details: string;
  created_at: string;
  scan_id: number;
}

type Filter = "all" | "fail" | "warn" | "pass";

const FILTER_LABEL: Record<Filter, string> = {
  all: "All",
  fail: "Broken",
  warn: "Redirect",
  pass: "Healthy",
};

export default function BrokenLinksPage() {
  const [links, setLinks] = useState<LinkRow[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/health/links", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => setLinks(data.links ?? []))
      .finally(() => setLoading(false));
  }, []);

  const visible = filter === "all" ? links : links.filter((l) => l.status === filter);

  return (
    <>
      <div>
        <div style={{ fontSize: 12, letterSpacing: 1.5, textTransform: "uppercase", color: "var(--charcoal-soft)" }}>
          Website Health
        </div>
        <h1 className="font-display" style={{ fontSize: 24, margin: "2px 0 0", fontStyle: "italic", fontWeight: 500 }}>
          Broken Link Explorer
        </h1>
        <p style={{ color: "var(--charcoal-soft)", fontSize: 13.5, marginTop: 6, maxWidth: 640 }}>
          Internal links discovered from the homepage during the most recent Quick Scan. External
          link checking isn&apos;t implemented yet.
        </p>
      </div>

      <Panel title={`Links (${visible.length})`}>
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          {(Object.keys(FILTER_LABEL) as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                border: "1px solid var(--stone-border)",
                background: filter === f ? "var(--stone-surface-alt)" : "transparent",
                borderRadius: 999,
                padding: "5px 12px",
                fontSize: 12.5,
                cursor: "pointer",
              }}
            >
              {FILTER_LABEL[f]}
            </button>
          ))}
        </div>

        {loading ? (
          <p style={{ color: "var(--charcoal-soft)" }}>Loading…</p>
        ) : links.length === 0 ? (
          <p style={{ color: "var(--charcoal-soft)" }}>
            No link data yet — run a Quick Scan from the Quick Scan page first.
          </p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={tableHeaderStyle}>Destination</th>
                  <th style={tableHeaderStyle}>HTTP Status</th>
                  <th style={tableHeaderStyle}>Result</th>
                  <th style={tableHeaderStyle}>Last Checked</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((link, idx) => {
                  const details = safeParse(link.details);
                  return (
                    <tr key={idx}>
                      <td style={tableCellStyle}>
                        <a
                          href={link.page ?? "#"}
                          target="_blank"
                          rel="noreferrer"
                          style={{ color: "var(--beige-accent)", wordBreak: "break-all" }}
                        >
                          {link.page}
                        </a>
                      </td>
                      <td style={tableCellStyle}>{String(details.httpStatus ?? "—")}</td>
                      <td style={tableCellStyle}>
                        <span
                          style={{
                            color:
                              link.status === "fail" ? "var(--negative)" : link.status === "warn" ? "#8a6a2f" : "var(--positive)",
                            fontWeight: 500,
                          }}
                        >
                          {FILTER_LABEL[link.status]}
                        </span>
                      </td>
                      <td style={tableCellStyle}>{new Date(link.created_at).toLocaleString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </>
  );
}

function safeParse(raw: string): Record<string, unknown> {
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}
