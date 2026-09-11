import { Panel } from "./Panel";
import { EmptyState } from "./TopCustomers";
import { formatCurrency } from "@/lib/format";

interface RegionRow {
  region: string;
  revenueCompanyCurrency: number;
  orderCount: number;
}

const REGION_ORDER = ["Canada", "United States", "United Kingdom", "European Union", "Other"];

export function RegionalPerformance({ rows }: { rows: RegionRow[] }) {
  const byRegion = new Map(rows.map((r) => [r.region, r]));
  const ordered = REGION_ORDER.map((region) => byRegion.get(region)).filter(
    (r): r is RegionRow => r !== undefined,
  );
  const maxRevenue = Math.max(1, ...ordered.map((r) => r.revenueCompanyCurrency));

  return (
    <Panel title="Regional Performance">
      {ordered.length === 0 ? (
        <EmptyState />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {ordered.map((row) => (
            <div key={row.region} style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 130, fontSize: 13 }}>{row.region}</div>
              <div style={{ flex: 1, background: "var(--stone-surface-alt)", borderRadius: 6, height: 10, overflow: "hidden" }}>
                <div
                  style={{
                    width: `${(row.revenueCompanyCurrency / maxRevenue) * 100}%`,
                    height: "100%",
                    background: "var(--beige-accent)",
                  }}
                />
              </div>
              <div style={{ width: 130, fontSize: 13, textAlign: "right" }}>
                {formatCurrency(row.revenueCompanyCurrency)} · {row.orderCount}
              </div>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}
