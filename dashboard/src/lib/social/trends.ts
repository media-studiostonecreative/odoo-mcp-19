// dashboard/src/lib/social/trends.ts
import "server-only";

import { getHealthDb } from "../db";

export interface TrendObservation {
  id: number;
  term: string;
  platform: string | null;
  observed_date: string;
  product_relevance: number;
  commercial_intent: number;
  regional_momentum: number;
  historical_performance: number;
  seasonality_timing: number;
  content_suitability: number;
  inventory_availability: number;
  note: string | null;
  source_url: string | null;
  created_at: string;
}

export interface NewTrendObservation {
  term: string;
  platform?: string | null;
  observed_date: string;
  product_relevance: number;
  commercial_intent: number;
  regional_momentum: number;
  historical_performance: number;
  seasonality_timing: number;
  content_suitability: number;
  inventory_availability: number;
  note?: string | null;
  source_url?: string | null;
}

export function listTrendObservations(): TrendObservation[] {
  return getHealthDb().prepare("SELECT * FROM trend_observations ORDER BY observed_date DESC, id DESC").all() as TrendObservation[];
}

export function createTrendObservation(data: NewTrendObservation): TrendObservation {
  const db = getHealthDb();
  const result = db
    .prepare(
      `INSERT INTO trend_observations
        (term, platform, observed_date, product_relevance, commercial_intent, regional_momentum, historical_performance, seasonality_timing, content_suitability, inventory_availability, note, source_url)
       VALUES
        (@term, @platform, @observed_date, @product_relevance, @commercial_intent, @regional_momentum, @historical_performance, @seasonality_timing, @content_suitability, @inventory_availability, @note, @source_url)`,
    )
    .run({
      ...data,
      platform: data.platform ?? null,
      note: data.note ?? null,
      source_url: data.source_url ?? null,
    });
  return db.prepare("SELECT * FROM trend_observations WHERE id = ?").get(result.lastInsertRowid) as TrendObservation;
}

export function deleteTrendObservation(id: number): boolean {
  const result = getHealthDb().prepare("DELETE FROM trend_observations WHERE id = ?").run(id);
  return result.changes > 0;
}
