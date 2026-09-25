"use client";

import { useEffect, useRef, useState } from "react";

export interface CalendarDayEntry {
  id: string;
  label: string;
  kind: string;
}

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MAX_VISIBLE = 3;
/** Mouse drags start after a small move; touch/pen need a press-and-hold so a swipe still scrolls. */
const MOUSE_DRAG_THRESHOLD = 4;
const TOUCH_HOLD_MS = 280;
const TOUCH_SLOP = 8;

function isoFor(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function dateAt(x: number, y: number): string | null {
  return document.elementFromPoint(x, y)?.closest("[data-date]")?.getAttribute("data-date") ?? null;
}

interface PendingDrag {
  id: string;
  fromDate: string;
  label: string;
  startX: number;
  startY: number;
  pointerType: string;
  holdTimer: number | null;
  active: boolean;
}

interface ActiveDrag {
  id: string;
  fromDate: string;
  label: string;
  x: number;
  y: number;
  overDate: string | null;
}

/** A month-grid calendar. The caller owns the month/year state, the entries-by-date
 * map, and what a day click means. `kindColor` returns the dot colour for an entry
 * kind. Entries that `canDrag` allows can be dragged to another day (mouse, or
 * press-and-hold on touch); `onMoveEntry` is called with the drop. */
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
  canDrag,
  onMoveEntry,
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
  canDrag?: (entryId: string) => boolean;
  onMoveEntry?: (entryId: string, fromDate: string, toDate: string) => void;
}) {
  const monthLabel = new Date(Date.UTC(year, month, 1)).toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
  const startWeekday = new Date(Date.UTC(year, month, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const now = new Date();
  const todayIso = isoFor(now.getFullYear(), now.getMonth(), now.getDate());

  const pending = useRef<PendingDrag | null>(null);
  const suppressClick = useRef(false);
  const [drag, setDrag] = useState<ActiveDrag | null>(null);

  function reset() {
    if (pending.current?.holdTimer) window.clearTimeout(pending.current.holdTimer);
    pending.current = null;
    setDrag(null);
  }

  useEffect(() => {
    if (!drag) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && reset();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drag]);

  function begin(x: number, y: number) {
    const p = pending.current;
    if (!p) return;
    p.active = true;
    if (p.pointerType !== "mouse") navigator.vibrate?.(10);
    setDrag({ id: p.id, fromDate: p.fromDate, label: p.label, x, y, overDate: p.fromDate });
  }

  function onChipPointerDown(e: React.PointerEvent<HTMLElement>, entry: CalendarDayEntry, date: string) {
    if (!onMoveEntry || !canDrag?.(entry.id) || e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const p: PendingDrag = { id: entry.id, fromDate: date, label: entry.label, startX: e.clientX, startY: e.clientY, pointerType: e.pointerType, holdTimer: null, active: false };
    if (e.pointerType !== "mouse") {
      const { clientX, clientY } = e;
      p.holdTimer = window.setTimeout(() => begin(clientX, clientY), TOUCH_HOLD_MS);
    }
    pending.current = p;
  }

  function onChipPointerMove(e: React.PointerEvent<HTMLElement>) {
    const p = pending.current;
    if (!p) return;
    const moved = Math.hypot(e.clientX - p.startX, e.clientY - p.startY);
    if (!p.active) {
      if (p.pointerType === "mouse" && moved > MOUSE_DRAG_THRESHOLD) begin(e.clientX, e.clientY);
      else if (p.pointerType !== "mouse" && moved > TOUCH_SLOP) reset();
      return;
    }
    e.preventDefault();
    const overDate = dateAt(e.clientX, e.clientY);
    setDrag((d) => (d ? { ...d, x: e.clientX, y: e.clientY, overDate } : d));
  }

  function onChipPointerUp(e: React.PointerEvent<HTMLElement>) {
    const p = pending.current;
    if (!p) return;
    if (p.holdTimer) window.clearTimeout(p.holdTimer);
    pending.current = null;
    if (!p.active) return;
    // The pointerup is followed by a click on the day cell; don't let the drop also open the day.
    suppressClick.current = true;
    window.setTimeout(() => (suppressClick.current = false), 50);
    const toDate = dateAt(e.clientX, e.clientY);
    setDrag(null);
    if (toDate && toDate !== p.fromDate) onMoveEntry?.(p.id, p.fromDate, toDate);
  }

  const cells: (number | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div style={{ userSelect: drag ? "none" : undefined }}>
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
              const isDropTarget = drag !== null && drag.overDate === iso && iso !== drag.fromDate;
              const open = () => {
                if (!suppressClick.current) onSelectDay(iso);
              };
              return (
                <div
                  key={idx}
                  role="button"
                  tabIndex={0}
                  data-date={iso}
                  onClick={open}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      open();
                    }
                  }}
                  aria-label={`${iso}, ${dayEntries.length} item${dayEntries.length === 1 ? "" : "s"}`}
                  style={{
                    minHeight: 84,
                    textAlign: "left",
                    padding: "6px 7px",
                    borderRadius: 8,
                    border: `1px ${isDropTarget ? "dashed" : "solid"} ${isDropTarget || isSelected ? "var(--accent)" : "var(--border)"}`,
                    background: isDropTarget ? "var(--accent-soft)" : dayEntries.length > 0 ? "var(--surface-alt)" : "transparent",
                    cursor: drag ? "grabbing" : "pointer",
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
                  {dayEntries.slice(0, MAX_VISIBLE).map((e) => {
                    const draggable = Boolean(onMoveEntry && canDrag?.(e.id));
                    const beingDragged = drag?.id === e.id;
                    return (
                      <span
                        key={e.id}
                        onPointerDown={draggable ? (ev) => onChipPointerDown(ev, e, iso) : undefined}
                        onPointerMove={draggable ? onChipPointerMove : undefined}
                        onPointerUp={draggable ? onChipPointerUp : undefined}
                        onPointerCancel={draggable ? reset : undefined}
                        onContextMenu={draggable ? (ev) => ev.preventDefault() : undefined}
                        title={draggable ? "Drag to another day to reschedule" : undefined}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 5,
                          fontSize: 11,
                          color: "var(--text)",
                          minWidth: 0,
                          borderRadius: 4,
                          padding: "1px 3px",
                          margin: "0 -3px",
                          cursor: draggable ? (drag ? "grabbing" : "grab") : undefined,
                          touchAction: draggable ? "none" : undefined,
                          userSelect: draggable ? "none" : undefined,
                          WebkitUserSelect: draggable ? "none" : undefined,
                          WebkitTouchCallout: "none",
                          opacity: beingDragged ? 0.35 : 1,
                        }}
                      >
                        <span aria-hidden style={{ width: 6, height: 6, borderRadius: "50%", background: kindColor(e.kind), flexShrink: 0 }} />
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.label}</span>
                      </span>
                    );
                  })}
                  {dayEntries.length > MAX_VISIBLE && (
                    <span style={{ fontSize: 11, color: "var(--text-faint)" }}>+{dayEntries.length - MAX_VISIBLE} more</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {drag && (
        <div
          aria-hidden
          style={{
            position: "fixed",
            left: drag.x + 12,
            top: drag.y - 14,
            zIndex: 200,
            pointerEvents: "none",
            maxWidth: 240,
            padding: "6px 10px",
            borderRadius: 8,
            background: "var(--surface-raised)",
            border: "1px solid var(--accent)",
            boxShadow: "0 8px 24px rgba(0, 0, 0, 0.5)",
            fontSize: 12,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {drag.label}
          {drag.overDate && drag.overDate !== drag.fromDate && (
            <span style={{ color: "var(--accent)", marginLeft: 6 }}>
              → {new Date(`${drag.overDate}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
