import { describe, it, expect } from "vitest";
import { evaluateLearningLoopOutcome } from "@/lib/social/learningLoopOutcome";

describe("evaluateLearningLoopOutcome", () => {
  it("reports awaiting-outcome when no post is linked yet", () => {
    const result = evaluateLearningLoopOutcome(null);
    expect(result.outcome).toBe("awaiting-outcome");
  });

  it("reports converted when the linked post has attributed revenue", () => {
    const result = evaluateLearningLoopOutcome({ revenueAttributed: 150, linkClicks: 10, likes: 5, comments: 0, shares: 0 });
    expect(result.outcome).toBe("converted");
  });

  it("reports engaged-no-revenue when there is engagement but zero revenue", () => {
    const result = evaluateLearningLoopOutcome({ revenueAttributed: 0, linkClicks: 5, likes: 20, comments: 2, shares: 1 });
    expect(result.outcome).toBe("engaged-no-revenue");
  });

  it("reports no-engagement when everything is zero", () => {
    const result = evaluateLearningLoopOutcome({ revenueAttributed: 0, linkClicks: 0, likes: 0, comments: 0, shares: 0 });
    expect(result.outcome).toBe("no-engagement");
  });

  it("always warns that a single post is not a sufficient sample size", () => {
    const outcomes = [
      evaluateLearningLoopOutcome({ revenueAttributed: 150, linkClicks: 10, likes: 5, comments: 0, shares: 0 }),
      evaluateLearningLoopOutcome({ revenueAttributed: 0, linkClicks: 5, likes: 20, comments: 2, shares: 1 }),
      evaluateLearningLoopOutcome({ revenueAttributed: 0, linkClicks: 0, likes: 0, comments: 0, shares: 0 }),
    ];
    for (const o of outcomes) {
      expect(o.note.toLowerCase()).toContain("not a sufficient sample size");
    }
  });
});
