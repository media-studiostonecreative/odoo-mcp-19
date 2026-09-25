import { describe, it, expect, beforeEach } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

beforeEach(() => {
  process.env.DASHBOARD_DATA_DIR = mkdtempSync(path.join(tmpdir(), "content-ideas-test-"));
});

describe("editing a post's content", () => {
  it("updates title, hook, caption, hashtags and CTA without touching the schedule", async () => {
    const { createContentIdea, updateContentIdea } = await import("@/lib/social/contentIdeas");
    const created = createContentIdea({
      idea_type: "new",
      platform: "instagram",
      format: "photo",
      product: "Old title",
      target_date: "2026-09-30",
      hook: "Old hook",
      caption: "Old caption",
      hashtags: [{ tier: "core", tag: "#stonecarving" }],
      cta: "Old CTA",
      reasoning: "Test reasoning",
      confidence: "promising",
    });

    const updated = updateContentIdea(created.id, {
      product: "New title",
      hook: null,
      caption: "New caption",
      hashtags: [{ tier: "core", tag: "#stonecarving" }, { tier: "subject", tag: "#mapleleaf" }],
      cta: "Shop the kit",
    })!;
    expect(updated.product).toBe("New title");
    expect(updated.hook).toBeNull();
    expect(updated.caption).toBe("New caption");
    expect(updated.hashtags.map((h) => h.tag)).toEqual(["#stonecarving", "#mapleleaf"]);
    expect(updated.cta).toBe("Shop the kit");
    expect(updated.target_date).toBe("2026-09-30");
    expect(updated.suggested_time).toBe(created.suggested_time);
  });
});

describe("updateContentIdea", () => {
  it("sets target_date and auto-recomputes suggested_time from the new date", async () => {
    const { createContentIdea, updateContentIdea } = await import("@/lib/social/contentIdeas");
    const created = createContentIdea({
      idea_type: "new",
      platform: "instagram",
      format: "photo",
      product: "Maple Leaf Alabaster Carving Project",
      caption: "Test caption",
      reasoning: "Test reasoning",
      confidence: "promising",
    });
    expect(created.target_date).toBeNull();

    // 2026-09-30 is a Wednesday -> Instagram photo default rule is 12:00 PM
    const updated = updateContentIdea(created.id, { target_date: "2026-09-30" });
    expect(updated!.target_date).toBe("2026-09-30");
    expect(updated!.suggested_time).toBe("12:00 PM");
  });

  it("respects an explicit suggested_time override instead of recomputing", async () => {
    const { createContentIdea, updateContentIdea } = await import("@/lib/social/contentIdeas");
    const created = createContentIdea({
      idea_type: "new",
      platform: "instagram",
      format: "photo",
      product: "Test Product",
      caption: "Test caption",
      reasoning: "Test reasoning",
      confidence: "promising",
    });
    const updated = updateContentIdea(created.id, { target_date: "2026-09-30", suggested_time: "3:00 PM" });
    expect(updated!.suggested_time).toBe("3:00 PM");
  });

  it("leaves suggested_time untouched when neither schedule fields nor an override are provided", async () => {
    const { createContentIdea, updateContentIdea } = await import("@/lib/social/contentIdeas");
    const created = createContentIdea({
      idea_type: "new",
      platform: "instagram",
      format: "photo",
      target_date: "2026-09-30",
      product: "Test Product",
      caption: "Test caption",
      reasoning: "Test reasoning",
      confidence: "promising",
    });
    const updated = updateContentIdea(created.id, { status: "approved" });
    expect(updated!.suggested_time).toBe(created.suggested_time);
    expect(updated!.status).toBe("approved");
  });

  it("returns null for a non-existent id", async () => {
    const { updateContentIdea } = await import("@/lib/social/contentIdeas");
    expect(updateContentIdea(999999, { target_date: "2026-09-30" })).toBeNull();
  });

  it("recategorizes pillar without touching schedule fields", async () => {
    const { createContentIdea, updateContentIdea } = await import("@/lib/social/contentIdeas");
    const created = createContentIdea({
      idea_type: "new",
      platform: "instagram",
      format: "story",
      target_date: "2026-10-19",
      pillar: "behind-the-scenes",
      product: "Festival of Crafts (event)",
      caption: "Test caption",
      reasoning: "Test reasoning",
      confidence: "high",
    });
    const updated = updateContentIdea(created.id, { pillar: "shows" });
    expect(updated!.pillar).toBe("shows");
    expect(updated!.target_date).toBe("2026-10-19");
    expect(updated!.suggested_time).toBe(created.suggested_time);
  });
});
