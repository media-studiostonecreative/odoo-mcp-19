import { Panel, tableHeaderStyle, tableCellStyle } from "./Panel";
import { formatCurrency, formatDate, formatNumber } from "@/lib/format";

interface TopCustomerRow {
  partnerId: number;
  customer: string;
  revenueCompanyCurrency: number;
  orderCount: number;
  lastOrderDate: string;
}

export function TopCustomers({ rows }: { rows: TopCustomerRow[] }) {
  return (
    <Panel title="Top Customers">
      {rows.length === 0 ? (
        <EmptyState />
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={tableHeaderStyle}>Customer</th>
              <th style={{ ...tableHeaderStyle, textAlign: "right" }}>Revenue</th>
              <th style={{ ...tableHeaderStyle, textAlign: "right" }}>Orders</th>
              <th style={{ ...tableHeaderStyle, textAlign: "right" }}>Last Order</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.partnerId}>
                <td style={tableCellStyle}>{row.customer}</td>
                <td style={{ ...tableCellStyle, textAlign: "right" }}>{formatCurrency(row.revenueCompanyCurrency)}</td>
                <td style={{ ...tableCellStyle, textAlign: "right" }}>{formatNumber(row.orderCount)}</td>
                <td style={{ ...tableCellStyle, textAlign: "right" }}>{formatDate(row.lastOrderDate)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Panel>
  );
}

export function EmptyState() {
  return <div style={{ fontSize: 13, color: "var(--charcoal-soft)", padding: "12px 0" }}>No data for this period.</div>;
}
