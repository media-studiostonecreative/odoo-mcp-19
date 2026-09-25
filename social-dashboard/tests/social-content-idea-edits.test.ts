import { describe, it, expect } from "vitest";
import { parseHashtagInput, describeIdeaEdit, changedFields, type EditableIdeaFields } from "@/lib/social/contentIdeaEdits";

const BASE: EditableIdeaFields = {
  product: "Maple Leaf Alabaster Carving Project",
  hook: "Still obsessed with maple leaves?",
  caption: "Original caption",
  hashtags: [
    { tag: "#stonecarving", tier: "core" },
    { tag: "#fallcraft", tier: "seasonal" },
  ],
  cta: "Shop now",
  target_date: "2026-09-25",
  platform: "instagram",
  format: "photo",
  pillar: null,
};

describe("parseHashtagInput", () => {
  it("keeps existing tiers, defaults new tags, and accepts spaces, commas and missing #", () => {
    expect(parseHashtagInput("#StoneCarving, mapleleaf  #fallcraft", BASE.hashtags)).toEqual([
      { tag: "#StoneCarving", tier: "core" },
      { tag: "#mapleleaf", tier: "subject" },
      { tag: "#fallcraft", tier: "seasonal" },
    ]);
  });

  it("drops duplicates, empty tokens and punctuation", () => {
    expect(parseHashtagInput("#a #A ## , #b!")).toEqual([
      { tag: "#a", tier: "subject" },
      { tag: "#b", tier: "subject" },
    ]);
  });
});

describe("describeIdeaEdit", () => {
  it("returns an empty string when nothing actually changed", () => {
    expect(describeIdeaEdit(BASE, { caption: "Original caption", platform: "instagram" })).toBe("");
  });

  it("names long-text fields and shows short values as from → to", () => {
    expect(describeIdeaEdit(BASE, { caption: "New", hashtags: [], target_date: "2026-09-28" })).toBe("Edited caption and hashtags; date 2026-09-25 → 2026-09-28");
  });

  it("treats clearing a field as a change to none", () => {
    expect(describeIdeaEdit(BASE, { pillar: "behind-the-scenes" })).toBe("Pillar none → behind-the-scenes");
    expect(changedFields(BASE, { cta: null })).toEqual(["cta"]);
  });
});
