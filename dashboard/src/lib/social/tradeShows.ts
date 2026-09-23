// dashboard/src/lib/social/tradeShows.ts
import "server-only";

import { getHealthDb } from "../db";

export interface TradeShow {
  id: number;
  name: string;
  location: string | null;
  start_date: string;
  end_date: string | null;
  lead_days: number;
  notes: string | null;
  created_at: string;
}

export interface NewTradeShow {
  name: string;
  location?: string | null;
  start_date: string;
  end_date?: string | null;
  lead_days?: number;
  notes?: string | null;
}

const DEFAULT_LEAD_DAYS = 10;

export function listUpcomingTradeShows(): TradeShow[] {
  const today = new Date().toISOString().slice(0, 10);
  return getHealthDb()
    .prepare(`SELECT * FROM trade_shows WHERE COALESCE(end_date, start_date) >= ? ORDER BY start_date ASC`)
    .all(today) as TradeShow[];
}

export function listAllTradeShows(): TradeShow[] {
  return getHealthDb().prepare(`SELECT * FROM trade_shows ORDER BY start_date ASC`).all() as TradeShow[];
}

export function createTradeShow(data: NewTradeShow): TradeShow {
  const db = getHealthDb();
  const result = db
    .prepare(
      `INSERT INTO trade_shows (name, location, start_date, end_date, lead_days, notes) VALUES (@name, @location, @start_date, @end_date, @lead_days, @notes)`,
    )
    .run({
      name: data.name,
      location: data.location ?? null,
      start_date: data.start_date,
      end_date: data.end_date ?? null,
      lead_days: data.lead_days ?? DEFAULT_LEAD_DAYS,
      notes: data.notes ?? null,
    });
  return db.prepare("SELECT * FROM trade_shows WHERE id = ?").get(result.lastInsertRowid) as TradeShow;
}

export function deleteTradeShow(id: number): boolean {
  const result = getHealthDb().prepare("DELETE FROM trade_shows WHERE id = ?").run(id);
  return result.changes > 0;
}

/** The date content should be posted by to give `lead_days` of runway before the show starts. */
export function tradeShowPostByDate(show: Pick<TradeShow, "start_date" | "lead_days">): string {
  const d = new Date(`${show.start_date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - show.lead_days);
  return d.toISOString().slice(0, 10);
}
