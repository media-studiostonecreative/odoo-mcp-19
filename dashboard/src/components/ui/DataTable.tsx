// dashboard/src/components/ui/DataTable.tsx
import { tableHeaderStyle, tableCellStyle } from "./Panel";

export interface DataTableColumn<T> {
  header: string;
  render: (row: T) => React.ReactNode;
  align?: "left" | "right";
}

export function DataTable<T>({ columns, rows, emptyText, onRowClick }: { columns: DataTableColumn<T>[]; rows: T[]; emptyText: string; onRowClick?: (row: T) => void }) {
  if (rows.length === 0) return <p style={{ color: "var(--text-soft)", fontSize: 13 }}>{emptyText}</p>;
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.header} style={{ ...tableHeaderStyle, textAlign: c.align ?? "left" }}>
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr key={idx} onClick={onRowClick ? () => onRowClick(row) : undefined} style={{ cursor: onRowClick ? "pointer" : "default" }}>
              {columns.map((c) => (
                <td key={c.header} style={{ ...tableCellStyle, textAlign: c.align ?? "left" }}>
                  {c.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
