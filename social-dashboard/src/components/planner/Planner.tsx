"use client";

import { useMemo, useState } from "react";
import { MonthCalendar, type CalendarDayEntry } from "@/components/ui/MonthCalendar";
import {
  buildCalendarEntries,
  upcomingDeadlineAlerts,
  type CalendarEntry,
  type CalendarOccasion,
  type CalendarTradeShow,
} from "@/lib/social/calendarEntries";
import { PostDrawer } from "./PostDrawer";
import { FORMAT_LABEL, PLATFORM_LABEL, STATUS_LABEL, readError, shortDate, statusPillClass, type Me, type PlannerIdea } from "./types";

/**
 * Colour rule for the calendar, kept to the board's two highlights:
 * amber = needs doing (scheduled posts, post-by deadlines), sage = settled
 * (posted, events you're attending), grey = context (holidays).
 */
type DayKind = "scheduled" | "deadline" | "posted" | "event" | "holiday";
const DAY_KIND: Record<DayKind, { label: string; color: string }> = {
  scheduled: { label: "Scheduled post", color: "var(--accent)" },
  deadline: { label: "Post-by deadline", color: "var(--accent)" },
  posted: { label: "Posted", color: "var(--second)" },
  event: { label: "Event", color: "var(--second)" },
  holiday: { label: "Holiday", color: "var(--text-faint)" },
};

const UPCOMING_DAYS = 14;

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function Planner({
  ideas,
  occasions,
  tradeShows,
  loading,
  me,
  onIdeasChanged,
  onCalendarChanged,
}: {
  ideas: PlannerIdea[];
  occasions: CalendarOccasion[];
  tradeShows: CalendarTradeShow[];
  loading: boolean;
  me: Me | null;
  onIdeasChanged: () => void;
  onCalendarChanged: () => void;
}) {
  const [openIdeaId, setOpenIdeaId] = useState<number | null>(null);
  const openIdea = ideas.find((i) => i.id === openIdeaId) ?? null;
  const ideaById = useMemo(() => new Map(ideas.map((i) => [i.id, i])), [ideas]);

  const entries = useMemo(
    () =>
      buildCalendarEntries(
        occasions,
        tradeShows,
        ideas.map((i) => ({ id: i.id, idea_type: i.idea_type, target_date: i.target_date, product: i.product, platform: i.platform, status: i.status, format: i.format })),
      ),
    [occasions, tradeShows, ideas],
  );

  const kindOf = (e: CalendarEntry): DayKind => {
    if (e.ideaId != null) return ideaById.get(e.ideaId)?.status === "used" ? "posted" : "scheduled";
    if (e.type === "post-deadline") return "deadline";
    if (e.type === "trade-show") return "event";
    return "holiday";
  };

  const deadlines = useMemo(() => upcomingDeadlineAlerts(entries, 2), [entries]);

  const today = todayIso();
  const horizon = addDays(today, UPCOMING_DAYS);
  const upcoming = ideas
    .filter((i) => i.target_date && i.target_date >= today && i.target_date <= horizon && i.status !== "dismissed")
    .sort((a, b) => (a.target_date! + (a.suggested_time ?? "")).localeCompare(b.target_date! + (b.suggested_time ?? "")));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {deadlines.length > 0 && (
        <div className="card" style={{ padding: "14px 18px", borderColor: "rgba(242, 184, 75, 0.35)", display: "flex", gap: 14, alignItems: "flex-start" }}>
          <span className="pill pill-accent" style={{ flexShrink: 0 }}>
            <span className="dot" />
            Due soon
          </span>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {deadlines.map((d) => (
              <p key={d.key} style={{ margin: 0, fontSize: 13 }}>
                <strong style={{ fontWeight: 600 }}>{shortDate(d.date)}</strong>
                <span className="muted"> · {d.label.replace(/^Post-by deadline: /, "Have a post live for ")}</span>
              </p>
            ))}
          </div>
        </div>
      )}

      <div className="planner-grid">
        <UpcomingList ideas={upcoming} loading={loading} onOpen={setOpenIdeaId} />
        <CalendarCard entries={entries} kindOf={kindOf} ideaById={ideaById} onOpenIdea={setOpenIdeaId} onChanged={onCalendarChanged} />
      </div>

      <IdeasCard ideas={ideas} loading={loading} onOpen={setOpenIdeaId} />

      {openIdea && <PostDrawer idea={openIdea} me={me} onClose={() => setOpenIdeaId(null)} onChanged={onIdeasChanged} />}
    </div>
  );
}

function PostRow({ idea, onOpen, showDate = true }: { idea: PlannerIdea; onOpen: (id: number) => void; showDate?: boolean }) {
  return (
    <button
      type="button"
      onClick={() => onOpen(idea.id)}
      style={{
        display: "grid",
        gridTemplateColumns: showDate ? "52px minmax(0, 1fr) auto" : "minmax(0, 1fr) auto",
        gap: 12,
        alignItems: "center",
        width: "100%",
        textAlign: "left",
        background: "transparent",
        border: "none",
        borderBottom: "1px solid var(--border)",
        padding: "12px 0",
        cursor: "pointer",
      }}
    >
      {showDate && (
        <span className="tabular" style={{ lineHeight: 1.25 }}>
          {idea.target_date ? (
            <>
              <span style={{ display: "block", fontSize: 11, color: "var(--text-faint)" }}>{new Date(`${idea.target_date}T00:00:00`).toLocaleDateString("en-US", { weekday: "short" })}</span>
              <span style={{ display: "block", fontSize: 13, color: "var(--text)" }}>{new Date(`${idea.target_date}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
            </>
          ) : (
            "—"
          )}
        </span>
      )}
      <span style={{ minWidth: 0 }}>
        <span style={{ display: "block", fontSize: 13.5, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{idea.product}</span>
        <span style={{ display: "block", fontSize: 12, color: "var(--text-faint)", marginTop: 2 }}>
          {PLATFORM_LABEL[idea.platform] ?? idea.platform} · {FORMAT_LABEL[idea.format]}
          {idea.suggested_time && idea.target_date ? ` · ${idea.suggested_time}` : ""}
          {idea.comments.length > 0 ? ` · ${idea.comments.length} comment${idea.comments.length === 1 ? "" : "s"}` : ""}
        </span>
      </span>
      <span className={statusPillClass(idea.status)}>
        <span className="dot" />
        {STATUS_LABEL[idea.status]}
      </span>
    </button>
  );
}

function UpcomingList({ ideas, loading, onOpen }: { ideas: PlannerIdea[]; loading: boolean; onOpen: (id: number) => void }) {
  return (
    <section className="card" style={{ padding: "20px 22px" }}>
      <h2 className="font-display" style={{ fontSize: 16, margin: "0 0 4px" }}>
        Next two weeks
      </h2>
      <p className="muted" style={{ fontSize: 13, margin: "0 0 8px" }}>
        {loading ? "Loading…" : ideas.length === 0 ? "Nothing scheduled yet." : `${ideas.length} post${ideas.length === 1 ? "" : "s"} going out`}
      </p>
      <div>
        {ideas.map((i) => (
          <PostRow key={i.id} idea={i} onOpen={onOpen} />
        ))}
      </div>
    </section>
  );
}

function CalendarCard({
  entries,
  kindOf,
  ideaById,
  onOpenIdea,
  onChanged,
}: {
  entries: CalendarEntry[];
  kindOf: (e: CalendarEntry) => DayKind;
  ideaById: Map<number, PlannerIdea>;
  onOpenIdea: (id: number) => void;
  onChanged: () => void;
}) {
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showEventForm, setShowEventForm] = useState(false);

  const byDate = useMemo(() => {
    const map: Record<string, CalendarEntry[]> = {};
    for (const e of entries) (map[e.date] ??= []).push(e);
    return map;
  }, [entries]);

  const gridEntries = useMemo(() => {
    const map: Record<string, CalendarDayEntry[]> = {};
    for (const [date, list] of Object.entries(byDate)) {
      map[date] = list.map((e) => {
        const idea = e.ideaId != null ? ideaById.get(e.ideaId) : undefined;
        const label = idea ? `${idea.format === "story" ? "Story · " : ""}${idea.product}` : e.type === "post-deadline" ? e.label.replace(/^Post-by deadline: /, "Post by · ") : e.label;
        return { id: e.key, label, kind: kindOf(e) };
      });
    }
    return map;
  }, [byDate, ideaById, kindOf]);

  const shift = (delta: number) => {
    const d = new Date(Date.UTC(viewYear, viewMonth + delta, 1));
    setViewYear(d.getUTCFullYear());
    setViewMonth(d.getUTCMonth());
  };

  const selected = selectedDate ? (byDate[selectedDate] ?? []) : [];

  return (
    <section className="card" style={{ padding: "20px 22px", minWidth: 0 }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
        <div style={{ marginRight: "auto" }}>
          <h2 className="font-display" style={{ fontSize: 16, margin: "0 0 8px" }}>
            Calendar
          </h2>
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
            {(Object.keys(DAY_KIND) as DayKind[]).map((k) => (
              <span key={k} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--text-soft)" }}>
                <span aria-hidden style={{ width: 6, height: 6, borderRadius: "50%", background: DAY_KIND[k].color }} />
                {DAY_KIND[k].label}
              </span>
            ))}
          </div>
        </div>
        <button type="button" className="btn btn-sm" onClick={() => setShowEventForm((v) => !v)}>
          {showEventForm ? "Cancel" : "Add event"}
        </button>
      </div>

      {showEventForm && (
        <EventForm
          onSaved={() => {
            setShowEventForm(false);
            onChanged();
          }}
        />
      )}

      <MonthCalendar
        year={viewYear}
        month={viewMonth}
        entriesByDate={gridEntries}
        selectedDate={selectedDate}
        onPrevMonth={() => shift(-1)}
        onNextMonth={() => shift(1)}
        onToday={() => {
          setViewYear(now.getFullYear());
          setViewMonth(now.getMonth());
        }}
        onSelectDay={(iso) => setSelectedDate(iso === selectedDate ? null : iso)}
        kindColor={(kind) => DAY_KIND[kind as DayKind]?.color ?? "var(--text-faint)"}
      />

      <details className="about" style={{ marginTop: 14 }}>
        <summary>How to read the calendar</summary>
        <p>
          A post-by deadline is the last day to have something live for an upcoming holiday or event. It sits before the date itself, and
          any day up to it works. Holidays are computed from the calendar, never guessed. Posting times are general research, not measured
          from this account.
        </p>
      </details>

      {selectedDate && (
        <div className="overlay" style={{ alignItems: "center", justifyContent: "center" }} onClick={() => setSelectedDate(null)}>
          <div className="modal" role="dialog" aria-modal="true" aria-label={shortDate(selectedDate)} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center", marginBottom: 16 }}>
              <strong className="font-display" style={{ fontSize: 16, marginRight: "auto" }}>
                {shortDate(selectedDate)}
              </strong>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setSelectedDate(null)} aria-label="Close">
                ✕
              </button>
            </div>
            {selected.length === 0 ? (
              <p className="muted" style={{ margin: 0 }}>
                Nothing on this day.
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {selected.map((e) => (
                  <DayEntry
                    key={e.key}
                    entry={e}
                    kind={kindOf(e)}
                    idea={e.ideaId != null ? ideaById.get(e.ideaId) : undefined}
                    onOpenIdea={(id) => {
                      setSelectedDate(null);
                      onOpenIdea(id);
                    }}
                    onChanged={onChanged}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

function DayEntry({
  entry,
  kind,
  idea,
  onOpenIdea,
  onChanged,
}: {
  entry: CalendarEntry;
  kind: DayKind;
  idea?: PlannerIdea;
  onOpenIdea: (id: number) => void;
  onChanged: () => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function deleteEvent(id: number) {
    await fetch(`/api/social-intelligence/trade-shows/${id}`, { method: "DELETE" });
    onChanged();
  }

  return (
    <div style={{ display: "flex", gap: 10 }}>
      <span aria-hidden style={{ width: 6, height: 6, borderRadius: "50%", background: DAY_KIND[kind].color, marginTop: 7, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11.5, color: "var(--text-faint)", marginBottom: 2 }}>{DAY_KIND[kind].label}</div>
        <div style={{ fontSize: 14, fontWeight: 500 }}>{idea ? idea.product : entry.label}</div>
        {idea ? (
          <>
            <p className="muted" style={{ margin: "2px 0 8px", fontSize: 12.5 }}>
              {PLATFORM_LABEL[idea.platform] ?? idea.platform} · {FORMAT_LABEL[idea.format]} · {STATUS_LABEL[idea.status]}
              {idea.comments.length > 0 ? ` · ${idea.comments.length} comment${idea.comments.length === 1 ? "" : "s"}` : ""}
            </p>
            <button type="button" className="btn btn-sm" onClick={() => onOpenIdea(idea.id)}>
              Open post
            </button>
          </>
        ) : (
          entry.detail && (
            <p className="muted" style={{ margin: "2px 0 0", fontSize: 12.5, lineHeight: 1.55 }}>
              {entry.detail}
            </p>
          )
        )}
        {entry.noteTarget && <EventNote key={`${entry.key}-${entry.note ?? ""}`} showId={entry.noteTarget.id} note={entry.note ?? null} onChanged={onChanged} />}
        {entry.deletableTradeShowId != null && (
          <div style={{ marginTop: 8, display: "flex", gap: 10, alignItems: "center" }}>
            {confirmDelete ? (
              <>
                <span className="muted" style={{ fontSize: 12 }}>
                  Delete this event for everyone?
                </span>
                <button type="button" className="link-btn danger" style={{ color: "var(--negative)" }} onClick={() => deleteEvent(entry.deletableTradeShowId!)}>
                  Delete
                </button>
                <button type="button" className="link-btn" onClick={() => setConfirmDelete(false)}>
                  Keep
                </button>
              </>
            ) : (
              <button type="button" className="link-btn danger" onClick={() => setConfirmDelete(true)}>
                Delete event
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/** Add / edit / remove the free-form note on an event. */
function EventNote({ showId, note, onChanged }: { showId: number; note: string | null; onChanged: () => void }) {
  const [editing, setEditing] = useState(false);
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  const [draft, setDraft] = useState(note ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(notes: string | null) {
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/social-intelligence/trade-shows/${showId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes }),
    }).catch(() => null);
    setSaving(false);
    if (!res?.ok) return setError(await readError(res, "Couldn't save the note."));
    setEditing(false);
    setConfirmingRemove(false);
    onChanged();
  }

  if (editing) {
    return (
      <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
        <textarea className="input" rows={3} value={draft} onChange={(e) => setDraft(e.target.value)} aria-label="Event note" autoFocus />
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" className="btn btn-sm btn-primary" disabled={saving} onClick={() => save(draft.trim() || null)}>
            {saving ? "Saving…" : "Save note"}
          </button>
          <button
            type="button"
            className="btn btn-sm btn-ghost"
            disabled={saving}
            onClick={() => {
              setDraft(note ?? "");
              setEditing(false);
            }}
          >
            Cancel
          </button>
        </div>
        {error && <p style={{ margin: 0, fontSize: 12, color: "var(--negative)" }}>{error}</p>}
      </div>
    );
  }

  if (!note) {
    return (
      <button type="button" className="link-btn" style={{ marginTop: 8, color: "var(--accent)" }} onClick={() => setEditing(true)}>
        + Add note
      </button>
    );
  }

  return (
    <div className="card-quiet" style={{ marginTop: 10, padding: "10px 12px" }}>
      <p style={{ margin: 0, fontSize: 13, lineHeight: 1.55, whiteSpace: "pre-wrap" }}>{note}</p>
      <div style={{ display: "flex", gap: 12, marginTop: 6, alignItems: "center" }}>
        {confirmingRemove ? (
          <>
            <span className="muted" style={{ fontSize: 12 }}>
              Remove this note?
            </span>
            <button type="button" className="link-btn danger" style={{ color: "var(--negative)" }} disabled={saving} onClick={() => save(null)}>
              Remove
            </button>
            <button type="button" className="link-btn" onClick={() => setConfirmingRemove(false)}>
              Keep
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              className="link-btn"
              onClick={() => {
                setDraft(note);
                setEditing(true);
              }}
            >
              Edit note
            </button>
            <button type="button" className="link-btn danger" onClick={() => setConfirmingRemove(true)}>
              Remove note
            </button>
          </>
        )}
      </div>
      {error && <p style={{ margin: "6px 0 0", fontSize: 12, color: "var(--negative)" }}>{error}</p>}
    </div>
  );
}

const EMPTY_EVENT = { name: "", location: "", start_date: "", end_date: "", lead_days: "10", notes: "" };

function EventForm({ onSaved }: { onSaved: () => void }) {
  const [form, setForm] = useState(EMPTY_EVENT);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const res = await fetch("/api/social-intelligence/trade-shows", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        location: form.location || null,
        start_date: form.start_date,
        end_date: form.end_date || null,
        lead_days: Number(form.lead_days) || 10,
        notes: form.notes || null,
      }),
    }).catch(() => null);
    setSaving(false);
    if (!res?.ok) return setError(await readError(res, "Couldn't save the event."));
    setForm(EMPTY_EVENT);
    onSaved();
  }

  return (
    <form onSubmit={submit} className="card-quiet" style={{ padding: 16, marginBottom: 16, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
      <div className="field" style={{ gridColumn: "1 / -1" }}>
        <label htmlFor="event-name">Event name</label>
        <input id="event-name" className="input" required placeholder="e.g. Circle Craft, TV feature" value={form.name} onChange={set("name")} />
      </div>
      <div className="field">
        <label htmlFor="event-location">Location</label>
        <input id="event-location" className="input" placeholder="Vancouver, BC" value={form.location} onChange={set("location")} />
      </div>
      <div className="field">
        <label htmlFor="event-start">Starts</label>
        <input id="event-start" className="input" type="date" required value={form.start_date} onChange={set("start_date")} />
      </div>
      <div className="field">
        <label htmlFor="event-end">Ends</label>
        <input id="event-end" className="input" type="date" value={form.end_date} onChange={set("end_date")} />
      </div>
      <div className="field">
        <label htmlFor="event-lead">Post this many days before</label>
        <input id="event-lead" className="input" type="number" min={0} value={form.lead_days} onChange={set("lead_days")} />
      </div>
      <div className="field" style={{ gridColumn: "1 / -1" }}>
        <label htmlFor="event-notes">Note</label>
        <input id="event-notes" className="input" value={form.notes} onChange={set("notes")} />
      </div>
      {error && <p style={{ margin: 0, fontSize: 12.5, color: "var(--negative)", gridColumn: "1 / -1" }}>{error}</p>}
      <div style={{ gridColumn: "1 / -1" }}>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? "Saving…" : "Save event"}
        </button>
      </div>
    </form>
  );
}

type IdeaFilter = "review" | "approved" | "unscheduled" | "posted";
const IDEA_FILTERS: { key: IdeaFilter; label: string; test: (i: PlannerIdea) => boolean }[] = [
  { key: "review", label: "To review", test: (i) => i.status === "suggested" },
  { key: "approved", label: "Approved", test: (i) => i.status === "approved" },
  { key: "unscheduled", label: "Unscheduled", test: (i) => !i.target_date && i.status !== "dismissed" && i.status !== "used" },
  { key: "posted", label: "Posted", test: (i) => i.status === "used" },
];

function IdeasCard({ ideas, loading, onOpen }: { ideas: PlannerIdea[]; loading: boolean; onOpen: (id: number) => void }) {
  const [filter, setFilter] = useState<IdeaFilter>("review");
  const active = IDEA_FILTERS.find((f) => f.key === filter)!;
  const list = ideas.filter(active.test).sort((a, b) => (a.target_date ?? "9999").localeCompare(b.target_date ?? "9999"));

  return (
    <section className="card" style={{ padding: "20px 22px" }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, flexWrap: "wrap", marginBottom: 6 }}>
        <div style={{ marginRight: "auto" }}>
          <h2 className="font-display" style={{ fontSize: 16, margin: "0 0 4px" }}>
            Content ideas
          </h2>
          <details className="about">
            <summary>About these ideas</summary>
            <p>
              Repost, refresh and new ideas written by asking Claude to act as a social media specialist against real post performance and
              real Shopify inventory. They aren&apos;t generated live by a button; ask for more anytime and they appear here for review.
            </p>
          </details>
        </div>
        <div role="tablist" aria-label="Filter ideas" style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {IDEA_FILTERS.map((f) => {
            const count = ideas.filter(f.test).length;
            const on = f.key === filter;
            return (
              <button
                key={f.key}
                role="tab"
                aria-selected={on}
                type="button"
                onClick={() => setFilter(f.key)}
                className="btn btn-sm"
                style={{ borderColor: on ? "var(--border-strong)" : "transparent", background: on ? "var(--surface-raised)" : "transparent", color: on ? "var(--text)" : "var(--text-soft)" }}
              >
                {f.label}
                <span className="tabular" style={{ color: "var(--text-faint)" }}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>
      {loading ? (
        <p className="muted">Loading…</p>
      ) : list.length === 0 ? (
        <p className="muted" style={{ fontSize: 13, margin: "12px 0 0" }}>
          Nothing here right now.
        </p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 300px), 1fr))", gap: 12, marginTop: 12 }}>
          {list.map((idea) => (
            <button
              key={idea.id}
              type="button"
              onClick={() => onOpen(idea.id)}
              className="card-quiet"
              style={{ textAlign: "left", border: "1px solid transparent", padding: "14px 16px", cursor: "pointer", display: "flex", flexDirection: "column", gap: 8 }}
            >
              <span style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                {/* The filter tab already says the status, except on "Unscheduled", which mixes them. */}
                {filter === "unscheduled" && (
                  <span className={statusPillClass(idea.status)}>
                    <span className="dot" />
                    {STATUS_LABEL[idea.status]}
                  </span>
                )}
                <span style={{ fontSize: 12, color: "var(--text-faint)" }}>
                  {PLATFORM_LABEL[idea.platform] ?? idea.platform} · {FORMAT_LABEL[idea.format]}
                  {idea.target_date ? ` · ${shortDate(idea.target_date)}` : ""}
                </span>
              </span>
              <span style={{ fontSize: 14, fontWeight: 500 }}>{idea.product}</span>
              <span className="clamp-2" style={{ fontSize: 13, color: "var(--text-soft)", lineHeight: 1.5 }}>
                {idea.hook ? `“${idea.hook}” ` : ""}
                {idea.caption}
              </span>
              {idea.comments.length > 0 && (
                <span style={{ fontSize: 12, color: "var(--text-faint)" }}>
                  {idea.comments.length} comment{idea.comments.length === 1 ? "" : "s"} · last by {idea.comments[idea.comments.length - 1]!.author_name}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
