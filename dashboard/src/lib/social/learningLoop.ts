// dashboard/src/lib/social/learningLoop.ts
import "server-only";

import { getHealthDb } from "../db";

export interface TrendRecommendation {
  id: number;
  trend_observation_id: number | null;
  term: string;
  score_at_recommendation: number;
  classification_at_recommendation: string;
  recommended_date: string;
  linked_social_post_id: number | null;
  created_at: string;
}

export interface NewTrendRecommendation {
  trend_observation_id: number | null;
  term: string;
  score_at_recommendation: number;
  classification_at_recommendation: string;
}

export function listTrendRecommendations(): TrendRecommendation[] {
  return getHealthDb().prepare("SELECT * FROM trend_recommendations ORDER BY recommended_date DESC, id DESC").all() as TrendRecommendation[];
}

export function createTrendRecommendation(data: NewTrendRecommendation): TrendRecommendation {
  const db = getHealthDb();
  const result = db
    .prepare(
      `INSERT INTO trend_recommendations (trend_observation_id, term, score_at_recommendation, classification_at_recommendation)
       VALUES (@trend_observation_id, @term, @score_at_recommendation, @classification_at_recommendation)`,
    )
    .run(data);
  return db.prepare("SELECT * FROM trend_recommendations WHERE id = ?").get(result.lastInsertRowid) as TrendRecommendation;
}

/** Links a recommendation to the real social_posts row that came out of it. Pass
 * `null` to unlink. Does not validate the post's platform/date against the
 * recommendation — that judgment call belongs to the person doing the linking. */
export function linkTrendRecommendation(id: number, socialPostId: number | null): TrendRecommendation | null {
  const db = getHealthDb();
  const result = db.prepare("UPDATE trend_recommendations SET linked_social_post_id = ? WHERE id = ?").run(socialPostId, id);
  if (result.changes === 0) return null;
  return db.prepare("SELECT * FROM trend_recommendations WHERE id = ?").get(id) as TrendRecommendation;
}

export function deleteTrendRecommendation(id: number): boolean {
  const result = getHealthDb().prepare("DELETE FROM trend_recommendations WHERE id = ?").run(id);
  return result.changes > 0;
}
