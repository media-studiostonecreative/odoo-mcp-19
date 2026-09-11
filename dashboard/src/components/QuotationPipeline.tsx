import { Panel } from "./Panel";
import { formatCurrency, formatNumber } from "@/lib/format";

interface AgingBucket {
  label: string;
  count: number;
  valueCompanyCurrency: number;
}

interface QuotationPipelineProps {
  openCount: number;
  openValueCompanyCurrency: number;
  aging: AgingBucket[];
}

export function QuotationPipeline({ openCount, openValueCompanyCurrency, aging }: QuotationPipelineProps) {
  const maxCount = Math.max(1, ...aging.map((b) => b.count));
  return (
    <Panel title="Quotation Pipeline">
      <div style={{ display: "flex", gap: 24, marginBottom: 18 }}>
        <div>
          <div style={{ fontSize: 12, color: "var(--charcoal-soft)" }}>Open quotations</div>
          <div className="font-display" style={{ fontSize: 24 }}>{formatNumber(openCount)}</div>
        </div>
        <div>
          <div style={{ fontSize: 12, color: "var(--charcoal-soft)" }}>Total open value</div>
          <div className="font-display" style={{ fontSize: 24 }}>{formatCurrency(openValueCompanyCurrency)}</div>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {aging.map((bucket) => (
          <div key={bucket.label} style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 84, fontSize: 13, color: "var(--charcoal-soft)" }}>{bucket.label}</div>
            <div style={{ flex: 1, background: "var(--stone-surface-alt)", borderRadius: 6, height: 10, overflow: "hidden" }}>
              <div
                style={{
                  width: `${(bucket.count / maxCount) * 100}%`,
                  height: "100%",
                  background: "var(--beige-accent)",
                }}
              />
            </div>
            <div style={{ width: 96, fontSize: 13, textAlign: "right" }}>
              {bucket.count} · {formatCurrency(bucket.valueCompanyCurrency)}
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}
