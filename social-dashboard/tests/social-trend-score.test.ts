import { describe, it, expect } from "vitest";
import { scoreTrendFit, hedgeForClassification } from "@/lib/social/trendScore";

const PERFECT = {
  productRelevance: 100,
  commercialIntent: 100,
  regionalMomentum: 100,
  historicalPerformance: 100,
  seasonalityTiming: 100,
  contentSuitability: 100,
  inventoryAvailability: 100,
};

const ZERO = {
  productRelevance: 0,
  commercialIntent: 0,
  regionalMomentum: 0,
  historicalPerformance: 0,
  seasonalityTiming: 0,
  contentSuitability: 0,
  inventoryAvailability: 0,
};

describe("scoreTrendFit", () => {
  it("scores all-100 factors as 100, Strong Opportunity", () => {
    const result = scoreTrendFit(PERFECT);
    expect(result.score).toBe(100);
    expect(result.classification).toBe("Strong Opportunity");
  });

  it("scores all-zero factors as 0, Ignore", () => {
    const result = scoreTrendFit(ZERO);
    expect(result.score).toBe(0);
    expect(result.classification).toBe("Ignore");
  });

  it("weights product relevance higher than any other single factor", () => {
    const highRelevance = scoreTrendFit({ ...ZERO, productRelevance: 100 });
    const highMomentum = scoreTrendFit({ ...ZERO, regionalMomentum: 100 });
    expect(highRelevance.score).toBeGreaterThan(highMomentum.score);
  });

  it("caps classification at Low Relevance when product relevance is below 15, even with a high weighted score", () => {
    // Every other factor maxed out, but product relevance is weak (5) — the hard override should
    // prevent this trend from being classified as anything better than Low Relevance.
    const result = scoreTrendFit({ ...PERFECT, productRelevance: 5 });
    expect(result.classification).toBe("Low Relevance");
  });

  it("does not upgrade a naturally-low score just because the override cap is Low Relevance", () => {
    const result = scoreTrendFit({ ...ZERO, productRelevance: 5 });
    expect(result.classification).toBe("Ignore");
  });
});

describe("hedgeForClassification", () => {
  it("never says a recommendation will definitely perform", () => {
    const classifications = ["Strong Opportunity", "Worth Testing", "Monitor", "Low Relevance", "Ignore"] as const;
    for (const c of classifications) {
      expect(hedgeForClassification(c).toLowerCase()).not.toContain("will definitely");
    }
  });

  it("maps Strong Opportunity to high-confidence language", () => {
    expect(hedgeForClassification("Strong Opportunity")).toBe("High-confidence opportunity");
  });

  it("maps Ignore to insufficient data", () => {
    expect(hedgeForClassification("Ignore")).toBe("Insufficient data");
  });
});
