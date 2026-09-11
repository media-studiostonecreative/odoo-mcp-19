import { Panel, tableHeaderStyle, tableCellStyle } from "./Panel";
import { formatNumber } from "@/lib/format";

interface InventoryRow {
  productId: number;
  product: string;
  sku: string | null;
  qtyAvailable: number;
  qtyForecast: number;
  unitsSoldTrailing60Days: number;
}

export function InventoryAttention({ rows }: { rows: InventoryRow[] }) {
  return (
    <Panel title="Inventory Attention">
      {rows.length === 0 ? (
        <div style={{ fontSize: 13, color: "var(--charcoal-soft)", padding: "12px 0" }}>
          No low-stock items detected.
        </div>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={tableHeaderStyle}>Product</th>
              <th style={{ ...tableHeaderStyle, textAlign: "right" }}>On Hand</th>
              <th style={{ ...tableHeaderStyle, textAlign: "right" }}>Forecasted</th>
              <th style={{ ...tableHeaderStyle, textAlign: "right" }}>Sold (60d)</th>
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 12).map((row) => (
              <tr key={row.productId}>
                <td style={tableCellStyle}>
                  {row.product}
                  {row.sku && <span style={{ color: "var(--charcoal-soft)" }}> · {row.sku}</span>}
                </td>
                <td
                  style={{
                    ...tableCellStyle,
                    textAlign: "right",
                    color: row.qtyAvailable <= 0 ? "var(--negative)" : "inherit",
                  }}
                >
                  {formatNumber(row.qtyAvailable)}
                </td>
                <td style={{ ...tableCellStyle, textAlign: "right" }}>{formatNumber(row.qtyForecast)}</td>
                <td style={{ ...tableCellStyle, textAlign: "right" }}>{formatNumber(row.unitsSoldTrailing60Days)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Panel>
  );
}
