import { Panel, tableHeaderStyle, tableCellStyle } from "./Panel";
import { EmptyState } from "./TopCustomers";
import { formatDate } from "@/lib/format";

interface RecentOrderRow {
  orderNumber: string;
  customer: string;
  date: string;
  total: number;
  currency: string;
  status: string;
}

export function RecentActivity({ rows }: { rows: RecentOrderRow[] }) {
  return (
    <Panel title="Recent Activity">
      {rows.length === 0 ? (
        <EmptyState />
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={tableHeaderStyle}>Order</th>
              <th style={tableHeaderStyle}>Customer</th>
              <th style={tableHeaderStyle}>Date</th>
              <th style={{ ...tableHeaderStyle, textAlign: "right" }}>Total</th>
              <th style={tableHeaderStyle}>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.orderNumber}>
                <td style={tableCellStyle}>{row.orderNumber}</td>
                <td style={tableCellStyle}>{row.customer}</td>
                <td style={tableCellStyle}>{formatDate(row.date)}</td>
                <td style={{ ...tableCellStyle, textAlign: "right" }}>
                  {new Intl.NumberFormat("en-CA", { style: "currency", currency: row.currency || "CAD" }).format(row.total)}
                </td>
                <td style={tableCellStyle}>
                  <span
                    style={{
                      fontSize: 12,
                      padding: "3px 10px",
                      borderRadius: 999,
                      background: "var(--stone-surface-alt)",
                      color: "var(--charcoal-soft)",
                    }}
                  >
                    {row.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Panel>
  );
}
