// dashboard/src/lib/social/trendScore.ts

/**
 * Trend Fit Score — the same 7-factor weighted model documented in the
 * studiostone-social-conversion-analyst skill (references/scoring-models.md).
 * Deliberately kept in sync with that file rather than reinvented here; if
 * the weights change in one place, change them in the other.
 *
 * Phase 2 reality: every factor is a person's own 0-100 judgment call logged
 * by hand (see lib/social/trends.ts), not a live trend-provider metric —
 * there is no Google Trends / Pinterest Trends / TikTok Creative Center
 * integration yet. That's fine; the scoring model doesn't care where the
 * numbers came from, but the UI must say so rather than implying a live feed.
 */

export interface TrendFactors {
  productRelevance: number;
  commercialIntent: number;
  regionalMomentum: number;
  historicalPerformance: number;
  seasonalityTiming: number;
  contentSuitability: number;
  inventoryAvailability: number;
}

export type TrendClassification = "Strong Opportunity" | "Worth Testing" | "Monitor" | "Low Relevance" | "Ignore";

export interface TrendFitResult {
  score: number;
  classification: TrendClassification;
}

const WEIGHTS = {
  productRelevance: 0.3,
  commercialIntent: 0.2,
  regionalMomentum: 0.15,
  historicalPerformance: 0.15,
  seasonalityTiming: 0.1,
  contentSuitability: 0.05,
  inventoryAvailability: 0.05,
};

const CLASSIFICATION_ORDER: TrendClassification[] = ["Ignore", "Low Relevance", "Monitor", "Worth Testing", "Strong Opportunity"];

function classifyByScore(score: number): TrendClassification {
  if (score >= 80) return "Strong Opportunity";
  if (score >= 60) return "Worth Testing";
  if (score >= 40) return "Monitor";
  if (score >= 20) return "Low Relevance";
  return "Ignore";
}

export function scoreTrendFit(factors: TrendFactors): TrendFitResult {
  const raw =
    factors.productRelevance * WEIGHTS.productRelevance +
    factors.commercialIntent * WEIGHTS.commercialIntent +
    factors.regionalMomentum * WEIGHTS.regionalMomentum +
    factors.historicalPerformance * WEIGHTS.historicalPerformance +
    factors.seasonalityTiming * WEIGHTS.seasonalityTiming +
    factors.contentSuitability * WEIGHTS.contentSuitability +
    factors.inventoryAvailability * WEIGHTS.inventoryAvailability;

  const score = Math.round(raw);
  let classification = classifyByScore(score);

  // Hard override from the skill's model: weak product relevance caps the
  // classification at "Low Relevance" regardless of the weighted total — a
  // trend cannot buy its way to "Strong Opportunity" on momentum or timing
  // alone if it has essentially nothing to do with what Studiostone sells.
  if (factors.productRelevance < 15) {
    const capIndex = CLASSIFICATION_ORDER.indexOf("Low Relevance");
    const actualIndex = CLASSIFICATION_ORDER.indexOf(classification);
    classification = CLASSIFICATION_ORDER[Math.min(actualIndex, capIndex)]!;
  }

  return { score, classification };
}

/** Hedging language required by the skill/spec — never "will definitely perform." */
export function hedgeForClassification(classification: TrendClassification): string {
  switch (classification) {
    case "Strong Opportunity":
      return "High-confidence opportunity";
    case "Worth Testing":
      return "Promising test";
    case "Monitor":
    case "Low Relevance":
      return "Experimental";
    case "Ignore":
      return "Insufficient data";
  }
}
