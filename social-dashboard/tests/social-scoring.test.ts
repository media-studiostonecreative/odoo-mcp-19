import { describe, it, expect } from "vitest";
import { scoreSocialPosts } from "@/lib/social/scoring";

describe("scoreSocialPosts", () => {
  it("returns an empty array for no posts", () => {
    expect(scoreSocialPosts([])).toEqual([]);
  });

  it("scores a post with zero signal on every metric as null (insufficient data)", () => {
    const results = scoreSocialPosts([{ id: 1, revenueAttributed: 0, linkClicks: 0, likes: 0, comments: 0, shares: 0 }]);
    expect(results[0]!.score).toBeNull();
  });

  it("gives the highest score to the post with the most revenue, even if it has less engagement", () => {
    const results = scoreSocialPosts([
      { id: 1, revenueAttributed: 500, linkClicks: 10, likes: 5, comments: 0, shares: 0 },
      { id: 2, revenueAttributed: 0, linkClicks: 2, likes: 10000, comments: 500, shares: 200 },
    ]);
    expect(results[0]!.score).toBeGreaterThan(results[1]!.score!);
  });

  it("flags hasRevenueSignal false when no post in the batch has any attributed revenue", () => {
    const results = scoreSocialPosts([
      { id: 1, revenueAttributed: 0, linkClicks: 10, likes: 5, comments: 1, shares: 0 },
      { id: 2, revenueAttributed: 0, linkClicks: 3, likes: 1, comments: 0, shares: 0 },
    ]);
    expect(results.every((r) => r.hasRevenueSignal === false)).toBe(true);
    expect(results.some((r) => r.score !== null)).toBe(true);
  });

  it("gives the top scorer in a batch a score of 100 on its dominant metric", () => {
    const results = scoreSocialPosts([
      { id: 1, revenueAttributed: 1000, linkClicks: 50, likes: 100, comments: 10, shares: 5 },
      { id: 2, revenueAttributed: 100, linkClicks: 5, likes: 10, comments: 1, shares: 0 },
    ]);
    expect(results[0]!.score).toBe(100);
  });
});
