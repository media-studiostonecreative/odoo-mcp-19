"use client";

export interface CalendarDayEntry {
  id: string;
  label: string;
  kind: string;
}

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MAX_VISIBLE = 3;

function isoFor(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** A month-grid calendar. Pure display + selection — the caller owns the month/year
 * state, the entries-by-date map, and what a day click means (e.g. opening a popup).
 * `kindColor` returns the dot colour for an entry kind. */
export function MonthCalendar({
  year,
  month,
  entriesByDate,
  onPrevMonth,
  onNextMonth,
  onToday,
  onSelectDay,
  kindColor,
  selectedDate,
}: {
  year: number;
  month: number; // 0-11
  entriesByDate: Record<string, CalendarDayEntry[]>;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onToday?: () => void;
  onSelectDay: (dateIso: string) => void;
  kindColor: (kind: string) => string;
  selectedDate?: string | null;
}) {
  const monthLabel = new Date(Date.UTC(year, month, 1)).toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
  const startWeekday = new Date(Date.UTC(year, month, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const now = new Date();
  const todayIso = isoFor(now.getFullYear(), now.getMonth(), now.getDate());

  const cells: (number | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <span className="font-display" style={{ fontSize: 15, marginRight: "auto" }}>
          {monthLabel}
        </span>
        {onToday && (
          <button type="button" className="btn btn-sm" onClick={onToday}>
            Today
          </button>
        )}
        <button type="button" className="btn btn-sm" onClick={onPrevMonth} aria-label="Previous month">
          ‹
        </button>
        <button type="button" className="btn btn-sm" onClick={onNextMonth} aria-label="Next month">
          ›
        </button>
      </div>
      <div style={{ overflowX: "auto" }}>
        <div style={{ minWidth: 560 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginBottom: 6 }}>
            {WEEKDAY_LABELS.map((d) => (
              <div key={d} style={{ fontSize: 11, color: "var(--text-faint)", padding: "0 6px" }}>
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
                  aria-label={`${iso}, ${dayEntries.length} item${dayEntries.length === 1 ? "" : "s"}`}
                  style={{
                    minHeight: 84,
                    textAlign: "left",
                    padding: "6px 7px",
                    borderRadius: 8,
                    border: `1px solid ${isSelected ? "var(--accent)" : "var(--border)"}`,
                    background: dayEntries.length > 0 ? "var(--surface-alt)" : "transparent",
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    gap: 3,
                    overflow: "hidden",
                    minWidth: 0,
                  }}
                >
                  <span
                    className="tabular"
                    style={{
                      fontSize: 12,
                      fontWeight: isToday ? 600 : 400,
                      color: isToday ? "var(--on-accent)" : "var(--text-soft)",
                      background: isToday ? "var(--accent)" : "transparent",
                      borderRadius: 999,
                      minWidth: 20,
                      height: 20,
                      display: "inline-grid",
                      placeItems: "center",
                      alignSelf: "flex-start",
                      padding: isToday ? "0 5px" : 0,
                      marginBottom: 2,
                    }}
                  >
                    {day}
                  </span>
                  {dayEntries.slice(0, MAX_VISIBLE).map((e) => (
                    <span key={e.id} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "var(--text)", minWidth: 0 }}>
                      <span aria-hidden style={{ width: 6, height: 6, borderRadius: "50%", background: kindColor(e.kind), flexShrink: 0 }} />
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.label}</span>
                    </span>
                  ))}
                  {dayEntries.length > MAX_VISIBLE && (
                    <span style={{ fontSize: 11, color: "var(--text-faint)" }}>+{dayEntries.length - MAX_VISIBLE} more</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
