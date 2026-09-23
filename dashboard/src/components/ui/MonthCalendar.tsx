// dashboard/src/components/ui/MonthCalendar.tsx
"use client";

import type { CSSProperties } from "react";

export interface CalendarDayEntry {
  id: string;
  label: string;
  kind: string;
}

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function isoFor(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** A month-grid calendar. Pure display + selection — the caller owns the month/year
 * state, the entries-by-date map, and what a day click means (e.g. opening a popup). */
export function MonthCalendar({
  year,
  month,
  entriesByDate,
  onPrevMonth,
  onNextMonth,
  onSelectDay,
  kindColor,
  selectedDate,
}: {
  year: number;
  month: number; // 0-11
  entriesByDate: Record<string, CalendarDayEntry[]>;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onSelectDay: (dateIso: string) => void;
  kindColor: (kind: string) => string;
  selectedDate?: string | null;
}) {
  const monthLabel = new Date(Date.UTC(year, month, 1)).toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
  const startWeekday = new Date(Date.UTC(year, month, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const todayIso = new Date().toISOString().slice(0, 10);

  const cells: (number | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const navButtonStyle: CSSProperties = {
    border: "1px solid var(--border)",
    background: "var(--surface-alt)",
    color: "var(--text)",
    borderRadius: 6,
    width: 28,
    height: 28,
    cursor: "pointer",
    fontSize: 14,
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <button type="button" onClick={onPrevMonth} style={navButtonStyle} aria-label="Previous month">
          ‹
        </button>
        <span className="font-display" style={{ fontSize: 16 }}>
          {monthLabel}
        </span>
        <button type="button" onClick={onNextMonth} style={navButtonStyle} aria-label="Next month">
          ›
        </button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginBottom: 6 }}>
        {WEEKDAY_LABELS.map((d) => (
          <div key={d} className="font-mono" style={{ fontSize: 10, color: "var(--text-soft)", textAlign: "center", textTransform: "uppercase" }}>
            {d}
          </div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
        {cells.map((day, idx) => {
          if (day === null) return <div key={idx} />;
          const iso = isoFor(year, month, day);
          const dayEntries = entriesByDate[iso] ?? [];
          const isToday = iso === todayIso;
          const isSelected = iso === selectedDate;
          return (
            <button
              key={idx}
              type="button"
              onClick={() => onSelectDay(iso)}
              style={{
                minHeight: 62,
                textAlign: "left",
                padding: 5,
                borderRadius: 8,
                border: `1px solid ${isSelected ? "var(--accent)" : "var(--border)"}`,
                background: isToday ? "var(--surface-alt)" : "var(--surface)",
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                gap: 2,
                overflow: "hidden",
              }}
            >
              <span className="font-mono" style={{ fontSize: 10.5, color: isToday ? "var(--accent)" : "var(--text-soft)" }}>
                {day}
              </span>
              {dayEntries.slice(0, 2).map((e) => (
                <span
                  key={e.id}
                  style={{
                    fontSize: 9,
                    color: "var(--text)",
                    background: kindColor(e.kind),
                    borderRadius: 3,
                    padding: "1px 4px",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {e.label}
                </span>
              ))}
              {dayEntries.length > 2 && <span style={{ fontSize: 9, color: "var(--text-soft)" }}>+{dayEntries.length - 2} more</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
