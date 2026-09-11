import { Panel, tableHeaderStyle, tableCellStyle } from "./Panel";
import { EmptyState } from "./TopCustomers";
import { formatCurrency, formatNumber } from "@/lib/format";

interface TopProductRow {
  productId: number;
  product: string;
  unitsSold: number;
  bookedSalesCompanyCurrency: number;
}

export function TopProducts({ rows }: { rows: TopProductRow[] }) {
  return (
    <Panel title="Top Products">
      {rows.length === 0 ? (
        <EmptyState />
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={tableHeaderStyle}>Product</th>
              <th style={{ ...tableHeaderStyle, textAlign: "right" }}>Units Sold</th>
              <th style={{ ...tableHeaderStyle, textAlign: "right" }}>Booked Sales</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.productId}>
                <td style={tableCellStyle}>{row.product}</td>
                <td style={{ ...tableCellStyle, textAlign: "right" }}>{formatNumber(row.unitsSold)}</td>
                <td style={{ ...tableCellStyle, textAlign: "right" }}>{formatCurrency(row.bookedSalesCompanyCurrency)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Panel>
  );
}
