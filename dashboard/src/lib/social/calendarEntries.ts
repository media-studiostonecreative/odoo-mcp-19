// dashboard/src/lib/social/calendarEntries.ts

/**
 * Pure merge of occasions + trade shows + dated content ideas into one
 * calendar-entry list, used by both the Content Calendar (month grid) and
 * the deadline alert banner so they share one source of truth for what a
 * "post-by deadline" entry looks like. No DB access here — safe to import
 * from a client component.
 */

export type CalendarEntryType = "occasion" | "trade-show" | "content-idea" | "story-post" | "post-deadline";

export interface CalendarEntry {
  key: string;
  type: CalendarEntryType;
  date: string; // YYYY-MM-DD
  label: string;
  detail: string;
  deletableTradeShowId?: number;
}

export interface CalendarOccasion {
  id: string;
  name: string;
  date: string;
  suggestedPostByDate: string;
  note: string;
}

export interface CalendarTradeShow {
  id: number;
  name: string;
  location: string | null;
  start_date: string;
  end_date: string | null;
  lead_days: number;
  post_by_date: string;
  notes: string | null;
}

export interface CalendarContentIdea {
  id: number;
  idea_type: string;
  target_date: string | null;
  product: string;
  platform: string;
  status: string;
  format: string;
}

function isoRange(start: string, end: string): string[] {
  const out: string[] = [];
  const cur = new Date(`${start}T00:00:00Z`);
  const last = new Date(`${end}T00:00:00Z`);
  while (cur.getTime() <= last.getTime()) {
    out.push(cur.toISOString().slice(0, 10));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return out;
}

export function buildCalendarEntries(occasions: CalendarOccasion[], tradeShows: CalendarTradeShow[], contentIdeas: CalendarContentIdea[]): CalendarEntry[] {
  const occasionEntries: CalendarEntry[] = occasions.flatMap((o) => [
    { key: `occasion-${o.id}`, type: "occasion" as const, date: o.date, label: o.name, detail: o.note },
    {
      key: `occasion-deadline-${o.id}`,
      type: "post-deadline" as const,
      date: o.suggestedPostByDate,
      label: `Post-by deadline: ${o.name}`,
      detail: `This is a deadline, not the occasion itself — ${o.name} is on ${o.date}. Have a post about it published on or before this date, so it has time to reach people before ${o.name} arrives.`,
    },
  ]);

  const tradeShowEntries: CalendarEntry[] = tradeShows.flatMap((t) => {
    const spanDates = isoRange(t.start_date, t.end_date ?? t.start_date);
    const showDetail = [t.location, t.end_date ? `through ${t.end_date}` : null, t.notes].filter(Boolean).join(" · ");
    const spanEntries = spanDates.map((d) => ({
      key: `trade-show-${t.id}-${d}`,
      type: "trade-show" as const,
      date: d,
      label: t.name,
      detail: showDetail,
      deletableTradeShowId: t.id,
    }));
    const deadlineEntry = {
      key: `trade-show-deadline-${t.id}`,
      type: "post-deadline" as const,
      date: t.post_by_date,
      label: `Post-by deadline: ${t.name}`,
      detail: `This is a deadline, not the show itself — ${t.name} runs ${t.start_date}${t.end_date ? ` to ${t.end_date}` : ""}. Have an announcement/promo post published on or before this date (${t.lead_days}-day lead time) so people see it before the show starts.`,
    };
    return [...spanEntries, deadlineEntry];
  });

  const ideaEntries: CalendarEntry[] = contentIdeas
    .filter((i) => i.target_date && i.status !== "dismissed")
    .map((i) => {
      const posted = i.status === "used";
      const isStory = i.format === "story";
      const type: CalendarEntryType = isStory ? "story-post" : "content-idea";
      return {
        key: `content-idea-${i.id}`,
        type,
        date: i.target_date!,
        label: `${posted ? "Posted" : "Scheduled"}${isStory ? " story" : ""}: ${i.product} (${i.platform})`,
        detail: posted
          ? `This was published on this day — ${i.idea_type} idea${isStory ? ", story format" : ""}.`
          : `Drafted and scheduled to go out on this day, not yet confirmed as posted — ${i.idea_type} idea${isStory ? ", story format" : ""}, currently ${i.status}. Approve it in Content Ideas once it's ready.`,
      };
    });

  return [...occasionEntries, ...tradeShowEntries, ...ideaEntries].sort((a, b) => a.date.localeCompare(b.date));
}

/** Post-by deadlines occurring within `daysAhead` days from `now` (inclusive of today). */
export function upcomingDeadlineAlerts(entries: CalendarEntry[], daysAhead: number, now: Date = new Date()): CalendarEntry[] {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  return entries
    .filter((e) => e.type === "post-deadline")
    .filter((e) => {
      const days = Math.round((new Date(`${e.date}T00:00:00`).getTime() - today.getTime()) / 86_400_000);
      return days >= 0 && days <= daysAhead;
    })
    .sort((a, b) => a.date.localeCompare(b.date));
}
